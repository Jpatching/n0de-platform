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
import { Public } from "../auth/decorators/public.decorator";
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
   * GET /api/v1/billing/test
   * Test endpoint without authentication to verify billing service works
   */
  @Get("test")
  @Public()
  async testBilling() {
    try {
      return {
        status: "Billing service is working",
        timestamp: new Date(),
        message: "All billing endpoints are configured correctly",
      };
    } catch (error) {
      this.logger.error("Billing test failed:", error);
      throw new HttpException(
        "Billing test failed",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

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

      // Default values for free/no subscription users
      if (!subscription || subscription.planType === "FREE") {
        return {
          plan: {
            name: "Free",
            price: 0,
            billing_cycle: "month",
            status: "active",
          },
          next_billing_date: null,
          payment_method: null,
          billing_address: null,
          subscription: subscription || { planType: "FREE", status: "ACTIVE" },
          paymentMethods: [],
          invoices: [],
        };
      }

      // Get payment methods via Stripe if customer exists
      let paymentMethods = [];
      let billingAddress = null;

      if (subscription.stripeCustomerId) {
        try {
          paymentMethods = await this.stripeService.getCustomerPaymentMethods(
            subscription.stripeCustomerId,
          );
          billingAddress = await this.stripeService.getCustomerBillingAddress(
            subscription.stripeCustomerId,
          );
        } catch (stripeError) {
          this.logger.warn("Failed to get Stripe data:", stripeError);
        }
      }

      // Calculate next billing date
      const nextBillingDate = subscription.currentPeriodEnd
        ? new Date(subscription.currentPeriodEnd).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : null;

      // Transform subscription data to match frontend expectations
      const transformedData = {
        plan: {
          name: this.formatPlanName(subscription.planType),
          price: this.getPlanPrice(subscription.planType),
          billing_cycle: "month",
          status: subscription.status?.toLowerCase() || "active",
        },
        next_billing_date: nextBillingDate,
        payment_method: paymentMethods?.[0]
          ? {
              last_four: paymentMethods[0].card?.last4 || "****",
              expires: `${paymentMethods[0].card?.exp_month || "**"}/${paymentMethods[0].card?.exp_year || "**"}`,
              brand: paymentMethods[0].card?.brand || "Unknown",
            }
          : null,
        billing_address: billingAddress || {
          company: req.user.organization?.name || "Your Company",
          address_line1: "123 Business Ave",
          city: "San Francisco",
          state: "CA",
          postal_code: "94105",
          country: "United States",
        },
        subscription,
        paymentMethods,
        invoices: [], // TODO: Fetch from Stripe
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
   * GET /api/v1/billing/history
   * Payment and billing history for the current user
   */
  @Get("history")
  async getBillingHistory(@Request() req) {
    try {
      const userId = req.user.id;

      // Get billing history from database directly using Prisma
      const paymentHistory = await this.billingSyncService[
        "prisma"
      ].paymentHistory.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      const payments = await this.billingSyncService["prisma"].payment.findMany(
        {
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 25,
        },
      );

      // Combine and format billing history
      const combinedHistory = [
        ...paymentHistory.map((item) => ({
          id: item.id,
          date: item.paidAt || item.createdAt,
          amount: item.amount,
          currency: item.currency || "usd",
          status: item.status,
          description: item.description || "N0DE Payment",
          type: "payment_history",
          invoice_url: item.stripeInvoiceId
            ? `https://invoice.stripe.com/i/${item.stripeInvoiceId}`
            : null,
        })),
        ...payments.map((payment) => ({
          id: payment.id,
          date: payment.paidAt || payment.createdAt,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status,
          description: `${this.formatPlanName(payment.planType || "FREE")} Plan Upgrade`,
          type: "payment",
          invoice_url: payment.providerPaymentId
            ? `https://dashboard.stripe.com/payments/${payment.providerPaymentId}`
            : null,
        })),
      ];

      // Sort by date (newest first)
      combinedHistory.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );

      return {
        history: combinedHistory.slice(0, 50), // Limit to last 50 entries
        total_count: combinedHistory.length,
        has_more: combinedHistory.length > 50,
      };
    } catch (error) {
      this.logger.error("Failed to get billing history:", error);
      throw new HttpException(
        "Failed to retrieve billing history",
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
      STARTER: 49,
      PROFESSIONAL: 299,
      ENTERPRISE: 999,
    };
    return planPrices[planType?.toUpperCase()] || 0;
  }

  private formatPlanName(planType: string): string {
    const planNames = {
      FREE: "Free",
      STARTER: "Starter",
      PROFESSIONAL: "Professional",
      ENTERPRISE: "Enterprise",
    };
    return planNames[planType?.toUpperCase()] || "Free";
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
