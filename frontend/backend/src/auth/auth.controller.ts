import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Headers,
  Req,
  Res,
  HttpStatus,
  UnauthorizedException,
  BadRequestException,
  Logger,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService, AuthRequest, AuthResponse } from './auth.service';
import { SolanaService } from '../solana/solana.service';
import { SessionVaultService } from '../session-vault/session-vault.service';
import { IsString, IsNumber, IsNotEmpty, validateOrReject } from 'class-validator';
import { RateLimitGuard, RateLimit } from '../common/guards/rate-limit.guard';
import { 
  AuthenticateDto, 
  GenerateMessageDto, 
  VerifySignatureDto,
  EmailSignupDto,
  EmailSigninDto,
  AuthenticatorSignupDto,
  AuthenticatorSigninDto,
  AuthenticatorSetupDto,
  AuthenticatorVerifyDto,
  WalletSignupDto
} from './dto/auth.dto';

class Enable2FADto {
  @IsString()
  @IsNotEmpty()
  token: string;
}

class Disable2FADto {
  @IsString()
  @IsNotEmpty()
  token: string;
}

class Verify2FADto {
  @IsString()
  @IsNotEmpty()
  token: string;
}

class UseBackupCodeDto {
  @IsString()
  @IsNotEmpty()
  backupCode: string;
}

@Controller('auth')
@UseGuards(RateLimitGuard)
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private authService: AuthService,
    private solanaService: SolanaService,
    private sessionVaultService: SessionVaultService
  ) {}

  /**
   * Generate authentication message for wallet signing
   * POST /auth/generate-message
   */
  @Post('generate-message')
  @RateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20, // 20 message requests per minute (increased from 10)
    message: 'Too many authentication attempts, please try again later'
  })
  @HttpCode(HttpStatus.OK)
  async generateMessage(
    @Body() dto: GenerateMessageDto,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      await validateOrReject(Object.assign(new GenerateMessageDto(), dto));

      const message = this.authService.generateAuthMessage(dto.wallet);

      this.logger.log(`Generated auth message for wallet: ${dto.wallet}`);

      return res.status(HttpStatus.OK).json({
        success: true,
        message,
        timestamp: Date.now(),
      });
    } catch (error) {
      this.logger.error(`Failed to generate message: ${(error as Error).message}`);
      
      if (Array.isArray(error)) {
        throw new BadRequestException('Invalid request data');
      }
      
      throw new BadRequestException((error as Error).message);
    }
  }

  /**
   * Authenticate user with wallet signature
   * POST /auth/authenticate
   */
  @Post('authenticate')
  @RateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 15, // 15 verification attempts per minute (increased from 5)
    message: 'Too many login attempts, please try again later'
  })
  @HttpCode(HttpStatus.OK)
  async authenticate(
    @Body() dto: AuthenticateDto,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      await validateOrReject(Object.assign(new AuthenticateDto(), dto));

      const authRequest: AuthRequest = {
        wallet: dto.wallet,
        signature: dto.signature,
        message: dto.message,
        timestamp: dto.timestamp,
        referralCode: dto.referralCode,
      };

      const authResponse: AuthResponse = await this.authService.authenticateWallet(authRequest);

      // Set secure HTTP-only cookie for token
      res.cookie('pv3_token', authResponse.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      });

      this.logger.log(`User authenticated successfully: ${dto.wallet}${dto.referralCode ? ` with referral: ${dto.referralCode}` : ''}`);

      return res.status(HttpStatus.OK).json({
        success: true,
        user: authResponse.user,
        token: authResponse.token,
        expiresAt: authResponse.expiresAt,
        referralProcessed: !!dto.referralCode,
      });
    } catch (error) {
      this.logger.error(`Authentication failed: ${(error as Error).message}`);
      
      if (Array.isArray(error)) {
        throw new BadRequestException('Invalid request data');
      }
      
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      throw new BadRequestException((error as Error).message);
    }
  }

  /**
   * Get current user profile
   * GET /auth/profile
   */
  @Get('profile')
  async getProfile(
    @Headers('authorization') authorization: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      const token = this.extractToken(authorization, req);
      const user = await this.authService.getUserProfile(token);

      return res.status(HttpStatus.OK).json({
        success: true,
        user,
      });
    } catch (error) {
      this.logger.error(`Failed to get profile: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  /**
   * Logout user
   * POST /auth/logout
   */
  @Post('logout')
  @RateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20, // 20 logout requests per minute
    message: 'Too many logout attempts, please try again later'
  })
  @HttpCode(HttpStatus.OK)
  async logout(
    @Headers('authorization') authorization: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      const token = this.extractToken(authorization, req);
      await this.authService.logout(token);

      // Clear cookie
      res.clearCookie('pv3_token');

      this.logger.log('User logged out successfully');

      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      this.logger.error(`Logout failed: ${error.message}`);
      
      // Clear cookie anyway
      res.clearCookie('pv3_token');
      
      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Logged out',
      });
    }
  }

  /**
   * Update username (one-time only)
   * PUT /auth/username
   */
  @Put('username')
  async updateUsername(
    @Body() body: { username: string },
    @Headers('authorization') authorization: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      const token = this.extractToken(authorization, req);
      const user = await this.authService.updateUsername(token, body.username);

      return res.status(HttpStatus.OK).json({
        success: true,
        user,
        message: 'Username updated successfully',
      });
    } catch (error) {
      this.logger.error(`Failed to update username: ${error.message}`);
      
      if (error.message.includes('already changed') || error.message.includes('already taken')) {
        throw new BadRequestException(error.message);
      }
      
      throw new BadRequestException('Failed to update username');
    }
  }

  /**
   * Health check endpoint
   * GET /auth/health
   */
  @Get('health')
  async health(@Res() res: Response) {
    return res.status(HttpStatus.OK).json({
      success: true,
      service: 'auth',
      timestamp: Date.now(),
    });
  }

  /**
   * Create session vault for user
   * POST /auth/create-session-vault
   */
  @Post('create-session-vault')
  async createSessionVault(
    @Body() body: { wallet: string },
    @Res() res: Response
  ) {
    try {
      if (!body.wallet) {
        throw new BadRequestException('Wallet address is required');
      }

      const sessionVaultAddress = await this.solanaService.createSessionVault(body.wallet);

      this.logger.log(`Session vault created for ${body.wallet}: ${sessionVaultAddress}`);

      return res.status(HttpStatus.OK).json({
        success: true,
        sessionVaultAddress,
        wallet: body.wallet,
      });
    } catch (error) {
      this.logger.error(`Failed to create session vault: ${error.message}`);
      throw new BadRequestException(`Failed to create session vault: ${error.message}`);
    }
  }

  /**
   * Create session vault for authenticated user
   * POST /auth/vault/create
   */
  @Post('vault/create')
  async createSessionVaultForUser(
    @Headers('authorization') authorization: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      const token = this.extractToken(authorization, req);
      const user = await this.authService.getUserProfile(token);

      const sessionVaultAddress = await this.solanaService.createSessionVault(user.wallet);

      this.logger.log(`Session vault created for authenticated user ${user.id}: ${sessionVaultAddress}`);

      return res.status(HttpStatus.OK).json({
        success: true,
        sessionVaultAddress,
        wallet: user.wallet,
      });
    } catch (error) {
      this.logger.error(`Failed to create session vault for authenticated user: ${error.message}`);
      throw new BadRequestException(`Failed to create session vault: ${error.message}`);
    }
  }

  /**
   * Get 2FA status for current user
   * GET /auth/2fa/status
   */
  @Get('2fa/status')
  async get2FAStatus(
    @Headers('authorization') authorization: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      const token = this.extractToken(authorization, req);
      const user = await this.authService.getUserProfile(token);
      
      const status = {
        enabled: user.twoFactorEnabled || false,
        backupCodesGenerated: !!user.backupCodes,
        lastVerification: user.lastTwoFactorVerification?.toISOString()
      };

      return res.status(HttpStatus.OK).json(status);
    } catch (error) {
      this.logger.error(`Failed to get 2FA status: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  /**
   * Generate 2FA setup (QR code and secret)
   * POST /auth/2fa/generate
   */
  @Post('2fa/generate')
  async generate2FASetup(
    @Headers('authorization') authorization: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      const token = this.extractToken(authorization, req);
      const user = await this.authService.getUserProfile(token);
      
      const setup = await this.sessionVaultService.setup2FA(user.id);
      
      return res.status(HttpStatus.OK).json(setup);
    } catch (error) {
      this.logger.error(`Failed to generate 2FA setup: ${error.message}`);
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Enable 2FA with verification token
   * POST /auth/2fa/enable
   */
  @Post('2fa/enable')
  async enable2FA(
    @Body() dto: Enable2FADto,
    @Headers('authorization') authorization: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      await validateOrReject(Object.assign(new Enable2FADto(), dto));
      
      const token = this.extractToken(authorization, req);
      const user = await this.authService.getUserProfile(token);
      
      const success = await this.sessionVaultService.verify2FA(user.id, dto.token);
      
      if (success) {
        return res.status(HttpStatus.OK).json({
          success: true,
          message: '2FA enabled successfully'
        });
      } else {
        throw new BadRequestException('Invalid verification token');
      }
    } catch (error) {
      this.logger.error(`Failed to enable 2FA: ${error.message}`);
      if (Array.isArray(error)) {
        throw new BadRequestException('Invalid request data');
      }
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Disable 2FA with verification token
   * POST /auth/2fa/disable
   */
  @Post('2fa/disable')
  async disable2FA(
    @Body() dto: Disable2FADto,
    @Headers('authorization') authorization: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      await validateOrReject(Object.assign(new Disable2FADto(), dto));
      
      const token = this.extractToken(authorization, req);
      const user = await this.authService.getUserProfile(token);
      
      const success = await this.sessionVaultService.disable2FA(user.id, dto.token);
      
      if (success) {
        return res.status(HttpStatus.OK).json({
          success: true,
          message: '2FA disabled successfully'
        });
      } else {
        throw new BadRequestException('Invalid verification token');
      }
    } catch (error) {
      this.logger.error(`Failed to disable 2FA: ${error.message}`);
      if (Array.isArray(error)) {
        throw new BadRequestException('Invalid request data');
      }
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Verify 2FA token
   * POST /auth/2fa/verify
   */
  @Post('2fa/verify')
  async verify2FA(
    @Body() dto: Verify2FADto,
    @Headers('authorization') authorization: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      await validateOrReject(Object.assign(new Verify2FADto(), dto));
      
      const token = this.extractToken(authorization, req);
      const user = await this.authService.getUserProfile(token);
      
      // For existing users with 2FA enabled, just verify the token
      const isValid = await this.sessionVaultService.verifyTOTPToken(user.id, dto.token);
      
      return res.status(HttpStatus.OK).json({
        valid: isValid,
        message: isValid ? 'Token verified successfully' : 'Invalid token'
      });
    } catch (error) {
      this.logger.error(`Failed to verify 2FA: ${error.message}`);
      if (Array.isArray(error)) {
        throw new BadRequestException('Invalid request data');
      }
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Generate new backup codes
   * POST /auth/2fa/backup-codes
   */
  @Post('2fa/backup-codes')
  async generateBackupCodes(
    @Headers('authorization') authorization: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      const token = this.extractToken(authorization, req);
      const user = await this.authService.getUserProfile(token);
      
      if (!user.twoFactorEnabled) {
        throw new BadRequestException('2FA must be enabled first');
      }
      
      // Generate new backup codes
      const backupCodes = Array.from({ length: 8 }, () => 
        require('crypto').randomBytes(4).toString('hex').toUpperCase()
      );
      
      // Hash and store them
      const backupCodesHash = require('crypto').createHash('sha256').update(backupCodes.join(',')).digest('hex');
      
      await this.sessionVaultService.updateBackupCodes(user.id, backupCodesHash);
      
      return res.status(HttpStatus.OK).json({ backupCodes });
    } catch (error) {
      this.logger.error(`Failed to generate backup codes: ${error.message}`);
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Use backup code for verification
   * POST /auth/2fa/backup-code
   */
  @Post('2fa/backup-code')
  async useBackupCode(
    @Body() dto: UseBackupCodeDto,
    @Headers('authorization') authorization: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      await validateOrReject(Object.assign(new UseBackupCodeDto(), dto));
      
      const token = this.extractToken(authorization, req);
      const user = await this.authService.getUserProfile(token);
      
      const isValid = await this.sessionVaultService.useBackupCode(user.id, dto.backupCode);
      
      return res.status(HttpStatus.OK).json({
        valid: isValid,
        message: isValid ? 'Backup code used successfully' : 'Invalid backup code'
      });
    } catch (error) {
      this.logger.error(`Failed to use backup code: ${error.message}`);
      if (Array.isArray(error)) {
        throw new BadRequestException('Invalid request data');
      }
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Withdraw from vault with 2FA support
   * POST /auth/vault/withdraw
   */
  @Post('vault/withdraw')
  async withdrawFromVault(
    @Body() body: { amount: number; totpToken?: string },
    @Headers('authorization') authorization: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      const token = this.extractToken(authorization, req);
      const user = await this.authService.getUserProfile(token);
      
      const { amount, totpToken } = body;
      
      if (!amount || amount <= 0) {
        throw new BadRequestException('Amount must be greater than 0');
      }
      
      // Call session vault service with 2FA support
      const result = await this.sessionVaultService.withdrawFromSessionVault(
        user.id, 
        amount, 
        totpToken
      );
      
      return res.status(HttpStatus.OK).json({
        success: true,
        message: `Successfully withdrew ${amount} SOL from vault`,
        ...result
      });
    } catch (error) {
      this.logger.error(`Failed to withdraw from vault: ${error.message}`);
      throw new BadRequestException(error.message);
    }
  }

  /**
   * EMAIL AUTHENTICATION ENDPOINTS
   */

  /**
   * Sign up with email and password
   * POST /auth/email/signup
   */
  @Post('email/signup')
  @RateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5, // 5 signup attempts per minute
    message: 'Too many signup attempts, please try again later'
  })
  @HttpCode(HttpStatus.CREATED)
  async emailSignup(
    @Body() dto: EmailSignupDto,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      await validateOrReject(Object.assign(new EmailSignupDto(), dto));

      const authResponse: AuthResponse = await this.authService.signupWithEmail(
        dto.email,
        dto.password,
        dto.username,
        dto.displayName,
        dto.referralCode
      );

      // Set secure HTTP-only cookie for token
      res.cookie('pv3_token', authResponse.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      });

      this.logger.log(`Email user signed up: ${dto.email}${dto.referralCode ? ` with referral: ${dto.referralCode}` : ''}`);

      return res.status(HttpStatus.CREATED).json({
        success: true,
        user: authResponse.user,
        token: authResponse.token,
        expiresAt: authResponse.expiresAt,
        referralProcessed: !!dto.referralCode,
      });
    } catch (error) {
      this.logger.error(`Email signup failed: ${(error as Error).message}`);
      
      if (Array.isArray(error)) {
        throw new BadRequestException('Invalid request data');
      }
      
      throw new BadRequestException((error as Error).message);
    }
  }

  /**
   * Sign in with email and password
   * POST /auth/email/signin
   */
  @Post('email/signin')
  @RateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 signin attempts per minute
    message: 'Too many signin attempts, please try again later'
  })
  @HttpCode(HttpStatus.OK)
  async emailSignin(
    @Body() dto: EmailSigninDto,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      await validateOrReject(Object.assign(new EmailSigninDto(), dto));

      const authResponse: AuthResponse = await this.authService.signinWithEmail(
        dto.email,
        dto.password
      );

      // Set secure HTTP-only cookie for token
      res.cookie('pv3_token', authResponse.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      });

      this.logger.log(`Email user signed in: ${dto.email}`);

      return res.status(HttpStatus.OK).json({
        success: true,
        user: authResponse.user,
        token: authResponse.token,
        expiresAt: authResponse.expiresAt,
      });
    } catch (error) {
      this.logger.error(`Email signin failed: ${(error as Error).message}`);
      
      if (Array.isArray(error)) {
        throw new BadRequestException('Invalid request data');
      }
      
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      throw new BadRequestException((error as Error).message);
    }
  }

  /**
   * AUTHENTICATOR (TOTP) AUTHENTICATION ENDPOINTS
   */

  /**
   * Setup authenticator (TOTP) - returns QR code and secret
   * POST /auth/authenticator/setup
   */
  @Post('authenticator/setup')
  @RateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5, // 5 setup attempts per minute
    message: 'Too many setup attempts, please try again later'
  })
  @HttpCode(HttpStatus.OK)
  async authenticatorSetup(
    @Body() dto: AuthenticatorSetupDto,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      await validateOrReject(Object.assign(new AuthenticatorSetupDto(), dto));

      const setupResponse = await this.authService.setupAuthenticator(
        dto.username,
        dto.displayName,
        dto.referralCode
      );

      this.logger.log(`Authenticator setup initiated for: ${dto.username}${dto.referralCode ? ` with referral: ${dto.referralCode}` : ''}`);

      return res.status(HttpStatus.OK).json({
        ...setupResponse,
        referralProcessed: !!dto.referralCode,
      });
    } catch (error) {
      this.logger.error(`Authenticator setup failed: ${(error as Error).message}`);
      
      if (Array.isArray(error)) {
        throw new BadRequestException('Invalid request data');
      }
      
      throw new BadRequestException((error as Error).message);
    }
  }

  /**
   * Verify and complete authenticator setup
   * POST /auth/authenticator/verify
   */
  @Post('authenticator/verify')
  @RateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 verification attempts per minute
    message: 'Too many verification attempts, please try again later'
  })
  @HttpCode(HttpStatus.OK)
  async authenticatorVerify(
    @Body() dto: AuthenticatorVerifyDto,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      await validateOrReject(Object.assign(new AuthenticatorVerifyDto(), dto));

      const authResponse: AuthResponse = await this.authService.verifyAuthenticatorSetup(
        dto.username,
        dto.totpCode,
        dto.secret
      );

      // Set secure HTTP-only cookie for token
      res.cookie('pv3_token', authResponse.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      });

      this.logger.log(`Authenticator setup completed for: ${dto.username}`);

      return res.status(HttpStatus.OK).json({
        success: true,
        user: authResponse.user,
        token: authResponse.token,
        expiresAt: authResponse.expiresAt,
      });
    } catch (error) {
      this.logger.error(`Authenticator verification failed: ${(error as Error).message}`);
      
      if (Array.isArray(error)) {
        throw new BadRequestException('Invalid request data');
      }
      
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      throw new BadRequestException((error as Error).message);
    }
  }

  /**
   * Sign in with authenticator (TOTP)
   * POST /auth/authenticator/signin
   */
  @Post('authenticator/signin')
  @RateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 signin attempts per minute
    message: 'Too many signin attempts, please try again later'
  })
  @HttpCode(HttpStatus.OK)
  async authenticatorSignin(
    @Body() dto: AuthenticatorSigninDto,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      await validateOrReject(Object.assign(new AuthenticatorSigninDto(), dto));

      const authResponse: AuthResponse = await this.authService.signinWithAuthenticator(
        dto.username,
        dto.totpCode
      );

      // Set secure HTTP-only cookie for token
      res.cookie('pv3_token', authResponse.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      });

      this.logger.log(`Authenticator user signed in: ${dto.username}`);

      return res.status(HttpStatus.OK).json({
        success: true,
        user: authResponse.user,
        token: authResponse.token,
        expiresAt: authResponse.expiresAt,
      });
    } catch (error) {
      this.logger.error(`Authenticator signin failed: ${(error as Error).message}`);
      
      if (Array.isArray(error)) {
        throw new BadRequestException('Invalid request data');
      }
      
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      throw new BadRequestException((error as Error).message);
    }
  }

  /**
   * Extract token from Authorization header or cookie
   */
  private extractToken(authorization: string, req: Request): string {
    // Try Authorization header first
    if (authorization && authorization.startsWith('Bearer ')) {
      return authorization.substring(7);
    }

    // Try cookie
    if (req.cookies && req.cookies.pv3_token) {
      return req.cookies.pv3_token;
    }

    throw new UnauthorizedException('No authentication token provided');
  }
} 