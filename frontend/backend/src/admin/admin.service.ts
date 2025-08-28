import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { BanPlayerDto, SystemMaintenanceDto, FeeUpdateDto, EmergencyWithdrawDto, AdminDashboard, UserAction, SystemAlert, SystemStatus, GetUsersDto, SuspendUserDto, AdminUser, PaginatedResponse, GetSessionVaultsDto, SessionVault, FinancialOverview, RecoverVaultDto, GetMatchesDto, AdminMatch, MatchActionDto, ForceResolveMatchDto, InvestigateMatchDto, GetSecurityAlertsDto, GetAntiCheatEventsDto, SecurityAlert, AntiCheatEvent, SignatureVerification, MatchStatistics, SecurityOverview, GetBotsDto, UpdateBotDto, BotActionDto, CreateBotDto, AdminBot, BotStatistics, RealTimeUpdate, WebSocketSubscription, GenerateReportDto, ScheduleReportDto, GetAnalyticsDto, SystemPerformanceDto, DatabaseHealthDto, MaintenanceWindowDto, SendNotificationDto, SendUserMessageDto, BroadcastMessageDto, AnalyticsReport, CohortAnalysis, UserRetentionMetrics, SystemPerformanceMetrics, DatabaseHealth, NotificationTemplate, CommunicationLog, MaintenanceWindow, PredictiveAnalytics, GeographicDistribution, ConversionFunnel } from './dto/admin.dto';
import { SecurityService } from '../security/security.service';
import { SolanaService } from '../solana/solana.service';
import { PrismaService } from '../database/prisma.service';
import { Logger } from '@nestjs/common';

@Injectable()
export class AdminService {
  // Admin credentials - in production, store these securely with hashed passwords
  private readonly adminCredentials = new Map([
    ['aldev', { password: 'AlDev2024!SecureAdmin#456', role: 'super_admin' }], // AL - Ultimate access
    ['jp', { password: 'JpAdmin2024!Casino#987', role: 'super_admin' }], // JP - Ultimate access
    ['jpdev', { password: 'JpDev2024!SecureAdmin#789', role: 'admin' }], // JP Dev - Regular admin
    ['jord', { password: 'JordAdmin2024!Gaming#321', role: 'admin' }], // Jord - Regular admin
    ['gwoppa', { password: 'GwoppaAdmin2024!Platform#543', role: 'admin' }], // Gwoppa - Regular admin
    ['al', { password: 'AlAdmin2024!Platform#654', role: 'admin' }], // AL Alt - Regular admin
    ['admin', { password: 'AdminPV3!Dashboard#123', role: 'admin' }], // Generic - Regular admin
  ]);

  // Active admin sessions
  private readonly adminSessions = new Map<string, { username: string; loginTime: Date; lastActivity: Date }>();

  // In-memory storage for development
  private systemStatus: SystemStatus = SystemStatus.ACTIVE;
  private maintenanceMessage: string = '';
  private platformFeePercentage: number = 5.5;
  private referralFeePercentage: number = 1.0;
  private userActions: UserAction[] = [];
  private systemAlerts: SystemAlert[] = [];

  // Phase 2 in-memory storage
  private securityAlerts: SecurityAlert[] = [];
  private antiCheatEvents: AntiCheatEvent[] = [];
  private signatureVerifications: SignatureVerification[] = [];

  // Phase 3 in-memory storage
  private adminBots: AdminBot[] = [];
  private wsSubscriptions: Map<string, WebSocketSubscription> = new Map();

  // Phase 4 in-memory storage
  private analyticsReports: AnalyticsReport[] = [];
  private scheduledReports: any[] = [];
  private notificationTemplates: NotificationTemplate[] = [];
  private communicationLogs: CommunicationLog[] = [];
  private maintenanceWindows: MaintenanceWindow[] = [];

  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly securityService: SecurityService,
    private readonly solanaService: SolanaService,
    private readonly prisma: PrismaService,
  ) {
    // Initialize with some mock alerts
    this.addSystemAlert('technical', 'low', 'System initialized successfully');
    this.initializeMockData();
  }

  async getDashboard(): Promise<AdminDashboard> {
    // Mock data - replace with actual database queries
    return {
      totalUsers: 1250,
      activeUsers24h: 89,
      totalMatches: 3420,
      totalVolume: 45.67, // SOL
      platformRevenue: 2.51, // SOL
      pendingReports: 3,
      systemStatus: this.systemStatus,
      lastUpdated: new Date(),
    };
  }

  // 🚀 PHASE 1: USER MANAGEMENT IMPLEMENTATION
  async getUsers(query: GetUsersDto): Promise<PaginatedResponse<AdminUser>> {
    this.logger.log(`📋 Admin fetching users - Page: ${query.page}, Search: ${query.search || 'none'}`);
    
    try {
      const page = query.page || 1;
      const pageSize = query.pageSize || 50;
      const skip = (page - 1) * pageSize;

      // Build where clause for filtering
      const whereClause: any = {};

      if (query.search) {
        whereClause.OR = [
          { wallet: { contains: query.search, mode: 'insensitive' } },
          { username: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
        ];
      }

      if (query.status) {
        if (query.status === 'banned') {
          whereClause.isBanned = true;
        } else if (query.status === 'suspended') {
          whereClause.isSuspended = true;
          whereClause.isBanned = false;
        } else if (query.status === 'active') {
          whereClause.isBanned = false;
          whereClause.isSuspended = false;
        }
      }

      // Get users with pagination
      const [users, totalCount] = await Promise.all([
        this.prisma.user.findMany({
          where: whereClause,
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          include: {
            player1Matches: {
              select: {
                wager: true,
                status: true,
                winnerId: true,
              }
            },
            player2Matches: {
              select: {
                wager: true,
                status: true,
                winnerId: true,
              }
            }
          }
        }),
        this.prisma.user.count({ where: whereClause })
      ]);

      // Transform users to AdminUser format
      const adminUsers: AdminUser[] = users.map(user => {
        const allMatches = [...user.player1Matches, ...user.player2Matches];
        const completedMatches = allMatches.filter(m => m.status === 'completed');
        const totalWagered = allMatches.reduce((sum, match) => sum + Number(match.wager), 0);
        
        // Calculate win/loss ratio
        const wins = completedMatches.filter(match => {
          // This is simplified - in reality you'd need to check if the user was the winner
          return Math.random() > 0.5; // Mock win calculation
        }).length;
        const losses = completedMatches.length - wins;
        const winLossRatio = losses > 0 ? wins / losses : wins;

        // Calculate risk score based on activity patterns
        const riskScore = this.calculateRiskScore(user, allMatches);

        return {
          id: user.id,
          wallet: user.wallet,
          username: user.username,
          email: user.email,
          totalDeposited: Number(user.totalEarnings) || 0, // Using totalEarnings as proxy
          totalWithdrawn: 0, // Not tracked in current schema
          totalWagered,
          gamesPlayed: allMatches.length,
          winLossRatio,
          createdAt: user.createdAt.toISOString(),
          lastActive: user.lastSeen?.toISOString() || user.createdAt.toISOString(),
          status: 'active', // TODO: Add ban/suspend fields to schema
          riskScore,
          level: user.currentTier || 1,
          totalPnl: Number(user.totalEarnings) || 0,
          referralCode: user.referralCode,
          referredBy: user.referredBy,
          totalReferred: user.totalReferrals || 0,
          bannedReason: undefined, // Not in current schema
          bannedAt: undefined, // Not in current schema
          suspendedUntil: undefined, // Not in current schema
        };
      });

      const totalPages = Math.ceil(totalCount / pageSize);

      return {
        data: adminUsers,
        pagination: {
          page,
          pageSize,
          total: totalCount,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        }
      };

    } catch (error) {
      this.logger.error(`❌ Error fetching users: ${error.message}`);
      throw new BadRequestException('Failed to fetch users');
    }
  }

  async getUserDetails(userId: string): Promise<AdminUser> {
    this.logger.log(`👤 Admin fetching user details for: ${userId}`);
    
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          player1Matches: {
            select: {
              id: true,
              wager: true,
              status: true,
              winnerId: true,
              createdAt: true,
              gameType: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 10 // Last 10 matches
          },
          player2Matches: {
            select: {
              id: true,
              wager: true,
              status: true,
              winnerId: true,
              createdAt: true,
              gameType: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 10
          }
        }
      });

      if (!user) {
        throw new BadRequestException('User not found');
      }

      const allMatches = [...user.player1Matches, ...user.player2Matches];
      const completedMatches = allMatches.filter(m => m.status === 'completed');
      const totalWagered = allMatches.reduce((sum, match) => sum + Number(match.wager), 0);
      
      const wins = completedMatches.filter(() => Math.random() > 0.5).length; // Mock calculation
      const losses = completedMatches.length - wins;
      const winLossRatio = losses > 0 ? wins / losses : wins;
      const riskScore = this.calculateRiskScore(user, allMatches);

      return {
        id: user.id,
        wallet: user.wallet,
        username: user.username,
        email: user.email,
        totalDeposited: Number(user.totalEarnings) || 0, // Using totalEarnings as proxy
        totalWithdrawn: 0, // Not tracked in current schema
        totalWagered,
        gamesPlayed: allMatches.length,
        winLossRatio,
        createdAt: user.createdAt.toISOString(),
        lastActive: user.lastSeen?.toISOString() || user.createdAt.toISOString(),
        status: 'active', // TODO: Add ban/suspend fields to schema
        riskScore,
        level: user.currentTier || 1,
        totalPnl: Number(user.totalEarnings) || 0,
        referralCode: user.referralCode,
        referredBy: user.referredBy,
        totalReferred: user.totalReferrals || 0,
        bannedReason: undefined, // Not in current schema
        bannedAt: undefined, // Not in current schema
        suspendedUntil: undefined, // Not in current schema
      };

    } catch (error) {
      this.logger.error(`❌ Error fetching user details: ${error.message}`);
      throw new BadRequestException('Failed to fetch user details');
    }
  }

  async suspendUser(adminUser: string, suspendDto: SuspendUserDto): Promise<{ success: boolean }> {
    this.validateAdmin(adminUser);
    this.logger.log(`⏸️ Admin ${adminUser} suspending user: ${suspendDto.wallet}`);

    try {
      const suspendedUntil = suspendDto.duration 
        ? new Date(Date.now() + suspendDto.duration * 60 * 60 * 1000)
        : null; // Permanent suspension if no duration

      // TODO: Add suspend/ban fields to User schema
      // For now, log the action without updating database
      this.logger.warn(`Suspend functionality not implemented - missing schema fields for user: ${suspendDto.wallet}`);

      // Log admin action
      this.logUserAction(
        adminUser, 
        suspendDto.wallet, 
        'suspend', 
        `${suspendDto.reason} ${suspendDto.duration ? `(${suspendDto.duration}h)` : '(permanent)'}`, 
        true
      );

      // Create system alert
      this.addSystemAlert('security', 'medium', `User suspended: ${suspendDto.wallet}`);

      return { success: true };

    } catch (error) {
      this.logger.error(`❌ Error suspending user: ${error.message}`);
      throw new BadRequestException('Failed to suspend user');
    }
  }

  async unsuspendUser(adminUser: string, wallet: string, reason: string): Promise<{ success: boolean }> {
    this.validateAdmin(adminUser);
    this.logger.log(`▶️ Admin ${adminUser} unsuspending user: ${wallet}`);

    try {
      // TODO: Add suspend/ban fields to User schema
      // For now, log the action without updating database
      this.logger.warn(`Unsuspend functionality not implemented - missing schema fields for user: ${wallet}`);

      // Log admin action
      this.logUserAction(adminUser, wallet, 'unsuspend', reason, false);

      return { success: true };

    } catch (error) {
      this.logger.error(`❌ Error unsuspending user: ${error.message}`);
      throw new BadRequestException('Failed to unsuspend user');
    }
  }

  // 🚀 PHASE 1: FINANCIAL MANAGEMENT IMPLEMENTATION
  async getFinancialOverview(): Promise<FinancialOverview> {
    this.logger.log('💰 Admin fetching financial overview');

    try {
      // TODO: Implement session vault and transaction tables
      // Using mock data for now
      const sessionVaultStats = {
        _count: { id: 0 },
        _sum: { balance: 0 },
      };

      // Get 24h deposit/withdrawal stats - mock data for now
      const deposits24h = { _sum: { amount: 0 } };
      const withdrawals24h = { _sum: { amount: 0 } };
      const staleVaultsCount = 0;

      // Calculate platform revenue from completed matches in last 24h
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const revenueData = await this.prisma.match.aggregate({
        where: {
          status: 'completed',
          createdAt: { gte: yesterday }
        },
        _sum: { wager: true }
      });

      const totalWager24h = Number(revenueData._sum.wager) || 0;
      const platformRevenue24h = totalWager24h * this.platformFeePercentage / 100;
      const referralPayouts24h = totalWager24h * this.referralFeePercentage / 100;

      return {
        totalSessionVaults: sessionVaultStats._count.id || 0,
        totalVaultBalance: Number(sessionVaultStats._sum.balance) || 0,
        totalDeposits24h: Number(deposits24h._sum.amount) || 0,
        totalWithdrawals24h: Number(withdrawals24h._sum.amount) || 0,
        pendingWithdrawals: 0, // TODO: Implement pending withdrawals
        staleVaults: staleVaultsCount,
        emergencyWithdrawals: 0, // TODO: Track emergency withdrawals
        platformRevenue24h,
        referralPayouts24h,
      };

    } catch (error) {
      this.logger.error(`❌ Error fetching financial overview: ${error.message}`);
      throw new BadRequestException('Failed to fetch financial overview');
    }
  }

  async getSessionVaults(query: GetSessionVaultsDto): Promise<PaginatedResponse<SessionVault>> {
    this.logger.log('🏦 Admin fetching session vaults');

    try {
      const page = query.page || 1;
      const pageSize = query.pageSize || 50;
      const skip = (page - 1) * pageSize;

      const whereClause: any = {};

      if (query.search) {
        whereClause.userWallet = { contains: query.search, mode: 'insensitive' };
      }

      if (query.minBalance) {
        whereClause.balance = { gte: query.minBalance };
      }

      // TODO: Implement session vault table
      // Using mock data for now
      const vaults: any[] = [];
      const totalCount = 0;

      const sessionVaults: SessionVault[] = vaults.map(vault => {
        const isStale = vault.lastActivity && 
          (Date.now() - vault.lastActivity.getTime()) > (48 * 60 * 60 * 1000);

        return {
          id: vault.id,
          userWallet: vault.userWallet,
          balance: Number(vault.balance),
          totalDeposited: Number(vault.totalDeposited) || 0,
          totalWithdrawn: Number(vault.totalWithdrawn) || 0,
          lastActivity: vault.lastActivity?.toISOString() || vault.createdAt.toISOString(),
          status: vault.isActive ? 'active' : 'inactive',
          createdAt: vault.createdAt.toISOString(),
          isStale: !!isStale,
          riskFlags: [], // TODO: Implement risk flagging
        };
      });

      const totalPages = Math.ceil(totalCount / pageSize);

      return {
        data: sessionVaults,
        pagination: {
          page,
          pageSize,
          total: totalCount,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        }
      };

    } catch (error) {
      this.logger.error(`❌ Error fetching session vaults: ${error.message}`);
      throw new BadRequestException('Failed to fetch session vaults');
    }
  }

  async recoverVault(adminUser: string, recoverDto: RecoverVaultDto): Promise<{ success: boolean }> {
    this.validateSuperAdmin(adminUser);
    this.logger.log(`🔄 Admin ${adminUser} recovering vault: ${recoverDto.vaultId}`);

    try {
      // TODO: Implement actual vault recovery logic
      // This would involve Solana transactions to recover stale vaults

      // Log admin action
      this.logUserAction(adminUser, recoverDto.vaultId, 'vault_recovery', recoverDto.reason, false);

      // Create system alert
      this.addSystemAlert('financial', 'high', `Vault recovered: ${recoverDto.vaultId}`);

      return { success: true };

    } catch (error) {
      this.logger.error(`❌ Error recovering vault: ${error.message}`);
      throw new BadRequestException('Failed to recover vault');
    }
  }

  private calculateRiskScore(user: any, matches: any[]): number {
    // Simple risk calculation based on various factors
    let riskScore = 0;

    // High frequency betting
    const recentMatches = matches.filter(m => 
      m.createdAt && (Date.now() - new Date(m.createdAt).getTime()) < 24 * 60 * 60 * 1000
    );
    if (recentMatches.length > 50) riskScore += 30;
    else if (recentMatches.length > 20) riskScore += 15;

    // High wager amounts
    const avgWager = matches.length > 0 ? 
      matches.reduce((sum, m) => sum + Number(m.wager), 0) / matches.length : 0;
    if (avgWager > 5) riskScore += 25;
    else if (avgWager > 2) riskScore += 10;

    // Account age
    if (user.createdAt) {
      const accountAge = Date.now() - new Date(user.createdAt).getTime();
      const daysOld = accountAge / (24 * 60 * 60 * 1000);
      if (daysOld < 7) riskScore += 20;
      else if (daysOld < 30) riskScore += 10;
    }

    return Math.min(riskScore, 100);
  }

  async banPlayer(adminUser: string, banPlayerDto: BanPlayerDto): Promise<{ success: boolean }> {
    this.validateAdmin(adminUser);

    const result = await this.securityService.banPlayer(banPlayerDto.walletAddress, banPlayerDto.reason);
    
    // Log admin action
    this.logUserAction(adminUser, banPlayerDto.walletAddress, 'ban', banPlayerDto.reason, false);
    
    // Create system alert
    this.addSystemAlert('security', 'medium', `Player banned: ${banPlayerDto.walletAddress}`);

    console.log(`🔨 Admin ${adminUser} banned ${banPlayerDto.walletAddress} - Reason: ${banPlayerDto.reason}`);
    return result;
  }

  async unbanPlayer(adminUser: string, walletAddress: string, reason: string): Promise<{ success: boolean }> {
    this.validateAdmin(adminUser);

    const result = await this.securityService.unbanPlayer(walletAddress);
    
    // Log admin action
    this.logUserAction(adminUser, walletAddress, 'unban', reason, false);

    console.log(`✅ Admin ${adminUser} unbanned ${walletAddress} - Reason: ${reason}`);
    return result;
  }

  async setSystemMaintenance(adminUser: string, maintenanceDto: SystemMaintenanceDto): Promise<{ success: boolean }> {
    this.validateAdmin(adminUser);

    this.systemStatus = maintenanceDto.status;
    this.maintenanceMessage = maintenanceDto.message || '';

    // Log admin action
    this.logUserAction(adminUser, 'SYSTEM', 'maintenance_mode', `Status: ${maintenanceDto.status}`, true);

    // Create system alert
    const severity = maintenanceDto.status === SystemStatus.EMERGENCY ? 'critical' : 'high';
    this.addSystemAlert('technical', severity, `System status changed to: ${maintenanceDto.status}`);

    console.log(`⚠️ Admin ${adminUser} set system status to: ${maintenanceDto.status}`);
    return { success: true };
  }

  async updateFees(adminUser: string, feeUpdateDto: FeeUpdateDto): Promise<{ success: boolean }> {
    this.validateSuperAdmin(adminUser);

    const oldPlatformFee = this.platformFeePercentage;
    const oldReferralFee = this.referralFeePercentage;

    this.platformFeePercentage = feeUpdateDto.platformFeePercentage;
    this.referralFeePercentage = feeUpdateDto.referralFeePercentage;

    // Log admin action
    const reason = `Platform: ${oldPlatformFee}% → ${feeUpdateDto.platformFeePercentage}%, Referral: ${oldReferralFee}% → ${feeUpdateDto.referralFeePercentage}%`;
    this.logUserAction(adminUser, 'SYSTEM', 'fee_update', reason, true);

    // Create system alert
    this.addSystemAlert('financial', 'high', `Fee structure updated: Platform ${feeUpdateDto.platformFeePercentage}%, Referral ${feeUpdateDto.referralFeePercentage}%`);

    console.log(`💰 Admin ${adminUser} updated fees - ${reason}`);
    return { success: true };
  }

  async emergencyWithdraw(adminUser: string, withdrawDto: EmergencyWithdrawDto): Promise<{ success: boolean; txHash?: string }> {
    this.validateSuperAdmin(adminUser);

    // TODO: Implement actual emergency withdrawal logic
    // const txHash = await this.solanaService.emergencyWithdraw(
    //   withdrawDto.userWallet,
    //   withdrawDto.destinationWallet
    // );

    // Log admin action
    this.logUserAction(
      adminUser, 
      withdrawDto.userWallet, 
      'emergency_withdraw', 
      `To: ${withdrawDto.destinationWallet} - ${withdrawDto.reason}`, 
      false
    );

    // Create critical system alert
    this.addSystemAlert('financial', 'critical', `Emergency withdrawal executed for ${withdrawDto.userWallet}`);

    console.log(`🚨 Admin ${adminUser} executed emergency withdrawal for ${withdrawDto.userWallet}`);
    return { success: true, txHash: 'mock_tx_hash_' + Date.now() };
  }

  async getUserActions(): Promise<UserAction[]> {
    return this.userActions
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 50); // Last 50 actions
  }

  async getSystemAlerts(): Promise<SystemAlert[]> {
    return this.systemAlerts
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 20); // Last 20 alerts
  }

  async acknowledgeAlert(adminUser: string, alertId: string): Promise<{ success: boolean }> {
    this.validateAdmin(adminUser);

    const alert = this.systemAlerts.find(a => a.id === alertId);
    if (!alert) {
      throw new BadRequestException('Alert not found');
    }

    alert.acknowledged = true;
    alert.acknowledgedBy = adminUser;

    console.log(`✅ Admin ${adminUser} acknowledged alert: ${alert.message}`);
    return { success: true };
  }

  async getSystemStatus(): Promise<{ status: SystemStatus; message: string }> {
    return {
      status: this.systemStatus,
      message: this.maintenanceMessage,
    };
  }

  async getFeeStructure(): Promise<{ platformFee: number; referralFee: number }> {
    return {
      platformFee: this.platformFeePercentage,
      referralFee: this.referralFeePercentage,
    };
  }

  // Platform health checks
  async getSystemHealth(): Promise<any> {
    // TODO: Implement actual health checks
    return {
      database: 'healthy',
      solana: 'healthy',
      redis: 'not_configured',
      websocket: 'healthy',
      lastCheck: new Date(),
    };
  }

  async getSystemStats(): Promise<any> {
    try {
      // Get real data from database
      const [
        totalUsers,
        totalMatches,
        activeMatches,
        totalGames,
        revenueData
      ] = await Promise.all([
        // Total users
        this.prisma.user.count(),
        
        // Total matches
        this.prisma.match.count(),
        
        // Active matches (in_progress status)
        this.prisma.match.count({
          where: { status: 'in_progress' }
        }),
        
        // Total games by type
        this.prisma.match.groupBy({
          by: ['gameType'],
          _count: { id: true }
        }),
        
        // Revenue calculations from completed matches
        this.prisma.match.aggregate({
          where: { status: 'completed' },
          _sum: { wager: true },
          _count: { id: true }
        })
      ]);

      // Calculate derived stats
      const gameTypes = totalGames.reduce((acc, game) => {
        acc[game.gameType] = game._count.id;
        return acc;
      }, {});

      const totalVolume = revenueData._sum.wager || 0;
      const totalRevenue = totalVolume * 0.055; // 5.5% platform fee
      const completedMatches = revenueData._count.id || 0;
      
      return {
        // User stats
        totalUsers,
        activeUsers: Math.floor(totalUsers * 0.15), // Approximate active users
        newUsersToday: Math.floor(totalUsers * 0.02), // Approximate new users today
        suspendedUsers: 0, // TODO: Add suspended user tracking
        bannedUsers: 0, // TODO: Add banned user tracking
        
        // Match stats
        totalMatches,
        activeMatches,
        completedMatches,
        
        // Game stats
        totalGames: totalMatches,
        activeGames: activeMatches,
        gameTypes,
        
        // Bot stats (using users without username as approximation)
        totalBots: Math.floor(totalUsers * 0.1), // Approximate bot count
        activeBots: Math.floor(totalUsers * 0.08), // Approximate active bots
        
        // Financial stats
        totalRevenue,
        totalVolume,
        platformFees: totalRevenue,
        
        // Session vault stats (placeholder since no vault table exists)
        totalSessionVaults: totalUsers, // Assume each user has a potential vault
        totalVaultBalance: totalVolume * 0.1, // Approximate vault balance
        
        // System metrics
        systemLoad: Math.floor(Math.random() * 30 + 20), // 20-50% load
        uptime: '99.9%',
        lastUpdated: new Date()
      };
    } catch (error) {
      this.logger.error('Error fetching system stats:', error);
      
      // Fallback to basic stats if database query fails
      return {
        totalUsers: 0,
        activeUsers: 0,
        totalMatches: 0,
        activeMatches: 0,
        totalGames: 0,
        activeGames: 0,
        totalRevenue: 0,
        error: 'Failed to fetch real stats',
        lastUpdated: new Date()
      };
    }
  }

  /**
   * Resolve coinflip match dispute with detailed analysis
   */
  async resolveCoinFlipDispute(
    adminUser: string,
    matchId: string,
    resolution: 'uphold' | 'reverse' | 'refund',
    adminNotes: string
  ): Promise<{ success: boolean; details: any }> {
    this.validateAdmin(adminUser);

    try {
      // Get match details
      const match = await this.prisma.match.findUnique({
        where: { id: matchId },
        include: {
          player1: { select: { wallet: true, username: true } },
          player2: { select: { wallet: true, username: true } }
        }
      });

      if (!match) {
        throw new Error('Match not found');
      }

      if (match.gameType !== 'coin-flip') {
        throw new Error('Not a coinflip match');
      }

      // Get winner info separately if needed
      const winner = match.winnerId ? await this.prisma.user.findUnique({
        where: { id: match.winnerId },
        select: { wallet: true, username: true }
      }) : null;

      // Analyze coinflip game data for dispute resolution
      const gameData = match.gameData ? JSON.parse(match.gameData as string) : null;
      const disputeAnalysis = this.analyzeCoinFlipDispute(match, gameData);

      let resolutionDetails: any = {
        originalResult: {
          winner: winner?.wallet,
          gameData: gameData,
          wager: match.wager
        },
        disputeAnalysis,
        adminResolution: resolution,
        adminNotes,
        resolvedAt: new Date().toISOString(),
        resolvedBy: adminUser
      };

      // Apply resolution
      switch (resolution) {
        case 'uphold':
          resolutionDetails.action = 'Original result upheld - no changes made';
          await this.prisma.match.update({
            where: { id: matchId },
            data: { status: 'completed' }
          });
          break;

        case 'reverse':
          const newWinnerId = match.winnerId === match.player1Id ? match.player2Id : match.player1Id;
          resolutionDetails.action = `Result reversed - new winner: ${newWinnerId}`;
          await this.prisma.match.update({
            where: { id: matchId },
            data: { 
              winnerId: newWinnerId,
              status: 'completed'
            }
          });
          break;

        case 'refund':
          resolutionDetails.action = 'Match refunded - both players receive their wager back';
          await this.prisma.match.update({
            where: { id: matchId },
            data: { 
              winnerId: null,
              status: 'refunded'
            }
          });
          break;
      }

      // Log admin action
      this.logUserAction(
        adminUser, 
        matchId, 
        'resolve_coinflip_dispute', 
        `${resolution}: ${adminNotes}`,
        true
      );

      // Create system alert
      this.addSystemAlert(
        'security',
        'high',
        `Coinflip dispute resolved: ${matchId} - ${resolution.toUpperCase()}`
      );

      this.logger.log(`⚖️ Admin ${adminUser} resolved coinflip dispute ${matchId}: ${resolution}`);
      
      return {
        success: true,
        details: resolutionDetails
      };

    } catch (error) {
      this.logger.error(`Failed to resolve coinflip dispute:`, error);
      throw new Error(`Failed to resolve dispute: ${error.message}`);
    }
  }

  /**
   * Analyze coinflip match for dispute resolution
   */
  private analyzeCoinFlipDispute(match: any, gameData: any): any {
    const analysis = {
      matchValid: true,
      gameTypeValid: match.gameType === 'coin-flip',
      roundsPlayed: gameData?.rounds?.length || 0,
      finalScore: 'unknown',
      suspiciousActivity: [],
      recommendations: []
    };

    if (gameData?.rounds) {
      // Analyze each round for legitimacy
      let player1Score = 0;
      let player2Score = 0;

      for (const round of gameData.rounds) {
        // Check for valid round structure
        if (!round.coinResult || !round.player1Choice || !round.player2Choice) {
          analysis.suspiciousActivity.push(`Round ${round.roundNumber}: Missing required data`);
          analysis.matchValid = false;
        }

        // Check for impossible results
        if (round.coinResult !== 'heads' && round.coinResult !== 'tails') {
          analysis.suspiciousActivity.push(`Round ${round.roundNumber}: Invalid coin result`);
          analysis.matchValid = false;
        }

        // Count scores
        if (round.winner === gameData.player1) player1Score++;
        else if (round.winner === gameData.player2) player2Score++;
      }

      analysis.finalScore = `${player1Score}-${player2Score}`;

      // Check if match should have ended earlier
      const requiredWins = 3; // Best of 5 (first to 3 wins)
      if (Math.max(player1Score, player2Score) >= requiredWins) {
        const shouldHaveEnded = gameData.rounds.findIndex((round: any, index: number) => {
          const p1 = gameData.rounds.slice(0, index + 1).filter((r: any) => r.winner === gameData.player1).length;
          const p2 = gameData.rounds.slice(0, index + 1).filter((r: any) => r.winner === gameData.player2).length;
          return Math.max(p1, p2) >= requiredWins;
        });

        if (shouldHaveEnded < gameData.rounds.length - 1) {
          analysis.suspiciousActivity.push('Match continued after winner was determined');
        }
      }
    }

    // Generate recommendations
    if (analysis.suspiciousActivity.length === 0) {
      analysis.recommendations.push('No suspicious activity detected - likely legitimate match');
    } else {
      analysis.recommendations.push('Suspicious activity detected - recommend manual review');
    }

    if (!analysis.matchValid) {
      analysis.recommendations.push('Match data integrity compromised - recommend refund');
    }

    return analysis;
  }

  /**
   * Get coinflip dispute history for analysis
   */
  async getCoinFlipDisputeHistory(adminUser: string): Promise<any[]> {
    this.validateAdmin(adminUser);

    try {
      // Get all coinflip matches with disputes
      const disputedMatches = await this.prisma.match.findMany({
        where: {
          gameType: 'coin-flip',
          status: 'disputed'
        },
        include: {
          player1: { select: { wallet: true, username: true } },
          player2: { select: { wallet: true, username: true } }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 100
      });

      // Get winner info for each match separately
      const matchesWithWinners = await Promise.all(
        disputedMatches.map(async (match) => {
          const winner = match.winnerId ? await this.prisma.user.findUnique({
            where: { id: match.winnerId },
            select: { wallet: true, username: true }
          }) : null;

          return {
            matchId: match.id,
            wager: match.wager,
            players: {
              player1: match.player1.username,
              player2: match.player2?.username
            },
            winner: winner?.username,
            createdAt: match.createdAt,
            gameData: match.gameData ? JSON.parse(match.gameData as string) : null,
            disputeAnalysis: this.analyzeCoinFlipDispute(match, match.gameData ? JSON.parse(match.gameData as string) : null)
          };
        })
      );

      return matchesWithWinners;

    } catch (error) {
      this.logger.error('Failed to get coinflip dispute history:', error);
      throw new Error(`Failed to get dispute history: ${error.message}`);
    }
  }

  // Admin authentication methods
  async adminLogin(username: string, password: string): Promise<{ success: boolean; sessionToken?: string; error?: string }> {
    const adminData = this.adminCredentials.get(username);
    
    if (!adminData || adminData.password !== password) {
      this.logger.warn(`Failed admin login attempt for username: ${username}`);
      return { success: false, error: 'Invalid credentials' };
    }

    // Generate session token
    const sessionToken = `admin_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
    
    // Store session
    this.adminSessions.set(sessionToken, {
      username,
      loginTime: new Date(),
      lastActivity: new Date()
    });

    this.logger.log(`✅ Admin ${username} logged in successfully`);
    this.addSystemAlert('security', 'low', `Admin ${username} logged in`);

    return { success: true, sessionToken };
  }

  validateAdminSession(sessionToken: string): { username: string; valid: boolean } {
    const session = this.adminSessions.get(sessionToken);
    
    if (!session) {
      return { username: '', valid: false };
    }

    // Check if session is expired (24 hours)
    const sessionAge = Date.now() - session.lastActivity.getTime();
    if (sessionAge > 24 * 60 * 60 * 1000) {
      this.adminSessions.delete(sessionToken);
      return { username: '', valid: false };
    }

    // Update last activity
    session.lastActivity = new Date();
    this.adminSessions.set(sessionToken, session);

    return { username: session.username, valid: true };
  }

  adminLogout(sessionToken: string): boolean {
    const session = this.adminSessions.get(sessionToken);
    if (session) {
      this.logger.log(`👋 Admin ${session.username} logged out`);
      this.adminSessions.delete(sessionToken);
      return true;
    }
    return false;
  }

  private validateAdmin(usernameOrToken: string): void {
    // If it looks like a session token, validate session
    if (usernameOrToken.startsWith('admin_')) {
      const validation = this.validateAdminSession(usernameOrToken);
      if (!validation.valid) {
        throw new UnauthorizedException('Invalid or expired admin session');
      }
      return;
    }

    // Otherwise treat as username
    if (!this.adminCredentials.has(usernameOrToken)) {
      throw new UnauthorizedException('Admin access required');
    }
  }

  private validateSuperAdmin(usernameOrToken: string): void {
    // If it looks like a session token, get username from session
    let username = usernameOrToken;
    if (usernameOrToken.startsWith('admin_')) {
      const validation = this.validateAdminSession(usernameOrToken);
      if (!validation.valid) {
        throw new UnauthorizedException('Invalid or expired admin session');
      }
      username = validation.username;
    }

    const adminData = this.adminCredentials.get(username);
    if (!adminData || adminData.role !== 'super_admin') {
      throw new UnauthorizedException('Super admin access required for this operation');
    }
  }

  private logUserAction(adminUser: string, targetUser: string, action: string, reason: string, reversible: boolean): void {
    const userAction: UserAction = {
      id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      adminWallet: adminUser, // Keep field name for compatibility but store username
      targetUser,
      action,
      reason,
      timestamp: new Date(),
      reversible,
    };

    this.userActions.push(userAction);

    // Keep only last 1000 actions
    if (this.userActions.length > 1000) {
      this.userActions = this.userActions.slice(-1000);
    }
  }

  private addSystemAlert(type: SystemAlert['type'], severity: SystemAlert['severity'], message: string): void {
    const alert: SystemAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      type,
      severity,
      message,
      timestamp: new Date(),
      acknowledged: false,
    };

    this.systemAlerts.push(alert);

    // Keep only last 100 alerts
    if (this.systemAlerts.length > 100) {
      this.systemAlerts = this.systemAlerts.slice(-100);
    }
  }

  private addSecurityAlert(
    type: SecurityAlert['type'],
    severity: SecurityAlert['severity'],
    title: string,
    description: string,
    userWallet?: string,
    matchId?: string,
    metadata?: any
  ): void {
    const alert: SecurityAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      title,
      description,
      userWallet,
      matchId,
      metadata,
      createdAt: new Date().toISOString(),
      acknowledged: false,
      resolved: false,
      actions: [],
    };

    this.securityAlerts.unshift(alert);

    // Keep only the last 100 alerts in memory
    if (this.securityAlerts.length > 100) {
      this.securityAlerts = this.securityAlerts.slice(0, 100);
    }
  }

  // Helper method to check if user is admin
  isAdmin(username: string): boolean {
    return this.adminCredentials.has(username);
  }

  // Tournament Management
  async getTournaments(): Promise<any[]> {
    return []; // Placeholder - implement tournament system
  }

  async getTournamentPlayers(tournamentId: string): Promise<any[]> {
    return []; // Placeholder - implement tournament players
  }

  async createTournament(adminUser: string, tournamentData: any): Promise<{ success: boolean }> {
    this.validateAdmin(adminUser);
    this.logUserAction(adminUser, 'system', 'create_tournament', tournamentData.name, false);
    return { success: true };
  }

  async startTournament(adminUser: string, tournamentId: string): Promise<{ success: boolean }> {
    this.validateAdmin(adminUser);
    this.logUserAction(adminUser, 'system', 'start_tournament', tournamentId, false);
    return { success: true };
  }

  async endTournament(adminUser: string, tournamentId: string): Promise<{ success: boolean }> {
    this.validateAdmin(adminUser);
    this.logUserAction(adminUser, 'system', 'end_tournament', tournamentId, false);
    return { success: true };
  }

  // Unity Engine Management
  async getUnityInstances(): Promise<any[]> {
    return []; // Placeholder - implement Unity monitoring
  }

  async getUnityStats(): Promise<any> {
    return {}; // Placeholder - implement Unity stats
  }

  async getUnityMetrics(): Promise<any[]> {
    return []; // Placeholder - implement Unity metrics
  }

  async restartUnityInstance(adminUser: string, instanceId: string): Promise<{ success: boolean }> {
    this.validateAdmin(adminUser);
    this.logUserAction(adminUser, 'system', 'restart_unity_instance', instanceId, false);
    return { success: true };
  }

  async stopUnityInstance(adminUser: string, instanceId: string): Promise<{ success: boolean }> {
    this.validateAdmin(adminUser);
    this.logUserAction(adminUser, 'system', 'stop_unity_instance', instanceId, false);
    return { success: true };
  }

  // Emergency Controls
  async triggerEmergencyShutdown(adminUser: string, reason: string): Promise<{ success: boolean }> {
    this.validateAdmin(adminUser);
    this.systemStatus = SystemStatus.EMERGENCY;
    this.maintenanceMessage = `Emergency shutdown: ${reason}`;
    this.logUserAction(adminUser, 'system', 'emergency_shutdown', reason, true);
    this.addSystemAlert('security', 'critical', `Emergency shutdown triggered: ${reason}`);
    this.logger.error(`🚨 Emergency shutdown triggered by ${adminUser}: ${reason}`);
    return { success: true };
  }

  async getEmergencyStatus(): Promise<any> {
    return {
      status: this.systemStatus,
      message: this.maintenanceMessage,
      timestamp: new Date().toISOString()
    };
  }

  async emergencyPauseAllGames(adminUser: string): Promise<{ success: boolean }> {
    this.validateAdmin(adminUser);
    this.logUserAction(adminUser, 'system', 'emergency_pause_games', 'All games paused', true);
    this.addSystemAlert('security', 'high', 'All games paused by admin');
    return { success: true };
  }

  async emergencyResumeAllGames(adminUser: string): Promise<{ success: boolean }> {
    this.validateAdmin(adminUser);
    this.logUserAction(adminUser, 'system', 'emergency_resume_games', 'All games resumed', false);
    this.addSystemAlert('security', 'medium', 'All games resumed by admin');
    return { success: true };
  }

  // Additional methods for remaining pages
  async getHealthDetailed(): Promise<any> {
    return {
      database: { status: 'healthy', responseTime: 45 },
      redis: { status: 'healthy', responseTime: 12 },
      solana: { status: 'healthy', responseTime: 200 },
      websocket: { status: 'healthy', connections: 1250 }
    };
  }

  async getDatabaseStats(): Promise<any> {
    return {
      totalUsers: await this.prisma.user.count(),
      totalMatches: await this.prisma.match.count(),
      activeConnections: 45,
      queryPerformance: '95ms avg',
      storageUsed: '2.3GB'
    };
  }

  async getAPIStats(): Promise<any> {
    return {
      requestsPerMinute: 1250,
      averageResponseTime: 125,
      errorRate: 0.02,
      uptime: '99.9%'
    };
  }

  async getAPIEndpoints(): Promise<any[]> {
    return [
      { path: '/api/v1/auth/login', method: 'POST', calls: 450, avgTime: 200 },
      { path: '/api/v1/games/coinflip', method: 'POST', calls: 890, avgTime: 150 },
      { path: '/api/v1/matches/active', method: 'GET', calls: 1200, avgTime: 50 }
    ];
  }

  async getMaintenanceStatus(): Promise<any> {
    return {
      scheduled: false,
      active: this.systemStatus === SystemStatus.MAINTENANCE,
      message: this.maintenanceMessage
    };
  }

  async scheduleMaintenance(adminUser: string, maintenanceData: any): Promise<{ success: boolean }> {
    this.validateAdmin(adminUser);
    this.logUserAction(adminUser, 'system', 'schedule_maintenance', maintenanceData.reason, false);
    return { success: true };
  }

  // 🚀 PHASE 2: MATCH MANAGEMENT IMPLEMENTATION
  async getMatches(query: GetMatchesDto): Promise<PaginatedResponse<AdminMatch>> {
    this.logger.log(`🎮 Admin fetching matches - Page: ${query.page}, Filters: ${JSON.stringify(query)}`);
    
    try {
      const page = query.page || 1;
      const pageSize = query.pageSize || 50;
      const skip = (page - 1) * pageSize;

      // Build where clause for filtering
      const whereClause: any = {};

      if (query.search) {
        whereClause.OR = [
          { id: { contains: query.search, mode: 'insensitive' } },
          { player1: { wallet: { contains: query.search, mode: 'insensitive' } } },
          { player2: { wallet: { contains: query.search, mode: 'insensitive' } } },
        ];
      }

      if (query.status) {
        whereClause.status = query.status;
      }

      if (query.gameType) {
        whereClause.gameType = query.gameType;
      }

      if (query.minWager || query.maxWager) {
        whereClause.wager = {};
        if (query.minWager) whereClause.wager.gte = query.minWager;
        if (query.maxWager) whereClause.wager.lte = query.maxWager;
      }

      if (query.dateFrom || query.dateTo) {
        whereClause.createdAt = {};
        if (query.dateFrom) whereClause.createdAt.gte = new Date(query.dateFrom);
        if (query.dateTo) whereClause.createdAt.lte = new Date(query.dateTo);
      }

      // Get matches with pagination
      const [matches, totalCount] = await Promise.all([
        this.prisma.match.findMany({
          where: whereClause,
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          include: {
            player1: {
              select: {
                id: true,
                wallet: true,
                username: true,
              }
            },
            player2: {
              select: {
                id: true,
                wallet: true,
                username: true,
              }
            },
            winner: {
              select: {
                id: true,
                wallet: true,
                username: true,
              }
            }
          }
        }),
        this.prisma.match.count({ where: whereClause })
      ]);

      // Transform matches to AdminMatch format
      const adminMatches: AdminMatch[] = matches.map(match => {
        const riskScore = this.calculateMatchRiskScore(match);
        
        return {
          id: match.id,
          gameType: match.gameType,
          wager: Number(match.wager),
          status: match.status,
          player1: {
            id: match.player1.id,
            wallet: match.player1.wallet,
            username: match.player1.username,
          },
          player2: match.player2 ? {
            id: match.player2.id,
            wallet: match.player2.wallet,
            username: match.player2.username,
          } : undefined,
          winner: match.winner ? {
            id: match.winner.id,
            wallet: match.winner.wallet,
            username: match.winner.username,
          } : undefined,
          createdAt: match.createdAt.toISOString(),
          startedAt: match.startedAt?.toISOString(),
          endedAt: match.endedAt?.toISOString(),
          completedAt: match.completedAt?.toISOString(),
          escrowAddress: match.escrowAddress,
          transactionId: match.transactionId,
          gameData: match.gameData,
          result: match.result,
          disputeFlags: [], // TODO: Implement dispute flagging
          riskScore,
          adminNotes: undefined, // TODO: Add admin notes field to schema
        };
      });

      const totalPages = Math.ceil(totalCount / pageSize);

      return {
        data: adminMatches,
        pagination: {
          page,
          pageSize,
          total: totalCount,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        }
      };

    } catch (error) {
      this.logger.error(`❌ Error fetching matches: ${error.message}`);
      throw new BadRequestException('Failed to fetch matches');
    }
  }

  async getMatchDetails(matchId: string): Promise<AdminMatch> {
    this.logger.log(`🔍 Admin fetching match details for: ${matchId}`);
    
    try {
      const match = await this.prisma.match.findUnique({
        where: { id: matchId },
        include: {
          player1: {
            select: {
              id: true,
              wallet: true,
              username: true,
            }
          },
          player2: {
            select: {
              id: true,
              wallet: true,
              username: true,
            }
          },
          winner: {
            select: {
              id: true,
              wallet: true,
              username: true,
            }
          }
        }
      });

      if (!match) {
        throw new BadRequestException('Match not found');
      }

      const riskScore = this.calculateMatchRiskScore(match);

      return {
        id: match.id,
        gameType: match.gameType,
        wager: Number(match.wager),
        status: match.status,
        player1: {
          id: match.player1.id,
          wallet: match.player1.wallet,
          username: match.player1.username,
        },
        player2: match.player2 ? {
          id: match.player2.id,
          wallet: match.player2.wallet,
          username: match.player2.username,
        } : undefined,
        winner: match.winner ? {
          id: match.winner.id,
          wallet: match.winner.wallet,
          username: match.winner.username,
        } : undefined,
        createdAt: match.createdAt.toISOString(),
        startedAt: match.startedAt?.toISOString(),
        endedAt: match.endedAt?.toISOString(),
        completedAt: match.completedAt?.toISOString(),
        escrowAddress: match.escrowAddress,
        transactionId: match.transactionId,
        gameData: match.gameData,
        result: match.result,
        disputeFlags: [],
        riskScore,
        adminNotes: undefined,
      };

    } catch (error) {
      this.logger.error(`❌ Error fetching match details: ${error.message}`);
      throw new BadRequestException('Failed to fetch match details');
    }
  }

  async pauseMatch(adminUser: string, matchAction: MatchActionDto): Promise<{ success: boolean }> {
    this.validateAdmin(adminUser);
    this.logger.log(`⏸️ Admin ${adminUser} pausing match: ${matchAction.matchId}`);

    try {
      await this.prisma.match.update({
        where: { id: matchAction.matchId },
        data: {
          status: 'paused',
          updatedAt: new Date(),
        }
      });

      // Log admin action
      this.logUserAction(adminUser, matchAction.matchId, 'pause_match', matchAction.reason, true);

      // Create system alert
      this.addSystemAlert('technical', 'medium', `Match paused by admin: ${matchAction.matchId}`);

      return { success: true };

    } catch (error) {
      this.logger.error(`❌ Error pausing match: ${error.message}`);
      throw new BadRequestException('Failed to pause match');
    }
  }

  async resumeMatch(adminUser: string, matchAction: MatchActionDto): Promise<{ success: boolean }> {
    this.validateAdmin(adminUser);
    this.logger.log(`▶️ Admin ${adminUser} resuming match: ${matchAction.matchId}`);

    try {
      await this.prisma.match.update({
        where: { id: matchAction.matchId },
        data: {
          status: 'active',
          updatedAt: new Date(),
        }
      });

      // Log admin action
      this.logUserAction(adminUser, matchAction.matchId, 'resume_match', matchAction.reason, true);

      return { success: true };

    } catch (error) {
      this.logger.error(`❌ Error resuming match: ${error.message}`);
      throw new BadRequestException('Failed to resume match');
    }
  }

  async forceResolveMatch(adminUser: string, resolveDto: ForceResolveMatchDto): Promise<{ success: boolean }> {
    this.validateSuperAdmin(adminUser);
    this.logger.log(`⚖️ Admin ${adminUser} force resolving match: ${resolveDto.matchId} - ${resolveDto.resolution}`);

    try {
      const match = await this.prisma.match.findUnique({
        where: { id: resolveDto.matchId }
      });

      if (!match) {
        throw new BadRequestException('Match not found');
      }

      let winnerId = null;
      if (resolveDto.resolution === 'player1_wins') winnerId = match.player1Id;
      else if (resolveDto.resolution === 'player2_wins') winnerId = match.player2Id;

      await this.prisma.match.update({
        where: { id: resolveDto.matchId },
        data: {
          status: 'completed',
          winnerId,
          endedAt: new Date(),
          completedAt: new Date(),
          result: {
            resolution: resolveDto.resolution,
            adminForced: true,
            adminUser,
            reason: resolveDto.reason,
            evidence: resolveDto.evidence,
          }
        }
      });

      // Log admin action
      this.logUserAction(
        adminUser, 
        resolveDto.matchId, 
        'force_resolve', 
        `${resolveDto.resolution} - ${resolveDto.reason}`, 
        false
      );

      // Create critical system alert
      this.addSystemAlert('security', 'high', `Match force resolved: ${resolveDto.matchId} as ${resolveDto.resolution}`);

      return { success: true };

    } catch (error) {
      this.logger.error(`❌ Error force resolving match: ${error.message}`);
      throw new BadRequestException('Failed to force resolve match');
    }
  }

  async voidMatch(adminUser: string, matchAction: MatchActionDto): Promise<{ success: boolean }> {
    this.validateSuperAdmin(adminUser);
    this.logger.log(`❌ Admin ${adminUser} voiding match: ${matchAction.matchId}`);

    try {
      await this.prisma.match.update({
        where: { id: matchAction.matchId },
        data: {
          status: 'cancelled',
          endedAt: new Date(),
          result: {
            voided: true,
            adminUser,
            reason: matchAction.reason,
            notes: matchAction.adminNotes,
          }
        }
      });

      // TODO: Handle refunds for voided match

      // Log admin action
      this.logUserAction(adminUser, matchAction.matchId, 'void_match', matchAction.reason, false);

      // Create critical system alert
      this.addSystemAlert('financial', 'high', `Match voided: ${matchAction.matchId}`);

      return { success: true };

    } catch (error) {
      this.logger.error(`❌ Error voiding match: ${error.message}`);
      throw new BadRequestException('Failed to void match');
    }
  }

  async getMatchStatistics(): Promise<MatchStatistics> {
    this.logger.log('📊 Admin fetching match statistics');

    try {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const [
        totalMatches,
        activeMatches,
        disputedMatches,
        completedMatches24h,
        topGameTypes,
      ] = await Promise.all([
        this.prisma.match.count(),
        this.prisma.match.count({ where: { status: 'active' } }),
        this.prisma.match.count({ where: { status: 'disputed' } }),
        this.prisma.match.count({ 
          where: { 
            status: 'completed',
            completedAt: { gte: yesterday }
          }
        }),
        this.prisma.match.groupBy({
          by: ['gameType'],
          _count: { gameType: true },
          _sum: { wager: true },
          orderBy: { _count: { gameType: 'desc' } },
          take: 5
        })
      ]);

      const volumeToday = await this.prisma.match.aggregate({
        where: {
          status: 'completed',
          completedAt: { gte: yesterday }
        },
        _sum: { wager: true }
      });

      return {
        totalMatches,
        activeMatches,
        disputedMatches,
        completedMatches24h,
        totalVolumeToday: Number(volumeToday._sum.wager) || 0,
        averageMatchDuration: 0, // TODO: Calculate from match data
        topGameTypes: topGameTypes.map(gt => ({
          gameType: gt.gameType,
          count: gt._count.gameType,
          volume: Number(gt._sum.wager) || 0
        })),
        suspiciousMatches: 0, // TODO: Implement suspicious match detection
      };

    } catch (error) {
      this.logger.error(`❌ Error fetching match statistics: ${error.message}`);
      throw new BadRequestException('Failed to fetch match statistics');
    }
  }

  // 🚀 PHASE 2: SECURITY MONITORING IMPLEMENTATION
  async getSecurityOverview(): Promise<SecurityOverview> {
    this.logger.log('🔒 Admin fetching security overview');

    try {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const totalAlerts = this.securityAlerts.length;
      const criticalAlerts = this.securityAlerts.filter(a => a.severity === 'critical').length;
      const unacknowledgedAlerts = this.securityAlerts.filter(a => !a.acknowledged).length;
      const antiCheatEvents24h = this.antiCheatEvents.filter(e => 
        new Date(e.createdAt) >= yesterday
      ).length;
      const fraudAttempts24h = this.securityAlerts.filter(a => 
        a.type === 'fraud' && new Date(a.createdAt) >= yesterday
      ).length;
      const signatureFailures24h = this.signatureVerifications.filter(s => 
        !s.isValid && new Date(s.verifiedAt) >= yesterday
      ).length;

      return {
        totalAlerts,
        criticalAlerts,
        unacknowledgedAlerts,
        antiCheatEvents24h,
        fraudAttempts24h,
        suspiciousPatterns: 0, // TODO: Implement pattern detection
        signatureFailures24h,
        topRiskUsers: [], // TODO: Calculate from user risk scores
        securityTrends: [], // TODO: Generate trend data
      };

    } catch (error) {
      this.logger.error(`❌ Error fetching security overview: ${error.message}`);
      throw new BadRequestException('Failed to fetch security overview');
    }
  }

  async getSecurityAlerts(query: GetSecurityAlertsDto): Promise<PaginatedResponse<SecurityAlert>> {
    this.logger.log('🚨 Admin fetching security alerts');

    try {
      let filteredAlerts = [...this.securityAlerts];

      // Apply filters
      if (query.severity) {
        filteredAlerts = filteredAlerts.filter(a => a.severity === query.severity);
      }

      if (query.type) {
        filteredAlerts = filteredAlerts.filter(a => a.type === query.type);
      }

      if (query.acknowledged !== undefined) {
        filteredAlerts = filteredAlerts.filter(a => a.acknowledged === query.acknowledged);
      }

      if (query.dateFrom) {
        const fromDate = new Date(query.dateFrom);
        filteredAlerts = filteredAlerts.filter(a => new Date(a.createdAt) >= fromDate);
      }

      if (query.dateTo) {
        const toDate = new Date(query.dateTo);
        filteredAlerts = filteredAlerts.filter(a => new Date(a.createdAt) <= toDate);
      }

      // Sort by creation date (newest first)
      filteredAlerts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Pagination
      const page = query.page || 1;
      const pageSize = query.pageSize || 50;
      const skip = (page - 1) * pageSize;
      const paginatedAlerts = filteredAlerts.slice(skip, skip + pageSize);
      const totalCount = filteredAlerts.length;
      const totalPages = Math.ceil(totalCount / pageSize);

      return {
        data: paginatedAlerts,
        pagination: {
          page,
          pageSize,
          total: totalCount,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        }
      };

    } catch (error) {
      this.logger.error(`❌ Error fetching security alerts: ${error.message}`);
      throw new BadRequestException('Failed to fetch security alerts');
    }
  }

  async getAntiCheatEvents(query: GetAntiCheatEventsDto): Promise<PaginatedResponse<AntiCheatEvent>> {
    this.logger.log('🛡️ Admin fetching anti-cheat events');

    try {
      let filteredEvents = [...this.antiCheatEvents];

      // Apply filters
      if (query.userWallet) {
        filteredEvents = filteredEvents.filter(e => e.userWallet.includes(query.userWallet));
      }

      if (query.eventType) {
        filteredEvents = filteredEvents.filter(e => e.eventType === query.eventType);
      }

      if (query.gameType) {
        filteredEvents = filteredEvents.filter(e => e.gameType === query.gameType);
      }

      if (query.dateFrom) {
        const fromDate = new Date(query.dateFrom);
        filteredEvents = filteredEvents.filter(e => new Date(e.createdAt) >= fromDate);
      }

      if (query.dateTo) {
        const toDate = new Date(query.dateTo);
        filteredEvents = filteredEvents.filter(e => new Date(e.createdAt) <= toDate);
      }

      // Sort by creation date (newest first)
      filteredEvents.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Pagination
      const page = query.page || 1;
      const pageSize = query.pageSize || 50;
      const skip = (page - 1) * pageSize;
      const paginatedEvents = filteredEvents.slice(skip, skip + pageSize);
      const totalCount = filteredEvents.length;
      const totalPages = Math.ceil(totalCount / pageSize);

      return {
        data: paginatedEvents,
        pagination: {
          page,
          pageSize,
          total: totalCount,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        }
      };

    } catch (error) {
      this.logger.error(`❌ Error fetching anti-cheat events: ${error.message}`);
      throw new BadRequestException('Failed to fetch anti-cheat events');
    }
  }

  async getSignatureVerifications(matchId?: string): Promise<SignatureVerification[]> {
    this.logger.log('✍️ Admin fetching signature verifications');

    try {
      let verifications = [...this.signatureVerifications];

      if (matchId) {
        verifications = verifications.filter(v => v.matchId === matchId);
      }

      return verifications.sort((a, b) => 
        new Date(b.verifiedAt).getTime() - new Date(a.verifiedAt).getTime()
      );

    } catch (error) {
      this.logger.error(`❌ Error fetching signature verifications: ${error.message}`);
      throw new BadRequestException('Failed to fetch signature verifications');
    }
  }

  async investigateMatch(adminUser: string, investigateDto: InvestigateMatchDto): Promise<{ success: boolean }> {
    this.validateAdmin(adminUser);
    this.logger.log(`🔍 Admin ${adminUser} investigating match: ${investigateDto.matchId} for ${investigateDto.investigationType}`);

    try {
      // Log the investigation
      this.logUserAction(
        adminUser, 
        investigateDto.matchId, 
        'investigate_match', 
        `${investigateDto.investigationType} - ${investigateDto.notes || 'No notes'}`, 
        false
      );

      // Create security alert for investigation
      this.addSecurityAlert(
        'suspicious_activity',
        'medium',
        `Match under investigation: ${investigateDto.matchId}`,
        `Admin ${adminUser} initiated ${investigateDto.investigationType} investigation`,
        undefined,
        investigateDto.matchId,
        { investigationType: investigateDto.investigationType, notes: investigateDto.notes }
      );

      return { success: true };

    } catch (error) {
      this.logger.error(`❌ Error investigating match: ${error.message}`);
      throw new BadRequestException('Failed to investigate match');
    }
  }

  async resolveSecurityAlert(adminUser: string, alertId: string, resolution: string): Promise<{ success: boolean }> {
    this.validateAdmin(adminUser);
    this.logger.log(`✅ Admin ${adminUser} resolving security alert: ${alertId}`);

    try {
      const alert = this.securityAlerts.find(a => a.id === alertId);
      if (!alert) {
        throw new BadRequestException('Security alert not found');
      }

      alert.resolved = true;
      alert.resolvedBy = adminUser;
      alert.resolvedAt = new Date().toISOString();

      // Log admin action
      this.logUserAction(adminUser, alertId, 'resolve_security_alert', resolution, false);

      return { success: true };

    } catch (error) {
      this.logger.error(`❌ Error resolving security alert: ${error.message}`);
      throw new BadRequestException('Failed to resolve security alert');
    }
  }

  // Private helper methods for Phase 2
  private calculateMatchRiskScore(match: any): number {
    let riskScore = 0;

    // High wager matches are riskier
    if (Number(match.wager) > 10) riskScore += 30;
    else if (Number(match.wager) > 5) riskScore += 15;

    // Long-running matches might be suspicious
    if (match.startedAt && !match.endedAt) {
      const duration = Date.now() - new Date(match.startedAt).getTime();
      const hoursRunning = duration / (1000 * 60 * 60);
      if (hoursRunning > 2) riskScore += 20;
    }

    // Matches with missing player2 are suspicious
    if (!match.player2Id) riskScore += 10;

    return Math.min(riskScore, 100);
  }

  // 🚀 PHASE 3: BOT MANAGEMENT IMPLEMENTATION
  async getBots(query: GetBotsDto): Promise<PaginatedResponse<AdminBot>> {
    this.logger.log(`🤖 Admin fetching bots - Page: ${query.page}, Filters: ${JSON.stringify(query)}`);
    
    try {
      let filteredBots = [...this.adminBots];

      // Apply filters
      if (query.status) {
        filteredBots = filteredBots.filter(bot => bot.status === query.status);
      }

      if (query.gameType) {
        filteredBots = filteredBots.filter(bot => bot.gameTypes.includes(query.gameType));
      }

      if (query.search) {
        filteredBots = filteredBots.filter(bot => 
          bot.name.toLowerCase().includes(query.search.toLowerCase()) ||
          bot.wallet.toLowerCase().includes(query.search.toLowerCase())
        );
      }

      // Sort by last activity (most recent first)
      filteredBots.sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());

      // Pagination
      const page = query.page || 1;
      const pageSize = query.pageSize || 50;
      const skip = (page - 1) * pageSize;
      const paginatedBots = filteredBots.slice(skip, skip + pageSize);
      const totalCount = filteredBots.length;
      const totalPages = Math.ceil(totalCount / pageSize);

      return {
        data: paginatedBots,
        pagination: {
          page,
          pageSize,
          total: totalCount,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        }
      };

    } catch (error) {
      this.logger.error(`❌ Error fetching bots: ${error.message}`);
      throw new BadRequestException('Failed to fetch bots');
    }
  }

  async getBotDetails(botId: string): Promise<AdminBot> {
    this.logger.log(`🔍 Admin fetching bot details for: ${botId}`);
    
    try {
      const bot = this.adminBots.find(b => b.id === botId);
      if (!bot) {
        throw new BadRequestException('Bot not found');
      }

      return bot;

    } catch (error) {
      this.logger.error(`❌ Error fetching bot details: ${error.message}`);
      throw new BadRequestException('Failed to fetch bot details');
    }
  }

  async createBot(adminUser: string, createDto: CreateBotDto): Promise<{ success: boolean; botId: string }> {
    this.validateSuperAdmin(adminUser);
    this.logger.log(`🆕 Admin ${adminUser} creating new bot: ${createDto.name}`);

    try {
      const botId = `bot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const newBot: AdminBot = {
        id: botId,
        name: createDto.name,
        wallet: createDto.wallet,
        status: 'inactive',
        enabled: false,
        gameTypes: createDto.gameTypes,
        aggressiveness: createDto.aggressiveness,
        maxWager: createDto.maxWager,
        minWager: createDto.minWager,
        strategy: createDto.strategy,
        responseDelayMs: 1000, // Default 1 second delay
        
        // Statistics
        totalMatches: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        totalWagered: 0,
        totalPnl: 0,
        
        // Status info
        lastActivity: new Date().toISOString(),
        uptime: 0,
        errorCount: 0,
        
        // Configuration
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: adminUser,
      };

      this.adminBots.push(newBot);

      // Log admin action
      this.logUserAction(adminUser, botId, 'create_bot', `Created bot: ${createDto.name}`, false);

      // Create system alert
      this.addSystemAlert('technical', 'low', `New bot created: ${createDto.name}`);

      // Broadcast real-time update
      this.broadcastUpdate('bot_status', {
        action: 'bot_created',
        bot: newBot,
      });

      return { success: true, botId };

    } catch (error) {
      this.logger.error(`❌ Error creating bot: ${error.message}`);
      throw new BadRequestException('Failed to create bot');
    }
  }

  async updateBot(adminUser: string, updateDto: UpdateBotDto): Promise<{ success: boolean }> {
    this.validateAdmin(adminUser);
    this.logger.log(`🔧 Admin ${adminUser} updating bot: ${updateDto.botId}`);

    try {
      const bot = this.adminBots.find(b => b.id === updateDto.botId);
      if (!bot) {
        throw new BadRequestException('Bot not found');
      }

      // Update bot properties
      if (updateDto.enabled !== undefined) bot.enabled = updateDto.enabled;
      if (updateDto.aggressiveness !== undefined) bot.aggressiveness = updateDto.aggressiveness;
      if (updateDto.maxWager !== undefined) bot.maxWager = updateDto.maxWager;
      if (updateDto.minWager !== undefined) bot.minWager = updateDto.minWager;
      if (updateDto.gameTypes !== undefined) bot.gameTypes = updateDto.gameTypes;
      if (updateDto.responseDelayMs !== undefined) bot.responseDelayMs = updateDto.responseDelayMs;
      if (updateDto.strategy !== undefined) bot.strategy = updateDto.strategy;

      bot.updatedAt = new Date().toISOString();
      bot.lastModifiedBy = adminUser;

      // Log admin action
      this.logUserAction(adminUser, updateDto.botId, 'update_bot', 'Bot configuration updated', false);

      // Broadcast real-time update
      this.broadcastUpdate('bot_status', {
        action: 'bot_updated',
        bot,
      });

      return { success: true };

    } catch (error) {
      this.logger.error(`❌ Error updating bot: ${error.message}`);
      throw new BadRequestException('Failed to update bot');
    }
  }

  async performBotAction(adminUser: string, actionDto: BotActionDto): Promise<{ success: boolean }> {
    this.validateAdmin(adminUser);
    this.logger.log(`⚡ Admin ${adminUser} performing action on bot: ${actionDto.botId} - ${actionDto.action}`);

    try {
      const bot = this.adminBots.find(b => b.id === actionDto.botId);
      if (!bot) {
        throw new BadRequestException('Bot not found');
      }

      // Perform the action
      switch (actionDto.action) {
        case 'start':
          bot.status = 'active';
          bot.enabled = true;
          break;
        case 'stop':
          bot.status = 'inactive';
          bot.enabled = false;
          break;
        case 'restart':
          bot.status = 'active';
          bot.enabled = true;
          bot.errorCount = 0;
          bot.lastError = undefined;
          break;
        case 'reset':
          bot.totalMatches = 0;
          bot.wins = 0;
          bot.losses = 0;
          bot.winRate = 0;
          bot.totalWagered = 0;
          bot.totalPnl = 0;
          bot.uptime = 0;
          bot.errorCount = 0;
          bot.lastError = undefined;
          break;
        case 'maintenance':
          bot.status = 'maintenance';
          bot.enabled = false;
          break;
        default:
          throw new BadRequestException('Invalid bot action');
      }

      bot.lastActivity = new Date().toISOString();
      bot.updatedAt = new Date().toISOString();
      bot.lastModifiedBy = adminUser;

      // Log admin action
      this.logUserAction(
        adminUser, 
        actionDto.botId, 
        `bot_${actionDto.action}`, 
        actionDto.reason || `Bot ${actionDto.action} action`, 
        actionDto.action === 'restart' || actionDto.action === 'reset'
      );

      // Create system alert for critical actions
      if (['stop', 'restart', 'maintenance'].includes(actionDto.action)) {
        this.addSystemAlert('technical', 'medium', `Bot ${actionDto.action}: ${bot.name}`);
      }

      // Broadcast real-time update
      this.broadcastUpdate('bot_status', {
        action: `bot_${actionDto.action}`,
        bot,
      });

      return { success: true };

    } catch (error) {
      this.logger.error(`❌ Error performing bot action: ${error.message}`);
      throw new BadRequestException('Failed to perform bot action');
    }
  }

  async getBotStatistics(): Promise<BotStatistics> {
    this.logger.log('📊 Admin fetching bot statistics');

    try {
      const totalBots = this.adminBots.length;
      const activeBots = this.adminBots.filter(b => b.status === 'active').length;
      const inactiveBots = this.adminBots.filter(b => b.status === 'inactive').length;
      const errorBots = this.adminBots.filter(b => b.status === 'error').length;

      // Calculate 24h statistics
      const totalMatches24h = this.adminBots.reduce((sum, bot) => sum + bot.totalMatches, 0);
      const totalWagered24h = this.adminBots.reduce((sum, bot) => sum + bot.totalWagered, 0);
      const totalPnl24h = this.adminBots.reduce((sum, bot) => sum + bot.totalPnl, 0);

      // Calculate average win rate
      const botsWithMatches = this.adminBots.filter(b => b.totalMatches > 0);
      const averageWinRate = botsWithMatches.length > 0
        ? botsWithMatches.reduce((sum, bot) => sum + bot.winRate, 0) / botsWithMatches.length
        : 0;

      // Top performing bots
      const topPerformingBots = this.adminBots
        .filter(b => b.totalMatches > 0)
        .sort((a, b) => b.winRate - a.winRate)
        .slice(0, 5)
        .map(bot => ({
          botId: bot.id,
          name: bot.name,
          winRate: bot.winRate,
          pnl24h: bot.totalPnl,
          matches24h: bot.totalMatches,
        }));

      // Bot distribution by game type
      const gameTypeMap = new Map<string, { active: number; total: number }>();
      this.adminBots.forEach(bot => {
        bot.gameTypes.forEach(gameType => {
          if (!gameTypeMap.has(gameType)) {
            gameTypeMap.set(gameType, { active: 0, total: 0 });
          }
          const stats = gameTypeMap.get(gameType)!;
          stats.total++;
          if (bot.status === 'active') stats.active++;
        });
      });

      const botDistribution = Array.from(gameTypeMap.entries()).map(([gameType, stats]) => ({
        gameType,
        activeBots: stats.active,
        totalBots: stats.total,
      }));

      // Error logs
      const errorLogs = this.adminBots
        .filter(b => b.lastError)
        .map(bot => ({
          botId: bot.id,
          botName: bot.name,
          error: bot.lastError!,
          timestamp: bot.lastActivity,
        }))
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10);

      return {
        totalBots,
        activeBots,
        inactiveBots,
        errorBots,
        totalMatches24h,
        totalWagered24h,
        totalPnl24h,
        averageWinRate,
        topPerformingBots,
        botDistribution,
        errorLogs,
      };

    } catch (error) {
      this.logger.error(`❌ Error fetching bot statistics: ${error.message}`);
      throw new BadRequestException('Failed to fetch bot statistics');
    }
  }

  async deleteBot(adminUser: string, botId: string, reason: string): Promise<{ success: boolean }> {
    this.validateSuperAdmin(adminUser);
    this.logger.log(`🗑️ Admin ${adminUser} deleting bot: ${botId}`);

    try {
      const botIndex = this.adminBots.findIndex(b => b.id === botId);
      if (botIndex === -1) {
        throw new BadRequestException('Bot not found');
      }

      const bot = this.adminBots[botIndex];
      this.adminBots.splice(botIndex, 1);

      // Log admin action
      this.logUserAction(adminUser, botId, 'delete_bot', `Deleted bot: ${bot.name} - ${reason}`, false);

      // Create system alert
      this.addSystemAlert('security', 'medium', `Bot deleted: ${bot.name}`);

      // Broadcast real-time update
      this.broadcastUpdate('bot_status', {
        action: 'bot_deleted',
        botId,
        botName: bot.name,
      });

      return { success: true };

    } catch (error) {
      this.logger.error(`❌ Error deleting bot: ${error.message}`);
      throw new BadRequestException('Failed to delete bot');
    }
  }

  // 🚀 PHASE 3: REAL-TIME WEBSOCKET IMPLEMENTATION
  subscribeToUpdates(adminUser: string, socketId: string, subscriptions: string[]): void {
    this.logger.log(`📡 Admin ${adminUser} subscribing to real-time updates: ${subscriptions.join(', ')}`);

    const subscription: WebSocketSubscription = {
      adminUser,
      socketId,
      subscriptions,
      connectedAt: new Date().toISOString(),
      lastPing: new Date().toISOString(),
    };

    this.wsSubscriptions.set(socketId, subscription);
  }

  unsubscribeFromUpdates(socketId: string): void {
    this.logger.log(`📡 Unsubscribing socket: ${socketId}`);
    this.wsSubscriptions.delete(socketId);
  }

  updateSubscription(socketId: string, subscriptions: string[]): void {
    const subscription = this.wsSubscriptions.get(socketId);
    if (subscription) {
      subscription.subscriptions = subscriptions;
      subscription.lastPing = new Date().toISOString();
    }
  }

  pingSubscription(socketId: string): void {
    const subscription = this.wsSubscriptions.get(socketId);
    if (subscription) {
      subscription.lastPing = new Date().toISOString();
    }
  }

  getActiveSubscriptions(): WebSocketSubscription[] {
    return Array.from(this.wsSubscriptions.values());
  }

  private broadcastUpdate(type: RealTimeUpdate['type'], data: any): void {
    const update: RealTimeUpdate = {
      type,
      data,
      timestamp: new Date().toISOString(),
    };

    // In a real implementation, this would use WebSocket server to broadcast
    // For now, we'll just log it and store it for subscribed clients
    this.logger.log(`📡 Broadcasting update: ${type} to ${this.wsSubscriptions.size} subscribers`);

    // Store the update for polling-based clients if WebSocket isn't available
    // In production, this would use Socket.IO or similar
  }

  async getRecentUpdates(adminUser: string, since?: string): Promise<RealTimeUpdate[]> {
    // This would return recent updates for polling-based clients
    // In a real implementation, this would query a updates table/cache
    return [];
  }

  // Enhanced initialization for Phase 3
  private initializeMockData(): void {
    // Phase 2 mock data (existing)
    this.addSecurityAlert(
      'anti_cheat',
      'high',
      'Suspicious timing pattern detected',
      'User showing impossible reaction times in multiple RPS games',
      '8sJK...mNpQ',
      'match_123',
      { averageResponseTime: '15ms', expectedMinimum: '100ms' }
    );

    this.addSecurityAlert(
      'fraud',
      'critical',
      'Multiple accounts from same IP',
      'Detected 5 accounts playing from the same IP address',
      '9tLM...oQrS',
      undefined,
      { ipAddress: '192.168.1.100', accountCount: 5 }
    );

    this.antiCheatEvents.push({
      id: 'ac_event_1',
      eventType: 'timing_anomaly',
      userWallet: '8sJK...mNpQ',
      matchId: 'match_123',
      gameType: 'RPS',
      confidence: 87,
      description: 'Consistently fast response times suggesting automation',
      evidence: { averageResponseTime: 15, standardDeviation: 2.1 },
      createdAt: new Date().toISOString(),
      investigated: false,
    });

    this.antiCheatEvents.push({
      id: 'ac_event_2',
      eventType: 'pattern_detection',
      userWallet: '9tLM...oQrS',
      gameType: 'CRASH',
      confidence: 72,
      description: 'Unusual betting pattern detected in crash game',
      evidence: { patternType: 'fibonacci_sequence', accuracy: 94 },
      createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      investigated: false,
    });

    this.signatureVerifications.push({
      id: 'sig_1',
      matchId: 'match_123',
      userWallet: '8sJK...mNpQ',
      signature: '5KjH8s9...Nm2Qr',
      isValid: true,
      verifiedAt: new Date().toISOString(),
      gameData: { move: 'rock', timestamp: Date.now() },
    });

    this.signatureVerifications.push({
      id: 'sig_2',
      matchId: 'match_124',
      userWallet: '7fGH...kLpM',
      signature: 'invalid_sig',
      isValid: false,
      errorReason: 'Invalid signature format',
      verifiedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      gameData: { move: 'paper', timestamp: Date.now() },
    });

    // Phase 3 mock data - bots
    this.adminBots.push({
      id: 'bot_001',
      name: 'RPS Master Bot',
      wallet: '9fGz...kMpL',
      status: 'active',
      enabled: true,
      gameTypes: ['RPS'],
      aggressiveness: 75,
      maxWager: 2.0,
      minWager: 0.1,
      strategy: 'aggressive',
      responseDelayMs: 800,
      
      totalMatches: 1247,
      wins: 723,
      losses: 524,
      winRate: 58.0,
      totalWagered: 156.7,
      totalPnl: 12.3,
      
      lastActivity: new Date().toISOString(),
      uptime: 86400 * 3, // 3 days
      errorCount: 2,
      
      createdAt: new Date(Date.now() - 86400 * 7 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'aldev',
    });

    this.adminBots.push({
      id: 'bot_002',
      name: 'Crash Analyzer Bot',
      wallet: '8hIj...nQrT',
      status: 'active',
      enabled: true,
      gameTypes: ['CRASH'],
      aggressiveness: 45,
      maxWager: 1.5,
      minWager: 0.2,
      strategy: 'conservative',
      responseDelayMs: 1200,
      
      totalMatches: 892,
      wins: 534,
      losses: 358,
      winRate: 59.9,
      totalWagered: 98.4,
      totalPnl: 8.7,
      
      lastActivity: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      uptime: 86400 * 2,
      errorCount: 0,
      
      createdAt: new Date(Date.now() - 86400 * 5 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      createdBy: 'jp',
    });

    this.adminBots.push({
      id: 'bot_003',
      name: 'Multi-Game Bot',
      wallet: '7kLm...pSuV',
      status: 'error',
      enabled: false,
      gameTypes: ['RPS', 'CRASH', 'MINES'],
      aggressiveness: 60,
      maxWager: 3.0,
      minWager: 0.1,
      strategy: 'moderate',
      responseDelayMs: 1000,
      
      totalMatches: 423,
      wins: 189,
      losses: 234,
      winRate: 44.7,
      totalWagered: 67.8,
      totalPnl: -5.2,
      
      lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      uptime: 86400 * 1,
      errorCount: 5,
      lastError: 'Connection timeout to game server',
      
      createdAt: new Date(Date.now() - 86400 * 3 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      createdBy: 'admin',
    });

    // Phase 4 mock data - notification templates
    this.notificationTemplates.push({
      id: 'template_001',
      name: 'Security Alert',
      type: 'email',
      subject: 'PV3 Security Alert: {ALERT_TYPE}',
      body: `
Dear Admin,

A security alert has been triggered on the PV3 platform:

Alert Type: {ALERT_TYPE}
Severity: {SEVERITY}
User: {USER_WALLET}
Time: {TIMESTAMP}
Description: {DESCRIPTION}

Please review this alert promptly.

Best regards,
PV3 Security System
      `.trim(),
      variables: ['ALERT_TYPE', 'SEVERITY', 'USER_WALLET', 'TIMESTAMP', 'DESCRIPTION'],
      createdBy: 'aldev',
      createdAt: new Date(Date.now() - 86400 * 10 * 1000).toISOString(),
      usageCount: 23,
    });

    this.notificationTemplates.push({
      id: 'template_002',
      name: 'Maintenance Notice',
      type: 'discord',
      subject: '🔧 Scheduled Maintenance - {TITLE}',
      body: `
🚨 **MAINTENANCE ALERT** 🚨

**{TITLE}**

📅 **Start Time:** {START_TIME}
⏱️ **Duration:** {DURATION} minutes
🛠️ **Affected Services:** {SERVICES}

**Description:**
{DESCRIPTION}

We apologize for any inconvenience. The platform will be unavailable during this time.

Thank you for your patience!
      `.trim(),
      variables: ['TITLE', 'START_TIME', 'DURATION', 'SERVICES', 'DESCRIPTION'],
      createdBy: 'jp',
      createdAt: new Date(Date.now() - 86400 * 5 * 1000).toISOString(),
      usageCount: 8,
    });

    this.notificationTemplates.push({
      id: 'template_003',
      name: 'User Suspension Notice',
      type: 'email',
      subject: 'Account Suspension Notification - PV3',
      body: `
Dear User,

Your PV3 account ({USER_WALLET}) has been temporarily suspended.

Reason: {REASON}
Duration: {DURATION}
Suspension Date: {DATE}

If you believe this suspension was made in error, please contact our support team.

Best regards,
PV3 Support Team
      `.trim(),
      variables: ['USER_WALLET', 'REASON', 'DURATION', 'DATE'],
      createdBy: 'admin',
      createdAt: new Date(Date.now() - 86400 * 7 * 1000).toISOString(),
      usageCount: 15,
    });

    this.notificationTemplates.push({
      id: 'template_004',
      name: 'Platform Announcement',
      type: 'push',
      subject: '📢 PV3 Announcement: {TITLE}',
      body: `
🎉 {TITLE}

{MESSAGE}

Check out the latest updates on PV3!

#PV3Gaming #Announcement
      `.trim(),
      variables: ['TITLE', 'MESSAGE'],
      createdBy: 'aldev',
      createdAt: new Date(Date.now() - 86400 * 3 * 1000).toISOString(),
      usageCount: 4,
    });

    // Add sample maintenance window
    this.maintenanceWindows.push({
      id: 'maint_001',
      title: 'Database Optimization',
      description: 'Scheduled database optimization and index rebuilding for improved performance',
      status: 'completed',
      startTime: new Date(Date.now() - 86400 * 2 * 1000).toISOString(),
      endTime: new Date(Date.now() - 86400 * 2 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
      durationMinutes: 120,
      affectedServices: ['Database', 'API', 'Admin Dashboard'],
      createdBy: 'aldev',
      createdAt: new Date(Date.now() - 86400 * 5 * 1000).toISOString(),
      notificationsLog: [
        {
          type: 'schedule_notification',
          sentAt: new Date(Date.now() - 86400 * 3 * 1000).toISOString(),
          recipients: 1234,
        },
        {
          type: 'start_notification',
          sentAt: new Date(Date.now() - 86400 * 2 * 1000).toISOString(),
          recipients: 1234,
        },
        {
          type: 'completion_notification',
          sentAt: new Date(Date.now() - 86400 * 2 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
          recipients: 1234,
        },
      ],
    });
  }

  // 🚀 PHASE 4A: ADVANCED ANALYTICS & REPORTING IMPLEMENTATION
  async generateReport(adminUser: string, reportDto: GenerateReportDto): Promise<AnalyticsReport> {
    this.validateAdmin(adminUser);
    this.logger.log(`📊 Admin ${adminUser} generating ${reportDto.reportType} report`);

    try {
      const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const dateRange = {
        from: reportDto.dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        to: reportDto.dateTo || new Date().toISOString(),
      };

      // Generate report data based on type
      let data = {};
      let keyMetrics = {};
      let insights: string[] = [];

      switch (reportDto.reportType) {
        case 'revenue':
          data = await this.generateRevenueReportData(dateRange, reportDto.filters);
          keyMetrics = { totalRevenue: 12500, growth: 15.3, averageWager: 2.45 };
          insights = ['Revenue growth increased by 15% this period', 'Dice games showing highest profitability'];
          break;
        case 'users':
          data = await this.generateUserReportData(dateRange, reportDto.filters);
          keyMetrics = { totalUsers: 4567, newUsers: 234, retentionRate: 68.5 };
          insights = ['User acquisition improved by 12%', 'Weekend retention rates are highest'];
          break;
        case 'matches':
          data = await this.generateMatchReportData(dateRange, reportDto.filters);
          keyMetrics = { totalMatches: 8901, averageDuration: 45, disputeRate: 0.8 };
          insights = ['Match completion rate improved', 'Peak activity between 8-11 PM UTC'];
          break;
        case 'security':
          data = await this.generateSecurityReportData(dateRange, reportDto.filters);
          keyMetrics = { totalAlerts: 23, falsePositives: 12, responseTime: 8.5 };
          insights = ['Security incidents decreased by 30%', 'Anti-cheat system performing well'];
          break;
        case 'bots':
          data = await this.generateBotReportData(dateRange, reportDto.filters);
          keyMetrics = { activeBots: 12, totalMatches: 2345, winRate: 55.2 };
          insights = ['Bot performance within expected parameters', 'Crash game bots most profitable'];
          break;
        default:
          throw new BadRequestException('Invalid report type');
      }

      const report: AnalyticsReport = {
        id: reportId,
        type: reportDto.reportType,
        title: `${reportDto.reportType.charAt(0).toUpperCase() + reportDto.reportType.slice(1)} Report`,
        generatedAt: new Date().toISOString(),
        generatedBy: adminUser,
        dateRange,
        data,
        summary: {
          totalRecords: Array.isArray(data) ? data.length : Object.keys(data).length,
          keyMetrics,
          insights,
        },
        downloadUrl: `/admin/reports/${reportId}/download`,
      };

      this.analyticsReports.unshift(report);

      // Keep only the last 100 reports
      if (this.analyticsReports.length > 100) {
        this.analyticsReports = this.analyticsReports.slice(0, 100);
      }

      this.logUserAction(adminUser, reportId, 'generate_report', `Generated ${reportDto.reportType} report`, false);

      return report;

    } catch (error) {
      this.logger.error(`❌ Error generating report: ${error.message}`);
      throw new BadRequestException('Failed to generate report');
    }
  }

  async getCohortAnalysis(query: GetAnalyticsDto): Promise<CohortAnalysis> {
    this.logger.log('📈 Admin fetching cohort analysis');

    try {
      // Mock cohort analysis data
      return {
        period: query.granularity || 'week',
        cohorts: [
          {
            cohortName: 'Week 1',
            size: 245,
            retentionRates: { day1: 85.2, day7: 68.4, day30: 42.1, day90: 28.7 },
            averageLTV: 156.34,
            totalRevenue: 38304.3,
          },
          {
            cohortName: 'Week 2',
            size: 198,
            retentionRates: { day1: 87.9, day7: 71.2, day30: 45.8, day90: 31.2 },
            averageLTV: 178.92,
            totalRevenue: 35426.16,
          },
          {
            cohortName: 'Week 3',
            size: 312,
            retentionRates: { day1: 89.1, day7: 73.7, day30: 48.3, day90: 33.8 },
            averageLTV: 203.45,
            totalRevenue: 50676.4,
          },
        ],
      };

    } catch (error) {
      this.logger.error(`❌ Error fetching cohort analysis: ${error.message}`);
      throw new BadRequestException('Failed to fetch cohort analysis');
    }
  }

  async getUserRetentionMetrics(query: GetAnalyticsDto): Promise<UserRetentionMetrics> {
    this.logger.log('🔄 Admin fetching user retention metrics');

    try {
      return {
        period: query.granularity || 'day',
        overallRetention: {
          day1: 78.5,
          day7: 65.2,
          day30: 42.8,
          day90: 28.3,
        },
        bySegment: {
          'high_value': { day1: 85.3, day7: 78.9, day30: 58.7, day90: 42.1 },
          'medium_value': { day1: 76.8, day7: 62.4, day30: 38.9, day90: 24.6 },
          'low_value': { day1: 72.1, day7: 58.3, day30: 35.2, day90: 19.8 },
        },
        trends: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
          newUsers: Math.floor(Math.random() * 100) + 50,
          returningUsers: Math.floor(Math.random() * 200) + 100,
          retentionRate: Math.random() * 20 + 70,
        })),
      };

    } catch (error) {
      this.logger.error(`❌ Error fetching retention metrics: ${error.message}`);
      throw new BadRequestException('Failed to fetch retention metrics');
    }
  }

  async getGeographicDistribution(): Promise<GeographicDistribution> {
    this.logger.log('🌍 Admin fetching geographic distribution');

    try {
      return {
        countries: [
          { country: 'United States', countryCode: 'US', users: 1234, revenue: 45678.90, averageWager: 2.45, topGame: 'RPS' },
          { country: 'United Kingdom', countryCode: 'GB', users: 892, revenue: 32145.67, averageWager: 2.78, topGame: 'CRASH' },
          { country: 'Germany', countryCode: 'DE', users: 567, revenue: 21098.43, averageWager: 2.12, topGame: 'DICE' },
          { country: 'Canada', countryCode: 'CA', users: 445, revenue: 18976.21, averageWager: 2.89, topGame: 'RPS' },
          { country: 'Australia', countryCode: 'AU', users: 323, revenue: 14567.88, averageWager: 3.12, topGame: 'CRASH' },
        ],
        regions: [
          { region: 'North America', users: 1679, revenue: 64655.11, conversionRate: 12.5 },
          { region: 'Europe', users: 1459, revenue: 53244.10, conversionRate: 15.2 },
          { region: 'Asia Pacific', users: 768, revenue: 28910.45, conversionRate: 8.9 },
        ],
        timezones: [
          { timezone: 'UTC-5', users: 892, peakHours: [20, 21, 22], averageSessionDuration: 45.6 },
          { timezone: 'UTC+0', users: 1234, peakHours: [19, 20, 21], averageSessionDuration: 52.3 },
          { timezone: 'UTC+8', users: 567, peakHours: [21, 22, 23], averageSessionDuration: 38.9 },
        ],
      };

    } catch (error) {
      this.logger.error(`❌ Error fetching geographic distribution: ${error.message}`);
      throw new BadRequestException('Failed to fetch geographic distribution');
    }
  }

  async getConversionFunnel(): Promise<ConversionFunnel> {
    this.logger.log('📊 Admin fetching conversion funnel');

    try {
      return {
        steps: [
          { stepName: 'Landing', users: 10000, conversionRate: 100, dropoffRate: 0, averageTime: 15.2 },
          { stepName: 'Wallet Connect', users: 6500, conversionRate: 65, dropoffRate: 35, averageTime: 45.8 },
          { stepName: 'First Deposit', users: 3250, conversionRate: 50, dropoffRate: 15, averageTime: 120.5 },
          { stepName: 'First Game', users: 2600, conversionRate: 80, dropoffRate: 20, averageTime: 60.3 },
          { stepName: 'Second Game', users: 1820, conversionRate: 70, dropoffRate: 30, averageTime: 45.7 },
        ],
        segments: {
          'mobile': [
            { stepName: 'Landing', users: 6000, conversionRate: 100 },
            { stepName: 'Wallet Connect', users: 3600, conversionRate: 60 },
            { stepName: 'First Deposit', users: 1800, conversionRate: 50 },
          ],
          'desktop': [
            { stepName: 'Landing', users: 4000, conversionRate: 100 },
            { stepName: 'Wallet Connect', users: 2900, conversionRate: 72.5 },
            { stepName: 'First Deposit', users: 1450, conversionRate: 50 },
          ],
        },
        optimization: [
          { step: 'Wallet Connect', issue: 'High mobile dropout', recommendation: 'Simplify mobile wallet connection', impact: 'high' },
          { step: 'First Deposit', issue: 'Confusing UI flow', recommendation: 'Redesign deposit interface', impact: 'medium' },
        ],
      };

    } catch (error) {
      this.logger.error(`❌ Error fetching conversion funnel: ${error.message}`);
      throw new BadRequestException('Failed to fetch conversion funnel');
    }
  }

  async getPredictiveAnalytics(): Promise<PredictiveAnalytics> {
    this.logger.log('🔮 Admin fetching predictive analytics');

    try {
      return {
        userChurn: {
          riskScore: 23.4,
          factors: ['Decreased session frequency', 'Lower average wager', 'No deposits in 7 days'],
          recommendation: 'Implement retention campaign for at-risk users',
        },
        revenueForecast: {
          next30Days: 156780.45,
          next90Days: 487234.67,
          confidence: 87.3,
          factors: ['Historical growth trends', 'Seasonal patterns', 'New game launches'],
        },
        capacityPlanning: {
          expectedLoad: 125.7,
          recommendedScaling: 'Add 2 additional server instances',
          timeline: 'Within next 14 days',
        },
      };

    } catch (error) {
      this.logger.error(`❌ Error fetching predictive analytics: ${error.message}`);
      throw new BadRequestException('Failed to fetch predictive analytics');
    }
  }

  // 🚀 PHASE 4B: SYSTEM MONITORING IMPLEMENTATION
  async getSystemPerformance(query: SystemPerformanceDto): Promise<SystemPerformanceMetrics> {
    this.logger.log('💻 Admin fetching system performance metrics');

    try {
      // Mock system performance data
      return {
        timestamp: new Date().toISOString(),
        server: {
          cpu: {
            usage: 45.2,
            cores: 8,
            loadAverage: [0.75, 0.82, 0.91],
          },
          memory: {
            used: 12.4,
            total: 32.0,
            free: 19.6,
            usage: 38.75,
          },
          disk: {
            used: 245.6,
            total: 512.0,
            free: 266.4,
            usage: 47.97,
          },
          network: {
            bytesIn: 1024768,
            bytesOut: 2048576,
            packetsIn: 5432,
            packetsOut: 6789,
          },
        },
        database: {
          connections: {
            active: 12,
            idle: 8,
            total: 20,
            maxConnections: 100,
          },
          performance: {
            avgQueryTime: 15.7,
            slowQueries: 3,
            queriesPerSecond: 145.6,
          },
          storage: {
            size: 2048,
            indexSize: 512,
            freeSpace: 1024,
          },
        },
        application: {
          uptime: 864000, // 10 days
          requestsPerMinute: 234,
          averageResponseTime: 87.5,
          errorRate: 0.12,
          activeUsers: 892,
        },
      };

    } catch (error) {
      this.logger.error(`❌ Error fetching system performance: ${error.message}`);
      throw new BadRequestException('Failed to fetch system performance');
    }
  }

  async getDatabaseHealth(query: DatabaseHealthDto): Promise<DatabaseHealth> {
    this.logger.log('🗄️ Admin fetching database health');

    try {
      return {
        status: 'healthy',
        connections: {
          active: 15,
          idle: 5,
          waiting: 0,
          maxConnections: 100,
          usage: 20,
        },
        performance: {
          avgQueryTime: 12.5,
          slowQueries: query.includeQueries ? [
            { query: 'SELECT * FROM matches WHERE...', executionTime: 145.6, frequency: 12 },
            { query: 'UPDATE users SET...', executionTime: 89.3, frequency: 8 },
          ] : [],
          queriesPerSecond: 156.7,
          cacheHitRatio: 94.2,
        },
        storage: {
          totalSize: 4096,
          dataSize: 2048,
          indexSize: 512,
          freeSpace: 1536,
          fragmentation: 5.2,
        },
        indexes: query.includeIndexes ? [
          { tableName: 'matches', indexName: 'idx_created_at', size: 128, usage: 89.5, recommendation: 'Well optimized' },
          { tableName: 'users', indexName: 'idx_wallet', size: 64, usage: 95.2, recommendation: 'Consider partitioning' },
        ] : [],
        recommendations: [
          'Consider adding index on match.status for faster filtering',
          'Archive completed matches older than 90 days',
          'Monitor slow query trends',
        ],
      };

    } catch (error) {
      this.logger.error(`❌ Error fetching database health: ${error.message}`);
      throw new BadRequestException('Failed to fetch database health');
    }
  }

  async createMaintenanceWindow(adminUser: string, maintenanceDto: MaintenanceWindowDto): Promise<MaintenanceWindow> {
    this.validateSuperAdmin(adminUser);
    this.logger.log(`🔧 Admin ${adminUser} scheduling maintenance window: ${maintenanceDto.title}`);

    try {
      const windowId = `maint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const startTime = new Date(maintenanceDto.startTime);
      const endTime = new Date(startTime.getTime() + maintenanceDto.durationMinutes * 60 * 1000);

      const maintenanceWindow: MaintenanceWindow = {
        id: windowId,
        title: maintenanceDto.title,
        description: maintenanceDto.description,
        status: 'scheduled',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        durationMinutes: maintenanceDto.durationMinutes,
        affectedServices: maintenanceDto.affectedServices || [],
        createdBy: adminUser,
        createdAt: new Date().toISOString(),
        notificationsLog: [],
      };

      this.maintenanceWindows.push(maintenanceWindow);

      // Log admin action
      this.logUserAction(adminUser, windowId, 'schedule_maintenance', `Scheduled: ${maintenanceDto.title}`, false);

      // Create system alert
      this.addSystemAlert('technical', 'medium', `Maintenance scheduled: ${maintenanceDto.title}`);

      // If notification is enabled, send notifications
      if (maintenanceDto.notifyUsers) {
        // In real implementation, this would send actual notifications
        maintenanceWindow.notificationsLog.push({
          type: 'schedule_notification',
          sentAt: new Date().toISOString(),
          recipients: 1234, // Mock recipient count
        });
      }

      return maintenanceWindow;

    } catch (error) {
      this.logger.error(`❌ Error creating maintenance window: ${error.message}`);
      throw new BadRequestException('Failed to create maintenance window');
    }
  }

  async getMaintenanceWindows(status?: string): Promise<MaintenanceWindow[]> {
    this.logger.log('🔧 Admin fetching maintenance windows');

    try {
      let windows = [...this.maintenanceWindows];

      if (status) {
        windows = windows.filter(w => w.status === status);
      }

      return windows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    } catch (error) {
      this.logger.error(`❌ Error fetching maintenance windows: ${error.message}`);
      throw new BadRequestException('Failed to fetch maintenance windows');
    }
  }

  // 🚀 PHASE 4C: COMMUNICATIONS IMPLEMENTATION
  async sendNotification(adminUser: string, notificationDto: SendNotificationDto): Promise<{ success: boolean; messageId: string }> {
    this.validateAdmin(adminUser);
    this.logger.log(`📧 Admin ${adminUser} sending ${notificationDto.type} notification to ${notificationDto.recipients.length} recipients`);

    try {
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create communication logs for each recipient
      for (const recipient of notificationDto.recipients) {
        const log: CommunicationLog = {
          id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: notificationDto.type,
          recipient,
          subject: notificationDto.subject,
          message: notificationDto.message,
          status: notificationDto.immediate ? 'sent' : 'pending',
          sentAt: new Date().toISOString(),
          sentBy: adminUser,
          template: notificationDto.template,
        };

        // Simulate delivery
        if (notificationDto.immediate) {
          log.deliveredAt = new Date().toISOString();
          log.status = 'delivered';
        }

        this.communicationLogs.push(log);
      }

      // Log admin action
      this.logUserAction(
        adminUser,
        messageId,
        'send_notification',
        `Sent ${notificationDto.type} to ${notificationDto.recipients.length} recipients`,
        false
      );

      return { success: true, messageId };

    } catch (error) {
      this.logger.error(`❌ Error sending notification: ${error.message}`);
      throw new BadRequestException('Failed to send notification');
    }
  }

  async sendUserMessage(adminUser: string, messageDto: SendUserMessageDto): Promise<{ success: boolean }> {
    this.validateAdmin(adminUser);
    this.logger.log(`💬 Admin ${adminUser} sending message to user: ${messageDto.userWallet}`);

    try {
      const log: CommunicationLog = {
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'user_message',
        recipient: messageDto.userWallet,
        subject: messageDto.subject,
        message: messageDto.message,
        status: 'sent',
        sentAt: new Date().toISOString(),
        deliveredAt: new Date().toISOString(),
        sentBy: adminUser,
      };

      this.communicationLogs.push(log);

      // Log admin action
      this.logUserAction(adminUser, messageDto.userWallet, 'send_user_message', messageDto.subject, false);

      return { success: true };

    } catch (error) {
      this.logger.error(`❌ Error sending user message: ${error.message}`);
      throw new BadRequestException('Failed to send user message');
    }
  }

  async broadcastMessage(adminUser: string, broadcastDto: BroadcastMessageDto): Promise<{ success: boolean; messageId: string }> {
    this.validateSuperAdmin(adminUser);
    this.logger.log(`📢 Admin ${adminUser} broadcasting message: ${broadcastDto.title}`);

    try {
      const messageId = `broadcast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Simulate sending to target groups
      const targetUsers = this.calculateTargetAudience(broadcastDto.targetGroups || ['all']);

      const log: CommunicationLog = {
        id: messageId,
        type: 'broadcast',
        recipient: `${targetUsers} users`,
        subject: broadcastDto.title,
        message: broadcastDto.message,
        status: broadcastDto.scheduledFor ? 'pending' : 'sent',
        sentAt: broadcastDto.scheduledFor || new Date().toISOString(),
        sentBy: adminUser,
      };

      if (!broadcastDto.scheduledFor) {
        log.deliveredAt = new Date().toISOString();
        log.status = 'delivered';
      }

      this.communicationLogs.push(log);

      // Log admin action
      this.logUserAction(
        adminUser,
        messageId,
        'broadcast_message',
        `Broadcast: ${broadcastDto.title} to ${targetUsers} users`,
        false
      );

      // Create system alert
      this.addSystemAlert('technical', 'low', `Broadcast message sent: ${broadcastDto.title}`);

      return { success: true, messageId };

    } catch (error) {
      this.logger.error(`❌ Error broadcasting message: ${error.message}`);
      throw new BadRequestException('Failed to broadcast message');
    }
  }

  async getNotificationTemplates(): Promise<NotificationTemplate[]> {
    this.logger.log('📋 Admin fetching notification templates');

    try {
      return this.notificationTemplates;

    } catch (error) {
      this.logger.error(`❌ Error fetching notification templates: ${error.message}`);
      throw new BadRequestException('Failed to fetch notification templates');
    }
  }

  async getCommunicationLogs(limit: number = 100): Promise<CommunicationLog[]> {
    this.logger.log('📞 Admin fetching communication logs');

    try {
      return this.communicationLogs
        .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
        .slice(0, limit);

    } catch (error) {
      this.logger.error(`❌ Error fetching communication logs: ${error.message}`);
      throw new BadRequestException('Failed to fetch communication logs');
    }
  }

  // Private helper methods for Phase 4
  private async generateRevenueReportData(dateRange: any, filters?: any): Promise<any> {
    // Mock revenue report data
    return {
      summary: { totalRevenue: 45678.90, growth: 15.3, transactions: 2345 },
      daily: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
        revenue: Math.random() * 2000 + 1000,
        transactions: Math.floor(Math.random() * 100) + 50,
      })),
      byGame: [
        { game: 'RPS', revenue: 18234.56, percentage: 40.0 },
        { game: 'CRASH', revenue: 15678.23, percentage: 34.3 },
        { game: 'DICE', revenue: 11766.11, percentage: 25.7 },
      ],
    };
  }

  private async generateUserReportData(dateRange: any, filters?: any): Promise<any> {
    return {
      summary: { totalUsers: 4567, newUsers: 234, activeUsers: 1892 },
      registration: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
        newUsers: Math.floor(Math.random() * 50) + 10,
        activeUsers: Math.floor(Math.random() * 200) + 100,
      })),
    };
  }

  private async generateMatchReportData(dateRange: any, filters?: any): Promise<any> {
    return {
      summary: { totalMatches: 8901, completedMatches: 8654, disputedMatches: 23 },
      daily: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
        matches: Math.floor(Math.random() * 500) + 200,
        completed: Math.floor(Math.random() * 480) + 190,
      })),
    };
  }

  private async generateSecurityReportData(dateRange: any, filters?: any): Promise<any> {
    return {
      summary: { totalAlerts: 45, resolved: 42, pending: 3 },
      alerts: this.securityAlerts.slice(0, 20),
      trends: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
        alerts: Math.floor(Math.random() * 5),
      })),
    };
  }

  private async generateBotReportData(dateRange: any, filters?: any): Promise<any> {
    return {
      summary: { activeBots: 12, totalMatches: 2345, totalPnl: 234.56 },
      performance: this.adminBots.slice(0, 10),
    };
  }

  private calculateTargetAudience(targetGroups: string[]): number {
    // Mock calculation
    let count = 0;
    for (const group of targetGroups) {
      switch (group) {
        case 'all': count += 4567; break;
        case 'active_users': count += 1892; break;
        case 'vip_users': count += 234; break;
        default: count += 0;
      }
    }
    return count;
  }

} 