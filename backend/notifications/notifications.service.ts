import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import { RedisService } from "../common/redis.service";

export enum NotificationType {
  USAGE_WARNING = "USAGE_WARNING",
  USAGE_LIMIT_EXCEEDED = "USAGE_LIMIT_EXCEEDED",
  OVERAGE_ACCRUED = "OVERAGE_ACCRUED",
  BILLING_REMINDER = "BILLING_REMINDER",
}

export enum NotificationPriority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

export interface NotificationData {
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  data?: any;
  actionUrl?: string;
  actionLabel?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  async createNotification(userId: string, notificationData: NotificationData) {
    try {
      // Store notification in database
      const notification = await this.prisma.notification.create({
        data: {
          userId,
          type: notificationData.type,
          priority: notificationData.priority,
          title: notificationData.title,
          message: notificationData.message,
          data: notificationData.data
            ? JSON.stringify(notificationData.data)
            : null,
          actionUrl: notificationData.actionUrl,
          actionLabel: notificationData.actionLabel,
          isRead: false,
        },
      });

      // Store in Redis for real-time notifications
      const redisKey = `notifications:${userId}:unread`;
      await this.redisService.zadd(
        redisKey,
        Date.now(),
        JSON.stringify({
          id: notification.id,
          ...notificationData,
          createdAt: notification.createdAt,
        }),
      );

      // Set TTL for Redis key (30 days)
      await this.redisService.expire(redisKey, 30 * 24 * 60 * 60);

      this.logger.log(
        `Created notification for user ${userId}: ${notificationData.title}`,
      );
      return notification;
    } catch (error) {
      this.logger.error(`Failed to create notification: ${error.message}`);
      throw error;
    }
  }

  async getUserNotifications(userId: string, unreadOnly = false) {
    const whereClause: any = { userId };
    if (unreadOnly) {
      whereClause.isRead = false;
    }

    return this.prisma.notification.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    // Remove from Redis unread notifications
    const redisKey = `notifications:${userId}:unread`;
    await this.redisService.zremrangebyscore(redisKey, `-inf`, `+inf`);

    return notification;
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    // Clear Redis unread notifications
    const redisKey = `notifications:${userId}:unread`;
    await this.redisService.del(redisKey);
  }

  async checkUsageThresholds(
    userId: string,
    currentUsage: number,
    limit: number,
  ) {
    if (limit === -1) return; // Unlimited plan

    const percentage = (currentUsage / limit) * 100;
    const thresholds = [75, 90, 100]; // 75%, 90%, 100%

    for (const threshold of thresholds) {
      if (percentage >= threshold) {
        // Check if we've already sent this threshold notification today
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const existingNotification = await this.prisma.notification.findFirst({
          where: {
            userId,
            type:
              threshold >= 100
                ? NotificationType.USAGE_LIMIT_EXCEEDED
                : NotificationType.USAGE_WARNING,
            createdAt: { gte: today },
          },
        });

        if (existingNotification) continue;

        let notificationData: NotificationData;

        if (threshold >= 100) {
          notificationData = {
            type: NotificationType.USAGE_LIMIT_EXCEEDED,
            priority: NotificationPriority.CRITICAL,
            title: "Usage Limit Exceeded",
            message: `You've exceeded your monthly API request limit. Additional requests will incur overage charges at $0.01 per request.`,
            data: { currentUsage, limit, percentage: Math.round(percentage) },
            actionUrl: "/dashboard/billing",
            actionLabel: "View Billing",
          };
        } else {
          notificationData = {
            type: NotificationType.USAGE_WARNING,
            priority:
              threshold >= 90
                ? NotificationPriority.HIGH
                : NotificationPriority.MEDIUM,
            title: `Usage Alert - ${threshold}% Reached`,
            message: `You've used ${Math.round(percentage)}% of your monthly API request limit (${currentUsage.toLocaleString()}/${limit.toLocaleString()} requests).`,
            data: { currentUsage, limit, percentage: Math.round(percentage) },
            actionUrl: "/dashboard/billing",
            actionLabel: "View Usage",
          };
        }

        await this.createNotification(userId, notificationData);
        break; // Only send one notification per check
      }
    }
  }

  async sendOverageNotification(
    userId: string,
    overageAmount: number,
    cost: string,
  ) {
    const notificationData: NotificationData = {
      type: NotificationType.OVERAGE_ACCRUED,
      priority: NotificationPriority.HIGH,
      title: "Overage Charges Accrued",
      message: `You have ${overageAmount.toLocaleString()} requests in overage, resulting in $${cost} additional charges.`,
      data: { overageAmount, cost },
      actionUrl: "/dashboard/billing",
      actionLabel: "Pay Now",
    };

    return this.createNotification(userId, notificationData);
  }

  async sendBillingReminder(
    userId: string,
    daysUntilBilling: number,
    amount: number,
  ) {
    if (daysUntilBilling > 7) return; // Only remind within 7 days

    const notificationData: NotificationData = {
      type: NotificationType.BILLING_REMINDER,
      priority: NotificationPriority.LOW,
      title: "Upcoming Billing",
      message: `Your subscription will be billed $${amount} in ${daysUntilBilling} days.`,
      data: { daysUntilBilling, amount },
      actionUrl: "/dashboard/billing",
      actionLabel: "View Billing",
    };

    return this.createNotification(userId, notificationData);
  }
}
