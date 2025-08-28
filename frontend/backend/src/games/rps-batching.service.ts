import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

interface RPSChoiceAnalytics {
  matchId: string;
  playerId: string;
  choice: 'rock' | 'paper' | 'scissors';
  timestamp: number;
  roundNumber: number;
  responseTime: number;
  sessionId?: string;
}

interface RPSGameSessionAnalytics {
  matchId: string;
  playerId: string;
  sessionStartTime: number;
  sessionEndTime?: number;
  totalRoundsPlayed: number;
  averageResponseTime: number;
  sessionDuration?: number;
  choiceDistribution: { rock: number; paper: number; scissors: number };
  deviceType?: string;
  userAgent?: string;
}

interface RPSPerformanceMetrics {
  matchId: string;
  playerId: string;
  eventType: 'choice_response_time' | 'animation_lag' | 'websocket_latency' | 'reveal_delay';
  value: number;
  timestamp: number;
  metadata?: any;
}

interface BatchedRPSData {
  choiceAnalytics: RPSChoiceAnalytics[];
  gameSessions: RPSGameSessionAnalytics[];
  performanceMetrics: RPSPerformanceMetrics[];
  userActivityLogs: any[];
}

@Injectable()
export class RPSBatchingService implements OnModuleDestroy {
  private readonly logger = new Logger(RPSBatchingService.name);
  
  // Batch storage
  private readonly batchData: BatchedRPSData = {
    choiceAnalytics: [],
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
    this.logger.log('🚀 RPS BATCHING: Analytics batching service started (5s intervals)');
  }

  /**
   * 📊 ANALYTICS: Track player choice (non-blocking)
   */
  trackPlayerChoice(data: RPSChoiceAnalytics): void {
    this.batchData.choiceAnalytics.push({
      ...data,
      timestamp: data.timestamp || Date.now()
    });
    
    this.checkBatchSize();
  }

  /**
   * 📊 ANALYTICS: Track game session data (non-blocking)
   */
  trackGameSession(data: RPSGameSessionAnalytics): void {
    this.batchData.gameSessions.push(data);
    this.checkBatchSize();
  }

  /**
   * 📊 ANALYTICS: Track performance metrics (non-blocking)
   */
  trackPerformanceMetric(data: RPSPerformanceMetrics): void {
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
      game: 'rps'
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
    return this.batchData.choiceAnalytics.length +
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
        choiceAnalytics: [...this.batchData.choiceAnalytics],
        gameSessions: [...this.batchData.gameSessions],
        performanceMetrics: [...this.batchData.performanceMetrics],
        userActivityLogs: [...this.batchData.userActivityLogs]
      };

      // Clear the batch data immediately (prevents blocking new data)
      this.batchData.choiceAnalytics = [];
      this.batchData.gameSessions = [];
      this.batchData.performanceMetrics = [];
      this.batchData.userActivityLogs = [];

      // Process each category
      await Promise.all([
        this.processChoiceAnalyticsBatch(currentBatch.choiceAnalytics),
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
      
      // Update failure statistics
      this.updateBatchStats(totalItems, Date.now() - startTime, true);
    }
  }

  /**
   * 📊 PROCESS: Process choice analytics batch
   */
  private async processChoiceAnalyticsBatch(choiceAnalytics: RPSChoiceAnalytics[]): Promise<void> {
    if (choiceAnalytics.length === 0) return;

    try {
      // For now, use structured logging until RPS analytics tables are created
      this.logger.log({
        type: 'RPS_CHOICE_ANALYTICS_BATCH',
        count: choiceAnalytics.length,
        data: choiceAnalytics.map(choice => ({
          matchId: choice.matchId,
          playerId: choice.playerId,
          choice: choice.choice,
          roundNumber: choice.roundNumber,
          responseTime: choice.responseTime,
          timestamp: choice.timestamp
        }))
      });

      this.logger.debug(`📊 ANALYTICS: Processed ${choiceAnalytics.length} choice analytics`);
    } catch (error) {
      this.logger.error(`❌ ANALYTICS ERROR: Failed to process choice analytics batch:`, error);
    }
  }

  /**
   * 📊 PROCESS: Process game session batch
   */
  private async processGameSessionBatch(gameSessions: RPSGameSessionAnalytics[]): Promise<void> {
    if (gameSessions.length === 0) return;

    try {
      // For now, use structured logging until RPS analytics tables are created
      this.logger.log({
        type: 'RPS_SESSION_ANALYTICS_BATCH',
        count: gameSessions.length,
        data: gameSessions.map(session => ({
          matchId: session.matchId,
          playerId: session.playerId,
          totalRoundsPlayed: session.totalRoundsPlayed,
          averageResponseTime: session.averageResponseTime,
          choiceDistribution: session.choiceDistribution
        }))
      });

      this.logger.debug(`📊 SESSIONS: Processed ${gameSessions.length} game sessions`);
    } catch (error) {
      this.logger.error(`❌ SESSIONS ERROR: Failed to process game sessions batch:`, error);
    }
  }

  /**
   * 📊 PROCESS: Process performance metrics batch
   */
  private async processPerformanceMetricsBatch(metrics: RPSPerformanceMetrics[]): Promise<void> {
    if (metrics.length === 0) return;

    try {
      // For now, use structured logging until RPS analytics tables are created
      this.logger.log({
        type: 'RPS_PERFORMANCE_METRICS_BATCH',
        count: metrics.length,
        data: metrics.map(metric => ({
          matchId: metric.matchId,
          playerId: metric.playerId,
          eventType: metric.eventType,
          value: metric.value,
          timestamp: metric.timestamp
        }))
      });

      this.logger.debug(`📊 PERFORMANCE: Processed ${metrics.length} performance metrics`);
    } catch (error) {
      this.logger.error(`❌ PERFORMANCE ERROR: Failed to process performance metrics batch:`, error);
    }
  }

  /**
   * 📊 PROCESS: Process user activity batch
   */
  private async processUserActivityBatch(activityLogs: any[]): Promise<void> {
    if (activityLogs.length === 0) return;

    try {
      // For now, use structured logging until analytics tables are created
      this.logger.log({
        type: 'RPS_USER_ACTIVITY_BATCH',
        count: activityLogs.length,
        data: activityLogs.map(log => ({
          userId: log.userId,
          activity: log.activity,
          game: log.game,
          timestamp: log.timestamp
        }))
      });

      this.logger.debug(`📊 ACTIVITY: Processed ${activityLogs.length} user activity logs`);
    } catch (error) {
      this.logger.error(`❌ ACTIVITY ERROR: Failed to process user activity batch:`, error);
    }
  }

  /**
   * 📊 STATS: Update batch processing statistics
   */
  private updateBatchStats(itemCount: number, processingTime: number, failed: boolean): void {
    this.stats.totalBatches++;
    this.stats.totalItems += itemCount;
    this.stats.lastBatchTime = processingTime;
    
    if (failed) {
      this.stats.failedBatches++;
    }
    
    // Update average batch size
    this.stats.averageBatchSize = Math.round(this.stats.totalItems / this.stats.totalBatches);
  }

  /**
   * 📊 MONITORING: Get batching statistics
   */
  getBatchingStats() {
    const successRate = this.stats.totalBatches > 0 
      ? ((this.stats.totalBatches - this.stats.failedBatches) / this.stats.totalBatches) * 100 
      : 100;
    
    return {
      ...this.stats,
      successRate: Math.round(successRate * 100) / 100,
      currentBatchSize: this.getTotalBatchSize()
    };
  }

  /**
   * 🧹 CLEANUP: Clean up resources
   */
  async onModuleDestroy(): Promise<void> {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }

    // Process any remaining batched data
    await this.processBatch();
    this.logger.log('🧹 RPS Batching Service destroyed and final batch processed');
  }
} 