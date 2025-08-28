import { Injectable, Logger } from '@nestjs/common';
import { BaseGameService } from './base-game.interface';
import { GameType, GameCategory } from './game-types';
import { CreateMatchParams, GameResult, ValidationResult } from './base-game.interface';
import { RedisCacheService } from '../common/redis-cache.service';
import { AntiCheatService } from '../security/anti-cheat/anti-cheat.service';
import { MinesBatchingService } from './mines-batching.service';
import { MinesTileProtectionService } from './mines-tile-protection.service';
import { MinesSyncValidationService } from './mines-sync-validation.service';

// ✅ Mines Game State Interface
export interface MinesGameState {
  matchId: string;
  player1: string;
  player2: string;
  currentRound: number;
  requiredWins: number;
  player1Score: number;
  player2Score: number;
  matchComplete: boolean;
  winner: string | null;
  rounds: MinesRound[];
  createdAt: number;
  completedAt?: number;
}

export interface MinesRound {
  roundNumber: number;
  player1Turn: MinesPlayerTurn | null;
  player2Turn: MinesPlayerTurn | null;
  winner: string | null;
  completedAt?: number;
  mineGrid: MinesGrid; // Pre-generated mines for this round
  proofData: ProofData; // Provably fair verification data
}

export interface MinesPlayerTurn {
  playerId: string;
  grid: MinesGrid;
  revealedTiles: string[];
  finalMultiplier: number;
  hitMine: boolean;
  cashedOut: boolean;
  completedAt: number;
}

export interface MinesGrid {
  size: number; // Always 5x5 = 25 tiles
  mineCount: number; // Fixed at 5 mines
  mines: string[]; // Mine positions as "x,y" strings
  seed: string; // Deterministic seed for reproducibility
}

export interface MinesMatchResult {
  matchId: string;
  player1: string;
  player2: string;
  gameState: MinesGameState;
  winner: string | null;
  isValid: boolean;
  endTime: number;
}

export interface ProofData {
  clientSeed: string;
  serverSeed: string;
  hashedServerSeed: string;
  nonce: number;
  matchId: string;
  roundNumber: number;
}

export interface ProvablyFairResult {
  isValid: boolean;
  reconstructedMines: string[];
  providedMines: string[];
  proof: ProofData;
}

@Injectable()
export class MinesService extends BaseGameService {
  readonly gameType = GameType.Mines;
  readonly gameCategory = GameCategory.RealtimeHTML5;
  private readonly logger = new Logger(MinesService.name);
  
  // 🚀 REDIS MIGRATION: Replace in-memory Map with Redis storage
  // TTL: 30 minutes for active games (1800 seconds)
  private readonly GAME_STATE_TTL = 1800000; // 30 minutes in milliseconds
  
  constructor(
    private readonly redisCacheService: RedisCacheService,
    private readonly antiCheatService: AntiCheatService,
    private readonly minesBatchingService: MinesBatchingService,
    private readonly tileProtectionService: MinesTileProtectionService,
    private readonly syncValidationService: MinesSyncValidationService,
  ) {
    super();
    this.logger.log('🚀 REDIS: MinesService initialized with Redis storage');
    this.logger.log('🛡️ ANTI-CHEAT: Mines protection activated');
    this.logger.log('📊 BATCHING: Analytics batching enabled for performance');
    this.logger.log('🔐 TILE PROTECTION: Concurrent click protection enabled');
    this.logger.log('🔄 SYNC VALIDATION: Real-time state validation enabled');
  }

  /**
   * 🚀 REDIS: Get game state from Redis with fallback - internal method
   */
  private async getGameStateFromRedis(matchId: string): Promise<MinesGameState | null> {
    try {
      return await this.redisCacheService.get<MinesGameState>(`mines:match:${matchId}`);
    } catch (error) {
      this.logger.error(`❌ REDIS: Failed to get game state for ${matchId}:`, error);
      return null;
    }
  }

  /**
   * 🚀 REDIS: Save game state to Redis with TTL
   */
  private async setGameState(matchId: string, gameState: MinesGameState): Promise<void> {
    try {
      await this.redisCacheService.set(`mines:match:${matchId}`, gameState, this.GAME_STATE_TTL);
      this.logger.debug(`💾 REDIS: Saved game state for ${matchId} (TTL: 30min)`);
    } catch (error) {
      this.logger.error(`❌ REDIS: Failed to save game state for ${matchId}:`, error);
      // Note: In production, you might want to fallback to database storage here
    }
  }

  /**
   * 🚀 REDIS: Delete game state from Redis
   */
  private async deleteGameState(matchId: string): Promise<void> {
    try {
      await this.redisCacheService.delete(`mines:match:${matchId}`);
      this.logger.debug(`🗑️ REDIS: Deleted game state for ${matchId}`);
    } catch (error) {
      this.logger.error(`❌ REDIS: Failed to delete game state for ${matchId}:`, error);
    }
  }

  /**
   * Create a new mines match - called when first player creates match
   */
  async createMatch(params: CreateMatchParams): Promise<any> {
    // Return structured object like other games (crash, rps, chess)
    const gameState: MinesGameState = {
      matchId: '', // Will be set by match service
      player1: params.creatorWallet,
      player2: '', // Will be set when opponent joins
      currentRound: 1,
      requiredWins: 3, // First to 3 wins (best of 5)
      player1Score: 0,
      player2Score: 0,
      matchComplete: false,
      winner: null,
      rounds: [],
      createdAt: Date.now(),
    };

    return {
      gameType: 'mines',
      gameState,
      status: 'waiting_for_players',
      createdAt: Date.now()
    };
  }

  /**
   * Initialize match when second player joins - called by match service
   */
  async initializeMatch(matchId: string, player1: string, player2: string): Promise<MinesGameState> {
    const gameState: MinesGameState = {
      matchId,
      player1,
      player2,
      currentRound: 1,
      requiredWins: 3, // First to 3 wins (best of 5)
      player1Score: 0,
      player2Score: 0,
      matchComplete: false,
      winner: null,
      rounds: [],
      createdAt: Date.now(),
    };

    await this.setGameState(matchId, gameState);
    this.logger.log(`✅ Initialized mines match ${matchId}: ${player1} vs ${player2}`);
    
    return gameState;
  }

  /**
   * Start a new round in the mines match
   */
  async startRound(matchId: string): Promise<{ success: boolean; gameState?: MinesGameState; error?: string }> {
    const gameState = await this.getGameStateFromRedis(matchId);
    if (!gameState) {
      return { success: false, error: 'Match not found' };
    }

    if (gameState.matchComplete) {
      return { success: false, error: 'Match already completed' };
    }

    // Generate provably fair seeds and mine grid
    const proofData = this.generateProvablyFairSeeds(matchId, gameState.currentRound);
    const roundGrid = this.generateProvablyFairGrid(proofData);
    
    // Create new round with pre-generated mines and proof data
    const round: MinesRound = {
      roundNumber: gameState.currentRound,
      player1Turn: null,
      player2Turn: null,
      winner: null,
      mineGrid: roundGrid, // Store the mines for this round
      proofData: proofData, // Store proof data for verification
    };

    gameState.rounds.push(round);
    
    this.logger.log(`🎮 Started mines round ${gameState.currentRound} in match ${matchId}`);
    this.logger.log(`💣 Generated ${roundGrid.mines.length} mines at positions: ${roundGrid.mines.join(', ')}`);
    
    await this.setGameState(matchId, gameState);
    return { success: true, gameState };
  }

  /**
   * Process a player's turn (manual submission or auto-submit after mine hit)
   */
  async processPlayerTurn(
    matchId: string, 
    playerId: string, 
    revealedTiles: string[]
  ): Promise<{ success: boolean; gameState?: MinesGameState; error?: string }> {
    const gameState = await this.getGameStateFromRedis(matchId);
    if (!gameState) {
      return { success: false, error: 'Match not found' };
    }

    if (gameState.matchComplete) {
      return { success: false, error: 'Match is already complete' };
    }

    const currentRound = gameState.rounds[gameState.rounds.length - 1];
    if (!currentRound) {
      return { success: false, error: 'No active round found' };
    }

    // 🔧 FIX: Prevent duplicate turn processing for same player in same round
    const existingTurn = playerId === gameState.player1 ? currentRound.player1Turn : currentRound.player2Turn;
    if (existingTurn) {
      this.logger.warn(`⚠️ Player ${playerId} already submitted turn for round ${currentRound.roundNumber}`);
      return { success: true, gameState }; // Return success to avoid errors, but don't process again
    }

    if (!currentRound.mineGrid) {
      return { success: false, error: 'Round not properly initialized - no mine grid' };
    }

    // Use the round's pre-generated mine grid
    const grid = currentRound.mineGrid;

    // Calculate result using the round's mine positions
    const { multiplier, hitMine } = this.calculateTurnResult(grid, revealedTiles);
    
    const playerTurn: MinesPlayerTurn = {
      playerId,
      grid,
      revealedTiles: revealedTiles,
      finalMultiplier: multiplier,
      hitMine,
      cashedOut: !hitMine, // If didn't hit mine, they cashed out successfully
      completedAt: Date.now(),
    };

    // Store the turn
    if (playerId === gameState.player1) {
      currentRound.player1Turn = playerTurn;
    } else {
      currentRound.player2Turn = playerTurn;
    }

    this.logger.log(`💣 Player ${playerId} completed turn: ${multiplier.toFixed(2)}x (${hitMine ? 'HIT MINE' : 'SAFE'})`);
    this.logger.log(`🎯 Revealed tiles: [${revealedTiles.join(', ')}] vs Mine positions: [${grid.mines.join(', ')}]`);

    // 🔧 NEW LOGIC: Check if round should complete based on game state
    const shouldCompleteRound = this.shouldCompleteRound(currentRound, gameState);
    
    if (shouldCompleteRound) {
      this.logger.log(`🏁 Round ${currentRound.roundNumber} completing...`);
      this.completeRound(gameState, currentRound);
    } else {
      this.logger.log(`⏳ Round ${currentRound.roundNumber} continues - waiting for other player or timeout`);
    }

    await this.setGameState(matchId, gameState);
    return { success: true, gameState };
  }

  /**
   * 🔧 NEW: Determine if round should complete based on current game state
   */
  private shouldCompleteRound(currentRound: MinesRound, gameState: MinesGameState): boolean {
    const p1Turn = currentRound.player1Turn;
    const p2Turn = currentRound.player2Turn;

    // Case 1: Both players have submitted turns
    if (p1Turn && p2Turn) {
      this.logger.log(`✅ Both players completed turns - round should complete`);
      return true;
    }

    // Case 2: One player hit mine, other hasn't played yet
    // In this case, we should NOT complete the round immediately
    // Let the other player have a chance to also hit a mine (potential draw)
    if (p1Turn && p1Turn.hitMine && !p2Turn) {
      this.logger.log(`⏳ Player 1 hit mine, but Player 2 hasn't played yet - round continues`);
      return false;
    }

    if (p2Turn && p2Turn.hitMine && !p1Turn) {
      this.logger.log(`⏳ Player 2 hit mine, but Player 1 hasn't played yet - round continues`);
      return false;
    }

    // Case 3: One player cashed out safely, other hasn't played
    // This should also continue to let other player try
    if (p1Turn && !p1Turn.hitMine && !p2Turn) {
      this.logger.log(`⏳ Player 1 cashed out safely, Player 2 still playing - round continues`);
      return false;
    }

    if (p2Turn && !p2Turn.hitMine && !p1Turn) {
      this.logger.log(`⏳ Player 2 cashed out safely, Player 1 still playing - round continues`);
      return false;
    }

    // Default: round should not complete yet
    return false;
  }

  /**
   * 🔧 NEW: Force complete a round (used for timeouts or special cases)
   */
  async forceCompleteRound(matchId: string): Promise<{ success: boolean; gameState?: MinesGameState; error?: string }> {
    const gameState = await this.getGameStateFromRedis(matchId);
    if (!gameState) {
      return { success: false, error: 'Match not found' };
    }

    const currentRound = gameState.rounds[gameState.rounds.length - 1];
    if (!currentRound) {
      return { success: false, error: 'No active round found' };
    }

    // If only one player has played, auto-submit a default turn for the other
    if (currentRound.player1Turn && !currentRound.player2Turn) {
      this.logger.log(`⏰ Timeout: Auto-submitting empty turn for Player 2`);
      await this.processPlayerTurn(matchId, gameState.player2, []); // Empty turn = 0 multiplier
    } else if (currentRound.player2Turn && !currentRound.player1Turn) {
      this.logger.log(`⏰ Timeout: Auto-submitting empty turn for Player 1`);
      await this.processPlayerTurn(matchId, gameState.player1, []); // Empty turn = 0 multiplier
    }

    await this.setGameState(matchId, gameState);
    return { success: true, gameState };
  }

  /**
   * Complete a round and determine winner
   */
  private completeRound(gameState: MinesGameState, round: MinesRound): void {
    const p1Turn = round.player1Turn!;
    const p2Turn = round.player2Turn!;

    // Determine round winner
    let roundWinner: string | null = null;

    if (p1Turn.hitMine && p2Turn.hitMine) {
      // Both hit mines - no winner this round
      roundWinner = null;
    } else if (p1Turn.hitMine && !p2Turn.hitMine) {
      // Player 1 hit mine, Player 2 wins
      roundWinner = gameState.player2;
    } else if (!p1Turn.hitMine && p2Turn.hitMine) {
      // Player 2 hit mine, Player 1 wins
      roundWinner = gameState.player1;
    } else {
      // Both safe - higher multiplier wins
      if (p1Turn.finalMultiplier > p2Turn.finalMultiplier) {
        roundWinner = gameState.player1;
      } else if (p2Turn.finalMultiplier > p1Turn.finalMultiplier) {
        roundWinner = gameState.player2;
      } else {
        // Tie - no winner this round
        roundWinner = null;
      }
    }

    round.winner = roundWinner;
    round.completedAt = Date.now();

    // Update scores
    if (roundWinner === gameState.player1) {
      gameState.player1Score++;
    } else if (roundWinner === gameState.player2) {
      gameState.player2Score++;
    }

    this.logger.log(`🏆 Round ${round.roundNumber} complete: Winner = ${roundWinner || 'TIE'} (${gameState.player1Score}-${gameState.player2Score})`);

    // Check if match is complete
    if (gameState.player1Score >= gameState.requiredWins) {
      gameState.winner = gameState.player1;
      gameState.matchComplete = true;
      gameState.completedAt = Date.now();
      this.logger.log(`🎉 Match ${gameState.matchId} complete: ${gameState.player1} wins ${gameState.player1Score}-${gameState.player2Score}`);
    } else if (gameState.player2Score >= gameState.requiredWins) {
      gameState.winner = gameState.player2;
      gameState.matchComplete = true;
      gameState.completedAt = Date.now();
      this.logger.log(`🎉 Match ${gameState.matchId} complete: ${gameState.player2} wins ${gameState.player2Score}-${gameState.player1Score}`);
    } else {
      // Continue to next round
      gameState.currentRound++;
      this.logger.log(`➡️ Proceeding to round ${gameState.currentRound}`);
    }
  }

  /**
   * Generate deterministic 5x5 grid with 5 mines
   */
  private generateDeterministicGrid(matchId: string, roundNumber: number, playerId: string): MinesGrid {
    const seed = `${matchId}_${roundNumber}_${playerId}`;
    const minesSet = new Set<string>();
    
    // Use deterministic random based on seed (similar to crash game)
    let hash = this.hashSeed(seed);
    
    while (minesSet.size < 5) {
      const x = Math.floor((hash % 5000) / 1000); // 0-4
      const y = Math.floor((hash % 1000) / 200); // 0-4
      minesSet.add(`${x},${y}`);
      hash = this.hashSeed(hash.toString()); // Generate next hash
    }

    return {
      size: 5,
      mineCount: 5,
      mines: Array.from(minesSet),
      seed,
    };
  }

  /**
   * Calculate turn result based on revealed tiles
   */
  private calculateTurnResult(grid: MinesGrid, revealedTiles: string[]): { multiplier: number; hitMine: boolean } {
    // Check if any revealed tile is a mine
    for (const tile of revealedTiles) {
      if (grid.mines.includes(tile)) {
        return { multiplier: 0, hitMine: true };
      }
    }

    // Calculate multiplier based on revealed safe tiles
    // Stake-style multiplier: more tiles revealed = higher multiplier
    const safeTilesRevealed = revealedTiles.length;
    const multiplier = this.calculateMinesMultiplier(safeTilesRevealed);
    
    return { multiplier, hitMine: false };
  }

  /**
   * Calculate Stake-style mines multiplier
   */
  private calculateMinesMultiplier(safeTilesRevealed: number): number {
    // Stake mines multiplier formula with 5 mines on 5x5 grid
    // 25 total tiles, 5 mines = 20 safe tiles
    // Formula: (20 / (20 - tilesRevealed)) ^ (tilesRevealed / 20)
    
    if (safeTilesRevealed === 0) return 1.0;
    if (safeTilesRevealed >= 20) return 100.0; // Max theoretical
    
    const safeTilesRemaining = 20 - safeTilesRevealed;
    const baseMultiplier = 20 / safeTilesRemaining;
    const exponentialFactor = safeTilesRevealed / 20;
    
    return Math.pow(baseMultiplier, exponentialFactor);
  }

  /**
   * Simple hash function for deterministic randomness
   */
  private hashSeed(seed: string): number {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Generate match ID with 'min' prefix
   */
  private generateMatchId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `min_${timestamp}_${random}`;
  }

  /**
   * Check if a specific tile is a mine (for real-time gameplay)
   */
  async checkTile(matchId: string, tilePosition: string, playerId: string): Promise<{
    success: boolean;
    isMine?: boolean;
    currentMultiplier?: number;
    gameOver?: boolean;
    revealedTiles?: string[];
    error?: string;
  }> {
    // 🔐 CRITICAL: Acquire tile lock to prevent concurrent processing
    const lockResult = await this.tileProtectionService.acquireTileLock(matchId, tilePosition, playerId);
    
    if (!lockResult.success) {
      // Gracefully handle duplicate clicks - just ignore them
      if (lockResult.reason === 'duplicate_click') {
        this.logger.debug(`🔒 IGNORED: Duplicate click from ${playerId} at ${tilePosition}`);
        return { success: false, error: 'Duplicate click ignored' };
      }
      
      if (lockResult.reason === 'concurrent_access') {
        this.logger.debug(`🔒 BLOCKED: Concurrent access from ${playerId} at ${tilePosition}`);
        return { success: false, error: 'Tile is currently being processed' };
      }
    }

    let tileLockKey = lockResult.lockKey;

    try {
      const gameState = await this.getGameStateFromRedis(matchId);
    if (!gameState) {
      return { success: false, error: 'Match not found' };
    }

    const currentRound = gameState.rounds[gameState.rounds.length - 1];
    if (!currentRound || !currentRound.mineGrid) {
      return { success: false, error: 'No active round or mine grid not found' };
    }

    // Check if this tile is a mine
    const isMine = currentRound.mineGrid.mines.includes(tilePosition);
    
    // For now, we'll track revealed tiles in a simple way
    // In a full implementation, you'd want to track this per player
    const revealedTiles: string[] = [tilePosition]; // This would be accumulated over the turn
    
    let currentMultiplier = 1.0;
    let gameOver = false;

    if (isMine) {
      // Player hit a mine - game over for them
      gameOver = true;
      currentMultiplier = 0;
      this.logger.log(`💥 MINE HIT at ${tilePosition}! Game over.`);
    } else {
      // Safe tile - calculate multiplier based on revealed safe tiles
      const safeTilesRevealed = revealedTiles.length;
      currentMultiplier = this.calculateMinesMultiplier(safeTilesRevealed);
      this.logger.log(`💎 Safe tile at ${tilePosition}! Multiplier: ${currentMultiplier.toFixed(2)}x`);
    }

    // 🛡️ ANTI-CHEAT: Validate tile click before processing
    const clickTimestamp = Date.now();
    const antiCheatResult = await this.antiCheatService.validateTileClick({
      matchId,
      playerId,
      tilePosition,
      timestamp: clickTimestamp
    });
    
    if (!antiCheatResult.allowed) {
      this.logger.warn(`🛡️ ANTI-CHEAT BLOCKED: ${antiCheatResult.reason} for player ${playerId} at ${tilePosition}`);
      
      // Ban player if critical violation
      if (antiCheatResult.shouldBan) {
        await this.antiCheatService.emergencyBanPlayer(
          playerId,
          antiCheatResult.reason || 'Critical security violation',
          { matchId, tilePosition, severity: antiCheatResult.severity }
        );
      }
      
      return {
        success: false,
        error: antiCheatResult.reason || 'Security validation failed'
      };
    }

    // 📊 ANALYTICS BATCHING: Track tile click (non-blocking)
    this.minesBatchingService.trackTileClick({
      matchId,
      playerId,
      tilePosition,
      timestamp: clickTimestamp,
      isMine,
      multiplier: currentMultiplier,
      gamePhase: this.determineGamePhase(currentRound, revealedTiles.length)
    });

    // 📊 ANALYTICS BATCHING: Track user activity (non-blocking)
    this.minesBatchingService.trackUserActivity(
      playerId,
      isMine ? 'mine_hit' : 'safe_tile_revealed',
      { matchId, tilePosition, multiplier: currentMultiplier }
    );

    // 🔄 SYNC VALIDATION: Store updated state checksum for validation
    await this.syncValidationService.storeServerChecksum(gameState);

    return {
      success: true,
      isMine,
      currentMultiplier,
      gameOver,
      revealedTiles
    };

    } finally {
      // 🔐 CRITICAL: Always release tile lock in finally block
      if (tileLockKey) {
        await this.tileProtectionService.releaseTileLock(tileLockKey, playerId);
      }
    }
  }

  /**
   * Get match state
   */
  async getMatchState(matchId: string): Promise<MinesGameState | null> {
    return await this.getGameStateFromRedis(matchId);
  }

  /**
   * Get current match state (overrides base class method)
   */
  getGameState(matchId: string): any {  
    // For compatibility with base class, return a promise
    return this.getMatchState(matchId);
  }

  /**
   * Validate mines result (called by match service)
   */
  validateMinesResult(matchId: string, player1: string, player2: string, gameState: MinesGameState): MinesMatchResult {
    const result: MinesMatchResult = {
      matchId,
      player1,
      player2,
      gameState,
      winner: null,
      isValid: false,
      endTime: Date.now()
    };

    try {
      // Basic validation
      if (!this.isValidGameState(gameState)) {
        throw new Error('Invalid game state');
      }

      if (!this.isValidScoring(gameState)) {
        throw new Error('Invalid scoring calculation');
      }

      if (!this.isValidEndCondition(gameState)) {
        throw new Error('Invalid end condition');
      }

      // Determine winner wallet address
      result.winner = gameState.winner;
      result.isValid = true;

      return result;

    } catch (error) {
      this.logger.error(`Mines validation error for match ${matchId}:`, error.message);
      return result; // isValid = false
    }
  }

  /**
   * Validate game result (BaseGameService interface)
   */
  async validateResult(result: GameResult): Promise<ValidationResult> {
    try {
      const gameState = result.gameData as MinesGameState;
      
      if (!this.isValidGameState(gameState)) {
        return { isValid: false, winner: null, reason: 'Invalid game state structure' };
      }

      if (!this.isValidScoring(gameState)) {
        return { isValid: false, winner: null, reason: 'Invalid scoring calculation' };
      }

      if (!this.isValidEndCondition(gameState)) {
        return { isValid: false, winner: null, reason: 'Invalid end condition' };
      }

      return { isValid: true, winner: gameState.winner };
    } catch (error) {
      this.logger.error('Error validating mines result:', error);
      return { isValid: false, winner: null, reason: 'Validation error' };
    }
  }

  private isValidGameState(gameState: MinesGameState): boolean {
    if (!gameState || !Array.isArray(gameState.rounds)) return false;
    if (gameState.rounds.length === 0) return false;
    if (gameState.currentRound < 1) return false;
    return true;
  }

  private isValidScoring(gameState: MinesGameState): boolean {
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

  private isValidEndCondition(gameState: MinesGameState): boolean {
    if (!gameState.matchComplete) return false;
    
    const maxScore = Math.max(gameState.player1Score, gameState.player2Score);
    return maxScore >= gameState.requiredWins;
  }

  /**
   * Generate provably fair seeds for a match
   */
  generateProvablyFairSeeds(matchId: string, roundNumber: number): ProofData {
    const crypto = require('crypto');
    
    // Generate cryptographically secure server seed
    const serverSeed = crypto.randomBytes(32).toString('hex');
    const hashedServerSeed = crypto.createHash('sha256').update(serverSeed).digest('hex');
    
    // Client seed (can be provided by player or auto-generated)
    const clientSeed = crypto.randomBytes(16).toString('hex');
    
    return {
      clientSeed,
      serverSeed,
      hashedServerSeed,
      nonce: roundNumber,
      matchId,
      roundNumber
    };
  }

  /**
   * Generate deterministic mines using provably fair seeds
   */
  private generateProvablyFairGrid(proofData: ProofData): MinesGrid {
    const crypto = require('crypto');
    
    // Combine seeds in deterministic way (Stake-style)
    const combinedSeed = `${proofData.serverSeed}:${proofData.clientSeed}:${proofData.nonce}`;
    const hash = crypto.createHash('sha256').update(combinedSeed).digest('hex');
    
    const minesSet = new Set<string>();
    let index = 0;
    
    // Generate mines using cryptographic hash (like Stake)
    while (minesSet.size < 5 && index < hash.length - 1) {
      const byte1 = parseInt(hash.substr(index, 2), 16);
      const byte2 = parseInt(hash.substr(index + 2, 2), 16);
      
      const x = byte1 % 5;
      const y = byte2 % 5;
      
      minesSet.add(`${x},${y}`);
      index += 4;
    }
    
    // Fallback if we don't have enough entropy
    while (minesSet.size < 5) {
      const fallbackHash = crypto.createHash('sha256').update(hash + index).digest('hex');
      const x = parseInt(fallbackHash.substr(0, 2), 16) % 5;
      const y = parseInt(fallbackHash.substr(2, 2), 16) % 5;
      minesSet.add(`${x},${y}`);
      index++;
    }

    return {
      size: 5,
      mineCount: 5,
      mines: Array.from(minesSet),
      seed: combinedSeed,
    };
  }

  /**
   * Verify provably fair result (called after game ends)
   */
  verifyProvablyFair(proofData: ProofData, revealedMines: string[]): ProvablyFairResult {
    try {
      // Recreate the mine grid using the same seeds
      const recreatedGrid = this.generateProvablyFairGrid(proofData);
      
      const result: ProvablyFairResult = {
        isValid: JSON.stringify(recreatedGrid.mines.sort()) === JSON.stringify(revealedMines.sort()),
        reconstructedMines: recreatedGrid.mines,
        providedMines: revealedMines,
        proof: proofData
      };

      if (!result.isValid) {
        this.logger.error(`🔴 Provably fair verification FAILED for match ${proofData.matchId}:`);
        this.logger.error(`Expected: ${recreatedGrid.mines.sort().join(', ')}`);
        this.logger.error(`Provided: ${revealedMines.sort().join(', ')}`);
      }

      return result;
    } catch (error) {
      this.logger.error(`Error verifying provably fair data:`, error);
      return {
        isValid: false,
        reconstructedMines: [],
        providedMines: revealedMines,
        proof: proofData
      };
    }
  }

  /**
   * 📊 BATCHING: Determine current game phase for analytics
   */
  private determineGamePhase(currentRound: MinesRound | null, tilesRevealed: number): 'early' | 'mid' | 'late' {
    if (tilesRevealed <= 3) return 'early';
    if (tilesRevealed <= 8) return 'mid';
    return 'late';
  }

  /**
   * 📊 BATCHING: Track game session start (non-blocking)
   */
  trackGameSessionStart(matchId: string, playerId: string, metadata?: any): void {
    this.minesBatchingService.trackUserActivity(
      playerId,
      'mines_session_start',
      { matchId, ...metadata }
    );
  }

  /**
   * 📊 BATCHING: Track game session end (non-blocking)
   */
  trackGameSessionEnd(matchId: string, playerId: string, tilesClicked: number, sessionDuration: number): void {
    this.minesBatchingService.trackGameSession({
      matchId,
      playerId,
      sessionStartTime: Date.now() - sessionDuration,
      sessionEndTime: Date.now(),
      totalTilesClicked: tilesClicked,
      averageClickInterval: sessionDuration / Math.max(tilesClicked, 1),
      sessionDuration
    });

    this.minesBatchingService.trackUserActivity(
      playerId,
      'mines_session_end',
      { matchId, totalTiles: tilesClicked, duration: sessionDuration }
    );
  }

  /**
   * 📊 BATCHING: Track performance metric (non-blocking)
   */
  trackPerformanceMetric(
    matchId: string, 
    playerId: string, 
    eventType: 'tile_response_time' | 'animation_lag' | 'websocket_latency',
    value: number,
    metadata?: any
  ): void {
    this.minesBatchingService.trackPerformanceMetric({
      matchId,
      playerId,
      eventType,
      value,
      timestamp: Date.now(),
      metadata
    });
  }

  /**
   * 📊 BATCHING: Get batching statistics for monitoring
   */
  getBatchingStats() {
    return this.minesBatchingService.getBatchingStats();
  }
} 