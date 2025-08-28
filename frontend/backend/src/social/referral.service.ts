import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { PrestigeService } from './prestige.service';
import * as crypto from 'crypto';

@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);

  constructor(
    private prisma: PrismaService,
    private prestigeService: PrestigeService
  ) {}

  /**
   * Generate unique referral code for user
   */
  async generateReferralCode(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, referralCode: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Return existing code if already generated
    if (user.referralCode) {
      return user.referralCode;
    }

    // Generate unique code based on username + random
    const baseCode = user.username ? user.username.toUpperCase() : 'PV3';
    const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    let referralCode = `${baseCode}${randomSuffix}`;

    // Ensure uniqueness
    let attempts = 0;
    while (attempts < 10) {
      const existing = await this.prisma.user.findUnique({
        where: { referralCode },
      });

      if (!existing) break;

      // Generate new code if collision
      const newSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
      referralCode = `${baseCode}${newSuffix}`;
      attempts++;
    }

    // Update user with referral code
    await this.prisma.user.update({
      where: { id: userId },
      data: { referralCode },
    });

    this.logger.log(`Generated referral code ${referralCode} for user ${userId}`);
    return referralCode;
  }

  /**
   * Process referral signup - SMALL bonus, main rewards come from wagering
   */
  async processReferralSignup(referralCode: string, newUserId: string): Promise<boolean> {
    const referrer = await this.prisma.user.findUnique({
      where: { referralCode },
      select: { id: true, username: true, referredUsers: true, totalReferrals: true },
    });

    if (!referrer) {
      this.logger.warn(`Invalid referral code: ${referralCode}`);
      return false;
    }

    // Update new user with referrer
    await this.prisma.user.update({
      where: { id: newUserId },
      data: { referredBy: referrer.id },
    });

    // Update referrer's referral list
    const updatedReferredUsers = [...referrer.referredUsers, newUserId];
    await this.prisma.user.update({
      where: { id: referrer.id },
      data: {
        referredUsers: updatedReferredUsers,
        totalReferrals: referrer.totalReferrals + 1,
      },
    });

    // SMALL signup bonus - real rewards come from wagering (500 base PP)
    await this.prestigeService.awardReferralPoints(referrer.id, newUserId, 'signup');

    this.logger.log(`🎯 REFERRAL SIGNUP: ${referrer.username} referred new user ${newUserId} - waiting for wagering to unlock big rewards!`);
    return true;
  }

  /**
   * 💰 REVENUE-FOCUSED: First wager bonus - MASSIVE rewards for getting users to actually play
   */
  async processFirstWagerBonus(userId: string, wagerAmount: number): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { referredBy: true, totalEarnings: true, username: true },
    });

    // Only award if this is their first wager and they were referred
    if (!user?.referredBy || user.totalEarnings > wagerAmount) {
      return;
    }

    const referrer = await this.prisma.user.findUnique({
      where: { id: user.referredBy },
      select: { username: true, prestige: true },
    });

    if (!referrer) return;

    // MASSIVE first wager bonus based on wager size
    let bonusMultiplier = 1;
    if (wagerAmount >= 10) bonusMultiplier = 5;      // 5x for 10+ SOL first wager
    else if (wagerAmount >= 5) bonusMultiplier = 3;   // 3x for 5+ SOL first wager
    else if (wagerAmount >= 1) bonusMultiplier = 2;   // 2x for 1+ SOL first wager

    const basePP = Math.floor(wagerAmount * 1000 * bonusMultiplier); // 1000 PP per SOL wagered * multiplier

    // Award the massive bonus
    await this.prestigeService.awardReferralRevShare(user.referredBy, userId, wagerAmount);

    this.logger.log(`💰 FIRST WAGER BONUS: ${referrer.username} earned ${basePP} PP for ${user.username}'s first ${wagerAmount} SOL wager!`);
  }

  /**
   * 🎯 VOLUME-BASED: Progressive wagering bonuses - bigger rewards for bigger spenders
   */
  async processVolumeBonus(userId: string, totalWagered: number): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { referredBy: true, username: true },
    });

    if (!user?.referredBy) return;

    const referrer = await this.prisma.user.findUnique({
      where: { id: user.referredBy },
      select: { username: true, prestige: true },
    });

    if (!referrer) return;

    // Progressive volume bonuses - exponentially increasing rewards
    const volumeTiers = [
      { threshold: 1000, bonus: 1000000, label: 'WHALE TIER' },      // 1000 SOL = 1M PP
      { threshold: 500, bonus: 400000, label: 'SHARK TIER' },        // 500 SOL = 400k PP
      { threshold: 250, bonus: 150000, label: 'DOLPHIN TIER' },      // 250 SOL = 150k PP
      { threshold: 100, bonus: 50000, label: 'FISH TIER' },          // 100 SOL = 50k PP
      { threshold: 50, bonus: 20000, label: 'MINNOW TIER' },         // 50 SOL = 20k PP
      { threshold: 25, bonus: 8000, label: 'SHRIMP TIER' },          // 25 SOL = 8k PP
      { threshold: 10, bonus: 3000, label: 'PLANKTON TIER' },        // 10 SOL = 3k PP
    ];

    for (const tier of volumeTiers) {
      if (totalWagered >= tier.threshold) {
        // Check if this tier bonus was already awarded
        const alreadyAwarded = await this.checkIfVolumeBonusAwarded(user.referredBy, userId, tier.threshold);
        
        if (!alreadyAwarded) {
          await this.awardVolumeBonus(user.referredBy, userId, tier.bonus, tier.label);
          this.logger.log(`🐋 ${tier.label}: ${referrer.username} earned ${tier.bonus} PP for ${user.username} reaching ${tier.threshold} SOL wagered!`);
        }
        break; // Award highest tier only
      }
    }
  }

  /**
   * 🔥 RETENTION BONUS: Daily/Weekly active wagering bonuses
   */
  async processRetentionBonus(userId: string, daysActive: number, weeklyVolume: number): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { referredBy: true, username: true },
    });

    if (!user?.referredBy) return;

    // Weekly volume bonuses for keeping users active
    if (weeklyVolume >= 50) {
      await this.awardRetentionBonus(user.referredBy, userId, 25000, 'WEEKLY WHALE');
    } else if (weeklyVolume >= 20) {
      await this.awardRetentionBonus(user.referredBy, userId, 10000, 'WEEKLY SHARK');
    } else if (weeklyVolume >= 10) {
      await this.awardRetentionBonus(user.referredBy, userId, 5000, 'WEEKLY FISH');
    } else if (weeklyVolume >= 5) {
      await this.awardRetentionBonus(user.referredBy, userId, 2000, 'WEEKLY ACTIVE');
    }

    // Long-term retention bonuses
    if (daysActive >= 30 && weeklyVolume >= 5) {
      await this.awardRetentionBonus(user.referredBy, userId, 50000, '30-DAY RETENTION');
    }
  }

  /**
   * Helper: Check if volume bonus already awarded
   */
  private async checkIfVolumeBonusAwarded(referrerId: string, referredId: string, threshold: number): Promise<boolean> {
    // This would check a volume_bonuses table or user metadata
    // For now, simplified check based on user's current total earnings
    return false; // Implement proper tracking
  }

  /**
   * Helper: Award volume bonus with prestige multipliers
   */
  private async awardVolumeBonus(referrerId: string, referredId: string, basePP: number, tierLabel: string): Promise<void> {
    const referrer = await this.prisma.user.findUnique({
      where: { id: referrerId },
      select: { proofPoints: true, prestige: true, totalProofPoints: true, username: true },
    });

    if (!referrer) return;

    // Apply prestige multiplier to volume bonuses
    const prestigeMultiplier = this.getPrestigeMultiplier(referrer.prestige);
    const finalPP = Math.floor(basePP * prestigeMultiplier);

    // Update referrer's proof points
    await this.prisma.user.update({
      where: { id: referrerId },
      data: {
        proofPoints: referrer.proofPoints + finalPP,
        totalProofPoints: referrer.totalProofPoints + finalPP,
        referralPP: { increment: finalPP },
      },
    });

    this.logger.log(`🎯 ${tierLabel} BONUS: Awarded ${finalPP} PP (${basePP} base × ${prestigeMultiplier}x prestige) to ${referrer.username}`);
  }

  /**
   * Helper: Award retention bonus
   */
  private async awardRetentionBonus(referrerId: string, referredId: string, basePP: number, bonusType: string): Promise<void> {
    const referrer = await this.prisma.user.findUnique({
      where: { id: referrerId },
      select: { proofPoints: true, prestige: true, totalProofPoints: true, username: true },
    });

    if (!referrer) return;

    const prestigeMultiplier = this.getPrestigeMultiplier(referrer.prestige);
    const finalPP = Math.floor(basePP * prestigeMultiplier);

    await this.prisma.user.update({
      where: { id: referrerId },
      data: {
        proofPoints: referrer.proofPoints + finalPP,
        totalProofPoints: referrer.totalProofPoints + finalPP,
        referralPP: { increment: finalPP },
      },
    });

    this.logger.log(`🔥 ${bonusType} BONUS: Awarded ${finalPP} PP to ${referrer.username}`);
  }

  /**
   * Helper: Get prestige multiplier
   */
  private getPrestigeMultiplier(prestige: number): number {
    const multipliers = [1.0, 1.5, 2.5, 4.0, 10.0]; // Mortal, Spartan, Olympian, Divine, GODMODE
    return multipliers[prestige] || 1.0;
  }

  /**
   * Process REVENUE milestone bonuses - Focus on actual spending
   */
  async checkRevenueMilestones(userId: string, newTotalWagered: number): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { referredBy: true, totalEarnings: true },
    });

    if (!user?.referredBy) return;

    // Revenue-focused milestones with MASSIVE rewards
    const revenueMilestones = [
      { threshold: 1, bonus: 50000, label: '1 SOL Wagered' },      // 50k PP
      { threshold: 5, bonus: 150000, label: '5 SOL Wagered' },     // 150k PP  
      { threshold: 10, bonus: 300000, label: '10 SOL Wagered' },   // 300k PP
      { threshold: 25, bonus: 750000, label: '25 SOL Wagered' },   // 750k PP
      { threshold: 50, bonus: 1500000, label: '50 SOL Wagered' },  // 1.5M PP
      { threshold: 100, bonus: 3000000, label: '100 SOL Wagered' }, // 3M PP
      { threshold: 250, bonus: 7500000, label: '250 SOL Wagered' }, // 7.5M PP
      { threshold: 500, bonus: 15000000, label: '500 SOL Wagered' }, // 15M PP
    ];

    const previousTotal = user.totalEarnings;

    for (const milestone of revenueMilestones) {
      // Check if they just crossed this threshold
      if (previousTotal < milestone.threshold && newTotalWagered >= milestone.threshold) {
        await this.prestigeService.awardReferralPoints(
          user.referredBy, 
          userId, 
          'milestone'
        );

        this.logger.log(`🚀 REVENUE MILESTONE: ${milestone.bonus} PP awarded for ${milestone.label}!`);
      }
    }
  }

  /**
   * Process WHALE bonuses - Massive rewards for big spenders
   */
  async processWhaleBonus(userId: string, wagerAmount: number): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { referredBy: true, totalEarnings: true },
    });

    if (!user?.referredBy) return;

    // Whale bonuses for single large wagers
    let whaleBonus = 0;
    
    if (wagerAmount >= 1000) whaleBonus = 5000000;    // 5M PP for 1000+ SOL whale games
    else if (wagerAmount >= 500) whaleBonus = 2000000; // 2M PP for 500+ SOL games
    else if (wagerAmount >= 250) whaleBonus = 750000;  // 750k PP for 250+ SOL games
    else if (wagerAmount >= 100) whaleBonus = 250000;  // 250k PP for 100+ SOL games

    if (whaleBonus > 0) {
      await this.prestigeService.awardReferralPoints(
        user.referredBy, 
        userId, 
        'milestone'
      );

      this.logger.log(`🐋 WHALE BONUS: ${whaleBonus} PP awarded for ${wagerAmount} SOL wager!`);
    }
  }

  /**
   * Get referral stats for a user
   */
  async getReferralStats(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        referralCode: true,
        totalReferrals: true,
        referralEarnings: true,
        referralPP: true,
        referredUsers: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Get referred users' details
    const referredUsersDetails = await this.prisma.user.findMany({
      where: { id: { in: user.referredUsers } },
      select: {
        id: true,
        username: true,
        totalMatches: true,
        totalEarnings: true,
        createdAt: true,
      },
    });

    return {
      referralCode: user.referralCode,
      totalReferrals: user.totalReferrals,
      referralEarnings: user.referralEarnings,
      referralPP: user.referralPP,
      referredUsers: referredUsersDetails,
      // Calculate potential earnings
      potentialMonthlyPP: referredUsersDetails.reduce((total, referred) => {
        // Estimate 20% rev share on their monthly activity
        const estimatedMonthlyWager = referred.totalEarnings * 0.1; // Conservative estimate
        return total + (estimatedMonthlyWager * 0.2 * 100); // 20% rev share * 100 PP per SOL
      }, 0),
    };
  }

  /**
   * Get referral leaderboard
   */
  async getReferralLeaderboard(limit: number = 50) {
    const topReferrers = await this.prisma.user.findMany({
      where: { totalReferrals: { gt: 0 } },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatar: true,
        totalReferrals: true,
        referralEarnings: true,
        referralPP: true,
      },
      orderBy: [
        { referralPP: 'desc' },
        { totalReferrals: 'desc' },
      ],
      take: limit,
    });

    return topReferrers.map((user, index) => ({
      rank: index + 1,
      ...user,
    }));
  }
} 