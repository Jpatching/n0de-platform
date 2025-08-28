import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export enum PrestigeRank {
  MORTAL_WARRIOR = 0,
  SPARTAN_GENERAL = 1,
  OLYMPIAN_COMMANDER = 2,
  DIVINE_EMPEROR = 3,
  GODMODE = 4,
}

export enum Tier {
  BRONZE = 0,
  SILVER = 1,
  GOLD = 2,
  DIAMOND = 3,
  GOD = 4,
}

export interface PrestigeConfig {
  name: string;
  title: string;
  badge: string;
  ppMultiplier: number;
  airdropWeight: number;
  unlocks: string[];
  tierRequirements: number[];
}

export interface TierRequirement {
  tier: Tier;
  name: string;
  emoji: string;
  ppRequired: number;
}

@Injectable()
export class PrestigeService {
  private readonly logger = new Logger(PrestigeService.name);

  constructor(private prisma: PrismaService) {}

  // Prestige configurations
  private readonly PRESTIGE_CONFIG: Record<PrestigeRank, PrestigeConfig> = {
    [PrestigeRank.MORTAL_WARRIOR]: {
      name: 'Mortal Warrior',
      title: '🔰 Mortal Warrior',
      badge: '🔰',
      ppMultiplier: 1.0,
      airdropWeight: 1,
      unlocks: ['Basic matchmaking'],
      tierRequirements: [1000, 5000, 15000, 50000, 100000],
    },
    [PrestigeRank.SPARTAN_GENERAL]: {
      name: 'Spartan General',
      title: '⚔️ Spartan General',
      badge: '⚔️',
      ppMultiplier: 1.5,
      airdropWeight: 2,
      unlocks: ['Elite tournaments', 'Spartan chat'],
      tierRequirements: [3000, 15000, 45000, 150000, 300000],
    },
    [PrestigeRank.OLYMPIAN_COMMANDER]: {
      name: 'Olympian Commander',
      title: '⚡ Olympian Commander',
      badge: '⚡',
      ppMultiplier: 2.5,
      airdropWeight: 4,
      unlocks: ['VIP matchmaking', 'Olympian lounge', 'Priority support'],
      tierRequirements: [9000, 45000, 135000, 450000, 900000],
    },
    [PrestigeRank.DIVINE_EMPEROR]: {
      name: 'Divine Emperor',
      title: '🏛️ Divine Emperor',
      badge: '🏛️',
      ppMultiplier: 4.0,
      airdropWeight: 8,
      unlocks: ['God-tier tournaments', 'Divine council', 'Custom features'],
      tierRequirements: [27000, 135000, 405000, 1350000, 2700000],
    },
    [PrestigeRank.GODMODE]: {
      name: 'GODMODE',
      title: '👑 **GODMODE**',
      badge: '👑',
      ppMultiplier: 10.0,
      airdropWeight: 16,
      unlocks: ['Everything', 'Godmode exclusive', 'Reality effects', 'Hall of legends'],
      tierRequirements: [81000, 405000, 1215000, 4050000, 8100000],
    },
  };

  private readonly TIER_CONFIG: Record<Tier, TierRequirement> = {
    [Tier.BRONZE]: { tier: Tier.BRONZE, name: 'Bronze', emoji: '🥉', ppRequired: 0 },
    [Tier.SILVER]: { tier: Tier.SILVER, name: 'Silver', emoji: '🥈', ppRequired: 1000 },
    [Tier.GOLD]: { tier: Tier.GOLD, name: 'Gold', emoji: '🥇', ppRequired: 5000 },
    [Tier.DIAMOND]: { tier: Tier.DIAMOND, name: 'Diamond', emoji: '💎', ppRequired: 15000 },
    [Tier.GOD]: { tier: Tier.GOD, name: 'God', emoji: '👑', ppRequired: 50000 },
  };

  /**
   * Award proof points to a user
   */
  async awardProofPoints(userId: string, basePoints: number, source: string = 'game'): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { proofPoints: true, prestige: true, totalProofPoints: true, currentTier: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Apply prestige multiplier
    const config = this.PRESTIGE_CONFIG[user.prestige as PrestigeRank];
    const multipliedPoints = Math.floor(basePoints * config.ppMultiplier);

    // Update user's proof points
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        proofPoints: user.proofPoints + multipliedPoints,
        totalProofPoints: user.totalProofPoints + multipliedPoints,
      },
    });

    // Check for tier advancement
    await this.checkTierAdvancement(userId, updatedUser.proofPoints, updatedUser.prestige);

    this.logger.log(`Awarded ${multipliedPoints} PP to user ${userId} from ${source} (base: ${basePoints}, multiplier: ${config.ppMultiplier}x)`);
  }

  /**
   * Award massive PP for successful referrals - THE PRIMARY WAY TO EARN PP
   */
  async awardReferralPoints(referrerId: string, referredUserId: string, referralType: 'signup' | 'first_game' | 'milestone'): Promise<void> {
    const referrer = await this.prisma.user.findUnique({
      where: { id: referrerId },
      select: { proofPoints: true, prestige: true, totalProofPoints: true, currentTier: true, username: true },
    });

    const referred = await this.prisma.user.findUnique({
      where: { id: referredUserId },
      select: { username: true },
    });

    if (!referrer || !referred) {
      throw new Error('User not found');
    }

    let basePoints = 0;
    let description = '';

    switch (referralType) {
      case 'signup':
        basePoints = 5000; // 5x more than a 1 SOL game
        description = 'Referral Signup Bonus';
        break;
      case 'first_game':
        basePoints = 15000; // 15x more than a 1 SOL game  
        description = 'Referral First Game Bonus';
        break;
      case 'milestone':
        basePoints = 25000; // 25x more than a 1 SOL game
        description = 'Referral Milestone Bonus';
        break;
    }

    // Apply prestige multiplier (referrals get FULL multiplier benefit)
    const config = this.PRESTIGE_CONFIG[referrer.prestige as PrestigeRank];
    const multipliedPoints = Math.floor(basePoints * config.ppMultiplier);

    // Update referrer's proof points
    const updatedUser = await this.prisma.user.update({
      where: { id: referrerId },
      data: {
        proofPoints: referrer.proofPoints + multipliedPoints,
        totalProofPoints: referrer.totalProofPoints + multipliedPoints,
      },
    });

    // Check for tier advancement
    await this.checkTierAdvancement(referrerId, updatedUser.proofPoints, updatedUser.prestige);

    this.logger.log(`🎯 REFERRAL BONUS: Awarded ${multipliedPoints} PP to ${referrer.username} for referring ${referred.username} (${description})`);
  }

  /**
   * Award ongoing revenue share PP from referred users' games
   */
  async awardReferralRevShare(referrerId: string, referredUserId: string, gameWager: number): Promise<void> {
    const referrer = await this.prisma.user.findUnique({
      where: { id: referrerId },
      select: { proofPoints: true, prestige: true, totalProofPoints: true, currentTier: true, username: true },
    });

    if (!referrer) return;

    // 20% of the PP that the referred user would earn
    const baseGamePP = this.calculateMatchProofPoints(gameWager);
    const revSharePoints = Math.floor(baseGamePP * 0.2);

    // Apply prestige multiplier
    const config = this.PRESTIGE_CONFIG[referrer.prestige as PrestigeRank];
    const multipliedPoints = Math.floor(revSharePoints * config.ppMultiplier);

    // Update referrer's proof points
    const updatedUser = await this.prisma.user.update({
      where: { id: referrerId },
      data: {
        proofPoints: referrer.proofPoints + multipliedPoints,
        totalProofPoints: referrer.totalProofPoints + multipliedPoints,
      },
    });

    // Check for tier advancement
    await this.checkTierAdvancement(referrerId, updatedUser.proofPoints, updatedUser.prestige);

    this.logger.log(`💰 REFERRAL REV-SHARE: Awarded ${multipliedPoints} PP to ${referrer.username} from referred user's ${gameWager} SOL game`);
  }

  /**
   * Award mega bonuses for whale referrals
   */
  async awardWhaleReferralBonus(referrerId: string, referredUserId: string, totalWagered: number): Promise<void> {
    if (totalWagered < 100) return; // Only for whales who've wagered 100+ SOL

    const referrer = await this.prisma.user.findUnique({
      where: { id: referrerId },
      select: { proofPoints: true, prestige: true, totalProofPoints: true, currentTier: true, username: true },
    });

    if (!referrer) return;

    // Massive bonus based on whale's total wagered
    let bonusPoints = 0;
    if (totalWagered >= 1000) bonusPoints = 500000; // 500k PP for 1000+ SOL whale
    else if (totalWagered >= 500) bonusPoints = 250000; // 250k PP for 500+ SOL whale  
    else if (totalWagered >= 100) bonusPoints = 100000; // 100k PP for 100+ SOL whale

    // Apply prestige multiplier
    const config = this.PRESTIGE_CONFIG[referrer.prestige as PrestigeRank];
    const multipliedPoints = Math.floor(bonusPoints * config.ppMultiplier);

    // Update referrer's proof points
    const updatedUser = await this.prisma.user.update({
      where: { id: referrerId },
      data: {
        proofPoints: referrer.proofPoints + multipliedPoints,
        totalProofPoints: referrer.totalProofPoints + multipliedPoints,
      },
    });

    // Check for tier advancement
    await this.checkTierAdvancement(referrerId, updatedUser.proofPoints, updatedUser.prestige);

    this.logger.log(`🐋 WHALE REFERRAL BONUS: Awarded ${multipliedPoints} PP to ${referrer.username} for ${totalWagered} SOL whale referral!`);
  }

  /**
   * Check if user can advance to next tier
   */
  private async checkTierAdvancement(userId: string, currentPP: number, prestige: number): Promise<void> {
    const config = this.PRESTIGE_CONFIG[prestige as PrestigeRank];
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { currentTier: true },
    });

    if (!user) return;

    let newTier = user.currentTier;
    
    // Check each tier requirement
    for (let tier = user.currentTier + 1; tier < config.tierRequirements.length; tier++) {
      if (currentPP >= config.tierRequirements[tier]) {
        newTier = tier;
      } else {
        break;
      }
    }

    // Update tier if advanced
    if (newTier > user.currentTier) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { currentTier: newTier },
      });

      this.logger.log(`User ${userId} advanced to tier ${newTier} (${this.TIER_CONFIG[newTier as Tier].name})`);
    }
  }

  /**
   * Check if user can prestige
   */
  async canPrestige(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { currentTier: true, prestige: true },
    });

    if (!user) return false;

    // Must be at God tier (4) and not already at max prestige
    return user.currentTier === Tier.GOD && user.prestige < PrestigeRank.GODMODE;
  }

  /**
   * Prestige a user
   */
  async prestigeUser(userId: string): Promise<{ success: boolean; newPrestige: PrestigeRank; message: string }> {
    const canPrestige = await this.canPrestige(userId);
    if (!canPrestige) {
      return { success: false, newPrestige: PrestigeRank.MORTAL_WARRIOR, message: 'Cannot prestige at this time' };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { prestige: true, prestigeHistory: true },
    });

    if (!user) {
      return { success: false, newPrestige: PrestigeRank.MORTAL_WARRIOR, message: 'User not found' };
    }

    const newPrestige = (user.prestige + 1) as PrestigeRank;
    const prestigeHistory = user.prestigeHistory as any[] || [];
    
    // Add prestige record to history
    prestigeHistory.push({
      prestige: newPrestige,
      date: new Date().toISOString(),
      previousPP: 0, // Will be set by the update
    });

    // Reset progress but keep prestige bonuses
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        prestige: newPrestige,
        currentTier: Tier.BRONZE,
        proofPoints: 0,
        prestigeHistory: prestigeHistory,
        lastPrestigeAt: new Date(),
      },
    });

    const config = this.PRESTIGE_CONFIG[newPrestige];
    this.logger.log(`User ${userId} prestiged to ${config.name}!`);

    return {
      success: true,
      newPrestige,
      message: `🔥 PRESTIGE ACHIEVED! Welcome to ${config.title}! 🔥`,
    };
  }

  /**
   * Get user's prestige info
   */
  async getUserPrestigeInfo(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        proofPoints: true,
        currentTier: true,
        prestige: true,
        totalProofPoints: true,
        prestigeHistory: true,
        lastPrestigeAt: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const prestigeConfig = this.PRESTIGE_CONFIG[user.prestige as PrestigeRank];
    const currentTierConfig = this.TIER_CONFIG[user.currentTier as Tier];
    
    // Calculate next tier requirement
    const nextTierPP = user.currentTier < Tier.GOD 
      ? prestigeConfig.tierRequirements[user.currentTier + 1]
      : prestigeConfig.tierRequirements[Tier.GOD];

    return {
      proofPoints: user.proofPoints,
      totalProofPoints: user.totalProofPoints,
      prestige: {
        rank: user.prestige,
        name: prestigeConfig.name,
        title: prestigeConfig.title,
        badge: prestigeConfig.badge,
        multiplier: prestigeConfig.ppMultiplier,
        airdropWeight: prestigeConfig.airdropWeight,
        unlocks: prestigeConfig.unlocks,
      },
      currentTier: {
        tier: user.currentTier,
        name: currentTierConfig.name,
        emoji: currentTierConfig.emoji,
        ppRequired: currentTierConfig.ppRequired,
      },
      nextTier: user.currentTier < Tier.GOD ? {
        tier: user.currentTier + 1,
        name: this.TIER_CONFIG[(user.currentTier + 1) as Tier].name,
        emoji: this.TIER_CONFIG[(user.currentTier + 1) as Tier].emoji,
        ppRequired: nextTierPP,
        ppNeeded: Math.max(0, nextTierPP - user.proofPoints),
      } : null,
      canPrestige: await this.canPrestige(userId),
      prestigeHistory: user.prestigeHistory || [],
      lastPrestigeAt: user.lastPrestigeAt,
    };
  }

  /**
   * Get prestige leaderboard
   */
  async getPrestigeLeaderboard(limit: number = 50) {
    const users = await this.prisma.user.findMany({
      where: {
        OR: [
          { prestige: { gt: 0 } },
          { proofPoints: { gt: 0 } },
        ],
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatar: true,
        prestige: true,
        currentTier: true,
        proofPoints: true,
        totalProofPoints: true,
      },
      orderBy: [
        { prestige: 'desc' },
        { proofPoints: 'desc' },
      ],
      take: limit,
    });

    return users.map((user, index) => ({
      rank: index + 1,
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar,
      prestige: {
        rank: user.prestige,
        ...this.PRESTIGE_CONFIG[user.prestige as PrestigeRank],
      },
      currentTier: {
        tier: user.currentTier,
        ...this.TIER_CONFIG[user.currentTier as Tier],
      },
      proofPoints: user.proofPoints,
      totalProofPoints: user.totalProofPoints,
    }));
  }

  /**
   * Calculate proof points for match win
   */
  calculateMatchProofPoints(wager: number, winStreak: number = 1): number {
    let basePoints = 1;

    // Wager-based points (exponential scaling)
    if (wager >= 1000) basePoints = 1000;
    else if (wager >= 500) basePoints = 250;
    else if (wager >= 100) basePoints = 75;
    else if (wager >= 50) basePoints = 25;
    else if (wager >= 10) basePoints = 8;
    else if (wager >= 1) basePoints = 3;

    // Win streak multiplier
    const streakMultiplier = Math.min(1 + (winStreak - 1) * 0.1, 3.0); // Max 3x

    return Math.floor(basePoints * streakMultiplier);
  }
} 