import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
  
  if (!googleClientId || !redirectUri) {
    return NextResponse.json(
      { error: 'Google OAuth not configured' },
      { status: 500 }
    );
  }

  const authUrl = new URL('https://accounts.google.com/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', googleClientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', 'email profile');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('access_type', 'offline');

  return NextResponse.redirect(authUrl.toString());
}