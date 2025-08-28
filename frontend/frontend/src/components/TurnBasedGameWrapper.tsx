'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { GameType } from '@/types/game-types';

interface TurnBasedGameWrapperProps {
  gameType: GameType;
  matchId?: string;
  onGameComplete?: (result: any) => void;
  onGameError?: (error: string) => void;
}

export default function TurnBasedGameWrapper({ 
  gameType, 
  matchId, 
  onGameComplete, 
  onGameError 
}: TurnBasedGameWrapperProps) {
  const router = useRouter();

  useEffect(() => {
    // Route to the appropriate existing game page based on game type
    const routeToGame = () => {
      const gameRoutes: Record<string, string> = {
        [GameType.Chess]: '/games/chess',
        [GameType.DiceDuel]: '/games/dice-duel', 
        [GameType.RockPaperScissors]: '/games/rps',
        [GameType.CoinFlip]: '/games/coinflip',
      };

      const route = gameRoutes[gameType];
      if (route) {
        // Add match ID to route if provided
        const finalRoute = matchId ? `${route}?matchId=${matchId}` : route;
        router.push(finalRoute);
      } else {
        // Fallback to classics page for unsupported games
        router.push('/classics');
        onGameError?.(`Unsupported turn-based game: ${gameType}`);
      }
    };

    routeToGame();
  }, [gameType, matchId, router, onGameError]);
  
  return (
    <div className="min-h-screen bg-main text-text-primary flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">🎮</div>
        <h2 className="text-2xl font-bold text-text-primary mb-4 font-audiowide">
          Loading {gameType}...
        </h2>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-primary mx-auto"></div>
        <p className="text-text-secondary mt-4 font-inter">
          Redirecting to game...
        </p>
      </div>
    </div>
  );
} 