use contracts::score_registry::{IScoreRegistryDispatcher, IScoreRegistryDispatcherTrait};
use contracts::lending_pool::{ILendingPoolDispatcher, ILendingPoolDispatcherTrait};
use snforge_std_deprecated::{
    ContractClassTrait, DeclareResultTrait, declare,
    start_cheat_caller_address_global, stop_cheat_caller_address_global,
};
use starknet::ContractAddress;

// ─── Deploy helpers ───────────────────────────────────────────────────────────

fn admin() -> ContractAddress { 'admin'.try_into().unwrap() }
fn user() -> ContractAddress { 'user'.try_into().unwrap() }
fn wbtc() -> ContractAddress { 'wbtc'.try_into().unwrap() }
fn usdc() -> ContractAddress { 'usdc'.try_into().unwrap() }

fn deploy_registry(admin: ContractAddress) -> IScoreRegistryDispatcher {
    let contract = declare("ScoreRegistry").unwrap().contract_class();
    let (contract_address, _) = contract.deploy(@array![admin.into()]).unwrap();
    IScoreRegistryDispatcher { contract_address }
}

fn deploy_lending(
    admin: ContractAddress,
    registry: ContractAddress,
    collateral_token: ContractAddress,
    borrow_token: ContractAddress,
) -> ILendingPoolDispatcher {
    let contract = declare("LendingPool").unwrap().contract_class();
    let (contract_address, _) = contract
        .deploy(
            @array![
                admin.into(),
                registry.into(),
                collateral_token.into(),
                borrow_token.into(),
                500_u32.into(),
            ]
        )
        .unwrap();
    ILendingPoolDispatcher { contract_address }
}

fn setup() -> (IScoreRegistryDispatcher, ILendingPoolDispatcher) {
    let registry = deploy_registry(admin());
    let lending = deploy_lending(admin(), registry.contract_address, wbtc(), usdc());
    (registry, lending)
}

// ─── LendingPool tests ────────────────────────────────────────────────────────

#[test]
fn test_deploy_lending_pool() {
    let (_, lending) = setup();
    assert_eq!(lending.get_available_liquidity(), 0, "liquidity should start at 0");
}

#[test]
fn test_position_empty_for_new_user() {
    let (_, lending) = setup();
    let (collateral, debt, ratio, liquidatable) = lending.get_position(user());

    assert_eq!(collateral, 0, "collateral should be 0");
    assert_eq!(debt, 0, "debt should be 0");
    assert_eq!(ratio, 0, "ratio should be 0");
    assert_eq!(liquidatable, false, "should not be liquidatable");
}

#[test]
fn test_health_factor_no_debt() {
    let (_, lending) = setup();
    assert_eq!(lending.get_health_factor(user()), 99999, "health factor should be max");
}

#[test]
fn test_max_borrow_no_score() {
    let (_, lending) = setup();
    assert_eq!(lending.get_max_borrow(user()), 0, "max borrow should be 0 with no score");
}

#[test]
fn test_collateral_ratio_tiers_via_registry() {
    let (registry, _) = setup();
    start_cheat_caller_address_global(admin());

    registry.register_score('wallet_800', 800, array![].span());
    registry.register_score('wallet_750', 750, array![].span());
    registry.register_score('wallet_700', 700, array![].span());
    registry.register_score('wallet_650', 650, array![].span());

    assert_eq!(registry.get_collateral_ratio('wallet_800'), 11000, "800 -> 110%");
    assert_eq!(registry.get_collateral_ratio('wallet_750'), 11500, "750 -> 115%");
    assert_eq!(registry.get_collateral_ratio('wallet_700'), 12000, "700 -> 120%");
    assert_eq!(registry.get_collateral_ratio('wallet_650'), 13000, "650 -> 130%");

    stop_cheat_caller_address_global();
}

#[test]
#[should_panic(expected: 'No BTC score linked')]
fn test_borrow_fails_without_score() {
    let (_, lending) = setup();
    start_cheat_caller_address_global(user());
    lending.borrow(1000_u256);
    stop_cheat_caller_address_global();
}

#[test]
#[should_panic(expected: 'Amount must be positive')]
fn test_deposit_zero_amount_fails() {
    let (_, lending) = setup();
    start_cheat_caller_address_global(user());
    lending.deposit_collateral(0_u256, 'some_hash');
    stop_cheat_caller_address_global();
}

#[test]
#[should_panic(expected: 'Amount must be positive')]
fn test_borrow_zero_amount_fails() {
    let (_, lending) = setup();
    start_cheat_caller_address_global(user());
    lending.borrow(0_u256);
    stop_cheat_caller_address_global();
}

#[test]
#[should_panic(expected: 'No outstanding debt')]
fn test_repay_with_no_debt_fails() {
    let (_, lending) = setup();
    start_cheat_caller_address_global(user());
    lending.repay(100_u256);
    stop_cheat_caller_address_global();
}

#[test]
#[should_panic(expected: 'Position is healthy')]
fn test_liquidate_healthy_position_fails() {
    let liquidator: ContractAddress = 'liquidator'.try_into().unwrap();
    let (_, lending) = setup();
    start_cheat_caller_address_global(liquidator);
    lending.liquidate(user());
    stop_cheat_caller_address_global();
}

#[test]
#[should_panic(expected: 'Only admin')]
fn test_add_liquidity_non_admin_fails() {
    let (_, lending) = setup();
    start_cheat_caller_address_global(user());
    lending.add_liquidity(1000_u256);
    stop_cheat_caller_address_global();
}

// ─── Registry cooldown tests ──────────────────────────────────────────────────

#[test]
#[should_panic(expected: 'Score not registered')]
fn test_update_unregistered_score_fails() {
    let (registry, _) = setup();
    start_cheat_caller_address_global(admin());
    registry.update_score('no_such_wallet', 750, array![].span());
    stop_cheat_caller_address_global();
}

#[test]
#[should_panic(expected: '30-day cooldown active')]
fn test_update_score_before_cooldown_fails() {
    let (registry, _) = setup();
    start_cheat_caller_address_global(admin());
    registry.register_score('btc_cooldown', 700, array![].span());
    registry.update_score('btc_cooldown', 750, array![].span());
    stop_cheat_caller_address_global();
}

#[test]
fn test_score_boundary_values() {
    let (registry, _) = setup();
    start_cheat_caller_address_global(admin());

    registry.register_score('min_score', 650, array![].span());
    registry.register_score('max_score', 850, array![].span());

    assert_eq!(registry.get_score('min_score'), 650, "min score mismatch");
    assert_eq!(registry.get_score('max_score'), 850, "max score mismatch");
    assert_eq!(registry.get_score_tier('min_score'), 4, "min should be tier 4");
    assert_eq!(registry.get_score_tier('max_score'), 1, "max should be tier 1");

    stop_cheat_caller_address_global();
}

#[test]
fn test_different_wallets_have_independent_scores() {
    let (registry, _) = setup();
    start_cheat_caller_address_global(admin());

    registry.register_score('wallet_a', 820, array![].span());
    registry.register_score('wallet_b', 660, array![].span());

    assert_eq!(registry.get_score('wallet_a'), 820, "wallet_a score mismatch");
    assert_eq!(registry.get_score('wallet_b'), 660, "wallet_b score mismatch");
    assert_eq!(registry.get_score_tier('wallet_a'), 1, "wallet_a should be tier 1");
    assert_eq!(registry.get_score_tier('wallet_b'), 4, "wallet_b should be tier 4");

    stop_cheat_caller_address_global();
}
