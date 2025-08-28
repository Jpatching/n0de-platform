import { NextRequest, NextResponse } from 'next/server';

function getNowPaymentsApiKey() {
  const apiKey = process.env.NOWPAYMENTS_API_KEY;
  if (!apiKey) {
    throw new Error('NOWPAYMENTS_API_KEY environment variable is not configured');
  }
  return apiKey;
}

interface CreatePaymentRequest {
  planId: string;
  customerEmail: string;
  customerName?: string;
  currency?: string; // e.g., 'btc', 'eth', 'usdt'
}

const PLANS = {
  starter: { name: 'Starter Plan', price: 99, description: '1M requests/month, 5,000 RPS' },
  professional: { name: 'Professional Plan', price: 299, description: '5M requests/month, 25,000 RPS' },
  enterprise: { name: 'Enterprise Plan', price: 899, description: '50M requests/month, Unlimited RPS' }
};

export async function POST(request: NextRequest) {
  try {
    const body: CreatePaymentRequest = await request.json();
    const { planId, customerEmail, customerName, currency = 'btc' } = body;

    if (!planId || !customerEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: planId, customerEmail' },
        { status: 400 }
      );
    }

    const plan = PLANS[planId as keyof typeof PLANS];
    if (!plan) {
      return NextResponse.json(
        { error: 'Invalid plan ID' },
        { status: 400 }
      );
    }

    // Get estimated price for the selected currency
    const estimateResponse = await fetch(
      `https://api.nowpayments.io/v1/estimate?amount=${plan.price}&currency_from=usd&currency_to=${currency}`,
      {
        headers: {
          'x-api-key': getNowPaymentsApiKey(),
          'Content-Type': 'application/json'
        }
      }
    );

    if (!estimateResponse.ok) {
      const error = await estimateResponse.json();
      console.error('NOWPayments estimate error:', error);
      return NextResponse.json(
        { error: 'Failed to get price estimate', details: error },
        { status: estimateResponse.status }
      );
    }

    const estimate = await estimateResponse.json();

    // Create payment
    const paymentData = {
      price_amount: plan.price,
      price_currency: 'usd',
      pay_currency: currency,
      ipn_callback_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhooks/nowpayments`,
      order_id: `${planId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      order_description: `${plan.name} - ${plan.description}`,
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/success?plan=${planId}&provider=nowpayments`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payment?plan=${planId}&cancelled=true&provider=nowpayments`,
      customer_email: customerEmail,
      ...(customerName && { customer_name: customerName })
    };

    const response = await fetch('https://api.nowpayments.io/v1/payment', {
      method: 'POST',
      headers: {
        'x-api-key': getNowPaymentsApiKey(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paymentData)
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('NOWPayments create payment error:', error);
      return NextResponse.json(
        { error: 'Failed to create payment', details: error },
        { status: response.status }
      );
    }

    const payment = await response.json();
    
    // Log payment creation for tracking
    console.log('NOWPayments payment created:', {
      paymentId: payment.payment_id,
      orderId: paymentData.order_id,
      planId,
      customerEmail,
      amount: plan.price,
      currency,
      estimatedAmount: estimate.estimated_amount
    });

    return NextResponse.json({
      success: true,
      payment: payment,
      paymentUrl: payment.invoice_url,
      paymentId: payment.payment_id,
      orderId: paymentData.order_id,
      amount: plan.price,
      currency: 'USD',
      payAmount: estimate.estimated_amount,
      payCurrency: currency.toUpperCase(),
      planId,
      provider: 'nowpayments'
    });

  } catch (error) {
    console.error('Create NOWPayments payment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get payment status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('paymentId');

    if (!paymentId) {
      return NextResponse.json(
        { error: 'Missing paymentId parameter' },
        { status: 400 }
      );
    }

    const response = await fetch(`https://api.nowpayments.io/v1/payment/${paymentId}`, {
      headers: {
        'x-api-key': getNowPaymentsApiKey(),
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: 'Failed to fetch payment status', details: error },
        { status: response.status }
      );
    }

    const payment = await response.json();
    
    return NextResponse.json({
      success: true,
      payment: payment,
      status: payment.payment_status,
      provider: 'nowpayments'
    });

  } catch (error) {
    console.error('Get NOWPayments payment status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}