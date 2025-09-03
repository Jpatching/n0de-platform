import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY environment variable is not configured');
  }
  return new Stripe(secretKey, {
    apiVersion: '2024-11-20.acacia', // Use stable API version
  });
}

interface CreateSubscriptionRequest {
  planType: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
  customerEmail: string;
  customerName?: string;
}

// Define our subscription plans with pricing
const SUBSCRIPTION_PLANS = {
  STARTER: {
    name: 'Starter Plan',
    description: '1M requests/month, 5,000 RPS',
    amount: 9900, // $99.00 in cents
    interval: 'month'
  },
  PROFESSIONAL: {
    name: 'Professional Plan', 
    description: '10M requests/month, 50,000 RPS',
    amount: 29900, // $299.00 in cents
    interval: 'month'
  },
  ENTERPRISE: {
    name: 'Enterprise Plan',
    description: 'Unlimited requests, Custom RPS',
    amount: 99900, // $999.00 in cents  
    interval: 'month'
  }
};

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripe();
    const body: CreateSubscriptionRequest = await request.json();
    const { planType, customerEmail, customerName } = body;

    // Validate required fields
    if (!planType || !customerEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: planType, customerEmail' },
        { status: 400 }
      );
    }

    if (!SUBSCRIPTION_PLANS[planType]) {
      return NextResponse.json(
        { error: 'Invalid plan type' },
        { status: 400 }
      );
    }

    const plan = SUBSCRIPTION_PLANS[planType];

    // Find or create customer by email
    let customer: Stripe.Customer;
    const existingCustomers = await stripe.customers.list({
      email: customerEmail,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
    } else {
      customer = await stripe.customers.create({
        email: customerEmail,
        name: customerName,
        metadata: {
          source: 'n0de_platform',
          plan: planType,
        },
      });
    }

    // Create or find product for this plan
    let product: Stripe.Product;
    const existingProducts = await stripe.products.list({
      limit: 10,
    });
    
    const existingProduct = existingProducts.data.find(p => p.metadata.planType === planType);
    
    if (existingProduct) {
      product = existingProduct;
    } else {
      product = await stripe.products.create({
        name: plan.name,
        description: plan.description,
        metadata: {
          planType,
          source: 'n0de_platform',
        },
      });
    }

    // Create or find price for this plan
    let price: Stripe.Price;
    const existingPrices = await stripe.prices.list({
      product: product.id,
      limit: 10,
    });
    
    const existingPrice = existingPrices.data.find(p => 
      p.unit_amount === plan.amount && 
      p.recurring?.interval === plan.interval
    );
    
    if (existingPrice) {
      price = existingPrice;
    } else {
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: plan.amount,
        currency: 'usd',
        recurring: {
          interval: plan.interval as 'month' | 'year',
        },
        metadata: {
          planType,
          source: 'n0de_platform',
        },
      });
    }

    // Create checkout session for subscription
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: price.id,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}&payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?payment=cancelled`,
      subscription_data: {
        metadata: {
          planType,
          source: 'n0de_platform',
        },
      },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
    });

    return NextResponse.json({ 
      success: true,
      sessionId: session.id,
      sessionUrl: session.url,
      customer: {
        id: customer.id,
        email: customer.email,
      },
      product: {
        id: product.id,
        name: product.name,
      },
      price: {
        id: price.id,
        amount: price.unit_amount,
        currency: price.currency,
      },
      planType,
    });

  } catch (error) {
    console.error('Stripe subscription creation failed:', error);
    
    // Return detailed error information for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const stripeError = error as Stripe.StripeError;
    
    return NextResponse.json(
      { 
        error: 'Failed to create subscription',
        details: errorMessage,
        stripeError: stripeError.code || 'unknown_error',
        type: stripeError.type || 'api_error'
      },
      { status: 500 }
    );
  }
}