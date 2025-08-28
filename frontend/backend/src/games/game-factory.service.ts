import { Injectable, BadRequestException } from '@nestjs/common';
import { BaseGameService } from './base-game.interface';
import { GameType, GameCategory, getGameCategory } from './game-types';

// Import turn-based games
import { ChessService } from './chess.service';
import { RPSService } from './rps.service';
import { CoinFlipService } from './coinflip.service';
import { CrashService } from './crash.service';
import { MinesService } from './mines.service';

// Import real-time games (to be implemented)
// import { SportsHeadsService } from './realtime-html5/sports-heads.service';
// import { RacingService } from './realtime-html5/racing.service';

@Injectable()
export class GameFactoryService {
  private gameServices: Map<GameType, BaseGameService> = new Map();

  constructor(
    // Turn-based games
    private chessService: ChessService,
    private rpsService: RPSService,
    private coinFlipService: CoinFlipService,
    private crashService: CrashService,
    private minesService: MinesService,
    
    // Real-time games (to be added)
    // private sportsHeadsService: SportsHeadsService,
    // private racingService: RacingService,
  ) {
    this.initializeGameServices();
  }

  private initializeGameServices(): void {
    // Register turn-based games
    this.gameServices.set(GameType.Chess, this.chessService);
    this.gameServices.set(GameType.RockPaperScissors, this.rpsService);
    this.gameServices.set(GameType.CoinFlip, this.coinFlipService);
    this.gameServices.set(GameType.Crash, this.crashService);
    this.gameServices.set(GameType.Mines, this.minesService);
    
    // Register real-time games (to be added)
    // this.gameServices.set(GameType.SportsHeads, this.sportsHeadsService);
    // this.gameServices.set(GameType.Racing, this.racingService);
  }

  /**
   * Get game service by game type
   */
  getGameService(gameType: GameType): BaseGameService {
    const service = this.gameServices.get(gameType);
    if (!service) {
      throw new BadRequestException(`Unsupported game type: ${gameType}`);
    }
    return service;
  }

  /**
   * Get all supported game types
   */
  getSupportedGameTypes(): GameType[] {
    return Array.from(this.gameServices.keys());
  }

  /**
   * Get games by category
   */
  getGamesByCategory(category: GameCategory): GameType[] {
    return this.getSupportedGameTypes().filter(
      gameType => getGameCategory(gameType) === category
    );
  }

  /**
   * Check if game type is supported
   */
  isGameTypeSupported(gameType: GameType): boolean {
    return this.gameServices.has(gameType);
  }

  /**
   * Get turn-based games
   */
  getTurnBasedGames(): GameType[] {
    return this.getGamesByCategory(GameCategory.TurnBased);
  }

  /**
   * Get real-time HTML5 games
   */
  getRealtimeHTML5Games(): GameType[] {
    return this.getGamesByCategory(GameCategory.RealtimeHTML5);
  }

  /**
   * Get real-time Unity games
   */
  getRealtimeUnityGames(): GameType[] {
    return this.getGamesByCategory(GameCategory.RealtimeUnity);
  }

  /**
   * Create match for any game type
   */
  async createMatch(gameType: GameType, params: any): Promise<any> {
    const gameService = this.getGameService(gameType);
    return await gameService.createMatch(params);
  }

  /**
   * Validate result for any game type
   */
  async validateResult(gameType: GameType, result: any): Promise<any> {
    const gameService = this.getGameService(gameType);
    return await gameService.validateResult(result);
  }

  /**
   * Start game server for real-time games
   */
  async startGameServer(gameType: GameType, matchId: string): Promise<any> {
    const gameService = this.getGameService(gameType);
    const category = getGameCategory(gameType);
    
    if (category === GameCategory.TurnBased) {
      throw new BadRequestException(`Game type ${gameType} does not require a game server`);
    }
    
    if (!gameService.startGameServer) {
      throw new BadRequestException(`Game service for ${gameType} does not support game servers`);
    }
    
    return await gameService.startGameServer(matchId);
  }

  /**
   * Handle player input for real-time games
   */
  handlePlayerInput(gameType: GameType, playerId: string, input: any): void {
    const gameService = this.getGameService(gameType);
    const category = getGameCategory(gameType);
    
    if (category === GameCategory.TurnBased) {
      throw new BadRequestException(`Game type ${gameType} does not support real-time input`);
    }
    
    if (!gameService.handlePlayerInput) {
      throw new BadRequestException(`Game service for ${gameType} does not support real-time input`);
    }
    
    gameService.handlePlayerInput(playerId, input);
  }

  /**
   * Get game state for real-time games
   */
  getGameState(gameType: GameType, matchId: string): any {
    const gameService = this.getGameService(gameType);
    const category = getGameCategory(gameType);
    
    if (category === GameCategory.TurnBased) {
      throw new BadRequestException(`Game type ${gameType} does not have real-time game state`);
    }
    
    if (!gameService.getGameState) {
      throw new BadRequestException(`Game service for ${gameType} does not support game state retrieval`);
    }
    
    return gameService.getGameState(matchId);
  }
} 