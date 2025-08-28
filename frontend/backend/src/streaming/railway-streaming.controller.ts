import { Controller, Post, Get, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { RailwayNativeStreamingService } from './railway-native.service';
import { AuthGuard } from '../auth/auth.guard';
import { User } from '../auth/user.decorator';

@Controller('api/railway-stream')
@UseGuards(AuthGuard)
export class RailwayStreamingController {
  constructor(
    private readonly railwayStreamingService: RailwayNativeStreamingService,
  ) {}

  /**
   * Start a stream using Railway's built-in infrastructure
   * POST /api/railway-stream/start
   */
  @Post('start')
  async startStream(
    @User('id') userId: string,
    @Body() body: { title: string; category: string }
  ) {
    return await this.railwayStreamingService.startStream(
      userId,
      body.title,
      body.category
    );
  }

  /**
   * Get all live streams
   * GET /api/railway-stream/live
   */
  @Get('live')
  async getLiveStreams() {
    return await this.railwayStreamingService.getLiveStreams();
  }

  /**
   * Send a tip to a stream
   * POST /api/railway-stream/:streamId/tip
   */
  @Post(':streamId/tip')
  async sendTip(
    @User('id') userId: string,
    @Param('streamId') streamId: string,
    @Body() body: { amount: number; message?: string }
  ) {
    return await this.railwayStreamingService.sendTip(
      userId,
      streamId,
      body.amount,
      body.message
    );
  }

  /**
   * Stop a stream
   * DELETE /api/railway-stream/:streamId
   */
  @Delete(':streamId')
  async stopStream(
    @User('id') userId: string,
    @Param('streamId') streamId: string
  ) {
    return await this.railwayStreamingService.stopStream(userId, streamId);
  }

  /**
   * Get stream details
   * GET /api/railway-stream/:streamId
   */
  @Get(':streamId')
  async getStream(@Param('streamId') streamId: string) {
    return await this.railwayStreamingService.getStream(streamId);
  }
} 