import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class CreateMatchDto {
  @IsString()
  gameId: string;

  @IsNumber()
  @Min(0.1) // Minimum 0.1 SOL (matches smart contract)
  @Max(10) // Maximum 10 SOL per your specs
  wagerAmount: number;

  @IsNumber()
  expiryTime: number; // Unix timestamp

  @IsString()
  creatorWallet: string;

  @IsOptional()
  @IsString()
  sessionVault?: string; // If using session vault
}

export class JoinMatchDto {
  @IsString()
  joinerWallet: string;

  @IsOptional()
  @IsString()
  sessionVault?: string; // If using session vault
}

export class SubmitResultDto {
  @IsString()
  winnerWallet: string;

  @IsString()
  signature: string; // ed25519 signature from verifier

  @IsString()
  message: string; // Signed message

  @IsOptional()
  gameData?: any; // Game-specific result data
} 