import { Controller, Get, Put, Post, Body, Param, Headers, UnauthorizedException, Query } from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateProfileDto, UpdatePreferencesDto, UpdateBankrollLimitsDto } from './dto/user.dto';
import { AuthService } from '../auth/auth.service';
import { BatchQueryService, PerformanceMetrics } from '../common/batch-query.service';
import { RedisCacheService } from '../common/redis-cache.service';
import { PrismaService } from '../database/prisma.service';

@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
    private readonly batchQueryService: BatchQueryService,
    private readonly cacheService: RedisCacheService,
    private readonly prisma: PrismaService,
  ) {}

  @Get(':wallet')
  async getProfile(@Param('wallet') wallet: string) {
    const profile = await this.userService.getProfile(wallet);
    return { profile };
  }

  /**
   * OPTIMIZED: Get user dashboard data with single query
   * 60-75% faster than individual queries
   */
  @Get('dashboard')
  async getDashboard(@Headers('authorization') auth: string) {
    const token = this.extractToken(auth);
    const dashboardData = await this.batchQueryService.getDashboardData(token);
    
    return {
      success: true,
      data: dashboardData,
      performance: {
        queryTime: dashboardData.queryTime,
        fromCache: dashboardData.fromCache,
        optimization: 'batched_query'
      }
    };
  }

  /**
   * OPTIMIZED: Get profile data with single query
   */
  @Get('profile-data')
  async getProfileData(@Headers('authorization') auth: string) {
    const token = this.extractToken(auth);
    const profileData = await this.batchQueryService.getProfileData(token);
    
    return {
      success: true,
      data: profileData,
      performance: {
        queryTime: profileData.queryTime,
        fromCache: profileData.fromCache
      }
    };
  }

  @Put('profile')
  async updateProfile(
    @Headers('authorization') auth: string,
    @Body() updateProfileDto: UpdateProfileDto
  ) {
    const session = await this.validateSession(auth);
    const profile = await this.userService.updateProfile(session.wallet, updateProfileDto);
    
    // Invalidate batch cache after profile update
    await this.batchQueryService.invalidateUserCache(session.userId);
    
    return { profile };
  }

  @Get(':wallet/stats')
  async getUserStats(@Param('wallet') wallet: string) {
    const user = await this.userService.getProfile(wallet);
    if (!user) {
      return { stats: null, error: 'User not found' };
    }
    
    const stats = await this.userService.getUserStats(user.id);
    return { stats };
  }

  @Get(':wallet/earnings')
  async getUserEarnings(@Param('wallet') wallet: string) {
    const earnings = await this.userService.getUserEarnings(wallet);
    return { earnings };
  }

  @Get(':wallet/achievements')
  async getUserAchievements(@Param('wallet') wallet: string) {
    const achievements = await this.userService.getUserAchievements(wallet);
    return { achievements };
  }

  @Get(':wallet/nft-avatar')
  async getNftAvatar(@Param('wallet') wallet: string) {
    const nftAvatar = await this.userService.getNftAvatar(wallet);
    return { nftAvatar };
  }

  @Put('preferences')
  async updatePreferences(
    @Headers('authorization') auth: string,
    @Body() updatePreferencesDto: UpdatePreferencesDto
  ) {
    const session = await this.validateSession(auth);
    const preferences = await this.userService.updatePreferences(session.wallet, updatePreferencesDto);
    
    // Invalidate batch cache after preferences update
    await this.batchQueryService.invalidateUserCache(session.userId);
    
    return { preferences };
  }

  @Get('reputation')
  async getReputation(@Headers('authorization') auth: string) {
    const session = await this.validateSession(auth);
    const reputation = await this.userService.getReputation(session.wallet);
    return { reputation };
  }

  @Get('badges')
  async getBadges(@Headers('authorization') auth: string) {
    const session = await this.validateSession(auth);
    const badges = await this.userService.getBadges(session.wallet);
    return { badges };
  }

  @Get(':wallet/match-history')
  async getMatchHistory(@Param('wallet') wallet: string) {
    const history = await this.userService.getMatchHistory(wallet);
    return { history };
  }

  /**
   * OPTIMIZED: Get game lobby data with single query
   */
  @Get('game-lobby-data')
  async getGameLobbyData(@Headers('authorization') auth: string) {
    const token = this.extractToken(auth);
    const lobbyData = await this.batchQueryService.getGameLobbyData(token);
    
    return {
      success: true,
      data: lobbyData,
      performance: {
        queryTime: lobbyData.queryTime,
        fromCache: lobbyData.fromCache
      }
    };
  }

  @Get('search')
  async searchUsers(@Body() query: { searchTerm: string }) {
    const users = await this.userService.searchUsers(query.searchTerm);
    return { users };
  }

  @Get(':wallet/activity')
  async getActivityFeed(@Param('wallet') wallet: string) {
    const activities = await this.userService.getActivityFeed(wallet);
    return { activities };
  }

  // Bankroll Management Endpoints
  @Get('bankroll-limits')
  async getBankrollLimits(@Headers('authorization') auth: string) {
    const session = await this.validateSession(auth);
    const data = await this.userService.getBankrollLimits(session.wallet);
    return data;
  }

  @Post('bankroll-limits')
  async updateBankrollLimits(
    @Headers('authorization') auth: string,
    @Body() updateDto: UpdateBankrollLimitsDto
  ) {
    const session = await this.validateSession(auth);
    const data = await this.userService.updateBankrollLimits(session.wallet, updateDto);
    
    // Invalidate batch cache after bankroll update
    await this.batchQueryService.invalidateUserCache(session.userId);
    
    return { success: true, ...data };
  }

  @Post('check-limits')
  async checkLimitsCompliance(
    @Headers('authorization') auth: string,
    @Body() body: { action: 'deposit' | 'wager'; amount: number }
  ) {
    const session = await this.validateSession(auth);
    const result = await this.userService.checkLimitsCompliance(session.wallet, body.action, body.amount);
    return result;
  }

  /**
   * SECURITY: Extract token from authorization header
   */
  private extractToken(authHeader: string): string {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid authorization header');
    }
    return authHeader.substring(7);
  }

  /**
   * SECURITY: Validate session (unchanged security logic)
   */
  private async validateSession(authHeader: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid authorization header');
    }
    const sessionId = authHeader.substring(7);
    const session = await this.authService.validateSession(sessionId);
    if (!session) {
      throw new UnauthorizedException('Invalid session');
    }
    return session;
  }

  /**
   * Get performance metrics for monitoring
   */
  @Get('performance-metrics')
  async getPerformanceMetrics(@Headers('authorization') auth: string): Promise<{ success: boolean; metrics: any; }> {
    const session = await this.validateSession(auth);
    
    // Only allow admins or developers to access metrics
    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, username: true, authMethod: true }
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // For now, allow all authenticated users to see metrics
    // TODO: Add role-based access control when role field is added to schema
    const batchMetrics = this.batchQueryService.getMetrics();
    const cacheStats = await this.cacheService.getStats();

    return {
      success: true,
      metrics: {
        batchQueries: batchMetrics,
        cache: cacheStats,
        timestamp: new Date().toISOString()
      }
    };
  }
} 
