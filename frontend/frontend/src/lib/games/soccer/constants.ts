// ⚽ Sports Head Soccer - Game Constants

import { GameConfig } from './types';

export const GAME_CONFIG: GameConfig = {
  fieldWidth: 800,
  fieldHeight: 400,
  gravity: -980, // pixels per second squared
  friction: 0.95,
  maxPlayerSpeed: 300, // pixels per second
  ballBounciness: 0.8,
  matchDuration: 120, // 2 minutes
};

export const PHYSICS_CONFIG = {
  FPS: 60,
  FIXED_TIMESTEP: 1000 / 60, // 16.67ms per frame
  MAX_TIMESTEP: 50, // Max 50ms to prevent spiral of death
  COLLISION_ITERATIONS: 4,
};

export const PLAYER_CONFIG = {
  WIDTH: 40,
  HEIGHT: 60,
  JUMP_FORCE: 400,
  ACCELERATION: 800,
  MAX_ENERGY: 100,
  ENERGY_DECAY: 10, // per second
  ENERGY_REGEN: 20, // per second when not using
};

export const BALL_CONFIG = {
  RADIUS: 15,
  MASS: 1,
  MAX_VELOCITY: 500,
  KICK_FORCE: 300,
};

export const FIELD_CONFIG = {
  GOAL_WIDTH: 80,
  GOAL_HEIGHT: 100,
  GOAL_LEFT_X: 0,
  GOAL_RIGHT_X: 720, // fieldWidth - goalWidth
  GOAL_Y: 150, // centered vertically
};

export const WEBSOCKET_CONFIG = {
  UPDATE_RATE: 60, // FPS for network updates
  INTERPOLATION_BUFFER: 100, // ms
  PREDICTION_TIME: 50, // ms
}; 