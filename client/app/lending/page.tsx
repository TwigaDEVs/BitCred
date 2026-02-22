'use client';

import { useEffect, useState } from 'react';
import { useAccount } from '@starknet-react/core';
import { getLendingPosition, getLiquidity } from '@/lib/api';
import { LendingPosition, LiquidityInfo } from '@/types';
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, Loader2, Wallet } from 'lucide-react';
import Link from 'next/link';

export default function LendingPage() {
  const { address, status } = useAccount();
  const [position, setPosition] = useState<LendingPosition | null>(null);
  const [liquidity, setLiquidity] = useState<LiquidityInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (address) {
      loadData();
    }
  }, [address]);

  const loadData = async () => {
    if (!address) return;

    setLoading(true);
    setError(null);

    try {
      const [positionData, liquidityData] = await Promise.all([
        getLendingPosition(address),
        getLiquidity(),
      ]);
      
      setPosition(positionData);
      setLiquidity(liquidityData);
    } catch (err: any) {
      console.error('Failed to load lending data:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  if (status !== 'connected') {
    return (
      <div className="gradient-bg min-h-screen py-12">
        <div className="container max-w-4xl">
          <div className="text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-muted/50 flex items-center justify-center">
              <Wallet className="w-10 h-10 text-muted-foreground" />
            </div>
            <h1 className="text-4xl font-bold">Connect Your Wallet</h1>
            <p className="text-lg text-muted-foreground">
              Connect your Starknet wallet to access the lending pool
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="gradient-bg min-h-screen py-12">
      <div className="container max-w-6xl">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-6xl font-bold gradient-text mb-4">
            Lending Pool
          </h1>
          <p className="text-lg text-muted-foreground">
            Borrow with personalized collateral ratios based on your Bitcoin credibility score
          </p>
        </div>

        {loading && (
          <div className="glass p-12 rounded-2xl text-center">
            <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading lending data...</p>
          </div>
        )}

        {error && (
          <div className="glass p-6 rounded-xl border-l-4 border-destructive">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold">Error Loading Data</div>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
                <button
                  onClick={loadData}
                  className="mt-3 text-sm text-primary hover:underline"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && position && liquidity && (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Pool Liquidity */}
            <div className="glass p-6 rounded-xl">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-500" />
                Available Liquidity
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="text-3xl font-bold text-green-500">
                    ${liquidity.available_liquidity_usdc.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">USDC Available to Borrow</div>
                </div>
              </div>
            </div>

            {/* Your Position */}
            <div className="glass p-6 rounded-xl">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                Your Position
              </h3>
              
              {position.collateral_raw === 0 && position.debt_usd === 0 ? (
                <div className="text-center py-6 space-y-3">
                  <p className="text-muted-foreground">No active position</p>
                  <Link href="/score" className="btn-primary inline-flex items-center gap-2">
                    Get Score to Start Borrowing
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Collateral</div>
                      <div className="text-2xl font-bold">{position.collateral_raw.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">stBTC</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Borrowed</div>
                      <div className="text-2xl font-bold">${position.debt_usd.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">USDC</div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Health Factor</span>
                      <span className={`text-lg font-bold ${
                        position.health_factor >= 1.5 ? 'text-green-500' :
                        position.health_factor >= 1.2 ? 'text-yellow-500' :
                        'text-red-500'
                      }`}>
                        {position.health_factor.toFixed(2)}
                      </span>
                    </div>
                    <div className="h-2 bg-background rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          position.health_factor >= 1.5 ? 'bg-green-500' :
                          position.health_factor >= 1.2 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(position.health_factor * 50, 100)}%` }}
                      />
                    </div>
                  </div>

                  {position.is_liquidatable && (
                    <div className="bg-destructive/10 border border-destructive rounded-lg p-3 flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <div className="font-semibold text-destructive">Liquidation Risk</div>
                        <p className="text-muted-foreground mt-1">
                          Your position is at risk. Add collateral or repay debt to avoid liquidation.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Collateral Ratio</span>
                      <span className="font-semibold">{position.collateral_ratio_pct}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Max Borrow</span>
                      <span className="font-semibold">${position.max_borrow_usd.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="lg:col-span-2 glass p-6 rounded-xl">
              <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <button className="btn-primary flex items-center justify-center gap-2 disabled:opacity-50" disabled>
                  <TrendingUp className="w-5 h-5" />
                  Deposit Collateral
                </button>
                <button className="btn-primary flex items-center justify-center gap-2 disabled:opacity-50" disabled>
                  <DollarSign className="w-5 h-5" />
                  Borrow
                </button>
                <button className="btn-secondary flex items-center justify-center gap-2 disabled:opacity-50" disabled>
                  <TrendingDown className="w-5 h-5" />
                  Repay
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-4 text-center">
                Full lending functionality coming soon. Get your score first!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}