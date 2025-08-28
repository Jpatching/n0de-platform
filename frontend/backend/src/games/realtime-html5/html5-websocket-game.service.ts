import { Injectable, Logger } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameType } from '../game-types';

// ✅ HTML5 Game State Interface
export interface HTML5GameState {
  gameId: string;
  gameType: GameType;
  players: {
    [playerId: string]: {
      id: string;
      position: { x: number; y: number };
      score: number;
      health?: number;
      powerUps?: string[];
      lastAction: number;
    };
  };
  gameObjects: {
    [objectId: string]: {
      id: string;
      type: 'ball' | 'powerup' | 'obstacle' | 'projectile';
      position: { x: number; y: number };
      velocity?: { x: number; y: number };
      properties?: Record<string, any>;
    };
  };
  gameTime: number;
  frameCount: number;
  status: 'waiting' | 'starting' | 'playing' | 'paused' | 'finished';
  winner?: string;
  lastUpdate: number;
}

// ✅ HTML5 Game Input Interface
export interface HTML5GameInput {
  playerId: string;
  inputType: 'move' | 'action' | 'special';
  data: {
    direction?: { x: number; y: number };
    action?: string;
    target?: { x: number; y: number };
    timestamp: number;
  };
}

// ✅ HTML5 Game Result Interface
export interface HTML5GameResult {
  websocketSessionId: string;
  gameDurationMs: number;
  player1Score: number;
  player2Score: number;
  totalActions: number;
  gameEventsHash: string;
  serverStateHash: string;
  frameCount: number;
  networkLatencyAvg: number;
  antiCheatSignature: string;
}

// ✅ HTML5 Game Room Interface
export interface HTML5GameRoom {
  id: string;
  matchId: string;
  gameType: GameType;
  players: Map<string, Socket>;
  gameState: HTML5GameState;
  gameEngine: HTML5GameEngine;
  startTime: number;
  lastUpdate: number;
  actionHistory: HTML5GameInput[];
  latencyTracker: Map<string, number[]>;
}

@Injectable()
export class HTML5GameEngine {
  private readonly logger = new Logger(HTML5GameEngine.name);

  constructor(private gameType: GameType) {}

  // ✅ Initialize game state based on game type
  initializeGameState(gameId: string, playerIds: string[]): HTML5GameState {
    const baseState: HTML5GameState = {
      gameId,
      gameType: this.gameType,
      players: {},
      gameObjects: {},
      gameTime: 0,
      frameCount: 0,
      status: 'waiting',
      lastUpdate: Date.now(),
    };

    // Initialize players based on game type
    playerIds.forEach((playerId, index) => {
      baseState.players[playerId] = {
        id: playerId,
        position: this.getStartingPosition(index),
        score: 0,
        lastAction: Date.now(),
      };
    });

    // Initialize game objects based on game type
    this.initializeGameObjects(baseState);

    return baseState;
  }

  // ✅ Get starting position based on game type
  private getStartingPosition(playerIndex: number): { x: number; y: number } {
    switch (this.gameType) {
      case GameType.SportsHeads:
        return playerIndex === 0 
          ? { x: 200, y: 300 }  // Left side
          : { x: 600, y: 300 }; // Right side
      
      case GameType.Racing:
        return { x: 100 + playerIndex * 50, y: 400 };
      
      case GameType.Fighting:
        return playerIndex === 0 
          ? { x: 150, y: 250 }  // Left fighter
          : { x: 650, y: 250 }; // Right fighter
      
      case GameType.PlatformerBattle:
        return playerIndex === 0 
          ? { x: 100, y: 400 }  // Left platform
          : { x: 700, y: 400 }; // Right platform
      
      case GameType.BubbleShooter:
        return { x: 400, y: 500 - playerIndex * 100 };
      
      case GameType.Snake:
        return playerIndex === 0 
          ? { x: 200, y: 200 }  // Top left
          : { x: 600, y: 400 }; // Bottom right
      
      case GameType.Tetris:
        return { x: 200 + playerIndex * 400, y: 50 };
      
      case GameType.Breakout:
        return { x: 400, y: 450 - playerIndex * 50 };
      
      default:
        return { x: 400, y: 300 };
    }
  }

  // ✅ Initialize game objects based on game type
  private initializeGameObjects(gameState: HTML5GameState): void {
    switch (this.gameType) {
      case GameType.SportsHeads:
        // Soccer ball
        gameState.gameObjects['ball'] = {
          id: 'ball',
          type: 'ball',
          position: { x: 400, y: 300 },
          velocity: { x: 0, y: 0 },
          properties: { radius: 20, bounciness: 0.8 }
        };
        break;
      
      case GameType.Racing:
        // Racing checkpoints
        for (let i = 0; i < 5; i++) {
          gameState.gameObjects[`checkpoint_${i}`] = {
            id: `checkpoint_${i}`,
            type: 'obstacle',
            position: { x: 100 + i * 150, y: 200 },
            properties: { checkpointIndex: i }
          };
        }
        break;
      
      case GameType.Fighting:
        // Fighting arena boundaries
        gameState.gameObjects['arena'] = {
          id: 'arena',
          type: 'obstacle',
          position: { x: 400, y: 250 },
          properties: { width: 600, height: 300 }
        };
        break;
      
      case GameType.BubbleShooter:
        // Initial bubbles
        for (let i = 0; i < 10; i++) {
          gameState.gameObjects[`bubble_${i}`] = {
            id: `bubble_${i}`,
            type: 'obstacle',
            position: { x: 50 + i * 70, y: 50 },
            properties: { color: ['red', 'blue', 'green', 'yellow'][i % 4] }
          };
        }
        break;
      
      case GameType.Snake:
        // Food items
        gameState.gameObjects['food'] = {
          id: 'food',
          type: 'powerup',
          position: { x: Math.random() * 800, y: Math.random() * 600 },
          properties: { points: 10 }
        };
        break;
    }
  }

  // ✅ Process player input and update game state
  processInput(gameState: HTML5GameState, input: HTML5GameInput): HTML5GameState {
    const player = gameState.players[input.playerId];
    if (!player) return gameState;

    // Update player's last action time
    player.lastAction = Date.now();

    // Process input based on game type
    switch (this.gameType) {
      case GameType.SportsHeads:
        this.processSoccerInput(gameState, input);
        break;
      
      case GameType.Racing:
        this.processRacingInput(gameState, input);
        break;
      
      case GameType.Fighting:
        this.processFightingInput(gameState, input);
        break;
      
      case GameType.PlatformerBattle:
        this.processPlatformerInput(gameState, input);
        break;
      
      case GameType.BubbleShooter:
        this.processBubbleShooterInput(gameState, input);
        break;
      
      case GameType.Snake:
        this.processSnakeInput(gameState, input);
        break;
      
      case GameType.Tetris:
        this.processTetrisInput(gameState, input);
        break;
      
      case GameType.Breakout:
        this.processBreakoutInput(gameState, input);
        break;
    }

    return gameState;
  }

  // ✅ Sports Head Soccer input processing
  private processSoccerInput(gameState: HTML5GameState, input: HTML5GameInput): void {
    const player = gameState.players[input.playerId];
    const ball = gameState.gameObjects['ball'];
    
    if (input.inputType === 'move' && input.data.direction) {
      // Move player
      player.position.x += input.data.direction.x * 5;
      player.position.y += input.data.direction.y * 5;
      
      // Keep player in bounds
      player.position.x = Math.max(50, Math.min(750, player.position.x));
      player.position.y = Math.max(50, Math.min(550, player.position.y));
    }
    
    if (input.inputType === 'action' && input.data.action === 'kick') {
      // Check if player is near ball
      const distance = Math.sqrt(
        Math.pow(player.position.x - ball.position.x, 2) + 
        Math.pow(player.position.y - ball.position.y, 2)
      );
      
      if (distance < 50) {
        // Kick ball towards target
        if (input.data.target) {
          const kickPower = 10;
          const dx = input.data.target.x - ball.position.x;
          const dy = input.data.target.y - ball.position.y;
          const magnitude = Math.sqrt(dx * dx + dy * dy);
          
          ball.velocity = {
            x: (dx / magnitude) * kickPower,
            y: (dy / magnitude) * kickPower
          };
        }
      }
    }
  }

  // ✅ Racing input processing
  private processRacingInput(gameState: HTML5GameState, input: HTML5GameInput): void {
    const player = gameState.players[input.playerId];
    
    if (input.inputType === 'move' && input.data.direction) {
      const speed = 8;
      player.position.x += input.data.direction.x * speed;
      player.position.y += input.data.direction.y * speed;
      
      // Keep player in bounds
      player.position.x = Math.max(0, Math.min(800, player.position.x));
      player.position.y = Math.max(0, Math.min(600, player.position.y));
    }
    
    if (input.inputType === 'action' && input.data.action === 'boost') {
      // Boost forward
      player.position.x += 20;
    }
  }

  // ✅ Fighting input processing
  private processFightingInput(gameState: HTML5GameState, input: HTML5GameInput): void {
    const player = gameState.players[input.playerId];
    
    if (input.inputType === 'move' && input.data.direction) {
      player.position.x += input.data.direction.x * 4;
      player.position.y += input.data.direction.y * 4;
      
      // Keep in arena bounds
      player.position.x = Math.max(100, Math.min(700, player.position.x));
      player.position.y = Math.max(100, Math.min(400, player.position.y));
    }
    
    if (input.inputType === 'action' && input.data.action === 'attack') {
      // Check for hits against other players
      Object.values(gameState.players).forEach(otherPlayer => {
        if (otherPlayer.id !== player.id) {
          const distance = Math.sqrt(
            Math.pow(player.position.x - otherPlayer.position.x, 2) + 
            Math.pow(player.position.y - otherPlayer.position.y, 2)
          );
          
          if (distance < 60) {
            // Hit detected
            if (!otherPlayer.health) otherPlayer.health = 100;
            otherPlayer.health -= 10;
            
            if (otherPlayer.health <= 0) {
              player.score += 1;
              gameState.winner = player.id;
              gameState.status = 'finished';
            }
          }
        }
      });
    }
  }

  // ✅ Platformer Battle input processing
  private processPlatformerInput(gameState: HTML5GameState, input: HTML5GameInput): void {
    const player = gameState.players[input.playerId];
    
    if (input.inputType === 'move' && input.data.direction) {
      player.position.x += input.data.direction.x * 6;
      
      // Jumping
      if (input.data.direction.y < 0) {
        player.position.y += input.data.direction.y * 12;
      }
      
      // Keep in bounds
      player.position.x = Math.max(0, Math.min(800, player.position.x));
      player.position.y = Math.max(0, Math.min(600, player.position.y));
    }
  }

  // ✅ Bubble Shooter input processing
  private processBubbleShooterInput(gameState: HTML5GameState, input: HTML5GameInput): void {
    const player = gameState.players[input.playerId];
    
    if (input.inputType === 'action' && input.data.target) {
      // Shoot bubble towards target
      const bubbleId = `bubble_${Date.now()}_${input.playerId}`;
      gameState.gameObjects[bubbleId] = {
        id: bubbleId,
        type: 'projectile',
        position: { ...player.position },
        velocity: {
          x: (input.data.target.x - player.position.x) * 0.1,
          y: (input.data.target.y - player.position.y) * 0.1
        },
        properties: { owner: input.playerId, color: 'red' }
      };
    }
  }

  // ✅ Snake input processing
  private processSnakeInput(gameState: HTML5GameState, input: HTML5GameInput): void {
    const player = gameState.players[input.playerId];
    
    if (input.inputType === 'move' && input.data.direction) {
      const speed = 5;
      player.position.x += input.data.direction.x * speed;
      player.position.y += input.data.direction.y * speed;
      
      // Wrap around screen
      if (player.position.x < 0) player.position.x = 800;
      if (player.position.x > 800) player.position.x = 0;
      if (player.position.y < 0) player.position.y = 600;
      if (player.position.y > 600) player.position.y = 0;
    }
  }

  // ✅ Tetris input processing
  private processTetrisInput(gameState: HTML5GameState, input: HTML5GameInput): void {
    const player = gameState.players[input.playerId];
    
    if (input.inputType === 'move' && input.data.direction) {
      // Move tetris piece
      player.position.x += input.data.direction.x * 30;
      
      // Keep in bounds
      player.position.x = Math.max(0, Math.min(300, player.position.x));
    }
    
    if (input.inputType === 'action' && input.data.action === 'rotate') {
      // Rotate piece logic would go here
      player.score += 1; // Placeholder
    }
  }

  // ✅ Breakout input processing
  private processBreakoutInput(gameState: HTML5GameState, input: HTML5GameInput): void {
    const player = gameState.players[input.playerId];
    
    if (input.inputType === 'move' && input.data.direction) {
      // Move paddle
      player.position.x += input.data.direction.x * 8;
      
      // Keep paddle in bounds
      player.position.x = Math.max(50, Math.min(750, player.position.x));
    }
  }

  // ✅ Update game physics and check win conditions
  updateGameState(gameState: HTML5GameState): HTML5GameState {
    gameState.frameCount++;
    gameState.gameTime = Date.now() - gameState.lastUpdate;
    
    // Update game objects with physics
    Object.values(gameState.gameObjects).forEach(obj => {
      if (obj.velocity) {
        obj.position.x += obj.velocity.x;
        obj.position.y += obj.velocity.y;
        
        // Apply friction/gravity based on object type
        if (obj.type === 'ball') {
          obj.velocity.x *= 0.98;
          obj.velocity.y *= 0.98;
          
          // Bounce off walls
          if (obj.position.x <= 0 || obj.position.x >= 800) {
            obj.velocity.x *= -1;
          }
          if (obj.position.y <= 0 || obj.position.y >= 600) {
            obj.velocity.y *= -1;
          }
        }
      }
    });
    
    // Check win conditions based on game type
    this.checkWinConditions(gameState);
    
    gameState.lastUpdate = Date.now();
    return gameState;
  }

  // ✅ Check win conditions
  private checkWinConditions(gameState: HTML5GameState): void {
    switch (this.gameType) {
      case GameType.SportsHeads:
        // Check if ball crossed goal line
        const ball = gameState.gameObjects['ball'];
        if (ball.position.x <= 50) {
          // Right player scores
          const rightPlayer = Object.values(gameState.players)[1];
          rightPlayer.score++;
          if (rightPlayer.score >= 3) {
            gameState.winner = rightPlayer.id;
            gameState.status = 'finished';
          }
        } else if (ball.position.x >= 750) {
          // Left player scores
          const leftPlayer = Object.values(gameState.players)[0];
          leftPlayer.score++;
          if (leftPlayer.score >= 3) {
            gameState.winner = leftPlayer.id;
            gameState.status = 'finished';
          }
        }
        break;
      
      case GameType.Racing:
        // Check if player reached finish line
        Object.values(gameState.players).forEach(player => {
          if (player.position.x >= 750) {
            gameState.winner = player.id;
            gameState.status = 'finished';
          }
        });
        break;
      
      // Add more win condition checks for other games
    }
  }

  // ✅ Generate anti-cheat validation
  generateAntiCheatData(gameState: HTML5GameState, actionHistory: HTML5GameInput[]): any {
    const gameEventsHash = this.hashGameEvents(actionHistory);
    const serverStateHash = this.hashGameState(gameState);
    
    return {
      gameEventsHash,
      serverStateHash,
      totalActions: actionHistory.length,
      frameCount: gameState.frameCount,
      gameDuration: gameState.gameTime,
    };
  }

  // ✅ Hash game events for verification
  private hashGameEvents(actions: HTML5GameInput[]): string {
    const crypto = require('crypto');
    const actionString = JSON.stringify(actions.map(a => ({
      player: a.playerId,
      type: a.inputType,
      timestamp: a.data.timestamp
    })));
    return crypto.createHash('sha256').update(actionString).digest('hex');
  }

  // ✅ Hash game state for verification
  private hashGameState(gameState: HTML5GameState): string {
    const crypto = require('crypto');
    const stateString = JSON.stringify({
      players: Object.fromEntries(
        Object.entries(gameState.players).map(([id, player]) => [
          id, 
          { position: player.position, score: player.score }
        ])
      ),
      gameTime: gameState.gameTime,
      frameCount: gameState.frameCount,
      status: gameState.status,
      winner: gameState.winner
    });
    return crypto.createHash('sha256').update(stateString).digest('hex');
  }
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  namespace: '/html5-games'
})
export class HTML5WebSocketGameService implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(HTML5WebSocketGameService.name);
  private gameRooms: Map<string, HTML5GameRoom> = new Map();
  private playerSockets: Map<string, Socket> = new Map();

  async handleConnection(client: Socket) {
    this.logger.log(`HTML5 game client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`HTML5 game client disconnected: ${client.id}`);
    await this.handlePlayerDisconnect(client);
  }

  // ✅ Join HTML5 game room
  @SubscribeMessage('join-html5-game')
  async handleJoinGame(client: Socket, data: { 
    matchId: string; 
    playerId: string; 
    gameType: GameType 
  }) {
    try {
      const { matchId, playerId, gameType } = data;
      
      // Get or create game room
      let room = this.gameRooms.get(matchId);
      if (!room) {
        room = await this.createGameRoom(matchId, gameType);
      }

      // Add player to room
      room.players.set(playerId, client);
      this.playerSockets.set(playerId, client);
      
      // Join socket room
      client.join(matchId);

      // Start game if both players connected
      if (room.players.size === 2) {
        await this.startGame(room);
      }

      client.emit('joined-html5-game', { 
        matchId, 
        playersConnected: room.players.size,
        gameState: room.gameState 
      });

      this.logger.log(`Player ${playerId} joined HTML5 game ${matchId}`);
    } catch (error) {
      this.logger.error(`Error joining HTML5 game: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }

  // ✅ Handle player input
  @SubscribeMessage('html5-game-input')
  async handleGameInput(client: Socket, data: { 
    matchId: string; 
    playerId: string; 
    input: HTML5GameInput 
  }) {
    try {
      const { matchId, playerId, input } = data;
      
      const room = this.gameRooms.get(matchId);
      if (!room) {
        client.emit('error', { message: 'Game room not found' });
        return;
      }

      // Track latency
      const latency = Date.now() - input.data.timestamp;
      if (!room.latencyTracker.has(playerId)) {
        room.latencyTracker.set(playerId, []);
      }
      room.latencyTracker.get(playerId)!.push(latency);

      // Process input
      room.gameState = room.gameEngine.processInput(room.gameState, input);
      room.actionHistory.push(input);
      room.lastUpdate = Date.now();

      // Update game state
      room.gameState = room.gameEngine.updateGameState(room.gameState);

      // Broadcast updated game state
      this.server.to(matchId).emit('html5-game-state', {
        matchId,
        gameState: room.gameState,
        timestamp: Date.now(),
      });

      // Check if game is finished
      if (room.gameState.status === 'finished') {
        await this.finishGame(room);
      }

    } catch (error) {
      this.logger.error(`Error handling HTML5 game input: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }

  // ✅ Create game room
  private async createGameRoom(matchId: string, gameType: GameType): Promise<HTML5GameRoom> {
    const gameEngine = new HTML5GameEngine(gameType);
    const gameState = gameEngine.initializeGameState(matchId, []);
    
    const room: HTML5GameRoom = {
      id: matchId,
      matchId,
      gameType,
      players: new Map(),
      gameState,
      gameEngine,
      startTime: Date.now(),
      lastUpdate: Date.now(),
      actionHistory: [],
      latencyTracker: new Map(),
    };

    this.gameRooms.set(matchId, room);
    return room;
  }

  // ✅ Start game
  private async startGame(room: HTML5GameRoom): Promise<void> {
    const playerIds = Array.from(room.players.keys());
    room.gameState = room.gameEngine.initializeGameState(room.id, playerIds);
    room.gameState.status = 'playing';
    room.startTime = Date.now();

    // Notify players
    this.server.to(room.matchId).emit('html5-game-started', {
      matchId: room.matchId,
      gameType: room.gameType,
      gameState: room.gameState,
      timestamp: Date.now(),
    });

    this.logger.log(`Started HTML5 game ${room.matchId}`);
  }

  // ✅ Finish game
  private async finishGame(room: HTML5GameRoom): Promise<void> {
    // Generate anti-cheat data
    const antiCheatData = room.gameEngine.generateAntiCheatData(
      room.gameState, 
      room.actionHistory
    );

    // Calculate average latency
    const avgLatencies = new Map();
    room.latencyTracker.forEach((latencies, playerId) => {
      const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      avgLatencies.set(playerId, avg);
    });

    // Create game result
    const result: HTML5GameResult = {
      websocketSessionId: room.id,
      gameDurationMs: Date.now() - room.startTime,
      player1Score: Object.values(room.gameState.players)[0]?.score || 0,
      player2Score: Object.values(room.gameState.players)[1]?.score || 0,
      totalActions: room.actionHistory.length,
      gameEventsHash: antiCheatData.gameEventsHash,
      serverStateHash: antiCheatData.serverStateHash,
      frameCount: room.gameState.frameCount,
      networkLatencyAvg: Array.from(avgLatencies.values()).reduce((a, b) => a + b, 0) / avgLatencies.size,
      antiCheatSignature: this.generateAntiCheatSignature(antiCheatData),
    };

    // Notify players
    this.server.to(room.matchId).emit('html5-game-finished', {
      matchId: room.matchId,
      winner: room.gameState.winner,
      gameResult: result,
      timestamp: Date.now(),
    });

    // Clean up room
    this.gameRooms.delete(room.matchId);
    
    this.logger.log(`Finished HTML5 game ${room.matchId}, winner: ${room.gameState.winner}`);
  }

  // ✅ Generate anti-cheat signature
  private generateAntiCheatSignature(antiCheatData: any): string {
    const crypto = require('crypto');
    const dataString = JSON.stringify(antiCheatData);
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  // ✅ Handle player disconnect
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

    // Find and handle room cleanup
    for (const room of this.gameRooms.values()) {
      if (room.players.has(disconnectedPlayerId)) {
        room.players.delete(disconnectedPlayerId);
        this.playerSockets.delete(disconnectedPlayerId);

        // Notify other players
        this.server.to(room.matchId).emit('player-disconnected', {
          matchId: room.matchId,
          playerId: disconnectedPlayerId,
          timestamp: Date.now(),
        });

        // If no players left, cleanup room
        if (room.players.size === 0) {
          this.gameRooms.delete(room.matchId);
        }

        break;
      }
    }

    this.logger.log(`Player ${disconnectedPlayerId} disconnected from HTML5 game`);
  }

  // ✅ Get active game rooms (for monitoring)
  getActiveRooms(): HTML5GameRoom[] {
    return Array.from(this.gameRooms.values());
  }

  // ✅ Get room by match ID
  getRoom(matchId: string): HTML5GameRoom | undefined {
    return this.gameRooms.get(matchId);
  }
} 