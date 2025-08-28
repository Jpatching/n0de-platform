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
import { ChatService } from './chat.service';

interface ChatClient extends Socket {
  playerId?: string;
  playerName?: string;
  gameType?: string;
}

@WebSocketGateway({
  cors: {
    origin: [
      'http://localhost:3000',
      'https://pv3-gaming.vercel.app',
      'https://pv3-gaming-w76jht43y-lowreyal70-gmailcoms-projects.vercel.app',
      'https://pv3-gaming-kopuvlu4b-lowreyal70-gmailcoms-projects.vercel.app',
      /^https:\/\/pv3-gaming-.*\.vercel\.app$/
    ],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private readonly connectedClients = new Map<string, ChatClient>();

  constructor(private readonly chatService: ChatService) {}

  afterInit(server: Server) {
    this.chatService.setServer(server);
    this.logger.log('💬 Chat WebSocket Gateway initialized');
    
    // Clean up rate limits every 5 minutes
    setInterval(() => {
      this.chatService.cleanupRateLimits();
    }, 300000);
  }

  async handleConnection(client: ChatClient) {
    this.logger.log(`💬 Chat client connected: ${client.id}`);
    this.connectedClients.set(client.id, client);
  }

  async handleDisconnect(client: ChatClient) {
    this.logger.log(`💬 Chat client disconnected: ${client.id}`);
    
    // Leave all rooms
    if (client.gameType) {
      client.leave(`${client.gameType}_chat`);
    }
    
    this.connectedClients.delete(client.id);
  }

  /**
   * Join a game chat room (public lobby chat)
   */
  @SubscribeMessage('join_game_chat')
  async handleJoinGameChat(
    @MessageBody() data: { gameType: string; playerId: string; playerName: string },
    @ConnectedSocket() client: ChatClient,
  ) {
    try {
      const { gameType, playerId, playerName } = data;

      // Validate game type
      const validGameTypes = ['mines', 'crash', 'rps', 'coinflip', 'chess', 'dice_duel'];
      if (!validGameTypes.includes(gameType)) {
        client.emit('chat_error', { message: 'Invalid game type' });
        return;
      }

      // Prevent duplicate joins - check if already in this room
      if (client.gameType === gameType) {
        this.logger.log(`💬 ${playerName} already in ${gameType} chat, skipping duplicate join`);
        client.emit('chat_joined', { 
          gameType, 
          roomName: `${gameType}_chat`, 
          message: `Already in ${gameType} chat` 
        });
        return;
      }

      // Leave previous room if in one
      if (client.gameType) {
        await client.leave(`${client.gameType}_chat`);
      }

      // Set client properties
      client.playerId = playerId;
      client.playerName = playerName;
      client.gameType = gameType;

      // Join game chat room
      const roomName = `${gameType}_chat`;
      await client.join(roomName);

      // Send recent messages to new client
      const recentMessages = this.chatService.getRecentMessages(gameType, 50);
      client.emit('chat_history', { messages: recentMessages });

      // Notify room about new player (only once)
      this.chatService.broadcastGameEvent(gameType, {
        type: 'player_join',
        message: `${playerName} joined the chat`,
        gameType,
        timestamp: Date.now(),
      });

      this.logger.log(`💬 ${playerName} joined ${gameType} chat`);
      
      client.emit('chat_joined', { 
        gameType, 
        roomName, 
        message: `Joined ${gameType} chat successfully` 
      });

    } catch (error) {
      this.logger.error('Error joining game chat:', error);
      client.emit('chat_error', { message: 'Failed to join chat' });
    }
  }

  /**
   * Join a private match chat room
   */
  @SubscribeMessage('join_match_chat')
  async handleJoinMatchChat(
    @MessageBody() data: { matchId: string; playerId: string; playerName: string },
    @ConnectedSocket() client: ChatClient,
  ) {
    try {
      const { matchId, playerId, playerName } = data;
      const matchGameType = `match_${matchId}`;

      // Prevent duplicate joins - check if already in this match room
      if (client.gameType === matchGameType) {
        this.logger.log(`💬 ${playerName} already in match chat: ${matchId}, skipping duplicate join`);
        client.emit('chat_joined', { 
          gameType: matchGameType, 
          roomName: `match_${matchId}_chat`, 
          message: `Already in match chat` 
        });
        return;
      }

      // Leave previous room if in one
      if (client.gameType) {
        await client.leave(`${client.gameType}_chat`);
      }

      // Set client properties
      client.playerId = playerId;
      client.playerName = playerName;
      client.gameType = matchGameType;

      // Join private match chat room
      const roomName = `match_${matchId}_chat`;
      await client.join(roomName);

      // Send recent messages to new client (match-specific)
      const recentMessages = this.chatService.getRecentMessages(matchGameType, 50);
      client.emit('chat_history', { messages: recentMessages });

      this.logger.log(`💬 ${playerName} joined private match chat: ${matchId}`);
      
      client.emit('chat_joined', { 
        gameType: matchGameType, 
        roomName, 
        message: `Joined private match chat successfully` 
      });

    } catch (error) {
      this.logger.error('Error joining match chat:', error);
      client.emit('chat_error', { message: 'Failed to join match chat' });
    }
  }

  /**
   * Send a chat message
   */
  @SubscribeMessage('send_chat_message')
  async handleSendMessage(
    @MessageBody() data: { message: string },
    @ConnectedSocket() client: ChatClient,
  ) {
    try {
      if (!client.playerId || !client.playerName || !client.gameType) {
        client.emit('chat_error', { message: 'Not connected to any game chat' });
        return;
      }

      const result = await this.chatService.addUserMessage(
        client.gameType,
        client.playerId,
        client.playerName,
        data.message
      );

      if (!result.success) {
        client.emit('chat_error', { message: result.error });
        return;
      }

      // Success response
      client.emit('message_sent', { success: true });

    } catch (error) {
      this.logger.error('Error sending chat message:', error);
      client.emit('chat_error', { message: 'Failed to send message' });
    }
  }

  /**
   * Add reaction to a message
   */
  @SubscribeMessage('add_chat_reaction')
  async handleAddReaction(
    @MessageBody() data: { 
      messageId: string; 
      reaction: '👍' | '💎' | '💣' | '🔥' | '😤' 
    },
    @ConnectedSocket() client: ChatClient,
  ) {
    try {
      if (!client.playerId || !client.gameType) {
        client.emit('chat_error', { message: 'Not connected to any game chat' });
        return;
      }

      const result = await this.chatService.addReaction(
        client.gameType,
        data.messageId,
        client.playerId,
        data.reaction
      );

      if (!result.success) {
        client.emit('chat_error', { message: result.error });
        return;
      }

      client.emit('reaction_added', { success: true });

    } catch (error) {
      this.logger.error('Error adding reaction:', error);
      client.emit('chat_error', { message: 'Failed to add reaction' });
    }
  }

  /**
   * Leave game chat
   */
  @SubscribeMessage('leave_game_chat')
  async handleLeaveGameChat(@ConnectedSocket() client: ChatClient) {
    try {
      if (client.gameType) {
        await client.leave(`${client.gameType}_chat`);
        this.logger.log(`💬 ${client.playerName} left ${client.gameType} chat`);
        
        // Clear client properties
        client.gameType = undefined;
        client.playerId = undefined;
        client.playerName = undefined;
        
        client.emit('chat_left', { message: 'Left chat successfully' });
      }
    } catch (error) {
      this.logger.error('Error leaving chat:', error);
      client.emit('chat_error', { message: 'Failed to leave chat' });
    }
  }

  /**
   * Leave match chat
   */
  @SubscribeMessage('leave_match_chat')
  async handleLeaveMatchChat(@ConnectedSocket() client: ChatClient) {
    try {
      if (client.gameType && client.gameType.startsWith('match_')) {
        await client.leave(`${client.gameType}_chat`);
        this.logger.log(`💬 ${client.playerName} left private match chat`);
        
        // Clear client properties
        client.gameType = undefined;
        client.playerId = undefined;
        client.playerName = undefined;
        
        client.emit('chat_left', { message: 'Left match chat successfully' });
      }
    } catch (error) {
      this.logger.error('Error leaving match chat:', error);
      client.emit('chat_error', { message: 'Failed to leave match chat' });
    }
  }

  /**
   * Get chat statistics (for debugging/monitoring)
   */
  @SubscribeMessage('get_chat_stats')
  async handleGetChatStats(@ConnectedSocket() client: ChatClient) {
    try {
      const stats = {
        connectedClients: this.connectedClients.size,
        rooms: Array.from(this.server.sockets.adapter.rooms.keys()),
        clientGameType: client.gameType,
        timestamp: Date.now(),
      };

      client.emit('chat_stats', stats);
    } catch (error) {
      this.logger.error('Error getting chat stats:', error);
      client.emit('chat_error', { message: 'Failed to get stats' });
    }
  }

  /**
   * Public method to broadcast game events from other services
   */
  public async broadcastGameEvent(gameType: string, event: any): Promise<void> {
    await this.chatService.broadcastGameEvent(gameType, event);
  }

  /**
   * Get display name for a player (username or truncated wallet)
   */
  private getDisplayName(playerId: string, username?: string): string {
    if (username && username.trim().length > 0) {
      return username;
    }
    
    // Truncate wallet address: Player_Abc1...23K
    if (playerId.length > 8) {
      return `Player_${playerId.slice(0, 4)}...${playerId.slice(-2)}`;
    }
    
    return `Player_${playerId}`;
  }

  /**
   * Handle WebRTC voice offer for voice chat
   */
  @SubscribeMessage('voice_offer')
  async handleVoiceOffer(
    @MessageBody() data: { offer: RTCSessionDescriptionInit; matchId: string; to: string },
    @ConnectedSocket() client: ChatClient,
  ) {
    try {
      if (!client.playerId || !client.playerName) {
        client.emit('chat_error', { message: 'Not connected to chat' });
        return;
      }

      const { offer, matchId, to } = data;
      const roomName = `match_${matchId}_chat`;

      // Broadcast offer to other player in the match room (excluding sender)
      client.to(roomName).emit('voice_offer', {
        offer,
        from: client.playerId,
        matchId
      });

      this.logger.log(`🎤 Voice offer from ${client.playerName} in match ${matchId}`);

    } catch (error) {
      this.logger.error('Error handling voice offer:', error);
      client.emit('chat_error', { message: 'Failed to send voice offer' });
    }
  }

  /**
   * Handle WebRTC voice answer for voice chat
   */
  @SubscribeMessage('voice_answer')
  async handleVoiceAnswer(
    @MessageBody() data: { answer: RTCSessionDescriptionInit; matchId: string; to: string },
    @ConnectedSocket() client: ChatClient,
  ) {
    try {
      if (!client.playerId || !client.playerName) {
        client.emit('chat_error', { message: 'Not connected to chat' });
        return;
      }

      const { answer, matchId, to } = data;
      const roomName = `match_${matchId}_chat`;

      // Send answer to the specific player who made the offer
      client.to(roomName).emit('voice_answer', {
        answer,
        from: client.playerId,
        matchId
      });

      this.logger.log(`🎤 Voice answer from ${client.playerName} in match ${matchId}`);

    } catch (error) {
      this.logger.error('Error handling voice answer:', error);
      client.emit('chat_error', { message: 'Failed to send voice answer' });
    }
  }

  /**
   * Handle WebRTC ICE candidate exchange
   */
  @SubscribeMessage('voice_ice_candidate')
  async handleVoiceIceCandidate(
    @MessageBody() data: { candidate: RTCIceCandidateInit; matchId: string },
    @ConnectedSocket() client: ChatClient,
  ) {
    try {
      if (!client.playerId) {
        client.emit('chat_error', { message: 'Not connected to chat' });
        return;
      }

      const { candidate, matchId } = data;
      const roomName = `match_${matchId}_chat`;

      // Broadcast ICE candidate to other player in the match room (excluding sender)
      client.to(roomName).emit('voice_ice_candidate', {
        candidate,
        from: client.playerId,
        matchId
      });

      this.logger.log(`🎤 ICE candidate from ${client.playerName} in match ${matchId}`);

    } catch (error) {
      this.logger.error('Error handling ICE candidate:', error);
      client.emit('chat_error', { message: 'Failed to exchange ICE candidate' });
    }
  }

  /**
   * Handle voice status updates (muted/unmuted, connected/disconnected)
   */
  @SubscribeMessage('voice_status_update')
  async handleVoiceStatusUpdate(
    @MessageBody() data: { matchId: string; connected: boolean; muted: boolean },
    @ConnectedSocket() client: ChatClient,
  ) {
    try {
      if (!client.playerId || !client.playerName) {
        client.emit('chat_error', { message: 'Not connected to chat' });
        return;
      }

      const { matchId, connected, muted } = data;
      const roomName = `match_${matchId}_chat`;

      // Broadcast voice status to other player in the match room (excluding sender)
      client.to(roomName).emit('voice_status_update', {
        playerId: client.playerId,
        playerName: client.playerName,
        connected,
        muted,
        matchId
      });

      this.logger.log(`🎤 Voice status update from ${client.playerName}: connected=${connected}, muted=${muted}`);

    } catch (error) {
      this.logger.error('Error handling voice status update:', error);
      client.emit('chat_error', { message: 'Failed to update voice status' });
    }
  }
} 