import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import {
  UserRole,
  SubscriptionType,
  SubscriptionStatus,
  SupportTicketStatus,
  PaymentStatus,
} from "@prisma/client";
import { SubscriptionsService } from "../subscriptions/subscriptions.service";

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private subscriptionsService: SubscriptionsService,
  ) {}

  async validateAdminUser(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (
      !user ||
      (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN)
    ) {
      throw new ForbiddenException("Access denied. Admin privileges required.");
    }

    return true;
  }

  async validateSuperAdmin(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user || user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        "Access denied. Super admin privileges required.",
      );
    }

    return true;
  }

  async logAdminAction(
    adminUserId: string,
    action: string,
    resource: string,
    resourceId?: string,
    details?: any,
  ) {
    return this.prisma.adminAction.create({
      data: {
        adminUserId,
        action,
        resource,
        resourceId,
        details,
      },
    });
  }

  // Dashboard Statistics
  async getDashboardStats() {
    const [
      totalUsers,
      activeUsers,
      totalPayments,
      monthlyRevenue,
      openTickets,
      totalApiKeys,
      activeSubscriptions,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({
        where: {
          lastLoginAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
      }),
      this.prisma.payment.count(),
      this.prisma.payment.aggregate({
        where: {
          status: PaymentStatus.COMPLETED,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
        _sum: { amount: true },
      }),
      this.prisma.supportTicket.count({
        where: { status: SupportTicketStatus.OPEN },
      }),
      this.prisma.apiKey.count({ where: { isActive: true } }),
      this.prisma.subscription.count({
        where: { status: SubscriptionStatus.ACTIVE },
      }),
    ]);

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        growth: await this.calculateGrowthRate("user"),
      },
      payments: {
        total: totalPayments,
        monthlyRevenue: monthlyRevenue._sum.amount || 0,
        growth: await this.calculateGrowthRate("payment"),
      },
      support: {
        openTickets,
        responseTime: await this.getAverageResponseTime(),
      },
      usage: {
        totalApiKeys,
        activeSubscriptions,
        requestsToday: await this.getTodayRequests(),
      },
    };
  }

  private async calculateGrowthRate(type: "user" | "payment"): Promise<number> {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let lastMonthCount: number;
    let thisMonthCount: number;

    if (type === "user") {
      [lastMonthCount, thisMonthCount] = await Promise.all([
        this.prisma.user.count({
          where: {
            createdAt: {
              gte: lastMonth,
              lt: thisMonth,
            },
          },
        }),
        this.prisma.user.count({
          where: {
            createdAt: {
              gte: thisMonth,
            },
          },
        }),
      ]);
    } else {
      [lastMonthCount, thisMonthCount] = await Promise.all([
        this.prisma.payment.count({
          where: {
            createdAt: {
              gte: lastMonth,
              lt: thisMonth,
            },
          },
        }),
        this.prisma.payment.count({
          where: {
            createdAt: {
              gte: thisMonth,
            },
          },
        }),
      ]);
    }

    return lastMonthCount > 0
      ? ((thisMonthCount - lastMonthCount) / lastMonthCount) * 100
      : 0;
  }

  private async getAverageResponseTime(): Promise<number> {
    // Simplified response time calculation
    return 4.2; // hours - would be calculated from support ticket responses
  }

  private async getTodayRequests(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const usage = await this.prisma.usageStats.aggregate({
      where: {
        date: { gte: today },
      },
      _sum: { requestCount: true },
    });

    return usage._sum.requestCount || 0;
  }

  // User Management
  async getAllUsers(page = 1, limit = 20, search?: string, role?: UserRole) {
    const skip = (page - 1) * limit;
    const whereCondition: any = {};

    if (search) {
      whereCondition.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { username: { contains: search, mode: "insensitive" } },
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
      ];
    }

    if (role) {
      whereCondition.role = role;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: whereCondition,
        include: {
          subscriptions: {
            where: { status: SubscriptionStatus.ACTIVE },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          payments: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          _count: {
            select: {
              apiKeys: true,
              supportTickets: true,
              payments: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where: whereCondition }),
    ]);

    return {
      users: users.map((user) => ({
        ...user,
        currentSubscription: user.subscriptions[0] || null,
        lastPayment: user.payments[0] || null,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getUserDetails(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscriptions: {
          orderBy: { createdAt: "desc" },
        },
        payments: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        apiKeys: {
          where: { isActive: true },
        },
        supportTickets: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        sessions: {
          where: { isActive: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Get usage stats
    const usageStats = await this.subscriptionsService.getUsageStats(userId);

    return {
      ...user,
      usageStats,
    };
  }

  async updateUserRole(
    adminUserId: string,
    targetUserId: string,
    newRole: UserRole,
  ) {
    await this.validateSuperAdmin(adminUserId);

    const user = await this.prisma.user.update({
      where: { id: targetUserId },
      data: { role: newRole },
    });

    await this.logAdminAction(
      adminUserId,
      "UPDATE_USER_ROLE",
      "USER",
      targetUserId,
      {
        newRole,
      },
    );

    return user;
  }

  async suspendUser(adminUserId: string, targetUserId: string, reason: string) {
    await this.validateAdminUser(adminUserId);

    const user = await this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        isSuspended: true,
        suspendedReason: reason,
        suspendedAt: new Date(),
      },
    });

    // Deactivate all user sessions
    await this.prisma.userSession.updateMany({
      where: { userId: targetUserId },
      data: { isActive: false },
    });

    await this.logAdminAction(
      adminUserId,
      "SUSPEND_USER",
      "USER",
      targetUserId,
      {
        reason,
      },
    );

    return user;
  }

  async unsuspendUser(adminUserId: string, targetUserId: string) {
    await this.validateAdminUser(adminUserId);

    const user = await this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        isSuspended: false,
        suspendedReason: null,
        suspendedAt: null,
      },
    });

    await this.logAdminAction(
      adminUserId,
      "UNSUSPEND_USER",
      "USER",
      targetUserId,
    );

    return user;
  }

  async updateUserSubscription(
    adminUserId: string,
    targetUserId: string,
    planType: SubscriptionType,
  ) {
    await this.validateAdminUser(adminUserId);

    // For admin upgrades, directly update the subscription
    const updatedSubscription =
      await this.subscriptionsService.adminUpgradeSubscription(
        targetUserId,
        planType,
        {
          adminUpgrade: true,
          adminUserId,
        },
      );

    await this.logAdminAction(
      adminUserId,
      "UPDATE_SUBSCRIPTION",
      "SUBSCRIPTION",
      updatedSubscription?.id || targetUserId,
      {
        planType,
        targetUserId,
      },
    );

    return updatedSubscription;
  }

  // Payment Management
  async getAllPayments(
    page = 1,
    limit = 20,
    status?: PaymentStatus,
    provider?: string,
  ) {
    const skip = (page - 1) * limit;
    const whereCondition: any = {};

    if (status) {
      whereCondition.status = status;
    }

    if (provider) {
      whereCondition.provider = provider;
    }

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where: whereCondition,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          subscription: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.payment.count({ where: whereCondition }),
    ]);

    return {
      payments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getPaymentAnalytics(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [totalRevenue, paymentsByStatus, paymentsByProvider, dailyPayments] =
      await Promise.all([
        this.prisma.payment.aggregate({
          where: {
            status: PaymentStatus.COMPLETED,
            createdAt: { gte: startDate },
          },
          _sum: { amount: true },
          _count: { id: true },
        }),
        this.prisma.payment.groupBy({
          by: ["status"],
          where: { createdAt: { gte: startDate } },
          _count: { id: true },
        }),
        this.prisma.payment.groupBy({
          by: ["provider"],
          where: { createdAt: { gte: startDate } },
          _count: { id: true },
          _sum: { amount: true },
        }),
        // Daily payments for chart
        this.prisma.$queryRaw`
        SELECT DATE(created_at) as date, COUNT(*) as count, SUM(amount) as revenue
        FROM payments
        WHERE created_at >= ${startDate} AND status = 'COMPLETED'
        GROUP BY DATE(created_at)
        ORDER BY date
      `,
      ]);

    return {
      totalRevenue: totalRevenue._sum.amount || 0,
      totalPayments: totalRevenue._count,
      paymentsByStatus,
      paymentsByProvider,
      dailyPayments,
    };
  }

  // Support Ticket Management
  async getAllSupportTickets(
    page = 1,
    limit = 20,
    status?: SupportTicketStatus,
  ) {
    const skip = (page - 1) * limit;
    const whereCondition = status ? { status } : {};

    const [tickets, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where: whereCondition,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          _count: {
            select: { messages: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.supportTicket.count({ where: whereCondition }),
    ]);

    return {
      tickets: tickets.map((ticket) => ({
        ...ticket,
        lastMessage: ticket.messages[0] || null,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async updateTicketStatus(
    adminUserId: string,
    ticketId: string,
    status: SupportTicketStatus,
    assignedToEmail?: string,
  ) {
    await this.validateAdminUser(adminUserId);

    const ticket = await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status,
        assignedToEmail: assignedToEmail || undefined,
        resolvedAt:
          status === SupportTicketStatus.RESOLVED ? new Date() : undefined,
        closedAt:
          status === SupportTicketStatus.CLOSED ? new Date() : undefined,
      },
    });

    await this.logAdminAction(
      adminUserId,
      "UPDATE_TICKET_STATUS",
      "SUPPORT_TICKET",
      ticketId,
      {
        status,
        assignedToEmail,
      },
    );

    return ticket;
  }

  // System Monitoring
  async getSystemHealth() {
    const [
      totalUsers,
      activeSubscriptions,
      totalRequests24h,
      errorRate,
      averageLatency,
      rpcNodeStatus,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.subscription.count({
        where: { status: SubscriptionStatus.ACTIVE },
      }),
      this.getTotalRequests24h(),
      this.getErrorRate(),
      this.getAverageLatency(),
      this.getRpcNodeStatus(),
    ]);

    return {
      status: "healthy",
      metrics: {
        totalUsers,
        activeSubscriptions,
        totalRequests24h,
        errorRate,
        averageLatency,
      },
      rpcNodes: rpcNodeStatus,
      lastUpdated: new Date(),
    };
  }

  private async getTotalRequests24h(): Promise<number> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const usage = await this.prisma.usageStats.aggregate({
      where: {
        date: { gte: yesterday },
      },
      _sum: { requestCount: true },
    });

    return usage._sum.requestCount || 0;
  }

  private async getErrorRate(): Promise<number> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const stats = await this.prisma.usageStats.aggregate({
      where: {
        date: { gte: yesterday },
      },
      _sum: {
        requestCount: true,
        errorCount: true,
      },
    });

    const totalRequests = stats._sum.requestCount || 0;
    const totalErrors = stats._sum.errorCount || 0;

    return totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;
  }

  private async getAverageLatency(): Promise<number> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const stats = await this.prisma.usageStats.aggregate({
      where: {
        date: { gte: yesterday },
      },
      _avg: { avgLatency: true },
    });

    return stats._avg.avgLatency || 0;
  }

  private async getRpcNodeStatus() {
    return this.prisma.rpcNode.findMany({
      select: {
        id: true,
        name: true,
        region: true,
        isActive: true,
        avgLatency: true,
        uptime: true,
        currentRps: true,
        maxRps: true,
      },
    });
  }

  async getAdminActions(page = 1, limit = 20, adminUserId?: string) {
    const skip = (page - 1) * limit;
    const whereCondition = adminUserId ? { adminUserId } : {};

    const [actions, total] = await Promise.all([
      this.prisma.adminAction.findMany({
        where: whereCondition,
        include: {
          adminUser: {
            select: {
              id: true,
              email: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.adminAction.count({ where: whereCondition }),
    ]);

    return {
      actions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
}
