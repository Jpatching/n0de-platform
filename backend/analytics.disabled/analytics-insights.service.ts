import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { RedisService } from '../common/redis.service';

export interface UsageInsight {
  type: 'cost_optimization' | 'performance' | 'usage_pattern' | 'anomaly' | 'recommendation';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: string;
  actionable: boolean;
  actions?: string[];
  data?: any;
  createdAt: Date;
}

export interface UserAnalytics {
  userId: string;
  insights: UsageInsight[];
  predictions: {
    nextMonthUsage: number;
    costForecast: number;
    recommendedPlan: string;
    upgradeValue: number;
  };
  patterns: {
    peakHours: number[];
    preferredEndpoints: string[];
    geographicRegions: string[];
    averageLatency: number;
    successRate: number;
  };
  healthScore: number;
  efficiency: number;
}

@Injectable()
export class AnalyticsInsightsService {
  private readonly logger = new Logger(AnalyticsInsightsService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async generateUserInsights(userId: string): Promise<UserAnalytics> {
    const cacheKey = `user_analytics:${userId}`;
    
    // Check cache first (5-minute cache)
    const cachedAnalytics = await this.redis.get(cacheKey);
    if (cachedAnalytics) {
      return JSON.parse(cachedAnalytics);
    }

    const [user, usageStats, subscriptions, recentUsage] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          apiKeys: {
            select: {
              id: true,
              name: true,
              lastUsedAt: true,
              totalRequests: true,
              rateLimit: true,
            },
          },
        },
      }),
      this.getUserUsageStats(userId),
      this.getUserSubscriptions(userId),
      this.getRecentUsageData(userId),
    ]);

    if (!user) {
      throw new Error('User not found');
    }

    const insights = await this.analyzeUserBehavior(userId, usageStats, recentUsage);
    const predictions = await this.generatePredictions(userId, usageStats, subscriptions);
    const patterns = await this.identifyUsagePatterns(usageStats, recentUsage);
    const healthScore = this.calculateHealthScore(user, usageStats, patterns);
    const efficiency = this.calculateEfficiencyScore(usageStats, user.apiKeys);

    const analytics: UserAnalytics = {
      userId,
      insights,
      predictions,
      patterns,
      healthScore,
      efficiency,
    };

    // Cache for 5 minutes
    await this.redis.setex(cacheKey, 300, JSON.stringify(analytics));

    return analytics;
  }

  private async getUserUsageStats(userId: string) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    return this.prisma.usageStats.findMany({
      where: {
        userId,
        date: {
          gte: thirtyDaysAgo,
        },
      },
      orderBy: {
        date: 'desc',
      },
    });
  }

  private async getUserSubscriptions(userId: string) {
    return this.prisma.subscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
  }

  private async getRecentUsageData(userId: string) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    return this.prisma.usageStats.findMany({
      where: {
        userId,
        date: {
          gte: sevenDaysAgo,
        },
      },
      orderBy: [
        { date: 'desc' },
        { hour: 'desc' },
      ],
    });
  }

  private async analyzeUserBehavior(
    userId: string, 
    usageStats: any[], 
    recentUsage: any[]
  ): Promise<UsageInsight[]> {
    const insights: UsageInsight[] = [];

    // Analyze cost optimization opportunities
    const costInsights = this.analyzeCostOptimization(usageStats);
    insights.push(...costInsights);

    // Detect usage anomalies
    const anomalies = this.detectAnomalies(recentUsage);
    insights.push(...anomalies);

    // Performance optimization recommendations
    const performanceInsights = this.analyzePerformance(usageStats);
    insights.push(...performanceInsights);

    // Usage pattern insights
    const patternInsights = this.analyzeUsagePatterns(recentUsage);
    insights.push(...patternInsights);

    return insights;
  }

  private analyzeCostOptimization(usageStats: any[]): UsageInsight[] {
    const insights: UsageInsight[] = [];
    
    if (usageStats.length < 7) return insights;

    const totalRequests = usageStats.reduce((sum, stat) => sum + stat.requestCount, 0);
    const avgDailyRequests = totalRequests / usageStats.length;

    // Subscription optimization
    if (avgDailyRequests < 1000 && totalRequests > 0) {
      insights.push({
        type: 'cost_optimization',
        priority: 'medium',
        title: 'Consider Downgrading Plan',
        description: 'Your usage pattern suggests you might benefit from a lower-tier plan',
        impact: 'Could save $20-50/month',
        actionable: true,
        actions: [
          'Review your current usage vs plan limits',
          'Consider switching to Starter plan',
          'Set up usage alerts to monitor consumption'
        ],
        data: { avgDailyRequests, totalRequests },
        createdAt: new Date(),
      });
    } else if (avgDailyRequests > 25000) {
      insights.push({
        type: 'cost_optimization',
        priority: 'high',
        title: 'Upgrade Recommended for Better Value',
        description: 'Your usage is approaching plan limits. Upgrading now could provide better value',
        impact: 'Better rate limits and reduced throttling',
        actionable: true,
        actions: [
          'Upgrade to Professional plan for better rates',
          'Enable auto-scaling to handle peak loads',
          'Consider dedicated infrastructure'
        ],
        data: { avgDailyRequests, totalRequests },
        createdAt: new Date(),
      });
    }

    return insights;
  }

  private detectAnomalies(recentUsage: any[]): UsageInsight[] {
    const insights: UsageInsight[] = [];
    
    if (recentUsage.length < 24) return insights; // Need at least 24 hours of data

    const avgRequests = recentUsage.reduce((sum, stat) => sum + stat.requestCount, 0) / recentUsage.length;
    const avgErrors = recentUsage.reduce((sum, stat) => sum + stat.errorCount, 0) / recentUsage.length;
    
    // Check for unusual spikes
    const spikes = recentUsage.filter(stat => stat.requestCount > avgRequests * 3);
    if (spikes.length > 0) {
      insights.push({
        type: 'anomaly',
        priority: 'high',
        title: 'Unusual Traffic Spike Detected',
        description: `Detected ${spikes.length} instances of traffic 3x above normal levels`,
        impact: 'May indicate bot activity or integration issues',
        actionable: true,
        actions: [
          'Review API key usage patterns',
          'Check for unauthorized access',
          'Consider implementing additional rate limiting'
        ],
        data: { spikes: spikes.length, avgRequests },
        createdAt: new Date(),
      });
    }

    // Check error rate
    const errorRate = avgErrors / (avgRequests || 1);
    if (errorRate > 0.05) { // 5% error rate
      insights.push({
        type: 'performance',
        priority: 'critical',
        title: 'High Error Rate Detected',
        description: `Error rate is ${(errorRate * 100).toFixed(1)}%, significantly above normal`,
        impact: 'Poor user experience and wasted API calls',
        actionable: true,
        actions: [
          'Review error logs for common issues',
          'Check API integration code',
          'Implement proper error handling',
          'Consider circuit breaker patterns'
        ],
        data: { errorRate: errorRate * 100, avgErrors },
        createdAt: new Date(),
      });
    }

    return insights;
  }

  private analyzePerformance(usageStats: any[]): UsageInsight[] {
    const insights: UsageInsight[] = [];
    
    if (usageStats.length === 0) return insights;

    const avgLatency = usageStats.reduce((sum, stat) => sum + stat.avgLatency, 0) / usageStats.length;
    
    if (avgLatency > 200) {
      insights.push({
        type: 'performance',
        priority: 'medium',
        title: 'Latency Optimization Opportunity',
        description: `Average response time is ${avgLatency.toFixed(0)}ms, which could be improved`,
        impact: 'Faster responses improve user experience',
        actionable: true,
        actions: [
          'Consider using a CDN or edge locations',
          'Optimize API call patterns',
          'Implement request caching where appropriate',
          'Review geographic distribution of requests'
        ],
        data: { avgLatency },
        createdAt: new Date(),
      });
    }

    return insights;
  }

  private analyzeUsagePatterns(recentUsage: any[]): UsageInsight[] {
    const insights: UsageInsight[] = [];
    
    // Analyze time-based patterns
    const hourlyUsage = new Array(24).fill(0);
    recentUsage.forEach(stat => {
      hourlyUsage[stat.hour] += stat.requestCount;
    });

    const peakHour = hourlyUsage.indexOf(Math.max(...hourlyUsage));
    const offPeakHours = hourlyUsage
      .map((usage, hour) => ({ hour, usage }))
      .filter(item => item.usage < hourlyUsage[peakHour] * 0.1)
      .map(item => item.hour);

    if (offPeakHours.length > 12) {
      insights.push({
        type: 'usage_pattern',
        priority: 'low',
        title: 'Consider Scheduled Processing',
        description: 'Your usage has distinct peak and off-peak periods',
        impact: 'Could optimize costs with scheduled batch processing',
        actionable: true,
        actions: [
          'Move non-critical operations to off-peak hours',
          'Implement job queuing for batch operations',
          'Consider usage-based pricing optimization'
        ],
        data: { peakHour, offPeakHours: offPeakHours.length },
        createdAt: new Date(),
      });
    }

    return insights;
  }

  private async generatePredictions(
    userId: string, 
    usageStats: any[], 
    subscriptions: any[]
  ): Promise<UserAnalytics['predictions']> {
    if (usageStats.length === 0) {
      return {
        nextMonthUsage: 0,
        costForecast: 0,
        recommendedPlan: 'FREE',
        upgradeValue: 0,
      };
    }

    // Simple linear regression for usage prediction
    const totalRequests = usageStats.reduce((sum, stat) => sum + stat.requestCount, 0);
    const avgDailyRequests = totalRequests / usageStats.length;
    const nextMonthUsage = Math.round(avgDailyRequests * 30);

    // Cost forecasting based on current subscription
    const currentSubscription = subscriptions[0];
    const currentPlan = currentSubscription?.type || 'FREE';
    
    let costForecast = 0;
    let recommendedPlan = 'FREE';
    let upgradeValue = 0;

    if (nextMonthUsage > 100000) {
      recommendedPlan = 'STARTER';
      costForecast = 49;
    }
    if (nextMonthUsage > 1000000) {
      recommendedPlan = 'PROFESSIONAL';
      costForecast = 299;
    }
    if (nextMonthUsage > 10000000) {
      recommendedPlan = 'ENTERPRISE';
      costForecast = 999;
    }

    // Calculate upgrade value
    if (recommendedPlan !== currentPlan) {
      const planValues = { FREE: 0, STARTER: 49, PROFESSIONAL: 299, ENTERPRISE: 999 };
      const currentValue = planValues[currentPlan] || 0;
      const recommendedValue = planValues[recommendedPlan] || 0;
      upgradeValue = Math.max(0, recommendedValue - currentValue);
    }

    return {
      nextMonthUsage,
      costForecast,
      recommendedPlan,
      upgradeValue,
    };
  }

  private async identifyUsagePatterns(
    usageStats: any[], 
    recentUsage: any[]
  ): Promise<UserAnalytics['patterns']> {
    const patterns = {
      peakHours: [],
      preferredEndpoints: [],
      geographicRegions: [],
      averageLatency: 0,
      successRate: 0,
    };

    if (recentUsage.length === 0) return patterns;

    // Calculate peak hours
    const hourlyUsage = new Array(24).fill(0);
    recentUsage.forEach(stat => {
      hourlyUsage[stat.hour] += stat.requestCount;
    });

    const maxUsage = Math.max(...hourlyUsage);
    const threshold = maxUsage * 0.7; // Peak hours are 70%+ of max usage
    patterns.peakHours = hourlyUsage
      .map((usage, hour) => ({ hour, usage }))
      .filter(item => item.usage >= threshold)
      .map(item => item.hour);

    // Aggregate metrics
    const totalRequests = recentUsage.reduce((sum, stat) => sum + stat.requestCount, 0);
    const totalSuccess = recentUsage.reduce((sum, stat) => sum + stat.successCount, 0);
    const totalLatency = recentUsage.reduce((sum, stat) => sum + stat.totalLatency, 0);

    patterns.averageLatency = totalLatency / totalRequests || 0;
    patterns.successRate = (totalSuccess / totalRequests) * 100 || 0;

    // Extract preferred endpoints and regions
    const endpointCounts = {};
    const regionCounts = {};

    recentUsage.forEach(stat => {
      if (stat.endpoint) {
        endpointCounts[stat.endpoint] = (endpointCounts[stat.endpoint] || 0) + stat.requestCount;
      }
      if (stat.region) {
        regionCounts[stat.region] = (regionCounts[stat.region] || 0) + stat.requestCount;
      }
    });

    patterns.preferredEndpoints = Object.entries(endpointCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([endpoint]) => endpoint);

    patterns.geographicRegions = Object.entries(regionCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 3)
      .map(([region]) => region);

    return patterns;
  }

  private calculateHealthScore(user: any, usageStats: any[], patterns: any): number {
    let score = 100;

    // Deduct points for issues
    if (patterns.successRate < 95) {
      score -= (95 - patterns.successRate) * 2; // 2 points per % below 95%
    }

    if (patterns.averageLatency > 200) {
      score -= Math.min(20, (patterns.averageLatency - 200) / 10); // Up to 20 points for latency
    }

    if (!user.emailVerified) {
      score -= 10; // Email not verified
    }

    if (user.apiKeys.length === 0) {
      score -= 15; // No API keys created
    }

    // Bonus points for good practices
    if (user.apiKeys.length > 1) {
      score += 5; // Multiple API keys (good separation)
    }

    if (patterns.successRate > 98) {
      score += 5; // Excellent success rate
    }

    return Math.max(0, Math.min(100, score));
  }

  private calculateEfficiencyScore(usageStats: any[], apiKeys: any[]): number {
    if (usageStats.length === 0) return 0;

    const totalRequests = usageStats.reduce((sum, stat) => sum + stat.requestCount, 0);
    const totalErrors = usageStats.reduce((sum, stat) => sum + stat.errorCount, 0);
    const totalLatency = usageStats.reduce((sum, stat) => sum + stat.totalLatency, 0);

    const errorRate = totalErrors / totalRequests;
    const avgLatency = totalLatency / totalRequests;

    let efficiency = 100;

    // Deduct for errors
    efficiency -= errorRate * 100 * 2; // 2x weight for errors

    // Deduct for high latency
    if (avgLatency > 100) {
      efficiency -= Math.min(30, (avgLatency - 100) / 10);
    }

    // Bonus for active API key usage
    const activeKeys = apiKeys.filter(key => key.lastUsedAt && 
      new Date(key.lastUsedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    
    if (activeKeys.length > 0) {
      efficiency += Math.min(10, activeKeys.length * 2);
    }

    return Math.max(0, Math.min(100, efficiency));
  }
}