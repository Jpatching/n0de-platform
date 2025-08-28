import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Headers,
  Req,
  Res,
  HttpException,
  HttpStatus,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { StreamingService, StreamCategory, StreamInfo, TipInfo, SubscriptionInfo } from './streaming.service';
import { AuthService } from '../auth/auth.service';

export interface StartStreamDto {
  title: string;
  category: StreamCategory;
  description?: string;
  gameType?: string;
  stakes?: number;
  isEducational?: boolean;
  isPremium?: boolean;
  minPrestigeToView?: number;
  tags?: string[];
  language?: string;
}

export interface SendTipDto {
  amount: number;
  message?: string;
}

export interface SubscribeDto {
  tier: number;
  monthlyAmount: number;
}

export interface StreamFiltersDto {
  category?: StreamCategory;
  minPrestige?: number;
  maxPrestige?: number;
  minStakes?: number;
  maxStakes?: number;
  language?: string;
  isEducational?: boolean;
  tags?: string[];
}

@Controller('streaming')
export class StreamingController {
  private readonly logger = new Logger(StreamingController.name);

  constructor(
    private readonly streamingService: StreamingService,
    private readonly authService: AuthService,
  ) {}

  /**
   * Extract token from authorization header or cookie
   */
  private extractToken(authorization: string, req: Request): string {
    if (authorization && authorization.startsWith('Bearer ')) {
      return authorization.substring(7);
    }
    
    // Fallback to cookie
    const token = req.cookies?.pv3_token;
    if (!token) {
      throw new UnauthorizedException('No authentication token provided');
    }
    
    return token;
  }

  /**
   * Start a new stream
   */
  @Post('start')
  async startStream(
    @Headers('authorization') authorization: string,
    @Body() startStreamDto: StartStreamDto,
    @Req() req: Request,
    @Res() res: Response
  ): Promise<void> {
    try {
      const token = this.extractToken(authorization, req);
      const user = await this.authService.getUserProfile(token);

      const stream = await this.streamingService.startStream(
        user.id,
        startStreamDto.title,
        startStreamDto.category,
        {
          description: startStreamDto.description,
          gameType: startStreamDto.gameType,
          stakes: startStreamDto.stakes,
          isEducational: startStreamDto.isEducational,
          isPremium: startStreamDto.isPremium,
          minPrestigeToView: startStreamDto.minPrestigeToView,
          tags: startStreamDto.tags,
          language: startStreamDto.language,
        }
      );

      res.status(HttpStatus.OK).json({
        success: true,
        stream,
      });
    } catch (error) {
      this.logger.error(`Failed to start stream: ${error.message}`);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException(error.message);
    }
  }

  /**
   * End a stream
   */
  @Post(':streamId/end')
  async endStream(
    @Headers('authorization') authorization: string,
    @Param('streamId') streamId: string,
    @Req() req: Request,
    @Res() res: Response
  ): Promise<void> {
    try {
      const token = this.extractToken(authorization, req);
      const user = await this.authService.getUserProfile(token);

      await this.streamingService.endStream(streamId, user.id);
      
      res.status(HttpStatus.OK).json({
        success: true,
      });
    } catch (error) {
      this.logger.error(`Failed to end stream: ${error.message}`);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Join a stream as viewer
   */
  @Post(':streamId/join')
  async joinStream(
    @Headers('authorization') authorization: string,
    @Param('streamId') streamId: string,
    @Req() req: Request,
    @Res() res: Response
  ): Promise<void> {
    try {
      const token = this.extractToken(authorization, req);
      const user = await this.authService.getUserProfile(token);

      const stream = await this.streamingService.joinStream(streamId, user.id);
      
      res.status(HttpStatus.OK).json({
        success: true,
        stream,
      });
    } catch (error) {
      this.logger.error(`Failed to join stream: ${error.message}`);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Leave a stream
   */
  @Post(':streamId/leave')
  async leaveStream(
    @Headers('authorization') authorization: string,
    @Param('streamId') streamId: string,
    @Req() req: Request,
    @Res() res: Response
  ): Promise<void> {
    try {
      const token = this.extractToken(authorization, req);
      const user = await this.authService.getUserProfile(token);

      await this.streamingService.leaveStream(streamId, user.id);
      
      res.status(HttpStatus.OK).json({
        success: true,
      });
    } catch (error) {
      this.logger.error(`Failed to leave stream: ${error.message}`);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Send tip to streamer
   */
  @Post(':streamId/tip')
  async sendTip(
    @Headers('authorization') authorization: string,
    @Param('streamId') streamId: string,
    @Body() sendTipDto: SendTipDto,
    @Req() req: Request,
    @Res() res: Response
  ): Promise<void> {
    try {
      const token = this.extractToken(authorization, req);
      const user = await this.authService.getUserProfile(token);

      const tip = await this.streamingService.sendTip(
        streamId,
        user.id,
        sendTipDto.amount,
        sendTipDto.message
      );
      
      res.status(HttpStatus.OK).json({
        success: true,
        tip,
      });
    } catch (error) {
      this.logger.error(`Failed to send tip: ${error.message}`);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Subscribe to streamer
   */
  @Post(':streamId/subscribe')
  async subscribeToStreamer(
    @Headers('authorization') authorization: string,
    @Param('streamId') streamId: string,
    @Body() subscribeDto: SubscribeDto,
    @Req() req: Request,
    @Res() res: Response
  ): Promise<void> {
    try {
      const token = this.extractToken(authorization, req);
      const user = await this.authService.getUserProfile(token);

      const subscription = await this.streamingService.subscribe(
        user.id,
        streamId,
        subscribeDto.tier,
        subscribeDto.monthlyAmount
      );
      
      res.status(HttpStatus.OK).json({
        success: true,
        subscription,
      });
    } catch (error) {
      this.logger.error(`Failed to subscribe: ${error.message}`);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Get all active streams with filters
   */
  @Get('active')
  async getActiveStreams(@Query() filters: StreamFiltersDto, @Res() res: Response): Promise<void> {
    try {
      const streams = await this.streamingService.getLiveStreams({
        category: filters.category,
        minPrestige: filters.minPrestige ? Number(filters.minPrestige) : undefined,
        maxPrestige: filters.maxPrestige ? Number(filters.maxPrestige) : undefined,
        minStakes: filters.minStakes ? Number(filters.minStakes) : undefined,
        maxStakes: filters.maxStakes ? Number(filters.maxStakes) : undefined,
        language: filters.language,
        isEducational: filters.isEducational === true,
        tags: filters.tags ? (Array.isArray(filters.tags) ? filters.tags : [filters.tags]) : undefined,
      });
      
      res.status(HttpStatus.OK).json({
        success: true,
        streams,
      });
    } catch (error) {
      this.logger.error(`Failed to get active streams: ${error.message}`);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Get featured stream
   */
  @Get('featured')
  async getFeaturedStream(@Res() res: Response): Promise<void> {
    try {
      const stream = await this.streamingService.getFeaturedStream();
      
      res.status(HttpStatus.OK).json({
        success: true,
        stream,
      });
    } catch (error) {
      this.logger.error(`Failed to get featured stream: ${error.message}`);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Get prestige streamers
   */
  @Get('prestige')
  async getPrestigeStreamers(@Res() res: Response): Promise<void> {
    try {
      const streams = await this.streamingService.getPrestigeStreamers();
      
      res.status(HttpStatus.OK).json({
        success: true,
        streams,
      });
    } catch (error) {
      this.logger.error(`Failed to get prestige streamers: ${error.message}`);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Get stream by ID
   */
  @Get(':streamId')
  async getStream(@Param('streamId') streamId: string, @Res() res: Response): Promise<void> {
    try {
      const stream = await this.streamingService.getStream(streamId);
      if (!stream) {
        throw new HttpException('Stream not found', HttpStatus.NOT_FOUND);
      }
      
      res.status(HttpStatus.OK).json({
        success: true,
        stream,
      });
    } catch (error) {
      this.logger.error(`Failed to get stream: ${error.message}`);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Get stream tips
   */
  @Get(':streamId/tips')
  async getStreamTips(
    @Param('streamId') streamId: string,
    @Res() res: Response,
    @Query('limit') limit?: string
  ): Promise<void> {
    try {
      const limitNum = limit ? parseInt(limit, 10) : 50;
      const tips = await this.streamingService.getStreamTips(streamId, limitNum);
      
      res.status(HttpStatus.OK).json({
        success: true,
        tips,
      });
    } catch (error) {
      this.logger.error(`Failed to get stream tips: ${error.message}`);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Get stream subscriptions
   */
  @Get(':streamId/subscriptions')
  async getStreamSubscriptions(@Param('streamId') streamId: string, @Res() res: Response): Promise<void> {
    try {
      const subscriptions = await this.streamingService.getStreamSubscriptions(streamId);
      
      res.status(HttpStatus.OK).json({
        success: true,
        subscriptions,
      });
    } catch (error) {
      this.logger.error(`Failed to get stream subscriptions: ${error.message}`);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Get streams by category
   */
  @Get('category/:category')
  async getStreamsByCategory(@Param('category') category: StreamCategory, @Res() res: Response): Promise<void> {
    try {
      const streams = await this.streamingService.getStreamsByCategory(category);
      
      res.status(HttpStatus.OK).json({
        success: true,
        streams,
      });
    } catch (error) {
      this.logger.error(`Failed to get streams by category: ${error.message}`);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Get educational streams
   */
  @Get('educational/all')
  async getEducationalStreams(@Res() res: Response): Promise<void> {
    try {
      const streams = await this.streamingService.getEducationalStreams();
      
      res.status(HttpStatus.OK).json({
        success: true,
        streams,
      });
    } catch (error) {
      this.logger.error(`Failed to get educational streams: ${error.message}`);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Get high stakes streams
   */
  @Get('high-stakes/all')
  async getHighStakesStreams(@Res() res: Response, @Query('minStakes') minStakes?: string): Promise<void> {
    try {
      const minStakesNum = minStakes ? Number(minStakes) : 10;
      const streams = await this.streamingService.getHighStakesStreams(minStakesNum);
      
      res.status(HttpStatus.OK).json({
        success: true,
        streams,
      });
    } catch (error) {
      this.logger.error(`Failed to get high stakes streams: ${error.message}`);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Get tournament streams
   */
  @Get('tournaments/all')
  async getTournamentStreams(@Res() res: Response): Promise<void> {
    try {
      const streams = await this.streamingService.getTournamentStreams();
      
      res.status(HttpStatus.OK).json({
        success: true,
        streams,
      });
    } catch (error) {
      this.logger.error(`Failed to get tournament streams: ${error.message}`);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
} 