import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const redisUrl = this.configService.get("REDIS_URL");

    // Skip Redis initialization if no URL provided
    if (!redisUrl) {
      console.log("⚠️  No REDIS_URL provided, continuing without Redis cache");
      this.client = null;
      return;
    }

    // backend-optimized connection configuration
    const connectionOptions = {
      maxRetriesPerRequest: 5,
      lazyConnect: true,
      connectTimeout: 10000, // Increased for backend networking
      enableReadyCheck: true,
      keepAlive: 30000,
      retryDelayOnFailover: 100,
      family: 0, // Allow both IPv4 and IPv6
    };

    try {
      console.log(
        "🔌 Attempting Redis connection with backend variable reference...",
      );
      this.client = new Redis(redisUrl, connectionOptions);

      this.client.on("connect", () => {
        console.log("✅ Redis connected successfully");
      });

      this.client.on("error", (error) => {
        console.log(`⚠️  Redis connection error: ${error.message}`);
        console.log(
          "🔄 backend Redis networking issue - app will continue without cache",
        );
        // Don't crash the app, continue without Redis
        this.client = null;
      });

      this.client.on("close", () => {
        console.log("📴 Redis connection closed");
      });

      // Try to connect with increased timeout for backend
      const connectPromise = this.client.connect();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error("backend Redis connection timeout (15s)")),
          15000,
        );
      });

      await Promise.race([connectPromise, timeoutPromise]);
      console.log(
        "✅ Redis initialization completed - backend variable reference resolved",
      );
    } catch (error) {
      console.log(`⚠️  Failed to initialize Redis: ${error.message}`);
      console.log("⚠️  Continuing without Redis cache");
      this.client = null;
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      try {
        await this.client.quit();
        console.log("📦 Redis disconnected");
      } catch (error) {
        console.error("Error disconnecting Redis:", error.message);
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
      console.error("Redis get error:", error.message);
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
      console.error("Redis set error:", error.message);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.del(key);
    } catch (error) {
      console.error("Redis del error:", error.message);
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.client) return false;
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error("Redis exists error:", error.message);
      return false;
    }
  }

  // Rate limiting
  async incrementRateLimit(
    key: string,
    window: number,
    limit: number,
  ): Promise<{
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
      reset: windowStart + window * 1000,
      allowed: count <= limit,
    };
  }

  // Session management
  async setSession(
    sessionId: string,
    data: any,
    ttl: number = 3600 * 24 * 7,
  ): Promise<void> {
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
  async cacheApiKey(
    keyHash: string,
    keyData: any,
    ttl: number = 300,
  ): Promise<void> {
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

  async subscribe(
    channel: string,
    callback: (message: any) => void,
  ): Promise<void> {
    const subscriber = this.client.duplicate();
    await subscriber.subscribe(channel);
    subscriber.on("message", (receivedChannel, message) => {
      if (receivedChannel === channel) {
        try {
          const parsed = JSON.parse(message);
          callback(parsed);
        } catch (error) {
          console.error("Error parsing Redis message:", error);
        }
      }
    });
  }

  // Additional Redis operations
  async incr(key: string): Promise<number> {
    if (!this.client) return 0;
    try {
      return await this.client.incr(key);
    } catch (error) {
      console.error("Redis incr error:", error.message);
      return 0;
    }
  }

  async increment(
    key: string,
    amount: number = 1,
    ttl?: number,
  ): Promise<number> {
    if (!this.client) return 0;
    try {
      const result = await this.client.incrby(key, amount);
      if (ttl) {
        await this.client.expire(key, ttl);
      }
      return result;
    } catch (error) {
      console.error("Redis increment error:", error.message);
      return 0;
    }
  }

  async expire(key: string, seconds: number): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.expire(key, seconds);
    } catch (error) {
      console.error("Redis expire error:", error.message);
    }
  }

  async zadd(key: string, score: number, member: string): Promise<number> {
    if (!this.client) return 0;
    try {
      return await this.client.zadd(key, score, member);
    } catch (error) {
      console.error("Redis zadd error:", error.message);
      return 0;
    }
  }

  async zremrangebyscore(
    key: string,
    min: string,
    max: string,
  ): Promise<number> {
    if (!this.client) return 0;
    try {
      return await this.client.zremrangebyscore(key, min, max);
    } catch (error) {
      console.error("Redis zremrangebyscore error:", error.message);
      return 0;
    }
  }

  // Additional Redis methods needed by billing services
  async setex(key: string, ttl: number, value: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.setex(key, ttl, value);
    } catch (error) {
      console.error("Redis setex error:", error.message);
    }
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    if (!this.client) return {};
    try {
      return await this.client.hgetall(key);
    } catch (error) {
      console.error("Redis hgetall error:", error.message);
      return {};
    }
  }

  async keys(pattern: string): Promise<string[]> {
    if (!this.client) return [];
    try {
      return await this.client.keys(pattern);
    } catch (error) {
      console.error("Redis keys error:", error.message);
      return [];
    }
  }

  pipeline() {
    if (!this.client) return null;
    return this.client.pipeline();
  }

  async zrangebyscore(
    key: string,
    min: string | number,
    max: string | number,
  ): Promise<string[]> {
    if (!this.client) return [];
    try {
      return await this.client.zrangebyscore(key, min, max);
    } catch (error) {
      console.error("Redis zrangebyscore error:", error.message);
      return [];
    }
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    if (!this.client) return [];
    try {
      return await this.client.lrange(key, start, stop);
    } catch (error) {
      console.error("Redis lrange error:", error.message);
      return [];
    }
  }

  async lpush(key: string, ...values: string[]): Promise<number> {
    if (!this.client) return 0;
    try {
      return await this.client.lpush(key, ...values);
    } catch (error) {
      console.error("Redis lpush error:", error.message);
      return 0;
    }
  }

  async hincrby(
    key: string,
    field: string,
    increment: number,
  ): Promise<number> {
    if (!this.client) return 0;
    try {
      return await this.client.hincrby(key, field, increment);
    } catch (error) {
      console.error("Redis hincrby error:", error.message);
      return 0;
    }
  }

  // Health check
  async isHealthy(): Promise<boolean> {
    if (!this.client) return false;
    try {
      const result = await this.client.ping();
      return result === "PONG";
    } catch (error) {
      console.error("Redis health check failed:", error);
      return false;
    }
  }

  // Metrics storage
  async recordMetric(
    key: string,
    value: number,
    timestamp?: number,
  ): Promise<void> {
    const ts = timestamp || Date.now();
    await this.client.zadd(`metrics:${key}`, ts, `${value}:${ts}`);

    // Keep only last 24 hours of metrics
    const cutoff = ts - 24 * 60 * 60 * 1000;
    await this.client.zremrangebyscore(`metrics:${key}`, "-inf", cutoff);
  }

  async getMetrics(
    key: string,
    from?: number,
    to?: number,
  ): Promise<Array<{ value: number; timestamp: number }>> {
    const fromScore = from || "-inf";
    const toScore = to || "+inf";

    const results = await this.client.zrangebyscore(
      `metrics:${key}`,
      fromScore,
      toScore,
    );

    return results.map((item) => {
      const [value, timestamp] = item.split(":");
      return {
        value: parseFloat(value),
        timestamp: parseInt(timestamp),
      };
    });
  }
}
