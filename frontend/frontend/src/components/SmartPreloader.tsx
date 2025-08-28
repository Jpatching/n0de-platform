'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface SmartPreloaderProps {
  currentGame?: string;
  userBehavior?: {
    recentGames: string[];
    favoriteGames: string[];
    sessionTime: number;
  };
}

/**
 * 🚀 PHASE 2: Smart Preloading System
 * 
 * Predicts and preloads likely next games based on:
 * - User behavior patterns
 * - Game popularity
 * - Session context
 * - Hover interactions
 */
export default function SmartPreloader({ currentGame, userBehavior }: SmartPreloaderProps) {
  const [preloadedGames, setPreloadedGames] = useState<Set<string>>(new Set());
  const [hoveredGame, setHoveredGame] = useState<string | null>(null);

  // Game popularity and transition patterns
  const gameTransitions = {
    'coinflip': ['crash', 'rps', 'dice-duel'],
    'crash': ['coinflip', 'mines', 'chess'],
    'chess': ['rps', 'dice-duel', 'crash'],
    'rps': ['coinflip', 'chess', 'mines'],
    'dice-duel': ['crash', 'chess', 'coinflip'],
    'mines': ['crash', 'rps', 'coinflip']
  };

  // Preload critical game assets
  const preloadGame = async (gameName: string) => {
    if (preloadedGames.has(gameName)) return;

    try {
      console.log(`🚀 Preloading ${gameName} assets...`);
      
      // Preload game-specific components
      switch (gameName) {
        case 'chess':
          // Preload chess engine and board
          await import('@/lib/games/chess/chess-engine');
          await import('@/components/games/chess/ChessBoard');
          await import('@/components/games/chess/ChessTimer');
          break;
          
        case 'crash':
          // Preload crash animation
          await import('@/components/games/crash/CrashAnimation');
          break;
          
        case 'dice-duel':
          // Preload 3D dice library (heavy)
          await import('@/components/games/dice/DiceBoxWrapper');
          break;
          
        case 'coinflip':
          // Preload coinflip engine and animation
          await import('@/lib/games/coinflip/coinflip-engine');
          await import('@/components/games/coinflip/CoinFlipAnimation');
          break;
          
        case 'rps':
          // Preload RPS animation
          await import('@/components/games/rps/RPSRevealAnimation');
          break;
          
        case 'mines':
          // Mines game doesn't have a separate engine yet
          console.log('Mines game assets ready');
          break;
      }
      
      setPreloadedGames(prev => new Set([...prev, gameName]));
      console.log(`✅ ${gameName} assets preloaded`);
      
    } catch (error) {
      console.warn(`⚠️ Failed to preload ${gameName}:`, error);
    }
  };

  // Smart preloading based on current game
  useEffect(() => {
    if (!currentGame) return;

    const likelyNextGames = gameTransitions[currentGame as keyof typeof gameTransitions] || [];
    
    // Preload likely next games with delay to avoid blocking current game
    const preloadTimer = setTimeout(() => {
      likelyNextGames.forEach((game, index) => {
        // Stagger preloading to avoid overwhelming the browser
        setTimeout(() => preloadGame(game), index * 1000);
      });
    }, 2000); // Wait 2 seconds after current game loads

    return () => clearTimeout(preloadTimer);
  }, [currentGame]);

  // Preload on hover (immediate user intent)
  useEffect(() => {
    if (hoveredGame) {
      // Immediate preload when user hovers over a game
      const hoverTimer = setTimeout(() => {
        preloadGame(hoveredGame);
      }, 300); // 300ms hover delay to avoid false positives

      return () => clearTimeout(hoverTimer);
    }
  }, [hoveredGame]);

  // Preload based on user behavior patterns
  useEffect(() => {
    if (!userBehavior) return;

    const { recentGames, favoriteGames } = userBehavior;
    
    // Preload user's favorite games
    favoriteGames.forEach((game, index) => {
      setTimeout(() => preloadGame(game), index * 2000);
    });

    // Preload recently played games
    recentGames.slice(0, 3).forEach((game, index) => {
      setTimeout(() => preloadGame(game), (index + favoriteGames.length) * 2000);
    });
  }, [userBehavior]);

  // Expose hover handlers for GameCard components
  useEffect(() => {
    const handleGameHover = (event: CustomEvent) => {
      setHoveredGame(event.detail.gameName);
    };

    const handleGameLeave = () => {
      setHoveredGame(null);
    };

    window.addEventListener('game-hover' as any, handleGameHover);
    window.addEventListener('game-leave' as any, handleGameLeave);

    return () => {
      window.removeEventListener('game-hover' as any, handleGameHover);
      window.removeEventListener('game-leave' as any, handleGameLeave);
    };
  }, []);

  // Debug info (remove in production)
  useEffect(() => {
    if (preloadedGames.size > 0) {
      console.log('🚀 Preloaded games:', Array.from(preloadedGames));
    }
  }, [preloadedGames]);

  return null; // This component doesn't render anything
} 