"""
Vesu Protocol Integration
Handles deposits, borrows, repayments via Vesu V2 contracts
"""

import os
from fastapi import APIRouter, HTTPException, Response 
from starknet_py.contract import Contract
from starknet_py.net.full_node_client import FullNodeClient
from starknet_py.net.account.account import Account
from starknet_py.net.signer.stark_curve_signer import KeyPair
from starknet_py.net.models.chains import StarknetChainId

router = APIRouter()

# Vesu V2 Sepolia Testnet Addresses
VESU_SINGLETON = "0x2545b2e5d519fc230e9cd781046d3a64e092114f07e44771e0d719d148725ef"
USDC_TOKEN = "0x217395fa46b21fd848d8e361e0ca3107110bb9a8893479949142392ed0ec4c6"  # Sepolia USDC
WBTC_TOKEN = "0x462fe2cfe2288f319136b5e2584c838d954dd2a4f27e233639c62ff5aa10edd"  # Sepolia WBTC

RPC_URL = os.getenv("STARKNET_RPC_URL", "https://rpc.starknet-testnet.lava.build")

# Simplified Vesu V2 ABI
VESU_POOL_ABI = [
    {
        "name": "deposit",
        "type": "function",
        "inputs": [
            {"name": "asset", "type": "core::starknet::contract_address::ContractAddress"},
            {"name": "amount", "type": "core::integer::u256"},
            {"name": "receiver", "type": "core::starknet::contract_address::ContractAddress"}
        ],
        "outputs": [{"type": "core::integer::u256"}],
        "state_mutability": "external"
    },
    {
        "name": "withdraw",
        "type": "function",
        "inputs": [
            {"name": "asset", "type": "core::starknet::contract_address::ContractAddress"},
            {"name": "amount", "type": "core::integer::u256"},
            {"name": "receiver", "type": "core::starknet::contract_address::ContractAddress"}
        ],
        "outputs": [{"type": "core::integer::u256"}],
        "state_mutability": "external"
    },
    {
        "name": "borrow",
        "type": "function",
        "inputs": [
            {"name": "asset", "type": "core::starknet::contract_address::ContractAddress"},
            {"name": "amount", "type": "core::integer::u256"},
            {"name": "receiver", "type": "core::starknet::contract_address::ContractAddress"}
        ],
        "outputs": [{"type": "core::integer::u256"}],
        "state_mutability": "external"
    },
    {
        "name": "repay",
        "type": "function",
        "inputs": [
            {"name": "asset", "type": "core::starknet::contract_address::ContractAddress"},
            {"name": "amount", "type": "core::integer::u256"}
        ],
        "outputs": [{"type": "core::integer::u256"}],
        "state_mutability": "external"
    },
    {
        "name": "user_balance",
        "type": "function",
        "inputs": [
            {"name": "user", "type": "core::starknet::contract_address::ContractAddress"},
            {"name": "asset", "type": "core::starknet::contract_address::ContractAddress"}
        ],
        "outputs": [
            {"type": "core::integer::u256"},
            {"type": "core::integer::u256"}
        ],
        "state_mutability": "view"
    }
]

ERC20_ABI = [
    {
        "name": "approve",
        "type": "function",
        "inputs": [
            {"name": "spender", "type": "core::starknet::contract_address::ContractAddress"},
            {"name": "amount", "type": "core::integer::u256"}
        ],
        "outputs": [{"type": "core::bool"}],
        "state_mutability": "external"
    },
    {
        "name": "balance_of",
        "type": "function",
        "inputs": [
            {"name": "account", "type": "core::starknet::contract_address::ContractAddress"}
        ],
        "outputs": [{"type": "core::integer::u256"}],
        "state_mutability": "view"
    }
]


class VesuClient:
    """Interact with Vesu V2 lending protocol"""
    
    def __init__(self):
        self.client = FullNodeClient(node_url=RPC_URL)
        self.pool_address = int(VESU_SINGLETON, 16)
        self.usdc_address = int(USDC_TOKEN, 16)
        self.wbtc_address = int(WBTC_TOKEN, 16)
    
    async def get_user_position(self, user_address: str):
        """Get user's collateral and debt in Vesu pool"""
        try:
            pool = Contract(
                address=self.pool_address,
                abi=VESU_POOL_ABI,
                provider=self.client
            )
            
            user_int = int(user_address, 16)
            
            # Get WBTC collateral balance
            wbtc_result = await pool.functions["user_balance"].call(user_int, self.wbtc_address)
            collateral = wbtc_result[0] if wbtc_result else 0
            
            # Get USDC debt balance
            usdc_result = await pool.functions["user_balance"].call(user_int, self.usdc_address)
            debt = usdc_result[1] if len(usdc_result) > 1 else 0
            
            # Convert from wei (8 decimals for WBTC, 6 for USDC)
            return {
                "collateral_btc": collateral / 1e8,
                "debt_usdc": debt / 1e6,
                "collateral_raw": collateral,
                "debt_raw": debt
            }
        except Exception as e:
            print(f"Error fetching Vesu position: {e}")
            return {
                "collateral_btc": 0,
                "debt_usdc": 0,
                "collateral_raw": 0,
                "debt_raw": 0
            }
    
    async def get_available_liquidity(self):
        """Get available USDC liquidity in pool"""
        try:
            usdc = Contract(
                address=self.usdc_address,
                abi=ERC20_ABI,
                provider=self.client
            )
            
            result = await usdc.functions["balance_of"].call(self.pool_address)
            balance = result[0] if result else 0
            
            return {
                "available_usdc": balance / 1e6,
                "available_raw": balance
            }
        except Exception as e:
            print(f"Error fetching liquidity: {e}")
            return {"available_usdc": 0, "available_raw": 0}

vesu_client = VesuClient()

@router.options("/{path:path}")
async def options_handler(path: str, response: Response):
    response.headers["Access-Control-Allow-Origin"] = "https://bit-cred.vercel.app"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    return response

@router.get("/position/{address}")
async def get_vesu_position(address: str):
    """Get user's Vesu lending position"""
    try:
        position = await vesu_client.get_user_position(address)
        return position
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/liquidity")
async def get_vesu_liquidity():
    """Get available USDC liquidity in Vesu"""
    try:
        liquidity = await vesu_client.get_available_liquidity()
        return liquidity
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))