export const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || "https://bitcred-production.up.railway.app";

export const CONTRACTS = {
  REGISTRY: '0x5ed910a29cd2ab737b8d6d6e8b5d8afa51fcaaab4ef5f8b81683b3f87f3ebc7',
  LENDING: '0x2912b11bfce9fc77f199426aa2ddd9e8ce61af63eca8ddaf01a252787d7f49c',
  MOCK_WBTC: '0x7836b4f901e399a1a0d981a58055dbf33fc2b166fd2a99c0d9740a0d6bd98da',
  MOCK_USDC: '0x5bbc0a4c5963001f6bcf6212018bb4e470923b4beba3bb9c1b8f5280eb675ce'
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