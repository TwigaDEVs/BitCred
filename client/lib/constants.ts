export const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || "http://localhost:8000";

export const CONTRACTS = {
  REGISTRY: "0x42ac49b99c59141f28f5a1e73a7b890dbb227e9c36ec9600cc99dfedc4a58e8",
  LENDING: "0x76815dbee38587075d2c79aaf55a795c8724d06a9b7d3660b5d5bb6d4adb36d",
} as const;

export const REGISTRY_ABI = [
  {
    name: "register_score",
    type: "function",
    inputs: [
      { name: "btc_address_hash", type: "core::felt252" },
      { name: "score", type: "core::integer::u16" },
      { name: "proof", type: "core::array::Span::<core::felt252>" },
    ],
    outputs: [],
    state_mutability: "external",
  },
  {
    name: "get_score",
    type: "function",
    inputs: [{ name: "btc_address_hash", type: "core::felt252" }],
    outputs: [{ type: "core::integer::u16" }],
    state_mutability: "view",
  },
  {
    name: "get_collateral_ratio",
    type: "function",
    inputs: [{ name: "btc_address_hash", type: "core::felt252" }],
    outputs: [{ type: "core::integer::u32" }],
    state_mutability: "view",
  },
  {
    name: "get_score_tier",
    type: "function",
    inputs: [{ name: "btc_address_hash", type: "core::felt252" }],
    outputs: [{ type: "core::integer::u8" }],
    state_mutability: "view",
  },
] as const;

export const LENDING_ABI = [
  {
    name: "get_position",
    type: "function",
    inputs: [{ name: "user", type: "core::starknet::contract_address::ContractAddress" }],
    outputs: [
      { type: "core::integer::u256" },
      { type: "core::integer::u256" },
      { type: "core::integer::u32" },
      { type: "core::bool" },
    ],
    state_mutability: "view",
  },
  {
    name: "get_available_liquidity",
    type: "function",
    inputs: [],
    outputs: [{ type: "core::integer::u256" }],
    state_mutability: "view",
  },
] as const;

export const NETWORK = {
  chainId: "SN_SEPOLIA",
  name: "Starknet Sepolia",
  rpcUrl: "https://rpc.starknet-testnet.lava.build",
} as const;