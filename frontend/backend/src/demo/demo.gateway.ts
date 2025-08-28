import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { DemoService } from './demo.service';
import { CreateDemoMatchDto } from './dto/create-demo-match.dto';
import { JoinDemoMatchDto } from './dto/join-demo-match.dto';
import { DemoMatchResultDto } from './dto/demo-match-result.dto';

interface DemoGameMove {
  matchId: string;
  playerId: string;
  move: any;
  timestamp: number;
}

interface DemoGameState {
  matchId: string;
  state: any;
  currentPlayer?: string;
  timestamp: number;
}

@WebSocketGateway({
  namespace: '/demo',
  cors: {
    origin: process.env.DEMO_CLIENT_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class DemoGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(DemoGateway.name);
  private readonly connectedClients = new Map<string, { playerId: string; matchId?: string }>();
  private readonly playerSockets = new Map<string, string>(); // playerId -> socketId

  constructor(private readonly demoService: DemoService) {}

  async handleConnection(client: Socket) {
    this.logger.log(`Demo client connected: ${client.id}`);
    
    // Get player ID from query params or generate one
    const playerId = client.handshake.query.playerId as string || `demo_${Math.random().toString(36).substr(2, 9)}`;
    
    this.connectedClients.set(client.id, { playerId });
    this.playerSockets.set(playerId, client.id);
    
    // Send player ID back to client
    client.emit('connected', { playerId });
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Demo client disconnected: ${client.id}`);
    
    const clientData = this.connectedClients.get(client.id);
    if (clientData) {
      this.playerSockets.delete(clientData.playerId);
      
      // Notify match if player was in one
      if (clientData.matchId) {
        client.to(`match:${clientData.matchId}`).emit('player_disconnected', {
          playerId: clientData.playerId,
          matchId: clientData.matchId,
        });
      }
    }
    
    this.connectedClients.delete(client.id);
  }

  @SubscribeMessage('demo:create_match')
  async handleCreateMatch(
    @MessageBody() dto: CreateDemoMatchDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const clientData = this.connectedClients.get(client.id);
      if (!clientData) {
        throw new WsException('Client not authenticated');
      }

      // Add player ID to DTO
      dto.playerId = clientData.playerId;

      const result = await this.demoService.createDemoMatch(dto);
      
      // Join the match room
      client.join(`match:${result.matchId}`);
      clientData.matchId = result.matchId;
      
      // Emit to creator
      client.emit('match_created', result);
      
      // Broadcast to all clients that a new match is available
      this.server.emit('match_available', {
        match: result.match,
        gameType: dto.gameType,
      });
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to create demo match: ${error.message}`);
      client.emit('error', { message: error.message });
      throw new WsException(error.message);
    }
  }

  @SubscribeMessage('demo:join_match')
  async handleJoinMatch(
    @MessageBody() data: { matchId: string; username?: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const clientData = this.connectedClients.get(client.id);
      if (!clientData) {
        throw new WsException('Client not authenticated');
      }

      const dto: JoinDemoMatchDto = {
        playerId: clientData.playerId,
        username: data.username,
      };

      const result = await this.demoService.joinDemoMatch(data.matchId, dto);
      
      // Join the match room
      client.join(`match:${data.matchId}`);
      clientData.matchId = data.matchId;
      
      // Notify both players
      this.server.to(`match:${data.matchId}`).emit('match_started', result.match);
      
      // Remove from available matches broadcast
      this.server.emit('match_unavailable', { matchId: data.matchId });
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to join demo match: ${error.message}`);
      client.emit('error', { message: error.message });
      throw new WsException(error.message);
    }
  }

  @SubscribeMessage('demo:game_move')
  async handleGameMove(
    @MessageBody() data: DemoGameMove,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const clientData = this.connectedClients.get(client.id);
      if (!clientData || clientData.playerId !== data.playerId) {
        throw new WsException('Unauthorized move');
      }

      // Broadcast move to other player in the match
      client.to(`match:${data.matchId}`).emit('opponent_move', data);
      
      // Echo back to sender for confirmation
      client.emit('move_confirmed', {
        ...data,
        confirmedAt: Date.now(),
      });
      
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to process game move: ${error.message}`);
      client.emit('error', { message: error.message });
      throw new WsException(error.message);
    }
  }

  @SubscribeMessage('demo:update_game_state')
  async handleUpdateGameState(
    @MessageBody() data: DemoGameState,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      // Broadcast game state to all players in the match
      this.server.to(`match:${data.matchId}`).emit('game_state_updated', data);
      
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to update game state: ${error.message}`);
      client.emit('error', { message: error.message });
      throw new WsException(error.message);
    }
  }

  @SubscribeMessage('demo:submit_result')
  async handleSubmitResult(
    @MessageBody() dto: DemoMatchResultDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const result = await this.demoService.submitDemoMatchResult(dto.matchId, dto);
      
      // Notify all players in the match
      this.server.to(`match:${dto.matchId}`).emit('match_completed', result.match);
      
      // Leave match room
      const socketsInRoom = await this.server.in(`match:${dto.matchId}`).fetchSockets();
      for (const socket of socketsInRoom) {
        socket.leave(`match:${dto.matchId}`);
      }
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to submit match result: ${error.message}`);
      client.emit('error', { message: error.message });
      throw new WsException(error.message);
    }
  }

  @SubscribeMessage('demo:get_available_matches')
  async handleGetAvailableMatches(
    @MessageBody() data: { gameType?: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const result = await this.demoService.getAvailableDemoMatches(data.gameType);
      client.emit('available_matches', result);
      return result;
    } catch (error) {
      this.logger.error(`Failed to get available matches: ${error.message}`);
      client.emit('error', { message: error.message });
      throw new WsException(error.message);
    }
  }

  @SubscribeMessage('demo:cancel_match')
  async handleCancelMatch(
    @MessageBody() data: { matchId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const result = await this.demoService.cancelDemoMatch(data.matchId);
      
      // Notify all players in the match
      this.server.to(`match:${data.matchId}`).emit('match_cancelled', {
        matchId: data.matchId,
        message: 'Match has been cancelled',
      });
      
      // Leave match room
      const socketsInRoom = await this.server.in(`match:${data.matchId}`).fetchSockets();
      for (const socket of socketsInRoom) {
        socket.leave(`match:${data.matchId}`);
      }
      
      // Broadcast that match is no longer available
      this.server.emit('match_unavailable', { matchId: data.matchId });
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to cancel match: ${error.message}`);
      client.emit('error', { message: error.message });
      throw new WsException(error.message);
    }
  }

  @SubscribeMessage('demo:chat_message')
  async handleChatMessage(
    @MessageBody() data: { matchId: string; playerId: string; message: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const clientData = this.connectedClients.get(client.id);
      if (!clientData || clientData.playerId !== data.playerId) {
        throw new WsException('Unauthorized');
      }

      // Broadcast chat message to all players in the match
      this.server.to(`match:${data.matchId}`).emit('chat_message', {
        playerId: data.playerId,
        message: data.message,
        timestamp: Date.now(),
      });
      
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to send chat message: ${error.message}`);
      client.emit('error', { message: error.message });
      throw new WsException(error.message);
    }
  }

  @SubscribeMessage('demo:typing')
  async handleTyping(
    @MessageBody() data: { matchId: string; playerId: string; isTyping: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      // Broadcast typing status to other players
      client.to(`match:${data.matchId}`).emit('opponent_typing', {
        playerId: data.playerId,
        isTyping: data.isTyping,
      });
      
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to broadcast typing status: ${error.message}`);
      throw new WsException(error.message);
    }
  }

  /**
   * Emit bot move to specific match
   * Called by bot service
   */
  emitBotMove(matchId: string, moveData: any) {
    this.server.to(`match:${matchId}`).emit('opponent_move', moveData);
  }

  /**
   * Emit bot joined match
   * Called by bot service
   */
  emitBotJoined(matchId: string, match: any) {
    this.server.to(`match:${matchId}`).emit('match_started', match);
    this.server.emit('match_unavailable', { matchId });
  }
}