export interface BitcoinScore {
  btc_address_hash: string;
  score: number;
  tier: 1 | 2 | 3 | 4;
  collateral_ratio_pct: number;
  hodl_sub: number;
  frequency_sub: number;
  stability_sub: number;
  calldata: {
    btc_address_hash: string;
    score: number;
    proof: string[];
  };
  tx_hash: string | null;
  message: string;
}

export interface LendingPosition {
  collateral_raw: number;
  debt_usd: number;
  collateral_ratio_bps: number;
  collateral_ratio_pct: number;
  is_liquidatable: boolean;
  health_factor: number;
  max_borrow_usd: number;
}

export interface CollateralRatio {
  btc_address_hash: string;
  collateral_ratio_bps: number;
  collateral_ratio_pct: number;
  tier: number;
  score: number;
}

export interface LiquidityInfo {
  available_liquidity_raw: number;
  available_liquidity_usdc: number;
}

export type TierLabel = "Diamond Hands 💎" | "Strong Holder" | "Moderate Holder" | "New Holder";

export const TIER_LABELS: Record<1 | 2 | 3 | 4, TierLabel> = {
  1: "Diamond Hands 💎",
  2: "Strong Holder",
  3: "Moderate Holder",
  4: "New Holder",
};

export const TIER_COLORS = {
  1: "from-yellow-500 to-orange-500",
  2: "from-blue-500 to-cyan-500",
  3: "from-green-500 to-emerald-500",
  4: "from-gray-500 to-slate-500",
} as const;

export interface ScoreMetrics {
  hodl: number;
  frequency: number;
  stability: number;
}