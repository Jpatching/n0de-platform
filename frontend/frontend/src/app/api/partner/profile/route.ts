import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }

    const walletAddress = authHeader.replace('Bearer ', '');
    
    // Forward to backend API
    const backendResponse = await fetch(`${process.env.BACKEND_URL}/api/partner/profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${walletAddress}`,
        'Content-Type': 'application/json'
      }
    });

    if (!backendResponse.ok) {
      if (backendResponse.status === 404) {
        return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
      }
      throw new Error('Backend request failed');
    }

    const data = await backendResponse.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Partner profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 