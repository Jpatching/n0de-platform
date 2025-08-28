import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class RailwayStreamingService {
  private readonly logger = new Logger(RailwayStreamingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * ULTRA SIMPLE: Just create a stream record and let users stream via WebRTC
   */
  async startStream(streamerId: string, title: string, category: string) {
    // Generate a simple stream ID
    const streamId = `stream_${streamerId}_${Date.now()}`;
    
    // Create stream in database
    const stream = await this.prisma.stream.create({
      data: {
        id: streamId,
        streamerId,
        title,
        category,
        isLive: true,
        // For WebRTC, we just need the stream ID
        streamKey: streamId,
        rtmpUrl: `webrtc://${process.env.RAILWAY_PUBLIC_DOMAIN}/stream/${streamId}`,
        playbackUrl: `https://${process.env.RAILWAY_PUBLIC_DOMAIN}/watch/${streamId}`,
      },
    });

    return {
      streamId,
      message: 'Stream created! Users can watch at the playback URL.',
      playbackUrl: stream.playbackUrl,
      // For browser-based streaming (no OBS needed!)
      webrtcUrl: `https://${process.env.RAILWAY_PUBLIC_DOMAIN}/stream/${streamId}`,
    };
  }

  async getLiveStreams() {
    return await this.prisma.stream.findMany({
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
    });
  }

  async stopStream(streamerId: string, streamId: string) {
    await this.prisma.stream.updateMany({
      where: { id: streamId, streamerId },
      data: { isLive: false, endedAt: new Date() },
    });
  }
} 