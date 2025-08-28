'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import VaultManager from './VaultManager';
import SecurityBadge from './SecurityBadge';
import AuthButton from './AuthButton';
import { useAuth } from '@/contexts/AuthContext';
import { usePV3 } from '@/hooks/usePV3';
import OptimizedImage from '@/components/ui/OptimizedImage';

interface PageHeaderProps {
  onMenuClick?: () => void;
}

export default function PageHeader({ onMenuClick }: PageHeaderProps) {
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const { vaultBalance, formatSOL, forceRefreshBalance, loading } = usePV3();
  const [showVaultManager, setShowVaultManager] = useState(false);
  const [colorIndex, setColorIndex] = useState(0);

  // Color cycling to match Matrix rain
  const colors = ['#00ff41', '#00bfff', '#ffd700', '#9370db']; // green, blue, gold, purple

  useEffect(() => {
    const interval = setInterval(() => {
      setColorIndex((prev) => (prev + 1) % colors.length);
    }, 30000); // Fixed 30-second interval
    return () => clearInterval(interval);
  }, []);

  const currentColor = colors[colorIndex];

  return (
    <>
      <header 
        className="border-b px-4 lg:px-6 py-3 relative overflow-hidden transition-all duration-300"
        style={{
          background: `linear-gradient(135deg, 
            ${currentColor}15 0%, 
            rgba(0,0,0,0.90) 30%, 
            rgba(0,0,0,0.95) 70%, 
            ${currentColor}12 100%)`,
          borderBottomColor: `${currentColor}40`,
          boxShadow: `0 1px 3px ${currentColor}10`,
        }}
      >
        {/* Subtle animated background gradient */}
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            background: `linear-gradient(90deg, transparent, ${currentColor}20, transparent)`,
            animation: 'headerGlow 8s ease-in-out infinite',
          }}
        />

        <div className="flex items-center justify-between gap-4 relative z-10">
          <div className="flex items-center space-x-4">
            {/* Mobile Menu Button */}
            {onMenuClick && (
              <button
                onClick={onMenuClick}
                className="lg:hidden text-text-secondary hover:text-text-primary transition-all duration-200 hover:scale-110"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
            
            <Link href="/" className="flex items-center space-x-3 group">
              <div 
                className="w-10 h-10 rounded flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                style={{
                  boxShadow: `0 0 15px ${currentColor}30`,
                  animation: 'logoPulse 4s ease-in-out infinite',
                }}
              >
                <OptimizedImage 
                  src="/logos/PV3-Logo.png" 
                  alt="PV3" 
                  width={40} 
                  height={40}
                  className="rounded"
                />
              </div>
            </Link>

            {/* Security Badge - Desktop only */}
            <div className="hidden lg:block">
              <SecurityBadge />
            </div>
          </div>

          {/* Vault Balance - Only show for wallet users */}
          {isAuthenticated && user?.authMethod === 'wallet' && (
            <div className="flex items-center space-x-3 ml-2 lg:ml-8">
              <div 
                onClick={() => setShowVaultManager(true)}
                className="flex items-center bg-bg-card rounded-lg px-3 lg:px-4 py-2 transition-all duration-300 cursor-pointer group hover:scale-105"
                style={{
                  border: `1px solid ${currentColor}30`,
                  boxShadow: `0 0 10px ${currentColor}10`,
                }}
              >
                {/* Animated Solana Logo */}
                <svg 
                  className="w-4 h-4 lg:w-5 lg:h-5 mr-2 transition-all duration-300 group-hover:rotate-12" 
                  viewBox="0 0 512 512" 
                  fill="none"
                >
                  <defs>
                    <linearGradient id="solanaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#9945FF"/>
                      <stop offset="100%" stopColor="#14F195"/>
                    </linearGradient>
                  </defs>
                  <path d="M79.4 374.2C82.1 371.5 85.9 370 90 370H460C469.8 370 476.2 380.7 471.4 389.1L432.6 457.8C429.9 462.5 425.1 466 420 466H50C40.2 466 33.8 455.3 38.6 446.9L79.4 374.2Z" fill="url(#solanaGradient)"/>
                  <path d="M79.4 137.8C82.1 140.5 85.9 142 90 142H460C469.8 142 476.2 131.3 471.4 122.9L432.6 54.2C429.9 49.5 425.1 46 420 46H50C40.2 46 33.8 56.7 38.6 65.1L79.4 137.8Z" fill="url(#solanaGradient)"/>
                  <path d="M432.6 254.2C429.9 251.5 426.1 250 422 250H52C42.2 250 35.8 260.7 40.6 269.1L79.4 337.8C82.1 342.5 86.9 346 92 346H462C471.8 346 478.2 335.3 473.4 326.9L432.6 254.2Z" fill="url(#solanaGradient)"/>
                </svg>
                
                {/* Animated Balance Text */}
                <span 
                  className="text-text-primary font-inter font-medium text-sm lg:text-base transition-all duration-300"
                  style={{
                    textShadow: `0 0 10px ${currentColor}20`,
                  }}
                >
                  {vaultBalance === -1 ? '0.00000000' : formatSOL(vaultBalance)}
                </span>
                
                <span className="text-text-secondary font-inter text-sm font-bold ml-2">Vault</span>
                
                {/* Animated Refresh Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    forceRefreshBalance();
                  }}
                  disabled={loading}
                  className="ml-2 text-xs transition-all duration-300 hover:scale-125 disabled:opacity-50"
                  style={{ 
                    color: currentColor,
                    animation: loading ? 'spin 1s linear infinite' : undefined,
                  }}
                  title="Refresh vault balance"
                >
                  {loading ? '🔄' : '↻'}
                </button>
                
                <svg className="w-4 h-4 text-text-secondary ml-2 transition-transform duration-300 group-hover:translate-y-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>

                {/* Subtle pulse indicator */}
                <div 
                  className="absolute -top-1 -right-1 w-2 h-2 rounded-full animate-pulse"
                  style={{ backgroundColor: currentColor }}
                />
              </div>
            </div>
          )}

          <div className="flex items-center space-x-2 lg:space-x-3">
            {/* Security Badge - Mobile */}
            <div className="lg:hidden">
              <SecurityBadge />
            </div>
            <AuthButton />
          </div>
        </div>

        <style jsx>{`
          @keyframes headerGlow {
            0%, 100% { transform: translateX(-100%); }
            50% { transform: translateX(100%); }
          }
          
          @keyframes logoPulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
          
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </header>

      {/* Vault Manager Modal - Only for wallet users */}
      {isAuthenticated && user?.authMethod === 'wallet' && (
        <VaultManager 
          isOpen={showVaultManager} 
          onClose={() => setShowVaultManager(false)} 
        />
      )}
    </>
  );
} 