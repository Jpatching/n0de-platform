import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import { RedisService } from "../common/redis.service";
import { SubscriptionsService } from "../subscriptions/subscriptions.service";
import { StripeService } from "./stripe.service";
import { Cron, CronExpression } from "@nestjs/schedule";

/**
 * BillingSyncService: The Heart of N0DE's Billing Architecture
 *
 * This service solves the fundamental challenge of real-time RPC billing:
 * 1. RPC calls need millisecond response times (can't wait for Stripe)
 * 2. Billing needs accurate usage tracking (can't lose data)
 * 3. Users need predictable costs (can't surprise with overages)
 *
 * ARCHITECTURE:
 * - Redis: Real-time counters for sub-second tracking
 * - PostgreSQL: Authoritative billing records and sync state
 * - Stripe: Production billing operations
 * - Queue System: Reliable async processing
 */

interface UsageSnapshot {
  userId: string;
  periodStart: Date;
  periodEnd: Date;
  rpcCalls: {
    getBalance: number;
    getTransaction: number;
    sendTransaction: number;
    getBlock: number;
    custom: number;
  };
  computeUnits: {
    consumed: number;
    cost: number; // in USD cents
  };
  rateLimitHits: number;
  overageEvents: {
    timestamp: Date;
    type: "api_limit" | "rate_limit" | "compute_limit";
    amount: number;
  }[];
}

interface StripeUsageRecord {
  subscriptionItem: string;
  quantity: number;
  timestamp: number;
  action: "increment" | "set";
}

@Injectable()
export class BillingSyncService {
  private readonly logger = new Logger(BillingSyncService.name);

  // Critical: Track sync state to prevent double-billing
  private syncInProgress = new Set<string>();

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private subscriptions: SubscriptionsService,
    private stripeService: StripeService,
  ) {}

  /**
   * REAL-TIME USAGE TRACKING
   * Called on every RPC request (must be < 1ms overhead)
   */
  async recordUsage(
    userId: string,
    endpoint: string,
    computeUnits: number,
  ): Promise<void> {
    const timestamp = Date.now();
    const period = this.getCurrentBillingPeriod();

    // Use Redis pipeline for atomic multi-operation
    const pipeline = this.redis.pipeline();

    // Increment usage counters
    pipeline.hincrby(`usage:${userId}:${period}`, `rpc:${endpoint}`, 1);
    pipeline.hincrby(
      `usage:${userId}:${period}`,
      "compute_units",
      computeUnits,
    );
    pipeline.hincrby(`usage:${userId}:${period}`, "total_requests", 1);

    // Track for rate limiting (sliding window)
    const rateLimitKey = `rate:${userId}:${Math.floor(timestamp / 60000)}`; // Per minute
    pipeline.incr(rateLimitKey);
    pipeline.expire(rateLimitKey, 60); // Auto-cleanup

    // Record usage timeline for analytics
    pipeline.zadd(
      `timeline:${userId}`,
      timestamp,
      `${endpoint}:${computeUnits}`,
    );

    await pipeline.exec();

    // Async: Check if user hit limits (don't block RPC response)
    setImmediate(() => this.checkUsageLimits(userId, period));
  }

  /**
   * INTELLIGENT OVERAGE HANDLING
   * Triggered when users exceed their plan limits
   */
  async handleOverage(
    userId: string,
    overageType: string,
    amount: number,
  ): Promise<void> {
    this.logger.warn(`Overage detected: ${userId} - ${overageType}: ${amount}`);

    // Get user's subscription and overage policy
    const subscription = await this.subscriptions.getUserSubscription(userId);
    if (!subscription) return;

    // Different handling based on plan type
    switch (subscription.planType) {
      case "FREE":
        // Free users: Block after limit (with grace buffer)
        await this.enforceHardLimit(userId, overageType);
        break;

      case "STARTER":
        // Starter: Allow overage up to $10, then block
        await this.handleStarterOverage(userId, amount);
        break;

      case "PROFESSIONAL":
      case "ENTERPRISE":
        // Paid plans: Allow overage with next bill
        await this.recordBillableOverage(userId, overageType, amount);
        break;
    }
  }

  /**
   * STRIPE SYNCHRONIZATION (Every 5 minutes)
   * Syncs local usage data to Stripe for billing
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async syncToStripe(): Promise<void> {
    this.logger.log("Starting Stripe billing sync...");

    const activeUsers = await this.getActiveUsers();

    for (const userId of activeUsers) {
      if (this.syncInProgress.has(userId)) continue;

      try {
        this.syncInProgress.add(userId);
        await this.syncUserToStripe(userId);
      } catch (error) {
        this.logger.error(`Sync failed for user ${userId}:`, error);
      } finally {
        this.syncInProgress.delete(userId);
      }
    }
  }

  private async syncUserToStripe(userId: string): Promise<void> {
    // Get usage snapshot from Redis
    const usage = await this.getUsageSnapshot(userId);
    const totalCalls = Object.values(usage.rpcCalls).reduce(
      (sum, count) => sum + count,
      0,
    );
    if (!usage || totalCalls === 0) return;

    // Get user's Stripe subscription
    const subscription = await this.subscriptions.getUserSubscription(userId);
    if (!subscription?.id) return;

    // Convert N0DE usage to Stripe metered billing
    const usageRecords = this.convertToStripeUsage(usage, subscription);

    // Use Stripe to record usage
    for (const record of usageRecords) {
      await this.recordStripeUsage(record);
    }

    // Mark as synced in PostgreSQL
    await this.markSyncComplete(userId, usage.periodEnd);
  }

  /**
   * USAGE-BASED PRICING CALCULATION
   * Converts N0DE metrics to billable amounts
   */
  private convertToStripeUsage(
    usage: UsageSnapshot,
    subscription: any,
  ): StripeUsageRecord[] {
    const records: StripeUsageRecord[] = [];

    // API Calls Pricing (different rates per endpoint)
    const apiPricing = {
      getBalance: 0.001, // $0.001 per call
      getTransaction: 0.002, // $0.002 per call
      sendTransaction: 0.01, // $0.01 per call (higher cost)
      getBlock: 0.005, // $0.005 per call
      custom: 0.003, // $0.003 per call
    };

    // Calculate billable API usage
    let totalApiCost = 0;
    for (const [endpoint, count] of Object.entries(usage.rpcCalls)) {
      if (endpoint !== "total" && count > 0) {
        const cost = count * (apiPricing[endpoint] || apiPricing.custom);
        totalApiCost += cost;

        records.push({
          subscriptionItem: subscription.stripeItems.apiCalls,
          quantity: Math.ceil(cost * 100), // Convert to cents
          timestamp: Math.floor(usage.periodEnd.getTime() / 1000),
          action: "increment",
        });
      }
    }

    // Compute Units Pricing (based on actual server costs)
    if (usage.computeUnits.consumed > 0) {
      records.push({
        subscriptionItem: subscription.stripeItems.computeUnits,
        quantity: usage.computeUnits.cost, // Already in cents
        timestamp: Math.floor(usage.periodEnd.getTime() / 1000),
        action: "increment",
      });
    }

    return records;
  }

  /**
   * SMART QUOTA MANAGEMENT
   * Prevents bill shock while maintaining service quality
   */
  private async checkUsageLimits(
    userId: string,
    period: string,
  ): Promise<void> {
    const usage = await this.redis.hgetall(`usage:${userId}:${period}`);
    const subscription = await this.subscriptions.getUserSubscription(userId);

    if (!subscription) return;

    const limits = subscription.plan.limits;
    const currentUsage = {
      requests: parseInt(usage.total_requests || "0"),
      computeUnits: parseInt(usage.compute_units || "0"),
    };

    // Check soft limits (80% of quota)
    if (currentUsage.requests > limits.requests * 0.8) {
      await this.sendUsageWarning(
        userId,
        "API calls",
        currentUsage.requests,
        limits.requests,
      );
    }

    // Check hard limits
    if (currentUsage.requests >= limits.requests) {
      await this.handleOverage(
        userId,
        "api_limit",
        currentUsage.requests - limits.requests,
      );
    }
  }

  /**
   * WEBHOOK SYNCHRONIZATION
   * Keeps N0DE in sync with Stripe subscription changes
   */
  async processStripeWebhook(event: any): Promise<void> {
    this.logger.log(`Processing Stripe webhook: ${event.type}`);

    switch (event.type) {
      case "customer.subscription.updated":
        await this.handleSubscriptionUpdate(event.data.object);
        break;

      case "invoice.payment_succeeded":
        await this.handlePaymentSuccess(event.data.object);
        break;

      case "invoice.payment_failed":
        await this.handlePaymentFailure(event.data.object);
        break;

      case "customer.subscription.deleted":
        await this.handleSubscriptionCancellation(event.data.object);
        break;
    }
  }

  // Utility methods
  private getCurrentBillingPeriod(): string {
    return new Date().toISOString().slice(0, 7); // YYYY-MM format
  }

  private async getActiveUsers(): Promise<string[]> {
    // Get users who made RPC calls in last 24 hours
    const pattern = `usage:*:${this.getCurrentBillingPeriod()}`;
    const keys = await this.redis.keys(pattern);
    return keys.map((key) => key.split(":")[1]);
  }

  private async recordStripeUsage(record: StripeUsageRecord): Promise<void> {
    // This will use Stripe when we integrate it
    // For now, log the usage record
    this.logger.log(`Would record Stripe usage:`, record);
  }

  // Missing method implementations
  private async enforceHardLimit(
    userId: string,
    overageType: string,
  ): Promise<void> {
    this.logger.warn(
      `Enforcing hard limit for user ${userId}, type: ${overageType}`,
    );
    // Set rate limit block in Redis
    await this.redis.set(`blocked:${userId}`, overageType, 3600); // Block for 1 hour
  }

  private async handleStarterOverage(
    userId: string,
    amount: number,
  ): Promise<void> {
    const maxOverage = 1000; // $10 in cents
    const currentOverage = (await this.redis.get(`overage:${userId}`)) || "0";
    const totalOverage = parseInt(currentOverage) + amount;

    if (totalOverage > maxOverage) {
      await this.enforceHardLimit(userId, "starter_overage_limit");
    } else {
      await this.redis.set(`overage:${userId}`, totalOverage.toString());
    }
  }

  private async recordBillableOverage(
    userId: string,
    overageType: string,
    amount: number,
  ): Promise<void> {
    // Record overage for next billing cycle
    const key = `billable_overage:${userId}:${this.getCurrentBillingPeriod()}`;
    await this.redis.increment(key, amount);

    this.logger.log(
      `Recorded billable overage: ${userId} - ${overageType}: $${amount / 100}`,
    );
  }

  private async getUsageSnapshot(
    userId: string,
  ): Promise<UsageSnapshot | null> {
    const period = this.getCurrentBillingPeriod();
    const usage = await this.redis.hgetall(`usage:${userId}:${period}`);

    if (!usage || Object.keys(usage).length === 0) return null;

    return {
      userId,
      periodStart: new Date(period + "-01"),
      periodEnd: new Date(),
      rpcCalls: {
        getBalance: parseInt(usage["rpc:getBalance"] || "0"),
        getTransaction: parseInt(usage["rpc:getTransaction"] || "0"),
        sendTransaction: parseInt(usage["rpc:sendTransaction"] || "0"),
        getBlock: parseInt(usage["rpc:getBlock"] || "0"),
        custom: parseInt(usage["rpc:custom"] || "0"),
      },
      computeUnits: {
        consumed: parseInt(usage.compute_units || "0"),
        cost: parseInt(usage.compute_units || "0") * 0.01, // Basic cost calculation
      },
      rateLimitHits: parseInt(usage.rate_limit_hits || "0"),
      overageEvents: [], // Would be populated from timeline data
    };
  }

  private async markSyncComplete(
    userId: string,
    periodEnd: Date,
  ): Promise<void> {
    const key = `sync:${userId}:${this.getCurrentBillingPeriod()}`;
    await this.redis.set(key, periodEnd.toISOString(), 86400); // 24h TTL
  }

  private async sendUsageWarning(
    userId: string,
    type: string,
    current: number,
    limit: number,
  ): Promise<void> {
    this.logger.warn(
      `Usage warning for ${userId}: ${type} at ${current}/${limit} (${Math.round((current / limit) * 100)}%)`,
    );
    // Would send notification to user
  }

  private async handleSubscriptionUpdate(subscription: any): Promise<void> {
    this.logger.log(`Processing subscription update: ${subscription.id}`);
    // Update local subscription data
  }

  private async handlePaymentSuccess(invoice: any): Promise<void> {
    this.logger.log(`Payment succeeded for invoice: ${invoice.id}`);
    // Reset any payment failure flags
  }

  private async handlePaymentFailure(invoice: any): Promise<void> {
    this.logger.warn(`Payment failed for invoice: ${invoice.id}`);
    // Set grace period or suspend service
  }

  private async handleSubscriptionCancellation(
    subscription: any,
  ): Promise<void> {
    this.logger.warn(`Subscription cancelled: ${subscription.id}`);
    // Downgrade user to free tier
  }

  async adjustUsageLimits(userId: string, newPlan: any): Promise<void> {
    this.logger.log(
      `Adjusting usage limits for ${userId} to plan: ${newPlan.name}`,
    );
    // Update user limits in database
  }

  async enforceFreeTierLimits(userId: string): Promise<void> {
    this.logger.log(`Enforcing free tier limits for ${userId}`);
    // Set appropriate limits for free users
  }

  /**
   * Get current usage for a user
   */
  async getCurrentUsage(userId: string): Promise<any> {
    try {
      const currentPeriod = this.getCurrentPeriod();
      const requests = await this.redis.get(
        `usage:${userId}:${currentPeriod}:requests`,
      );
      const computeUnits = await this.redis.get(
        `usage:${userId}:${currentPeriod}:computeUnits`,
      );

      return {
        requests: parseInt(requests || "0"),
        computeUnits: parseFloat(computeUnits || "0"),
        period: currentPeriod,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error("Failed to get current usage:", error);
      return {
        requests: 0,
        computeUnits: 0,
        period: this.getCurrentPeriod(),
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get user subscription (delegates to SubscriptionsService)
   */
  async getUserSubscription(userId: string): Promise<any> {
    return this.subscriptions.getUserSubscription(userId);
  }

  /**
   * Sync subscription data from Stripe
   */
  async syncSubscriptionFromStripe(subscription: any): Promise<void> {
    try {
      this.logger.log(`Syncing subscription from Stripe: ${subscription.id}`);

      // Use Stripe to get latest subscription data
      const stripeData = await this.stripeService.getSubscription(
        subscription.stripeId || subscription.id,
      );

      // Update local subscription data
      await this.prisma.subscription.update({
        where: { userId: subscription.userId },
        data: {
          status: this.mapStripeStatus(stripeData.status),
          currentPeriodEnd: new Date(
            (stripeData as any).current_period_end * 1000,
          ),
          metadata: { ...(subscription.metadata as any), lastSync: new Date() },
        },
      });
    } catch (error) {
      this.logger.error("Failed to sync subscription from Stripe:", error);
      throw error;
    }
  }

  /**
   * Initialize usage tracking for a new user
   */
  async initializeUsageTracking(userId: string): Promise<void> {
    try {
      const currentPeriod = this.getCurrentPeriod();
      const key = `usage:${userId}:${currentPeriod}`;

      // Initialize usage counters if they don't exist
      const exists = await this.redis.exists(key);
      if (!exists) {
        await this.redis.set(`${key}:requests`, "0");
        await this.redis.set(`${key}:computeUnits`, "0");
        await this.redis.set(`${key}:initialized`, new Date().toISOString());

        // Set expiry for cleanup
        await this.redis.expire(key, 60 * 60 * 24 * 32); // 32 days

        this.logger.log(`Initialized usage tracking for user: ${userId}`);
      }
    } catch (error) {
      this.logger.error("Failed to initialize usage tracking:", error);
    }
  }

  private mapStripeStatus(
    stripeStatus: string,
  ): import("@prisma/client").SubscriptionStatus {
    const statusMap = {
      active: "ACTIVE" as const,
      canceled: "CANCELED" as const,
      incomplete: "PAST_DUE" as const,
      incomplete_expired: "EXPIRED" as const,
      past_due: "PAST_DUE" as const,
      trialing: "TRIALING" as const,
      unpaid: "UNPAID" as const,
    };

    return (statusMap[stripeStatus] ||
      "PAST_DUE") as import("@prisma/client").SubscriptionStatus;
  }

  private getCurrentPeriod(): string {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}`;
  }
}
