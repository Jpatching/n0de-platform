import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Headers,
  Req,
  Res,
  ParseIntPipe,
  DefaultValuePipe,
  UnauthorizedException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { SocialService } from './social.service';
import { ReferralService } from './referral.service';
import { CreateThreadDto, CreatePostDto, UpdateThreadDto } from './forum.service';
import { AuthService } from '../auth/auth.service';
import { RateLimitGuard, RateLimit } from '../common/guards/rate-limit.guard';

@Controller('social')
@UseGuards(RateLimitGuard)
export class SocialController {
  private readonly logger = new Logger(SocialController.name);

  constructor(
    private socialService: SocialService,
    private referralService: ReferralService,
    private authService: AuthService,
  ) {}

  // Dashboard
  @Get('dashboard')
  async getDashboard(
    @Headers('authorization') authorization: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      this.logger.log('🔍 Dashboard request received');
      this.logger.log('🔍 Authorization header:', authorization ? 'Present' : 'Missing');
      
      const token = this.extractToken(authorization, req);
      this.logger.log('🔍 Token extracted successfully');
      
      const user = await this.authService.getUserProfile(token);
      this.logger.log('🔍 User profile retrieved:', { id: user.id, username: user.username });
      
      const dashboard = await this.socialService.getSocialDashboard(user.id);
      this.logger.log('🔍 Dashboard data retrieved successfully');
      
      return res.status(HttpStatus.OK).json(dashboard);
    } catch (error) {
      this.logger.error(`❌ Failed to get social dashboard: ${error.message}`);
      this.logger.error(`❌ Error stack:`, error.stack);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  // Leaderboards
  @Get('leaderboards/overall')
  async getOverallLeaderboard(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Res() res: Response
  ) {
    try {
      const leaderboard = await this.socialService.getOverallLeaderboard(limit);
      return res.status(HttpStatus.OK).json(leaderboard);
    } catch (error) {
      this.logger.error(`Failed to get overall leaderboard: ${error.message}`);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch leaderboard' });
    }
  }

  @Get('leaderboards/game/:gameType')
  async getGameLeaderboard(
    @Param('gameType') gameType: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Res() res: Response
  ) {
    try {
      const leaderboard = await this.socialService.getGameLeaderboard(gameType, limit);
      return res.status(HttpStatus.OK).json(leaderboard);
    } catch (error) {
      this.logger.error(`Failed to get game leaderboard: ${error.message}`);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch leaderboard' });
    }
  }

  @Get('leaderboards/weekly')
  async getWeeklyLeaderboard(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Res() res: Response
  ) {
    try {
      const leaderboard = await this.socialService.getWeeklyLeaderboard(limit);
      return res.status(HttpStatus.OK).json(leaderboard);
    } catch (error) {
      this.logger.error(`Failed to get weekly leaderboard: ${error.message}`);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch leaderboard' });
    }
  }

  @Get('leaderboards/rank/:type')
  async getUserRank(
    @Headers('authorization') authorization: string,
    @Req() req: Request,
    @Res() res: Response,
    @Param('type') type: string,
  ) {
    try {
      const token = this.extractToken(authorization, req);
      const user = await this.authService.getUserProfile(token);
      const rank = await this.socialService.getUserRank(user.id, type);
      
      return res.status(HttpStatus.OK).json(rank);
    } catch (error) {
      this.logger.error(`Failed to get user rank: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  // Forum Categories
  @Get('forum/categories')
  async getForumCategories(@Res() res: Response) {
    try {
      const categories = await this.socialService.getForumCategories();
      return res.status(HttpStatus.OK).json(categories);
    } catch (error) {
      this.logger.error(`Failed to get forum categories: ${error.message}`);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch categories' });
    }
  }

  @Get('forum/categories/:slug')
  async getCategoryBySlug(
    @Param('slug') slug: string,
    @Res() res: Response
  ) {
    try {
      const category = await this.socialService.getCategoryBySlug(slug);
      return res.status(HttpStatus.OK).json(category);
    } catch (error) {
      this.logger.error(`Failed to get category: ${error.message}`);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch category' });
    }
  }

  // Forum Threads
  @Get('forum/categories/:categoryId/threads')
  async getThreadsByCategory(
    @Param('categoryId') categoryId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Res() res: Response
  ) {
    try {
      const threads = await this.socialService.getThreadsByCategory(categoryId, page, limit);
      return res.status(HttpStatus.OK).json(threads);
    } catch (error) {
      this.logger.error(`Failed to get threads: ${error.message}`);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch threads' });
    }
  }

  @Get('forum/threads/:threadId')
  async getThread(
    @Param('threadId') threadId: string,
    @Res() res: Response
  ) {
    try {
      const thread = await this.socialService.getThread(threadId);
      return res.status(HttpStatus.OK).json(thread);
    } catch (error) {
      this.logger.error(`Failed to get thread: ${error.message}`);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch thread' });
    }
  }

  @Post('forum/threads')
  async createThread(
    @Headers('authorization') authorization: string,
    @Req() req: Request,
    @Res() res: Response,
    @Body() createThreadDto: CreateThreadDto,
  ) {
    try {
      const token = this.extractToken(authorization, req);
      const user = await this.authService.getUserProfile(token);
      const thread = await this.socialService.createThread(user.id, createThreadDto);
      
      return res.status(HttpStatus.CREATED).json(thread);
    } catch (error) {
      this.logger.error(`Failed to create thread: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  @Put('forum/threads/:threadId')
  async updateThread(
    @Headers('authorization') authorization: string,
    @Req() req: Request,
    @Res() res: Response,
    @Param('threadId') threadId: string,
    @Body() updateThreadDto: UpdateThreadDto,
  ) {
    try {
      const token = this.extractToken(authorization, req);
      const user = await this.authService.getUserProfile(token);
      const thread = await this.socialService.updateThread(threadId, user.id, updateThreadDto);
      
      return res.status(HttpStatus.OK).json(thread);
    } catch (error) {
      this.logger.error(`Failed to update thread: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  @Delete('forum/threads/:threadId')
  async deleteThread(
    @Headers('authorization') authorization: string,
    @Req() req: Request,
    @Res() res: Response,
    @Param('threadId') threadId: string,
  ) {
    try {
      const token = this.extractToken(authorization, req);
      const user = await this.authService.getUserProfile(token);
      await this.socialService.deleteThread(threadId, user.id);
      
      return res.status(HttpStatus.NO_CONTENT).send();
    } catch (error) {
      this.logger.error(`Failed to delete thread: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  @Get('forum/search')
  async searchThreads(
    @Query('q') query: string,
    @Res() res: Response,
    @Query('categoryId') categoryId?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    try {
      const results = await this.socialService.searchThreads(query, categoryId, page, limit);
      return res.status(HttpStatus.OK).json(results);
    } catch (error) {
      this.logger.error(`Failed to search threads: ${error.message}`);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Failed to search threads' });
    }
  }

  // Forum Posts
  @Get('forum/threads/:threadId/posts')
  async getPostsByThread(
    @Param('threadId') threadId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Res() res: Response
  ) {
    try {
      const posts = await this.socialService.getPostsByThread(threadId, page, limit);
      return res.status(HttpStatus.OK).json(posts);
    } catch (error) {
      this.logger.error(`Failed to get posts: ${error.message}`);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch posts' });
    }
  }

  @Post('forum/posts')
  async createPost(
    @Headers('authorization') authorization: string,
    @Req() req: Request,
    @Res() res: Response,
    @Body() createPostDto: CreatePostDto,
  ) {
    try {
      const token = this.extractToken(authorization, req);
      const user = await this.authService.getUserProfile(token);
      const post = await this.socialService.createPost(user.id, createPostDto);
      
      return res.status(HttpStatus.CREATED).json(post);
    } catch (error) {
      this.logger.error(`Failed to create post: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  @Delete('forum/posts/:postId')
  async deletePost(
    @Headers('authorization') authorization: string,
    @Req() req: Request,
    @Res() res: Response,
    @Param('postId') postId: string,
  ) {
    try {
      const token = this.extractToken(authorization, req);
      const user = await this.authService.getUserProfile(token);
      await this.socialService.deletePost(postId, user.id);
      
      return res.status(HttpStatus.NO_CONTENT).send();
    } catch (error) {
      this.logger.error(`Failed to delete post: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  // Achievements
  @Get('achievements')
  async getUserAchievements(
    @Headers('authorization') authorization: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      const token = this.extractToken(authorization, req);
      const user = await this.authService.getUserProfile(token);
      const achievements = await this.socialService.getUserAchievements(user.id);
      
      return res.status(HttpStatus.OK).json(achievements);
    } catch (error) {
      this.logger.error(`Failed to get achievements: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  @Get('achievements/stats')
  async getAchievementStats(
    @Headers('authorization') authorization: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      const token = this.extractToken(authorization, req);
      const user = await this.authService.getUserProfile(token);
      const stats = await this.socialService.getAchievementStats(user.id);
      
      return res.status(HttpStatus.OK).json(stats);
    } catch (error) {
      this.logger.error(`Failed to get achievement stats: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  @Get('achievements/recent')
  async getRecentUnlocks(
    @Headers('authorization') authorization: string,
    @Req() req: Request,
    @Query('limit', new DefaultValuePipe(5), ParseIntPipe) limit: number,
    @Res() res: Response,
  ) {
    try {
      const token = this.extractToken(authorization, req);
      const user = await this.authService.getUserProfile(token);
      const unlocks = await this.socialService.getRecentUnlocks(user.id, limit);
      
      return res.status(HttpStatus.OK).json(unlocks);
    } catch (error) {
      this.logger.error(`Failed to get recent unlocks: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  @Post('achievements/update')
  async updateAchievementProgress(
    @Headers('authorization') authorization: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      const token = this.extractToken(authorization, req);
      const user = await this.authService.getUserProfile(token);
      const updated = await this.socialService.updateAchievementProgress(user.id);
      
      return res.status(HttpStatus.OK).json(updated);
    } catch (error) {
      this.logger.error(`Failed to update achievement progress: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  // Friends
  @Get('friends')
  async getFriends(
    @Headers('authorization') authorization: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      const token = this.extractToken(authorization, req);
      const user = await this.authService.getUserProfile(token);
      const friends = await this.socialService.getFriends(user.id);
      
      return res.status(HttpStatus.OK).json(friends);
    } catch (error) {
      this.logger.error(`Failed to get friends: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  @Get('friends/requests')
  async getPendingRequests(
    @Headers('authorization') authorization: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      const token = this.extractToken(authorization, req);
      const user = await this.authService.getUserProfile(token);
      const requests = await this.socialService.getPendingRequests(user.id);
      
      return res.status(HttpStatus.OK).json(requests);
    } catch (error) {
      this.logger.error(`Failed to get friend requests: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  @Post('friends/request')
  async sendFriendRequest(
    @Headers('authorization') authorization: string,
    @Req() req: Request,
    @Res() res: Response,
    @Body('username') username: string,
  ) {
    try {
      const token = this.extractToken(authorization, req);
      const user = await this.authService.getUserProfile(token);
      const request = await this.socialService.sendFriendRequest(user.id, username);
      
      return res.status(HttpStatus.CREATED).json(request);
    } catch (error) {
      this.logger.error(`Failed to send friend request: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  @Post('friends/accept/:friendshipId')
  async acceptFriendRequest(
    @Headers('authorization') authorization: string,
    @Req() req: Request,
    @Res() res: Response,
    @Param('friendshipId') friendshipId: string,
  ) {
    try {
      const token = this.extractToken(authorization, req);
      const user = await this.authService.getUserProfile(token);
      const friendship = await this.socialService.acceptFriendRequest(friendshipId, user.id);
      
      return res.status(HttpStatus.OK).json(friendship);
    } catch (error) {
      this.logger.error(`Failed to accept friend request: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  @Delete('friends/reject/:friendshipId')
  async rejectFriendRequest(
    @Headers('authorization') authorization: string,
    @Req() req: Request,
    @Res() res: Response,
    @Param('friendshipId') friendshipId: string,
  ) {
    try {
      const token = this.extractToken(authorization, req);
      const user = await this.authService.getUserProfile(token);
      await this.socialService.rejectFriendRequest(friendshipId, user.id);
      
      return res.status(HttpStatus.NO_CONTENT).send();
    } catch (error) {
      this.logger.error(`Failed to reject friend request: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  @Delete('friends/cancel/:friendshipId')
  async cancelFriendRequest(
    @Headers('authorization') authorization: string,
    @Req() req: Request,
    @Res() res: Response,
    @Param('friendshipId') friendshipId: string,
  ) {
    try {
      const token = this.extractToken(authorization, req);
      const user = await this.authService.getUserProfile(token);
      await this.socialService.cancelFriendRequest(friendshipId, user.id);
      
      return res.status(HttpStatus.NO_CONTENT).send();
    } catch (error) {
      this.logger.error(`Failed to cancel friend request: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  @Delete('friends/:friendshipId')
  async removeFriend(
    @Headers('authorization') authorization: string,
    @Req() req: Request,
    @Res() res: Response,
    @Param('friendshipId') friendshipId: string,
  ) {
    try {
      const token = this.extractToken(authorization, req);
      const user = await this.authService.getUserProfile(token);
      await this.socialService.removeFriend(friendshipId, user.id);
      
      return res.status(HttpStatus.NO_CONTENT).send();
    } catch (error) {
      this.logger.error(`Failed to remove friend: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  @Post('friends/block/:userId')
  async blockUser(
    @Headers('authorization') authorization: string,
    @Req() req: Request,
    @Res() res: Response,
    @Param('userId') userId: string,
  ) {
    try {
      const token = this.extractToken(authorization, req);
      const user = await this.authService.getUserProfile(token);
      const block = await this.socialService.blockUser(user.id, userId);
      
      return res.status(HttpStatus.OK).json(block);
    } catch (error) {
      this.logger.error(`Failed to block user: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  @Delete('friends/unblock/:userId')
  async unblockUser(
    @Headers('authorization') authorization: string,
    @Req() req: Request,
    @Res() res: Response,
    @Param('userId') userId: string,
  ) {
    try {
      const token = this.extractToken(authorization, req);
      const user = await this.authService.getUserProfile(token);
      await this.socialService.unblockUser(user.id, userId);
      
      return res.status(HttpStatus.NO_CONTENT).send();
    } catch (error) {
      this.logger.error(`Failed to unblock user: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  @Get('friends/blocked')
  async getBlockedUsers(
    @Headers('authorization') authorization: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      const token = this.extractToken(authorization, req);
      const user = await this.authService.getUserProfile(token);
      const blocked = await this.socialService.getBlockedUsers(user.id);
      
      return res.status(HttpStatus.OK).json(blocked);
    } catch (error) {
      this.logger.error(`Failed to get blocked users: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  @Get('friends/search')
  async searchUsers(
    @Headers('authorization') authorization: string,
    @Req() req: Request,
    @Query('q') query: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Res() res: Response,
  ) {
    try {
      const token = this.extractToken(authorization, req);
      const user = await this.authService.getUserProfile(token);
      const users = await this.socialService.searchUsers(query, user.id, limit);
      
      return res.status(HttpStatus.OK).json(users);
    } catch (error) {
      this.logger.error(`Failed to search users: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  @Get('friends/status/:userId')
  async getFriendshipStatus(
    @Headers('authorization') authorization: string,
    @Req() req: Request,
    @Res() res: Response,
    @Param('userId') targetUserId: string,
  ) {
    try {
      const token = this.extractToken(authorization, req);
      const user = await this.authService.getUserProfile(token);
      const status = await this.socialService.getFriendshipStatus(user.id, targetUserId);
      
      return res.status(HttpStatus.OK).json(status);
    } catch (error) {
      this.logger.error(`Failed to get friendship status: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  /**
   * Extract token from Authorization header or cookie
   */
  private extractToken(authorization: string, req: Request): string {
    // Try Authorization header first
    if (authorization && authorization.startsWith('Bearer ')) {
      return authorization.substring(7);
    }

    // Try cookie
    if (req.cookies && req.cookies.pv3_token) {
      return req.cookies.pv3_token;
    }

    throw new UnauthorizedException('No authentication token provided');
  }

  // Prestige endpoints
  @Get('prestige/info')
  async getPrestigeInfo(
    @Headers('authorization') authorization: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      const token = this.extractToken(authorization, req);
      const user = await this.authService.getUserProfile(token);
      const prestigeInfo = await this.socialService.getUserPrestigeInfo(user.id);
      
      return res.status(HttpStatus.OK).json(prestigeInfo);
    } catch (error) {
      this.logger.error(`Failed to get prestige info: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  @Get('prestige/leaderboard')
  async getPrestigeLeaderboard(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Res() res: Response
  ) {
    try {
      const leaderboard = await this.socialService.getPrestigeLeaderboard(limit);
      return res.status(HttpStatus.OK).json(leaderboard);
    } catch (error) {
      this.logger.error(`Failed to get prestige leaderboard: ${error.message}`);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch prestige leaderboard' });
    }
  }

  @Post('prestige/advance')
  async prestigeUser(
    @Headers('authorization') authorization: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      const token = this.extractToken(authorization, req);
      const user = await this.authService.getUserProfile(token);
      const result = await this.socialService.prestigeUser(user.id);
      
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      this.logger.error(`Failed to prestige user: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  // Referral endpoints - THE MAIN PP EARNING SYSTEM
  @Get('referrals/my-code')
  async getMyReferralCode(
    @Headers('authorization') authorization: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      const token = this.extractToken(authorization, req);
      const user = await this.authService.getUserProfile(token);
      const referralCode = await this.referralService.generateReferralCode(user.id);
      
      return res.status(HttpStatus.OK).json({ referralCode });
    } catch (error) {
      this.logger.error(`Failed to get referral code: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  @Get('referrals/stats')
  async getReferralStats(
    @Headers('authorization') authorization: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      const token = this.extractToken(authorization, req);
      const user = await this.authService.getUserProfile(token);
      const stats = await this.referralService.getReferralStats(user.id);
      
      return res.status(HttpStatus.OK).json(stats);
    } catch (error) {
      this.logger.error(`Failed to get referral stats: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  @Post('referrals/apply-code')
  async applyReferralCode(
    @Headers('authorization') authorization: string,
    @Req() req: Request,
    @Res() res: Response,
    @Body('referralCode') referralCode: string,
  ) {
    try {
      const token = this.extractToken(authorization, req);
      const user = await this.authService.getUserProfile(token);
      const success = await this.referralService.processReferralSignup(referralCode, user.id);
      
      if (success) {
        return res.status(HttpStatus.OK).json({ 
          success: true, 
          message: 'Referral code applied successfully! Your referrer earned massive PP!' 
        });
      } else {
        return res.status(HttpStatus.BAD_REQUEST).json({ 
          success: false, 
          message: 'Invalid referral code' 
        });
      }
    } catch (error) {
      this.logger.error(`Failed to apply referral code: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  @Get('referrals/leaderboard')
  async getReferralLeaderboard(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Res() res: Response
  ) {
    try {
      const leaderboard = await this.referralService.getReferralLeaderboard(limit);
      return res.status(HttpStatus.OK).json(leaderboard);
    } catch (error) {
      this.logger.error(`Failed to get referral leaderboard: ${error.message}`);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch referral leaderboard' });
    }
  }
} 