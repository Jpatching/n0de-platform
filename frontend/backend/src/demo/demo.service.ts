import { Injectable, Logger } from '@nestjs/common';
import { MatchService } from '../match/match.service';
import { ChessService } from '../games/chess.service';
import { CoinFlipService } from '../games/coinflip.service';
import { CreateDemoMatchDto } from './dto/create-demo-match.dto';
import { JoinDemoMatchDto } from './dto/join-demo-match.dto';
import { DemoMatchResultDto } from './dto/demo-match-result.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class DemoService {
  private readonly logger = new Logger(DemoService.name);
  private readonly demoMatches = new Map<string, any>();
  private readonly demoPlayers = new Map<string, any>();

  constructor(
    private readonly matchService: MatchService,
    private readonly chessService: ChessService,
    private readonly coinflipService: CoinFlipService,
  ) {}

  /**
   * Create a demo match without SOL requirements
   */
  async createDemoMatch(dto: CreateDemoMatchDto) {
    try {
      const matchId = `demo_${dto.gameType}_${uuidv4()}`;
      const playerId = dto.playerId || `demo_${uuidv4()}`;

      // Create player object for demo
      const player1 = {
        id: playerId,
        wallet: `demo_wallet_${playerId}`,
        username: dto.username || `Player_${playerId.slice(0, 6)}`,
      };

      // Store demo player
      this.demoPlayers.set(playerId, player1);

      // Create match object
      const match = {
        id: matchId,
        gameType: dto.gameType,
        wager: 0, // No real wager for demo
        status: 'pending',
        player1,
        player2: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() + dto.expiryMinutes * 60 * 1000),
        escrowAddress: null, // No escrow for demo
        isDemo: true,
      };

      // Store match
      this.demoMatches.set(matchId, match);

      this.logger.log(`Demo match created: ${matchId} for game ${dto.gameType}`);

      return {
        success: true,
        match,
        matchId,
        playerId,
      };
    } catch (error) {
      this.logger.error(`Failed to create demo match: ${error.message}`);
      throw error;
    }
  }

  /**
   * Join a demo match
   */
  async joinDemoMatch(matchId: string, dto: JoinDemoMatchDto) {
    try {
      const match = this.demoMatches.get(matchId);
      
      if (!match) {
        throw new Error('Match not found');
      }

      if (match.status !== 'pending') {
        throw new Error('Match is not available for joining');
      }

      if (match.player1.id === dto.playerId) {
        throw new Error('Cannot join your own match');
      }

      const playerId = dto.playerId || `demo_${uuidv4()}`;
      
      // Create player 2
      const player2 = {
        id: playerId,
        wallet: `demo_wallet_${playerId}`,
        username: dto.username || `Player_${playerId.slice(0, 6)}`,
      };

      // Store demo player
      this.demoPlayers.set(playerId, player2);

      // Update match
      match.player2 = player2;
      match.status = 'in_progress';
      match.startedAt = new Date();
      match.updatedAt = new Date();

      this.logger.log(`Player ${playerId} joined demo match ${matchId}`);

      return {
        success: true,
        message: 'Successfully joined match',
        match,
      };
    } catch (error) {
      this.logger.error(`Failed to join demo match: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get available demo matches
   */
  async getAvailableDemoMatches(gameType?: string) {
    try {
      const now = Date.now();
      const matches = Array.from(this.demoMatches.values()).filter(match => {
        return match.status === 'pending' && 
               match.expiresAt.getTime() > now &&
               (!gameType || match.gameType === gameType);
      });

      return {
        success: true,
        matches,
      };
    } catch (error) {
      this.logger.error(`Failed to get available demo matches: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get demo match by ID
   */
  async getDemoMatch(matchId: string) {
    const match = this.demoMatches.get(matchId);
    
    if (!match) {
      throw new Error('Match not found');
    }

    return {
      success: true,
      match,
    };
  }

  /**
   * Submit demo match result
   */
  async submitDemoMatchResult(matchId: string, dto: DemoMatchResultDto) {
    try {
      const match = this.demoMatches.get(matchId);
      
      if (!match) {
        throw new Error('Match not found');
      }

      if (match.status !== 'in_progress') {
        throw new Error('Match is not in progress');
      }

      // Update match with result
      match.status = 'completed';
      match.completedAt = new Date();
      match.updatedAt = new Date();
      match.winner = dto.winnerId ? 
        (match.player1.id === dto.winnerId ? match.player1 : match.player2) : 
        null;
      match.gameData = dto.gameState;

      this.logger.log(`Demo match ${matchId} completed. Winner: ${dto.winnerId || 'Draw'}`);

      // Clean up match after some time
      setTimeout(() => {
        this.demoMatches.delete(matchId);
      }, 5 * 60 * 1000); // 5 minutes

      return {
        success: true,
        match,
      };
    } catch (error) {
      this.logger.error(`Failed to submit demo match result: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cancel demo match
   */
  async cancelDemoMatch(matchId: string) {
    try {
      const match = this.demoMatches.get(matchId);
      
      if (!match) {
        throw new Error('Match not found');
      }

      if (match.status !== 'pending') {
        throw new Error('Can only cancel pending matches');
      }

      this.demoMatches.delete(matchId);

      this.logger.log(`Demo match ${matchId} cancelled`);

      return {
        success: true,
        message: 'Match cancelled successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to cancel demo match: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get demo player matches
   */
  async getDemoPlayerMatches(playerId: string) {
    try {
      const matches = Array.from(this.demoMatches.values()).filter(match => {
        return (match.player1?.id === playerId || match.player2?.id === playerId);
      });

      return {
        success: true,
        matches: matches.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
      };
    } catch (error) {
      this.logger.error(`Failed to get demo player matches: ${error.message}`);
      throw error;
    }
  }

  /**
   * Clean up expired demo matches
   */
  async cleanupExpiredMatches() {
    const now = Date.now();
    let cleaned = 0;

    for (const [matchId, match] of this.demoMatches.entries()) {
      if (match.status === 'pending' && match.expiresAt.getTime() < now) {
        this.demoMatches.delete(matchId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.log(`Cleaned up ${cleaned} expired demo matches`);
    }
  }

  /**
   * Get demo stats
   */
  async getDemoStats() {
    const stats = {
      totalMatches: this.demoMatches.size,
      pendingMatches: 0,
      inProgressMatches: 0,
      completedMatches: 0,
      totalPlayers: this.demoPlayers.size,
      gameTypes: new Map<string, number>(),
    };

    for (const match of this.demoMatches.values()) {
      switch (match.status) {
        case 'pending':
          stats.pendingMatches++;
          break;
        case 'in_progress':
          stats.inProgressMatches++;
          break;
        case 'completed':
          stats.completedMatches++;
          break;
      }

      const gameCount = stats.gameTypes.get(match.gameType) || 0;
      stats.gameTypes.set(match.gameType, gameCount + 1);
    }

    return stats;
  }
}