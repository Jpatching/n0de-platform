import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as Redis from "ioredis";

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis.Redis;
  private subscriber: Redis.Redis;
  private publisher: Redis.Redis;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const redisConfig = {
      host: this.configService.get("REDIS_HOST", "localhost"),
      port: this.configService.get("REDIS_PORT", 6379),
      password: this.configService.get("REDIS_PASSWORD"),
      db: this.configService.get("REDIS_DB", 0),
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        this.logger.warn(`Retrying Redis connection... Attempt ${times}`);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    };

    try {
      // Main client for general operations
      this.client = new Redis.Redis(redisConfig);

      // Separate clients for pub/sub to avoid blocking
      this.subscriber = new Redis.Redis(redisConfig);
      this.publisher = new Redis.Redis(redisConfig);

      // Error handlers
      this.client.on("error", (error) => {
        this.logger.error("Redis Client Error:", error);
      });

      this.client.on("connect", () => {
        this.logger.log("Redis Client Connected");
      });

      this.client.on("ready", () => {
        this.logger.log("Redis Client Ready");
      });

      // Test connection
      await this.client.ping();
      this.logger.log("Redis connection established successfully");
    } catch (error) {
      this.logger.error("Failed to connect to Redis:", error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await Promise.all([
      this.client?.quit(),
      this.subscriber?.quit(),
      this.publisher?.quit(),
    ]);
    this.logger.log("Redis connections closed");
  }

  // Key-Value Operations
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(
    key: string,
    value: string | number | Buffer,
    ttl?: number,
  ): Promise<"OK"> {
    if (ttl) {
      return this.client.set(key, value, "EX", ttl);
    }
    return this.client.set(key, value);
  }

  async setJSON(key: string, value: any, ttl?: number): Promise<"OK"> {
    const jsonString = JSON.stringify(value);
    return this.set(key, jsonString, ttl);
  }

  async getJSON<T>(key: string): Promise<T | null> {
    const value = await this.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  async delete(key: string | string[]): Promise<number> {
    if (Array.isArray(key)) {
      return this.client.del(...key);
    }
    return this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    const result = await this.client.expire(key, seconds);
    return result === 1;
  }

  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  // Hash Operations
  async hget(key: string, field: string): Promise<string | null> {
    return this.client.hget(key, field);
  }

  async hset(key: string, field: string, value: string): Promise<number> {
    return this.client.hset(key, field, value);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return this.client.hgetall(key);
  }

  async hdel(key: string, ...fields: string[]): Promise<number> {
    return this.client.hdel(key, ...fields);
  }

  // List Operations
  async lpush(key: string, ...values: string[]): Promise<number> {
    return this.client.lpush(key, ...values);
  }

  async rpush(key: string, ...values: string[]): Promise<number> {
    return this.client.rpush(key, ...values);
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    return this.client.lrange(key, start, stop);
  }

  async llen(key: string): Promise<number> {
    return this.client.llen(key);
  }

  // Set Operations
  async sadd(key: string, ...members: string[]): Promise<number> {
    return this.client.sadd(key, ...members);
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    return this.client.srem(key, ...members);
  }

  async smembers(key: string): Promise<string[]> {
    return this.client.smembers(key);
  }

  async sismember(key: string, member: string): Promise<boolean> {
    const result = await this.client.sismember(key, member);
    return result === 1;
  }

  // Sorted Set Operations
  async zadd(key: string, score: number, member: string): Promise<number> {
    return this.client.zadd(key, score, member);
  }

  async zrange(
    key: string,
    start: number,
    stop: number,
    withScores?: boolean,
  ): Promise<string[]> {
    if (withScores) {
      return this.client.zrange(key, start, stop, "WITHSCORES");
    }
    return this.client.zrange(key, start, stop);
  }

  async zrem(key: string, ...members: string[]): Promise<number> {
    return this.client.zrem(key, ...members);
  }

  // Pub/Sub Operations
  async publish(channel: string, message: string): Promise<number> {
    return this.publisher.publish(channel, message);
  }

  async subscribe(
    channel: string,
    callback: (message: string) => void,
  ): Promise<void> {
    await this.subscriber.subscribe(channel);
    this.subscriber.on("message", (ch, message) => {
      if (ch === channel) {
        callback(message);
      }
    });
  }

  async unsubscribe(channel: string): Promise<void> {
    await this.subscriber.unsubscribe(channel);
  }

  // Atomic Operations
  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async decr(key: string): Promise<number> {
    return this.client.decr(key);
  }

  async incrby(key: string, increment: number): Promise<number> {
    return this.client.incrby(key, increment);
  }

  // Cache Helper Methods
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    const cached = await this.getJSON<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.setJSON(key, value, ttl);
    return value;
  }

  async invalidatePattern(pattern: string): Promise<number> {
    const keys = await this.client.keys(pattern);
    if (keys.length === 0) {
      return 0;
    }
    return this.delete(keys);
  }

  // Transaction Operations
  async multi(): Promise<Redis.ChainableCommander> {
    return this.client.multi();
  }

  // Utility Methods
  async flushdb(): Promise<"OK"> {
    return this.client.flushdb();
  }

  async ping(): Promise<"PONG"> {
    return this.client.ping();
  }

  async keys(pattern: string): Promise<string[]> {
    return this.client.keys(pattern);
  }

  // Get raw client for advanced operations
  getClient(): Redis.Redis {
    return this.client;
  }
}
