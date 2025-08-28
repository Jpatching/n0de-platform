import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Check database availability
    if (!process.env.DATABASE_URL) {
      if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
        console.error('DATABASE_URL environment variable is not configured');
        return NextResponse.json(
          { error: 'Service temporarily unavailable' },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      );
    }

    // Get user from session token
    const user = await requireAuth(request);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        authMethod: user.authMethod,
        profileVisibility: user.profileVisibility,
        showUsername: user.showUsername,
        walletAddress: user.walletAddress,
        avatar: user.avatar,
        bio: user.bio,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt
      }
    });
  } catch (error: any) {
    console.error('Auth check error:', error);
    
    // Handle database connection errors specifically
    if (error.code === 'P1001' || error.code === 'P1002' || error.message?.includes('connect')) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    );
  }
} 