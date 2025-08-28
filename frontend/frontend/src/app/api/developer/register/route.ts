import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'https://pv3-backend-api-production.up.railway.app';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const authHeader = request.headers.get('authorization');

    console.log('🔗 Frontend API: Developer registration request');
    console.log('🔗 BACKEND_URL:', BACKEND_URL);
    console.log('🔗 Request body:', body);
    console.log('🔗 Auth header present:', !!authHeader);

    // Check if authorization header is present
    if (!authHeader) {
      console.log('❌ No authorization header provided');
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    // Extract only the required fields for the backend
    const backendPayload = {
      walletAddress: body.walletAddress
    };

    console.log('📡 Forwarding to backend:', `${BACKEND_URL}/api/v1/developer/register`);
    console.log('📡 Backend payload:', backendPayload);

    // Forward the request to the backend API with proper headers
    const response = await fetch(`${BACKEND_URL}/api/v1/developer/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader, // Forward the auth header
      },
      body: JSON.stringify(backendPayload)
    });

    console.log('📡 Backend response status:', response.status);

    const data = await response.json();
    console.log('📡 Backend response data:', data);

    if (!response.ok) {
      console.log('❌ Backend returned error:', data);
      return NextResponse.json(data, { status: response.status });
    }

    console.log('✅ Registration successful');
    return NextResponse.json(data);

  } catch (error) {
    console.error('💥 Developer registration proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to register developer' },
      { status: 500 }
    );
  }
} 