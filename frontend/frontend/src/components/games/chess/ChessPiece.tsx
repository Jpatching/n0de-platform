'use client';

import { PieceType, PieceColor } from '@/lib/games/chess/chess-engine';

interface ChessPieceProps {
  type: PieceType;
  color: PieceColor;
  size?: 'small' | 'large';
}

export default function ChessPiece({ type, color, size = 'large' }: ChessPieceProps) {
  const pieceSymbols = {
    white: {
      king: '♔',
      queen: '♕',
      rook: '♖',
      bishop: '♗',
      knight: '♘',
      pawn: '♙'
    },
    black: {
      king: '♚',
      queen: '♛',
      rook: '♜',
      bishop: '♝',
      knight: '♞',
      pawn: '♟'
    }
  };

  const sizeClasses = {
    small: 'text-2xl',
    large: 'text-4xl'
  };

  return (
    <span 
      className={`
        ${sizeClasses[size]} 
        select-none 
        drop-shadow-lg
        ${color === 'white' ? 'text-white' : 'text-gray-900'}
      `}
      style={{
        filter: color === 'white' 
          ? 'drop-shadow(1px 1px 2px rgba(0,0,0,0.7))' 
          : 'drop-shadow(1px 1px 2px rgba(255,255,255,0.3))'
      }}
    >
      {pieceSymbols[color][type]}
    </span>
  );
} 