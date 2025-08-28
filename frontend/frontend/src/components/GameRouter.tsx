'use client';

import { Suspense, lazy } from 'react';
import { GameType, GameCategory } from '@/types/game-types';

interface GameRouterProps {
  gameType: GameType;
  matchId?: string;
  onGameComplete?: (result: any) => void;
  onGameError?: (error: string) => void;
}

// Game category mapping
const GAME_CATEGORIES: Record<GameType, GameCategory> = {
  // Turn-based
  [GameType.Chess]: GameCategory.TurnBased,
  [GameType.RockPaperScissors]: GameCategory.TurnBased,
  [GameType.CoinFlip]: GameCategory.TurnBased,
  
  // Real-time HTML5
  [GameType.SportsHeads]: GameCategory.RealtimeHTML5,
  [GameType.Racing]: GameCategory.RealtimeHTML5,
  [GameType.Fighting]: GameCategory.RealtimeHTML5,
  [GameType.PlatformerBattle]: GameCategory.RealtimeHTML5,
  [GameType.BubbleShooter]: GameCategory.RealtimeHTML5,
  [GameType.Snake]: GameCategory.RealtimeHTML5,
  [GameType.Tetris]: GameCategory.RealtimeHTML5,
  [GameType.Breakout]: GameCategory.RealtimeHTML5,
  
  // Quick Decision Games (Central Server Multiplayer)
  [GameType.Crash]: GameCategory.RealtimeHTML5,
  [GameType.Mines]: GameCategory.RealtimeHTML5,
  [GameType.ReactionRing]: GameCategory.RealtimeHTML5,
  [GameType.MindStab]: GameCategory.RealtimeHTML5,
  [GameType.MirrorMove]: GameCategory.RealtimeHTML5,
  [GameType.HiLo]: GameCategory.RealtimeHTML5,
  
  // Strategy/Logic Games (Central Server Multiplayer)
  [GameType.Connect4]: GameCategory.RealtimeHTML5,
  [GameType.HighCardDuel]: GameCategory.RealtimeHTML5,
  [GameType.MathDuel]: GameCategory.RealtimeHTML5,
  [GameType.DiceDuel]: GameCategory.RealtimeHTML5,
  
  // Real-time Unity
  [GameType.UnityRacing]: GameCategory.RealtimeUnity,
  [GameType.UnityFighting]: GameCategory.RealtimeUnity,
  [GameType.UnityStrategy]: GameCategory.RealtimeUnity,
  [GameType.UnitySports]: GameCategory.RealtimeUnity,
  [GameType.UnityPuzzle]: GameCategory.RealtimeUnity,
};

// Lazy load game components
const TurnBasedGameWrapper = lazy(() => import('./TurnBasedGameWrapper'));
const RealtimeHTML5GameWrapper = lazy(() => import('./RealtimeHTML5GameWrapper'));
const RealtimeUnityGameWrapper = lazy(() => import('./RealtimeUnityGameWrapper'));

// Game loading component
const GameLoading = () => (
  <div className="min-h-screen bg-main text-text-primary flex items-center justify-center">
    <div className="text-center">
      <div className="text-6xl mb-4">🎮</div>
      <h2 className="text-2xl font-bold text-text-primary mb-4 font-audiowide">Loading Game...</h2>
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-primary mx-auto"></div>
    </div>
  </div>
);

// Game error component
const GameError = ({ error, onRetry }: { error: string; onRetry?: () => void }) => (
  <div className="min-h-screen bg-main text-text-primary flex items-center justify-center">
    <div className="text-center max-w-md">
      <div className="text-6xl mb-4">❌</div>
      <h2 className="text-2xl font-bold text-text-primary mb-4 font-audiowide">Game Error</h2>
      <p className="text-text-secondary mb-6 font-inter">{error}</p>
      {onRetry && (
        <button onClick={onRetry} className="primary-button font-audiowide">
          Try Again
        </button>
      )}
    </div>
  </div>
);

export default function GameRouter({ gameType, matchId, onGameComplete, onGameError }: GameRouterProps) {
  const gameCategory = GAME_CATEGORIES[gameType];
  
  if (!gameCategory) {
    return <GameError error={`Unsupported game type: ${gameType}`} />;
  }

  const gameProps = {
    gameType,
    matchId,
    onGameComplete,
    onGameError,
  };

  return (
    <Suspense fallback={<GameLoading />}>
      {gameCategory === GameCategory.TurnBased && (
        <TurnBasedGameWrapper {...gameProps} />
      )}
      
      {gameCategory === GameCategory.RealtimeHTML5 && (
        <RealtimeHTML5GameWrapper {...gameProps} />
      )}
      
      {gameCategory === GameCategory.RealtimeUnity && (
        <RealtimeUnityGameWrapper {...gameProps} />
      )}
    </Suspense>
  );
} 