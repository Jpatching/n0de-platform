import { NextRequest, NextResponse } from 'next/server';

function getCoinbaseApiKey() {
  const apiKey = process.env.COINBASE_COMMERCE_API_KEY;
  if (!apiKey) {
    throw new Error('COINBASE_COMMERCE_API_KEY environment variable is not configured');
  }
  return apiKey;
}

interface CreateChargeRequest {
  planId: string;
  customerEmail: string;
  customerName?: string;
}

const PLANS = {
  starter: { name: 'Starter Plan', price: 99, description: '1M requests/month, 5,000 RPS' },
  professional: { name: 'Professional Plan', price: 299, description: '5M requests/month, 25,000 RPS' },
  enterprise: { name: 'Enterprise Plan', price: 899, description: '50M requests/month, Unlimited RPS' }
};

export async function POST(request: NextRequest) {
  try {
    const body: CreateChargeRequest = await request.json();
    const { planId, customerEmail, customerName } = body;

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

    // Create Coinbase Commerce charge
    const chargeData = {
      name: plan.name,
      description: plan.description,
      pricing_type: 'fixed_price',
      local_price: {
        amount: plan.price.toString(),
        currency: 'USD'
      },
      metadata: {
        plan_id: planId,
        customer_email: customerEmail,
        customer_name: customerName || '',
        order_type: 'subscription',
        created_at: new Date().toISOString()
      },
      redirect_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/success?plan=${planId}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payment?plan=${planId}&cancelled=true`
    };

    const response = await fetch('https://api.commerce.coinbase.com/charges', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CC-Api-Key': getCoinbaseApiKey(),
        'X-CC-Version': '2018-03-22'
      },
      body: JSON.stringify(chargeData)
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Coinbase Commerce API error:', error);
      return NextResponse.json(
        { error: 'Failed to create payment charge', details: error },
        { status: response.status }
      );
    }

    const charge = await response.json();
    
    // Log charge creation for tracking
    console.log('Coinbase Commerce charge created:', {
      chargeId: charge.data.id,
      planId,
      customerEmail,
      amount: plan.price
    });

    return NextResponse.json({
      success: true,
      charge: charge.data,
      hostedUrl: charge.data.hosted_url,
      chargeId: charge.data.id,
      amount: plan.price,
      currency: 'USD',
      planId
    });

  } catch (error) {
    console.error('Create charge error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get charge status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chargeId = searchParams.get('chargeId');

    if (!chargeId) {
      return NextResponse.json(
        { error: 'Missing chargeId parameter' },
        { status: 400 }
      );
    }

    const response = await fetch(`https://api.commerce.coinbase.com/charges/${chargeId}`, {
      headers: {
        'X-CC-Api-Key': getCoinbaseApiKey(),
        'X-CC-Version': '2018-03-22'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: 'Failed to fetch charge status', details: error },
        { status: response.status }
      );
    }

    const charge = await response.json();
    
    return NextResponse.json({
      success: true,
      charge: charge.data,
      status: charge.data.timeline[charge.data.timeline.length - 1]?.status || 'NEW'
    });

  } catch (error) {
    console.error('Get charge error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}