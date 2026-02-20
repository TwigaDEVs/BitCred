import os, sys
sys.path.insert(0, '.')
from dotenv import load_dotenv
load_dotenv()

import aiohttp
from starknet_py.net.full_node_client import FullNodeClient
from starknet_py.contract import Contract
from starknet_py.net.models.chains import StarknetChainId
from starknet_py.net.account.account import Account
from starknet_py.net.signer.stark_curve_signer import KeyPair
from starknet_py.net.client_models import ResourceBounds

REGISTRY_ADDRESS    = os.getenv("REGISTRY_ADDRESS", "0x0")
LENDING_ADDRESS     = os.getenv("LENDING_ADDRESS",  "0x0")
SCORER_PRIVATE_KEY  = os.getenv("SCORER_PRIVATE_KEY",  "0x0")
SCORER_ACCOUNT_ADDR = os.getenv("SCORER_ACCOUNT_ADDR", "0x0")

READ_RPC  = os.getenv("STARKNET_RPC_URL", "https://rpc.starknet-testnet.lava.build")
WRITE_RPC = READ_RPC

REGISTRY_ADDRESS_INT = int(REGISTRY_ADDRESS, 16)
LENDING_ADDRESS_INT  = int(LENDING_ADDRESS,  16)

# Skip estimate_fee RPC call entirely by providing explicit bounds
L1_BOUNDS = ResourceBounds(max_amount=100_000, max_price_per_unit=10**12)

REGISTRY_ABI = [
    {"name":"register_score","type":"function","inputs":[{"name":"btc_address_hash","type":"core::felt252"},{"name":"score","type":"core::integer::u16"},{"name":"proof","type":"core::array::Span::<core::felt252>"}],"outputs":[],"state_mutability":"external"},
    {"name":"update_score","type":"function","inputs":[{"name":"btc_address_hash","type":"core::felt252"},{"name":"new_score","type":"core::integer::u16"},{"name":"proof","type":"core::array::Span::<core::felt252>"}],"outputs":[],"state_mutability":"external"},
    {"name":"get_score","type":"function","inputs":[{"name":"btc_address_hash","type":"core::felt252"}],"outputs":[{"type":"core::integer::u16"}],"state_mutability":"view"},
    {"name":"get_collateral_ratio","type":"function","inputs":[{"name":"btc_address_hash","type":"core::felt252"}],"outputs":[{"type":"core::integer::u32"}],"state_mutability":"view"},
    {"name":"get_score_tier","type":"function","inputs":[{"name":"btc_address_hash","type":"core::felt252"}],"outputs":[{"type":"core::integer::u8"}],"state_mutability":"view"},
    {"name":"get_last_updated","type":"function","inputs":[{"name":"btc_address_hash","type":"core::felt252"}],"outputs":[{"type":"core::integer::u64"}],"state_mutability":"view"},
    {"name":"is_approved_scorer","type":"function","inputs":[{"name":"scorer","type":"core::starknet::contract_address::ContractAddress"}],"outputs":[{"type":"core::bool"}],"state_mutability":"view"},
]

LENDING_ABI = [
    {"name":"get_position","type":"function","inputs":[{"name":"user","type":"core::starknet::contract_address::ContractAddress"}],"outputs":[{"type":"core::integer::u256"},{"type":"core::integer::u256"},{"type":"core::integer::u32"},{"type":"core::bool"}],"state_mutability":"view"},
    {"name":"get_health_factor","type":"function","inputs":[{"name":"user","type":"core::starknet::contract_address::ContractAddress"}],"outputs":[{"type":"core::integer::u256"}],"state_mutability":"view"},
    {"name":"get_max_borrow","type":"function","inputs":[{"name":"user","type":"core::starknet::contract_address::ContractAddress"}],"outputs":[{"type":"core::integer::u256"}],"state_mutability":"view"},
    {"name":"get_available_liquidity","type":"function","inputs":[],"outputs":[{"type":"core::integer::u256"}],"state_mutability":"view"},
]


async def _raw_get_nonce(address_int: int) -> int:
    """
    Call starknet_getNonce directly via aiohttp with "latest" as a plain JSON string.
    This completely bypasses starknet_py's HTTP layer and its block_id serialization.
    """
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "starknet_getNonce",
        "params": {
            "block_id": "latest",
            "contract_address": hex(address_int)
        }
    }
    async with aiohttp.ClientSession() as session:
        async with session.post(WRITE_RPC, json=payload) as resp:
            data = await resp.json(content_type=None)
    if "error" in data:
        raise RuntimeError(f"starknet_getNonce failed: {data['error']}")
    return int(data["result"], 16)


async def _raw_call(contract_address: int, entry_point: str, calldata: list, block_id="latest"):
    """
    Direct RPC call to starknet_call, bypassing starknet_py serialization issues.
    """
    from starknet_py.cairo.felt import encode_shortstring
    
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "starknet_call",
        "params": {
            "request": {
                "contract_address": hex(contract_address),
                "entry_point_selector": hex(encode_shortstring(entry_point)),
                "calldata": [hex(c) for c in calldata]
            },
            "block_id": block_id
        }
    }
    async with aiohttp.ClientSession() as session:
        async with session.post(READ_RPC, json=payload) as resp:
            data = await resp.json(content_type=None)
    if "error" in data:
        raise RuntimeError(f"starknet_call failed: {data['error']}")
    return [int(r, 16) for r in data["result"]]


class RawNonceAccount(Account):
    """Account subclass that fetches nonce via raw HTTP — bypasses starknet_py block_id bugs."""
    async def get_nonce(self, block_number=None):
        return await _raw_get_nonce(self.address)


class StarknetClient:
    def __init__(self):
        self._node    = FullNodeClient(node_url=READ_RPC)
        self._wnode   = FullNodeClient(node_url=WRITE_RPC)
        self._registry = None
        self._lending  = None
        self._account  = None

    async def _get_registry(self):
        if self._registry is None:
            self._registry = Contract(
                address=REGISTRY_ADDRESS_INT, abi=REGISTRY_ABI, provider=self._node)
        return self._registry

    async def _get_lending(self):
        if self._lending is None:
            self._lending = Contract(
                address=LENDING_ADDRESS_INT, abi=LENDING_ABI, provider=self._node)
        return self._lending

    async def _get_account(self):
        if self._account is None:
            self._account = RawNonceAccount(
                client=self._wnode,
                address=int(SCORER_ACCOUNT_ADDR, 16),
                key_pair=KeyPair.from_private_key(int(SCORER_PRIVATE_KEY, 16)),
                chain=StarknetChainId.SEPOLIA,
            )
        return self._account

    # ── Read methods (using raw RPC calls) ────────────────────────────────────

    async def get_score(self, btc_address_hash):
        result = await _raw_call(REGISTRY_ADDRESS_INT, "get_score", [btc_address_hash])
        return result[0] if result else 0

    async def get_collateral_ratio(self, btc_address_hash):
        result = await _raw_call(REGISTRY_ADDRESS_INT, "get_collateral_ratio", [btc_address_hash])
        return result[0] if result else 15000  # Default 150%

    async def get_score_tier(self, btc_address_hash):
        result = await _raw_call(REGISTRY_ADDRESS_INT, "get_score_tier", [btc_address_hash])
        return result[0] if result else 0

    async def get_last_updated(self, btc_address_hash):
        result = await _raw_call(REGISTRY_ADDRESS_INT, "get_last_updated", [btc_address_hash])
        return result[0] if result else 0

    async def is_approved_scorer(self, scorer_address):
        result = await _raw_call(REGISTRY_ADDRESS_INT, "is_approved_scorer", [int(scorer_address, 16)])
        return bool(result[0]) if result else False

    # ── Write methods ─────────────────────────────────────────────────────────

    async def register_score(self, btc_address_hash, score, proof=None):
        account  = await self._get_account()
        registry = Contract(address=REGISTRY_ADDRESS_INT, abi=REGISTRY_ABI, provider=account)
        nonce    = await account.get_nonce()
        call     = registry.functions["register_score"].prepare_invoke_v3(
                       btc_address_hash=btc_address_hash, score=score, proof=proof or [])
        signed   = await account.sign_invoke_v3(
                       calls=[call], nonce=nonce, l1_resource_bounds=L1_BOUNDS)
        resp     = await account.client.send_transaction(signed)
        return hex(resp.transaction_hash)

    async def update_score(self, btc_address_hash, new_score, proof=None):
        account  = await self._get_account()
        registry = Contract(address=REGISTRY_ADDRESS_INT, abi=REGISTRY_ABI, provider=account)
        nonce    = await account.get_nonce()
        call     = registry.functions["update_score"].prepare_invoke_v3(
                       btc_address_hash=btc_address_hash, new_score=new_score, proof=proof or [])
        signed   = await account.sign_invoke_v3(
                       calls=[call], nonce=nonce, l1_resource_bounds=L1_BOUNDS)
        resp     = await account.client.send_transaction(signed)
        return hex(resp.transaction_hash)

    # ── Lending Pool reads ────────────────────────────────────────────────────

    async def get_position(self, starknet_address: str) -> dict:
        addr_int = int(starknet_address, 16)
        
        # Call get_position
        pos_result = await _raw_call(LENDING_ADDRESS_INT, "get_position", [addr_int])
        collateral = pos_result[0] if len(pos_result) > 0 else 0
        debt_low = pos_result[1] if len(pos_result) > 1 else 0
        debt_high = pos_result[2] if len(pos_result) > 2 else 0
        debt = (debt_high << 128) | debt_low  # Reconstruct u256
        ratio = pos_result[3] if len(pos_result) > 3 else 0
        liquidatable = bool(pos_result[4]) if len(pos_result) > 4 else False
        
        # Call get_health_factor
        health_result = await _raw_call(LENDING_ADDRESS_INT, "get_health_factor", [addr_int])
        health_low = health_result[0] if len(health_result) > 0 else 0
        health_high = health_result[1] if len(health_result) > 1 else 0
        health = (health_high << 128) | health_low
        
        # Call get_max_borrow
        max_result = await _raw_call(LENDING_ADDRESS_INT, "get_max_borrow", [addr_int])
        max_low = max_result[0] if len(max_result) > 0 else 0
        max_high = max_result[1] if len(max_result) > 1 else 0
        max_borrow = (max_high << 128) | max_low
        
        return {
            "collateral_raw": collateral,
            "debt_raw": debt,
            "debt_usd": debt / 1_000_000,
            "collateral_ratio_bps": ratio,
            "collateral_ratio_pct": ratio / 100,
            "is_liquidatable": liquidatable,
            "health_factor": health / 10000,
            "max_borrow_usd": max_borrow / 1_000_000,
        }

    async def get_available_liquidity(self) -> int:
        result = await _raw_call(LENDING_ADDRESS_INT, "get_available_liquidity", [])
        if len(result) >= 2:
            return (result[1] << 128) | result[0]  # u256
        return result[0] if result else 0