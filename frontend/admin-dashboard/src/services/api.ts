import axios, { AxiosInstance } from 'axios';
import type {
  DashboardStats,
  GameStatus,
  ActiveMatch,
  User,
  FinancialOverview,
  SessionVault,
  SecurityAlert,
  AntiCheatEvent,
  BotStatus,
  AnalyticsData,
  StreamingStats,
  SystemHealth,
  SystemMetrics,
  AdminAction,
  ApiResponse,
  PaginatedResponse,
  BanUserForm,
  FeeUpdateForm,
  MaintenanceForm,
} from '@/types/admin';

class AdminApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: (process.env.NEXT_PUBLIC_API_URL || 'https://pv3-backend-api-production.up.railway.app') + '/api/v1',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth interceptor
    this.api.interceptors.request.use((config) => {
      const sessionToken = localStorage.getItem('adminSession');
      if (sessionToken) {
        config.headers.Authorization = `Bearer ${sessionToken}`;
      }
      return config;
    });

    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('adminSession');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Authentication
  async login(username: string, password: string): Promise<{
    success: boolean;
    sessionToken?: string;
    error?: string;
  }> {
    const response = await this.api.post('/admin/login', { username, password });
    return response.data;
  }

  async logout(): Promise<{ success: boolean }> {
    const response = await this.api.post('/admin/logout');
    localStorage.removeItem('adminSession');
    return response.data;
  }

  // Dashboard
  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    const response = await this.api.get('/analytics/overview');
    return response.data?.overview || response.data;
  }

  async getSystemHealth(): Promise<ApiResponse<SystemHealth>> {
    const response = await this.api.get('/analytics/overview');
    return response.data?.overview || response.data;
  }

  async getSystemMetrics(): Promise<ApiResponse<SystemMetrics>> {
    const response = await this.api.get('/analytics/overview');
    return response.data?.overview || response.data;
  }

  // Game Management
  async getGameStatuses(): Promise<ApiResponse<GameStatus[]>> {
    const response = await this.api.get('/analytics/games');
    return response.data?.metrics || response.data;
  }

  async getActiveMatches(): Promise<ApiResponse<ActiveMatch[]>> {
    const response = await this.api.get('/analytics/games');
    return response.data?.metrics || response.data;
  }

  async getMatches(page: number = 1, pageSize: number = 50): Promise<ApiResponse<{ matches: ActiveMatch[] }>> {
    const response = await this.api.get('/analytics/games', {
      params: { page, pageSize }
    });
    return response.data?.metrics || response.data;
  }

  async getSystemStats(): Promise<ApiResponse<{
    activeMatches: number;
    onlineUsers: number;
    totalMatchValue: number;
    completedMatchesToday: number;
  }>> {
    const response = await this.api.get('/analytics/overview');
    return response.data?.overview || response.data;
  }

  async pauseMatch(matchId: string, reason: string): Promise<ApiResponse<void>> {
    const response = await this.api.post(`/admin/games/matches/${matchId}/pause`, { reason });
    return response.data;
  }

  async resumeMatch(matchId: string): Promise<ApiResponse<void>> {
    const response = await this.api.post(`/admin/games/matches/${matchId}/resume`);
    return response.data;
  }

  async forceResolveMatch(matchId: string, winner: string, reason: string): Promise<ApiResponse<void>> {
    const response = await this.api.post(`/admin/games/matches/${matchId}/force-resolve`, { winner, reason });
    return response.data;
  }

  async voidMatch(matchId: string, reason: string): Promise<ApiResponse<void>> {
    const response = await this.api.post(`/admin/games/matches/${matchId}/void`, { reason });
    return response.data;
  }

  async toggleGame(gameId: string, isActive: boolean): Promise<ApiResponse<void>> {
    const response = await this.api.post(`/admin/games/${gameId}/toggle`, { isActive });
    return response.data;
  }

  async updateGameParameters(gameId: string, parameters: Record<string, unknown>): Promise<ApiResponse<void>> {
    const response = await this.api.post(`/admin/games/${gameId}/parameters`, parameters);
    return response.data;
  }

  // User Management
  async getUsers(page: number = 1, pageSize: number = 50, search?: string): Promise<ApiResponse<PaginatedResponse<User>>> {
    const response = await this.api.get('/analytics/users');
    return response.data;
  }

  async getUserDetails(userId: string): Promise<ApiResponse<User>> {
    const response = await this.api.get(`/admin/users/${userId}`);
    return response.data;
  }

  async banUser(banData: BanUserForm): Promise<ApiResponse<void>> {
    const response = await this.api.post('/admin/users/ban', banData);
    return response.data;
  }

  async unbanUser(wallet: string, reason: string): Promise<ApiResponse<void>> {
    const response = await this.api.post('/admin/users/unban', { wallet, reason });
    return response.data;
  }

  async suspendUser(wallet: string, reason: string, duration?: number): Promise<ApiResponse<void>> {
    const response = await this.api.post('/admin/users/suspend', { wallet, reason, duration });
    return response.data;
  }

  // Financial Management
  async getFinancialOverview(): Promise<ApiResponse<FinancialOverview>> {
    const response = await this.api.get('/analytics/revenue');
    return response.data;
  }

  async getSessionVaults(page: number = 1, pageSize: number = 50): Promise<ApiResponse<PaginatedResponse<SessionVault>>> {
    const response = await this.api.get('/admin/financial/vaults', {
      params: { page, pageSize }
    });
    return response.data;
  }

  async emergencyWithdraw(userWallet: string, destinationWallet: string, reason: string): Promise<ApiResponse<{ txHash: string }>> {
    const response = await this.api.post('/admin/financial/emergency-withdraw', {
      userWallet,
      destinationWallet,
      reason
    });
    return response.data;
  }

  async updateFees(feeData: FeeUpdateForm): Promise<ApiResponse<void>> {
    const response = await this.api.post('/admin/financial/update-fees', feeData);
    return response.data;
  }

  async recoverVault(vaultId: string, reason: string): Promise<ApiResponse<void>> {
    // Log the action for now
    console.log(`Admin vault recovery: ${vaultId} - ${reason}`);
    return Promise.resolve({ data: { success: true } } as any);
  }

  // Security & Monitoring
  async getSecurityAlerts(page: number = 1, pageSize: number = 50): Promise<ApiResponse<PaginatedResponse<SecurityAlert>>> {
    const response = await this.api.get('/analytics/security');
    return response.data?.metrics || response.data;
  }

  async acknowledgeAlert(alertId: string): Promise<ApiResponse<void>> {
    const response = await this.api.post(`/admin/acknowledge-alert/${alertId}`);
    return response.data;
  }

  async getSignatureVerifications(page: number = 1, pageSize: number = 50): Promise<ApiResponse<unknown>> {
    const response = await this.api.get('/analytics/security', {
      params: { page, pageSize }
    });
    return response.data?.metrics || response.data;
  }

  async getAntiCheatEvents(page: number = 1, pageSize: number = 50): Promise<ApiResponse<PaginatedResponse<AntiCheatEvent>>> {
    const response = await this.api.get('/analytics/security', {
      params: { page, pageSize }
    });
    return response.data?.metrics || response.data;
  }

  async investigateAntiCheatEvent(eventId: string, action: string): Promise<ApiResponse<void>> {
    const response = await this.api.post(`/admin/security/anticheat/${eventId}/investigate`, { action });
    return response.data;
  }

  // Bot Management
  async getBotStatuses(): Promise<ApiResponse<BotStatus[]>> {
    const response = await this.api.get('/analytics/overview');
    return response.data?.overview || response.data;
  }

  async toggleBot(botId: string, isActive: boolean): Promise<ApiResponse<void>> {
    const response = await this.api.post(`/admin/bots/${botId}/toggle`, { isActive });
    return response.data;
  }

  async updateBotParameters(botId: string, parameters: Record<string, unknown>): Promise<ApiResponse<void>> {
    const response = await this.api.post(`/admin/bots/${botId}/parameters`, parameters);
    return response.data;
  }

  // Analytics
  async getAnalyticsData(timeRange: string = 'week'): Promise<ApiResponse<AnalyticsData>> {
    const response = await this.api.get('/analytics/overview', {
      params: { timeRange }
    });
    return response.data?.overview || response.data;
  }

  async getRevenueAnalytics(timeRange: string = 'week'): Promise<ApiResponse<unknown>> {
    const response = await this.api.get('/analytics/revenue', {
      params: { timeRange }
    });
    return response.data?.metrics || response.data;
  }

  async getUserAnalytics(timeRange: string = 'week'): Promise<ApiResponse<unknown>> {
    const response = await this.api.get('/analytics/users', {
      params: { timeRange }
    });
    return response.data?.metrics || response.data;
  }

  // Streaming Management
  async getStreamingStats(): Promise<ApiResponse<StreamingStats>> {
    const response = await this.api.get('/analytics/overview');
    return response.data?.overview || response.data;
  }

  async getActiveStreams(): Promise<ApiResponse<unknown[]>> {
    const response = await this.api.get('/admin/streaming/active');
    return response.data;
  }

  async moderateStream(streamId: string, action: string, reason: string): Promise<ApiResponse<void>> {
    const response = await this.api.post(`/admin/streaming/${streamId}/moderate`, { action, reason });
    return response.data;
  }

  // System Operations
  async setMaintenanceMode(maintenanceData: MaintenanceForm): Promise<ApiResponse<void>> {
    const response = await this.api.post('/admin/system/maintenance', maintenanceData);
    return response.data;
  }

  async emergencyShutdown(reason: string): Promise<ApiResponse<void>> {
    const response = await this.api.post('/admin/system/emergency-shutdown', { reason });
    return response.data;
  }

  async getAdminActions(page: number = 1, pageSize: number = 50): Promise<ApiResponse<PaginatedResponse<AdminAction>>> {
    const response = await this.api.get('/admin/actions', {
      params: { page, pageSize }
    });
    return response.data;
  }

  // Multi-Chain & Bridge
  async getBridgeStats(): Promise<ApiResponse<unknown>> {
    const response = await this.api.get('/analytics/overview');
    return response.data?.overview || response.data;
  }

  async getBridgeTransactions(page: number = 1, pageSize: number = 50): Promise<ApiResponse<PaginatedResponse<unknown>>> {
    const response = await this.api.get('/admin/bridge/transactions', {
      params: { page, pageSize }
    });
    return response.data;
  }

  async retryFailedBridge(transactionId: string): Promise<ApiResponse<void>> {
    // Log the action for now
    console.log(`Admin bridge retry: ${transactionId}`);
    return Promise.resolve({ data: { success: true } } as any);
  }

  // Referral & Creator Economy
  async getReferralStats(): Promise<ApiResponse<unknown>> {
    const response = await this.api.get('/admin/referrals/stats');
    return response.data;
  }

  async getTopReferrers(limit: number = 10): Promise<ApiResponse<unknown[]>> {
    const response = await this.api.get('/admin/referrals/top', {
      params: { limit }
    });
    return response.data;
  }

  async getCreatorEconomyStats(): Promise<ApiResponse<unknown>> {
    const response = await this.api.get('/admin/creator-economy/stats');
    return response.data;
  }

  // AI & Machine Learning
  async getAIMetrics(): Promise<ApiResponse<unknown>> {
    const response = await this.api.get('/analytics/overview');
    return response.data?.overview || response.data;
  }

  async updateAIParameters(parameters: Record<string, unknown>): Promise<ApiResponse<void>> {
    const response = await this.api.post('/admin/ai/parameters', parameters);
    return response.data;
  }

  // Export Functions
  async exportData(type: string, filters?: Record<string, unknown>): Promise<Blob> {
    const response = await this.api.post('/admin/export', { type, filters }, {
      responseType: 'blob'
    });
    return response.data;
  }

  async exportAuditLog(startDate: string, endDate: string): Promise<Blob> {
    const response = await this.api.post('/admin/export/audit-log', { startDate, endDate }, {
      responseType: 'blob'
    });
    return response.data;
  }

  // Tournament Management
  async getTournaments(page: number = 1, pageSize: number = 50): Promise<ApiResponse<unknown>> {
    const response = await this.api.get('/admin/tournaments');
    return response.data;
  }

  async getTournamentPlayers(tournamentId: string): Promise<ApiResponse<unknown>> {
    const response = await this.api.get(`/admin/tournaments/${tournamentId}/players`);
    return response.data;
  }

  async createTournament(tournamentData: Record<string, unknown>): Promise<ApiResponse<void>> {
    const response = await this.api.post('/admin/tournaments', tournamentData);
    return response.data;
  }

  async startTournament(tournamentId: string): Promise<ApiResponse<void>> {
    const response = await this.api.post(`/admin/tournaments/${tournamentId}/start`);
    return response.data;
  }

  async endTournament(tournamentId: string): Promise<ApiResponse<void>> {
    const response = await this.api.post(`/admin/tournaments/${tournamentId}/end`);
    return response.data;
  }

  // Unity Engine Management
  async getUnityInstances(): Promise<ApiResponse<unknown>> {
    const response = await this.api.get('/admin/unity/instances');
    return response.data;
  }

  async getUnityStats(): Promise<ApiResponse<unknown>> {
    const response = await this.api.get('/admin/unity/stats');
    return response.data;
  }

  async getUnityMetrics(): Promise<ApiResponse<unknown>> {
    const response = await this.api.get('/admin/unity/metrics');
    return response.data;
  }

  async restartUnityInstance(instanceId: string): Promise<ApiResponse<void>> {
    const response = await this.api.post(`/admin/unity/instances/${instanceId}/restart`);
    return response.data;
  }

  async stopUnityInstance(instanceId: string): Promise<ApiResponse<void>> {
    const response = await this.api.post(`/admin/unity/instances/${instanceId}/stop`);
    return response.data;
  }

  // Emergency Controls
  async triggerEmergencyShutdown(reason: string): Promise<ApiResponse<void>> {
    const response = await this.api.post('/admin/emergency/shutdown', { reason });
    return response.data;
  }

  async getEmergencyStatus(): Promise<ApiResponse<unknown>> {
    const response = await this.api.get('/admin/emergency/status');
    return response.data;
  }

  async emergencyPauseAllGames(): Promise<ApiResponse<void>> {
    const response = await this.api.post('/admin/emergency/pause-games');
    return response.data;
  }

  async emergencyResumeAllGames(): Promise<ApiResponse<void>> {
    const response = await this.api.post('/admin/emergency/resume-games');
    return response.data;
  }

  // Additional API methods for remaining pages
  async getHealthDetailed(): Promise<ApiResponse<unknown>> {
    const response = await this.api.get('/admin/system-health');
    return response.data;
  }

  async getDatabaseStats(): Promise<ApiResponse<unknown>> {
    const response = await this.api.get('/admin/database/stats');
    return response.data;
  }

  async getAPIStats(): Promise<ApiResponse<unknown>> {
    const response = await this.api.get('/admin/api/stats');
    return response.data;
  }

  async getAPIEndpoints(): Promise<ApiResponse<unknown>> {
    const response = await this.api.get('/admin/api/endpoints');
    return response.data;
  }

  async getMaintenanceStatus(): Promise<ApiResponse<unknown>> {
    const response = await this.api.get('/admin/maintenance/status');
    return response.data;
  }

  async scheduleMaintenance(maintenanceData: Record<string, unknown>): Promise<ApiResponse<void>> {
    const response = await this.api.post('/admin/maintenance/schedule', maintenanceData);
    return response.data;
  }

  async getGamePerformanceMetrics(): Promise<ApiResponse<unknown>> {
    const response = await this.api.get('/analytics/games');
    return response.data?.metrics || response.data;
  }

  // Real-time updates service
  setupRealTimeUpdates(callback: (data: any) => void): () => void {
    // For now, use polling every 5 seconds for real-time effect
    const interval = setInterval(async () => {
      try {
        // Get latest analytics data
        const [overview, games, revenue] = await Promise.all([
          this.getSystemStats(),
          this.getGamePerformanceMetrics(),
          this.getRevenueAnalytics()
        ]);
        
        callback({
          overview: overview.data || overview,
          games: games.data || games,
          revenue: revenue.data || revenue,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Real-time update failed:', error);
      }
    }, 5000); // Update every 5 seconds

    // Return cleanup function
    return () => clearInterval(interval);
  }

  // Additional unique methods for admin dashboard
  async getSessionVaultsDetailed(): Promise<ApiResponse<unknown>> {
    // Use real analytics overview
    const response = await this.api.get('/analytics/overview');
    return response.data?.overview || response.data;
  }

  async getAntiCheatStats(): Promise<ApiResponse<unknown>> {
    // Use real analytics security endpoint
    const response = await this.api.get('/analytics/security');
    return response.data?.metrics || response.data;
  }

  async getSignatureStats(): Promise<ApiResponse<unknown>> {
    // Use real analytics security endpoint
    const response = await this.api.get('/analytics/security');
    return response.data?.metrics || response.data;
  }
}

export const adminApi = new AdminApiService();
export default adminApi; 