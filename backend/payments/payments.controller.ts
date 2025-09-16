import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  Headers,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
  BadRequestException,
  Inject,
  forwardRef,
  RawBodyRequest,
  Req,
  Logger,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { PaymentsService } from "./payments.service";
import { SubscriptionsService } from "../subscriptions/subscriptions.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Public } from "../auth/decorators/public.decorator";
import { CreatePaymentDto, WebhookPayloadDto } from "./dto/payments.dto";
import { PaymentProvider, SubscriptionType } from "@prisma/client";

@ApiTags("payments")
@Controller("payments")
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private paymentsService: PaymentsService,
    @Inject(forwardRef(() => SubscriptionsService))
    private subscriptionsService: SubscriptionsService,
  ) {}

  @Post("stripe/create-intent")
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create Stripe payment intent" })
  @ApiResponse({
    status: 201,
    description: "Payment intent created successfully",
    schema: {
      type: "object",
      properties: {
        clientSecret: { type: "string" },
        paymentId: { type: "string" },
      },
    },
  })
  async createStripeIntent(
    @Request() req,
    @Body() body: { plan: string; amount: number },
  ) {
    const planMapping = {
      STARTER: SubscriptionType.STARTER,
      PROFESSIONAL: SubscriptionType.PROFESSIONAL,
      ENTERPRISE: SubscriptionType.ENTERPRISE,
    };

    const subscriptionType = planMapping[body.plan];
    if (!subscriptionType) {
      throw new BadRequestException("Invalid plan type");
    }

    const plan =
      await this.subscriptionsService.getPlanByType(subscriptionType);

    const payment = await this.paymentsService.createPayment(req.user.userId, {
      provider: PaymentProvider.STRIPE,
      planType: subscriptionType,
      amount: plan.price,
      currency: "USD",
      metadata: { paymentType: "intent" },
    });

    return {
      clientSecret: (payment.metadata as any)?.clientSecret,
      paymentId: payment.id,
    };
  }

  @Post("create-checkout")
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create checkout session for plan" })
  @ApiResponse({
    status: 201,
    description: "Checkout session created successfully",
    schema: {
      type: "object",
      properties: {
        checkoutUrl: { type: "string" },
        paymentId: { type: "string" },
        provider: { type: "string" },
      },
    },
  })
  async createCheckout(
    @Request() req,
    @Body() body: { plan: string; provider?: PaymentProvider },
  ) {
    // Map frontend plan names to backend SubscriptionType
    const planMapping = {
      STARTER: SubscriptionType.STARTER,
      PROFESSIONAL: SubscriptionType.PROFESSIONAL,
      ENTERPRISE: SubscriptionType.ENTERPRISE,
    };

    const subscriptionType = planMapping[body.plan];
    if (!subscriptionType) {
      throw new BadRequestException("Invalid plan type");
    }

    const plan =
      await this.subscriptionsService.getPlanByType(subscriptionType);
    const provider = body.provider || PaymentProvider.COINBASE_COMMERCE;

    const payment = await this.paymentsService.createPayment(req.user.userId, {
      provider,
      planType: subscriptionType,
      amount: plan.price,
      currency: "USD",
    });

    return {
      checkoutUrl: payment.paymentUrl || payment.chargeUrl,
      paymentId: payment.id,
      provider: payment.provider,
    };
  }

  @Get("history")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get payment history" })
  async getPaymentHistory(@Request() req) {
    return this.paymentsService.getUserPayments(req.user.userId, 1, 50);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a new payment" })
  @ApiResponse({
    status: 201,
    description: "Payment created successfully",
    schema: {
      type: "object",
      properties: {
        id: { type: "string" },
        userId: { type: "string" },
        provider: { type: "string" },
        amount: { type: "number" },
        currency: { type: "string" },
        status: { type: "string" },
        planType: { type: "string" },
        chargeUrl: { type: "string" },
        paymentUrl: { type: "string" },
        expiresAt: { type: "string", format: "date-time" },
        createdAt: { type: "string", format: "date-time" },
      },
    },
  })
  @ApiResponse({ status: 400, description: "Invalid payment data" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async createPayment(
    @Request() req,
    @Body() createPaymentDto: CreatePaymentDto,
  ) {
    return this.paymentsService.createPayment(
      req.user.userId,
      createPaymentDto,
    );
  }

  @Post("overage")
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 25, ttl: 60000 } })
  @ApiBearerAuth()
  @ApiOperation({ summary: "Pay for usage overage" })
  @ApiResponse({
    status: 201,
    description: "Overage payment created successfully",
    schema: {
      type: "object",
      properties: {
        id: { type: "string" },
        amount: { type: "number" },
        overageAmount: { type: "number" },
        paymentUrl: { type: "string" },
        expiresAt: { type: "string", format: "date-time" },
      },
    },
  })
  async createOveragePayment(@Request() req) {
    return this.paymentsService.createOveragePayment(req.user.userId);
  }

  @Post("subscription/upgrade/checkout")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get checkout URL for subscription plan upgrade" })
  @ApiResponse({
    status: 200,
    description: "Checkout URL created successfully",
    schema: {
      type: "object",
      properties: {
        checkoutUrl: { type: "string" },
        paymentId: { type: "string" },
        planName: { type: "string" },
        planPrice: { type: "number" },
        message: { type: "string" },
      },
    },
  })
  async getSubscriptionUpgradeCheckoutUrl(
    @Request() req,
    @Body() body: { planType: string },
  ) {
    const plan = await this.subscriptionsService.getPlanByType(
      body.planType as any,
    );
    if (!plan) {
      throw new BadRequestException("Invalid plan type");
    }

    // Convert planType string to SubscriptionType enum
    const subscriptionType = Object.values(SubscriptionType).find(
      (type) => type === body.planType,
    ) as SubscriptionType;

    if (!subscriptionType) {
      throw new BadRequestException("Invalid plan type");
    }

    // Create actual payment session
    const payment = await this.paymentsService.createPayment(req.user.userId, {
      provider: PaymentProvider.STRIPE,
      planType: subscriptionType,
      amount: plan.price,
      currency: "USD",
    });

    return {
      checkoutUrl: payment.paymentUrl || payment.chargeUrl,
      paymentId: payment.id,
      planName: plan.name,
      planPrice: plan.price,
      message: `Redirecting to Stripe checkout for ${plan.name} plan upgrade`,
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get user payments" })
  @ApiQuery({
    name: "page",
    required: false,
    type: Number,
    description: "Page number",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "Items per page",
  })
  @ApiResponse({
    status: 200,
    description: "User payments retrieved successfully",
    schema: {
      type: "object",
      properties: {
        payments: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              provider: { type: "string" },
              amount: { type: "number" },
              currency: { type: "string" },
              status: { type: "string" },
              planType: { type: "string" },
              createdAt: { type: "string", format: "date-time" },
              paidAt: { type: "string", format: "date-time", nullable: true },
            },
          },
        },
        pagination: {
          type: "object",
          properties: {
            page: { type: "number" },
            limit: { type: "number" },
            total: { type: "number" },
            pages: { type: "number" },
          },
        },
      },
    },
  })
  async getUserPayments(
    @Request() req,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.paymentsService.getUserPayments(req.user.userId, page, limit);
  }

  @Get("stats")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get user payment statistics" })
  @ApiResponse({
    status: 200,
    description: "Payment statistics retrieved successfully",
    schema: {
      type: "object",
      properties: {
        totalPayments: { type: "number" },
        completedPayments: { type: "number" },
        successRate: { type: "number" },
        totalRevenue: { type: "number" },
        recentPayments: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              amount: { type: "number" },
              status: { type: "string" },
              createdAt: { type: "string", format: "date-time" },
            },
          },
        },
      },
    },
  })
  async getUserPaymentStats(@Request() req) {
    return this.paymentsService.getPaymentStats(req.user.userId);
  }

  @Get("methods")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get user payment methods" })
  @ApiResponse({
    status: 200,
    description: "Payment methods retrieved successfully",
    schema: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          type: { type: "string" },
          last4: { type: "string" },
          brand: { type: "string" },
          expiryMonth: { type: "number" },
          expiryYear: { type: "number" },
          isDefault: { type: "boolean" },
        },
      },
    },
  })
  async getUserPaymentMethods(@Request() req) {
    // For now, return empty array since we're using external payment processors
    // In the future, this could return saved payment methods from Stripe
    return [];
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get payment by ID" })
  @ApiResponse({
    status: 200,
    description: "Payment retrieved successfully",
    schema: {
      type: "object",
      properties: {
        id: { type: "string" },
        userId: { type: "string" },
        provider: { type: "string" },
        amount: { type: "number" },
        currency: { type: "string" },
        status: { type: "string" },
        planType: { type: "string" },
        chargeUrl: { type: "string", nullable: true },
        paymentUrl: { type: "string", nullable: true },
        createdAt: { type: "string", format: "date-time" },
        paidAt: { type: "string", format: "date-time", nullable: true },
        user: {
          type: "object",
          properties: {
            id: { type: "string" },
            email: { type: "string" },
            username: { type: "string" },
          },
        },
        paymentHistory: {
          type: "array",
          items: {
            type: "object",
            properties: {
              status: { type: "string" },
              statusReason: { type: "string" },
              timestamp: { type: "string", format: "date-time" },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: "Payment not found" })
  async getPayment(@Request() req, @Param("id") paymentId: string) {
    return this.paymentsService.getPayment(paymentId, req.user.userId);
  }

  // Webhook endpoints
  @Public()
  @Post("webhooks/coinbase")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Coinbase Commerce webhook handler" })
  @ApiResponse({ status: 200, description: "Webhook processed successfully" })
  async coinbaseWebhook(
    @Body() payload: any,
    @Headers("X-CC-Webhook-Signature") signature: string,
  ) {
    return this.paymentsService.processWebhook(
      PaymentProvider.COINBASE_COMMERCE,
      payload,
      signature,
    );
  }

  @Public()
  @Post("webhooks/nowpayments")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "NOWPayments IPN webhook handler" })
  @ApiResponse({ status: 200, description: "Webhook processed successfully" })
  async nowpaymentsWebhook(
    @Body() payload: any,
    @Headers("x-nowpayments-sig") signature: string,
  ) {
    return this.paymentsService.processWebhook(
      PaymentProvider.NOWPAYMENTS,
      payload,
      signature,
    );
  }

  @Public()
  @Post("webhooks/stripe")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Stripe webhook handler" })
  @ApiResponse({ status: 200, description: "Webhook processed successfully" })
  async stripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers("Stripe-Signature") signature: string,
  ) {
    // Validate required parameters
    if (!signature) {
      throw new BadRequestException(
        "Webhook signature verification failed: No stripe-signature header value was provided",
      );
    }

    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new BadRequestException(
        "Webhook signature verification failed: No request body provided",
      );
    }

    try {
      return await this.paymentsService.processWebhook(
        PaymentProvider.STRIPE,
        rawBody.toString(),
        signature,
      );
    } catch (error) {
      this.logger.error(`Stripe webhook processing failed: ${error.message}`);
      throw new BadRequestException(
        `Invalid webhook signature: ${error.message}`,
      );
    }
  }
}
