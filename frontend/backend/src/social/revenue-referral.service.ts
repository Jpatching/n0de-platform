import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { PrestigeService } from './prestige.service';

/**
 * 💰 REVENUE-FOCUSED REFERRAL SYSTEM
 * 
 * This system prioritizes ACTUAL WAGERING and REVENUE GENERATION
 * over simple signups. The goal is to drive real business value.
 */
@Injectable()
export class RevenueReferralService {
  private readonly logger = new Logger(RevenueReferralService.name);

  constructor(
    private prisma: PrismaService,
    private prestigeService: PrestigeService
  ) {}

  /**
   * 🎯 FIRST WAGER BONUS - The most important metric
   * This is where we convert signups to revenue
   */
  async processFirstWagerBonus(userId: string, wagerAmount: number): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { 
        referredBy: true, 
        totalEarnings: true, 
        username: true,
        totalMatches: true 
      },
    });

    // Only award if this is their first wager and they were referred
    if (!user?.referredBy || user.totalEarnings > wagerAmount) {
      return;
    }

    const referrer = await this.prisma.user.findUnique({
      where: { id: user.referredBy },
      select: { username: true, prestige: true, proofPoints: true, totalProofPoints: true },
    });

    if (!referrer) return;

    // 🚀 MASSIVE first wager bonuses based on wager size
    let bonusMultiplier = 1;
    let tierLabel = 'STARTER';
    
    if (wagerAmount >= 50) {
      bonusMultiplier = 20;      // 20x for 50+ SOL first wager (WHALE CONVERSION)
      tierLabel = 'WHALE CONVERSION';
    } else if (wagerAmount >= 20) {
      bonusMultiplier = 15;      // 15x for 20+ SOL first wager (BIG FISH)
      tierLabel = 'BIG FISH CONVERSION';
    } else if (wagerAmount >= 10) {
      bonusMultiplier = 10;      // 10x for 10+ SOL first wager (FISH)
      tierLabel = 'FISH CONVERSION';
    } else if (wagerAmount >= 5) {
      bonusMultiplier = 7;       // 7x for 5+ SOL first wager (DOLPHIN)
      tierLabel = 'DOLPHIN CONVERSION';
    } else if (wagerAmount >= 1) {
      bonusMultiplier = 5;       // 5x for 1+ SOL first wager (MINNOW)
      tierLabel = 'MINNOW CONVERSION';
    } else {
      bonusMultiplier = 2;       // 2x for sub-1 SOL first wager
      tierLabel = 'MICRO CONVERSION';
    }

    // Calculate massive PP bonus (base: 2000 PP per SOL wagered)
    const basePP = Math.floor(wagerAmount * 2000 * bonusMultiplier);
    
    // Apply prestige multiplier
    const prestigeMultiplier = this.getPrestigeMultiplier(referrer.prestige);
    const finalPP = Math.floor(basePP * prestigeMultiplier);

    // Award the conversion bonus
    await this.prisma.user.update({
      where: { id: user.referredBy },
      data: {
        proofPoints: referrer.proofPoints + finalPP,
        totalProofPoints: referrer.totalProofPoints + finalPP,
        referralPP: { increment: finalPP },
        referralEarnings: { increment: wagerAmount * 0.1 }, // 10% of wager as "earnings"
      },
    });

    this.logger.log(`🚀 ${tierLabel}: ${referrer.username} earned ${finalPP} PP for converting ${user.username} (${wagerAmount} SOL first wager)!`);
  }

  /**
   * 🐋 VOLUME TIER BONUSES - Exponential rewards for big spenders
   */
  async processVolumeTierBonus(userId: string, totalWagered: number): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { referredBy: true, username: true },
    });

    if (!user?.referredBy) return;

    const referrer = await this.prisma.user.findUnique({
      where: { id: user.referredBy },
      select: { username: true, prestige: true, proofPoints: true, totalProofPoints: true },
    });

    if (!referrer) return;

    // 🐋 WHALE TIER SYSTEM - Exponentially increasing rewards
    const volumeTiers = [
      { threshold: 2000, bonus: 5000000, label: 'LEVIATHAN', emoji: '🦑' },    // 2000 SOL = 5M PP
      { threshold: 1000, bonus: 2000000, label: 'KRAKEN', emoji: '🐙' },      // 1000 SOL = 2M PP  
      { threshold: 500, bonus: 800000, label: 'MEGALODON', emoji: '🦈' },     // 500 SOL = 800k PP
      { threshold: 250, bonus: 300000, label: 'GREAT WHITE', emoji: '🦈' },   // 250 SOL = 300k PP
      { threshold: 100, bonus: 100000, label: 'WHALE', emoji: '🐋' },         // 100 SOL = 100k PP
      { threshold: 50, bonus: 40000, label: 'ORCA', emoji: '🐋' },            // 50 SOL = 40k PP
      { threshold: 25, bonus: 15000, label: 'DOLPHIN', emoji: '🐬' },         // 25 SOL = 15k PP
      { threshold: 10, bonus: 5000, label: 'FISH', emoji: '🐟' },             // 10 SOL = 5k PP
    ];

    for (const tier of volumeTiers) {
      if (totalWagered >= tier.threshold) {
        // Check if this tier bonus was already awarded
        const alreadyAwarded = await this.checkVolumeTierAwarded(user.referredBy, userId, tier.threshold);
        
        if (!alreadyAwarded) {
          await this.awardVolumeTierBonus(user.referredBy, userId, tier.bonus, tier.label, tier.emoji);
          
          // Mark tier as awarded
          await this.markVolumeTierAwarded(user.referredBy, userId, tier.threshold);
        }
        break; // Award highest tier only
      }
    }
  }

  /**
   * 🔥 WEEKLY VOLUME BONUSES - Keep users active and wagering
   */
  async processWeeklyVolumeBonus(userId: string, weeklyVolume: number): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { referredBy: true, username: true },
    });

    if (!user?.referredBy) return;

    const referrer = await this.prisma.user.findUnique({
      where: { id: user.referredBy },
      select: { username: true, prestige: true, proofPoints: true, totalProofPoints: true },
    });

    if (!referrer) return;

    // Weekly volume bonuses - recurring rewards for active users
    let weeklyBonus = 0;
    let tierLabel = '';

    if (weeklyVolume >= 200) {
      weeklyBonus = 100000;
      tierLabel = '🦑 WEEKLY LEVIATHAN';
    } else if (weeklyVolume >= 100) {
      weeklyBonus = 50000;
      tierLabel = '🐋 WEEKLY WHALE';
    } else if (weeklyVolume >= 50) {
      weeklyBonus = 20000;
      tierLabel = '🦈 WEEKLY SHARK';
    } else if (weeklyVolume >= 25) {
      weeklyBonus = 8000;
      tierLabel = '🐬 WEEKLY DOLPHIN';
    } else if (weeklyVolume >= 10) {
      weeklyBonus = 3000;
      tierLabel = '🐟 WEEKLY FISH';
    } else if (weeklyVolume >= 5) {
      weeklyBonus = 1000;
      tierLabel = '🦐 WEEKLY ACTIVE';
    }

    if (weeklyBonus > 0) {
      await this.awardWeeklyBonus(user.referredBy, userId, weeklyBonus, tierLabel);
    }
  }

  /**
   * 💎 RETENTION BONUSES - Long-term value rewards
   */
  async processRetentionBonus(userId: string, daysActive: number, monthlyVolume: number): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { referredBy: true, username: true },
    });

    if (!user?.referredBy) return;

    // Long-term retention bonuses
    const retentionTiers = [
      { days: 365, minVolume: 100, bonus: 1000000, label: '👑 YEARLY LEGEND' },
      { days: 180, minVolume: 50, bonus: 300000, label: '💎 6-MONTH DIAMOND' },
      { days: 90, minVolume: 25, bonus: 100000, label: '🏆 3-MONTH CHAMPION' },
      { days: 30, minVolume: 10, bonus: 25000, label: '⭐ MONTHLY STAR' },
      { days: 14, minVolume: 5, bonus: 8000, label: '🔥 2-WEEK STREAK' },
      { days: 7, minVolume: 2, bonus: 2000, label: '⚡ WEEKLY WARRIOR' },
    ];

    for (const tier of retentionTiers) {
      if (daysActive >= tier.days && monthlyVolume >= tier.minVolume) {
        const alreadyAwarded = await this.checkRetentionBonusAwarded(user.referredBy, userId, tier.days);
        
        if (!alreadyAwarded) {
          await this.awardRetentionBonus(user.referredBy, userId, tier.bonus, tier.label);
          await this.markRetentionBonusAwarded(user.referredBy, userId, tier.days);
        }
        break;
      }
    }
  }

  /**
   * 🎰 LOSS RECOVERY BONUS - Keep users playing even after losses
   */
  async processLossRecoveryBonus(userId: string, lossStreak: number, totalLosses: number): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { referredBy: true, username: true },
    });

    if (!user?.referredBy || lossStreak < 3) return;

    // Award referrer for keeping user engaged despite losses
    const recoveryBonus = Math.min(lossStreak * 500, 5000); // Max 5k PP
    await this.awardRecoveryBonus(user.referredBy, userId, recoveryBonus, `💪 LOSS RECOVERY x${lossStreak}`);
  }

  // Helper methods
  private getPrestigeMultiplier(prestige: number): number {
    const multipliers = [1.0, 1.5, 2.5, 4.0, 10.0]; // Mortal, Spartan, Olympian, Divine, GODMODE
    return multipliers[prestige] || 1.0;
  }

  private async checkVolumeTierAwarded(referrerId: string, referredId: string, threshold: number): Promise<boolean> {
    // Check if this volume tier was already awarded
    // This would use a separate tracking table in production
    return false; // Simplified for now
  }

  private async markVolumeTierAwarded(referrerId: string, referredId: string, threshold: number): Promise<void> {
    // Mark volume tier as awarded in tracking table
  }

  private async checkRetentionBonusAwarded(referrerId: string, referredId: string, days: number): Promise<boolean> {
    // Check if retention bonus was already awarded
    return false; // Simplified for now
  }

  private async markRetentionBonusAwarded(referrerId: string, referredId: string, days: number): Promise<void> {
    // Mark retention bonus as awarded
  }

  private async awardVolumeTierBonus(referrerId: string, referredId: string, basePP: number, tierLabel: string, emoji: string): Promise<void> {
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

    this.logger.log(`${emoji} ${tierLabel}: ${referrer.username} earned ${finalPP} PP (${basePP} × ${prestigeMultiplier}x prestige)!`);
  }

  private async awardWeeklyBonus(referrerId: string, referredId: string, basePP: number, tierLabel: string): Promise<void> {
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

    this.logger.log(`${tierLabel}: ${referrer.username} earned ${finalPP} PP for weekly volume!`);
  }

  private async awardRetentionBonus(referrerId: string, referredId: string, basePP: number, tierLabel: string): Promise<void> {
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

    this.logger.log(`${tierLabel}: ${referrer.username} earned ${finalPP} PP for long-term retention!`);
  }

  private async awardRecoveryBonus(referrerId: string, referredId: string, basePP: number, tierLabel: string): Promise<void> {
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

    this.logger.log(`${tierLabel}: ${referrer.username} earned ${finalPP} PP for user retention through losses!`);
  }
} 