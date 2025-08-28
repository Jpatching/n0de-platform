import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

export interface SessionPayload {
  userId: string;
  iat: number;
  exp: number;
}

export function generateSessionToken(userId: string): string {
  const payload = {
    userId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor((Date.now() + TOKEN_EXPIRY) / 1000)
  };

  return jwt.sign(payload, JWT_SECRET);
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as SessionPayload;
    return payload;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

export async function getUserFromToken(token: string) {
  const payload = verifySessionToken(token);
  
  if (!payload) {
    return null;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        authMethod: true,
        profileVisibility: true,
        showUsername: true,
        walletAddress: true,
        avatar: true,
        bio: true,
        createdAt: true,
        lastLoginAt: true
      }
    });

    return user;
  } catch (error) {
    console.error('Error fetching user from token:', error);
    return null;
  }
}

export async function requireAuth(request: Request) {
  // Try to get token from cookie first, then Authorization header
  const cookieHeader = request.headers.get('cookie');
  let token = null;

  if (cookieHeader) {
    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);
    
    token = cookies['pv3_session'];
  }

  if (!token) {
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  if (!token) {
    throw new Error('No authentication token provided');
  }

  const user = await getUserFromToken(token);
  
  if (!user) {
    throw new Error('Invalid or expired token');
  }

  return user;
}

export function generateWalletAuthMessage(walletAddress: string): string {
  const timestamp = Date.now();
  const nonce = Math.random().toString(36).substring(2, 15);
  
  return `PV3 Gaming Authentication

Wallet: ${walletAddress}
Timestamp: ${timestamp}
Nonce: ${nonce}

Sign this message to authenticate with PV3 Gaming Platform.

This request will not trigger any blockchain transaction or cost any gas fees.`;
} 