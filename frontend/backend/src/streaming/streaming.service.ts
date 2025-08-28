import { Injectable, Logger, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SessionVaultService } from '../session-vault/session-vault.service';
import { spawn, ChildProcess } from 'child_process';
import { randomBytes, createHash } from 'crypto';
import * as path from 'path';
import * as fs from 'fs';
import { StreamingGateway } from './streaming.gateway';

export interface StreamData {
  id: string;
  streamerId: string;
  streamer: {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
    prestige: number;
  };
  title: string;
  description?: string;
  category: string;
  gameType?: string;
  stakes?: number;
  isLive: boolean;
  isEducational: boolean;
  isPremium: boolean;
  minPrestigeToView?: number;
  language: string;
  tags: string[];
  viewerCount: number;
  peakViewerCount: number;
  totalTips: number;
  totalSubscribers: number;
  startedAt: Date;
  thumbnailUrl?: string;
  playbackUrl: string;
}

export interface TipData {
  id: string;
  streamId: string;
  tipperId: string;
  tipper: {
    username: string;
    displayName: string;
    prestige: number;
  };
  amount: number;
  message?: string;
  isHighlighted: boolean;
  animationType: string;
  createdAt: Date;
}

export interface SubscriptionData {
  id: string;
  streamId: string;
  subscriberId: string;
  subscriber: {
    username: string;
    displayName: string;
    prestige: number;
  };
  tier: number;
  monthlyAmount: number;
  isActive: boolean;
  startDate: Date;
  endDate: Date;
}

// Additional interfaces for controller compatibility
export type StreamCategory = 'high_stakes' | 'educational' | 'prestige_showcase' | 'tournaments' | 'just_chatting' | 'coinflip';
export type StreamInfo = StreamData;
export type TipInfo = TipData;
export type SubscriptionInfo = SubscriptionData;

@Injectable()
export class StreamingService {
  private readonly logger = new Logger(StreamingService.name);
  private readonly rtmpProcesses = new Map<string, ChildProcess>();
  private readonly streamViewers = new Map<string, Set<string>>();
  
  // RTMP Configuration
  private readonly RTMP_PORT = process.env.RTMP_PORT || '1935';
  private readonly RTMP_HOST = process.env.RTMP_HOST || 'localhost';
  private readonly CDN_BASE_URL = process.env.CDN_BASE_URL || 'https://stream.pv3.gg';
  private readonly STREAM_RECORDINGS_PATH = process.env.STREAM_RECORDINGS_PATH || './recordings';

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionVaultService: SessionVaultService,
    @Inject(forwardRef(() => StreamingGateway)) private readonly streamingGateway: StreamingGateway,
  ) {
    // Ensure recordings directory exists
    if (!fs.existsSync(this.STREAM_RECORDINGS_PATH)) {
      fs.mkdirSync(this.STREAM_RECORDINGS_PATH, { recursive: true });
    }
  }

  /**
   * Start a new stream
   */
  async startStream(
    streamerId: string,
    title: string,
    category: string,
    options: {
      description?: string;
      gameType?: string;
      stakes?: number;
      isEducational?: boolean;
      isPremium?: boolean;
      minPrestigeToView?: number;
      language?: string;
      tags?: string[];
    } = {}
  ): Promise<{ streamKey: string; rtmpUrl: string; playbackUrl: string; streamId: string }> {
    try {
      // Check if user already has an active stream
      const existingStream = await this.prisma.stream.findFirst({
        where: {
          streamerId,
          isLive: true,
        },
      });

      if (existingStream) {
        throw new BadRequestException('User already has an active stream');
      }

      // Generate unique stream key
      const streamKey = this.generateStreamKey();
      const streamId = randomBytes(16).toString('hex');

      // Create RTMP and playback URLs
      const rtmpUrl = `rtmp://${this.RTMP_HOST}:${this.RTMP_PORT}/live/${streamKey}`;
      const playbackUrl = `${this.CDN_BASE_URL}/live/${streamKey}/index.m3u8`;

      // Create stream record in database
      const stream = await this.prisma.stream.create({
        data: {
          id: streamId,
          streamerId,
          title,
          description: options.description,
          category,
          gameType: options.gameType,
          stakes: options.stakes,
          isEducational: options.isEducational || false,
          isPremium: options.isPremium || false,
          minPrestigeToView: options.minPrestigeToView,
          language: options.language || 'en',
          tags: options.tags || [],
          streamKey,
          rtmpUrl,
          playbackUrl,
          isLive: true,
        },
      });

      // Start RTMP server process for this stream
      await this.startRTMPProcess(streamKey, streamId);

      // Award PP for starting stream
      await this.awardStreamingPP(streamerId, 'STREAM_START', { streamId });

      this.logger.log(`Stream started: ${streamId} by user ${streamerId}`);

      return {
        streamKey,
        rtmpUrl,
        playbackUrl,
        streamId,
      };
    } catch (error) {
      this.logger.error(`Failed to start stream: ${error.message}`);
      throw error;
    }
  }

  /**
   * Stop a stream
   */
  async stopStream(streamerId: string, streamId: string): Promise<void> {
    try {
      const stream = await this.prisma.stream.findFirst({
        where: {
          id: streamId,
          streamerId,
          isLive: true,
        },
      });

      if (!stream) {
        throw new NotFoundException('Active stream not found');
      }

      // Stop RTMP process
      await this.stopRTMPProcess(stream.streamKey);

      // Update stream record
      await this.prisma.stream.update({
        where: { id: streamId },
        data: {
          isLive: false,
          endedAt: new Date(),
        },
      });

      // Award PP based on stream duration
      const streamDuration = Date.now() - stream.startedAt.getTime();
      const hoursStreamed = Math.floor(streamDuration / (1000 * 60 * 60));
      if (hoursStreamed > 0) {
        await this.awardStreamingPP(streamerId, 'STREAM_DURATION', { 
          streamId, 
          hours: hoursStreamed 
        });
      }

      // Clear viewers
      this.streamViewers.delete(streamId);

      this.logger.log(`Stream stopped: ${streamId}`);
    } catch (error) {
      this.logger.error(`Failed to stop stream: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get live streams with filtering
   */
  async getLiveStreams(filters: {
    category?: string;
    minPrestige?: number;
    maxPrestige?: number;
    minStakes?: number;
    maxStakes?: number;
    language?: string;
    tags?: string[];
    isEducational?: boolean;
    isPremium?: boolean;
    limit?: number;
    offset?: number;
  } = {}): Promise<StreamData[]> {
    const where: any = {
      isLive: true,
    };

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.minStakes !== undefined) {
      where.stakes = { gte: filters.minStakes };
    }

    if (filters.maxStakes !== undefined) {
      where.stakes = { ...where.stakes, lte: filters.maxStakes };
    }

    if (filters.language) {
      where.language = filters.language;
    }

    if (filters.tags && filters.tags.length > 0) {
      where.tags = { hasSome: filters.tags };
    }

    if (filters.isEducational !== undefined) {
      where.isEducational = filters.isEducational;
    }

    if (filters.isPremium !== undefined) {
      where.isPremium = filters.isPremium;
    }

    // Prestige filtering on streamer
    if (filters.minPrestige !== undefined || filters.maxPrestige !== undefined) {
      where.streamer = {};
      if (filters.minPrestige !== undefined) {
        where.streamer.prestige = { gte: filters.minPrestige };
      }
      if (filters.maxPrestige !== undefined) {
        where.streamer.prestige = { ...where.streamer.prestige, lte: filters.maxPrestige };
      }
    }

    const streams = await this.prisma.stream.findMany({
      where,
      include: {
        streamer: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            prestige: true,
          },
        },
      },
      orderBy: [
        { viewerCount: 'desc' },
        { totalTips: 'desc' },
        { startedAt: 'desc' },
      ],
      take: filters.limit || 50,
      skip: filters.offset || 0,
    });

    return streams.map(this.formatStreamData);
  }

  /**
   * Get featured stream (highest stakes or viewers)
   */
  async getFeaturedStream(): Promise<StreamData | null> {
    const stream = await this.prisma.stream.findFirst({
      where: { isLive: true },
      include: {
        streamer: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            prestige: true,
          },
        },
      },
      orderBy: [
        { stakes: 'desc' },
        { viewerCount: 'desc' },
        { totalTips: 'desc' },
      ],
    });

    return stream ? this.formatStreamData(stream) : null;
  }

  /**
   * Send tip to streamer
   */
  async sendTip(
    tipperId: string,
    streamId: string,
    amount: number,
    message?: string
  ): Promise<TipData> {
    try {
      const stream = await this.prisma.stream.findUnique({
        where: { id: streamId },
        include: { streamer: true },
      });

      if (!stream || !stream.isLive) {
        throw new NotFoundException('Stream not found or not live');
      }

      // Process payment through session vault (97/3 split)
      const paymentResult = await this.sessionVaultService.processTip(
        tipperId,
        stream.streamerId,
        amount,
        message
      );

      // Determine animation type based on amount
      const animationType = this.getTipAnimationType(amount);

      // Create tip record
      const tip = await this.prisma.streamTip.create({
        data: {
          streamId,
          tipperId,
          amount,
          message,
          isHighlighted: amount >= 1, // Highlight tips of 1+ SOL
          animationType,
          streamerAmount: paymentResult.streamerAmount,
          platformFee: paymentResult.platformFee,
        },
        include: {
          tipper: {
            select: {
              username: true,
              displayName: true,
              prestige: true,
            },
          },
        },
      });

      // Update stream total tips
      await this.prisma.stream.update({
        where: { id: streamId },
        data: {
          totalTips: { increment: amount },
        },
      });

      // Award PP to tipper
      await this.awardStreamingPP(tipperId, 'TIP_SENT', { 
        streamId, 
        amount 
      });

      // Award PP to streamer based on tip amount
      if (amount >= 10) {
        await this.awardStreamingPP(stream.streamerId, 'LARGE_TIP_RECEIVED', { 
          streamId, 
          amount 
        });
      }

      this.logger.log(`Tip sent: ${amount} SOL from ${tipperId} to stream ${streamId}`);

      return {
        id: tip.id,
        streamId: tip.streamId,
        tipperId: tip.tipperId,
        tipper: tip.tipper,
        amount: tip.amount,
        message: tip.message,
        isHighlighted: tip.isHighlighted,
        animationType: tip.animationType,
        createdAt: tip.createdAt,
      };
    } catch (error) {
      this.logger.error(`Failed to send tip: ${error.message}`);
      throw error;
    }
  }

  /**
   * Subscribe to streamer
   */
  async subscribe(
    subscriberId: string,
    streamId: string,
    tier: number = 1,
    monthlyAmount: number
  ): Promise<SubscriptionData> {
    try {
      const stream = await this.prisma.stream.findUnique({
        where: { id: streamId },
      });

      if (!stream) {
        throw new NotFoundException('Stream not found');
      }

      // Check if already subscribed
      const existingSubscription = await this.prisma.streamSubscription.findUnique({
        where: {
          streamId_subscriberId: {
            streamId,
            subscriberId,
          },
        },
      });

      if (existingSubscription && existingSubscription.isActive) {
        throw new BadRequestException('Already subscribed to this stream');
      }

      // Process first payment
      const paymentResult = await this.sessionVaultService.processSubscription(
        subscriberId,
        stream.streamerId,
        monthlyAmount
      );

      // Calculate subscription period (1 month from now)
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);
      const nextPayment = new Date(endDate);

      // Create or update subscription
      const subscription = await this.prisma.streamSubscription.upsert({
        where: {
          streamId_subscriberId: {
            streamId,
            subscriberId,
          },
        },
        update: {
          tier,
          monthlyAmount,
          streamerAmount: paymentResult.streamerAmount,
          platformFee: paymentResult.platformFee,
          isActive: true,
          autoRenew: true,
          startDate,
          endDate,
          lastPayment: startDate,
          nextPayment,
        },
        create: {
          streamId,
          subscriberId,
          tier,
          monthlyAmount,
          streamerAmount: paymentResult.streamerAmount,
          platformFee: paymentResult.platformFee,
          isActive: true,
          autoRenew: true,
          startDate,
          endDate,
          lastPayment: startDate,
          nextPayment,
        },
        include: {
          subscriber: {
            select: {
              username: true,
              displayName: true,
              prestige: true,
            },
          },
        },
      });

      // Update stream subscriber count
      await this.prisma.stream.update({
        where: { id: streamId },
        data: {
          totalSubscribers: { increment: 1 },
        },
      });

      // Award PP to subscriber
      await this.awardStreamingPP(subscriberId, 'SUBSCRIPTION_CREATED', { 
        streamId, 
        monthlyAmount 
      });

      this.logger.log(`Subscription created: ${subscriberId} to stream ${streamId}`);

      return {
        id: subscription.id,
        streamId: subscription.streamId,
        subscriberId: subscription.subscriberId,
        subscriber: subscription.subscriber,
        tier: subscription.tier,
        monthlyAmount: subscription.monthlyAmount,
        isActive: subscription.isActive,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
      };
    } catch (error) {
      this.logger.error(`Failed to create subscription: ${error.message}`);
      throw error;
    }
  }

  /**
   * Join stream as viewer
   */
  async joinStream(streamId: string, userId: string): Promise<void> {
    try {
      const stream = await this.prisma.stream.findUnique({
        where: { id: streamId },
      });

      if (!stream || !stream.isLive) {
        throw new NotFoundException('Stream not found or not live');
      }

      // Check prestige requirements
      if (stream.minPrestigeToView) {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { prestige: true },
        });

        if (!user || user.prestige < stream.minPrestigeToView) {
          throw new BadRequestException('Insufficient prestige to view this stream');
        }
      }

      // Add to viewers set
      if (!this.streamViewers.has(streamId)) {
        this.streamViewers.set(streamId, new Set());
      }
      this.streamViewers.get(streamId)!.add(userId);

      // Update or create viewer record
      await this.prisma.streamViewer.upsert({
        where: {
          streamId_userId: {
            streamId,
            userId,
          },
        },
        update: {
          leftAt: null, // Clear left timestamp
        },
        create: {
          streamId,
          userId,
        },
      });

      // Update stream viewer count
      const viewerCount = this.streamViewers.get(streamId)!.size;
      await this.prisma.stream.update({
        where: { id: streamId },
        data: {
          viewerCount,
          peakViewerCount: Math.max(stream.peakViewerCount, viewerCount),
        },
      });

      // Award PP for viewing milestones to streamer
      await this.checkViewerMilestones(stream.streamerId, streamId, viewerCount);

      this.logger.log(`User ${userId} joined stream ${streamId}`);
    } catch (error) {
      this.logger.error(`Failed to join stream: ${error.message}`);
      throw error;
    }
  }

  /**
   * Leave stream
   */
  async leaveStream(streamId: string, userId: string): Promise<void> {
    try {
      // Remove from viewers set
      if (this.streamViewers.has(streamId)) {
        this.streamViewers.get(streamId)!.delete(userId);
      }

      // Update viewer record with leave time
      const viewer = await this.prisma.streamViewer.findUnique({
        where: {
          streamId_userId: {
            streamId,
            userId,
          },
        },
      });

      if (viewer) {
        const watchTime = Math.floor((Date.now() - viewer.joinedAt.getTime()) / 1000);
        
        await this.prisma.streamViewer.update({
          where: {
            streamId_userId: {
              streamId,
              userId,
            },
          },
          data: {
            leftAt: new Date(),
            watchTime: viewer.watchTime + watchTime,
          },
        });

        // Award PP for watch time (1 PP per 10 minutes)
        const ppEarned = Math.floor(watchTime / 600); // 600 seconds = 10 minutes
        if (ppEarned > 0) {
          await this.awardStreamingPP(userId, 'WATCH_TIME', { 
            streamId, 
            watchTime, 
            ppEarned 
          });
        }
      }

      // Update stream viewer count
      const viewerCount = this.streamViewers.get(streamId)?.size || 0;
      await this.prisma.stream.update({
        where: { id: streamId },
        data: { viewerCount },
      });

      this.logger.log(`User ${userId} left stream ${streamId}`);
    } catch (error) {
      this.logger.error(`Failed to leave stream: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send chat message
   */
  async sendChatMessage(
    streamId: string,
    userId: string,
    message: string,
    tipAmount?: number
  ): Promise<void> {
    try {
      const stream = await this.prisma.stream.findUnique({
        where: { id: streamId },
      });

      if (!stream || !stream.isLive) {
        throw new NotFoundException('Stream not found or not live');
      }

      // Create chat message
      await this.prisma.streamChatMessage.create({
        data: {
          streamId,
          userId,
          message,
          isHighlighted: !!tipAmount && tipAmount >= 1,
          tipAmount,
        },
      });

      // Award PP for chat participation
      await this.awardStreamingPP(userId, 'CHAT_MESSAGE', { streamId });

      this.logger.log(`Chat message sent in stream ${streamId} by user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to send chat message: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get stream categories with counts
   */
  async getStreamCategories(): Promise<Array<{ category: string; count: number }>> {
    const categories = await this.prisma.stream.groupBy({
      by: ['category'],
      where: { isLive: true },
      _count: { category: true },
      orderBy: { _count: { category: 'desc' } },
    });

    return categories.map(cat => ({
      category: cat.category,
      count: cat._count.category,
    }));
  }

  /**
   * Get a specific stream by ID
   */
  async getStream(streamId: string): Promise<StreamData | null> {
    const stream = await this.prisma.stream.findUnique({
      where: { id: streamId },
      include: {
        streamer: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            prestige: true,
          },
        },
      },
    });

    return stream ? this.formatStreamData(stream) : null;
  }

  /**
   * End a stream (alias for stopStream for controller compatibility)
   */
  async endStream(streamId: string, streamerId: string): Promise<void> {
    return this.stopStream(streamerId, streamId);
  }

  /**
   * Get prestige streamers (P2+)
   */
  async getPrestigeStreamers(): Promise<StreamData[]> {
    return this.getLiveStreams({
      minPrestige: 2,
      limit: 20,
    });
  }

  /**
   * Get streams by category
   */
  async getStreamsByCategory(category: StreamCategory): Promise<StreamData[]> {
    return this.getLiveStreams({
      category,
      limit: 50,
    });
  }

  /**
   * Get educational streams
   */
  async getEducationalStreams(): Promise<StreamData[]> {
    return this.getLiveStreams({
      isEducational: true,
      limit: 30,
    });
  }

  /**
   * Get high stakes streams
   */
  async getHighStakesStreams(minStakes?: number): Promise<StreamData[]> {
    return this.getLiveStreams({
      minStakes: minStakes || 10,
      limit: 20,
    });
  }

  /**
   * Get tournament streams
   */
  async getTournamentStreams(): Promise<StreamData[]> {
    return this.getLiveStreams({
      category: 'tournaments',
      limit: 20,
    });
  }

  /**
   * Get stream tips
   */
  async getStreamTips(streamId: string, limit: number = 50): Promise<TipData[]> {
    const tips = await this.prisma.streamTip.findMany({
      where: { streamId },
      include: {
        tipper: {
          select: {
            username: true,
            displayName: true,
            prestige: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return tips.map(tip => ({
      id: tip.id,
      streamId: tip.streamId,
      tipperId: tip.tipperId,
      tipper: tip.tipper,
      amount: tip.amount,
      message: tip.message,
      isHighlighted: tip.isHighlighted,
      animationType: tip.animationType,
      createdAt: tip.createdAt,
    }));
  }

  /**
   * Get stream subscriptions
   */
  async getStreamSubscriptions(streamId: string): Promise<SubscriptionData[]> {
    const subscriptions = await this.prisma.streamSubscription.findMany({
      where: { 
        streamId,
        isActive: true,
      },
      include: {
        subscriber: {
          select: {
            username: true,
            displayName: true,
            prestige: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return subscriptions.map(sub => ({
      id: sub.id,
      streamId: sub.streamId,
      subscriberId: sub.subscriberId,
      subscriber: sub.subscriber,
      tier: sub.tier,
      monthlyAmount: sub.monthlyAmount,
      isActive: sub.isActive,
      startDate: sub.startDate,
      endDate: sub.endDate,
    }));
  }

  /**
   * Start streaming a coinflip match
   */
  async startCoinFlipMatchStream(
    streamerId: string,
    matchId: string,
    title?: string
  ): Promise<StreamData> {
    try {
      // Verify the match exists and user is a participant
      const match = await this.prisma.match.findUnique({
        where: { id: matchId },
        include: {
          player1: { select: { id: true, wallet: true, username: true } },
          player2: { select: { id: true, wallet: true, username: true } }
        }
      });

      if (!match) {
        throw new NotFoundException('Match not found');
      }

      if (match.gameType !== 'coin-flip') {
        throw new BadRequestException('Not a coinflip match');
      }

      // Verify streamer is a participant
      const isParticipant = match.player1.id === streamerId || match.player2?.id === streamerId;
      if (!isParticipant) {
        throw new BadRequestException('You must be a participant to stream this match');
      }

      // Generate stream title
      const opponent = match.player1.id === streamerId ? match.player2 : match.player1;
      const defaultTitle = `🪙 Coinflip vs ${opponent?.username || 'Opponent'} - ${match.wager} SOL`;
      const streamTitle = title || defaultTitle;

      // Create stream
      const stream = await this.createStream(streamerId, {
        title: streamTitle,
        category: 'coinflip',
        description: `Live coinflip match: ${match.wager} SOL wager`,
        isPrivate: false,
        allowTips: true,
        allowSubscriptions: true,
        tags: ['coinflip', 'pvp', 'gambling', `${match.wager}sol`],
      });

      // Link stream to match
      await this.prisma.match.update({
        where: { id: matchId },
        data: {
          streamId: stream.id // Add streamId field to match if it doesn't exist
        }
      });

      this.logger.log(`🎥 Coinflip match stream started: ${stream.id} for match ${matchId}`);
      
      return stream;
    } catch (error) {
      this.logger.error(`Failed to start coinflip match stream:`, error);
      throw error;
    }
  }

  /**
   * Get active coinflip match streams
   */
  async getActiveCoinFlipStreams(): Promise<StreamData[]> {
    try {
      const streams = await this.prisma.stream.findMany({
        where: {
          isLive: true,
          category: 'coinflip'
        },
        include: {
          streamer: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
              prestige: true,
            }
          }
        },
        orderBy: {
          viewerCount: 'desc'
        },
        take: 20
      });

      return streams.map(stream => this.mapPrismaToStreamData(stream));
    } catch (error) {
      this.logger.error('Failed to get active coinflip streams:', error);
      throw new Error(`Failed to get coinflip streams: ${error.message}`);
    }
  }

  /**
   * Broadcast coinflip round result to stream viewers
   */
  async broadcastCoinFlipResult(
    streamId: string,
    roundResult: {
      coinResult: 'heads' | 'tails';
      roundWinner: string | null;
      playerScore: number;
      opponentScore: number;
      matchComplete: boolean;
    }
  ): Promise<void> {
    try {
      const stream = await this.prisma.stream.findUnique({
        where: { id: streamId },
        include: { streamer: true }
      });

      if (!stream || !stream.isLive) {
        return;
      }

      // Broadcast to all stream viewers via WebSocket
      this.streamingGateway.broadcastToStream(streamId, 'coinflip_result', {
        coinResult: roundResult.coinResult,
        roundWinner: roundResult.roundWinner,
        score: `${roundResult.playerScore}-${roundResult.opponentScore}`,
        matchComplete: roundResult.matchComplete,
        timestamp: Date.now()
      });

      // Award PP to viewers for watching live gaming
      await this.awardViewerPP(streamId, 'COINFLIP_ROUND_WATCHED', {
        coinResult: roundResult.coinResult,
        wager: 'unknown' // Would need to get from match
      });

      this.logger.log(`🪙 Broadcasted coinflip result to stream ${streamId}: ${roundResult.coinResult}`);
    } catch (error) {
      this.logger.error(`Failed to broadcast coinflip result:`, error);
    }
  }

  /**
   * Award PP to viewers for watching coinflip matches
   */
  private async awardViewerPP(
    streamId: string,
    eventType: string,
    eventData: any
  ): Promise<void> {
    try {
      // Get active viewers (would need to track via WebSocket)
      // For now, simplified implementation
      const stream = await this.prisma.stream.findUnique({
        where: { id: streamId }
      });

      if (!stream) return;

      // Award small PP bonus to viewers for engagement
      const viewerBonus = eventType === 'COINFLIP_ROUND_WATCHED' ? 5 : 10;
      
      // In a real implementation, would track active viewers and award them PP
      this.logger.log(`🎖️ Would award ${viewerBonus} PP to ${stream.viewerCount} viewers for ${eventType}`);
    } catch (error) {
      this.logger.error('Failed to award viewer PP:', error);
    }
  }

  /**
   * Create a new stream (internal helper method)
   */
  private async createStream(
    streamerId: string,
    options: {
      title: string;
      category: string;
      description?: string;
      isPrivate?: boolean;
      allowTips?: boolean;
      allowSubscriptions?: boolean;
      tags?: string[];
    }
  ): Promise<StreamData> {
    try {
      const streamKey = this.generateStreamKey();
      
      const stream = await this.prisma.stream.create({
        data: {
          streamerId,
          title: options.title,
          description: options.description,
          category: options.category,
          isLive: true,
          isEducational: false,
          isPremium: false,
          language: 'en',
          tags: options.tags || [],
          streamKey,
          rtmpUrl: `rtmp://${this.RTMP_HOST}:${this.RTMP_PORT}/live/${streamKey}`,
          playbackUrl: `${this.CDN_BASE_URL}/live/${streamKey}/index.m3u8`,
          viewerCount: 0,
          peakViewerCount: 0,
          totalTips: 0,
          totalSubscribers: 0,
          startedAt: new Date(),
        },
        include: {
          streamer: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
              prestige: true,
            }
          }
        }
      });

      return this.mapPrismaToStreamData(stream);
    } catch (error) {
      this.logger.error('Failed to create stream:', error);
      throw error;
    }
  }

  /**
   * Map Prisma stream data to StreamData interface
   */
  private mapPrismaToStreamData(stream: any): StreamData {
    return {
      id: stream.id,
      streamerId: stream.streamerId,
      streamer: stream.streamer,
      title: stream.title,
      description: stream.description,
      category: stream.category,
      gameType: stream.gameType,
      stakes: stream.stakes,
      isLive: stream.isLive,
      isEducational: stream.isEducational,
      isPremium: stream.isPremium,
      minPrestigeToView: stream.minPrestigeToView,
      language: stream.language,
      tags: stream.tags,
      viewerCount: stream.viewerCount,
      peakViewerCount: stream.peakViewerCount,
      totalTips: stream.totalTips,
      totalSubscribers: stream.totalSubscribers,
      startedAt: stream.startedAt,
      thumbnailUrl: stream.thumbnailUrl,
      playbackUrl: stream.playbackUrl,
    };
  }

  // Private helper methods

  private generateStreamKey(): string {
    return randomBytes(32).toString('hex');
  }

  private getTipAnimationType(amount: number): string {
    if (amount >= 50) return 'legendary';
    if (amount >= 10) return 'mega';
    if (amount >= 5) return 'large';
    if (amount >= 1) return 'medium';
    return 'small';
  }

  private formatStreamData(stream: any): StreamData {
    return {
      id: stream.id,
      streamerId: stream.streamerId,
      streamer: stream.streamer,
      title: stream.title,
      description: stream.description,
      category: stream.category,
      gameType: stream.gameType,
      stakes: stream.stakes,
      isLive: stream.isLive,
      isEducational: stream.isEducational,
      isPremium: stream.isPremium,
      minPrestigeToView: stream.minPrestigeToView,
      language: stream.language,
      tags: stream.tags,
      viewerCount: stream.viewerCount,
      peakViewerCount: stream.peakViewerCount,
      totalTips: stream.totalTips,
      totalSubscribers: stream.totalSubscribers,
      startedAt: stream.startedAt,
      thumbnailUrl: stream.thumbnailUrl,
      playbackUrl: stream.playbackUrl,
    };
  }

  private async startRTMPProcess(streamKey: string, streamId: string): Promise<void> {
    try {
      // FFmpeg command to handle RTMP stream and create HLS output
      const outputPath = path.join(this.STREAM_RECORDINGS_PATH, streamKey);
      if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath, { recursive: true });
      }

      const ffmpegArgs = [
        '-i', `rtmp://localhost:${this.RTMP_PORT}/live/${streamKey}`,
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-preset', 'veryfast',
        '-tune', 'zerolatency',
        '-f', 'hls',
        '-hls_time', '2',
        '-hls_list_size', '3',
        '-hls_flags', 'delete_segments',
        path.join(outputPath, 'index.m3u8')
      ];

      const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);
      
      ffmpegProcess.stdout.on('data', (data) => {
        this.logger.debug(`FFmpeg stdout: ${data}`);
      });

      ffmpegProcess.stderr.on('data', (data) => {
        this.logger.debug(`FFmpeg stderr: ${data}`);
      });

      ffmpegProcess.on('close', (code) => {
        this.logger.log(`FFmpeg process for stream ${streamKey} exited with code ${code}`);
        this.rtmpProcesses.delete(streamKey);
      });

      this.rtmpProcesses.set(streamKey, ffmpegProcess);
      
      this.logger.log(`RTMP process started for stream ${streamKey}`);
    } catch (error) {
      this.logger.error(`Failed to start RTMP process: ${error.message}`);
      throw error;
    }
  }

  private async stopRTMPProcess(streamKey: string): Promise<void> {
    const process = this.rtmpProcesses.get(streamKey);
    if (process) {
      process.kill('SIGTERM');
      this.rtmpProcesses.delete(streamKey);
      this.logger.log(`RTMP process stopped for stream ${streamKey}`);
    }
  }

  private async awardStreamingPP(userId: string, action: string, data: any): Promise<void> {
    try {
      let ppAmount = 0;

      switch (action) {
        case 'STREAM_START':
          ppAmount = 50; // Bonus for starting stream
          break;
        case 'STREAM_DURATION':
          ppAmount = data.hours * 10; // 10 PP per hour
          break;
        case 'TIP_SENT':
          ppAmount = Math.floor(data.amount * 10); // 10 PP per SOL tipped
          break;
        case 'LARGE_TIP_RECEIVED':
          ppAmount = data.amount >= 50 ? 500 : 100; // Bonus for large tips
          break;
        case 'SUBSCRIPTION_CREATED':
          ppAmount = 25; // Bonus for subscribing
          break;
        case 'WATCH_TIME':
          ppAmount = data.ppEarned; // 1 PP per 10 minutes
          break;
        case 'CHAT_MESSAGE':
          ppAmount = 5; // 5 PP per chat message
          break;
        default:
          return;
      }

      if (ppAmount > 0) {
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            proofPoints: { increment: ppAmount },
            totalProofPoints: { increment: ppAmount },
          },
        });

        this.logger.log(`Awarded ${ppAmount} PP to user ${userId} for ${action}`);
      }
    } catch (error) {
      this.logger.error(`Failed to award PP: ${error.message}`);
    }
  }

  private async checkViewerMilestones(streamerId: string, streamId: string, viewerCount: number): Promise<void> {
    const milestones = [
      { threshold: 10, pp: 50 },
      { threshold: 50, pp: 200 },
      { threshold: 100, pp: 1000 },
    ];

    for (const milestone of milestones) {
      if (viewerCount === milestone.threshold) {
        await this.awardStreamingPP(streamerId, 'VIEWER_MILESTONE', {
          streamId,
          viewerCount,
          ppAwarded: milestone.pp,
        });
        break;
      }
    }
  }
} 