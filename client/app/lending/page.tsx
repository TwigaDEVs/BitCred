'use client';

import { useEffect, useState } from 'react';
import { useAccount, useProvider } from '@starknet-react/core';
import { getVesuPosition, getVesuLiquidity } from '@/lib/api';
import { VesuService } from '@/lib/vesu';
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, Loader2, Wallet, Bitcoin } from 'lucide-react';

interface VesuPosition {
  collateral_btc: number;
  debt_usdc: number;
  collateral_raw: string;
  debt_raw: string;
}

interface Liquidity {
  available_usdc: number;
  available_raw: string;
}

export default function LendingPage() {
  const { address, account, status } = useAccount();
  const { provider } = useProvider();
  
  const [position, setPosition] = useState<VesuPosition | null>(null);
  const [liquidity, setLiquidity] = useState<Liquidity | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txLoading, setTxLoading] = useState<string | null>(null);

  // Form states
  const [depositAmount, setDepositAmount] = useState('');
  const [borrowAmount, setBorrowAmount] = useState('');
  const [repayAmount, setRepayAmount] = useState('');
  const [btcAddressHash, setBtcAddressHash] = useState('');

  const vesuService = provider && account ? new VesuService(provider as any) : null;

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
      if (vesuService) {
        const positionData = await vesuService.getPosition(address);
        
        const liquidityData = await getVesuLiquidity();
        
        setPosition(positionData);
        setLiquidity(liquidityData);
      } else {
        const [positionData, liquidityData] = await Promise.all([
          getVesuPosition(address),
          getVesuLiquidity(),
        ]);
        
        setPosition(positionData);
        setLiquidity(liquidityData);
      }
    } catch (err: any) {
      console.error('Failed to load Vesu data:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async () => {
    if (!account || !vesuService || !depositAmount) return;
    
    setTxLoading('deposit');
    setError(null);
    
    try {
      const amount = parseFloat(depositAmount);
      const txHash = await vesuService.depositCollateral(account as any, amount, btcAddressHash);
      
      alert(`Deposit successful! TX: ${txHash}`);
      setDepositAmount('');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Deposit failed');
    } finally {
      setTxLoading(null);
    }
  };

  const handleBorrow = async () => {
    if (!account || !vesuService || !borrowAmount) return;
    if (!position || position.collateral_btc === 0) {
      setError('You must deposit collateral before borrowing.');
      return;
    }
    
    setTxLoading('borrow');
    setError(null);
    
    try {
      const amount = parseFloat(borrowAmount);
      const txHash = await vesuService.borrow(account as any, amount);
      
      alert(`Borrow successful! TX: ${txHash}`);
      setBorrowAmount('');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Borrow failed');
    } finally {
      setTxLoading(null);
    }
  };

  const handleRepay = async () => {
    if (!account || !vesuService || !repayAmount) return;
    
    setTxLoading('repay');
    setError(null);
    
    try {
      const amount = parseFloat(repayAmount);
      const txHash = await vesuService.repay(account as any, amount);
      
      alert(`Repayment successful! TX: ${txHash}`);
      setRepayAmount('');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Repayment failed');
    } finally {
      setTxLoading(null);
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
            <h1 className="text-4xl font-bold">Connect Your Wallet</h1>
            <p className="text-lg text-muted-foreground">
              Connect your Starknet wallet to access Vesu lending powered by BitCred scores
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="gradient-bg min-h-screen py-12 flex items-center justify-center">
      <div className="container max-w-7xl mx-auto px-4">
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Bitcoin className="w-4 h-4" />
            Powered by Vesu Protocol
          </div>
          <h1 className="text-4xl md:text-6xl font-bold gradient-text mb-4">
            BTC Lending Pool
          </h1>
          <p className="text-lg text-muted-foreground">
            Deposit BTC, borrow USDC with BitCred-powered collateral ratios on Vesu
          </p>
        </div>

        {error && (
          <div className="mb-6 glass p-4 rounded-xl border-l-4 border-destructive animate-fade-in">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold">Error</div>
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

        {loading ? (
          <div className="glass p-12 rounded-2xl text-center">
            <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading Vesu position...</p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Pool Stats */}
            <div className="lg:col-span-3 grid md:grid-cols-3 gap-6">
              <div className="glass p-6 rounded-xl">
                <div className="flex items-center gap-3 mb-2">
                  <DollarSign className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-muted-foreground">Available Liquidity</span>
                </div>
                <div className="text-3xl font-bold text-green-500">
                  ${(liquidity?.available_usdc ?? 0).toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground mt-1">USDC</div>
              </div>

              <div className="glass p-6 rounded-xl">
                <div className="flex items-center gap-3 mb-2">
                  <Bitcoin className="w-5 h-5 text-bitcoin" />
                  <span className="text-sm text-muted-foreground">Your Collateral</span>
                </div>
                <div className="text-3xl font-bold">
                  {(position?.collateral_btc ?? 0).toFixed(8)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">WBTC</div>
              </div>

              <div className="glass p-6 rounded-xl">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingDown className="w-5 h-5 text-red-500" />
                  <span className="text-sm text-muted-foreground">Your Debt</span>
                </div>
                <div className="text-3xl font-bold text-red-500">
                  ${(position?.debt_usdc ?? 0).toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground mt-1">USDC</div>
              </div>
            </div>

            {/* Deposit */}
            <div className="glass p-6 rounded-xl">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                Deposit Collateral
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground">Amount (WBTC)</label>
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="0.001"
                    step="0.00000001"
                    className="w-full mt-1 px-4 py-2 bg-background border border-border rounded-lg"
                  />
                </div>

                <div>
                  <label className="text-sm text-muted-foreground">BTC Address Hash (from Score page)</label>
                  <input
                    type="text"
                    value={btcAddressHash}
                    onChange={(e) => setBtcAddressHash(e.target.value)}
                    placeholder="0x..."
                    className="w-full mt-1 px-4 py-2 bg-background border border-border rounded-lg"
                  />
                </div>

                <button
                  onClick={handleDeposit}
                  disabled={!depositAmount || !btcAddressHash || txLoading === 'deposit'}
                  className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {txLoading === 'deposit' ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Depositing...
                    </>
                  ) : (
                    <>
                      <TrendingUp className="w-5 h-5" />
                      Deposit
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Borrow */}
            <div className="glass p-6 rounded-xl">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-blue-500" />
                Borrow USDC
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground">Amount (USDC)</label>
                  <input
                    type="number"
                    value={borrowAmount}
                    onChange={(e) => setBorrowAmount(e.target.value)}
                    placeholder="100"
                    step="0.01"
                    className="w-full mt-1 px-4 py-2 bg-background border border-border rounded-lg"
                  />
                </div>
                <button
                  onClick={handleBorrow}
                  disabled={!borrowAmount || txLoading === 'borrow'}
                  className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {txLoading === 'borrow' ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Borrowing...
                    </>
                  ) : (
                    <>
                      <DollarSign className="w-5 h-5" />
                      Borrow
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Repay */}
            <div className="glass p-6 rounded-xl">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-yellow-500" />
                Repay Debt
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground">Amount (USDC)</label>
                  <input
                    type="number"
                    value={repayAmount}
                    onChange={(e) => setRepayAmount(e.target.value)}
                    placeholder="100"
                    step="0.01"
                    className="w-full mt-1 px-4 py-2 bg-background border border-border rounded-lg"
                  />
                </div>
                <button
                  onClick={handleRepay}
                  disabled={!repayAmount || txLoading === 'repay'}
                  className="w-full btn-secondary flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {txLoading === 'repay' ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Repaying...
                    </>
                  ) : (
                    <>
                      <TrendingDown className="w-5 h-5" />
                      Repay
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Info Banner */}
        <div className="mt-6 glass p-6 rounded-xl border-l-4 border-primary">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-semibold mb-1">Testnet Only</div>
              <p className="text-muted-foreground">
                This is running on Starknet Sepolia testnet with test tokens. Get testnet WBTC and USDC from faucets before using.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}