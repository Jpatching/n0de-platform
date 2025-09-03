import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    const redirectUrl = new URL('/auth/callback', request.url);
    redirectUrl.searchParams.set('error', error);
    return NextResponse.redirect(redirectUrl);
  }

  if (!code) {
    const redirectUrl = new URL('/auth/callback', request.url);
    redirectUrl.searchParams.set('error', 'Missing authorization code');
    return NextResponse.redirect(redirectUrl);
  }

  try {
    // Exchange code for tokens via backend
    const backendUrl = process.env.BACKEND_URL || 'https://n0de.pro';
    const response = await fetch(`${backendUrl}/api/v1/auth/google/callback?code=${code}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Backend OAuth exchange failed');
    }

    const data = await response.json();

    // Redirect to frontend callback with tokens
    const redirectUrl = new URL('/auth/callback', request.url);
    redirectUrl.searchParams.set('token', data.accessToken);
    redirectUrl.searchParams.set('refresh', data.refreshToken);
    redirectUrl.searchParams.set('session', data.sessionId);
    
    if (data.user) {
      redirectUrl.searchParams.set('user', encodeURIComponent(JSON.stringify(data.user)));
    }

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    const redirectUrl = new URL('/auth/callback', request.url);
    redirectUrl.searchParams.set('error', 'Authentication failed');
    return NextResponse.redirect(redirectUrl);
  }
}