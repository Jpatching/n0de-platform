'use client';

import React, { FC, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';

// Import wallet adapter CSS
require('@solana/wallet-adapter-react-ui/styles.css');

interface WalletConnectionProviderProps {
  children: React.ReactNode;
}

export const WalletConnectionProvider: FC<WalletConnectionProviderProps> = ({ children }) => {
  const network = WalletAdapterNetwork.Mainnet;
  
  // Production RPC endpoint - use n0de's own RPC when available
  const endpoint = useMemo(() => {
    if (process.env.NODE_ENV === 'production') {
      return process.env.NEXT_PUBLIC_N0DE_RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com';
    }
    return process.env.NEXT_PUBLIC_SOLANA_RPC_ENDPOINT || clusterApiUrl(network);
  }, [network]);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export default WalletConnectionProvider;