import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BotManagerService } from './services/bot-manager.service';

@Injectable()
export class BotsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BotsService.name);
  private isRunning = false;

  constructor(
    private readonly botManager: BotManagerService,
  ) {}

  async onModuleInit() {
    this.logger.log('🤖 Bot Service initializing...');
    
    // Start bots after a short delay to ensure all modules are loaded
    setTimeout(async () => {
      await this.startBots();
    }, 5000);
  }

  async onModuleDestroy() {
    this.logger.log('🛑 Bot Service shutting down...');
    await this.stopBots();
  }

  async startBots() {
    if (this.isRunning) {
      this.logger.warn('Bots are already running');
      return;
    }

    try {
      this.logger.log('🚀 Starting bot service...');
      await this.botManager.startAllBots();
      this.isRunning = true;
      this.logger.log('✅ All bots started successfully');
    } catch (error) {
      this.logger.error('❌ Failed to start bots:', error.message);
      throw error;
    }
  }

  async stopBots() {
    if (!this.isRunning) {
      this.logger.warn('Bots are not running');
      return;
    }

    try {
      this.logger.log('⏹️ Stopping bot service...');
      await this.botManager.stopAllBots();
      this.isRunning = false;
      this.logger.log('✅ All bots stopped successfully');
    } catch (error) {
      this.logger.error('❌ Failed to stop bots:', error.message);
      throw error;
    }
  }

  async restartBots() {
    this.logger.log('🔄 Restarting bot service...');
    await this.stopBots();
    await this.startBots();
  }

  // Health check every 5 minutes
  @Cron(CronExpression.EVERY_5_MINUTES)
  async healthCheck() {
    if (!this.isRunning) return;

    try {
      const status = await this.botManager.getBotsStatus();
      const activeBots = status.filter(bot => bot.isActive).length;
      const totalBots = status.length;

      this.logger.debug(`🏥 Health check: ${activeBots}/${totalBots} bots active`);

      // Restart any crashed bots
      const crashedBots = status.filter(bot => !bot.isActive);
      if (crashedBots.length > 0) {
        this.logger.warn(`⚠️ Found ${crashedBots.length} crashed bots, restarting...`);
        for (const bot of crashedBots) {
          await this.botManager.restartBot(bot.id);
        }
      }
    } catch (error) {
      this.logger.error('❌ Health check failed:', error.message);
    }
  }

  // Performance monitoring every hour
  @Cron(CronExpression.EVERY_HOUR)
  async performanceReport() {
    if (!this.isRunning) return;

    try {
      const metrics = await this.botManager.getPerformanceMetrics();
      this.logger.log('📊 Bot Performance Report:', {
        totalMatches: metrics.totalMatches,
        averageJoinTime: metrics.averageJoinTime,
        overallWinRate: metrics.overallWinRate,
        activeBots: metrics.activeBots,
      });
    } catch (error) {
      this.logger.error('❌ Performance report failed:', error.message);
    }
  }

  // Public API methods
  getBotStatus() {
    return {
      isRunning: this.isRunning,
      uptime: this.isRunning ? Date.now() : 0,
    };
  }

  async getBotMetrics() {
    if (!this.isRunning) {
      return { error: 'Bot service is not running' };
    }

    return await this.botManager.getPerformanceMetrics();
  }

  async getBotDetails() {
    if (!this.isRunning) {
      return { error: 'Bot service is not running' };
    }

    return await this.botManager.getBotsStatus();
  }
} 