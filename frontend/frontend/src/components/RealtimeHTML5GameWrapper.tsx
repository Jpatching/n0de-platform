'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { GameType } from '@/types/game-types';

interface RealtimeHTML5GameWrapperProps {
  gameType: GameType;
  matchId?: string;
  onGameComplete?: (result: any) => void;
  onGameError?: (error: string) => void;
}

export default function RealtimeHTML5GameWrapper({ 
  gameType, 
  matchId, 
  onGameComplete, 
  onGameError 
}: RealtimeHTML5GameWrapperProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const routeToGame = () => {
      // Check if there's an existing realtime HTML5 game for this type
      const gameRoutes: Record<string, string> = {
        [GameType.SportsHeads]: '/games/realtime-html5/sports-heads',
        [GameType.Racing]: '/games/realtime-html5/racing',
        [GameType.Fighting]: '/games/realtime-html5/fighting',
        [GameType.PlatformerBattle]: '/games/realtime-html5/platformer-battle',
        [GameType.BubbleShooter]: '/games/realtime-html5/bubble-shooter',
        [GameType.Snake]: '/games/realtime-html5/snake',
        [GameType.Tetris]: '/games/realtime-html5/tetris',
        [GameType.Breakout]: '/games/realtime-html5/breakout',
      };

      const route = gameRoutes[gameType];
      if (route) {
        // Add match ID to route if provided
        const finalRoute = matchId ? `${route}?matchId=${matchId}` : route;
        router.push(finalRoute);
      } else {
        // If no specific route exists, show the coming soon message
        setIsLoading(false);
      }
    };

    // Small delay to show loading state
    const timer = setTimeout(routeToGame, 1000);
    return () => clearTimeout(timer);
  }, [gameType, matchId, router, onGameError]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-main text-text-primary flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🎯</div>
          <h2 className="text-2xl font-bold text-text-primary mb-4 font-audiowide">
            Loading {gameType}...
          </h2>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-primary mx-auto"></div>
          <p className="text-text-secondary mt-4 font-inter">
            Initializing real-time game engine...
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-main text-text-primary flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">🚀</div>
        <h2 className="text-2xl font-bold text-text-primary mb-4 font-audiowide">
          Real-time HTML5 Games
        </h2>
        <div className="mb-6">
          <h3 className="text-xl font-bold text-accent-primary mb-2 font-audiowide">
            {gameType}
          </h3>
          <p className="text-text-secondary font-inter">
            This exciting real-time game is coming soon! Our developers are working hard to bring you the best gaming experience.
          </p>
        </div>
        <div className="space-y-3">
          <button 
            onClick={() => router.push('/classics')}
            className="primary-button font-audiowide w-full"
          >
            Play Turn-Based Games
          </button>
          <button 
            onClick={() => router.push('/')}
            className="secondary-button font-audiowide w-full"
          >
            Back to Home
          </button>
        </div>
        <div className="mt-6 text-xs text-text-secondary font-inter">
          Want to be notified when {gameType} launches? Join our community!
        </div>
      </div>
    </div>
  );
} 