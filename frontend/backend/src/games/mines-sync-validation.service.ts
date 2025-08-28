import { Injectable, Logger } from '@nestjs/common';
import { RedisCacheService } from '../common/redis-cache.service';
import { MinesGameState, MinesRound } from './mines.service';
import * as crypto from 'crypto';

interface SyncValidationResult {
  isValid: boolean;
  clientChecksum?: string;
  serverChecksum?: string;
  mismatchDetails?: string[];
  correctionNeeded?: boolean;
}

interface StateChecksum {
  matchId: string;
  checksum: string;
  timestamp: number;
  roundNumber: number;
  criticalFields: any;
}

@Injectable()
export class MinesSyncValidationService {
  private readonly logger = new Logger(MinesSyncValidationService.name);
  
  // Validation configuration
  private readonly CHECKSUM_CACHE_TTL = 300000; // 5 minutes
  private readonly SYNC_VALIDATION_INTERVAL = 15000; // 15 seconds
  private readonly MAX_CHECKSUM_HISTORY = 10;
  
  // Performance tracking
  private stats = {
    totalValidations: 0,
    syncMismatches: 0,
    autoCorrections: 0,
    validationErrors: 0
  };

  constructor(
    private readonly redisCacheService: RedisCacheService,
  ) {
    this.logger.log('🔄 SYNC VALIDATION: Real-time state validation initialized');
  }

  /**
   * 🔄 CRITICAL: Generate state checksum for validation
   */
  generateStateChecksum(gameState: MinesGameState): string {
    try {
      // Extract critical fields that must stay synchronized
      const criticalState = {
        matchId: gameState.matchId,
        currentRound: gameState.currentRound,
        player1Score: gameState.player1Score,
        player2Score: gameState.player2Score,
        matchComplete: gameState.matchComplete,
        winner: gameState.winner,
        roundsCount: gameState.rounds.length,
        // Include critical round data
        rounds: gameState.rounds.map(round => ({
          roundNumber: round.roundNumber,
          winner: round.winner,
          completedAt: round.completedAt,
          minePositions: round.mineGrid?.mines?.sort() || [],
          player1TurnComplete: !!round.player1Turn,
          player2TurnComplete: !!round.player2Turn,
          player1HitMine: round.player1Turn?.hitMine || false,
          player2HitMine: round.player2Turn?.hitMine || false
        }))
      };

      // Generate deterministic checksum
      const stateString = JSON.stringify(criticalState, Object.keys(criticalState).sort());
      return crypto.createHash('sha256').update(stateString).digest('hex').substring(0, 16);
    } catch (error) {
      this.logger.error(`❌ CHECKSUM GENERATION ERROR:`, error);
      return 'error';
    }
  }

  /**
   * 🔄 CRITICAL: Store server state checksum for validation
   */
  async storeServerChecksum(gameState: MinesGameState): Promise<void> {
    try {
      const checksum = this.generateStateChecksum(gameState);
      const checksumData: StateChecksum = {
        matchId: gameState.matchId,
        checksum,
        timestamp: Date.now(),
        roundNumber: gameState.currentRound,
        criticalFields: {
          player1Score: gameState.player1Score,
          player2Score: gameState.player2Score,
          matchComplete: gameState.matchComplete,
          roundsCount: gameState.rounds.length
        }
      };

      const key = `mines:checksum:${gameState.matchId}`;
      await this.redisCacheService.set(key, checksumData, this.CHECKSUM_CACHE_TTL);
      
      this.logger.debug(`📝 CHECKSUM STORED: ${gameState.matchId} = ${checksum}`);
    } catch (error) {
      this.logger.error(`❌ CHECKSUM STORAGE ERROR for ${gameState.matchId}:`, error);
    }
  }

  /**
   * 🔄 CRITICAL: Validate client state against server state
   */
  async validateClientState(
    matchId: string, 
    clientChecksum: string, 
    clientStateData?: any
  ): Promise<SyncValidationResult> {
    this.stats.totalValidations++;
    
    try {
      // Get stored server checksum
      const key = `mines:checksum:${matchId}`;
      const serverChecksumData = await this.redisCacheService.get<StateChecksum>(key);
      
      if (!serverChecksumData) {
        this.logger.warn(`⚠️ NO SERVER CHECKSUM for match ${matchId} - cannot validate`);
        return {
          isValid: true, // Assume valid if no server checksum (graceful degradation)
          correctionNeeded: false
        };
      }

      const serverChecksum = serverChecksumData.checksum;
      
      // Compare checksums
      if (clientChecksum === serverChecksum) {
        this.logger.debug(`✅ SYNC VALID: ${matchId} checksums match (${clientChecksum})`);
        return {
          isValid: true,
          clientChecksum,
          serverChecksum,
          correctionNeeded: false
        };
      }

      // Mismatch detected - analyze differences
      this.stats.syncMismatches++;
      this.logger.warn(`🔄 SYNC MISMATCH: ${matchId} - Client: ${clientChecksum}, Server: ${serverChecksum}`);
      
      const mismatchDetails = this.analyzeMismatch(clientStateData, serverChecksumData.criticalFields);
      
      return {
        isValid: false,
        clientChecksum,
        serverChecksum,
        mismatchDetails,
        correctionNeeded: true
      };

    } catch (error) {
      this.stats.validationErrors++;
      this.logger.error(`❌ SYNC VALIDATION ERROR for ${matchId}:`, error);
      
      // On error, assume valid to prevent blocking gameplay
      return {
        isValid: true,
        correctionNeeded: false
      };
    }
  }

  /**
   * 🔍 ANALYSIS: Analyze specific differences between client and server state
   */
  private analyzeMismatch(clientState: any, serverCriticalFields: any): string[] {
    const differences: string[] = [];
    
    if (!clientState || !serverCriticalFields) {
      return ['Unable to analyze - missing state data'];
    }

    try {
      // Check score mismatches
      if (clientState.player1Score !== serverCriticalFields.player1Score) {
        differences.push(`Player 1 score: client=${clientState.player1Score}, server=${serverCriticalFields.player1Score}`);
      }
      
      if (clientState.player2Score !== serverCriticalFields.player2Score) {
        differences.push(`Player 2 score: client=${clientState.player2Score}, server=${serverCriticalFields.player2Score}`);
      }

      // Check match completion status
      if (clientState.matchComplete !== serverCriticalFields.matchComplete) {
        differences.push(`Match complete: client=${clientState.matchComplete}, server=${serverCriticalFields.matchComplete}`);
      }

      // Check round count
      if (clientState.roundsCount !== serverCriticalFields.roundsCount) {
        differences.push(`Rounds count: client=${clientState.roundsCount}, server=${serverCriticalFields.roundsCount}`);
      }

      return differences.length > 0 ? differences : ['Unknown state difference'];
    } catch (error) {
      return ['Error analyzing mismatch'];
    }
  }

  /**
   * 🔧 CORRECTION: Generate corrected state for client
   */
  async generateCorrectedState(matchId: string): Promise<{
    success: boolean;
    correctedState?: MinesGameState;
    error?: string;
  }> {
    try {
      this.stats.autoCorrections++;
      
      // This would typically fetch the authoritative server state
      // For now, we'll return a signal that the client should refresh
      this.logger.log(`🔧 GENERATING CORRECTION for match ${matchId}`);
      
      return {
        success: true,
        // The actual corrected state would be provided by the MinesService
        correctedState: undefined // Client will re-fetch via API
      };
    } catch (error) {
      this.logger.error(`❌ CORRECTION GENERATION ERROR for ${matchId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 🔄 MONITORING: Periodic sync validation for active matches
   */
  async performPeriodicValidation(matchId: string): Promise<void> {
    try {
      // This would be called periodically for active matches
      // Could be triggered by a cron job or interval timer
      
      const key = `mines:checksum:${matchId}`;
      const serverChecksum = await this.redisCacheService.get<StateChecksum>(key);
      
      if (serverChecksum) {
        // Check if checksum is stale (might indicate lost sync)
        const age = Date.now() - serverChecksum.timestamp;
        
        if (age > this.SYNC_VALIDATION_INTERVAL * 2) {
          this.logger.warn(`⚠️ STALE CHECKSUM for match ${matchId} - ${age}ms old`);
        }
      }
    } catch (error) {
      this.logger.error(`❌ PERIODIC VALIDATION ERROR for ${matchId}:`, error);
    }
  }

  /**
   * 📊 MONITORING: Get sync validation statistics
   */
  getSyncStats() {
    const mismatchRate = this.stats.totalValidations > 0 
      ? (this.stats.syncMismatches / this.stats.totalValidations) * 100 
      : 0;
    
    const errorRate = this.stats.totalValidations > 0 
      ? (this.stats.validationErrors / this.stats.totalValidations) * 100 
      : 0;
    
    return {
      ...this.stats,
      mismatchRate: Math.round(mismatchRate * 100) / 100,
      errorRate: Math.round(errorRate * 100) / 100,
      syncHealthScore: Math.max(0, 100 - mismatchRate - errorRate)
    };
  }

  /**
   * 🧹 CLEANUP: Clean up old checksums
   */
  async cleanupOldChecksums(matchId: string): Promise<void> {
    try {
      const key = `mines:checksum:${matchId}`;
      await this.redisCacheService.delete(key);
      this.logger.debug(`🧹 CLEANED UP checksum for match ${matchId}`);
    } catch (error) {
      this.logger.error(`❌ CLEANUP ERROR for ${matchId}:`, error);
    }
  }

  /**
   * 🔄 VALIDATION: Quick integrity check for critical operations
   */
  async validateCriticalOperation(
    matchId: string, 
    operation: string, 
    expectedState: any
  ): Promise<boolean> {
    try {
      // For critical operations like tile reveals, validate immediately
      const key = `mines:checksum:${matchId}`;
      const serverChecksum = await this.redisCacheService.get<StateChecksum>(key);
      
      if (!serverChecksum) {
        return true; // Allow operation if no checksum available
      }

      // Quick validation of critical fields
      const criticalMatch = 
        expectedState.matchComplete === serverChecksum.criticalFields.matchComplete &&
        expectedState.roundsCount >= serverChecksum.criticalFields.roundsCount;
      
      if (!criticalMatch) {
        this.logger.warn(`⚠️ CRITICAL VALIDATION FAILED for ${operation} in ${matchId}`);
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(`❌ CRITICAL VALIDATION ERROR for ${operation}:`, error);
      return true; // Fail open for availability
    }
  }
} 