import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AnalyticsInsightsService, UserAnalytics } from './analytics-insights.service';
import { UserProfilingService, UserProfile } from './user-profiling.service';

export interface DashboardAnalytics {
  overview: {
    totalRequests: number;
    successRate: number;
    averageLatency: number;
    activeApiKeys: number;
    costThisMonth: number;
    requestsThisMonth: number;
  };
  trends: {
    requestsOverTime: TimeSeriesData[];
    latencyOverTime: TimeSeriesData[];
    errorRateOverTime: TimeSeriesData[];
  };
  insights: any[];
  recommendations: any[];
  alerts: Alert[];
}

export interface TimeSeriesData {
  timestamp: Date;
  value: number;
  label?: string;
}

export interface Alert {
  id: string;
  type: 'warning' | 'error' | 'info' | 'success';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  actionRequired: boolean;
  createdAt: Date;
  resolvedAt?: Date;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private prisma: PrismaService,
    private insightsService: AnalyticsInsightsService,
    private profilingService: UserProfilingService,
  ) {}

  async getDashboardAnalytics(userId: string, timeframe: '1d' | '7d' | '30d' = '7d'): Promise<DashboardAnalytics> {
    const [overview, trends, userAnalytics, userProfile] = await Promise.all([
      this.getOverviewMetrics(userId, timeframe),
      this.getTrendAnalytics(userId, timeframe),
      this.insightsService.generateUserInsights(userId),
      this.profilingService.getUserProfile(userId),
    ]);

    const recommendations = await this.profilingService.getSmartRecommendations(userId);
    const alerts = await this.generateAlerts(userId, userAnalytics, userProfile);

    return {
      overview,
      trends,
      insights: userAnalytics.insights,
      recommendations,
      alerts,
    };
  }

  async getAdvancedAnalytics(userId: string): Promise<{
    userProfile: UserProfile;
    analytics: UserAnalytics;
    performanceAnalysis: any;
    costAnalysis: any;
    predictiveInsights: any;
  }> {
    const [userProfile, analytics, performanceAnalysis, costAnalysis] = await Promise.all([
      this.profilingService.getUserProfile(userId),
      this.insightsService.generateUserInsights(userId),
      this.getPerformanceAnalysis(userId),
      this.getCostAnalysis(userId),
    ]);

    const predictiveInsights = await this.generatePredictiveInsights(userId, analytics, userProfile);

    return {
      userProfile,
      analytics,
      performanceAnalysis,
      costAnalysis,
      predictiveInsights,
    };
  }

  async updateUserDashboardLayout(userId: string, layout: any[]): Promise<void> {
    await this.profilingService.updateUserPreferences(userId, {
      dashboardLayout: layout,
    });
  }

  async getPersonalizedDashboard(userId: string): Promise<any> {
    const profile = await this.profilingService.getUserProfile(userId);
    const widgets = await this.profilingService.getPersonalizedDashboard(userId);
    
    // Add real-time data to widgets
    const enhancedWidgets = await this.enhanceWidgetsWithData(userId, widgets);

    return {
      layout: enhancedWidgets,
      profile: profile.preferences,
      aiPersonalization: profile.aiPersonalization,
    };
  }

  private async getOverviewMetrics(userId: string, timeframe: string) {
    const timeRange = this.getTimeRange(timeframe);
    
    const [usageStats, apiKeys, subscription, billingUsage] = await Promise.all([
      this.prisma.usageStats.aggregate({
        where: {
          userId,
          date: { gte: timeRange.start },
        },
        _sum: {
          requestCount: true,
          successCount: true,
          totalLatency: true,
        },
        _count: true,
      }),
      this.prisma.apiKey.count({
        where: {
          userId,
          isActive: true,
          lastUsedAt: { gte: timeRange.start },
        },
      }),
      this.prisma.subscription.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.billingUsage.findMany({
        where: {
          userId,
          periodStart: { gte: timeRange.start },
        },
      }),
    ]);

    const totalRequests = usageStats._sum.requestCount || 0;
    const totalSuccess = usageStats._sum.successCount || 0;
    const totalLatency = usageStats._sum.totalLatency || 0;

    const successRate = totalRequests > 0 ? (totalSuccess / totalRequests) * 100 : 100;
    const averageLatency = totalRequests > 0 ? totalLatency / totalRequests : 0;

    // Calculate cost (simplified - would use actual billing data)
    const planCosts = { FREE: 0, STARTER: 49, PROFESSIONAL: 299, ENTERPRISE: 999 };
    const costThisMonth = planCosts[subscription?.planType] || 0;

    return {
      totalRequests,
      successRate,
      averageLatency,
      activeApiKeys: apiKeys,
      costThisMonth,
      requestsThisMonth: totalRequests,
    };
  }

  private async getTrendAnalytics(userId: string, timeframe: string) {
    const timeRange = this.getTimeRange(timeframe);
    
    const usageData = await this.prisma.usageStats.findMany({
      where: {
        userId,
        date: { gte: timeRange.start },
      },
      orderBy: [
        { date: 'asc' },
        { hour: 'asc' },
      ],
    });

    // Group by appropriate time intervals
    const intervalMs = timeframe === '1d' ? 3600000 : timeframe === '7d' ? 86400000 : 86400000; // 1h, 1d, 1d
    const groupedData = this.groupDataByInterval(usageData, intervalMs);

    const requestsOverTime: TimeSeriesData[] = groupedData.map((group: any) => ({
      timestamp: new Date(group.timestamp),
      value: group.requestCount,
    }));

    const latencyOverTime: TimeSeriesData[] = groupedData.map((group: any) => ({
      timestamp: new Date(group.timestamp),
      value: group.requestCount > 0 ? group.totalLatency / group.requestCount : 0,
    }));

    const errorRateOverTime: TimeSeriesData[] = groupedData.map((group: any) => ({
      timestamp: new Date(group.timestamp),
      value: group.requestCount > 0 ? ((group.requestCount - group.successCount) / group.requestCount) * 100 : 0,
    }));

    return {
      requestsOverTime,
      latencyOverTime,
      errorRateOverTime,
    };
  }

  private async getPerformanceAnalysis(userId: string) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const [endpointPerformance, regionalPerformance, temporalAnalysis] = await Promise.all([
      this.getEndpointPerformanceAnalysis(userId, thirtyDaysAgo),
      this.getRegionalPerformanceAnalysis(userId, thirtyDaysAgo),
      this.getTemporalPerformanceAnalysis(userId, thirtyDaysAgo),
    ]);

    return {
      endpointPerformance,
      regionalPerformance,
      temporalAnalysis,
      recommendations: this.generatePerformanceRecommendations({
        endpointPerformance,
        regionalPerformance,
        temporalAnalysis,
      }),
    };
  }

  private async getCostAnalysis(userId: string) {
    const [currentUsage, historicalCosts, projectedCosts, optimizationOpportunities] = await Promise.all([
      this.getCurrentUsageAnalysis(userId),
      this.getHistoricalCostAnalysis(userId),
      this.getProjectedCostAnalysis(userId),
      this.getCostOptimizationOpportunities(userId),
    ]);

    return {
      currentUsage,
      historicalCosts,
      projectedCosts,
      optimizationOpportunities,
      recommendations: this.generateCostRecommendations({
        currentUsage,
        projectedCosts,
        optimizationOpportunities,
      }),
    };
  }

  private async generatePredictiveInsights(userId: string, analytics: UserAnalytics, profile: UserProfile) {
    return {
      churnPrediction: {
        risk: profile.predictions.churnRisk,
        factors: this.getChurnRiskFactors(analytics, profile),
        preventionActions: this.getChurnPreventionActions(profile),
      },
      usageForecasting: {
        nextMonth: analytics.predictions.nextMonthUsage,
        seasonalAdjustment: this.calculateSeasonalAdjustment(userId),
        growthTrend: this.calculateGrowthTrend(userId),
      },
      optimizationPotential: {
        costSavings: this.calculatePotentialCostSavings(analytics),
        performanceGains: this.calculatePotentialPerformanceGains(analytics),
        efficiencyImprovements: this.calculateEfficiencyImprovements(analytics),
      },
    };
  }

  private async generateAlerts(userId: string, analytics: UserAnalytics, profile: UserProfile): Promise<Alert[]> {
    const alerts: Alert[] = [];

    // High error rate alert
    if (analytics.patterns.successRate < 95) {
      alerts.push({
        id: `error-rate-${userId}-${Date.now()}`,
        type: 'error',
        priority: 'high',
        title: 'High Error Rate Detected',
        message: `Your success rate is ${analytics.patterns.successRate.toFixed(1)}%, below the recommended 95%`,
        actionRequired: true,
        createdAt: new Date(),
      });
    }

    // Usage spike alert
    const recentUsage = await this.getRecentUsageSpike(userId);
    if (recentUsage.spikeDetected) {
      alerts.push({
        id: `usage-spike-${userId}-${Date.now()}`,
        type: 'warning',
        priority: 'medium',
        title: 'Unusual Traffic Spike',
        message: `Traffic is ${recentUsage.multiplier}x higher than usual`,
        actionRequired: false,
        createdAt: new Date(),
      });
    }

    // Churn risk alert
    if (profile.predictions.churnRisk > 0.6) {
      alerts.push({
        id: `churn-risk-${userId}-${Date.now()}`,
        type: 'warning',
        priority: 'high',
        title: 'Engagement Alert',
        message: 'We noticed reduced activity. Need help with your integration?',
        actionRequired: true,
        createdAt: new Date(),
      });
    }

    // Upgrade recommendation alert
    if (profile.predictions.upgradesProbability > 0.7) {
      alerts.push({
        id: `upgrade-rec-${userId}-${Date.now()}`,
        type: 'info',
        priority: 'medium',
        title: 'Plan Upgrade Recommended',
        message: 'Your usage pattern suggests you could benefit from upgrading your plan',
        actionRequired: false,
        createdAt: new Date(),
      });
    }

    return alerts;
  }

  private async enhanceWidgetsWithData(userId: string, widgets: any[]) {
    const enhancedWidgets = [];

    for (const widget of widgets) {
      const enhancedWidget = { ...widget };

      switch (widget.type) {
        case 'usage':
          enhancedWidget.data = await this.getUsageWidgetData(userId, widget.config);
          break;
        case 'performance':
          enhancedWidget.data = await this.getPerformanceWidgetData(userId, widget.config);
          break;
        case 'billing':
          enhancedWidget.data = await this.getBillingWidgetData(userId, widget.config);
          break;
        case 'keys':
          enhancedWidget.data = await this.getApiKeysWidgetData(userId, widget.config);
          break;
        case 'alerts':
          enhancedWidget.data = await this.getAlertsWidgetData(userId, widget.config);
          break;
        case 'insights':
          enhancedWidget.data = await this.getInsightsWidgetData(userId, widget.config);
          break;
      }

      enhancedWidgets.push(enhancedWidget);
    }

    return enhancedWidgets;
  }

  // Helper methods
  private getTimeRange(timeframe: string) {
    const now = new Date();
    const ranges = {
      '1d': new Date(now.getTime() - 24 * 60 * 60 * 1000),
      '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    };

    return {
      start: ranges[timeframe] || ranges['7d'],
      end: now,
    };
  }

  private groupDataByInterval(data: any[], intervalMs: number) {
    const grouped = {};

    data.forEach(item => {
      const timestamp = Math.floor(new Date(item.date).getTime() / intervalMs) * intervalMs;
      
      if (!grouped[timestamp]) {
        grouped[timestamp] = {
          timestamp,
          requestCount: 0,
          successCount: 0,
          totalLatency: 0,
        };
      }

      grouped[timestamp].requestCount += item.requestCount;
      grouped[timestamp].successCount += item.successCount;
      grouped[timestamp].totalLatency += item.totalLatency;
    });

    return Object.values(grouped).sort((a: any, b: any) => a.timestamp - b.timestamp);
  }

  // Placeholder implementations for analysis methods
  private async getEndpointPerformanceAnalysis(userId: string, since: Date) { return {}; }
  private async getRegionalPerformanceAnalysis(userId: string, since: Date) { return {}; }
  private async getTemporalPerformanceAnalysis(userId: string, since: Date) { return {}; }
  private async getCurrentUsageAnalysis(userId: string) { return {}; }
  private async getHistoricalCostAnalysis(userId: string) { return {}; }
  private async getProjectedCostAnalysis(userId: string) { return {}; }
  private async getCostOptimizationOpportunities(userId: string) { return {}; }
  private async getRecentUsageSpike(userId: string) { return { spikeDetected: false, multiplier: 1 }; }

  // Widget data methods
  private async getUsageWidgetData(userId: string, config: any) { return {}; }
  private async getPerformanceWidgetData(userId: string, config: any) { return {}; }
  private async getBillingWidgetData(userId: string, config: any) { return {}; }
  private async getApiKeysWidgetData(userId: string, config: any) { return {}; }
  private async getAlertsWidgetData(userId: string, config: any) { return {}; }
  private async getInsightsWidgetData(userId: string, config: any) { return {}; }

  // Analysis helper methods
  private generatePerformanceRecommendations(data: any) { return []; }
  private generateCostRecommendations(data: any) { return []; }
  private getChurnRiskFactors(analytics: any, profile: any) { return []; }
  private getChurnPreventionActions(profile: any) { return []; }
  private calculateSeasonalAdjustment(userId: string) { return 1.0; }
  private calculateGrowthTrend(userId: string) { return 0.1; }
  private calculatePotentialCostSavings(analytics: any) { return 0; }
  private calculatePotentialPerformanceGains(analytics: any) { return 0; }
  private calculateEfficiencyImprovements(analytics: any) { return 0; }
}