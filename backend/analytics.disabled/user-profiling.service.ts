import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { RedisService } from '../common/redis.service';

export interface UserProfile {
  userId: string;
  preferences: {
    defaultNetwork: 'mainnet' | 'devnet' | 'testnet';
    dashboardLayout: DashboardWidget[];
    notificationSettings: NotificationPreferences;
    apiKeyLabeling: string[];
    theme: 'light' | 'dark' | 'auto';
  };
  usage: {
    primaryUseCase: 'defi' | 'nft' | 'gamefi' | 'enterprise' | 'development' | 'trading';
    averageRPS: number;
    peakHours: HourRange[];
    geographicRegion: string;
    preferredEndpoints: EndpointPreference[];
    integrationComplexity: 'simple' | 'moderate' | 'advanced';
  };
  businessProfile: {
    companySize: 'individual' | 'startup' | 'growth' | 'enterprise';
    industry: string;
    expectedGrowth: 'stable' | 'moderate' | 'aggressive';
    budget: 'cost-sensitive' | 'balanced' | 'performance-first';
  };
  aiPersonalization: {
    learningEnabled: boolean;
    recommendationsEnabled: boolean;
    adaptiveDashboard: boolean;
    smartNotifications: boolean;
  };
  engagement: {
    lastActiveAt: Date;
    sessionFrequency: number;
    featureUsage: FeatureUsage[];
    supportInteractions: number;
    satisfactionScore: number;
  };
  predictions: {
    churnRisk: number;
    upgradesProbability: number;
    lifetimeValue: number;
    nextBestAction: string;
  };
}

export interface DashboardWidget {
  id: string;
  type: 'usage' | 'performance' | 'billing' | 'keys' | 'alerts' | 'insights';
  position: { x: number; y: number; width: number; height: number };
  config: Record<string, any>;
  enabled: boolean;
}

export interface NotificationPreferences {
  email: {
    usage_alerts: boolean;
    billing: boolean;
    security: boolean;
    marketing: boolean;
    updates: boolean;
  };
  dashboard: {
    real_time_alerts: boolean;
    performance_warnings: boolean;
    cost_optimization: boolean;
  };
  frequency: 'immediate' | 'daily' | 'weekly' | 'monthly';
}

export interface HourRange {
  start: number;
  end: number;
  timezone: string;
}

export interface EndpointPreference {
  endpoint: string;
  usage_percentage: number;
  avg_latency: number;
  success_rate: number;
}

export interface FeatureUsage {
  feature: string;
  usage_count: number;
  last_used: Date;
  proficiency: 'beginner' | 'intermediate' | 'expert';
}

@Injectable()
export class UserProfilingService {
  private readonly logger = new Logger(UserProfilingService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async getUserProfile(userId: string): Promise<UserProfile> {
    const cacheKey = `user_profile:${userId}`;
    
    // Check cache first (10-minute cache)
    const cachedProfile = await this.redis.get(cacheKey);
    if (cachedProfile) {
      return JSON.parse(cachedProfile);
    }

    const profile = await this.buildUserProfile(userId);
    
    // Cache for 10 minutes
    await this.redis.setex(cacheKey, 600, JSON.stringify(profile));
    
    return profile;
  }

  async updateUserPreferences(userId: string, preferences: Partial<UserProfile['preferences']>): Promise<void> {
    const currentProfile = await this.getUserProfile(userId);
    
    const updatedProfile = {
      ...currentProfile,
      preferences: {
        ...currentProfile.preferences,
        ...preferences,
      },
    };

    // Update in database (you'd need to create a user_profiles table)
    await this.saveProfileToDatabase(userId, updatedProfile);
    
    // Update cache
    const cacheKey = `user_profile:${userId}`;
    await this.redis.setex(cacheKey, 600, JSON.stringify(updatedProfile));

    this.logger.log(`Updated preferences for user ${userId}`);
  }

  async getPersonalizedDashboard(userId: string): Promise<DashboardWidget[]> {
    const profile = await this.getUserProfile(userId);
    
    // AI-powered dashboard personalization
    const widgets = await this.generateOptimalDashboard(profile);
    
    return widgets;
  }

  async getSmartRecommendations(userId: string): Promise<any[]> {
    const profile = await this.getUserProfile(userId);
    
    const recommendations = [];

    // Performance recommendations
    if (profile.usage.averageRPS > 100) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        title: 'Optimize High-Traffic Operations',
        description: 'Consider implementing request batching to reduce API calls by 30-50%',
        impact: 'Cost reduction and better performance',
        implementation: {
          difficulty: 'moderate',
          timeEstimate: '2-4 hours',
          resources: ['Batch API documentation', 'Code examples'],
        },
      });
    }

    // Plan recommendations
    if (profile.predictions.upgradesProbability > 0.7) {
      recommendations.push({
        type: 'subscription',
        priority: 'medium',
        title: 'Plan Upgrade Recommended',
        description: `Your usage pattern suggests ${profile.businessProfile.companySize === 'enterprise' ? 'Enterprise' : 'Professional'} plan would provide better value`,
        impact: 'Better rate limits and additional features',
        implementation: {
          difficulty: 'easy',
          timeEstimate: '5 minutes',
          resources: ['Plan comparison', 'Upgrade guide'],
        },
      });
    }

    // Security recommendations
    const inactiveKeys = await this.getInactiveApiKeys(userId);
    if (inactiveKeys.length > 0) {
      recommendations.push({
        type: 'security',
        priority: 'medium',
        title: 'Clean Up Unused API Keys',
        description: `You have ${inactiveKeys.length} API keys that haven't been used in 30+ days`,
        impact: 'Improved security and cleaner key management',
        implementation: {
          difficulty: 'easy',
          timeEstimate: '10 minutes',
          resources: ['Key management guide'],
        },
      });
    }

    // Industry-specific recommendations
    const industryRecommendations = this.getIndustrySpecificRecommendations(profile);
    recommendations.push(...industryRecommendations);

    return recommendations;
  }

  private async buildUserProfile(userId: string): Promise<UserProfile> {
    const [user, usageStats, subscriptions, apiKeys, sessions] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          notifications: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      }),
      this.getUsageStats(userId),
      this.getSubscriptionHistory(userId),
      this.getApiKeysWithUsage(userId),
      this.getRecentSessions(userId),
    ]);

    if (!user) {
      throw new Error('User not found');
    }

    // Analyze usage patterns
    const usageAnalysis = this.analyzeUsagePatterns(usageStats);
    const businessProfile = this.inferBusinessProfile(user, usageStats, subscriptions);
    const predictions = await this.generateUserPredictions(userId, usageStats, subscriptions, sessions);
    const engagement = this.calculateEngagementMetrics(user, sessions, apiKeys);

    // Build default preferences (can be overridden by user)
    const preferences = await this.getOrCreatePreferences(userId, usageAnalysis);

    return {
      userId,
      preferences,
      usage: usageAnalysis,
      businessProfile,
      aiPersonalization: {
        learningEnabled: true,
        recommendationsEnabled: true,
        adaptiveDashboard: true,
        smartNotifications: true,
      },
      engagement,
      predictions,
    };
  }

  private async getUsageStats(userId: string) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    return this.prisma.usageStats.findMany({
      where: {
        userId,
        date: { gte: thirtyDaysAgo },
      },
      orderBy: { date: 'desc' },
    });
  }

  private async getSubscriptionHistory(userId: string) {
    return this.prisma.subscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
  }

  private async getApiKeysWithUsage(userId: string) {
    return this.prisma.apiKey.findMany({
      where: { userId },
      include: {
        usageStats: {
          where: {
            date: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        },
      },
    });
  }

  private async getRecentSessions(userId: string) {
    return this.prisma.userSession.findMany({
      where: { userId },
      orderBy: { lastActivityAt: 'desc' },
      take: 10,
    });
  }

  private analyzeUsagePatterns(usageStats: any[]): UserProfile['usage'] {
    if (usageStats.length === 0) {
      return {
        primaryUseCase: 'development',
        averageRPS: 0,
        peakHours: [],
        geographicRegion: 'unknown',
        preferredEndpoints: [],
        integrationComplexity: 'simple',
      };
    }

    const totalRequests = usageStats.reduce((sum, stat) => sum + stat.requestCount, 0);
    const totalHours = usageStats.length;
    const averageRPS = totalRequests / (totalHours * 3600) || 0;

    // Analyze peak hours
    const hourlyUsage = new Array(24).fill(0);
    usageStats.forEach(stat => {
      hourlyUsage[stat.hour] += stat.requestCount;
    });

    const maxUsage = Math.max(...hourlyUsage);
    const peakThreshold = maxUsage * 0.7;
    const peakHours: HourRange[] = [];
    
    let currentRange: { start: number; end: number } | null = null;
    for (let hour = 0; hour < 24; hour++) {
      if (hourlyUsage[hour] >= peakThreshold) {
        if (!currentRange) {
          currentRange = { start: hour, end: hour };
        } else {
          currentRange.end = hour;
        }
      } else if (currentRange) {
        peakHours.push({ ...currentRange, timezone: 'UTC' });
        currentRange = null;
      }
    }
    if (currentRange) {
      peakHours.push({ ...currentRange, timezone: 'UTC' });
    }

    // Infer use case from patterns
    const primaryUseCase = this.inferUseCase(usageStats, averageRPS);

    // Analyze geographic distribution
    const regionCounts = {};
    usageStats.forEach(stat => {
      if (stat.region) {
        regionCounts[stat.region] = (regionCounts[stat.region] || 0) + stat.requestCount;
      }
    });

    const geographicRegion = Object.entries(regionCounts).length > 0
      ? Object.entries(regionCounts).sort(([,a], [,b]) => (b as number) - (a as number))[0][0]
      : 'unknown';

    // Analyze endpoint preferences
    const endpointCounts: Record<string, number> = {};
    const endpointLatency: Record<string, number> = {};
    const endpointSuccess: Record<string, number> = {};

    usageStats.forEach(stat => {
      if (stat.endpoint) {
        endpointCounts[stat.endpoint] = (endpointCounts[stat.endpoint] || 0) + stat.requestCount;
        endpointLatency[stat.endpoint] = (endpointLatency[stat.endpoint] || 0) + stat.totalLatency;
        endpointSuccess[stat.endpoint] = (endpointSuccess[stat.endpoint] || 0) + stat.successCount;
      }
    });

    const preferredEndpoints: EndpointPreference[] = Object.entries(endpointCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([endpoint, count]) => ({
        endpoint,
        usage_percentage: ((count as number) / totalRequests) * 100,
        avg_latency: endpointLatency[endpoint] / (count as number),
        success_rate: (endpointSuccess[endpoint] / (count as number)) * 100,
      }));

    // Determine integration complexity
    const integrationComplexity = this.assessIntegrationComplexity(usageStats, preferredEndpoints);

    return {
      primaryUseCase,
      averageRPS,
      peakHours,
      geographicRegion,
      preferredEndpoints,
      integrationComplexity,
    };
  }

  private inferUseCase(usageStats: any[], averageRPS: number): UserProfile['usage']['primaryUseCase'] {
    // Analyze patterns to infer use case
    const totalErrors = usageStats.reduce((sum, stat) => sum + stat.errorCount, 0);
    const totalRequests = usageStats.reduce((sum, stat) => sum + stat.requestCount, 0);
    const errorRate = totalErrors / totalRequests || 0;

    // High RPS with low error rate suggests production trading/defi
    if (averageRPS > 50 && errorRate < 0.01) {
      return 'trading';
    }

    // Moderate RPS with diverse endpoints suggests DeFi
    if (averageRPS > 10 && averageRPS <= 50) {
      return 'defi';
    }

    // Low RPS with high variety might be NFT applications
    if (averageRPS < 10 && totalRequests > 0) {
      return 'nft';
    }

    // Very low usage suggests development/testing
    if (averageRPS < 1) {
      return 'development';
    }

    // High volume suggests enterprise
    if (averageRPS > 100) {
      return 'enterprise';
    }

    return 'development';
  }

  private inferBusinessProfile(user: any, usageStats: any[], subscriptions: any[]): UserProfile['businessProfile'] {
    const totalRequests = usageStats.reduce((sum, stat) => sum + stat.requestCount, 0);
    
    // Infer company size from usage patterns
    let companySize: UserProfile['businessProfile']['companySize'] = 'individual';
    if (totalRequests > 1000000) companySize = 'enterprise';
    else if (totalRequests > 100000) companySize = 'growth';
    else if (totalRequests > 10000) companySize = 'startup';

    // Infer industry from usage patterns (simplified)
    let industry = 'technology';
    
    // Infer expected growth from subscription history
    let expectedGrowth: UserProfile['businessProfile']['expectedGrowth'] = 'stable';
    if (subscriptions.length > 1) {
      const isUpgrading = subscriptions[0]?.type > subscriptions[1]?.type;
      if (isUpgrading) expectedGrowth = 'aggressive';
      else expectedGrowth = 'moderate';
    }

    // Infer budget preference from subscription choices
    let budget: UserProfile['businessProfile']['budget'] = 'balanced';
    if (subscriptions.length > 0) {
      const currentPlan = subscriptions[0]?.type;
      if (currentPlan === 'FREE') budget = 'cost-sensitive';
      else if (currentPlan === 'ENTERPRISE') budget = 'performance-first';
    }

    return {
      companySize,
      industry,
      expectedGrowth,
      budget,
    };
  }

  private async generateUserPredictions(
    userId: string,
    usageStats: any[],
    subscriptions: any[],
    sessions: any[]
  ): Promise<UserProfile['predictions']> {
    // Simple ML-like predictions (in production, use actual ML models)
    const totalRequests = usageStats.reduce((sum, stat) => sum + stat.requestCount, 0);
    const avgDailyRequests = totalRequests / Math.max(1, usageStats.length / 24);
    
    // Churn risk based on engagement
    let churnRisk = 0;
    if (sessions.length === 0) churnRisk = 0.8;
    else if (sessions[0]?.lastActivityAt < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) churnRisk = 0.6;
    else if (avgDailyRequests < 10) churnRisk = 0.4;
    else churnRisk = 0.1;

    // Upgrade probability
    let upgradesProbability = 0;
    const currentPlan = subscriptions[0]?.type || 'FREE';
    if (currentPlan === 'FREE' && avgDailyRequests > 1000) upgradesProbability = 0.8;
    else if (currentPlan === 'STARTER' && avgDailyRequests > 10000) upgradesProbability = 0.7;
    else if (currentPlan === 'PROFESSIONAL' && avgDailyRequests > 100000) upgradesProbability = 0.6;

    // Lifetime value estimation
    const planValues = { FREE: 0, STARTER: 588, PROFESSIONAL: 3588, ENTERPRISE: 11988 }; // Annual values
    const lifetimeValue = planValues[currentPlan] || 0;

    // Next best action
    let nextBestAction = 'Explore API documentation';
    if (churnRisk > 0.5) nextBestAction = 'Re-engage with personalized demo';
    else if (upgradesProbability > 0.6) nextBestAction = 'Show upgrade benefits';
    else if (totalRequests === 0) nextBestAction = 'Complete API integration';

    return {
      churnRisk,
      upgradesProbability,
      lifetimeValue,
      nextBestAction,
    };
  }

  private calculateEngagementMetrics(user: any, sessions: any[], apiKeys: any[]): UserProfile['engagement'] {
    const lastSession = sessions[0];
    const lastActiveAt = lastSession?.lastActivityAt || user.createdAt;
    
    // Calculate session frequency (sessions per week)
    const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);
    const recentSessions = sessions.filter(s => new Date(s.createdAt) >= fourWeeksAgo);
    const sessionFrequency = (recentSessions.length / 4) || 0; // per week

    // Feature usage analysis
    const featureUsage: FeatureUsage[] = [
      {
        feature: 'api_keys',
        usage_count: apiKeys.length,
        last_used: apiKeys[0]?.lastUsedAt || user.createdAt,
        proficiency: apiKeys.length > 3 ? 'expert' : apiKeys.length > 1 ? 'intermediate' : 'beginner',
      },
      {
        feature: 'dashboard',
        usage_count: sessions.length,
        last_used: lastActiveAt,
        proficiency: sessions.length > 20 ? 'expert' : sessions.length > 5 ? 'intermediate' : 'beginner',
      },
    ];

    // Support interactions (would need support ticket data)
    const supportInteractions = 0; // Placeholder

    // Satisfaction score (would be based on feedback, NPS, etc.)
    const satisfactionScore = 85; // Placeholder

    return {
      lastActiveAt: new Date(lastActiveAt),
      sessionFrequency,
      featureUsage,
      supportInteractions,
      satisfactionScore,
    };
  }

  private async getOrCreatePreferences(userId: string, usageAnalysis: any): Promise<UserProfile['preferences']> {
    // Default preferences based on usage analysis
    const defaultNetwork = usageAnalysis.primaryUseCase === 'development' ? 'devnet' : 'mainnet';
    
    return {
      defaultNetwork,
      dashboardLayout: this.getDefaultDashboardLayout(),
      notificationSettings: {
        email: {
          usage_alerts: true,
          billing: true,
          security: true,
          marketing: false,
          updates: true,
        },
        dashboard: {
          real_time_alerts: true,
          performance_warnings: true,
          cost_optimization: true,
        },
        frequency: 'immediate',
      },
      apiKeyLabeling: ['Production', 'Development', 'Testing'],
      theme: 'auto',
    };
  }

  private getDefaultDashboardLayout(): DashboardWidget[] {
    return [
      {
        id: 'usage-overview',
        type: 'usage',
        position: { x: 0, y: 0, width: 6, height: 4 },
        config: { timeframe: '7d' },
        enabled: true,
      },
      {
        id: 'performance-metrics',
        type: 'performance',
        position: { x: 6, y: 0, width: 6, height: 4 },
        config: { metrics: ['latency', 'success_rate'] },
        enabled: true,
      },
      {
        id: 'api-keys',
        type: 'keys',
        position: { x: 0, y: 4, width: 4, height: 3 },
        config: { show_inactive: false },
        enabled: true,
      },
      {
        id: 'alerts',
        type: 'alerts',
        position: { x: 4, y: 4, width: 4, height: 3 },
        config: { priority: 'medium' },
        enabled: true,
      },
      {
        id: 'insights',
        type: 'insights',
        position: { x: 8, y: 4, width: 4, height: 3 },
        config: { max_items: 3 },
        enabled: true,
      },
    ];
  }

  private async generateOptimalDashboard(profile: UserProfile): Promise<DashboardWidget[]> {
    const widgets = [...profile.preferences.dashboardLayout];

    // AI-powered customization based on user behavior
    if (profile.usage.primaryUseCase === 'trading') {
      // Add real-time performance widget for traders
      widgets.push({
        id: 'realtime-performance',
        type: 'performance',
        position: { x: 0, y: 7, width: 12, height: 2 },
        config: { realtime: true, interval: '1s' },
        enabled: true,
      });
    }

    if (profile.businessProfile.companySize === 'enterprise') {
      // Add billing widget for enterprises
      widgets.push({
        id: 'enterprise-billing',
        type: 'billing',
        position: { x: 0, y: 9, width: 6, height: 3 },
        config: { detailed: true, forecasting: true },
        enabled: true,
      });
    }

    if (profile.predictions.churnRisk > 0.5) {
      // Add insights widget to help re-engage
      const insightWidget = widgets.find(w => w.type === 'insights');
      if (insightWidget) {
        insightWidget.config.priority = 'high';
        insightWidget.config.focus = 'engagement';
      }
    }

    return widgets;
  }

  private async getInactiveApiKeys(userId: string) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    return this.prisma.apiKey.findMany({
      where: {
        userId,
        OR: [
          { lastUsedAt: { lt: thirtyDaysAgo } },
          { lastUsedAt: null },
        ],
      },
    });
  }

  private getIndustrySpecificRecommendations(profile: UserProfile): any[] {
    const recommendations = [];

    if (profile.usage.primaryUseCase === 'defi') {
      recommendations.push({
        type: 'integration',
        priority: 'medium',
        title: 'Optimize for DeFi Protocols',
        description: 'Consider implementing transaction simulation to reduce failed transactions',
        impact: 'Reduced gas costs and better user experience',
        implementation: {
          difficulty: 'moderate',
          timeEstimate: '4-6 hours',
          resources: ['Transaction simulation guide', 'DeFi best practices'],
        },
      });
    }

    if (profile.usage.primaryUseCase === 'nft') {
      recommendations.push({
        type: 'performance',
        priority: 'low',
        title: 'NFT Metadata Caching',
        description: 'Implement metadata caching to reduce redundant API calls',
        impact: 'Faster loading times and reduced API usage',
        implementation: {
          difficulty: 'easy',
          timeEstimate: '2-3 hours',
          resources: ['Caching strategies', 'NFT metadata guide'],
        },
      });
    }

    return recommendations;
  }

  private assessIntegrationComplexity(usageStats: any[], endpoints: EndpointPreference[]): UserProfile['usage']['integrationComplexity'] {
    const uniqueEndpoints = endpoints.length;
    const avgSuccessRate = endpoints.reduce((sum, ep) => sum + ep.success_rate, 0) / endpoints.length || 100;

    if (uniqueEndpoints > 10 || avgSuccessRate < 90) {
      return 'advanced';
    } else if (uniqueEndpoints > 3 || avgSuccessRate < 95) {
      return 'moderate';
    } else {
      return 'simple';
    }
  }

  private async saveProfileToDatabase(userId: string, profile: UserProfile): Promise<void> {
    // In a real implementation, you'd save to a user_profiles table
    // For now, we'll just log it
    this.logger.log(`Profile updated for user ${userId}: ${JSON.stringify(profile.preferences)}`);
  }
}