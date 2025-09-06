import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';
import { UserProfilingService } from './user-profiling.service';
import { AnalyticsInsightsService } from './analytics-insights.service';

@ApiTags('analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(
    private analyticsService: AnalyticsService,
    private profilingService: UserProfilingService,
    private insightsService: AnalyticsInsightsService,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get personalized dashboard analytics' })
  @ApiQuery({ name: 'timeframe', enum: ['1d', '7d', '30d'], required: false })
  @ApiResponse({ 
    status: 200, 
    description: 'Dashboard analytics with AI insights',
    schema: {
      type: 'object',
      properties: {
        overview: {
          type: 'object',
          properties: {
            totalRequests: { type: 'number' },
            successRate: { type: 'number' },
            averageLatency: { type: 'number' },
            activeApiKeys: { type: 'number' },
            costThisMonth: { type: 'number' },
          },
        },
        trends: {
          type: 'object',
          properties: {
            requestsOverTime: { type: 'array' },
            latencyOverTime: { type: 'array' },
            errorRateOverTime: { type: 'array' },
          },
        },
        insights: { type: 'array' },
        recommendations: { type: 'array' },
        alerts: { type: 'array' },
      },
    },
  })
  async getDashboardAnalytics(
    @Request() req,
    @Query('timeframe') timeframe: '1d' | '7d' | '30d' = '7d'
  ) {
    return this.analyticsService.getDashboardAnalytics(req.user.sub, timeframe);
  }

  @Get('advanced')
  @ApiOperation({ summary: 'Get advanced AI-powered analytics' })
  @ApiResponse({ 
    status: 200, 
    description: 'Advanced analytics with ML insights and predictions',
  })
  async getAdvancedAnalytics(@Request() req) {
    return this.analyticsService.getAdvancedAnalytics(req.user.sub);
  }

  @Get('insights')
  @ApiOperation({ summary: 'Get AI-generated usage insights' })
  @ApiResponse({ 
    status: 200, 
    description: 'AI insights about usage patterns and optimization opportunities',
  })
  async getUserInsights(@Request() req) {
    return this.insightsService.generateUserInsights(req.user.sub);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get user profile and personalization data' })
  @ApiResponse({ 
    status: 200, 
    description: 'Comprehensive user profile with preferences and usage patterns',
  })
  async getUserProfile(@Request() req) {
    return this.profilingService.getUserProfile(req.user.sub);
  }

  @Get('recommendations')
  @ApiOperation({ summary: 'Get personalized AI recommendations' })
  @ApiResponse({ 
    status: 200, 
    description: 'Smart recommendations based on user behavior and industry best practices',
  })
  async getRecommendations(@Request() req) {
    return this.profilingService.getSmartRecommendations(req.user.sub);
  }

  @Get('dashboard/personalized')
  @ApiOperation({ summary: 'Get AI-optimized dashboard layout' })
  @ApiResponse({ 
    status: 200, 
    description: 'Personalized dashboard configuration based on user preferences and behavior',
  })
  async getPersonalizedDashboard(@Request() req) {
    return this.analyticsService.getPersonalizedDashboard(req.user.sub);
  }

  @Put('dashboard/layout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update dashboard layout preferences' })
  @ApiResponse({ status: 200, description: 'Dashboard layout updated successfully' })
  async updateDashboardLayout(
    @Request() req,
    @Body() layout: any[]
  ) {
    await this.analyticsService.updateUserDashboardLayout(req.user.sub, layout);
    return { success: true, message: 'Dashboard layout updated successfully' };
  }

  @Put('preferences')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user preferences and personalization settings' })
  @ApiResponse({ status: 200, description: 'Preferences updated successfully' })
  async updatePreferences(
    @Request() req,
    @Body() preferences: any
  ) {
    await this.profilingService.updateUserPreferences(req.user.sub, preferences);
    return { success: true, message: 'Preferences updated successfully' };
  }

  @Get('performance')
  @ApiOperation({ summary: 'Get detailed performance analytics' })
  @ApiQuery({ name: 'timeframe', enum: ['1d', '7d', '30d'], required: false })
  @ApiResponse({ 
    status: 200, 
    description: 'Detailed performance metrics and analysis',
  })
  async getPerformanceAnalytics(
    @Request() req,
    @Query('timeframe') timeframe: '1d' | '7d' | '30d' = '7d'
  ) {
    const analytics = await this.analyticsService.getAdvancedAnalytics(req.user.sub);
    return analytics.performanceAnalysis;
  }

  @Get('costs')
  @ApiOperation({ summary: 'Get cost analysis and optimization insights' })
  @ApiResponse({ 
    status: 200, 
    description: 'Cost analysis with optimization recommendations',
  })
  async getCostAnalytics(@Request() req) {
    const analytics = await this.analyticsService.getAdvancedAnalytics(req.user.sub);
    return analytics.costAnalysis;
  }

  @Get('predictions')
  @ApiOperation({ summary: 'Get AI predictions and forecasting' })
  @ApiResponse({ 
    status: 200, 
    description: 'Predictive insights including churn risk, usage forecasting, and optimization potential',
  })
  async getPredictiveInsights(@Request() req) {
    const analytics = await this.analyticsService.getAdvancedAnalytics(req.user.sub);
    return analytics.predictiveInsights;
  }

  @Get('health-score')
  @ApiOperation({ summary: 'Get account health score and recommendations' })
  @ApiResponse({ 
    status: 200, 
    description: 'Account health score with improvement recommendations',
  })
  async getHealthScore(@Request() req) {
    const insights = await this.insightsService.generateUserInsights(req.user.sub);
    return {
      healthScore: insights.healthScore,
      efficiency: insights.efficiency,
      factors: this.getHealthScoreFactors(insights),
      recommendations: this.getHealthImprovementRecommendations(insights),
    };
  }

  @Post('feedback')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Provide feedback on AI recommendations' })
  @ApiResponse({ status: 201, description: 'Feedback recorded successfully' })
  async provideFeedback(
    @Request() req,
    @Body() feedback: {
      type: 'recommendation' | 'insight' | 'prediction';
      itemId: string;
      rating: number; // 1-5
      helpful: boolean;
      comment?: string;
    }
  ) {
    // In a real implementation, you'd store this feedback to improve AI models
    return { 
      success: true, 
      message: 'Thank you for your feedback! This helps us improve our AI insights.' 
    };
  }

  @Get('trends')
  @ApiOperation({ summary: 'Get usage trends and pattern analysis' })
  @ApiQuery({ name: 'period', enum: ['weekly', 'monthly', 'quarterly'], required: false })
  @ApiResponse({ 
    status: 200, 
    description: 'Trend analysis and pattern insights',
  })
  async getTrendAnalysis(
    @Request() req,
    @Query('period') period: 'weekly' | 'monthly' | 'quarterly' = 'monthly'
  ) {
    const insights = await this.insightsService.generateUserInsights(req.user.sub);
    return {
      patterns: insights.patterns,
      trends: this.generateTrendAnalysis(insights, period),
      seasonality: this.analyzeSeasonality(insights),
      forecasts: insights.predictions,
    };
  }

  @Get('benchmarks')
  @ApiOperation({ summary: 'Get performance benchmarks and comparisons' })
  @ApiResponse({ 
    status: 200, 
    description: 'Performance benchmarks compared to similar users',
  })
  async getBenchmarks(@Request() req) {
    const profile = await this.profilingService.getUserProfile(req.user.sub);
    const insights = await this.insightsService.generateUserInsights(req.user.sub);
    
    return {
      yourPerformance: {
        successRate: insights.patterns.successRate,
        averageLatency: insights.patterns.averageLatency,
        efficiency: insights.efficiency,
      },
      industryBenchmarks: this.getIndustryBenchmarks(profile.usage.primaryUseCase),
      similarUsers: this.getSimilarUserBenchmarks(profile.businessProfile.companySize),
      ranking: this.calculateUserRanking(insights),
    };
  }

  // Helper methods
  private getHealthScoreFactors(insights: any) {
    const factors = [];
    
    if (insights.patterns.successRate < 95) {
      factors.push({
        factor: 'Success Rate',
        impact: 'negative',
        current: insights.patterns.successRate,
        target: 95,
        weight: 0.3,
      });
    }

    if (insights.patterns.averageLatency > 200) {
      factors.push({
        factor: 'Average Latency',
        impact: 'negative',
        current: insights.patterns.averageLatency,
        target: 200,
        weight: 0.2,
      });
    }

    return factors;
  }

  private getHealthImprovementRecommendations(insights: any) {
    const recommendations = [];

    if (insights.healthScore < 80) {
      recommendations.push({
        action: 'Review error patterns and implement proper error handling',
        priority: 'high',
        expectedImprovement: 15,
      });
    }

    if (insights.efficiency < 70) {
      recommendations.push({
        action: 'Optimize API call patterns and implement caching',
        priority: 'medium',
        expectedImprovement: 20,
      });
    }

    return recommendations;
  }

  private generateTrendAnalysis(insights: any, period: string) {
    // Simplified trend analysis
    return {
      growth: {
        requests: 0.15, // 15% growth
        performance: 0.05, // 5% improvement
        efficiency: 0.10, // 10% improvement
      },
      patterns: {
        peakHours: insights.patterns.peakHours,
        weeklyPatterns: 'Consistent weekday usage',
        monthlyPatterns: 'Steady growth',
      },
    };
  }

  private analyzeSeasonality(insights: any) {
    return {
      hasSeasonality: false,
      patterns: [],
      adjustmentFactor: 1.0,
    };
  }

  private getIndustryBenchmarks(useCase: string) {
    const benchmarks = {
      defi: { successRate: 96.5, averageLatency: 180, efficiency: 85 },
      nft: { successRate: 97.2, averageLatency: 150, efficiency: 88 },
      trading: { successRate: 98.1, averageLatency: 120, efficiency: 92 },
      enterprise: { successRate: 98.5, averageLatency: 100, efficiency: 95 },
      development: { successRate: 94.0, averageLatency: 250, efficiency: 75 },
    };

    return benchmarks[useCase] || benchmarks.development;
  }

  private getSimilarUserBenchmarks(companySize: string) {
    const benchmarks = {
      individual: { successRate: 94.5, averageLatency: 220, efficiency: 78 },
      startup: { successRate: 96.0, averageLatency: 180, efficiency: 82 },
      growth: { successRate: 97.5, averageLatency: 140, efficiency: 88 },
      enterprise: { successRate: 98.2, averageLatency: 110, efficiency: 93 },
    };

    return benchmarks[companySize] || benchmarks.individual;
  }

  private calculateUserRanking(insights: any) {
    // Simplified ranking calculation
    const score = (insights.healthScore + insights.efficiency) / 2;
    
    if (score >= 90) return { percentile: 95, rank: 'Excellent' };
    if (score >= 80) return { percentile: 80, rank: 'Good' };
    if (score >= 70) return { percentile: 60, rank: 'Average' };
    if (score >= 60) return { percentile: 40, rank: 'Below Average' };
    return { percentile: 20, rank: 'Needs Improvement' };
  }
}