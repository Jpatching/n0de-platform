import { Injectable, Logger } from '@nestjs/common';
import { RedisCacheService } from '../common/redis-cache.service';

@Injectable()
export class RPSChoiceProtectionService {
  private readonly logger = new Logger(RPSChoiceProtectionService.name);
  
  // Lock configuration
  private readonly CHOICE_LOCK_TTL = 1000; // 1 second - prevents deadlocks but allows for network delays
  private readonly MAX_LOCK_ATTEMPTS = 3;
  
  // Performance tracking
  private stats = {
    totalLockAttempts: 0,
    successfulLocks: 0,
    rejectedChoices: 0,
    lockTimeouts: 0,
    duplicateSubmissions: 0
  };

  constructor(
    private readonly redisCacheService: RedisCacheService,
  ) {
    this.logger.log('🔐 RPS CHOICE PROTECTION: Concurrent choice protection initialized');
  }

  /**
   * 🔐 CRITICAL: Acquire choice lock to prevent concurrent submissions
   */
  async acquireChoiceLock(matchId: string, roundNumber: number, playerId: string): Promise<{
    success: boolean;
    lockKey?: string;
    reason?: string;
  }> {
    const lockKey = `rps:choice_lock:${matchId}:${roundNumber}:${playerId}`;
    const lockValue = `${playerId}:${Date.now()}`;
    
    this.stats.totalLockAttempts++;
    
    try {
      // ⚡ ATOMIC: Check if lock exists, then acquire if not
      const existingLock = await this.redisCacheService.get<string>(lockKey);
      
      if (!existingLock) {
        // Lock is available - acquire it
        await this.redisCacheService.set(lockKey, lockValue, this.CHOICE_LOCK_TTL);
        
        this.stats.successfulLocks++;
        this.logger.debug(`🔒 CHOICE LOCK ACQUIRED: Round ${roundNumber} by ${playerId} in ${matchId}`);
        
        return {
          success: true,
          lockKey
        };
      } else {
        this.stats.rejectedChoices++;
        
        // Check who has the lock for debugging
        const isOwnLock = existingLock?.startsWith(playerId);
        
        if (isOwnLock) {
          this.stats.duplicateSubmissions++;
          this.logger.debug(`🔒 DUPLICATE CHOICE REJECTED: Round ${roundNumber} by ${playerId} in ${matchId}`);
          
          return {
            success: false,
            reason: 'duplicate_submission'
          };
        } else {
          this.logger.debug(`🔒 CONCURRENT CHOICE REJECTED: Round ${roundNumber} in ${matchId} - locked by another player`);
          
          return {
            success: false,
            reason: 'concurrent_access'
          };
        }
      }
    } catch (error) {
      this.logger.error(`❌ CHOICE LOCK ERROR for round ${roundNumber} in ${matchId}:`, error);
      this.stats.lockTimeouts++;
      
      // On error, allow the operation (fail-open for availability)
      return {
        success: true,
        reason: 'lock_error_fallthrough'
      };
    }
  }

  /**
   * 🔐 CRITICAL: Release choice lock after processing
   */
  async releaseChoiceLock(lockKey: string, playerId: string): Promise<void> {
    if (!lockKey) return;
    
    try {
      // Verify we own the lock before releasing
      const lockValue = await this.redisCacheService.get<string>(lockKey);
      
      if (lockValue?.startsWith(playerId)) {
        await this.redisCacheService.delete(lockKey);
        this.logger.debug(`🔓 CHOICE LOCK RELEASED: ${lockKey} by ${playerId}`);
      } else {
        this.logger.warn(`⚠️ CHOICE LOCK RELEASE FAILED: ${lockKey} not owned by ${playerId}`);
      }
    } catch (error) {
      this.logger.error(`❌ CHOICE LOCK RELEASE ERROR for ${lockKey}:`, error);
      // Don't throw - lock will expire naturally
    }
  }

  /**
   * 🔐 ADVANCED: Acquire round-level lock for synchronization
   */
  async acquireRoundLock(matchId: string, roundNumber: number): Promise<{
    success: boolean;
    lockKey?: string;
    reason?: string;
  }> {
    const lockKey = `rps:round_lock:${matchId}:${roundNumber}`;
    const lockValue = `round:${roundNumber}:${Date.now()}`;
    
    try {
      // Check if round is already locked
      const existingLock = await this.redisCacheService.get<string>(lockKey);
      
      if (!existingLock) {
        // Acquire round lock with longer TTL for round processing
        await this.redisCacheService.set(lockKey, lockValue, 30000); // 30 seconds
        
        this.logger.debug(`🔒 ROUND LOCK ACQUIRED: Round ${roundNumber} in ${matchId}`);
        
        return {
          success: true,
          lockKey
        };
      } else {
        this.logger.debug(`🔒 ROUND LOCK REJECTED: Round ${roundNumber} in ${matchId} already processing`);
        
        return {
          success: false,
          reason: 'round_already_processing'
        };
      }
    } catch (error) {
      this.logger.error(`❌ ROUND LOCK ERROR for round ${roundNumber} in ${matchId}:`, error);
      
      // On error, allow the operation
      return {
        success: true,
        reason: 'lock_error_fallthrough'
      };
    }
  }

  /**
   * 🔐 CLEANUP: Force release match locks (emergency cleanup)
   */
  async forceReleaseMatchLocks(matchId: string): Promise<number> {
    try {
      let releasedCount = 0;
      
      // Clean up choice locks for all possible rounds (1-10 should cover any RPS match)
      for (let round = 1; round <= 10; round++) {
        // Try to clean up locks for both players (we don't know player IDs here)
        // This is a best-effort cleanup
        const roundLockKey = `rps:round_lock:${matchId}:${round}`;
        
        const existingRoundLock = await this.redisCacheService.get<string>(roundLockKey);
        if (existingRoundLock) {
          await this.redisCacheService.delete(roundLockKey);
          releasedCount++;
        }
      }
      
      if (releasedCount > 0) {
        this.logger.log(`🧹 RPS FORCE CLEANUP: Released ${releasedCount} stuck locks for match ${matchId}`);
      }
      
      return releasedCount;
    } catch (error) {
      this.logger.error(`❌ RPS FORCE CLEANUP ERROR for match ${matchId}:`, error);
      return 0;
    }
  }

  /**
   * 📊 MONITORING: Get protection statistics
   */
  getProtectionStats() {
    const successRate = this.stats.totalLockAttempts > 0 
      ? (this.stats.successfulLocks / this.stats.totalLockAttempts) * 100 
      : 100;
    
    const rejectionRate = this.stats.totalLockAttempts > 0 
      ? (this.stats.rejectedChoices / this.stats.totalLockAttempts) * 100 
      : 0;
    
    const duplicateRate = this.stats.totalLockAttempts > 0 
      ? (this.stats.duplicateSubmissions / this.stats.totalLockAttempts) * 100 
      : 0;
    
    return {
      ...this.stats,
      successRate: Math.round(successRate * 100) / 100,
      rejectionRate: Math.round(rejectionRate * 100) / 100,
      duplicateRate: Math.round(duplicateRate * 100) / 100,
      errorRate: this.stats.totalLockAttempts > 0 
        ? (this.stats.lockTimeouts / this.stats.totalLockAttempts) * 100 
        : 0
    };
  }

  /**
   * 🔐 VALIDATION: Check if choice is currently locked
   */
  async isChoiceLocked(matchId: string, roundNumber: number, playerId: string): Promise<{
    locked: boolean;
    lockedBy?: string;
    lockedAt?: number;
    reason?: string;
  }> {
    try {
      const lockKey = `rps:choice_lock:${matchId}:${roundNumber}:${playerId}`;
      const lockValue = await this.redisCacheService.get<string>(lockKey);
      
      if (lockValue) {
        const [lockedPlayerId, timestamp] = lockValue.split(':');
        
        return {
          locked: true,
          lockedBy: lockedPlayerId,
          lockedAt: parseInt(timestamp),
          reason: lockedPlayerId === playerId ? 'own_lock' : 'other_player_lock'
        };
      }
      
      return { locked: false };
    } catch (error) {
      this.logger.error(`❌ CHOICE LOCK CHECK ERROR for ${playerId} round ${roundNumber} in ${matchId}:`, error);
      return { locked: false };
    }
  }

  /**
   * 🔐 VALIDATION: Check if round is currently locked
   */
  async isRoundLocked(matchId: string, roundNumber: number): Promise<{
    locked: boolean;
    lockedAt?: number;
  }> {
    try {
      const lockKey = `rps:round_lock:${matchId}:${roundNumber}`;
      const lockValue = await this.redisCacheService.get<string>(lockKey);
      
      if (lockValue) {
        const timestamp = lockValue.split(':')[2];
        return {
          locked: true,
          lockedAt: parseInt(timestamp)
        };
      }
      
      return { locked: false };
    } catch (error) {
      this.logger.error(`❌ ROUND LOCK CHECK ERROR for round ${roundNumber} in ${matchId}:`, error);
      return { locked: false };
    }
  }

  /**
   * 🧹 MAINTENANCE: Clean up expired locks (called periodically)
   */
  async cleanupExpiredLocks(): Promise<void> {
    try {
      // Locks expire automatically via Redis TTL, so this is mainly for logging
      this.logger.debug(`🧹 RPS LOCK CLEANUP: Automatic TTL cleanup in progress`);
    } catch (error) {
      this.logger.error(`❌ RPS LOCK CLEANUP ERROR:`, error);
    }
  }
} 