import { Controller, Get, Query, Headers, UnauthorizedException } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';
import { AuthService } from '../auth/auth.service';

@Controller('leaderboard')
export class LeaderboardController {
  constructor(
    private readonly leaderboardService: LeaderboardService,
    private readonly authService: AuthService,
  ) {}

  @Get('earnings')
  async getEarningsLeaderboard(
    @Query('period') period: string = 'alltime',
    @Query('limit') limit: string = '50'
  ) {
    const leaderboard = await this.leaderboardService.getEarningsLeaderboard(
      parseInt(limit, 10)
    );
    return { leaderboard };
  }

  @Get('wins')
  async getWinsLeaderboard(
    @Query('period') period: string = 'alltime',
    @Query('limit') limit: string = '50'
  ) {
    const leaderboard = await this.leaderboardService.getWinsLeaderboard(
      parseInt(limit, 10)
    );
    return { leaderboard };
  }

  @Get('winrate')
  async getWinRateLeaderboard(
    @Query('period') period: string = 'alltime',
    @Query('limit') limit: string = '50'
  ) {
    const leaderboard = await this.leaderboardService.getWinrateLeaderboard(
      parseInt(limit, 10)
    );
    return { leaderboard };
  }

  /**
   * Get user's position in leaderboards
   */
  @Get('my-position')
  async getMyPosition(@Headers('authorization') auth: string) {
    const session = await this.validateSession(auth);
    
    // Get all leaderboards and find user position
    const [earningsBoard, winsBoard, winrateBoard] = await Promise.all([
      this.leaderboardService.getEarningsLeaderboard(1000),
      this.leaderboardService.getWinsLeaderboard(1000),
      this.leaderboardService.getWinrateLeaderboard(1000)
    ]);

    const findUserPosition = (board: any[], userId: string) => {
      const position = board.findIndex(entry => entry.walletAddress === session.wallet);
      return position === -1 ? null : position + 1;
    };

    return {
      success: true,
      positions: {
        earnings: findUserPosition(earningsBoard, session.userId),
        wins: findUserPosition(winsBoard, session.userId),
        winrate: findUserPosition(winrateBoard, session.userId)
      }
    };
  }

  private async validateSession(authHeader: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid authorization header');
    }
    const sessionId = authHeader.substring(7);
    const session = await this.authService.validateSession(sessionId);
    if (!session) {
      throw new UnauthorizedException('Invalid session');
    }
    return session;
  }
} 