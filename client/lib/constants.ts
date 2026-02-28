export const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || "https://bitcred-production.up.railway.app";

export const CONTRACTS = {
  REGISTRY: '0x6dbf5a0abd0d49a077a106e42821b972528ca55feae011d7a22ad089e70fbbe',
  LENDING: '0x4b4dcc1bb1d3ec53f2edb298955a26e4a8f1c37861dde272b84a74d696817e7',
  MOCK_WBTC: '0x2d5b244adea042de49a08126d95a1860c0a2617f37b330a8fe09de37a86559',
  MOCK_USDC: '0x4b8c72d85606ac29871d217377294d4690674459c7cf8ba73164388095e798d'
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