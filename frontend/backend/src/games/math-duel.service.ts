import { Injectable, BadRequestException } from '@nestjs/common';
import { BaseGameService, CreateMatchParams, GameResult, ValidationResult } from './base-game.interface';
import { GameType, GameCategory } from './game-types';
import * as crypto from 'crypto';

export interface MathProblem {
  id: string;
  question: string;
  answer: number;
  operation: 'addition' | 'subtraction' | 'multiplication' | 'division';
  difficulty: 'easy' | 'medium' | 'hard';
  timeLimit: number; // milliseconds
  points: number;
}

export interface MathQuizMove {
  player: string; // wallet address
  problemId: string;
  answer: number;
  responseTime: number; // milliseconds taken to answer
  timestamp: number;
  isCorrect: boolean;
}

export interface MathQuizRound {
  roundNumber: number;
  problem: MathProblem;
  player1Move: MathQuizMove | null;
  player2Move: MathQuizMove | null;
  winner: string | null; // wallet address of round winner
  roundComplete: boolean;
  startTime: number;
  endTime?: number;
}

export interface MathDuelGameState {
  matchId: string;
  player1: string; // wallet address
  player2: string; // wallet address
  currentRound: number;
  player1Score: number;
  player2Score: number;
  rounds: MathQuizRound[];
  matchComplete: boolean;
  matchWinner: string | null; // wallet address
  format: 'best-of-5' | 'best-of-7' | 'first-to-10';
  requiredWins: number;
  lastActivity: number;
  difficulty: 'mixed' | 'easy' | 'medium' | 'hard';
  isVoid: boolean;
}

export interface MathDuelMatchResult {
  matchId: string;
  player1: string;
  player2: string;
  gameState: MathDuelGameState;
  winner: string | null;
  isValid: boolean;
  endTime: number;
}

@Injectable()
export class MathDuelService extends BaseGameService {
  readonly gameType = GameType.MathDuel;
  readonly gameCategory = GameCategory.TurnBased;

  // Store active match states in memory (in production, use Redis)
  private activeMatches: Map<string, MathDuelGameState> = new Map();

  /**
   * Create a math duel match
   */
  async createMatch(params: CreateMatchParams): Promise<any> {
    const gameState: MathDuelGameState = {
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
      lastActivity: Date.now(),
      difficulty: 'mixed',
      isVoid: false
    };

    return {
      gameType: 'math-duel',
      gameState,
      status: 'waiting_for_players',
      createdAt: Date.now()
    };
  }

  /**
   * Initialize match when second player joins
   */
  initializeMatch(matchId: string, player1: string, player2: string): MathDuelGameState {
    const gameState: MathDuelGameState = {
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
      lastActivity: Date.now(),
      difficulty: 'mixed',
      isVoid: false
    };

    this.activeMatches.set(matchId, gameState);
    console.log(`🧮 Initialized math duel match ${matchId}: ${player1} vs ${player2}`);
    
    return gameState;
  }

  /**
   * Start a new round with a math problem
   */
  startNewRound(matchId: string): { problem: MathProblem; gameState: MathDuelGameState } | null {
    const gameState = this.activeMatches.get(matchId);
    if (!gameState || gameState.matchComplete) {
      return null;
    }

    const problem = this.generateMathProblem(gameState.difficulty, gameState.currentRound);
    
    const newRound: MathQuizRound = {
      roundNumber: gameState.currentRound,
      problem,
      player1Move: null,
      player2Move: null,
      winner: null,
      roundComplete: false,
      startTime: Date.now()
    };

    gameState.rounds.push(newRound);
    gameState.lastActivity = Date.now();

    console.log(`🔢 Round ${gameState.currentRound} started: ${problem.question}`);
    
    return { problem, gameState };
  }

  /**
   * Process a player's answer to a math problem
   */
  processAnswer(matchId: string, playerWallet: string, problemId: string, answer: number, responseTime: number): {
    success: boolean;
    gameState: MathDuelGameState;
    isCorrect: boolean;
    roundComplete: boolean;
    roundWinner?: string;
    matchComplete?: boolean;
    matchWinner?: string;
    error?: string;
  } {
    const gameState = this.activeMatches.get(matchId);
    if (!gameState) {
      return { success: false, gameState: null, isCorrect: false, roundComplete: false, error: 'Match not found' };
    }

    const currentRound = gameState.rounds[gameState.currentRound - 1];
    if (!currentRound || currentRound.roundComplete) {
      return { success: false, gameState, isCorrect: false, roundComplete: false, error: 'Round not active' };
    }

    if (currentRound.problem.id !== problemId) {
      return { success: false, gameState, isCorrect: false, roundComplete: false, error: 'Invalid problem ID' };
    }

    const isPlayer1 = gameState.player1 === playerWallet;
    const isCorrect = answer === currentRound.problem.answer;

    // Create the move
    const move: MathQuizMove = {
      player: playerWallet,
      problemId,
      answer,
      responseTime,
      timestamp: Date.now(),
      isCorrect
    };

    // Store the move
    if (isPlayer1) {
      if (currentRound.player1Move) {
        return { success: false, gameState, isCorrect, roundComplete: false, error: 'Player already answered' };
      }
      currentRound.player1Move = move;
    } else {
      if (currentRound.player2Move) {
        return { success: false, gameState, isCorrect, roundComplete: false, error: 'Player already answered' };
      }
      currentRound.player2Move = move;
    }

    // Check if round is complete (both players answered)
    const roundComplete = !!(currentRound.player1Move && currentRound.player2Move);
    let roundWinner: string | null = null;
    let matchComplete = false;
    let matchWinner: string | null = null;

    if (roundComplete) {
      currentRound.endTime = Date.now();
      currentRound.roundComplete = true;

      // Determine round winner based on correctness and speed
      const p1Move = currentRound.player1Move!;
      const p2Move = currentRound.player2Move!;

      if (p1Move.isCorrect && !p2Move.isCorrect) {
        roundWinner = gameState.player1;
      } else if (p2Move.isCorrect && !p1Move.isCorrect) {
        roundWinner = gameState.player2;
      } else if (p1Move.isCorrect && p2Move.isCorrect) {
        // Both correct - fastest wins
        roundWinner = p1Move.responseTime <= p2Move.responseTime ? gameState.player1 : gameState.player2;
      } else {
        // Both wrong - fastest wrong answer wins (gambling psychology!)
        roundWinner = p1Move.responseTime <= p2Move.responseTime ? gameState.player1 : gameState.player2;
      }

      currentRound.winner = roundWinner;

      // Update scores
      if (roundWinner === gameState.player1) {
        gameState.player1Score++;
      } else if (roundWinner === gameState.player2) {
        gameState.player2Score++;
      }

      // Check for match completion
      if (gameState.player1Score >= gameState.requiredWins || gameState.player2Score >= gameState.requiredWins) {
        gameState.matchComplete = true;
        matchComplete = true;
        matchWinner = gameState.player1Score >= gameState.requiredWins ? gameState.player1 : gameState.player2;
        gameState.matchWinner = matchWinner;
        console.log(`🏆 Math Duel match ${matchId} complete! Winner: ${matchWinner}`);
      } else {
        // Prepare for next round
        gameState.currentRound++;
      }
    }

    gameState.lastActivity = Date.now();

    return {
      success: true,
      gameState,
      isCorrect,
      roundComplete,
      roundWinner,
      matchComplete,
      matchWinner
    };
  }

  /**
   * Generate a math problem based on difficulty and round number
   */
  private generateMathProblem(difficulty: string, roundNumber: number): MathProblem {
    const operations = ['addition', 'subtraction', 'multiplication', 'division'] as const;
    let operation: typeof operations[number];
    let maxNumber = 10;
    let timeLimit = 15000; // 15 seconds default
    let points = 10;

    // Difficulty progression
    if (difficulty === 'mixed') {
      // Scale difficulty with round number
      if (roundNumber <= 2) {
        operation = 'addition';
        maxNumber = 20;
        timeLimit = 15000;
      } else if (roundNumber <= 4) {
        operation = Math.random() < 0.5 ? 'addition' : 'subtraction';
        maxNumber = 50;
        timeLimit = 12000;
      } else if (roundNumber <= 6) {
        operation = operations[Math.floor(Math.random() * 3)]; // Exclude division
        maxNumber = 20;
        timeLimit = 10000;
      } else {
        operation = operations[Math.floor(Math.random() * operations.length)];
        maxNumber = 25;
        timeLimit = 8000;
        points = 15; // Higher stakes later!
      }
    } else {
      // Fixed difficulty
      switch (difficulty) {
        case 'easy':
          operation = Math.random() < 0.7 ? 'addition' : 'subtraction';
          maxNumber = 20;
          timeLimit = 20000;
          break;
        case 'medium':
          operation = operations[Math.floor(Math.random() * 3)];
          maxNumber = 50;
          timeLimit = 12000;
          points = 12;
          break;
        case 'hard':
          operation = operations[Math.floor(Math.random() * operations.length)];
          maxNumber = 100;
          timeLimit = 8000;
          points = 20;
          break;
      }
    }

    let a: number, b: number, answer: number, question: string;

    switch (operation) {
      case 'addition':
        a = Math.floor(Math.random() * maxNumber) + 1;
        b = Math.floor(Math.random() * maxNumber) + 1;
        answer = a + b;
        question = `${a} + ${b} = ?`;
        break;
      
      case 'subtraction':
        a = Math.floor(Math.random() * maxNumber) + Math.floor(maxNumber/2);
        b = Math.floor(Math.random() * Math.floor(maxNumber/2)) + 1;
        answer = a - b;
        question = `${a} - ${b} = ?`;
        break;
      
      case 'multiplication':
        a = Math.floor(Math.random() * Math.min(maxNumber/2, 12)) + 1;
        b = Math.floor(Math.random() * Math.min(maxNumber/2, 12)) + 1;
        answer = a * b;
        question = `${a} × ${b} = ?`;
        break;
      
      case 'division':
        // Generate division that results in whole numbers
        b = Math.floor(Math.random() * 12) + 1;
        answer = Math.floor(Math.random() * 20) + 1;
        a = b * answer;
        question = `${a} ÷ ${b} = ?`;
        break;
    }

    return {
      id: crypto.randomBytes(8).toString('hex'),
      question,
      answer,
      operation,
      difficulty: difficulty as any,
      timeLimit,
      points
    };
  }

  /**
   * Get match state
   */
  getMatchState(matchId: string): MathDuelGameState | null {
    return this.activeMatches.get(matchId) || null;
  }

  /**
   * Clean up completed match
   */
  cleanupMatch(matchId: string): void {
    this.activeMatches.delete(matchId);
    console.log(`🧹 Cleaned up math duel match ${matchId}`);
  }

  /**
   * Validate math duel game result
   */
  async validateResult(result: GameResult): Promise<ValidationResult> {
    try {
      const gameState = result.gameData as MathDuelGameState;
      const matchResult = this.validateMathDuelResult(result.matchId, gameState.player1, gameState.player2, gameState);

      return {
        isValid: matchResult.isValid,
        winner: matchResult.winner,
        reason: matchResult.isValid ? undefined : 'Invalid math duel game state'
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
   * Validate math duel result
   */
  validateMathDuelResult(matchId: string, player1: string, player2: string, gameState: MathDuelGameState): MathDuelMatchResult {
    const result: MathDuelMatchResult = {
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

      // 4. Validate math answers
      if (!this.isValidMathAnswers(gameState.rounds)) {
        throw new Error('Invalid math answers');
      }

      // 5. Validate end condition
      if (!this.isValidEndCondition(gameState)) {
        throw new Error('Invalid end condition');
      }

      result.winner = gameState.matchWinner;
      result.isValid = true;

      return result;

    } catch (error) {
      console.error(`Math Duel validation error for match ${matchId}:`, error.message);
      return result;
    }
  }

  private isValidGameState(gameState: MathDuelGameState): boolean {
    if (!gameState || !Array.isArray(gameState.rounds)) return false;
    if (gameState.rounds.length === 0) return false;
    if (gameState.currentRound < 1) return false;
    return true;
  }

  private isValidRoundSequence(rounds: MathQuizRound[]): boolean {
    for (let i = 0; i < rounds.length; i++) {
      if (rounds[i].roundNumber !== i + 1) return false;
      if (!rounds[i].problem || !rounds[i].problem.question) return false;
    }
    return true;
  }

  private isValidScoring(gameState: MathDuelGameState): boolean {
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

  private isValidMathAnswers(rounds: MathQuizRound[]): boolean {
    for (const round of rounds) {
      if (!round.roundComplete) continue;
      
      const p1Move = round.player1Move;
      const p2Move = round.player2Move;
      
      if (!p1Move || !p2Move) return false;
      
      // Validate that correctness is properly marked
      const p1Correct = p1Move.answer === round.problem.answer;
      const p2Correct = p2Move.answer === round.problem.answer;
      
      if (p1Move.isCorrect !== p1Correct || p2Move.isCorrect !== p2Correct) {
        return false;
      }
    }
    return true;
  }

  private isValidEndCondition(gameState: MathDuelGameState): boolean {
    if (!gameState.matchComplete) return false;
    
    const maxScore = Math.max(gameState.player1Score, gameState.player2Score);
    return maxScore >= gameState.requiredWins;
  }
} 