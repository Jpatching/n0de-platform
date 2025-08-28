import { Injectable, Logger } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameType } from '../game-types';

// ✅ Central Server Game State Interface
export interface CentralServerGameState {
  gameId: string;
  gameType: GameType;
  players: {
    [playerId: string]: {
      id: string;
      score: number;
      health?: number;
      moves?: any[];
      lastAction: number;
      isReady: boolean;
      gameData?: Record<string, any>; // Game-specific data
    };
  };
  gameData: Record<string, any>; // Shared game state
  gameTime: number;
  roundNumber: number;
  status: 'waiting' | 'starting' | 'playing' | 'paused' | 'finished';
  winner?: string;
  lastUpdate: number;
}

// ✅ Central Server Game Input Interface
export interface CentralServerGameInput {
  playerId: string;
  inputType: 'action' | 'choice' | 'move' | 'ready';
  data: {
    action?: string;
    choice?: any;
    position?: { x: number; y: number };
    value?: any;
    timestamp: number;
  };
}

// ✅ Central Server Game Room Interface
export interface CentralServerGameRoom {
  id: string;
  matchId: string;
  gameType: GameType;
  players: Map<string, Socket>;
  gameState: CentralServerGameState;
  gameEngine: CentralServerGameEngine;
  startTime: number;
  lastUpdate: number;
  actionHistory: CentralServerGameInput[];
  roundTimer?: NodeJS.Timeout;
  gameTimer?: NodeJS.Timeout;
}

@Injectable()
export class CentralServerGameEngine {
  private readonly logger = new Logger(CentralServerGameEngine.name);

  constructor(private gameType: GameType) {}

  // ✅ Initialize game state based on game type
  initializeGameState(gameId: string, playerIds: string[]): CentralServerGameState {
    const baseState: CentralServerGameState = {
      gameId,
      gameType: this.gameType,
      players: {},
      gameData: {},
      gameTime: 0,
      roundNumber: 1,
      status: 'waiting',
      lastUpdate: Date.now(),
    };

    // Initialize players
    playerIds.forEach((playerId) => {
      baseState.players[playerId] = {
        id: playerId,
        score: 0,
        lastAction: Date.now(),
        isReady: false,
        gameData: {},
      };
    });

    // Initialize game-specific data
    this.initializeGameData(baseState);

    return baseState;
  }

  // ✅ Initialize game-specific data
  private initializeGameData(gameState: CentralServerGameState): void {
    switch (this.gameType) {
      case GameType.Crash:
        gameState.gameData = {
          multiplier: 1.0,
          crashed: false,
          crashPoint: this.generateCrashPoint(),
          activePlayers: new Set(),
        };
        break;

      case GameType.Mines:
        gameState.gameData = {
          gridSize: 5,
          mineCount: 5,
          mines: this.generateMineField(5, 5),
          revealedTiles: new Set(),
        };
        break;

      case GameType.ReactionRing:
        gameState.gameData = {
          stimulus: null,
          stimulusTime: null,
          reactionTimes: {},
        };
        break;

      case GameType.MindStab:
        gameState.gameData = {
          challenge: this.generateMindStabChallenge(),
          responses: {},
          timeLimit: 10000, // 10 seconds
        };
        break;

      case GameType.MirrorMove:
        gameState.gameData = {
          sequence: [],
          currentPlayer: null,
          sequenceLength: 1,
        };
        break;

      case GameType.HiLo:
        gameState.gameData = {
          currentNumber: Math.floor(Math.random() * 100) + 1,
          targetNumber: Math.floor(Math.random() * 100) + 1,
          guesses: {},
        };
        break;

      case GameType.Connect4:
        gameState.gameData = {
          board: Array(6).fill(null).map(() => Array(7).fill(0)),
          currentPlayer: Object.keys(gameState.players)[0],
          playerColors: { [Object.keys(gameState.players)[0]]: 1, [Object.keys(gameState.players)[1]]: 2 },
        };
        break;

      case GameType.HighCardDuel:
        gameState.gameData = {
          deck: this.shuffleDeck(),
          playerCards: {},
          round: 1,
          maxRounds: 5,
        };
        break;

      case GameType.MathDuel:
        gameState.gameData = {
          currentProblem: this.generateMathProblem(),
          answers: {},
          problemNumber: 1,
          maxProblems: 10,
        };
        break;

      case GameType.DiceDuel:
        gameState.gameData = {
          diceCount: 2,
          playerRolls: {},
          round: 1,
          maxRounds: 5,
        };
        break;
    }
  }

  // ✅ Process player input
  processInput(gameState: CentralServerGameState, input: CentralServerGameInput): CentralServerGameState {
    const player = gameState.players[input.playerId];
    if (!player) return gameState;

    player.lastAction = Date.now();

    // Process input based on game type
    switch (this.gameType) {
      case GameType.Crash:
        this.processCrashInput(gameState, input);
        break;
      case GameType.Mines:
        this.processMinesInput(gameState, input);
        break;
      case GameType.ReactionRing:
        this.processReactionRingInput(gameState, input);
        break;
      case GameType.MindStab:
        this.processMindStabInput(gameState, input);
        break;
      case GameType.MirrorMove:
        this.processMirrorMoveInput(gameState, input);
        break;
      case GameType.HiLo:
        this.processHiLoInput(gameState, input);
        break;
      case GameType.Connect4:
        this.processConnect4Input(gameState, input);
        break;
      case GameType.HighCardDuel:
        this.processHighCardDuelInput(gameState, input);
        break;
      case GameType.MathDuel:
        this.processMathDuelInput(gameState, input);
        break;
      case GameType.DiceDuel:
        this.processDiceDuelInput(gameState, input);
        break;
    }

    return gameState;
  }

  // ✅ Game-specific input processors
  private processCrashInput(gameState: CentralServerGameState, input: CentralServerGameInput): void {
    if (input.inputType === 'action' && input.data.action === 'cashout') {
      if (!gameState.gameData.crashed && gameState.gameData.activePlayers.has(input.playerId)) {
        const multiplier = gameState.gameData.multiplier;
        gameState.players[input.playerId].score = Math.floor(multiplier * 100);
        gameState.gameData.activePlayers.delete(input.playerId);
        
        if (gameState.gameData.activePlayers.size === 0) {
          gameState.status = 'finished';
          this.determineWinner(gameState);
        }
      }
    } else if (input.inputType === 'action' && input.data.action === 'bet') {
      gameState.gameData.activePlayers.add(input.playerId);
    }
  }

  private processMinesInput(gameState: CentralServerGameState, input: CentralServerGameInput): void {
    if (input.inputType === 'choice' && input.data.position) {
      const { x, y } = input.data.position;
      const tileKey = `${x},${y}`;
      
      if (!gameState.gameData.revealedTiles.has(tileKey)) {
        gameState.gameData.revealedTiles.add(tileKey);
        
        if (gameState.gameData.mines.has(tileKey)) {
          gameState.players[input.playerId].health = 0;
          this.checkMinesWinner(gameState);
        } else {
          gameState.players[input.playerId].score += 10;
          
          const totalTiles = gameState.gameData.gridSize * gameState.gameData.gridSize;
          const safeTiles = totalTiles - gameState.gameData.mineCount;
          if (gameState.gameData.revealedTiles.size >= safeTiles) {
            gameState.status = 'finished';
            this.determineWinner(gameState);
          }
        }
      }
    }
  }

  private processReactionRingInput(gameState: CentralServerGameState, input: CentralServerGameInput): void {
    if (input.inputType === 'action' && input.data.action === 'react') {
      if (gameState.gameData.stimulusTime) {
        const reactionTime = Date.now() - gameState.gameData.stimulusTime;
        gameState.gameData.reactionTimes[input.playerId] = reactionTime;
        
        if (Object.keys(gameState.gameData.reactionTimes).length === Object.keys(gameState.players).length) {
          const fastest = Object.entries(gameState.gameData.reactionTimes)
            .reduce((a, b) => a[1] < b[1] ? a : b);
          
          gameState.players[fastest[0]].score += 1;
          gameState.winner = fastest[0];
          gameState.status = 'finished';
        }
      }
    }
  }

  private processMindStabInput(gameState: CentralServerGameState, input: CentralServerGameInput): void {
    if (input.inputType === 'choice') {
      gameState.gameData.responses[input.playerId] = {
        answer: input.data.value,
        timestamp: Date.now(),
      };
      
      if (Object.keys(gameState.gameData.responses).length === Object.keys(gameState.players).length) {
        this.evaluateMindStabResponses(gameState);
      }
    }
  }

  private processMirrorMoveInput(gameState: CentralServerGameState, input: CentralServerGameInput): void {
    if (input.inputType === 'move') {
      const move = input.data.value;
      
      if (gameState.gameData.currentPlayer === input.playerId) {
        gameState.gameData.sequence.push(move);
        gameState.gameData.currentPlayer = Object.keys(gameState.players)
          .find(id => id !== input.playerId);
      } else {
        const expectedMove = gameState.gameData.sequence[gameState.players[input.playerId].gameData.sequenceIndex || 0];
        
        if (move === expectedMove) {
          gameState.players[input.playerId].gameData.sequenceIndex = 
            (gameState.players[input.playerId].gameData.sequenceIndex || 0) + 1;
          
          if (gameState.players[input.playerId].gameData.sequenceIndex >= gameState.gameData.sequence.length) {
            gameState.players[input.playerId].score += 1;
            this.startNewMirrorRound(gameState);
          }
        } else {
          const otherPlayer = Object.keys(gameState.players).find(id => id !== input.playerId);
          gameState.winner = otherPlayer;
          gameState.status = 'finished';
        }
      }
    }
  }

  private processHiLoInput(gameState: CentralServerGameState, input: CentralServerGameInput): void {
    if (input.inputType === 'choice') {
      const guess = input.data.value;
      const current = gameState.gameData.currentNumber;
      const target = gameState.gameData.targetNumber;
      
      const correct = (guess === 'higher' && target > current) || 
                     (guess === 'lower' && target < current);
      
      if (correct) {
        gameState.players[input.playerId].score += 1;
      }
      
      gameState.gameData.guesses[input.playerId] = { guess, correct };
      
      if (Object.keys(gameState.gameData.guesses).length === Object.keys(gameState.players).length) {
        this.nextHiLoRound(gameState);
      }
    }
  }

  private processConnect4Input(gameState: CentralServerGameState, input: CentralServerGameInput): void {
    if (input.inputType === 'move' && input.data.position) {
      const column = input.data.position.x;
      
      if (gameState.gameData.currentPlayer === input.playerId) {
        for (let row = 5; row >= 0; row--) {
          if (gameState.gameData.board[row][column] === 0) {
            gameState.gameData.board[row][column] = gameState.gameData.playerColors[input.playerId];
            
            if (this.checkConnect4Win(gameState.gameData.board, row, column, gameState.gameData.playerColors[input.playerId])) {
              gameState.winner = input.playerId;
              gameState.status = 'finished';
            } else {
              gameState.gameData.currentPlayer = Object.keys(gameState.players)
                .find(id => id !== input.playerId);
            }
            break;
          }
        }
      }
    }
  }

  private processHighCardDuelInput(gameState: CentralServerGameState, input: CentralServerGameInput): void {
    if (input.inputType === 'action' && input.data.action === 'draw') {
      if (!gameState.gameData.playerCards[input.playerId]) {
        const card = gameState.gameData.deck.pop();
        gameState.gameData.playerCards[input.playerId] = card;
        
        if (Object.keys(gameState.gameData.playerCards).length === Object.keys(gameState.players).length) {
          this.evaluateHighCardRound(gameState);
        }
      }
    }
  }

  private processMathDuelInput(gameState: CentralServerGameState, input: CentralServerGameInput): void {
    if (input.inputType === 'choice') {
      gameState.gameData.answers[input.playerId] = {
        answer: input.data.value,
        timestamp: Date.now(),
      };
      
      if (Object.keys(gameState.gameData.answers).length === Object.keys(gameState.players).length) {
        this.evaluateMathProblem(gameState);
      }
    }
  }

  private processDiceDuelInput(gameState: CentralServerGameState, input: CentralServerGameInput): void {
    if (input.inputType === 'action' && input.data.action === 'roll') {
      if (!gameState.gameData.playerRolls[input.playerId]) {
        const rolls = [];
        for (let i = 0; i < gameState.gameData.diceCount; i++) {
          rolls.push(Math.floor(Math.random() * 6) + 1);
        }
        gameState.gameData.playerRolls[input.playerId] = rolls;
        
        if (Object.keys(gameState.gameData.playerRolls).length === Object.keys(gameState.players).length) {
          this.evaluateDiceRound(gameState);
        }
      }
    }
  }

  // ✅ Helper Methods
  private generateCrashPoint(): number {
    return Math.max(1.01, Math.random() * 10 + 1);
  }

  private generateMineField(width: number, height: number): Set<string> {
    const mines = new Set<string>();
    const mineCount = 5;
    
    while (mines.size < mineCount) {
      const x = Math.floor(Math.random() * width);
      const y = Math.floor(Math.random() * height);
      mines.add(`${x},${y}`);
    }
    
    return mines;
  }

  private generateMindStabChallenge(): any {
    const challenges = [
      { type: 'color', question: 'What color is the sky?', answer: 'blue' },
      { type: 'math', question: '7 + 5 = ?', answer: '12' },
      { type: 'logic', question: 'Complete: 2, 4, 6, ?', answer: '8' },
    ];
    
    return challenges[Math.floor(Math.random() * challenges.length)];
  }

  private shuffleDeck(): number[] {
    const deck = Array.from({ length: 52 }, (_, i) => i + 1);
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  private generateMathProblem(): any {
    const a = Math.floor(Math.random() * 20) + 1;
    const b = Math.floor(Math.random() * 20) + 1;
    const operations = ['+', '-', '*'];
    const op = operations[Math.floor(Math.random() * operations.length)];
    
    let answer;
    switch (op) {
      case '+': answer = a + b; break;
      case '-': answer = a - b; break;
      case '*': answer = a * b; break;
    }
    
    return { question: `${a} ${op} ${b} = ?`, answer };
  }

  private checkConnect4Win(board: number[][], row: number, col: number, player: number): boolean {
    const directions = [
      [0, 1], [1, 0], [1, 1], [1, -1]
    ];
    
    for (const [dr, dc] of directions) {
      let count = 1;
      
      for (let i = 1; i < 4; i++) {
        const r = row + dr * i;
        const c = col + dc * i;
        if (r >= 0 && r < 6 && c >= 0 && c < 7 && board[r][c] === player) {
          count++;
        } else break;
      }
      
      for (let i = 1; i < 4; i++) {
        const r = row - dr * i;
        const c = col - dc * i;
        if (r >= 0 && r < 6 && c >= 0 && c < 7 && board[r][c] === player) {
          count++;
        } else break;
      }
      
      if (count >= 4) return true;
    }
    
    return false;
  }

  private determineWinner(gameState: CentralServerGameState): void {
    const players = Object.values(gameState.players);
    const winner = players.reduce((a, b) => a.score > b.score ? a : b);
    gameState.winner = winner.id;
  }

  private checkMinesWinner(gameState: CentralServerGameState): void {
    const alivePlayers = Object.values(gameState.players).filter(p => (p.health || 100) > 0);
    if (alivePlayers.length === 1) {
      gameState.winner = alivePlayers[0].id;
      gameState.status = 'finished';
    }
  }

  private evaluateMindStabResponses(gameState: CentralServerGameState): void {
    const correctAnswer = gameState.gameData.challenge.answer;
    let winner = null;
    let fastestTime = Infinity;
    
    Object.entries(gameState.gameData.responses).forEach(([playerId, response]: [string, any]) => {
      if (response.answer === correctAnswer && response.timestamp < fastestTime) {
        winner = playerId;
        fastestTime = response.timestamp;
      }
    });
    
    if (winner) {
      gameState.players[winner].score += 1;
      gameState.winner = winner;
    }
    
    gameState.status = 'finished';
  }

  private startNewMirrorRound(gameState: CentralServerGameState): void {
    gameState.gameData.sequence = [];
    gameState.gameData.sequenceLength += 1;
    gameState.roundNumber += 1;
    
    if (gameState.roundNumber > 5) {
      gameState.status = 'finished';
      this.determineWinner(gameState);
    }
  }

  private nextHiLoRound(gameState: CentralServerGameState): void {
    gameState.gameData.currentNumber = gameState.gameData.targetNumber;
    gameState.gameData.targetNumber = Math.floor(Math.random() * 100) + 1;
    gameState.gameData.guesses = {};
    gameState.roundNumber += 1;
    
    if (gameState.roundNumber > 10) {
      gameState.status = 'finished';
      this.determineWinner(gameState);
    }
  }

  private evaluateHighCardRound(gameState: CentralServerGameState): void {
    const cards = gameState.gameData.playerCards;
    const winner = Object.entries(cards).reduce((a, b) => a[1] > b[1] ? a : b);
    
    gameState.players[winner[0]].score += 1;
    gameState.gameData.playerCards = {};
    gameState.gameData.round += 1;
    
    if (gameState.gameData.round > gameState.gameData.maxRounds) {
      gameState.status = 'finished';
      this.determineWinner(gameState);
    }
  }

  private evaluateMathProblem(gameState: CentralServerGameState): void {
    const correctAnswer = gameState.gameData.currentProblem.answer;
    let winner = null;
    let fastestTime = Infinity;
    
    Object.entries(gameState.gameData.answers).forEach(([playerId, response]: [string, any]) => {
      if (response.answer == correctAnswer && response.timestamp < fastestTime) {
        winner = playerId;
        fastestTime = response.timestamp;
      }
    });
    
    if (winner) {
      gameState.players[winner].score += 1;
    }
    
    gameState.gameData.currentProblem = this.generateMathProblem();
    gameState.gameData.answers = {};
    gameState.gameData.problemNumber += 1;
    
    if (gameState.gameData.problemNumber > gameState.gameData.maxProblems) {
      gameState.status = 'finished';
      this.determineWinner(gameState);
    }
  }

  private evaluateDiceRound(gameState: CentralServerGameState): void {
    const rolls = gameState.gameData.playerRolls;
    const totals = Object.entries(rolls).map(([playerId, dice]: [string, number[]]) => [
      playerId, 
      dice.reduce((sum, die) => sum + die, 0)
    ]);
    
    const winner = totals.reduce((a, b) => a[1] > b[1] ? a : b);
    gameState.players[winner[0]].score += 1;
    
    gameState.gameData.playerRolls = {};
    gameState.gameData.round += 1;
    
    if (gameState.gameData.round > gameState.gameData.maxRounds) {
      gameState.status = 'finished';
      this.determineWinner(gameState);
    }
  }

  // ✅ Update game state (called periodically)
  updateGameState(gameState: CentralServerGameState): CentralServerGameState {
    gameState.gameTime = Date.now() - gameState.lastUpdate;
    
    switch (this.gameType) {
      case GameType.Crash:
        this.updateCrashGame(gameState);
        break;
      case GameType.ReactionRing:
        this.updateReactionRing(gameState);
        break;
    }
    
    gameState.lastUpdate = Date.now();
    return gameState;
  }

  private updateCrashGame(gameState: CentralServerGameState): void {
    if (!gameState.gameData.crashed) {
      gameState.gameData.multiplier += 0.01;
      
      if (gameState.gameData.multiplier >= gameState.gameData.crashPoint) {
        gameState.gameData.crashed = true;
        gameState.status = 'finished';
        this.determineWinner(gameState);
      }
    }
  }

  private updateReactionRing(gameState: CentralServerGameState): void {
    if (!gameState.gameData.stimulusTime && gameState.status === 'playing') {
      if (Math.random() < 0.01) {
        gameState.gameData.stimulus = 'GO!';
        gameState.gameData.stimulusTime = Date.now();
      }
    }
  }

  // ✅ Generate anti-cheat data
  generateAntiCheatData(gameState: CentralServerGameState, actionHistory: CentralServerGameInput[]): any {
    const gameEventsHash = this.hashGameEvents(actionHistory);
    const serverStateHash = this.hashGameState(gameState);
    
    return {
      gameEventsHash,
      serverStateHash,
      totalActions: actionHistory.length,
      roundNumber: gameState.roundNumber,
      gameDuration: gameState.gameTime,
    };
  }

  private hashGameEvents(actions: CentralServerGameInput[]): string {
    const crypto = require('crypto');
    const actionString = JSON.stringify(actions.map(a => ({
      player: a.playerId,
      type: a.inputType,
      timestamp: a.data.timestamp
    })));
    return crypto.createHash('sha256').update(actionString).digest('hex');
  }

  private hashGameState(gameState: CentralServerGameState): string {
    const crypto = require('crypto');
    const stateString = JSON.stringify({
      players: Object.fromEntries(
        Object.entries(gameState.players).map(([id, player]) => [
          id, 
          { score: player.score, isReady: player.isReady }
        ])
      ),
      gameTime: gameState.gameTime,
      roundNumber: gameState.roundNumber,
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
  namespace: '/central-server-games'
})
export class CentralServerGamesService implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(CentralServerGamesService.name);
  private gameRooms: Map<string, CentralServerGameRoom> = new Map();
  private playerSockets: Map<string, Socket> = new Map();

  async handleConnection(client: Socket) {
    this.logger.log(`Central server game client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Central server game client disconnected: ${client.id}`);
    await this.handlePlayerDisconnect(client);
  }

  @SubscribeMessage('join-central-server-game')
  async handleJoinGame(client: Socket, data: { 
    matchId: string; 
    playerId: string; 
    gameType: GameType 
  }) {
    try {
      const { matchId, playerId, gameType } = data;
      
      let room = this.gameRooms.get(matchId);
      if (!room) {
        room = await this.createGameRoom(matchId, gameType);
      }

      room.players.set(playerId, client);
      this.playerSockets.set(playerId, client);
      
      client.join(matchId);

      if (room.players.size === 2) {
        await this.startGame(room);
      }

      client.emit('joined-central-server-game', { 
        matchId, 
        playersConnected: room.players.size,
        gameState: room.gameState 
      });

      this.logger.log(`Player ${playerId} joined central server game ${matchId}`);
    } catch (error) {
      this.logger.error(`Error joining central server game: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('central-server-game-input')
  async handleGameInput(client: Socket, data: { 
    matchId: string; 
    playerId: string; 
    input: CentralServerGameInput 
  }) {
    try {
      const { matchId, playerId, input } = data;
      
      const room = this.gameRooms.get(matchId);
      if (!room) {
        client.emit('error', { message: 'Game room not found' });
        return;
      }

      room.gameState = room.gameEngine.processInput(room.gameState, input);
      room.actionHistory.push(input);
      room.lastUpdate = Date.now();

      room.gameState = room.gameEngine.updateGameState(room.gameState);

      this.server.to(matchId).emit('central-server-game-state', {
        matchId,
        gameState: room.gameState,
        timestamp: Date.now(),
      });

      if (room.gameState.status === 'finished') {
        await this.finishGame(room);
      }

    } catch (error) {
      this.logger.error(`Error handling central server game input: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }

  private async createGameRoom(matchId: string, gameType: GameType): Promise<CentralServerGameRoom> {
    const gameEngine = new CentralServerGameEngine(gameType);
    const gameState = gameEngine.initializeGameState(matchId, []);
    
    const room: CentralServerGameRoom = {
      id: matchId,
      matchId,
      gameType,
      players: new Map(),
      gameState,
      gameEngine,
      startTime: Date.now(),
      lastUpdate: Date.now(),
      actionHistory: [],
    };

    this.gameRooms.set(matchId, room);
    return room;
  }

  private async startGame(room: CentralServerGameRoom): Promise<void> {
    const playerIds = Array.from(room.players.keys());
    room.gameState = room.gameEngine.initializeGameState(room.id, playerIds);
    room.gameState.status = 'playing';
    room.startTime = Date.now();

    if (room.gameType === GameType.Crash) {
      room.gameTimer = setInterval(() => {
        room.gameState = room.gameEngine.updateGameState(room.gameState);
        this.server.to(room.matchId).emit('central-server-game-state', {
          matchId: room.matchId,
          gameState: room.gameState,
          timestamp: Date.now(),
        });
        
        if (room.gameState.status === 'finished') {
          this.finishGame(room);
        }
      }, 100);
    }

    this.server.to(room.matchId).emit('central-server-game-started', {
      matchId: room.matchId,
      gameType: room.gameType,
      gameState: room.gameState,
      timestamp: Date.now(),
    });

    this.logger.log(`Started central server game ${room.matchId}`);
  }

  private async finishGame(room: CentralServerGameRoom): Promise<void> {
    if (room.gameTimer) clearInterval(room.gameTimer);
    if (room.roundTimer) clearTimeout(room.roundTimer);

    const antiCheatData = room.gameEngine.generateAntiCheatData(
      room.gameState, 
      room.actionHistory
    );

    const result = {
      matchId: room.matchId,
      gameDurationMs: Date.now() - room.startTime,
      player1Score: Object.values(room.gameState.players)[0]?.score || 0,
      player2Score: Object.values(room.gameState.players)[1]?.score || 0,
      totalActions: room.actionHistory.length,
      gameEventsHash: antiCheatData.gameEventsHash,
      serverStateHash: antiCheatData.serverStateHash,
      roundNumber: room.gameState.roundNumber,
      antiCheatSignature: this.generateAntiCheatSignature(antiCheatData),
    };

    this.server.to(room.matchId).emit('central-server-game-finished', {
      matchId: room.matchId,
      winner: room.gameState.winner,
      gameResult: result,
      timestamp: Date.now(),
    });

    this.gameRooms.delete(room.matchId);
    
    this.logger.log(`Finished central server game ${room.matchId}, winner: ${room.gameState.winner}`);
  }

  private generateAntiCheatSignature(antiCheatData: any): string {
    const crypto = require('crypto');
    const dataString = JSON.stringify(antiCheatData);
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  private async handlePlayerDisconnect(client: Socket): Promise<void> {
    let disconnectedPlayerId: string | null = null;
    for (const [playerId, socket] of this.playerSockets.entries()) {
      if (socket.id === client.id) {
        disconnectedPlayerId = playerId;
        break;
      }
    }

    if (!disconnectedPlayerId) return;

    for (const room of this.gameRooms.values()) {
      if (room.players.has(disconnectedPlayerId)) {
        room.players.delete(disconnectedPlayerId);
        this.playerSockets.delete(disconnectedPlayerId);

        if (room.gameTimer) clearInterval(room.gameTimer);
        if (room.roundTimer) clearTimeout(room.roundTimer);

        this.server.to(room.matchId).emit('player-disconnected', {
          matchId: room.matchId,
          playerId: disconnectedPlayerId,
          timestamp: Date.now(),
        });

        if (room.players.size === 0) {
          this.gameRooms.delete(room.matchId);
        }

        break;
      }
    }

    this.logger.log(`Player ${disconnectedPlayerId} disconnected from central server game`);
  }

  getActiveRooms(): CentralServerGameRoom[] {
    return Array.from(this.gameRooms.values());
  }

  getRoom(matchId: string): CentralServerGameRoom | undefined {
    return this.gameRooms.get(matchId);
  }
} 