import { Module, forwardRef } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaService } from "../common/prisma.service";
import { RedisService } from "../common/redis.service";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";
import { EmailModule } from "../email/email.module";

// Core Billing Services
import { BillingSyncService } from "./billing-sync.service";
import { StripeService } from "./stripe.service";
import { WebhookProcessorService } from "./webhook-processor.service";
import { UsageAnalyticsService } from "./usage-analytics.service";

// Controllers
import { BillingController } from "./billing.controller";
// import { WebhookController } from './webhook.controller';
// import { AnalyticsController } from './analytics.controller';

/**
 * BillingModule: Clean Billing Infrastructure
 *
 * This module handles N0DE's billing operations:
 * - Usage tracking and synchronization
 * - Stripe integration for payments
 * - Webhook processing
 * - Subscription management
 */
@Module({
  imports: [ConfigModule, EmailModule, forwardRef(() => SubscriptionsModule)],
  providers: [
    // Core Infrastructure
    PrismaService,
    RedisService,

    // Billing Services
    BillingSyncService,
    StripeService,
    UsageAnalyticsService,
    WebhookProcessorService,
  ],
  controllers: [BillingController],
  exports: [
    BillingSyncService,
    StripeService,
    UsageAnalyticsService,
    WebhookProcessorService,
  ],
})
export class BillingModule {}
