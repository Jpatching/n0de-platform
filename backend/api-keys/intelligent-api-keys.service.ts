import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import { RedisService } from "../common/redis.service";
import { ApiKeysService } from "./api-keys.service";

export interface ApiKeyInsight {
  keyId: string;
  name: string;
  insights: {
    usagePattern: "active" | "moderate" | "inactive" | "sporadic";
    healthScore: number;
    securityRisk: "low" | "medium" | "high";
    performanceRating: number;
    recommendations: Recommendation[];
  };
  analytics: {
    requestsLast7Days: number;
    requestsLast30Days: number;
    averageLatency: number;
    errorRate: number;
    popularEndpoints: string[];
    geographicDistribution: { region: string; percentage: number }[];
  };
  predictions: {
    expectedUsageNextMonth: number;
    churnRisk: number;
    optimizationPotential: number;
  };
}

export interface Recommendation {
  type: "security" | "performance" | "cost" | "usage";
  priority: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  action: string;
  impact: string;
  effort: "low" | "medium" | "high";
}

export interface IntelligentKeyConfig {
  autoRotation: boolean;
  rotationInterval: number; // days
  anomalyDetection: boolean;
  rateLimitOptimization: boolean;
  geographicRestrictions: string[];
  timeBasedAccess: {
    enabled: boolean;
    allowedHours: number[];
    timezone: string;
  };
  ipWhitelist: string[];
}

export interface ApiKeyMetrics {
  totalKeys: number;
  activeKeys: number;
  healthyKeys: number;
  keysNeedingAttention: number;
  averageHealthScore: number;
  securityAlerts: number;
  optimizationOpportunities: number;
}

@Injectable()
export class IntelligentApiKeysService {
  private readonly logger = new Logger(IntelligentApiKeysService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private apiKeysService: ApiKeysService,
  ) {}

  async getApiKeyInsights(
    userId: string,
    keyId: string,
  ): Promise<ApiKeyInsight> {
    const cacheKey = `api_key_insights:${userId}:${keyId}`;

    // Check cache first (5-minute cache)
    const cachedInsights = await this.redis.get(cacheKey);
    if (cachedInsights) {
      return JSON.parse(cachedInsights);
    }

    const [apiKey, usageStats, recentActivity] = await Promise.all([
      this.prisma.apiKey.findFirst({
        where: { id: keyId, userId },
      }),
      this.getApiKeyUsageStats(keyId),
      this.getRecentApiKeyActivity(keyId),
    ]);

    if (!apiKey) {
      throw new Error("API key not found");
    }

    const insights = await this.analyzeApiKey(
      apiKey,
      usageStats,
      recentActivity,
    );

    // Cache for 5 minutes
    await this.redis.setex(cacheKey, 300, JSON.stringify(insights));

    return insights;
  }

  async getAllApiKeyInsights(userId: string): Promise<ApiKeyInsight[]> {
    const apiKeys = await this.prisma.apiKey.findMany({
      where: { userId },
    });

    const insights = await Promise.all(
      apiKeys.map((key) => this.getApiKeyInsights(userId, key.id)),
    );

    return insights;
  }

  async getKeyManagementDashboard(userId: string): Promise<{
    metrics: ApiKeyMetrics;
    insights: ApiKeyInsight[];
    recommendations: Recommendation[];
    alerts: any[];
  }> {
    const insights = await this.getAllApiKeyInsights(userId);
    const metrics = this.calculateKeyMetrics(insights);
    const recommendations = this.generateKeyManagementRecommendations(insights);
    const alerts = await this.generateSecurityAlerts(userId, insights);

    return {
      metrics,
      insights,
      recommendations,
      alerts,
    };
  }

  async optimizeApiKeyRateLimit(
    userId: string,
    keyId: string,
  ): Promise<{
    currentLimit: number;
    recommendedLimit: number;
    reasoning: string;
    potentialSavings: number;
  }> {
    const insights = await this.getApiKeyInsights(userId, keyId);
    const usagePattern = await this.analyzeUsagePattern(keyId);

    const currentLimit =
      (
        await this.prisma.apiKey.findFirst({
          where: { id: keyId },
          select: { rateLimit: true },
        })
      )?.rateLimit || 1000;

    const recommendedLimit = this.calculateOptimalRateLimit(
      usagePattern,
      currentLimit,
    );

    return {
      currentLimit,
      recommendedLimit,
      reasoning: this.explainRateLimitRecommendation(
        usagePattern,
        recommendedLimit,
      ),
      potentialSavings: this.calculatePotentialSavings(
        currentLimit,
        recommendedLimit,
      ),
    };
  }

  async enableIntelligentFeatures(
    userId: string,
    keyId: string,
    config: IntelligentKeyConfig,
  ): Promise<void> {
    // Store intelligent configuration
    const configKey = `intelligent_config:${keyId}`;
    await this.redis.setex(configKey, 86400 * 30, JSON.stringify(config)); // 30 days

    // Set up monitoring and automation
    if (config.anomalyDetection) {
      await this.setupAnomalyDetection(keyId);
    }

    if (config.autoRotation) {
      await this.scheduleKeyRotation(keyId, config.rotationInterval);
    }

    this.logger.log(
      `Intelligent features enabled for API key ${keyId}: ${JSON.stringify(config)}`,
    );
  }

  async detectAnomalies(keyId: string): Promise<{
    anomalies: any[];
    severity: "low" | "medium" | "high";
    recommendations: string[];
  }> {
    const recentActivity = await this.getRecentApiKeyActivity(keyId);
    const baseline = await this.getBaselineMetrics(keyId);

    const anomalies = [];

    // Detect traffic spikes
    const avgRequests = baseline.averageRequestsPerHour;
    const recentRequests = recentActivity.slice(0, 6); // Last 6 hours

    recentRequests.forEach((hour, index) => {
      if (hour.requestCount > avgRequests * 3) {
        anomalies.push({
          type: "traffic_spike",
          severity: "high",
          timestamp: hour.timestamp,
          value: hour.requestCount,
          baseline: avgRequests,
          multiplier: hour.requestCount / avgRequests,
        });
      }
    });

    // Detect unusual geographic patterns
    const newRegions = recentActivity
      .filter((activity) => !baseline.commonRegions.includes(activity.region))
      .map((activity) => activity.region)
      .filter((region, index, self) => self.indexOf(region) === index);

    if (newRegions.length > 0) {
      anomalies.push({
        type: "geographic_anomaly",
        severity: "medium",
        regions: newRegions,
        description: `API key used from ${newRegions.length} new geographic regions`,
      });
    }

    // Detect unusual error patterns
    const recentErrorRate =
      recentActivity.reduce((sum, hour) => sum + hour.errorRate, 0) /
      recentActivity.length;
    if (recentErrorRate > baseline.averageErrorRate * 2) {
      anomalies.push({
        type: "error_spike",
        severity: "high",
        currentErrorRate: recentErrorRate,
        baselineErrorRate: baseline.averageErrorRate,
      });
    }

    const severity = anomalies.some((a) => a.severity === "high")
      ? "high"
      : anomalies.some((a) => a.severity === "medium")
        ? "medium"
        : "low";

    return {
      anomalies,
      severity,
      recommendations: this.generateAnomalyRecommendations(anomalies),
    };
  }

  async autoOptimizeApiKeys(userId: string): Promise<{
    optimizations: any[];
    potentialSavings: number;
    performanceImprovements: string[];
  }> {
    const insights = await this.getAllApiKeyInsights(userId);
    const optimizations = [];
    let totalSavings = 0;
    const performanceImprovements = [];

    for (const insight of insights) {
      // Rate limit optimization
      if (insight.predictions.optimizationPotential > 0.3) {
        const rateLimitOpt = await this.optimizeApiKeyRateLimit(
          userId,
          insight.keyId,
        );

        if (rateLimitOpt.recommendedLimit !== rateLimitOpt.currentLimit) {
          optimizations.push({
            type: "rate_limit",
            keyId: insight.keyId,
            keyName: insight.name,
            action: "adjust_rate_limit",
            current: rateLimitOpt.currentLimit,
            recommended: rateLimitOpt.recommendedLimit,
            savings: rateLimitOpt.potentialSavings,
          });

          totalSavings += rateLimitOpt.potentialSavings;
        }
      }

      // Security improvements
      if (insight.insights.securityRisk === "high") {
        optimizations.push({
          type: "security",
          keyId: insight.keyId,
          keyName: insight.name,
          action: "enhance_security",
          recommendations: insight.insights.recommendations.filter(
            (r) => r.type === "security",
          ),
        });
      }

      // Performance optimizations
      if (insight.insights.performanceRating < 80) {
        const perfRecommendations = insight.insights.recommendations
          .filter((r) => r.type === "performance")
          .map((r) => r.title);

        if (perfRecommendations.length > 0) {
          performanceImprovements.push(...perfRecommendations);

          optimizations.push({
            type: "performance",
            keyId: insight.keyId,
            keyName: insight.name,
            action: "optimize_performance",
            improvements: perfRecommendations,
          });
        }
      }
    }

    return {
      optimizations,
      potentialSavings: totalSavings,
      performanceImprovements: [...new Set(performanceImprovements)],
    };
  }

  async generateSmartAlerts(userId: string): Promise<any[]> {
    const insights = await this.getAllApiKeyInsights(userId);
    const alerts = [];

    for (const insight of insights) {
      // Unused key alert
      if (insight.insights.usagePattern === "inactive") {
        alerts.push({
          type: "unused_key",
          priority: "medium",
          keyId: insight.keyId,
          keyName: insight.name,
          message: `API key "${insight.name}" hasn't been used in 30+ days`,
          action: "Consider deactivating or removing this key",
        });
      }

      // Security risk alert
      if (insight.insights.securityRisk === "high") {
        alerts.push({
          type: "security_risk",
          priority: "high",
          keyId: insight.keyId,
          keyName: insight.name,
          message: "High security risk detected",
          action: "Review and implement security recommendations",
        });
      }

      // Performance degradation alert
      if (insight.insights.performanceRating < 60) {
        alerts.push({
          type: "performance_degradation",
          priority: "medium",
          keyId: insight.keyId,
          keyName: insight.name,
          message: `Performance rating is ${insight.insights.performanceRating}/100`,
          action: "Review performance optimization recommendations",
        });
      }

      // High error rate alert
      if (insight.analytics.errorRate > 5) {
        alerts.push({
          type: "high_error_rate",
          priority: "high",
          keyId: insight.keyId,
          keyName: insight.name,
          message: `Error rate is ${insight.analytics.errorRate.toFixed(1)}%`,
          action: "Investigate error patterns and fix integration issues",
        });
      }
    }

    return alerts;
  }

  private async analyzeApiKey(
    apiKey: any,
    usageStats: any[],
    recentActivity: any[],
  ): Promise<ApiKeyInsight> {
    // Analyze usage pattern
    const usagePattern = this.classifyUsagePattern(usageStats);
    const healthScore = this.calculateHealthScore(apiKey, usageStats);
    const securityRisk = this.assessSecurityRisk(apiKey, recentActivity);
    const performanceRating = this.calculatePerformanceRating(usageStats);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      apiKey,
      usageStats,
      usagePattern,
      securityRisk,
    );

    // Calculate analytics
    const analytics = this.calculateAnalytics(usageStats);

    // Generate predictions
    const predictions = this.generatePredictions(usageStats, usagePattern);

    return {
      keyId: apiKey.id,
      name: apiKey.name,
      insights: {
        usagePattern,
        healthScore,
        securityRisk,
        performanceRating,
        recommendations,
      },
      analytics,
      predictions,
    };
  }

  private async getApiKeyUsageStats(keyId: string) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    return this.prisma.usageStats.findMany({
      where: {
        apiKeyId: keyId,
        date: { gte: thirtyDaysAgo },
      },
      orderBy: { date: "desc" },
    });
  }

  private async getRecentApiKeyActivity(keyId: string) {
    // Simulated activity data - in production, this would come from logs/metrics
    return Array.from({ length: 24 }, (_, i) => ({
      timestamp: new Date(Date.now() - i * 3600000),
      requestCount: Math.floor(Math.random() * 1000),
      errorRate: Math.random() * 10,
      region: ["us-east-1", "us-west-2", "eu-west-1"][
        Math.floor(Math.random() * 3)
      ],
    }));
  }

  private classifyUsagePattern(
    usageStats: any[],
  ): "active" | "moderate" | "inactive" | "sporadic" {
    if (usageStats.length === 0) return "inactive";

    const totalRequests = usageStats.reduce(
      (sum, stat) => sum + stat.requestCount,
      0,
    );
    const avgDaily = totalRequests / Math.max(1, usageStats.length);

    const activeDays = usageStats.filter(
      (stat) => stat.requestCount > 0,
    ).length;
    const consistency = activeDays / usageStats.length;

    if (avgDaily > 1000) return "active";
    if (avgDaily > 100 && consistency > 0.5) return "moderate";
    if (avgDaily > 0 && consistency < 0.3) return "sporadic";
    return "inactive";
  }

  private calculateHealthScore(apiKey: any, usageStats: any[]): number {
    let score = 100;

    // Deduct for inactivity
    if (usageStats.length === 0) score -= 40;

    // Deduct for high error rate
    const avgErrorRate =
      usageStats.reduce(
        (sum, stat) => sum + (stat.errorCount / stat.requestCount || 0),
        0,
      ) / usageStats.length;
    if (avgErrorRate > 0.05) score -= 20;

    // Deduct for old last used date
    if (
      apiKey.lastUsedAt &&
      new Date(apiKey.lastUsedAt) <
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ) {
      score -= 15;
    }

    return Math.max(0, Math.min(100, score));
  }

  private assessSecurityRisk(
    apiKey: any,
    recentActivity: any[],
  ): "low" | "medium" | "high" {
    // Assess security risk factors
    if (!apiKey.lastUsedAt) return "low";

    const uniqueRegions = new Set(recentActivity.map((a) => a.region)).size;
    const hasSpikes = recentActivity.some((a) => a.requestCount > 5000);

    if (uniqueRegions > 5 || hasSpikes) return "high";
    if (uniqueRegions > 2) return "medium";
    return "low";
  }

  private calculatePerformanceRating(usageStats: any[]): number {
    if (usageStats.length === 0) return 0;

    const avgLatency =
      usageStats.reduce((sum, stat) => sum + stat.avgLatency, 0) /
      usageStats.length;
    const avgSuccessRate =
      usageStats.reduce(
        (sum, stat) => sum + (stat.successCount / stat.requestCount || 1),
        0,
      ) / usageStats.length;

    let rating = 100;

    // Deduct for high latency
    if (avgLatency > 200) rating -= (avgLatency - 200) / 10;

    // Deduct for low success rate
    if (avgSuccessRate < 0.95) rating -= (0.95 - avgSuccessRate) * 200;

    return Math.max(0, Math.min(100, rating));
  }

  private generateRecommendations(
    apiKey: any,
    usageStats: any[],
    usagePattern: string,
    securityRisk: string,
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    if (usagePattern === "inactive") {
      recommendations.push({
        type: "usage",
        priority: "medium",
        title: "Consider Deactivating Unused Key",
        description: "This API key has been inactive for an extended period",
        action: "Deactivate or remove this key to reduce security risks",
        impact: "Improved security and cleaner key management",
        effort: "low",
      });
    }

    if (securityRisk === "high") {
      recommendations.push({
        type: "security",
        priority: "high",
        title: "Implement Additional Security Measures",
        description:
          "Unusual usage patterns detected that may indicate security risks",
        action:
          "Add IP restrictions, enable geographic filtering, or rotate the key",
        impact: "Significantly improved security",
        effort: "medium",
      });
    }

    // Add more recommendation logic based on various factors

    return recommendations;
  }

  private calculateAnalytics(usageStats: any[]) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recent7Days = usageStats.filter(
      (stat) => new Date(stat.date) >= sevenDaysAgo,
    );

    return {
      requestsLast7Days: recent7Days.reduce(
        (sum, stat) => sum + stat.requestCount,
        0,
      ),
      requestsLast30Days: usageStats.reduce(
        (sum, stat) => sum + stat.requestCount,
        0,
      ),
      averageLatency:
        usageStats.reduce((sum, stat) => sum + stat.avgLatency, 0) /
          usageStats.length || 0,
      errorRate:
        (usageStats.reduce(
          (sum, stat) => sum + (stat.errorCount / stat.requestCount || 0),
          0,
        ) /
          usageStats.length) *
          100 || 0,
      popularEndpoints: this.extractPopularEndpoints(usageStats),
      geographicDistribution: this.calculateGeographicDistribution(usageStats),
    };
  }

  private generatePredictions(usageStats: any[], usagePattern: string) {
    const recentUsage = usageStats
      .slice(0, 7)
      .reduce((sum, stat) => sum + stat.requestCount, 0);
    const expectedUsageNextMonth = Math.round((recentUsage / 7) * 30);

    const churnRisk =
      usagePattern === "inactive"
        ? 0.8
        : usagePattern === "sporadic"
          ? 0.4
          : 0.1;
    const optimizationPotential =
      usageStats.length > 0 ? Math.random() * 0.5 : 0;

    return {
      expectedUsageNextMonth,
      churnRisk,
      optimizationPotential,
    };
  }

  // Helper methods
  private calculateKeyMetrics(insights: ApiKeyInsight[]): ApiKeyMetrics {
    return {
      totalKeys: insights.length,
      activeKeys: insights.filter((i) => i.insights.usagePattern === "active")
        .length,
      healthyKeys: insights.filter((i) => i.insights.healthScore > 80).length,
      keysNeedingAttention: insights.filter((i) =>
        i.insights.recommendations.some((r) => r.priority === "high"),
      ).length,
      averageHealthScore:
        insights.reduce((sum, i) => sum + i.insights.healthScore, 0) /
          insights.length || 0,
      securityAlerts: insights.filter((i) => i.insights.securityRisk === "high")
        .length,
      optimizationOpportunities: insights.filter(
        (i) => i.predictions.optimizationPotential > 0.3,
      ).length,
    };
  }

  private generateKeyManagementRecommendations(
    insights: ApiKeyInsight[],
  ): Recommendation[] {
    // Aggregate recommendations from all keys
    const allRecommendations = insights.flatMap(
      (i) => i.insights.recommendations,
    );

    // Deduplicate and prioritize
    const uniqueRecommendations = allRecommendations.filter(
      (rec, index, self) =>
        self.findIndex((r) => r.title === rec.title) === index,
    );

    return uniqueRecommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  private async generateSecurityAlerts(
    userId: string,
    insights: ApiKeyInsight[],
  ): Promise<any[]> {
    const alerts = [];

    const highRiskKeys = insights.filter(
      (i) => i.insights.securityRisk === "high",
    );
    if (highRiskKeys.length > 0) {
      alerts.push({
        type: "security_risk",
        priority: "high",
        message: `${highRiskKeys.length} API keys have high security risk`,
        keys: highRiskKeys.map((k) => ({ id: k.keyId, name: k.name })),
      });
    }

    return alerts;
  }

  // More helper methods would be implemented here...
  private async analyzeUsagePattern(keyId: string) {
    return {};
  }
  private calculateOptimalRateLimit(
    usagePattern: any,
    currentLimit: number,
  ): number {
    return currentLimit;
  }
  private explainRateLimitRecommendation(
    usagePattern: any,
    recommendedLimit: number,
  ): string {
    return "";
  }
  private calculatePotentialSavings(
    currentLimit: number,
    recommendedLimit: number,
  ): number {
    return 0;
  }
  private async setupAnomalyDetection(keyId: string) {}
  private async scheduleKeyRotation(keyId: string, interval: number) {}
  private async getBaselineMetrics(keyId: string) {
    return {
      averageRequestsPerHour: 100,
      commonRegions: ["us-east-1"],
      averageErrorRate: 0.01,
    };
  }
  private generateAnomalyRecommendations(anomalies: any[]): string[] {
    return [];
  }
  private extractPopularEndpoints(usageStats: any[]): string[] {
    return [];
  }
  private calculateGeographicDistribution(
    usageStats: any[],
  ): { region: string; percentage: number }[] {
    return [];
  }
}
