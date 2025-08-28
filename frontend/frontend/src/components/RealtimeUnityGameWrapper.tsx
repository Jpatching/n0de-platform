'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { GameType } from '@/types/game-types';

interface RealtimeUnityGameWrapperProps {
  gameType: GameType;
  matchId?: string;
  onGameComplete?: (result: any) => void;
  onGameError?: (error: string) => void;
}

export default function RealtimeUnityGameWrapper({ 
  gameType, 
  matchId, 
  onGameComplete, 
  onGameError 
}: RealtimeUnityGameWrapperProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const routeToGame = () => {
      // Check if there's an existing Unity game for this type
      const gameRoutes: Record<string, string> = {
        [GameType.UnityRacing]: '/games/realtime-unity/racing',
        [GameType.UnityFighting]: '/games/realtime-unity/fighting',
        [GameType.UnityStrategy]: '/games/realtime-unity/strategy',
        [GameType.UnitySports]: '/games/realtime-unity/sports',
        [GameType.UnityPuzzle]: '/games/realtime-unity/puzzle',
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
    const timer = setTimeout(routeToGame, 1500);
    return () => clearTimeout(timer);
  }, [gameType, matchId, router, onGameError]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-main text-text-primary flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🎮</div>
          <h2 className="text-2xl font-bold text-text-primary mb-4 font-audiowide">
            Loading Unity Game...
          </h2>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-primary mx-auto"></div>
          <p className="text-text-secondary mt-4 font-inter">
            Initializing Unity WebGL runtime...
          </p>
          <div className="mt-2 text-xs text-text-secondary font-inter">
            This may take a moment for high-quality 3D games
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-main text-text-primary flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">🎯</div>
        <h2 className="text-2xl font-bold text-text-primary mb-4 font-audiowide">
          Unity 3D Games
        </h2>
        <div className="mb-6">
          <h3 className="text-xl font-bold text-accent-primary mb-2 font-audiowide">
            {gameType}
          </h3>
          <p className="text-text-secondary font-inter">
            This premium Unity 3D game is in development! We&apos;re crafting stunning visuals and immersive gameplay for the ultimate gaming experience.
          </p>
        </div>
        <div className="space-y-3">
          <button 
            onClick={() => router.push('/classics')}
            className="primary-button font-audiowide w-full"
          >
            Play Available Games
          </button>
          <button 
            onClick={() => router.push('/')}
            className="secondary-button font-audiowide w-full"
          >
            Back to Home
          </button>
        </div>
        <div className="mt-6 p-4 bg-bg-card rounded-lg">
          <div className="text-xs text-text-secondary font-inter mb-2">
            <strong className="text-accent-primary">Coming Soon:</strong>
          </div>
          <div className="text-xs text-text-secondary font-inter">
            • High-quality 3D graphics<br/>
            • Cross-platform compatibility<br/>
            • Advanced physics and AI<br/>
            • Immersive audio experience
          </div>
        </div>
      </div>
    </div>
  );
} 