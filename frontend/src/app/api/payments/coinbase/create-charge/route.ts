import { NextRequest, NextResponse } from "next/server";

interface CreateChargeRequest {
  planId: string;
  customerEmail: string;
  customerName?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateChargeRequest = await request.json();
    const { planId, customerEmail, customerName } = body;

    if (!planId || !customerEmail) {
      return NextResponse.json(
        { error: "Missing required fields: planId, customerEmail" },
        { status: 400 },
      );
    }

    // Get authorization header from request
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "Authorization required" },
        { status: 401 },
      );
    }

    // Call backend API to create payment
    const backendResponse = await fetch(
      `${process.env.BACKEND_URL}/api/v1/payments`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify({
          provider: "COINBASE_COMMERCE",
          planType: planId.toUpperCase(),
          amount:
            getPlansMapping()[
              planId as keyof ReturnType<typeof getPlansMapping>
            ]?.price || 299,
          currency: "USD",
          metadata: {
            customerEmail,
            customerName,
          },
        }),
      },
    );

    if (!backendResponse.ok) {
      const error = await backendResponse
        .json()
        .catch(() => ({ message: "Backend error" }));
      return NextResponse.json(
        { error: "Failed to create payment charge", details: error },
        { status: backendResponse.status },
      );
    }

    const payment = await backendResponse.json();

    return NextResponse.json({
      success: true,
      charge: { id: payment.id, hosted_url: payment.chargeUrl },
      hostedUrl: payment.chargeUrl,
      chargeId: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      planId,
    });
  } catch (error) {
    console.error("Create charge error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Get charge status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chargeId = searchParams.get("chargeId");

    if (!chargeId) {
      return NextResponse.json(
        { error: "Missing chargeId parameter" },
        { status: 400 },
      );
    }

    // Call backend API to get payment status
    const backendResponse = await fetch(
      `${process.env.BACKEND_URL}/api/v1/payments/${chargeId}`,
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!backendResponse.ok) {
      const error = await backendResponse.json();
      return NextResponse.json(
        { error: "Failed to fetch charge status", details: error },
        { status: backendResponse.status },
      );
    }

    const payment = await backendResponse.json();

    return NextResponse.json({
      success: true,
      charge: { id: payment.id },
      status: payment.status,
    });
  } catch (error) {
    console.error("Get charge error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

function getPlansMapping() {
  return {
    starter: {
      name: "Starter Plan",
      price: 99,
      description: "1M requests/month, 5,000 RPS",
    },
    professional: {
      name: "Professional Plan",
      price: 299,
      description: "5M requests/month, 25,000 RPS",
    },
    enterprise: {
      name: "Enterprise Plan",
      price: 899,
      description: "50M requests/month, Unlimited RPS",
    },
  };
}
