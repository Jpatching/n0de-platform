import { Injectable, BadRequestException } from '@nestjs/common';
import { BaseGameService, CreateMatchParams, GameResult, ValidationResult } from './base-game.interface';
import { GameType, GameCategory } from './game-types';

export interface ChessMove {
  from: { row: number; col: number };
  to: { row: number; col: number };
  piece: string;
  color: 'white' | 'black';
  captured?: string;
  timestamp: number;
}

export interface ChessGameState {
  moves: ChessMove[];
  winner: 'white' | 'black' | 'draw' | null;
  endReason: 'checkmate' | 'timeout' | 'resignation' | 'draw' | null;
  whiteTime: number;
  blackTime: number;
  finalPosition: string; // FEN notation
}

export interface ChessMatchResult {
  matchId: string;
  whitePlayer: string;
  blackPlayer: string;
  gameState: ChessGameState;
  winner: string | null; // wallet address
  isValid: boolean;
  endTime: number;
}

@Injectable()
export class ChessService extends BaseGameService {
  readonly gameType = GameType.Chess;
  readonly gameCategory = GameCategory.TurnBased;

  /**
   * Create a chess match
   */
  async createMatch(params: CreateMatchParams): Promise<any> {
    return this.createChessMatchData(params.creatorWallet, ''); // opponent will be set when joining
  }

  /**
   * Validate a chess game result
   */
  async validateResult(result: GameResult): Promise<ValidationResult> {
    try {
      const gameState = result.gameData as ChessGameState;
      const matchResult = this.validateChessResult(
        result.matchId,
        '', // will be provided in actual implementation
        '', // will be provided in actual implementation
        gameState
      );

      return {
        isValid: matchResult.isValid,
        winner: matchResult.winner,
        reason: matchResult.isValid ? undefined : 'Invalid chess game state'
      };
    } catch (error) {
      return {
        isValid: false,
        winner: null,
        reason: error.message
      };
    }
  }

  /**
   * Validate a chess game result (legacy method)
   */
  validateChessResult(
    matchId: string,
    whitePlayer: string,
    blackPlayer: string,
    gameState: ChessGameState
  ): ChessMatchResult {
    
    const result: ChessMatchResult = {
      matchId,
      whitePlayer,
      blackPlayer,
      gameState,
      winner: null,
      isValid: false,
      endTime: Date.now()
    };

    try {
      // 1. Basic validation
      if (!this.isValidGameState(gameState)) {
        throw new Error('Invalid game state');
      }

      // 2. Validate move sequence
      if (!this.isValidMoveSequence(gameState.moves)) {
        throw new Error('Invalid move sequence');
      }

      // 3. Validate time controls (5+0 blitz)
      if (!this.isValidTimeControl(gameState)) {
        throw new Error('Invalid time control');
      }

      // 4. Validate end condition
      if (!this.isValidEndCondition(gameState)) {
        throw new Error('Invalid end condition');
      }

      // 5. Determine winner wallet address
      result.winner = this.determineWinnerWallet(gameState, whitePlayer, blackPlayer);
      result.isValid = true;

      return result;

    } catch (error) {
      console.error(`Chess validation error for match ${matchId}:`, error.message);
      return result; // isValid = false
    }
  }

  private isValidGameState(gameState: ChessGameState): boolean {
    if (!gameState || !Array.isArray(gameState.moves)) return false;
    if (gameState.moves.length < 2) return false; // Minimum moves for a real game
    if (gameState.moves.length > 200) return false; // Maximum reasonable moves
    
    return true;
  }

  private isValidMoveSequence(moves: ChessMove[]): boolean {
    // Validate alternating colors (white starts)
    for (let i = 0; i < moves.length; i++) {
      const expectedColor = i % 2 === 0 ? 'white' : 'black';
      if (moves[i].color !== expectedColor) {
        return false;
      }
    }

    // Validate timestamps are increasing
    for (let i = 1; i < moves.length; i++) {
      if (moves[i].timestamp <= moves[i-1].timestamp) {
        return false;
      }
    }

    return true;
  }

  private isValidTimeControl(gameState: ChessGameState): boolean {
    const initialTime = 5 * 60 * 1000; // 5 minutes in milliseconds
    
    // Both players should start with 5 minutes
    if (gameState.whiteTime > initialTime || gameState.blackTime > initialTime) {
      return false;
    }

    // Time should be non-negative
    if (gameState.whiteTime < 0 || gameState.blackTime < 0) {
      return false;
    }

    return true;
  }

  private isValidEndCondition(gameState: ChessGameState): boolean {
    if (!gameState.endReason || gameState.winner === null || gameState.winner === undefined) {
      return false;
    }

    switch (gameState.endReason) {
      case 'timeout':
        // If timeout, losing player should have 0 time
        if (gameState.winner === 'white' && gameState.blackTime > 0) return false;
        if (gameState.winner === 'black' && gameState.whiteTime > 0) return false;
        return true;
        
      case 'checkmate':
      case 'resignation':
        // Valid end conditions
        return true;
        
      case 'draw':
        return gameState.winner === 'draw';
        
      default:
        return false;
    }
  }

  private determineWinnerWallet(
    gameState: ChessGameState,
    whitePlayer: string,
    blackPlayer: string
  ): string | null {
    
    if (gameState.winner === 'white') {
      return whitePlayer;
    } else if (gameState.winner === 'black') {
      return blackPlayer;
    } else if (gameState.winner === 'draw') {
      return null; // Draw = refund both players
    }
    
    return null;
  }

  /**
   * Create a chess match with specific parameters
   */
  createChessMatchData(whitePlayer: string, blackPlayer: string) {
    return {
      gameType: 'chess-blitz',
      timeControl: '5+0', // 5 minutes, no increment
      whitePlayer,
      blackPlayer,
      status: 'waiting_for_players',
      createdAt: Date.now()
    };
  }

  /**
   * Validate a chess move (basic validation)
   */
  isValidChessMove(move: ChessMove): boolean {
    // Basic bounds checking
    if (!this.isValidPosition(move.from) || !this.isValidPosition(move.to)) {
      return false;
    }

    // Valid piece types
    const validPieces = ['pawn', 'rook', 'knight', 'bishop', 'queen', 'king'];
    if (!validPieces.includes(move.piece)) {
      return false;
    }

    // Valid colors
    if (!['white', 'black'].includes(move.color)) {
      return false;
    }

    return true;
  }

  private isValidPosition(pos: { row: number; col: number }): boolean {
    return pos.row >= 0 && pos.row < 8 && pos.col >= 0 && pos.col < 8;
  }
} 