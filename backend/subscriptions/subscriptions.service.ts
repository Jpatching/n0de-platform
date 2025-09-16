import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import { RedisService } from "../common/redis.service";
import { SubscriptionType, SubscriptionStatus } from "@prisma/client";

export interface PlanDetails {
  id: string;
  name: string;
  type: SubscriptionType;
  price: number;
  interval: string;
  currency: string;
  limits: {
    requests: number;
    apiKeys: number;
    rateLimit: number;
    networks: string[];
    features: string[];
  };
  popular?: boolean;
  enterprise?: boolean;
}

@Injectable()
export class SubscriptionsService {
  private plans: Record<SubscriptionType, PlanDetails> = {
    FREE: {
      id: "FREE",
      name: "Free",
      type: SubscriptionType.FREE,
      price: 0,
      interval: "month",
      currency: "USD",
      limits: {
        requests: 100000,
        apiKeys: 1,
        rateLimit: 100,
        networks: ["devnet", "testnet"],
        features: ["Basic RPC", "Community Support"],
      },
    },
    STARTER: {
      id: "STARTER",
      name: "Starter",
      type: SubscriptionType.STARTER,
      price: 49,
      interval: "month",
      currency: "USD",
      popular: true,
      limits: {
        requests: 1000000,
        apiKeys: 3,
        rateLimit: 1000,
        networks: ["mainnet", "devnet", "testnet"],
        features: ["Priority RPC", "Email Support", "Basic Analytics"],
      },
    },
    PROFESSIONAL: {
      id: "PROFESSIONAL",
      name: "Professional",
      type: SubscriptionType.PROFESSIONAL,
      price: 299,
      interval: "month",
      currency: "USD",
      limits: {
        requests: 10000000,
        apiKeys: 10,
        rateLimit: 5000,
        networks: ["mainnet", "devnet", "testnet"],
        features: [
          "Priority RPC",
          "Websockets",
          "Priority Support",
          "Advanced Analytics",
          "Custom Domains",
        ],
      },
    },
    ENTERPRISE: {
      id: "ENTERPRISE",
      name: "Enterprise",
      type: SubscriptionType.ENTERPRISE,
      price: 999,
      interval: "month",
      currency: "USD",
      enterprise: true,
      limits: {
        requests: -1, // Unlimited
        apiKeys: -1, // Unlimited
        rateLimit: 25000,
        networks: ["mainnet", "devnet", "testnet", "custom"],
        features: [
          "Dedicated Infrastructure",
          "Yellowstone gRPC",
          "24/7 Phone Support",
          "SLA Guarantee",
          "Custom Integration",
          "White-label Options",
        ],
      },
    },
  };

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  async getUserSubscription(userId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: {
          in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING],
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!subscription) {
      // Create free subscription if none exists
      return this.createFreeSubscription(userId);
    }

    // Check if subscription expired
    if (subscription.currentPeriodEnd < new Date()) {
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: SubscriptionStatus.EXPIRED },
      });

      // Create free subscription
      return this.createFreeSubscription(userId);
    }

    return {
      ...subscription,
      plan: this.plans[subscription.planType],
    };
  }

  async createFreeSubscription(userId: string) {
    const now = new Date();
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 100); // Free forever

    // Use upsert to prevent duplicate free subscriptions
    const subscription = await this.prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        planName: "Free",
        planType: SubscriptionType.FREE,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: now,
        currentPeriodEnd: endDate,
      },
      update: {
        // If subscription exists, ensure it's active and up to date
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: now,
        currentPeriodEnd: endDate,
      },
    });

    return {
      ...subscription,
      plan: this.plans[SubscriptionType.FREE],
    };
  }

  async upgradePlan(
    userId: string,
    planType: SubscriptionType | string,
    paymentInfo?: any,
  ) {
    // CRITICAL SECURITY: This method should NOT directly upgrade without payment verification
    // Instead, it should create a payment intent and return checkout URL

    // Handle both plan ID (string) and plan type (enum)
    let resolvedPlanType: SubscriptionType;

    if (typeof planType === "string" && planType in SubscriptionType) {
      resolvedPlanType =
        SubscriptionType[planType as keyof typeof SubscriptionType];
    } else if (
      Object.values(SubscriptionType).includes(planType as SubscriptionType)
    ) {
      resolvedPlanType = planType as SubscriptionType;
    } else {
      throw new BadRequestException("Invalid plan type");
    }

    if (resolvedPlanType === SubscriptionType.FREE) {
      throw new BadRequestException("Cannot downgrade to free plan");
    }

    const plan = this.plans[resolvedPlanType];
    if (!plan) {
      throw new BadRequestException("Invalid plan type");
    }

    // Check if user already has this plan
    const currentSubscription = await this.getUserSubscription(userId);
    if (currentSubscription.planType === resolvedPlanType) {
      throw new BadRequestException("User already has this plan");
    }

    // Return error - direct upgrades not allowed without payment
    throw new BadRequestException(
      "Plan upgrades require payment verification. Use /upgrade/checkout endpoint to initiate payment flow.",
    );
  }

  // Admin-only method for direct subscription upgrades
  async adminUpgradeSubscription(
    userId: string,
    planType: SubscriptionType,
    adminOptions: any,
  ) {
    const plan = this.plans[planType];
    if (!plan) {
      throw new BadRequestException("Invalid plan type");
    }

    // Update subscription directly for admin upgrades
    const subscription = await this.prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        planName: plan.name,
        planType,
        status: "ACTIVE",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        metadata: {
          adminUpgrade: true,
          adminUserId: adminOptions.adminUserId,
          upgradeDate: new Date().toISOString(),
        },
      },
      update: {
        planName: plan.name,
        planType,
        status: "ACTIVE",
        metadata: {
          adminUpgrade: true,
          adminUserId: adminOptions.adminUserId,
          upgradeDate: new Date().toISOString(),
        },
      },
    });

    return subscription;
  }

  // New method for completing upgrade AFTER payment verification
  async completeUpgradeAfterPayment(
    userId: string,
    planType: SubscriptionType,
    paymentId: string,
    stripeSessionId?: string,
  ) {
    const plan = this.plans[planType];
    if (!plan) {
      throw new BadRequestException("Invalid plan type");
    }

    // Verify payment exists and is completed
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException("Payment not found");
    }

    if (payment.userId !== userId) {
      throw new BadRequestException("Payment does not belong to user");
    }

    if (payment.status !== "COMPLETED") {
      throw new BadRequestException("Payment not completed");
    }

    // Get the current subscription to avoid null reference
    const currentSubscription = await this.getUserSubscription(userId).catch(
      () => null,
    );

    const now = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1); // Monthly billing

    // Use upsert to safely handle subscription upgrades and prevent duplicates
    const subscription = await this.prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        planName: plan.name,
        planType: planType,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: now,
        currentPeriodEnd: endDate,
        metadata: {
          paymentId,
          stripeSessionId,
          upgradedFrom: currentSubscription?.planType || SubscriptionType.FREE,
        },
      },
      update: {
        planName: plan.name,
        planType: planType,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: now,
        currentPeriodEnd: endDate,
        metadata: {
          paymentId,
          stripeSessionId,
          upgradedFrom: currentSubscription?.planType || SubscriptionType.FREE,
        },
      },
    });

    return {
      ...subscription,
      plan,
    };
  }

  async cancelSubscription(userId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: {
          in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING],
        },
      },
    });

    if (!subscription) {
      throw new NotFoundException("No active subscription found");
    }

    if (subscription.planType === SubscriptionType.FREE) {
      throw new BadRequestException("Cannot cancel free plan");
    }

    // Set to cancel at period end
    return this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        cancelAt: subscription.currentPeriodEnd,
        status: SubscriptionStatus.CANCELED,
        canceledAt: new Date(),
      },
    });
  }

  async checkApiKeyLimit(userId: string): Promise<boolean> {
    const subscription = await this.getUserSubscription(userId);
    const plan = this.plans[subscription.planType];

    if (plan.limits.apiKeys === -1) {
      return true; // Unlimited
    }

    const keyCount = await this.prisma.apiKey.count({
      where: {
        userId,
        isActive: true,
      },
    });

    return keyCount < plan.limits.apiKeys;
  }

  async checkRequestLimit(userId: string, requests: number): Promise<boolean> {
    const subscription = await this.getUserSubscription(userId);
    const plan = this.plans[subscription.planType];

    if (plan.limits.requests === -1) {
      return true; // Unlimited
    }

    // Get current month's usage
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const usage = await this.prisma.usageStats.aggregate({
      where: {
        userId,
        date: { gte: startOfMonth },
      },
      _sum: {
        requestCount: true,
      },
    });

    const totalUsage = (usage._sum.requestCount || 0) + requests;
    return totalUsage <= plan.limits.requests;
  }

  async getUsageStats(userId: string) {
    const subscription = await this.getUserSubscription(userId);
    const plan = this.plans[subscription.planType];

    // Get real-time usage from Redis
    const currentPeriodKey = this.getCurrentPeriodKey();
    const usageKey = `usage:${userId}:${currentPeriodKey}`;
    const computeKey = `compute:${userId}:${currentPeriodKey}`;

    const [currentUsage, currentCompute, dbUsage, apiKeyCount] =
      await Promise.all([
        this.redisService.get(usageKey),
        this.redisService.get(computeKey),
        this.getDatabaseUsage(userId, subscription.currentPeriodStart),
        this.prisma.apiKey.count({
          where: {
            userId,
            isActive: true,
          },
        }),
      ]);

    const realTimeRequests = currentUsage ? parseInt(currentUsage) : 0;
    const computeUnits = currentCompute ? parseInt(currentCompute) : 0;
    const dbRequests = dbUsage._sum.requestCount || 0;

    // Use the higher of the two (Redis for real-time, DB for historical accuracy)
    const totalRequests = Math.max(realTimeRequests, dbRequests);

    // Calculate overage
    const isOverLimit =
      plan.limits.requests !== -1 && totalRequests > plan.limits.requests;
    const overageAmount = isOverLimit
      ? totalRequests - plan.limits.requests
      : 0;
    const overageCost = overageAmount * 0.01; // $0.01 per request overage

    // Calculate reset date (first day of next month)
    const now = new Date();
    const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // Return flattened structure for frontend compatibility
    return {
      // Flattened usage data for subscription page
      currentRequests: totalRequests,
      requestLimit: plan.limits.requests,
      currentKeys: apiKeyCount,
      keyLimit: plan.limits.apiKeys,
      requestsThisMonth: totalRequests,
      lastRequestDate: null, // Would need to query last request date separately
      resetDate: resetDate.toISOString(),

      // Keep nested structure for other endpoints
      subscription: {
        ...subscription,
        plan,
      },
      usage: {
        requests: {
          used: totalRequests,
          limit: plan.limits.requests,
          percentage:
            plan.limits.requests === -1
              ? 0
              : Math.round((totalRequests / plan.limits.requests) * 100),
          overage: overageAmount,
          overageCost: overageCost.toFixed(2),
        },
        computeUnits: {
          used: computeUnits,
          cost: (computeUnits * 0.0001).toFixed(4), // $0.0001 per compute unit
        },
        apiKeys: {
          used: apiKeyCount,
          limit: plan.limits.apiKeys,
        },
        rateLimit: {
          limit: plan.limits.rateLimit,
          window: "1 minute",
        },
      },
      billing: {
        nextBillingDate: subscription.currentPeriodEnd,
        amount: plan.price,
        estimatedOverage: parseFloat(overageCost.toFixed(2)),
        status: subscription.status,
      },
    };
  }

  async getRealTimeUsage(userId: string) {
    const subscription = await this.getUserSubscription(userId);
    const plan = this.plans[subscription.planType];
    const currentPeriodKey = this.getCurrentPeriodKey();

    const [usage, compute, rateLimitUsage] = await Promise.all([
      this.redisService.get(`usage:${userId}:${currentPeriodKey}`),
      this.redisService.get(`compute:${userId}:${currentPeriodKey}`),
      this.redisService.get(
        `ratelimit:${userId}:${Math.floor(Date.now() / 60000)}`,
      ),
    ]);

    const currentRequests = usage ? parseInt(usage) : 0;
    const currentCompute = compute ? parseInt(compute) : 0;
    const currentRateLimit = rateLimitUsage ? parseInt(rateLimitUsage) : 0;

    return {
      requests: {
        used: currentRequests,
        limit: plan.limits.requests,
        percentage:
          plan.limits.requests === -1
            ? 0
            : Math.min(
                Math.round((currentRequests / plan.limits.requests) * 100),
                100,
              ),
        remaining:
          plan.limits.requests === -1
            ? "unlimited"
            : Math.max(0, plan.limits.requests - currentRequests),
      },
      computeUnits: {
        used: currentCompute,
        cost: (currentCompute * 0.0001).toFixed(4),
      },
      rateLimit: {
        used: currentRateLimit,
        limit: plan.limits.rateLimit,
        remaining: Math.max(0, plan.limits.rateLimit - currentRateLimit),
        resetTime: Math.ceil(Date.now() / 60000) * 60000, // Next minute boundary
      },
      period: {
        start: subscription.currentPeriodStart,
        end: subscription.currentPeriodEnd,
        daysRemaining: Math.ceil(
          (subscription.currentPeriodEnd.getTime() - Date.now()) /
            (24 * 60 * 60 * 1000),
        ),
      },
    };
  }

  private async getDatabaseUsage(userId: string, startDate: Date) {
    return await this.prisma.usageStats.aggregate({
      where: {
        userId,
        date: { gte: startDate },
      },
      _sum: {
        requestCount: true,
      },
    });
  }

  private getCurrentPeriodKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }

  async getAllPlans() {
    return Object.values(this.plans);
  }

  async getPlanByType(type: SubscriptionType) {
    return this.plans[type];
  }
}
