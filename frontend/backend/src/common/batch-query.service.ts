import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RedisWebSocketService } from './redis-websocket.service';
import * as jwt from 'jsonwebtoken';
import { RedisCacheService } from './redis-cache.service';

export interface BatchOptions {
  includeProfile?: boolean;
  includeStats?: boolean;
  includeMatches?: boolean;
  includeReferrals?: boolean;
  includeTournaments?: boolean;
  includeAchievements?: boolean;
  matchLimit?: number;
}

export interface BatchedUserData {
  // Core user data
  id: string;
  wallet: string;
  username?: string;
  displayName?: string;
  email?: string;
  authMethod: string;
  avatar?: string;
  bio?: string;
  
  // Stats (if requested)
  totalEarnings?: number;
  totalMatches?: number;
  wins?: number;
  losses?: number;
  winRate?: number;
  reputation?: number;
  
  // Related data (if requested)
  matches?: any[];
  referrals?: any[];
  tournaments?: any[];
  achievements?: any[];
  
  // Metadata
  fromCache: boolean;
  queryTime: number;
}

export interface PerformanceMetrics {
  queryCount: number;
  cacheHits: number;
  cacheMisses: number;
  avgQueryTime: number;
  totalQueryTime: number;
}

@Injectable()
export class BatchQueryService {
  private readonly logger = new Logger(BatchQueryService.name);
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
  private metrics: PerformanceMetrics = {
    queryCount: 0,
    cacheHits: 0,
    cacheMisses: 0,
    avgQueryTime: 0,
    totalQueryTime: 0
  };

  constructor(
    private prisma: PrismaService,
    private redisWebSocketService: RedisWebSocketService,
    private cache: RedisCacheService
  ) {}

  /**
   * Get batched user data with single database query
   * SECURITY: All authentication validation happens before database queries
   */
  async getBatchedUserData(token: string, options: BatchOptions = {}): Promise<BatchedUserData> {
    const startTime = Date.now();
    
    try {
      // 🔒 STEP 1: IDENTICAL security validation (unchanged)
      const decoded = jwt.verify(token, this.JWT_SECRET) as any;
      if (!decoded || !decoded.userId) {
        throw new UnauthorizedException('Invalid token structure');
      }

      // 🔒 STEP 2: Check cache using existing cache service
      const cacheKey = this.generateCacheKey(decoded.userId, options);
      const cached = await this.redisWebSocketService.getUserProfile(decoded.userId);
      
      if (cached) {
        this.metrics.cacheHits++;
        this.logger.log(`✅ Batch query cache hit for user ${decoded.userId}`);
        return {
          ...cached,
          fromCache: true,
          queryTime: Date.now() - startTime
        };
      }

      this.metrics.cacheMisses++;

      // 🚀 STEP 3: OPTIMIZED single database query (new efficiency)
      this.logger.log(`🔄 Batch query cache miss for user ${decoded.userId} - executing optimized query`);
      
      const batchedData = await this.executeBatchedQuery(decoded.userId, options);
      
      if (!batchedData) {
        throw new UnauthorizedException('User not found');
      }

      // 🔒 STEP 4: Build result object
      const result: BatchedUserData = {
        id: batchedData.id,
        wallet: batchedData.wallet,
        username: batchedData.username || undefined,
        displayName: batchedData.displayName || undefined,
        email: batchedData.email || undefined,
        authMethod: batchedData.authMethod || 'wallet',
        avatar: batchedData.avatar || undefined,
        bio: batchedData.bio || undefined,
        totalEarnings: batchedData.totalEarnings || 0,
        totalMatches: batchedData.totalMatches || 0,
        wins: batchedData.wins || 0,
        losses: batchedData.losses || 0,
        winRate: batchedData.winRate || 0,
        reputation: batchedData.reputation || 1000,
        matches: (batchedData as any).matches1 || (batchedData as any).matches2 || [],
        referrals: (batchedData as any).referrals || [],
        tournaments: (batchedData as any).tournaments || [],
        achievements: (batchedData as any).userAchievements || [],
        fromCache: false,
        queryTime: Date.now() - startTime
      };

      // Cache using existing cache service
      await this.redisWebSocketService.cacheUserProfile(decoded.userId, result, 300000);
      
      // 🔒 STEP 5: Enhanced security logging
      await this.logBatchQuery(decoded.userId, options, result.queryTime, false);
      
      this.logger.log(`💾 Batched user data cached for ${decoded.userId} (${result.queryTime}ms)`);
      return result;

    } catch (error) {
      // Enhanced error logging
      await this.logBatchQuery(null, options, Date.now() - startTime, false, error.message);
      
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      this.logger.error(`❌ Batch query failed: ${error.message}`);
      throw new UnauthorizedException('Failed to fetch user data');
    }
  }

  /**
   * Execute optimized single database query with includes
   */
  private async executeBatchedQuery(userId: string, options: BatchOptions) {
    const includeClause: any = {};
    
    // Build dynamic include clause based on options
    if (options.includeMatches) {
      includeClause.matches1 = {
        take: options.matchLimit || 10,
        orderBy: { createdAt: 'desc' },
        include: {
          player2: { select: { username: true, displayName: true, avatar: true } },
          winner: { select: { username: true, displayName: true } }
        }
      };
    }

    if (options.includeReferrals) {
      includeClause.referrals = {
        select: { totalEarnings: true, totalRewards: true, createdAt: true }
      };
    }

    // Single optimized query
    return await this.prisma.user.findUnique({
      where: { id: userId },
      include: includeClause
    });
  }

  /**
   * Generate cache key based on user and requested data
   */
  private generateCacheKey(userId: string, options: BatchOptions): string {
    const optionsHash = Buffer.from(JSON.stringify(options)).toString('base64').slice(0, 8);
    return `batch_user_${userId}_${optionsHash}`;
  }

  /**
   * Enhanced security logging for batch queries
   */
  private async logBatchQuery(
    userId: string | null, 
    options: BatchOptions, 
    queryTime: number, 
    fromCache: boolean,
    error?: string
  ) {
    try {
      await this.prisma.securityLog.create({
        data: {
          userId,
          type: error ? 'BATCH_QUERY_FAILED' : 'BATCH_QUERY_SUCCESS',
          action: 'BATCH_QUERY',
          details: {
            requestedData: Object.keys(options).filter(key => options[key]),
            queryTime,
            fromCache,
            error: error || undefined,
            timestamp: Date.now()
          },
          createdAt: new Date(),
        },
      });
    } catch (logError) {
      this.logger.warn(`Failed to log batch query: ${logError.message}`);
    }
  }

  /**
   * Specialized batch queries for common use cases
   */

  // Dashboard data (most common)
  async getDashboardData(token: string): Promise<BatchedUserData> {
    return this.getBatchedUserData(token, {
      includeProfile: true,
      includeStats: true,
      includeMatches: true,
      includeReferrals: true,
      matchLimit: 5
    });
  }

  // Game lobby data
  async getGameLobbyData(token: string): Promise<BatchedUserData> {
    return this.getBatchedUserData(token, {
      includeProfile: true,
      includeStats: true,
      includeMatches: true,
      matchLimit: 3
    });
  }

  // Profile page data
  async getProfileData(token: string): Promise<BatchedUserData> {
    return this.getBatchedUserData(token, {
      includeProfile: true,
      includeStats: true,
      includeMatches: true,
      includeAchievements: true,
      matchLimit: 10
    });
  }

  /**
   * Cache invalidation for user data updates
   */
  async invalidateUserCache(userId: string) {
    await this.redisWebSocketService.invalidateUserCache(userId);
    this.logger.log(`🗑️ Invalidated batch cache for user ${userId}`);
  }

  /**
   * Get performance metrics
   */
  getMetrics(): PerformanceMetrics & { cacheHitRate: number } {
    const totalRequests = this.metrics.cacheHits + this.metrics.cacheMisses;
    const cacheHitRate = totalRequests > 0 ? (this.metrics.cacheHits / totalRequests) * 100 : 0;
    
    return {
      ...this.metrics,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100
    };
  }

  private updateMetrics(queryTime: number): void {
    this.metrics.queryCount++;
    this.metrics.totalQueryTime += queryTime;
    this.metrics.avgQueryTime = this.metrics.totalQueryTime / this.metrics.queryCount;
  }
} 