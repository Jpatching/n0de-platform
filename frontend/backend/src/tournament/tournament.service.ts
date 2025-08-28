import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SolanaService } from '../solana/solana.service';
import { CreateTournamentDto, JoinTournamentDto, TournamentInfo, TournamentStatus, TournamentType, TournamentParticipant, TournamentBracket, TournamentGameType } from './dto/tournament.dto';

@Injectable()
export class TournamentService {
  // In-memory storage for development - replace with actual database
  private tournaments = new Map<string, TournamentInfo>();

  constructor(private readonly solanaService: SolanaService) {}

  async createTournament(createTournamentDto: CreateTournamentDto, creatorWallet: string): Promise<TournamentInfo> {
    // ✅ ADD: Validate game type
    this.validateGameType(createTournamentDto.gameType);
    
    const tournamentId = this.generateTournamentId();
    
    const tournament: TournamentInfo = {
      id: tournamentId,
      ...createTournamentDto,
      startTime: new Date(createTournamentDto.startTime),
      currentParticipants: 0,
      status: TournamentStatus.UPCOMING,
      prizePool: 0,
      participants: [],
      createdAt: new Date(),
    };

    this.tournaments.set(tournamentId, tournament);
    
    console.log(`🏆 ${createTournamentDto.gameType.toUpperCase()} Tournament created: ${tournament.name} by ${creatorWallet}`);
    return tournament;
  }

  // ✅ ADD: Game type validation
  private validateGameType(gameType: TournamentGameType): void {
    const supportedGameTypes = Object.values(TournamentGameType);
    if (!supportedGameTypes.includes(gameType)) {
      throw new BadRequestException(`Unsupported game type: ${gameType}`);
    }
  }

  // ✅ ADD: Get tournament format based on game type
  private getTournamentFormat(gameType: TournamentGameType): string {
    switch (gameType) {
      case TournamentGameType.COINFLIP:
        return 'best-of-5'; // Coinflip tournaments use best-of-5 format (first to 3 wins)
      case TournamentGameType.CHESS:
        return 'single-game'; // Chess tournaments use single games
      case TournamentGameType.DICE_DUEL:
      case TournamentGameType.ROCK_PAPER_SCISSORS:
        return 'best-of-5'; // Other turn-based games use best-of-5
      default:
        return 'single-game';
    }
  }

  // ✅ ADD: Create tournament match based on game type
  async createTournamentMatch(tournament: TournamentInfo, playerA: TournamentParticipant, playerB: TournamentParticipant): Promise<string> {
    const matchFormat = this.getTournamentFormat(tournament.gameType);
    
    console.log(`🎮 Creating ${tournament.gameType} tournament match: ${playerA.walletAddress} vs ${playerB.walletAddress} (${matchFormat})`);
    
    // In a real implementation, this would call the appropriate match service
    // For now, return a mock match ID
    const matchId = `tournament_${tournament.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // TODO: Integrate with actual match services based on game type
    switch (tournament.gameType) {
      case TournamentGameType.COINFLIP:
        // await this.matchService.createCoinFlipTournamentMatch(matchId, playerA.walletAddress, playerB.walletAddress, tournament.entryFee, matchFormat);
        break;
      case TournamentGameType.CHESS:
        // await this.matchService.createChessTournamentMatch(matchId, playerA.walletAddress, playerB.walletAddress, tournament.entryFee);
        break;
      default:
        console.log(`🎯 Tournament match creation for ${tournament.gameType} not yet implemented`);
    }
    
    return matchId;
  }

  async getAllTournaments(): Promise<TournamentInfo[]> {
    return Array.from(this.tournaments.values())
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }

  async getTournament(tournamentId: string): Promise<TournamentInfo> {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }
    return tournament;
  }

  async joinTournament(walletAddress: string, joinTournamentDto: JoinTournamentDto): Promise<{ success: boolean; tournament: TournamentInfo }> {
    const tournament = await this.getTournament(joinTournamentDto.tournamentId);

    // Validation checks
    if (tournament.status !== TournamentStatus.REGISTRATION && tournament.status !== TournamentStatus.UPCOMING) {
      throw new BadRequestException('Tournament registration is closed');
    }

    if (tournament.currentParticipants >= tournament.maxParticipants) {
      throw new BadRequestException('Tournament is full');
    }

    if (tournament.participants.some(p => p.walletAddress === walletAddress)) {
      throw new BadRequestException('Already registered for this tournament');
    }

    // TODO: Check user has sufficient SOL for entry fee
    // const userBalance = await this.solanaService.getVaultBalance(userVaultAddress);
    // if (userBalance < tournament.entryFee) {
    //   throw new BadRequestException('Insufficient balance for entry fee');
    // }

    // Add participant
    const participant: TournamentParticipant = {
      walletAddress,
      joinedAt: new Date(),
      seed: tournament.currentParticipants + 1,
      eliminated: false,
    };

    tournament.participants.push(participant);
    tournament.currentParticipants++;
    tournament.prizePool += tournament.entryFee;

    // Update status if full
    if (tournament.currentParticipants >= tournament.maxParticipants) {
      tournament.status = TournamentStatus.REGISTRATION;
    }

    console.log(`🎮 ${walletAddress} joined tournament: ${tournament.name}`);
    return { success: true, tournament };
  }

  async getTournamentBracket(tournamentId: string): Promise<TournamentBracket> {
    const tournament = await this.getTournament(tournamentId);
    
    if (!tournament.bracket) {
      // Generate bracket if tournament is ready
      if (tournament.status === TournamentStatus.ACTIVE || tournament.currentParticipants >= 4) {
        tournament.bracket = this.generateBracket(tournament);
      } else {
        throw new BadRequestException('Tournament bracket not yet available');
      }
    }

    return tournament.bracket;
  }

  async getUpcomingTournaments(): Promise<TournamentInfo[]> {
    const now = new Date();
    return Array.from(this.tournaments.values())
      .filter(t => t.startTime > now)
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
      .slice(0, 10);
  }

  async getTournamentHistory(): Promise<TournamentInfo[]> {
    return Array.from(this.tournaments.values())
      .filter(t => t.status === TournamentStatus.COMPLETED)
      .sort((a, b) => (b.endTime?.getTime() || 0) - (a.endTime?.getTime() || 0))
      .slice(0, 20);
  }

  async startTournament(tournamentId: string): Promise<{ success: boolean; bracket: TournamentBracket }> {
    const tournament = await this.getTournament(tournamentId);
    
    if (tournament.status !== TournamentStatus.REGISTRATION) {
      throw new BadRequestException('Tournament cannot be started');
    }

    if (tournament.currentParticipants < 4) {
      throw new BadRequestException('Need at least 4 participants to start tournament');
    }

    // Generate and assign bracket
    tournament.bracket = this.generateBracket(tournament);
    tournament.status = TournamentStatus.ACTIVE;

    console.log(`🚀 Tournament started: ${tournament.name} with ${tournament.currentParticipants} participants`);
    
    return { success: true, bracket: tournament.bracket };
  }

  private generateBracket(tournament: TournamentInfo): TournamentBracket {
    const participants = [...tournament.participants];
    
    // Shuffle participants for seeding
    this.shuffleArray(participants);
    
    // Assign seeds
    participants.forEach((participant, index) => {
      participant.seed = index + 1;
    });

    // Generate single elimination bracket
    const bracket: TournamentBracket = {
      rounds: [],
      winners: [],
    };

    // Create first round matches
    const firstRoundMatches = [];
    for (let i = 0; i < participants.length; i += 2) {
      if (i + 1 < participants.length) {
        firstRoundMatches.push({
          id: `match_${tournament.id}_r1_${Math.floor(i/2)}`,
          tournamentId: tournament.id,
          roundNumber: 1,
          playerA: participants[i],
          playerB: participants[i + 1],
          status: 'pending' as const,
        });
      }
    }

    bracket.rounds.push({
      roundNumber: 1,
      matches: firstRoundMatches,
      isComplete: false,
    });

    // Generate subsequent rounds (placeholders)
    let currentMatches = firstRoundMatches.length;
    let roundNumber = 2;
    
    while (currentMatches > 1) {
      const nextRoundMatches = Math.ceil(currentMatches / 2);
      bracket.rounds.push({
        roundNumber,
        matches: [], // Will be populated as previous round completes
        isComplete: false,
      });
      currentMatches = nextRoundMatches;
      roundNumber++;
    }

    return bracket;
  }

  private shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  private generateTournamentId(): string {
    return `tournament_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  // Method to be called when tournament matches are completed
  async processTournamentMatchResult(tournamentId: string, matchId: string, winnerWallet: string): Promise<void> {
    const tournament = await this.getTournament(tournamentId);
    
    if (!tournament.bracket) {
      throw new BadRequestException('Tournament bracket not found');
    }

    // Find and update the match
    for (const round of tournament.bracket.rounds) {
      const match = round.matches.find(m => m.id === matchId);
      if (match) {
        const winner = match.playerA.walletAddress === winnerWallet ? match.playerA : match.playerB;
        const loser = match.playerA.walletAddress === winnerWallet ? match.playerB : match.playerA;
        
        match.winner = winner;
        match.status = 'completed';
        match.completedAt = new Date();
        
        // Mark loser as eliminated
        loser.eliminated = true;
        
        console.log(`🏆 Tournament match completed: ${winner.walletAddress} beats ${loser.walletAddress}`);
        
        // Check if round is complete and advance tournament
        this.checkAndAdvanceTournament(tournament);
        break;
      }
    }
  }

  private checkAndAdvanceTournament(tournament: TournamentInfo): void {
    if (!tournament.bracket) return;

    // Check if current round is complete and generate next round
    const currentRound = tournament.bracket.rounds.find(r => !r.isComplete);
    if (!currentRound) return;

    const allMatchesComplete = currentRound.matches.every(m => m.status === 'completed');
    if (allMatchesComplete) {
      currentRound.isComplete = true;
      
      // If this was the final round, tournament is complete
      if (currentRound.roundNumber === tournament.bracket.rounds.length) {
        tournament.status = TournamentStatus.COMPLETED;
        tournament.endTime = new Date();
        this.distributeTournamentPrizes(tournament);
      } else {
        // Generate next round matches
        this.generateNextRound(tournament, currentRound);
      }
    }
  }

  private generateNextRound(tournament: TournamentInfo, completedRound: any): void {
    const winners = completedRound.matches.map((match: any) => match.winner);
    const nextRoundNumber = completedRound.roundNumber + 1;
    const nextRound = tournament.bracket!.rounds.find(r => r.roundNumber === nextRoundNumber);
    
    if (!nextRound) return;

    // Create matches for next round
    const nextMatches = [];
    for (let i = 0; i < winners.length; i += 2) {
      if (i + 1 < winners.length) {
        nextMatches.push({
          id: `match_${tournament.id}_r${nextRoundNumber}_${Math.floor(i/2)}`,
          tournamentId: tournament.id,
          roundNumber: nextRoundNumber,
          playerA: winners[i],
          playerB: winners[i + 1],
          status: 'pending' as const,
        });
      }
    }
    
    nextRound.matches = nextMatches;
  }

  private distributeTournamentPrizes(tournament: TournamentInfo): void {
    if (!tournament.bracket) return;

    const finalRound = tournament.bracket.rounds[tournament.bracket.rounds.length - 1];
    const finalMatch = finalRound.matches[0];
    
    if (finalMatch?.winner) {
      const winner = finalMatch.winner;
      const runnerUp = finalMatch.playerA.walletAddress === winner.walletAddress ? finalMatch.playerB : finalMatch.playerA;
      
      // Calculate prizes based on percentages
      const firstPlace = tournament.prizePool * (tournament.prizePercentages[0] / 100);
      const secondPlace = tournament.prizePool * (tournament.prizePercentages[1] / 100);
      
      winner.placement = 1;
      winner.earnings = firstPlace;
      runnerUp.placement = 2;
      runnerUp.earnings = secondPlace;
      
      tournament.bracket.winners = [winner, runnerUp];
      
      console.log(`🎉 Tournament completed: ${tournament.name}`);
      console.log(`🥇 Winner: ${winner.walletAddress} - ${firstPlace} SOL`);
      console.log(`🥈 Runner-up: ${runnerUp.walletAddress} - ${secondPlace} SOL`);
      
      // TODO: Implement actual SOL prize distribution
      // this.distributePrizes(tournament);
    }
  }
} 