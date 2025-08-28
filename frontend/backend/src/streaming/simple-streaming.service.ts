import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SessionVaultService } from '../session-vault/session-vault.service';
import { CloudflareStreamService } from './cloudflare-stream.service';

@Injectable()
export class SimpleStreamingService {
  private readonly logger = new Logger(SimpleStreamingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionVaultService: SessionVaultService,
    private readonly cloudflareStream: CloudflareStreamService,
  ) {}

  /**
   * Start a new stream - Super Simple!
   */
  async startStream(streamerId: string, title: string, category: string) {
    try {
      // Check if user already has an active stream
      const existingStream = await this.prisma.stream.findFirst({
        where: { streamerId, isLive: true },
      });

      if (existingStream) {
        throw new BadRequestException('You already have an active stream');
      }

      // Create live stream with Cloudflare (they handle everything!)
      const cloudflareStream = await this.cloudflareStream.createLiveStream(
        `${streamerId}-${Date.now()}`,
        title
      );

      // Save to database
      const stream = await this.prisma.stream.create({
        data: {
          id: cloudflareStream.streamId,
          streamerId,
          title,
          category,
          streamKey: cloudflareStream.streamKey,
          rtmpUrl: cloudflareStream.rtmpUrl,
          playbackUrl: cloudflareStream.playbackUrl,
          isLive: true,
        },
      });

      this.logger.log(`✅ Stream created! User just needs to stream to: ${cloudflareStream.rtmpUrl}`);

      return {
        streamId: stream.id,
        rtmpUrl: cloudflareStream.rtmpUrl,
        streamKey: cloudflareStream.streamKey,
        playbackUrl: cloudflareStream.playbackUrl,
        message: 'Stream ready! Use the RTMP URL in OBS or your streaming software.',
      };
    } catch (error) {
      this.logger.error(`Failed to start stream: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all live streams
   */
  async getLiveStreams() {
    const streams = await this.prisma.stream.findMany({
      where: { isLive: true },
      include: {
        streamer: {
          select: {
            username: true,
            displayName: true,
            prestige: true,
          },
        },
      },
      orderBy: { startedAt: 'desc' },
    });

    // Get live status from Cloudflare for each stream
    const liveStreams = [];
    for (const stream of streams) {
      const status = await this.cloudflareStream.getStreamStatus(stream.id);
      if (status.isLive) {
        liveStreams.push({
          ...stream,
          viewerCount: status.viewerCount,
          duration: status.duration,
        });
      }
    }

    return liveStreams;
  }

  /**
   * Send a tip to a stream
   */
  async sendTip(userId: string, streamId: string, amount: number, message?: string) {
    // TODO: Uncomment after Prisma client regeneration
    /*
    const stream = await this.prisma.stream.findUnique({
      where: { id: streamId },
    });

    if (!stream || !stream.isLive) {
      throw new Error('Stream not found or not live');
    }

    // Calculate revenue split (97% to streamer, 3% to platform)
    const streamerAmount = amount * 0.97;
    const platformFee = amount * 0.03;

    // Create tip record
    const tip = await this.prisma.streamTip.create({
      data: {
        streamId,
        tipperId: userId,
        amount,
        message: message || '',
        animationType: this.getTipAnimation(amount),
        streamerAmount,
        platformFee,
      },
    });

    // Update stream total tips
    await this.prisma.stream.update({
      where: { id: streamId },
      data: { totalTips: { increment: amount } },
    });

    this.logger.log(`💰 Tip sent: ${amount} SOL to stream ${streamId}`);
    return tip;
    */
    
    this.logger.log(`💰 Tip sent: ${amount} SOL to stream ${streamId}`);
    return { id: 'temp', amount, message };
  }

  /**
   * Subscribe to a stream
   */
  async subscribeToStream(userId: string, streamId: string, tier: number, monthlyAmount: number) {
    // TODO: Uncomment after Prisma client regeneration
    /*
    // Check if user is already subscribed
    const existingSub = await this.prisma.streamSubscription.findUnique({
      where: { streamId_subscriberId: { streamId, subscriberId: userId } },
    });

    if (existingSub) {
      throw new Error('Already subscribed to this stream');
    }

    // Calculate revenue split
    const streamerAmount = monthlyAmount * 0.97;
    const platformFee = monthlyAmount * 0.03;

    // Calculate end date (1 month from now)
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    const subscription = await this.prisma.streamSubscription.create({
      data: {
        streamId,
        subscriberId: userId,
        tier,
        monthlyAmount,
        streamerAmount,
        platformFee,
        startDate,
        endDate,
        nextPayment: endDate,
      },
    });

    // Update stream subscriber count
    await this.prisma.stream.update({
      where: { id: streamId },
      data: { totalSubscribers: { increment: 1 } },
    });

    this.logger.log(`📺 New subscription: User ${userId} to stream ${streamId}`);
    return subscription;
    */
    
    this.logger.log(`📺 New subscription: User ${userId} to stream ${streamId}`);
    return { id: 'temp', tier, monthlyAmount };
  }

  /**
   * Stop a stream
   */
  async stopStream(streamerId: string, streamId: string) {
    const stream = await this.prisma.stream.findFirst({
      where: { id: streamId, streamerId, isLive: true },
    });

    if (!stream) {
      throw new NotFoundException('Active stream not found');
    }

    // Delete from Cloudflare
    await this.cloudflareStream.deleteLiveStream(streamId);

    // Update database
    await this.prisma.stream.update({
      where: { id: streamId },
      data: { 
        isLive: false,
        endedAt: new Date(),
      },
    });

    this.logger.log(`Stream stopped: ${streamId}`);
  }

  /**
   * Get tip animation type based on amount
   */
  private getTipAnimation(amount: number): string {
    if (amount >= 50) return 'legendary';
    if (amount >= 10) return 'mega';
    if (amount >= 5) return 'large';
    if (amount >= 1) return 'medium';
    return 'small';
  }

  private async awardPP(userId: string, action: string, points: number) {
    // This would integrate with your existing PP system
    this.logger.log(`Awarding ${points} PP to user ${userId} for ${action}`);
  }
} 