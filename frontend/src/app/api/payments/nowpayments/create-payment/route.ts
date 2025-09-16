import { NextRequest, NextResponse } from 'next/server';

interface CreatePaymentRequest {
  planId: string;
  customerEmail: string;
  customerName?: string;
  currency?: string;
}

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

    // Get authorization header from request
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization required' },
        { status: 401 }
      );
    }

    // Call backend API to create payment
    const backendResponse = await fetch(`${process.env.BACKEND_URL}/api/v1/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({
        provider: 'NOWPAYMENTS',
        planType: planId.toUpperCase(),
        amount: getPlansMapping()[planId]?.price || 299,
        currency: 'USD',
        metadata: {
          customerEmail,
          customerName,
          payCurrency: currency
        }
      })
    });

    if (!backendResponse.ok) {
      const error = await backendResponse.json().catch(() => ({ message: 'Backend error' }));
      return NextResponse.json(
        { error: 'Failed to create payment', details: error },
        { status: backendResponse.status }
      );
    }

    const payment = await backendResponse.json();
    
    return NextResponse.json({
      success: true,
      payment: payment,
      paymentUrl: payment.paymentUrl || payment.chargeUrl,
      paymentId: payment.id,
      amount: payment.amount,
      currency: payment.currency,
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

    // Call backend API to get payment status
    const backendResponse = await fetch(`${process.env.BACKEND_URL}/api/v1/payments/${paymentId}`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!backendResponse.ok) {
      const error = await backendResponse.json();
      return NextResponse.json(
        { error: 'Failed to fetch payment status', details: error },
        { status: backendResponse.status }
      );
    }

    const payment = await backendResponse.json();
    
    return NextResponse.json({
      success: true,
      payment: payment,
      status: payment.status,
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

function getPlansMapping() {
  return {
    starter: { name: 'Starter Plan', price: 99, description: '1M requests/month, 5,000 RPS' },
    professional: { name: 'Professional Plan', price: 299, description: '5M requests/month, 25,000 RPS' },
    enterprise: { name: 'Enterprise Plan', price: 899, description: '50M requests/month, Unlimited RPS' }
  };
}