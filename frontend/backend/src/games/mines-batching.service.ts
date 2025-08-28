import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

interface MinesTileClickAnalytics {
  matchId: string;
  playerId: string;
  tilePosition: string;
  timestamp: number;
  isMine: boolean;
  multiplier: number;
  gamePhase: 'early' | 'mid' | 'late';
  sessionId?: string;
}

interface MinesGameSessionAnalytics {
  matchId: string;
  playerId: string;
  sessionStartTime: number;
  sessionEndTime?: number;
  totalTilesClicked: number;
  averageClickInterval: number;
  sessionDuration?: number;
  deviceType?: string;
  userAgent?: string;
}

interface MinesPerformanceMetrics {
  matchId: string;
  playerId: string;
  eventType: 'tile_response_time' | 'animation_lag' | 'websocket_latency';
  value: number;
  timestamp: number;
  metadata?: any;
}

interface BatchedMinesData {
  tileClicks: MinesTileClickAnalytics[];
  gameSessions: MinesGameSessionAnalytics[];
  performanceMetrics: MinesPerformanceMetrics[];
  userActivityLogs: any[];
}

@Injectable()
export class MinesBatchingService implements OnModuleDestroy {
  private readonly logger = new Logger(MinesBatchingService.name);
  
  // Batch storage
  private readonly batchData: BatchedMinesData = {
    tileClicks: [],
    gameSessions: [],
    performanceMetrics: [],
    userActivityLogs: []
  };
  
  // Batch configuration
  private readonly BATCH_INTERVAL = 5000; // 5 seconds
  private readonly MAX_BATCH_SIZE = 100; // Force flush if over 100 items
  private readonly RETRY_ATTEMPTS = 3;
  
  // Batch timer
  private batchTimer: NodeJS.Timeout | null = null;
  
  // Statistics
  private stats = {
    totalBatches: 0,
    totalItems: 0,
    failedBatches: 0,
    averageBatchSize: 0,
    lastBatchTime: 0
  };

  constructor(
    private readonly prisma: PrismaService,
  ) {
    this.startBatchTimer();
    this.logger.log('🚀 MINES BATCHING: Analytics batching service started (5s intervals)');
  }

  /**
   * 📊 ANALYTICS: Track tile click (non-blocking)
   */
  trackTileClick(data: MinesTileClickAnalytics): void {
    this.batchData.tileClicks.push({
      ...data,
      timestamp: data.timestamp || Date.now()
    });
    
    this.checkBatchSize();
  }

  /**
   * 📊 ANALYTICS: Track game session data (non-blocking)
   */
  trackGameSession(data: MinesGameSessionAnalytics): void {
    this.batchData.gameSessions.push(data);
    this.checkBatchSize();
  }

  /**
   * 📊 ANALYTICS: Track performance metrics (non-blocking)
   */
  trackPerformanceMetric(data: MinesPerformanceMetrics): void {
    this.batchData.performanceMetrics.push({
      ...data,
      timestamp: data.timestamp || Date.now()
    });
    
    this.checkBatchSize();
  }

  /**
   * 📊 ANALYTICS: Track user activity (non-blocking)
   */
  trackUserActivity(userId: string, activity: string, metadata?: any): void {
    this.batchData.userActivityLogs.push({
      userId,
      activity,
      metadata,
      timestamp: Date.now(),
      game: 'mines'
    });
    
    this.checkBatchSize();
  }

  /**
   * 🔧 BATCH: Check if we need to force flush due to size
   */
  private checkBatchSize(): void {
    const totalItems = this.getTotalBatchSize();
    
    if (totalItems >= this.MAX_BATCH_SIZE) {
      this.logger.debug(`💾 FORCE FLUSH: Batch size reached ${totalItems} items`);
      this.processBatch();
    }
  }

  /**
   * 🔧 BATCH: Get total items across all batch categories
   */
  private getTotalBatchSize(): number {
    return this.batchData.tileClicks.length +
           this.batchData.gameSessions.length +
           this.batchData.performanceMetrics.length +
           this.batchData.userActivityLogs.length;
  }

  /**
   * ⏰ BATCH: Start the batch processing timer
   */
  private startBatchTimer(): void {
    this.batchTimer = setInterval(() => {
      this.processBatch();
    }, this.BATCH_INTERVAL);
  }

  /**
   * 💾 BATCH: Process all batched data
   */
  private async processBatch(): Promise<void> {
    const totalItems = this.getTotalBatchSize();
    
    // Skip if no data to process
    if (totalItems === 0) {
      return;
    }

    const startTime = Date.now();
    
    try {
      // Create a snapshot of current batch data
      const currentBatch = {
        tileClicks: [...this.batchData.tileClicks],
        gameSessions: [...this.batchData.gameSessions],
        performanceMetrics: [...this.batchData.performanceMetrics],
        userActivityLogs: [...this.batchData.userActivityLogs]
      };

      // Clear the batch data immediately (prevents blocking new data)
      this.batchData.tileClicks = [];
      this.batchData.gameSessions = [];
      this.batchData.performanceMetrics = [];
      this.batchData.userActivityLogs = [];

      // Process each category
      await Promise.all([
        this.processTileClickBatch(currentBatch.tileClicks),
        this.processGameSessionBatch(currentBatch.gameSessions),
        this.processPerformanceMetricsBatch(currentBatch.performanceMetrics),
        this.processUserActivityBatch(currentBatch.userActivityLogs)
      ]);

      // Update statistics
      const processingTime = Date.now() - startTime;
      this.updateBatchStats(totalItems, processingTime, false);
      
      this.logger.debug(`✅ BATCH SUCCESS: Processed ${totalItems} items in ${processingTime}ms`);

    } catch (error) {
      this.logger.error(`❌ BATCH FAILED: Error processing batch of ${totalItems} items:`, error);
      this.updateBatchStats(totalItems, Date.now() - startTime, true);
      
      // Don't retry automatically - just log the failure
      // Critical game data is never batched, so this won't affect gameplay
    }
  }

  /**
   * 📊 BATCH: Process tile click analytics
   */
  private async processTileClickBatch(tileClicks: MinesTileClickAnalytics[]): Promise<void> {
    if (tileClicks.length === 0) return;

    const analyticsData = tileClicks.map(click => ({
      type: 'mines_tile_click',
      period: 'raw',
      data: {
        matchId: click.matchId,
        playerId: click.playerId,
        tilePosition: click.tilePosition,
        isMine: click.isMine,
        multiplier: click.multiplier,
        gamePhase: click.gamePhase,
        timestamp: click.timestamp
      },
      createdAt: new Date(click.timestamp)
    }));

    await this.prisma.analytics.createMany({
      data: analyticsData,
      skipDuplicates: true
    });
  }

  /**
   * 📊 BATCH: Process game session analytics
   */
  private async processGameSessionBatch(gameSessions: MinesGameSessionAnalytics[]): Promise<void> {
    if (gameSessions.length === 0) return;

    const analyticsData = gameSessions.map(session => ({
      type: 'mines_game_session',
      period: 'raw',
      data: {
        matchId: session.matchId,
        playerId: session.playerId,
        sessionDuration: session.sessionDuration,
        totalTilesClicked: session.totalTilesClicked,
        averageClickInterval: session.averageClickInterval,
        deviceType: session.deviceType,
        userAgent: session.userAgent
      },
      createdAt: new Date(session.sessionStartTime)
    }));

    await this.prisma.analytics.createMany({
      data: analyticsData,
      skipDuplicates: true
    });
  }

  /**
   * 📊 BATCH: Process performance metrics
   */
  private async processPerformanceMetricsBatch(metrics: MinesPerformanceMetrics[]): Promise<void> {
    if (metrics.length === 0) return;

    const analyticsData = metrics.map(metric => ({
      type: 'mines_performance',
      period: 'raw',
      data: {
        matchId: metric.matchId,
        playerId: metric.playerId,
        eventType: metric.eventType,
        value: metric.value,
        metadata: metric.metadata
      },
      createdAt: new Date(metric.timestamp)
    }));

    await this.prisma.analytics.createMany({
      data: analyticsData,
      skipDuplicates: true
    });
  }

  /**
   * 📊 BATCH: Process user activity logs
   */
  private async processUserActivityBatch(activityLogs: any[]): Promise<void> {
    if (activityLogs.length === 0) return;

    const securityLogs = activityLogs.map(log => ({
      userId: log.userId,
      type: 'USER_ACTIVITY',
      action: log.activity,
      details: {
        game: 'mines',
        metadata: log.metadata,
        timestamp: log.timestamp
      },
      createdAt: new Date(log.timestamp)
    }));

    await this.prisma.securityLog.createMany({
      data: securityLogs,
      skipDuplicates: true
    });
  }

  /**
   * 📊 STATS: Update batching statistics
   */
  private updateBatchStats(itemCount: number, processingTime: number, failed: boolean): void {
    this.stats.totalBatches++;
    this.stats.totalItems += itemCount;
    this.stats.lastBatchTime = processingTime;
    
    if (failed) {
      this.stats.failedBatches++;
    }
    
    this.stats.averageBatchSize = this.stats.totalItems / this.stats.totalBatches;
  }

  /**
   * 📊 STATS: Get batching statistics
   */
  getBatchingStats() {
    return {
      ...this.stats,
      currentBatchSize: this.getTotalBatchSize(),
      successRate: this.stats.totalBatches > 0 
        ? ((this.stats.totalBatches - this.stats.failedBatches) / this.stats.totalBatches) * 100 
        : 100
    };
  }

  /**
   * 🧹 CLEANUP: Flush remaining data on shutdown
   */
  async onModuleDestroy(): Promise<void> {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }
    
    // Final flush of any remaining data
    const remainingItems = this.getTotalBatchSize();
    if (remainingItems > 0) {
      this.logger.log(`🧹 SHUTDOWN: Flushing ${remainingItems} remaining items`);
      await this.processBatch();
    }
    
    this.logger.log(`📊 FINAL STATS: Processed ${this.stats.totalItems} items in ${this.stats.totalBatches} batches`);
  }
} 