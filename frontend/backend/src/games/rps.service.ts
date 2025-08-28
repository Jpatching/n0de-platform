import { Injectable, BadRequestException } from '@nestjs/common';
import { BaseGameService, CreateMatchParams, GameResult, ValidationResult } from './base-game.interface';
import { GameType, GameCategory } from './game-types';

export type RPSChoice = 'rock' | 'paper' | 'scissors';

export interface RPSMove {
  playerChoice: RPSChoice;
  opponentChoice: RPSChoice;
  timestamp: number;
}

export interface RPSGameState {
  moves: RPSMove[];
  winner: 'player' | 'opponent' | 'draw' | null;
  endReason: 'better_choice' | 'draw' | null;
  finalChoices: {
    playerChoice: RPSChoice;
    opponentChoice: RPSChoice;
  };
}

export interface RPSMatchResult {
  matchId: string;
  player1: string;
  player2: string;
  gameState: RPSGameState;
  winner: string | null; // wallet address
  isValid: boolean;
  endTime: number;
}

@Injectable()
export class RPSService extends BaseGameService {
  readonly gameType = GameType.RockPaperScissors;
  readonly gameCategory = GameCategory.TurnBased;

  /**
   * Validate a rock paper scissors game result
   */
  validateRPSResult(
    matchId: string,
    player1: string,
    player2: string,
    gameState: RPSGameState
  ): RPSMatchResult {
    
    const result: RPSMatchResult = {
      matchId,
      player1,
      player2,
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

      // 2. Validate choices
      if (!this.isValidChoices(gameState.finalChoices)) {
        throw new Error('Invalid choices');
      }

      // 3. Validate end condition
      if (!this.isValidEndCondition(gameState)) {
        throw new Error('Invalid end condition');
      }

      // 4. Determine winner wallet address
      result.winner = this.determineWinnerWallet(gameState, player1, player2);
      result.isValid = true;

      return result;

    } catch (error) {
      console.error(`RPS validation error for match ${matchId}:`, error.message);
      return result; // isValid = false
    }
  }

  private isValidGameState(gameState: RPSGameState): boolean {
    if (!gameState || !gameState.finalChoices) return false;
    if (!Array.isArray(gameState.moves)) return false;
    
    return true;
  }

  private isValidChoices(choices: { playerChoice: RPSChoice; opponentChoice: RPSChoice }): boolean {
    const validChoices: RPSChoice[] = ['rock', 'paper', 'scissors'];
    
    if (!validChoices.includes(choices.playerChoice)) return false;
    if (!validChoices.includes(choices.opponentChoice)) return false;
    
    return true;
  }

  private isValidEndCondition(gameState: RPSGameState): boolean {
    if (!gameState.endReason || gameState.winner === null || gameState.winner === undefined) {
      return false;
    }

    const { playerChoice, opponentChoice } = gameState.finalChoices;

    switch (gameState.endReason) {
      case 'better_choice':
        if (playerChoice === opponentChoice) return false; // Should be draw
        
        const playerWins = (
          (playerChoice === 'rock' && opponentChoice === 'scissors') ||
          (playerChoice === 'paper' && opponentChoice === 'rock') ||
          (playerChoice === 'scissors' && opponentChoice === 'paper')
        );
        
        if (gameState.winner === 'player' && !playerWins) return false;
        if (gameState.winner === 'opponent' && playerWins) return false;
        return true;
        
      case 'draw':
        return playerChoice === opponentChoice && gameState.winner === 'draw';
        
      default:
        return false;
    }
  }

  private determineWinnerWallet(
    gameState: RPSGameState,
    player1: string,
    player2: string
  ): string | null {
    
    if (gameState.winner === 'player') {
      return player1;
    } else if (gameState.winner === 'opponent') {
      return player2;
    } else if (gameState.winner === 'draw') {
      return null; // Draw = refund both players
    }
    
    return null;
  }

  /**
   * Create a RPS match with specific parameters
   */
  createRPSMatchData(player1: string, player2: string) {
    return {
      gameType: 'rock-paper-scissors',
      player1,
      player2,
      status: 'waiting_for_players',
      createdAt: Date.now()
    };
  }

  /**
   * Validate a RPS move
   */
  isValidRPSMove(move: RPSMove): boolean {
    const validChoices: RPSChoice[] = ['rock', 'paper', 'scissors'];
    
    // Validate choices
    if (!validChoices.includes(move.playerChoice)) return false;
    if (!validChoices.includes(move.opponentChoice)) return false;
    
    // Validate timestamp
    if (!move.timestamp || move.timestamp <= 0) return false;
    
    return true;
  }

  /**
   * Create a RPS match
   */
  async createMatch(params: CreateMatchParams): Promise<any> {
    return this.createRPSMatchData(params.creatorWallet, ''); // opponent will be set when joining
  }

  /**
   * Validate a RPS game result
   */
  async validateResult(result: GameResult): Promise<ValidationResult> {
    try {
      const gameState = result.gameData as RPSGameState;
      const matchResult = this.validateRPSResult(
        result.matchId,
        '', // will be provided in actual implementation
        '', // will be provided in actual implementation
        gameState
      );

      return {
        isValid: matchResult.isValid,
        winner: matchResult.winner,
        reason: matchResult.isValid ? undefined : 'Invalid RPS game state'
      };
    } catch (error) {
      return {
        isValid: false,
        winner: null,
        reason: error.message
      };
    }
  }
} 