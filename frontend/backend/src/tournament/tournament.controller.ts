import { Controller, Get, Post, Body, Param, Headers, UnauthorizedException } from '@nestjs/common';
import { TournamentService } from './tournament.service';
import { CreateTournamentDto, JoinTournamentDto } from './dto/tournament.dto';
import { AuthService } from '../auth/auth.service';

@Controller('tournaments')
export class TournamentController {
  constructor(
    private readonly tournamentService: TournamentService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  async getAllTournaments() {
    const tournaments = await this.tournamentService.getAllTournaments();
    return { tournaments };
  }

  @Post()
  async createTournament(
    @Headers('authorization') auth: string,
    @Body() createTournamentDto: CreateTournamentDto
  ) {
    const session = await this.validateSession(auth);
    const tournament = await this.tournamentService.createTournament(createTournamentDto, session.wallet);
    return { tournament };
  }

  @Get(':id')
  async getTournament(@Param('id') id: string) {
    const tournament = await this.tournamentService.getTournament(id);
    return { tournament };
  }

  @Post(':id/join')
  async joinTournament(
    @Headers('authorization') auth: string,
    @Param('id') id: string
  ) {
    const session = await this.validateSession(auth);
    return this.tournamentService.joinTournament(session.wallet, { tournamentId: id });
  }

  @Get('schedule')
  async getUpcomingTournaments() {
    const tournaments = await this.tournamentService.getUpcomingTournaments();
    return { tournaments };
  }

  @Get('history')
  async getTournamentHistory() {
    const tournaments = await this.tournamentService.getTournamentHistory();
    return { tournaments };
  }

  @Get(':id/bracket')
  async getTournamentBracket(@Param('id') id: string) {
    const bracket = await this.tournamentService.getTournamentBracket(id);
    return { bracket };
  }

  @Post(':id/start')
  async startTournament(
    @Headers('authorization') auth: string,
    @Param('id') id: string
  ) {
    const session = await this.validateSession(auth);
    return this.tournamentService.startTournament(id);
  }

  private async validateSession(authHeader: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid authorization header');
    }
    const sessionId = authHeader.substring(7);
    const session = await this.authService.validateSession(sessionId);
    if (!session) {
      throw new UnauthorizedException('Invalid session');
    }
    return session;
  }
} 
