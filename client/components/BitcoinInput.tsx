'use client';

import { useState } from 'react';
import { Bitcoin, Loader2, AlertCircle } from 'lucide-react';

interface BitcoinInputProps {
  onSubmit: (address: string) => void;
  loading?: boolean;
  error?: string | null;
}

export function BitcoinInput({ onSubmit, loading, error }: BitcoinInputProps) {
  const [address, setAddress] = useState('');
  const [isValid, setIsValid] = useState(true);

  const validateBitcoinAddress = (addr: string): boolean => {
    // Basic Bitcoin address validation
    // Legacy (P2PKH): starts with 1, 26-35 characters
    // SegWit (P2SH): starts with 3, 26-35 characters  
    // Native SegWit (Bech32): starts with bc1, 42-62 characters
    const legacyRegex = /^[1][a-km-zA-HJ-NP-Z1-9]{25,34}$/;
    const segwitRegex = /^[3][a-km-zA-HJ-NP-Z1-9]{25,34}$/;
    const bech32Regex = /^(bc1)[a-z0-9]{39,87}$/;
    
    return legacyRegex.test(addr) || segwitRegex.test(addr) || bech32Regex.test(addr);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedAddress = address.trim();
    
    if (!trimmedAddress) {
      setIsValid(false);
      return;
    }

    if (!validateBitcoinAddress(trimmedAddress)) {
      setIsValid(false);
      return;
    }

    setIsValid(true);
    onSubmit(trimmedAddress);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAddress(e.target.value);
    if (!isValid) setIsValid(true);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="btc-address" className="text-sm font-medium">
          Bitcoin Address
        </label>
        <div className="relative">
          <Bitcoin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            id="btc-address"
            type="text"
            value={address}
            onChange={handleChange}
            placeholder="bc1q... or 1... or 3..."
            className={`w-full pl-11 pr-4 py-3 bg-background border rounded-lg focus:outline-none focus:ring-2 transition-all ${
              isValid
                ? 'border-border focus:ring-primary'
                : 'border-destructive focus:ring-destructive'
            }`}
            disabled={loading}
          />
        </div>
        
        {!isValid && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="w-4 h-4" />
            Please enter a valid Bitcoin address
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={loading || !address.trim()}
        className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Analyzing Bitcoin Wallet...
          </>
        ) : (
          <>
            <Bitcoin className="w-5 h-5" />
            Compute Score
          </>
        )}
      </button>

      {/* Example addresses */}
      <div className="text-xs text-muted-foreground space-y-1">
        <div className="font-medium">Try these example addresses:</div>
        <button
          type="button"
          onClick={() => setAddress('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa')}
          className="block hover:text-foreground transition-colors font-mono"
        >
          1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa (Satoshi's address)
        </button>
      </div>
    </form>
  );
}