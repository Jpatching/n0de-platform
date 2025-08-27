import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class UsageService {
  constructor(
    private prisma: PrismaService,
  ) {}

  async getUserUsageStats(userId: string) {
    // Get current usage stats
    const stats = await this.prisma.usageStats.aggregate({
      where: { userId },
      _sum: {
        requestCount: true,
        successCount: true,
        errorCount: true,
      },
      _avg: {
        avgLatency: true,
      },
    });

    const totalRequests = stats._sum.requestCount || 0;
    const successCount = stats._sum.successCount || 0;
    const errorCount = stats._sum.errorCount || 0;
    const avgLatency = stats._avg.avgLatency || 0;

    return {
      totalRequests,
      avgLatency: Number(avgLatency.toFixed(2)),
      uptime: totalRequests > 0 ? ((successCount / totalRequests) * 100) : 100,
      errorRate: totalRequests > 0 ? ((errorCount / totalRequests) * 100) : 0,
      requestsToday: await this.getTodayRequests(userId),
      activeKeys: await this.getActiveKeysCount(userId),
    };
  }

  private async getTodayRequests(userId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await this.prisma.usageStats.aggregate({
      where: {
        userId,
        date: {
          gte: today,
        },
      },
      _sum: {
        requestCount: true,
      },
    });

    return result._sum.requestCount || 0;
  }

  private async getActiveKeysCount(userId: string): Promise<number> {
    return this.prisma.apiKey.count({
      where: {
        userId,
        isActive: true,
      },
    });
  }

  async recordRequest(data: {
    userId: string;
    apiKeyId: string;
    method: string;
    responseTime: number;
    success: boolean;
    userIp: string;
    network: string;
    error?: string;
  }) {
    try {
      // Update usage stats - simplified approach
      const now = new Date();
      const hour = now.getHours();
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Try to find existing record for this hour
      const existingStats = await this.prisma.usageStats.findFirst({
        where: {
          userId: data.userId,
          apiKeyId: data.apiKeyId,
          date: date,
          hour: hour,
          endpoint: data.method,
        },
      });

      if (existingStats) {
        // Update existing record
        await this.prisma.usageStats.update({
          where: { id: existingStats.id },
          data: {
            requestCount: { increment: 1 },
            successCount: data.success ? { increment: 1 } : undefined,
            errorCount: !data.success ? { increment: 1 } : undefined,
            totalLatency: { increment: data.responseTime },
            avgLatency: (existingStats.totalLatency + data.responseTime) / (existingStats.requestCount + 1),
          },
        });
      } else {
        // Create new record
        await this.prisma.usageStats.create({
          data: {
            userId: data.userId,
            apiKeyId: data.apiKeyId,
            date: date,
            hour: hour,
            requestCount: 1,
            successCount: data.success ? 1 : 0,
            errorCount: data.success ? 0 : 1,
            avgLatency: data.responseTime,
            totalLatency: data.responseTime,
            endpoint: data.method,
          },
        });
      }
    } catch (error) {
      console.error('Failed to record request:', error);
    }
  }
}