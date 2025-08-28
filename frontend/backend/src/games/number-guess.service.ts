import { Injectable, BadRequestException } from '@nestjs/common';

export interface NumberGuessMove {
  playerGuess: number;
  actualNumber: number;
  timestamp: number;
}

export interface NumberGuessGameState {
  moves: NumberGuessMove[];
  winner: 'player' | 'house' | null;
  endReason: 'correct_guess' | 'wrong_guess' | null;
  finalResult: {
    playerGuess: number;
    actualNumber: number;
  };
  range: {
    min: number;
    max: number;
  };
}

export interface NumberGuessMatchResult {
  matchId: string;
  player: string;
  gameState: NumberGuessGameState;
  winner: string | null; // wallet address
  isValid: boolean;
  endTime: number;
}

@Injectable()
export class NumberGuessService {
  
  /**
   * Validate a number guess game result
   */
  validateNumberGuessResult(
    matchId: string,
    player: string,
    gameState: NumberGuessGameState
  ): NumberGuessMatchResult {
    
    const result: NumberGuessMatchResult = {
      matchId,
      player,
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

      // 2. Validate numbers
      if (!this.isValidNumbers(gameState.finalResult, gameState.range)) {
        throw new Error('Invalid numbers');
      }

      // 3. Validate end condition
      if (!this.isValidEndCondition(gameState)) {
        throw new Error('Invalid end condition');
      }

      // 4. Determine winner wallet address
      result.winner = this.determineWinnerWallet(gameState, player);
      result.isValid = true;

      return result;

    } catch (error) {
      console.error(`Number guess validation error for match ${matchId}:`, error.message);
      return result; // isValid = false
    }
  }

  private isValidGameState(gameState: NumberGuessGameState): boolean {
    if (!gameState || !gameState.finalResult || !gameState.range) return false;
    if (!Array.isArray(gameState.moves)) return false;
    
    return true;
  }

  private isValidNumbers(result: { playerGuess: number; actualNumber: number }, range: { min: number; max: number }): boolean {
    // Validate numbers are within range
    if (result.playerGuess < range.min || result.playerGuess > range.max) return false;
    if (result.actualNumber < range.min || result.actualNumber > range.max) return false;
    
    // Validate numbers are integers
    if (!Number.isInteger(result.playerGuess)) return false;
    if (!Number.isInteger(result.actualNumber)) return false;
    
    return true;
  }

  private isValidEndCondition(gameState: NumberGuessGameState): boolean {
    if (!gameState.endReason || !gameState.winner) {
      return false;
    }

    const { playerGuess, actualNumber } = gameState.finalResult;

    switch (gameState.endReason) {
      case 'correct_guess':
        return playerGuess === actualNumber && gameState.winner === 'player';
        
      case 'wrong_guess':
        return playerGuess !== actualNumber && gameState.winner === 'house';
        
      default:
        return false;
    }
  }

  private determineWinnerWallet(
    gameState: NumberGuessGameState,
    player: string
  ): string | null {
    
    if (gameState.winner === 'player') {
      return player;
    } else if (gameState.winner === 'house') {
      return null; // House wins = platform keeps wager
    }
    
    return null;
  }

  /**
   * Create a number guess match with specific parameters
   */
  createNumberGuessMatchData(player: string, range: { min: number; max: number } = { min: 1, max: 10 }) {
    return {
      gameType: 'number-guess',
      player,
      range,
      status: 'waiting_for_guess',
      createdAt: Date.now()
    };
  }

  /**
   * Validate a number guess move
   */
  isValidNumberGuessMove(move: NumberGuessMove, range: { min: number; max: number }): boolean {
    // Validate numbers are within range
    if (move.playerGuess < range.min || move.playerGuess > range.max) return false;
    if (move.actualNumber < range.min || move.actualNumber > range.max) return false;
    
    // Validate numbers are integers
    if (!Number.isInteger(move.playerGuess)) return false;
    if (!Number.isInteger(move.actualNumber)) return false;
    
    // Validate timestamp
    if (!move.timestamp || move.timestamp <= 0) return false;
    
    return true;
  }
} 