import axios from 'axios';
import { BACKEND_API_URL } from '@/lib/constants';
import type { BitcoinScore, LendingPosition, CollateralRatio, LiquidityInfo } from '@/types/index';

const api = axios.create({
  baseURL: BACKEND_API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Compute Bitcoin credit score
 */
export async function computeScore(
  btcAddress: string,
  submitOnchain: boolean = false
): Promise<BitcoinScore> {
  const { data } = await api.post<BitcoinScore>('/score', {
    btc_address: btcAddress,
    submit_onchain: submitOnchain,
  });
  return data;
}

/**
 * Get mock score for testing (no Bitcoin API required)
 */
export async function getMockScore(): Promise<BitcoinScore> {
  const { data } = await api.post<BitcoinScore>('/score/mock');
  return data;
}

/**
 * Look up existing on-chain score by Bitcoin address
 */
export async function getOnchainScore(btcAddress: string): Promise<CollateralRatio> {
  const { data } = await api.get<CollateralRatio>(`/score/${btcAddress}`);
  return data;
}

/**
 * Get lending position for a Starknet address
 */
export async function getLendingPosition(starknetAddress: string): Promise<LendingPosition> {
  const { data } = await api.get<LendingPosition>(`/position/${starknetAddress}`);
  return data;
}

/**
 * Get available lending pool liquidity
 */
export async function getLiquidity(): Promise<LiquidityInfo> {
  const { data } = await api.get<LiquidityInfo>('/liquidity');
  return data;
}

/**
 * Health check
 */
export async function healthCheck(): Promise<{ status: string }> {
  const { data } = await api.get('/health');
  return data;
}

export default api;