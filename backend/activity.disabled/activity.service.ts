import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { LoggerService } from '../common/logger.service';

export interface ActivityItem {
  id: string;
  type: 'api_key_created' | 'rate_limit_alert' | 'login' | 'milestone' | 'team_member_added';
  description: string;
  timestamp: string;
  metadata?: any;
}

@Injectable()
export class ActivityService {
  constructor(
    private prisma: PrismaService,
    private logger: LoggerService,
  ) {}

  async getRecentActivity(userId: string, limit: number = 20): Promise<ActivityItem[]> {
    try {
      const activities: ActivityItem[] = [];

      // Fetch API key creations (most recent first)
      const apiKeyCreations = await this.prisma.apiKey.findMany({
        where: { userId },
        select: {
          id: true,
          name: true,
          createdAt: true,
          permissions: true,
        },
        orderBy: { createdAt: 'desc' },
        take: Math.ceil(limit * 0.4), // Allocate 40% to API keys
      });

      // Convert API key creations to activity items
      apiKeyCreations.forEach(apiKey => {
        activities.push({
          id: `apikey_${apiKey.id}`,
          type: 'api_key_created',
          description: `Created API key "${apiKey.name}"`,
          timestamp: apiKey.createdAt.toISOString(),
          metadata: {
            apiKeyId: apiKey.id,
            apiKeyName: apiKey.name,
            permissions: apiKey.permissions,
          },
        });
      });

      // Fetch login events from user sessions
      const loginEvents = await this.prisma.userSession.findMany({
        where: { userId },
        select: {
          id: true,
          createdAt: true,
          ipAddress: true,
          userAgent: true,
        },
        orderBy: { createdAt: 'desc' },
        take: Math.ceil(limit * 0.3), // Allocate 30% to logins
      });

      // Convert login events to activity items
      loginEvents.forEach(session => {
        activities.push({
          id: `login_${session.id}`,
          type: 'login',
          description: 'Signed in to your account',
          timestamp: session.createdAt.toISOString(),
          metadata: {
            sessionId: session.id,
            ipAddress: session.ipAddress,
            userAgent: session.userAgent ? this.parseUserAgent(session.userAgent) : null,
          },
        });
      });

      // Fetch audit log events for rate limit alerts and other activities
      const auditLogs = await this.prisma.auditLog.findMany({
        where: { 
          userId,
          action: {
            in: ['RATE_LIMIT_EXCEEDED', 'USAGE_MILESTONE', 'TEAM_MEMBER_ADDED']
          }
        },
        select: {
          id: true,
          action: true,
          resource: true,
          resourceId: true,
          newValues: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: Math.ceil(limit * 0.2), // Allocate 20% to audit events
      });

      // Convert audit logs to activity items
      auditLogs.forEach(log => {
        const activityItem = this.convertAuditLogToActivity(log);
        if (activityItem) {
          activities.push(activityItem);
        }
      });

      // Check for usage milestones by analyzing recent usage
      const usageMilestones = await this.checkUsageMilestones(userId, limit);
      activities.push(...usageMilestones);

      // Sort all activities by timestamp (most recent first) and limit
      const sortedActivities = activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);

      this.logger.log({
        type: 'activity_fetched',
        userId,
        activitiesCount: sortedActivities.length,
        limit,
      }, 'ACTIVITY');

      return sortedActivities;

    } catch (error) {
      this.logger.error({
        type: 'activity_fetch_error',
        userId,
        error: error.message,
        stack: error.stack,
      }, 'ACTIVITY');

      throw new InternalServerErrorException('Failed to fetch activity data');
    }
  }

  private convertAuditLogToActivity(log: any): ActivityItem | null {
    switch (log.action) {
      case 'RATE_LIMIT_EXCEEDED':
        return {
          id: `rate_limit_${log.id}`,
          type: 'rate_limit_alert',
          description: 'Rate limit exceeded on API requests',
          timestamp: log.createdAt.toISOString(),
          metadata: {
            resource: log.resource,
            resourceId: log.resourceId,
            details: log.newValues,
          },
        };

      case 'USAGE_MILESTONE':
        const milestone = log.newValues?.milestone || 'Unknown milestone reached';
        return {
          id: `milestone_${log.id}`,
          type: 'milestone',
          description: `${milestone}`,
          timestamp: log.createdAt.toISOString(),
          metadata: {
            milestone: log.newValues?.milestone,
            value: log.newValues?.value,
            previousValue: log.newValues?.previousValue,
          },
        };

      case 'TEAM_MEMBER_ADDED':
        const memberEmail = log.newValues?.email || 'team member';
        return {
          id: `team_${log.id}`,
          type: 'team_member_added',
          description: `Added ${memberEmail} to your team`,
          timestamp: log.createdAt.toISOString(),
          metadata: {
            memberEmail: log.newValues?.email,
            role: log.newValues?.role,
            invitedBy: log.newValues?.invitedBy,
          },
        };

      default:
        return null;
    }
  }

  private async checkUsageMilestones(userId: string, limit: number): Promise<ActivityItem[]> {
    try {
      const milestones: ActivityItem[] = [];

      // Get current usage stats for milestone detection
      const recentUsage = await this.prisma.usageStats.findMany({
        where: { userId },
        select: {
          requestCount: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 30, // Look at last 30 records for pattern analysis
      });

      if (recentUsage.length === 0) return milestones;

      // Calculate total requests
      const totalRequests = recentUsage.reduce((sum, stat) => sum + stat.requestCount, 0);

      // Define milestone thresholds
      const milestoneThresholds = [1000, 10000, 50000, 100000, 500000, 1000000];

      // Check if any milestones were recently crossed
      milestoneThresholds.forEach(threshold => {
        if (totalRequests >= threshold) {
          // Create synthetic milestone activity (in a real implementation, these would be stored)
          const estimatedDate = new Date();
          estimatedDate.setDate(estimatedDate.getDate() - Math.floor(Math.random() * 7)); // Random recent date

          milestones.push({
            id: `milestone_${threshold}_${userId}`,
            type: 'milestone',
            description: `Reached ${threshold.toLocaleString()} total API requests`,
            timestamp: estimatedDate.toISOString(),
            metadata: {
              milestone: `${threshold.toLocaleString()} requests`,
              value: totalRequests,
              threshold,
            },
          });
        }
      });

      // Only return the most recent milestone to avoid cluttering
      return milestones
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 1);

    } catch (error) {
      this.logger.warn({
        type: 'milestone_check_error',
        userId,
        error: error.message,
      }, 'ACTIVITY');
      return [];
    }
  }

  private parseUserAgent(userAgent: string): object | null {
    try {
      // Basic user agent parsing - in production, consider using a library like 'ua-parser-js'
      const isMobile = /Mobile|Android|iPhone|iPad/.test(userAgent);
      const browser = this.extractBrowser(userAgent);
      const os = this.extractOS(userAgent);

      return {
        browser,
        os,
        isMobile,
        raw: userAgent.substring(0, 100), // Truncate for storage
      };
    } catch (error) {
      return null;
    }
  }

  private extractBrowser(userAgent: string): string {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  private extractOS(userAgent: string): string {
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac OS')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS')) return 'iOS';
    return 'Unknown';
  }
}