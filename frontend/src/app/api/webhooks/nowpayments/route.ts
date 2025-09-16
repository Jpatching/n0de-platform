import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import crypto from 'crypto';

const NOWPAYMENTS_IPN_SECRET = process.env.NOWPAYMENTS_IPN_SECRET;

if (!NOWPAYMENTS_IPN_SECRET) {
  console.error('Missing NOWPAYMENTS_IPN_SECRET environment variable');
}

// NOWPayments IPN event types
interface NOWPaymentsIPN {
  payment_id: number;
  payment_status: 'waiting' | 'confirming' | 'confirmed' | 'sending' | 'partially_paid' | 'finished' | 'failed' | 'refunded' | 'expired';
  pay_address: string;
  price_amount: number;
  price_currency: string;
  pay_amount: number;
  actually_paid: number;
  pay_currency: string;
  order_id: string;
  order_description: string;
  purchase_id: string;
  outcome_amount: number;
  outcome_currency: string;
  payin_hash?: string;
  payout_hash?: string;
  created_at: string;
  updated_at: string;
}

// Verify NOWPayments IPN signature
async function verifyIPNSignature(
  rawBody: string,
  receivedSignature: string,
  secret: string
): Promise<boolean> {
  try {
    // NOWPayments uses HMAC-SHA512 for IPN verification
    const calculatedSignature = crypto
      .createHmac('sha512', secret)
      .update(rawBody, 'utf8')
      .digest('hex');

    return calculatedSignature === receivedSignature;
  } catch (error) {
    console.error('IPN signature verification error:', error);
    return false;
  }
}

// Process successful payment
async function processSuccessfulPayment(ipnData: NOWPaymentsIPN) {
  try {
    console.log('Processing successful NOWPayments payment:', {
      payment_id: ipnData.payment_id,
      order_id: ipnData.order_id,
      amount: ipnData.price_amount,
      currency: ipnData.price_currency,
      status: ipnData.payment_status
    });

    // Extract plan ID from order_id (format: planId_timestamp_randomString)
    const _planId = ipnData.order_id.split('_')[0];

    // Here you would typically:
    // 1. Update user's subscription status in database
    // 2. Send confirmation email
    // 3. Grant access to the purchased plan
    // 4. Log the transaction

    // Example: Update user subscription (implement based on your database schema)
    /*
    await updateUserSubscription({
      planId,
      paymentId: ipnData.payment_id.toString(),
      orderId: ipnData.order_id,
      amount: ipnData.price_amount,
      currency: ipnData.price_currency,
      provider: 'nowpayments',
      status: 'active'
    });
    */

    // Send notification email (implement based on your email service)
    /*
    await sendPaymentConfirmationEmail({
      customerEmail: extractEmailFromOrder(ipnData.order_id),
      planId,
      amount: ipnData.price_amount,
      currency: ipnData.price_currency,
      paymentId: ipnData.payment_id
    });
    */

    console.log(`Payment confirmed for order ${ipnData.order_id}`);
    return true;
  } catch (error) {
    console.error('Error processing successful payment:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const headersList = await headers();
    const signature = headersList.get('x-nowpayments-sig');
    
    if (!signature) {
      console.error('Missing NOWPayments signature header');
      return NextResponse.json(
        { error: 'Missing signature header' },
        { status: 400 }
      );
    }

    // Get raw body for signature verification
    const rawBody = await request.text();
    let ipnData: NOWPaymentsIPN;

    try {
      ipnData = JSON.parse(rawBody);
    } catch (error) {
      console.error('Invalid JSON in NOWPayments IPN:', error);
      return NextResponse.json(
        { error: 'Invalid JSON' },
        { status: 400 }
      );
    }

    // Verify signature if IPN secret is configured
    if (NOWPAYMENTS_IPN_SECRET && !(await verifyIPNSignature(rawBody, signature, NOWPAYMENTS_IPN_SECRET))) {
      console.error('Invalid NOWPayments IPN signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    console.log('NOWPayments IPN received:', {
      payment_id: ipnData.payment_id,
      payment_status: ipnData.payment_status,
      order_id: ipnData.order_id,
      amount: ipnData.price_amount,
      currency: ipnData.price_currency
    });

    // Process based on payment status
    switch (ipnData.payment_status) {
      case 'finished':
      case 'confirmed':
        await processSuccessfulPayment(ipnData);
        break;
      
      case 'failed':
      case 'expired':
        console.log(`Payment failed/expired for order ${ipnData.order_id}:`, ipnData.payment_status);
        // Handle failed payment (send notification, update database, etc.)
        break;
      
      case 'partially_paid':
        console.log(`Partial payment received for order ${ipnData.order_id}:`, {
          expected: ipnData.pay_amount,
          received: ipnData.actually_paid,
          currency: ipnData.pay_currency
        });
        // Handle partial payment
        break;
      
      case 'waiting':
      case 'confirming':
      case 'sending':
        console.log(`Payment in progress for order ${ipnData.order_id}:`, ipnData.payment_status);
        // Payment is still being processed
        break;
      
      default:
        console.log(`Unknown payment status for order ${ipnData.order_id}:`, ipnData.payment_status);
        break;
    }

    // Always return success to acknowledge receipt
    return NextResponse.json({ status: 'ok' });

  } catch (error) {
    console.error('NOWPayments IPN processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    service: 'nowpayments-webhook',
    timestamp: new Date().toISOString()
  });
}