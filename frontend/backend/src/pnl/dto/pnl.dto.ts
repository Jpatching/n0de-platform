import { IsString, IsNumber, IsOptional, IsEnum, IsObject, IsArray, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class StorePnLRecordDto {
  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  matchId?: string;

  @IsString()
  gameType: string; // RPS, MINES, CRASH, etc.

  @IsEnum(['WIN', 'LOSS'])
  result: 'WIN' | 'LOSS';

  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  wagerAmount: number;

  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  pnlAmount: number;

  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  pnlPercentage: number;

  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  finalAmount: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  feeAmount?: number;

  @IsOptional()
  @IsObject()
  gameSpecific?: any;

  @IsOptional()
  @IsObject()
  cardData?: any;
}

export class GetPnLStatsDto {
  @IsOptional()
  @IsEnum(['1d', '7d', '30d', '90d', '1y', 'all'])
  timeframe?: '1d' | '7d' | '30d' | '90d' | '1y' | 'all';

  @IsOptional()
  @IsString()
  gameType?: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  limit?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  offset?: number;
}

export class GetPnLCardsDto {
  @IsOptional()
  @IsString()
  gameType?: string;

  @IsOptional()
  @IsEnum(['WIN', 'LOSS', 'all'])
  result?: 'WIN' | 'LOSS' | 'all';

  @IsOptional()
  @IsEnum(['createdAt', 'pnlAmount', 'wagerAmount'])
  sortBy?: 'createdAt' | 'pnlAmount' | 'wagerAmount';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  limit?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  offset?: number;
}

export interface PnLSummaryData {
  totalGames: number;
  totalWins: number;
  totalLosses: number;
  winRate: number;
  totalWagered: number;
  totalPnL: number;
  totalProfit: number;
  totalLoss: number;
  totalFees: number;
  bestWin: number;
  worstLoss: number;
  dailyStats: Record<string, any>;
  weeklyStats: Record<string, any>;
  monthlyStats: Record<string, any>;
  gameTypeStats: Record<string, any>;
  currentStreak: number;
  bestWinStreak: number;
  worstLossStreak: number;
  lastUpdated: Date;
}

export interface PnLRecordData {
  id: string;
  userId: string;
  matchId?: string;
  gameType: string;
  result: 'WIN' | 'LOSS';
  wagerAmount: number;
  pnlAmount: number;
  pnlPercentage: number;
  finalAmount: number;
  feeAmount: number;
  gameSpecific?: any;
  cardData?: any;
  createdAt: Date;
}

export interface PnLAnalyticsDto {
  summary: PnLSummaryData;
  records: PnLRecordData[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  timeframe: string;
  gameType?: string;
}

export interface PnLCardDataDto {
  id: string;
  game: string;
  result: 'WIN' | 'LOSS';
  pnlAmount: number;
  pnlPercentage: number;
  wagerAmount: number;
  finalAmount: number;
  username?: string;
  walletAddress: string;
  gameSpecific?: any;
  cardData?: any;
  createdAt: Date;
}

export interface TopPerformerDto {
  userId: string;
  username?: string;
  walletAddress: string;
  avatar?: string;
  totalPnL: number;
  winRate: number;
  totalGames: number;
  bestWin: number;
}

export interface PnLDashboardDto {
  summary: PnLSummaryData;
  recentCards: PnLCardDataDto[];
  topPerformers: TopPerformerDto[];
  chartData: {
    daily: Array<{ date: string; pnl: number; games: number }>;
    gameTypes: Array<{ game: string; pnl: number; games: number; winRate: number }>;
  };
}

export class AutoStorePnLDto {
  @IsString()
  userId: string;

  @IsString()
  gameType: string;

  @IsString()
  matchId: string;

  @IsEnum(['WIN', 'LOSS'])
  result: 'WIN' | 'LOSS';

  @IsNumber()
  wagerAmount: number;

  @IsObject()
  gameResult: any; // Full game result object

  @IsOptional()
  @IsObject()
  additionalData?: any;
}

// Chart-specific DTOs for analytics
export class GetAnalyticsDto {
  @IsOptional()
  @IsEnum(['1d', '7d', '30d', '90d', '1y', 'all'])
  timeframe?: '1d' | '7d' | '30d' | '90d' | '1y' | 'all';

  @IsOptional()
  @IsString()
  gameType?: string;

  @IsOptional()
  @IsEnum(['hour', 'day', 'week', 'month'])
  granularity?: 'hour' | 'day' | 'week' | 'month';
}

export interface ChartDataPoint {
  timestamp: string;
  date: string;
  pnl: number;
  cumulativePnL: number;
  winRate: number;
  games: number;
  wins: number;
  losses: number;
  totalWagered: number;
  avgWager: number;
  bestWin: number;
  worstLoss: number;
  volatility: number;
}

export interface GamePerformanceData {
  game: string;
  totalGames: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnL: number;
  totalWagered: number;
  avgWager: number;
  bestWin: number;
  worstLoss: number;
  profitability: number; // PnL / Total Wagered
  roi: number; // Return on investment percentage
  sharpeRatio: number; // Risk-adjusted return
  chartData: ChartDataPoint[];
}

export interface VolatilityAnalysis {
  period: string;
  standardDeviation: number;
  variance: number;
  maxDrawdown: number;
  maxDrawdownPeriod: { start: string; end: string };
  volatilityRating: 'Low' | 'Medium' | 'High' | 'Very High';
}

export interface PerformanceMetrics {
  totalReturn: number;
  annualizedReturn: number;
  winRate: number;
  profitFactor: number; // Gross profit / Gross loss
  sharpeRatio: number;
  maxDrawdown: number;
  recoveryFactor: number; // Net profit / Max drawdown
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  consecutiveWins: number;
  consecutiveLosses: number;
}

export interface HourlyPerformanceData {
  hour: number;
  games: number;
  winRate: number;
  avgPnL: number;
  totalPnL: number;
  performance: 'Excellent' | 'Good' | 'Average' | 'Poor';
}

export interface WeeklyPerformanceData {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  dayName: string;
  games: number;
  winRate: number;
  avgPnL: number;
  totalPnL: number;
  performance: 'Excellent' | 'Good' | 'Average' | 'Poor';
}

export interface PnLAnalyticsResponse {
  overview: {
    totalPnL: number;
    totalGames: number;
    winRate: number;
    totalWagered: number;
    roi: number;
    timeframe: string;
  };
  chartData: ChartDataPoint[];
  gamePerformance: GamePerformanceData[];
  performanceMetrics: PerformanceMetrics;
  volatilityAnalysis: VolatilityAnalysis;
  hourlyPerformance: HourlyPerformanceData[];
  weeklyPerformance: WeeklyPerformanceData[];
  topWins: PnLRecordData[];
  topLosses: PnLRecordData[];
  streakAnalysis: {
    currentStreak: { type: 'win' | 'loss'; count: number };
    longestWinStreak: number;
    longestLossStreak: number;
    streakHistory: Array<{ type: 'win' | 'loss'; count: number; startDate: string; endDate: string }>;
  };
} 