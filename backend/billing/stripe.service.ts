import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";

// Pre-configured Stripe product/price IDs (created via Stripe Dashboard)
const STRIPE_PLAN_CONFIG = {
  FREE: {
    productId: "prod_free",
    priceId: "price_free",
  },
  STARTER: {
    productId: "prod_starter",
    priceId: "price_starter_monthly",
  },
  PROFESSIONAL: {
    productId: "prod_professional",
    priceId: "price_professional_monthly",
  },
  ENTERPRISE: {
    productId: "prod_enterprise",
    priceId: "price_enterprise_monthly",
  },
};

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private stripe: Stripe;

  constructor(private config: ConfigService) {
    const stripeSecretKey = this.config.get<string>("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY is required");
    }

    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-08-27.basil",
    });
  }

  /**
   * Create or retrieve Stripe customer
   */
  async createOrGetCustomer(
    userId: string,
    userEmail: string,
  ): Promise<string> {
    try {
      // Try to find existing customer
      const customers = await this.stripe.customers.list({
        email: userEmail,
        limit: 1,
      });

      if (customers.data.length > 0) {
        return customers.data[0].id;
      }

      // Create new customer
      const customer = await this.stripe.customers.create({
        email: userEmail,
        metadata: {
          n0de_user_id: userId,
        },
      });

      this.logger.log(
        `Created Stripe customer ${customer.id} for user ${userId}`,
      );
      return customer.id;
    } catch (error) {
      this.logger.error(
        `Failed to create/get Stripe customer for ${userId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Create checkout session for subscription upgrade
   */
  async createCheckoutSession(
    customerId: string,
    planType: string,
    successUrl: string,
    cancelUrl: string,
  ): Promise<Stripe.Checkout.Session> {
    try {
      const planConfig = STRIPE_PLAN_CONFIG[planType.toUpperCase()];
      if (!planConfig) {
        throw new Error(`Invalid plan type: ${planType}`);
      }

      const session = await this.stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        line_items: [
          {
            price: planConfig.priceId,
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          n0de_plan_type: planType,
        },
      });

      this.logger.log(
        `Created checkout session ${session.id} for plan ${planType}`,
      );
      return session;
    } catch (error) {
      this.logger.error(`Failed to create checkout session:`, error);
      throw error;
    }
  }

  /**
   * Get customer payment methods
   */
  async getCustomerPaymentMethods(customerId: string): Promise<any[]> {
    try {
      if (!customerId) {
        this.logger.warn("No customer ID provided for payment methods");
        return [];
      }

      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: "card",
      });

      return paymentMethods.data.map((pm) => ({
        id: pm.id,
        type: pm.type,
        last4: pm.card?.last4,
        brand: pm.card?.brand,
        expiryMonth: pm.card?.exp_month,
        expiryYear: pm.card?.exp_year,
      }));
    } catch (error) {
      this.logger.error(`Failed to list payment methods:`, error);
      return [];
    }
  }

  /**
   * Get customer billing address
   */
  async getCustomerBillingAddress(customerId: string): Promise<any> {
    try {
      if (!customerId) {
        this.logger.warn("No customer ID provided for billing address");
        return null;
      }

      const customer = (await this.stripe.customers.retrieve(
        customerId,
      )) as Stripe.Customer;

      if (!customer.address) return null;

      return {
        name: customer.name,
        line1: customer.address.line1,
        line2: customer.address.line2,
        city: customer.address.city,
        state: customer.address.state,
        postalCode: customer.address.postal_code,
        country: customer.address.country,
      };
    } catch (error) {
      this.logger.error(`Failed to get billing address:`, error);
      return null;
    }
  }

  /**
   * Get customer details
   */
  async getCustomer(customerId: string): Promise<Stripe.Customer | null> {
    try {
      const customer = (await this.stripe.customers.retrieve(
        customerId,
      )) as Stripe.Customer;
      return customer;
    } catch (error) {
      this.logger.error(`Failed to get customer ${customerId}:`, error);
      return null;
    }
  }

  /**
   * Get subscription details
   */
  async getSubscription(
    subscriptionId: string,
  ): Promise<Stripe.Subscription | null> {
    try {
      const subscription = await this.stripe.subscriptions.retrieve(
        subscriptionId,
        {
          expand: ["customer", "items.data.price"],
        },
      );
      return subscription;
    } catch (error) {
      this.logger.error(`Failed to get subscription ${subscriptionId}:`, error);
      return null;
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(
    subscriptionId: string,
  ): Promise<Stripe.Subscription> {
    try {
      const subscription = await this.stripe.subscriptions.update(
        subscriptionId,
        {
          cancel_at_period_end: true,
        },
      );

      this.logger.log(`Cancelled subscription ${subscriptionId}`);
      return subscription;
    } catch (error) {
      this.logger.error(
        `Failed to cancel subscription ${subscriptionId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Handle webhook events
   */
  async processWebhook(payload: string, signature: string): Promise<void> {
    try {
      const webhookSecret = this.config.get<string>("STRIPE_WEBHOOK_SECRET");
      if (!webhookSecret) {
        throw new Error("STRIPE_WEBHOOK_SECRET is required");
      }

      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret,
      );

      this.logger.log(`Processing webhook event: ${event.type}`);

      switch (event.type) {
        case "checkout.session.completed":
          await this.handleCheckoutCompleted(
            event.data.object as Stripe.Checkout.Session,
          );
          break;
        case "invoice.payment_succeeded":
          await this.handlePaymentSucceeded(
            event.data.object as Stripe.Invoice,
          );
          break;
        case "invoice.payment_failed":
          await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
          break;
        default:
          this.logger.log(`Unhandled event type: ${event.type}`);
      }
    } catch (error) {
      this.logger.error("Failed to process webhook:", error);
      throw error;
    }
  }

  private async handleCheckoutCompleted(
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    this.logger.log(`Checkout completed for session ${session.id}`);
    // TODO: Update user subscription in database
  }

  private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    this.logger.log(`Payment succeeded for invoice ${invoice.id}`);
    // TODO: Update payment status in database
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    this.logger.log(`Payment failed for invoice ${invoice.id}`);
    // TODO: Handle payment failure, notify user
  }
}
