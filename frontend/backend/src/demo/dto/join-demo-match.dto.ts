import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class JoinDemoMatchDto {
  @IsOptional()
  @IsString()
  playerId?: string;

  @IsOptional()
  @IsString()
  username?: string;
}