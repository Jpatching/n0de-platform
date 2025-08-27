import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;
  
  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const redisUrl = this.configService.get('REDIS_URL');
    
    // Skip Redis initialization if no URL provided
    if (!redisUrl) {
      console.log('⚠️  No REDIS_URL provided, continuing without Redis cache');
      this.client = null;
      return;
    }
    
    try {
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        connectTimeout: 5000,
        enableReadyCheck: true,
        keepAlive: 30000,
      });

      this.client.on('connect', () => {
        console.log('✅ Redis connected successfully');
      });

      this.client.on('error', (error) => {
        console.log(`⚠️  Redis connection error: ${error.message}`);
        // Don't crash the app, continue without Redis
        this.client = null;
      });

      this.client.on('close', () => {
        console.log('📴 Redis connection closed');
      });

      // Try to connect with timeout
      const connectPromise = this.client.connect();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });
      
      await Promise.race([connectPromise, timeoutPromise]);
      console.log('✅ Redis initialization completed');
      
    } catch (error) {
      console.log(`⚠️  Failed to initialize Redis: ${error.message}`);
      console.log('⚠️  Continuing without Redis cache');
      this.client = null;
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      try {
        await this.client.quit();
        console.log('📦 Redis disconnected');
      } catch (error) {
        console.error('Error disconnecting Redis:', error.message);
      }
    }
  }

  getClient(): Redis {
    return this.client;
  }

  // Cache operations
  async get(key: string): Promise<string | null> {
    if (!this.client) return null;
    try {
      return await this.client.get(key);
    } catch (error) {
      console.error('Redis get error:', error.message);
      return null;
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (!this.client) return;
    try {
      if (ttl) {
        await this.client.setex(key, ttl, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      console.error('Redis set error:', error.message);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.del(key);
    } catch (error) {
      console.error('Redis del error:', error.message);
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.client) return false;
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Redis exists error:', error.message);
      return false;
    }
  }

  // Rate limiting
  async incrementRateLimit(key: string, window: number, limit: number): Promise<{
    count: number;
    remaining: number;
    reset: number;
    allowed: boolean;
  }> {
    const multi = this.client.multi();
    const now = Date.now();
    const windowStart = Math.floor(now / (window * 1000)) * (window * 1000);
    const windowKey = `${key}:${windowStart}`;

    multi.incr(windowKey);
    multi.expire(windowKey, window);
    
    const results = await multi.exec();
    const count = results[0][1] as number;
    
    return {
      count,
      remaining: Math.max(0, limit - count),
      reset: windowStart + (window * 1000),
      allowed: count <= limit,
    };
  }

  // Session management
  async setSession(sessionId: string, data: any, ttl: number = 3600 * 24 * 7): Promise<void> {
    await this.client.setex(`session:${sessionId}`, ttl, JSON.stringify(data));
  }

  async getSession(sessionId: string): Promise<any | null> {
    const data = await this.client.get(`session:${sessionId}`);
    return data ? JSON.parse(data) : null;
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.client.del(`session:${sessionId}`);
  }

  // API key caching
  async cacheApiKey(keyHash: string, keyData: any, ttl: number = 300): Promise<void> {
    await this.client.setex(`apikey:${keyHash}`, ttl, JSON.stringify(keyData));
  }

  async getCachedApiKey(keyHash: string): Promise<any | null> {
    const data = await this.client.get(`apikey:${keyHash}`);
    return data ? JSON.parse(data) : null;
  }

  // Pub/Sub for real-time features
  async publish(channel: string, message: any): Promise<void> {
    await this.client.publish(channel, JSON.stringify(message));
  }

  async subscribe(channel: string, callback: (message: any) => void): Promise<void> {
    const subscriber = this.client.duplicate();
    await subscriber.subscribe(channel);
    subscriber.on('message', (receivedChannel, message) => {
      if (receivedChannel === channel) {
        try {
          const parsed = JSON.parse(message);
          callback(parsed);
        } catch (error) {
          console.error('Error parsing Redis message:', error);
        }
      }
    });
  }

  // Health check
  async isHealthy(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Redis health check failed:', error);
      return false;
    }
  }

  // Metrics storage
  async recordMetric(key: string, value: number, timestamp?: number): Promise<void> {
    const ts = timestamp || Date.now();
    await this.client.zadd(`metrics:${key}`, ts, `${value}:${ts}`);
    
    // Keep only last 24 hours of metrics
    const cutoff = ts - (24 * 60 * 60 * 1000);
    await this.client.zremrangebyscore(`metrics:${key}`, '-inf', cutoff);
  }

  async getMetrics(key: string, from?: number, to?: number): Promise<Array<{ value: number; timestamp: number }>> {
    const fromScore = from || '-inf';
    const toScore = to || '+inf';
    
    const results = await this.client.zrangebyscore(`metrics:${key}`, fromScore, toScore);
    
    return results.map(item => {
      const [value, timestamp] = item.split(':');
      return {
        value: parseFloat(value),
        timestamp: parseInt(timestamp),
      };
    });
  }
}