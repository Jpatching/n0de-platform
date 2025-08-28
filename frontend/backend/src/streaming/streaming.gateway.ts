import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { StreamingService, TipInfo } from './streaming.service';
import { PrestigeService } from '../social/prestige.service';

export interface ChatMessage {
  id: string;
  streamId: string;
  userId: string;
  username: string;
  message: string;
  timestamp: Date;
  isHighlighted: boolean;
  prestige: number;
  isSubscriber: boolean;
  isModerator: boolean;
  tipAmount?: number;
}

export interface StreamEvent {
  type: 'tip' | 'subscription' | 'follow' | 'viewer_join' | 'viewer_leave' | 'stream_start' | 'stream_end';
  streamId: string;
  data: any;
  timestamp: Date;
}

@WebSocketGateway({
  cors: {
    origin: [
      'http://localhost:3000',
      'https://pv3-frontend.vercel.app',
      'https://pv3-gaming.vercel.app',
      'https://pv3-gaming-of16zi287-lowreyal70-gmailcoms-projects.vercel.app',
      /^https:\/\/pv3-gaming-.*\.vercel\.app$/
    ],
    credentials: true,
  },
  namespace: '/streaming',
})
export class StreamingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(StreamingGateway.name);
  private connectedUsers: Map<string, Socket> = new Map();
  private streamRooms: Map<string, Set<string>> = new Map();
  private userStreams: Map<string, string> = new Map(); // userId -> streamId

  constructor(
    @Inject(forwardRef(() => StreamingService))
    private readonly streamingService: StreamingService,
    private readonly prestigeService: PrestigeService,
  ) {}

  async handleConnection(client: Socket) {
    this.logger.log(`🔌 Client connected to streaming: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`🔌 Client disconnected from streaming: ${client.id}`);
    
    // Find user by socket
    let disconnectedUserId: string | null = null;
    for (const [userId, socket] of this.connectedUsers.entries()) {
      if (socket.id === client.id) {
        disconnectedUserId = userId;
        break;
      }
    }

    if (disconnectedUserId) {
      // Remove from stream room
      const streamId = this.userStreams.get(disconnectedUserId);
      if (streamId) {
        await this.handleLeaveStream(client, { streamId, userId: disconnectedUserId });
      }

      // Clean up
      this.connectedUsers.delete(disconnectedUserId);
      this.userStreams.delete(disconnectedUserId);
    }
  }

  /**
   * Join a stream room
   */
  @SubscribeMessage('join_stream')
  async handleJoinStream(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { streamId: string; userId: string }
  ) {
    try {
      const { streamId, userId } = data;

      // Verify stream exists
      const stream = await this.streamingService.getStream(streamId);
      if (!stream) {
        client.emit('error', { message: 'Stream not found' });
        return;
      }

      // Join stream via service (handles prestige checks, etc.)
      await this.streamingService.joinStream(streamId, userId);

      // Join socket room
      client.join(streamId);
      this.connectedUsers.set(userId, client);
      this.userStreams.set(userId, streamId);

      // Add to stream room tracking
      if (!this.streamRooms.has(streamId)) {
        this.streamRooms.set(streamId, new Set());
      }
      this.streamRooms.get(streamId)!.add(userId);

      // Notify other viewers
      client.to(streamId).emit('viewer_joined', {
        userId,
        viewerCount: stream.viewerCount,
        timestamp: Date.now(),
      });

      // Send current stream state to new viewer
      client.emit('stream_joined', {
        stream,
        viewerCount: stream.viewerCount,
        timestamp: Date.now(),
      });

      // Award PP for joining stream
      await this.prestigeService.awardProofPoints(userId, 1, 'stream_join');

      this.logger.log(`👀 User ${userId} joined stream ${streamId}`);
    } catch (error) {
      this.logger.error(`Error joining stream: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }

  /**
   * Leave a stream room
   */
  @SubscribeMessage('leave_stream')
  async handleLeaveStream(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { streamId: string; userId: string }
  ) {
    try {
      const { streamId, userId } = data;

      // Leave stream via service
      await this.streamingService.leaveStream(streamId, userId);

      // Leave socket room
      client.leave(streamId);

      // Remove from tracking
      const streamRoom = this.streamRooms.get(streamId);
      if (streamRoom) {
        streamRoom.delete(userId);
        if (streamRoom.size === 0) {
          this.streamRooms.delete(streamId);
        }
      }

      this.userStreams.delete(userId);

      // Get updated viewer count
      const stream = await this.streamingService.getStream(streamId);
      const viewerCount = stream ? stream.viewerCount : 0;

      // Notify other viewers
      client.to(streamId).emit('viewer_left', {
        userId,
        viewerCount,
        timestamp: Date.now(),
      });

      this.logger.log(`👋 User ${userId} left stream ${streamId}`);
    } catch (error) {
      this.logger.error(`Error leaving stream: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }

  /**
   * Send chat message
   */
  @SubscribeMessage('send_chat')
  async handleSendChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { streamId: string; userId: string; message: string; tipAmount?: number }
  ) {
    try {
      const { streamId, userId, message, tipAmount } = data;

      // Verify stream exists
      const stream = await this.streamingService.getStream(streamId);
      if (!stream) {
        client.emit('error', { message: 'Stream not found' });
        return;
      }

      // Get user info (would need to be passed or fetched)
      // For now, simplified
      const chatMessage: ChatMessage = {
        id: `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        streamId,
        userId,
        username: `User${userId.substr(-4)}`, // Simplified
        message,
        timestamp: new Date(),
        isHighlighted: !!tipAmount,
        prestige: 0, // Would fetch from user
        isSubscriber: false, // Would check subscription
        isModerator: false, // Would check moderator status
        tipAmount,
      };

      // Process tip if included
      if (tipAmount && tipAmount > 0) {
        try {
          const tip = await this.streamingService.sendTip(streamId, userId, tipAmount, message);
          
          // Broadcast tip notification
          this.server.to(streamId).emit('tip_received', {
            tip,
            chatMessage,
            timestamp: Date.now(),
          });
        } catch (tipError) {
          client.emit('error', { message: `Tip failed: ${tipError.message}` });
          return;
        }
      }

      // Broadcast chat message to all viewers
      this.server.to(streamId).emit('chat_message', chatMessage);

      // Award PP for chat participation
      await this.prestigeService.awardProofPoints(userId, 5, 'stream_chat');

      this.logger.log(`💬 Chat message in stream ${streamId} from ${userId}: ${message}${tipAmount ? ` (tip: ${tipAmount} SOL)` : ''}`);
    } catch (error) {
      this.logger.error(`Error sending chat: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }

  /**
   * Send tip (standalone, not with chat)
   */
  @SubscribeMessage('send_tip')
  async handleSendTip(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { streamId: string; userId: string; amount: number; message?: string }
  ) {
    try {
      const { streamId, userId, amount, message } = data;

      const tip = await this.streamingService.sendTip(streamId, userId, amount, message);

      // Broadcast tip to all viewers with animation
      this.server.to(streamId).emit('tip_received', {
        tip,
        animation: tip.animationType,
        timestamp: Date.now(),
      });

      // Send confirmation to tipper
      client.emit('tip_sent', {
        tip,
        timestamp: Date.now(),
      });

      this.logger.log(`💰 Tip sent: ${amount} SOL from ${userId} to stream ${streamId}`);
    } catch (error) {
      this.logger.error(`Error sending tip: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }

  /**
   * Subscribe to streamer
   */
  @SubscribeMessage('subscribe')
  async handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { streamId: string; userId: string; tier: number; monthlyAmount: number }
  ) {
    try {
      const { streamId, userId, tier, monthlyAmount } = data;

      const subscription = await this.streamingService.subscribe(
        streamId,
        userId,
        tier,
        monthlyAmount
      );

      // Broadcast subscription to all viewers
      this.server.to(streamId).emit('new_subscriber', {
        subscription,
        timestamp: Date.now(),
      });

      // Send confirmation to subscriber
      client.emit('subscribed', {
        subscription,
        timestamp: Date.now(),
      });

      this.logger.log(`🔔 New subscription: ${userId} subscribed to stream ${streamId} for ${monthlyAmount} SOL/month`);
    } catch (error) {
      this.logger.error(`Error subscribing: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }

  /**
   * Update stream settings (streamer only)
   */
  @SubscribeMessage('update_stream_settings')
  async handleUpdateStreamSettings(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { 
      streamId: string; 
      userId: string; 
      settings: {
        subscribersOnly?: boolean;
        slowMode?: number;
        emoteOnly?: boolean;
        followersOnly?: boolean;
      }
    }
  ) {
    try {
      const { streamId, userId, settings } = data;

      // Verify user is the streamer
      const stream = await this.streamingService.getStream(streamId);
      if (!stream || stream.streamerId !== userId) {
        client.emit('error', { message: 'Unauthorized' });
        return;
      }

      // Update settings (would need to implement in service)
      // For now, just broadcast the change
      this.server.to(streamId).emit('stream_settings_updated', {
        settings,
        timestamp: Date.now(),
      });

      this.logger.log(`⚙️ Stream settings updated for ${streamId}`);
    } catch (error) {
      this.logger.error(`Error updating stream settings: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }

  /**
   * Broadcast stream event to all viewers
   */
  async broadcastStreamEvent(streamId: string, event: StreamEvent): Promise<void> {
    this.server.to(streamId).emit('stream_event', event);
    this.logger.log(`📡 Broadcasted event to stream ${streamId}: ${event.type}`);
  }

  /**
   * Broadcast specific data to all viewers of a stream
   */
  async broadcastToStream(streamId: string, eventType: string, data: any): Promise<void> {
    this.server.to(streamId).emit(eventType, data);
    this.logger.log(`📡 Broadcasted ${eventType} to stream ${streamId}`);
  }

  /**
   * Notify stream start
   */
  async notifyStreamStart(streamId: string): Promise<void> {
    const event: StreamEvent = {
      type: 'stream_start',
      streamId,
      data: { streamId },
      timestamp: new Date(),
    };
    
    // Broadcast to all connected users (not just stream room)
    this.server.emit('stream_started', event);
  }

  /**
   * Notify stream end
   */
  async notifyStreamEnd(streamId: string): Promise<void> {
    const event: StreamEvent = {
      type: 'stream_end',
      streamId,
      data: { streamId },
      timestamp: new Date(),
    };
    
    // Broadcast to stream room
    this.server.to(streamId).emit('stream_ended', event);
    
    // Clean up room
    this.streamRooms.delete(streamId);
  }

  /**
   * Get connected viewers for a stream
   */
  getStreamViewers(streamId: string): string[] {
    const viewers = this.streamRooms.get(streamId);
    return viewers ? Array.from(viewers) : [];
  }

  /**
   * Get total connected users
   */
  getTotalConnectedUsers(): number {
    return this.connectedUsers.size;
  }
} 