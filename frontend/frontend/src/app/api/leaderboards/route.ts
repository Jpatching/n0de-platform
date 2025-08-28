import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

// Define the user type based on the select fields
type LeaderboardUser = {
  walletAddress: string | null;
  username: string | null;
  displayName: string | null;
  showUsername: boolean;
  profileVisibility: string;
  avatar: string | null;
  totalEarnings: number;
  wins: number;
  totalMatches: number;
  winRate: number;
  reputation: number;
};

// Helper function to get display name based on privacy settings
function getDisplayName(user: LeaderboardUser): { displayName: string; isAnonymous: boolean } {
  // Handle privacy settings
  if (user.profileVisibility === 'private') {
    return {
      displayName: 'Anonymous Player',
      isAnonymous: true
    };
  }
  
  if (user.profileVisibility === 'friends') {
    // For now, treat friends-only as anonymous in public leaderboards
    // TODO: Implement friend system
    return {
      displayName: 'Anonymous Player',
      isAnonymous: true
    };
  }
  
  // For public profiles, determine name based on preferences
  if (user.showUsername && user.username) {
    return {
      displayName: user.username,
      isAnonymous: false
    };
  }
  
  if (user.displayName) {
    return {
      displayName: user.displayName,
      isAnonymous: false
    };
  }
  
  if (user.username) {
    return {
      displayName: user.username,
      isAnonymous: false
    };
  }
  
  // Fallback to wallet address
  return {
    displayName: user.walletAddress ? `${user.walletAddress.slice(0, 8)}...${user.walletAddress.slice(-4)}` : 'Unknown Player',
    isAnonymous: false
  };
}

export async function GET(request: NextRequest) {
  try {
    // Validate environment
    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL environment variable is not set');
      return NextResponse.json(
        { error: 'Database configuration error' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'earnings';
    const period = searchParams.get('period') || 'alltime';

    // Validate input parameters
    const validTypes = ['earnings', 'wins', 'winrate'];
    const validPeriods = ['daily', 'weekly', 'monthly', 'alltime'];
    
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid leaderboard type. Must be: earnings, wins, or winrate' },
        { status: 400 }
      );
    }
    
    if (!validPeriods.includes(period)) {
      return NextResponse.json(
        { error: 'Invalid period. Must be: daily, weekly, monthly, or alltime' },
        { status: 400 }
      );
    }

    // Try to get cached leaderboard first
    let cached;
    try {
      cached = await prisma.leaderboard.findFirst({
        where: {
          type: type,
          period: period
        },
        orderBy: {
          updatedAt: 'desc'
        }
      });
    } catch (cacheError: any) {
      console.warn('Cache lookup failed:', cacheError);
      // Continue without cache
    }

    if (cached && isRecentlyUpdated(cached.updatedAt)) {
      return NextResponse.json(cached.data);
    }

    // Generate fresh leaderboard data
    let rawLeaderboardData: LeaderboardUser[];
    
    const baseSelect = {
      walletAddress: true,
      username: true,
      displayName: true,
      showUsername: true,
      profileVisibility: true,
      avatar: true,
      totalEarnings: true,
      wins: true,
      totalMatches: true,
      winRate: true,
      reputation: true,
    };
    
    switch (type) {
      case 'earnings':
        rawLeaderboardData = await prisma.user.findMany({
          select: baseSelect,
          orderBy: {
            totalEarnings: 'desc'
          },
          take: 100,
        });
        break;
        
      case 'wins':
        rawLeaderboardData = await prisma.user.findMany({
          select: baseSelect,
          orderBy: {
            wins: 'desc'
          },
          take: 100,
        });
        break;
        
      case 'winrate':
        rawLeaderboardData = await prisma.user.findMany({
          select: baseSelect,
          where: {
            totalMatches: {
              gte: 10 // Minimum 10 matches for winrate leaderboard
            }
          },
          orderBy: {
            winRate: 'desc'
          },
          take: 100,
        });
        break;
        
      default:
        return NextResponse.json(
          { error: 'Invalid leaderboard type' },
          { status: 400 }
        );
    }

    // Process leaderboard data with privacy settings
    const processedLeaderboardData = rawLeaderboardData.map((user: LeaderboardUser, index: number) => {
      const { displayName, isAnonymous } = getDisplayName(user);
      
      return {
        rank: index + 1,
        walletAddress: user.walletAddress,
        displayName,
        isAnonymous,
        avatar: isAnonymous ? '🕶️' : (user.avatar || '👤'),
        // Hide stats for anonymous users
        totalEarnings: isAnonymous ? null : user.totalEarnings,
        wins: isAnonymous ? null : user.wins,
        totalMatches: isAnonymous ? null : user.totalMatches,
        winRate: isAnonymous ? null : user.winRate,
        reputation: isAnonymous ? null : user.reputation,
        // Keep privacy info for frontend display
        profileVisibility: user.profileVisibility,
        // For demo purposes, include original data (only in development)
        ...(process.env.NODE_ENV === 'development' && {
          originalData: {
            username: user.username,
            originalDisplayName: user.displayName,
            showUsername: user.showUsername,
          }
        })
      };
    });

    // Cache the result (with error handling)
    try {
      // Delete existing cache entry first
      await prisma.leaderboard.deleteMany({
        where: {
          type: type,
          period: period
        }
      });

      // Create new cache entry
      await prisma.leaderboard.create({
        data: {
          type,
          period,
          data: processedLeaderboardData,
        }
      });
    } catch (cacheError: any) {
      console.warn('Failed to cache leaderboard data:', cacheError);
      // Continue without caching
    }

    return NextResponse.json(processedLeaderboardData);
  } catch (error: any) {
    console.error('Error fetching leaderboard:', error);
    
    // Handle specific Prisma errors
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Database constraint violation' },
        { status: 500 }
      );
    }
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Record not found' },
        { status: 404 }
      );
    }
    
    // Generic error for production
    return NextResponse.json(
      { error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

function isRecentlyUpdated(updatedAt: Date): boolean {
  const now = new Date();
  const diffInMinutes = (now.getTime() - updatedAt.getTime()) / (1000 * 60);
  return diffInMinutes < 5; // Cache for 5 minutes
} 