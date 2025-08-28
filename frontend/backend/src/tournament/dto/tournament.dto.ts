import { IsString, IsNotEmpty, IsNumber, IsOptional, Min, Max, IsEnum, IsArray } from 'class-validator';

export enum TournamentType {
  SINGLE_ELIMINATION = 'single_elimination',
  DOUBLE_ELIMINATION = 'double_elimination',
  ROUND_ROBIN = 'round_robin',
}

export enum TournamentStatus {
  UPCOMING = 'upcoming',
  REGISTRATION = 'registration',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum TournamentGameType {
  CHESS = 'chess',
  COINFLIP = 'coin-flip',
  DICE_DUEL = 'dice-duel',
  ROCK_PAPER_SCISSORS = 'rock-paper-scissors',
  REALTIME_HTML5 = 'realtime-html5',
  REALTIME_UNITY = 'realtime-unity',
}

export class CreateTournamentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TournamentGameType)
  gameType: TournamentGameType;

  @IsNumber()
  @Min(0.1)
  entryFee: number;

  @IsNumber()
  @Min(4)
  @Max(256)
  maxParticipants: number;

  @IsEnum(TournamentType)
  type: TournamentType;

  @IsString()
  @IsNotEmpty()
  startTime: string; // ISO string

  @IsNumber()
  @Min(1)
  @Max(100)
  prizePercentages: number[]; // [50, 30, 20] for 1st, 2nd, 3rd
}

export class JoinTournamentDto {
  @IsString()
  @IsNotEmpty()
  tournamentId: string;
}

export interface TournamentInfo {
  id: string;
  name: string;
  description?: string;
  gameType: TournamentGameType;
  entryFee: number;
  maxParticipants: number;
  currentParticipants: number;
  type: TournamentType;
  status: TournamentStatus;
  startTime: Date;
  endTime?: Date;
  prizePool: number;
  prizePercentages: number[];
  participants: TournamentParticipant[];
  bracket?: TournamentBracket;
  createdAt: Date;
}

export interface TournamentParticipant {
  walletAddress: string;
  username?: string;
  joinedAt: Date;
  seed: number;
  eliminated: boolean;
  placement?: number;
  earnings?: number;
}

export interface TournamentBracket {
  rounds: TournamentRound[];
  winners: TournamentParticipant[];
}

export interface TournamentRound {
  roundNumber: number;
  matches: TournamentMatch[];
  isComplete: boolean;
}

export interface TournamentMatch {
  id: string;
  tournamentId: string;
  roundNumber: number;
  playerA: TournamentParticipant;
  playerB: TournamentParticipant;
  winner?: TournamentParticipant;
  status: 'pending' | 'active' | 'completed';
  scheduledAt?: Date;
  completedAt?: Date;
} 