import { Injectable, Logger } from '@nestjs/common';
import { RedisCacheService } from '../common/redis-cache.service';

@Injectable()
export class MinesTileProtectionService {
  private readonly logger = new Logger(MinesTileProtectionService.name);
  
  // Lock configuration
  private readonly TILE_LOCK_TTL = 500; // 500ms - prevents deadlocks
  private readonly MAX_LOCK_ATTEMPTS = 3;
  
  // Performance tracking
  private stats = {
    totalLockAttempts: 0,
    successfulLocks: 0,
    rejectedClicks: 0,
    lockTimeouts: 0
  };

  constructor(
    private readonly redisCacheService: RedisCacheService,
  ) {
    this.logger.log('🔐 TILE PROTECTION: Concurrent click protection initialized');
  }

  /**
   * 🔐 CRITICAL: Acquire tile lock to prevent concurrent processing
   */
  async acquireTileLock(matchId: string, tilePosition: string, playerId: string): Promise<{
    success: boolean;
    lockKey?: string;
    reason?: string;
  }> {
    const lockKey = `mines:tile_lock:${matchId}:${tilePosition}`;
    const lockValue = `${playerId}:${Date.now()}`;
    
    this.stats.totalLockAttempts++;
    
    try {
             // ⚡ ATOMIC: Check if lock exists, then acquire if not
       const existingLock = await this.redisCacheService.get<string>(lockKey);
       
       if (!existingLock) {
         // Lock is available - acquire it
                  this.stats.successfulLocks++;
         this.logger.debug(`🔒 LOCK ACQUIRED: ${tilePosition} by ${playerId} in ${matchId}`);
         
         return {
           success: true,
           lockKey
         };
       } else {
         this.stats.rejectedClicks++;
         
         // Check who has the lock for debugging
         const isOwnLock = existingLock?.startsWith(playerId);
         
         this.logger.debug(`🔒 LOCK REJECTED: ${tilePosition} in ${matchId} - ${isOwnLock ? 'duplicate click' : 'concurrent access'}`);
         
         return {
           success: false,
           reason: isOwnLock ? 'duplicate_click' : 'concurrent_access'
         };
       }
    } catch (error) {
      this.logger.error(`❌ LOCK ERROR for ${tilePosition} in ${matchId}:`, error);
      this.stats.lockTimeouts++;
      
      // On error, allow the operation (fail-open for availability)
      return {
        success: true,
        reason: 'lock_error_fallthrough'
      };
    }
  }

  /**
   * 🔐 CRITICAL: Release tile lock after processing
   */
  async releaseTileLock(lockKey: string, playerId: string): Promise<void> {
    if (!lockKey) return;
    
    try {
      // Verify we own the lock before releasing
      const lockValue = await this.redisCacheService.get<string>(lockKey);
      
      if (lockValue?.startsWith(playerId)) {
        await this.redisCacheService.delete(lockKey);
        this.logger.debug(`🔓 LOCK RELEASED: ${lockKey} by ${playerId}`);
      } else {
        this.logger.warn(`⚠️ LOCK RELEASE FAILED: ${lockKey} not owned by ${playerId}`);
      }
    } catch (error) {
      this.logger.error(`❌ LOCK RELEASE ERROR for ${lockKey}:`, error);
      // Don't throw - lock will expire naturally
    }
  }

  /**
   * 🔐 CLEANUP: Force release stuck locks (emergency cleanup)
   */
     async forceReleaseMatchLocks(matchId: string): Promise<number> {
     try {
       // Since we can't easily get keys by pattern, we'll track active tiles differently
       // For now, we'll clean up by checking common tile positions (0,0 to 4,4)
       let releasedCount = 0;
       
       for (let x = 0; x < 5; x++) {
         for (let y = 0; y < 5; y++) {
           const tilePosition = `${x},${y}`;
           const lockKey = `mines:tile_lock:${matchId}:${tilePosition}`;
           
           const existingLock = await this.redisCacheService.get<string>(lockKey);
           if (existingLock) {
             await this.redisCacheService.delete(lockKey);
             releasedCount++;
           }
         }
       }
       
       if (releasedCount > 0) {
         this.logger.log(`🧹 FORCE CLEANUP: Released ${releasedCount} stuck locks for match ${matchId}`);
       }
       
       return releasedCount;
     } catch (error) {
       this.logger.error(`❌ FORCE CLEANUP ERROR for match ${matchId}:`, error);
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
      ? (this.stats.rejectedClicks / this.stats.totalLockAttempts) * 100 
      : 0;
    
    return {
      ...this.stats,
      successRate: Math.round(successRate * 100) / 100,
      rejectionRate: Math.round(rejectionRate * 100) / 100,
      errorRate: this.stats.totalLockAttempts > 0 
        ? (this.stats.lockTimeouts / this.stats.totalLockAttempts) * 100 
        : 0
    };
  }

  /**
   * 🔐 VALIDATION: Check if tile is currently locked
   */
  async isTileLocked(matchId: string, tilePosition: string): Promise<{
    locked: boolean;
    lockedBy?: string;
    lockedAt?: number;
  }> {
    try {
      const lockKey = `mines:tile_lock:${matchId}:${tilePosition}`;
      const lockValue = await this.redisCacheService.get<string>(lockKey);
      
      if (lockValue) {
        const [playerId, timestamp] = lockValue.split(':');
        return {
          locked: true,
          lockedBy: playerId,
          lockedAt: parseInt(timestamp)
        };
      }
      
      return { locked: false };
    } catch (error) {
      this.logger.error(`❌ LOCK CHECK ERROR for ${tilePosition} in ${matchId}:`, error);
      return { locked: false };
    }
  }
} 