import { 
  WebSocketGateway, 
  WebSocketServer, 
  SubscribeMessage, 
  MessageBody, 
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect 
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface SubscriptionUpdate {
  userId: string;
  subscriptionId: string;
  status: 'active' | 'cancelled' | 'past_due' | 'incomplete';
  plan: string;
  currentPeriodEnd: string;
  message: string;
}

interface BillingUpdate {
  userId: string;
  type: 'payment_succeeded' | 'payment_failed' | 'invoice_created' | 'plan_changed';
  amount?: number;
  currency?: string;
  message: string;
  data?: Record<string, any>;
}

interface UsageUpdate {
  userId: string;
  currentRequests: number;
  requestLimit: number;
  currentKeys: number;
  keyLimit: number;
  usagePercentage: number;
}

@WebSocketGateway({
  cors: {
    origin: ['https://n0de.pro', 'https://www.n0de.pro'],
    credentials: true,
  },
  namespace: '/',
})
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebsocketGateway.name);
  private userSockets = new Map<string, string[]>(); // userId -> socketIds[]

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    
    // Remove client from user socket tracking
    for (const [userId, socketIds] of this.userSockets.entries()) {
      const index = socketIds.indexOf(client.id);
      if (index > -1) {
        socketIds.splice(index, 1);
        if (socketIds.length === 0) {
          this.userSockets.delete(userId);
        }
        break;
      }
    }
  }

  @SubscribeMessage('join_user_room')
  handleJoinUserRoom(
    @MessageBody() data: { userId: string, token: string },
    @ConnectedSocket() client: Socket,
  ) {
    // In a production app, you'd verify the JWT token here
    const { userId } = data;
    
    // Join user-specific room
    client.join(`user_${userId}`);
    
    // Track user socket connections
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, []);
    }
    this.userSockets.get(userId)!.push(client.id);
    
    this.logger.log(`User ${userId} joined their room via socket ${client.id}`);
    
    // Send acknowledgment
    client.emit('joined_user_room', { success: true, userId });
  }

  @SubscribeMessage('get_live_metrics')
  handleGetLiveMetrics(@ConnectedSocket() client: Socket) {
    // Send real-time metrics (placeholder data)
    const metrics = {
      responseTime: Math.floor(Math.random() * 100) + 50,
      requestsPerSecond: Math.floor(Math.random() * 1000) + 500,
      successRate: 99.5 + Math.random() * 0.5,
      activeConnections: Math.floor(Math.random() * 100) + 50,
      timestamp: Date.now(),
    };
    
    client.emit('live_metrics', metrics);
  }

  // Broadcast subscription updates to specific user
  broadcastSubscriptionUpdate(update: SubscriptionUpdate) {
    this.server.to(`user_${update.userId}`).emit('subscription_update', {
      type: 'subscription_changed',
      data: update,
      timestamp: new Date().toISOString(),
    });
    
    this.logger.log(`Broadcast subscription update to user ${update.userId}: ${update.message}`);
  }

  // Broadcast billing updates to specific user
  broadcastBillingUpdate(update: BillingUpdate) {
    this.server.to(`user_${update.userId}`).emit('billing_update', {
      type: update.type,
      data: update,
      timestamp: new Date().toISOString(),
    });
    
    this.logger.log(`Broadcast billing update to user ${update.userId}: ${update.message}`);
  }

  // Broadcast usage updates to specific user
  broadcastUsageUpdate(update: UsageUpdate) {
    this.server.to(`user_${update.userId}`).emit('usage_update', {
      type: 'usage_stats',
      data: update,
      timestamp: new Date().toISOString(),
    });
    
    // Send warning if approaching limits
    if (update.usagePercentage > 80) {
      this.server.to(`user_${update.userId}`).emit('usage_warning', {
        type: 'approaching_limit',
        message: `You've used ${update.usagePercentage.toFixed(1)}% of your plan limits`,
        data: update,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Broadcast system-wide announcements
  broadcastSystemAnnouncement(message: string, type: 'info' | 'warning' | 'error' = 'info') {
    this.server.emit('system_announcement', {
      type,
      message,
      timestamp: new Date().toISOString(),
    });
    
    this.logger.log(`System announcement broadcasted: ${message}`);
  }

  // Get active user connection count
  getActiveUserCount(): number {
    return this.userSockets.size;
  }

  // Check if user is online
  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId);
  }
}