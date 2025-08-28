import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Input sanitization helper
function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

// Validate Solana wallet address format
function isValidSolanaAddress(address: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

// GET - Get user profile
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet');

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
    }

    // Validate wallet address format (basic Solana address validation)
    if (!isValidSolanaAddress(walletAddress)) {
      return NextResponse.json({ error: 'Invalid wallet address format' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { walletAddress: walletAddress },
      select: {
        id: true,
        walletAddress: true,
        username: true,
        displayName: true,
        avatar: true,
        email: true,
        bio: true,
        showUsername: true,
        profileVisibility: true,
        totalEarnings: true,
        totalMatches: true,
        wins: true,
        losses: true,
        winRate: true,
        reputation: true,
        createdAt: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error: any) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error' 
    }, { status: 500 });
  }
}

// PUT - Update user profile
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      walletAddress, 
      username, 
      displayName, 
      bio, 
      email, 
      avatar, 
      showUsername, 
      profileVisibility 
    } = body;

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
    }

    // Validate wallet address format
    if (!isValidSolanaAddress(walletAddress)) {
      return NextResponse.json({ error: 'Invalid wallet address format' }, { status: 400 });
    }

    // Sanitize text inputs
    const sanitizedData = {
      username: username ? sanitizeInput(username.toLowerCase()) : undefined,
      displayName: displayName ? sanitizeInput(displayName) : undefined,
      bio: bio ? sanitizeInput(bio) : undefined,
      email: email ? sanitizeInput(email) : undefined,
    };

    // Get current user to check if username is already set
    const currentUser = await prisma.user.findUnique({
      where: { walletAddress: walletAddress },
      select: { id: true, username: true }
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Validate username if provided
    if (sanitizedData.username) {
      // Check if user already has a username and is trying to change it
      if (currentUser.username && currentUser.username !== sanitizedData.username) {
        return NextResponse.json({ 
          error: 'Username can only be set once and cannot be changed' 
        }, { status: 400 });
      }

      // Validate username format
      if (sanitizedData.username.length < 3 || sanitizedData.username.length > 20) {
        return NextResponse.json({ 
          error: 'Username must be 3-20 characters long' 
        }, { status: 400 });
      }

      if (!/^[a-z0-9_]+$/.test(sanitizedData.username)) {
        return NextResponse.json({ 
          error: 'Username can only contain lowercase letters, numbers, and underscores' 
        }, { status: 400 });
      }

      // Check if username is already taken by another user
      if (!currentUser.username) { // Only check if user doesn't have a username yet
        const existingUser = await prisma.user.findUnique({
          where: { username: sanitizedData.username },
          select: { id: true }
        });

        if (existingUser) {
          return NextResponse.json({ 
            error: 'Username is already taken' 
          }, { status: 400 });
        }
      }
    }

    // Validate display name length
    if (sanitizedData.displayName && sanitizedData.displayName.length > 50) {
      return NextResponse.json({ 
        error: 'Display name must be 50 characters or less' 
      }, { status: 400 });
    }

    // Validate bio length
    if (sanitizedData.bio && sanitizedData.bio.length > 200) {
      return NextResponse.json({ 
        error: 'Bio must be 200 characters or less' 
      }, { status: 400 });
    }

    // Validate email format
    if (sanitizedData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedData.email)) {
      return NextResponse.json({ 
        error: 'Invalid email format' 
      }, { status: 400 });
    }

    // Validate profile visibility
    if (profileVisibility && !['public', 'friends', 'private'].includes(profileVisibility)) {
      return NextResponse.json({ 
        error: 'Invalid profile visibility setting' 
      }, { status: 400 });
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { walletAddress: walletAddress },
      data: {
        ...(sanitizedData.username && !currentUser.username && { username: sanitizedData.username }), // Only set username if not already set
        ...(sanitizedData.displayName !== undefined && { displayName: sanitizedData.displayName }),
        ...(sanitizedData.bio !== undefined && { bio: sanitizedData.bio }),
        ...(sanitizedData.email !== undefined && { email: sanitizedData.email }),
        ...(avatar !== undefined && { avatar }),
        ...(showUsername !== undefined && { showUsername }),
        ...(profileVisibility !== undefined && { profileVisibility })
      },
      select: {
        id: true,
        walletAddress: true,
        username: true,
        displayName: true,
        avatar: true,
        email: true,
        bio: true,
        showUsername: true,
        profileVisibility: true,
        totalEarnings: true,
        totalMatches: true,
        wins: true,
        losses: true,
        winRate: true,
        reputation: true,
        createdAt: true
      }
    });

    return NextResponse.json({ 
      user: updatedUser,
      message: 'Profile updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating user profile:', error);
    
    // Handle unique constraint violation
    if (error.code === 'P2002' && error.meta?.target?.includes('username')) {
      return NextResponse.json({ 
        error: 'Username is already taken' 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error' 
    }, { status: 500 });
  }
}

// POST - Check username availability
export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json();

    if (!username) {
      return NextResponse.json({ error: 'Username required' }, { status: 400 });
    }

    // Validate username format
    if (username.length < 3 || username.length > 20) {
      return NextResponse.json({ 
        available: false, 
        error: 'Username must be 3-20 characters long' 
      }, { status: 400 });
    }

    if (!/^[a-z0-9_]+$/.test(username)) {
      return NextResponse.json({ 
        available: false, 
        error: 'Username can only contain lowercase letters, numbers, and underscores' 
      }, { status: 400 });
    }

    // Check if username is already taken
    const existingUser = await prisma.user.findUnique({
      where: { username: username },
      select: { id: true }
    });

    return NextResponse.json({ 
      available: !existingUser,
      message: existingUser ? 'Username is already taken' : 'Username is available'
    });
  } catch (error: any) {
    console.error('Error checking username availability:', error);
    return NextResponse.json({ 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error' 
    }, { status: 500 });
  }
} 