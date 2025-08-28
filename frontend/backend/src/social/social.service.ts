import { Injectable } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';
import { ForumService } from './forum.service';
import { AchievementService } from './achievement.service';
import { FriendsService } from './friends.service';
import { PrestigeService } from './prestige.service';

@Injectable()
export class SocialService {
  constructor(
    private leaderboardService: LeaderboardService,
    private forumService: ForumService,
    private achievementService: AchievementService,
    private friendsService: FriendsService,
    private prestigeService: PrestigeService,
  ) {}

  async getSocialDashboard(userId: string) {
    const [
      userRank,
      recentAchievements,
      achievementStats,
      friendRequests,
      friends,
      prestigeInfo,
    ] = await Promise.all([
      this.leaderboardService.getUserRank(userId, 'overall'),
      this.achievementService.getRecentUnlocks(userId, 3),
      this.achievementService.getAchievementStats(userId),
      this.friendsService.getPendingRequests(userId),
      this.friendsService.getFriends(userId),
      this.prestigeService.getUserPrestigeInfo(userId),
    ]);

    return {
      userRank,
      recentAchievements,
      achievementStats,
      friendRequests: {
        incoming: friendRequests.incoming.length,
        outgoing: friendRequests.outgoing.length,
      },
      friendsCount: friends.length,
      onlineFriendsCount: friends.filter(f => f.status === 'online').length,
      prestige: prestigeInfo,
    };
  }

  async initializeUserSocialData(userId: string) {
    // Update achievement progress when user logs in or completes matches
    await this.achievementService.updateAchievementProgress(userId);
  }

  // Leaderboard methods
  getOverallLeaderboard = this.leaderboardService.getOverallLeaderboard.bind(this.leaderboardService);
  getGameLeaderboard = this.leaderboardService.getGameLeaderboard.bind(this.leaderboardService);
  getWeeklyLeaderboard = this.leaderboardService.getWeeklyLeaderboard.bind(this.leaderboardService);
  getUserRank = this.leaderboardService.getUserRank.bind(this.leaderboardService);

  // Forum methods
  getForumCategories = this.forumService.getCategories.bind(this.forumService);
  getCategoryBySlug = this.forumService.getCategoryBySlug.bind(this.forumService);
  getThreadsByCategory = this.forumService.getThreadsByCategory.bind(this.forumService);
  getThread = this.forumService.getThread.bind(this.forumService);
  getPostsByThread = this.forumService.getPostsByThread.bind(this.forumService);
  createThread = this.forumService.createThread.bind(this.forumService);
  createPost = this.forumService.createPost.bind(this.forumService);
  updateThread = this.forumService.updateThread.bind(this.forumService);
  updatePost = this.forumService.updatePost.bind(this.forumService);
  deleteThread = this.forumService.deleteThread.bind(this.forumService);
  deletePost = this.forumService.deletePost.bind(this.forumService);
  searchThreads = this.forumService.searchThreads.bind(this.forumService);

  // Achievement methods
  getUserAchievements = this.achievementService.getUserAchievements.bind(this.achievementService);
  getAchievementStats = this.achievementService.getAchievementStats.bind(this.achievementService);
  updateAchievementProgress = this.achievementService.updateAchievementProgress.bind(this.achievementService);
  getRecentUnlocks = this.achievementService.getRecentUnlocks.bind(this.achievementService);

  // Friends methods
  getFriends = this.friendsService.getFriends.bind(this.friendsService);
  getPendingRequests = this.friendsService.getPendingRequests.bind(this.friendsService);
  sendFriendRequest = this.friendsService.sendFriendRequest.bind(this.friendsService);
  acceptFriendRequest = this.friendsService.acceptFriendRequest.bind(this.friendsService);
  rejectFriendRequest = this.friendsService.rejectFriendRequest.bind(this.friendsService);
  cancelFriendRequest = this.friendsService.cancelFriendRequest.bind(this.friendsService);
  removeFriend = this.friendsService.removeFriend.bind(this.friendsService);
  blockUser = this.friendsService.blockUser.bind(this.friendsService);
  unblockUser = this.friendsService.unblockUser.bind(this.friendsService);
  getBlockedUsers = this.friendsService.getBlockedUsers.bind(this.friendsService);
  searchUsers = this.friendsService.searchUsers.bind(this.friendsService);
  getFriendshipStatus = this.friendsService.getFriendshipStatus.bind(this.friendsService);

  // Prestige methods
  getUserPrestigeInfo = this.prestigeService.getUserPrestigeInfo.bind(this.prestigeService);
  getPrestigeLeaderboard = this.prestigeService.getPrestigeLeaderboard.bind(this.prestigeService);
  prestigeUser = this.prestigeService.prestigeUser.bind(this.prestigeService);
  canPrestige = this.prestigeService.canPrestige.bind(this.prestigeService);
  awardProofPoints = this.prestigeService.awardProofPoints.bind(this.prestigeService);
  calculateMatchProofPoints = this.prestigeService.calculateMatchProofPoints.bind(this.prestigeService);
} 