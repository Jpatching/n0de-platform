import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { 
  StorePnLRecordDto, 
  GetPnLStatsDto, 
  PnLAnalyticsDto,
  PnLCardDataDto,
  PnLRecordData
} from './dto/pnl.dto';

@Injectable()
export class PnLService {
  private readonly logger = new Logger(PnLService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 🎯 CORE: Automatically store PnL record after game completion
   */
  async storePnLRecord(data: StorePnLRecordDto): Promise<any> {
    try {
      this.logger.log(`Storing PnL record for user ${data.userId}, game: ${data.gameType}, result: ${data.result}`);

      // Store the individual PnL record
      const pnlRecord = await this.prisma.pnLRecord.create({
        data: {
          userId: data.userId,
          matchId: data.matchId,
          gameType: data.gameType,
          result: data.result,
          wagerAmount: data.wagerAmount,
          pnlAmount: data.pnlAmount,
          pnlPercentage: data.pnlPercentage,
          finalAmount: data.finalAmount,
          feeAmount: data.feeAmount || 0,
          gameSpecific: data.gameSpecific || {},
          cardData: data.cardData || {},
        }
      });

      // Update or create PnL summary
      await this.updatePnLSummary(data.userId);

      this.logger.log(`✅ PnL record stored successfully: ${pnlRecord.id}`);
      return pnlRecord;

    } catch (error) {
      this.logger.error(`Failed to store PnL record: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 📊 ANALYTICS: Update user's PnL summary with latest stats
   */
  private async updatePnLSummary(userId: string): Promise<void> {
    try {
      // Get all user's PnL records for calculations
      const allRecords = await this.prisma.pnLRecord.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      });

      if (allRecords.length === 0) return;

      // Calculate overall stats
      const totalGames = allRecords.length;
      const wins = allRecords.filter(r => r.result === 'WIN');
      const losses = allRecords.filter(r => r.result === 'LOSS');
      const totalWins = wins.length;
      const totalLosses = losses.length;
      const winRate = totalGames > 0 ? (totalWins / totalGames) * 100 : 0;

      // Financial calculations
      const totalWagered = allRecords.reduce((sum, r) => sum + r.wagerAmount, 0);
      const totalPnL = allRecords.reduce((sum, r) => sum + r.pnlAmount, 0);
      const totalProfit = wins.reduce((sum, r) => sum + r.pnlAmount, 0);
      const totalLoss = losses.reduce((sum, r) => sum + Math.abs(r.pnlAmount), 0);
      const totalFees = allRecords.reduce((sum, r) => sum + r.feeAmount, 0);
      const bestWin = wins.length > 0 ? Math.max(...wins.map(r => r.pnlAmount)) : 0;
      const worstLoss = losses.length > 0 ? Math.min(...losses.map(r => r.pnlAmount)) : 0;

      // Time-based analytics
      const now = new Date();
      const dailyStats = this.calculateTimeBasedStats(allRecords, 'daily', 30);
      const weeklyStats = this.calculateTimeBasedStats(allRecords, 'weekly', 12);
      const monthlyStats = this.calculateTimeBasedStats(allRecords, 'monthly', 12);

      // Game type breakdown
      const gameTypeStats = this.calculateGameTypeStats(allRecords);

      // Streak calculations
      const streakData = this.calculateStreaks(allRecords);

      // Upsert PnL summary
      await this.prisma.pnLSummary.upsert({
        where: { userId },
        create: {
          userId,
          totalGames,
          totalWins,
          totalLosses,
          winRate,
          totalWagered,
          totalPnL,
          totalProfit,
          totalLoss,
          totalFees,
          bestWin,
          worstLoss,
          dailyStats,
          weeklyStats,
          monthlyStats,
          gameTypeStats,
          ...streakData
        },
        update: {
          totalGames,
          totalWins,
          totalLosses,
          winRate,
          totalWagered,
          totalPnL,
          totalProfit,
          totalLoss,
          totalFees,
          bestWin,
          worstLoss,
          dailyStats,
          weeklyStats,
          monthlyStats,
          gameTypeStats,
          ...streakData
        }
      });

      this.logger.log(`📊 PnL summary updated for user ${userId}`);

    } catch (error) {
      this.logger.error(`Failed to update PnL summary: ${error.message}`, error.stack);
    }
  }

  /**
   * 📈 ANALYTICS: Get user's PnL statistics with time filtering
   */
  async getPnLStats(userId: string, params: GetPnLStatsDto = {}): Promise<PnLAnalyticsDto> {
    try {
      const { timeframe = 'all', gameType, limit = 100, offset = 0 } = params;

      // Get summary data
      const summary = await this.prisma.pnLSummary.findUnique({
        where: { userId }
      });

      // Build query filters
      const where: any = { userId };
      
      if (gameType) {
        where.gameType = gameType;
      }

      if (timeframe !== 'all') {
        const startDate = this.getTimeframeStartDate(timeframe);
        where.createdAt = { gte: startDate };
      }

      // Get filtered records
      const records = await this.prisma.pnLRecord.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      });

      // Get total count for pagination
      const totalRecords = await this.prisma.pnLRecord.count({ where });

      // Transform records to match the expected interface
      const transformedRecords: PnLRecordData[] = records.map(record => ({
        id: record.id,
        userId: record.userId,
        matchId: record.matchId || undefined,
        gameType: record.gameType,
        result: record.result as 'WIN' | 'LOSS',
        wagerAmount: record.wagerAmount,
        pnlAmount: record.pnlAmount,
        pnlPercentage: record.pnlPercentage,
        finalAmount: record.finalAmount,
        feeAmount: record.feeAmount,
        gameSpecific: record.gameSpecific as any,
        cardData: record.cardData as any,
        createdAt: record.createdAt
      }));

      return {
        summary: summary || this.getEmptySummary(),
        records: transformedRecords,
        pagination: {
          total: totalRecords,
          limit,
          offset,
          hasMore: totalRecords > offset + limit
        },
        timeframe,
        gameType
      };

    } catch (error) {
      this.logger.error(`Failed to get PnL stats: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 🃏 CARDS: Get user's PnL cards for the gallery
   */
  async getPnLCards(userId: string, params: any = {}): Promise<PnLCardDataDto[]> {
    try {
      const { 
        gameType, 
        result, 
        sortBy = 'createdAt', 
        sortOrder = 'desc',
        limit = 50,
        offset = 0 
      } = params;

      const where: any = { userId };
      
      if (gameType && gameType !== 'all') {
        where.gameType = gameType;
      }
      
      if (result && result !== 'all') {
        where.result = result;
      }

      const records = await this.prisma.pnLRecord.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        take: limit,
        skip: offset,
        include: {
          user: {
            select: {
              username: true,
              wallet: true
            }
          }
        }
      });

      // Transform records into card data format
      return records.map(record => ({
        id: record.id,
        game: record.gameType,
        result: record.result as 'WIN' | 'LOSS',
        pnlAmount: record.pnlAmount,
        pnlPercentage: record.pnlPercentage,
        wagerAmount: record.wagerAmount,
        finalAmount: record.finalAmount,
        username: record.user.username,
        walletAddress: record.user.wallet,
        gameSpecific: record.gameSpecific as any,
        cardData: record.cardData as any,
        createdAt: record.createdAt
      }));

    } catch (error) {
      this.logger.error(`Failed to get PnL cards: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 🏆 LEADERBOARD: Get top performers
   */
  async getTopPerformers(gameType?: string): Promise<any[]> {
    try {
      const where: any = {};
      if (gameType) {
        where.gameType = gameType;
      }

      return await this.prisma.pnLSummary.findMany({
        where,
        orderBy: [
          { totalPnL: 'desc' },
          { winRate: 'desc' }
        ],
        take: 50,
        include: {
          user: {
            select: {
              username: true,
              wallet: true,
              avatar: true
            }
          }
        }
      });

    } catch (error) {
      this.logger.error(`Failed to get top performers: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 🃏 SINGLE CARD: Get single PnL card by ID
   */
  async getSingleCard(cardId: string): Promise<PnLCardDataDto | null> {
    try {
      const record = await this.prisma.pnLRecord.findUnique({
        where: { id: cardId },
        include: {
          user: {
            select: {
              username: true,
              wallet: true
            }
          }
        }
      });

      if (!record) {
        return null;
      }

      return {
        id: record.id,
        game: record.gameType,
        result: record.result as 'WIN' | 'LOSS',
        pnlAmount: record.pnlAmount,
        pnlPercentage: record.pnlPercentage,
        wagerAmount: record.wagerAmount,
        finalAmount: record.finalAmount,
        username: record.user.username,
        walletAddress: record.user.wallet,
        gameSpecific: record.gameSpecific as any,
        cardData: record.cardData as any,
        createdAt: record.createdAt
      };

    } catch (error) {
      this.logger.error(`Failed to get single card: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 🔥 STREAKS: Get user's streak data
   */
  async getUserStreaks(userId: string): Promise<any> {
    try {
      const summary = await this.prisma.pnLSummary.findUnique({
        where: { userId }
      });

      if (!summary) {
        return {
          currentStreak: 0,
          bestWinStreak: 0,
          worstLossStreak: 0,
          streakType: 'none'
        };
      }

      return {
        currentStreak: summary.currentStreak,
        bestWinStreak: summary.bestWinStreak,
        worstLossStreak: summary.worstLossStreak,
        streakType: summary.currentStreak > 0 ? 'win' : summary.currentStreak < 0 ? 'loss' : 'none'
      };

    } catch (error) {
      this.logger.error(`Failed to get user streaks: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Helper methods
  private calculateTimeBasedStats(records: any[], period: 'daily' | 'weekly' | 'monthly', count: number): any {
    const stats: any = {};
    const now = new Date();

    for (let i = 0; i < count; i++) {
      let startDate: Date;
      let endDate: Date;
      let key: string;

      if (period === 'daily') {
        startDate = new Date(now.getTime() - (i + 1) * 24 * 60 * 60 * 1000);
        endDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        key = startDate.toISOString().split('T')[0];
      } else if (period === 'weekly') {
        startDate = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
        endDate = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
        key = `week-${Math.floor((now.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000))}`;
      } else {
        startDate = new Date(now.getFullYear(), now.getMonth() - i - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth() - i, 0);
        key = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
      }

      const periodRecords = records.filter(r => 
        r.createdAt >= startDate && r.createdAt < endDate
      );

      stats[key] = {
        games: periodRecords.length,
        wins: periodRecords.filter(r => r.result === 'WIN').length,
        losses: periodRecords.filter(r => r.result === 'LOSS').length,
        pnl: periodRecords.reduce((sum, r) => sum + r.pnlAmount, 0),
        wagered: periodRecords.reduce((sum, r) => sum + r.wagerAmount, 0)
      };
    }

    return stats;
  }

  private calculateGameTypeStats(records: any[]): any {
    const stats: any = {};
    
    const gameTypes = [...new Set(records.map(r => r.gameType))];
    
    gameTypes.forEach(gameType => {
      const gameRecords = records.filter(r => r.gameType === gameType);
      const wins = gameRecords.filter(r => r.result === 'WIN');
      
      stats[gameType] = {
        games: gameRecords.length,
        wins: wins.length,
        losses: gameRecords.length - wins.length,
        winRate: gameRecords.length > 0 ? (wins.length / gameRecords.length) * 100 : 0,
        pnl: gameRecords.reduce((sum, r) => sum + r.pnlAmount, 0),
        wagered: gameRecords.reduce((sum, r) => sum + r.wagerAmount, 0)
      };
    });

    return stats;
  }

  private calculateStreaks(records: any[]): any {
    let currentStreak = 0;
    let bestWinStreak = 0;
    let worstLossStreak = 0;
    let tempWinStreak = 0;
    let tempLossStreak = 0;

    // Calculate from most recent records
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      
      if (i === 0) {
        // Current streak starts with most recent game
        currentStreak = record.result === 'WIN' ? 1 : -1;
      } else {
        const prevRecord = records[i - 1];
        if (record.result === prevRecord.result) {
          if (record.result === 'WIN') {
            currentStreak = Math.abs(currentStreak) + 1;
          } else {
            currentStreak = -(Math.abs(currentStreak) + 1);
          }
        } else {
          break; // Streak ended
        }
      }

      // Track individual streaks
      if (record.result === 'WIN') {
        tempWinStreak++;
        tempLossStreak = 0;
        bestWinStreak = Math.max(bestWinStreak, tempWinStreak);
      } else {
        tempLossStreak++;
        tempWinStreak = 0;
        worstLossStreak = Math.max(worstLossStreak, tempLossStreak);
      }
    }

    return {
      currentStreak,
      bestWinStreak,
      worstLossStreak
    };
  }

  private getTimeframeStartDate(timeframe: string): Date {
    const now = new Date();
    switch (timeframe) {
      case '1d': return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d': return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case '1y': return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      default: return new Date(0); // All time
    }
  }

  private getEmptySummary(): any {
    return {
      totalGames: 0,
      totalWins: 0,
      totalLosses: 0,
      winRate: 0,
      totalWagered: 0,
      totalPnL: 0,
      totalProfit: 0,
      totalLoss: 0,
      totalFees: 0,
      bestWin: 0,
      worstLoss: 0,
      dailyStats: {},
      weeklyStats: {},
      monthlyStats: {},
      gameTypeStats: {},
      currentStreak: 0,
      bestWinStreak: 0,
      worstLossStreak: 0
    };
  }
} 