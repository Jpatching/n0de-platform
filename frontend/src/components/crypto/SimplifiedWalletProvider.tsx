'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { PublicKey, Transaction } from '@solana/web3.js';
import type { PhantomWallet } from '@/types/phantom';

interface WalletContextType {
  publicKey: PublicKey | null;
  connected: boolean;
  connecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  signTransaction: ((transaction: Transaction) => Promise<Transaction>) | null;
  signAllTransactions: ((transactions: Transaction[]) => Promise<Transaction[]>) | null;
}

const WalletContext = createContext<WalletContextType>({
  publicKey: null,
  connected: false,
  connecting: false,
  connect: async () => {},
  disconnect: () => {},
  signTransaction: null,
  signAllTransactions: null,
});

export const useWallet = () => useContext(WalletContext);

interface SimplifiedWalletProviderProps {
  children: ReactNode;
}

export default function SimplifiedWalletProvider({ children }: SimplifiedWalletProviderProps) {
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const connect = useCallback(async () => {
    if (connecting) return;
    
    setConnecting(true);
    try {
      // Check if Phantom is installed
      const { solana } = window;
      
      if (!solana?.isPhantom) {
        throw new Error('Phantom wallet not found! Please install Phantom wallet.');
      }

      const response = await solana.connect();
      const pubKey = new PublicKey(response.publicKey.toString());
      
      setPublicKey(pubKey);
      setConnected(true);
      
      // Listen for account changes
      solana.on('accountChanged', (publicKey: unknown) => {
        if (publicKey) {
          setPublicKey(new PublicKey(publicKey.toString()));
        } else {
          setPublicKey(null);
          setConnected(false);
        }
      });

    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    } finally {
      setConnecting(false);
    }
  }, [connecting]);

  const disconnect = useCallback(() => {
    const { solana } = window;
    if (solana) {
      solana.disconnect();
    }
    setPublicKey(null);
    setConnected(false);
  }, []);

  const signTransaction = useCallback(async (transaction: Transaction) => {
    const { solana } = window;
    if (!solana || !connected) {
      throw new Error('Wallet not connected');
    }

    return await solana.signTransaction(transaction);
  }, [connected]);

  const signAllTransactions = useCallback(async (transactions: Transaction[]) => {
    const { solana } = window;
    if (!solana || !connected) {
      throw new Error('Wallet not connected');
    }

    return await solana.signAllTransactions(transactions);
  }, [connected]);

  const contextValue: WalletContextType = {
    publicKey,
    connected,
    connecting,
    connect,
    disconnect,
    signTransaction,
    signAllTransactions,
  };

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
}