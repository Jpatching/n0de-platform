import { GameType, GameCategory } from './game-types';

export interface CreateMatchParams {
  creatorWallet: string;
  wagerAmount: number;
  expiryTime: number;
  gameSpecificData?: any;
}

export interface GameResult {
  matchId: string;
  winner: string | null; // null for draw
  gameData: any;
  timestamp: number;
}

export interface ValidationResult {
  isValid: boolean;
  winner: string | null;
  reason?: string;
}

export interface GameServer {
  matchId: string;
  start(): Promise<void>;
  stop(): Promise<void>;
  processInput(playerId: string, input: any): void;
  getGameState(): any;
  validateFinalResult(result: GameResult): Promise<ValidationResult>;
}

export abstract class BaseGameService {
  abstract gameType: GameType;
  abstract gameCategory: GameCategory;
  
  // Common methods for all games
  abstract createMatch(params: CreateMatchParams): Promise<any>;
  abstract validateResult(result: GameResult): Promise<ValidationResult>;
  
  // Real-time specific methods (optional)
  startGameServer?(matchId: string): Promise<GameServer>;
  handlePlayerInput?(playerId: string, input: any): void;
  getGameState?(matchId: string): any;
  
  // Turn-based specific methods (optional)
  validateMove?(matchId: string, playerId: string, move: any): Promise<boolean>;
  applyMove?(matchId: string, playerId: string, move: any): Promise<any>;
  
  // Common utility methods
  protected isRealTime(): boolean {
    return this.gameCategory === GameCategory.RealtimeHTML5 || 
           this.gameCategory === GameCategory.RealtimeUnity;
  }
  
  protected isTurnBased(): boolean {
    return this.gameCategory === GameCategory.TurnBased;
  }
} 