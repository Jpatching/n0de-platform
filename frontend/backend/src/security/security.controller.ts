import { Controller, Get, Post, Body, Param, Headers, UnauthorizedException } from '@nestjs/common';
import { SecurityService } from './security.service';
import { ReportCheatDto, DisputeResultDto } from './dto/security.dto';
import { AuthService } from '../auth/auth.service';

@Controller('security')
export class SecurityController {
  constructor(
    private readonly securityService: SecurityService,
    private readonly authService: AuthService,
  ) {}

  @Post('report-cheat')
  async reportCheat(
    @Headers('authorization') auth: string,
    @Body() reportCheatDto: ReportCheatDto
  ) {
    const session = await this.validateSession(auth);
    const report = await this.securityService.reportCheat(session.wallet, reportCheatDto);
    return { report };
  }

  @Get('player-reports/:wallet')
  async getPlayerReports(@Param('wallet') wallet: string) {
    const reports = await this.securityService.getPlayerReports(wallet);
    return { reports };
  }

  @Post('dispute-result')
  async disputeResult(
    @Headers('authorization') auth: string,
    @Body() disputeResultDto: DisputeResultDto
  ) {
    const session = await this.validateSession(auth);
    const dispute = await this.securityService.disputeResult(session.wallet, disputeResultDto);
    return { dispute };
  }

  @Get('match-audit/:matchId')
  async getMatchAuditLog(@Param('matchId') matchId: string) {
    const auditLog = await this.securityService.getMatchAuditLog(matchId);
    return { auditLog };
  }

  @Get('banned-players')
  async getBannedPlayers() {
    const bannedPlayers = await this.securityService.getBannedPlayers();
    return { bannedPlayers };
  }

  @Post('verify-signature')
  async verifySignature(@Body() body: { signature: string; message: string; publicKey: string }) {
    const isValid = await this.securityService.verifySignature(body.signature, body.message, body.publicKey);
    return { valid: isValid };
  }

  @Get('stats')
  async getSecurityStats() {
    const stats = await this.securityService.getSecurityStats();
    return { stats };
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
