import { IsString, IsOptional, IsObject, IsNotEmpty } from 'class-validator';

export class DemoMatchResultDto {
  @IsString()
  @IsNotEmpty()
  matchId: string;

  @IsOptional()
  @IsString()
  winnerId?: string; // Player ID of winner, null for draw

  @IsOptional()
  @IsObject()
  gameState?: any; // Final game state

  @IsOptional()
  @IsString()
  reason?: string; // Win reason: checkmate, resignation, timeout, draw, etc.
}