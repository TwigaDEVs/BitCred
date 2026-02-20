"""
Deploy BitCred contracts to Starknet Sepolia testnet.

Usage:
    python deploy.py \
        --private-key 0x... \
        --account 0x...

Prerequisites:
    1. pip install starknet-py
    2. scarb build completed in ../contracts
    3. Account funded on Sepolia
"""

import asyncio
import argparse
import json
import os
from pathlib import Path
from starknet_py.net.full_node_client import FullNodeClient
from starknet_py.net.account.account import Account
from starknet_py.net.models.chains import StarknetChainId
from starknet_py.net.signer.stark_curve_signer import KeyPair
from starknet_py.contract import Contract

# ─── Config ───────────────────────────────────────────────────────────────────

RPC_ENDPOINTS = [
    os.getenv("STARKNET_RPC_URL"),
    "https://rpc.starknet-testnet.lava.build",
    "https://starknet-sepolia.public.blastapi.io/rpc/v0_9",
    "https://free-rpc.nethermind.io/sepolia-juno",
]

# Scarb outputs: contracts/target/dev/contracts_<Name>.contract_class.json
ARTIFACTS_DIR = Path(__file__).parent.parent / "contracts" / "target" / "dev"


# ─── Helpers ──────────────────────────────────────────────────────────────────

def load_contract(contract_name: str) -> tuple[dict, dict]:
    """Load Sierra + CASM from Scarb build artifacts."""
    sierra_path = ARTIFACTS_DIR / f"contracts_{contract_name}.contract_class.json"
    casm_path   = ARTIFACTS_DIR / f"contracts_{contract_name}.compiled_contract_class.json"

    if not sierra_path.exists():
        raise FileNotFoundError(f"Sierra not found: {sierra_path}\nRun 'scarb build' first.")
    if not casm_path.exists():
        raise FileNotFoundError(f"CASM not found: {casm_path}\nEnsure 'casm = true' in Scarb.toml")

    with open(sierra_path) as f:
        sierra = json.load(f)
    with open(casm_path) as f:
        casm = json.load(f)

    return sierra, casm


async def get_working_client() -> FullNodeClient:
    """Try RPC endpoints in order, return first that responds."""
    for url in filter(None, RPC_ENDPOINTS):
        try:
            client = FullNodeClient(node_url=url)
            await client.get_block_number()
            print(f"   ✅ Connected: {url}\n")
            return client
        except Exception:
            print(f"   ❌ Unreachable: {url}")
    raise ConnectionError("All RPC endpoints failed.")


# ─── Declare + Deploy ─────────────────────────────────────────────────────────

async def declare_and_deploy(account: Account, contract_name: str, constructor_args: list) -> int:
    """Declare if needed, then deploy. Returns deployed contract address."""
    print(f"📝 Declaring {contract_name}...")
    sierra, casm = load_contract(contract_name)

    declare_result = await Contract.declare_v3(
        account=account,
        compiled_contract=json.dumps(sierra),
        compiled_contract_casm=json.dumps(casm),
    )
    await declare_result.wait_for_acceptance()
    print(f"   Class hash: {hex(declare_result.class_hash)}")

    print(f"🚀 Deploying {contract_name}...")
    print(f"   Constructor args: {[hex(a) if isinstance(a, int) else a for a in constructor_args]}")

    deploy_result = await declare_result.deploy_v3(constructor_args=constructor_args)
    await deploy_result.wait_for_acceptance()

    address = deploy_result.deployed_contract.address
    print(f"   ✅ Address: {hex(address)}\n")
    return address


# ─── Main ─────────────────────────────────────────────────────────────────────

async def deploy(private_key: str, account_address: str):
    print("\n🏗️  BITCRED PYTHON DEPLOY SCRIPT")
    print("=" * 50)
    print(f"Account: {account_address}")
    print(f"Network: Starknet Sepolia\n")

    print("🔌 Finding working RPC endpoint...")
    client = await get_working_client()

    account = Account(
        client=client,
        address=int(account_address, 16),
        key_pair=KeyPair.from_private_key(int(private_key, 16)),
        chain=StarknetChainId.SEPOLIA,
    )

    # ── 1. ScoreRegistry ──────────────────────────────────────────────────────
    # constructor(admin: ContractAddress)
    registry_address = await declare_and_deploy(
        account=account,
        contract_name="ScoreRegistry",
        constructor_args=[int(account_address, 16)],  # admin = deployer
    )

    # ── 2. LendingPool ────────────────────────────────────────────────────────
    # constructor(admin, score_registry, collateral_token, borrow_token, interest_rate)
    wbtc_address  = int(os.getenv("WBTC_ADDRESS",  "0x0"), 16)
    usdc_address  = int(os.getenv("USDC_ADDRESS",  "0x0"), 16)
    interest_rate = 500  # 5% annual in basis points

    lending_address = await declare_and_deploy(
        account=account,
        contract_name="LendingPool",
        constructor_args=[
            int(account_address, 16),  # admin
            registry_address,          # score_registry
            wbtc_address,              # collateral_token
            usdc_address,              # borrow_token
            interest_rate,             # initial_interest_rate
        ],
    )

    # ── 3. Save to backend/.env ───────────────────────────────────────────────
    env_path = Path(__file__).parent.parent / "backend" / ".env"
    env_path.parent.mkdir(parents=True, exist_ok=True)

    with open(env_path, "w") as f:
        f.write(f"STARKNET_RPC_URL={client.url}\n")
        f.write(f"REGISTRY_ADDRESS={hex(registry_address)}\n")
        f.write(f"LENDING_ADDRESS={hex(lending_address)}\n")
        f.write(f"SCORER_ACCOUNT_ADDR={account_address}\n")
        f.write(f"SCORER_PRIVATE_KEY={private_key}\n")

    print("=" * 50)
    print("ALL CONTRACTS DEPLOYED 🎉")
    print("=" * 50)
    print(f"\n  SCORE_REGISTRY: {hex(registry_address)}")
    print(f"  LENDING_POOL:   {hex(lending_address)}")
    print(f"\n💾 Saved to {env_path}")
    print("\n📋 Next steps:")
    print("  1. Add WBTC_ADDRESS + USDC_ADDRESS to backend/.env")
    print("  2. pip install -r backend/requirements.txt")
    print("  3. uvicorn backend.api.main:app --reload")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Deploy BitCred contracts to Starknet Sepolia")
    parser.add_argument("--private-key", required=True, help="Starknet account private key (0x...)")
    parser.add_argument("--account",     required=True, help="Starknet account address (0x...)")
    args = parser.parse_args()

    asyncio.run(deploy(args.private_key, args.account))