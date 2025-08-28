import { IsString, IsOptional, IsUrl, IsNotEmpty, IsNumber, Min, IsBoolean } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsUrl()
  @IsOptional()
  avatar?: string;

  @IsString()
  @IsOptional()
  nftAvatar?: string; // NFT address for avatar
}

export class UpdatePreferencesDto {
  @IsOptional()
  gamePreferences?: {
    favoriteGames?: string[];
    preferredWagerRange?: {
      min: number;
      max: number;
    };
  };

  @IsOptional()
  notificationSettings?: {
    matchInvites: boolean;
    tournamentUpdates: boolean;
    earnings: boolean;
    marketing: boolean;
  };
}

export class BankrollLimitsDto {
  @IsNumber()
  @Min(0)
  @IsOptional()
  daily?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  weekly?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  monthly?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  dailyDeposit?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  weeklyDeposit?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  monthlyDeposit?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  dailyLoss?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  weeklyLoss?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  monthlyLoss?: number;

  @IsNumber()
  @Min(15)
  @IsOptional()
  sessionTime?: number; // minutes

  @IsNumber()
  @Min(0.1)
  @IsOptional()
  maxWager?: number;
}

export class UpdateBankrollLimitsDto {
  @IsOptional()
  limits?: BankrollLimitsDto;

  @IsBoolean()
  @IsOptional()
  limitsEnabled?: boolean;
}

export interface UserStats {
  totalMatches: number;
  wins: number;
  losses: number;
  winRate: number;
  totalEarnings: number;
  totalWagered: number;
  averageWager: number;
  longestWinStreak: number;
  currentWinStreak: number;
  profitLoss: number;
  gamesPlayed: { [key: string]: number };
}

export interface UserAchievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: Date;
  progress?: {
    current: number;
    target: number;
  };
}

export interface BankrollUsage {
  dailyDeposited: number;
  weeklyDeposited: number;
  monthlyDeposited: number;
  dailyLost: number;
  weeklyLost: number;
  monthlyLost: number;
  sessionTime: number;
  currentWager: number;
} 