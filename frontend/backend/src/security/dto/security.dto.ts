import { IsString, IsNotEmpty, IsOptional, IsEnum, IsArray } from 'class-validator';

export enum ReportType {
  CHEATING = 'cheating',
  EXPLOIT = 'exploit',
  HARASSMENT = 'harassment',
  FRAUD = 'fraud',
  OTHER = 'other',
}

export enum ReportStatus {
  PENDING = 'pending',
  INVESTIGATING = 'investigating',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed',
}

export enum DisputeType {
  MATCH_RESULT = 'match_result',
  TECHNICAL_ISSUE = 'technical_issue',
  UNFAIR_PLAY = 'unfair_play',
}

export class ReportCheatDto {
  @IsString()
  @IsNotEmpty()
  reportedUser: string;

  @IsEnum(ReportType)
  type: ReportType;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsOptional()
  matchId?: string;

  @IsArray()
  @IsOptional()
  evidence?: string[]; // URLs or file paths
}

export class DisputeResultDto {
  @IsString()
  @IsNotEmpty()
  matchId: string;

  @IsEnum(DisputeType)
  type: DisputeType;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsArray()
  @IsOptional()
  evidence?: string[];
}

export interface SecurityReport {
  id: string;
  reporterId: string;
  reportedUser: string;
  type: ReportType;
  description: string;
  matchId?: string;
  evidence: string[];
  status: ReportStatus;
  createdAt: Date;
  resolvedAt?: Date;
  adminNotes?: string;
}

export interface MatchDispute {
  id: string;
  matchId: string;
  disputerId: string;
  type: DisputeType;
  reason: string;
  evidence: string[];
  status: ReportStatus;
  createdAt: Date;
  resolvedAt?: Date;
  resolution?: string;
} 