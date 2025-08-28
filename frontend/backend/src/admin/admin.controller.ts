import { Controller, Post, Body, Get, Req, Param, Query, Put, Headers, UnauthorizedException, Delete } from '@nestjs/common';
import { AdminService } from './admin.service';
import { 
  BanPlayerDto, 
  SystemMaintenanceDto, 
  FeeUpdateDto, 
  EmergencyWithdrawDto,
  GetUsersDto,
  SuspendUserDto,
  GetSessionVaultsDto,
  RecoverVaultDto,
  GetMatchesDto,
  MatchActionDto,
  ForceResolveMatchDto,
  InvestigateMatchDto,
  GetSecurityAlertsDto,
  GetAntiCheatEventsDto,
  GetBotsDto,
  UpdateBotDto,
  BotActionDto,
  CreateBotDto,
  GenerateReportDto,
  ScheduleReportDto,
  GetAnalyticsDto,
  SystemPerformanceDto,
  DatabaseHealthDto,
  MaintenanceWindowDto,
  SendNotificationDto,
  SendUserMessageDto,
  BroadcastMessageDto
} from './dto/admin.dto';
import { AuthService } from '../auth/auth.service';

interface AdminRequest extends Request {
  adminUser?: string;
}

@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly authService: AuthService,
  ) {}

  // Authentication
  @Post('login')
  async adminLogin(@Body() loginDto: { username: string; password: string }) {
    return this.adminService.adminLogin(loginDto.username, loginDto.password);
  }

  @Post('logout')
  async adminLogout(@Headers('authorization') auth: string) {
    const sessionToken = this.extractSessionToken(auth);
    const success = this.adminService.adminLogout(sessionToken);
    return { success };
  }

  // Dashboard
  @Get('dashboard')
  async getDashboard(@Req() req: AdminRequest) {
    this.validateAdminAccess(req);
    return this.adminService.getDashboard();
  }

  // 🚀 PHASE 1: USER MANAGEMENT ENDPOINTS
  @Get('users')
  async getUsers(@Query() query: GetUsersDto, @Req() req: AdminRequest) {
    this.validateAdminAccess(req);
    return this.adminService.getUsers(query);
  }

  @Get('users/:id')
  async getUserDetails(@Param('id') userId: string, @Req() req: AdminRequest) {
    this.validateAdminAccess(req);
    return this.adminService.getUserDetails(userId);
  }

  @Post('users/suspend')
  async suspendUser(@Body() suspendDto: SuspendUserDto, @Req() req: AdminRequest) {
    this.validateAdminAccess(req);
    const adminUser = this.getAdminUser(req);
    return this.adminService.suspendUser(adminUser, suspendDto);
  }

  @Post('users/unsuspend')
  async unsuspendUser(
    @Body() { wallet, reason }: { wallet: string; reason: string }, 
    @Req() req: AdminRequest
  ) {
    this.validateAdminAccess(req);
    const adminUser = this.getAdminUser(req);
    return this.adminService.unsuspendUser(adminUser, wallet, reason);
  }

  @Post('users/ban')
  async banUser(@Body() banDto: BanPlayerDto, @Req() req: AdminRequest) {
    this.validateAdminAccess(req);
    const adminUser = this.getAdminUser(req);
    return this.adminService.banPlayer(adminUser, banDto);
  }

  @Post('users/unban')
  async unbanUser(
    @Body() { walletAddress, reason }: { walletAddress: string; reason: string }, 
    @Req() req: AdminRequest
  ) {
    this.validateAdminAccess(req);
    const adminUser = this.getAdminUser(req);
    return this.adminService.unbanPlayer(adminUser, walletAddress, reason);
  }

  // 🚀 PHASE 1: FINANCIAL MANAGEMENT ENDPOINTS
  @Get('financial/overview')
  async getFinancialOverview(@Req() req: AdminRequest) {
    this.validateAdminAccess(req);
    return this.adminService.getFinancialOverview();
  }

  @Get('financial/session-vaults')
  async getSessionVaults(@Query() query: GetSessionVaultsDto, @Req() req: AdminRequest) {
    this.validateAdminAccess(req);
    return this.adminService.getSessionVaults(query);
  }

  @Post('financial/recover-vault')
  async recoverVault(@Body() recoverDto: RecoverVaultDto, @Req() req: AdminRequest) {
    this.validateAdminAccess(req);
    const adminUser = this.getAdminUser(req);
    return this.adminService.recoverVault(adminUser, recoverDto);
  }

  @Put('financial/fees')
  async updateFees(@Body() feeUpdateDto: FeeUpdateDto, @Req() req: AdminRequest) {
    this.validateAdminAccess(req);
    const adminUser = this.getAdminUser(req);
    return this.adminService.updateFees(adminUser, feeUpdateDto);
  }

  @Get('financial/fees')
  async getFeeStructure(@Req() req: AdminRequest) {
    this.validateAdminAccess(req);
    return this.adminService.getFeeStructure();
  }

  @Post('financial/emergency-withdraw')
  async emergencyWithdraw(@Body() withdrawDto: EmergencyWithdrawDto, @Req() req: AdminRequest) {
    this.validateAdminAccess(req);
    const adminUser = this.getAdminUser(req);
    return this.adminService.emergencyWithdraw(adminUser, withdrawDto);
  }

  // 🚀 PHASE 2: MATCH MANAGEMENT ENDPOINTS
  @Get('matches')
  async getMatches(@Query() query: GetMatchesDto, @Req() req: AdminRequest) {
    this.validateAdminAccess(req);
    return this.adminService.getMatches(query);
  }

  @Get('matches/statistics')
  async getMatchStatistics(@Req() req: AdminRequest) {
    this.validateAdminAccess(req);
    return this.adminService.getMatchStatistics();
  }

  @Get('matches/:id')
  async getMatchDetails(@Param('id') matchId: string, @Req() req: AdminRequest) {
    this.validateAdminAccess(req);
    return this.adminService.getMatchDetails(matchId);
  }

  @Post('matches/pause')
  async pauseMatch(@Body() matchAction: MatchActionDto, @Req() req: AdminRequest) {
    this.validateAdminAccess(req);
    const adminUser = this.getAdminUser(req);
    return this.adminService.pauseMatch(adminUser, matchAction);
  }

  @Post('matches/resume')
  async resumeMatch(@Body() matchAction: MatchActionDto, @Req() req: AdminRequest) {
    this.validateAdminAccess(req);
    const adminUser = this.getAdminUser(req);
    return this.adminService.resumeMatch(adminUser, matchAction);
  }

  @Post('matches/force-resolve')
  async forceResolveMatch(@Body() resolveDto: ForceResolveMatchDto, @Req() req: AdminRequest) {
    this.validateAdminAccess(req);
    const adminUser = this.getAdminUser(req);
    return this.adminService.forceResolveMatch(adminUser, resolveDto);
  }

  @Post('matches/void')
  async voidMatch(@Body() matchAction: MatchActionDto, @Req() req: AdminRequest) {
    this.validateAdminAccess(req);
    const adminUser = this.getAdminUser(req);
    return this.adminService.voidMatch(adminUser, matchAction);
  }

  @Post('matches/investigate')
  async investigateMatch(@Body() investigateDto: InvestigateMatchDto, @Req() req: AdminRequest) {
    this.validateAdminAccess(req);
    const adminUser = this.getAdminUser(req);
    return this.adminService.investigateMatch(adminUser, investigateDto);
  }

  // 🚀 PHASE 2: SECURITY MONITORING ENDPOINTS
  @Get('security/overview')
  async getSecurityOverview(@Req() req: AdminRequest) {
    this.validateAdminAccess(req);
    return this.adminService.getSecurityOverview();
  }

  @Get('security/alerts')
  async getSecurityAlerts(@Query() query: GetSecurityAlertsDto, @Req() req: AdminRequest) {
    this.validateAdminAccess(req);
    return this.adminService.getSecurityAlerts(query);
  }

  @Get('security/anti-cheat-events')
  async getAntiCheatEvents(@Query() query: GetAntiCheatEventsDto, @Req() req: AdminRequest) {
    this.validateAdminAccess(req);
    return this.adminService.getAntiCheatEvents(query);
  }

  @Get('security/signature-verifications')
  async getSignatureVerifications(
    @Query('matchId') matchId: string,
    @Req() req: AdminRequest
  ) {
    this.validateAdminAccess(req);
    return this.adminService.getSignatureVerifications(matchId);
  }

  @Post('security/resolve-alert')
  async resolveSecurityAlert(
    @Body() { alertId, resolution }: { alertId: string; resolution: string },
    @Req() req: AdminRequest
  ) {
    this.validateAdminAccess(req);
    const adminUser = this.getAdminUser(req);
    return this.adminService.resolveSecurityAlert(adminUser, alertId, resolution);
  }

  // 🚀 PHASE 3: BOT MANAGEMENT ENDPOINTS
  @Get('bots')
  async getBots(@Query() query: GetBotsDto, @Req() req: AdminRequest) {
    this.validateAdminAccess(req);
    return this.adminService.getBots(query);
  }

  @Get('bots/statistics')
  async getBotStatistics(@Req() req: AdminRequest) {
    this.validateAdminAccess(req);
    return this.adminService.getBotStatistics();
  }

  @Get('bots/:id')
  async getBotDetails(@Param('id') botId: string, @Req() req: AdminRequest) {
    this.validateAdminAccess(req);
    return this.adminService.getBotDetails(botId);
  }

  @Post('bots')
  async createBot(@Body() createDto: CreateBotDto, @Req() req: AdminRequest) {
    this.validateAdminAccess(req);
    const adminUser = this.getAdminUser(req);
    return this.adminService.createBot(adminUser, createDto);
  }

  @Put('bots')
  async updateBot(@Body() updateDto: UpdateBotDto, @Req() req: AdminRequest) {
    this.validateAdminAccess(req);
    const adminUser = this.getAdminUser(req);
    return this.adminService.updateBot(adminUser, updateDto);
  }

  @Post('bots/action')
  async performBotAction(@Body() actionDto: BotActionDto, @Req() req: AdminRequest) {
    this.validateAdminAccess(req);
    const adminUser = this.getAdminUser(req);
    return this.adminService.performBotAction(adminUser, actionDto);
  }

  @Delete('bots/:id')
  async deleteBot(
    @Param('id') botId: string,
    @Body() { reason }: { reason: string },
    @Req() req: AdminRequest
  ) {
    this.validateAdminAccess(req);
    const adminUser = this.getAdminUser(req);
    return this.adminService.deleteBot(adminUser, botId, reason);
  }

  // 🚀 PHASE 3: REAL-TIME UPDATES ENDPOINTS
  @Post('realtime/subscribe')
  async subscribeToUpdates(
    @Body() { subscriptions }: { subscriptions: string[] },
    @Req() req: AdminRequest
  ) {
    this.validateAdminAccess(req);
    const adminUser = this.getAdminUser(req);
    // In a real implementation, this would extract the WebSocket connection ID
    const socketId = `socket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.adminService.subscribeToUpdates(adminUser, socketId, subscriptions);
    return { success: true, socketId };
  }

  @Get('realtime/updates')
  async getRecentUpdates(
    @Query('since') since: string,
    @Req() req: AdminRequest
  ) {
    this.validateAdminAccess(req);
    const adminUser = this.getAdminUser(req);
    return this.adminService.getRecentUpdates(adminUser, since);
  }

  @Get('realtime/subscriptions')
  async getActiveSubscriptions(@Req() req: AdminRequest) {
    this.validateAdminAccess(req);
    return this.adminService.getActiveSubscriptions();
  }

  // 🚀 PHASE 4A: ADVANCED ANALYTICS & REPORTING ENDPOINTS
  @Post('reports/generate')
  async generateReport(@Body() reportDto: GenerateReportDto, @Req() req: AdminRequest) {
    this.validateAdminAccess(req);
    const adminUser = this.getAdminUser(req);
    return this.adminService.generateReport(adminUser, reportDto);
  }

  @Get('analytics/cohort')
  async getCohortAnalysis(@Query() query: GetAnalyticsDto, @Req() req: AdminRequest) {
    this.validateAdminAccess(req);
    return this.adminService.getCohortAnalysis(query);
  }

  @Get('analytics/retention')
  async getUserRetentionMetrics(@Query() query: GetAnalyticsDto, @Req() req: AdminRequest) {
    this.validateAdminAccess(req);
    return this.adminService.getUserRetentionMetrics(query);
  }

  @Get('analytics/geographic')
  async getGeographicDistribution(@Req() req: AdminRequest) {
    this.validateAdminAccess(req);
    return this.adminService.getGeographicDistribution();
  }

  @Get('analytics/conversion')
  async getConversionFunnel(@Req() req: AdminRequest) {
    this.validateAdminAccess(req);
    return this.adminService.getConversionFunnel();
  }

  @Get('analytics/predictive')
  async getPredictiveAnalytics(@Req() req: AdminRequest) {
    this.validateAdminAccess(req);
    return this.adminService.getPredictiveAnalytics();
  }

  // 🚀 PHASE 4B: SYSTEM MONITORING ENDPOINTS
  @Get('system/performance')
  async getSystemPerformance(@Query() query: SystemPerformanceDto, @Req() req: AdminRequest) {
    this.validateAdminAccess(req);
    return this.adminService.getSystemPerformance(query);
  }

  @Get('system/database')
  async getDatabaseHealth(@Query() query: DatabaseHealthDto, @Req() req: AdminRequest) {
    this.validateAdminAccess(req);
    return this.adminService.getDatabaseHealth(query);
  }

  @Post('system/maintenance')
  async createMaintenanceWindow(@Body() maintenanceDto: MaintenanceWindowDto, @Req() req: AdminRequest) {
    this.validateAdminAccess(req);
    const adminUser = this.getAdminUser(req);
    return this.adminService.createMaintenanceWindow(adminUser, maintenanceDto);
  }

  @Get('system/maintenance')
  async getMaintenanceWindows(
    @Query('status') status: string,
    @Req() req: AdminRequest
  ) {
    this.validateAdminAccess(req);
    return this.adminService.getMaintenanceWindows(status);
  }

  // 🚀 PHASE 4C: COMMUNICATIONS ENDPOINTS
  @Post('notifications/send')
  async sendNotification(@Body() notificationDto: SendNotificationDto, @Req() req: AdminRequest) {
    this.validateAdminAccess(req);
    const adminUser = this.getAdminUser(req);
    return this.adminService.sendNotification(adminUser, notificationDto);
  }

  @Post('messages/user')
  async sendUserMessage(@Body() messageDto: SendUserMessageDto, @Req() req: AdminRequest) {
    this.validateAdminAccess(req);
    const adminUser = this.getAdminUser(req);
    return this.adminService.sendUserMessage(adminUser, messageDto);
  }

  @Post('messages/broadcast')
  async broadcastMessage(@Body() broadcastDto: BroadcastMessageDto, @Req() req: AdminRequest) {
    this.validateAdminAccess(req);
    const adminUser = this.getAdminUser(req);
    return this.adminService.broadcastMessage(adminUser, broadcastDto);
  }

  @Get('notifications/templates')
  async getNotificationTemplates(@Req() req: AdminRequest) {
    this.validateAdminAccess(req);
    return this.adminService.getNotificationTemplates();
  }

  @Get('communications/logs')
  async getCommunicationLogs(
    @Query('limit') limit: string,
    @Req() req: AdminRequest
  ) {
    this.validateAdminAccess(req);
    const limitNum = limit ? parseInt(limit) : 100;
    return this.adminService.getCommunicationLogs(limitNum);
  }

  // System Management (moved down to keep logical grouping)
  @Post('system/maintenance-mode')
  async setSystemMaintenance(@Body() maintenanceDto: SystemMaintenanceDto, @Req() req: AdminRequest) {
    this.validateAdminAccess(req);
    const adminUser = this.getAdminUser(req);
    return this.adminService.setSystemMaintenance(adminUser, maintenanceDto);
  }

  @Get('system/status')
  async getSystemStatus(@Req() req: AdminRequest) {
    this.validateAdminAccess(req);
    return this.adminService.getSystemStatus();
  }

  @Get('system/health')
  async getSystemHealth(@Req() req: AdminRequest) {
    this.validateAdminAccess(req);
    return this.adminService.getSystemHealth();
  }

  @Get('system/stats')
  async getSystemStats(@Req() req: AdminRequest) {
    this.validateAdminAccess(req);
    return this.adminService.getSystemStats();
  }

  // Monitoring & Logs
  @Get('logs/user-actions')
  async getUserActions(@Req() req: AdminRequest) {
    this.validateAdminAccess(req);
    return this.adminService.getUserActions();
  }

  @Get('logs/system-alerts')
  async getSystemAlerts(@Req() req: AdminRequest) {
    this.validateAdminAccess(req);
    return this.adminService.getSystemAlerts();
  }

  @Post('logs/acknowledge-alert')
  async acknowledgeAlert(
    @Body() { alertId }: { alertId: string }, 
    @Req() req: AdminRequest
  ) {
    this.validateAdminAccess(req);
    const adminUser = this.getAdminUser(req);
    return this.adminService.acknowledgeAlert(adminUser, alertId);
  }

  // Helper methods
  private extractSessionToken(authHeader: string): string {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid authorization header');
    }
    return authHeader.substring(7);
  }

  private validateAdminSession(authHeader: string): { username: string; valid: boolean } {
    const sessionToken = this.extractSessionToken(authHeader);
    const validation = this.adminService.validateAdminSession(sessionToken);
    
    if (!validation.valid) {
      throw new UnauthorizedException('Invalid or expired admin session');
    }
    
    return validation;
  }

  private validateAdminAccess(req: AdminRequest): void {
    const authHeader = req.headers?.['authorization'];
    if (!authHeader) {
      throw new UnauthorizedException('No authorization header provided');
    }

    const sessionToken = authHeader.replace('Bearer ', '');
    const validation = this.adminService.validateAdminSession(sessionToken);
    
    if (!validation.valid) {
      throw new UnauthorizedException('Invalid or expired admin session');
    }

    req.adminUser = validation.username;
  }

  private getAdminUser(req: AdminRequest): string {
    if (!req.adminUser) {
      throw new UnauthorizedException('Admin user not found in request');
    }
    return req.adminUser;
  }
} 