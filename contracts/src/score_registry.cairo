use starknet::ContractAddress;

#[starknet::interface]
pub trait IScoreRegistry<TContractState> {
    fn register_score(
        ref self: TContractState,
        btc_address_hash: felt252,
        score: u16,
        proof: Span<felt252>,
    );
    fn update_score(
        ref self: TContractState,
        btc_address_hash: felt252,
        new_score: u16,
        proof: Span<felt252>,
    );
    fn get_score(self: @TContractState, btc_address_hash: felt252) -> u16;
    fn get_last_updated(self: @TContractState, btc_address_hash: felt252) -> u64;
    fn get_owner(self: @TContractState, btc_address_hash: felt252) -> ContractAddress;
    fn get_collateral_ratio(self: @TContractState, btc_address_hash: felt252) -> u32;
    fn approve_scorer(ref self: TContractState, scorer: ContractAddress);
    fn revoke_scorer(ref self: TContractState, scorer: ContractAddress);
    fn is_approved_scorer(self: @TContractState, scorer: ContractAddress) -> bool;
    fn get_score_tier(self: @TContractState, btc_address_hash: felt252) -> u8;
}

#[starknet::contract]
pub mod ScoreRegistry {
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp};
    use starknet::storage::{
        Map, StorageMapReadAccess, StorageMapWriteAccess,
        StoragePointerReadAccess, StoragePointerWriteAccess,
    };

    const MIN_SCORE: u16 = 650;
    const MAX_SCORE: u16 = 850;
    const MIN_UPDATE_INTERVAL: u64 = 2592000; // 30 days
    const RATIO_TIER_1: u32 = 11000; // 110%
    const RATIO_TIER_2: u32 = 11500; // 115%
    const RATIO_TIER_3: u32 = 12000; // 120%
    const RATIO_TIER_4: u32 = 13000; // 130%
    const RATIO_DEFAULT: u32 = 15000; // 150%

    #[storage]
    struct Storage {
        scores: Map<felt252, u16>,
        last_updated: Map<felt252, u64>,
        score_owners: Map<felt252, ContractAddress>,
        admin: ContractAddress,
        approved_scorers: Map<ContractAddress, bool>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        ScoreRegistered: ScoreRegistered,
        ScoreUpdated: ScoreUpdated,
        ScorerApproved: ScorerApproved,
        ScorerRevoked: ScorerRevoked,
    }

    #[derive(Drop, starknet::Event)]
    pub struct ScoreRegistered {
        #[key]
        pub btc_address_hash: felt252,
        pub owner: ContractAddress,
        pub score: u16,
        pub tier: u8,
        pub collateral_ratio: u32,
        pub timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct ScoreUpdated {
        #[key]
        pub btc_address_hash: felt252,
        pub old_score: u16,
        pub new_score: u16,
        pub timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct ScorerApproved {
        pub scorer: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    pub struct ScorerRevoked {
        pub scorer: ContractAddress,
    }

    #[constructor]
    fn constructor(ref self: ContractState, admin: ContractAddress) {
        self.admin.write(admin);
        self.approved_scorers.write(admin, true);
    }

    #[abi(embed_v0)]
    impl ScoreRegistryImpl of super::IScoreRegistry<ContractState> {

        fn register_score(
            ref self: ContractState,
            btc_address_hash: felt252,
            score: u16,
            proof: Span<felt252>,
        ) {
            assert(score >= MIN_SCORE && score <= MAX_SCORE, 'Invalid score range');

            let caller = get_caller_address();
            assert(self.approved_scorers.read(caller), 'Not approved scorer');

            let existing = self.scores.read(btc_address_hash);
            assert(existing == 0, 'Score already registered');

            let timestamp = get_block_timestamp();
            let tier = self._score_to_tier(score);
            let ratio = self._tier_to_ratio(tier);

            self.scores.write(btc_address_hash, score);
            self.score_owners.write(btc_address_hash, caller);
            self.last_updated.write(btc_address_hash, timestamp);

            self.emit(ScoreRegistered {
                btc_address_hash,
                owner: caller,
                score,
                tier,
                collateral_ratio: ratio,
                timestamp,
            });
        }

        fn update_score(
            ref self: ContractState,
            btc_address_hash: felt252,
            new_score: u16,
            proof: Span<felt252>,
        ) {
            assert(new_score >= MIN_SCORE && new_score <= MAX_SCORE, 'Invalid score range');

            let caller = get_caller_address();
            let owner = self.score_owners.read(btc_address_hash);
            assert(
                caller == owner || self.approved_scorers.read(caller),
                'Not authorized',
            );

            let old_score = self.scores.read(btc_address_hash);
            assert(old_score != 0, 'Score not registered');

            let last = self.last_updated.read(btc_address_hash);
            let now = get_block_timestamp();
            assert(now - last >= MIN_UPDATE_INTERVAL, '30-day cooldown active');

            self.scores.write(btc_address_hash, new_score);
            self.last_updated.write(btc_address_hash, now);

            self.emit(ScoreUpdated {
                btc_address_hash,
                old_score,
                new_score,
                timestamp: now,
            });
        }

        fn get_score(self: @ContractState, btc_address_hash: felt252) -> u16 {
            self.scores.read(btc_address_hash)
        }

        fn get_last_updated(self: @ContractState, btc_address_hash: felt252) -> u64 {
            self.last_updated.read(btc_address_hash)
        }

        fn get_owner(self: @ContractState, btc_address_hash: felt252) -> ContractAddress {
            self.score_owners.read(btc_address_hash)
        }

        fn get_collateral_ratio(self: @ContractState, btc_address_hash: felt252) -> u32 {
            let score = self.scores.read(btc_address_hash);
            if score == 0 {
                return RATIO_DEFAULT;
            }
            let tier = self._score_to_tier(score);
            self._tier_to_ratio(tier)
        }

        fn get_score_tier(self: @ContractState, btc_address_hash: felt252) -> u8 {
            let score = self.scores.read(btc_address_hash);
            if score == 0 {
                return 0;
            }
            self._score_to_tier(score)
        }

        fn approve_scorer(ref self: ContractState, scorer: ContractAddress) {
            let caller = get_caller_address();
            assert(caller == self.admin.read(), 'Only admin');
            self.approved_scorers.write(scorer, true);
            self.emit(ScorerApproved { scorer });
        }

        fn revoke_scorer(ref self: ContractState, scorer: ContractAddress) {
            let caller = get_caller_address();
            assert(caller == self.admin.read(), 'Only admin');
            self.approved_scorers.write(scorer, false);
            self.emit(ScorerRevoked { scorer });
        }

        fn is_approved_scorer(self: @ContractState, scorer: ContractAddress) -> bool {
            self.approved_scorers.read(scorer)
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn _score_to_tier(self: @ContractState, score: u16) -> u8 {
            if score >= 800 { 1_u8 }
            else if score >= 750 { 2_u8 }
            else if score >= 700 { 3_u8 }
            else { 4_u8 }
        }

        fn _tier_to_ratio(self: @ContractState, tier: u8) -> u32 {
            if tier == 1 { RATIO_TIER_1 }
            else if tier == 2 { RATIO_TIER_2 }
            else if tier == 3 { RATIO_TIER_3 }
            else { RATIO_TIER_4 }
        }
    }
}
