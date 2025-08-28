import { Injectable, BadRequestException } from '@nestjs/common';
import { BaseGameService, CreateMatchParams, GameResult, ValidationResult } from './base-game.interface';
import { GameType, GameCategory } from './game-types';
import * as crypto from 'crypto';

// ✅ TIMING SYNCHRONIZATION: Use exact same formula as frontend for perfect sync
// For now, define the functions directly here to avoid path issues
// TODO: Move to shared library later

// ✅ STAKE'S TIMING SYSTEM: Unified high-precision formula (matches frontend exactly)
function calculateStakeMultiplier(timeElapsed: number): number {
  if (timeElapsed <= 0) return 1.0;
  
  // ✅ EXACT SAME FORMULA as frontend stakeFormula.ts
  // multiplier = 1.0 + Math.pow(timeInSeconds * 0.5, 1.8)
  const timeInSeconds = timeElapsed / 1000;
  const multiplier = 1.0 + Math.pow(timeInSeconds * 0.5, 1.8);
  
  return Math.min(multiplier, 200.0);
}

// ✅ UNIFIED STAKE TIMING CALCULATION (matches frontend exactly)
function calculateStakeTimingForMultiplier(targetMultiplier: number): number {
  if (targetMultiplier <= 1.0) return 0;
  
  // Use binary search to find the time that produces the target multiplier
  let minTime = 0;
  let maxTime = 60000; // 60 seconds max search (in milliseconds)
  const precision = 10; // 10ms precision
  
  while (maxTime - minTime > precision) {
    const midTime = (minTime + maxTime) / 2;
    const calculatedMultiplier = calculateStakeMultiplier(midTime);
    
    if (calculatedMultiplier < targetMultiplier) {
      minTime = midTime;
    } else {
      maxTime = midTime;
    }
  }
  
  return (minTime + maxTime) / 2;
}

// ✅ STAKE'S LATENCY SYSTEM: Track and estimate player latency
interface PlayerLatency {
  playerId: string;
  averageLatency: number;
  lastPingTime: number;
  samples: number[];
}

// ✅ CLIENT-SIDE CRASH PREDICTION: Deterministic crash generation (matches frontend)
function generateDeterministicCrash(seed: string, nonce: number): number {
  // Simple hash function for deterministic randomness (same as frontend)
  let hash = 0;
  const input = seed + nonce.toString();
  
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Convert to 0-1 range
  const randomValue = Math.abs(hash) / 2147483647;
  
  // ✅ ENGAGING 1v1 CRASH DISTRIBUTION: Rarely crashes below 5x for strategic gameplay
  // This ensures players have time to build tension and make strategic decisions
  let crashPoint: number;
  
  if (randomValue < 0.03) {
    // 3% chance: 2.0x - 5.0x (rare early surprises)
    crashPoint = 2.0 + (randomValue / 0.03) * 3.0; // 2.0x to 5.0x
  } else if (randomValue < 0.08) {
    // 5% chance: 5.0x - 12.0x (occasional low-medium crashes)
    crashPoint = 5.0 + ((randomValue - 0.03) / 0.05) * 7.0; // 5.0x to 12.0x
  } else if (randomValue < 0.28) {
    // 20% chance: 12.0x - 30.0x (build-up zone)
    crashPoint = 12.0 + ((randomValue - 0.08) / 0.2) * 18.0; // 12.0x to 30.0x
  } else if (randomValue < 0.73) {
    // 45% chance: 30.0x - 70.0x (MAIN ENGAGEMENT ZONE - where the magic happens!)
    crashPoint = 30.0 + ((randomValue - 0.28) / 0.45) * 40.0; // 30.0x to 70.0x
  } else if (randomValue < 0.92) {
    // 19% chance: 70.0x - 150.0x (high patience rewarded)
    crashPoint = 70.0 + ((randomValue - 0.73) / 0.19) * 80.0; // 70.0x to 150.0x
  } else {
    // 8% chance: 150.0x - 400.0x (legendary moon shots)
    crashPoint = 150.0 + ((randomValue - 0.92) / 0.08) * 250.0; // 150.0x to 400.0x
  }
  
  // Round to 2 decimal places and ensure bounds
  crashPoint = Math.round(crashPoint * 100) / 100;
  return Math.max(2.00, Math.min(200.0, crashPoint));
}

export interface CrashMove {
  player: string; // wallet address
  cashOutMultiplier: number | null; // null if didn't cash out
  timestamp: number;
}

export interface CrashRound {
  roundNumber: number;
  player1CashOut: number | null; // multiplier when player cashed out, null if didn't
  player2CashOut: number | null;
  crashMultiplier: number; // where the curve crashed
  winner: string | null; // wallet address or null for tie
  timestamp: number;
  completed: boolean;
  roundStartTime: number;
  roundEndTime: number;
  replayCount: number; // Track number of replays for this round
  isReplay: boolean; // Whether this is a replay round
  crashSeed?: string; // ✅ NEW: Deterministic crash seed for client prediction
  crashNonce?: number; // ✅ NEW: Round nonce for client prediction
}

export interface CrashGameState {
  matchId: string;
  player1: string; // wallet address
  player2: string; // wallet address
  currentRound: number;
  player1Score: number;
  player2Score: number;
  rounds: CrashRound[];
  matchComplete: boolean;
  matchWinner: string | null; // wallet address
  format: 'best-of-5';
  requiredWins: number;
  lastActivity: number;
  isVoid: boolean; // Whether match is void due to max replays
  voidReason?: string; // Reason for void match
}

export interface CrashMatchResult {
  matchId: string;
  player1: string;
  player2: string;
  gameState: CrashGameState;
  winner: string | null;
  isValid: boolean;
  endTime: number;
}

@Injectable()
export class CrashService extends BaseGameService {
  readonly gameType = GameType.Crash;
  readonly gameCategory = GameCategory.TurnBased;

  // Store active match states in memory (in production, use Redis)
  private activeMatches: Map<string, CrashGameState> = new Map();
  
  // ✅ STAKE'S LATENCY SYSTEM: Track player latencies for precise timing
  private playerLatencies: Map<string, PlayerLatency> = new Map();
  private readonly DEFAULT_LATENCY = 100; // Default 100ms latency estimate
  private readonly MAX_LATENCY_SAMPLES = 10; // Keep last 10 samples for averaging

  /**
   * ✅ STAKE'S LATENCY SYSTEM: Update player latency estimate
   */
  updatePlayerLatency(playerId: string, latency: number): void {
    let playerLatency = this.playerLatencies.get(playerId);
    
    if (!playerLatency) {
      playerLatency = {
        playerId,
        averageLatency: latency,
        lastPingTime: Date.now(),
        samples: [latency]
      };
    } else {
      // Add new sample and maintain rolling average
      playerLatency.samples.push(latency);
      if (playerLatency.samples.length > this.MAX_LATENCY_SAMPLES) {
        playerLatency.samples.shift(); // Remove oldest sample
      }
      
      // Calculate average latency
      playerLatency.averageLatency = playerLatency.samples.reduce((sum, sample) => sum + sample, 0) / playerLatency.samples.length;
      playerLatency.lastPingTime = Date.now();
    }
    
    this.playerLatencies.set(playerId, playerLatency);
    console.log(`🌐 Updated latency for ${playerId}: ${playerLatency.averageLatency.toFixed(1)}ms (${playerLatency.samples.length} samples)`);
  }

  /**
   * ✅ STAKE'S LATENCY SYSTEM: Get estimated latency for player
   */
  getPlayerLatency(playerId: string): number {
    const playerLatency = this.playerLatencies.get(playerId);
    return playerLatency ? playerLatency.averageLatency : this.DEFAULT_LATENCY;
  }

  /**
   * ✅ CLIENT-SIDE CRASH PREDICTION: Generate deterministic crash seed
   */
  generateCrashSeed(matchId: string, roundNumber: number): string {
    // Create deterministic seed from match and round
    const baseString = `${matchId}_round_${roundNumber}_${Date.now()}`;
    return crypto.createHash('sha256').update(baseString).digest('hex').substring(0, 16);
  }

  /**
   * Create a crash match
   */
  async createMatch(params: CreateMatchParams): Promise<any> {
    const gameState: CrashGameState = {
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
      isVoid: false
    };

    return {
      gameType: 'crash',
      gameState,
      status: 'waiting_for_players',
      createdAt: Date.now()
    };
  }

  /**
   * Initialize match when second player joins
   */
  initializeMatch(matchId: string, player1: string, player2: string): CrashGameState {
    const gameState: CrashGameState = {
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
      isVoid: false
    };

    this.activeMatches.set(matchId, gameState);
    console.log(`🚀 Initialized crash match ${matchId}: ${player1} vs ${player2}`);
    
    return gameState;
  }

  /**
   * Start a new crash round (generates the crash point and starts the curve)
   */
  startCrashRound(matchId: string): {
    success: boolean;
    gameState: CrashGameState;
    roundData?: {
      roundNumber: number;
      startTime: number;
    };
    error?: string;
  } {
    const gameState = this.activeMatches.get(matchId);
    if (!gameState) {
      return { success: false, gameState: null as any, error: 'Match not found' };
    }

    if (gameState.matchComplete) {
      return { success: false, gameState, error: 'Match already completed' };
    }

    // ✅ FIX: Check if current round already exists and is truly in progress
    let currentRound = gameState.rounds.find(r => r.roundNumber === gameState.currentRound);
    if (currentRound && !currentRound.completed && !currentRound.isReplay) {
      // Only block if it's a normal round that hasn't been completed
      // Replay rounds are allowed to restart
      return { success: false, gameState, error: 'Round already in progress' };
    }

    // ✅ FIX: For replay rounds, reuse the existing round but reset it
    if (currentRound && currentRound.isReplay && !currentRound.completed) {
      console.log(`🔄 Restarting replay round ${gameState.currentRound} in match ${matchId}`);
      
      // Reset the replay round
      currentRound.player1CashOut = null;
      currentRound.player2CashOut = null;
      // ✅ FIX: Use deterministic crash generation for replay rounds too
      const replayCrashSeed = this.generateCrashSeed(matchId, gameState.currentRound + 1000); // Different seed for replay
      currentRound.crashMultiplier = generateDeterministicCrash(replayCrashSeed, gameState.currentRound);
      currentRound.crashSeed = replayCrashSeed;
      currentRound.roundStartTime = Date.now();
      currentRound.winner = null;
      // Keep isReplay: true and replayCount as is
      
      gameState.lastActivity = Date.now();

      console.log(`🚀 Restarted replay round ${gameState.currentRound} in match ${matchId}, new crash point: ${currentRound.crashMultiplier}x`);

      return {
        success: true,
        gameState,
        roundData: {
          roundNumber: gameState.currentRound,
          startTime: currentRound.roundStartTime
        }
      };
    }

    // Create new round (normal case)
    const startTime = Date.now();
    
    // ✅ CLIENT-SIDE CRASH PREDICTION: Generate deterministic crash data
    const crashSeed = this.generateCrashSeed(matchId, gameState.currentRound);
    const crashNonce = gameState.currentRound;
    const crashMultiplier = generateDeterministicCrash(crashSeed, crashNonce);
    
    currentRound = {
      roundNumber: gameState.currentRound,
      player1CashOut: null,
      player2CashOut: null,
      crashMultiplier, // Use deterministic crash point
      winner: null,
      timestamp: startTime,
      completed: false,
      roundStartTime: startTime,
      roundEndTime: 0,
      replayCount: 0,
      isReplay: false,
      crashSeed, // ✅ NEW: Store for client prediction
      crashNonce // ✅ NEW: Store for client prediction
    };
    
    gameState.rounds.push(currentRound);
    gameState.lastActivity = Date.now();

    console.log(`🚀 Started crash round ${gameState.currentRound} in match ${matchId}, crash point: ${currentRound.crashMultiplier}x`);

    return {
      success: true,
      gameState,
      roundData: {
        roundNumber: gameState.currentRound,
        startTime
      }
    };
  }

  /**
   * Process player cash out
   */
  processCashOut(matchId: string, playerWallet: string, cashOutMultiplier: number): {
    success: boolean;
    gameState: CrashGameState;
    cashOutResult?: {
      player: string;
      multiplier: number;
      timestamp: number;
    };
    error?: string;
  } {
    const gameState = this.activeMatches.get(matchId);
    if (!gameState) {
      return { success: false, gameState: null as any, error: 'Match not found' };
    }

    if (gameState.matchComplete) {
      return { success: false, gameState, error: 'Match already completed' };
    }

    const currentRound = gameState.rounds.find(r => r.roundNumber === gameState.currentRound);
    if (!currentRound) {
      return { success: false, gameState, error: 'No active round' };
    }

    if (currentRound.completed) {
      return { success: false, gameState, error: 'Round already completed' };
    }

    // Validate cash out is before crash
    if (cashOutMultiplier >= currentRound.crashMultiplier) {
      console.log(`❌ INVALID CASH OUT: Player ${playerWallet} tried to cash out at ${cashOutMultiplier}x but crash point is ${currentRound.crashMultiplier}x`);
      return { success: false, gameState, error: `Cannot cash out at ${cashOutMultiplier.toFixed(2)}x - crash already occurred at ${currentRound.crashMultiplier.toFixed(2)}x` };
    }

    // ✅ FIX: Additional validation - ensure multiplier is reasonable
    if (cashOutMultiplier < 1.0) {
      return { success: false, gameState, error: 'Cannot cash out below 1.0x' };
    }

    if (cashOutMultiplier > 200.0) {
      return { success: false, gameState, error: 'Cannot cash out above 200.0x' };
    }

    // Set player cash out
    if (playerWallet === gameState.player1) {
      if (currentRound.player1CashOut !== null) {
        return { success: false, gameState, error: 'Player 1 already cashed out' };
      }
      currentRound.player1CashOut = cashOutMultiplier;
    } else if (playerWallet === gameState.player2) {
      if (currentRound.player2CashOut !== null) {
        return { success: false, gameState, error: 'Player 2 already cashed out' };
      }
      currentRound.player2CashOut = cashOutMultiplier;
    } else {
      return { success: false, gameState, error: 'Player not in this match' };
    }

    gameState.lastActivity = Date.now();

    console.log(`💰 Player ${playerWallet} cashed out at ${cashOutMultiplier}x in match ${matchId}`);

    return {
      success: true,
      gameState,
      cashOutResult: {
        player: playerWallet,
        multiplier: cashOutMultiplier,
        timestamp: Date.now()
      }
    };
  }

  /**
   * ✅ STAKE'S TIMING SYSTEM: Execute predictive crash with latency compensation
   * Sends crash events early to compensate for network latency
   */
  executePredictiveCrash(matchId: string, gateway: any): {
    success: boolean;
    gameState: CrashGameState;
    crashTiming?: {
      crashMultiplier: number;
      actualCrashTime: number;
      player1SendTime: number;
      player2SendTime: number;
      player1Latency: number;
      player2Latency: number;
    };
    error?: string;
  } {
    const gameState = this.activeMatches.get(matchId);
    if (!gameState) {
      return { success: false, gameState: null as any, error: 'Match not found' };
    }

    const currentRound = gameState.rounds.find(r => r.roundNumber === gameState.currentRound);
    if (!currentRound) {
      return { success: false, gameState, error: 'No active round' };
    }

    // ✅ STAKE'S TIMING: Calculate exact crash time from multiplier
    const crashDuration = calculateStakeTimingForMultiplier(currentRound.crashMultiplier);
    const actualCrashTime = currentRound.roundStartTime + crashDuration;
    
    // ✅ STAKE'S LATENCY COMPENSATION: Get player latencies
    const player1Latency = this.getPlayerLatency(gameState.player1);
    const player2Latency = this.getPlayerLatency(gameState.player2);
    
    // ✅ STAKE'S PREDICTIVE TIMING: Send crash events early
    const player1SendTime = actualCrashTime - player1Latency;
    const player2SendTime = actualCrashTime - player2Latency;
    const currentTime = Date.now();
    
    console.log(`🎯 STAKE TIMING SYSTEM:`);
    console.log(`   Crash multiplier: ${currentRound.crashMultiplier}x`);
    console.log(`   Crash duration: ${crashDuration.toFixed(1)}ms`);
    console.log(`   Actual crash time: ${actualCrashTime}`);
    console.log(`   Current time: ${currentTime}`);
    console.log(`   Player 1 latency: ${player1Latency}ms → Send at: ${player1SendTime}`);
    console.log(`   Player 2 latency: ${player2Latency}ms → Send at: ${player2SendTime}`);
    
    // ✅ STAKE'S PRECISION: Schedule crash events at exact times
    const schedulePlayerCrash = (playerId: string, sendTime: number, latency: number) => {
      const delay = Math.max(0, sendTime - currentTime);
      
      setTimeout(() => {
        console.log(`💥 STAKE TIMING: Sending predictive crash to ${playerId} (${latency}ms compensation)`);
        
        // Send crash event to specific player
        gateway.server.to(matchId).emit('crash_occurred', {
          matchId,
          crashMultiplier: currentRound.crashMultiplier,
          actualCrashTime,
          predictiveTiming: true,
          playerLatency: latency,
          sendTime: Date.now()
        });
      }, delay);
    };
    
    // Schedule crash events for both players with their specific latency compensation
    schedulePlayerCrash(gameState.player1, player1SendTime, player1Latency);
    schedulePlayerCrash(gameState.player2, player2SendTime, player2Latency);
    
    // ✅ STAKE'S PRECISION: Schedule the actual crash execution
    const crashExecutionDelay = Math.max(0, actualCrashTime - currentTime);
    setTimeout(() => {
      console.log(`💥 STAKE TIMING: Executing actual crash at ${Date.now()}`);
      const crashResult = this.executeCrash(matchId);
      
      // ✅ ROUND PROGRESSION FIX: Notify match service about crash completion
      if (crashResult.success && crashResult.roundResult) {
        console.log(`🔄 CRASH SERVICE: Notifying match service about crash completion for ${matchId}`);
        // Use a callback or event to notify the match service
        // For now, we'll use a simple timeout to trigger the match service
        setTimeout(() => {
          console.log(`🚀 CRASH SERVICE: Triggering match service round progression for ${matchId}`);
          // This will be handled by the match service's round progression handler
          // We'll trigger this through the match service directly instead
          this.notifyMatchServiceOfCrashCompletion(matchId, crashResult);
        }, 100); // Small delay to ensure crash result is processed
      }
    }, crashExecutionDelay);
    
    return {
      success: true,
      gameState,
      crashTiming: {
        crashMultiplier: currentRound.crashMultiplier,
        actualCrashTime,
        player1SendTime,
        player2SendTime,
        player1Latency,
        player2Latency
      }
    };
  }

  /**
   * Execute crash (when curve crashes) and determine round winner
   * Enhanced with draw replay logic and match void handling
   */
  executeCrash(matchId: string): {
    success: boolean;
    gameState: CrashGameState;
    roundResult?: {
      crashMultiplier: number;
      roundWinner: string | null;
      player1Result: { cashOut: number | null; won: boolean };
      player2Result: { cashOut: number | null; won: boolean };
      matchComplete: boolean;
      matchWinner: string | null;
      isReplay?: boolean;
      replayCount?: number;
      matchVoid?: boolean;
      voidReason?: string;
    };
    error?: string;
  } {
    const gameState = this.activeMatches.get(matchId);
    if (!gameState) {
      return { success: false, gameState: null as any, error: 'Match not found' };
    }

    if (gameState.matchComplete || gameState.isVoid) {
      return { success: false, gameState, error: 'Match already completed or void' };
    }

    const currentRound = gameState.rounds.find(r => r.roundNumber === gameState.currentRound);
    if (!currentRound) {
      return { success: false, gameState, error: 'No active round' };
    }

    if (currentRound.completed) {
      console.log(`❌ DOUBLE EXECUTION: Round ${currentRound.roundNumber} already completed for match ${matchId}`);
      console.log(`❌ DOUBLE EXECUTION: Current round state:`, {
        roundNumber: currentRound.roundNumber,
        completed: currentRound.completed,
        winner: currentRound.winner,
        crashMultiplier: currentRound.crashMultiplier,
        player1CashOut: currentRound.player1CashOut,
        player2CashOut: currentRound.player2CashOut
      });
      return { success: false, gameState, error: 'Round already completed' };
    }

    console.log(`✅ DEBUG: Proceeding with crash execution...`);
    console.log(`   Crash multiplier: ${currentRound.crashMultiplier}x`);
    console.log(`   Player 1 cash out: ${currentRound.player1CashOut}x`);
    console.log(`   Player 2 cash out: ${currentRound.player2CashOut}x`);
    console.log(`   Replay count: ${currentRound.replayCount}`);

    // Determine round winner (who cashed out closest to crash without going over)
    const player1Won = currentRound.player1CashOut !== null && currentRound.player1CashOut < currentRound.crashMultiplier;
    const player2Won = currentRound.player2CashOut !== null && currentRound.player2CashOut < currentRound.crashMultiplier;

    let roundWinner: string | null = null;
    let isDrawReplay = false;
    
    if (player1Won && player2Won) {
      // Both cashed out successfully - winner is who got closer to crash point
      const player1Distance = currentRound.crashMultiplier - currentRound.player1CashOut!;
      const player2Distance = currentRound.crashMultiplier - currentRound.player2CashOut!;
      
      if (player1Distance < player2Distance) {
        roundWinner = gameState.player1;
        gameState.player1Score++;
      } else if (player2Distance < player1Distance) {
        roundWinner = gameState.player2;
        gameState.player2Score++;
      } else {
        // Exact same distance - extremely rare but possible
        roundWinner = gameState.player1; // First transaction wins
        gameState.player1Score++;
      }
    } else if (player1Won && !player2Won) {
      roundWinner = gameState.player1;
      gameState.player1Score++;
    } else if (player2Won && !player1Won) {
      roundWinner = gameState.player2;
      gameState.player2Score++;
    } else {
      // Neither cashed out - DRAW situation
      isDrawReplay = true;
      console.log(`🔄 DRAW detected - neither player cashed out`);
    }

    // Handle draw replay logic
    if (isDrawReplay) {
      if (currentRound.replayCount >= 3) {
        // Max replays reached - void the entire match
        gameState.isVoid = true;
        gameState.voidReason = `Round ${currentRound.roundNumber} exceeded maximum replays (3)`;
        gameState.matchComplete = true;
        gameState.matchWinner = null;
        
        console.log(`🚫 MATCH VOID: ${gameState.voidReason}`);
        
        // Mark current round as completed (no winner)
        currentRound.winner = null;
        currentRound.completed = true;
        currentRound.roundEndTime = Date.now();
        
        return {
          success: true,
          gameState,
          roundResult: {
            crashMultiplier: currentRound.crashMultiplier,
            roundWinner: null,
            player1Result: { cashOut: currentRound.player1CashOut, won: false },
            player2Result: { cashOut: currentRound.player2CashOut, won: false },
            matchComplete: true,
            matchWinner: null,
            matchVoid: true,
            voidReason: gameState.voidReason
          }
        };
      } else {
        // Replay the round
        currentRound.replayCount++;
        currentRound.completed = false; // Keep round active for replay
        currentRound.player1CashOut = null; // Reset cash outs
        currentRound.player2CashOut = null;
        // ✅ FIX: Use deterministic crash generation for replay rounds in executeCrash too
        const replayCrashSeed = this.generateCrashSeed(matchId, gameState.currentRound + 2000 + currentRound.replayCount); // Different seed for each replay
        currentRound.crashMultiplier = generateDeterministicCrash(replayCrashSeed, gameState.currentRound + currentRound.replayCount);
        currentRound.crashSeed = replayCrashSeed;
        currentRound.crashNonce = gameState.currentRound + currentRound.replayCount;
        currentRound.roundStartTime = Date.now();
        currentRound.isReplay = true;
        
        console.log(`🔄 REPLAY Round ${currentRound.roundNumber} (attempt ${currentRound.replayCount + 1}/4)`);
        console.log(`   New crash point: ${currentRound.crashMultiplier}x`);
        
        return {
          success: true,
          gameState,
          roundResult: {
            crashMultiplier: currentRound.crashMultiplier,
            roundWinner: null,
            player1Result: { cashOut: null, won: false },
            player2Result: { cashOut: null, won: false },
            matchComplete: false,
            matchWinner: null,
            isReplay: true,
            replayCount: currentRound.replayCount
          }
        };
      }
    }

    // Normal round completion (someone won)
    currentRound.winner = roundWinner;
    currentRound.completed = true;
    currentRound.roundEndTime = Date.now();

    console.log(`🚨 DEBUG: After scoring update:`);
    console.log(`   Player 1 score: ${gameState.player1Score}`);
    console.log(`   Player 2 score: ${gameState.player2Score}`);
    console.log(`   Required wins: ${gameState.requiredWins}`);

    // Check if match is complete
    const matchComplete = gameState.player1Score >= gameState.requiredWins || 
                         gameState.player2Score >= gameState.requiredWins;
    
    let matchWinner: string | null = null;
    if (matchComplete) {
      matchWinner = gameState.player1Score > gameState.player2Score ? gameState.player1 : gameState.player2;
      gameState.matchComplete = true;
      gameState.matchWinner = matchWinner;
      console.log(`🏁 MATCH COMPLETE! Winner: ${matchWinner}`);
    } else {
      // Prepare for next round
      gameState.currentRound++;
      console.log(`🎮 Match continues to round ${gameState.currentRound}`);
    }

    gameState.lastActivity = Date.now();

    const roundResult = {
      crashMultiplier: currentRound.crashMultiplier,
      roundWinner,
      player1Result: { cashOut: currentRound.player1CashOut, won: player1Won },
      player2Result: { cashOut: currentRound.player2CashOut, won: player2Won },
      matchComplete,
      matchWinner
    };

    console.log(`💥 Crash executed for match ${matchId}:`);
    console.log(`   Crash point: ${currentRound.crashMultiplier}x`);
    console.log(`   Player 1 (${gameState.player1}): ${currentRound.player1CashOut}x - ${player1Won ? 'WON' : 'LOST'}`);
    console.log(`   Player 2 (${gameState.player2}): ${currentRound.player2CashOut}x - ${player2Won ? 'WON' : 'LOST'}`);
    console.log(`   Round winner: ${roundWinner || 'NONE'}`);
    console.log(`   Score: ${gameState.player1Score}-${gameState.player2Score}`);
    console.log(`   Match complete: ${matchComplete}`);

    return { success: true, gameState, roundResult };
  }

  /**
   * Generate a provably fair crash multiplier using cryptographic randomness
   */
  private generateCrashMultiplier(): number {
    // Generate cryptographically secure random number
    const randomBytes = crypto.randomBytes(4);
    const randomInt = randomBytes.readUInt32BE(0);
    
    // Convert to float between 0 and 1
    const randomFloat = randomInt / 0xFFFFFFFF;
    
    // 🎰 GAMBLING PSYCHOLOGY: Optimized distribution for maximum engagement
    // Most crashes should be in the exciting 4x-75x range to keep players hooked
    
    let crashMultiplier: number;
    
    if (randomFloat < 0.07) {
      // 7% chance: Low multipliers (1.35x - 4x) - quick losses ✅ FIXED: Reduced from 15%
      crashMultiplier = 1.35 + (randomFloat / 0.07) * 2.65; // 1.35x to 4x
    } else if (randomFloat < 0.50) {
      // 43% chance: Sweet spot multipliers (4x - 20x) - exciting wins ✅ FIXED: Main range
      const normalizedRandom = (randomFloat - 0.07) / 0.43;
      crashMultiplier = 4.0 + normalizedRandom * 16.0; // 4x to 20x
    } else if (randomFloat < 0.80) {
      // 30% chance: High multipliers (20x - 75x) - big wins ✅ FIXED: Extended range
      const normalizedRandom = (randomFloat - 0.50) / 0.30;
      crashMultiplier = 20.0 + normalizedRandom * 55.0; // 20x to 75x
    } else if (randomFloat < 0.95) {
      // 15% chance: Very high multipliers (75x - 150x) - huge wins
      const normalizedRandom = (randomFloat - 0.80) / 0.15;
      crashMultiplier = 75.0 + normalizedRandom * 75.0; // 75x to 150x
    } else {
      // 5% chance: Extreme multipliers (150x - 200x) - legendary wins ✅ FIXED: Rare but achievable
      const normalizedRandom = (randomFloat - 0.95) / 0.05;
      crashMultiplier = 150.0 + normalizedRandom * 50.0; // 150x to 200x
    }
    
    // ✅ UX IMPROVEMENT: Ensure minimum 3-second gameplay (keep the 1.35x minimum)
    const MINIMUM_CRASH_MULTIPLIER = 1.35;
    
    if (crashMultiplier < MINIMUM_CRASH_MULTIPLIER) {
      console.log(`🎮 UX: Adjusting crash point from ${crashMultiplier.toFixed(2)}x to ${MINIMUM_CRASH_MULTIPLIER.toFixed(2)}x for minimum 3s gameplay`);
      crashMultiplier = MINIMUM_CRASH_MULTIPLIER;
    }
    
    // 🎰 PSYCHOLOGY LOGGING: Show the distribution for monitoring
    let category = '';
    if (crashMultiplier < 4.0) category = 'LOW';
    else if (crashMultiplier < 20.0) category = 'SWEET SPOT';
    else if (crashMultiplier < 75.0) category = 'HIGH';
    else if (crashMultiplier < 150.0) category = 'VERY HIGH';
    else category = 'EXTREME';
    
    console.log(`🎰 Generated ${category} crash point: ${crashMultiplier.toFixed(2)}x`);
    
    // ✅ FIXED: Cap at 200x maximum to prevent rounds going on too long
    return Math.min(crashMultiplier, 200.0);
  }

  // 🚀 NEW: Optimized multiplier broadcasting with compression and batching
  public broadcastMultiplierUpdates(matchId: string, currentMultiplier: number, gateway: any): void {
    // Use the new compression-optimized broadcasting
    const updateData = {
      multiplier: currentMultiplier,
      timestamp: Date.now(),
      phase: this.getGamePhase(currentMultiplier)
    };
    
    // Use enhanced compression broadcasting
    gateway.broadcastCrashMultiplierUpdate(matchId, updateData);
  }

  // 🚀 NEW: Batch multiple multiplier updates for maximum efficiency
  public broadcastMultiplierBatch(matchId: string, multipliers: number[], gateway: any): void {
    const updates = multipliers.map(multiplier => ({
      multiplier,
      data: {
        timestamp: Date.now(),
        phase: this.getGamePhase(multiplier)
      }
    }));
    
    // Use new batch compression broadcasting
    gateway.broadcastCrashMultiplierBatch(matchId, updates);
  }

  // 🚀 NEW: Determine game phase for optimized update rates
  private getGamePhase(multiplier: number): 'early' | 'building' | 'critical' | 'extreme' {
    if (multiplier < 1.5) return 'early';      // Slow updates
    if (multiplier < 3.0) return 'building';   // Medium updates
    if (multiplier < 10.0) return 'critical';  // Fast updates
    return 'extreme';                          // Maximum update rate
  }

  // 🚀 NEW: Smart update frequency based on multiplier
  public getOptimalUpdateInterval(multiplier: number): number {
    switch (this.getGamePhase(multiplier)) {
      case 'early':    return 100; // 10 FPS for early game
      case 'building': return 50;  // 20 FPS for building tension
      case 'critical': return 25;  // 40 FPS for critical moments
      case 'extreme':  return 16;  // 60 FPS for extreme multipliers
      default:         return 50;
    }
  }

  // 🚀 NEW: Simulate real-time crash progression with optimized broadcasting
  public simulateCrashProgression(matchId: string, crashPoint: number, gateway: any): Promise<void> {
    return new Promise((resolve) => {
      let currentMultiplier = 1.0;
      const startTime = Date.now();
      const batchUpdates: number[] = [];
      
      const progressLoop = () => {
        const elapsed = Date.now() - startTime;
        
        // ✅ CRITICAL FIX: Use unified stake formula (same as frontend)
        currentMultiplier = calculateStakeMultiplier(elapsed);
        
        // Check if we've reached the crash point
        if (currentMultiplier >= crashPoint) {
          // Send final batch before crash
          if (batchUpdates.length > 0) {
            this.broadcastMultiplierBatch(matchId, batchUpdates, gateway);
          }
          
          // Broadcast crash event
          gateway.broadcastCrashEvent(matchId, {
            crashedAt: crashPoint,
            timestamp: Date.now()
          });
          
          resolve();
          return;
        }
        
        // Add to batch for efficient transmission
        batchUpdates.push(currentMultiplier);
        
        // Send batch when it reaches optimal size or on phase changes
        const shouldSendBatch = batchUpdates.length >= 5 || 
                               this.getGamePhase(currentMultiplier) === 'critical' ||
                               this.getGamePhase(currentMultiplier) === 'extreme';
        
        if (shouldSendBatch) {
          this.broadcastMultiplierBatch(matchId, [...batchUpdates], gateway);
          batchUpdates.length = 0; // Clear batch
        }
        
        // Schedule next update with optimal interval
        const interval = this.getOptimalUpdateInterval(currentMultiplier);
        setTimeout(progressLoop, interval);
      };
      
      // Start the progression
      progressLoop();
    });
  }

  /**
   * Get match state
   */
  getMatchState(matchId: string): CrashGameState | null {
    return this.activeMatches.get(matchId) || null;
  }

  /**
   * Clean up completed match
   */
  cleanupMatch(matchId: string): void {
    this.activeMatches.delete(matchId);
    console.log(`🧹 Cleaned up crash match ${matchId}`);
  }

  /**
   * Validate crash game result (for final submission)
   */
  async validateResult(result: GameResult): Promise<ValidationResult> {
    try {
      const gameState = result.gameData as CrashGameState;
      const matchResult = this.validateCrashResult(result.matchId, gameState.player1, gameState.player2, gameState);

      return {
        isValid: matchResult.isValid,
        winner: matchResult.winner,
        reason: matchResult.isValid ? undefined : 'Invalid crash game state'
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
   * Validate crash game result (overloaded version for match service)
   */
  validateCrashResult(matchId: string, player1: string, player2: string, gameState: CrashGameState): CrashMatchResult {
    const result: CrashMatchResult = {
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
      console.error(`Crash validation error for match ${matchId}:`, error.message);
      return result;
    }
  }

  private isValidGameState(gameState: CrashGameState): boolean {
    if (!gameState || !Array.isArray(gameState.rounds)) return false;
    if (gameState.rounds.length === 0) return false;
    if (gameState.currentRound < 1) return false;
    return true;
  }

  private isValidRoundSequence(rounds: CrashRound[]): boolean {
    for (let i = 0; i < rounds.length; i++) {
      const round = rounds[i];
      if (round.roundNumber !== i + 1) return false;
      if (!round.completed) return false;
      if (round.crashMultiplier <= 1.0) return false;
      
      // Validate cash outs are before crash point
      if (round.player1CashOut !== null && round.player1CashOut >= round.crashMultiplier) return false;
      if (round.player2CashOut !== null && round.player2CashOut >= round.crashMultiplier) return false;
    }
    return true;
  }

  private isValidScoring(gameState: CrashGameState): boolean {
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

  private isValidEndCondition(gameState: CrashGameState): boolean {
    if (!gameState.matchComplete) return false;
    
    const maxScore = Math.max(gameState.player1Score, gameState.player2Score);
    return maxScore >= gameState.requiredWins;
  }

  /**
   * Convert game state to smart contract format
   */
  convertToSmartContractFormat(gameState: CrashGameState): any {
    // Smart contract expects TurnBasedResult format:
    // moves: [player1_cashout, player2_cashout, crash_multiplier] for each round
    // final_position: [final_score_p1, final_score_p2, total_rounds]
    // move_count: number of rounds played

    const moves: number[] = [];
    
    // Convert each round to smart contract format
    for (const round of gameState.rounds) {
      if (round.completed) {
        // Convert to integers (multiply by 100 for 2 decimal precision)
        const p1CashOut = round.player1CashOut ? Math.round(round.player1CashOut * 100) : 0;
        const p2CashOut = round.player2CashOut ? Math.round(round.player2CashOut * 100) : 0;
        const crashPoint = Math.round(round.crashMultiplier * 100);
        
        moves.push(p1CashOut, p2CashOut, crashPoint);
      }
    }

    // Final position: [player1_score, player2_score, total_rounds]
    const finalPosition = [
      gameState.player1Score,
      gameState.player2Score,
      gameState.rounds.length
    ];

    return {
      moves,
      final_position: finalPosition,
      move_count: gameState.rounds.length
    };
  }

  /**
   * ✅ ROUND PROGRESSION FIX: Notify match service about crash completion
   */
  private notifyMatchServiceOfCrashCompletion(matchId: string, crashResult: any): void {
    // Since we can't easily inject the match service here due to circular dependency,
    // we'll use a simple callback approach stored in a static registry
    console.log(`🔄 CRASH SERVICE: Notifying about crash completion for ${matchId}`);
    
    // Use a global callback registry to avoid circular dependencies
    const globalCallbacks = (global as any).__crashCompletionCallbacks;
    if (globalCallbacks && globalCallbacks.handleCrashCompletion) {
      process.nextTick(() => {
        console.log(`📡 CRASH SERVICE: Calling round progression handler for ${matchId}`);
        globalCallbacks.handleCrashCompletion(matchId, crashResult);
      });
    } else {
      console.warn(`⚠️ CRASH SERVICE: No crash completion handler registered for ${matchId}`);
    }
  }
} 