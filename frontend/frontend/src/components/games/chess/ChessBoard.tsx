'use client';

import React, { useState } from 'react';
import { ChessEngine, Position, PieceColor } from '@/lib/games/chess/chess-engine';
import ChessPiece from './ChessPiece';

interface ChessBoardProps {
  engine: ChessEngine;
  onMove: (from: Position, to: Position) => void;
  playerColor: PieceColor;
  disabled?: boolean;
}

export default function ChessBoard({ engine, onMove, playerColor, disabled }: ChessBoardProps) {
  const [selectedSquare, setSelectedSquare] = useState<Position | null>(null);
  const [validMoves, setValidMoves] = useState<Position[]>([]);

  const handleSquareClick = (position: Position) => {
    if (disabled) return;

    // If no square selected, select this square if it has player's piece
    if (!selectedSquare) {
      const piece = engine.getPiece(position);
      if (piece.piece && piece.color === playerColor && piece.color === engine.currentPlayer) {
        setSelectedSquare(position);
        setValidMoves(getValidMovesForPiece(position));
      }
      return;
    }

    // If same square clicked, deselect
    if (selectedSquare.row === position.row && selectedSquare.col === position.col) {
      setSelectedSquare(null);
      setValidMoves([]);
      return;
    }

    // Try to make move
    const moveSuccessful = engine.isValidMove(selectedSquare, position);
    if (moveSuccessful) {
      onMove(selectedSquare, position);
      setSelectedSquare(null);
      setValidMoves([]);
    } else {
      // Select new piece if it's player's piece
      const piece = engine.getPiece(position);
      if (piece.piece && piece.color === playerColor && piece.color === engine.currentPlayer) {
        setSelectedSquare(position);
        setValidMoves(getValidMovesForPiece(position));
      } else {
        setSelectedSquare(null);
        setValidMoves([]);
      }
    }
  };

  const getValidMovesForPiece = (position: Position): Position[] => {
    const moves: Position[] = [];
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const targetPos = { row, col };
        if (engine.isValidMove(position, targetPos)) {
          moves.push(targetPos);
        }
      }
    }
    return moves;
  };

  const isSquareSelected = (position: Position): boolean => {
    return selectedSquare?.row === position.row && selectedSquare?.col === position.col;
  };

  const isValidMoveSquare = (position: Position): boolean => {
    return validMoves.some(move => move.row === position.row && move.col === position.col);
  };

  const getSquareColor = (row: number, col: number): string => {
    const isLight = (row + col) % 2 === 0;
    const position = { row, col };
    
    if (isSquareSelected(position)) {
      return 'bg-yellow-400';
    }
    if (isValidMoveSquare(position)) {
      return isLight ? 'bg-green-200' : 'bg-green-300';
    }
    return isLight ? 'bg-amber-100' : 'bg-amber-800';
  };

  // Flip board if player is black
  const boardRows = playerColor === 'white' ? 
    Array.from({ length: 8 }, (_, i) => i) : 
    Array.from({ length: 8 }, (_, i) => 7 - i);
  
  const boardCols = playerColor === 'white' ? 
    Array.from({ length: 8 }, (_, i) => i) : 
    Array.from({ length: 8 }, (_, i) => 7 - i);

  return (
    <div className="chess-board bg-amber-900 p-4 rounded-lg shadow-2xl">
      <div className="grid grid-cols-8 gap-0 border-2 border-amber-700">
        {boardRows.map(row => 
          boardCols.map(col => {
            const position = { row, col };
            const piece = engine.getPiece(position);
            
            return (
              <div
                key={`${row}-${col}`}
                className={`
                  w-16 h-16 flex items-center justify-center cursor-pointer
                  transition-colors duration-150 relative
                  ${getSquareColor(row, col)}
                  ${disabled ? 'cursor-not-allowed opacity-50' : 'hover:opacity-80'}
                `}
                onClick={() => handleSquareClick(position)}
              >
                {piece.piece && (
                  <ChessPiece 
                    type={piece.piece} 
                    color={piece.color!} 
                    size="large"
                  />
                )}
                
                {/* Coordinate labels */}
                {(playerColor === 'white' ? col === 0 : col === 7) && (
                  <div className="absolute left-1 top-1 text-xs font-bold text-gray-700">
                    {playerColor === 'white' ? 8 - row : row + 1}
                  </div>
                )}
                {(playerColor === 'white' ? row === 7 : row === 0) && (
                  <div className="absolute right-1 bottom-1 text-xs font-bold text-gray-700">
                    {playerColor === 'white' ? String.fromCharCode(97 + col) : String.fromCharCode(104 - col)}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
} 