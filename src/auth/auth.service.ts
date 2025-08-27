import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../common/prisma.service';
import { LoggerService } from '../common/logger.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly bcryptRounds: number;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private logger: LoggerService,
  ) {
    this.bcryptRounds = parseInt(this.configService.get('BCRYPT_ROUNDS')) || 12;
  }

  async register(registerDto: RegisterDto, ipAddress?: string) {
    const { email, password, firstName, lastName, username } = registerDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email },
          ...(username ? [{ username }] : []),
        ],
      },
    });

    if (existingUser) {
      if (existingUser.email === email) {
        throw new ConflictException('Email already registered');
      }
      if (existingUser.username === username) {
        throw new ConflictException('Username already taken');
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, this.bcryptRounds);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        username,
        emailVerified: false, // In production, implement email verification
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    // Create session with refresh token
    const sessionId = uuidv4();
    const refreshTokenId = uuidv4();
    const accessExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes for access token
    const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days for refresh token

    await this.prisma.userSession.create({
      data: {
        userId: user.id,
        sessionId,
        refreshToken: refreshTokenId,
        ipAddress,
        expiresAt: refreshExpiresAt,
        lastActivityAt: new Date(),
      },
    });

    // Generate JWT tokens
    const payload = { 
      sub: user.id, 
      email: user.email,
      sessionId,
    };
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15m',
    });

    const refreshTokenJwt = this.jwtService.sign(
      { sub: user.id, sessionId, type: 'refresh' },
      { expiresIn: '30d' },
    );

    // Log registration
    this.logger.log({
      type: 'user_registered',
      userId: user.id,
      email: user.email,
      ipAddress,
    }, 'AUTH');

    // Create audit log
    await this.createAuditLog(user.id, 'CREATE', 'USER', user.id, null, user, ipAddress);

    return {
      user,
      accessToken,
      refreshToken: refreshTokenJwt,
      sessionId,
      expiresAt: accessExpiresAt,
      refreshExpiresAt,
    };
  }

  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string) {
    const { email, password } = loginDto;

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true,
        passwordHash: true,
        emailVerified: true,
        isActive: true,
        isSuspended: true,
        suspendedReason: true,
        lastLoginAt: true,
        loginCount: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    if (user.isSuspended) {
      throw new UnauthorizedException(`Account is suspended: ${user.suspendedReason}`);
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      // Log failed login attempt
      this.logger.logSecurityEvent('failed_login', { email, ipAddress }, user.id, ipAddress);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update login stats
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        loginCount: user.loginCount + 1,
      },
    });

    // Create session with refresh token
    const sessionId = uuidv4();
    const refreshTokenId = uuidv4();
    const accessExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes for access token
    const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days for refresh token

    await this.prisma.userSession.create({
      data: {
        userId: user.id,
        sessionId,
        refreshToken: refreshTokenId,
        ipAddress,
        userAgent,
        expiresAt: refreshExpiresAt,
        lastActivityAt: new Date(),
      },
    });

    // Generate JWT tokens
    const payload = { 
      sub: user.id, 
      email: user.email,
      sessionId,
    };
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15m',
    });

    const refreshTokenJwt = this.jwtService.sign(
      { sub: user.id, sessionId, refreshTokenId, type: 'refresh' },
      { expiresIn: '30d' },
    );

    // Remove password hash from response
    const { passwordHash, ...userResponse } = user;

    // Log successful login
    this.logger.log({
      type: 'user_login',
      userId: user.id,
      email: user.email,
      ipAddress,
      userAgent,
    }, 'AUTH');

    // Create audit log
    await this.createAuditLog(user.id, 'LOGIN', 'USER', user.id, null, { ipAddress, userAgent }, ipAddress);

    return {
      user: userResponse,
      accessToken,
      refreshToken: refreshTokenJwt,
      sessionId,
      expiresAt: accessExpiresAt,
      refreshExpiresAt,
    };
  }

  async logout(sessionId: string, userId: string) {
    // Invalidate session in database
    await this.prisma.userSession.update({
      where: { sessionId },
      data: { isActive: false },
    });

    // Session removed from database (Redis removed)

    // Log logout
    this.logger.log({
      type: 'user_logout',
      userId,
      sessionId,
    }, 'AUTH');

    // Create audit log
    await this.createAuditLog(userId, 'LOGOUT', 'USER', userId, null, { sessionId });

    return { message: 'Logged out successfully' };
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true,
        passwordHash: true,
        emailVerified: true,
        isActive: true,
        isSuspended: true,
      },
    });

    if (!user || !user.isActive || user.isSuspended) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return null;
    }

    const { passwordHash, ...result } = user;
    return result;
  }

  async validateSession(sessionId: string) {
    // Check database directly (Redis cache removed)
    const session = await this.prisma.userSession.findUnique({
      where: { sessionId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
            emailVerified: true,
            isActive: true,
            isSuspended: true,
          },
        },
      },
    });

    if (!session || !session.isActive || session.expiresAt < new Date()) {
      return null;
    }

    if (!session.user.isActive || session.user.isSuspended) {
      return null;
    }

    // Return session data (Redis cache removed)
    return {
      userId: session.user.id,
      email: session.user.email,
      username: session.user.username,
    };
  }

  async getUserProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true,
        emailVerified: true,
        lastLoginAt: true,
        loginCount: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            apiKeys: { where: { isActive: true } },
            supportTickets: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  async updateProfile(userId: string, updateData: {
    firstName?: string;
    lastName?: string;
    username?: string;
    avatar?: string;
  }) {
    const { username, ...otherData } = updateData;

    // Check if username is already taken
    if (username) {
      const existingUser = await this.prisma.user.findFirst({
        where: {
          username,
          id: { not: userId },
        },
      });

      if (existingUser) {
        throw new ConflictException('Username already taken');
      }
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...otherData,
        ...(username && { username }),
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true,
        emailVerified: true,
        updatedAt: true,
      },
    });

    // Create audit log
    await this.createAuditLog(userId, 'UPDATE', 'USER', userId, null, updateData);

    return user;
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, this.bcryptRounds);

    // Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    // Invalidate all sessions for security
    await this.prisma.userSession.updateMany({
      where: { userId },
      data: { isActive: false },
    });

    // Create audit log
    await this.createAuditLog(userId, 'UPDATE', 'PASSWORD', userId, null, { action: 'password_changed' });

    // Log security event
    this.logger.logSecurityEvent('password_changed', { userId }, userId);

    return { message: 'Password changed successfully. Please log in again.' };
  }

  async validateOAuthUser(oauthUser: any) {
    const { email, name, firstName, lastName, username, avatar, provider } = oauthUser;

    if (!email) {
      throw new BadRequestException('Email is required for OAuth authentication');
    }

    // Check if user already exists
    let user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true,
        emailVerified: true,
        isActive: true,
        isSuspended: true,
        createdAt: true,
      },
    });

    if (!user) {
      // Create new user from OAuth data
      user = await this.prisma.user.create({
        data: {
          email,
          firstName: firstName || name?.split(' ')[0] || '',
          lastName: lastName || name?.split(' ').slice(1).join(' ') || '',
          username: username || email.split('@')[0],
          avatar,
          emailVerified: true, // OAuth emails are pre-verified
        },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          avatar: true,
          emailVerified: true,
          isActive: true,
          isSuspended: true,
          createdAt: true,
        },
      });

      // Log registration
      this.logger.log({
        type: 'oauth_user_registered',
        userId: user.id,
        email: user.email,
        provider,
      }, 'AUTH');

      // Create audit log
      await this.createAuditLog(user.id, 'CREATE', 'USER', user.id, null, { ...user, provider });
    } else {
      // Update existing user with OAuth info if not already set
      const updateData: any = {};
      if (avatar && !user.avatar) {
        updateData.avatar = avatar;
      }

      if (Object.keys(updateData).length > 0) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: updateData,
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
            emailVerified: true,
            isActive: true,
            isSuspended: true,
                createdAt: true,
          },
        });
      }
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    if (user.isSuspended) {
      throw new UnauthorizedException('Account is suspended');
    }

    return user;
  }

  async handleOAuthCallback(user: any, ipAddress?: string, userAgent?: string) {
    // Update login stats
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        loginCount: { increment: 1 },
      },
    });

    // Create session with refresh token
    const sessionId = uuidv4();
    const refreshTokenId = uuidv4();
    const accessExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes for access token
    const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days for refresh token

    await this.prisma.userSession.create({
      data: {
        userId: user.id,
        sessionId,
        refreshToken: refreshTokenId,
        ipAddress,
        userAgent,
        expiresAt: refreshExpiresAt,
        lastActivityAt: new Date(),
      },
    });

    // Generate JWT tokens
    const payload = { 
      sub: user.id, 
      email: user.email,
      sessionId,
    };
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15m',
    });

    const refreshTokenJwt = this.jwtService.sign(
      { sub: user.id, sessionId, refreshTokenId, type: 'refresh' },
      { expiresIn: '30d' },
    );

    // Log successful login
    this.logger.log({
      type: 'oauth_user_login',
      userId: user.id,
      email: user.email,
      ipAddress,
      userAgent,
    }, 'AUTH');

    // Create audit log
    await this.createAuditLog(user.id, 'LOGIN', 'USER', user.id, null, { ipAddress, userAgent, method: 'oauth' }, ipAddress);

    return {
      user,
      accessToken,
      refreshToken: refreshTokenJwt,
      sessionId,
      expiresAt: accessExpiresAt,
      refreshExpiresAt,
    };
  }

  async refreshAccessToken(refreshToken: string, ipAddress?: string, userAgent?: string) {
    try {
      // Verify refresh token
      const decoded = this.jwtService.verify(refreshToken);
      
      if (decoded.type !== 'refresh' || !decoded.refreshTokenId) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Find session by sessionId AND verify refresh token matches
      const session = await this.prisma.userSession.findFirst({
        where: { 
          sessionId: decoded.sessionId,
          refreshToken: decoded.refreshTokenId, // Verify the refresh token ID matches
          isActive: true,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true,
              firstName: true,
              lastName: true,
              avatar: true,
              emailVerified: true,
              isActive: true,
              isSuspended: true,
            },
          },
        },
      });

      if (!session || session.expiresAt < new Date()) {
        throw new UnauthorizedException('Session expired or invalid token');
      }

      if (!session.user.isActive || session.user.isSuspended) {
        throw new UnauthorizedException('Account is not active');
      }

      // Update last activity
      await this.prisma.userSession.update({
        where: { sessionId: decoded.sessionId },
        data: {
          lastActivityAt: new Date(),
          ipAddress: ipAddress || session.ipAddress,
          userAgent: userAgent || session.userAgent,
        },
      });

      // Generate new access token
      const payload = {
        sub: session.user.id,
        email: session.user.email,
        sessionId: session.sessionId,
      };
      const newAccessToken = this.jwtService.sign(payload, {
        expiresIn: '15m',
      });

      // Log token refresh
      this.logger.log({
        type: 'token_refreshed',
        userId: session.user.id,
        sessionId: session.sessionId,
        ipAddress,
      }, 'AUTH');

      return {
        accessToken: newAccessToken,
        user: session.user,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      };
    } catch (error) {
      this.logger.logSecurityEvent('invalid_refresh_token', { ipAddress }, null, ipAddress);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async createAuditLog(
    userId: string,
    action: string,
    resource: string,
    resourceId: string,
    oldValues?: any,
    newValues?: any,
    ipAddress?: string,
    userAgent?: string,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action,
          resource,
          resourceId,
          oldValues: oldValues ? JSON.stringify(oldValues) : null,
          newValues: newValues ? JSON.stringify(newValues) : null,
          ipAddress,
          userAgent,
        },
      });
    } catch (error) {
      this.logger.error('Failed to create audit log:', error, 'AUTH');
    }
  }
}