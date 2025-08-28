import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, IsEnum } from 'class-validator';

export enum DemoGameType {
  CHESS = 'chess',
  COINFLIP = 'coinflip',
  ROCK_PAPER_SCISSORS = 'rock-paper-scissors',
  DICE_DUEL = 'dice-duel',
  CRASH = 'crash',
  MINES = 'mines',
}

export class CreateDemoMatchDto {
  @IsEnum(DemoGameType)
  @IsNotEmpty()
  gameType: string;

  @IsOptional()
  @IsString()
  playerId?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  timeControl?: string; // For chess: "5+0", "10+0", etc.

  @IsOptional()
  @IsNumber()
  @Min(5)
  expiryMinutes?: number = 30; // Default 30 minutes

  @IsOptional()
  gameConfig?: any; // Game-specific configuration
}