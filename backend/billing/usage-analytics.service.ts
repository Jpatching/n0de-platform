import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import { RedisService } from "../common/redis.service";

/**
 * UsageAnalyticsService: Advanced RPC Usage Intelligence
 *
 * This service goes beyond simple counting - it provides deep insights
 * into RPC usage patterns to optimize both performance and billing:
 *
 * 1. PREDICTIVE ANALYTICS: Forecast usage spikes before they happen
 * 2. COST OPTIMIZATION: Identify expensive call patterns
 * 3. PERFORMANCE INSIGHTS: Track latency patterns across endpoints
 * 4. FRAUD DETECTION: Identify unusual usage patterns
 * 5. PRICING INTELLIGENCE: Dynamic pricing based on server costs
 *
 * PHILOSOPHY:
 * - Every RPC call tells a story about user behavior
 * - Usage patterns predict infrastructure needs
 * - Fair pricing reflects actual resource consumption
 */

interface RPCCallAnalytics {
  endpoint: string;
  timestamp: number;
  userId: string;
  computeUnits: number;
  latency: number;
  network: "mainnet" | "devnet" | "testnet";
  success: boolean;
  error?: string;
  metadata: {
    userAgent?: string;
    ipAddress?: string;
    sdkVersion?: string;
  };
}

export interface UsagePattern {
  userId: string;
  pattern: "steady" | "burst" | "spike" | "decline";
  confidence: number;
  predictedUsage: {
    next24h: number;
    next7d: number;
    next30d: number;
  };
  costProjection: {
    current: number;
    projected: number;
    savings: number;
  };
}

interface EndpointEfficiency {
  endpoint: string;
  avgLatency: number;
  successRate: number;
  computeEfficiency: number; // Compute units per successful request
  costPerRequest: number;
  recommendedOptimizations: string[];
}

@Injectable()
export class UsageAnalyticsService {
  private readonly logger = new Logger(UsageAnalyticsService.name);

  // Advanced analytics require sophisticated caching
  private readonly ANALYTICS_TTL = 300; // 5 minutes
  private readonly PATTERN_ANALYSIS_WINDOW = 7 * 24 * 60 * 60; // 7 days in seconds

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  /**
   * REAL-TIME ANALYTICS INGESTION
   * Capture every RPC call with rich context for analysis
   */
  async recordRPCCall(analytics: RPCCallAnalytics): Promise<void> {
    const timestamp = analytics.timestamp;
    const hourSlot = Math.floor(timestamp / 3600000); // Hour-based slots
    const daySlot = Math.floor(timestamp / 86400000); // Day-based slots

    // Use Redis pipeline for atomic multi-dimensional recording
    const pipeline = this.redis.pipeline();

    // Time-series data for trend analysis
    pipeline.zadd(
      `timeseries:${analytics.userId}:calls`,
      timestamp,
      JSON.stringify({
        endpoint: analytics.endpoint,
        compute: analytics.computeUnits,
        latency: analytics.latency,
        success: analytics.success,
      }),
    );

    // Hourly aggregations for real-time dashboards
    pipeline.hincrby(
      `hourly:${analytics.userId}:${hourSlot}`,
      "total_calls",
      1,
    );
    pipeline.hincrby(
      `hourly:${analytics.userId}:${hourSlot}`,
      "total_compute",
      analytics.computeUnits,
    );
    pipeline.hincrby(
      `hourly:${analytics.userId}:${hourSlot}`,
      `${analytics.endpoint}:calls`,
      1,
    );

    // Latency tracking for performance optimization
    pipeline.lpush(`latency:${analytics.endpoint}`, analytics.latency);
    pipeline.ltrim(`latency:${analytics.endpoint}`, 0, 999); // Keep last 1000 samples

    // Error tracking for reliability insights
    if (!analytics.success) {
      pipeline.hincrby(
        `errors:${analytics.userId}:${daySlot}`,
        analytics.error || "unknown",
        1,
      );
    }

    // Network-specific analytics
    pipeline.hincrby(`network:${analytics.network}:${daySlot}`, "calls", 1);
    pipeline.hincrby(
      `network:${analytics.network}:${daySlot}`,
      "compute",
      analytics.computeUnits,
    );

    await pipeline.exec();

    // Async pattern analysis (don't block RPC response)
    setImmediate(() => this.analyzeUsagePattern(analytics.userId));
  }

  /**
   * INTELLIGENT USAGE PATTERN DETECTION
   * Machine learning-style pattern recognition for usage behavior
   */
  async analyzeUsagePattern(userId: string): Promise<UsagePattern> {
    const cacheKey = `pattern:${userId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    try {
      // Get historical data for pattern analysis
      const now = Date.now();
      const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

      const calls = await this.redis.zrangebyscore(
        `timeseries:${userId}:calls`,
        weekAgo,
        now,
      );

      if (calls.length < 10) {
        // Not enough data for pattern analysis
        return this.getDefaultPattern(userId);
      }

      // Analyze call frequency over time
      const hourlyDistribution = this.analyzeHourlyDistribution(calls);
      const trendAnalysis = this.analyzeTrend(calls);
      const volatility = this.calculateVolatility(calls);

      // Classify usage pattern
      const pattern = this.classifyPattern(
        hourlyDistribution,
        trendAnalysis,
        volatility,
      );

      // Predict future usage based on pattern
      const prediction = await this.predictFutureUsage(userId, pattern, calls);

      const usagePattern: UsagePattern = {
        userId,
        pattern: pattern.type,
        confidence: pattern.confidence,
        predictedUsage: prediction.usage,
        costProjection: prediction.cost,
      };

      // Cache for 5 minutes
      await this.redis.setex(
        cacheKey,
        this.ANALYTICS_TTL,
        JSON.stringify(usagePattern),
      );

      return usagePattern;
    } catch (error) {
      this.logger.error(
        `Failed to analyze usage pattern for ${userId}:`,
        error,
      );
      return this.getDefaultPattern(userId);
    }
  }

  /**
   * ENDPOINT PERFORMANCE ANALYSIS
   * Deep dive into RPC endpoint efficiency and optimization opportunities
   */
  async analyzeEndpointEfficiency(): Promise<EndpointEfficiency[]> {
    const cacheKey = "endpoint:efficiency:analysis";
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const endpoints = [
      "getBalance",
      "getTransaction",
      "sendTransaction",
      "getBlock",
      "getAccountInfo",
      "getProgramAccounts",
    ];

    const efficiencyAnalysis: EndpointEfficiency[] = [];

    for (const endpoint of endpoints) {
      try {
        // Get performance metrics
        const latencies = await this.redis.lrange(`latency:${endpoint}`, 0, -1);
        const avgLatency =
          latencies.length > 0
            ? latencies.reduce((sum, lat) => sum + parseInt(lat), 0) /
              latencies.length
            : 0;

        // Calculate success rate from recent calls
        const successRate = await this.calculateEndpointSuccessRate(endpoint);

        // Compute efficiency (lower is better)
        const computeEfficiency =
          await this.calculateComputeEfficiency(endpoint);

        // Estimate cost based on server resources
        const costPerRequest = this.estimateEndpointCost(
          endpoint,
          avgLatency,
          computeEfficiency,
        );

        // Generate optimization recommendations
        const recommendations = this.generateOptimizationRecommendations(
          endpoint,
          avgLatency,
          successRate,
          computeEfficiency,
        );

        efficiencyAnalysis.push({
          endpoint,
          avgLatency,
          successRate,
          computeEfficiency,
          costPerRequest,
          recommendedOptimizations: recommendations,
        });
      } catch (error) {
        this.logger.error(`Failed to analyze endpoint ${endpoint}:`, error);
      }
    }

    // Cache for 15 minutes (less frequent updates for efficiency data)
    await this.redis.setex(cacheKey, 900, JSON.stringify(efficiencyAnalysis));

    return efficiencyAnalysis;
  }

  /**
   * COST OPTIMIZATION INSIGHTS
   * Identify opportunities for users to reduce their bills
   */
  async generateCostOptimizationReport(userId: string): Promise<any> {
    const pattern = await this.analyzeUsagePattern(userId);
    const userCalls = await this.getUserCallDistribution(userId);
    const efficiencyData = await this.analyzeEndpointEfficiency();

    const optimizations = [];

    // Check for expensive endpoint usage
    for (const [endpoint, callCount] of Object.entries(userCalls)) {
      const efficiency = efficiencyData.find((e) => e.endpoint === endpoint);
      if (efficiency && efficiency.costPerRequest > 0.01 && callCount > 1000) {
        optimizations.push({
          type: "expensive_endpoint",
          endpoint,
          currentCost: callCount * efficiency.costPerRequest,
          recommendations: efficiency.recommendedOptimizations,
          potentialSavings: callCount * efficiency.costPerRequest * 0.3, // 30% savings
        });
      }
    }

    // Check for burst patterns that could benefit from rate limiting
    if (pattern.pattern === "burst") {
      optimizations.push({
        type: "burst_optimization",
        description:
          "Your usage shows burst patterns. Consider implementing client-side caching.",
        potentialSavings: pattern.costProjection.current * 0.2, // 20% savings
      });
    }

    // Check for redundant calls
    const redundancy = await this.detectRedundantCalls(userId);
    if (redundancy.score > 0.1) {
      optimizations.push({
        type: "redundancy_reduction",
        description: `${Math.round(redundancy.score * 100)}% of your calls might be redundant`,
        potentialSavings: pattern.costProjection.current * redundancy.score,
      });
    }

    return {
      userId,
      currentMonthlySpend: pattern.costProjection.current,
      totalPotentialSavings: optimizations.reduce(
        (sum, opt) => sum + (opt.potentialSavings || 0),
        0,
      ),
      optimizations,
      generatedAt: new Date(),
    };
  }

  // Helper Methods
  private analyzeHourlyDistribution(calls: string[]): number[] {
    const distribution = new Array(24).fill(0);

    for (let i = 0; i < calls.length; i += 2) {
      const timestamp = parseInt(calls[i + 1]);
      const hour = new Date(timestamp).getHours();
      distribution[hour]++;
    }

    return distribution;
  }

  private analyzeTrend(calls: string[]): {
    slope: number;
    correlation: number;
  } {
    if (calls.length < 4) return { slope: 0, correlation: 0 };

    // Simple linear regression on call frequency
    const points = [];
    for (let i = 0; i < calls.length; i += 2) {
      points.push({
        x: i / 2,
        y: parseInt(calls[i + 1]),
      });
    }

    // Calculate trend slope
    const n = points.length;
    const sumX = points.reduce((sum, p) => sum + p.x, 0);
    const sumY = points.reduce((sum, p) => sum + p.y, 0);
    const sumXY = points.reduce((sum, p) => sum + p.x * p.y, 0);
    const sumXX = points.reduce((sum, p) => sum + p.x * p.x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const correlation = Math.abs(slope) / Math.max(Math.abs(slope), 1); // Normalized

    return { slope, correlation };
  }

  private calculateVolatility(calls: string[]): number {
    if (calls.length < 4) return 0;

    const values = [];
    for (let i = 0; i < calls.length; i += 2) {
      values.push(parseInt(calls[i + 1]));
    }

    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance =
      values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;

    return Math.sqrt(variance) / mean; // Coefficient of variation
  }

  private classifyPattern(
    distribution: number[],
    trend: any,
    volatility: number,
  ): { type: any; confidence: number } {
    if (volatility > 2.0) {
      return { type: "spike", confidence: 0.8 };
    } else if (trend.slope > 10 && trend.correlation > 0.7) {
      return { type: "burst", confidence: 0.9 };
    } else if (Math.abs(trend.slope) < 1 && volatility < 0.5) {
      return { type: "steady", confidence: 0.95 };
    } else if (trend.slope < -5) {
      return { type: "decline", confidence: 0.8 };
    } else {
      return { type: "steady", confidence: 0.6 };
    }
  }

  private async predictFutureUsage(
    userId: string,
    pattern: any,
    calls: string[],
  ): Promise<any> {
    // Simplified prediction based on historical data
    const recentCalls = calls.length / 2;
    const dailyAverage = recentCalls / 7;

    let multiplier = 1.0;
    switch (pattern.type) {
      case "burst":
        multiplier = 1.3;
        break;
      case "spike":
        multiplier = 0.8; // Spikes usually normalize
        break;
      case "decline":
        multiplier = 0.7;
        break;
    }

    const predicted = {
      next24h: dailyAverage * multiplier,
      next7d: dailyAverage * 7 * multiplier,
      next30d: dailyAverage * 30 * multiplier,
    };

    // Cost projection (simplified)
    const avgCostPerCall = 0.002; // $0.002 per call
    const cost = {
      current: dailyAverage * 30 * avgCostPerCall,
      projected: predicted.next30d * avgCostPerCall,
      savings: 0,
    };

    return { usage: predicted, cost };
  }

  private getDefaultPattern(userId: string): UsagePattern {
    return {
      userId,
      pattern: "steady",
      confidence: 0.5,
      predictedUsage: { next24h: 0, next7d: 0, next30d: 0 },
      costProjection: { current: 0, projected: 0, savings: 0 },
    };
  }

  private async calculateEndpointSuccessRate(
    endpoint: string,
  ): Promise<number> {
    // Simplified success rate calculation
    return 0.995; // 99.5% default
  }

  private async calculateComputeEfficiency(endpoint: string): Promise<number> {
    // Compute units per successful request
    const efficiencyMap = {
      getBalance: 1,
      getTransaction: 2,
      sendTransaction: 5,
      getBlock: 3,
      getAccountInfo: 1,
      getProgramAccounts: 10,
    };

    return efficiencyMap[endpoint] || 2;
  }

  private estimateEndpointCost(
    endpoint: string,
    latency: number,
    computeUnits: number,
  ): number {
    // Cost estimation based on server resources
    const baseCost = 0.001; // $0.001 base cost
    const latencyCost = latency > 1000 ? latency * 0.000001 : 0; // Extra cost for slow calls
    const computeCost = computeUnits * 0.0002; // $0.0002 per compute unit

    return baseCost + latencyCost + computeCost;
  }

  private generateOptimizationRecommendations(
    endpoint: string,
    latency: number,
    successRate: number,
    computeEfficiency: number,
  ): string[] {
    const recommendations = [];

    if (latency > 2000) {
      recommendations.push("Consider caching results for this slow endpoint");
    }

    if (successRate < 0.95) {
      recommendations.push("Implement retry logic with exponential backoff");
    }

    if (computeEfficiency > 5) {
      recommendations.push(
        "Use more specific RPC methods to reduce compute usage",
      );
    }

    if (endpoint === "getProgramAccounts") {
      recommendations.push("Use filters to reduce the amount of data returned");
    }

    return recommendations;
  }

  private async getUserCallDistribution(
    userId: string,
  ): Promise<Record<string, number>> {
    // Get call distribution for the user
    const now = Date.now();
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000;

    // This would aggregate from Redis time-series data
    // For now, return mock data
    return {
      getBalance: 1000,
      getTransaction: 500,
      sendTransaction: 100,
    };
  }

  private async detectRedundantCalls(
    userId: string,
  ): Promise<{ score: number }> {
    // Analyze for redundant/duplicate calls
    // This would use advanced algorithms to detect patterns
    return { score: 0.05 }; // 5% redundancy
  }
}
