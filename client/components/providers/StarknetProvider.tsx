// src/components/providers/StarknetProvider.tsx
'use client';

import { ReactNode } from 'react';
import { sepolia } from '@starknet-react/chains';
import { StarknetConfig, publicProvider, argent, braavos } from '@starknet-react/core';

interface StarknetProviderProps {
  children: ReactNode;
}

export function StarknetProvider({ children }: StarknetProviderProps) {
  const connectors = [argent(), braavos()];

  return (
    <StarknetConfig
      chains={[sepolia]}
      provider={publicProvider()}
      connectors={connectors}
      autoConnect
    >
      {children}
    </StarknetConfig>
  );
}