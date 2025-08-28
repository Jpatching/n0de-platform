import { Controller, Get, Post, Logger } from '@nestjs/common';
import { BotsService } from './bots.service';
import { BotConfig, BotMetrics } from './services/bot-manager.service';

@Controller('bots')
export class BotsController {
  private readonly logger = new Logger(BotsController.name);

  constructor(private readonly botsService: BotsService) {}

  @Get('status')
  getBotStatus() {
    return this.botsService.getBotStatus();
  }

  @Get('metrics')
  async getBotMetrics(): Promise<BotMetrics | { error: string }> {
    return await this.botsService.getBotMetrics();
  }

  @Get('details')
  async getBotDetails(): Promise<BotConfig[] | { error: string }> {
    return await this.botsService.getBotDetails();
  }

  @Post('start')
  async startBots() {
    try {
      await this.botsService.startBots();
      return { success: true, message: 'Bots started successfully' };
    } catch (error) {
      this.logger.error('Failed to start bots:', error.message);
      return { success: false, error: error.message };
    }
  }

  @Post('stop')
  async stopBots() {
    try {
      await this.botsService.stopBots();
      return { success: true, message: 'Bots stopped successfully' };
    } catch (error) {
      this.logger.error('Failed to stop bots:', error.message);
      return { success: false, error: error.message };
    }
  }

  @Post('restart')
  async restartBots() {
    try {
      await this.botsService.restartBots();
      return { success: true, message: 'Bots restarted successfully' };
    } catch (error) {
      this.logger.error('Failed to restart bots:', error.message);
      return { success: false, error: error.message };
    }
  }
} 