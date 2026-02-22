// src/components/WalletConnect.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAccount, useConnect, useDisconnect } from '@starknet-react/core';
import { Wallet, LogOut, Loader2, AlertCircle } from 'lucide-react';

export function WalletConnect() {
  const { address, status } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [mounted, setMounted] = useState(false);
  const [showConnectors, setShowConnectors] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button className="btn-primary flex items-center gap-2" disabled>
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading...
      </button>
    );
  }

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (status === 'connected' && address) {
    return (
      <div className="flex items-center gap-3">
        <div className="glass px-4 py-2 rounded-lg flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm font-mono">{formatAddress(address)}</span>
        </div>
        <button
          onClick={() => disconnect()}
          className="btn-secondary flex items-center gap-2 hover:bg-destructive hover:text-destructive-foreground"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Disconnect</span>
        </button>
      </div>
    );
  }

  if (status === 'connecting') {
    return (
      <button className="btn-primary flex items-center gap-2" disabled>
        <Loader2 className="w-5 h-5 animate-spin" />
        Connecting...
      </button>
    );
  }

  const availableConnectors = connectors.filter((c) => c.available());

  return (
    <div className="relative">
      <button
        onClick={() => {
          if (availableConnectors.length === 1) {
            connect({ connector: availableConnectors[0] });
          } else if (availableConnectors.length > 1) {
            setShowConnectors(!showConnectors);
          } else {
            // No wallets available - show install message
            setShowConnectors(true);
          }
        }}
        className="btn-primary flex items-center gap-2 neon-glow"
      >
        <Wallet className="w-5 h-5" />
        Connect Wallet
      </button>
      
      {showConnectors && (
        <div className="absolute top-full mt-2 right-0 glass border border-border rounded-lg p-3 min-w-[250px] space-y-2 z-50">
          {availableConnectors.length > 0 ? (
            <>
              <div className="text-sm font-medium mb-2">Select Wallet</div>
              {availableConnectors.map((connector) => (
                <button
                  key={connector.id}
                  onClick={() => {
                    connect({ connector });
                    setShowConnectors(false);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-muted rounded-lg transition-colors flex items-center gap-2"
                >
                  {connector.icon && (
                    <img src={typeof connector.icon === 'string' ? connector.icon : connector.icon.light} alt={connector.name} className='w-6 h-6'/>
                  )}
                  {connector.name}
                </button>
              ))}
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <div className="font-medium mb-1">No Wallet Detected</div>
                  <p className="text-muted-foreground text-xs">
                    Install a Starknet wallet to continue
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <a
                  href="https://www.argent.xyz/argent-x/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-3 py-2 bg-primary/10 hover:bg-primary/20 rounded-lg text-sm transition-colors"
                >
                  📥 Install Argent X
                </a>
                <a
                  href="https://braavos.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-3 py-2 bg-primary/10 hover:bg-primary/20 rounded-lg text-sm transition-colors"
                >
                  📥 Install Braavos
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}