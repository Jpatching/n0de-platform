import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class LeaderboardService {
  constructor(private prisma: PrismaService) {}

  async getEarningsLeaderboard(limit: number = 50): Promise<any[]> {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        wallet: true,
        username: true,
        displayName: true,
        totalEarnings: true,
        totalMatches: true,
        wins: true,
        winRate: true,
        prestige: true,
        proofPoints: true
      },
      orderBy: {
        totalEarnings: 'desc'
      },
      take: limit,
      where: {
        totalMatches: {
          gt: 0 // Only include users who have played games
        }
      }
    });

    return users.map((user, index) => ({
      rank: index + 1,
      walletAddress: user.wallet,
      username: user.username || user.displayName || 'Anonymous',
      totalEarnings: user.totalEarnings,
      totalMatches: user.totalMatches,
      wins: user.wins,
      winRate: user.winRate,
      prestige: user.prestige,
      proofPoints: user.proofPoints
    }));
  }

  async getWinsLeaderboard(limit: number = 50): Promise<any[]> {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        wallet: true,
        username: true,
        displayName: true,
        wins: true,
        totalMatches: true,
        totalEarnings: true,
        winRate: true,
        prestige: true,
        proofPoints: true
      },
      orderBy: {
        wins: 'desc'
      },
      take: limit,
      where: {
        totalMatches: {
          gt: 0
        }
      }
    });

    return users.map((user, index) => ({
      rank: index + 1,
      walletAddress: user.wallet,
      username: user.username || user.displayName || 'Anonymous',
      wins: user.wins,
      totalMatches: user.totalMatches,
      totalEarnings: user.totalEarnings,
      winRate: user.winRate,
      prestige: user.prestige,
      proofPoints: user.proofPoints
    }));
  }

  async getWinrateLeaderboard(limit: number = 50): Promise<any[]> {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        wallet: true,
        username: true,
        displayName: true,
        winRate: true,
        wins: true,
        totalMatches: true,
        totalEarnings: true,
        prestige: true,
        proofPoints: true
      },
      orderBy: {
        winRate: 'desc'
      },
      take: limit,
      where: {
        totalMatches: {
          gte: 10 // Only include users with at least 10 matches for meaningful win rate
        }
      }
    });

    return users.map((user, index) => ({
      rank: index + 1,
      walletAddress: user.wallet,
      username: user.username || user.displayName || 'Anonymous',
      winRate: user.winRate,
      wins: user.wins,
      totalMatches: user.totalMatches,
      totalEarnings: user.totalEarnings,
      prestige: user.prestige,
      proofPoints: user.proofPoints
    }));
  }

  /**
   * Get game-specific leaderboards (including coinflip)
   */
  async getGameTypeLeaderboard(gameType: string, limit: number = 50): Promise<any[]> {
    // Get all completed matches for the specific game type
    const matches = await this.prisma.match.findMany({
      where: {
        gameType: gameType,
        status: 'completed',
        winnerId: {
          not: null
        }
      },
      include: {
        player1: {
          select: { id: true, wallet: true, username: true, displayName: true }
        },
        player2: {
          select: { id: true, wallet: true, username: true, displayName: true }
        },
        winner: {
          select: { id: true, wallet: true, username: true, displayName: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Calculate stats per user for this game type
    const userStats = new Map();

    matches.forEach(match => {
      // Process player 1
      if (!userStats.has(match.player1.id)) {
        userStats.set(match.player1.id, {
          user: match.player1,
          wins: 0,
          losses: 0,
          totalMatches: 0,
          totalEarnings: 0
        });
      }
      const p1Stats = userStats.get(match.player1.id);
      p1Stats.totalMatches++;
      if (match.winnerId === match.player1.id) {
        p1Stats.wins++;
        p1Stats.totalEarnings += match.wager * 2 * 0.935; // Winner gets wager * 2 minus 6.5% fee
      } else {
        p1Stats.losses++;
        p1Stats.totalEarnings -= match.wager; // Loser loses their wager
      }

      // Process player 2
      if (match.player2) {
        if (!userStats.has(match.player2.id)) {
          userStats.set(match.player2.id, {
            user: match.player2,
            wins: 0,
            losses: 0,
            totalMatches: 0,
            totalEarnings: 0
          });
        }
        const p2Stats = userStats.get(match.player2.id);
        p2Stats.totalMatches++;
        if (match.winnerId === match.player2.id) {
          p2Stats.wins++;
          p2Stats.totalEarnings += match.wager * 2 * 0.935;
        } else {
          p2Stats.losses++;
          p2Stats.totalEarnings -= match.wager;
        }
      }
    });

    // Convert to array and sort by wins
    const leaderboard = Array.from(userStats.values())
      .map(stats => ({
        ...stats,
        winRate: stats.totalMatches > 0 ? stats.wins / stats.totalMatches : 0
      }))
      .sort((a, b) => b.wins - a.wins)
      .slice(0, limit);

    return leaderboard.map((stats, index) => ({
      rank: index + 1,
      walletAddress: stats.user.wallet,
      username: stats.user.username || stats.user.displayName || 'Anonymous',
      wins: stats.wins,
      losses: stats.losses,
      totalMatches: stats.totalMatches,
      winRate: stats.winRate,
      totalEarnings: stats.totalEarnings,
      gameType: gameType
    }));
  }

  /**
   * Get recent match results for Oracle verification display
   */
  async getRecentVerifiableMatches(limit: number = 20): Promise<any[]> {
    const matches = await this.prisma.match.findMany({
      where: {
        status: 'completed',
        winnerId: {
          not: null
        },
        // Only include matches with cryptographic proof
        gameData: {
          path: ['cryptographicProof'],
          not: null
        }
      },
      include: {
        player1: {
          select: { id: true, wallet: true, username: true, displayName: true }
        },
        player2: {
          select: { id: true, wallet: true, username: true, displayName: true }
        },
        winner: {
          select: { id: true, wallet: true, username: true, displayName: true }
        }
      },
      orderBy: {
        endedAt: 'desc'
      },
      take: limit
    });

    return matches.map(match => ({
      matchId: match.id,
      gameType: match.gameType,
      wager: match.wager,
      player1: {
        wallet: match.player1.wallet,
        username: match.player1.username || match.player1.displayName || 'Anonymous'
      },
      player2: match.player2 ? {
        wallet: match.player2.wallet,
        username: match.player2.username || match.player2.displayName || 'Anonymous'
      } : null,
      winner: match.winner ? {
        wallet: match.winner.wallet,
        username: match.winner.username || match.winner.displayName || 'Anonymous'
      } : null,
      completedAt: match.endedAt,
      hasProof: !!(match.gameData as any)?.cryptographicProof,
      escrowAddress: match.escrowAddress,
      transactionId: match.transactionId
    }));
  }

  /**
   * Update leaderboard cache (called after each match completion)
   */
  async updateLeaderboardCache(): Promise<void> {
    // Update cached leaderboard data
    const earningsData = await this.getEarningsLeaderboard(100);
    const winsData = await this.getWinsLeaderboard(100);
    const winrateData = await this.getWinrateLeaderboard(100);

    // Store in Leaderboard table for fast access
    await this.prisma.leaderboard.upsert({
      where: { type_period: { type: 'earnings', period: 'alltime' } },
      update: { 
        data: earningsData,
        updatedAt: new Date()
      },
      create: {
        type: 'earnings',
        period: 'alltime',
        data: earningsData
      }
    });

    await this.prisma.leaderboard.upsert({
      where: { type_period: { type: 'wins', period: 'alltime' } },
      update: { 
        data: winsData,
        updatedAt: new Date()
      },
      create: {
        type: 'wins',
        period: 'alltime',
        data: winsData
      }
    });

    await this.prisma.leaderboard.upsert({
      where: { type_period: { type: 'winrate', period: 'alltime' } },
      update: { 
        data: winrateData,
        updatedAt: new Date()
      },
      create: {
        type: 'winrate',
        period: 'alltime',
        data: winrateData
      }
    });
  }
} 