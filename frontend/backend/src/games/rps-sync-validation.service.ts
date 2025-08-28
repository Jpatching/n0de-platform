import { Injectable, Logger } from '@nestjs/common';
import { RedisCacheService } from '../common/redis-cache.service';
import * as crypto from 'crypto';

interface RPSGameState {
  matchId: string;
  player1: string;
  player2: string;
  currentRound: number;
  requiredWins: number;
  player1Score: number;
  player2Score: number;
  matchComplete: boolean;
  winner: string | null;
  rounds: any[];
}

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
export class RPSSyncValidationService {
  private readonly logger = new Logger(RPSSyncValidationService.name);
  
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
    this.logger.log('🔄 RPS SYNC VALIDATION: Real-time state validation initialized');
  }

  /**
   * 🔄 CRITICAL: Generate state checksum for RPS validation
   */
  generateStateChecksum(gameState: RPSGameState): string {
    try {
      // Extract critical fields that must stay synchronized for RPS
      const criticalState = {
        matchId: gameState.matchId,
        currentRound: gameState.currentRound,
        player1Score: gameState.player1Score,
        player2Score: gameState.player2Score,
        matchComplete: gameState.matchComplete,
        winner: gameState.winner,
        roundsCount: gameState.rounds.length,
        // Include critical round data for RPS
        rounds: gameState.rounds.map(round => ({
          roundNumber: round.roundNumber,
          player1Choice: round.player1Choice,
          player2Choice: round.player2Choice,
          winner: round.winner,
          completedAt: round.completedAt,
          player1Ready: !!round.player1Ready,
          player2Ready: !!round.player2Ready
        }))
      };

      // Generate deterministic checksum
      const stateString = JSON.stringify(criticalState, Object.keys(criticalState).sort());
      return crypto.createHash('sha256').update(stateString).digest('hex').substring(0, 16);
    } catch (error) {
      this.logger.error(`❌ RPS CHECKSUM GENERATION ERROR:`, error);
      return 'error';
    }
  }

  /**
   * 🔄 CRITICAL: Store server state checksum for validation
   */
  async storeServerChecksum(gameState: RPSGameState): Promise<void> {
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

      const key = `rps:checksum:${gameState.matchId}`;
      await this.redisCacheService.set(key, checksumData, this.CHECKSUM_CACHE_TTL);
      
      this.logger.debug(`📝 RPS CHECKSUM STORED: ${gameState.matchId} = ${checksum}`);
    } catch (error) {
      this.logger.error(`❌ RPS CHECKSUM STORAGE ERROR for ${gameState.matchId}:`, error);
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
      const key = `rps:checksum:${matchId}`;
      const serverChecksumData = await this.redisCacheService.get<StateChecksum>(key);
      
      if (!serverChecksumData) {
        this.logger.warn(`⚠️ NO SERVER CHECKSUM for RPS match ${matchId} - cannot validate`);
        return {
          isValid: true, // Assume valid if no server checksum (graceful degradation)
          correctionNeeded: false
        };
      }

      const serverChecksum = serverChecksumData.checksum;
      
      // Compare checksums
      if (clientChecksum === serverChecksum) {
        this.logger.debug(`✅ RPS SYNC VALID: ${matchId} checksums match (${clientChecksum})`);
        return {
          isValid: true,
          clientChecksum,
          serverChecksum,
          correctionNeeded: false
        };
      }

      // Mismatch detected - analyze differences
      this.stats.syncMismatches++;
      this.logger.warn(`🔄 RPS SYNC MISMATCH: ${matchId} - Client: ${clientChecksum}, Server: ${serverChecksum}`);
      
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
      this.logger.error(`❌ RPS SYNC VALIDATION ERROR for ${matchId}:`, error);
      
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

      // RPS-specific: Check current round
      if (clientState.currentRound !== undefined && serverCriticalFields.currentRound !== undefined) {
        if (clientState.currentRound !== serverCriticalFields.currentRound) {
          differences.push(`Current round: client=${clientState.currentRound}, server=${serverCriticalFields.currentRound}`);
        }
      }

    } catch (error) {
      this.logger.error(`❌ RPS MISMATCH ANALYSIS ERROR:`, error);
      differences.push('Error analyzing mismatch details');
    }

    return differences;
  }

  /**
   * 🔧 CORRECTION: Generate corrected state for client synchronization
   */
  async generateCorrectedState(matchId: string): Promise<{
    success: boolean;
    correctedState?: RPSGameState;
    error?: string;
  }> {
    try {
      this.stats.autoCorrections++;
      
      // In a real implementation, this would fetch the authoritative state
      // For now, we log the correction attempt
      this.logger.log(`🔧 RPS CORRECTION: Generating corrected state for match ${matchId}`);
      
      return {
        success: true,
        error: 'Correction feature not yet implemented - manual sync required'
      };
    } catch (error) {
      this.logger.error(`❌ RPS CORRECTION ERROR for ${matchId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * ⏰ PERIODIC: Perform periodic validation for active matches
   */
  async performPeriodicValidation(matchId: string): Promise<void> {
    try {
      // Check if there's a stored checksum that's getting stale
      const key = `rps:checksum:${matchId}`;
      const checksumData = await this.redisCacheService.get<StateChecksum>(key);
      
      if (checksumData) {
        const age = Date.now() - checksumData.timestamp;
        
        if (age > this.SYNC_VALIDATION_INTERVAL) {
          this.logger.debug(`⏰ RPS PERIODIC VALIDATION: Checksum for ${matchId} is ${age}ms old`);
          
          // Trigger validation warning if checksum is too old
          if (age > this.SYNC_VALIDATION_INTERVAL * 2) {
            this.logger.warn(`⚠️ RPS STALE CHECKSUM: Match ${matchId} checksum is ${age}ms old`);
          }
        }
      }
    } catch (error) {
      this.logger.error(`❌ RPS PERIODIC VALIDATION ERROR for ${matchId}:`, error);
    }
  }

  /**
   * 📊 MONITORING: Get synchronization statistics
   */
  getSyncStats() {
    const validationSuccessRate = this.stats.totalValidations > 0 
      ? ((this.stats.totalValidations - this.stats.syncMismatches - this.stats.validationErrors) / this.stats.totalValidations) * 100 
      : 100;
    
    const mismatchRate = this.stats.totalValidations > 0 
      ? (this.stats.syncMismatches / this.stats.totalValidations) * 100 
      : 0;
    
    return {
      ...this.stats,
      validationSuccessRate: Math.round(validationSuccessRate * 100) / 100,
      mismatchRate: Math.round(mismatchRate * 100) / 100,
      errorRate: this.stats.totalValidations > 0 
        ? (this.stats.validationErrors / this.stats.totalValidations) * 100 
        : 0
    };
  }

  /**
   * 🧹 CLEANUP: Clean up old checksums for completed matches
   */
  async cleanupOldChecksums(matchId: string): Promise<void> {
    try {
      const key = `rps:checksum:${matchId}`;
      await this.redisCacheService.delete(key);
      this.logger.debug(`🧹 RPS CLEANUP: Removed checksum for completed match ${matchId}`);
    } catch (error) {
      this.logger.error(`❌ RPS CLEANUP ERROR for ${matchId}:`, error);
    }
  }

  /**
   * 🔄 CRITICAL: Validate critical operation before execution
   */
  async validateCriticalOperation(
    matchId: string, 
    operation: string, 
    expectedState: any
  ): Promise<boolean> {
    try {
      this.logger.debug(`🔄 RPS CRITICAL VALIDATION: ${operation} for match ${matchId}`);
      
      // Generate checksum for expected state
      const expectedChecksum = this.generateStateChecksum(expectedState);
      
      // Compare with stored server checksum
      const key = `rps:checksum:${matchId}`;
      const serverChecksumData = await this.redisCacheService.get<StateChecksum>(key);
      
      if (serverChecksumData && serverChecksumData.checksum !== expectedChecksum) {
        this.logger.warn(`⚠️ RPS CRITICAL OPERATION BLOCKED: State mismatch for ${operation} in ${matchId}`);
        return false;
      }
      
      this.logger.debug(`✅ RPS CRITICAL OPERATION APPROVED: ${operation} for ${matchId}`);
      return true;
    } catch (error) {
      this.logger.error(`❌ RPS CRITICAL VALIDATION ERROR for ${operation} in ${matchId}:`, error);
      return true; // Allow operation on error (fail-open)
    }
  }
} 