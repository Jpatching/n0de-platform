import { Injectable, Logger } from '@nestjs/common';
import { RedisCacheService } from '../../common/redis-cache.service';

export interface RateLimitResult {
  allowed: boolean;
  remainingRequests: number;
  resetTime: number;
  shouldBan?: boolean;
  reason?: string;
}

@Injectable()
export class SecurityRateLimitService {
  private readonly logger = new Logger(SecurityRateLimitService.name);

  // 🛡️ MINES-OPTIMIZED RATE LIMITS (Allows aggressive legitimate gameplay)
  private readonly TILE_CLICK_LIMIT = 100; // 100 clicks per minute (aggressive miners)
  private readonly TILE_CLICK_WINDOW = 60000; // 1 minute window
  private readonly BURST_LIMIT = 25; // Max 25 clicks in 10 seconds (full game)
  private readonly BURST_WINDOW = 10000; // 10 seconds
  private readonly IP_LIMIT = 500; // 500 clicks per IP per minute (multiple accounts)
  private readonly HOURLY_LIMIT = 5000; // 5000 clicks per player per hour (marathon sessions)
  private readonly HOURLY_WINDOW = 3600000; // 1 hour

  // 🛡️ BAN THRESHOLDS
  private readonly BAN_THRESHOLD_BURST = 3; // 3 burst violations = temp ban
  private readonly BAN_THRESHOLD_SUSTAINED = 5; // 5 sustained violations = longer ban

  constructor(
    private readonly redisCacheService: RedisCacheService,
  ) {
    this.logger.log('🛡️ RATE-LIMIT: Security rate limiting initialized');
  }

  /**
   * 🛡️ CRITICAL: Check tile click rate limits
   */
  async checkTileClickRate(playerId: string, ipAddress?: string): Promise<RateLimitResult> {
    const timestamp = Date.now();
    
    try {
      // 🔴 CRITICAL: Player-based rate limiting
      const playerResult = await this.checkPlayerRateLimit(playerId, timestamp);
      if (!playerResult.allowed) {
        return playerResult;
      }

      // 🔴 CRITICAL: Burst detection (prevents rapid fire clicking)
      const burstResult = await this.checkBurstRateLimit(playerId, timestamp);
      if (!burstResult.allowed) {
        await this.recordViolation(playerId, 'BURST_LIMIT', burstResult);
        return burstResult;
      }

      // 🔴 CRITICAL: IP-based rate limiting (prevents multiple accounts)
      if (ipAddress) {
        const ipResult = await this.checkIPRateLimit(ipAddress, timestamp);
        if (!ipResult.allowed) {
          return ipResult;
        }
      }

      // 🔴 CRITICAL: Hourly limit check (prevents sustained abuse)
      const hourlyResult = await this.checkHourlyLimit(playerId, timestamp);
      if (!hourlyResult.allowed) {
        await this.recordViolation(playerId, 'HOURLY_LIMIT', hourlyResult);
        return hourlyResult;
      }

      // ✅ All rate limits passed - record the request
      await this.recordRequest(playerId, ipAddress, timestamp);

      return {
        allowed: true,
        remainingRequests: this.TILE_CLICK_LIMIT - playerResult.currentCount,
        resetTime: playerResult.resetTime
      };

    } catch (error) {
      this.logger.error('❌ Rate limit check error:', error);
      
      // FAIL SECURE: Block on error
      return {
        allowed: false,
        remainingRequests: 0,
        resetTime: timestamp + this.TILE_CLICK_WINDOW,
        reason: 'Rate limit system error'
      };
    }
  }

  /**
   * 🛡️ Player-specific rate limiting
   */
  private async checkPlayerRateLimit(playerId: string, timestamp: number): Promise<RateLimitResult & { currentCount: number }> {
    const key = `rate:player:${playerId}`;
    const windowStart = timestamp - this.TILE_CLICK_WINDOW;
    
    // Get current requests in window
    const requests = await this.redisCacheService.get<number[]>(key) || [];
    const validRequests = requests.filter(time => time > windowStart);
    
    const currentCount = validRequests.length;
    const resetTime = timestamp + this.TILE_CLICK_WINDOW;

    if (currentCount >= this.TILE_CLICK_LIMIT) {
      return {
        allowed: false,
        remainingRequests: 0,
        resetTime,
        currentCount,
        reason: 'Player rate limit exceeded'
      };
    }

    return {
      allowed: true,
      remainingRequests: this.TILE_CLICK_LIMIT - currentCount,
      resetTime,
      currentCount
    };
  }

  /**
   * 🛡️ Burst detection (rapid consecutive clicks)
   */
  private async checkBurstRateLimit(playerId: string, timestamp: number): Promise<RateLimitResult> {
    const key = `burst:player:${playerId}`;
    const windowStart = timestamp - this.BURST_WINDOW;
    
    const requests = await this.redisCacheService.get<number[]>(key) || [];
    const validRequests = requests.filter(time => time > windowStart);
    
    if (validRequests.length >= this.BURST_LIMIT) {
      // Check if this is a repeat offender
      const violationCount = await this.getViolationCount(playerId, 'BURST_LIMIT');
      const shouldBan = violationCount >= this.BAN_THRESHOLD_BURST;
      
      return {
        allowed: false,
        remainingRequests: 0,
        resetTime: timestamp + this.BURST_WINDOW,
        shouldBan,
        reason: 'Burst rate limit exceeded (too many rapid clicks)'
      };
    }

    return {
      allowed: true,
      remainingRequests: this.BURST_LIMIT - validRequests.length,
      resetTime: timestamp + this.BURST_WINDOW
    };
  }

  /**
   * 🛡️ IP-based rate limiting (prevents multi-account abuse)
   */
  private async checkIPRateLimit(ipAddress: string, timestamp: number): Promise<RateLimitResult> {
    const key = `rate:ip:${ipAddress}`;
    const windowStart = timestamp - this.TILE_CLICK_WINDOW;
    
    const requests = await this.redisCacheService.get<number[]>(key) || [];
    const validRequests = requests.filter(time => time > windowStart);
    
    if (validRequests.length >= this.IP_LIMIT) {
      return {
        allowed: false,
        remainingRequests: 0,
        resetTime: timestamp + this.TILE_CLICK_WINDOW,
        reason: 'IP rate limit exceeded'
      };
    }

    return {
      allowed: true,
      remainingRequests: this.IP_LIMIT - validRequests.length,
      resetTime: timestamp + this.TILE_CLICK_WINDOW
    };
  }

  /**
   * 🛡️ Hourly limit check (prevents sustained abuse)
   */
  private async checkHourlyLimit(playerId: string, timestamp: number): Promise<RateLimitResult> {
    const key = `hourly:player:${playerId}`;
    const windowStart = timestamp - this.HOURLY_WINDOW;
    
    const requests = await this.redisCacheService.get<number[]>(key) || [];
    const validRequests = requests.filter(time => time > windowStart);
    
    if (validRequests.length >= this.HOURLY_LIMIT) {
      // Check if this indicates sustained abuse
      const violationCount = await this.getViolationCount(playerId, 'HOURLY_LIMIT');
      const shouldBan = violationCount >= this.BAN_THRESHOLD_SUSTAINED;
      
      return {
        allowed: false,
        remainingRequests: 0,
        resetTime: timestamp + this.HOURLY_WINDOW,
        shouldBan,
        reason: 'Hourly rate limit exceeded'
      };
    }

    return {
      allowed: true,
      remainingRequests: this.HOURLY_LIMIT - validRequests.length,
      resetTime: timestamp + this.HOURLY_WINDOW
    };
  }

  /**
   * 🛡️ Record valid request for rate limiting
   */
  private async recordRequest(playerId: string, ipAddress: string | undefined, timestamp: number): Promise<void> {
    const promises: Promise<void>[] = [];

    // Record player request
    promises.push(this.addRequest(`rate:player:${playerId}`, timestamp, this.TILE_CLICK_WINDOW));
    promises.push(this.addRequest(`burst:player:${playerId}`, timestamp, this.BURST_WINDOW));
    promises.push(this.addRequest(`hourly:player:${playerId}`, timestamp, this.HOURLY_WINDOW));

    // Record IP request if provided
    if (ipAddress) {
      promises.push(this.addRequest(`rate:ip:${ipAddress}`, timestamp, this.TILE_CLICK_WINDOW));
    }

    await Promise.all(promises);
  }

  /**
   * 🛡️ Add request to rate limit tracking
   */
  private async addRequest(key: string, timestamp: number, windowSize: number): Promise<void> {
    const requests = await this.redisCacheService.get<number[]>(key) || [];
    const windowStart = timestamp - windowSize;
    
    // Clean old requests and add new one
    const validRequests = requests.filter(time => time > windowStart);
    validRequests.push(timestamp);
    
    // Store with TTL slightly longer than window
    await this.redisCacheService.set(key, validRequests, windowSize + 60000);
  }

  /**
   * 🛡️ Record rate limit violation
   */
  private async recordViolation(playerId: string, violationType: string, violationData: any): Promise<void> {
    const key = `violations:rate:${playerId}`;
    const violations = await this.redisCacheService.get<any[]>(key) || [];
    
    violations.push({
      type: violationType,
      timestamp: Date.now(),
      data: violationData
    });
    
    // Keep only last 100 violations
    if (violations.length > 100) {
      violations.splice(0, violations.length - 100);
    }
    
    await this.redisCacheService.set(key, violations, 604800000); // 7 days TTL
    
    this.logger.warn(`🚨 RATE LIMIT VIOLATION: ${playerId} - ${violationType}`, violationData);
  }

  /**
   * 🛡️ Get violation count for specific type
   */
  private async getViolationCount(playerId: string, violationType: string): Promise<number> {
    const key = `violations:rate:${playerId}`;
    const violations = await this.redisCacheService.get<any[]>(key) || [];
    
    // Count violations of specific type in last hour
    const oneHourAgo = Date.now() - 3600000;
    return violations.filter(v => 
      v.type === violationType && v.timestamp > oneHourAgo
    ).length;
  }

  /**
   * 🛡️ Get current rate limit status for player
   */
  async getRateLimitStatus(playerId: string): Promise<{
    playerLimit: { current: number; max: number; resetTime: number };
    burstLimit: { current: number; max: number; resetTime: number };
    hourlyLimit: { current: number; max: number; resetTime: number };
    violations: number;
  }> {
    const timestamp = Date.now();
    
    const [playerRequests, burstRequests, hourlyRequests, violations] = await Promise.all([
      this.redisCacheService.get<number[]>(`rate:player:${playerId}`) || [],
      this.redisCacheService.get<number[]>(`burst:player:${playerId}`) || [],
      this.redisCacheService.get<number[]>(`hourly:player:${playerId}`) || [],
      this.redisCacheService.get<any[]>(`violations:rate:${playerId}`) || []
    ]);

    const playerValid = playerRequests.filter(time => time > timestamp - this.TILE_CLICK_WINDOW);
    const burstValid = burstRequests.filter(time => time > timestamp - this.BURST_WINDOW);
    const hourlyValid = hourlyRequests.filter(time => time > timestamp - this.HOURLY_WINDOW);
    const recentViolations = violations.filter(v => v.timestamp > timestamp - 3600000);

    return {
      playerLimit: {
        current: playerValid.length,
        max: this.TILE_CLICK_LIMIT,
        resetTime: timestamp + this.TILE_CLICK_WINDOW
      },
      burstLimit: {
        current: burstValid.length,
        max: this.BURST_LIMIT,
        resetTime: timestamp + this.BURST_WINDOW
      },
      hourlyLimit: {
        current: hourlyValid.length,
        max: this.HOURLY_LIMIT,
        resetTime: timestamp + this.HOURLY_WINDOW
      },
      violations: recentViolations.length
    };
  }
} 