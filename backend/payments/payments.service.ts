import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import {
  PaymentProvider,
  PaymentStatus,
  SubscriptionType,
} from "@prisma/client";
import { CoinbaseCommerceService } from "./coinbase-commerce.service";
import { NOWPaymentsService } from "./nowpayments.service";
import { PaymentsStripeService } from "./stripe.service";
import { SubscriptionsService } from "../subscriptions/subscriptions.service";
import { CreatePaymentDto, PaymentCallbackDto } from "./dto/payments.dto";

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private coinbaseService: CoinbaseCommerceService,
    private nowPaymentsService: NOWPaymentsService,
    private stripeService: PaymentsStripeService,
    @Inject(forwardRef(() => SubscriptionsService))
    private subscriptionsService: SubscriptionsService,
  ) {}

  async createPayment(userId: string, createPaymentDto: CreatePaymentDto) {
    const {
      provider,
      planType,
      amount,
      currency = "USD",
      metadata,
    } = createPaymentDto;

    // Validate plan
    const plan = await this.subscriptionsService.getPlanByType(planType);
    if (!plan) {
      throw new BadRequestException("Invalid plan type");
    }

    // Validate amount matches plan price
    if (amount !== plan.price) {
      throw new BadRequestException("Payment amount does not match plan price");
    }

    // Get user details for payment processing
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!user) {
      throw new BadRequestException("User not found");
    }

    // Create payment record
    const payment = await this.prisma.payment.create({
      data: {
        userId,
        provider,
        amount,
        currency,
        status: PaymentStatus.PENDING,
        planType,
        metadata: {
          planName: plan.name,
          features: plan.limits.features,
          userEmail: user.email,
          userName: user.firstName
            ? `${user.firstName} ${user.lastName}`.trim()
            : user.email,
          ...metadata, // Include any additional metadata from the request
        },
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    // Create payment with provider
    let paymentData;
    try {
      switch (provider) {
        case PaymentProvider.COINBASE_COMMERCE:
          paymentData = await this.coinbaseService.createCharge(payment);
          break;
        case PaymentProvider.NOWPAYMENTS:
          paymentData = await this.nowPaymentsService.createPayment(payment);
          break;
        case PaymentProvider.STRIPE:
          // For direct card payments, create payment intent instead of checkout session
          const paymentMetadata = payment.metadata as any;
          if (paymentMetadata?.paymentType === "intent") {
            paymentData = await this.stripeService.createPaymentIntent(payment);
          } else {
            paymentData =
              await this.stripeService.createCheckoutSession(payment);
          }
          break;
        default:
          throw new BadRequestException("Unsupported payment provider");
      }

      // Update payment with provider data
      const updatedPayment = await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          providerPaymentId: paymentData.id || paymentData.sessionId,
          chargeUrl:
            paymentData.hosted_url ||
            paymentData.chargeUrl ||
            paymentData.url ||
            paymentData.checkoutUrl,
          paymentUrl:
            paymentData.payment_url ||
            paymentData.paymentUrl ||
            paymentData.url ||
            paymentData.checkoutUrl,
          metadata: {
            ...((payment.metadata as object) || {}),
            providerData: paymentData,
            // Include client_secret for Stripe payment intents
            ...(paymentData.client_secret && {
              clientSecret: paymentData.client_secret,
            }),
          },
        },
      });

      // Create payment history entry
      await this.prisma.paymentHistory.create({
        data: {
          userId: payment.userId,
          paymentId: payment.id,
          amount: Math.round(payment.amount * 100), // Convert to cents
          currency: payment.currency,
          status: PaymentStatus.PENDING,
          description: "Payment created with provider",
        },
      });

      return updatedPayment;
    } catch (error) {
      this.logger.error(
        `Failed to create payment with provider: ${error.message}`,
      );

      // Update payment status to failed
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          failedAt: new Date(),
        },
      });

      throw new BadRequestException(
        `Payment creation failed: ${error.message}`,
      );
    }
  }

  async getPayment(paymentId: string, userId?: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
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
        paymentHistory: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException("Payment not found");
    }

    // Check if user has permission to view this payment
    if (userId && payment.userId !== userId) {
      throw new BadRequestException("Access denied");
    }

    return payment;
  }

  async getUserPayments(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where: { userId },
        include: {
          paymentHistory: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.payment.count({
        where: { userId },
      }),
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

  async processWebhook(
    provider: PaymentProvider,
    payload: any,
    signature?: string,
  ) {
    let event;

    try {
      // Verify webhook signature
      switch (provider) {
        case PaymentProvider.COINBASE_COMMERCE:
          if (
            !this.coinbaseService.verifyWebhookSignature(payload, signature)
          ) {
            throw new Error("Invalid webhook signature");
          }
          event = payload.event;
          break;
        case PaymentProvider.NOWPAYMENTS:
          if (
            !this.nowPaymentsService.verifyWebhookSignature(payload, signature)
          ) {
            throw new Error("Invalid webhook signature");
          }
          event = payload;
          break;
        case PaymentProvider.STRIPE:
          event = await this.stripeService.handleWebhook(payload, signature);
          break;
        default:
          throw new Error("Unsupported payment provider");
      }

      // Check if we already processed this event
      const existingEvent = await this.prisma.webhookEvent.findUnique({
        where: { eventId: event.id },
      });

      if (existingEvent && existingEvent.processed) {
        this.logger.log(`Webhook event ${event.id} already processed`);
        return { processed: true, duplicate: true };
      }

      // Create webhook event record
      const webhookEvent = await this.prisma.webhookEvent.create({
        data: {
          provider,
          eventType: event.type,
          eventId: event.id,
          payload,
          processed: false,
        },
      });

      // Process the event
      const result = await this.handlePaymentEvent(webhookEvent);

      // Mark as processed
      await this.prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          processed: true,
          processedAt: new Date(),
        },
      });

      return result;
    } catch (error) {
      this.logger.error(
        `Webhook processing failed: ${error.message}`,
        error.stack,
      );

      // Store failed webhook event with better error handling
      if (payload) {
        try {
          const parsedPayload =
            typeof payload === "string" ? JSON.parse(payload) : payload;
          await this.prisma.webhookEvent.create({
            data: {
              provider,
              eventType: parsedPayload?.type || "unknown",
              eventId: parsedPayload?.id || `failed_${Date.now()}`,
              payload: parsedPayload,
              processed: false,
              errorMessage: error.message,
              retryCount: 1,
              createdAt: new Date(),
            },
          });
          this.logger.log(`Stored failed webhook event for retry`);
        } catch (dbError) {
          this.logger.error(
            `Failed to store webhook event for retry: ${dbError.message}`,
          );
        }
      }

      // Return error response that Stripe expects for webhook failures
      throw new BadRequestException({
        error: error.message,
        timestamp: new Date().toISOString(),
        webhook_retry: true,
      });
    }
  }

  private async handlePaymentEvent(webhookEvent: any) {
    const { provider, eventType, payload } = webhookEvent;

    let paymentId: string;
    let newStatus: PaymentStatus;

    switch (provider) {
      case PaymentProvider.COINBASE_COMMERCE:
        paymentId = payload.event.data.metadata?.paymentId;
        newStatus = this.mapCoinbaseStatus(payload.event.type);
        break;
      case PaymentProvider.NOWPAYMENTS:
        paymentId = payload.payment_id;
        newStatus = this.mapNOWPaymentsStatus(payload.payment_status);
        break;
      case PaymentProvider.STRIPE:
        paymentId = payload.paymentId;
        newStatus = this.mapStripeStatus(payload.type);
        break;
      default:
        throw new Error("Unsupported payment provider");
    }

    if (!paymentId) {
      throw new Error("Payment ID not found in webhook payload");
    }

    // Find payment
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { user: true },
    });

    if (!payment) {
      throw new Error(`Payment ${paymentId} not found`);
    }

    // Update payment status
    const updateData: any = {
      status: newStatus,
    };

    switch (newStatus) {
      case PaymentStatus.COMPLETED:
        updateData.paidAt = new Date();
        break;
      case PaymentStatus.FAILED:
        updateData.failedAt = new Date();
        break;
      case PaymentStatus.CANCELED:
        updateData.canceledAt = new Date();
        break;
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: updateData,
    });

    // Create payment history entry
    await this.prisma.paymentHistory.create({
      data: {
        userId: payment.userId,
        paymentId: payment.id,
        amount: Math.round(payment.amount * 100), // Convert to cents
        currency: payment.currency,
        status: newStatus,
        description: `Webhook: ${eventType}`,
      },
    });

    // If payment completed, activate subscription using secure payment-verified method
    if (newStatus === PaymentStatus.COMPLETED && payment.planType) {
      await this.subscriptionsService.completeUpgradeAfterPayment(
        payment.userId,
        payment.planType,
        payment.id,
        payment.providerPaymentId,
      );

      this.logger.log(
        `Subscription upgraded for user ${payment.userId} to ${payment.planType} after payment verification`,
      );
    }

    return { processed: true, status: newStatus };
  }

  private mapCoinbaseStatus(coinbaseStatus: string): PaymentStatus {
    switch (coinbaseStatus) {
      case "charge:confirmed":
        return PaymentStatus.COMPLETED;
      case "charge:failed":
        return PaymentStatus.FAILED;
      case "charge:delayed":
        return PaymentStatus.PROCESSING;
      case "charge:pending":
        return PaymentStatus.PENDING;
      case "charge:resolved":
        return PaymentStatus.COMPLETED;
      default:
        return PaymentStatus.PENDING;
    }
  }

  private mapNOWPaymentsStatus(nowStatus: string): PaymentStatus {
    switch (nowStatus) {
      case "finished":
        return PaymentStatus.COMPLETED;
      case "failed":
        return PaymentStatus.FAILED;
      case "expired":
        return PaymentStatus.EXPIRED;
      case "sending":
      case "confirming":
        return PaymentStatus.PROCESSING;
      case "waiting":
      case "partially_paid":
        return PaymentStatus.PENDING;
      default:
        return PaymentStatus.PENDING;
    }
  }

  private mapStripeStatus(stripeEventType: string): PaymentStatus {
    switch (stripeEventType) {
      case "payment_completed":
        return PaymentStatus.COMPLETED;
      case "subscription_renewed":
        return PaymentStatus.COMPLETED;
      case "subscription_cancelled":
        return PaymentStatus.CANCELED;
      default:
        return PaymentStatus.PROCESSING;
    }
  }

  async getPaymentStats(userId?: string) {
    const whereCondition = userId ? { userId } : {};

    const [totalPayments, completedPayments, revenue, recentPayments] =
      await Promise.all([
        this.prisma.payment.count({ where: whereCondition }),
        this.prisma.payment.count({
          where: { ...whereCondition, status: PaymentStatus.COMPLETED },
        }),
        this.prisma.payment.aggregate({
          where: { ...whereCondition, status: PaymentStatus.COMPLETED },
          _sum: { amount: true },
        }),
        this.prisma.payment.findMany({
          where: whereCondition,
          include: {
            user: {
              select: { id: true, email: true, username: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
      ]);

    return {
      totalPayments,
      completedPayments,
      successRate:
        totalPayments > 0 ? (completedPayments / totalPayments) * 100 : 0,
      totalRevenue: revenue._sum.amount || 0,
      recentPayments,
    };
  }

  async createOveragePayment(userId: string) {
    // Get current usage and check for overage
    const usage = await this.subscriptionsService.getUsageStats(userId);

    if (!usage.usage.requests.overage || usage.usage.requests.overage <= 0) {
      throw new BadRequestException("No overage to pay for");
    }

    const overageAmount = parseFloat(usage.usage.requests.overageCost);
    if (overageAmount <= 0) {
      throw new BadRequestException("Invalid overage amount");
    }

    // Create overage payment record
    const payment = await this.prisma.payment.create({
      data: {
        userId,
        provider: PaymentProvider.STRIPE, // Default to Stripe for overage payments
        amount: overageAmount,
        currency: "USD",
        status: PaymentStatus.PENDING,
        planType: SubscriptionType.FREE, // Overage payments don't change plan
        metadata: {
          type: "overage",
          requestsOverage: usage.usage.requests.overage,
          overageCost: usage.usage.requests.overageCost,
          billingPeriod: {
            start: usage.subscription.currentPeriodStart,
            end: usage.subscription.currentPeriodEnd,
          },
        },
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    // Create payment with Stripe for overage
    let paymentUrl: string;
    try {
      const result = await this.stripeService.createPayment({
        amount: overageAmount,
        currency: "USD",
        description: `Usage overage payment - ${usage.usage.requests.overage} requests`,
        metadata: {
          paymentId: payment.id,
          userId,
          type: "overage",
        },
      });

      paymentUrl = result.checkoutUrl || result.paymentUrl;
    } catch (error) {
      this.logger.error("Failed to create Stripe payment for overage:", error);
      // Fallback to a simple checkout URL
      paymentUrl = `/checkout/overage/${payment.id}`;
    }

    // Update payment with external URLs
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        paymentUrl,
        chargeUrl: paymentUrl,
      },
    });

    return {
      id: payment.id,
      amount: overageAmount,
      overageAmount: usage.usage.requests.overage,
      paymentUrl,
      expiresAt: payment.expiresAt,
      message: `Payment created for ${usage.usage.requests.overage} overage requests`,
    };
  }
}
