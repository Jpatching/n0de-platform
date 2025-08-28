import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete,
  Body, 
  Param,
  Query,
  BadRequestException,
  NotFoundException,
  Logger
} from '@nestjs/common';
import { DemoService } from './demo.service';
import { CreateDemoMatchDto } from './dto/create-demo-match.dto';
import { JoinDemoMatchDto } from './dto/join-demo-match.dto';
import { DemoMatchResultDto } from './dto/demo-match-result.dto';

@Controller('api/demo')
export class DemoController {
  private readonly logger = new Logger(DemoController.name);

  constructor(private readonly demoService: DemoService) {}

  /**
   * Create a new demo match
   */
  @Post('matches')
  async createMatch(@Body() dto: CreateDemoMatchDto) {
    try {
      return await this.demoService.createDemoMatch(dto);
    } catch (error) {
      this.logger.error(`Failed to create demo match: ${error.message}`);
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Join an existing demo match
   */
  @Put('matches/:matchId/join')
  async joinMatch(
    @Param('matchId') matchId: string,
    @Body() dto: JoinDemoMatchDto
  ) {
    try {
      return await this.demoService.joinDemoMatch(matchId, dto);
    } catch (error) {
      this.logger.error(`Failed to join demo match: ${error.message}`);
      if (error.message === 'Match not found') {
        throw new NotFoundException(error.message);
      }
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Get available demo matches
   */
  @Get('matches/available')
  async getAvailableMatches(@Query('gameType') gameType?: string) {
    try {
      return await this.demoService.getAvailableDemoMatches(gameType);
    } catch (error) {
      this.logger.error(`Failed to get available matches: ${error.message}`);
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Get a specific demo match
   */
  @Get('matches/:matchId')
  async getMatch(@Param('matchId') matchId: string) {
    try {
      return await this.demoService.getDemoMatch(matchId);
    } catch (error) {
      this.logger.error(`Failed to get demo match: ${error.message}`);
      if (error.message === 'Match not found') {
        throw new NotFoundException(error.message);
      }
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Submit demo match result
   */
  @Put('matches/:matchId/result')
  async submitResult(
    @Param('matchId') matchId: string,
    @Body() dto: DemoMatchResultDto
  ) {
    try {
      return await this.demoService.submitDemoMatchResult(matchId, dto);
    } catch (error) {
      this.logger.error(`Failed to submit match result: ${error.message}`);
      if (error.message === 'Match not found') {
        throw new NotFoundException(error.message);
      }
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Cancel a demo match
   */
  @Delete('matches/:matchId')
  async cancelMatch(@Param('matchId') matchId: string) {
    try {
      return await this.demoService.cancelDemoMatch(matchId);
    } catch (error) {
      this.logger.error(`Failed to cancel demo match: ${error.message}`);
      if (error.message === 'Match not found') {
        throw new NotFoundException(error.message);
      }
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Get player's demo matches
   */
  @Get('players/:playerId/matches')
  async getPlayerMatches(@Param('playerId') playerId: string) {
    try {
      return await this.demoService.getDemoPlayerMatches(playerId);
    } catch (error) {
      this.logger.error(`Failed to get player matches: ${error.message}`);
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Get demo stats
   */
  @Get('stats')
  async getStats() {
    try {
      return await this.demoService.getDemoStats();
    } catch (error) {
      this.logger.error(`Failed to get demo stats: ${error.message}`);
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Health check endpoint
   */
  @Get('health')
  async health() {
    return {
      status: 'ok',
      service: 'demo',
      timestamp: new Date().toISOString(),
    };
  }
}