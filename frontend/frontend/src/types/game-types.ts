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
  Crash = 'crash',
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
  
  // Real-time Unity games
  UnityRacing = 'unity-racing',
  UnityFighting = 'unity-fighting',
  UnityStrategy = 'unity-strategy',
  UnitySports = 'unity-sports',
  UnityPuzzle = 'unity-puzzle',
}

export interface GameConfig {
  id: GameType;
  title: string;
  description: string;
  icon: string;
  category: GameCategory;
  minWager: number;
  maxWager: number;
  maxPlayers: number;
  estimatedDuration: number; // minutes
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tags: string[];
}

export const GAME_CONFIGS: Record<GameType, GameConfig> = {
  // Turn-based games
  [GameType.Chess]: {
    id: GameType.Chess,
    title: 'Chess',
    description: 'Classic strategy game - checkmate your opponent',
    icon: '♟️',
    category: GameCategory.TurnBased,
    minWager: 0.1,
    maxWager: 10,
    maxPlayers: 2,
    estimatedDuration: 30,
    difficulty: 'Hard',
    tags: ['Strategy', 'Classic', 'Skill'],
  },
  
  [GameType.RockPaperScissors]: {
    id: GameType.RockPaperScissors,
    title: 'Rock Paper Scissors',
    description: 'Beat your opponent in the classic hand game',
    icon: '✂️',
    category: GameCategory.TurnBased,
    minWager: 0.1,
    maxWager: 5,
    maxPlayers: 2,
    estimatedDuration: 1,
    difficulty: 'Easy',
    tags: ['Classic', 'Quick', 'Psychology'],
  },
  
  [GameType.CoinFlip]: {
    id: GameType.CoinFlip,
    title: 'Coin Flip',
    description: 'Call heads or tails - 50/50 odds',
    icon: '🪙',
    category: GameCategory.TurnBased,
    minWager: 0.1,
    maxWager: 10,
    maxPlayers: 2,
    estimatedDuration: 1,
    difficulty: 'Easy',
    tags: ['Luck', 'Instant', 'Simple'],
  },
  
  // Real-time HTML5 games
  [GameType.SportsHeads]: {
    id: GameType.SportsHeads,
    title: 'Sports Heads Soccer',
    description: 'Real-time soccer with big heads - score more goals to win',
    icon: '⚽',
    category: GameCategory.RealtimeHTML5,
    minWager: 0.1,
    maxWager: 5,
    maxPlayers: 2,
    estimatedDuration: 3,
    difficulty: 'Medium',
    tags: ['Sports', 'Real-time', 'Action'],
  },
  
  [GameType.Racing]: {
    id: GameType.Racing,
    title: 'Racing',
    description: 'High-speed racing - first to finish wins',
    icon: '🏎️',
    category: GameCategory.RealtimeHTML5,
    minWager: 0.1,
    maxWager: 8,
    maxPlayers: 2,
    estimatedDuration: 5,
    difficulty: 'Medium',
    tags: ['Racing', 'Speed', 'Skill'],
  },
  
  [GameType.Fighting]: {
    id: GameType.Fighting,
    title: 'Fighting',
    description: 'Street fighter style combat',
    icon: '🥊',
    category: GameCategory.RealtimeHTML5,
    minWager: 0.1,
    maxWager: 6,
    maxPlayers: 2,
    estimatedDuration: 4,
    difficulty: 'Hard',
    tags: ['Fighting', 'Combos', 'Skill'],
  },
  
  [GameType.PlatformerBattle]: {
    id: GameType.PlatformerBattle,
    title: 'Platformer Battle',
    description: 'Jump and fight in a platformer arena',
    icon: '🏃',
    category: GameCategory.RealtimeHTML5,
    minWager: 0.1,
    maxWager: 4,
    maxPlayers: 2,
    estimatedDuration: 6,
    difficulty: 'Medium',
    tags: ['Platformer', 'Action', 'Jumping'],
  },
  
  [GameType.BubbleShooter]: {
    id: GameType.BubbleShooter,
    title: 'Bubble Shooter',
    description: 'Pop bubbles faster than your opponent',
    icon: '🫧',
    category: GameCategory.RealtimeHTML5,
    minWager: 0.1,
    maxWager: 3,
    maxPlayers: 2,
    estimatedDuration: 8,
    difficulty: 'Easy',
    tags: ['Puzzle', 'Casual', 'Matching'],
  },
  
  [GameType.Snake]: {
    id: GameType.Snake,
    title: 'Snake Battle',
    description: 'Grow your snake while avoiding your opponent',
    icon: '🐍',
    category: GameCategory.RealtimeHTML5,
    minWager: 0.1,
    maxWager: 4,
    maxPlayers: 2,
    estimatedDuration: 7,
    difficulty: 'Medium',
    tags: ['Classic', 'Survival', 'Growth'],
  },
  
  [GameType.Tetris]: {
    id: GameType.Tetris,
    title: 'Tetris Battle',
    description: 'Clear lines faster than your opponent',
    icon: '🧩',
    category: GameCategory.RealtimeHTML5,
    minWager: 0.1,
    maxWager: 5,
    maxPlayers: 2,
    estimatedDuration: 10,
    difficulty: 'Medium',
    tags: ['Puzzle', 'Classic', 'Speed'],
  },
  
  [GameType.Breakout]: {
    id: GameType.Breakout,
    title: 'Breakout Battle',
    description: 'Break bricks faster than your opponent',
    icon: '🧱',
    category: GameCategory.RealtimeHTML5,
    minWager: 0.1,
    maxWager: 4,
    maxPlayers: 2,
    estimatedDuration: 5,
    difficulty: 'Easy',
    tags: ['Arcade', 'Classic', 'Reflexes'],
  },
  
  // Quick Decision Games
  [GameType.Crash]: {
    id: GameType.Crash,
    title: 'Crash',
    description: 'Cash out before the multiplier crashes',
    icon: '💥',
    category: GameCategory.RealtimeHTML5,
    minWager: 0.1,
    maxWager: 20,
    maxPlayers: 2,
    estimatedDuration: 2,
    difficulty: 'Easy',
    tags: ['Risk', 'Timing', 'Adrenaline'],
  },
  
  [GameType.Mines]: {
    id: GameType.Mines,
    title: 'Mines',
    description: 'Find safe tiles while avoiding hidden mines',
    icon: '💣',
    category: GameCategory.RealtimeHTML5,
    minWager: 0.1,
    maxWager: 15,
    maxPlayers: 2,
    estimatedDuration: 4,
    difficulty: 'Medium',
    tags: ['Risk', 'Strategy', 'Luck'],
  },
  
  [GameType.ReactionRing]: {
    id: GameType.ReactionRing,
    title: 'Reaction Ring',
    description: 'React faster than your opponent to visual cues',
    icon: '⚡',
    category: GameCategory.RealtimeHTML5,
    minWager: 0.1,
    maxWager: 8,
    maxPlayers: 2,
    estimatedDuration: 1,
    difficulty: 'Easy',
    tags: ['Reflexes', 'Speed', 'Quick'],
  },
  
  [GameType.MindStab]: {
    id: GameType.MindStab,
    title: 'Mind Stab',
    description: 'Answer questions correctly under pressure',
    icon: '🧠',
    category: GameCategory.RealtimeHTML5,
    minWager: 0.1,
    maxWager: 10,
    maxPlayers: 2,
    estimatedDuration: 3,
    difficulty: 'Hard',
    tags: ['Knowledge', 'Pressure', 'Quick'],
  },
  
  [GameType.MirrorMove]: {
    id: GameType.MirrorMove,
    title: 'Mirror Move',
    description: 'Copy your opponent\'s sequence perfectly',
    icon: '🪞',
    category: GameCategory.RealtimeHTML5,
    minWager: 0.1,
    maxWager: 6,
    maxPlayers: 2,
    estimatedDuration: 4,
    difficulty: 'Medium',
    tags: ['Memory', 'Pattern', 'Skill'],
  },
  
  [GameType.HiLo]: {
    id: GameType.HiLo,
    title: 'Hi Lo',
    description: 'Guess if the next number is higher or lower',
    icon: '📊',
    category: GameCategory.RealtimeHTML5,
    minWager: 0.1,
    maxWager: 12,
    maxPlayers: 2,
    estimatedDuration: 5,
    difficulty: 'Easy',
    tags: ['Guessing', 'Probability', 'Quick'],
  },
  
  // Strategy/Logic Games
  [GameType.Connect4]: {
    id: GameType.Connect4,
    title: 'Connect 4',
    description: 'Get four pieces in a row before your opponent',
    icon: '🔴',
    category: GameCategory.RealtimeHTML5,
    minWager: 0.1,
    maxWager: 8,
    maxPlayers: 2,
    estimatedDuration: 8,
    difficulty: 'Medium',
    tags: ['Strategy', 'Classic', 'Logic'],
  },
  
  [GameType.HighCardDuel]: {
    id: GameType.HighCardDuel,
    title: 'High Card Duel',
    description: 'Draw higher cards than your opponent',
    icon: '🃏',
    category: GameCategory.RealtimeHTML5,
    minWager: 0.1,
    maxWager: 15,
    maxPlayers: 2,
    estimatedDuration: 3,
    difficulty: 'Easy',
    tags: ['Cards', 'Luck', 'Quick'],
  },
  
  [GameType.MathDuel]: {
    id: GameType.MathDuel,
    title: 'Math Duel',
    description: 'Solve math problems faster than your opponent',
    icon: '🔢',
    category: GameCategory.RealtimeHTML5,
    minWager: 0.1,
    maxWager: 10,
    maxPlayers: 2,
    estimatedDuration: 6,
    difficulty: 'Hard',
    tags: ['Math', 'Speed', 'Skill'],
  },
  
  [GameType.DiceDuel]: {
    id: GameType.DiceDuel,
    title: 'Dice Duel',
    description: 'Roll higher dice totals than your opponent',
    icon: '🎲',
    category: GameCategory.RealtimeHTML5,
    minWager: 0.1,
    maxWager: 12,
    maxPlayers: 2,
    estimatedDuration: 4,
    difficulty: 'Easy',
    tags: ['Dice', 'Luck', 'Quick'],
  },
  
  // Real-time Unity games
  [GameType.UnityRacing]: {
    id: GameType.UnityRacing,
    title: 'Unity Racing',
    description: '3D racing with realistic physics',
    icon: '🏁',
    category: GameCategory.RealtimeUnity,
    minWager: 0.2,
    maxWager: 10,
    maxPlayers: 2,
    estimatedDuration: 8,
    difficulty: 'Hard',
    tags: ['3D', 'Racing', 'Physics'],
  },
  
  [GameType.UnityFighting]: {
    id: GameType.UnityFighting,
    title: 'Unity Fighting',
    description: '3D fighting game with combos',
    icon: '🥋',
    category: GameCategory.RealtimeUnity,
    minWager: 0.2,
    maxWager: 8,
    maxPlayers: 2,
    estimatedDuration: 6,
    difficulty: 'Hard',
    tags: ['3D', 'Fighting', 'Combos'],
  },
  
  [GameType.UnityStrategy]: {
    id: GameType.UnityStrategy,
    title: 'Unity Strategy',
    description: 'Real-time strategy battles',
    icon: '⚔️',
    category: GameCategory.RealtimeUnity,
    minWager: 0.3,
    maxWager: 12,
    maxPlayers: 2,
    estimatedDuration: 15,
    difficulty: 'Hard',
    tags: ['Strategy', 'RTS', 'Complex'],
  },
  
  [GameType.UnitySports]: {
    id: GameType.UnitySports,
    title: 'Unity Sports',
    description: '3D sports simulation',
    icon: '🏀',
    category: GameCategory.RealtimeUnity,
    minWager: 0.2,
    maxWager: 6,
    maxPlayers: 2,
    estimatedDuration: 10,
    difficulty: 'Medium',
    tags: ['Sports', '3D', 'Simulation'],
  },
  
  [GameType.UnityPuzzle]: {
    id: GameType.UnityPuzzle,
    title: 'Unity Puzzle',
    description: '3D puzzle challenges',
    icon: '🧩',
    category: GameCategory.RealtimeUnity,
    minWager: 0.1,
    maxWager: 4,
    maxPlayers: 2,
    estimatedDuration: 12,
    difficulty: 'Medium',
    tags: ['Puzzle', '3D', 'Logic'],
  },
};

export function getGameConfig(gameType: GameType): GameConfig {
  return GAME_CONFIGS[gameType];
}

export function getGamesByCategory(category: GameCategory): GameConfig[] {
  return Object.values(GAME_CONFIGS).filter(config => config.category === category);
}

export function getTurnBasedGames(): GameConfig[] {
  return getGamesByCategory(GameCategory.TurnBased);
}

export function getRealtimeHTML5Games(): GameConfig[] {
  return getGamesByCategory(GameCategory.RealtimeHTML5);
}

export function getRealtimeUnityGames(): GameConfig[] {
  return getGamesByCategory(GameCategory.RealtimeUnity);
} 