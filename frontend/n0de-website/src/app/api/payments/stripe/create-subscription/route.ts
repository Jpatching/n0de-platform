import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// In-memory cache for checkout sessions (5 minute expiry)
const sessionCache = new Map<string, { session: Stripe.Checkout.Session; expires: number }>();

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY environment variable is not configured');
  }
  return new Stripe(secretKey, {
    apiVersion: '2024-12-18.acacia',
  });
}

interface CreateSubscriptionRequest {
  planId: string;
  priceId: string;
  customerId: string;
  paymentMethodTypes: string[];
}

function getCacheKey(customerId: string, priceId: string): string {
  return `${customerId}_${priceId}`;
}

function cleanExpiredSessions() {
  const now = Date.now();
  for (const [key, value] of sessionCache.entries()) {
    if (value.expires < now) {
      sessionCache.delete(key);
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    // Clean expired cache entries
    cleanExpiredSessions();
    
    const stripe = getStripe();
    const body: CreateSubscriptionRequest = await request.json();
    const { planId, priceId, customerId, paymentMethodTypes } = body;

    // Check cache for existing session
    const cacheKey = getCacheKey(customerId, priceId);
    const cached = sessionCache.get(cacheKey);
    
    if (cached && cached.expires > Date.now()) {
      console.log('Returning cached checkout session for:', cacheKey);
      return NextResponse.json({ 
        sessionId: cached.session.id,
        sessionUrl: cached.session.url,
        fromCache: true
      });
    }

    // Create or retrieve customer
    let customer: Stripe.Customer;
    try {
      customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
    } catch {
      customer = await stripe.customers.create({
        id: customerId,
        metadata: {
          source: 'n0de_dashboard',
          plan: planId,
        },
      });
    }

    // Create checkout session for subscription
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: paymentMethodTypes as Stripe.Checkout.SessionCreateParams.PaymentMethodType[],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}&payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?payment=cancelled`,
      subscription_data: {
        metadata: {
          planId,
          source: 'n0de_enterprise',
        },
      },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      tax_id_collection: {
        enabled: true,
      },
      automatic_tax: {
        enabled: true,
      },
    });

    // Cache the session for 5 minutes
    sessionCache.set(cacheKey, {
      session,
      expires: Date.now() + 5 * 60 * 1000 // 5 minutes
    });

    console.log('Created new checkout session for:', cacheKey);
    return NextResponse.json({ 
      sessionId: session.id,
      sessionUrl: session.url,
      fromCache: false
    });

  } catch (error) {
    console.error('Stripe subscription creation failed:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    );
  }
}