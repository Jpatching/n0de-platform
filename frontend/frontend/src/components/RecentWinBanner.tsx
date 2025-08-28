'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';

interface RecentWin {
  id: string;
  playerName: string;
  gameType: string;
  gameEmoji: string;
  winAmount: number;
  timestamp: Date;
  multiplier?: number;
}

// Memoized component to prevent unnecessary re-renders
const RecentWinBanner = React.memo(function RecentWinBanner() {
  const [recentWin, setRecentWin] = useState<RecentWin | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const [isExploding, setIsExploding] = useState(false);
  const [showFireworks, setShowFireworks] = useState(false);
  const [pulseIntensity, setPulseIntensity] = useState(1);

  // Static data to reduce recalculation (performance optimization)
  const gameTypes = useMemo(() => [
    { name: 'Coin Flip', symbol: 'FLIP' },
    { name: 'Chess Blitz', symbol: 'CHESS' },
    { name: 'Dice Roll', symbol: 'DICE' },
    { name: 'Rock Paper Scissors', symbol: 'RPS' },
    { name: 'The Shipment', symbol: 'SHIP' },
    { name: 'Number Guess', symbol: 'NUM' },
    { name: 'Crash', symbol: 'CRASH' },
    { name: 'Memory Match', symbol: 'MEM' },
  ], []);

  const playerNames = useMemo(() => [
    'CryptoKing', 'SolanaWolf', 'GameMaster', 'SkillPlayer', 'PVPChamp',
    'DiamondHands', 'MoonShot', 'GamingLegend', 'WinStreak', 'ProGamer',
    'SolanaShark', 'CoinFlipPro', 'ChessGrandmaster', 'DiceRoller', 'RockStar',
  ], []);

  // Dynamic color cycling for excitement
  const colors = useMemo(() => ['#ffd700', '#ff6b35', '#00ff41', '#ff1744', '#9c27b0', '#00bcd4'], []);
  const [colorIndex, setColorIndex] = useState(0);
  const currentColor = colors[colorIndex];

  // Memoized mock data generator
  const generateMockWin = useCallback((): RecentWin => {
    const game = gameTypes[Math.floor(Math.random() * gameTypes.length)];
    const playerName = playerNames[Math.floor(Math.random() * playerNames.length)];
    
    // Generate realistic win amounts with higher probability for bigger wins in banner
    let winAmount: number;
    const rand = Math.random();
    if (rand < 0.3) {
      winAmount = Math.random() * 40 + 10; // 10 - 50 SOL (30% chance)
    } else if (rand < 0.7) {
      winAmount = Math.random() * 150 + 50; // 50 - 200 SOL (40% chance)
    } else {
      winAmount = Math.random() * 800 + 200; // 200 - 1000 SOL (30% chance)
    }

    return {
      id: Math.random().toString(36).substr(2, 9),
      playerName,
      gameType: game.name,
      gameEmoji: game.symbol,
      winAmount: Math.round(winAmount * 1000) / 1000,
      timestamp: new Date(),
      multiplier: game.name === 'Crash' ? Math.random() * 20 + 1 : undefined
    };
  }, [gameTypes, playerNames]);

  // Optimized state updates with single batch update
  const generateNewWin = useCallback(() => {
    const win = generateMockWin();
    
    // Batch all state updates to prevent multiple re-renders
    setRecentWin(win);
    setIsVisible(true);
    setAnimationKey(prev => prev + 1);
    setColorIndex(prev => (prev + 1) % colors.length);
    
    // Trigger celebration effects for big wins (optimized)
    if (win.winAmount >= 100) {
      setIsExploding(true);
      setShowFireworks(true);
      setPulseIntensity(3);
      // Use single timeout instead of multiple
      setTimeout(() => {
        setIsExploding(false);
        setShowFireworks(false);
        setPulseIntensity(1);
      }, 2000);
    } else if (win.winAmount >= 20) {
      setPulseIntensity(2);
      setTimeout(() => setPulseIntensity(1), 1000);
    }
  }, [generateMockWin, colors.length]);

  // Initialize with mock data and update frequently for gambling psychology
  useEffect(() => {
    // Initial win
    generateNewWin();

    // FAST updates for gambling psychology - every 4-7 seconds
    const interval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        generateNewWin();
      }, 400); // Quick fade out before new win appears
    }, 4000 + Math.random() * 3000); // Balanced speed: 4-7 seconds

    return () => clearInterval(interval);
  }, [generateNewWin]);

  const formatWinAmount = useCallback((amount: number) => {
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`;
    }
    return amount.toFixed(2);
  }, []);

    if (!recentWin) return null;

  return (
    <div className="mb-4 relative">
      <div 
        key={animationKey}
        className={`
          relative overflow-hidden rounded-lg transition-all duration-300 p-3 cursor-pointer
          ${isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-95'}
          ${isExploding ? 'animate-bounce' : ''}
          hover:scale-105 transform
        `}
        style={{
          background: `linear-gradient(135deg, 
            rgba(255,255,255,0.08) 0%, 
            rgba(255,255,255,0.03) 50%, 
            rgba(0,0,0,0.08) 100%)`,
          backdropFilter: 'blur(8px)',
          border: `1px solid ${currentColor}${pulseIntensity >= 2 ? '60' : '30'}`,
          boxShadow: `0 0 ${25 * pulseIntensity}px ${currentColor}${pulseIntensity >= 2 ? '50' : '25'}, 
                      inset 0 0 15px rgba(255,255,255,0.05),
                      0 0 ${50 * pulseIntensity}px ${currentColor}15`,
          transform: `scale(${0.98 + (pulseIntensity - 1) * 0.02})`,
        }}
      >
        {/* Intense animated border glow */}
        <div
          className="absolute inset-0 rounded-lg"
          style={{
            background: `linear-gradient(45deg, transparent, ${currentColor}${pulseIntensity >= 2 ? '40' : '20'}, transparent)`,
            animation: `borderRush ${pulseIntensity >= 2 ? '0.5s' : '1.5s'} ease-in-out infinite`,
            opacity: pulseIntensity >= 2 ? 0.8 : 0.4,
          }}
        />

        {/* Lightning Effects */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Main Lightning Bolt */}
          <div
            className="absolute top-0 left-1/4 w-0.5 h-full opacity-60 animate-pulse"
            style={{
              background: `linear-gradient(180deg, ${currentColor}, transparent, ${currentColor}, transparent, ${currentColor})`,
              boxShadow: `0 0 10px ${currentColor}, 0 0 20px ${currentColor}`,
              animation: `lightning 2s ease-in-out infinite`,
            }}
          />
          
          {/* Side Lightning */}
          <div
            className="absolute top-0 right-1/3 w-0.5 h-full opacity-40 animate-pulse"
            style={{
              background: `linear-gradient(180deg, transparent, ${currentColor}, transparent)`,
              boxShadow: `0 0 8px ${currentColor}`,
              animation: `lightning 2.5s ease-in-out infinite`,
              animationDelay: '0.5s',
            }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Exciting win indicator with psychology */}
            <div className="flex items-center space-x-2">
              <div className={`w-10 h-10 relative ${isExploding ? 'animate-spin' : 'animate-pulse'}`}>
                <Image
                  src={`/recentwinbanner/${
                    recentWin && recentWin.winAmount >= 100 ? 'explosion.png' : 
                    recentWin && recentWin.winAmount >= 50 ? 'rocket.png' : 
                    recentWin && recentWin.winAmount >= 20 ? 'money-bag.png' : 'trophy.png'
                  }`}
                  alt="Win Icon"
                  fill
                  className="object-contain"
                  style={{ filter: `drop-shadow(0 0 12px ${currentColor})` }}
                />
              </div>
              <div className="text-sm font-audiowide font-bold" style={{ color: currentColor }}>
                {recentWin && recentWin.winAmount >= 100 ? 'MASSIVE WIN!' : 
                 recentWin && recentWin.winAmount >= 50 ? 'BIG WIN!' : 
                 recentWin && recentWin.winAmount >= 20 ? 'NICE WIN!' : 'LATEST WIN'}
              </div>
              {recentWin && recentWin.winAmount >= 100 && (
                <div className="flex items-center space-x-2 text-xs font-audiowide text-red-400 font-bold animate-pulse">
                  <div className="w-5 h-5 relative">
                    <Image
                      src="/recentwinbanner/fire.png"
                      alt="Fire"
                      fill
                      className="object-contain"
                      style={{ filter: 'drop-shadow(0 0 8px #ff4444)' }}
                    />
                  </div>
                  <span>HOT STREAK</span>
                </div>
              )}
            </div>

            {/* Player and game info */}
            <div className="flex items-center space-x-3">
              <div className="text-xs font-audiowide text-accent-primary font-bold bg-accent-primary/10 px-2 py-1 rounded border border-accent-primary/20">
                {recentWin.gameEmoji}
              </div>
              <div className="flex items-center space-x-2">
                <span className="font-audiowide text-text-primary font-medium text-sm">
                  {recentWin.playerName}
                </span>
                <span className="text-text-muted text-xs font-audiowide">•</span>
                <span className="text-text-secondary font-audiowide text-xs font-bold">
                  {recentWin.gameType}
                </span>
                <span className="text-text-muted text-xs font-audiowide">•</span>
                <span className="text-text-muted font-audiowide text-xs font-medium">
                  {formatDistanceToNow(recentWin.timestamp, { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>

          {/* Win amount with gambling psychology */}
          <div className="flex items-center space-x-3">
            {recentWin.multiplier && (
              <div className="text-sm text-orange-400 font-audiowide font-bold animate-pulse" style={{ textShadow: '0 0 8px #ff8800' }}>
                {recentWin.multiplier.toFixed(2)}X MULT
              </div>
            )}
            
            {/* Live indicator */}
            <div className="flex items-center space-x-2 text-xs font-audiowide text-red-400 font-bold">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" style={{ boxShadow: '0 0 8px #ff0000' }}></div>
              <div className="w-4 h-4 relative">
                <Image
                  src="/recentwinbanner/lightning.png"
                  alt="Lightning"
                  fill
                  className="object-contain"
                  style={{ filter: 'drop-shadow(0 0 8px #ff4444)' }}
                />
              </div>
              <span>LIVE NOW</span>
            </div>
            
            <div className="text-right">
              <div 
                className={`font-audiowide font-bold text-2xl drop-shadow-lg ${isExploding ? 'animate-pulse' : ''}`}
                style={{ 
                  color: currentColor,
                  filter: `drop-shadow(0 0 ${12 * pulseIntensity}px ${currentColor}60)`,
                  textShadow: `0 0 ${20 * pulseIntensity}px ${currentColor}`,
                }}
              >
                +{formatWinAmount(recentWin.winAmount)} SOL
              </div>
              {recentWin.winAmount >= 100 && (
                <div className="flex items-center space-x-2 text-xs font-audiowide text-green-400 font-bold animate-bounce">
                  <div className="w-5 h-5 relative">
                    <Image
                      src="/recentwinbanner/diamond.png"
                      alt="Diamond"
                      fill
                      className="object-contain"
                      style={{ filter: 'drop-shadow(0 0 8px #00ff88)' }}
                    />
                  </div>
                  <span>JACKPOT ZONE</span>
                </div>
              )}
            </div>
            
            {/* Urgency indicator */}
            <div className="flex items-center space-x-1">
              <div 
                className="w-2 h-2 rounded-full animate-pulse" 
                style={{ 
                  backgroundColor: currentColor,
                  boxShadow: `0 0 10px ${currentColor}`
                }}
              ></div>
              <span className="font-audiowide text-xs font-bold" style={{ color: currentColor }}>
                LIVE
              </span>
            </div>
          </div>
        </div>

        {/* Matrix Rain Integration */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div className="w-full h-full flex justify-between">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="w-0.5 h-full opacity-30"
                style={{
                  background: `linear-gradient(180deg, transparent, ${currentColor}40, transparent)`,
                  animation: `matrixDrop ${3 + i * 0.5}s linear infinite`,
                  animationDelay: `${i * 0.2}s`,
                }}
              />
            ))}
          </div>
        </div>

        {/* CSS animations */}
        <style jsx>{`
          @keyframes borderRush {
            0%, 100% { 
              opacity: 0.3; 
              transform: scaleX(1);
            }
            50% { 
              opacity: 1; 
              transform: scaleX(1.05);
            }
          }
          
          @keyframes lightning {
            0%, 90%, 100% { 
              opacity: 0.3;
              transform: scaleY(1);
            }
            5%, 15%, 25% { 
              opacity: 1;
              transform: scaleY(1.2);
            }
          }
          
          @keyframes electricSpark {
            0% { 
              opacity: 1; 
              transform: scale(1);
            }
            50% { 
              opacity: 0.8; 
              transform: scale(1.5);
            }
            100% { 
              opacity: 0; 
              transform: scale(2);
            }
          }
          
          @keyframes matrixDrop {
            0% { 
              transform: translateY(-100%);
              opacity: 0;
            }
            10% { 
              opacity: 1;
            }
            90% { 
              opacity: 1;
            }
            100% { 
              transform: translateY(200%);
              opacity: 0;
            }
          }
        `}</style>
      </div>
    </div>
  );
});

export default RecentWinBanner; 