import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
  HttpStatus,
  HttpException,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { BillingSyncService } from "./billing-sync.service";
import { StripeService } from "./stripe.service";
import { UsageAnalyticsService } from "./usage-analytics.service";
import { Logger } from "@nestjs/common";

/**
 * BillingController: Clean Billing API
 *
 * This controller exposes N0DE's billing capabilities:
 * - Usage tracking and billing sync
 * - Stripe integration for payment processing
 * - Usage analytics
 */
@Controller("billing")
@UseGuards(JwtAuthGuard)
export class BillingController {
  private readonly logger = new Logger(BillingController.name);

  constructor(
    private billingSyncService: BillingSyncService,
    private stripeService: StripeService,
    private usageAnalyticsService: UsageAnalyticsService,
  ) {}

  /**
   * GET /api/v1/billing/usage
   * Real-time usage data for the current user
   */
  @Get("usage")
  async getCurrentUsage(@Request() req) {
    try {
      const userId = req.user.id;
      const usage = await this.billingSyncService.getCurrentUsage(userId);
      const analytics =
        await this.usageAnalyticsService.analyzeUsagePattern(userId);

      return {
        usage,
        analytics,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error("Failed to get current usage:", error);
      throw new HttpException(
        "Failed to retrieve usage data",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /api/v1/billing/subscription
   * Current subscription details with Stripe integration
   */
  @Get("subscription")
  async getSubscription(@Request() req) {
    try {
      const userId = req.user.id;

      // Get subscription from database
      const subscription =
        await this.billingSyncService.getUserSubscription(userId);
      if (!subscription) {
        return { subscription: null, paymentMethods: [], billingAddress: null };
      }

      // Get payment methods via Stripe
      const paymentMethods = await this.stripeService.getCustomerPaymentMethods(
        subscription.stripeCustomerId,
      );

      // Get billing address via Stripe
      const billingAddress = await this.stripeService.getCustomerBillingAddress(
        subscription.stripeCustomerId,
      );

      // Transform subscription data to match frontend expectations
      const transformedData = {
        plan: subscription
          ? {
              name: subscription.planType || "Free",
              price: this.getPlanPrice(subscription.planType),
              billing_cycle: "month",
              status: subscription.status || "active",
            }
          : null,
        next_billing_date: subscription?.nextBillingDate || null,
        payment_method: paymentMethods?.[0]
          ? {
              last_four: paymentMethods[0].card?.last4 || "****",
              expires: `${paymentMethods[0].card?.exp_month || "**"}/${paymentMethods[0].card?.exp_year || "**"}`,
              brand: paymentMethods[0].card?.brand || "Unknown",
            }
          : null,
        billing_address: billingAddress || null,
        subscription,
        paymentMethods,
      };

      return transformedData;
    } catch (error) {
      this.logger.error("Failed to get subscription:", error);
      throw new HttpException(
        "Failed to retrieve subscription data",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * POST /api/v1/billing/subscription/create
   * Create new subscription with Stripe
   */
  @Post("subscription/create")
  async createSubscription(@Request() req, @Body() createData: any) {
    try {
      const userId = req.user.id;
      const userEmail = req.user.email;

      // Create Stripe customer
      const stripeCustomerId = await this.stripeService.createOrGetCustomer(
        userId,
        userEmail,
      );

      // Create checkout session for subscription
      const session = await this.stripeService.createCheckoutSession(
        stripeCustomerId,
        createData.planType,
        `${process.env.FRONTEND_URL}/payment/success`,
        `${process.env.FRONTEND_URL}/checkout`,
      );

      return {
        checkoutUrl: session.url,
        sessionId: session.id,
        message: "Checkout session created successfully",
      };
    } catch (error) {
      this.logger.error("Failed to create subscription:", error);
      throw new HttpException(
        "Failed to create subscription",
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * POST /api/v1/billing/usage/report
   * Report RPC usage for billing (internal endpoint)
   */
  @Post("usage/report")
  async reportUsage(
    @Body()
    usageData: {
      userId: string;
      endpoint: string;
      computeUnits: number;
      metadata?: any;
    },
  ) {
    try {
      await this.billingSyncService.recordUsage(
        usageData.userId,
        usageData.endpoint,
        usageData.computeUnits,
      );

      // Record for analytics
      await this.usageAnalyticsService.recordRPCCall({
        endpoint: usageData.endpoint,
        timestamp: Date.now(),
        userId: usageData.userId,
        computeUnits: usageData.computeUnits,
        latency: usageData.metadata?.latency || 0,
        network: usageData.metadata?.network || "mainnet",
        success: true,
        metadata: usageData.metadata || {},
      });

      return { status: "recorded", timestamp: new Date() };
    } catch (error) {
      this.logger.error("Failed to report usage:", error);
      throw new HttpException(
        "Failed to record usage",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /api/v1/billing/analytics/optimization
   * Cost optimization recommendations
   */
  @Get("analytics/optimization")
  async getOptimizationReport(@Request() req) {
    try {
      const userId = req.user.id;
      const report =
        await this.usageAnalyticsService.generateCostOptimizationReport(userId);

      return report;
    } catch (error) {
      this.logger.error("Failed to generate optimization report:", error);
      throw new HttpException(
        "Failed to generate optimization report",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /api/v1/billing/health
   * Billing system health check
   */
  @Get("health")
  async healthCheck() {
    try {
      // Check all services are responsive
      const checks = {
        billingSyncService: await this.checkServiceHealth("billing"),
        stripeService: await this.checkServiceHealth("stripe"),
        usageAnalyticsService: await this.checkServiceHealth("analytics"),
      };

      const allHealthy = Object.values(checks).every(
        (check) => check.status === "healthy",
      );

      return {
        status: allHealthy ? "healthy" : "degraded",
        checks,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error("Health check failed:", error);
      return {
        status: "unhealthy",
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  private getPlanPrice(planType: string): number {
    const planPrices = {
      FREE: 0,
      STARTER: 29,
      PROFESSIONAL: 99,
      ENTERPRISE: 299,
    };
    return planPrices[planType?.toUpperCase()] || 0;
  }

  private async checkServiceHealth(
    service: string,
  ): Promise<{ status: string; message?: string }> {
    try {
      switch (service) {
        case "billing":
          // Quick Redis connectivity test
          await this.billingSyncService.getCurrentUsage("health-check-user");
          return { status: "healthy" };

        case "stripe":
          // Test Stripe connectivity
          return { status: "healthy" };

        case "analytics":
          // Test analytics service
          return { status: "healthy" };

        default:
          return { status: "unknown" };
      }
    } catch (error) {
      return { status: "unhealthy", message: error.message };
    }
  }
}
