'use client';

import { useEffect, useState } from 'react';
import { PieceColor } from '@/lib/games/chess/chess-engine';

interface ChessTimerProps {
  whiteTime: number;
  blackTime: number;
  currentPlayer: PieceColor;
  gameState: string;
}

export default function ChessTimer({ whiteTime, blackTime, currentPlayer, gameState }: ChessTimerProps) {
  const [displayWhiteTime, setDisplayWhiteTime] = useState(whiteTime);
  const [displayBlackTime, setDisplayBlackTime] = useState(blackTime);

  useEffect(() => {
    setDisplayWhiteTime(whiteTime);
    setDisplayBlackTime(blackTime);
  }, [whiteTime, blackTime]);

  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getTimerClass = (time: number, isActive: boolean): string => {
    const baseClass = "text-2xl font-bold font-audiowide px-4 py-2 rounded-lg border-2 transition-all duration-200";
    
    if (time <= 30000) { // 30 seconds
      return `${baseClass} bg-red-500 text-white border-red-600 ${isActive ? 'animate-pulse' : ''}`;
    }
    if (time <= 60000) { // 1 minute
      return `${baseClass} bg-yellow-500 text-black border-yellow-600 ${isActive ? 'ring-2 ring-yellow-400' : ''}`;
    }
    
    return `${baseClass} ${isActive 
      ? 'bg-accent-primary text-black border-accent-secondary ring-2 ring-accent-primary' 
      : 'bg-bg-card text-text-primary border-border'
    }`;
  };

  return (
    <div className="flex flex-col space-y-4 w-32">
      {/* Black Timer (top) */}
      <div className="text-center">
        <div className="text-sm text-text-secondary font-inter mb-1">Black</div>
        <div className={getTimerClass(displayBlackTime, currentPlayer === 'black')}>
          {formatTime(displayBlackTime)}
        </div>
      </div>

      {/* Game Status */}
      <div className="text-center">
        <div className="text-xs text-text-muted font-inter">
          {gameState === 'playing' && `${currentPlayer}'s turn`}
          {gameState === 'check' && `${currentPlayer} in check!`}
          {gameState === 'checkmate' && 'Checkmate!'}
          {gameState === 'stalemate' && 'Stalemate'}
          {gameState === 'draw' && 'Draw'}
        </div>
      </div>

      {/* White Timer (bottom) */}
      <div className="text-center">
        <div className="text-sm text-text-secondary font-inter mb-1">White</div>
        <div className={getTimerClass(displayWhiteTime, currentPlayer === 'white')}>
          {formatTime(displayWhiteTime)}
        </div>
      </div>
    </div>
  );
} 