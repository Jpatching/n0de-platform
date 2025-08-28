'use client';

import { FC, ReactNode, useMemo, useEffect } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
  LedgerWalletAdapter,
} from '@solana/wallet-adapter-wallets';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

import { PV3_CONFIG } from '@/lib/solana-config';

interface SolanaProviderProps {
  children: ReactNode;
}

// PV3 Authentication Provider - handles auth once for entire app
const PV3AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const { connected, publicKey, signMessage } = useWallet();

  useEffect(() => {
    // DISABLED: Automatic authentication conflicts with AuthModal
    // Let AuthModal handle authentication explicitly
    // if (connected && publicKey && signMessage) {
    //   // Check if we already have a valid session
    //   const storedToken = localStorage.getItem('pv3_token');
    //   const storedExpiry = localStorage.getItem('pv3_token_expires');
    //   
    //   if (storedToken && storedExpiry) {
    //     const expiresAt = parseInt(storedExpiry);
    //     if (Date.now() < expiresAt) {
    //       console.log('✅ Existing session found, no authentication needed');
    //       return; // Don't authenticate again
    //     }
    //   }

    //   // Only authenticate if no valid session exists
    //   console.log('🔐 Starting authentication...');
    //   authenticateWallet();
    // }
  }, [connected, publicKey, signMessage]);

  const authenticateWallet = async () => {
    if (!publicKey || !signMessage) return;

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://pv3-backend-api-production.up.railway.app';
      console.log('🔗 API_BASE:', API_BASE);
      
      // Step 1: Get authentication message
      console.log('📝 Requesting auth message for wallet:', publicKey.toString());
      const messageResponse = await fetch(`${API_BASE}/auth/generate-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: publicKey.toString() }),
      });

      console.log('📝 Message response status:', messageResponse.status);
      if (!messageResponse.ok) {
        const errorText = await messageResponse.text();
        console.error('❌ Generate message failed:', errorText);
        throw new Error('Failed to get authentication message');
      }

      const { message } = await messageResponse.json();
      console.log('Got auth message:', message.substring(0, 50) + '...');
      
      // Extract timestamp from the message (backend embeds it)
      const timestampMatch = message.match(/Timestamp: (\d+)/);
      const messageTimestamp = timestampMatch ? parseInt(timestampMatch[1]) : Date.now();
      console.log('Extracted timestamp from message:', messageTimestamp);
      
      // Step 2: Sign the message
      const messageBytes = new TextEncoder().encode(message);
      const signature = await signMessage(messageBytes);
      
      // Convert to base58
      const bs58 = (await import('bs58')).default;
      const signatureBase58 = bs58.encode(signature);
      console.log('Signature created:', signatureBase58.substring(0, 20) + '...');

      // Step 3: Authenticate
      console.log('🔐 Sending authentication request...');
      const authResponse = await fetch(`${API_BASE}/auth/authenticate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: publicKey.toString(),
          signature: signatureBase58,
          message,
          timestamp: messageTimestamp, // Use the timestamp from the message
        }),
      });

      console.log('🔐 Auth response status:', authResponse.status);
      if (!authResponse.ok) {
        const errorData = await authResponse.text();
        console.error('❌ Authentication failed:', errorData);
        throw new Error(`Authentication failed: ${authResponse.status}`);
      }

      const authData = await authResponse.json();
      console.log('🔐 Auth response data:', authData);
      
      // Store the real token
      if (authData.token) {
        localStorage.setItem('pv3_token', authData.token);
        localStorage.setItem('pv3_token_expires', authData.expiresAt.toString());
        console.log('✅ Authentication successful! Token stored:', authData.token.substring(0, 20) + '...');
      } else {
        console.error('❌ No token in response!', authData);
      }
    } catch (error) {
      console.error('❌ Authentication error:', error);
    }
  };

  return <>{children}</>;
};

export const SolanaProvider: FC<SolanaProviderProps> = ({ children }) => {
  const endpoint = PV3_CONFIG.RPC_URL;

  // Configure supported wallets
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new TorusWalletAdapter(),
      new LedgerWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProvider>
          <PV3AuthProvider>
            {children}
          </PV3AuthProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}; 