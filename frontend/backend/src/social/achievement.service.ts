import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export enum AchievementRarity {
  COMMON = 'common',
  UNCOMMON = 'uncommon',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary',
}

export interface AchievementWithProgress {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: AchievementRarity;
  targetValue: number;
  progress: number;
  isUnlocked: boolean;
  unlockedAt?: Date;
  progressPercentage: number;
}

export interface AchievementStats {
  totalAchievements: number;
  unlockedAchievements: number;
  completionPercentage: number;
  rarityBreakdown: {
    [key in AchievementRarity]: {
      total: number;
      unlocked: number;
    };
  };
}

@Injectable()
export class AchievementService {
  constructor(
    private prisma: PrismaService,
  ) {}

  async initializeDefaultAchievements(): Promise<void> {
    const defaultAchievements = [
      {
        name: 'First Victory',
        description: 'Win your first match',
        icon: '🏆',
        rarity: AchievementRarity.COMMON,
        targetValue: 1,
        key: 'first_win',
      },
      {
        name: 'Winning Streak',
        description: 'Win 5 matches in a row',
        icon: '🔥',
        rarity: AchievementRarity.UNCOMMON,
        targetValue: 5,
        key: 'win_streak_5',
      },
      {
        name: 'High Roller',
        description: 'Win a match with a wager of 100+ coins',
        icon: '💰',
        rarity: AchievementRarity.RARE,
        targetValue: 1,
        key: 'high_roller',
      },
      {
        name: 'Chess Master',
        description: 'Win 50 chess matches',
        icon: '♟️',
        rarity: AchievementRarity.EPIC,
        targetValue: 50,
        key: 'chess_master',
      },
      {
        name: 'Rock Paper Scissors Champion',
        description: 'Win 100 RPS matches',
        icon: '✂️',
        rarity: AchievementRarity.EPIC,
        targetValue: 100,
        key: 'rps_champion',
      },
      {
        name: 'Lucky Coin',
        description: 'Win 25 coinflip matches',
        icon: '🪙',
        rarity: AchievementRarity.RARE,
        targetValue: 25,
        key: 'lucky_coin',
      },
      {
        name: 'Dice Master',
        description: 'Win 50 dice roll matches',
        icon: '🎲',
        rarity: AchievementRarity.EPIC,
        targetValue: 50,
        key: 'dice_master',
      },
      {
        name: 'Legend',
        description: 'Win 500 total matches',
        icon: '👑',
        rarity: AchievementRarity.LEGENDARY,
        targetValue: 500,
        key: 'legend',
      },
    ];

    for (const achievementData of defaultAchievements) {
      const existing = await this.prisma.achievement.findUnique({
        where: { key: achievementData.key },
      });

      if (!existing) {
        await this.prisma.achievement.create({
          data: achievementData,
        });
      }
    }
  }

  async getUserAchievements(userId: string): Promise<AchievementWithProgress[]> {
    const achievements = await this.prisma.achievement.findMany({
      where: { isActive: true },
      orderBy: [{ rarity: 'asc' }, { name: 'asc' }],
    });

    const userAchievements = await this.prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
    });

    const userAchievementMap = new Map(
      userAchievements.map(ua => [ua.achievementId, ua])
    );

    return achievements.map(achievement => {
      const userAchievement = userAchievementMap.get(achievement.id);
      const progress = userAchievement?.progress || 0;
      const progressPercentage = Math.min((progress / achievement.targetValue) * 100, 100);

      return {
        id: achievement.id,
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        rarity: achievement.rarity as AchievementRarity,
        targetValue: achievement.targetValue,
        progress,
        isUnlocked: userAchievement?.isUnlocked || false,
        unlockedAt: userAchievement?.unlockedAt || undefined,
        progressPercentage,
      };
    });
  }

  async getAchievementStats(userId: string): Promise<AchievementStats> {
    const achievements = await this.getUserAchievements(userId);
    const totalAchievements = achievements.length;
    const unlockedAchievements = achievements.filter(a => a.isUnlocked).length;
    const completionPercentage = totalAchievements > 0 
      ? Math.round((unlockedAchievements / totalAchievements) * 100) 
      : 0;

    const rarityBreakdown = Object.values(AchievementRarity).reduce((acc, rarity) => {
      const total = achievements.filter(a => a.rarity === rarity).length;
      const unlocked = achievements.filter(a => a.rarity === rarity && a.isUnlocked).length;
      acc[rarity] = { total, unlocked };
      return acc;
    }, {} as AchievementStats['rarityBreakdown']);

    return {
      totalAchievements,
      unlockedAchievements,
      completionPercentage,
      rarityBreakdown,
    };
  }

  async updateAchievementProgress(userId: string): Promise<any[]> {
    const newlyUnlocked: any[] = [];

    // Get user's match statistics
    const userStats = await this.getUserMatchStats(userId);

    // Check each achievement
    const achievements = await this.prisma.achievement.findMany({
      where: { isActive: true },
    });

    for (const achievement of achievements) {
      const currentProgress = await this.calculateProgress(userId, achievement.key, userStats);
      
      let userAchievement = await this.prisma.userAchievement.findUnique({
        where: { 
          userId_achievementId: {
            userId,
            achievementId: achievement.id,
          }
        },
      });

      if (!userAchievement) {
        userAchievement = await this.prisma.userAchievement.create({
          data: {
            userId,
            achievementId: achievement.id,
            progress: currentProgress,
            isUnlocked: currentProgress >= achievement.targetValue,
            unlockedAt: currentProgress >= achievement.targetValue ? new Date() : null,
          },
        });
      } else {
        const wasUnlocked = userAchievement.isUnlocked;
        
        userAchievement = await this.prisma.userAchievement.update({
          where: { id: userAchievement.id },
          data: {
            progress: currentProgress,
            isUnlocked: currentProgress >= achievement.targetValue,
            unlockedAt: !wasUnlocked && currentProgress >= achievement.targetValue ? new Date() : userAchievement.unlockedAt,
          },
        });
        
        if (!wasUnlocked && currentProgress >= achievement.targetValue) {
          newlyUnlocked.push(achievement);
        }
      }
    }

    return newlyUnlocked;
  }

  private async getUserMatchStats(userId: string) {
    const query = `
      SELECT 
        COUNT(*) as total_matches,
        COUNT(CASE WHEN winner = $1 THEN 1 END) as total_wins,
        COUNT(CASE WHEN winner = $1 AND "gameType" = 'chess' THEN 1 END) as chess_wins,
        COUNT(CASE WHEN winner = $1 AND "gameType" = 'rps' THEN 1 END) as rps_wins,
        COUNT(CASE WHEN winner = $1 AND "gameType" = 'coinflip' THEN 1 END) as coinflip_wins,
        COUNT(CASE WHEN winner = $1 AND "gameType" = 'dice' THEN 1 END) as dice_wins,
        COUNT(CASE WHEN winner = $1 AND wager >= 100 THEN 1 END) as high_roller_wins
      FROM matches m
      WHERE ("player1Id" = $1 OR "player2Id" = $1) AND status = 'completed'
    `;

    const result = await this.prisma.$queryRawUnsafe(query, userId);
    return (result as any[])[0] || {};
  }

  private async calculateProgress(userId: string, achievementKey: string, userStats: any): Promise<number> {
    switch (achievementKey) {
      case 'first_win':
        return Math.min(parseInt(userStats.total_wins) || 0, 1);
      
      case 'win_streak_5':
        // This would need a more complex query to calculate win streaks
        return 0; // Simplified for now
      
      case 'high_roller':
        return Math.min(parseInt(userStats.high_roller_wins) || 0, 1);
      
      case 'chess_master':
        return parseInt(userStats.chess_wins) || 0;
      
      case 'rps_champion':
        return parseInt(userStats.rps_wins) || 0;
      
      case 'lucky_coin':
        return parseInt(userStats.coinflip_wins) || 0;
      
      case 'dice_master':
        return parseInt(userStats.dice_wins) || 0;
      
      case 'legend':
        return parseInt(userStats.total_wins) || 0;
      
      default:
        return 0;
    }
  }

  async getRecentUnlocks(userId: string, limit: number = 5): Promise<AchievementWithProgress[]> {
    const userAchievements = await this.prisma.userAchievement.findMany({
      where: { userId, isUnlocked: true },
      include: { achievement: true },
      orderBy: { unlockedAt: 'desc' },
      take: limit,
    });

    return userAchievements.map(ua => ({
      id: ua.achievement.id,
      name: ua.achievement.name,
      description: ua.achievement.description,
      icon: ua.achievement.icon,
      rarity: ua.achievement.rarity as AchievementRarity,
      targetValue: ua.achievement.targetValue,
      progress: ua.progress,
      isUnlocked: ua.isUnlocked,
      unlockedAt: ua.unlockedAt || undefined,
      progressPercentage: 100,
    }));
  }
} 