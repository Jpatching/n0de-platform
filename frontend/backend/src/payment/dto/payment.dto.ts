import { IsString, IsNumber, IsOptional, IsNotEmpty, Min, Max, IsEmail, IsUUID } from 'class-validator';

export class CreateCoinbasePaymentDto {
  @IsString()
  @IsNotEmpty()
  userWallet: string;

  @IsNumber()
  @Min(1)
  @Max(10000)
  usdAmount: number; // USD amount to charge

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  metadata?: string; // JSON string for additional data
}

export class CoinbaseWebhookDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  type: string; // 'charge:confirmed', 'charge:failed', etc.

  @IsOptional()
  data?: any; // Coinbase webhook data
}

export class ConfirmPaymentDto {
  @IsString()
  @IsNotEmpty()
  chargeId: string;

  @IsString()
  @IsNotEmpty()
  userWallet: string;
}

export interface PaymentFeeStructure {
  coinbaseProcessingFee: number; // Coinbase's fee (usually 1% + $0.30)
  pv3ServiceFee: number; // Our service fee (e.g., 2.5%)
  solanaNetworkFee: number; // Solana transaction fee (minimal)
  totalFeePercentage: number;
}

export interface CoinbasePaymentResponse {
  id: string;
  hostedUrl: string;
  code: string;
  expiresAt: string;
  pricing: {
    local: { amount: string; currency: string };
    settlement: { amount: string; currency: string };
  };
}

export interface PaymentRecord {
  id: string;
  userWallet: string;
  chargeId: string;
  usdAmount: number;
  solAmount: number;
  platformFeeSol?: number; // SOL amount sent to treasury as platform fee
  fees: PaymentFeeStructure;
  status: 'pending' | 'confirmed' | 'failed' | 'expired';
  coinbaseData: any;
  createdAt: Date;
  confirmedAt?: Date;
} 