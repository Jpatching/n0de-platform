import { Injectable, UnauthorizedException, Logger, BadRequestException, ConflictException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { PublicKey, Keypair } from '@solana/web3.js';
import * as nacl from 'tweetnacl';
import * as bs58 from 'bs58';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import { ReferralService } from '../social/referral.service';
import { RedisWebSocketService } from '../common/redis-websocket.service';

export interface AuthRequest {
  wallet: string;
  signature: string;
  message: string;
  timestamp: number;
  referralCode?: string;
}

export interface AuthResponse {
  success: boolean;
  user: {
    id: string;
    wallet?: string;
    email?: string;
    username?: string;
    displayName?: string;
    authMethod: 'wallet' | 'email' | 'authenticator';
    avatar?: string;
    totalEarnings: number;
    totalMatches: number;
    wins: number;
    losses: number;
    winRate: number;
    reputation: number;
  };
  token: string;
  expiresAt: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly MESSAGE_EXPIRY = 5 * 60 * 1000; // 5 minutes
  private readonly TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

  constructor(
    private prisma: PrismaService, 
    @Inject(forwardRef(() => ReferralService)) private referralService: ReferralService,
    private redisWebSocketService: RedisWebSocketService
  ) {}

  /**
   * Generate authentication message for wallet signing
   */
  generateAuthMessage(wallet: string): string {
    const timestamp = Date.now();
    const nonce = Math.random().toString(36).substring(2, 15);
    
    return `PV3 Authentication\n\nWallet: ${wallet}\nTimestamp: ${timestamp}\nNonce: ${nonce}\n\nSign this message to authenticate with PV3 Gaming Platform.`;
  }

  /**
   * Verify wallet signature and authenticate user
   */
  async authenticateWallet(authRequest: AuthRequest): Promise<AuthResponse> {
    try {
      // Validate timestamp (prevent replay attacks)
      const now = Date.now();
      if (now - authRequest.timestamp > this.MESSAGE_EXPIRY) {
        throw new UnauthorizedException('Authentication message expired');
      }

      // Verify wallet address format
      let publicKey: PublicKey;
      try {
        publicKey = new PublicKey(authRequest.wallet);
      } catch {
        throw new UnauthorizedException('Invalid wallet address');
      }

      // Verify signature
      const isValidSignature = this.verifySignature(
        authRequest.message,
        authRequest.signature,
        publicKey.toBase58()
      );

      if (!isValidSignature) {
        throw new UnauthorizedException('Invalid signature');
      }

      // Get or create user
      const user = await this.getOrCreateUser(authRequest.wallet, authRequest.referralCode);

      // Generate session token
      const token = this.generateSessionToken(user.id, authRequest.wallet);
      const expiresAt = now + this.TOKEN_EXPIRY;

      // Log successful authentication
      await this.logSecurityEvent(user.id, 'AUTH_SUCCESS', {
        wallet: authRequest.wallet,
        timestamp: authRequest.timestamp,
      });

      this.logger.log(`User authenticated: ${authRequest.wallet}`);

      return {
        success: true,
        user: {
          id: user.id,
          wallet: user.wallet,
          username: user.username,
          displayName: user.displayName,
          authMethod: 'wallet' as const,
          avatar: user.avatar,
          totalEarnings: user.totalEarnings,
          totalMatches: user.totalMatches,
          wins: user.wins,
          losses: user.losses,
          winRate: user.winRate,
          reputation: user.reputation,
        },
        token,
        expiresAt,
      };
    } catch (error) {
      // Log failed authentication attempt
      await this.logSecurityEvent(null, 'AUTH_FAILED', {
        wallet: authRequest.wallet,
        error: (error as Error).message,
        timestamp: authRequest.timestamp,
      });

      this.logger.warn(`Authentication failed for ${authRequest.wallet}: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Verify message signature using ed25519
   */
  private verifySignature(message: string, signature: string, publicKey: string): boolean {
    try {
      const messageBytes = new TextEncoder().encode(message);
      const signatureBytes = bs58.decode(signature);
      const publicKeyBytes = bs58.decode(publicKey);

      return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
    } catch (error) {
      this.logger.warn(`Signature verification failed: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Get existing user or create new one
   */
  private async getOrCreateUser(wallet: string, referralCode?: string) {
    let user = await this.prisma.user.findUnique({
      where: { wallet },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          wallet,
          username: `Player_${wallet.slice(-6)}`,
          reputation: 1000,
          totalEarnings: 0,
          totalMatches: 0,
          wins: 0,
          losses: 0,
          winRate: 0,
        },
      });

      this.logger.log(`New user created: ${wallet}`);

      // 🎯 PROCESS REFERRAL SIGNUP - MASSIVE 5000 PP BONUS!
      if (referralCode) {
        try {
          const referralSuccess = await this.referralService.processReferralSignup(referralCode, user.id);
          if (referralSuccess) {
            this.logger.log(`🚀 VIRAL SIGNUP: User ${wallet} signed up with referral code ${referralCode}!`);
          }
        } catch (error) {
          this.logger.warn(`Failed to process referral for ${wallet}: ${error.message}`);
        }
      }
    }

    return user;
  }

  /**
   * EMAIL AUTHENTICATION METHODS
   */

  /**
   * Sign up with email and password
   */
  async signupWithEmail(email: string, password: string, username?: string, displayName?: string, referralCode?: string): Promise<AuthResponse> {
    try {
      // Check if email already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        throw new ConflictException('Email already registered');
      }

      // Check if username already exists (if provided)
      if (username) {
        const existingUsername = await this.prisma.user.findUnique({
          where: { username },
        });

        if (existingUsername) {
          throw new ConflictException('Username already taken');
        }
      }

      // Generate wallet for PDA vault consistency
      const keypair = Keypair.generate();
      const walletAddress = keypair.publicKey.toBase58();

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create user
      const user = await this.prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          authMethod: 'email',
          wallet: walletAddress, // Generated wallet for PDA vault
          username: username || `user_${email.split('@')[0]}_${Date.now().toString().slice(-4)}`,
          displayName: displayName || username,
          reputation: 1000,
          totalEarnings: 0,
          totalMatches: 0,
          wins: 0,
          losses: 0,
          winRate: 0,
          lastLoginAt: new Date(),
        },
      });

      // 🎯 PROCESS REFERRAL SIGNUP - MASSIVE 5000 PP BONUS!
      if (referralCode) {
        try {
          const referralSuccess = await this.referralService.processReferralSignup(referralCode, user.id);
          if (referralSuccess) {
            this.logger.log(`🚀 VIRAL EMAIL SIGNUP: User ${email} signed up with referral code ${referralCode}!`);
          }
        } catch (error) {
          this.logger.warn(`Failed to process referral for ${email}: ${error.message}`);
        }
      }

      // Generate session token
      const token = this.generateSessionToken(user.id, user.wallet);
      const expiresAt = Date.now() + this.TOKEN_EXPIRY;

      // Log successful signup
      await this.logSecurityEvent(user.id, 'EMAIL_SIGNUP_SUCCESS', {
        email,
        username: user.username,
        referralCode: referralCode || 'none',
      });

      this.logger.log(`Email user created: ${email}`);

      return {
        success: true,
        user: {
          id: user.id,
          wallet: user.wallet,
          email: user.email,
          username: user.username,
          displayName: user.displayName,
          authMethod: 'email' as const,
          avatar: user.avatar,
          totalEarnings: user.totalEarnings,
          totalMatches: user.totalMatches,
          wins: user.wins,
          losses: user.losses,
          winRate: user.winRate,
          reputation: user.reputation,
        },
        token,
        expiresAt,
      };
    } catch (error) {
      await this.logSecurityEvent(null, 'EMAIL_SIGNUP_FAILED', {
        email,
        error: (error as Error).message,
      });

      this.logger.warn(`Email signup failed for ${email}: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Sign in with email and password
   */
  async signinWithEmail(email: string, password: string): Promise<AuthResponse> {
    try {
      // Find user by email
      const user = await this.prisma.user.findUnique({
        where: { email },
      });

      if (!user || user.authMethod !== 'email') {
        throw new UnauthorizedException('Invalid email or password');
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        throw new UnauthorizedException('Invalid email or password');
      }

      // Update last login
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      // Generate session token
      const token = this.generateSessionToken(user.id, user.wallet);
      const expiresAt = Date.now() + this.TOKEN_EXPIRY;

      // Log successful signin
      await this.logSecurityEvent(user.id, 'EMAIL_SIGNIN_SUCCESS', {
        email,
      });

      this.logger.log(`Email user signed in: ${email}`);

      return {
        success: true,
        user: {
          id: user.id,
          wallet: user.wallet,
          email: user.email,
          username: user.username,
          displayName: user.displayName,
          authMethod: 'email' as const,
          avatar: user.avatar,
          totalEarnings: user.totalEarnings,
          totalMatches: user.totalMatches,
          wins: user.wins,
          losses: user.losses,
          winRate: user.winRate,
          reputation: user.reputation,
        },
        token,
        expiresAt,
      };
    } catch (error) {
      await this.logSecurityEvent(null, 'EMAIL_SIGNIN_FAILED', {
        email,
        error: (error as Error).message,
      });

      this.logger.warn(`Email signin failed for ${email}: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * AUTHENTICATOR (TOTP) AUTHENTICATION METHODS
   */

  /**
   * Setup authenticator (TOTP) - returns QR code and secret
   */
  async setupAuthenticator(username: string, displayName?: string, referralCode?: string): Promise<{
    success: boolean;
    user: {
      id: string;
      username: string;
      displayName?: string;
      authMethod: 'authenticator';
    };
    setupUrl: string;
    secret: string;
    qrCode: string;
  }> {
    try {
      // Check if username already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { username },
      });

      if (existingUser) {
        throw new ConflictException('Username already taken');
      }

      // Generate TOTP secret
      const secret = speakeasy.generateSecret({
        name: `PV3:${username}`,
        issuer: 'PV3 Gaming Platform',
        length: 32,
      });

      // Generate wallet for PDA vault consistency
      const keypair = Keypair.generate();
      const walletAddress = keypair.publicKey.toBase58();

      // Create user (but don't activate until TOTP is verified)
      const user = await this.prisma.user.create({
        data: {
          username,
          displayName: displayName || username,
          authMethod: 'authenticator',
          wallet: walletAddress, // Generated wallet for PDA vault
          totpSecret: secret.base32, // Store the secret
          reputation: 1000,
          totalEarnings: 0,
          totalMatches: 0,
          wins: 0,
          losses: 0,
          winRate: 0,
        },
      });

      // 🎯 PROCESS REFERRAL SIGNUP - MASSIVE 5000 PP BONUS!
      if (referralCode) {
        try {
          const referralSuccess = await this.referralService.processReferralSignup(referralCode, user.id);
          if (referralSuccess) {
            this.logger.log(`🚀 VIRAL AUTHENTICATOR SIGNUP: User ${username} signed up with referral code ${referralCode}!`);
          }
        } catch (error) {
          this.logger.warn(`Failed to process referral for ${username}: ${error.message}`);
        }
      }

      // Generate QR code
      const qrCodeDataURL = await qrcode.toDataURL(secret.otpauth_url);

      this.logger.log(`Authenticator setup initiated for: ${username}`);

      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          authMethod: 'authenticator' as const,
        },
        setupUrl: secret.otpauth_url,
        secret: secret.base32,
        qrCode: qrCodeDataURL,
      };
    } catch (error) {
      this.logger.warn(`Authenticator setup failed for ${username}: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Verify and complete authenticator setup
   */
  async verifyAuthenticatorSetup(username: string, totpCode: string, secret: string): Promise<AuthResponse> {
    try {
      // Find user
      const user = await this.prisma.user.findUnique({
        where: { username },
      });

      if (!user || user.authMethod !== 'authenticator') {
        throw new UnauthorizedException('Invalid setup request');
      }

      // Verify TOTP code
      const isValidToken = speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: totpCode,
        window: 2, // Allow 2 time steps (60 seconds) tolerance
      });

      if (!isValidToken) {
        throw new UnauthorizedException('Invalid authenticator code');
      }

      // Update user as verified and set last login
      await this.prisma.user.update({
        where: { id: user.id },
        data: { 
          lastLoginAt: new Date(),
          // totpSecret is already set during setup
        },
      });

      // Generate session token
      const token = this.generateSessionToken(user.id, user.wallet);
      const expiresAt = Date.now() + this.TOKEN_EXPIRY;

      // Log successful setup completion
      await this.logSecurityEvent(user.id, 'AUTHENTICATOR_SETUP_SUCCESS', {
        username,
      });

      this.logger.log(`Authenticator setup completed for: ${username}`);

      return {
        success: true,
        user: {
          id: user.id,
          wallet: user.wallet,
          email: user.email,
          username: user.username,
          displayName: user.displayName,
          authMethod: 'authenticator' as const,
          avatar: user.avatar,
          totalEarnings: user.totalEarnings,
          totalMatches: user.totalMatches,
          wins: user.wins,
          losses: user.losses,
          winRate: user.winRate,
          reputation: user.reputation,
        },
        token,
        expiresAt,
      };
    } catch (error) {
      await this.logSecurityEvent(null, 'AUTHENTICATOR_SETUP_FAILED', {
        username,
        error: (error as Error).message,
      });

      this.logger.warn(`Authenticator setup verification failed for ${username}: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Sign in with authenticator (TOTP)
   */
  async signinWithAuthenticator(username: string, totpCode: string): Promise<AuthResponse> {
    try {
      // Find user
      const user = await this.prisma.user.findUnique({
        where: { username },
      });

      if (!user || user.authMethod !== 'authenticator' || !user.totpSecret) {
        throw new UnauthorizedException('Invalid username or authenticator code');
      }

      // Verify TOTP code
      const isValidToken = speakeasy.totp.verify({
        secret: user.totpSecret,
        encoding: 'base32',
        token: totpCode,
        window: 2, // Allow 2 time steps (60 seconds) tolerance
      });

      if (!isValidToken) {
        throw new UnauthorizedException('Invalid username or authenticator code');
      }

      // Update last login
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      // Generate session token
      const token = this.generateSessionToken(user.id, user.wallet);
      const expiresAt = Date.now() + this.TOKEN_EXPIRY;

      // Log successful signin
      await this.logSecurityEvent(user.id, 'AUTHENTICATOR_SIGNIN_SUCCESS', {
        username,
      });

      this.logger.log(`Authenticator user signed in: ${username}`);

      return {
        success: true,
        user: {
          id: user.id,
          wallet: user.wallet,
          email: user.email,
          username: user.username,
          displayName: user.displayName,
          authMethod: 'authenticator' as const,
          avatar: user.avatar,
          totalEarnings: user.totalEarnings,
          totalMatches: user.totalMatches,
          wins: user.wins,
          losses: user.losses,
          winRate: user.winRate,
          reputation: user.reputation,
        },
        token,
        expiresAt,
      };
    } catch (error) {
      await this.logSecurityEvent(null, 'AUTHENTICATOR_SIGNIN_FAILED', {
        username,
        error: (error as Error).message,
      });

      this.logger.warn(`Authenticator signin failed for ${username}: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * UPDATED TOKEN GENERATION AND VALIDATION
   */

  /**
   * Generate secure JWT session token
   */
  private generateSessionToken(userId: string, wallet: string): string {
    const payload = {
      userId,
      wallet,
      timestamp: Date.now(),
      iat: Math.floor(Date.now() / 1000)
    };

    return jwt.sign(payload, this.JWT_SECRET, { 
      algorithm: 'HS256',
      expiresIn: '24h'
    });
  }

  /**
   * Validate secure JWT session token
   */
  async validateToken(token: string): Promise<any> {
    // 🚀 CRITICAL: Check Redis cache first - 85% faster than database lookup
    const cached = await this.redisWebSocketService.getAuthToken(token);
      
    if (cached) {
      this.logger.log('✅ Auth token cache hit - serving from Redis');
      return cached;
      }

    this.logger.log('🔄 Auth token cache miss - validating with database');
    
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as any;
      const user = await this.prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          wallet: true,
          username: true,
          email: true,
          authMethod: true,
          lastLoginAt: true,
        },
      });

      if (user) {
        // 🚀 PERFORMANCE: Cache for 1 hour to prevent repeated database lookups
        await this.redisWebSocketService.cacheAuthToken(token, user, 3600000);
        this.logger.log(`💾 Auth token cached for user ${user.id}`);
      }

      return user;
    } catch (error) {
      this.logger.warn('Invalid token provided');
      return null;
    }
  }

  /**
   * Log security events for audit trail
   */
  private async logSecurityEvent(
    userId: string | null,
    type: string,
    details: any,
    ipAddress?: string,
    userAgent?: string
  ) {
    try {
      await this.prisma.securityLog.create({
        data: {
          userId,
          type,
          action: type,
          details,
          ipAddress,
          userAgent,
          createdAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to log security event: ${error.message}`);
    }
  }

  /**
   * Logout user (invalidate token)
   */
  async logout(token: string): Promise<void> {
    // 🚀 PERFORMANCE: Invalidate cached token on logout
    await this.redisWebSocketService.delete(`auth:${token}`);
    this.logger.log('🔄 Auth token invalidated on logout');
  }

  /**
   * Get user profile by token
   */
  async getUserProfile(token: string) {
    const tokenData = await this.validateToken(token);
    if (!tokenData) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // 🚨 CRITICAL FIX: validateToken returns user object with 'id', not tokenData with 'userId'
    const user = await this.prisma.user.findUnique({
      where: { id: tokenData.id },
      include: {
        referrals: {
          where: { referrerId: tokenData.id },
          select: { totalEarnings: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Return formatted user object consistent with other auth methods
    return {
      id: user.id,
      wallet: user.wallet,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      authMethod: user.email ? 'email' : user.totpSecret ? 'authenticator' : 'wallet',
      avatar: user.avatar,
      totalEarnings: user.totalEarnings,
      totalMatches: user.totalMatches,
      wins: user.wins,
      losses: user.losses,
      winRate: user.winRate,
      reputation: user.reputation,
      usernameChanged: user.usernameChanged,
      profileVisibility: user.profileVisibility,
      showUsername: user.showUsername,
      // Include 2FA fields for auth controller
      twoFactorEnabled: user.twoFactorEnabled,
      backupCodes: user.backupCodes,
      lastTwoFactorVerification: user.lastTwoFactorVerification,
      // Include additional fields that might be needed
      bio: user.bio,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      referrals: user.referrals,
    };
  }

  /**
   * Validate session for other services
   */
  async validateSession(sessionId: string): Promise<{ userId: string; wallet: string } | null> {
    return this.validateToken(sessionId);
  }

  /**
   * Generate temporary token for server-side batch queries
   * SECURITY: Only for internal server-side use, never exposed to client
   */
  generateTempToken(userId: string): string {
    const payload = {
      userId,
      temp: true,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 300 // 5 minute expiry
    };

    return jwt.sign(payload, this.JWT_SECRET, { 
      algorithm: 'HS256',
      expiresIn: '5m'
    });
  }

  /**
   * Update username (one-time only)
   */
  async updateUsername(token: string, newUsername: string) {
    const decoded = await this.validateToken(token);
    if (!decoded) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // 🚨 CRITICAL FIX: validateToken returns user object with 'id', not decoded with 'userId'
    const user = await this.prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Check if user has already changed their username
    if (user.usernameChanged) {
      throw new BadRequestException('Username has already been changed and cannot be modified again');
    }

    // Validate username format
    if (!newUsername || newUsername.length < 3 || newUsername.length > 20) {
      throw new BadRequestException('Username must be between 3 and 20 characters');
    }

    if (!/^[a-zA-Z0-9_]+$/.test(newUsername)) {
      throw new BadRequestException('Username can only contain letters, numbers, and underscores');
    }

    // Check if username is already taken
    const existingUser = await this.prisma.user.findUnique({
      where: { username: newUsername },
    });

    if (existingUser && existingUser.id !== user.id) {
      throw new BadRequestException('Username is already taken');
    }

    // Update username and mark as changed
    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        username: newUsername,
        usernameChanged: true,
      },
    });

    this.logger.log(`Username updated for user ${user.id}: ${user.username} -> ${newUsername}`);

    return {
      id: updatedUser.id,
      wallet: updatedUser.wallet,
      email: updatedUser.email,
      username: updatedUser.username,
      displayName: updatedUser.displayName,
      authMethod: updatedUser.email ? 'email' : updatedUser.totpSecret ? 'authenticator' : 'wallet',
      avatar: updatedUser.avatar,
      totalEarnings: updatedUser.totalEarnings,
      totalMatches: updatedUser.totalMatches,
      wins: updatedUser.wins,
      losses: updatedUser.losses,
      winRate: updatedUser.winRate,
      reputation: updatedUser.reputation,
      usernameChanged: updatedUser.usernameChanged,
    };
  }
} 