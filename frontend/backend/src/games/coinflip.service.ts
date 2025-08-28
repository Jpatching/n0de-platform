import { Injectable, BadRequestException } from '@nestjs/common';
import { BaseGameService, CreateMatchParams, GameResult, ValidationResult } from './base-game.interface';
import { GameType, GameCategory } from './game-types';
import * as crypto from 'crypto';
import { Logger } from '@nestjs/common';

export type CoinSide = 'heads' | 'tails';

export interface CoinFlipMove {
  player: string; // wallet address
  choice: CoinSide;
  timestamp: number;
}

export interface CoinFlipRound {
  roundNumber: number;
  player1Choice: CoinSide | null;
  player2Choice: CoinSide | null;
  coinResult: CoinSide | null;
  winner: string | null; // wallet address or null for tie
  timestamp: number;
  completed: boolean;
}

export interface CoinFlipGameState {
  matchId: string;
  player1: string; // wallet address
  player2: string; // wallet address
  currentRound: number;
  player1Score: number;
  player2Score: number;
  rounds: CoinFlipRound[];
  matchComplete: boolean;
  matchWinner: string | null; // wallet address
  format: 'best-of-5';
  requiredWins: number;
  lastActivity: number;
}

export interface CoinFlipMatchResult {
  matchId: string;
  player1: string;
  player2: string;
  gameState: CoinFlipGameState;
  winner: string | null;
  isValid: boolean;
  endTime: number;
}

@Injectable()
export class CoinFlipService extends BaseGameService {
  readonly gameType = GameType.CoinFlip;
  readonly gameCategory = GameCategory.TurnBased;

  // Store active match states in memory (in production, use Redis)
  private activeMatches: Map<string, CoinFlipGameState> = new Map();

  private readonly logger = new Logger(CoinFlipService.name);

  /**
   * Create a coinflip match
   */
  async createMatch(params: CreateMatchParams): Promise<any> {
    const gameState: CoinFlipGameState = {
      matchId: '', // Will be set by caller
      player1: params.creatorWallet,
      player2: '', // Will be set when opponent joins
      currentRound: 1,
      player1Score: 0,
      player2Score: 0,
      rounds: [],
      matchComplete: false,
      matchWinner: null,
      format: 'best-of-5',
      requiredWins: 3,
      lastActivity: Date.now()
    };

    return {
      gameType: 'coin-flip',
      gameState,
      status: 'waiting_for_players',
      createdAt: Date.now()
    };
  }

  /**
   * Initialize match when second player joins
   */
  initializeMatch(matchId: string, player1: string, player2: string): CoinFlipGameState {
    const gameState: CoinFlipGameState = {
      matchId,
      player1,
      player2,
      currentRound: 1,
      player1Score: 0,
      player2Score: 0,
      rounds: [],
      matchComplete: false,
      matchWinner: null,
      format: 'best-of-5',
      requiredWins: 3,
      lastActivity: Date.now()
    };

    this.activeMatches.set(matchId, gameState);
    this.logger.log(`🎯 Initialized coinflip match ${matchId}: ${player1} vs ${player2}`);
    
    return gameState;
  }

  /**
   * Process player choice
   */
  processPlayerChoice(matchId: string, playerWallet: string, choice: CoinSide): {
    success: boolean;
    gameState: CoinFlipGameState;
    bothPlayersReady: boolean;
    error?: string;
  } {
    const gameState = this.activeMatches.get(matchId);
    if (!gameState) {
      return { success: false, gameState: null as any, bothPlayersReady: false, error: 'Match not found' };
    }

    if (gameState.matchComplete) {
      return { success: false, gameState, bothPlayersReady: false, error: 'Match already completed' };
    }

    // Get current round
    let currentRound = gameState.rounds.find(r => r.roundNumber === gameState.currentRound);
    if (!currentRound) {
      // Create new round
      currentRound = {
        roundNumber: gameState.currentRound,
        player1Choice: null,
        player2Choice: null,
        coinResult: null,
        winner: null,
        timestamp: Date.now(),
        completed: false
      };
      gameState.rounds.push(currentRound);
    }

    // Set player choice
    if (playerWallet === gameState.player1) {
      if (currentRound.player1Choice !== null) {
        return { success: false, gameState, bothPlayersReady: false, error: 'Player 1 already made choice' };
      }
      currentRound.player1Choice = choice;
    } else if (playerWallet === gameState.player2) {
      if (currentRound.player2Choice !== null) {
        return { success: false, gameState, bothPlayersReady: false, error: 'Player 2 already made choice' };
      }
      currentRound.player2Choice = choice;
    } else {
      return { success: false, gameState, bothPlayersReady: false, error: 'Player not in this match' };
    }

    gameState.lastActivity = Date.now();
    
    const bothPlayersReady = currentRound.player1Choice !== null && currentRound.player2Choice !== null;
    
    this.logger.log(`🎯 Player choice processed: ${playerWallet} chose ${choice} in match ${matchId}`);
    this.logger.log(`🎯 Both players ready: ${bothPlayersReady}`);

    return { success: true, gameState, bothPlayersReady };
  }

  /**
   * Execute coin flip (server-side random generation)
   */
  executeCoinFlip(matchId: string): {
    success: boolean;
    gameState: CoinFlipGameState;
    roundResult?: {
      coinResult: CoinSide;
      roundWinner: string | null;
      player1Correct: boolean;
      player2Correct: boolean;
      matchComplete: boolean;
      matchWinner: string | null;
    };
    error?: string;
  } {
    this.logger.debug(`🚨 DEBUG: executeCoinFlip called for match ${matchId}`);
    
    const gameState = this.activeMatches.get(matchId);
    if (!gameState) {
      this.logger.warn(`❌ Match not found in memory: ${matchId}`);
      return { success: false, gameState: null as any, error: 'Match not found' };
    }

    this.logger.debug(`🚨 DEBUG: Current game state before execution:`, {
      player1: gameState.player1,
      player2: gameState.player2,
      currentRound: gameState.currentRound,
      player1Score: gameState.player1Score,
      player2Score: gameState.player2Score,
      requiredWins: gameState.requiredWins,
      matchComplete: gameState.matchComplete,
      totalRounds: gameState.rounds.length
    });

    const currentRound = gameState.rounds.find(r => r.roundNumber === gameState.currentRound);
    if (!currentRound) {
      this.logger.warn(`❌ Current round not found: ${gameState.currentRound}`);
      return { success: false, gameState, error: 'Current round not found' };
    }
    
    this.logger.debug(`🚨 DEBUG: Current round state:`, {
      roundNumber: currentRound.roundNumber,
      player1Choice: currentRound.player1Choice,
      player2Choice: currentRound.player2Choice,
      roundCompleted: currentRound.completed
    });
    
    if (currentRound.player1Choice === null || currentRound.player2Choice === null) {
      this.logger.warn(`❌ Both players must make choices first - P1: ${currentRound.player1Choice}, P2: ${currentRound.player2Choice}`);
      return { success: false, gameState, error: 'Both players must make choices first' };
    }

    if (currentRound.completed) {
      this.logger.warn(`❌ Round already completed: ${currentRound.roundNumber}`);
      return { success: false, gameState, error: 'Round already completed' };
    }

    this.logger.debug(`✅ DEBUG: Proceeding with coin flip execution...`);

    // 🎯 SERVER-SIDE CRYPTOGRAPHIC RANDOM GENERATION
    const randomBytes = crypto.randomBytes(32);
    const randomValue = randomBytes.readUInt32BE(0);
    const coinResult: CoinSide = (randomValue % 2) === 0 ? 'heads' : 'tails';

    // Determine round winner
    const player1Correct = currentRound.player1Choice === coinResult;
    const player2Correct = currentRound.player2Choice === coinResult;
    
    let roundWinner: string | null = null;
    if (player1Correct && !player2Correct) {
      roundWinner = gameState.player1;
      gameState.player1Score++;
    } else if (player2Correct && !player1Correct) {
      roundWinner = gameState.player2;
      gameState.player2Score++;
    }
    // If both correct or both wrong, it's a tie - no score change

    // Update round
    currentRound.coinResult = coinResult;
    currentRound.winner = roundWinner;
    currentRound.completed = true;
    currentRound.timestamp = Date.now();

    this.logger.debug(`🚨 DEBUG: After scoring update:`, {
      player1Score: gameState.player1Score,
      player2Score: gameState.player2Score,
      requiredWins: gameState.requiredWins
    });

    // Check if match is complete
    const matchComplete = gameState.player1Score >= gameState.requiredWins || 
                         gameState.player2Score >= gameState.requiredWins;
    
    this.logger.debug(`🚨 DEBUG: Match completion check:`, {
      p1ScoreReached: gameState.player1Score >= gameState.requiredWins,
      p2ScoreReached: gameState.player2Score >= gameState.requiredWins,
      matchComplete
    });
    
    let matchWinner: string | null = null;
    if (matchComplete) {
      matchWinner = gameState.player1Score > gameState.player2Score ? gameState.player1 : gameState.player2;
      gameState.matchComplete = true;
      gameState.matchWinner = matchWinner;
      this.logger.log(`🏁 MATCH COMPLETE! Winner: ${matchWinner}`);
    } else {
      // Prepare for next round
      gameState.currentRound++;
      this.logger.debug(`🎮 Match continues to round ${gameState.currentRound}`);
    }

    gameState.lastActivity = Date.now();

    const roundResult = {
      coinResult,
      roundWinner,
      player1Correct,
      player2Correct,
      matchComplete,
      matchWinner
    };

    this.logger.log(`🪙 Coin flip executed for match ${matchId}:`, {
      coinResult,
      player1: { wallet: gameState.player1, choice: currentRound.player1Choice, correct: player1Correct },
      player2: { wallet: gameState.player2, choice: currentRound.player2Choice, correct: player2Correct },
      roundWinner: roundWinner || 'TIE',
      score: `${gameState.player1Score}-${gameState.player2Score}`,
      matchComplete
    });

    return { success: true, gameState, roundResult };
  }

  /**
   * Get match state
   */
  getMatchState(matchId: string): CoinFlipGameState | null {
    return this.activeMatches.get(matchId) || null;
  }

  /**
   * Clean up completed match
   */
  cleanupMatch(matchId: string): void {
    this.activeMatches.delete(matchId);
    this.logger.log(`🧹 Cleaned up coinflip match ${matchId}`);
  }

  /**
   * Validate coinflip game result (for final submission)
   */
  async validateResult(result: GameResult): Promise<ValidationResult> {
    try {
      const gameState = result.gameData as CoinFlipGameState;
      const matchResult = this.validateCoinFlipResult(result.matchId, gameState.player1, gameState.player2, gameState);

      return {
        isValid: matchResult.isValid,
        winner: matchResult.winner,
        reason: matchResult.isValid ? undefined : 'Invalid coinflip game state'
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
   * Validate coinflip game result (overloaded version for match service)
   */
  validateCoinFlipResult(matchId: string, player1: string, player2: string, gameState: CoinFlipGameState): CoinFlipMatchResult {
    const result: CoinFlipMatchResult = {
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

      // 2. Validate round sequence
      if (!this.isValidRoundSequence(gameState.rounds)) {
        throw new Error('Invalid round sequence');
      }

      // 3. Validate scoring
      if (!this.isValidScoring(gameState)) {
        throw new Error('Invalid scoring');
      }

      // 4. Validate end condition
      if (!this.isValidEndCondition(gameState)) {
        throw new Error('Invalid end condition');
      }

      result.winner = gameState.matchWinner;
      result.isValid = true;

      return result;

    } catch (error) {
      this.logger.error(`CoinFlip validation error for match ${matchId}:`, error.message);
      return result;
    }
  }

  private isValidGameState(gameState: CoinFlipGameState): boolean {
    if (!gameState || !Array.isArray(gameState.rounds)) return false;
    if (gameState.rounds.length === 0) return false;
    if (gameState.currentRound < 1) return false;
    return true;
  }

  private isValidRoundSequence(rounds: CoinFlipRound[]): boolean {
    for (let i = 0; i < rounds.length; i++) {
      const round = rounds[i];
      if (round.roundNumber !== i + 1) return false;
      if (!round.completed) return false;
      if (round.player1Choice === null || round.player2Choice === null) return false;
      if (round.coinResult === null) return false;
    }
    return true;
  }

  private isValidScoring(gameState: CoinFlipGameState): boolean {
    let calculatedP1Score = 0;
    let calculatedP2Score = 0;

    for (const round of gameState.rounds) {
      if (round.winner === gameState.player1) {
        calculatedP1Score++;
      } else if (round.winner === gameState.player2) {
        calculatedP2Score++;
      }
    }

    return calculatedP1Score === gameState.player1Score && 
           calculatedP2Score === gameState.player2Score;
  }

  private isValidEndCondition(gameState: CoinFlipGameState): boolean {
    if (!gameState.matchComplete) return false;
    
    const maxScore = Math.max(gameState.player1Score, gameState.player2Score);
    return maxScore >= gameState.requiredWins;
  }

  /**
   * Convert game state to smart contract format
   */
  convertToSmartContractFormat(gameState: CoinFlipGameState): any {
    // Smart contract expects TurnBasedResult format:
    // moves: [player1_choice, player2_choice, coin_result] for each round
    // final_position: [final_score_p1, final_score_p2, total_rounds]
    // move_count: number of rounds played

    const moves: number[] = [];
    
    // Convert each round to smart contract format
    for (const round of gameState.rounds) {
      if (round.completed && round.player1Choice && round.player2Choice && round.coinResult) {
        // Convert choices to numbers (0=heads, 1=tails)
        const p1Choice = round.player1Choice === 'heads' ? 0 : 1;
        const p2Choice = round.player2Choice === 'heads' ? 0 : 1;
        const coinResult = round.coinResult === 'heads' ? 0 : 1;
        
        moves.push(p1Choice, p2Choice, coinResult);
      }
    }

    // Final position: [player1_score, player2_score, total_rounds]
    const finalPosition = [
      gameState.player1Score,
      gameState.player2Score,
      gameState.rounds.length
    ];

    return {
      moves: new Uint8Array(moves),
      final_position: new Uint8Array(finalPosition),
      move_count: gameState.rounds.length
    };
  }
} 