import { Injectable, Logger } from '@nestjs/common';
import { MinesValidationService } from './mines-validation.service';
import { SuspiciousActivityService } from './suspicious-activity.service';
import { SecurityRateLimitService } from './security-rate-limit.service';
import { AntiCheatAuditService } from './anti-cheat-audit.service';
import { RedisCacheService } from '../../common/redis-cache.service';

export interface AntiCheatResult {
  allowed: boolean;
  reason?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  suspiciousScore: number;
  shouldBan?: boolean;
  auditData?: any;
}

export interface TileClickValidation {
  matchId: string;
  playerId: string;
  tilePosition: string;
  timestamp: number;
  clientState?: any;
  userAgent?: string;
  ipAddress?: string;
}

@Injectable()
export class AntiCheatService {
  private readonly logger = new Logger(AntiCheatService.name);

  constructor(
    private readonly minesValidation: MinesValidationService,
    private readonly suspiciousActivity: SuspiciousActivityService,
    private readonly rateLimitService: SecurityRateLimitService,
    private readonly auditService: AntiCheatAuditService,
    private readonly redisCacheService: RedisCacheService,
  ) {
    this.logger.log('🛡️ ANTI-CHEAT: Security system initialized');
  }

  /**
   * 🛡️ MAIN ENTRY POINT: Validate all aspects of a tile click
   */
  async validateTileClick(validation: TileClickValidation): Promise<AntiCheatResult> {
    const startTime = Date.now();
    
    try {
      // 🔴 CRITICAL: Rate limiting check (prevents spam attacks)
      const rateLimitResult = await this.rateLimitService.checkTileClickRate(
        validation.playerId,
        validation.ipAddress
      );
      
      if (!rateLimitResult.allowed) {
        await this.auditService.logSecurityEvent({
          playerId: validation.playerId,
          event: 'RATE_LIMIT_EXCEEDED',
          severity: 'high',
          data: rateLimitResult,
          timestamp: Date.now()
        });
        
        return {
          allowed: false,
          reason: 'Rate limit exceeded - too many clicks',
          severity: 'high',
          suspiciousScore: 85,
          shouldBan: rateLimitResult.shouldBan
        };
      }

      // 🔴 CRITICAL: Game state validation (prevents manipulation)
      const gameValidation = await this.minesValidation.validateGameState(
        validation.matchId,
        validation.playerId,
        validation.tilePosition,
        validation.timestamp
      );
      
      if (!gameValidation.isValid) {
        await this.auditService.logSecurityEvent({
          playerId: validation.playerId,
          event: 'GAME_STATE_MANIPULATION',
          severity: 'critical',
          data: gameValidation,
          timestamp: Date.now()
        });
        
        return {
          allowed: false,
          reason: gameValidation.reason,
          severity: 'critical',
          suspiciousScore: 100,
          shouldBan: true
        };
      }

      // 🔴 CRITICAL: Pattern analysis (detects bots/scripts)
      const patternAnalysis = await this.suspiciousActivity.analyzeClickPattern(
        validation.playerId,
        validation.tilePosition,
        validation.timestamp
      );
      
      if (patternAnalysis.isSuspicious) {
        await this.auditService.logSecurityEvent({
          playerId: validation.playerId,
          event: 'SUSPICIOUS_PATTERN',
          severity: patternAnalysis.severity,
          data: patternAnalysis,
          timestamp: Date.now()
        });
        
        // Don't block immediately for patterns, but flag for review
        if (patternAnalysis.severity === 'critical') {
          return {
            allowed: false,
            reason: 'Automated behavior detected',
            severity: 'critical',
            suspiciousScore: patternAnalysis.suspiciousScore,
            shouldBan: true
          };
        }
      }

      // 🔴 CRITICAL: Timing validation (prevents time manipulation)
      const timingValidation = await this.minesValidation.validateTiming(
        validation.matchId,
        validation.playerId,
        validation.timestamp
      );
      
      if (!timingValidation.isValid) {
        await this.auditService.logSecurityEvent({
          playerId: validation.playerId,
          event: 'TIMING_MANIPULATION',
          severity: 'high',
          data: timingValidation,
          timestamp: Date.now()
        });
        
        return {
          allowed: false,
          reason: 'Invalid timing detected',
          severity: 'high',
          suspiciousScore: 90,
          shouldBan: timingValidation.severity === 'critical'
        };
      }

      // ✅ ALL CHECKS PASSED
      const processingTime = Date.now() - startTime;
      this.logger.debug(`✅ Anti-cheat validation passed for ${validation.playerId} (${processingTime}ms)`);
      
      // Update player trust score (positive behavior)
      await this.suspiciousActivity.updateTrustScore(validation.playerId, 1);
      
      return {
        allowed: true,
        severity: 'low',
        suspiciousScore: Math.max(0, (patternAnalysis?.suspiciousScore || 0) - 5)
      };

    } catch (error) {
      this.logger.error('❌ ANTI-CHEAT: Validation error:', error);
      
      // FAIL SECURE: Block on error
      await this.auditService.logSecurityEvent({
        playerId: validation.playerId,
        event: 'ANTI_CHEAT_ERROR',
        severity: 'medium',
        data: { error: error.message },
        timestamp: Date.now()
      });
      
      return {
        allowed: false,
        reason: 'Security validation failed',
        severity: 'medium',
        suspiciousScore: 50
      };
    }
  }

  /**
   * 🛡️ Validate match state integrity before starting rounds
   */
  async validateMatchIntegrity(matchId: string, playerId: string): Promise<AntiCheatResult> {
    return await this.minesValidation.validateMatchIntegrity(matchId, playerId);
  }

  /**
   * 🛡️ Get player risk assessment
   */
  async getPlayerRiskAssessment(playerId: string): Promise<{
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    trustScore: number;
    recentViolations: number;
    shouldMonitor: boolean;
    shouldBan: boolean;
  }> {
    return await this.suspiciousActivity.getPlayerRiskAssessment(playerId);
  }

  /**
   * 🛡️ Emergency: Ban player and cleanup
   */
  async emergencyBanPlayer(playerId: string, reason: string, evidence: any): Promise<void> {
    this.logger.error(`🚨 EMERGENCY BAN: Player ${playerId} - ${reason}`);
    
    // Log critical security event
    await this.auditService.logSecurityEvent({
      playerId,
      event: 'EMERGENCY_BAN',
      severity: 'critical',
      data: { reason, evidence },
      timestamp: Date.now()
    });
    
    // Set ban flag in Redis (immediate effect)
    await this.redisCacheService.set(`banned:${playerId}`, {
      reason,
      timestamp: Date.now(),
      evidence
    }, 86400000); // 24 hours cache
    
    // TODO: Integration with user service to update database ban status
    // await this.userService.banUser(playerId, reason);
    
    // TODO: Integration with WebSocket to disconnect banned user
    // await this.socketService.disconnectUser(playerId);
  }

  /**
   * 🛡️ Check if player is banned
   */
  async isPlayerBanned(playerId: string): Promise<boolean> {
    const banData = await this.redisCacheService.get(`banned:${playerId}`);
    return !!banData;
  }
} 