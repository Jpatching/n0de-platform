import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY environment variable is not configured');
  }
  return new Stripe(secretKey, {
    apiVersion: '2025-08-27.basil',
  });
}

function getEndpointSecret() {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('STRIPE_WEBHOOK_SECRET environment variable is not configured');
  }
  return secret;
}

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripe();
    const endpointSecret = getEndpointSecret();
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing Stripe signature' },
        { status: 400 }
      );
    }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing failed:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
  } catch (configError) {
    console.error('Stripe configuration error:', configError);
    return NextResponse.json(
      { error: 'Service configuration error' },
      { status: 503 }
    );
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log('Checkout session completed:', session.id);
  
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;
  const planId = session.metadata?.planId;
  
  if (subscriptionId && planId) {
    await activateCustomerPlan(customerId, planId, subscriptionId);
    await sendWelcomeEmail(customerId, planId);
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log('Subscription created:', subscription.id);
  
  const customerId = subscription.customer as string;
  const planId = subscription.metadata.planId;
  const status = subscription.status;
  
  await updateCustomerSubscription(customerId, {
    subscriptionId: subscription.id,
    planId,
    status,
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
  });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('Subscription updated:', subscription.id);
  
  const customerId = subscription.customer as string;
  const status = subscription.status;
  
  await updateCustomerSubscription(customerId, {
    subscriptionId: subscription.id,
    status,
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
  });
  
  // Handle subscription status changes
  if (status === 'active') {
    await enableApiAccess(customerId);
  } else if (status === 'past_due' || status === 'unpaid') {
    await suspendApiAccess(customerId);
  } else if (status === 'canceled') {
    await cancelApiAccess(customerId);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('Subscription deleted:', subscription.id);
  
  const customerId = subscription.customer as string;
  await cancelApiAccess(customerId);
  await sendCancellationEmail(customerId);
}

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment succeeded:', paymentIntent.id);
  
  const customerId = paymentIntent.customer as string;
  if (customerId) {
    await recordSuccessfulPayment(customerId, paymentIntent);
  }
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment failed:', paymentIntent.id);
  
  const customerId = paymentIntent.customer as string;
  if (customerId) {
    await handleFailedPayment(customerId, paymentIntent);
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('Invoice payment succeeded:', invoice.id);
  
  const customerId = invoice.customer as string;
  const subscriptionId = invoice.subscription as string;
  
  await recordInvoicePayment(customerId, subscriptionId, invoice);
  await enableApiAccess(customerId);
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log('Invoice payment failed:', invoice.id);
  
  const customerId = invoice.customer as string;
  const subscriptionId = invoice.subscription as string;
  
  await handleFailedInvoicePayment(customerId, subscriptionId, invoice);
  
  // Implement retry logic
  const attemptCount = invoice.attempt_count || 0;
  if (attemptCount >= 3) {
    await suspendApiAccess(customerId);
    await sendPaymentFailureNotification(customerId, 'final_notice');
  } else {
    await sendPaymentFailureNotification(customerId, 'retry_notice');
  }
}

// Helper functions (implement with your database)
async function activateCustomerPlan(customerId: string, planId: string, _subscriptionId: string) {
  console.log(`Activating ${planId} for customer ${customerId}`);
  
  const _planConfig = {
    starter: { rps: 5000, monthlyRequests: 1000000 },
    professional: { rps: 25000, monthlyRequests: 5000000 },
    enterprise: { rps: -1, monthlyRequests: 50000000 }
  };
  
  // const config = planConfig[planId as keyof typeof planConfig];
  
  // In production: Update database with subscription details
  // await database.updateCustomer(customerId, {
  //   subscriptionId,
  //   planId,
  //   rateLimit: config.rps,
  //   monthlyLimit: config.monthlyRequests,
  //   status: 'active'
  // });
}

async function updateCustomerSubscription(customerId: string, data: Record<string, unknown>) {
  console.log('Updating customer subscription:', customerId, data);
  // Implement database update
}

async function enableApiAccess(customerId: string) {
  console.log('Enabling API access for:', customerId);
  // Update API key status and rate limits
}

async function suspendApiAccess(customerId: string) {
  console.log('Suspending API access for:', customerId);
  // Disable API keys while preserving data
}

async function cancelApiAccess(customerId: string) {
  console.log('Canceling API access for:', customerId);
  // Full cancellation with data retention period
}

async function sendWelcomeEmail(customerId: string, _planId: string) {
  console.log('Sending welcome email to:', customerId);
  // Implement email service integration
}

async function sendCancellationEmail(customerId: string) {
  console.log('Sending cancellation email to:', customerId);
  // Implement email service integration
}

async function recordSuccessfulPayment(customerId: string, paymentIntent: Stripe.PaymentIntent) {
  console.log('Recording successful payment:', paymentIntent.id);
  // Record in payment history
}

async function handleFailedPayment(customerId: string, paymentIntent: Stripe.PaymentIntent) {
  console.log('Handling failed payment:', paymentIntent.id);
  // Implement retry logic and notifications
}

async function recordInvoicePayment(customerId: string, subscriptionId: string, invoice: Stripe.Invoice) {
  console.log('Recording invoice payment:', invoice.id);
  // Update billing records
}

async function handleFailedInvoicePayment(customerId: string, subscriptionId: string, invoice: Stripe.Invoice) {
  console.log('Handling failed invoice payment:', invoice.id);
  // Implement dunning management
}

async function sendPaymentFailureNotification(customerId: string, type: 'retry_notice' | 'final_notice') {
  console.log('Sending payment failure notification:', type);
  // Send appropriate email based on failure count
}