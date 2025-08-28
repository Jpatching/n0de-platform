'use client';

import { useEffect, useState, useCallback } from 'react';

interface InstantGameLoaderProps {
  currentGame?: string;
  children: React.ReactNode;
}

/**
 * 🚀 PHASE 3: Instant Game Loading System
 * 
 * Preloads game assets on hover and predicts next games
 * Makes 1v1 game launches feel instant
 */
export default function InstantGameLoader({ currentGame, children }: InstantGameLoaderProps) {
  const [preloadedGames, setPreloadedGames] = useState<Set<string>>(new Set());
  const [hoveredGame, setHoveredGame] = useState<string | null>(null);

  // Game transition patterns for 1v1 gaming
  const gameTransitions = {
    'coinflip': ['crash', 'rps', 'dice-duel'],
    'crash': ['coinflip', 'chess', 'mines'],
    'chess': ['rps', 'coinflip', 'dice-duel'],
    'rps': ['coinflip', 'crash', 'chess'],
    'dice-duel': ['crash', 'chess', 'coinflip'],
    'mines': ['crash', 'coinflip', 'rps'],
    'pump-wars': ['crash', 'coinflip', 'chess']
  };

  // Preload game assets instantly
  const preloadGameAssets = useCallback(async (gameName: string) => {
    if (preloadedGames.has(gameName)) return;

    try {
      console.log(`⚡ Instant-loading ${gameName} assets...`);
      
      // Preload critical assets for instant game launch
      const assetPromises: Promise<any>[] = [];

      // Game cover video
      const videoUrl = `/game-covers/${gameName}.webm`;
      assetPromises.push(
        fetch(videoUrl).then(response => {
          if (response.ok) {
            console.log(`✅ ${gameName} video ready`);
          }
        }).catch(() => {})
      );

      // Game-specific components
      switch (gameName.toLowerCase()) {
        case 'coinflip':
          assetPromises.push(
            import('@/lib/games/coinflip/coinflip-engine').catch(() => {}),
            import('@/components/games/coinflip/CoinFlipAnimation').catch(() => {})
          );
          break;
          
        case 'crash':
          assetPromises.push(
            import('@/components/games/crash/CrashAnimation').catch(() => {})
          );
          break;
          
        case 'chess':
          assetPromises.push(
            import('@/lib/games/chess/chess-engine').catch(() => {}),
            import('@/components/games/chess/ChessBoard').catch(() => {}),
            import('@/components/games/chess/ChessTimer').catch(() => {})
          );
          break;
          
        case 'rps':
        case 'rock-paper-scissors':
          assetPromises.push(
            import('@/components/games/rps/RPSRevealAnimation').catch(() => {})
          );
          break;
          
        case 'dice-duel':
          assetPromises.push(
            import('@/components/games/dice/DiceBoxWrapper').catch(() => {})
          );
          break;
          
        case 'pump-wars':
          // Pump Wars uses external APIs (Jupiter, Dexscreener) - minimal preloading needed
          break;
      }

      // Wait for all assets to preload
      await Promise.allSettled(assetPromises);
      
      setPreloadedGames(prev => new Set([...prev, gameName]));
      console.log(`🚀 ${gameName} ready for instant launch!`);
      
    } catch (error) {
      console.warn(`⚠️ Preload failed for ${gameName}:`, error);
    }
  }, [preloadedGames]);

  // Preload likely next games based on current game
  useEffect(() => {
    if (!currentGame) return;

    const likelyNextGames = gameTransitions[currentGame as keyof typeof gameTransitions] || [];
    
    // Stagger preloading to avoid overwhelming browser
    likelyNextGames.forEach((game, index) => {
      setTimeout(() => {
        preloadGameAssets(game);
      }, (index + 1) * 1500); // 1.5s between each preload
    });
  }, [currentGame, preloadGameAssets]);

  // Instant preload on hover
  useEffect(() => {
    if (hoveredGame) {
      // Immediate preload when user shows intent
      const hoverTimer = setTimeout(() => {
        preloadGameAssets(hoveredGame);
      }, 200); // 200ms hover delay

      return () => clearTimeout(hoverTimer);
    }
  }, [hoveredGame, preloadGameAssets]);

  // Listen for game hover events from GameCard components
  useEffect(() => {
    const handleGameHover = (event: CustomEvent) => {
      const gameName = event.detail.gameName?.toLowerCase();
      if (gameName) {
        setHoveredGame(gameName);
      }
    };

    const handleGameLeave = () => {
      setHoveredGame(null);
    };

    // Listen for hover events
    window.addEventListener('game-hover' as any, handleGameHover);
    window.addEventListener('game-leave' as any, handleGameLeave);

    return () => {
      window.removeEventListener('game-hover' as any, handleGameHover);
      window.removeEventListener('game-leave' as any, handleGameLeave);
    };
  }, []);

  // Preload popular games immediately
  useEffect(() => {
    // Preload most popular games after 3 seconds
    const popularGames = ['coinflip', 'crash', 'chess'];
    
    const timer = setTimeout(() => {
      popularGames.forEach((game, index) => {
        setTimeout(() => {
          preloadGameAssets(game);
        }, index * 2000); // 2s between popular games
      });
    }, 3000);

    return () => clearTimeout(timer);
  }, [preloadGameAssets]);

  // Debug logging
  useEffect(() => {
    if (preloadedGames.size > 0) {
      console.log('⚡ Games ready for instant launch:', Array.from(preloadedGames));
    }
  }, [preloadedGames]);

  return <>{children}</>;
} 