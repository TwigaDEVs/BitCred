use contracts::score_registry::{IScoreRegistryDispatcher, IScoreRegistryDispatcherTrait};
use snforge_std_deprecated::{
    ContractClassTrait, DeclareResultTrait, declare,
    start_cheat_caller_address_global, stop_cheat_caller_address_global,
};
use starknet::ContractAddress;

// ─── Deploy helper ────────────────────────────────────────────────────────────

fn deploy_registry(admin: ContractAddress) -> IScoreRegistryDispatcher {
    let contract = declare("ScoreRegistry").unwrap().contract_class();
    let (contract_address, _) = contract.deploy(@array![admin.into()]).unwrap();
    IScoreRegistryDispatcher { contract_address }
}

fn admin() -> ContractAddress {
    'admin'.try_into().unwrap()
}

fn scorer() -> ContractAddress {
    'scorer'.try_into().unwrap()
}

// ─── Tests ────────────────────────────────────────────────────────────────────

#[test]
fn test_deploy_registry() {
    let registry = deploy_registry(admin());
    assert_eq!(registry.is_approved_scorer(admin()), true, "admin should be approved scorer");
}

#[test]
fn test_register_score_tier_1() {
    let registry = deploy_registry(admin());
    start_cheat_caller_address_global(admin());

    registry.register_score('btc_wallet_1', 820, array![].span());

    assert_eq!(registry.get_score('btc_wallet_1'), 820, "score mismatch");
    assert_eq!(registry.get_score_tier('btc_wallet_1'), 1, "should be tier 1");
    assert_eq!(registry.get_collateral_ratio('btc_wallet_1'), 11000, "ratio should be 110%");

    stop_cheat_caller_address_global();
}

#[test]
fn test_register_score_tier_2() {
    let registry = deploy_registry(admin());
    start_cheat_caller_address_global(admin());

    registry.register_score('btc_wallet_2', 760, array![].span());

    assert_eq!(registry.get_score_tier('btc_wallet_2'), 2, "should be tier 2");
    assert_eq!(registry.get_collateral_ratio('btc_wallet_2'), 11500, "ratio should be 115%");

    stop_cheat_caller_address_global();
}

#[test]
fn test_register_score_tier_3() {
    let registry = deploy_registry(admin());
    start_cheat_caller_address_global(admin());

    registry.register_score('btc_wallet_3', 720, array![].span());

    assert_eq!(registry.get_score_tier('btc_wallet_3'), 3, "should be tier 3");
    assert_eq!(registry.get_collateral_ratio('btc_wallet_3'), 12000, "ratio should be 120%");

    stop_cheat_caller_address_global();
}

#[test]
fn test_register_score_tier_4() {
    let registry = deploy_registry(admin());
    start_cheat_caller_address_global(admin());

    registry.register_score('btc_wallet_4', 660, array![].span());

    assert_eq!(registry.get_score_tier('btc_wallet_4'), 4, "should be tier 4");
    assert_eq!(registry.get_collateral_ratio('btc_wallet_4'), 13000, "ratio should be 130%");

    stop_cheat_caller_address_global();
}

#[test]
fn test_default_ratio_for_unregistered() {
    let registry = deploy_registry(admin());

    assert_eq!(registry.get_collateral_ratio('unknown_wallet'), 15000, "default ratio should be 150%");
    assert_eq!(registry.get_score_tier('unknown_wallet'), 0, "tier should be 0");
}

#[test]
#[should_panic(expected: 'Score already registered')]
fn test_cannot_register_twice() {
    let registry = deploy_registry(admin());
    start_cheat_caller_address_global(admin());

    registry.register_score('btc_dup', 750, array![].span());
    registry.register_score('btc_dup', 800, array![].span());

    stop_cheat_caller_address_global();
}

#[test]
#[should_panic(expected: 'Invalid score range')]
fn test_score_out_of_range_high() {
    let registry = deploy_registry(admin());
    start_cheat_caller_address_global(admin());
    registry.register_score('btc_bad', 900, array![].span());
    stop_cheat_caller_address_global();
}

#[test]
#[should_panic(expected: 'Invalid score range')]
fn test_score_out_of_range_low() {
    let registry = deploy_registry(admin());
    start_cheat_caller_address_global(admin());
    registry.register_score('btc_bad', 600, array![].span());
    stop_cheat_caller_address_global();
}

#[test]
#[should_panic(expected: 'Not approved scorer')]
fn test_unapproved_scorer_cannot_register() {
    let hacker: ContractAddress = 'hacker'.try_into().unwrap();
    let registry = deploy_registry(admin());

    start_cheat_caller_address_global(hacker);
    registry.register_score('btc_hack', 800, array![].span());
    stop_cheat_caller_address_global();
}

#[test]
fn test_approve_and_revoke_scorer() {
    let registry = deploy_registry(admin());
    start_cheat_caller_address_global(admin());

    registry.approve_scorer(scorer());
    assert_eq!(registry.is_approved_scorer(scorer()), true, "scorer should be approved");

    registry.revoke_scorer(scorer());
    assert_eq!(registry.is_approved_scorer(scorer()), false, "scorer should be revoked");

    stop_cheat_caller_address_global();
}

#[test]
#[should_panic(expected: 'Only admin')]
fn test_non_admin_cannot_approve_scorer() {
    let rando: ContractAddress = 'rando'.try_into().unwrap();
    let registry = deploy_registry(admin());

    start_cheat_caller_address_global(rando);
    registry.approve_scorer(rando);
    stop_cheat_caller_address_global();
}

#[test]
fn test_approved_scorer_can_register() {
    let registry = deploy_registry(admin());

    start_cheat_caller_address_global(admin());
    registry.approve_scorer(scorer());
    stop_cheat_caller_address_global();

    start_cheat_caller_address_global(scorer());
    registry.register_score('btc_scorer_test', 780, array![].span());
    stop_cheat_caller_address_global();

    assert_eq!(registry.get_score('btc_scorer_test'), 780, "score should be 780");
}

#[test]
fn test_get_owner_matches_registration() {
    let registry = deploy_registry(admin());

    start_cheat_caller_address_global(admin());
    registry.register_score('btc_owner_test', 800, array![].span());
    stop_cheat_caller_address_global();

    assert_eq!(registry.get_owner('btc_owner_test'), admin(), "owner should be admin");
}

#[test]
fn test_score_boundary_values() {
    let registry = deploy_registry(admin());
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
fn test_different_wallets_independent_scores() {
    let registry = deploy_registry(admin());
    start_cheat_caller_address_global(admin());

    registry.register_score('wallet_a', 820, array![].span());
    registry.register_score('wallet_b', 660, array![].span());

    assert_eq!(registry.get_score('wallet_a'), 820, "wallet_a score mismatch");
    assert_eq!(registry.get_score('wallet_b'), 660, "wallet_b score mismatch");
    assert_eq!(registry.get_score_tier('wallet_a'), 1, "wallet_a should be tier 1");
    assert_eq!(registry.get_score_tier('wallet_b'), 4, "wallet_b should be tier 4");

    stop_cheat_caller_address_global();
}
