import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

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
  namespace: '/bridge',
})
export class BridgeWebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(BridgeWebSocketGateway.name);
  private activeConnections = new Map<string, Socket>();
  private transactionSubscriptions = new Map<string, Set<string>>(); // transactionId -> socketIds

  handleConnection(client: Socket) {
    this.logger.log(`🔌 Bridge WebSocket client connected: ${client.id}`);
    this.activeConnections.set(client.id, client);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`🔌 Bridge WebSocket client disconnected: ${client.id}`);
    this.activeConnections.delete(client.id);
    
    // Clean up transaction subscriptions
    for (const [transactionId, socketIds] of this.transactionSubscriptions.entries()) {
      socketIds.delete(client.id);
      if (socketIds.size === 0) {
        this.transactionSubscriptions.delete(transactionId);
      }
    }
  }

  @SubscribeMessage('subscribe-bridge-transaction')
  handleSubscribeBridgeTransaction(
    @MessageBody() data: { transactionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { transactionId } = data;
    
    if (!this.transactionSubscriptions.has(transactionId)) {
      this.transactionSubscriptions.set(transactionId, new Set());
    }
    
    this.transactionSubscriptions.get(transactionId)!.add(client.id);
    
    this.logger.log(`📡 Client ${client.id} subscribed to bridge transaction: ${transactionId}`);
    
    // Send current status immediately
    this.sendTransactionUpdate(transactionId);
  }

  @SubscribeMessage('unsubscribe-bridge-transaction')
  handleUnsubscribeBridgeTransaction(
    @MessageBody() data: { transactionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { transactionId } = data;
    
    if (this.transactionSubscriptions.has(transactionId)) {
      this.transactionSubscriptions.get(transactionId)!.delete(client.id);
      
      if (this.transactionSubscriptions.get(transactionId)!.size === 0) {
        this.transactionSubscriptions.delete(transactionId);
      }
    }
    
    this.logger.log(`📡 Client ${client.id} unsubscribed from bridge transaction: ${transactionId}`);
  }

  // Called by monitoring service when transaction status changes
  async sendTransactionUpdate(transactionId: string, status?: any) {
    const socketIds = this.transactionSubscriptions.get(transactionId);
    if (!socketIds || socketIds.size === 0) return;

    try {
      // Mock status for now - in real implementation would get from monitoring service
      const transactionStatus = status || {
        id: transactionId,
        status: 'bridging',
        progress: 50,
        currentStep: 'Processing through Wormhole bridge...',
        estimatedTimeRemaining: '2 minutes',
      };
      
      // Send to all subscribed clients
      for (const socketId of socketIds) {
        const socket = this.activeConnections.get(socketId);
        if (socket) {
          socket.emit('bridge-transaction-update', {
            transactionId,
            ...transactionStatus,
            timestamp: new Date().toISOString(),
          });
        }
      }

      this.logger.log(`📡 Sent bridge update for ${transactionId} to ${socketIds.size} clients`);
    } catch (error) {
      this.logger.error(`❌ Failed to send bridge update for ${transactionId}:`, error);
    }
  }

  // Broadcast bridge completion to session vault
  async broadcastBridgeCompletion(transactionId: string, userPublicKey: string, amount: string) {
    const socketIds = this.transactionSubscriptions.get(transactionId);
    if (!socketIds || socketIds.size === 0) return;

    const completionData = {
      transactionId,
      userPublicKey,
      amount,
      status: 'completed',
      message: `${amount} SOL added to your gaming account!`,
      timestamp: new Date().toISOString(),
    };

    for (const socketId of socketIds) {
      const socket = this.activeConnections.get(socketId);
      if (socket) {
        socket.emit('bridge-completed', completionData);
      }
    }

    this.logger.log(`🎉 Broadcasted bridge completion for ${transactionId}`);
  }

  // Broadcast bridge failure
  async broadcastBridgeFailure(transactionId: string, error: string) {
    const socketIds = this.transactionSubscriptions.get(transactionId);
    if (!socketIds || socketIds.size === 0) return;

    const failureData = {
      transactionId,
      status: 'failed',
      error,
      timestamp: new Date().toISOString(),
    };

    for (const socketId of socketIds) {
      const socket = this.activeConnections.get(socketId);
      if (socket) {
        socket.emit('bridge-failed', failureData);
      }
    }

    this.logger.error(`❌ Broadcasted bridge failure for ${transactionId}: ${error}`);
  }
} 