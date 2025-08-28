import { IsString, IsEmail, IsNotEmpty, IsOptional, IsNumber, MinLength, MaxLength, Matches } from 'class-validator';

// Wallet Authentication DTOs
export class GenerateMessageDto {
  @IsString()
  @IsNotEmpty()
  wallet: string;
}

export class AuthenticateDto {
  @IsString()
  @IsNotEmpty()
  wallet: string;

  @IsString()
  @IsNotEmpty()
  signature: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsNumber()
  timestamp: number;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  referralCode?: string;
}

export class VerifySignatureDto {
  @IsString()
  @IsNotEmpty()
  walletAddress: string;

  @IsString()
  @IsNotEmpty()
  signature: string;

  @IsString()
  @IsNotEmpty()
  message: string;
}

// Email Authentication DTOs
export class EmailSignupDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  @Matches(/^[a-z0-9_]+$/, { message: 'Username can only contain lowercase letters, numbers, and underscores' })
  username?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  displayName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  referralCode?: string;
}

export class EmailSigninDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

// Authenticator (TOTP) Authentication DTOs
export class AuthenticatorSignupDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(20)
  @Matches(/^[a-z0-9_]+$/, { message: 'Username can only contain lowercase letters, numbers, and underscores' })
  username: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  displayName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  referralCode?: string;
}

export class AuthenticatorSigninDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, { message: 'TOTP code must be 6 digits' })
  totpCode: string;
}

export class AuthenticatorSetupDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  displayName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  referralCode?: string;
}

export class AuthenticatorVerifyDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, { message: 'TOTP code must be 6 digits' })
  totpCode: string;

  @IsString()
  @IsNotEmpty()
  secret: string;
}

// Wallet Signup DTOs
export class WalletSignupDto {
  @IsString()
  @IsNotEmpty()
  walletAddress: string;

  @IsString()
  @IsNotEmpty()
  signature: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  @Matches(/^[a-z0-9_]+$/, { message: 'Username can only contain lowercase letters, numbers, and underscores' })
  username?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  displayName?: string;

  @IsNumber()
  @IsOptional()
  timestamp?: number;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  referralCode?: string;
}

// Response DTOs
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

export interface AuthenticatorSetupResponse {
  success: boolean;
  user: {
    id: string;
    username: string;
    displayName?: string;
    authMethod: 'authenticator';
  };
  setupUrl: string;
  secret: string;
  qrCode?: string;
}

export class CreateSessionVaultDto {
  @IsString()
  @IsNotEmpty()
  walletAddress: string;
}

export class DepositVaultDto {
  @IsString()
  @IsNotEmpty()
  amount: string; // SOL amount as string for precision

  @IsString()
  @IsOptional()
  transactionSignature?: string;
}

export class WithdrawVaultDto {
  @IsString()
  @IsNotEmpty()
  amount: string; // SOL amount as string

  @IsString()
  @IsNotEmpty()
  destinationAddress: string;
}

// 2FA DTOs
export class Enable2FADto {
  @IsString()
  @IsNotEmpty()
  token: string; // 6-digit TOTP token
}

export class Verify2FADto {
  @IsString()
  @IsNotEmpty()
  token: string; // 6-digit TOTP token
}

export class Disable2FADto {
  @IsString()
  @IsNotEmpty()
  token: string; // 6-digit TOTP token
}

export class Verify2FABackupDto {
  @IsString()
  @IsNotEmpty()
  backupCode: string; // 8-character backup code
}

export class Generate2FADto {
  @IsOptional()
  @IsString()
  regenerate?: string; // Optional flag to regenerate existing setup
} 