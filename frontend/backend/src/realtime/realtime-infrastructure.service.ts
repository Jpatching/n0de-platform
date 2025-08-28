import { Injectable, Logger } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameType, getGameCategory, GameCategory } from '../games/game-types';
import { GameFactoryService } from '../games/game-factory.service';

export interface RealtimePlayer {
  id: string;
  socket: Socket;
  matchId: string;
  gameType: GameType;
  lastActivity: number;
}

export interface RealtimeMatch {
  id: string;
  gameType: GameType;
  players: Map<string, RealtimePlayer>;
  gameServer: any;
  startTime: number;
  lastActivity: number;
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  namespace: '/realtime'
})
export class RealtimeInfrastructureService implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeInfrastructureService.name);
  private activeMatches: Map<string, RealtimeMatch> = new Map();
  private playerSockets: Map<string, Socket> = new Map();

  constructor(
    private gameFactoryService: GameFactoryService,
  ) {}

  async handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    await this.handlePlayerDisconnect(client);
  }

  /**
   * Join a real-time match
   */
  @SubscribeMessage('join-realtime-match')
  async handleJoinMatch(client: Socket, data: { matchId: string; playerId: string; gameType: GameType }) {
    try {
      const { matchId, playerId, gameType } = data;
      
      // Validate game type is real-time
      const category = getGameCategory(gameType);
      if (category === GameCategory.TurnBased) {
        client.emit('error', { message: 'Game type is not real-time' });
        return;
      }

      // Get or create match
      let match = this.activeMatches.get(matchId);
      if (!match) {
        match = await this.createRealtimeMatch(matchId, gameType);
      }

      // Add player to match
      const player: RealtimePlayer = {
        id: playerId,
        socket: client,
        matchId,
        gameType,
        lastActivity: Date.now(),
      };

      match.players.set(playerId, player);
      this.playerSockets.set(playerId, client);

      // Join socket room
      client.join(matchId);

      // Start game if both players connected
      if (match.players.size === 2) {
        await this.startRealtimeGame(match);
      }

      client.emit('joined-match', { matchId, playersConnected: match.players.size });
      
      this.logger.log(`Player ${playerId} joined match ${matchId}`);
    } catch (error) {
      this.logger.error(`Error joining match: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }

  /**
   * Handle player input during real-time game
   */
  @SubscribeMessage('game-input')
  async handleGameInput(client: Socket, data: { matchId: string; playerId: string; input: any }) {
    try {
      const { matchId, playerId, input } = data;
      
      const match = this.activeMatches.get(matchId);
      if (!match) {
        client.emit('error', { message: 'Match not found' });
        return;
      }

      const player = match.players.get(playerId);
      if (!player) {
        client.emit('error', { message: 'Player not in match' });
        return;
      }

      // Update player activity
      player.lastActivity = Date.now();
      match.lastActivity = Date.now();

      // Process input through game service
      this.gameFactoryService.handlePlayerInput(match.gameType, playerId, input);

      // Get updated game state
      const gameState = this.gameFactoryService.getGameState(match.gameType, matchId);

      // Broadcast game state to all players in match
      this.server.to(matchId).emit('game-state-update', {
        matchId,
        gameState,
        timestamp: Date.now(),
      });

    } catch (error) {
      this.logger.error(`Error handling game input: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }

  /**
   * Handle game completion
   */
  @SubscribeMessage('game-complete')
  async handleGameComplete(client: Socket, data: { matchId: string; result: any }) {
    try {
      const { matchId, result } = data;
      
      const match = this.activeMatches.get(matchId);
      if (!match) {
        client.emit('error', { message: 'Match not found' });
        return;
      }

      // Validate result through game service
      const validation = await this.gameFactoryService.validateResult(match.gameType, result);
      
      if (!validation.isValid) {
        client.emit('error', { message: 'Invalid game result' });
        return;
      }

      // Broadcast result to all players
      this.server.to(matchId).emit('game-completed', {
        matchId,
        result: validation,
        timestamp: Date.now(),
      });

      // Clean up match
      await this.cleanupMatch(matchId);

      this.logger.log(`Match ${matchId} completed`);
    } catch (error) {
      this.logger.error(`Error completing game: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }

  /**
   * Create a new real-time match
   */
  private async createRealtimeMatch(matchId: string, gameType: GameType): Promise<RealtimeMatch> {
    const gameServer = await this.gameFactoryService.startGameServer(gameType, matchId);
    
    const match: RealtimeMatch = {
      id: matchId,
      gameType,
      players: new Map(),
      gameServer,
      startTime: Date.now(),
      lastActivity: Date.now(),
    };

    this.activeMatches.set(matchId, match);
    return match;
  }

  /**
   * Start real-time game when both players connected
   */
  private async startRealtimeGame(match: RealtimeMatch): Promise<void> {
    try {
      await match.gameServer.start();
      
      // Notify all players that game is starting
      this.server.to(match.id).emit('game-starting', {
        matchId: match.id,
        gameType: match.gameType,
        players: Array.from(match.players.keys()),
        timestamp: Date.now(),
      });

      this.logger.log(`Started real-time game for match ${match.id}`);
    } catch (error) {
      this.logger.error(`Error starting real-time game: ${error.message}`);
      this.server.to(match.id).emit('error', { message: 'Failed to start game' });
    }
  }

  /**
   * Handle player disconnect
   */
  private async handlePlayerDisconnect(client: Socket): Promise<void> {
    // Find player by socket
    let disconnectedPlayerId: string | null = null;
    for (const [playerId, socket] of this.playerSockets.entries()) {
      if (socket.id === client.id) {
        disconnectedPlayerId = playerId;
        break;
      }
    }

    if (!disconnectedPlayerId) return;

    // Find match
    let playerMatch: RealtimeMatch | null = null;
    for (const match of this.activeMatches.values()) {
      if (match.players.has(disconnectedPlayerId)) {
        playerMatch = match;
        break;
      }
    }

    if (!playerMatch) return;

    // Remove player from match
    playerMatch.players.delete(disconnectedPlayerId);
    this.playerSockets.delete(disconnectedPlayerId);

    // Notify other players
    this.server.to(playerMatch.id).emit('player-disconnected', {
      matchId: playerMatch.id,
      playerId: disconnectedPlayerId,
      timestamp: Date.now(),
    });

    // If no players left, cleanup match
    if (playerMatch.players.size === 0) {
      await this.cleanupMatch(playerMatch.id);
    }

    this.logger.log(`Player ${disconnectedPlayerId} disconnected from match ${playerMatch.id}`);
  }

  /**
   * Clean up match resources
   */
  private async cleanupMatch(matchId: string): Promise<void> {
    const match = this.activeMatches.get(matchId);
    if (!match) return;

    try {
      // Stop game server
      if (match.gameServer && match.gameServer.stop) {
        await match.gameServer.stop();
      }

      // Remove all players from socket rooms
      for (const player of match.players.values()) {
        player.socket.leave(matchId);
        this.playerSockets.delete(player.id);
      }

      // Remove match
      this.activeMatches.delete(matchId);

      this.logger.log(`Cleaned up match ${matchId}`);
    } catch (error) {
      this.logger.error(`Error cleaning up match ${matchId}: ${error.message}`);
    }
  }

  /**
   * Get active matches (for monitoring)
   */
  getActiveMatches(): RealtimeMatch[] {
    return Array.from(this.activeMatches.values());
  }

  /**
   * Get match by ID
   */
  getMatch(matchId: string): RealtimeMatch | undefined {
    return this.activeMatches.get(matchId);
  }
} 