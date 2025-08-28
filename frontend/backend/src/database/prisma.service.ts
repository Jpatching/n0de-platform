import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private queryCount = 0;
  private totalQueryTime = 0;

  constructor() {
    super({
      errorFormat: 'pretty',
      datasources: {
        db: {
          url: process.env.DATABASE_URL || 'postgresql://localhost:5432/fallback',
        },
      },
      log: [
        { emit: 'stdout', level: 'query' },
        { emit: 'stdout', level: 'error' },
        { emit: 'stdout', level: 'warn' },
      ],
    });

    // 🚀 PERFORMANCE: Query monitoring and optimization
    this.$use(async (params, next) => {
      const before = Date.now();
      const result = await next(params);
      const after = Date.now();
      
      // Log slow queries for optimization
      if (after - before > 500) { // Reduced from 1000ms to 500ms for better monitoring
        this.logger.warn(`SLOW QUERY: ${params.model}.${params.action} took ${after - before}ms`);
        this.logger.warn(`Query details:`, JSON.stringify(params.args, null, 2));
      }
      
      return result;
    });

    // 🚀 PERFORMANCE: Connection health monitoring
    this.$use(async (params, next) => {
      try {
        return await next(params);
      } catch (error) {
        // Log connection errors for monitoring
        if (error.message?.includes('connection') || error.message?.includes('timeout')) {
          this.logger.error(`DB Connection Error: ${error.message}`);
        }
        throw error;
      }
    });


  }

  async onModuleInit() {
    // 🚀 NON-BLOCKING: Don't block app startup for database connection
    // This allows health endpoint to respond even if database is slow/unavailable
    this.connectToDatabase();
  }

  private async connectToDatabase(): Promise<void> {
    try {
      this.logger.log('🔌 Connecting to database...');
      await this.$connect();
      this.logger.log('✅ Database connected successfully');
      
      // 🚀 PERFORMANCE: Test connection and log performance
      const start = Date.now();
      await this.$queryRaw`SELECT 1`;
      const connectionTime = Date.now() - start;
      this.logger.log(`📊 Database connection test: ${connectionTime}ms`);
      
      // 🚀 PERFORMANCE: Warm up connection pool
      await this.warmUpConnectionPool();
    } catch (error) {
      this.logger.error('❌ Database connection failed:', error);
      this.logger.error('⚠️  App will continue running, but database operations will fail');
      
      // Retry connection after delay
      setTimeout(() => {
        this.logger.log('🔄 Retrying database connection...');
        this.connectToDatabase();
      }, 5000);
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.logger.log('🔌 Database disconnected');
      
      // Log final stats
      if (this.queryCount > 0) {
        const avgQueryTime = this.totalQueryTime / this.queryCount;
        this.logger.log(`📊 Final query stats: ${this.queryCount} queries, avg ${avgQueryTime.toFixed(2)}ms`);
      }
    } catch (error) {
      this.logger.error('Error disconnecting from database:', error);
    }
  }

  // 🚀 PERFORMANCE: Warm up connection pool on startup
  private async warmUpConnectionPool(): Promise<void> {
    try {
      // Create multiple concurrent connections to warm up the pool
      const warmUpPromises = Array.from({ length: 5 }, () => 
        this.$queryRaw`SELECT 1 as health_check`
      );
      
      await Promise.all(warmUpPromises);
      this.logger.log('Connection pool warmed up successfully');
    } catch (error) {
      this.logger.warn('Failed to warm up connection pool:', error);
    }
  }

  // Health check method with connection pool status
  async isHealthy(): Promise<{ healthy: boolean; connectionPool?: any }> {
    try {
      await this.$queryRaw`SELECT 1`;
      return { 
        healthy: true,
        connectionPool: {
          // Add connection pool metrics if available
          status: 'active'
        }
      };
    } catch (error) {
      return { healthy: false };
    }
  }

  // 🚀 PERFORMANCE: Optimized transaction helper with connection reuse
  async executeTransaction<T>(
    fn: (prisma: PrismaClient) => Promise<T>,
    maxRetries = 3
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.$transaction(fn, {
          maxWait: 5000, // 5 seconds max wait
          timeout: 10000, // 10 seconds timeout
          isolationLevel: 'ReadCommitted', // Better performance than default
        });
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(`Transaction attempt ${attempt} failed:`, error);
        
        if (attempt === maxRetries) {
          break;
        }
        
        // Exponential backoff with jitter
        const delay = Math.pow(2, attempt) * 100 + Math.random() * 100;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }

  // 🚀 PERFORMANCE: Batch operations for better throughput
  async batchOperation<T>(
    operations: (() => Promise<T>)[],
    batchSize: number = 10
  ): Promise<T[]> {
    const results: T[] = [];
    
    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(op => op()));
      results.push(...batchResults);
    }
    
    return results;
  }

  // 🚀 PERFORMANCE: Query result caching helper
  private queryCache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 30000; // 30 seconds

  async cachedQuery<T>(
    cacheKey: string,
    queryFn: () => Promise<T>,
    ttl: number = this.CACHE_TTL
  ): Promise<T> {
    const cached = this.queryCache.get(cacheKey);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < ttl) {
      return cached.data;
    }
    
    const result = await queryFn();
    this.queryCache.set(cacheKey, { data: result, timestamp: now });
    
    // Clean up old cache entries
    if (this.queryCache.size > 1000) {
      this.cleanupCache();
    }
    
    return result;
  }

  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.queryCache.entries()) {
      if (now - entry.timestamp > this.CACHE_TTL * 2) {
        this.queryCache.delete(key);
      }
    }
  }

  /**
   * 🚀 PERFORMANCE: Get database performance metrics
   */
  getPerformanceMetrics() {
    const avgQueryTime = this.queryCount > 0 ? this.totalQueryTime / this.queryCount : 0;
    
    return {
      totalQueries: this.queryCount,
      totalQueryTime: this.totalQueryTime,
      averageQueryTime: Math.round(avgQueryTime * 100) / 100,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 🚀 PERFORMANCE: Execute query with timing
   */
  async timedQuery<T>(queryFn: () => Promise<T>, queryName?: string): Promise<T & { queryTime: number }> {
    const start = Date.now();
    const result = await queryFn();
    const queryTime = Date.now() - start;
    
    if (queryName && queryTime > 50) {
      this.logger.debug(`⏱️ Query ${queryName}: ${queryTime}ms`);
    }
    
    return { ...result as any, queryTime };
  }
} 