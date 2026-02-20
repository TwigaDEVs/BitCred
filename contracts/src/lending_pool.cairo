use starknet::ContractAddress;

#[starknet::interface]
pub trait ILendingPool<TContractState> {
    fn deposit_collateral(ref self: TContractState, amount: u256, btc_address_hash: felt252);
    fn borrow(ref self: TContractState, amount: u256);
    fn repay(ref self: TContractState, amount: u256);
    fn withdraw_collateral(ref self: TContractState, amount: u256);
    fn liquidate(ref self: TContractState, user: ContractAddress);
    fn get_collateral(self: @TContractState, user: ContractAddress) -> u256;
    fn get_borrowed(self: @TContractState, user: ContractAddress) -> u256;
    fn get_total_debt(self: @TContractState, user: ContractAddress) -> u256;
    fn get_max_borrow(self: @TContractState, user: ContractAddress) -> u256;
    fn get_health_factor(self: @TContractState, user: ContractAddress) -> u256;
    fn get_position(self: @TContractState, user: ContractAddress) -> (u256, u256, u32, bool);
    fn add_liquidity(ref self: TContractState, amount: u256);
    fn get_available_liquidity(self: @TContractState) -> u256;
}

#[starknet::contract]
pub mod LendingPool {
    use starknet::{ContractAddress, get_caller_address, get_contract_address, get_block_timestamp};
    use starknet::storage::{
        Map, StorageMapReadAccess, StorageMapWriteAccess,
        StoragePointerReadAccess, StoragePointerWriteAccess,
    };
    use super::super::erc20::{IERC20Dispatcher, IERC20DispatcherTrait};
    use super::super::score_registry::{IScoreRegistryDispatcher, IScoreRegistryDispatcherTrait};

    const LIQUIDATION_THRESHOLD: u256 = 10000;
    const LIQUIDATION_BONUS_BPS: u256 = 500; // 5%

    #[storage]
    struct Storage {
        score_registry: ContractAddress,
        collateral_token: ContractAddress,
        borrow_token: ContractAddress,
        admin: ContractAddress,
        collateral_deposits: Map<ContractAddress, u256>,
        borrowed_amounts: Map<ContractAddress, u256>,
        borrow_timestamps: Map<ContractAddress, u64>,
        user_btc_hash: Map<ContractAddress, felt252>,
        cached_ratio: Map<ContractAddress, u32>,
        total_collateral: u256,
        total_borrowed: u256,
        available_liquidity: u256,
        interest_rate_bps: u32,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        CollateralDeposited: CollateralDeposited,
        Borrowed: Borrowed,
        Repaid: Repaid,
        CollateralWithdrawn: CollateralWithdrawn,
        Liquidated: Liquidated,
    }

    #[derive(Drop, starknet::Event)]
    pub struct CollateralDeposited {
        #[key] pub user: ContractAddress,
        pub amount: u256,
        pub btc_address_hash: felt252,
    }

    #[derive(Drop, starknet::Event)]
    pub struct Borrowed {
        #[key] pub user: ContractAddress,
        pub amount: u256,
        pub collateral_ratio: u32,
    }

    #[derive(Drop, starknet::Event)]
    pub struct Repaid {
        #[key] pub user: ContractAddress,
        pub amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    pub struct CollateralWithdrawn {
        #[key] pub user: ContractAddress,
        pub amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    pub struct Liquidated {
        #[key] pub user: ContractAddress,
        #[key] pub liquidator: ContractAddress,
        pub debt_repaid: u256,
        pub collateral_seized: u256,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        admin: ContractAddress,
        score_registry: ContractAddress,
        collateral_token: ContractAddress,
        borrow_token: ContractAddress,
        initial_interest_rate: u32,
    ) {
        self.admin.write(admin);
        self.score_registry.write(score_registry);
        self.collateral_token.write(collateral_token);
        self.borrow_token.write(borrow_token);
        self.interest_rate_bps.write(initial_interest_rate);
    }

    #[abi(embed_v0)]
    impl LendingPoolImpl of super::ILendingPool<ContractState> {

        fn deposit_collateral(ref self: ContractState, amount: u256, btc_address_hash: felt252) {
            assert(amount > 0, 'Amount must be positive');
            let caller = get_caller_address();

            let registry = IScoreRegistryDispatcher {
                contract_address: self.score_registry.read(),
            };
            let score = registry.get_score(btc_address_hash);
            assert(score >= 650, 'No valid score registered');

            let collateral_token = IERC20Dispatcher {
                contract_address: self.collateral_token.read(),
            };
            let success = collateral_token.transferFrom(caller, get_contract_address(), amount);
            assert(success, 'Collateral transfer failed');

            let ratio = registry.get_collateral_ratio(btc_address_hash);
            self.cached_ratio.write(caller, ratio);
            self.collateral_deposits.write(caller, self.collateral_deposits.read(caller) + amount);
            self.user_btc_hash.write(caller, btc_address_hash);
            self.total_collateral.write(self.total_collateral.read() + amount);

            self.emit(CollateralDeposited { user: caller, amount, btc_address_hash });
        }

        fn borrow(ref self: ContractState, amount: u256) {
            assert(amount > 0, 'Amount must be positive');
            let caller = get_caller_address();

            let btc_hash = self.user_btc_hash.read(caller);
            assert(btc_hash != 0, 'No BTC score linked');

            let registry = IScoreRegistryDispatcher {
                contract_address: self.score_registry.read(),
            };
            let ratio_bps: u256 = registry.get_collateral_ratio(btc_hash).into();
            self.cached_ratio.write(caller, ratio_bps.try_into().unwrap());

            let collateral = self.collateral_deposits.read(caller);
            let max_borrow = (collateral * 10000) / ratio_bps;

            let current_debt = self._compute_total_debt(caller);
            assert(current_debt + amount <= max_borrow, 'Exceeds borrow capacity');

            let available = self.available_liquidity.read();
            assert(amount <= available, 'Insufficient pool liquidity');

            // Settle accrued interest into principal before new borrow
            let principal = self.borrowed_amounts.read(caller);
            let accrued = current_debt - principal;
            self.borrowed_amounts.write(caller, principal + accrued + amount);
            self.borrow_timestamps.write(caller, get_block_timestamp());

            self.total_borrowed.write(self.total_borrowed.read() + amount);
            self.available_liquidity.write(available - amount);

            let borrow_token = IERC20Dispatcher {
                contract_address: self.borrow_token.read(),
            };
            let success = borrow_token.transfer(caller, amount);
            assert(success, 'Borrow transfer failed');

            self.emit(Borrowed {
                user: caller,
                amount,
                collateral_ratio: ratio_bps.try_into().unwrap(),
            });
        }

        fn repay(ref self: ContractState, amount: u256) {
            let caller = get_caller_address();
            let total_debt = self._compute_total_debt(caller);
            assert(total_debt > 0, 'No outstanding debt');

            let repay_amount = if amount > total_debt { total_debt } else { amount };

            let borrow_token = IERC20Dispatcher {
                contract_address: self.borrow_token.read(),
            };
            let success = borrow_token.transferFrom(caller, get_contract_address(), repay_amount);
            assert(success, 'Repay transfer failed');

            let principal = self.borrowed_amounts.read(caller);
            let new_principal = if repay_amount >= principal { 0 } else { principal - repay_amount };
            self.borrowed_amounts.write(caller, new_principal);

            if new_principal == 0 {
                self.borrow_timestamps.write(caller, 0);
            } else {
                self.borrow_timestamps.write(caller, get_block_timestamp());
            }

            let total_borrowed = self.total_borrowed.read();
            let reduce = if repay_amount > total_borrowed { total_borrowed } else { repay_amount };
            self.total_borrowed.write(total_borrowed - reduce);
            self.available_liquidity.write(self.available_liquidity.read() + repay_amount);

            self.emit(Repaid { user: caller, amount: repay_amount });
        }

        fn withdraw_collateral(ref self: ContractState, amount: u256) {
            let caller = get_caller_address();
            assert(self._compute_total_debt(caller) == 0, 'Repay debt first');

            let collateral = self.collateral_deposits.read(caller);
            assert(amount <= collateral, 'Exceeds deposited collateral');

            let collateral_token = IERC20Dispatcher {
                contract_address: self.collateral_token.read(),
            };
            let success = collateral_token.transfer(caller, amount);
            assert(success, 'Withdrawal failed');

            self.collateral_deposits.write(caller, collateral - amount);
            self.total_collateral.write(self.total_collateral.read() - amount);

            self.emit(CollateralWithdrawn { user: caller, amount });
        }

        fn liquidate(ref self: ContractState, user: ContractAddress) {
            let health = self.get_health_factor(user);
            assert(health < LIQUIDATION_THRESHOLD, 'Position is healthy');

            let liquidator = get_caller_address();
            let total_debt = self._compute_total_debt(user);
            let collateral = self.collateral_deposits.read(user);

            let borrow_token = IERC20Dispatcher {
                contract_address: self.borrow_token.read(),
            };
            let success = borrow_token.transferFrom(liquidator, get_contract_address(), total_debt);
            assert(success, 'Liquidation repay failed');

            let bonus = (collateral * LIQUIDATION_BONUS_BPS) / 10000;
            let seize = collateral + bonus;
            let actual_seize = if seize > collateral { collateral } else { seize };

            let collateral_token = IERC20Dispatcher {
                contract_address: self.collateral_token.read(),
            };
            let success2 = collateral_token.transfer(liquidator, actual_seize);
            assert(success2, 'Seize transfer failed');

            self.collateral_deposits.write(user, 0);
            self.borrowed_amounts.write(user, 0);
            self.borrow_timestamps.write(user, 0);

            let total_borrowed = self.total_borrowed.read();
            self.total_borrowed.write(
                if total_debt > total_borrowed { 0 } else { total_borrowed - total_debt }
            );
            self.available_liquidity.write(self.available_liquidity.read() + total_debt);

            self.emit(Liquidated {
                user, liquidator, debt_repaid: total_debt, collateral_seized: actual_seize,
            });
        }

        fn get_collateral(self: @ContractState, user: ContractAddress) -> u256 {
            self.collateral_deposits.read(user)
        }

        fn get_borrowed(self: @ContractState, user: ContractAddress) -> u256 {
            self.borrowed_amounts.read(user)
        }

        fn get_total_debt(self: @ContractState, user: ContractAddress) -> u256 {
            self._compute_total_debt(user)
        }

        fn get_max_borrow(self: @ContractState, user: ContractAddress) -> u256 {
            let btc_hash = self.user_btc_hash.read(user);
            if btc_hash == 0 { return 0; }
            let registry = IScoreRegistryDispatcher {
                contract_address: self.score_registry.read(),
            };
            let ratio_bps: u256 = registry.get_collateral_ratio(btc_hash).into();
            (self.collateral_deposits.read(user) * 10000) / ratio_bps
        }

        fn get_health_factor(self: @ContractState, user: ContractAddress) -> u256 {
            let debt = self._compute_total_debt(user);
            if debt == 0 { return 99999_u256; }
            (self.collateral_deposits.read(user) * 10000) / debt
        }

        fn get_position(self: @ContractState, user: ContractAddress) -> (u256, u256, u32, bool) {
            let collateral = self.collateral_deposits.read(user);
            let debt = self._compute_total_debt(user);
            let ratio = self.cached_ratio.read(user);
            let health = self.get_health_factor(user);
            (collateral, debt, ratio, health < LIQUIDATION_THRESHOLD)
        }

        fn add_liquidity(ref self: ContractState, amount: u256) {
            let caller = get_caller_address();
            assert(caller == self.admin.read(), 'Only admin');
            let borrow_token = IERC20Dispatcher {
                contract_address: self.borrow_token.read(),
            };
            let success = borrow_token.transferFrom(caller, get_contract_address(), amount);
            assert(success, 'Liquidity transfer failed');
            self.available_liquidity.write(self.available_liquidity.read() + amount);
        }

        fn get_available_liquidity(self: @ContractState) -> u256 {
            self.available_liquidity.read()
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn _compute_total_debt(self: @ContractState, user: ContractAddress) -> u256 {
            let principal = self.borrowed_amounts.read(user);
            if principal == 0 { return 0; }
            let ts = self.borrow_timestamps.read(user);
            if ts == 0 { return principal; }
            let now: u256 = get_block_timestamp().into();
            let elapsed: u256 = now - ts.into();
            let rate: u256 = self.interest_rate_bps.read().into();
            let interest = (principal * rate * elapsed) / (10000_u256 * 31536000_u256);
            principal + interest
        }
    }
}
