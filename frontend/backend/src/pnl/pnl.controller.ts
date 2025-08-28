import { 
  Controller, 
  Get, 
  Post, 
  Delete,
  Body, 
  Query, 
  Param, 
  UseGuards,
  HttpStatus,
  HttpException,
  Logger
} from '@nestjs/common';
import { User } from '../auth/user.decorator';
import { AuthGuard } from '../auth/auth.guard';
import { PnLService } from './pnl.service';
import { 
  StorePnLRecordDto, 
  GetPnLStatsDto, 
  GetPnLCardsDto,
  AutoStorePnLDto,
  PnLAnalyticsDto,
  PnLCardDataDto,
  PnLDashboardDto
} from './dto/pnl.dto';

@Controller('pnl')
// @UseGuards(AuthGuard) // Temporarily disabled for debugging
export class PnLController {
  private readonly logger = new Logger(PnLController.name);

  constructor(private readonly pnlService: PnLService) {}

  /**
   * 🧪 DEBUG: Simple test endpoint
   * GET /api/v1/pnl/test
   */
  @Get('test')
  async testEndpoint() {
    this.logger.log('🧪 PnL TEST ENDPOINT HIT!');
    return {
      success: true,
      message: 'PnL controller is working!',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 🎯 CORE: Store PnL record (manual)
   * POST /api/v1/pnl/store (with global prefix)
   */
  @Post('store')
  async storePnLRecord(@Body() data: StorePnLRecordDto) {
    try {
      this.logger.log(`🎯 PnL STORE ENDPOINT HIT! Data received:`, data);
      this.logger.log(`Storing PnL record: ${data.gameType} ${data.result} for user ${data.userId}`);
      
      const result = await this.pnlService.storePnLRecord(data);
      
      return {
        success: true,
        data: result,
        message: 'PnL record stored successfully'
      };
    } catch (error) {
      this.logger.error(`Failed to store PnL record: ${error.message}`, error.stack);
      throw new HttpException(
        'Failed to store PnL record',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * 🔧 DEBUG: Test endpoint to verify routes work
   * GET /api/v1/pnl/debug-store
   */
  @Get('debug-store')
  debugStore() {
    this.logger.log(`🔧 DEBUG: PnL debug endpoint hit!`);
    return {
      success: true,
      message: 'PnL routes are working!',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 🔧 DEBUG: Test POST endpoint 
   * POST /api/v1/pnl/debug-post
   */
  @Post('debug-post')
  debugPost(@Body() data: any) {
    this.logger.log(`🔧 DEBUG: PnL debug POST endpoint hit with data:`, data);
    return {
      success: true,
      message: 'PnL POST routes are working!',
      receivedData: data,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 🎮 AUTO: Store PnL record automatically after game completion
   * POST /api/v1/pnl/auto-store
   */
  @Post('auto-store')
  async autoStorePnLRecord(@Body() data: AutoStorePnLDto) {
    try {
      this.logger.log(`Auto-storing PnL for ${data.gameType} match ${data.matchId}`);
      
      // Calculate PnL amounts based on game result
      const pnlData = await this.calculatePnLFromGameResult(data);
      
      const result = await this.pnlService.storePnLRecord(pnlData);
      
      return {
        success: true,
        data: result,
        message: 'PnL automatically recorded'
      };
    } catch (error) {
      this.logger.error(`Failed to auto-store PnL: ${error.message}`, error.stack);
      throw new HttpException(
        'Failed to auto-store PnL record',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * 📊 ANALYTICS: Get user's PnL statistics
   * GET /api/v1/pnl/stats/:userId
   */
  @Get('stats/:userId')
  async getPnLStats(
    @Param('userId') userId: string,
    @Query() params: GetPnLStatsDto
  ): Promise<PnLAnalyticsDto> {
    try {
      this.logger.log(`Getting PnL stats for user ${userId}`);
      
      return await this.pnlService.getPnLStats(userId, params);
    } catch (error) {
      this.logger.error(`Failed to get PnL stats: ${error.message}`, error.stack);
      throw new HttpException(
        'Failed to retrieve PnL statistics',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * 🃏 CARDS: Get current user's PnL card gallery
   * GET /api/v1/pnl/cards
   */
  @Get('cards')
  @UseGuards(AuthGuard)
  async getCurrentUserCards(
    @User('id') userId: string,
    @Query() params: GetPnLCardsDto
  ): Promise<{cards: PnLCardDataDto[], hasMore: boolean}> {
    try {
      this.logger.log(`Getting PnL cards for user ${userId}`);
      
      const cards = await this.pnlService.getPnLCards(userId, params);
      
      // Assume there are more cards if we get the full limit
      const hasMore = params.limit ? cards.length >= params.limit : false;

      return { 
        cards: cards || [], 
        hasMore 
      };
    } catch (error) {
      this.logger.error(`Failed to get PnL cards: ${error.message}`, error.stack);
      throw new HttpException(
        'Failed to retrieve PnL cards',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * 🃏 CARDS: Get user's PnL card gallery (by user ID)
   * GET /api/v1/pnl/cards/:userId
   */
  @Get('cards/:userId')
  async getPnLCards(
    @Param('userId') userId: string,
    @Query() params: GetPnLCardsDto
  ): Promise<PnLCardDataDto[]> {
    try {
      this.logger.log(`Getting PnL cards for user ${userId}`);
      
      return await this.pnlService.getPnLCards(userId, params);
    } catch (error) {
      this.logger.error(`Failed to get PnL cards: ${error.message}`, error.stack);
      throw new HttpException(
        'Failed to retrieve PnL cards',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

    /**
   * 📈 DASHBOARD: Get complete PnL dashboard data (for current user)
   * GET /api/v1/pnl/dashboard
   */
  @Get('dashboard')
  @UseGuards(AuthGuard)
  async getCurrentUserDashboard(
    @User('id') userId: string,
    @Query('timeframe') timeframe: '1d' | '7d' | '30d' | '90d' | '1y' | 'all' = '30d'
  ): Promise<PnLDashboardDto> {
    try {
      this.logger.log(`Getting PnL dashboard for user ${userId} with timeframe ${timeframe}`);
      
      const analytics = await this.pnlService.getPnLStats(userId, { timeframe });
      const recentCards = await this.pnlService.getPnLCards(userId, {
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });
      const topPerformers = await this.pnlService.getTopPerformers();
      const chartData = this.formatChartData(analytics);

      return {
        summary: {
          ...analytics.summary,
          dailyStats: analytics.summary.dailyStats || {},
          weeklyStats: analytics.summary.weeklyStats || {},
          monthlyStats: analytics.summary.monthlyStats || {},
          gameTypeStats: analytics.summary.gameTypeStats || {},
          lastUpdated: new Date()
        },
        recentCards: recentCards || [],
        topPerformers: topPerformers || [],
        chartData: chartData || { daily: [], gameTypes: [] }
      };
    } catch (error) {
      this.logger.error(`Failed to get dashboard: ${error.message}`, error.stack);
      throw new HttpException('Failed to retrieve dashboard', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * 📈 DASHBOARD: Get complete PnL dashboard data (for specific user)  
   * GET /api/v1/pnl/dashboard/:userId
   */
  @Get('dashboard/:userId')
  async getPnLDashboard(
    @Param('userId') userId: string,
    @Query('timeframe') timeframe: '1d' | '7d' | '30d' | '90d' | '1y' | 'all' = '30d'
  ): Promise<PnLDashboardDto> {
    try {
      this.logger.log(`Getting PnL dashboard for user ${userId}`);
      
      // Get main stats
      const stats = await this.pnlService.getPnLStats(userId, { timeframe });
      
      // Get recent cards (last 10)
      const recentCards = await this.pnlService.getPnLCards(userId, {
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });

      // Get top performers for comparison
      const topPerformers = await this.pnlService.getTopPerformers();

      // Format chart data
      const chartData = this.formatChartData(stats);

      return {
        summary: stats.summary,
        recentCards,
        topPerformers: topPerformers.slice(0, 10),
        chartData
      };
    } catch (error) {
      this.logger.error(`Failed to get PnL dashboard: ${error.message}`, error.stack);
      throw new HttpException(
        'Failed to retrieve PnL dashboard',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * 🏆 LEADERBOARD: Get top performers
   * GET /api/v1/pnl/leaderboard
   */
  @Get('leaderboard')
  async getLeaderboard(@Query('gameType') gameType?: string) {
    try {
      this.logger.log(`Getting PnL leaderboard${gameType ? ` for ${gameType}` : ''}`);
      
      const topPerformers = await this.pnlService.getTopPerformers(gameType);
      
      return {
        success: true,
        data: topPerformers,
        gameType: gameType || 'all'
      };
    } catch (error) {
      this.logger.error(`Failed to get leaderboard: ${error.message}`, error.stack);
      throw new HttpException(
        'Failed to retrieve leaderboard',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * 📊 ANALYTICS: Get specific game type performance
   * GET /api/pnl/game-stats/:userId/:gameType
   */
  @Get('game-stats/:userId/:gameType')
  async getGameTypeStats(
    @Param('userId') userId: string,
    @Param('gameType') gameType: string,
    @Query() params: GetPnLStatsDto
  ) {
    try {
      this.logger.log(`Getting ${gameType} stats for user ${userId}`);
      
      const stats = await this.pnlService.getPnLStats(userId, {
        ...params,
        gameType
      });
      
      return {
        success: true,
        data: stats,
        gameType
      };
    } catch (error) {
      this.logger.error(`Failed to get game stats: ${error.message}`, error.stack);
      throw new HttpException(
        'Failed to retrieve game statistics',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * 🃏 CARD: Get single PnL card data for sharing/regeneration
   * GET /api/pnl/card/:cardId
   */
  @Get('card/:cardId')
  async getSingleCard(@Param('cardId') cardId: string) {
    try {
      this.logger.log(`Getting PnL card ${cardId}`);
      
      const card = await this.pnlService.getSingleCard(cardId);
      
      if (!card) {
        throw new HttpException('Card not found', HttpStatus.NOT_FOUND);
      }
      
      return {
        success: true,
        data: card
      };
    } catch (error) {
      this.logger.error(`Failed to get card: ${error.message}`, error.stack);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        'Failed to retrieve card',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * 🔥 STREAKS: Get user's current streaks and records
   * GET /api/pnl/streaks/:userId
   */
  @Get('streaks/:userId')
  async getUserStreaks(@Param('userId') userId: string) {
    try {
      this.logger.log(`Getting streaks for user ${userId}`);
      
      const streaks = await this.pnlService.getUserStreaks(userId);
      
      return {
        success: true,
        data: streaks
      };
    } catch (error) {
      this.logger.error(`Failed to get streaks: ${error.message}`, error.stack);
      throw new HttpException(
        'Failed to retrieve streak data',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * ⭐ FAVORITES: Get current user's favorite PnL cards
   * GET /api/v1/pnl/favorites
   */
  @Get('favorites')
  @UseGuards(AuthGuard)
  async getCurrentUserFavorites(
    @User('id') userId: string
  ) {
    try {
      this.logger.log(`Getting favorites - returning empty array`);
      
      // Return empty array for now - implement favorite functionality later
      return [];
    } catch (error) {
      this.logger.error(`Failed to get favorites: ${error.message}`, error.stack);
      throw new HttpException(
        'Failed to retrieve favorites',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * 📁 COLLECTIONS: Get current user's PnL card collections
   * GET /api/v1/pnl/favorites/collections
   */
  @Get('favorites/collections')
  @UseGuards(AuthGuard)
  async getCurrentUserCollections(
    @User('id') userId: string
  ) {
    try {
      this.logger.log(`Getting collections - returning empty array`);
      
      // Return empty array for now - implement collections functionality later
      return [];
    } catch (error) {
      this.logger.error(`Failed to get collections: ${error.message}`, error.stack);
      throw new HttpException(
        'Failed to retrieve collections',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * 📁 COLLECTIONS: Get specific collection
   * GET /api/v1/pnl/favorites/collections/:collectionId
   */
  @Get('favorites/collections/:collectionId')
  @UseGuards(AuthGuard)
  async getCollection(
    @User('id') userId: string,
    @Param('collectionId') collectionId: string
  ) {
    try {
      this.logger.log(`Getting collection ${collectionId}`);
      
      // Return empty collection for now - implement collections functionality later
      return {
        id: collectionId,
        name: 'Sample Collection',
        description: 'Sample collection',
        isPublic: false,
        _count: { cards: 0 },
        createdAt: new Date(),
        updatedAt: new Date(),
        cards: []
      };
    } catch (error) {
      this.logger.error(`Failed to get collection: ${error.message}`, error.stack);
      throw new HttpException(
        'Failed to retrieve collection',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * 🗑️ COLLECTIONS: Delete collection
   * DELETE /api/v1/pnl/favorites/collections/:collectionId
   */
  @Delete('favorites/collections/:collectionId')
  @UseGuards(AuthGuard)
  async deleteCollection(
    @User('id') userId: string,
    @Param('collectionId') collectionId: string
  ) {
    try {
      this.logger.log(`Deleting collection ${collectionId}`);
      
      // Return success for now - implement collections functionality later
      return { success: true, message: 'Collection deleted' };
    } catch (error) {
      this.logger.error(`Failed to delete collection: ${error.message}`, error.stack);
      throw new HttpException(
        'Failed to delete collection',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * 🧹 CLEANUP: Get cleanup statistics
   * GET /api/v1/pnl/cleanup-stats
   */
  @Get('cleanup-stats')
  // @UseGuards(AuthGuard) // Temporarily disabled while we fix user extraction
  async getCleanupStats(
    @User('id') userId: string
  ) {
    try {
      this.logger.log(`Getting cleanup stats - returning zero count`);
      
      // Return zero cleanup count for now
      return { cardsToBeDeleted: 0 };
    } catch (error) {
      this.logger.error(`Failed to get cleanup stats: ${error.message}`, error.stack);
      throw new HttpException(
        'Failed to retrieve cleanup stats',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Helper method to calculate PnL from game result
  private async calculatePnLFromGameResult(data: AutoStorePnLDto): Promise<StorePnLRecordDto> {
    const { userId, gameType, matchId, result, wagerAmount, gameResult } = data;
    
    let pnlAmount: number;
    let finalAmount: number;
    let feeAmount: number = 0;
    
    if (result === 'WIN') {
      // Calculate winnings (typically 2x wager minus platform fee)
      const grossWinnings = wagerAmount * 2;
      feeAmount = grossWinnings * 0.065; // 6.5% platform fee
      finalAmount = grossWinnings - feeAmount;
      pnlAmount = finalAmount - wagerAmount; // Profit = net winnings - original wager
    } else {
      // Loss
      finalAmount = 0;
      pnlAmount = -wagerAmount; // Loss = negative wager amount
    }
    
    const pnlPercentage = result === 'WIN' 
      ? (pnlAmount / wagerAmount) * 100 
      : -100;

    // Extract game-specific data based on game type
    let gameSpecific: any = {};
    
    switch (gameType.toUpperCase()) {
      case 'RPS':
        gameSpecific = {
          finalScore: `${gameResult.playerScore}-${gameResult.opponentScore}`,
          totalRounds: gameResult.totalRounds,
          winRate: gameResult.totalRounds > 0 
            ? (gameResult.playerScore / (gameResult.playerScore + gameResult.opponentScore)) * 100 
            : 0
        };
        break;
      case 'MINES':
        gameSpecific = {
          minesRevealed: gameResult.minesRevealed || 0,
          gemsCollected: gameResult.gemsCollected || 0,
          multiplier: gameResult.multiplier || 1
        };
        break;
      // Add other game types as needed
    }

    // Store card data for recreation
    const cardData = {
      game: gameType.toUpperCase(),
      result,
      pnlAmount,
      pnlPercentage,
      wagerAmount,
      finalAmount,
      gameSpecific,
      timestamp: new Date()
    };

    return {
      userId,
      matchId,
      gameType: gameType.toUpperCase(),
      result,
      wagerAmount,
      pnlAmount,
      pnlPercentage,
      finalAmount,
      feeAmount,
      gameSpecific,
      cardData
    };
  }

  // Helper method to format chart data
  private formatChartData(stats: PnLAnalyticsDto): any {
    const dailyData = Object.entries(stats.summary.dailyStats || {})
      .map(([date, data]: [string, any]) => ({
        date,
        pnl: data.pnl || 0,
        games: data.games || 0
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const gameTypeData = Object.entries(stats.summary.gameTypeStats || {})
      .map(([game, data]: [string, any]) => ({
        game,
        pnl: data.pnl || 0,
        games: data.games || 0,
        winRate: data.winRate || 0
      }))
      .sort((a, b) => b.pnl - a.pnl);

    return {
      daily: dailyData,
      gameTypes: gameTypeData
    };
  }
} 