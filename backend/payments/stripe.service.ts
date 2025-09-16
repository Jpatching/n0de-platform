import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";

@Injectable()
export class PaymentsStripeService {
  private readonly logger = new Logger(PaymentsStripeService.name);
  private stripe: Stripe;

  constructor(private configService: ConfigService) {
    const stripeSecretKey = this.configService.get<string>("STRIPE_SECRET_KEY");
    if (stripeSecretKey) {
      this.stripe = new Stripe(stripeSecretKey, {
        apiVersion: "2025-08-27.basil",
      });
    }
  }

  async createCheckoutSession(payment: any) {
    if (!this.stripe) {
      throw new Error(
        "Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.",
      );
    }

    try {
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "subscription",
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `N0DE ${payment.planType} Plan`,
                description: `N0DE RPC Infrastructure - ${payment.planType} Plan Subscription`,
                images: ["https://n0de.pro/logo.png"], // Add your logo URL
              },
              unit_amount: payment.amount * 100, // Convert to cents
              recurring: {
                interval: "month",
              },
            },
            quantity: 1,
          },
        ],
        success_url: `${this.configService.get("FRONTEND_URL")}/payment/success?session_id={CHECKOUT_SESSION_ID}&paymentId=${payment.id}`,
        cancel_url: `${this.configService.get("FRONTEND_URL")}/checkout?plan=${payment.planType}`,
        metadata: {
          paymentId: payment.id,
          userId: payment.userId,
          planType: payment.planType,
        },
        customer_email: payment.userEmail, // You'll need to pass this from the frontend
        subscription_data: {
          metadata: {
            paymentId: payment.id,
            userId: payment.userId,
            planType: payment.planType,
          },
        },
      });

      this.logger.log(`Created Stripe checkout session: ${session.id}`);

      return {
        id: session.id,
        url: session.url,
        sessionId: session.id,
        checkoutUrl: session.url,
      };
    } catch (error) {
      this.logger.error(
        `Stripe checkout session creation failed: ${error.message}`,
      );
      throw new Error(
        `Failed to create Stripe checkout session: ${error.message}`,
      );
    }
  }

  async createPaymentIntent(payment: any) {
    if (!this.stripe) {
      throw new Error(
        "Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.",
      );
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: payment.amount * 100, // Convert to cents
        currency: "usd",
        metadata: {
          paymentId: payment.id,
          userId: payment.userId,
          planType: payment.planType,
        },
        description: `N0DE ${payment.planType} Plan Subscription`,
      });

      this.logger.log(`Created Stripe PaymentIntent: ${paymentIntent.id}`);

      return {
        id: paymentIntent.id,
        client_secret: paymentIntent.client_secret,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create Stripe PaymentIntent: ${error.message}`,
      );
      throw error;
    }
  }

  async handleWebhook(payload: string, signature: string) {
    const webhookSecret = this.configService.get<string>(
      "STRIPE_WEBHOOK_SECRET",
    );

    if (!webhookSecret) {
      throw new Error("Stripe webhook secret is not configured");
    }

    if (!signature) {
      throw new Error("No stripe-signature header value was provided");
    }

    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret,
      );

      this.logger.log(`Received Stripe webhook: ${event.type}`);

      switch (event.type) {
        case "checkout.session.completed":
          const session = event.data.object as Stripe.Checkout.Session;
          return {
            type: "payment_completed",
            paymentId: session.metadata?.paymentId,
            userId: session.metadata?.userId,
            planType: session.metadata?.planType,
            stripeSessionId: session.id,
            customerEmail: session.customer_email,
          };

        case "invoice.payment_succeeded":
          const invoice = event.data.object as Stripe.Invoice;
          return {
            type: "subscription_renewed",
            subscriptionId: (invoice as any).subscription || null,
            customerId: invoice.customer,
            amount: invoice.amount_paid,
          };

        case "customer.subscription.deleted":
          const subscription = event.data.object as Stripe.Subscription;
          return {
            type: "subscription_cancelled",
            subscriptionId: subscription.id,
            customerId: subscription.customer,
          };

        default:
          this.logger.log(`Unhandled Stripe webhook event type: ${event.type}`);
          return null;
      }
    } catch (error) {
      this.logger.error(`Stripe webhook handling failed: ${error.message}`);
      throw new Error(
        `Webhook signature verification failed: ${error.message}`,
      );
    }
  }

  async createPayment(options: {
    amount: number;
    currency: string;
    description: string;
    metadata?: any;
  }) {
    if (!this.stripe) {
      throw new Error(
        "Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.",
      );
    }

    try {
      // Create a checkout session for one-time payment
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: options.currency.toLowerCase(),
              product_data: {
                name: "N0DE API Usage Overage",
                description: options.description,
                images: ["https://n0de.pro/logo.png"],
              },
              unit_amount: Math.round(options.amount * 100), // Convert to cents
            },
            quantity: 1,
          },
        ],
        success_url: `${this.configService.get("FRONTEND_URL")}/payment/success?session_id={CHECKOUT_SESSION_ID}&type=overage`,
        cancel_url: `${this.configService.get("FRONTEND_URL")}/dashboard/billing`,
        metadata: options.metadata || {},
      });

      this.logger.log(`Created Stripe payment session: ${session.id}`);

      return {
        id: session.id,
        url: session.url,
        sessionId: session.id,
        checkoutUrl: session.url,
        paymentUrl: session.url,
      };
    } catch (error) {
      this.logger.error(`Stripe payment creation failed: ${error.message}`);
      throw new Error(`Failed to create Stripe payment: ${error.message}`);
    }
  }

  async retrieveSession(sessionId: string) {
    if (!this.stripe) {
      throw new Error("Stripe is not configured");
    }

    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId);
      return session;
    } catch (error) {
      this.logger.error(`Failed to retrieve Stripe session: ${error.message}`);
      throw error;
    }
  }

  async cancelSubscription(subscriptionId: string) {
    if (!this.stripe) {
      throw new Error("Stripe is not configured");
    }

    try {
      const subscription =
        await this.stripe.subscriptions.cancel(subscriptionId);
      return subscription;
    } catch (error) {
      this.logger.error(
        `Failed to cancel Stripe subscription: ${error.message}`,
      );
      throw error;
    }
  }
}
