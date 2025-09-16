import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";

const COINBASE_WEBHOOK_SECRET = process.env.COINBASE_COMMERCE_WEBHOOK_SECRET;

if (!COINBASE_WEBHOOK_SECRET) {
  console.error(
    "Missing COINBASE_COMMERCE_WEBHOOK_SECRET environment variable",
  );
}

// Webhook event types from Coinbase Commerce
interface CoinbaseEvent {
  id: string;
  type:
    | "charge:created"
    | "charge:confirmed"
    | "charge:failed"
    | "charge:delayed"
    | "charge:pending"
    | "charge:resolved";
  api_version: string;
  created_at: string;
  data: {
    id: string;
    resource: string;
    code: string;
    name: string;
    description: string;
    hosted_url: string;
    created_at: string;
    updated_at: string;
    confirmed_at?: string;
    pricing_type: string;
    pricing: {
      local: { amount: string; currency: string };
      bitcoin?: { amount: string; currency: string };
      ethereum?: { amount: string; currency: string };
      usdc?: { amount: string; currency: string };
    };
    metadata: {
      plan_id?: string;
      customer_email?: string;
      customer_name?: string;
      order_type?: string;
      created_at?: string;
    };
    timeline: Array<{
      time: string;
      status: string;
      context?: string;
    }>;
    addresses?: {
      bitcoin?: string;
      ethereum?: string;
      usdc?: string;
    };
    payments?: Array<{
      network: string;
      transaction_id: string;
      status: string;
      value: {
        local: { amount: string; currency: string };
        crypto: { amount: string; currency: string };
      };
      block: {
        height: number;
        hash: string;
        confirmations_accumulated: number;
        confirmations_required: number;
      };
    }>;
  };
}

// Verify webhook signature using Coinbase Commerce method
async function verifySignature(
  payload: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  try {
    const crypto = await import("crypto");
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload, "utf8")
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSignature, "hex"),
    );
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const headersList = await headers();
    const signature = headersList.get("x-cc-webhook-signature");

    if (!signature) {
      console.error("Missing webhook signature");
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    // Verify webhook signature
    if (
      COINBASE_WEBHOOK_SECRET &&
      !(await verifySignature(rawBody, signature, COINBASE_WEBHOOK_SECRET))
    ) {
      console.error("Invalid webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event: CoinbaseEvent = JSON.parse(rawBody);

    console.log("Coinbase webhook received:", {
      eventType: event.type,
      chargeId: event.data.id,
      timestamp: event.created_at,
    });

    // Handle different event types
    switch (event.type) {
      case "charge:created":
        await handleChargeCreated(event);
        break;

      case "charge:confirmed":
        await handleChargeConfirmed(event);
        break;

      case "charge:failed":
        await handleChargeFailed(event);
        break;

      case "charge:delayed":
        await handleChargeDelayed(event);
        break;

      case "charge:pending":
        await handleChargePending(event);
        break;

      case "charge:resolved":
        await handleChargeResolved(event);
        break;

      default:
        console.log("Unhandled event type:", event.type);
    }

    return NextResponse.json(
      { received: true, eventType: event.type },
      { status: 200 },
    );
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}

async function handleChargeCreated(event: CoinbaseEvent) {
  const { data } = event;
  const { metadata } = data;

  console.log("Charge created:", {
    chargeId: data.id,
    planId: metadata.plan_id,
    customerEmail: metadata.customer_email,
    amount: parseFloat(data.pricing.local.amount),
    currency: data.pricing.local.currency,
  });

  // Record charge creation in database
  // await database.charges.create({
  //   coinbase_charge_id: data.id,
  //   plan_id: metadata.plan_id,
  //   customer_email: metadata.customer_email,
  //   amount: parseFloat(data.pricing.local.amount),
  //   currency: data.pricing.local.currency,
  //   status: 'created',
  //   created_at: new Date(data.created_at)
  // });

  // Send confirmation email to customer
  await sendChargeCreatedEmail(metadata.customer_email!, {
    chargeName: data.name,
    amount: parseFloat(data.pricing.local.amount),
    currency: data.pricing.local.currency,
    hostedUrl: data.hosted_url,
  });
}

async function handleChargeConfirmed(event: CoinbaseEvent) {
  const { data } = event;
  const { metadata } = data;

  console.log("Payment confirmed:", {
    chargeId: data.id,
    planId: metadata.plan_id,
    customerEmail: metadata.customer_email,
    confirmedAt: data.confirmed_at,
  });

  // Activate customer subscription
  if (metadata.plan_id && metadata.customer_email) {
    await activateSubscription(
      metadata.customer_email,
      metadata.plan_id,
      data.id,
    );
  }

  // Update charge status in database
  // await database.charges.update({
  //   coinbase_charge_id: data.id
  // }, {
  //   status: 'confirmed',
  //   confirmed_at: new Date(data.confirmed_at!),
  //   payment_details: data.payments
  // });

  // Send success notification
  await sendPaymentSuccessEmail(metadata.customer_email!, {
    planName: data.name,
    amount: parseFloat(data.pricing.local.amount),
    currency: data.pricing.local.currency,
    transactionDetails: data.payments?.[0],
  });

  // Create API keys for the customer
  await provisionApiAccess(metadata.customer_email!, metadata.plan_id!);
}

async function handleChargeFailed(event: CoinbaseEvent) {
  const { data } = event;
  const { metadata } = data;

  console.log("Payment failed:", {
    chargeId: data.id,
    planId: metadata.plan_id,
    customerEmail: metadata.customer_email,
  });

  // Update charge status
  // await database.charges.update({
  //   coinbase_charge_id: data.id
  // }, {
  //   status: 'failed',
  //   updated_at: new Date()
  // });

  // Send failure notification
  await sendPaymentFailedEmail(metadata.customer_email!, {
    planName: data.name,
    amount: parseFloat(data.pricing.local.amount),
    currency: data.pricing.local.currency,
    reason: "Payment could not be confirmed on the blockchain",
  });
}

async function handleChargeDelayed(event: CoinbaseEvent) {
  const { data } = event;
  const { metadata } = data;

  console.log("Payment delayed (underpaid):", {
    chargeId: data.id,
    planId: metadata.plan_id,
    customerEmail: metadata.customer_email,
  });

  // Notify customer about underpayment
  await sendPaymentDelayedEmail(metadata.customer_email!, {
    planType: data.name,
    amount: parseFloat(data.pricing.local.amount),
  });
}

async function handleChargePending(event: CoinbaseEvent) {
  const { data } = event;

  console.log("Payment pending confirmation:", {
    chargeId: data.id,
    payments: data.payments?.length || 0,
  });

  // Update status to pending
  // await database.charges.update({
  //   coinbase_charge_id: data.id
  // }, {
  //   status: 'pending',
  //   payment_details: data.payments
  // });
}

async function handleChargeResolved(event: CoinbaseEvent) {
  const { data } = event;
  const { metadata } = data;

  console.log("Charge resolved:", {
    chargeId: data.id,
    planId: metadata.plan_id,
    customerEmail: metadata.customer_email,
  });

  // Handle resolved charges (could be confirmed or failed after being delayed/pending)
  const latestStatus = data.timeline[data.timeline.length - 1]?.status;

  if (latestStatus === "COMPLETED") {
    // Same as confirmed
    await handleChargeConfirmed(event);
  }
}

// Helper functions for business logic
async function activateSubscription(
  customerEmail: string,
  planId: string,
  _chargeId: string,
) {
  console.log(`Activating ${planId} subscription for ${customerEmail}`);

  const planLimits = {
    starter: { rps: 5000, monthlyRequests: 1000000, price: 99 },
    professional: { rps: 25000, monthlyRequests: 5000000, price: 299 },
    enterprise: { rps: -1, monthlyRequests: 50000000, price: 899 },
  };

  const _limits = planLimits[planId as keyof typeof planLimits];

  // In production: Update customer subscription in database
  // await database.subscriptions.upsert({
  //   customer_email: customerEmail,
  //   plan_id: planId,
  //   status: 'active',
  //   rate_limit: limits.rps,
  //   monthly_limit: limits.monthlyRequests,
  //   billing_cycle_start: new Date(),
  //   last_payment_id: chargeId,
  //   next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  // });
}

async function provisionApiAccess(customerEmail: string, planId: string) {
  console.log(`Provisioning API access for ${customerEmail} on ${planId} plan`);

  // Generate API key
  const apiKey = `n0de_live_${generateSecureKey(32)}`;

  // In production: Store API key in database
  // await database.api_keys.create({
  //   customer_email: customerEmail,
  //   key_hash: await hashApiKey(apiKey),
  //   key_prefix: apiKey.substring(0, 16) + '...',
  //   plan_id: planId,
  //   status: 'active',
  //   created_at: new Date()
  // });

  // Send API key to customer
  await sendApiKeyEmail(customerEmail, {
    planType: planId,
    planId,
    dashboardUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard`,
  });
}

interface EmailDetails {
  amount?: number;
  planType?: string;
  chargeId?: string;
  transactionHash?: string;
  customerName?: string;
  chargeName?: string;
  planName?: string;
  currency?: string;
  hostedUrl?: string;
  reason?: string;
  transactionDetails?: any;
  dashboardUrl?: string;
  planId?: string;
}

// Email notification functions
async function sendChargeCreatedEmail(
  customerEmail: string,
  _details: EmailDetails,
) {
  console.log("Sending charge created email to:", customerEmail);
  // Implement email service integration (SendGrid, etc.)
}

async function sendPaymentSuccessEmail(
  customerEmail: string,
  _details: EmailDetails,
) {
  console.log("Sending payment success email to:", customerEmail);
  // Implement email service integration
}

async function sendPaymentFailedEmail(
  customerEmail: string,
  _details: EmailDetails,
) {
  console.log("Sending payment failed email to:", customerEmail);
  // Implement email service integration
}

async function sendPaymentDelayedEmail(
  customerEmail: string,
  _details: EmailDetails,
) {
  console.log("Sending payment delayed email to:", customerEmail);
  // Implement email service integration
}

async function sendApiKeyEmail(customerEmail: string, _details: EmailDetails) {
  console.log("Sending API key email to:", customerEmail);
  // Implement email service integration with API key
}

// Utility functions
function generateSecureKey(length: number): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Disable body parsing for webhook signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};
