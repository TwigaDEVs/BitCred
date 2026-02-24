use starknet::ContractAddress;

#[starknet::interface]
pub trait IMockUSDC<TContractState> {
    fn name(self: @TContractState) -> felt252;
    fn symbol(self: @TContractState) -> felt252;
    fn decimals(self: @TContractState) -> u8;
    fn total_supply(self: @TContractState) -> u256;
    fn balance_of(self: @TContractState, account: ContractAddress) -> u256;
    fn allowance(self: @TContractState, owner: ContractAddress, spender: ContractAddress) -> u256;
    fn transfer(ref self: TContractState, recipient: ContractAddress, amount: u256) -> bool;
    fn transfer_from(
        ref self: TContractState,
        sender: ContractAddress,
        recipient: ContractAddress,
        amount: u256
    ) -> bool;
    fn approve(ref self: TContractState, spender: ContractAddress, amount: u256) -> bool;
    fn claim(ref self: TContractState);
    fn time_until_next_claim(self: @TContractState, user: ContractAddress) -> u64;
}

#[starknet::contract]
pub mod MockUSDC {
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp, contract_address_const};
    use starknet::storage::{
        Map, StorageMapReadAccess, StorageMapWriteAccess,
        StoragePointerReadAccess, StoragePointerWriteAccess,
    };

    #[storage]
    struct Storage {
        name: felt252,
        symbol: felt252,
        decimals: u8,
        total_supply: u256,
        balances: Map<ContractAddress, u256>,
        allowances: Map<(ContractAddress, ContractAddress), u256>,
        last_claim: Map<ContractAddress, u64>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        Transfer: Transfer,
        Approval: Approval,
        Claimed: Claimed,
    }

    #[derive(Drop, starknet::Event)]
    pub struct Transfer {
        #[key] pub from: ContractAddress,
        #[key] pub to: ContractAddress,
        pub value: u256,
    }

    #[derive(Drop, starknet::Event)]
    pub struct Approval {
        #[key] pub owner: ContractAddress,
        #[key] pub spender: ContractAddress,
        pub value: u256,
    }

    #[derive(Drop, starknet::Event)]
    pub struct Claimed {
        #[key] pub user: ContractAddress,
        pub amount: u256,
    }

    #[constructor]
    fn constructor(ref self: ContractState) {
        self.name.write('Mock USD Coin');
        self.symbol.write('USDC');
        self.decimals.write(6);
    }

    #[abi(embed_v0)]
    impl MockUSDCImpl of super::IMockUSDC<ContractState> {
        fn name(self: @ContractState) -> felt252 {
            self.name.read()
        }

        fn symbol(self: @ContractState) -> felt252 {
            self.symbol.read()
        }

        fn decimals(self: @ContractState) -> u8 {
            self.decimals.read()
        }

        fn total_supply(self: @ContractState) -> u256 {
            self.total_supply.read()
        }

        fn balance_of(self: @ContractState, account: ContractAddress) -> u256 {
            self.balances.read(account)
        }

        fn allowance(self: @ContractState, owner: ContractAddress, spender: ContractAddress) -> u256 {
            self.allowances.read((owner, spender))
        }

        fn transfer(ref self: ContractState, recipient: ContractAddress, amount: u256) -> bool {
            let sender = get_caller_address();
            self._transfer(sender, recipient, amount);
            true
        }

        fn transfer_from(
            ref self: ContractState,
            sender: ContractAddress,
            recipient: ContractAddress,
            amount: u256
        ) -> bool {
            let caller = get_caller_address();
            let current_allowance = self.allowances.read((sender, caller));
            assert(current_allowance >= amount, 'Insufficient allowance');
            
            self.allowances.write((sender, caller), current_allowance - amount);
            self._transfer(sender, recipient, amount);
            true
        }

        fn approve(ref self: ContractState, spender: ContractAddress, amount: u256) -> bool {
            let owner = get_caller_address();
            self.allowances.write((owner, spender), amount);
            self.emit(Approval { owner, spender, value: amount });
            true
        }

        fn claim(ref self: ContractState) {
            let caller = get_caller_address();
            let current_time = get_block_timestamp();
            let last_claim_time = self.last_claim.read(caller);
            
            assert(current_time >= last_claim_time + 86400, 'Claim cooldown active');
            
            let amount: u256 = 10000000000; // 10,000 USDC (6 decimals)
            
            let current_balance = self.balances.read(caller);
            self.balances.write(caller, current_balance + amount);
            
            let current_supply = self.total_supply.read();
            self.total_supply.write(current_supply + amount);
            
            self.last_claim.write(caller, current_time);
            
            self.emit(Claimed { user: caller, amount });
            self.emit(Transfer { 
                from: contract_address_const::<0>(), 
                to: caller, 
                value: amount 
            });
        }

        fn time_until_next_claim(self: @ContractState, user: ContractAddress) -> u64 {
            let current_time = get_block_timestamp();
            let last_claim_time = self.last_claim.read(user);
            
            if current_time >= last_claim_time + 86400 {
                0
            } else {
                (last_claim_time + 86400) - current_time
            }
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn _transfer(
            ref self: ContractState,
            sender: ContractAddress,
            recipient: ContractAddress,
            amount: u256
        ) {
            let sender_balance = self.balances.read(sender);
            assert(sender_balance >= amount, 'Insufficient balance');
            
            self.balances.write(sender, sender_balance - amount);
            
            let recipient_balance = self.balances.read(recipient);
            self.balances.write(recipient, recipient_balance + amount);
            
            self.emit(Transfer { from: sender, to: recipient, value: amount });
        }
    }
}
