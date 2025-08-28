import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

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

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripe();
    const body: CreateSubscriptionRequest = await request.json();
    const { planId, priceId, customerId, paymentMethodTypes } = body;

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

    return NextResponse.json({ 
      sessionId: session.id,
      sessionUrl: session.url,
    });

  } catch (error) {
    console.error('Stripe subscription creation failed:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    );
  }
}