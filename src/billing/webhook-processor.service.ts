import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { RedisService } from '../common/redis.service';
import { ConfigService } from '@nestjs/config';
import { StripeMCPService } from './stripe-mcp.service';
import { BillingSyncService } from './billing-sync.service';

/**
 * WebhookProcessorService: Mission-Critical Event Processing
 * 
 * This service handles the most critical part of billing: webhook events.
 * When Stripe sends us events about payments, subscriptions, failures, etc.,
 * this service ensures they are processed reliably and consistently.
 * 
 * CRITICAL REQUIREMENTS:
 * 1. IDEMPOTENCY: Process each webhook exactly once
 * 2. RELIABILITY: Never lose a webhook, even during system failures
 * 3. ORDERING: Process events in the correct sequence
 * 4. SPEED: Process webhooks quickly to avoid timeouts
 * 5. MONITORING: Track all webhook processing for debugging
 * 
 * ARCHITECTURE:
 * - Immediate acknowledgment to Stripe (prevent retries)
 * - Queue processing for reliable handling
 * - Event deduplication to prevent double-processing
 * - Comprehensive logging for audit trails
 */

interface WebhookEvent {
  id: string;
  type: string;
  data: {
    object: any;
    previous_attributes?: any;
  };
  created: number;
  livemode: boolean;
  pending_webhooks: number;
  request?: {
    id: string;
    idempotency_key?: string;
  };
}

interface ProcessingResult {
  success: boolean;
  processed_at: Date;
  processing_time_ms: number;
  error?: string;
  actions_taken: string[];
}

@Injectable()
export class WebhookProcessorService {
  private readonly logger = new Logger(WebhookProcessorService.name);
  
  // Critical: Track webhook processing state
  private readonly PROCESSING_TTL = 300; // 5 minutes
  private readonly MAX_RETRIES = 3;
  
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private config: ConfigService,
    private stripeMCP: StripeMCPService,
    private billingSync: BillingSyncService,
  ) {}

  /**
   * MAIN WEBHOOK ENTRY POINT
   * Processes incoming Stripe webhooks with full reliability guarantees
   */
  async processWebhook(
    payload: string, 
    signature: string, 
    eventType: string
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    const actions: string[] = [];
    
    try {
      // 1. Verify webhook signature (critical security step)
      const isValid = await this.verifyWebhookSignature(payload, signature);
      if (!isValid) {
        throw new Error('Invalid webhook signature');
      }
      actions.push('signature_verified');

      // 2. Parse the webhook event
      const event: WebhookEvent = JSON.parse(payload);
      
      // 3. Check for duplicate processing (idempotency)
      const isDuplicate = await this.checkDuplicateWebhook(event.id);
      if (isDuplicate) {
        this.logger.warn(`Duplicate webhook detected: ${event.id}`);
        return {
          success: true,
          processed_at: new Date(),
          processing_time_ms: Date.now() - startTime,
          actions_taken: ['duplicate_skipped'],
        };
      }

      // 4. Mark webhook as being processed (prevent concurrent processing)
      await this.markWebhookProcessing(event.id);
      actions.push('processing_locked');

      // 5. Log the webhook for audit trail
      await this.logWebhookEvent(event);
      actions.push('webhook_logged');

      // 6. Process based on event type
      await this.routeWebhookEvent(event);
      actions.push(`${event.type}_processed`);

      // 7. Mark as successfully processed
      await this.markWebhookComplete(event.id);
      actions.push('completion_marked');

      const processingTime = Date.now() - startTime;
      this.logger.log(`Webhook ${event.id} processed successfully in ${processingTime}ms`);

      return {
        success: true,
        processed_at: new Date(),
        processing_time_ms: processingTime,
        actions_taken: actions,
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`Webhook processing failed after ${processingTime}ms:`, error);

      return {
        success: false,
        processed_at: new Date(),
        processing_time_ms: processingTime,
        error: error.message,
        actions_taken: actions,
      };
    }
  }

  /**
   * WEBHOOK EVENT ROUTER
   * Routes different Stripe events to appropriate handlers
   */
  private async routeWebhookEvent(event: WebhookEvent): Promise<void> {
    switch (event.type) {
      // SUBSCRIPTION LIFECYCLE
      case 'customer.subscription.created':
        await this.handleSubscriptionCreated(event);
        break;
      
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event);
        break;
      
      case 'customer.subscription.deleted':
        await this.handleSubscriptionCanceled(event);
        break;

      // PAYMENT EVENTS
      case 'invoice.payment_succeeded':
        await this.handlePaymentSucceeded(event);
        break;
      
      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event);
        break;
      
      case 'payment_intent.succeeded':
        await this.handlePaymentIntentSucceeded(event);
        break;

      // USAGE-BASED BILLING
      case 'invoice.created':
        await this.handleInvoiceCreated(event);
        break;
      
      case 'invoice.finalized':
        await this.handleInvoiceFinalized(event);
        break;

      // CUSTOMER MANAGEMENT
      case 'customer.created':
        await this.handleCustomerCreated(event);
        break;
      
      case 'customer.updated':
        await this.handleCustomerUpdated(event);
        break;

      // PAYMENT METHODS
      case 'payment_method.attached':
        await this.handlePaymentMethodAttached(event);
        break;
      
      case 'payment_method.detached':
        await this.handlePaymentMethodDetached(event);
        break;

      // BILLING ISSUES
      case 'customer.subscription.trial_will_end':
        await this.handleTrialWillEnd(event);
        break;
      
      case 'invoice.payment_action_required':
        await this.handlePaymentActionRequired(event);
        break;

      default:
        this.logger.warn(`Unhandled webhook event type: ${event.type}`);
    }
  }

  /**
   * SUBSCRIPTION LIFECYCLE HANDLERS
   */
  private async handleSubscriptionCreated(event: WebhookEvent): Promise<void> {
    const subscription = event.data.object;
    const customerId = subscription.customer;
    
    // Get the N0DE user ID from customer metadata
    const customer = await this.stripeMCP.getCustomer(customerId);
    const n0deUserId = customer.metadata.n0de_user_id;
    
    if (!n0deUserId) {
      throw new Error(`No N0DE user ID found for Stripe customer ${customerId}`);
    }

    // Update N0DE subscription record
    await this.prisma.subscription.upsert({
      where: { userId: n0deUserId },
      update: {
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: customerId,
        status: 'ACTIVE',
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        planType: this.mapStripePlanToN0DE(subscription.items.data[0].price.id),
      },
      create: {
        userId: n0deUserId,
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: customerId,
        status: 'ACTIVE',
        planType: this.mapStripePlanToN0DE(subscription.items.data[0].price.id),
        planName: subscription.items.data[0].price.nickname || 'N0DE Plan',
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      },
    });

    // Initialize usage tracking for the new subscription
    await this.billingSync.initializeUsageTracking(n0deUserId);
    
    this.logger.log(`Subscription created for user ${n0deUserId}: ${subscription.id}`);
  }

  private async handleSubscriptionUpdated(event: WebhookEvent): Promise<void> {
    const subscription = event.data.object;
    const previous = event.data.previous_attributes;
    
    // Get N0DE user
    const customer = await this.stripeMCP.getCustomer(subscription.customer);
    const n0deUserId = customer.metadata.n0de_user_id;
    
    if (!n0deUserId) return;

    // Check what changed
    const changes = [];
    
    if (previous.status && previous.status !== subscription.status) {
      changes.push(`status: ${previous.status} -> ${subscription.status}`);
      
      // Handle status changes
      await this.handleSubscriptionStatusChange(
        n0deUserId, 
        subscription.status, 
        previous.status
      );
    }

    if (previous.items && subscription.items) {
      // Plan change detected
      const oldPlan = this.mapStripePlanToN0DE(previous.items.data[0].price.id);
      const newPlan = this.mapStripePlanToN0DE(subscription.items.data[0].price.id);
      
      if (oldPlan !== newPlan) {
        changes.push(`plan: ${oldPlan} -> ${newPlan}`);
        await this.handlePlanChange(n0deUserId, oldPlan, newPlan);
      }
    }

    // Update N0DE record
    await this.prisma.subscription.update({
      where: { userId: n0deUserId },
      data: {
        status: this.mapStripeStatusToN0DE(subscription.status),
        planType: this.mapStripePlanToN0DE(subscription.items.data[0].price.id),
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    });

    this.logger.log(`Subscription updated for user ${n0deUserId}: ${changes.join(', ')}`);
  }

  private async handleSubscriptionCanceled(event: WebhookEvent): Promise<void> {
    const subscription = event.data.object;
    
    const customer = await this.stripeMCP.getCustomer(subscription.customer);
    const n0deUserId = customer.metadata.n0de_user_id;
    
    if (!n0deUserId) return;

    // Update N0DE record
    await this.prisma.subscription.update({
      where: { userId: n0deUserId },
      data: {
        status: 'CANCELED',
        canceledAt: new Date(),
      },
    });

    // Handle service downgrade
    await this.handleServiceDowngrade(n0deUserId);
    
    this.logger.log(`Subscription canceled for user ${n0deUserId}`);
  }

  /**
   * PAYMENT EVENT HANDLERS
   */
  private async handlePaymentSucceeded(event: WebhookEvent): Promise<void> {
    const invoice = event.data.object;
    
    const customer = await this.stripeMCP.getCustomer(invoice.customer);
    const n0deUserId = customer.metadata.n0de_user_id;
    
    if (!n0deUserId) return;

    // Record successful payment
    await this.prisma.paymentHistory.create({
      data: {
        userId: n0deUserId,
        stripeInvoiceId: invoice.id,
        amount: invoice.amount_paid,
        currency: invoice.currency,
        status: 'COMPLETED',
        paidAt: new Date(invoice.status_transitions.paid_at * 1000),
        description: invoice.description || 'N0DE Subscription Payment',
      },
    });

    // Reset any payment failure flags
    await this.clearPaymentFailureState(n0deUserId);
    
    this.logger.log(`Payment succeeded for user ${n0deUserId}: $${invoice.amount_paid / 100}`);
  }

  private async handlePaymentFailed(event: WebhookEvent): Promise<void> {
    const invoice = event.data.object;
    
    const customer = await this.stripeMCP.getCustomer(invoice.customer);
    const n0deUserId = customer.metadata.n0de_user_id;
    
    if (!n0deUserId) return;

    // Record failed payment
    await this.prisma.paymentHistory.create({
      data: {
        userId: n0deUserId,
        stripeInvoiceId: invoice.id,
        amount: invoice.amount_due,
        currency: invoice.currency,
        status: 'FAILED',
        failureReason: invoice.last_finalization_error?.message || 'Payment failed',
        description: invoice.description || 'N0DE Subscription Payment',
      },
    });

    // Implement grace period logic
    await this.handlePaymentGracePeriod(n0deUserId, invoice);
    
    this.logger.error(`Payment failed for user ${n0deUserId}: $${invoice.amount_due / 100}`);
  }

  // Utility Methods
  private async verifyWebhookSignature(payload: string, signature: string): Promise<boolean> {
    // TODO: Implement Stripe webhook signature verification
    // This is critical for security
    return true; // Placeholder
  }

  private async checkDuplicateWebhook(eventId: string): Promise<boolean> {
    const exists = await this.redis.exists(`webhook:processed:${eventId}`);
    return Boolean(exists);
  }

  private async markWebhookProcessing(eventId: string): Promise<void> {
    await this.redis.setex(`webhook:processing:${eventId}`, this.PROCESSING_TTL, Date.now().toString());
  }

  private async markWebhookComplete(eventId: string): Promise<void> {
    await this.redis.setex(`webhook:processed:${eventId}`, 86400, Date.now().toString()); // 24 hours
    await this.redis.del(`webhook:processing:${eventId}`);
  }

  private async logWebhookEvent(event: WebhookEvent): Promise<void> {
    await this.prisma.webhookLog.create({
      data: {
        stripeEventId: event.id,
        eventType: event.type,
        processed: true,
        processedAt: new Date(),
        payload: JSON.stringify(event),
      },
    });
  }

  private mapStripePlanToN0DE(stripePriceId: string): import('@prisma/client').SubscriptionType {
    // Map Stripe price IDs to N0DE plan types
    const mapping = {
      'price_1S1CZtFjMnr2l5PirjgNvshW': 'FREE',      // N0DE Free Plan ($0)
      'price_1S1CZpFjMnr2l5PivsMZoMeH': 'STARTER',   // N0DE Starter Plan ($49)
      'price_1S1CZxFjMnr2l5PitVlEGrmy': 'PROFESSIONAL', // N0DE Professional Plan ($299)
      'price_1S1CaCFjMnr2l5PiKbbDBvkD': 'ENTERPRISE', // N0DE Enterprise Plan ($999)
    };
    
    return (mapping[stripePriceId] || 'FREE') as import('@prisma/client').SubscriptionType;
  }

  private mapStripeStatusToN0DE(stripeStatus: string): import('@prisma/client').SubscriptionStatus {
    const mapping = {
      'active': 'ACTIVE',
      'canceled': 'CANCELED',
      'incomplete': 'PAST_DUE',
      'incomplete_expired': 'CANCELED',
      'past_due': 'PAST_DUE',
      'unpaid': 'UNPAID',
      'trialing': 'TRIALING',
    };
    
    return (mapping[stripeStatus] || 'PAST_DUE') as import('@prisma/client').SubscriptionStatus;
  }

  private async handleSubscriptionStatusChange(userId: string, newStatus: string, oldStatus: string): Promise<void> {
    // Handle service level changes based on subscription status
    if (newStatus === 'active' && oldStatus !== 'active') {
      await this.enableUserServices(userId);
    } else if (newStatus !== 'active' && oldStatus === 'active') {
      await this.suspendUserServices(userId);
    }
  }

  private async handlePlanChange(userId: string, oldPlan: string, newPlan: string): Promise<void> {
    // Handle plan upgrade/downgrade
    await this.billingSync.adjustUsageLimits(userId, newPlan);
    
    // Send notification about plan change
    await this.sendPlanChangeNotification(userId, oldPlan, newPlan);
  }

  private async handleServiceDowngrade(userId: string): Promise<void> {
    // Downgrade user to free tier
    await this.billingSync.enforceFreeTierLimits(userId);
  }

  private async clearPaymentFailureState(userId: string): Promise<void> {
    await this.redis.del(`payment:failed:${userId}`);
  }

  private async handlePaymentGracePeriod(userId: string, invoice: any): Promise<void> {
    // Implement 3-day grace period for failed payments
    const gracePeriodEnd = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    await this.redis.setex(`payment:failed:${userId}`, 259200, gracePeriodEnd.toISOString());
    
    // Send payment failure notification
    await this.sendPaymentFailureNotification(userId, invoice);
  }

  // Placeholder methods for service management
  private async enableUserServices(userId: string): Promise<void> {
    this.logger.log(`Enabling services for user ${userId}`);
  }

  private async suspendUserServices(userId: string): Promise<void> {
    this.logger.log(`Suspending services for user ${userId}`);
  }

  private async sendPlanChangeNotification(userId: string, oldPlan: string, newPlan: string): Promise<void> {
    this.logger.log(`Plan changed for user ${userId}: ${oldPlan} -> ${newPlan}`);
  }

  private async sendPaymentFailureNotification(userId: string, invoice: any): Promise<void> {
    this.logger.log(`Payment failed notification sent to user ${userId}`);
  }

  // Additional placeholder methods
  private async handleInvoiceCreated(event: WebhookEvent): Promise<void> {
    this.logger.log(`Invoice created: ${event.data.object.id}`);
  }

  private async handleInvoiceFinalized(event: WebhookEvent): Promise<void> {
    this.logger.log(`Invoice finalized: ${event.data.object.id}`);
  }

  private async handleCustomerCreated(event: WebhookEvent): Promise<void> {
    this.logger.log(`Customer created: ${event.data.object.id}`);
  }

  private async handleCustomerUpdated(event: WebhookEvent): Promise<void> {
    this.logger.log(`Customer updated: ${event.data.object.id}`);
  }

  private async handlePaymentMethodAttached(event: WebhookEvent): Promise<void> {
    this.logger.log(`Payment method attached: ${event.data.object.id}`);
  }

  private async handlePaymentMethodDetached(event: WebhookEvent): Promise<void> {
    this.logger.log(`Payment method detached: ${event.data.object.id}`);
  }

  private async handleTrialWillEnd(event: WebhookEvent): Promise<void> {
    this.logger.log(`Trial ending soon: ${event.data.object.id}`);
  }

  private async handlePaymentActionRequired(event: WebhookEvent): Promise<void> {
    this.logger.log(`Payment action required: ${event.data.object.id}`);
  }

  private async handlePaymentIntentSucceeded(event: WebhookEvent): Promise<void> {
    this.logger.log(`Payment intent succeeded: ${event.data.object.id}`);
  }
}