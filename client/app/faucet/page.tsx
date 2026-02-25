'use client';

import { useState } from 'react';
import { useAccount, useContract, useProvider } from '@starknet-react/core';
import { Droplet, Clock, CheckCircle, Loader2, Wallet } from 'lucide-react';
import { provider } from 'starknet';

const MOCK_WBTC = '0x7836b4f901e399a1a0d981a58055dbf33fc2b166fd2a99c0d9740a0d6bd98da' ; 
const MOCK_USDC = '0x5bbc0a4c5963001f6bcf6212018bb4e470923b4beba3bb9c1b8f5280eb675ce' ; 

const FAUCET_ABI = [
  {
    name: 'claim',
    type: 'function',
    inputs: [],
    outputs: [],
    state_mutability: 'external',
  },
  {
    name: 'time_until_next_claim',
    type: 'function',
    inputs: [{ name: 'user', type: 'core::starknet::contract_address::ContractAddress' }],
    outputs: [{ type: 'core::integer::u64' }],
    state_mutability: 'view',
  },
] as const;

export default function FaucetPage() {
  const { address, account, status } = useAccount();
  const [claiming, setClaiming] = useState<'wbtc' | 'usdc' | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { provider } = useProvider();

  const { contract: wbtcContract } = useContract({
    address: MOCK_WBTC,
    abi: FAUCET_ABI,
    provider: account,
  });

  const { contract: usdcContract } = useContract({
    address: MOCK_USDC,
    abi: FAUCET_ABI,
    provider: account,
  });

  const handleClaim = async (token: 'wbtc' | 'usdc') => {
    if (!account) return;
    
    setClaiming(token);
    setSuccess(null);
    setError(null);

    try {
        const contract = token === 'wbtc' ? wbtcContract : usdcContract;
        if (!contract) throw new Error('Contract not initialized');

        console.log('Token:', token);
        console.log('Contract address:', contract.address);
        console.log('Expected WBTC:', MOCK_WBTC);

        const result = await account.execute({
            contractAddress: token === 'wbtc' ? MOCK_WBTC : MOCK_USDC,
            entrypoint: 'claim',
            calldata: [],
        });
        
        await provider.waitForTransaction(result.transaction_hash);
        
        setSuccess(
        token === 'wbtc' 
            ? '✅ Claimed 0.1 WBTC!' 
            : '✅ Claimed 10,000 USDC!'
        );
        
        setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
        console.error('Claim error:', err);
        
        if (err.message?.includes('Claim cooldown active')) {
        setError('Please wait 24 hours between claims');
        } else {
        setError(err.message || 'Claim failed');
        }
    } finally {
        setClaiming(null);
    }
    };

  if (status !== 'connected') {
    return (
      <div className="gradient-bg min-h-screen py-12 flex items-center justify-center">
        <div className="container max-w-4xl mx-auto px-4">
          <div className="glass p-16 rounded-2xl text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-muted/50 flex items-center justify-center">
              <Wallet className="w-10 h-10 text-muted-foreground" />
            </div>
            <h1 className="text-4xl font-bold">Connect Wallet</h1>
            <p className="text-lg text-muted-foreground">
              Connect your Starknet wallet to claim testnet tokens
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="gradient-bg min-h-screen py-12 flex items-center justify-center">
      <div className="container max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center space-y-4 mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Droplet className="w-4 h-4" />
            Testnet Token Faucet
          </div>
          <h1 className="text-4xl md:text-6xl font-bold gradient-text">
            Get Test Tokens
          </h1>
          <p className="text-lg text-muted-foreground">
            Claim free WBTC and USDC for testing BitCred lending on Sepolia
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 glass p-4 rounded-xl border-l-4 border-green-500 animate-fade-in">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="font-semibold">{success}</span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 glass p-4 rounded-xl border-l-4 border-destructive">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-destructive" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Token Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* WBTC */}
          <div className="glass p-8 rounded-2xl space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-bitcoin/10 flex items-center justify-center">
                <span className="text-2xl">₿</span>
              </div>
              <div>
                <h3 className="text-2xl font-bold">WBTC</h3>
                <p className="text-sm text-muted-foreground">Mock Wrapped Bitcoin</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Claim Amount</span>
                <span className="font-semibold">0.1 WBTC</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Cooldown</span>
                <span className="font-semibold">24 hours</span>
              </div>
            </div>

            <button
              onClick={() => handleClaim('wbtc')}
              disabled={claiming === 'wbtc'}
              className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {claiming === 'wbtc' ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Claiming...
                </>
              ) : (
                <>
                  <Droplet className="w-5 h-5" />
                  Claim WBTC
                </>
              )}
            </button>
          </div>

          {/* USDC */}
          <div className="glass p-8 rounded-2xl space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center">
                <span className="text-2xl">$</span>
              </div>
              <div>
                <h3 className="text-2xl font-bold">USDC</h3>
                <p className="text-sm text-muted-foreground">Mock USD Coin</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Claim Amount</span>
                <span className="font-semibold">10,000 USDC</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Cooldown</span>
                <span className="font-semibold">24 hours</span>
              </div>
            </div>

            <button
              onClick={() => handleClaim('usdc')}
              disabled={claiming === 'usdc'}
              className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {claiming === 'usdc' ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Claiming...
                </>
              ) : (
                <>
                  <Droplet className="w-5 h-5" />
                  Claim USDC
                </>
              )}
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="mt-8 glass p-6 rounded-xl">
          <h3 className="font-semibold mb-3">How to Use</h3>
          <ol className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <span className="text-primary font-bold">1.</span>
              <span>Claim WBTC and USDC tokens (24-hour cooldown)</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary font-bold">2.</span>
              <span>Get your Bitcoin credit score on the Score page</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary font-bold">3.</span>
              <span>Go to Lending page and deposit WBTC as collateral</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary font-bold">4.</span>
              <span>Borrow USDC with your personalized collateral ratio</span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}