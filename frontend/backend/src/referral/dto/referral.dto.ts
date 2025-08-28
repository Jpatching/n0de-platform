import { IsString, IsNotEmpty, IsOptional, IsNumber, Min } from 'class-validator';

export class ApplyReferralCodeDto {
  @IsString()
  @IsNotEmpty()
  referralCode: string;
}

export class ClaimSolRewardsDto {
  @IsString()
  @IsNotEmpty()
  destinationWallet: string;
}

export interface ReferralInfo {
  referralCode: string;
  referredBy?: string;
  referredUsers: string[];
  totalEarnings: number;
  pendingEarnings: number;
  claimedEarnings: number;
  referralCount: number;
  isActive: boolean;
}

export interface ReferralEarning {
  id: string;
  referredUser: string;
  amount: number;
  matchId: string;
  timestamp: Date;
  claimed: boolean;
  transactionSignature?: string;
}

export interface ReferralStats {
  totalReferrals: number;
  activeReferrals: number;
  totalEarnings: number;
  pendingClaims: number;
  averageEarningPerReferral: number;
  rank: number;
} 