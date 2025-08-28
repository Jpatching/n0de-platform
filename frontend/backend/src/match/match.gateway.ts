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
import { forwardRef, Inject } from '@nestjs/common';
import { MatchService } from './match.service';
import { Logger } from '@nestjs/common';
import { RedisWebSocketService } from '../common/redis-websocket.service';
import { AuthService } from '../auth/auth.service';
import { MinesSyncValidationService } from '../games/mines-sync-validation.service';
import { ConnectionRecoveryService } from '../common/connection-recovery.service';
import { PnLService } from '../pnl/pnl.service';

interface GameMove {
  matchId: string;
  playerId: string;
  moveData: any;
  timestamp: number;
}

interface GameState {
  matchId: string;
  state: any;
  timestamp: number;
}

interface ClientData {
  id: string;
  socket: Socket;
  userId: string | null;
  currentMatch: string | null;
  joinedAt: number;
  lastActivity: number;
  ipAddress: string;
}

interface ConnectionHealth {
  lastPing: number;
  responseTime: number | null;
  isHealthy: boolean;
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
  // 🔧 PHASE 4: Enhanced WebSocket configuration for maximum performance
  transports: ['websocket', 'polling'], // WebSocket first for better performance
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 30000,
  maxHttpBufferSize: 1e6, // 1MB
  compression: true,
  perMessageDeflate: {
    threshold: 1024,
    concurrencyLimit: 10,
    memLevel: 7
  }
})
export class MatchGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedPlayers: Map<string, Socket> = new Map();
  private matchRooms: Map<string, Set<string>> = new Map();
  private readonly logger = new Logger(MatchGateway.name);

  // 🚀 PHASE 4: Advanced Performance Optimizations
  private readonly connectionPool: Map<string, { 
    socket: Socket; 
    lastActivity: number; 
    messageCount: number;
    compressionSupported: boolean;
    clientCapabilities: any;
  }> = new Map();
  
  private readonly messageRateLimit: Map<string, { count: number; resetTime: number }> = new Map();
  private readonly MAX_MESSAGES_PER_MINUTE = 120; // Increased for better UX
  private readonly CLEANUP_INTERVAL = 300000; // 5 minutes

  // 🚀 PERFORMANCE: Smart message batching with compression
  private readonly messageBatch: Map<string, {
    messages: any[];
    timeout: NodeJS.Timeout;
    priority: 'high' | 'normal' | 'low';
    compressionEnabled: boolean;
  }> = new Map();
  private readonly BATCH_SIZE = 8; // Optimized batch size
  private readonly BATCH_TIMEOUT = 50; // Faster batching for gaming

  // 🚀 PERFORMANCE: Connection health monitoring with detailed metrics
  private readonly connectionHealth: Map<string, { 
    lastPing: number; 
    rtt: number;
    packetLoss: number;
    connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
    responseTime: number | null;
    isHealthy: boolean;
    adaptiveSettings: {
      batchSize: number;
      compressionThreshold: number;
      updateFrequency: number;
    };
  }> = new Map();

  // 🚀 PERFORMANCE: Game-specific optimizations
  private readonly gameOptimizations = {
    crash: {
      compressionThreshold: 512,
      batchSize: 10,
      updateFrequency: 16 // 60fps for crash games
    },
    mines: {
      compressionThreshold: 384,
      batchSize: 8,
      updateFrequency: 16 // 🎯 60fps for mines - CRITICAL for smooth gameplay
    },
    coinflip: {
      compressionThreshold: 256,
      batchSize: 5,
      updateFrequency: 100 // Less frequent for turn-based
    },
    chess: {
      compressionThreshold: 1024,
      batchSize: 3,
      updateFrequency: 200 // Chess moves are infrequent
    },
    rps: {
      compressionThreshold: 256,
      batchSize: 5,
      updateFrequency: 100
    },
    'dice-duel': {
      compressionThreshold: 512,
      batchSize: 6,
      updateFrequency: 150
    }
  };

  private readonly HEARTBEAT_INTERVAL = 25000; // 25 seconds (reduced from 30s)
  private readonly CONNECTION_TIMEOUT = 60000; // 60 seconds
  private readonly MAX_CONNECTIONS_PER_IP = 10; // Prevent connection flooding

  // Connection rate limiting
  private connectionCounts = new Map<string, number>();
  private lastCleanup = Date.now();

  private clients = new Map<string, Socket>();
  private clientData = new Map<string, ClientData>();
  private gameRooms = new Map<string, Set<string>>();
  private heartbeatIntervals = new Map<string, NodeJS.Timeout>();

  // 🎯 ACTIVE GAME ABANDONMENT DETECTION WITH SMART TIMEOUTS
  private activeGamePlayers = new Map<string, Set<string>>(); // matchId -> Set<playerIds>
  private gameAbandonmentTimers = new Map<string, NodeJS.Timeout>();
  private playerLastActivity = new Map<string, number>(); // playerId -> timestamp
  private matchGameTypes = new Map<string, string>(); // matchId -> gameType
  
  // 🎮 GAME-SPECIFIC ABANDONMENT TIMEOUTS
  private readonly GAME_ABANDONMENT_TIMEOUTS = {
    'chess': 300000,        // 5 minutes - plenty of time for thinking
    'coin-flip': 30000,     // 30 seconds - simple choice
    'rock-paper-scissors': 45000, // 45 seconds - quick decision
    'crash': 50000,         // 50 seconds - covers longest crash rounds (40s+ buffer)
    'mines': 60000,         // 1 minute - tactical thinking
    'dice-duel': 45000,     // 45 seconds - simple roll
    'default': 60000        // 1 minute default
  };
  
  // 💰 ABANDONMENT PENALTY: 50% to platform, 50% to winner (instead of full pot)
  private readonly ABANDONMENT_PENALTY_RATE = 0.5; // 50% of abandoned player's stake

  constructor(
    @Inject(forwardRef(() => MatchService))
    private readonly matchService: MatchService,
    private readonly redisWebSocketService: RedisWebSocketService,
    private readonly authService: AuthService,
    private readonly syncValidationService: MinesSyncValidationService,
    private readonly connectionRecoveryService: ConnectionRecoveryService,
    private readonly pnlService: PnLService,
  ) {
    // Enhanced cleanup with performance monitoring
    setInterval(() => {
      this.performAdvancedCleanup();
    }, this.CLEANUP_INTERVAL);

    // 🚀 PERFORMANCE: Connection quality monitoring
    setInterval(() => {
      this.monitorConnectionQuality();
    }, 30000); // Check every 30 seconds

    // 🚀 PERFORMANCE: Adaptive optimization based on load
    setInterval(() => {
      this.optimizeBasedOnLoad();
    }, 60000); // Optimize every minute
  }

  afterInit(server: Server) {
    this.logger.log('🔌 Match WebSocket Gateway initialized');
    
    // 🚀 PERFORMANCE: Optimize WebSocket server settings
    server.engine.generateId = () => {
      // Use shorter, more efficient client IDs
      return Math.random().toString(36).substring(2, 15);
    };
    
    // Connection cleanup interval
    setInterval(() => {
      this.cleanupStaleConnections();
      this.cleanupConnectionCounts();
    }, 60000); // Every minute
  }

  handleConnection(client: Socket) {
    const clientIp = this.getClientIP(client);
    
    // 🚀 PERFORMANCE: Rate limiting per IP
    if (this.shouldRateLimit(clientIp)) {
      this.logger.warn(`🚫 Connection rate limited for IP: ${clientIp}`);
      client.emit('error', { message: 'Too many connections from this IP' });
      client.disconnect();
      return;
    }

    const clientId = client.id;
    this.logger.log(`👤 Client connected: ${clientId} from ${clientIp}`);

    this.clients.set(clientId, client);
    this.clientData.set(clientId, {
      id: clientId,
      socket: client,
      userId: null,
      currentMatch: null,
      joinedAt: Date.now(),
      lastActivity: Date.now(),
      ipAddress: clientIp
    });

    // 🚀 PERFORMANCE: Optimized heartbeat with immediate ping
    this.startHeartbeat(clientId);
    
    // Send immediate connection confirmation
    client.emit('connected', { 
      clientId, 
      timestamp: Date.now(),
      serverVersion: '1.0.0'
    });

    // Track connection count
    this.incrementConnectionCount(clientIp);
  }

  handleDisconnect(client: Socket) {
    console.log(`🔌 Client disconnected: ${client.id}`);
    
    // 🔄 Use connection recovery service to handle disconnection
    const disconnectedPlayerId = this.connectionRecoveryService.handleDisconnection(client.id);
    
    // Get player ID from existing map (fallback)
    const fallbackPlayerId = this.getPlayerFromConnectedMap(client.id);
    const playerId = disconnectedPlayerId || fallbackPlayerId;
    
    // 🎯 CRITICAL: Handle active game abandonment FIRST
    if (playerId) {
      this.handleActiveGameAbandonment(playerId);
    }
    
    // Remove from all match rooms
    for (const [matchId, players] of this.matchRooms.entries()) {
      if (players.has(client.id)) {
        players.delete(client.id);
        
        // 🔧 FIX: Mines-specific disconnect handling
        if (playerId) {
          this.handleMinesDisconnect(matchId, playerId);
        }
        
        this.server.to(matchId).emit('player_disconnected', {
          playerId: playerId || client.id,
          matchId,
        });
        
        if (players.size === 0) {
          this.matchRooms.delete(matchId);
        }
      }
    }
    
    // 🔧 FIX: Remove from connectedPlayers by wallet address, not socket ID
    if (playerId) {
      this.connectedPlayers.delete(playerId);
    }
  }

  // 🔧 FIX: Handle mines-specific cleanup when player disconnects
  private async handleMinesDisconnect(matchId: string, playerId: string): Promise<void> {
    try {
      // Check if this is a mines match
      const gameState = await this.matchService.getMinesGameState(matchId);
      if (!gameState) return;

      this.logger.log(`💣 Handling mines disconnect for player ${playerId} in match ${matchId}`);

      // Clear player readiness for this match
      await this.matchService.clearPlayerReadiness(matchId);

      // Check if we're in a transitional state (waiting for ready)
      const currentRound = gameState.rounds[gameState.rounds.length - 1];
      const isWaitingForReady = currentRound && 
        currentRound.player1Turn && 
        currentRound.player2Turn && 
        !gameState.matchComplete;

      if (isWaitingForReady) {
        this.logger.log(`⏰ Player disconnected during ready phase - extending timeout for match ${matchId}`);
        
        // Give the remaining player 30 seconds before force starting
        setTimeout(async () => {
          try {
            // Check if player reconnected
            const isStillDisconnected = !this.connectedPlayers.has(playerId);
            if (isStillDisconnected) {
              this.logger.log(`⏰ Force starting next round due to disconnect timeout for match ${matchId}`);
              
              const nextRoundResult = await this.matchService.startMinesRound(matchId);
              if (nextRoundResult.success) {
                this.server.to(matchId).emit('mines_round_started', {
                  matchId: matchId,
                  roundNumber: nextRoundResult.gameState?.currentRound,
                  forced: true,
                  reason: 'player_disconnect',
                  timestamp: Date.now()
                });
              }
            }
          } catch (error) {
            this.logger.error(`💥 Error handling disconnect timeout for match ${matchId}:`, error);
          }
        }, 30000); // 30-second grace period for reconnection
      }

      // Refresh match activity tracking
      this.matchService.refreshMatchActivity(matchId);

    } catch (error) {
      this.logger.error(`💥 Error handling mines disconnect for match ${matchId}:`, error);
    }
  }

  // 🎯 ACTIVE GAME ABANDONMENT DETECTION METHODS

  /**
   * Handle active game abandonment when a player disconnects during gameplay
   */
  private async handleActiveGameAbandonment(playerId: string): Promise<void> {
    try {
      // Find all active matches this player is in
      const activeMatches: string[] = [];
      
      for (const [matchId, players] of this.activeGamePlayers.entries()) {
        if (players.has(playerId)) {
          activeMatches.push(matchId);
        }
      }

      if (activeMatches.length === 0) {
        return; // Player not in any active games
      }

      this.logger.log(`🚨 Player ${playerId} disconnected from ${activeMatches.length} active games`);

      for (const matchId of activeMatches) {
        await this.processGameAbandonment(matchId, playerId);
      }

    } catch (error) {
      this.logger.error(`💥 Error handling active game abandonment for player ${playerId}:`, error);
    }
  }

  /**
   * Process game abandonment - award victory to remaining player
   */
  private async processGameAbandonment(matchId: string, abandonedPlayerId: string): Promise<void> {
    try {
      this.logger.log(`⚡ Processing abandonment for match ${matchId}, abandoned player: ${abandonedPlayerId}`);

      // Get match details
      const match = await this.matchService.getMatch(matchId);
      if (!match || (match.status !== 'in_progress' && match.status !== 'completed_awaiting_payout')) {
        this.logger.log(`❌ Match ${matchId} not found or not in progress/awaiting payout - skipping abandonment`);
        return;
      }

      // 🔧 CRITICAL FIX: Don't process abandonment for matches already in payout phase
      if (match.status === 'completed_awaiting_payout') {
        this.logger.log(`✅ Match ${matchId} already completed and awaiting payout - skipping abandonment`);
        return;
      }

      // Determine remaining player
      const player1Wallet = match.player1?.wallet;
      const player2Wallet = match.player2?.wallet;
      let remainingPlayerWallet: string | null = null;

      if (abandonedPlayerId === player1Wallet) {
        remainingPlayerWallet = player2Wallet;
      } else if (abandonedPlayerId === player2Wallet) {
        remainingPlayerWallet = player1Wallet;
      }

      if (!remainingPlayerWallet) {
        this.logger.error(`❌ Could not determine remaining player for match ${matchId}`);
        return;
      }

      this.logger.log(`🏆 Awarding victory to remaining player ${remainingPlayerWallet} due to abandonment`);

      // 💰 CALCULATE ABANDONMENT PENALTY SPLIT
      // Winner gets: their stake back + 50% of opponent's stake
      // Platform gets: 50% of abandoned player's stake as penalty
      const gameData = match.gameData || {};
      gameData.abandonmentWin = true;
      gameData.abandonedPlayer = abandonedPlayerId;
      gameData.matchWinner = remainingPlayerWallet;
      gameData.endReason = 'player_abandonment';
      gameData.completedAt = new Date().toISOString();
      gameData.penaltyStructure = {
        type: 'abandonment_penalty',
        penaltyRate: this.ABANDONMENT_PENALTY_RATE,
        winnerPayout: 1.5, // 150% of their original wager
        platformPenalty: 0.5 // 50% of abandoned player's wager
      };

      // ✅ FIX: Get the actual user ID from wallet address for foreign key constraint
      const winnerUser = await this.matchService['prisma'].user.findUnique({
        where: { wallet: remainingPlayerWallet }
      });

      if (!winnerUser) {
        this.logger.error(`❌ Could not find user with wallet ${remainingPlayerWallet} for match ${matchId}`);
        return;
      }

      // Update match status with proper user ID
      await this.matchService['prisma'].match.update({
        where: { id: matchId },
        data: {
          status: 'completed_awaiting_payout',
          winnerId: winnerUser.id, // Use actual user ID instead of wallet address
          gameData: gameData as any
        }
      });

      // Clean up tracking
      this.activeGamePlayers.delete(matchId);
      this.clearAbandonmentTimer(matchId);

      // Notify players
      this.server.to(matchId).emit('match_abandoned', {
        matchId,
        winner: remainingPlayerWallet,
        abandonedPlayer: abandonedPlayerId,
        reason: 'Player disconnected during active gameplay',
        timestamp: Date.now()
      });

      // Automatically process abandonment payout with penalty structure
      setTimeout(async () => {
        try {
          const payoutResult = await this.matchService.processAbandonmentPayout(matchId);
          this.logger.log(`💰 Abandonment auto-payout result:`, payoutResult);
        } catch (error) {
          this.logger.error(`❌ Failed to process abandonment payout for match ${matchId}:`, error);
        }
      }, 2000);

    } catch (error) {
      this.logger.error(`💥 Error processing game abandonment for match ${matchId}:`, error);
    }
  }

  /**
   * Register players for active game monitoring
   */
  public registerActiveGamePlayers(matchId: string, player1Id: string, player2Id: string, gameType?: string): void {
    const players = new Set([player1Id, player2Id]);
    this.activeGamePlayers.set(matchId, players);
    
    // Store game type for timeout calculation
    if (gameType) {
      this.matchGameTypes.set(matchId, gameType);
    }
    
    // Track activity
    this.playerLastActivity.set(player1Id, Date.now());
    this.playerLastActivity.set(player2Id, Date.now());
    
    const timeout = this.GAME_ABANDONMENT_TIMEOUTS[gameType || 'default'] || this.GAME_ABANDONMENT_TIMEOUTS.default;
    this.logger.log(`🎮 Registered active game monitoring for match ${matchId} (${gameType}, ${timeout/1000}s timeout)`);
    
    // Start abandonment monitoring
    this.startAbandonmentMonitoring(matchId);
  }

  /**
   * Update player activity (called on any game action)
   */
  public updatePlayerActivity(playerId: string): void {
    this.playerLastActivity.set(playerId, Date.now());
  }

  /**
   * Start abandonment monitoring timer
   */
  private startAbandonmentMonitoring(matchId: string): void {
    // Clear existing timer
    this.clearAbandonmentTimer(matchId);
    
    const timer = setInterval(async () => {
      try {
        await this.checkForAbandonmentTimeout(matchId);
      } catch (error) {
        this.logger.error(`💥 Error in abandonment monitoring for match ${matchId}:`, error);
      }
    }, 5000); // Check every 5 seconds
    
    this.gameAbandonmentTimers.set(matchId, timer);
  }

  /**
   * Check if any players have abandoned (no activity for timeout period)
   */
  private async checkForAbandonmentTimeout(matchId: string): Promise<void> {
    const players = this.activeGamePlayers.get(matchId);
    if (!players) return;

    const now = Date.now();
    const gameType = this.matchGameTypes.get(matchId) || 'default';
    const timeout = this.GAME_ABANDONMENT_TIMEOUTS[gameType] || this.GAME_ABANDONMENT_TIMEOUTS.default;

    for (const playerId of players) {
      const lastActivity = this.playerLastActivity.get(playerId) || 0;
      const timeSinceActivity = now - lastActivity;
      
      // Check if player is still connected
      const isConnected = this.connectedPlayers.has(playerId);
      
      if (!isConnected || timeSinceActivity > timeout) {
        this.logger.log(`⏰ Player ${playerId} timeout detected (${timeSinceActivity}ms > ${timeout}ms for ${gameType}) - processing abandonment`);
        await this.processGameAbandonment(matchId, playerId);
        return; // Exit after processing first abandonment
      }
    }
  }

  /**
   * Clear abandonment timer
   */
  private clearAbandonmentTimer(matchId: string): void {
    const timer = this.gameAbandonmentTimers.get(matchId);
    if (timer) {
      clearInterval(timer);
      this.gameAbandonmentTimers.delete(matchId);
    }
  }

  /**
   * Clean up active game monitoring when match ends
   */
  public cleanupActiveGameMonitoring(matchId: string): void {
    this.activeGamePlayers.delete(matchId);
    this.matchGameTypes.delete(matchId);
    this.clearAbandonmentTimer(matchId);
    this.logger.log(`🧹 Cleaned up active game monitoring for match ${matchId}`);
  }

  private shouldRateLimit(ip: string): boolean {
    const now = Date.now();
    
    // Cleanup old connection counts every 5 minutes
    if (now - this.lastCleanup > this.CLEANUP_INTERVAL) {
      this.cleanupConnectionCounts();
      this.lastCleanup = now;
    }
    
    const currentConnections = this.connectionCounts.get(ip) || 0;
    return currentConnections >= this.MAX_CONNECTIONS_PER_IP;
  }

  private incrementConnectionCount(ip: string): void {
    const current = this.connectionCounts.get(ip) || 0;
    this.connectionCounts.set(ip, current + 1);
  }

  private decrementConnectionCount(ip: string): void {
    const current = this.connectionCounts.get(ip) || 0;
    if (current <= 1) {
      this.connectionCounts.delete(ip);
    } else {
      this.connectionCounts.set(ip, current - 1);
    }
  }

  private cleanupConnectionCounts(): void {
    // Reset all connection counts (they'll rebuild naturally)
    this.connectionCounts.clear();
    this.logger.debug('🧹 Connection counts reset');
  }

  private getClientIP(client: Socket): string {
    return client.handshake.headers['x-forwarded-for'] as string || 
           client.handshake.address || 
           'unknown';
  }

  private startHeartbeat(clientId: string): void {
    // Clear existing heartbeat if any
    const existingInterval = this.heartbeatIntervals.get(clientId);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // 🚀 PERFORMANCE: Optimized heartbeat frequency
    const interval = setInterval(() => {
      const client = this.clients.get(clientId);
      const clientInfo = this.clientData.get(clientId);
      
      if (!client || !clientInfo) {
        clearInterval(interval);
        this.heartbeatIntervals.delete(clientId);
        return;
      }

      const now = Date.now();
      const timeSinceActivity = now - clientInfo.lastActivity;

      // If client hasn't been active, send ping
      if (timeSinceActivity > this.HEARTBEAT_INTERVAL) {
        client.emit('ping', { timestamp: now });
        
        // Update connection health
        this.connectionHealth.set(clientId, {
          lastPing: now,
          rtt: 0,
          packetLoss: 0,
          connectionQuality: 'excellent',
          responseTime: null,
          isHealthy: true,
          adaptiveSettings: {
            batchSize: this.BATCH_SIZE,
            compressionThreshold: 1024,
            updateFrequency: 60
          }
        });
      }
    }, this.HEARTBEAT_INTERVAL);

    this.heartbeatIntervals.set(clientId, interval);
  }

  private cleanupStaleConnections(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [clientId, data] of this.connectionPool.entries()) {
      if (now - data.lastActivity > this.CONNECTION_TIMEOUT) {
        this.connectionPool.delete(clientId);
        this.connectionHealth.delete(clientId);
        this.logger.debug(`🧹 Cleaned up stale connection: ${clientId}`);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.log(`🧹 Cleaned up ${cleanedCount} stale connections`);
    }
  }

  private cleanupClient(clientId: string): void {
    // Remove from all tracking maps
    this.clients.delete(clientId);
    this.clientData.delete(clientId);
    this.connectionHealth.delete(clientId);
    
    // Clear heartbeat
    const interval = this.heartbeatIntervals.get(clientId);
    if (interval) {
      clearInterval(interval);
      this.heartbeatIntervals.delete(clientId);
    }
    
    // Remove from game rooms
    for (const [roomId, clientSet] of this.gameRooms.entries()) {
      if (clientSet.has(clientId)) {
        clientSet.delete(clientId);
        if (clientSet.size === 0) {
          this.gameRooms.delete(roomId);
        }
      }
    }
  }

  @SubscribeMessage('pong')
  handlePong(client: Socket, data: { timestamp: number }): void {
    const clientId = client.id;
    const clientInfo = this.clientData.get(clientId);
    
    if (clientInfo) {
      clientInfo.lastActivity = Date.now();
      
      // Update connection health
      const health = this.connectionHealth.get(clientId);
      if (health) {
        health.responseTime = Date.now() - data.timestamp;
        health.isHealthy = health.responseTime < 1000; // Healthy if response < 1s
      }
    }
  }

  // 🚀 PHASE 4: Enhanced message broadcasting with intelligent compression
  private async broadcastToRoomOptimized(roomId: string, event: string, data: any, options?: {
    priority?: 'high' | 'normal' | 'low';
    gameType?: string;
    compress?: boolean;
    batch?: boolean;
  }): Promise<void> {
    const opts = { priority: 'normal' as 'high' | 'normal' | 'low', compress: true, batch: false, ...options };
    
    // Get game-specific optimizations
    const gameOpts = opts.gameType ? this.gameOptimizations[opts.gameType as keyof typeof this.gameOptimizations] : null;
    
    // 🚀 REDIS: Publish to Redis for horizontal scaling
    await this.redisWebSocketService.publishMessage(`room:${roomId}`, {
      event,
      data,
      timestamp: Date.now(),
      priority: opts.priority
    }, {
      compress: opts.compress,
      priority: opts.priority,
      batch: opts.batch
    });

    // 🚀 PERFORMANCE: Direct WebSocket broadcast with adaptive settings
    const roomSockets = this.server.sockets.adapter.rooms.get(roomId);
    if (roomSockets) {
      const promises: Promise<void>[] = [];
      
      for (const socketId of roomSockets) {
        const socket = this.server.sockets.sockets.get(socketId);
        const conn = this.connectionPool.get(socketId);
        const health = this.connectionHealth.get(socketId);
        
        if (socket && conn && health) {
          promises.push(this.sendAdaptiveMessage(socket, event, data, {
            ...opts,
            connectionQuality: health.connectionQuality,
            adaptiveSettings: health.adaptiveSettings,
            gameOptimizations: gameOpts
          }));
        }
      }
      
      await Promise.allSettled(promises);
    }
  }

  // 🚀 PERFORMANCE: Adaptive message sending based on connection quality
  private async sendAdaptiveMessage(socket: Socket, event: string, data: any, options: any): Promise<void> {
    const { connectionQuality, adaptiveSettings, gameOptimizations } = options;
    
    let messageData = data;
    
    // 🚀 COMPRESSION: Adaptive compression based on connection quality
    if (connectionQuality === 'poor' && JSON.stringify(data).length > 512) {
      // Reduce data size for poor connections
      messageData = this.reduceDataSize(data, event);
    }
    
    // 🚀 BATCHING: Use batching for non-critical updates
    if (options.batch && connectionQuality !== 'excellent') {
      this.addToBatch(socket.id, event, messageData, options.priority || 'normal');
      return;
    }
    
    // 🚀 PERFORMANCE: Direct send for high-priority or excellent connections
    try {
      socket.emit(event, messageData);
      
      // Update connection metrics
      const conn = this.connectionPool.get(socket.id);
      if (conn) {
        conn.messageCount++;
        conn.lastActivity = Date.now();
      }
    } catch (error) {
      console.warn(`Failed to send message to ${socket.id}:`, error);
    }
  }

  // 🚀 PERFORMANCE: Intelligent data size reduction for poor connections
  private reduceDataSize(data: any, event: string): any {
    if (event.includes('crash_multiplier')) {
      // For crash games, reduce precision for poor connections
      return {
        ...data,
        multiplier: Math.round(data.multiplier * 100) / 100, // 2 decimal places
        timestamp: Math.floor(data.timestamp / 1000) * 1000 // Round to seconds
      };
    }
    
    if (event.includes('game_state')) {
      // Remove non-essential fields for game state updates
      const { history, metadata, ...essential } = data;
      return essential;
    }
    
    return data;
  }

  // 🚀 PERFORMANCE: Enhanced message batching with priority queues
  private addToBatch(socketId: string, event: string, data: any, priority: 'high' | 'normal' | 'low'): void {
    const batchKey = `${socketId}:${event}`;
    
    if (!this.messageBatch.has(batchKey)) {
      const health = this.connectionHealth.get(socketId);
      const batchTimeout = health?.connectionQuality === 'excellent' ? 25 : 
                          health?.connectionQuality === 'good' ? 50 : 100;
      
      this.messageBatch.set(batchKey, {
        messages: [],
        timeout: setTimeout(() => this.flushBatchOptimized(batchKey), batchTimeout),
        priority,
        compressionEnabled: this.connectionPool.get(socketId)?.compressionSupported || false
      });
    }
    
    const batch = this.messageBatch.get(batchKey)!;
    batch.messages.push(data);
    
    // Dynamic batch size based on priority and connection quality
    const health = this.connectionHealth.get(socketId);
    const maxBatchSize = priority === 'high' ? 3 : 
                        health?.connectionQuality === 'excellent' ? 10 : 5;
    
    if (batch.messages.length >= maxBatchSize) {
      clearTimeout(batch.timeout);
      this.flushBatchOptimized(batchKey);
    }
  }

  // 🚀 PERFORMANCE: Enhanced batch flushing with compression
  private flushBatchOptimized(batchKey: string): void {
    const batch = this.messageBatch.get(batchKey);
    if (!batch || batch.messages.length === 0) return;
    
    const [socketId, event] = batchKey.split(':');
    const socket = this.server.sockets.sockets.get(socketId);
    
    if (socket) {
      const batchData = {
        type: 'batch',
        event,
        messages: batch.messages,
        count: batch.messages.length,
        timestamp: Date.now(),
        compressed: batch.compressionEnabled
      };
      
      socket.emit(`${event}_batch`, batchData);
    }
    
    this.messageBatch.delete(batchKey);
  }

  // 🚀 PERFORMANCE: Advanced cleanup with performance optimization
  private performAdvancedCleanup(): void {
    const now = Date.now();
    const staleThreshold = 600000; // 10 minutes

    // Clean up stale connections
    for (const [clientId, data] of this.connectionPool.entries()) {
      if (now - data.lastActivity > staleThreshold) {
        this.connectionPool.delete(clientId);
        this.connectionHealth.delete(clientId);
        this.logger.debug(`🧹 Cleaned up stale connection: ${clientId}`);
      }
    }

    // Clean up rate limit data
    for (const [clientId, data] of this.messageRateLimit.entries()) {
      if (now > data.resetTime) {
        this.messageRateLimit.delete(clientId);
      }
    }
    
    // Clean up stale batches
    for (const [batchKey, batch] of this.messageBatch.entries()) {
      clearTimeout(batch.timeout);
      this.flushBatchOptimized(batchKey);
    }
    
    // Log performance metrics
    const metrics = this.redisWebSocketService.getPerformanceMetrics();
    this.logger.log(`🚀 Performance: ${this.connectionPool.size} connections, ${metrics.messagesProcessed} msgs processed`);
  }

  // 🚀 PERFORMANCE: Connection quality monitoring and adaptation
  private monitorConnectionQuality(): void {
    for (const [clientId, health] of this.connectionHealth.entries()) {
      const conn = this.connectionPool.get(clientId);
      if (!conn) continue;
      
      // Adapt settings based on connection quality
      switch (health.connectionQuality) {
        case 'excellent':
          health.adaptiveSettings = {
            batchSize: 10,
            compressionThreshold: 2048,
            updateFrequency: 16 // 60fps
          };
          break;
        case 'good':
          health.adaptiveSettings = {
            batchSize: 6,
            compressionThreshold: 1024,
            updateFrequency: 33 // 30fps
          };
          break;
        case 'fair':
          health.adaptiveSettings = {
            batchSize: 4,
            compressionThreshold: 512,
            updateFrequency: 66 // 15fps
          };
          break;
        case 'poor':
          health.adaptiveSettings = {
            batchSize: 2,
            compressionThreshold: 256,
            updateFrequency: 200 // 5fps
          };
          break;
      }
    }
  }

  // 🚀 PERFORMANCE: Load-based optimization
  private optimizeBasedOnLoad(): void {
    const connectionCount = this.connectionPool.size;
    const metrics = this.redisWebSocketService.getPerformanceMetrics();
    
    // Adjust global settings based on load
    if (connectionCount > 100) {
      // High load - prioritize performance
      this.gameOptimizations.crash.updateFrequency = 33; // 30fps instead of 60fps
      this.logger.log(`⚡ High load detected (${connectionCount} connections), reducing update frequency`);
    } else if (connectionCount < 20) {
      // Low load - maximize quality
      this.gameOptimizations.crash.updateFrequency = 16; // Back to 60fps
    }
  }

  @SubscribeMessage('join_match')
  async handleJoinMatch(
    @MessageBody() data: { matchId: string; playerId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      this.logger.log(`🎮 Player ${data.playerId} attempting to join match ${data.matchId}`);
      
      // Join the match room
      client.join(data.matchId);
      
      // Track the connection
      this.connectedPlayers.set(data.playerId, client);
      
      // Add to match room tracking
      if (!this.matchRooms.has(data.matchId)) {
        this.matchRooms.set(data.matchId, new Set());
      }
      this.matchRooms.get(data.matchId)!.add(client.id);
      
      // Update player activity
      this.updatePlayerActivity(data.playerId);
      
             // 🎯 CRITICAL: Check if match is starting and register for active monitoring
       try {
         const match = await this.matchService.getMatch(data.matchId);
         if (match && match.player1 && match.player2) {
           // Both players present - register for active game monitoring with game type
           this.registerActiveGamePlayers(
             data.matchId, 
             match.player1.wallet, 
             match.player2.wallet,
             match.gameType // Pass game type for smart timeout calculation
           );
         }
       } catch (error) {
         this.logger.error(`Error checking match for active monitoring: ${error.message}`);
       }
      
      // Store match and player association for cleanup
      this.connectionRecoveryService.registerConnection(data.playerId, client);
      
      client.emit('match_joined', {
        matchId: data.matchId,
        playerId: data.playerId,
        timestamp: Date.now(),
      });
      
      // Notify other players in the match
      client.to(data.matchId).emit('player_joined_match', {
        matchId: data.matchId,
        playerId: data.playerId,
        timestamp: Date.now(),
      });
      
    } catch (error) {
      this.logger.error(`Error handling join match: ${error.message}`);
      client.emit('error', { message: 'Failed to join match' });
    }
  }

  @SubscribeMessage('game_move')
  async handleGameMove(
    @MessageBody() moveData: GameMove,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      // 🎯 CRITICAL: Update player activity on any game move
      this.updatePlayerActivity(moveData.playerId);
      
      // Process the move through match service
      const result = await this.matchService.submitResult({
        matchId: moveData.matchId,
        gameState: moveData.moveData,
        winnerWallet: moveData.moveData.winner,
        signature: moveData.moveData.signature || 'websocket_move'
      });

      if (result.success) {
        // Broadcast move to all players in the match
        this.server.to(moveData.matchId).emit('game_move_processed', {
          matchId: moveData.matchId,
          playerId: moveData.playerId,
          moveData: moveData.moveData,
          result: result,
          timestamp: Date.now()
        });
      } else {
        client.emit('move_error', { 
          message: 'Invalid move',
          matchId: moveData.matchId 
        });
      }
    } catch (error) {
      this.logger.error(`Error processing game move: ${error.message}`);
      client.emit('error', { message: 'Failed to process move' });
    }
  }

  @SubscribeMessage('game_state_update')
  async handleGameStateUpdate(
    @MessageBody() stateData: GameState,
    @ConnectedSocket() client: Socket,
  ) {
    const { matchId, state, timestamp } = stateData;
    
    // Broadcast state update to all players in the match
    client.to(matchId).emit('game_state_update', {
      state,
      timestamp,
    });
  }

  @SubscribeMessage('match_result')
  async handleMatchResult(
    @MessageBody() resultData: { matchId: string; winner: string; gameData: any },
    @ConnectedSocket() client: Socket,
  ) {
    const { matchId, winner, gameData } = resultData;
    
    // Notify all players of the match result
    this.server.to(matchId).emit('match_completed', {
      matchId,
      winner,
      gameData,
      timestamp: Date.now(),
    });

    console.log(`🏆 Match ${matchId} completed, winner: ${winner}`);
  }

  @SubscribeMessage('draw_offer')
  async handleDrawOffer(
    @MessageBody() data: { matchId: string; playerId: string; timestamp: number },
    @ConnectedSocket() client: Socket,
  ) {
    const { matchId, playerId } = data;
    
    // Verify match is in progress
    const match = await this.matchService.getMatch(matchId);
    if (!match || match.status !== 'in_progress') {
      client.emit('error', { message: 'Match is not in progress' });
      return;
    }

    // Send draw offer to opponent only
    client.to(matchId).emit('draw_offer_received', {
      matchId,
      fromPlayer: playerId,
    });

    console.log(`🤝 Draw offer sent in match ${matchId} by ${playerId}`);
  }

  @SubscribeMessage('draw_accept')
  async handleDrawAccept(
    @MessageBody() data: { matchId: string; playerId: string; timestamp: number },
    @ConnectedSocket() client: Socket,
  ) {
    const { matchId, playerId } = data;
    
    // Verify match is in progress
    const match = await this.matchService.getMatch(matchId);
    if (!match || match.status !== 'in_progress') {
      client.emit('error', { message: 'Match is not in progress' });
      return;
    }

    // Notify both players that draw was accepted
    this.server.to(matchId).emit('draw_offer_accepted', {
      matchId,
      byPlayer: playerId,
    });

    console.log(`✅ Draw offer accepted in match ${matchId} by ${playerId}`);
  }

  @SubscribeMessage('draw_decline')
  async handleDrawDecline(
    @MessageBody() data: { matchId: string; playerId: string; timestamp: number },
    @ConnectedSocket() client: Socket,
  ) {
    const { matchId, playerId } = data;
    
    // Verify match is in progress
    const match = await this.matchService.getMatch(matchId);
    if (!match || match.status !== 'in_progress') {
      client.emit('error', { message: 'Match is not in progress' });
      return;
    }

    // Notify both players that draw was declined
    this.server.to(matchId).emit('draw_offer_declined', {
      matchId,
      byPlayer: playerId,
    });

    console.log(`❌ Draw offer declined in match ${matchId} by ${playerId}`);
  }

  @SubscribeMessage('check_match_status')
  async handleCheckMatchStatus(
    @MessageBody() data: { matchId: string; playerId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      console.log(`🔍 Checking match status for ${data.matchId} by player ${data.playerId}`);
      
      const match = await this.matchService.getMatch(data.matchId);
      
      let isActive = false;
      let status = 'not_found';
      
      if (match) {
        status = match.status;
        isActive = match.status === 'in_progress' || match.status === 'pending';
        console.log(`✅ Match ${data.matchId} found with status: ${status}`);
      } else {
        console.log(`❌ Match ${data.matchId} not found`);
      }
      
      client.emit('match_status_response', {
        matchId: data.matchId,
        isActive,
        status
      });
      
    } catch (error) {
      console.error('Error checking match status:', error);
      client.emit('match_status_response', {
        matchId: data.matchId,
        isActive: false,
        status: 'error'
      });
    }
  }

  @SubscribeMessage('leave_all_matches')
  async handleLeaveAllMatches(
    @MessageBody() data: { timestamp: number },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      console.log('🚪 Client requesting to leave all matches:', client.id);
      
      // Find the player ID from the connected players map
      let playerId: string | null = null;
      for (const [pid, socket] of this.connectedPlayers.entries()) {
        if (socket.id === client.id) {
          playerId = pid;
          break;
        }
      }
      
      if (playerId) {
        // Remove from all match rooms
        for (const [matchId, playerSet] of this.matchRooms.entries()) {
          if (playerSet.has(client.id)) {
            console.log(`🚪 Removing player ${playerId} from match room ${matchId}`);
            client.leave(matchId);
            playerSet.delete(client.id);
            
            // Notify other players in the match
            client.to(matchId).emit('player_left_match', {
              matchId,
              playerId,
              timestamp: Date.now(),
            });
          }
        }
        
        // Clear any active game monitoring for this player
        for (const [matchId, playerSet] of this.activeGamePlayers.entries()) {
          if (playerSet.has(playerId)) {
            console.log(`🚪 Clearing active game monitoring for player ${playerId} in match ${matchId}`);
            playerSet.delete(playerId);
            if (playerSet.size === 0) {
              this.cleanupActiveGameMonitoring(matchId);
            }
          }
        }
        
        console.log(`✅ Player ${playerId} successfully left all matches`);
      } else {
        console.log('⚠️ Could not find player ID for client:', client.id);
      }
      
    } catch (error) {
      console.error('Error handling leave_all_matches:', error);
    }
  }

  @SubscribeMessage('player_resign')
  async handlePlayerResign(
    @MessageBody() data: { matchId: string; playerId: string; timestamp: number },
    @ConnectedSocket() client: Socket,
  ) {
    const { matchId, playerId } = data;
    
    // Verify match is in progress
    const match = await this.matchService.getMatch(matchId);
    if (!match || match.status !== 'in_progress') {
      client.emit('error', { message: 'Match is not in progress' });
      return;
    }

    // Notify opponent that player resigned
    client.to(matchId).emit('player_resigned', {
      matchId,
      resignedPlayer: playerId,
    });

    console.log(`🏳️ Player resigned in match ${matchId}: ${playerId}`);
  }

  @SubscribeMessage('coin_flip_choice')
  async handleCoinFlipChoice(
    @MessageBody() data: { matchId: string; playerId: string; choice: 'heads' | 'tails' },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      // 🎯 CRITICAL: Update player activity
      this.updatePlayerActivity(data.playerId);
      
      const result = await this.matchService.processCoinFlipChoice(data.matchId, data.playerId, data.choice);
      
      if (result.success) {
        // Emit to the specific client first
        client.emit('coin_flip_choice_confirmed', {
          matchId: data.matchId,
          playerId: data.playerId,
          choice: data.choice,
          gameState: result.gameState,
          bothPlayersReady: result.bothPlayersReady,
        timestamp: Date.now()
      });

        // Then broadcast to all players in the match room
        this.server.to(data.matchId).emit('coin_flip_state_update', {
          matchId: data.matchId,
        gameState: result.gameState,
          bothPlayersReady: result.bothPlayersReady,
        timestamp: Date.now()
      });

        // If both players are ready, execute the flip with delay for better UX
      if (result.bothPlayersReady) {
          this.logger.log(`🪙 Both players ready for match ${data.matchId} - executing flip in 2 seconds`);
        
        setTimeout(async () => {
          try {
              const flipResult = await this.matchService.executeCoinFlip(data.matchId);
            
            if (flipResult.success) {
                // 🎯 ENHANCED: Send personalized results to each player
                const gameState = flipResult.gameState;
                const player1Wallet = gameState?.player1Wallet;
                const player2Wallet = gameState?.player2Wallet;
                
                // Send player 1's perspective
                if (player1Wallet && this.connectedPlayers.has(player1Wallet)) {
                  const player1Socket = this.connectedPlayers.get(player1Wallet);
                  player1Socket?.emit('coin_flip_result', {
                    matchId: data.matchId,
                    gameState: flipResult.gameState,
                roundResult: flipResult.roundResult,
                    isPlayer1: true,
                    timestamp: Date.now()
                  });
                }
                
                // Send player 2's perspective
                if (player2Wallet && this.connectedPlayers.has(player2Wallet)) {
                  const player2Socket = this.connectedPlayers.get(player2Wallet);
                  player2Socket?.emit('coin_flip_result', {
                    matchId: data.matchId,
                gameState: flipResult.gameState,
                    roundResult: flipResult.roundResult,
                    isPlayer1: false,
                timestamp: Date.now()
              });
                }
                
                // Also broadcast general result to room (for spectators/debugging)
                this.server.to(data.matchId).emit('coin_flip_executed', {
                  matchId: data.matchId,
                  gameState: flipResult.gameState,
                  roundResult: flipResult.roundResult,
                  timestamp: Date.now()
                });
            } else {
                this.server.to(data.matchId).emit('coin_flip_error', {
                  matchId: data.matchId,
                  error: flipResult.error,
                  timestamp: Date.now()
                });
            }
          } catch (error) {
              this.logger.error(`💥 Error executing delayed coin flip: ${error.message}`);
          }
          }, 2000); // 2-second delay for better UX
        }
      } else {
        client.emit('error', { message: result.error });
      }

    } catch (error) {
      this.logger.error('Error handling coin flip choice:', error);
      client.emit('error', { message: 'Failed to process coin flip choice' });
    }
  }

  @SubscribeMessage('get_coinflip_state')
  async handleGetCoinFlipState(
    @MessageBody() data: { matchId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { matchId } = data;
    
    try {
      const gameState = await this.matchService.getCoinFlipState(matchId);
      
      if (gameState) {
        client.emit('coinflip_game_state', {
          matchId,
          gameState,
          timestamp: Date.now()
        });
      } else {
        client.emit('error', { message: 'Match not found' });
      }
    } catch (error) {
      console.error('Error getting coinflip state:', error);
      client.emit('error', { message: 'Failed to get game state' });
    }
  }

  @SubscribeMessage('confirm_payout_ready')
  async handleConfirmPayoutReady(
    @MessageBody() data: { matchId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { matchId } = data;
    
    try {
      this.logger.log(`💰 Frontend confirmed ready for payout: ${matchId}`);
      
      // Process the payout
      const result = await this.matchService.processMatchPayout(matchId);
      
      if (result.success) {
        // Notify all players in the match that payout is complete
        this.server.to(matchId).emit('payout_complete', {
          matchId,
          message: result.message,
          transactionHash: result.transactionHash,
          timestamp: Date.now()
        });
        
        this.logger.log(`✅ Payout completed for match ${matchId}: ${result.transactionHash}`);

        // PnL tracking handled by match service
      } else {
        // Notify all players that payout failed
        this.server.to(matchId).emit('payout_failed', {
          matchId,
          error: result.message,
          timestamp: Date.now()
        });
        
        this.logger.error(`❌ Payout failed for match ${matchId}: ${result.message}`);
      }
      
    } catch (error) {
      this.logger.error(`❌ Error in payout confirmation handler: ${error.message}`);
      client.emit('error', { message: 'Failed to process payout confirmation' });
    }
  }

  // ===== CRASH GAME HANDLERS =====

  @SubscribeMessage('start_crash_round')
  async handleStartCrashRound(
    @MessageBody() data: { matchId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { matchId } = data;
    
    try {
      // Start crash round through the crash service
      const result = await this.matchService.startCrashRound(matchId);
      
      if (!result.success) {
        client.emit('error', { message: result.error });
        return;
      }

      // ✅ STAKE'S TIMING SYSTEM: Start predictive crash timing
      const predictiveResult = await this.matchService.startPredictiveCrashTiming(matchId, this);
      
      if (predictiveResult.success) {
        console.log(`🎯 STAKE TIMING: Predictive crash system activated for match ${matchId}`);
      }

      // The service already broadcasts the round start event
      console.log(`🚀 Crash round started for match ${matchId}`);
    } catch (error) {
      console.error('Error starting crash round:', error);
      client.emit('error', { message: 'Failed to start crash round' });
    }
  }

  // ✅ STAKE'S LATENCY SYSTEM: Handle ping/pong for latency measurement
  @SubscribeMessage('ping')
  async handlePing(
    @MessageBody() data: { timestamp: number; playerId: string },
    @ConnectedSocket() client: Socket,
  ) {
    // ✅ FIX: Add error handling for malformed ping data
    if (!data || typeof data !== 'object') {
      console.warn('⚠️ PING: Received malformed ping data:', data);
      return;
    }
    
    const { timestamp, playerId } = data;
    
    // ✅ FIX: Validate required fields
    if (typeof timestamp !== 'number' || !playerId) {
      console.warn('⚠️ PING: Missing required ping fields:', { timestamp, playerId });
      return;
    }
    
    const currentTime = Date.now();
    const latency = currentTime - timestamp;
    
    // ✅ FIX: Validate latency is reasonable (not negative or too large)
    if (latency < 0 || latency > 60000) { // Max 60 seconds
      console.warn('⚠️ PING: Invalid latency calculated:', latency, 'ms');
      return;
    }
    
    // Update latency in crash service
    await this.matchService.updatePlayerLatency(playerId, latency);
    
    // Send pong back to client
    client.emit('pong', {
      timestamp: currentTime,
      latency,
      playerId
    });
    
    console.log(`🌐 Latency update: ${playerId} = ${latency}ms`);
  }

  @SubscribeMessage('crash_cash_out')
  async handleCrashCashOut(
    @MessageBody() data: { matchId: string; playerId: string; multiplier: number },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      // 🎯 CRITICAL: Update player activity
      this.updatePlayerActivity(data.playerId);
      
      const result = await this.matchService.processCrashCashOut(data.matchId, data.playerId, data.multiplier);
      
      if (result.success) {
        // Emit to all players in the match
        this.server.to(data.matchId).emit('crash_cash_out_processed', {
          matchId: data.matchId,
          playerId: data.playerId,
          multiplier: data.multiplier,
          gameState: result.gameState,
          cashOutResult: result.cashOutResult,
          timestamp: Date.now()
        });
      } else {
        client.emit('error', { message: result.error });
      }

    } catch (error) {
      this.logger.error('Error handling crash cash out:', error);
      client.emit('error', { message: 'Failed to process cash out' });
    }
  }

  @SubscribeMessage('execute_crash')
  async handleExecuteCrash(
    @MessageBody() data: { matchId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { matchId } = data;
    
    try {
      // Execute crash through the crash service
      const result = await this.matchService.executeCrash(matchId);
      
      if (!result.success) {
        client.emit('error', { message: result.error });
        return;
      }

      // The service already broadcasts the crash result
      console.log(`💥 Crash executed for match ${matchId}`);
    } catch (error) {
      console.error('Error executing crash:', error);
      client.emit('error', { message: 'Failed to execute crash' });
    }
  }

  @SubscribeMessage('get_crash_state')
  async handleGetCrashState(
    @MessageBody() data: { matchId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { matchId } = data;
    
    try {
      const gameState = await this.matchService.getCrashState(matchId);
      
      if (gameState) {
        client.emit('crash_game_state', {
          matchId,
          gameState,
          timestamp: Date.now()
        });
      } else {
        client.emit('error', { message: 'Match not found' });
      }
    } catch (error) {
      console.error('Error getting crash state:', error);
      client.emit('error', { message: 'Failed to get game state' });
    }
  }

  @SubscribeMessage('initialize_crash_match')
  async handleInitializeCrashMatch(
    @MessageBody() data: { matchId: string; player1: string; player2: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { matchId, player1, player2 } = data;
    
    try {
      // Initialize crash match through the service
      const gameState = await this.matchService.initializeCrashMatch(matchId, player1, player2);
      
      // The service already broadcasts the initialization event
      console.log(`🚀 Crash match initialized: ${matchId}`);
    } catch (error) {
      console.error('Error initializing crash match:', error);
      client.emit('error', { message: 'Failed to initialize crash match' });
    }
  }

  // 🚀 CRASH: Enhanced multiplier update broadcasting with compression
  public broadcastCrashMultiplierUpdate(matchId: string, update: any): void {
    const { multiplier, ...additionalData } = update;
    
    // 🚀 PERFORMANCE: Use optimized broadcasting with Redis
    this.broadcastToRoomOptimized(matchId, 'crash_multiplier_update', {
      multiplier: Math.round(multiplier * 100) / 100,
      timestamp: Date.now(),
      ...additionalData
    }, {
      priority: 'high',
      gameType: 'crash',
      compress: true,
      batch: false
    });
  }

  // 🚀 PERFORMANCE: Batch crash updates for maximum efficiency
  public broadcastCrashMultiplierBatch(matchId: string, updates: Array<{multiplier: number, data?: any}>): void {
    // Use Redis batching for optimal performance
    this.broadcastToRoomOptimized(matchId, 'crash_batch_update', {
      updates: updates.map(u => ({
        multiplier: Math.round(u.multiplier * 100) / 100,
        ...(u.data || {})
      })),
      timestamp: Date.now(),
      count: updates.length
    }, {
      priority: 'high',
      gameType: 'crash',
      compress: true,
      batch: true
    });
  }

  // Admin/system methods
  async notifyMatchCreated(matchId: string) {
    this.server.emit('match_created', { matchId });
  }

  async notifyMatchJoined(matchId: string, joiner: string) {
    // Get updated match state after join
    const updatedMatch = await this.matchService.getMatch(matchId);
    if (!updatedMatch) return;

    // Calculate correct connected players count
    // If match is in_progress, we know both players are connected
    const connectedPlayers = updatedMatch.status === 'in_progress' ? 2 : (this.matchRooms.get(matchId)?.size || 1);

    // Send updated match state to ALL players in the room
    // This will trigger the frontend to transition from "waiting" to "playing"
    this.server.to(matchId).emit('match_state', {
      match: updatedMatch,
      connectedPlayers: connectedPlayers,
    });

    // Also send player_joined event for additional handling
    this.server.to(matchId).emit('player_joined', { playerId: joiner, matchId });
    
    console.log(`🔔 Sent updated match state to all players in room ${matchId} (status: ${updatedMatch.status}, connectedPlayers: ${connectedPlayers})`);
  }

  async notifyMatchCompleted(matchId: string, winner: string) {
    this.server.to(matchId).emit('match_result', { matchId, winner });
  }

  @SubscribeMessage('coinflip_round_ready')
  async handleCoinFlipRoundReady(
    @MessageBody() data: { matchId: string; playerId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      console.log(`🎯 Coinflip round ready from ${data.playerId} in match ${data.matchId}`);
      
      // Broadcast to match room that player is ready for next round
      this.server.to(data.matchId).emit('player_round_ready', {
        matchId: data.matchId,
        playerId: data.playerId,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('Error handling coinflip round ready:', error);
      client.emit('error', { message: 'Failed to process round ready' });
    }
  }

  // 🚀 PERFORMANCE: Monitor connection health
  private monitorConnectionHealth(): void {
    const now = Date.now();
    for (const [clientId, health] of this.connectionHealth.entries()) {
      // Remove connections that haven't pinged in 2 minutes
      if (now - health.lastPing > 120000) {
        this.connectionHealth.delete(clientId);
        this.logger.debug(`Removed stale connection health data: ${clientId}`);
      }
    }
  }

  // 🚀 PERFORMANCE: Legacy batch message support (simplified)
  private batchMessage(roomId: string, event: string, data: any): void {
    // Use the new optimized broadcasting instead
    this.broadcastToRoomOptimized(roomId, event, data, {
      priority: 'normal',
      batch: true,
      compress: true
    });
  }

  // 🚀 PERFORMANCE: Optimized broadcast with throttling
  private throttledBroadcast(roomId: string, event: string, data: any, throttleMs: number = 100): void {
    const throttleKey = `${roomId}:${event}`;
    const now = Date.now();
    
    // Check if we're within throttle window
    const lastBroadcast = this.connectionPool.get(throttleKey)?.lastActivity || 0;
    if (now - lastBroadcast < throttleMs) {
      // Queue for batching instead of immediate send
      this.batchMessage(roomId, event, data);
      return;
    }
    
    // Send immediately and update timestamp
    this.server.to(roomId).emit(event, data);
  }

  // 🎯 RPS WebSocket Handlers
  @SubscribeMessage('rps_choice')
  async handleRPSChoice(
    @MessageBody() data: { matchId: string; playerId: string; choice: 'rock' | 'paper' | 'scissors' },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      // 🎯 CRITICAL: Update player activity
      this.updatePlayerActivity(data.playerId);
      
      const result = await this.matchService.processRPSChoice(data.matchId, data.playerId, data.choice);
      
      if (result.success) {
        // If both players have chosen, broadcast the results
      if (result.bothPlayersChosen) {
          // 🔧 FIX: Send personalized results to each player
          const player1Result = result.player1Result;
          const player2Result = result.player2Result;
          
          // Get player wallet addresses from the game state
          const player1Wallet = result.gameState?.player1Wallet;
          const player2Wallet = result.gameState?.player2Wallet;
          
          // Send player 1's perspective
          if (player1Wallet && this.connectedPlayers.has(player1Wallet)) {
            const player1Socket = this.connectedPlayers.get(player1Wallet);
            player1Socket?.emit('rps_round_result', {
              matchId: data.matchId,
              gameState: result.gameState,
              roundResult: player1Result?.roundResult,
              playerScore: player1Result?.playerScore,
              opponentScore: player1Result?.opponentScore,
              matchComplete: result.matchComplete,
              matchWinner: player1Result?.matchWinner,
              totalRounds: result.totalRounds,
              timestamp: Date.now()
            });
          }
          
          // Send player 2's perspective
          if (player2Wallet && this.connectedPlayers.has(player2Wallet)) {
            const player2Socket = this.connectedPlayers.get(player2Wallet);
            player2Socket?.emit('rps_round_result', {
              matchId: data.matchId,
              gameState: result.gameState,
              roundResult: player2Result?.roundResult,
              playerScore: player2Result?.playerScore,
              opponentScore: player2Result?.opponentScore,
              matchComplete: result.matchComplete,
              matchWinner: player2Result?.matchWinner,
              totalRounds: result.totalRounds,
              timestamp: Date.now()
            });
          }
          
          // 🧹 CLEANUP: If match is complete, clean up monitoring
          if (result.matchComplete) {
            this.cleanupActiveGameMonitoring(data.matchId);
          }
        
      } else {
          // Only one player has chosen - just confirm choice
          client.emit('rps_choice_confirmed', {
          matchId: data.matchId,
            choice: data.choice,
            waitingForOpponent: true,
            timestamp: Date.now()
          });
          
          // Notify opponent that a choice was made (without revealing it)
          client.to(data.matchId).emit('rps_opponent_chose', {
            matchId: data.matchId,
          timestamp: Date.now()
        });
        }
      } else {
        client.emit('error', { message: result.error });
      }

    } catch (error) {
      this.logger.error('Error handling RPS choice:', error);
      client.emit('error', { message: 'Failed to process RPS choice' });
    }
  }

  @SubscribeMessage('get_rps_state')
  async handleGetRPSState(
    @MessageBody() data: { matchId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      console.log(`🎯 Getting RPS state for match ${data.matchId}`);
      
      const gameState = await this.matchService.getRPSGameState(data.matchId);
      
      client.emit('rps_game_state', {
        matchId: data.matchId,
        gameState,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('Error getting RPS state:', error);
      client.emit('error', { message: 'Failed to get RPS state' });
    }
  }

  @SubscribeMessage('rps_round_ready')
  async handleRPSRoundReady(
    @MessageBody() data: { matchId: string; playerId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      console.log(`🎯 RPS round ready from ${data.playerId} in match ${data.matchId}`);
      
      // Broadcast to match room that player is ready for next round
      this.server.to(data.matchId).emit('player_round_ready', {
        matchId: data.matchId,
        playerId: data.playerId,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('Error handling RPS round ready:', error);
      client.emit('error', { message: 'Failed to process round ready' });
    }
  }

  // ===== DICE DUEL GAME HANDLERS =====

  @SubscribeMessage('dice_duel')
  async handleDiceRoll(
    @MessageBody() data: { 
      matchId: string; 
      playerId: string; 
      timestamp: number; 
      buildData?: { build: string; dice: string; buildName: string } 
    },
    @ConnectedSocket() client: Socket,
  ) {
    const { matchId, playerId, timestamp, buildData } = data;
    
    try {
      if (buildData) {
        this.logger.log(`🎲 RPG Dice roll from ${playerId} in match ${matchId} with build: ${buildData.buildName} (${buildData.dice})`);
      } else {
        this.logger.log(`🎲 Basic dice roll from ${playerId} in match ${matchId}`);
      }
      
      // Process the dice roll through the match service with RPG build data
      const result = await this.matchService.processDiceDuelRoll(matchId, playerId, buildData);
      
      if (!result.success) {
        client.emit('error', { message: result.error });
        return;
      }

      // Notify opponent that player has rolled (without revealing the result)
      client.to(matchId).emit('opponent_rolled', {
        matchId,
        playerId,
        timestamp: Date.now()
      });
      
      // If both players have rolled, broadcast synchronized results
      if (result.bothPlayersRolled && result.player1Result && result.player2Result) {
        console.log(`🎮 Both Dice Duel players rolled - processing round result`);
        
        // 🎰 CASINO-GRADE SYNCHRONIZED ANIMATION TIMING
        const animationStartTime = Date.now() + 2000; // 2 seconds buffer for synchronization
                  const animationDuration = 6000; // 6.0 seconds - RESEARCH-BASED realistic dice physics timing (authentic dice rolls take 5-8 seconds, 6.0 is optimal)
        
        console.log(`🎯 Sending personalized Dice Duel results with SYNCHRONIZED timing:`);
        console.log(`   Animation starts: ${animationStartTime}, Duration: ${animationDuration}ms`);
        console.log(`   Player 1 (${result.player1Result.playerDice} vs ${result.player1Result.opponentDice}): ${result.player1Result.winner}`);
        console.log(`   Player 2 (${result.player2Result.playerDice} vs ${result.player2Result.opponentDice}): ${result.player2Result.winner}`);

        // Get all sockets in the match room for personalized results
        const socketsInRoom = await this.server.in(matchId).fetchSockets();
        
        for (const socket of socketsInRoom) {
          const socketPlayerId = this.getPlayerIdFromSocket(socket);
          
          // Determine which result to send to this socket
          const isPlayer1 = socketPlayerId === result.gameState?.player1?.wallet || 
                           (await this.matchService.getMatch(matchId))?.player1?.wallet === socketPlayerId;
          
          const personalizedResult = isPlayer1 ? result.player1Result : result.player2Result;
          
          socket.emit('dice_result', {
            matchId,
            ...personalizedResult,
            animationStartTime,
            animationDuration, // 🎰 CRITICAL: Professional gambling animation duration
            timestamp: Date.now()
          });
        }

        console.log(`✅ Sent synchronized Dice Duel result to ${socketsInRoom.length} players with animation start time: ${animationStartTime}`);
      } else {
        // Only one player has rolled, broadcast updated game state
        this.server.to(matchId).emit('dice_game_state', {
          matchId,
          gameState: result.gameState,
          playerScore: result.playerScore,
          opponentScore: result.opponentScore,
          timestamp: Date.now()
        });
      }

      console.log(`🎲 Dice roll processed: ${playerId} in match ${matchId}`);
    } catch (error) {
      console.error('Error processing dice roll:', error);
      client.emit('error', { message: 'Failed to process dice roll' });
    }
  }

  @SubscribeMessage('get_dice_duel_state')
  async handleGetDiceDuelState(
    @MessageBody() data: { matchId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { matchId } = data;
    
    try {
      const gameState = await this.matchService.getDiceDuelGameState(matchId);
      
      if (gameState) {
        client.emit('dice_game_state', {
          matchId,
          gameState: gameState.gameData,
          betAmount: gameState.betAmount,
          player1: gameState.player1,
          player2: gameState.player2,
          timestamp: Date.now()
        });
      } else {
        client.emit('error', { message: 'Match not found' });
      }
    } catch (error) {
      console.error('Error getting dice duel state:', error);
      client.emit('error', { message: 'Failed to get game state' });
    }
  }

  // Helper method to get player ID from socket (used for personalized results)
  private getPlayerIdFromSocket(socket: any): string {
    // 🔧 ENHANCED: Extract player ID from socket handshake or connected players map
    const playerId = socket.handshake?.query?.playerId || 
                    socket.handshake?.auth?.playerId ||
                    this.getPlayerFromConnectedMap(socket.id);
    
    console.log(`🔍 Socket ${socket.id} -> Player ID: ${playerId}`);
    return playerId || socket.id;
  }

  // Helper to get player from connected players map
  private getPlayerFromConnectedMap(socketId: string): string | null {
    for (const [playerId, playerSocket] of this.connectedPlayers.entries()) {
      if (playerSocket.id === socketId) {
        return playerId;
      }
    }
    return null;
  }

  // ===== MINES GAME HANDLERS =====

  @SubscribeMessage('start_mines_round')
  async handleStartMinesRound(
    @MessageBody() data: { matchId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      this.logger.log(`💣 Starting mines round for match ${data.matchId}`);
      
      const result = await this.matchService.startMinesRound(data.matchId);
      
      if (result.success) {
        // Get the current round's mine grid
        const currentRound = result.gameState?.rounds[result.gameState.rounds.length - 1];
        
        // Broadcast round start to both players with provably fair data
        this.server.to(data.matchId).emit('mines_round_started', {
          matchId: data.matchId,
          roundNumber: result.gameState?.currentRound,
          // 🛡️ SECURITY: Never send mine positions to frontend!
          // mineGrid: currentRound?.mineGrid, // REMOVED for security
          // 🎰 PROVABLY FAIR: Send hashed server seed for verification
          proofData: {
            hashedServerSeed: currentRound?.proofData?.hashedServerSeed,
            clientSeed: currentRound?.proofData?.clientSeed,
            nonce: currentRound?.proofData?.nonce,
            // serverSeed: NEVER SEND - kept secret until round ends
          },
          timestamp: Date.now()
        });
      } else {
        client.emit('error', { message: result.error });
      }

    } catch (error) {
      this.logger.error('Error starting mines round:', error);
      client.emit('error', { message: 'Failed to start mines round' });
    }
  }

  @SubscribeMessage('submit_mines_turn')
  async handleSubmitMinesTurn(
    @MessageBody() data: { matchId: string; playerId: string; revealedTiles: string[] },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      this.logger.log(`💣 Mines turn from ${data.playerId}: ${data.revealedTiles.length} tiles revealed`);
      
      const result = await this.matchService.processMinesTurn(data.matchId, data.playerId, data.revealedTiles);
      
      if (!result.success) {
        client.emit('error', { message: result.error });
        return;
      }

      // Notify opponent that player has completed their turn
      client.to(data.matchId).emit('opponent_mines_turn_complete', {
        matchId: data.matchId,
        playerId: data.playerId,
        timestamp: Date.now()
      });

      // Check if round is complete (both players finished)
      const currentRound = result.gameState?.rounds[result.gameState.rounds.length - 1];
      if (currentRound?.player1Turn && currentRound?.player2Turn) {
        this.logger.log(`🏆 Mines round ${currentRound.roundNumber} complete - broadcasting results`);
        
        // 🔧 NEW: Clear timeout since round completed normally
        this.matchService.clearMinesRoundTimeout(data.matchId);
        
        await this.broadcastRoundResultsAndScheduleNext(data.matchId, result.gameState, currentRound);
      }

    } catch (error) {
      this.logger.error('Error processing mines turn:', error);
      client.emit('error', { message: 'Failed to process mines turn' });
    }
  }

  @SubscribeMessage('check_mines_tile')
  async handleCheckMinesTile(
    @MessageBody() data: { matchId: string; playerId: string; tilePosition: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      // 🎯 CRITICAL: Update player activity  
      this.updatePlayerActivity(data.playerId);
      
      this.logger.log(`💣 Player ${data.playerId} checking tile ${data.tilePosition} in match ${data.matchId}`);
      
      const result = await this.matchService.checkMinesTile(data.matchId, data.tilePosition, data.playerId);
      
      if (result.success) {
        // Emit result to all players in the match
        this.server.to(data.matchId).emit('mines_tile_result', {
          matchId: data.matchId,
          playerId: data.playerId,
          tilePosition: data.tilePosition,
          isMine: result.isMine,
          currentMultiplier: result.currentMultiplier,
          gameOver: result.gameOver,
          revealedTiles: result.revealedTiles,
          timestamp: Date.now()
        });

        // If game over, handle auto-submission logic
        if (result.gameOver && result.isMine) {
          // This player hit a mine - auto-submit their turn and check if round is complete
          const autoSubmitResult = await this.matchService.processMinesTurn(data.matchId, data.playerId, result.revealedTiles || []);
          
          if (autoSubmitResult.success) {
            // 🎯 CRITICAL: Notify opponent instantly (never batched)
            this.server.to(data.matchId).emit('opponent_mines_turn_complete', {
              matchId: data.matchId,
              playerId: data.playerId,
              hitMine: true,
              roundContinues: true, // 🔧 NEW: Indicate round is still active
              timestamp: Date.now()
            });

            // 🔧 NEW LOGIC: Only complete round if BOTH players have played
            const currentRound = autoSubmitResult.gameState?.rounds[autoSubmitResult.gameState.rounds.length - 1];
            if (currentRound?.player1Turn && currentRound?.player2Turn) {
              this.logger.log(`🏆 Mines round ${currentRound.roundNumber} complete (both players finished) - broadcasting results`);
              
              // 🔧 NEW: Clear timeout since round completed normally
              this.matchService.clearMinesRoundTimeout(data.matchId);
              
              await this.broadcastRoundResultsAndScheduleNext(data.matchId, autoSubmitResult.gameState, currentRound);
            } else {
              this.logger.log(`⏳ Player ${data.playerId} hit mine, but opponent can still play for potential draw`);
            }
          }
        }
        
        // 🧹 CLEANUP: Clean up monitoring handled elsewhere
      } else {
        client.emit('error', { message: result.error });
      }

    } catch (error) {
      this.logger.error('Error checking mines tile:', error);
      client.emit('error', { message: 'Failed to check tile' });
    }
  }

  @SubscribeMessage('get_mines_state')
  async handleGetMinesState(
    @MessageBody() data: { matchId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const gameState = await this.matchService.getMinesGameState(data.matchId);
      
      if (gameState) {
        client.emit('mines_game_state', {
          matchId: data.matchId,
          gameState,
          timestamp: Date.now()
        });
      } else {
        client.emit('error', { message: 'Mines match not found' });
      }
    } catch (error) {
      this.logger.error('Error getting mines state:', error);
      client.emit('error', { message: 'Failed to get mines state' });
    }
  }

  @SubscribeMessage('mines_round_ready')
  async handleMinesRoundReady(
    @MessageBody() data: { matchId: string; playerId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      this.logger.log(`💣 Mines round ready from ${data.playerId} in match ${data.matchId}`);
      
      // 🔧 FIX: Validate player is still connected
      const isPlayerConnected = this.connectedPlayers.has(data.playerId);
      if (!isPlayerConnected) {
        this.logger.warn(`⚠️ Player ${data.playerId} not connected - ignoring ready signal`);
        client.emit('error', { message: 'Player not connected' });
        return;
      }
      
      // Track player readiness and check if both players are ready
      const result = await this.matchService.setPlayerRoundReady(data.matchId, data.playerId);
      
      if (result.success) {
        // 🔧 FIX: Don't broadcast if player was already ready (prevent spam)
        if (!result.alreadyReady) {
          // 📦 BATCH: Player ready notifications can be batched (60fps)
          await this.broadcastToRoomOptimized(data.matchId, 'player_mines_round_ready', {
          matchId: data.matchId,
          playerId: data.playerId,
          timestamp: Date.now()
          }, {
            priority: 'normal',
            gameType: 'mines',
            batch: true
          });
        }

        // 🔧 FIX: If both players are ready, validate connections with recovery BEFORE starting
        if (result.bothPlayersReady && !result.alreadyReady) {
          this.logger.log(`🔍 Both players ready - validating connections with recovery for match ${data.matchId}`);
          
          // Get match data to identify both players
          const matchData = await this.matchService.getMatch(data.matchId);
          const player1Id = matchData.player1.wallet;
          const player2Id = matchData.player2?.wallet;
          
          // 🔄 Use enhanced connection validation with recovery
          const validation = await this.connectionRecoveryService.validatePlayerConnections(player1Id, player2Id);
          
          this.logger.log(`🔍 Connection validation result: ${validation.action} - ${validation.message || 'OK'}`);
          
          switch (validation.action) {
            case 'proceed':
              // Both connected - start round immediately
              this.logger.log(`✅ Both players connected - starting round for match ${data.matchId}`);
              this.startNextRound(data.matchId);
              break;
              
            case 'wait':
              // Waiting for reconnection
              this.logger.log(`⏳ Waiting for player reconnection in match ${data.matchId}`);
              
              // Reset readiness and notify players
              await this.matchService.clearPlayerReadiness(data.matchId);
              this.server.to(data.matchId).emit('connection_recovery_waiting', {
                matchId: data.matchId,
                message: validation.message,
                timestamp: Date.now()
              });
              
              // Attempt recovery
              setTimeout(async () => {
                const recovery = await this.connectionRecoveryService.validatePlayerConnections(player1Id, player2Id);
                if (recovery.action === 'proceed') {
                  this.logger.log(`✅ Connection recovered - starting round for match ${data.matchId}`);
                  this.startNextRound(data.matchId);
                } else {
                  this.logger.warn(`❌ Connection recovery failed for match ${data.matchId}`);
                }
              }, 5000); // 5-second recovery attempt
              break;
              
            case 'force_start':
              // One player connected, proceed with that player
              this.logger.log(`⚡ Force starting round for match ${data.matchId} - one player connected`);
              this.server.to(data.matchId).emit('connection_recovery_forced', {
                matchId: data.matchId,
                message: validation.message,
                timestamp: Date.now()
              });
              this.startNextRound(data.matchId);
              break;
              
            case 'abort':
              // Both disconnected - abort
              this.logger.warn(`❌ Both players disconnected for match ${data.matchId} - aborting`);
              await this.matchService.clearPlayerReadiness(data.matchId);
              this.server.to(data.matchId).emit('connection_recovery_failed', {
                matchId: data.matchId,
                message: validation.message,
                timestamp: Date.now()
              });
              break;
          }
        }
      } else {
        client.emit('error', { message: result.error });
      }

    } catch (error) {
      this.logger.error('Error handling mines round ready:', error);
      client.emit('error', { message: 'Failed to process round ready' });
    }
  }

  /**
   * 🚀 Helper method to start next round with proper error handling
   */
  private async startNextRound(matchId: string): Promise<void> {
    try {
      const nextRoundResult = await this.matchService.startMinesRound(matchId);
      if (nextRoundResult.success) {
        // 🎯 CRITICAL: Round start is instant (never batched)
        this.server.to(matchId).emit('mines_round_started', {
          matchId: matchId,
          roundNumber: nextRoundResult.gameState?.currentRound,
          timestamp: Date.now()
        });
        this.logger.log(`✅ Next round started successfully for match ${matchId}`);
      } else {
        this.logger.error(`❌ Failed to start next round for match ${matchId}: ${nextRoundResult.error}`);
      }
    } catch (error) {
      this.logger.error(`💥 Error starting round for match ${matchId}:`, error);
    }
  }

  /**
   * 🔄 SYNC VALIDATION: Handle client state validation request
   */
  @SubscribeMessage('validate-sync')
  async handleSyncValidation(
    @MessageBody() data: { 
      matchId: string; 
      clientChecksum: string; 
      clientState?: any;
      playerId: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { matchId, clientChecksum, clientState, playerId } = data;
      
      this.logger.debug(`🔄 SYNC VALIDATION: Received from ${playerId} for match ${matchId}`);
      
      // Validate client state against server state
      const validationResult = await this.syncValidationService.validateClientState(
        matchId, 
        clientChecksum, 
        clientState
      );
      
      if (validationResult.isValid) {
        // State is synchronized - send confirmation
        client.emit('sync-validated', {
          matchId,
          status: 'valid',
          clientChecksum,
          serverChecksum: validationResult.serverChecksum,
          timestamp: Date.now()
        });
        
        this.logger.debug(`✅ SYNC VALID: ${playerId} in match ${matchId}`);
      } else {
        // State mismatch detected - send correction
        this.logger.warn(`🔄 SYNC MISMATCH: ${playerId} in match ${matchId} - triggering correction`);
        
        // Generate corrected state
        const correctionResult = await this.syncValidationService.generateCorrectedState(matchId);
        
        client.emit('sync-correction', {
          matchId,
          status: 'mismatch',
          clientChecksum,
          serverChecksum: validationResult.serverChecksum,
          mismatchDetails: validationResult.mismatchDetails,
          requiresRefresh: true,
          correctionData: correctionResult.correctedState,
          timestamp: Date.now()
        });
        
        // Alert other players of potential desync (batched, non-critical)
        await this.broadcastToRoomOptimized(matchId, 'sync-alert', {
          matchId,
          alertType: 'state_mismatch_detected',
          timestamp: Date.now()
        }, { priority: 'normal', gameType: 'mines', batch: true });
      }
      
    } catch (error) {
      this.logger.error(`❌ SYNC VALIDATION ERROR:`, error);
      
      // Send error response
      client.emit('sync-error', {
        matchId: data.matchId,
        error: 'Sync validation failed',
        timestamp: Date.now()
      });
    }
  }

  /**
   * 🔄 SYNC VALIDATION: Handle client state checksum generation request
   */
  @SubscribeMessage('generate-checksum')
  async handleGenerateChecksum(
    @MessageBody() data: { matchId: string; playerId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { matchId, playerId } = data;
      
      // Get current server state
      const gameState = await this.matchService.getMinesGameState(matchId);
      
      if (!gameState) {
        client.emit('checksum-error', {
          matchId,
          error: 'Match not found',
          timestamp: Date.now()
        });
        return;
      }
      
      // Generate server checksum
      const serverChecksum = this.syncValidationService.generateStateChecksum(gameState);
      
      client.emit('checksum-generated', {
        matchId,
        serverChecksum,
        timestamp: Date.now(),
        gameState: {
          // Send critical fields for client validation
          player1Score: gameState.player1Score,
          player2Score: gameState.player2Score,
          currentRound: gameState.currentRound,
          matchComplete: gameState.matchComplete,
          roundsCount: gameState.rounds?.length || 0
        }
      });
      
      this.logger.debug(`📝 CHECKSUM GENERATED: ${serverChecksum} for match ${matchId}`);
      
    } catch (error) {
      this.logger.error(`❌ CHECKSUM GENERATION ERROR:`, error);
      
      client.emit('checksum-error', {
        matchId: data.matchId,
        error: 'Checksum generation failed',
        timestamp: Date.now()
      });
    }
  }

  /**
   * 🔄 SYNC VALIDATION: Periodic sync validation for active matches
   */
  @SubscribeMessage('request-sync-check')
  async handleRequestSyncCheck(
    @MessageBody() data: { matchId: string; playerId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { matchId, playerId } = data;
      
      // Trigger periodic validation
      await this.syncValidationService.performPeriodicValidation(matchId);
      
      // Send sync check completed (batched, non-critical)
      client.emit('sync-check-completed', {
        matchId,
        status: 'completed',
        timestamp: Date.now()
      });
      
      this.logger.debug(`🔄 SYNC CHECK: Completed for ${playerId} in match ${matchId}`);
      
    } catch (error) {
      this.logger.error(`❌ SYNC CHECK ERROR:`, error);
      
      client.emit('sync-check-error', {
        matchId: data.matchId,
        error: 'Sync check failed',
        timestamp: Date.now()
      });
    }
  }

  /**
   * 🔧 FIX: Centralized round completion handler to prevent race conditions
   */
  public async broadcastRoundResultsAndScheduleNext(matchId: string, gameState: any, currentRound: any): Promise<void> {
    try {
      // 7-second delay before next round (matching frontend reveal timing: 3s animation + 4s study)
      const nextRoundDelay = 7000;
      const nextRoundStartTime = Date.now() + nextRoundDelay;

      // Get all sockets in the match room for personalized results
      const socketsInRoom = await this.server.in(matchId).fetchSockets();
      
      for (const socket of socketsInRoom) {
        const socketPlayerId = this.getPlayerIdFromSocket(socket);
        
        // Determine which result to send to this socket
        const isPlayer1 = socketPlayerId === gameState?.player1;
        const playerTurn = isPlayer1 ? currentRound.player1Turn : currentRound.player2Turn;
        const opponentTurn = isPlayer1 ? currentRound.player2Turn : currentRound.player1Turn;
        
        socket.emit('mines_round_result', {
          matchId: matchId,
          roundNumber: currentRound.roundNumber,
          playerResult: {
            multiplier: playerTurn?.finalMultiplier,
            hitMine: playerTurn?.hitMine,
            revealedTiles: playerTurn?.revealedTiles || [],
            grid: playerTurn?.grid
          },
          opponentResult: {
            multiplier: opponentTurn?.finalMultiplier,
            hitMine: opponentTurn?.hitMine,
            revealedTiles: opponentTurn?.revealedTiles || []
          },
          roundWinner: currentRound.winner,
          matchScore: {
            player: isPlayer1 ? gameState.player1Score : gameState.player2Score,
            opponent: isPlayer1 ? gameState.player2Score : gameState.player1Score
          },
          matchComplete: gameState?.matchComplete,
          matchWinner: gameState?.winner,
          nextRoundStartTime: gameState?.matchComplete ? null : nextRoundStartTime,
          timestamp: Date.now()
        });
      }

      // If match is not complete, wait for both players to be ready (with 20s fallback)
      if (!gameState?.matchComplete) {
        this.logger.log(`⏳ Match ${matchId} waiting for both players to be ready for next round`);
            } else {
        this.logger.log(`🏁 Match ${matchId} complete - cleaning up active game monitoring`);
        this.cleanupActiveGameMonitoring(matchId);
      }
    } catch (error) {
      this.logger.error(`💥 Error in broadcastRoundResultsAndScheduleNext for match ${matchId}:`, error);
    }
  }
  
  // ========================================
  // 🚀 PUMP WARS WEBSOCKET HANDLERS
  // ========================================
  
  /**
   * 🎯 PUMP WARS: Join a PumpWars match
   */
  @SubscribeMessage('join_pump_wars')
  async handleJoinPumpWars(
    @MessageBody() data: { matchId: string; playerId: string; wallet: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { matchId, playerId, wallet } = data;
      
      // Join the match room
      await client.join(matchId);
      
      // Get the pump wars service (you'll need to inject it)
      // const result = await this.pumpWarsService.joinPumpWarsMatch(matchId, playerId, wallet);
      
      // For now, simulate joining
      const result: { success: boolean; gameState?: any; error?: string } = { 
        success: true, 
        gameState: { connectedPlayers: new Set([playerId]) } 
      };
      
      if (result.success && result.gameState) {
        // Notify all players in the match
        await this.broadcastToRoomOptimized(matchId, 'pump_wars_player_joined', {
          matchId,
          playerId,
          connectedPlayers: Array.from(result.gameState.connectedPlayers),
          timestamp: Date.now()
        }, { priority: 'high', gameType: 'pump-wars' });
        
        // Send current game state to the joining player
        client.emit('pump_wars_state', {
          matchId,
          gameState: result.gameState,
          timestamp: Date.now()
        });
        
        this.logger.log(`🎯 Player ${playerId} joined PumpWars match ${matchId}`);
      } else {
        client.emit('pump_wars_error', {
          matchId,
          error: result.error || 'Failed to join match',
          timestamp: Date.now()
        });
      }
    } catch (error) {
      this.logger.error(`💥 Error in handleJoinPumpWars:`, error);
      client.emit('pump_wars_error', {
        matchId: data.matchId,
        error: 'Failed to join PumpWars match',
        timestamp: Date.now()
      });
    }
  }
  
  /**
   * 💰 PUMP WARS: Place a bet on price direction
   */
  @SubscribeMessage('pump_wars_bet')
  async handlePumpWarsBet(
    @MessageBody() data: { 
      matchId: string; 
      playerId: string; 
      wallet: string; 
      betAmount: number; 
      direction: 'up' | 'down' 
    },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { matchId, playerId, wallet, betAmount, direction } = data;
      
      // Validate bet amount
      if (betAmount <= 0 || betAmount > 1000) {
        client.emit('pump_wars_bet_error', {
          matchId,
          error: 'Invalid bet amount',
          timestamp: Date.now()
        });
        return;
      }
      
      // Place the bet (you'll need to inject PumpWarsService)
      // const result = await this.pumpWarsService.placeBet(matchId, playerId, wallet, betAmount, direction);
      
      // For now, simulate successful bet
      const result: { success: boolean; gameState?: any; error?: string } = { 
        success: true, 
        gameState: { 
          currentRound: { 
            totalUpPool: direction === 'up' ? betAmount : 0,
            totalDownPool: direction === 'down' ? betAmount : 0,
            upBets: direction === 'up' ? [{ playerId, betAmount, direction }] : [],
            downBets: direction === 'down' ? [{ playerId, betAmount, direction }] : []
          } 
        } 
      };
      
      if (result.success && result.gameState) {
        // Broadcast bet to all players in the match
        await this.broadcastToRoomOptimized(matchId, 'pump_wars_bet_placed', {
          matchId,
          playerId,
          betAmount,
          direction,
          totalUpPool: result.gameState.currentRound.totalUpPool,
          totalDownPool: result.gameState.currentRound.totalDownPool,
          totalBets: result.gameState.currentRound.upBets.length + result.gameState.currentRound.downBets.length,
          timestamp: Date.now()
        }, { priority: 'high', gameType: 'pump-wars' });
        
        // Send confirmation to the betting player
        client.emit('pump_wars_bet_confirmed', {
          matchId,
          betAmount,
          direction,
          timestamp: Date.now()
        });
        
        this.logger.log(`💰 PumpWars bet placed: ${playerId} bet ${betAmount} SOL on ${direction} in match ${matchId}`);
      } else {
        client.emit('pump_wars_bet_error', {
          matchId,
          error: result.error || 'Failed to place bet',
          timestamp: Date.now()
        });
      }
    } catch (error) {
      this.logger.error(`💥 Error in handlePumpWarsBet:`, error);
      client.emit('pump_wars_bet_error', {
        matchId: data.matchId,
        error: 'Failed to place bet',
        timestamp: Date.now()
      });
    }
  }
  
  /**
   * 🚀 PUMP WARS: Start a new round
   */
  @SubscribeMessage('pump_wars_start_round')
  async handlePumpWarsStartRound(
    @MessageBody() data: { matchId: string; token?: string; timeFrame?: number },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { matchId, token = 'SOL', timeFrame = 60 } = data;
      
      // Start new round (you'll need to inject PumpWarsService)
      // const result = await this.pumpWarsService.startNewRound(matchId);
      
      // For now, simulate starting a round
      const startTime = Date.now();
      const result: { success: boolean; gameState?: any; error?: string } = { 
        success: true, 
        gameState: { 
          currentRound: {
            roundId: `${matchId}_${startTime}`,
            token,
            startTime,
            endTime: startTime + (timeFrame * 1000),
            startPrice: 150.45, // Mock SOL price
            status: 'betting',
            bettingCloseTime: startTime + (timeFrame * 1000) - 5000
          } 
        } 
      };
      
      if (result.success && result.gameState) {
        // Broadcast round start to all players
        await this.broadcastToRoomOptimized(matchId, 'pump_wars_round_started', {
          matchId,
          roundId: result.gameState.currentRound.roundId,
          token: result.gameState.currentRound.token,
          startTime: result.gameState.currentRound.startTime,
          endTime: result.gameState.currentRound.endTime,
          startPrice: result.gameState.currentRound.startPrice,
          timeFrame,
          bettingCloseTime: result.gameState.currentRound.bettingCloseTime,
          timestamp: Date.now()
        }, { priority: 'high', gameType: 'pump-wars' });
        
        this.logger.log(`🚀 PumpWars round started in match ${matchId}: ${token} @ $${result.gameState.currentRound.startPrice}`);
      } else {
        client.emit('pump_wars_error', {
          matchId,
          error: result.error || 'Failed to start round',
          timestamp: Date.now()
        });
      }
    } catch (error) {
      this.logger.error(`💥 Error in handlePumpWarsStartRound:`, error);
      client.emit('pump_wars_error', {
        matchId: data.matchId,
        error: 'Failed to start round',
        timestamp: Date.now()
      });
    }
  }
  
  /**
   * 🏁 PUMP WARS: Get current match state
   */
  @SubscribeMessage('get_pump_wars_state')
  async handleGetPumpWarsState(
    @MessageBody() data: { matchId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { matchId } = data;
      
      // Get current state (you'll need to inject PumpWarsService)
      // const gameState = await this.pumpWarsService.getMatchState(matchId);
      
      // For now, simulate getting state
      const gameState = {
        matchId,
        currentRound: {
          roundId: `${matchId}_${Date.now()}`,
          token: 'SOL',
          status: 'betting',
          startPrice: 150.45,
          totalUpPool: 0,
          totalDownPool: 0,
          upBets: [],
          downBets: []
        },
        connectedPlayers: new Set(),
        playerStats: new Map()
      };
      
      client.emit('pump_wars_state', {
        matchId,
        gameState,
        timestamp: Date.now()
      });
      
      this.logger.debug(`📊 PumpWars state sent for match ${matchId}`);
    } catch (error) {
      this.logger.error(`💥 Error in handleGetPumpWarsState:`, error);
      client.emit('pump_wars_error', {
        matchId: data.matchId,
        error: 'Failed to get match state',
        timestamp: Date.now()
      });
    }
  }
  
  /**
   * 📊 PUMP WARS: Broadcast price update to all players
   */
  public broadcastPumpWarsPriceUpdate(matchId: string, priceData: {
    token: string;
    price: number;
    priceChange: number;
    priceChangePercent: number;
    timestamp: number;
  }): void {
    try {
      this.broadcastToRoomOptimized(matchId, 'pump_wars_price_update', {
        matchId,
        ...priceData
      }, { priority: 'high', gameType: 'pump-wars', compress: true });
      
      this.logger.debug(`📊 Price update broadcast for ${priceData.token}: $${priceData.price} (${priceData.priceChangePercent.toFixed(2)}%)`);
    } catch (error) {
      this.logger.error(`💥 Error broadcasting price update:`, error);
    }
  }
  
  /**
   * 🏆 PUMP WARS: Broadcast round results with payouts
   */
  public broadcastPumpWarsRoundResult(matchId: string, roundResult: {
    roundId: string;
    token: string;
    priceChange: number;
    priceChangePercent: number;
    winningDirection: 'up' | 'down' | null;
    payouts: Array<{
      playerId: string;
      betAmount: number;
      winAmount: number;
      totalPayout: number;
      roi: number;
    }>;
    totalWinners: number;
  }): void {
    try {
      this.broadcastToRoomOptimized(matchId, 'pump_wars_round_result', {
        matchId,
        ...roundResult,
        timestamp: Date.now()
      }, { priority: 'high', gameType: 'pump-wars' });
      
      this.logger.log(`🏆 PumpWars round result broadcast: ${roundResult.token} ${roundResult.priceChangePercent.toFixed(2)}% - ${roundResult.totalWinners} winners`);
    } catch (error) {
      this.logger.error(`💥 Error broadcasting round result:`, error);
    }
  }
} 