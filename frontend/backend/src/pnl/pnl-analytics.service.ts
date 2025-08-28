import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { 
  GetAnalyticsDto, 
  PnLAnalyticsResponse, 
  ChartDataPoint, 
  GamePerformanceData,
  PerformanceMetrics,
  VolatilityAnalysis,
  HourlyPerformanceData,
  WeeklyPerformanceData,
  PnLRecordData
} from './dto/pnl.dto';

@Injectable()
export class PnLAnalyticsService {
  private readonly logger = new Logger(PnLAnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getComprehensiveAnalytics(userId: string, params: GetAnalyticsDto = {}): Promise<PnLAnalyticsResponse> {
    try {
      const { timeframe = '30d', gameType } = params;

      this.logger.log(`Generating comprehensive analytics for user ${userId}, timeframe: ${timeframe}`);

      // Get filtered records - using any[] to avoid Prisma type issues
      const records = await this.getFilteredRecords(userId, timeframe, gameType);
      
      if (records.length === 0) {
        return this.getEmptyAnalytics(timeframe);
      }

      // Generate all analytics components
      const overview = this.generateOverview(records, timeframe);
      const chartData = this.generateChartData(records);
      const gamePerformance = this.generateGamePerformance(records);
      const performanceMetrics = this.calculatePerformanceMetrics(records);
      const volatilityAnalysis = this.calculateVolatilityAnalysis(records);
      const hourlyPerformance = this.calculateHourlyPerformance(records);
      const weeklyPerformance = this.calculateWeeklyPerformance(records);
      const topWins = this.getTopWins(records, 10);
      const topLosses = this.getTopLosses(records, 10);
      const streakAnalysis = this.calculateStreakAnalysis(records);

      return {
        overview,
        chartData,
        gamePerformance,
        performanceMetrics,
        volatilityAnalysis,
        hourlyPerformance,
        weeklyPerformance,
        topWins,
        topLosses,
        streakAnalysis
      };

    } catch (error) {
      this.logger.error(`Failed to generate analytics: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async getFilteredRecords(userId: string, timeframe: string, gameType?: string): Promise<any[]> {
    const where: any = { userId };

    if (gameType) {
      where.gameType = gameType;
    }

    if (timeframe !== 'all') {
      const startDate = this.getTimeframeStartDate(timeframe);
      where.createdAt = { gte: startDate };
    }

    // Use the existing PnL record model name from schema
    return await (this.prisma as any).pnLRecord.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: {
            wallet: true,
            username: true
          }
        }
      }
    });
  }

  private generateOverview(records: any[], timeframe: string) {
    const totalPnL = records.reduce((sum, r) => sum + r.pnlAmount, 0);
    const totalGames = records.length;
    const wins = records.filter(r => r.result === 'WIN').length;
    const winRate = totalGames > 0 ? (wins / totalGames) * 100 : 0;
    const totalWagered = records.reduce((sum, r) => sum + r.wagerAmount, 0);
    const roi = totalWagered > 0 ? (totalPnL / totalWagered) * 100 : 0;

    return {
      totalPnL,
      totalGames,
      winRate,
      totalWagered,
      roi,
      timeframe
    };
  }

  private generateChartData(records: any[]): ChartDataPoint[] {
    if (records.length === 0) return [];

    // Group records by day
    const groupedData = this.groupRecordsByDay(records);
    const chartData: ChartDataPoint[] = [];
    let cumulativePnL = 0;

    for (const [timestamp, periodRecords] of Object.entries(groupedData)) {
      const periodPnL = periodRecords.reduce((sum: number, r: any) => sum + r.pnlAmount, 0);
      const wins = periodRecords.filter((r: any) => r.result === 'WIN').length;
      const losses = periodRecords.filter((r: any) => r.result === 'LOSS').length;
      const totalWagered = periodRecords.reduce((sum: number, r: any) => sum + r.wagerAmount, 0);
      
      cumulativePnL += periodPnL;

      const point: ChartDataPoint = {
        timestamp,
        date: new Date(timestamp).toISOString().split('T')[0],
        pnl: periodPnL,
        cumulativePnL,
        winRate: periodRecords.length > 0 ? (wins / periodRecords.length) * 100 : 0,
        games: periodRecords.length,
        wins,
        losses,
        totalWagered,
        avgWager: totalWagered > 0 ? totalWagered / periodRecords.length : 0,
        bestWin: wins > 0 ? Math.max(...periodRecords.filter((r: any) => r.result === 'WIN').map((r: any) => r.pnlAmount)) : 0,
        worstLoss: losses > 0 ? Math.min(...periodRecords.filter((r: any) => r.result === 'LOSS').map((r: any) => r.pnlAmount)) : 0,
        volatility: this.calculatePeriodVolatility(periodRecords)
      };

      chartData.push(point);
    }

    return chartData.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  private generateGamePerformance(records: any[]): GamePerformanceData[] {
    const gameGroups = records.reduce((groups, record) => {
      if (!groups[record.gameType]) {
        groups[record.gameType] = [];
      }
      groups[record.gameType].push(record);
      return groups;
    }, {} as Record<string, any[]>);

    return Object.entries(gameGroups).map(([game, gameRecords]: [string, any[]]) => {
      const wins = gameRecords.filter(r => r.result === 'WIN').length;
      const losses = gameRecords.filter(r => r.result === 'LOSS').length;
      const totalPnL = gameRecords.reduce((sum, r) => sum + r.pnlAmount, 0);
      const totalWagered = gameRecords.reduce((sum, r) => sum + r.wagerAmount, 0);
      const winRate = gameRecords.length > 0 ? (wins / gameRecords.length) * 100 : 0;

      return {
        game,
        totalGames: gameRecords.length,
        wins,
        losses,
        winRate,
        totalPnL,
        totalWagered,
        avgWager: totalWagered / gameRecords.length,
        bestWin: Math.max(...gameRecords.filter(r => r.result === 'WIN').map(r => r.pnlAmount), 0),
        worstLoss: Math.min(...gameRecords.filter(r => r.result === 'LOSS').map(r => r.pnlAmount), 0),
        profitability: totalWagered > 0 ? (totalPnL / totalWagered) * 100 : 0,
        roi: totalWagered > 0 ? (totalPnL / totalWagered) * 100 : 0,
        sharpeRatio: this.calculateSharpeRatio(gameRecords),
        chartData: this.generateChartData(gameRecords)
      };
    }).sort((a, b) => b.totalPnL - a.totalPnL);
  }

  private calculatePerformanceMetrics(records: any[]): PerformanceMetrics {
    const wins = records.filter(r => r.result === 'WIN');
    const losses = records.filter(r => r.result === 'LOSS');
    const totalPnL = records.reduce((sum, r) => sum + r.pnlAmount, 0);
    
    const grossProfit = wins.reduce((sum, r) => sum + r.pnlAmount, 0);
    const grossLoss = Math.abs(losses.reduce((sum, r) => sum + r.pnlAmount, 0));

    const winStreaks = this.calculateWinStreaks(records);
    const lossStreaks = this.calculateLossStreaks(records);
    const maxDrawdown = this.calculateMaxDrawdown(records);

    return {
      totalReturn: totalPnL,
      annualizedReturn: this.calculateAnnualizedReturn(records, totalPnL),
      winRate: records.length > 0 ? (wins.length / records.length) * 100 : 0,
      profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
      sharpeRatio: this.calculateSharpeRatio(records),
      maxDrawdown: maxDrawdown.value,
      recoveryFactor: maxDrawdown.value > 0 ? totalPnL / Math.abs(maxDrawdown.value) : 0,
      averageWin: wins.length > 0 ? wins.reduce((sum, r) => sum + r.pnlAmount, 0) / wins.length : 0,
      averageLoss: losses.length > 0 ? losses.reduce((sum, r) => sum + r.pnlAmount, 0) / losses.length : 0,
      largestWin: wins.length > 0 ? Math.max(...wins.map(r => r.pnlAmount)) : 0,
      largestLoss: losses.length > 0 ? Math.min(...losses.map(r => r.pnlAmount)) : 0,
      consecutiveWins: Math.max(...winStreaks, 0),
      consecutiveLosses: Math.max(...lossStreaks, 0)
    };
  }

  private calculateVolatilityAnalysis(records: any[]): VolatilityAnalysis {
    if (records.length < 2) {
      return {
        period: '30d',
        standardDeviation: 0,
        variance: 0,
        maxDrawdown: 0,
        maxDrawdownPeriod: { start: '', end: '' },
        volatilityRating: 'Low'
      };
    }

    const returns = records.map(r => r.pnlAmount);
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const standardDeviation = Math.sqrt(variance);
    
    const maxDrawdown = this.calculateMaxDrawdown(records);
    
    let volatilityRating: 'Low' | 'Medium' | 'High' | 'Very High' = 'Low';
    if (standardDeviation > 100) volatilityRating = 'Very High';
    else if (standardDeviation > 50) volatilityRating = 'High';
    else if (standardDeviation > 25) volatilityRating = 'Medium';

    return {
      period: '30d',
      standardDeviation,
      variance,
      maxDrawdown: maxDrawdown.value,
      maxDrawdownPeriod: maxDrawdown.period,
      volatilityRating
    };
  }

  private calculateHourlyPerformance(records: any[]): HourlyPerformanceData[] {
    const hourlyData: HourlyPerformanceData[] = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      games: 0,
      winRate: 0,
      avgPnL: 0,
      totalPnL: 0,
      performance: 'Average' as 'Excellent' | 'Good' | 'Average' | 'Poor'
    }));

    records.forEach(record => {
      const hour = new Date(record.createdAt).getHours();
      hourlyData[hour].games++;
      hourlyData[hour].totalPnL += record.pnlAmount;
    });

    return hourlyData.map(data => {
      const hourRecords = records.filter(r => new Date(r.createdAt).getHours() === data.hour);
      const wins = hourRecords.filter(r => r.result === 'WIN').length;
      
      data.winRate = data.games > 0 ? (wins / data.games) * 100 : 0;
      data.avgPnL = data.games > 0 ? data.totalPnL / data.games : 0;
      
      // Classify performance
      if (data.winRate >= 70 && data.avgPnL > 0) data.performance = 'Excellent';
      else if (data.winRate >= 60 && data.avgPnL >= 0) data.performance = 'Good';
      else if (data.winRate >= 40) data.performance = 'Average';
      else data.performance = 'Poor';

      return data;
    });
  }

  private calculateWeeklyPerformance(records: any[]): WeeklyPerformanceData[] {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    const weeklyData: WeeklyPerformanceData[] = Array.from({ length: 7 }, (_, dayOfWeek) => ({
      dayOfWeek,
      dayName: dayNames[dayOfWeek],
      games: 0,
      winRate: 0,
      avgPnL: 0,
      totalPnL: 0,
      performance: 'Average' as 'Excellent' | 'Good' | 'Average' | 'Poor'
    }));

    records.forEach(record => {
      const dayOfWeek = new Date(record.createdAt).getDay();
      weeklyData[dayOfWeek].games++;
      weeklyData[dayOfWeek].totalPnL += record.pnlAmount;
    });

    return weeklyData.map(data => {
      const dayRecords = records.filter(r => new Date(r.createdAt).getDay() === data.dayOfWeek);
      const wins = dayRecords.filter(r => r.result === 'WIN').length;
      
      data.winRate = data.games > 0 ? (wins / data.games) * 100 : 0;
      data.avgPnL = data.games > 0 ? data.totalPnL / data.games : 0;
      
      // Classify performance
      if (data.winRate >= 70 && data.avgPnL > 0) data.performance = 'Excellent';
      else if (data.winRate >= 60 && data.avgPnL >= 0) data.performance = 'Good';
      else if (data.winRate >= 40) data.performance = 'Average';
      else data.performance = 'Poor';

      return data;
    });
  }

  private getTopWins(records: any[], limit: number): PnLRecordData[] {
    return records
      .filter(r => r.result === 'WIN')
      .sort((a, b) => b.pnlAmount - a.pnlAmount)
      .slice(0, limit)
      .map(this.transformRecord);
  }

  private getTopLosses(records: any[], limit: number): PnLRecordData[] {
    return records
      .filter(r => r.result === 'LOSS')
      .sort((a, b) => a.pnlAmount - b.pnlAmount)
      .slice(0, limit)
      .map(this.transformRecord);
  }

  private calculateStreakAnalysis(records: any[]) {
    if (records.length === 0) {
      return {
        currentStreak: { type: 'win' as const, count: 0 },
        longestWinStreak: 0,
        longestLossStreak: 0,
        streakHistory: []
      };
    }

    const sortedRecords = [...records].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    
    // Calculate current streak
    let currentStreak = { 
      type: sortedRecords[sortedRecords.length - 1].result === 'WIN' ? 'win' as const : 'loss' as const, 
      count: 1 
    };
    
    for (let i = sortedRecords.length - 2; i >= 0; i--) {
      if (sortedRecords[i].result === sortedRecords[sortedRecords.length - 1].result) {
        currentStreak.count++;
      } else {
        break;
      }
    }

    // Calculate longest streaks
    const winStreaks = this.calculateWinStreaks(sortedRecords);
    const lossStreaks = this.calculateLossStreaks(sortedRecords);

    return {
      currentStreak,
      longestWinStreak: Math.max(...winStreaks, 0),
      longestLossStreak: Math.max(...lossStreaks, 0),
      streakHistory: []
    };
  }

  // Helper methods
  private groupRecordsByDay(records: any[]): Record<string, any[]> {
    const groups: Record<string, any[]> = {};

    records.forEach(record => {
      const date = new Date(record.createdAt);
      const key = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(record);
    });

    return groups;
  }

  private calculatePeriodVolatility(records: any[]): number {
    if (records.length < 2) return 0;
    
    const returns = records.map(r => r.pnlAmount);
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    return Math.sqrt(variance);
  }

  private calculateSharpeRatio(records: any[]): number {
    if (records.length < 2) return 0;
    
    const returns = records.map(r => r.pnlAmount);
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const volatility = this.calculatePeriodVolatility(records);
    
    return volatility > 0 ? avgReturn / volatility : 0;
  }

  private calculateWinStreaks(records: any[]): number[] {
    const streaks: number[] = [];
    let currentStreak = 0;

    records.forEach(record => {
      if (record.result === 'WIN') {
        currentStreak++;
      } else {
        if (currentStreak > 0) {
          streaks.push(currentStreak);
          currentStreak = 0;
        }
      }
    });

    if (currentStreak > 0) {
      streaks.push(currentStreak);
    }

    return streaks;
  }

  private calculateLossStreaks(records: any[]): number[] {
    const streaks: number[] = [];
    let currentStreak = 0;

    records.forEach(record => {
      if (record.result === 'LOSS') {
        currentStreak++;
      } else {
        if (currentStreak > 0) {
          streaks.push(currentStreak);
          currentStreak = 0;
        }
      }
    });

    if (currentStreak > 0) {
      streaks.push(currentStreak);
    }

    return streaks;
  }

  private calculateMaxDrawdown(records: any[]): { value: number; period: { start: string; end: string } } {
    if (records.length === 0) {
      return { value: 0, period: { start: '', end: '' } };
    }

    let cumulativePnL = 0;
    let peak = 0;
    let maxDrawdown = 0;
    let drawdownStart = '';
    let drawdownEnd = '';
    let tempStart = '';

    records.forEach(record => {
      cumulativePnL += record.pnlAmount;
      
      if (cumulativePnL > peak) {
        peak = cumulativePnL;
        tempStart = record.createdAt;
      }
      
      const drawdown = peak - cumulativePnL;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
        drawdownStart = tempStart;
        drawdownEnd = record.createdAt;
      }
    });

    return {
      value: -maxDrawdown,
      period: {
        start: drawdownStart,
        end: drawdownEnd
      }
    };
  }

  private calculateAnnualizedReturn(records: any[], totalReturn: number): number {
    if (records.length === 0) return 0;
    
    const startDate = new Date(records[0].createdAt);
    const endDate = new Date(records[records.length - 1].createdAt);
    const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const years = daysDiff / 365.25;
    
    return years > 0 ? (totalReturn / years) : totalReturn;
  }

  private transformRecord = (record: any): PnLRecordData => {
    return {
      id: record.id,
      userId: record.userId,
      matchId: record.matchId,
      gameType: record.gameType,
      result: record.result,
      wagerAmount: record.wagerAmount,
      pnlAmount: record.pnlAmount,
      pnlPercentage: record.pnlPercentage,
      finalAmount: record.finalAmount,
      feeAmount: record.feeAmount,
      gameSpecific: record.gameSpecific,
      cardData: record.cardData,
      createdAt: record.createdAt
    };
  }

  private getTimeframeStartDate(timeframe: string): Date {
    const now = new Date();
    switch (timeframe) {
      case '1d':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case '1y':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      default:
        return new Date(0);
    }
  }

  private getEmptyAnalytics(timeframe: string): PnLAnalyticsResponse {
    return {
      overview: {
        totalPnL: 0,
        totalGames: 0,
        winRate: 0,
        totalWagered: 0,
        roi: 0,
        timeframe
      },
      chartData: [],
      gamePerformance: [],
      performanceMetrics: {
        totalReturn: 0,
        annualizedReturn: 0,
        winRate: 0,
        profitFactor: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        recoveryFactor: 0,
        averageWin: 0,
        averageLoss: 0,
        largestWin: 0,
        largestLoss: 0,
        consecutiveWins: 0,
        consecutiveLosses: 0
      },
      volatilityAnalysis: {
        period: timeframe,
        standardDeviation: 0,
        variance: 0,
        maxDrawdown: 0,
        maxDrawdownPeriod: { start: '', end: '' },
        volatilityRating: 'Low'
      },
      hourlyPerformance: [],
      weeklyPerformance: [],
      topWins: [],
      topLosses: [],
      streakAnalysis: {
        currentStreak: { type: 'win', count: 0 },
        longestWinStreak: 0,
        longestLossStreak: 0,
        streakHistory: []
      }
    };
  }
} 