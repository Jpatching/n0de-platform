import { Controller, Get, Post, Body, Headers, UnauthorizedException } from '@nestjs/common';
import { ReferralService } from './referral.service';
import { ApplyReferralCodeDto, ClaimSolRewardsDto } from './dto/referral.dto';
import { AuthService } from '../auth/auth.service';

@Controller('referrals')
export class ReferralController {
  constructor(
    private readonly referralService: ReferralService,
    private readonly authService: AuthService,
  ) {}

  @Get('my-code')
  async getMyReferralCode(@Headers('authorization') auth: string) {
    const session = await this.validateSession(auth);
    return this.referralService.getMyReferralCode(session.wallet);
  }

  @Post('apply-code')
  async applyReferralCode(
    @Headers('authorization') auth: string,
    @Body() applyCodeDto: ApplyReferralCodeDto
  ) {
    const session = await this.validateSession(auth);
    return this.referralService.applyReferralCode(session.wallet, applyCodeDto);
  }

  @Get('referred-users')
  async getReferredUsers(@Headers('authorization') auth: string) {
    const session = await this.validateSession(auth);
    const referredUsers = await this.referralService.getReferredUsers(session.wallet);
    return { referredUsers };
  }

  @Get('earnings-sol')
  async getSolEarnings(@Headers('authorization') auth: string) {
    const session = await this.validateSession(auth);
    return this.referralService.getSolEarnings(session.wallet);
  }

  @Post('claim-sol')
  async claimSolRewards(
    @Headers('authorization') auth: string,
    @Body() claimDto: ClaimSolRewardsDto
  ) {
    const session = await this.validateSession(auth);
    return this.referralService.claimSolRewards(session.wallet, claimDto);
  }

  @Get('sol-history')
  async getSolHistory(@Headers('authorization') auth: string) {
    const session = await this.validateSession(auth);
    const history = await this.referralService.getSolHistory(session.wallet);
    return { history };
  }

  @Get('stats')
  async getReferralStats(@Headers('authorization') auth: string) {
    const session = await this.validateSession(auth);
    const stats = await this.referralService.getReferralStats(session.wallet);
    return { stats };
  }

  @Get('leaderboard')
  async getLeaderboard() {
    const leaderboard = await this.referralService.getLeaderboard();
    return { leaderboard };
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
