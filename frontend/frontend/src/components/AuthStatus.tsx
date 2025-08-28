'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { BridgeButton } from './Bridge/BridgeButton';
import { Mail, Smartphone, Wallet } from 'lucide-react';

export default function AuthStatus() {
  const { user, loading } = useAuth();
  const isAuthenticated = !!user;
  const [show, setShow] = useState(false);
  const prevAuthenticated = useRef(false);
  const fadeTimeout = useRef<NodeJS.Timeout | null>(null);
  
  // Color animation states for banner
  const [bannerColorIndex, setBannerColorIndex] = useState(0);
  const [messageFlash, setMessageFlash] = useState(0);

  const bannerColors = ['#ff0000', '#ff8000', '#ffff00', '#00ff00', '#0080ff', '#8000ff']; // Rainbow colors

  useEffect(() => {
    // Show the message when transitioning from unauthenticated to authenticated
    if (!prevAuthenticated.current && isAuthenticated) {
      setShow(true);
      if (fadeTimeout.current) clearTimeout(fadeTimeout.current);
      fadeTimeout.current = setTimeout(() => setShow(false), 5000);
    }
    prevAuthenticated.current = isAuthenticated;
    
    // If not authenticated, hide immediately
    if (!isAuthenticated) {
      setShow(false);
      if (fadeTimeout.current) clearTimeout(fadeTimeout.current);
    }
    
    // Cleanup on unmount
    return () => {
      if (fadeTimeout.current) clearTimeout(fadeTimeout.current);
    };
  }, [isAuthenticated]);

  // Banner color animation effects
  useEffect(() => {
    // Rainbow cycle for banner - every 2s
    const bannerInterval = setInterval(() => {
      setBannerColorIndex((prev) => (prev + 1) % bannerColors.length);
    }, 2000);
    return () => clearInterval(bannerInterval);
  }, []);

  useEffect(() => {
    // Message flash effect - every 7s, different message flashes
    const messageInterval = setInterval(() => {
      setMessageFlash((prev) => (prev + 1) % 6); // 6 messages
    }, 7000);
    return () => clearInterval(messageInterval);
  }, []);

  if (loading) {
    return (
      <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-blue-500 font-audiowide">Checking authentication...</span>
        </div>
      </div>
    );
  }

  const getAuthIcon = () => {
    switch (user?.authMethod) {
      case 'email':
        return <Mail className="w-5 h-5 text-green-500" />;
      case 'authenticator':
        return <Smartphone className="w-5 h-5 text-green-500" />;
      case 'wallet':
        return <Wallet className="w-5 h-5 text-green-500" />;
      default:
        return (
          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getAuthMethodLabel = () => {
    switch (user?.authMethod) {
      case 'email':
        return 'Email Account';
      case 'authenticator':
        return 'Authenticator';
      case 'wallet':
        return 'Crypto Wallet';
      default:
        return 'Account';
    }
  };

  // Banner messages - different for authenticated vs non-authenticated users  
  const bannerMessages = isAuthenticated ? [
    "🏆 New Tournament Starting Soon • Join Now • Massive Prize Pools",
    "🚀 Unity 3D Games Coming This Week • Be the First to Play",
    "💎 VIP Status Available • Exclusive Games • Lower Fees",
    "⚡ Lightning Tournaments • 5-Minute Rounds • Instant Payouts",
    "🔥 Hot Streak Bonuses • Win Streaks • Multiplier Rewards",
    "🌟 Refer Friends • Earn Proof Points • Unlock Rewards"
  ] : [
      "🎮 PVP Gaming on Solana • 6.5% Platform Fees • Non-Custodial Vaults",
      "🔥 Live Tournaments • Instant Payouts • Provably Fair Gaming",
      "🌟 Unity 3D Games • Multi-Chain Bridge • Session Vaults",
      "⚡ Lightning Fast • Web3 Security • Web2 Experience",
      "🏆 Compete • Win • Earn • Repeat • Join the Revolution",
      "🛡️ Military-Grade Security • Ed25519 Verification • 2FA Protected"
    ];

    return (
    <>
      {/* Connection status for authenticated users */}
      {isAuthenticated && (
        <div
          className={`mb-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg transition-opacity duration-700 ${show ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          aria-live="polite"
          style={{ transition: 'opacity 0.7s' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {getAuthIcon()}
              <span className="text-green-500 font-audiowide">
                {getAuthMethodLabel()} Connected!
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-text-primary font-inter">
                <span className="text-text-secondary">Welcome: </span>
                <span className="font-bold">{user?.displayName || user?.username}</span>
              </div>
              {user?.authMethod === 'wallet' && (
                <BridgeButton
                  variant="outline"
                  size="sm"
                  className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-blue-500/30 hover:from-blue-500/30 hover:to-purple-500/30 text-blue-400 hover:text-blue-300"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Promotional banner - shows for everyone */}
      <div className="mb-6 h-12 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 border border-blue-500/20 rounded-lg overflow-hidden relative">
        {/* Moving banner background */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse"></div>
        
        {/* Scrolling text container */}
        <div className="flex items-center h-full">
          <div className="animate-scroll whitespace-nowrap font-audiowide font-bold text-sm lg:text-base">
            {bannerMessages.map((message, index) => (
              <span 
                key={index} 
                className="inline-block mr-20 transition-colors duration-500"
                style={{
                  color: index === messageFlash ? bannerColors[bannerColorIndex] :
                         index % 6 === 0 ? '#ff4444' :  // Red for gaming
                         index % 6 === 1 ? '#ff8800' :  // Orange for tournaments
                         index % 6 === 2 ? '#00ccff' :  // Cyan for Unity/tech
                         index % 6 === 3 ? '#00ff88' :  // Green for speed
                         index % 6 === 4 ? '#ff66cc' :  // Pink for competition
                         '#8888ff'                       // Purple for security
                }}
              >
                {message}
              </span>
            ))}
            {/* Repeat for seamless loop */}
            {bannerMessages.map((message, index) => (
              <span 
                key={`repeat-${index}`} 
                className="inline-block mr-20 transition-colors duration-500"
                style={{
                  color: index === messageFlash ? bannerColors[bannerColorIndex] :
                         index % 6 === 0 ? '#ff4444' :  // Red for gaming
                         index % 6 === 1 ? '#ff8800' :  // Orange for tournaments
                         index % 6 === 2 ? '#00ccff' :  // Cyan for Unity/tech
                         index % 6 === 3 ? '#00ff88' :  // Green for speed
                         index % 6 === 4 ? '#ff66cc' :  // Pink for competition
                         '#8888ff'                       // Purple for security
                }}
              >
                {message}
              </span>
            ))}
          </div>
        </div>

        {/* Gradient fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-bg-primary to-transparent pointer-events-none"></div>
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-bg-primary to-transparent pointer-events-none"></div>

        <style jsx>{`
          @keyframes scroll {
            0% {
              transform: translateX(-100%);
            }
            100% {
              transform: translateX(100%);
            }
          }
          
          .animate-scroll {
            animation: scroll 60s linear infinite;
          }
        `}</style>
      </div>
    </>
  );
} 