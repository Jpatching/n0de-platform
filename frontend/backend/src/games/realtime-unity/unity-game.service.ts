import { Injectable, Logger } from '@nestjs/common';
import { GameType } from '../game-types';

export interface PhotonRoomData {
  roomId: string;
  gameType: GameType;
  player1Id: string;
  player2Id: string;
  matchId: string;
  startTime: number;
  endTime?: number;
  gameState: 'waiting' | 'starting' | 'active' | 'finished' | 'abandoned';
}

export interface UnityGameResult {
  photonRoomId: string;
  gameDurationMs: number;
  player1Score: number;
  player2Score: number;
  totalActions: number;
  gameEventsHash: string;
  photonSessionHash: string;
  unityBuildVersion: string;
  antiCheatSignature: string;
  winner: string;
}

export interface UnityGameValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  gameResult?: UnityGameResult;
}

@Injectable()
export class UnityGameService {
  private readonly logger = new Logger(UnityGameService.name);
  private activePhotonRooms: Map<string, PhotonRoomData> = new Map();
  private gameResultCache: Map<string, UnityGameResult> = new Map();

  /**
   * Create a Photon room for Unity multiplayer game
   */
  async createPhotonRoom(matchId: string, gameType: GameType, player1Id: string, player2Id: string): Promise<PhotonRoomData> {
    const roomId = `pv3_${gameType}_${matchId}_${Date.now()}`;
    
    const roomData: PhotonRoomData = {
      roomId,
      gameType,
      player1Id,
      player2Id,
      matchId,
      startTime: Date.now(),
      gameState: 'waiting',
    };

    this.activePhotonRooms.set(roomId, roomData);
    this.logger.log(`🎮 Created Photon room: ${roomId} for match: ${matchId}`);

    return roomData;
  }

  /**
   * Start Unity game session
   */
  async startUnityGame(roomId: string): Promise<boolean> {
    const room = this.activePhotonRooms.get(roomId);
    if (!room) {
      this.logger.error(`❌ Photon room not found: ${roomId}`);
      return false;
    }

    room.gameState = 'starting';
    this.logger.log(`🚀 Starting Unity game in room: ${roomId}`);

    // In a real implementation, you would:
    // 1. Initialize Unity WebGL build
    // 2. Connect to Photon network
    // 3. Set up game parameters
    // 4. Enable anti-cheat monitoring
    // 5. Start game timer

    setTimeout(() => {
      room.gameState = 'active';
      this.logger.log(`✅ Unity game active in room: ${roomId}`);
    }, 3000); // Simulate game startup time

    return true;
  }

  /**
   * Handle Unity game completion and validate results
   */
  async handleGameCompletion(roomId: string, gameResult: UnityGameResult): Promise<UnityGameValidation> {
    const room = this.activePhotonRooms.get(roomId);
    if (!room) {
      return {
        isValid: false,
        errors: [`Photon room not found: ${roomId}`],
        warnings: [],
      };
    }

    this.logger.log(`🏁 Unity game completed in room: ${roomId}`);

    // Validate game result
    const validation = await this.validateUnityGameResult(room, gameResult);
    
    if (validation.isValid) {
      // Cache the validated result
      this.gameResultCache.set(roomId, gameResult);
      
      // Update room state
      room.gameState = 'finished';
      room.endTime = Date.now();
      
      this.logger.log(`✅ Unity game result validated for room: ${roomId}`);
    } else {
      this.logger.error(`❌ Unity game result validation failed for room: ${roomId}`, validation.errors);
    }

    return validation;
  }

  /**
   * Validate Unity game result for smart contract submission
   */
  private async validateUnityGameResult(room: PhotonRoomData, result: UnityGameResult): Promise<UnityGameValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Validate Photon room consistency
    if (result.photonRoomId !== room.roomId) {
      errors.push(`Photon room ID mismatch: expected ${room.roomId}, got ${result.photonRoomId}`);
    }

    // 2. Validate game duration
    const minDuration = this.getMinGameDuration(room.gameType);
    const maxDuration = this.getMaxGameDuration(room.gameType);
    
    if (result.gameDurationMs < minDuration) {
      errors.push(`Game too short: ${result.gameDurationMs}ms < ${minDuration}ms minimum`);
    }
    
    if (result.gameDurationMs > maxDuration) {
      errors.push(`Game too long: ${result.gameDurationMs}ms > ${maxDuration}ms maximum`);
    }

    // 3. Validate player scores
    if (result.player1Score < 0 || result.player2Score < 0) {
      errors.push('Player scores cannot be negative');
    }

    // 4. Validate winner determination
    if (result.player1Score === result.player2Score) {
      warnings.push('Game ended in a tie - may need special handling');
    }

    // 5. Validate action count (anti-cheat)
    const expectedMinActions = Math.floor(result.gameDurationMs / 1000) * 2; // 2 actions per second minimum
    const expectedMaxActions = Math.floor(result.gameDurationMs / 100) * 5; // 5 actions per 100ms maximum
    
    if (result.totalActions < expectedMinActions) {
      warnings.push(`Low action count: ${result.totalActions} < ${expectedMinActions} expected minimum`);
    }
    
    if (result.totalActions > expectedMaxActions) {
      errors.push(`Suspiciously high action count: ${result.totalActions} > ${expectedMaxActions} expected maximum`);
    }

    // 6. Validate Unity build version
    if (!result.unityBuildVersion || result.unityBuildVersion.length === 0) {
      errors.push('Unity build version is required');
    }

    // 7. Validate anti-cheat signature
    if (!result.antiCheatSignature || result.antiCheatSignature.length !== 128) { // 64 bytes = 128 hex chars
      errors.push('Invalid anti-cheat signature format');
    }

    // 8. Validate game events hash
    if (!result.gameEventsHash || result.gameEventsHash.length !== 64) { // 32 bytes = 64 hex chars
      errors.push('Invalid game events hash format');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      gameResult: errors.length === 0 ? result : undefined,
    };
  }

  /**
   * Get minimum game duration for game type
   */
  private getMinGameDuration(gameType: GameType): number {
    switch (gameType) {
      case GameType.UnityRacing:
        return 30_000; // 30 seconds
      case GameType.UnityFighting:
        return 20_000; // 20 seconds
      case GameType.UnityStrategy:
        return 60_000; // 1 minute
      case GameType.UnitySports:
        return 45_000; // 45 seconds
      case GameType.UnityPuzzle:
        return 30_000; // 30 seconds
      default:
        return 10_000; // 10 seconds default
    }
  }

  /**
   * Get maximum game duration for game type
   */
  private getMaxGameDuration(gameType: GameType): number {
    switch (gameType) {
      case GameType.UnityRacing:
        return 300_000; // 5 minutes
      case GameType.UnityFighting:
        return 180_000; // 3 minutes
      case GameType.UnityStrategy:
        return 900_000; // 15 minutes
      case GameType.UnitySports:
        return 600_000; // 10 minutes
      case GameType.UnityPuzzle:
        return 720_000; // 12 minutes
      default:
        return 600_000; // 10 minutes default
    }
  }

  /**
   * Generate cryptographic proof for smart contract
   */
  async generateGameProof(roomId: string): Promise<{
    resultHash: string;
    signature: string;
    timestamp: number;
  } | null> {
    const result = this.gameResultCache.get(roomId);
    if (!result) {
      this.logger.error(`❌ No cached result found for room: ${roomId}`);
      return null;
    }

    // Create deterministic hash of game result
    const gameData = JSON.stringify({
      photonRoomId: result.photonRoomId,
      gameDurationMs: result.gameDurationMs,
      player1Score: result.player1Score,
      player2Score: result.player2Score,
      totalActions: result.totalActions,
      winner: result.winner,
    });

    // In a real implementation, you would:
    // 1. Hash the game data with SHA256
    // 2. Sign the hash with the verifier's private key
    // 3. Return the hash and signature for smart contract verification

    const resultHash = Buffer.from(gameData).toString('hex').padEnd(64, '0').slice(0, 64);
    const signature = result.antiCheatSignature;
    const timestamp = Date.now();

    this.logger.log(`🔐 Generated game proof for room: ${roomId}`);

    return {
      resultHash,
      signature,
      timestamp,
    };
  }

  /**
   * Clean up completed game resources
   */
  async cleanupGame(roomId: string): Promise<void> {
    this.activePhotonRooms.delete(roomId);
    this.gameResultCache.delete(roomId);
    this.logger.log(`🧹 Cleaned up Unity game resources for room: ${roomId}`);
  }

  /**
   * Get active room data
   */
  getActiveRoom(roomId: string): PhotonRoomData | undefined {
    return this.activePhotonRooms.get(roomId);
  }

  /**
   * Get cached game result
   */
  getCachedResult(roomId: string): UnityGameResult | undefined {
    return this.gameResultCache.get(roomId);
  }

  /**
   * Get all active Unity games
   */
  getActiveUnityGames(): PhotonRoomData[] {
    return Array.from(this.activePhotonRooms.values());
  }
} 