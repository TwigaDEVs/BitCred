export const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || "http://localhost:8000";

export const CONTRACTS = {
  REGISTRY: "0xb922982809ddcc51b20c449d55cc5208e4890d3c809af19c377f2d65034a7d",
  LENDING: "0x6649146b867fa743046afb420ba1bb2d0ab7513f02594d137d8d7d61d0cd72e",
  MOCK_WBTC: "0x462fe2cfe2288f319136b5e2584c838d954dd2a4f27e233639c62ff5aa10edd",
  MOCK_USDC: "0x217395fa46b21fd848d8e361e0ca3107110bb9a8893479949142392ed0ec4c6"
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