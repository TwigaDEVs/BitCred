'use client';

import { useState } from 'react';
import { useAccount, useContract } from '@starknet-react/core';
import { BitcoinInput } from '@/components/BitcoinInput';
import { ScoreCard } from '@/components/ScoreCard';
import { MetricsChart } from '@/components/MetricChart';
import { computeScore } from '@/lib/api';
import { BitcoinScore } from '@/types';
import { CONTRACTS, REGISTRY_ABI } from '@/lib/constants';
import { AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';

export default function ScorePage() {
  const [score, setScore] = useState<BitcoinScore | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  
  const { address: starknetAddress, status } = useAccount();
  const { account } = useAccount();

  const { contract} = useContract({
    address: CONTRACTS.REGISTRY,
    abi: REGISTRY_ABI,
    provider: account
  });

  // const { contract } = useContract({
  //   address: CONTRACTS.REGISTRY,
  //   abi: REGISTRY_ABI,
  // });

  const handleComputeScore = async (btcAddress: string) => {
    setLoading(true);
    setError(null);
    setScore(null);
    setTxHash(null);

    try {
      const result = await computeScore(btcAddress, false);
      setScore(result);
    } catch (err: any) {
      console.error('Score computation error:', err);
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to compute score';
      
      if (errorMessage.includes('Bitcoin API')) {
        setError('Unable to fetch Bitcoin wallet data. Please check the address and try again.');
      } else if (errorMessage.includes('Invalid address')) {
        setError('Invalid Bitcoin address format. Please enter a valid address.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitToChain = async () => {
    if (!score || !starknetAddress || status !== 'connected') {
      setError('Please connect your Starknet wallet first');
      return;
    }

    if (!contract) {
      setError('Contract not initialized');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const myCall = contract.populate('register_score', [
        score.calldata.btc_address_hash,
        score.calldata.score,
        score.calldata.proof
      ]);

      const result = await account?.execute(myCall);
      
      if (!result) return;
      setTxHash(result.transaction_hash);
      setScore({ ...score, tx_hash: result.transaction_hash });
      
    } catch (err: any) {
      console.error('Submission error:', err);
      setError(err.message || 'Failed to submit score to blockchain');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="gradient-bg min-h-screen py-12">
      <div className="container max-w-7xl">
        <div className="text-center space-y-4 mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            Live Bitcoin On-Chain Analysis
          </div>
          <h1 className="text-4xl md:text-6xl font-bold gradient-text">
            Get Your Credit Score
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Analyze real Bitcoin on-chain behavior to unlock personalized lending terms on Starknet
          </p>
        </div>

        {status !== 'connected' && score && (
          <div className="mb-6 glass p-4 rounded-xl border-l-4 border-yellow-500">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <div className="font-semibold">Connect Starknet Wallet</div>
                <p className="text-muted-foreground mt-1">
                  Connect your wallet to submit your score to the blockchain
                </p>
              </div>
            </div>
          </div>
        )}

        {txHash && (
          <div className="mb-6 glass p-4 rounded-xl border-l-4 border-green-500 animate-fade-in">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-semibold">Score Submitted Successfully!</div>
                <p className="text-sm text-muted-foreground mt-1">
                  Your score has been recorded on Starknet Sepolia
                </p>
                <a
                  href={`https://sepolia.voyager.online/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline mt-2 inline-block"
                >
                  View on Voyager →
                </a>
              </div>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-5 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="glass p-8 rounded-2xl">
              <h2 className="text-2xl font-semibold mb-6">Bitcoin Address</h2>
              <BitcoinInput 
                onSubmit={handleComputeScore} 
                loading={loading}
                error={error}
              />
            </div>

            <div className="glass p-6 rounded-xl">
              <h3 className="font-semibold mb-4">How Scoring Works</h3>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-bitcoin/10 flex items-center justify-center flex-shrink-0 text-bitcoin font-bold text-xs">
                    1
                  </div>
                  <span>Fetch real on-chain data from Bitcoin blockchain</span>
                </li>
                <li className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary font-bold text-xs">
                    2
                  </div>
                  <span>AI analyzes hodl duration, transaction patterns, balance stability</span>
                </li>
                <li className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-starknet/10 flex items-center justify-center flex-shrink-0 text-starknet font-bold text-xs">
                    3
                  </div>
                  <span>Generate score (650-850) with cryptographic proof</span>
                </li>
                <li className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0 text-green-500 font-bold text-xs">
                    4
                  </div>
                  <span>Submit to Starknet for personalized collateral ratios</span>
                </li>
              </ul>
            </div>

            <div className="glass p-6 rounded-xl border-l-4 border-primary">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-semibold text-sm">100% Privacy Guaranteed</div>
                  <p className="text-xs text-muted-foreground">
                    Your Bitcoin address is never stored. Only a cryptographic hash goes on-chain.
                    All wallet analysis uses zero-knowledge proofs for complete privacy.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            {loading && (
              <div className="glass p-16 rounded-2xl text-center space-y-6 animate-fade-in">
                <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-10 h-10 text-primary animate-pulse" />
                </div>
                <div className="space-y-3">
                  <div className="text-2xl font-bold">Analyzing Bitcoin Wallet</div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>📡 Fetching on-chain transaction history...</p>
                    <p>🧠 Running AI behavioral analysis...</p>
                    <p>🔐 Generating zero-knowledge proof...</p>
                  </div>
                </div>
              </div>
            )}

            {!loading && !score && (
              <div className="glass p-16 rounded-2xl text-center space-y-6">
                <div className="w-20 h-20 mx-auto rounded-full bg-muted/20 flex items-center justify-center">
                  <Sparkles className="w-10 h-10 text-muted-foreground" />
                </div>
                <div className="space-y-3">
                  <div className="text-2xl font-bold">Ready to Get Started?</div>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Enter your Bitcoin address to analyze your on-chain behavior and discover
                    your personalized lending terms
                  </p>
                </div>
              </div>
            )}

            {score && (
              <div className="space-y-6">
                <ScoreCard 
                  score={score} 
                  onSubmitToChain={status === 'connected' ? handleSubmitToChain : undefined}
                  submitting={submitting}
                />
                <MetricsChart 
                  metrics={{
                    hodl: score.hodl_sub,
                    frequency: score.frequency_sub,
                    stability: score.stability_sub,
                  }}
                />

                <div className="glass p-6 rounded-xl">
                  <h3 className="font-semibold mb-4">Next Steps</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        score.tx_hash ? 'bg-green-500/10 text-green-500' : 'bg-muted/20 text-muted-foreground'
                      }`}>
                        {score.tx_hash ? '✓' : '1'}
                      </div>
                      <span className="text-sm">Submit score to Starknet Registry</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted/20 text-muted-foreground flex items-center justify-center">
                        2
                      </div>
                      <span className="text-sm">Deposit collateral to lending pool</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted/20 text-muted-foreground flex items-center justify-center">
                        3
                      </div>
                      <span className="text-sm">Borrow with your personalized ratio</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}