import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AchievementService } from './achievement.service';

@Injectable()
export class SocialSeederService implements OnModuleInit {
  constructor(
    private prisma: PrismaService,
    private achievementService: AchievementService,
  ) {}

  async onModuleInit() {
    await this.seedForumCategories();
    await this.achievementService.initializeDefaultAchievements();
  }

  private async seedForumCategories() {
    const categories = [
      {
        name: 'General Discussion',
        description: 'General chat about PV3 and gaming',
        slug: 'general-discussion',
        sortOrder: 1,
      },
      {
        name: 'Strategy & Tips',
        description: 'Share strategies and tips for different games',
        slug: 'strategy-tips',
        sortOrder: 2,
      },
      {
        name: 'Tournaments',
        description: 'Tournament announcements and discussions',
        slug: 'tournaments',
        sortOrder: 3,
      },
      {
        name: 'Help & Support',
        description: 'Get help with technical issues and questions',
        slug: 'help-support',
        sortOrder: 4,
      },
    ];

    for (const categoryData of categories) {
      const existing = await this.prisma.forumCategory.findUnique({
        where: { slug: categoryData.slug },
      });

      if (!existing) {
        await this.prisma.forumCategory.create({
          data: categoryData,
        });
      }
    }
  }
} 