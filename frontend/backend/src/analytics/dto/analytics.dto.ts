import { IsString, IsOptional, IsEnum, IsDateString, IsNumber } from 'class-validator';

export enum TimeRange {
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year'
}

export enum MetricType {
  REVENUE = 'revenue',
  USER_ACTIVITY = 'user_activity',
  GAME_PERFORMANCE = 'game_performance',
  REFERRAL_PERFORMANCE = 'referral_performance',
}

export class AnalyticsQueryDto {
  @IsOptional()
  @IsEnum(TimeRange)
  timeRange?: TimeRange;

  @IsEnum(MetricType)
  @IsOptional()
  metricType?: MetricType;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsString()
  @IsOptional()
  gameId?: string;
}

export interface RevenueMetrics {
  totalRevenue: number;
  platformFees: number;
  referralPayouts: number;
  netRevenue: number;
  transactionCount: number;
  averageTransactionValue: number;
  revenueByGame: GameRevenueBreakdown[];
  revenueByHour: HourlyRevenue[];
}

export interface GameRevenueBreakdown {
  gameId: string;
  gameName: string;
  totalVolume: number;
  matchCount: number;
  revenue: number;
  averageMatchValue: number;
}

export interface HourlyRevenue {
  hour: string;
  revenue: number;
  transactionCount: number;
}

export interface UserActivityMetrics {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  returningUsers: number;
  dailyActiveUsers: number[];
  userRetention: {
    day1: number;
    day7: number;
    day30: number;
  };
  avgSessionDuration: number;
  avgMatchesPerUser: number;
}

export interface UserEngagementMetrics {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  returningUsers: number;
  averageSessionDuration: number;
  bounceRate: number;
  retentionRate: number;
  conversionRate: number;
}

export interface GamePerformanceMetrics {
  totalMatches: number;
  averageMatchDuration: number;
  completionRate: number;
  disputeRate: number;
  popularGames: PopularGame[];
  peakHours: PeakHour[];
}

export interface PopularGame {
  gameType: string;
  matches: number;
  totalVolume: number;
}

export interface PeakHour {
  hour: number;
  matches: number;
}

export interface ReferralMetrics {
  totalReferrals: number;
  activeReferrers: number;
  totalReferralRevenue: number;
  averageReferralValue: number;
  topReferrers: TopReferrer[];
  conversionRate: number;
}

export interface TopReferrer {
  walletAddress: string;
  referralCount: number;
  totalEarnings: number;
  conversionRate: number;
}

export interface PlatformOverview {
  totalUsers: number;
  totalMatches: number;
  totalVolume: number;
  totalRevenue: number;
  growthRate: {
    users: number;
    revenue: number;
    matches: number;
  };
  healthScore: number;
}

// New Security and Anti-Cheat DTOs
export class SecurityMetricsQueryDto {
  @IsOptional()
  @IsEnum(TimeRange)
  timeRange?: TimeRange;

  @IsOptional()
  @IsString()
  gameType?: string;

  @IsOptional()
  @IsNumber()
  minSeverity?: number; // 1-5 severity levels
}

export interface SecurityMetrics {
  summary: SecuritySummary;
  antiCheatDetections: AntiCheatDetection[];
  twoFactorStats: TwoFactorStats;
  verificationMetrics: VerificationMetrics;
  riskAnalysis: RiskAnalysis;
}

export interface SecuritySummary {
  totalSecurityEvents: number;
  criticalAlerts: number;
  blockedAttempts: number;
  successfulVerifications: number;
  activeThreats: number;
}

export interface AntiCheatDetection {
  id: string;
  userId: string;
  gameType: string;
  detectionType: string;
  severity: number; // 1-5
  confidence: number; // 0-100
  flags: string[];
  timestamp: string;
  status: 'FLAGGED' | 'REVIEWED' | 'RESOLVED' | 'FALSE_POSITIVE';
  playerWallet: string;
}

export interface TwoFactorStats {
  totalEnabled: number;
  enabledPercentage: number;
  dailyVerifications: number;
  failedAttempts: number;
  backupCodeUsage: number;
}

export interface VerificationMetrics {
  totalVerifications: number;
  successRate: number;
  averageVerificationTime: number;
  ed25519Signatures: number;
  failedSignatures: number;
}

export interface RiskAnalysis {
  highRiskUsers: number;
  suspiciousPatterns: SuspiciousPattern[];
  ipBlocks: number;
  geographicRisks: GeographicRisk[];
}

export interface SuspiciousPattern {
  type: string;
  count: number;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface GeographicRisk {
  country: string;
  riskLevel: number;
  detections: number;
} 