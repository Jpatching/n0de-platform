'use client';

import { useEffect, useState, useRef } from 'react';
import { BridgeButton } from './Bridge/BridgeButton';

interface WalletStatusProps {
  connected: boolean;
  balance: number;
  formatSOL: (amount: number) => string;
}

export default function WalletStatus({ connected, balance, formatSOL }: WalletStatusProps) {
  const [show, setShow] = useState(false);
  const prevConnected = useRef(false);
  const fadeTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Show the message when transitioning from disconnected to connected
    if (!prevConnected.current && connected) {
      setShow(true);
      if (fadeTimeout.current) clearTimeout(fadeTimeout.current);
      fadeTimeout.current = setTimeout(() => setShow(false), 5000); // Extended to 5 seconds for bridge visibility
    }
    prevConnected.current = connected;
    // If disconnected, hide immediately
    if (!connected) {
      setShow(false);
      if (fadeTimeout.current) clearTimeout(fadeTimeout.current);
    }
    // Cleanup on unmount
    return () => {
      if (fadeTimeout.current) clearTimeout(fadeTimeout.current);
    };
  }, [connected]);

  if (!connected) {
    return (
      <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
        <div className="flex items-center space-x-2">
          <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span className="text-yellow-500 font-audiowide">Connect your wallet to start playing!</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg transition-opacity duration-700 ${show ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      aria-live="polite"
      style={{ transition: 'opacity 0.7s' }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-green-500 font-audiowide">Wallet Connected!</span>
        </div>
        <div className="flex items-center space-x-4">
        <div className="text-text-primary font-inter">
          <span className="text-text-secondary">Balance: </span>
          <span className="font-bold">{formatSOL(balance)} SOL</span>
          </div>
          <BridgeButton
            variant="outline"
            size="sm"
            className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-blue-500/30 hover:from-blue-500/30 hover:to-purple-500/30 text-blue-400 hover:text-blue-300"
          />
        </div>
      </div>
    </div>
  );
} 