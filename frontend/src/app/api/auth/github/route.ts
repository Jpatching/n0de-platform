import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const githubClientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = process.env.GITHUB_OAUTH_REDIRECT_URI;
  
  if (!githubClientId || !redirectUri) {
    return NextResponse.json(
      { error: 'GitHub OAuth not configured' },
      { status: 500 }
    );
  }

  const authUrl = new URL('https://github.com/login/oauth/authorize');
  authUrl.searchParams.set('client_id', githubClientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', 'user:email');
  authUrl.searchParams.set('response_type', 'code');

  return NextResponse.redirect(authUrl.toString());
}