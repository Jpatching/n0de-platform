import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "Authorization header required" },
        { status: 401 },
      );
    }

    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL || "https://api.n0de.pro";

    const response = await fetch(`${backendUrl}/api/v1/alerts/rules`, {
      method: "GET",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404 || response.status === 503) {
        // Return empty rules if service not available
        return NextResponse.json([]);
      }

      const _errorText = await response.text();
      console.error("Backend alerts API error:", response.status, _errorText);
      return NextResponse.json(
        { error: `Backend API error: ${response.status}` },
        { status: response.status },
      );
    }

    const alertRules = await response.json();
    return NextResponse.json(alertRules);
  } catch (error) {
    console.error("Alerts API route error:", error);

    // Return empty array as fallback
    if (
      error instanceof Error &&
      (error.message.includes("fetch") ||
        error.message.includes("ECONNREFUSED"))
    ) {
      return NextResponse.json([]);
    }

    return NextResponse.json(
      { error: "Service temporarily unavailable" },
      { status: 503 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "Authorization header required" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL || "https://api.n0de.pro";

    const response = await fetch(`${backendUrl}/api/v1/alerts/rules`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const _errorText = await response.text();
      return NextResponse.json(
        { error: `Backend API error: ${response.status}` },
        { status: response.status },
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Alerts create API route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
