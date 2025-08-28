import { IsString, IsNotEmpty, IsNumber, IsOptional, IsBoolean, IsEnum, Min, Max, IsArray } from 'class-validator';

export enum SystemStatus {
  ACTIVE = 'active',
  MAINTENANCE = 'maintenance',
  EMERGENCY = 'emergency',
}

export class BanPlayerDto {
  @IsString()
  @IsNotEmpty()
  walletAddress: string;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsNumber()
  @IsOptional()
  durationHours?: number; // undefined = permanent ban
}

export class SystemMaintenanceDto {
  @IsEnum(SystemStatus)
  status: SystemStatus;

  @IsString()
  @IsOptional()
  message?: string;

  @IsNumber()
  @IsOptional()
  estimatedDurationMinutes?: number;
}

export class FeeUpdateDto {
  @IsNumber()
  @Min(0)
  @Max(20)
  platformFeePercentage: number;

  @IsNumber()
  @Min(0)
  @Max(5)
  referralFeePercentage: number;
}

export class EmergencyWithdrawDto {
  @IsString()
  @IsNotEmpty()
  userWallet: string;

  @IsString()
  @IsNotEmpty()
  destinationWallet: string;

  @IsString()
  @IsNotEmpty()
  reason: string;
}

// New DTOs for Phase 1 implementation

export class GetUsersDto {
  @IsNumber()
  @IsOptional()
  @Min(1)
  page?: number = 1;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  pageSize?: number = 50;

  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  status?: 'active' | 'suspended' | 'banned';
}

export class SuspendUserDto {
  @IsString()
  @IsNotEmpty()
  wallet: string;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsNumber()
  @IsOptional()
  duration?: number; // in hours
}

export class GetSessionVaultsDto {
  @IsNumber()
  @IsOptional()
  @Min(1)
  page?: number = 1;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  pageSize?: number = 50;

  @IsString()
  @IsOptional()
  search?: string;

  @IsNumber()
  @IsOptional()
  minBalance?: number;
}

export class RecoverVaultDto {
  @IsString()
  @IsNotEmpty()
  vaultId: string;

  @IsString()
  @IsNotEmpty()
  reason: string;
}

// 🚀 PHASE 2: MATCH MANAGEMENT DTOs

export class GetMatchesDto {
  @IsNumber()
  @IsOptional()
  @Min(1)
  page?: number = 1;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  pageSize?: number = 50;

  @IsString()
  @IsOptional()
  search?: string; // Search by player wallet or match ID

  @IsString()
  @IsOptional()
  status?: 'pending' | 'active' | 'completed' | 'disputed' | 'cancelled';

  @IsString()
  @IsOptional()
  gameType?: string;

  @IsNumber()
  @IsOptional()
  minWager?: number;

  @IsNumber()
  @IsOptional()
  maxWager?: number;

  @IsString()
  @IsOptional()
  dateFrom?: string; // ISO date string

  @IsString()
  @IsOptional()
  dateTo?: string; // ISO date string
}

export class MatchActionDto {
  @IsString()
  @IsNotEmpty()
  matchId: string;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsString()
  @IsOptional()
  adminNotes?: string;
}

export class ForceResolveMatchDto extends MatchActionDto {
  @IsString()
  @IsNotEmpty()
  resolution: 'player1_wins' | 'player2_wins' | 'draw' | 'refund';

  @IsString()
  @IsOptional()
  evidence?: string; // Evidence or reasoning for resolution
}

export class InvestigateMatchDto {
  @IsString()
  @IsNotEmpty()
  matchId: string;

  @IsString()
  @IsNotEmpty()
  investigationType: 'fraud' | 'cheat' | 'dispute' | 'technical';

  @IsString()
  @IsOptional()
  notes?: string;
}

// 🚀 PHASE 2: SECURITY MONITORING DTOs

export class GetSecurityAlertsDto {
  @IsNumber()
  @IsOptional()
  @Min(1)
  page?: number = 1;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  pageSize?: number = 50;

  @IsString()
  @IsOptional()
  severity?: 'low' | 'medium' | 'high' | 'critical';

  @IsString()
  @IsOptional()
  type?: 'anti_cheat' | 'fraud' | 'suspicious_activity' | 'system_breach' | 'unusual_pattern';

  @IsBoolean()
  @IsOptional()
  acknowledged?: boolean;

  @IsString()
  @IsOptional()
  dateFrom?: string;

  @IsString()
  @IsOptional()
  dateTo?: string;
}

export class GetAntiCheatEventsDto {
  @IsNumber()
  @IsOptional()
  @Min(1)
  page?: number = 1;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  pageSize?: number = 50;

  @IsString()
  @IsOptional()
  userWallet?: string;

  @IsString()
  @IsOptional()
  eventType?: 'pattern_detection' | 'timing_anomaly' | 'impossible_score' | 'bot_behavior';

  @IsString()
  @IsOptional()
  gameType?: string;

  @IsString()
  @IsOptional()
  dateFrom?: string;

  @IsString()
  @IsOptional()
  dateTo?: string;
}

// Response interfaces for Phase 2

export interface AdminMatch {
  id: string;
  gameType: string;
  wager: number;
  status: string;
  player1: {
    id: string;
    wallet: string;
    username?: string;
  };
  player2?: {
    id: string;
    wallet: string;
    username?: string;
  };
  winner?: {
    id: string;
    wallet: string;
    username?: string;
  };
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
  completedAt?: string;
  escrowAddress?: string;
  transactionId?: string;
  gameData?: any;
  result?: any;
  disputeFlags?: string[];
  riskScore?: number;
  adminNotes?: string;
}

export interface SecurityAlert {
  id: string;
  type: 'anti_cheat' | 'fraud' | 'suspicious_activity' | 'system_breach' | 'unusual_pattern';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  userWallet?: string;
  matchId?: string;
  metadata?: any;
  createdAt: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  actions?: string[];
}

export interface AntiCheatEvent {
  id: string;
  eventType: 'pattern_detection' | 'timing_anomaly' | 'impossible_score' | 'bot_behavior';
  userWallet: string;
  matchId?: string;
  gameType: string;
  confidence: number; // 0-100
  description: string;
  evidence: any;
  createdAt: string;
  investigated: boolean;
  investigatedBy?: string;
  investigatedAt?: string;
  outcome?: 'false_positive' | 'confirmed_cheat' | 'inconclusive';
  actionTaken?: string;
}

export interface SignatureVerification {
  id: string;
  matchId: string;
  userWallet: string;
  signature: string;
  isValid: boolean;
  errorReason?: string;
  verifiedAt: string;
  gameData: any;
  metadata?: any;
}

export interface MatchStatistics {
  totalMatches: number;
  activeMatches: number;
  disputedMatches: number;
  completedMatches24h: number;
  totalVolumeToday: number;
  averageMatchDuration: number;
  topGameTypes: Array<{
    gameType: string;
    count: number;
    volume: number;
  }>;
  suspiciousMatches: number;
}

export interface SecurityOverview {
  totalAlerts: number;
  criticalAlerts: number;
  unacknowledgedAlerts: number;
  antiCheatEvents24h: number;
  fraudAttempts24h: number;
  suspiciousPatterns: number;
  signatureFailures24h: number;
  topRiskUsers: Array<{
    wallet: string;
    riskScore: number;
    alertCount: number;
    lastActivity: string;
  }>;
  securityTrends: Array<{
    date: string;
    alerts: number;
    antiCheatEvents: number;
    fraudAttempts: number;
  }>;
}

// Response interfaces
export interface AdminUser {
  id: string;
  wallet: string;
  username?: string;
  email?: string;
  totalDeposited: number;
  totalWithdrawn: number;
  totalWagered: number;
  gamesPlayed: number;
  winLossRatio: number;
  createdAt: string;
  lastActive: string;
  status: 'active' | 'suspended' | 'banned';
  riskScore: number;
  level: number;
  totalPnl: number;
  referralCode?: string;
  referredBy?: string;
  totalReferred: number;
  bannedReason?: string;
  bannedAt?: string;
  suspendedUntil?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface SessionVault {
  id: string;
  userWallet: string;
  balance: number;
  totalDeposited: number;
  totalWithdrawn: number;
  lastActivity: string;
  status: 'active' | 'inactive' | 'locked';
  createdAt: string;
  isStale: boolean;
  riskFlags: string[];
}

export interface FinancialOverview {
  totalSessionVaults: number;
  totalVaultBalance: number;
  totalDeposits24h: number;
  totalWithdrawals24h: number;
  pendingWithdrawals: number;
  staleVaults: number;
  emergencyWithdrawals: number;
  platformRevenue24h: number;
  referralPayouts24h: number;
}

export interface AdminDashboard {
  totalUsers: number;
  activeUsers24h: number;
  totalMatches: number;
  totalVolume: number;
  platformRevenue: number;
  pendingReports: number;
  systemStatus: SystemStatus;
  lastUpdated: Date;
}

export interface UserAction {
  id: string;
  adminWallet: string;
  targetUser: string;
  action: string;
  reason: string;
  timestamp: Date;
  reversible: boolean;
}

export interface SystemAlert {
  id: string;
  type: 'security' | 'financial' | 'technical' | 'user';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
}

// 🚀 PHASE 3: BOT MANAGEMENT DTOs

export class GetBotsDto {
  @IsNumber()
  @IsOptional()
  @Min(1)
  page?: number = 1;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  pageSize?: number = 50;

  @IsString()
  @IsOptional()
  status?: 'active' | 'inactive' | 'error' | 'maintenance';

  @IsString()
  @IsOptional()
  gameType?: string;

  @IsString()
  @IsOptional()
  search?: string; // Search by bot name or wallet
}

export class UpdateBotDto {
  @IsString()
  @IsNotEmpty()
  botId: string;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  aggressiveness?: number; // 0-100 scale

  @IsNumber()
  @IsOptional()
  @Min(0.01)
  @Max(100)
  maxWager?: number;

  @IsNumber()
  @IsOptional()
  @Min(0.01)
  @Max(100)
  minWager?: number;

  @IsArray()
  @IsOptional()
  gameTypes?: string[]; // Which games the bot should play

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(3600)
  responseDelayMs?: number; // Delay to appear more human

  @IsString()
  @IsOptional()
  strategy?: 'conservative' | 'moderate' | 'aggressive' | 'random';
}

export class BotActionDto {
  @IsString()
  @IsNotEmpty()
  botId: string;

  @IsString()
  @IsNotEmpty()
  action: 'start' | 'stop' | 'restart' | 'reset' | 'maintenance';

  @IsString()
  @IsOptional()
  reason?: string;
}

export class CreateBotDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  wallet: string;

  @IsArray()
  @IsNotEmpty()
  gameTypes: string[];

  @IsNumber()
  @Min(0)
  @Max(100)
  aggressiveness: number = 50;

  @IsNumber()
  @Min(0.01)
  @Max(100)
  maxWager: number = 1.0;

  @IsNumber()
  @Min(0.01)
  @Max(100)
  minWager: number = 0.1;

  @IsString()
  strategy: 'conservative' | 'moderate' | 'aggressive' | 'random' = 'moderate';
}

// Response interfaces for Phase 3

export interface AdminBot {
  id: string;
  name: string;
  wallet: string;
  status: 'active' | 'inactive' | 'error' | 'maintenance';
  enabled: boolean;
  gameTypes: string[];
  aggressiveness: number; // 0-100
  maxWager: number;
  minWager: number;
  strategy: string;
  responseDelayMs: number;
  
  // Statistics
  totalMatches: number;
  wins: number;
  losses: number;
  winRate: number;
  totalWagered: number;
  totalPnl: number;
  
  // Status info
  currentMatch?: string;
  lastActivity: string;
  uptime: number; // in seconds
  errorCount: number;
  lastError?: string;
  
  // Configuration
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  lastModifiedBy?: string;
}

export interface BotStatistics {
  totalBots: number;
  activeBots: number;
  inactiveBots: number;
  errorBots: number;
  totalMatches24h: number;
  totalWagered24h: number;
  totalPnl24h: number;
  averageWinRate: number;
  topPerformingBots: Array<{
    botId: string;
    name: string;
    winRate: number;
    pnl24h: number;
    matches24h: number;
  }>;
  botDistribution: Array<{
    gameType: string;
    activeBots: number;
    totalBots: number;
  }>;
  errorLogs: Array<{
    botId: string;
    botName: string;
    error: string;
    timestamp: string;
  }>;
}

export interface RealTimeUpdate {
  type: 'dashboard' | 'user_action' | 'security_alert' | 'match_update' | 'bot_status' | 'financial_update';
  data: any;
  timestamp: string;
}

export interface WebSocketSubscription {
  adminUser: string;
  socketId: string;
  subscriptions: string[]; // Array of update types they're subscribed to
  connectedAt: string;
  lastPing: string;
}

// 🚀 PHASE 4A: ADVANCED ANALYTICS & REPORTING DTOs

export class GenerateReportDto {
  @IsString()
  @IsNotEmpty()
  reportType: 'revenue' | 'users' | 'matches' | 'security' | 'bots' | 'custom';

  @IsString()
  @IsOptional()
  dateFrom?: string;

  @IsString()
  @IsOptional()
  dateTo?: string;

  @IsArray()
  @IsOptional()
  filters?: Array<{
    field: string;
    operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'between';
    value: any;
  }>;

  @IsArray()
  @IsOptional()
  groupBy?: string[];

  @IsString()
  @IsOptional()
  format?: 'json' | 'csv' | 'pdf' | 'excel';
}

export class ScheduleReportDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  reportTemplate: string;

  @IsString()
  @IsNotEmpty()
  schedule: 'daily' | 'weekly' | 'monthly';

  @IsArray()
  @IsNotEmpty()
  recipients: string[]; // Email addresses

  @IsBoolean()
  @IsOptional()
  enabled?: boolean = true;
}

export class GetAnalyticsDto {
  @IsString()
  @IsOptional()
  dateFrom?: string;

  @IsString()
  @IsOptional()
  dateTo?: string;

  @IsString()
  @IsOptional()
  granularity?: 'hour' | 'day' | 'week' | 'month';

  @IsArray()
  @IsOptional()
  metrics?: string[];

  @IsArray()
  @IsOptional()
  segments?: string[];
}

// 🚀 PHASE 4B: SYSTEM MONITORING DTOs

export class SystemPerformanceDto {
  @IsString()
  @IsOptional()
  timeRange?: '1h' | '6h' | '24h' | '7d' | '30d';

  @IsArray()
  @IsOptional()
  metrics?: string[]; // cpu, memory, disk, network, database
}

export class DatabaseHealthDto {
  @IsBoolean()
  @IsOptional()
  includeQueries?: boolean = false;

  @IsBoolean()
  @IsOptional()
  includeConnections?: boolean = true;

  @IsBoolean()
  @IsOptional()
  includeIndexes?: boolean = false;
}

export class MaintenanceWindowDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  startTime: string; // ISO date string

  @IsNumber()
  @Min(5)
  @Max(1440)
  durationMinutes: number;

  @IsBoolean()
  @IsOptional()
  notifyUsers?: boolean = true;

  @IsArray()
  @IsOptional()
  affectedServices?: string[];
}

// 🚀 PHASE 4C: COMMUNICATIONS DTOs

export class SendNotificationDto {
  @IsString()
  @IsNotEmpty()
  type: 'email' | 'discord' | 'sms' | 'push';

  @IsArray()
  @IsNotEmpty()
  recipients: string[];

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsString()
  @IsOptional()
  template?: string;

  @IsString()
  @IsOptional()
  priority?: 'low' | 'medium' | 'high' | 'critical';

  @IsBoolean()
  @IsOptional()
  immediate?: boolean = false;
}

export class SendUserMessageDto {
  @IsString()
  @IsNotEmpty()
  userWallet: string;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsString()
  @IsOptional()
  type?: 'info' | 'warning' | 'error' | 'announcement';

  @IsBoolean()
  @IsOptional()
  requireAcknowledgment?: boolean = false;
}

export class BroadcastMessageDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsString()
  @IsOptional()
  type?: 'maintenance' | 'announcement' | 'promotion' | 'warning';

  @IsArray()
  @IsOptional()
  targetGroups?: string[]; // 'all', 'active_users', 'vip_users', etc.

  @IsString()
  @IsOptional()
  scheduledFor?: string; // ISO date string for scheduled messages

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(1440)
  displayDurationMinutes?: number = 60;
}

// Response interfaces for Phase 4

export interface AnalyticsReport {
  id: string;
  type: string;
  title: string;
  generatedAt: string;
  generatedBy: string;
  dateRange: {
    from: string;
    to: string;
  };
  data: any;
  summary: {
    totalRecords: number;
    keyMetrics: Record<string, number>;
    insights: string[];
  };
  downloadUrl?: string;
}

export interface CohortAnalysis {
  period: string;
  cohorts: Array<{
    cohortName: string;
    size: number;
    retentionRates: {
      day1: number;
      day7: number;
      day30: number;
      day90: number;
    };
    averageLTV: number;
    totalRevenue: number;
  }>;
}

export interface UserRetentionMetrics {
  period: string;
  overallRetention: {
    day1: number;
    day7: number;
    day30: number;
    day90: number;
  };
  bySegment: Record<string, {
    day1: number;
    day7: number;
    day30: number;
    day90: number;
  }>;
  trends: Array<{
    date: string;
    newUsers: number;
    returningUsers: number;
    retentionRate: number;
  }>;
}

export interface SystemPerformanceMetrics {
  timestamp: string;
  server: {
    cpu: {
      usage: number;
      cores: number;
      loadAverage: number[];
    };
    memory: {
      used: number;
      total: number;
      free: number;
      usage: number;
    };
    disk: {
      used: number;
      total: number;
      free: number;
      usage: number;
    };
    network: {
      bytesIn: number;
      bytesOut: number;
      packetsIn: number;
      packetsOut: number;
    };
  };
  database: {
    connections: {
      active: number;
      idle: number;
      total: number;
      maxConnections: number;
    };
    performance: {
      avgQueryTime: number;
      slowQueries: number;
      queriesPerSecond: number;
    };
    storage: {
      size: number;
      indexSize: number;
      freeSpace: number;
    };
  };
  application: {
    uptime: number;
    requestsPerMinute: number;
    averageResponseTime: number;
    errorRate: number;
    activeUsers: number;
  };
}

export interface DatabaseHealth {
  status: 'healthy' | 'warning' | 'critical';
  connections: {
    active: number;
    idle: number;
    waiting: number;
    maxConnections: number;
    usage: number;
  };
  performance: {
    avgQueryTime: number;
    slowQueries: Array<{
      query: string;
      executionTime: number;
      frequency: number;
    }>;
    queriesPerSecond: number;
    cacheHitRatio: number;
  };
  storage: {
    totalSize: number;
    dataSize: number;
    indexSize: number;
    freeSpace: number;
    fragmentation: number;
  };
  indexes: Array<{
    tableName: string;
    indexName: string;
    size: number;
    usage: number;
    recommendation?: string;
  }>;
  recommendations: string[];
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: 'email' | 'discord' | 'sms' | 'push';
  subject: string;
  body: string;
  variables: string[];
  createdBy: string;
  createdAt: string;
  usageCount: number;
}

export interface CommunicationLog {
  id: string;
  type: 'email' | 'discord' | 'sms' | 'push' | 'user_message' | 'broadcast';
  recipient: string;
  subject: string;
  message: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';
  sentAt: string;
  deliveredAt?: string;
  failureReason?: string;
  sentBy: string;
  template?: string;
}

export interface MaintenanceWindow {
  id: string;
  title: string;
  description: string;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  startTime: string;
  endTime: string;
  durationMinutes: number;
  affectedServices: string[];
  createdBy: string;
  createdAt: string;
  notificationsLog: Array<{
    type: string;
    sentAt: string;
    recipients: number;
  }>;
}

export interface PredictiveAnalytics {
  userChurn: {
    riskScore: number;
    factors: string[];
    recommendation: string;
  };
  revenueForecast: {
    next30Days: number;
    next90Days: number;
    confidence: number;
    factors: string[];
  };
  capacityPlanning: {
    expectedLoad: number;
    recommendedScaling: string;
    timeline: string;
  };
}

export interface GeographicDistribution {
  countries: Array<{
    country: string;
    countryCode: string;
    users: number;
    revenue: number;
    averageWager: number;
    topGame: string;
  }>;
  regions: Array<{
    region: string;
    users: number;
    revenue: number;
    conversionRate: number;
  }>;
  timezones: Array<{
    timezone: string;
    users: number;
    peakHours: number[];
    averageSessionDuration: number;
  }>;
}

export interface ConversionFunnel {
  steps: Array<{
    stepName: string;
    users: number;
    conversionRate: number;
    dropoffRate: number;
    averageTime: number;
  }>;
  segments: Record<string, Array<{
    stepName: string;
    users: number;
    conversionRate: number;
  }>>;
  optimization: Array<{
    step: string;
    issue: string;
    recommendation: string;
    impact: 'low' | 'medium' | 'high';
  }>;
} 