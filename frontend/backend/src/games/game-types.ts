export enum GameCategory {
  TurnBased = 'turn-based',
  RealtimeHTML5 = 'realtime-html5',
  RealtimeUnity = 'realtime-unity',
}

export enum GameType {
  // Turn-based games
  Chess = 'chess',
  RockPaperScissors = 'rock-paper-scissors',
  CoinFlip = 'coin-flip',
  Crash = 'crash',
  
  // Real-time HTML5 games
  SportsHeads = 'sports-heads',
  Racing = 'racing',
  Fighting = 'fighting',
  PlatformerBattle = 'platformer-battle',
  BubbleShooter = 'bubble-shooter',
  Snake = 'snake',
  Tetris = 'tetris',
  Breakout = 'breakout',
  
  // Quick Decision Games (Central Server Multiplayer)
  Mines = 'mines',
  ReactionRing = 'reaction-ring',
  MindStab = 'mind-stab',
  MirrorMove = 'mirror-move',
  HiLo = 'hi-lo',
  
  // Strategy/Logic Games (Central Server Multiplayer)
  Connect4 = 'connect4',
  HighCardDuel = 'high-card-duel',
  MathDuel = 'math-duel',
  DiceDuel = 'dice-duel',
  
  // Real-time Unity games (WebGL + Photon)
  UnityRacing = 'unity-racing',
  UnityFighting = 'unity-fighting',
  UnityStrategy = 'unity-strategy',
  UnitySports = 'unity-sports',
  UnityPuzzle = 'unity-puzzle',
}

export const GAME_CATEGORIES: Record<GameType, GameCategory> = {
  // Turn-based
  [GameType.Chess]: GameCategory.TurnBased,
  [GameType.RockPaperScissors]: GameCategory.TurnBased,
  [GameType.CoinFlip]: GameCategory.TurnBased,
  [GameType.Crash]: GameCategory.TurnBased,
  
  // Real-time HTML5
  [GameType.SportsHeads]: GameCategory.RealtimeHTML5,
  [GameType.Racing]: GameCategory.RealtimeHTML5,
  [GameType.Fighting]: GameCategory.RealtimeHTML5,
  [GameType.PlatformerBattle]: GameCategory.RealtimeHTML5,
  [GameType.BubbleShooter]: GameCategory.RealtimeHTML5,
  [GameType.Snake]: GameCategory.RealtimeHTML5,
  [GameType.Tetris]: GameCategory.RealtimeHTML5,
  [GameType.Breakout]: GameCategory.RealtimeHTML5,
  
  // Quick Decision Games
  [GameType.Mines]: GameCategory.RealtimeHTML5,
  [GameType.ReactionRing]: GameCategory.RealtimeHTML5,
  [GameType.MindStab]: GameCategory.RealtimeHTML5,
  [GameType.MirrorMove]: GameCategory.RealtimeHTML5,
  [GameType.HiLo]: GameCategory.RealtimeHTML5,
  
  // Strategy/Logic Games
  [GameType.Connect4]: GameCategory.RealtimeHTML5,
  [GameType.HighCardDuel]: GameCategory.RealtimeHTML5,
  [GameType.MathDuel]: GameCategory.RealtimeHTML5,
  [GameType.DiceDuel]: GameCategory.RealtimeHTML5,
  
  // Real-time Unity
  [GameType.UnityRacing]: GameCategory.RealtimeUnity,
  [GameType.UnityFighting]: GameCategory.RealtimeUnity,
  [GameType.UnityStrategy]: GameCategory.RealtimeUnity,
  [GameType.UnitySports]: GameCategory.RealtimeUnity,
  [GameType.UnityPuzzle]: GameCategory.RealtimeUnity,
};

export interface ValidationRequirements {
  requiresMoveValidation: boolean;
  requiresServerSignature: boolean;
  requiresReplayHash: boolean;
  minGameDuration: number; // seconds
  maxGameDuration: number; // seconds
}

export const VALIDATION_REQUIREMENTS: Record<GameCategory, ValidationRequirements> = {
  [GameCategory.TurnBased]: {
    requiresMoveValidation: true,
    requiresServerSignature: false,
    requiresReplayHash: false,
    minGameDuration: 0,
    maxGameDuration: 7200, // 2 hours for chess
  },
  [GameCategory.RealtimeHTML5]: {
    requiresMoveValidation: false,
    requiresServerSignature: true,
    requiresReplayHash: true,
    minGameDuration: 30,   // 30 seconds minimum
    maxGameDuration: 600,  // 10 minutes maximum
  },
  [GameCategory.RealtimeUnity]: {
    requiresMoveValidation: false,
    requiresServerSignature: true,
    requiresReplayHash: true,
    minGameDuration: 60,   // 1 minute minimum
    maxGameDuration: 1800, // 30 minutes maximum
  },
};

export function getGameCategory(gameType: GameType): GameCategory {
  return GAME_CATEGORIES[gameType];
}

export function getValidationRequirements(gameType: GameType): ValidationRequirements {
  const category = getGameCategory(gameType);
  return VALIDATION_REQUIREMENTS[category];
} 