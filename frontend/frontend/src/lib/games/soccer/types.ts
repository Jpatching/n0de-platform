// ⚽ Sports Head Soccer - Type Definitions

export interface Position {
  x: number;
  y: number;
}

export interface Velocity {
  x: number;
  y: number;
}

export interface Player {
  id: string;
  position: Position;
  velocity: Velocity;
  angle: number;
  team: 'left' | 'right';
  isGrounded: boolean;
  energy: number;
}

export interface Ball {
  position: Position;
  velocity: Velocity;
  spin: number;
  radius: number;
}

export interface GameState {
  players: {
    player1: Player;
    player2: Player;
  };
  ball: Ball;
  score: {
    left: number;
    right: number;
  };
  timeRemaining: number;
  isPlaying: boolean;
  lastUpdate: number;
}

export interface GameConfig {
  fieldWidth: number;
  fieldHeight: number;
  gravity: number;
  friction: number;
  maxPlayerSpeed: number;
  ballBounciness: number;
  matchDuration: number; // in seconds
}

export interface ControlsState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
}

export interface SoccerMove {
  playerId: string;
  controls: ControlsState;
  timestamp: number;
}

export interface PhysicsUpdate {
  gameState: GameState;
  timestamp: number;
} 