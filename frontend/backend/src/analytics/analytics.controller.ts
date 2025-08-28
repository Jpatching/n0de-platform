import { Controller, Get, Query, Headers, UnauthorizedException } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsQueryDto, SecurityMetricsQueryDto } from './dto/analytics.dto';
import { AuthService } from '../auth/auth.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly authService: AuthService,
  ) {}

  @Get('revenue')
  async getRevenueMetrics(
    @Headers('authorization') auth: string,
    @Query() query: AnalyticsQueryDto
  ) {
    this.validateSession(auth); // Basic auth check
    const metrics = await this.analyticsService.getRevenueMetrics(query);
    return { metrics };
  }

  @Get('users')
  async getUserActivityMetrics(
    @Headers('authorization') auth: string,
    @Query() query: AnalyticsQueryDto
  ) {
    this.validateSession(auth);
    const metrics = await this.analyticsService.getUserActivityMetrics(query);
    return { metrics };
  }

  @Get('games')
  async getGamePerformanceMetrics(
    @Headers('authorization') auth: string,
    @Query() query: AnalyticsQueryDto
  ) {
    this.validateSession(auth);
    const metrics = await this.analyticsService.getGamePerformanceMetrics(query);
    return { metrics };
  }

  @Get('referrals')
  async getReferralMetrics(
    @Headers('authorization') auth: string,
    @Query() query: AnalyticsQueryDto
  ) {
    this.validateSession(auth);
    const metrics = await this.analyticsService.getReferralMetrics(query);
    return { metrics };
  }

  @Get('security')
  async getSecurityMetrics(
    @Headers('authorization') auth: string,
    @Query() query: SecurityMetricsQueryDto
  ) {
    this.validateSession(auth);
    const metrics = await this.analyticsService.getSecurityMetrics(query);
    return { metrics };
  }

  @Get('engagement')
  async getUserEngagementMetrics(
    @Headers('authorization') auth: string,
    @Query() query: AnalyticsQueryDto
  ) {
    this.validateSession(auth);
    const metrics = await this.analyticsService.getUserEngagementMetrics(query);
    return { metrics };
  }

  @Get('overview')
  async getPlatformOverview(
    @Headers('authorization') auth: string,
    @Query() query: AnalyticsQueryDto
  ) {
    this.validateSession(auth);
    const overview = await this.analyticsService.getPlatformOverview(query);
    return { overview };
  }

  @Get('custom')
  async getCustomMetrics(
    @Headers('authorization') auth: string,
    @Query() query: AnalyticsQueryDto
  ) {
    this.validateSession(auth);
    const metrics = await this.analyticsService.getCustomMetrics(query);
    return { metrics };
  }

  // Public endpoint for basic platform stats
  @Get('public/stats')
  async getPublicStats() {
    const overview = await this.analyticsService.getPlatformOverview({});
    
    // Return only public-safe data
    return {
      stats: {
        totalUsers: overview.totalUsers,
        totalMatches: overview.totalMatches,
        totalVolume: overview.totalVolume,
        healthScore: overview.healthScore,
      }
    };
  }

  private validateSession(authHeader: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid authorization header');
    }
    const sessionId = authHeader.substring(7);
    const session = this.authService.validateSession(sessionId);
    if (!session) {
      throw new UnauthorizedException('Invalid session');
    }
    return session;
  }
} 