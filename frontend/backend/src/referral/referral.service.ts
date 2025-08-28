import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SolanaService } from '../solana/solana.service';
import { ApplyReferralCodeDto, ClaimSolRewardsDto, ReferralInfo, ReferralEarning, ReferralStats } from './dto/referral.dto';

@Injectable()
export class ReferralService {
  // In-memory storage for development - replace with actual database
  private referrals = new Map<string, ReferralInfo>();
  private earnings = new Map<string, ReferralEarning[]>();

  constructor(private readonly solanaService: SolanaService) {}

  async getMyReferralCode(walletAddress: string): Promise<{ referralCode: string }> {
    let referralInfo = this.referrals.get(walletAddress);
    
    if (!referralInfo) {
      // Create new referral code
      const referralCode = this.generateReferralCode(walletAddress);
      referralInfo = {
        referralCode,
        referredUsers: [],
        totalEarnings: 0,
        pendingEarnings: 0,
        claimedEarnings: 0,
        referralCount: 0,
        isActive: true,
      };
      this.referrals.set(walletAddress, referralInfo);
    }

    return { referralCode: referralInfo.referralCode };
  }

  async applyReferralCode(walletAddress: string, applyCodeDto: ApplyReferralCodeDto): Promise<{ success: boolean; referrer: string }> {
    const { referralCode } = applyCodeDto;

    // Find the referrer
    const referrer = Array.from(this.referrals.entries()).find(
      ([_, info]) => info.referralCode === referralCode
    );

    if (!referrer) {
      throw new BadRequestException('Invalid referral code');
    }

    const [referrerWallet, referrerInfo] = referrer;

    // Check if user is trying to refer themselves
    if (referrerWallet === walletAddress) {
      throw new BadRequestException('Cannot use your own referral code');
    }

    // Check if user is already referred
    const userReferralInfo = this.referrals.get(walletAddress);
    if (userReferralInfo?.referredBy) {
      throw new BadRequestException('User is already referred by someone else');
    }

    // Apply referral
    if (!userReferralInfo) {
      this.referrals.set(walletAddress, {
        referralCode: this.generateReferralCode(walletAddress),
        referredBy: referrerWallet,
        referredUsers: [],
        totalEarnings: 0,
        pendingEarnings: 0,
        claimedEarnings: 0,
        referralCount: 0,
        isActive: true,
      });
    } else {
      userReferralInfo.referredBy = referrerWallet;
    }

    // Update referrer's referred users list
    referrerInfo.referredUsers.push(walletAddress);
    referrerInfo.referralCount = referrerInfo.referredUsers.length;

    return { success: true, referrer: referrerWallet };
  }

  async getReferredUsers(walletAddress: string): Promise<any[]> {
    const referralInfo = this.referrals.get(walletAddress);
    if (!referralInfo) {
      return [];
    }

    // TODO: Get full user profiles for referred users
    return referralInfo.referredUsers.map(userWallet => ({
      walletAddress: userWallet,
      joinedAt: new Date(), // Mock data
      totalMatches: Math.floor(Math.random() * 50),
      status: 'active',
    }));
  }

  async getSolEarnings(walletAddress: string): Promise<{ totalEarnings: number; pendingEarnings: number; claimedEarnings: number }> {
    const referralInfo = this.referrals.get(walletAddress);
    if (!referralInfo) {
      return { totalEarnings: 0, pendingEarnings: 0, claimedEarnings: 0 };
    }

    return {
      totalEarnings: referralInfo.totalEarnings,
      pendingEarnings: referralInfo.pendingEarnings,
      claimedEarnings: referralInfo.claimedEarnings,
    };
  }

  async claimSolRewards(walletAddress: string, claimDto: ClaimSolRewardsDto): Promise<{ success: boolean; transactionId: string; amount: number }> {
    const referralInfo = this.referrals.get(walletAddress);
    if (!referralInfo) {
      throw new NotFoundException('No referral information found');
    }

    if (referralInfo.pendingEarnings <= 0) {
      throw new BadRequestException('No pending earnings to claim');
    }

    try {
      // Transfer SOL to user's wallet
      const transactionId = await this.solanaService.withdrawFromVault(
        'platform_referral_vault', // Platform referral vault
        claimDto.destinationWallet,
        referralInfo.pendingEarnings
      );

      // Update referral info
      const claimedAmount = referralInfo.pendingEarnings;
      referralInfo.claimedEarnings += claimedAmount;
      referralInfo.pendingEarnings = 0;

      // Record the claim
      const userEarnings = this.earnings.get(walletAddress) || [];
      userEarnings.forEach(earning => {
        if (!earning.claimed) {
          earning.claimed = true;
          earning.transactionSignature = transactionId;
        }
      });

      return {
        success: true,
        transactionId,
        amount: claimedAmount,
      };
    } catch (error) {
      throw new BadRequestException('Failed to claim SOL rewards');
    }
  }

  async getSolHistory(walletAddress: string): Promise<ReferralEarning[]> {
    return this.earnings.get(walletAddress) || [];
  }

  async getReferralStats(walletAddress: string): Promise<ReferralStats> {
    const referralInfo = this.referrals.get(walletAddress);
    if (!referralInfo) {
      return {
        totalReferrals: 0,
        activeReferrals: 0,
        totalEarnings: 0,
        pendingClaims: 0,
        averageEarningPerReferral: 0,
        rank: 0,
      };
    }

    return {
      totalReferrals: referralInfo.referralCount,
      activeReferrals: referralInfo.referredUsers.length, // Simplified
      totalEarnings: referralInfo.totalEarnings,
      pendingClaims: referralInfo.pendingEarnings,
      averageEarningPerReferral: referralInfo.referralCount > 0 
        ? referralInfo.totalEarnings / referralInfo.referralCount 
        : 0,
      rank: this.calculateReferralRank(walletAddress),
    };
  }

  async getLeaderboard(): Promise<any[]> {
    const leaderboard = Array.from(this.referrals.entries())
      .map(([wallet, info]) => ({
        walletAddress: wallet,
        referralCount: info.referralCount,
        totalEarnings: info.totalEarnings,
      }))
      .sort((a, b) => b.totalEarnings - a.totalEarnings)
      .slice(0, 50); // Top 50

    return leaderboard;
  }

  // Called when a match is completed to distribute referral rewards
  async processReferralReward(userWallet: string, matchId: string, platformFee: number): Promise<void> {
    const userReferralInfo = this.referrals.get(userWallet);
    if (!userReferralInfo?.referredBy) {
      return; // User wasn't referred by anyone
    }

    const referrerWallet = userReferralInfo.referredBy;
    const referrerInfo = this.referrals.get(referrerWallet);
    if (!referrerInfo) {
      return;
    }

    // Calculate 1% of platform fee as referral reward
    const referralReward = platformFee * 0.01; // 1% of 6.5% platform fee

    // Update referrer's earnings
    referrerInfo.totalEarnings += referralReward;
    referrerInfo.pendingEarnings += referralReward;

    // Record the earning
    const referrerEarnings = this.earnings.get(referrerWallet) || [];
    referrerEarnings.push({
      id: `earning_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      referredUser: userWallet,
      amount: referralReward,
      matchId,
      timestamp: new Date(),
      claimed: false,
    });
    this.earnings.set(referrerWallet, referrerEarnings);

    console.log(`💰 Referral reward: ${referralReward} SOL to ${referrerWallet} for referring ${userWallet}`);
  }

  private generateReferralCode(walletAddress: string): string {
    // Generate a unique 8-character referral code
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 4);
    return `PV3${timestamp.substr(-4)}${random}`.toUpperCase();
  }

  private calculateReferralRank(walletAddress: string): number {
    const allReferrals = Array.from(this.referrals.values())
      .sort((a, b) => b.totalEarnings - a.totalEarnings);
    
    const userReferral = this.referrals.get(walletAddress);
    if (!userReferral) return 0;

    return allReferrals.findIndex(r => r.referralCode === userReferral.referralCode) + 1;
  }
} 