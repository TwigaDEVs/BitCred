'use client';

import { BitcoinScore, TIER_LABELS, TIER_COLORS } from '@/types/index';
import { Trophy, TrendingUp, Activity, BarChart3, Copy, Check, ExternalLink } from 'lucide-react';
import { useState } from 'react';

interface ScoreCardProps {
  score: BitcoinScore;
  onSubmitToChain?: () => void;
  submitting?: boolean;
}

export function ScoreCard({ score, onSubmitToChain, submitting }: ScoreCardProps) {
  const [copied, setCopied] = useState(false);

  const tierLabel = TIER_LABELS[score.tier as keyof typeof TIER_LABELS];
  const tierColor = TIER_COLORS[score.tier as keyof typeof TIER_COLORS];

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getScoreColor = (scoreValue: number) => {
    if (scoreValue >= 800) return 'text-yellow-500';
    if (scoreValue >= 750) return 'text-blue-500';
    if (scoreValue >= 700) return 'text-green-500';
    return 'text-gray-500';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Main Score Display */}
      <div className="glass p-8 rounded-2xl gradient-border">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="text-sm text-muted-foreground mb-2">Your Credit Score</div>
            <div className={`text-6xl font-bold ${getScoreColor(score.score)}`}>
              {score.score}
            </div>
            <div className="text-sm text-muted-foreground mt-2">out of 850</div>
          </div>
          <div className={`px-4 py-2 rounded-full bg-gradient-to-r ${tierColor} text-white font-semibold`}>
            Tier {score.tier}
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <span className="text-lg font-semibold">{tierLabel}</span>
        </div>

        <p className="text-muted-foreground">{score.message}</p>
      </div>

      {/* Collateral Ratio */}
      <div className="glass p-6 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-muted-foreground mb-1">Required Collateral</div>
            <div className="text-3xl font-bold text-primary">
              {score.collateral_ratio_pct}%
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground mb-1">You Save</div>
            <div className="text-2xl font-bold text-green-500">
              {(150 - score.collateral_ratio_pct).toFixed(0)}%
            </div>
            <div className="text-xs text-muted-foreground">vs standard 150%</div>
          </div>
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="glass p-6 rounded-xl space-y-4">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Score Breakdown
        </h3>

        {/* Hodl Duration */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Hodl Duration (40%)</span>
            <span className="font-semibold">{(score.hodl_sub * 100).toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-background rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 transition-all duration-500"
              style={{ width: `${score.hodl_sub * 100}%` }}
            />
          </div>
        </div>

        {/* Transaction Frequency */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Transaction Frequency (30%)</span>
            <span className="font-semibold">{(score.frequency_sub * 100).toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-background rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500"
              style={{ width: `${score.frequency_sub * 100}%` }}
            />
          </div>
        </div>

        {/* Balance Stability */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Balance Stability (30%)</span>
            <span className="font-semibold">{(score.stability_sub * 100).toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-background rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
              style={{ width: `${score.stability_sub * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Calldata Info */}
      <div className="glass p-6 rounded-xl space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Activity className="w-5 h-5" />
          On-Chain Data
        </h3>

        <div className="space-y-3">
          <div>
            <div className="text-xs text-muted-foreground mb-1">BTC Address Hash</div>
            <div className="flex items-center gap-2 p-2 bg-background rounded-lg font-mono text-sm">
              <span className="flex-1 truncate">{score.btc_address_hash}</span>
              <button
                onClick={() => handleCopy(score.btc_address_hash)}
                className="p-1 hover:bg-muted rounded transition-colors"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {score.tx_hash && score.tx_hash !== 'null' && !score.tx_hash.startsWith('error') && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">Transaction Hash</div>
              <a
                href={`https://sepolia.voyager.online/tx/${score.tx_hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2 bg-background rounded-lg font-mono text-sm hover:bg-muted transition-colors"
              >
                <span className="flex-1 truncate">{score.tx_hash}</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}
        </div>

        {onSubmitToChain && !score.tx_hash && (
          <button
            onClick={onSubmitToChain}
            disabled={submitting}
            className="w-full btn-primary flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <TrendingUp className="w-5 h-5 animate-pulse" />
                Submitting to Starknet...
              </>
            ) : (
              <>
                <TrendingUp className="w-5 h-5" />
                Submit Score to Blockchain
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}