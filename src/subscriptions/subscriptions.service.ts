import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { SubscriptionType, SubscriptionStatus } from '@prisma/client';

export interface PlanDetails {
  name: string;
  type: SubscriptionType;
  price: number;
  limits: {
    requests: number;
    apiKeys: number;
    rateLimit: number;
    networks: string[];
    features: string[];
  };
}

@Injectable()
export class SubscriptionsService {
  private plans: Record<SubscriptionType, PlanDetails> = {
    FREE: {
      name: 'Free',
      type: SubscriptionType.FREE,
      price: 0,
      limits: {
        requests: 100000,
        apiKeys: 1,
        rateLimit: 100,
        networks: ['devnet', 'testnet'],
        features: ['Basic RPC', 'Community Support'],
      },
    },
    STARTER: {
      name: 'Starter',
      type: SubscriptionType.STARTER,
      price: 49,
      limits: {
        requests: 1000000,
        apiKeys: 3,
        rateLimit: 1000,
        networks: ['mainnet', 'devnet', 'testnet'],
        features: ['Priority RPC', 'Email Support', 'Basic Analytics'],
      },
    },
    PROFESSIONAL: {
      name: 'Professional',
      type: SubscriptionType.PROFESSIONAL,
      price: 299,
      limits: {
        requests: 10000000,
        apiKeys: 10,
        rateLimit: 5000,
        networks: ['mainnet', 'devnet', 'testnet'],
        features: ['Priority RPC', 'Websockets', 'Priority Support', 'Advanced Analytics', 'Custom Domains'],
      },
    },
    ENTERPRISE: {
      name: 'Enterprise',
      type: SubscriptionType.ENTERPRISE,
      price: 999,
      limits: {
        requests: -1, // Unlimited
        apiKeys: -1, // Unlimited
        rateLimit: 25000,
        networks: ['mainnet', 'devnet', 'testnet', 'custom'],
        features: [
          'Dedicated Infrastructure',
          'Yellowstone gRPC',
          '24/7 Phone Support',
          'SLA Guarantee',
          'Custom Integration',
          'White-label Options',
        ],
      },
    },
  };

  constructor(private prisma: PrismaService) {}

  async getUserSubscription(userId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
      },
      orderBy: { createdAt: 'desc' },
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

    const subscription = await this.prisma.subscription.create({
      data: {
        userId,
        planName: 'Free',
        planType: SubscriptionType.FREE,
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

  async upgradePlan(userId: string, planType: SubscriptionType, paymentInfo?: any) {
    if (planType === SubscriptionType.FREE) {
      throw new BadRequestException('Cannot downgrade to free plan');
    }

    const plan = this.plans[planType];
    if (!plan) {
      throw new BadRequestException('Invalid plan type');
    }

    // Cancel existing subscription
    await this.prisma.subscription.updateMany({
      where: {
        userId,
        status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
      },
      data: {
        status: SubscriptionStatus.CANCELED,
        canceledAt: new Date(),
      },
    });

    // Create new subscription
    const now = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1); // Monthly billing

    const subscription = await this.prisma.subscription.create({
      data: {
        userId,
        planName: plan.name,
        planType: plan.type,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: now,
        currentPeriodEnd: endDate,
        metadata: paymentInfo,
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
        status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
      },
    });

    if (!subscription) {
      throw new NotFoundException('No active subscription found');
    }

    if (subscription.planType === SubscriptionType.FREE) {
      throw new BadRequestException('Cannot cancel free plan');
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

    // Get current period usage
    const startOfPeriod = subscription.currentPeriodStart;
    
    const usage = await this.prisma.usageStats.aggregate({
      where: {
        userId,
        date: { gte: startOfPeriod },
      },
      _sum: {
        requestCount: true,
      },
    });

    const apiKeyCount = await this.prisma.apiKey.count({
      where: {
        userId,
        isActive: true,
      },
    });

    return {
      subscription: {
        ...subscription,
        plan,
      },
      usage: {
        requests: {
          used: usage._sum.requestCount || 0,
          limit: plan.limits.requests,
          percentage: plan.limits.requests === -1 
            ? 0 
            : Math.round(((usage._sum.requestCount || 0) / plan.limits.requests) * 100),
        },
        apiKeys: {
          used: apiKeyCount,
          limit: plan.limits.apiKeys,
        },
      },
      billing: {
        nextBillingDate: subscription.currentPeriodEnd,
        amount: plan.price,
        status: subscription.status,
      },
    };
  }

  async getAllPlans() {
    return Object.values(this.plans);
  }

  async getPlanByType(type: SubscriptionType) {
    return this.plans[type];
  }
}