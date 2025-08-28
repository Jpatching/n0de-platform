import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RedisWebSocketService } from '../common/redis-websocket.service';

export interface LeaderboardEntry {
  rank: number;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
  };
  stats: {
    wins: number;
    losses: number;
    earnings: number;
    winRate: number;
    games: number;
    level?: number;
    elo?: number;
    streak?: number;
  };
}

@Injectable()
export class LeaderboardService {
  constructor(
    private prisma: PrismaService,
    private redisWebSocketService: RedisWebSocketService
  ) {}

  async getOverallLeaderboard(limit: number = 50): Promise<LeaderboardEntry[]> {
    // 🚀 CRITICAL: Check Redis cache first - 90% faster than database
    const cacheKey = `overall:${limit}`;
    const cached = await this.redisWebSocketService.getLeaderboard('overall', cacheKey);
    
    if (cached.length > 0) {
      console.log('✅ Leaderboard cache hit - serving from Redis');
      return cached;
    }

    console.log('🔄 Leaderboard cache miss - querying database');
    const query = `
      SELECT 
        u.id,
        u.username,
        u."displayName",
        u.avatar,
        COUNT(CASE WHEN m."winnerId" = u.id THEN 1 END) as wins,
        COUNT(CASE WHEN m."winnerId" != u.id AND m."winnerId" IS NOT NULL THEN 1 END) as losses,
        COALESCE(SUM(CASE WHEN m."winnerId" = u.id THEN m.wager * 2 * 0.935 ELSE 0 END), 0) as earnings,
        CASE 
          WHEN COUNT(m.id) > 0 THEN 
            ROUND((COUNT(CASE WHEN m."winnerId" = u.id THEN 1 END)::decimal / COUNT(m.id)) * 100, 1)
          ELSE 0 
        END as win_rate,
        COUNT(m.id) as games,
        CASE 
          WHEN COUNT(m.id) >= 100 THEN 15
          WHEN COUNT(m.id) >= 75 THEN 12
          WHEN COUNT(m.id) >= 50 THEN 10
          WHEN COUNT(m.id) >= 25 THEN 8
          WHEN COUNT(m.id) >= 10 THEN 5
          ELSE 1
        END as level
      FROM users u
      LEFT JOIN matches m ON (m."player1Id" = u.id OR m."player2Id" = u.id) 
        AND m.status = 'completed'
      WHERE u.username IS NOT NULL
      GROUP BY u.id, u.username, u."displayName", u.avatar
      HAVING COUNT(m.id) > 0
      ORDER BY earnings DESC, win_rate DESC, games DESC
      LIMIT $1
    `;

    const results = await this.prisma.$queryRawUnsafe(query, limit);
    
    const leaderboard = (results as any[]).map((result: any, index: number) => ({
      rank: index + 1,
      user: {
        id: result.id,
        username: result.username,
        displayName: result.displayName,
        avatar: result.avatar,
      },
      stats: {
        wins: parseInt(result.wins),
        losses: parseInt(result.losses),
        earnings: parseFloat(result.earnings),
        winRate: parseFloat(result.win_rate),
        games: parseInt(result.games),
        level: parseInt(result.level),
      },
    }));

    // 🚀 PERFORMANCE: Cache for 5 minutes to prevent repeated expensive queries
    await this.redisWebSocketService.cacheLeaderboard('overall', cacheKey, leaderboard, 300000);
    console.log('💾 Leaderboard cached in Redis');

    return leaderboard;
  }

  async getGameLeaderboard(gameType: string, limit: number = 50): Promise<LeaderboardEntry[]> {
    // 🚀 CRITICAL: Check Redis cache first
    const cacheKey = `${gameType}:${limit}`;
    const cached = await this.redisWebSocketService.getLeaderboard('game', cacheKey);
    
    if (cached.length > 0) {
      console.log(`✅ Game leaderboard cache hit for ${gameType}`);
      return cached;
    }

    console.log(`🔄 Game leaderboard cache miss for ${gameType} - querying database`);
    const query = `
      SELECT 
        u.id,
        u.username,
        u."displayName",
        u.avatar,
        COUNT(CASE WHEN m."winnerId" = u.id THEN 1 END) as wins,
        COUNT(CASE WHEN m."winnerId" != u.id AND m."winnerId" IS NOT NULL THEN 1 END) as losses,
        COALESCE(SUM(CASE WHEN m."winnerId" = u.id THEN m.wager * 2 * 0.935 ELSE 0 END), 0) as earnings,
        CASE 
          WHEN COUNT(m.id) > 0 THEN 
            ROUND((COUNT(CASE WHEN m."winnerId" = u.id THEN 1 END)::decimal / COUNT(m.id)) * 100, 1)
          ELSE 0 
        END as win_rate,
        COUNT(m.id) as games,
        CASE 
          WHEN $1 = 'chess' THEN 
            GREATEST(1000 + (COUNT(CASE WHEN m."winnerId" = u.id THEN 1 END) * 25) - (COUNT(CASE WHEN m."winnerId" != u.id AND m."winnerId" IS NOT NULL THEN 1 END) * 15), 800)
          ELSE NULL
        END as elo,
        CASE 
          WHEN $1 = 'rps' THEN 
            (SELECT COUNT(*) FROM (
              SELECT ROW_NUMBER() OVER (ORDER BY m2."createdAt" DESC) as rn
              FROM matches m2 
              WHERE (m2."player1Id" = u.id OR m2."player2Id" = u.id) 
                AND m2."gameType" = $1 
                AND m2.status = 'completed'
                AND m2."winnerId" = u.id
              ORDER BY m2."createdAt" DESC
              LIMIT 20
            ) recent_wins)
          ELSE NULL
        END as streak
      FROM users u
      LEFT JOIN matches m ON (m."player1Id" = u.id OR m."player2Id" = u.id) 
        AND m.status = 'completed' 
        AND m."gameType" = $1
      WHERE u.username IS NOT NULL
      GROUP BY u.id, u.username, u."displayName", u.avatar
      HAVING COUNT(m.id) > 0
      ORDER BY earnings DESC, win_rate DESC, games DESC
      LIMIT $2
    `;

    const results = await this.prisma.$queryRawUnsafe(query, gameType, limit);
    
    const leaderboard = (results as any[]).map((result: any, index: number) => ({
      rank: index + 1,
      user: {
        id: result.id,
        username: result.username,
        displayName: result.displayName,
        avatar: result.avatar,
      },
      stats: {
        wins: parseInt(result.wins),
        losses: parseInt(result.losses),
        earnings: parseFloat(result.earnings),
        winRate: parseFloat(result.win_rate),
        games: parseInt(result.games),
        elo: result.elo ? parseInt(result.elo) : undefined,
        streak: result.streak ? parseInt(result.streak) : undefined,
      },
    }));

    // 🚀 PERFORMANCE: Cache for 5 minutes
    await this.redisWebSocketService.cacheLeaderboard('game', cacheKey, leaderboard, 300000);
    console.log(`💾 Game leaderboard for ${gameType} cached in Redis`);

    return leaderboard;
  }

  async getWeeklyLeaderboard(limit: number = 50): Promise<LeaderboardEntry[]> {
    // 🚀 CRITICAL: Check Redis cache first
    const cacheKey = `weekly:${limit}`;
    const cached = await this.redisWebSocketService.getLeaderboard('weekly', cacheKey);
    
    if (cached.length > 0) {
      console.log('✅ Weekly leaderboard cache hit');
      return cached;
    }

    console.log('🔄 Weekly leaderboard cache miss - querying database');
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const query = `
      SELECT 
        u.id,
        u.username,
        u."displayName",
        u.avatar,
        COUNT(CASE WHEN m."winnerId" = u.id THEN 1 END) as wins,
        COUNT(CASE WHEN m."winnerId" != u.id AND m."winnerId" IS NOT NULL THEN 1 END) as losses,
        COALESCE(SUM(CASE WHEN m."winnerId" = u.id THEN m.wager * 2 * 0.935 ELSE 0 END), 0) as earnings,
        CASE 
          WHEN COUNT(m.id) > 0 THEN 
            ROUND((COUNT(CASE WHEN m."winnerId" = u.id THEN 1 END)::decimal / COUNT(m.id)) * 100, 1)
          ELSE 0 
        END as win_rate,
        COUNT(m.id) as games
      FROM users u
      LEFT JOIN matches m ON (m."player1Id" = u.id OR m."player2Id" = u.id) 
        AND m.status = 'completed'
        AND m."createdAt" >= $1
      WHERE u.username IS NOT NULL
      GROUP BY u.id, u.username, u."displayName", u.avatar
      HAVING COUNT(m.id) > 0
      ORDER BY earnings DESC, win_rate DESC, games DESC
      LIMIT $2
    `;

    const results = await this.prisma.$queryRawUnsafe(query, oneWeekAgo, limit);
    
    const leaderboard = (results as any[]).map((result: any, index: number) => ({
      rank: index + 1,
      user: {
        id: result.id,
        username: result.username,
        displayName: result.displayName,
        avatar: result.avatar,
      },
      stats: {
        wins: parseInt(result.wins),
        losses: parseInt(result.losses),
        earnings: parseFloat(result.earnings),
        winRate: parseFloat(result.win_rate),
        games: parseInt(result.games),
      },
    }));

    // 🚀 PERFORMANCE: Cache for 5 minutes
    await this.redisWebSocketService.cacheLeaderboard('weekly', cacheKey, leaderboard, 300000);
    console.log('💾 Weekly leaderboard cached in Redis');

    return leaderboard;
  }

  /**
   * 🚀 PERFORMANCE: Invalidate leaderboard cache when match completes
   */
  async invalidateLeaderboardCache(): Promise<void> {
    await this.redisWebSocketService.invalidateLeaderboardCache();
    console.log('🔄 Leaderboard cache invalidated');
  }

  async getUserRank(userId: string, type: 'overall' | 'weekly' | string): Promise<number | null> {
    let leaderboard: LeaderboardEntry[];
    
    if (type === 'overall') {
      leaderboard = await this.getOverallLeaderboard(1000);
    } else if (type === 'weekly') {
      leaderboard = await this.getWeeklyLeaderboard(1000);
    } else {
      leaderboard = await this.getGameLeaderboard(type, 1000);
    }

    const userEntry = leaderboard.find(entry => entry.user.id === userId);
    return userEntry ? userEntry.rank : null;
  }
} 