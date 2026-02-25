'use client';

import { ReactNode } from 'react';
import { sepolia } from '@starknet-react/chains';
import { StarknetConfig, jsonRpcProvider, argent, braavos } from '@starknet-react/core';

interface StarknetProviderProps {
  children: ReactNode;
}

const provider = jsonRpcProvider({
  rpc: () => ({
    nodeUrl: 'https://rpc.starknet-testnet.lava.build'
  })
});

export function StarknetProvider({ children }: StarknetProviderProps) {
  const connectors = [argent(), braavos()];

  return (
    <StarknetConfig
      chains={[sepolia]}
      provider={provider}
      connectors={connectors}
      autoConnect
    >
      {children}
    </StarknetConfig>
  );
}