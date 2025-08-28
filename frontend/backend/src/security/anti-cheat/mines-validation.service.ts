import { Injectable, Logger } from '@nestjs/common';
import { RedisCacheService } from '../../common/redis-cache.service';
import { MinesGameState } from '../../games/mines.service';

export interface GameValidationResult {
  isValid: boolean;
  reason?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  evidence?: any;
}

export interface TimingValidationResult {
  isValid: boolean;
  reason?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  actualInterval?: number;
  expectedMin?: number;
  expectedMax?: number;
}

@Injectable()
export class MinesValidationService {
  private readonly logger = new Logger(MinesValidationService.name);

  // 🛡️ MINES-OPTIMIZED VALIDATION (Allows aggressive legitimate gameplay)
  private readonly MIN_CLICK_INTERVAL = 30; // 30ms minimum between clicks (faster than human possible)
  private readonly MAX_CLICK_INTERVAL = 300000; // 5 minutes max (prevents session hijacking)
  private readonly MAX_TILES_PER_TURN = 24; // Can't reveal more than 24 tiles (1 must be mine)
  private readonly GAME_STATE_CACHE_TTL = 3600000; // 1 hour cache for validation data

  constructor(
    private readonly redisCacheService: RedisCacheService,
  ) {
    this.logger.log('🛡️ MINES-VALIDATION: Initialized security validation');
  }

  /**
   * 🛡️ CRITICAL: Validate game state integrity
   */
  async validateGameState(
    matchId: string,
    playerId: string,
    tilePosition: string,
    timestamp: number
  ): Promise<GameValidationResult> {
    try {
      // Get current game state from Redis
      const gameStateData = await this.redisCacheService.get(`mines:match:${matchId}`);
      
      if (!gameStateData) {
        return {
          isValid: false,
          reason: 'Game state not found - possible manipulation',
          severity: 'critical',
          evidence: { matchId, playerId, timestamp }
        };
      }

      // 🔧 FIX: Type the gameState properly to access properties
      const gameState = gameStateData as MinesGameState;

      // 🔴 CRITICAL: Validate player is actually in this match
      if (gameState.player1 !== playerId && gameState.player2 !== playerId) {
        return {
          isValid: false,
          reason: 'Player not in match - unauthorized access attempt',
          severity: 'critical',
          evidence: { matchId, playerId, gameState: { player1: gameState.player1, player2: gameState.player2 } }
        };
      }

      // 🔴 CRITICAL: Validate match is active
      if (gameState.matchComplete) {
        return {
          isValid: false,
          reason: 'Match already completed - replay attack attempt',
          severity: 'high',
          evidence: { matchId, playerId, matchComplete: true, winner: gameState.winner }
        };
      }

      // 🔴 CRITICAL: Validate tile position format
      if (!this.isValidTilePosition(tilePosition)) {
        return {
          isValid: false,
          reason: 'Invalid tile position format - possible injection attempt',
          severity: 'high',
          evidence: { tilePosition, expectedFormat: 'x,y where x,y are 0-4' }
        };
      }

      // 🔴 CRITICAL: Validate tile hasn't been clicked already
      const currentRound = gameState.rounds[gameState.rounds.length - 1];
      if (currentRound) {
        const playerTurn = playerId === gameState.player1 ? currentRound.player1Turn : currentRound.player2Turn;
        
        if (playerTurn && playerTurn.revealedTiles.includes(tilePosition)) {
          return {
            isValid: false,
            reason: 'Tile already revealed - double-click exploit attempt',
            severity: 'high',
            evidence: { tilePosition, revealedTiles: playerTurn.revealedTiles }
          };
        }

        // 🔴 CRITICAL: Validate player hasn't exceeded max tiles per turn
        if (playerTurn && playerTurn.revealedTiles.length >= this.MAX_TILES_PER_TURN) {
          return {
            isValid: false,
            reason: 'Too many tiles revealed - game state manipulation',
            severity: 'critical',
            evidence: { revealedCount: playerTurn.revealedTiles.length, maxAllowed: this.MAX_TILES_PER_TURN }
          };
        }

        // 🔴 CRITICAL: Validate player turn hasn't already completed
        if (playerTurn && playerTurn.cashedOut) {
          return {
            isValid: false,
            reason: 'Player already cashed out - replay attack',
            severity: 'high',
            evidence: { playerId, cashedOut: true, finalMultiplier: playerTurn.finalMultiplier }
          };
        }
      }

      // ✅ All validations passed
      return {
        isValid: true,
        severity: 'low'
      };

    } catch (error) {
      this.logger.error('❌ Game state validation error:', error);
      return {
        isValid: false,
        reason: 'Validation system error',
        severity: 'medium',
        evidence: { error: error.message }
      };
    }
  }

  /**
   * 🛡️ CRITICAL: Validate timing to prevent speed hacks
   */
  async validateTiming(
    matchId: string,
    playerId: string,
    timestamp: number
  ): Promise<TimingValidationResult> {
    try {
      const lastClickKey = `timing:${playerId}:${matchId}`;
      const lastClickTime = await this.redisCacheService.get<number>(lastClickKey);
      
      if (lastClickTime) {
        const interval = timestamp - lastClickTime;
        
        // 🔴 CRITICAL: Too fast (speed hack/bot)
        if (interval < this.MIN_CLICK_INTERVAL) {
          return {
            isValid: false,
            reason: 'Clicks too fast - automation detected',
            severity: 'critical',
            actualInterval: interval,
            expectedMin: this.MIN_CLICK_INTERVAL
          };
        }
        
        // 🔴 SUSPICIOUS: Too slow (session hijacking/replay)
        if (interval > this.MAX_CLICK_INTERVAL) {
          return {
            isValid: false,
            reason: 'Click interval too long - possible session hijacking',
            severity: 'medium',
            actualInterval: interval,
            expectedMax: this.MAX_CLICK_INTERVAL
          };
        }
      }
      
      // Store this click time for next validation
      await this.redisCacheService.set(lastClickKey, timestamp, 600000); // 10 minutes TTL
      
      return {
        isValid: true,
        severity: 'low'
      };

    } catch (error) {
      this.logger.error('❌ Timing validation error:', error);
      return {
        isValid: false,
        reason: 'Timing validation system error',
        severity: 'medium'
      };
    }
  }

  /**
   * 🛡️ Validate match integrity before operations
   */
  async validateMatchIntegrity(matchId: string, playerId: string): Promise<any> {
    try {
      const gameStateData = await this.redisCacheService.get(`mines:match:${matchId}`);
      
      if (!gameStateData) {
        return {
          allowed: false,
          reason: 'Match not found',
          severity: 'high',
          suspiciousScore: 80
        };
      }

      // 🔧 FIX: Type the gameState properly to access properties
      const gameState = gameStateData as MinesGameState;

      // Check if player is banned
      const banData = await this.redisCacheService.get(`banned:${playerId}`);
      if (banData) {
        return {
          allowed: false,
          reason: 'Player is banned',
          severity: 'critical',
          suspiciousScore: 100,
          shouldBan: true
        };
      }

      // Validate provably fair data integrity
      const currentRound = gameState.rounds[gameState.rounds.length - 1];
      if (currentRound && currentRound.proofData) {
        const isValidProof = this.validateProvablyFairIntegrity(currentRound.proofData);
        if (!isValidProof) {
          return {
            allowed: false,
            reason: 'Provably fair data corrupted',
            severity: 'critical',
            suspiciousScore: 100,
            shouldBan: true
          };
        }
      }

      return {
        allowed: true,
        severity: 'low',
        suspiciousScore: 0
      };

    } catch (error) {
      this.logger.error('❌ Match integrity validation error:', error);
      return {
        allowed: false,
        reason: 'Integrity validation failed',
        severity: 'medium',
        suspiciousScore: 60
      };
    }
  }

  /**
   * 🛡️ Validate tile position format
   */
  private isValidTilePosition(position: string): boolean {
    if (!position || typeof position !== 'string') return false;
    
    const parts = position.split(',');
    if (parts.length !== 2) return false;
    
    const x = parseInt(parts[0]);
    const y = parseInt(parts[1]);
    
    // Must be valid grid coordinates (0-4 for 5x5 grid)
    return !isNaN(x) && !isNaN(y) && x >= 0 && x <= 4 && y >= 0 && y <= 4;
  }

  /**
   * 🛡️ Validate provably fair data hasn't been tampered with
   */
  private validateProvablyFairIntegrity(proofData: any): boolean {
    if (!proofData || !proofData.serverSeed || !proofData.clientSeed || !proofData.hashedServerSeed) {
      return false;
    }
    
    // Validate server seed hash
    const crypto = require('crypto');
    const computedHash = crypto.createHash('sha256').update(proofData.serverSeed).digest('hex');
    
    return computedHash === proofData.hashedServerSeed;
  }
} 