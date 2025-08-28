import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Connection, PublicKey, Keypair, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import * as bs58 from 'bs58';
import { createHash, randomBytes } from 'crypto';
import * as QRCode from 'qrcode';
import * as speakeasy from 'speakeasy';

@Injectable()
export class SessionVaultService {
  private readonly logger = new Logger(SessionVaultService.name);
  private readonly connection: Connection;
  private readonly sessionVaultKeypair: Keypair;

  private readonly WITHDRAWAL_LIMITS = {
    // Without 2FA limits
    NO_2FA_DAILY_LIMIT: 5, // Max 5 withdrawals per day
    NO_2FA_HOURLY_LIMIT: 2,  // Max 2 withdrawals per hour
    NO_2FA_MAX_AMOUNT: 1,   // Maximum 1 SOL per withdrawal
    NO_2FA_FEE_BPS: 50,     // 0.5% fee
    
    // With 2FA limits (enhanced)
    WITH_2FA_DAILY_LIMIT: 20, // Max 20 withdrawals per day
    WITH_2FA_HOURLY_LIMIT: 10,  // Max 10 withdrawals per hour
    WITH_2FA_MAX_AMOUNT: 5,   // Maximum 5 SOL per withdrawal
    WITH_2FA_FEE_BPS: 25,     // 0.25% fee
    
    // Common limits
    MIN_AMOUNT: 0.001, // Minimum 0.001 SOL
    COOLDOWN_MS: 2 * 60 * 1000, // 2 minute cooldown between withdrawals
  };

  private readonly withdrawalHistory = new Map<string, Array<{ timestamp: number; amount: number }>>();

  constructor(private readonly prisma: PrismaService) {
    this.connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com');
    
    // Initialize session vault keypair from environment
    const privateKeyString = process.env.SESSION_VAULT_PRIVATE_KEY;
    if (!privateKeyString) {
      throw new Error('SESSION_VAULT_PRIVATE_KEY environment variable is required');
    }
    
    try {
      const privateKeyBytes = bs58.decode(privateKeyString);
      this.sessionVaultKeypair = Keypair.fromSecretKey(privateKeyBytes);
    } catch (error) {
      throw new Error('Invalid SESSION_VAULT_PRIVATE_KEY format');
    }
  }

  /**
   * Get session vault PDA for a user
   */
  private getSessionVaultPDA(userWallet: string): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from('session_vault'), new PublicKey(userWallet).toBuffer()],
      new PublicKey('YourProgramIdHere') // Replace with actual program ID
    );
    return pda;
  }

  /**
   * Get session vault balance
   */
  async getSessionVaultBalance(userId: string): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const sessionVaultPda = this.getSessionVaultPDA(user.wallet);
    const balance = await this.connection.getBalance(sessionVaultPda);
    return balance / LAMPORTS_PER_SOL;
  }

  /**
   * Validate withdrawal request against limits (2FA-aware)
   */
  private async validateWithdrawal(userId: string, amount: number, has2FA: boolean = false): Promise<{ fee: number; netAmount: number }> {
    const now = Date.now();
    const userHistory = this.withdrawalHistory.get(userId) || [];
    
    // Clean old records (older than 24 hours)
    const cleanHistory = userHistory.filter(record => now - record.timestamp < 24 * 60 * 60 * 1000);
    this.withdrawalHistory.set(userId, cleanHistory);
    
    // Get limits based on 2FA status
    const dailyLimit = has2FA ? this.WITHDRAWAL_LIMITS.WITH_2FA_DAILY_LIMIT : this.WITHDRAWAL_LIMITS.NO_2FA_DAILY_LIMIT;
    const hourlyLimit = has2FA ? this.WITHDRAWAL_LIMITS.WITH_2FA_HOURLY_LIMIT : this.WITHDRAWAL_LIMITS.NO_2FA_HOURLY_LIMIT;
    const maxAmount = has2FA ? this.WITHDRAWAL_LIMITS.WITH_2FA_MAX_AMOUNT : this.WITHDRAWAL_LIMITS.NO_2FA_MAX_AMOUNT;
    const feeBps = has2FA ? this.WITHDRAWAL_LIMITS.WITH_2FA_FEE_BPS : this.WITHDRAWAL_LIMITS.NO_2FA_FEE_BPS;
    
    // Check amount limits
    if (amount < this.WITHDRAWAL_LIMITS.MIN_AMOUNT) {
      throw new Error(`Minimum withdrawal amount is ${this.WITHDRAWAL_LIMITS.MIN_AMOUNT} SOL`);
    }
    
    if (amount > maxAmount) {
      throw new Error(`Maximum withdrawal amount is ${maxAmount} SOL${has2FA ? ' (enable 2FA for higher limits)' : ''}`);
    }
    
    // Check daily limit
    const dailyWithdrawals = cleanHistory.filter(record => now - record.timestamp < 24 * 60 * 60 * 1000);
    if (dailyWithdrawals.length >= dailyLimit) {
      throw new Error(`Daily withdrawal limit exceeded (${dailyLimit}). ${has2FA ? 'Please try again tomorrow.' : 'Enable 2FA for higher limits.'}`);
    }
    
    // Check hourly limit
    const hourlyWithdrawals = cleanHistory.filter(record => now - record.timestamp < 60 * 60 * 1000);
    if (hourlyWithdrawals.length >= hourlyLimit) {
      throw new Error(`Hourly withdrawal limit exceeded (${hourlyLimit}). ${has2FA ? 'Please try again later.' : 'Enable 2FA for higher limits.'}`);
    }
    
    // Check cooldown
    const lastWithdrawal = cleanHistory[cleanHistory.length - 1];
    if (lastWithdrawal && now - lastWithdrawal.timestamp < this.WITHDRAWAL_LIMITS.COOLDOWN_MS) {
      const remainingCooldown = Math.ceil((this.WITHDRAWAL_LIMITS.COOLDOWN_MS - (now - lastWithdrawal.timestamp)) / 1000);
      throw new Error(`Please wait ${remainingCooldown} seconds before next withdrawal.`);
    }
    
    // Check if user has sufficient balance
    const balance = await this.getSessionVaultBalance(userId);
    if (balance < amount) {
      throw new Error('Insufficient session vault balance');
    }
    
    // Calculate fee and net amount
    const fee = (amount * feeBps) / 10000;
    const netAmount = amount - fee;
    
    return { fee, netAmount };
  }

  /**
   * Record withdrawal in history
   */
  private recordWithdrawal(userId: string, amount: number): void {
    const userHistory = this.withdrawalHistory.get(userId) || [];
    userHistory.push({ timestamp: Date.now(), amount });
    this.withdrawalHistory.set(userId, userHistory);
  }

  /**
   * Log security event
   */
  private async logSecurityEvent(userId: string, type: string, details: any): Promise<void> {
    try {
      await this.prisma.securityLog.create({
        data: {
          userId,
          type,
          action: type, // Use type as action for consistency
          details,
          createdAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to log security event: ${error.message}`);
    }
  }

  /**
   * Enhanced withdrawal with security checks and 2FA support
   */
  async withdrawFromSessionVault(userId: string, amount: number, totpToken?: string): Promise<{ signature: string; fee: number; netAmount: number }> {
    try {
      // Check if user has 2FA enabled
      const has2FA = await this.has2FAEnabled(userId);
      
      // If 2FA is enabled, require TOTP token
      if (has2FA && !totpToken) {
        throw new Error('2FA token required for withdrawal');
      }
      
      // Verify 2FA token if provided
      if (has2FA && totpToken) {
        const isValidToken = await this.verifyTOTPToken(userId, totpToken);
        if (!isValidToken) {
          throw new Error('Invalid 2FA token');
        }
      }
      
      // ✅ SECURITY: Validate withdrawal limits and calculate fees
      const { fee, netAmount } = await this.validateWithdrawal(userId, amount, has2FA);
      
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Get session vault PDA
      const sessionVaultPda = this.getSessionVaultPDA(user.wallet);
      
      // Check actual on-chain balance
      const balance = await this.connection.getBalance(sessionVaultPda);
      const solBalance = balance / LAMPORTS_PER_SOL;
      
      if (solBalance < amount) {
        throw new Error('Insufficient session vault balance');
      }

      // Create withdrawal transaction
      const transaction = new Transaction();
      
      // Transfer net amount to user wallet (fee stays in vault)
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: sessionVaultPda,
          toPubkey: new PublicKey(user.wallet),
          lamports: netAmount * LAMPORTS_PER_SOL,
        })
      );

      // Sign and send transaction
      const signature = await this.connection.sendTransaction(transaction, [this.sessionVaultKeypair]);
      await this.connection.confirmTransaction(signature);

      // ✅ SECURITY: Record withdrawal in history
      this.recordWithdrawal(userId, amount);

      // Update last 2FA verification if 2FA was used
      if (has2FA && totpToken) {
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            lastTwoFactorVerification: new Date(),
          },
        });
      }

      // Log security event
      await this.logSecurityEvent(userId, 'WITHDRAWAL', {
        amount,
        fee,
        netAmount,
        has2FA,
        signature,
        timestamp: Date.now(),
      });

      this.logger.log(`Session vault withdrawal: ${amount} SOL (fee: ${fee}, net: ${netAmount}) for user ${userId} ${has2FA ? 'with 2FA' : 'without 2FA'}`);
      return { signature, fee, netAmount };
    } catch (error) {
      this.logger.error(`Session vault withdrawal failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create session vault for user
   */
  async createSessionVault(userId: string, initialDeposit: number): Promise<string> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Create session vault transaction
      const transaction = new Transaction();
      
      // Add instructions to create and fund session vault
      const sessionVaultPda = this.getSessionVaultPDA(user.wallet);
      
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: this.sessionVaultKeypair.publicKey,
          toPubkey: sessionVaultPda,
          lamports: initialDeposit * LAMPORTS_PER_SOL,
        })
      );

      // Sign and send transaction
      const signature = await this.connection.sendTransaction(transaction, [this.sessionVaultKeypair]);
      await this.connection.confirmTransaction(signature);

      // Log security event
      await this.logSecurityEvent(userId, 'SESSION_VAULT_CREATED', {
        initialDeposit,
        signature,
        timestamp: Date.now(),
      });

      this.logger.log(`Session vault created for user ${userId} with ${initialDeposit} SOL`);
      return signature;
    } catch (error) {
      this.logger.error(`Session vault creation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate 2FA setup for user
   */
  async setup2FA(userId: string): Promise<{ secret: string; qrCode: string; backupCodes: string[] }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Generate TOTP secret using speakeasy
    const secretObj = speakeasy.generateSecret({
      name: `PV3:${user.wallet.substring(0, 8)}...`, // Shorter wallet display
      issuer: 'PV3.FUN',
      length: 32
    });
    const secret = secretObj.base32;
    
    // Create custom otpauth URL with PV3.FUN logo
    const logoUrl = 'https://pv3.fun/logo.png'; // PV3.FUN header logo
    const customOtpAuthUrl = `${secretObj.otpauth_url}&image=${encodeURIComponent(logoUrl)}`;
    
    // Generate backup codes (8 codes, 8 characters each)
    const backupCodes = Array.from({ length: 8 }, () => 
      randomBytes(4).toString('hex').toUpperCase()
    );

    // For demo purposes, we'll store the secret directly (in production, encrypt it)
    // Hash backup codes for storage
    const backupCodesHash = createHash('sha256').update(backupCodes.join(',')).digest('hex');

    // Store in database using the correct field names
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: secret, // Store secret directly for TOTP verification
        backupCodes: backupCodesHash,
        twoFactorEnabled: false, // Not enabled until first successful verification
      },
    });

    // Generate QR code image as data URL using custom otpauth_url with logo
    const qrCode = await QRCode.toDataURL(customOtpAuthUrl);

    await this.logSecurityEvent(userId, '2FA_SETUP', {
      timestamp: Date.now(),
    });

    return { secret, qrCode, backupCodes };
  }

  /**
   * Verify 2FA token and enable 2FA
   */
  async verify2FA(userId: string, token: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.twoFactorSecret) {
      throw new Error('2FA not set up for this user');
    }

    // Verify TOTP token using speakeasy
    const isValid = this.verifyTOTPTokenHash(user.twoFactorSecret, token);

    if (isValid) {
      // Enable 2FA for the user
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorEnabled: true,
          lastTwoFactorVerification: new Date(),
        },
      });

      await this.logSecurityEvent(userId, '2FA_ENABLED', {
        timestamp: Date.now(),
      });

      return true;
    }

    await this.logSecurityEvent(userId, '2FA_VERIFICATION_FAILED', {
      timestamp: Date.now(),
    });

    return false;
  }

  /**
   * Verify TOTP token for existing user
   */
  async verifyTOTPToken(userId: string, token: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true, twoFactorEnabled: true },
    });

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return false;
    }

    return this.verifyTOTPTokenHash(user.twoFactorSecret, token);
  }

  /**
   * TOTP verification using speakeasy
   */
  private verifyTOTPTokenHash(secret: string, token: string): boolean {
    if (!secret || !token) {
      return false;
    }
    
    try {
      // Use speakeasy to verify the TOTP token
      const verified = speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: token,
        window: 2 // Allow 2 time steps (60 seconds) of tolerance
      });
      
      return verified;
    } catch (error) {
      this.logger.error(`TOTP verification error: ${error.message}`);
      return false;
    }
  }

  /**
   * Check if user has 2FA enabled
   */
  async has2FAEnabled(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true },
    });

    return user?.twoFactorEnabled || false;
  }

  /**
   * Disable 2FA for user
   */
  async disable2FA(userId: string, token: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.twoFactorEnabled) {
      throw new Error('2FA not enabled for this user');
    }

    const isValid = this.verifyTOTPTokenHash(user.twoFactorSecret!, token);

    if (isValid) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorEnabled: false,
          twoFactorSecret: null,
          backupCodes: null,
        },
      });

      await this.logSecurityEvent(userId, '2FA_DISABLED', {
        timestamp: Date.now(),
      });

      return true;
    }

    return false;
  }

  /**
   * Update backup codes for user
   */
  async updateBackupCodes(userId: string, backupCodesHash: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        backupCodes: backupCodesHash,
      },
    });

    await this.logSecurityEvent(userId, 'BACKUP_CODES_REGENERATED', {
      timestamp: Date.now(),
    });
  }

  /**
   * Use backup code for verification
   */
  async useBackupCode(userId: string, backupCode: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { backupCodes: true, twoFactorEnabled: true },
    });

    if (!user || !user.twoFactorEnabled || !user.backupCodes) {
      return false;
    }

    // In a real implementation, you'd need to track which backup codes have been used
    // For now, we'll do a simple hash comparison
    const providedHash = createHash('sha256').update(backupCode).digest('hex');
    
    // This is simplified - in production you'd store individual backup code hashes
    // and mark them as used after verification
    const isValid = user.backupCodes.includes(providedHash.substring(0, 8).toUpperCase());

    if (isValid) {
      await this.logSecurityEvent(userId, 'BACKUP_CODE_USED', {
        timestamp: Date.now(),
      });
    }

    return isValid;
  }

  /**
   * Transfer SOL between session vaults (for streaming tips/subscriptions)
   */
  async transferBetweenVaults(fromUserId: string, toUserId: string, amount: number, description?: string): Promise<{ signature: string; fee: number }> {
    try {
      // Get both users
      const [fromUser, toUser] = await Promise.all([
        this.prisma.user.findUnique({ where: { id: fromUserId } }),
        this.prisma.user.findUnique({ where: { id: toUserId } })
      ]);

      if (!fromUser || !toUser) {
        throw new Error('User not found');
      }

      // Check sender has sufficient balance
      const senderBalance = await this.getSessionVaultBalance(fromUserId);
      if (senderBalance < amount) {
        throw new Error('Insufficient balance');
      }

      // Get session vault PDAs
      const fromVaultPda = this.getSessionVaultPDA(fromUser.wallet);
      const toVaultPda = this.getSessionVaultPDA(toUser.wallet);

      // Create transfer transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: fromVaultPda,
          toPubkey: toVaultPda,
          lamports: amount * LAMPORTS_PER_SOL,
        })
      );

      // Sign and send transaction
      const signature = await this.connection.sendTransaction(transaction, [this.sessionVaultKeypair]);
      await this.connection.confirmTransaction(signature);

      // Log the transfer
      await this.logSecurityEvent(fromUserId, 'VAULT_TRANSFER_OUT', {
        toUserId,
        amount,
        description,
        signature
      });

      await this.logSecurityEvent(toUserId, 'VAULT_TRANSFER_IN', {
        fromUserId,
        amount,
        description,
        signature
      });

      return { signature, fee: 0 }; // No fee for internal transfers
    } catch (error) {
      this.logger.error(`Vault transfer failed: ${error.message}`);
      throw new Error(`Transfer failed: ${error.message}`);
    }
  }

  /**
   * Collect platform fee (3% for streaming platform)
   */
  async collectPlatformFee(fromUserId: string, amount: number, feePercentage: number = 3, description?: string): Promise<{ signature: string; fee: number }> {
    try {
      const user = await this.prisma.user.findUnique({ where: { id: fromUserId } });
      if (!user) {
        throw new Error('User not found');
      }

      // Calculate fee
      const fee = (amount * feePercentage) / 100;
      
      // Check user has sufficient balance
      const balance = await this.getSessionVaultBalance(fromUserId);
      if (balance < fee) {
        throw new Error('Insufficient balance for platform fee');
      }

      // Get user's session vault PDA
      const userVaultPda = this.getSessionVaultPDA(user.wallet);
      
      // Platform treasury wallet (from environment)
      const platformTreasury = new PublicKey(process.env.PLATFORM_TREASURY_WALLET || this.sessionVaultKeypair.publicKey.toString());

      // Create fee collection transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: userVaultPda,
          toPubkey: platformTreasury,
          lamports: fee * LAMPORTS_PER_SOL,
        })
      );

      // Sign and send transaction
      const signature = await this.connection.sendTransaction(transaction, [this.sessionVaultKeypair]);
      await this.connection.confirmTransaction(signature);

      // Log the fee collection
      await this.logSecurityEvent(fromUserId, 'PLATFORM_FEE_COLLECTED', {
        amount,
        fee,
        feePercentage,
        description,
        signature
      });

      return { signature, fee };
    } catch (error) {
      this.logger.error(`Platform fee collection failed: ${error.message}`);
      throw new Error(`Fee collection failed: ${error.message}`);
    }
  }

  /**
   * Process streaming tip with 97/3 split
   */
  async processTip(tipperId: string, streamerId: string, amount: number, message?: string): Promise<{ signature: string; streamerAmount: number; platformFee: number }> {
    try {
      // Calculate 97/3 split
      const platformFee = amount * 0.03; // 3% to platform
      const streamerAmount = amount * 0.97; // 97% to streamer

      // Transfer to streamer
      const transferResult = await this.transferBetweenVaults(
        tipperId, 
        streamerId, 
        streamerAmount, 
        `Stream tip: ${message || 'No message'}`
      );

      // Collect platform fee
      await this.collectPlatformFee(
        tipperId, 
        amount, 
        3, 
        'Streaming platform fee'
      );

      return {
        signature: transferResult.signature,
        streamerAmount,
        platformFee
      };
    } catch (error) {
      this.logger.error(`Tip processing failed: ${error.message}`);
      throw new Error(`Tip processing failed: ${error.message}`);
    }
  }

  /**
   * Process subscription payment with 97/3 split
   */
  async processSubscription(subscriberId: string, streamerId: string, monthlyAmount: number): Promise<{ signature: string; streamerAmount: number; platformFee: number }> {
    try {
      // Calculate 97/3 split
      const platformFee = monthlyAmount * 0.03; // 3% to platform
      const streamerAmount = monthlyAmount * 0.97; // 97% to streamer

      // Transfer to streamer
      const transferResult = await this.transferBetweenVaults(
        subscriberId, 
        streamerId, 
        streamerAmount, 
        'Monthly subscription payment'
      );

      // Collect platform fee
      await this.collectPlatformFee(
        subscriberId, 
        monthlyAmount, 
        3, 
        'Streaming subscription fee'
      );

      return {
        signature: transferResult.signature,
        streamerAmount,
        platformFee
      };
    } catch (error) {
      this.logger.error(`Subscription processing failed: ${error.message}`);
      throw new Error(`Subscription processing failed: ${error.message}`);
    }
  }
} 