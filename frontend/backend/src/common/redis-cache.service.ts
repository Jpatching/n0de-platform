import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheService.name);
  private redis: Redis | null = null;
  private readonly fallbackCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private cleanupInterval: NodeJS.Timeout;
  private reconnectInterval: NodeJS.Timeout | null = null;
  private redisHealthy = false;
  
  // 🚀 PERFORMANCE: Cache configuration for thousands of users
  private readonly DEFAULT_TTL = 30000; // 30 seconds
  private readonly MAX_CACHE_SIZE = 10000; // Prevent memory leaks
  private readonly CLEANUP_INTERVAL = 60000; // 1 minute cleanup
  private readonly RECONNECT_INTERVAL = 5000; // 5 seconds reconnect attempts

  constructor() {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.CLEANUP_INTERVAL);
  }

  async onModuleInit() {
    try {
      // 🚀 CRITICAL: Connect to Railway Redis
      if (process.env.REDIS_URL && process.env.ENABLE_REDIS_CACHE === 'true') {
        await this.connectToRedis();
        
        // 🚀 INTELLIGENT: Auto-reconnect if Redis goes down
        this.reconnectInterval = setInterval(async () => {
          if (!this.redisHealthy) {
            this.logger.log('🔄 Attempting Redis reconnection...');
            await this.connectToRedis();
          }
        }, this.RECONNECT_INTERVAL);
      } else {
        this.logger.warn('⚠️  Redis not configured - Using fallback in-memory cache');
      }
    } catch (error) {
      this.logger.error('❌ Failed to initialize Redis, falling back to in-memory cache:', error);
    }
  }

  private async connectToRedis(): Promise<void> {
    try {
      if (this.redis) {
        await this.redis.disconnect();
      }

      // 🚀 CRITICAL: Railway Redis connection with proper URL parsing
      const redisUrl = process.env.REDIS_URL!;
      this.logger.log(`🔗 Connecting to Redis: ${redisUrl.replace(/\/\/.*@/, '//***@')}`);

      this.redis = new Redis(redisUrl, {
        connectTimeout: 10000,
        lazyConnect: true,
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        keepAlive: 30000,
        family: 4, // Force IPv4 for Railway compatibility
        // Railway-specific settings
        tls: redisUrl.startsWith('rediss://') ? {} : undefined,
      });

      // Set up event handlers
      this.redis.on('connect', () => {
        this.logger.log('🔗 Redis connecting to Railway...');
      });

      this.redis.on('ready', () => {
        this.redisHealthy = true;
        this.logger.log('✅ Redis connected to Railway successfully');
        
        // Clear fallback cache when Redis comes back online
        if (this.fallbackCache.size > 0) {
          this.logger.log(`🔄 Redis reconnected - Clearing ${this.fallbackCache.size} fallback cache entries`);
          this.fallbackCache.clear();
        }
      });

      this.redis.on('error', (error) => {
        this.redisHealthy = false;
        this.logger.error('❌ Railway Redis connection error:', error.message);
      });

      this.redis.on('close', () => {
        this.redisHealthy = false;
        this.logger.warn('⚠️  Railway Redis connection closed');
      });

      this.redis.on('reconnecting', (delay) => {
        this.logger.log(`🔄 Redis reconnecting in ${delay}ms...`);
      });

      // Connect manually with timeout
      await Promise.race([
        this.redis.connect(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Redis connection timeout after 15s')), 15000)
        )
      ]);
      
      // Test connection with ping
      const pingResult = await this.redis.ping();
      this.logger.log(`🚀 Railway Redis connection verified: ${pingResult}`);
      
    } catch (error) {
      this.redisHealthy = false;
      this.redis = null;
      this.logger.error('❌ Railway Redis connection failed, using fallback cache:', {
        message: error.message,
        code: error.code,
        errno: error.errno,
        stack: error.stack?.split('\n').slice(0, 3).join('\n') // First 3 lines of stack
      });
    }
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
    }
    if (this.redis) {
      this.redis.disconnect();
    }
  }

  /**
   * 🚀 PERFORMANCE: Get cached data with Redis or intelligent fallback
   */
  async get<T>(key: string): Promise<T | null> {
    // 🚀 PRIORITY 1: Try Redis if healthy
    if (this.redis && this.redisHealthy) {
      try {
        const data = await this.redis.get(key);
        return data ? JSON.parse(data) : null;
      } catch (error) {
        this.logger.warn(`Redis GET error for key ${key}:`, error.message);
        this.redisHealthy = false; // Mark as unhealthy for auto-reconnect
      }
    }

    // 🚀 PRIORITY 2: Fallback to memory cache
    const entry = this.fallbackCache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.fallbackCache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * 🚀 PERFORMANCE: Set data in Redis with intelligent fallback
   */
  async set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): Promise<void> {
    // 🚀 PRIORITY 1: Try Redis if healthy
    if (this.redis && this.redisHealthy) {
      try {
        await this.redis.setex(key, Math.floor(ttl / 1000), JSON.stringify(data));
        return; // Success - no need for fallback
      } catch (error) {
        this.logger.warn(`Redis SET error for key ${key}:`, error.message);
        this.redisHealthy = false; // Mark as unhealthy for auto-reconnect
      }
    }

    // 🚀 PRIORITY 2: Store in memory cache as backup
    if (this.fallbackCache.size >= this.MAX_CACHE_SIZE) {
      this.evictOldest();
    }

    this.fallbackCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * 🚀 PERFORMANCE: Get or set pattern for database queries
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = this.DEFAULT_TTL
  ): Promise<T> {
    // Try cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch and cache
    const data = await fetcher();
    await this.set(key, data, ttl);
    return data;
  }

  /**
   * 🚀 PERFORMANCE: Delete specific cache entry
   */
  async delete(key: string): Promise<void> {
    try {
      if (this.redis) {
        await this.redis.del(key);
        return;
      }
    } catch (error) {
      this.logger.warn(`Redis DELETE error for key ${key}:`, error);
    }

    this.fallbackCache.delete(key);
  }

  /**
   * 🚀 PERFORMANCE: Clear cache by pattern
   */
  async deletePattern(pattern: string): Promise<void> {
    try {
      if (this.redis) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
        return;
      }
    } catch (error) {
      this.logger.warn(`Redis DELETE PATTERN error for pattern ${pattern}:`, error);
    }

    // Fallback pattern matching
    const regex = new RegExp(pattern.replace('*', '.*'));
    for (const key of this.fallbackCache.keys()) {
      if (regex.test(key)) {
        this.fallbackCache.delete(key);
      }
    }
  }

  /**
   * 🚀 PERFORMANCE: Clear all cache
   */
  async clear(): Promise<void> {
    try {
      if (this.redis) {
        await this.redis.flushdb();
        return;
      }
    } catch (error) {
      this.logger.warn('Redis CLEAR error:', error);
    }

    this.fallbackCache.clear();
  }

  /**
   * 🚀 PERFORMANCE: Get cache statistics
   */
  async getStats(): Promise<{
    size: number;
    maxSize: number;
    hitRate: number;
    memoryUsage: string;
    redisConnected: boolean;
  }> {
    let size = this.fallbackCache.size;
    let redisConnected = false;

    try {
      if (this.redis) {
        const info = await this.redis.info('memory');
        redisConnected = true;
        // Parse Redis memory info if needed
      }
    } catch (error) {
      this.logger.warn('Redis STATS error:', error);
    }

    return {
      size,
      maxSize: this.MAX_CACHE_SIZE,
      hitRate: 0, // Would need hit/miss tracking for real implementation
      memoryUsage: `${Math.round(size * 0.1)} KB`,
      redisConnected
    };
  }

  /**
   * 🚀 PERFORMANCE: Batch operations for better throughput
   */
  async batchGet<T>(keys: string[]): Promise<Map<string, T>> {
    const results = new Map<string, T>();
    
    try {
      if (this.redis && keys.length > 0) {
        const pipeline = this.redis.pipeline();
        keys.forEach(key => pipeline.get(key));
        const redisResults = await pipeline.exec();
        
        if (redisResults) {
          keys.forEach((key, index) => {
            const [err, value] = redisResults[index];
            if (!err && value) {
              try {
                results.set(key, JSON.parse(value as string));
              } catch (parseError) {
                this.logger.warn(`JSON parse error for key ${key}:`, parseError);
              }
            }
          });
        }
        return results;
      }
    } catch (error) {
      this.logger.warn('Redis BATCH GET error:', error);
    }

    // Fallback to individual gets
    for (const key of keys) {
      const value = await this.get<T>(key);
      if (value !== null) {
        results.set(key, value);
      }
    }
    
    return results;
  }

  /**
   * 🚀 PERFORMANCE: Batch set operations
   */
  async batchSet<T>(entries: Array<{ key: string; data: T; ttl?: number }>): Promise<void> {
    try {
      if (this.redis && entries.length > 0) {
        const pipeline = this.redis.pipeline();
        entries.forEach(({ key, data, ttl = this.DEFAULT_TTL }) => {
          pipeline.setex(key, Math.floor(ttl / 1000), JSON.stringify(data));
        });
        await pipeline.exec();
        return;
      }
    } catch (error) {
      this.logger.warn('Redis BATCH SET error:', error);
    }

    // Fallback to individual sets
    for (const entry of entries) {
      await this.set(entry.key, entry.data, entry.ttl);
    }
  }

  /**
   * 🚀 PERFORMANCE: Cleanup expired entries (fallback only)
   */
  private cleanup(): void {
    if (this.redis) return; // Redis handles TTL automatically

    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.fallbackCache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.fallbackCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} expired fallback cache entries`);
    }
  }

  /**
   * 🚀 PERFORMANCE: Evict oldest entries when cache is full (fallback only)
   */
  private evictOldest(): void {
    if (this.redis) return;

    let oldestKey: string | null = null;
    let oldestTimestamp = Date.now();

    for (const [key, entry] of this.fallbackCache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.fallbackCache.delete(oldestKey);
      this.logger.debug(`Evicted oldest fallback cache entry: ${oldestKey}`);
    }
  }

  /**
   * 🚀 PERFORMANCE: Cache warming for frequently accessed data
   */
  async warmCache(warmupData: Array<{ key: string; fetcher: () => Promise<any>; ttl?: number }>): Promise<void> {
    this.logger.log(`🔥 Warming cache with ${warmupData.length} entries...`);
    
    const warmupPromises = warmupData.map(async ({ key, fetcher, ttl }) => {
      try {
        const data = await fetcher();
        await this.set(key, data, ttl);
      } catch (error) {
        this.logger.warn(`Failed to warm cache for key ${key}:`, error);
      }
    });

    await Promise.all(warmupPromises);
    this.logger.log('🚀 Cache warming completed');
  }
} 