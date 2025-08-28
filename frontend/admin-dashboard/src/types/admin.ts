// Core Admin Types
export interface AdminUser {
  id: string;
  wallet: string;
  name: string;
  role: 'super_admin' | 'admin' | 'moderator';
  permissions: string[];
  lastLogin: Date;
  isActive: boolean;
}

// Dashboard Overview
export interface DashboardStats {
  totalUsers: number;
  activeUsers24h: number;
  totalMatches: number;
  totalVolume: number;
  platformRevenue: number;
  pendingReports: number;
  systemStatus: 'active' | 'maintenance' | 'emergency';
  lastUpdated: Date;
}

// Game Management
export interface GameStatus {
  id: string;
  name: string;
  type: 'crash' | 'coinflip' | 'mines' | 'chess' | 'rps' | 'dice' | 'math-duel' | 'unity';
  isActive: boolean;
  activeMatches: number;
  totalMatches: number;
  avgStake: number;
  totalVolume: number;
  winRate: number;
  playerCount: number;
  lastActivity: Date;
}

export interface ActiveMatch {
  id: string;
  gameType: string;
  player1: string;
  player2: string;
  stake: number;
  startTime: Date;
  status: 'in_progress' | 'paused' | 'completed' | 'disputed';
  currentRound?: number;
  totalRounds?: number;
}

// User Management
export interface User {
  id: string;
  wallet: string;
  username?: string;
  email?: string;
  registrationDate: Date;
  lastLogin: Date;
  totalMatches: number;
  totalWagered: number;
  totalWon: number;
  winRate: number;
  prestigeLevel: number;
  referralCode: string;
  referredBy?: string;
  referralCount: number;
  status: 'active' | 'banned' | 'suspended' | 'pending';
  flags: string[];
  avatar?: string;
  twoFactorEnabled: boolean;
}

// Financial Types
export interface FinancialOverview {
  totalRevenue: number;
  dailyRevenue: number;
  platformFees: number;
  referralFees: number;
  totalVaultBalance: number;
  pendingWithdrawals: number;
  averageStake: number;
  revenueGrowth: number;
}

export interface SessionVault {
  id: string;
  userWallet: string;
  balance: number;
  lastActivity: Date;
  totalDeposits: number;
  totalWithdrawals: number;
  status: 'active' | 'frozen' | 'recovery_needed';
  transactions: VaultTransaction[];
}

export interface VaultTransaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'match_wager' | 'match_win' | 'fee' | 'refund';
  amount: number;
  timestamp: Date;
  status: 'pending' | 'completed' | 'failed';
  txHash?: string;
  matchId?: string;
}

// Security & Monitoring
export interface SecurityAlert {
  id: string;
  type: 'fraud' | 'cheat' | 'suspicious' | 'system' | 'financial';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  userId?: string;
  matchId?: string;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
}

export interface AntiCheatEvent {
  id: string;
  userId: string;
  matchId: string;
  eventType: 'anomaly' | 'pattern' | 'signature' | 'behavior';
  confidence: number;
  details: Record<string, unknown>;
  timestamp: Date;
  action: 'flagged' | 'blocked' | 'investigated' | 'cleared';
}

// Bot Management
export interface BotStatus {
  id: string;
  name: string;
  personality: 'CryptoNewbie' | 'QuickFlip' | 'BalancedPlayer' | 'AdaptiveGamer' | 'SkillSeeker';
  isActive: boolean;
  totalMatches: number;
  winRate: number;
  avgStake: number;
  totalEarnings: number;
  lastActivity: Date;
  currentGame?: string;
  status: 'idle' | 'playing' | 'paused' | 'error';
}

// Analytics Types
export interface AnalyticsData {
  userGrowth: TimeSeriesData[];
  revenueData: TimeSeriesData[];
  gamePopularity: GamePopularityData[];
  userRetention: RetentionData[];
  referralPerformance: ReferralData[];
}

export interface TimeSeriesData {
  date: string;
  value: number;
  label?: string;
}

export interface GamePopularityData {
  game: string;
  matches: number;
  volume: number;
  players: number;
  revenue: number;
}

export interface RetentionData {
  cohort: string;
  day1: number;
  day7: number;
  day30: number;
  day90: number;
}

export interface ReferralData {
  referrer: string;
  totalReferred: number;
  activeReferred: number;
  totalVolume: number;
  commissionEarned: number;
}

// Streaming Types
export interface StreamingStats {
  totalStreams: number;
  activeStreams: number;
  totalViewers: number;
  totalTips: number;
  totalSubscriptions: number;
  topStreamers: StreamerData[];
}

export interface StreamerData {
  id: string;
  wallet: string;
  username: string;
  isLive: boolean;
  viewerCount: number;
  totalEarnings: number;
  totalTips: number;
  subscribers: number;
  prestigeLevel: number;
  status: 'active' | 'suspended' | 'banned';
}

// System Health
export interface SystemHealth {
  database: 'healthy' | 'degraded' | 'unhealthy';
  redis: 'healthy' | 'degraded' | 'unhealthy' | 'not_configured';
  websocket: 'healthy' | 'degraded' | 'unhealthy';
  solana: 'healthy' | 'degraded' | 'unhealthy';
  railway: 'healthy' | 'degraded' | 'unhealthy';
  vercel: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: Date;
  uptime: number;
}

export interface SystemMetrics {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  activeConnections: number;
  requestsPerSecond: number;
  errorRate: number;
  responseTime: number;
}

// Admin Actions
export interface AdminAction {
  id: string;
  adminId: string;
  adminWallet: string;
  action: string;
  targetType: 'user' | 'match' | 'system' | 'game' | 'vault';
  targetId?: string;
  reason: string;
  metadata: Record<string, unknown>;
  timestamp: Date;
  reversible: boolean;
  reversed?: boolean;
  reversedBy?: string;
  reversedAt?: Date;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Form Types
export interface BanUserForm {
  wallet: string;
  reason: string;
  duration?: number;
  severity: 'temporary' | 'permanent';
}

export interface FeeUpdateForm {
  platformFee: number;
  referralFee: number;
  reason: string;
}

export interface MaintenanceForm {
  status: 'active' | 'maintenance' | 'emergency';
  message: string;
  estimatedDuration?: number;
}

// WebSocket Types
export interface WebSocketMessage {
  type: string;
  payload: unknown;
  timestamp: Date;
}

export interface RealtimeUpdate {
  type: 'user_action' | 'match_update' | 'system_alert' | 'financial_update';
  data: unknown;
  timestamp: Date;
} 