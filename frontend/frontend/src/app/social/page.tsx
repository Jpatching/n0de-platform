'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { socialApi } from '@/lib/api';
import Sidebar from '../../components/Sidebar';
import PageHeader from '../../components/PageHeader';
import Avatar from '../../components/Avatar';

interface LeaderboardPlayer {
  rank: number;
  id: string;
  username: string;
  displayName: string | null;
  avatar: string;
  wins: number;
  earnings: number;
  winRate: number;
  games: number;
  level?: number;
  elo?: number;
  streak?: number;
}

interface ForumCategory {
  id: string;
  name: string;
  description: string;
  slug: string;
  threadCount: number;
  postCount: number;
}

interface ForumThread {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  isLocked: boolean;
  replyCount: number;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    username: string;
    displayName: string | null;
    avatar: string;
  };
  category: {
    id: string;
    name: string;
    slug: string;
  };
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: string;
  isUnlocked: boolean;
  progress: number;
  maxProgress: number;
  unlockedAt?: string;
}

interface Friend {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string;
  status: 'online' | 'offline' | 'in-game';
  lastSeen: string;
  currentGame?: string;
}

interface FriendRequest {
  id: string;
  requester: {
    id: string;
    username: string;
    displayName: string | null;
    avatar: string;
  };
  recipient: {
    id: string;
    username: string;
    displayName: string | null;
    avatar: string;
  };
  status: string;
  createdAt: string;
}

interface PrestigeInfo {
  proofPoints: number;
  totalProofPoints: number;
  prestige: {
    rank: number;
    name: string;
    title: string;
    badge: string;
    multiplier: number;
    airdropWeight: number;
    unlocks: string[];
  };
  currentTier: {
    tier: number;
    name: string;
    emoji: string;
    ppRequired: number;
  };
  nextTier: {
    tier: number;
    name: string;
    emoji: string;
    ppRequired: number;
    ppNeeded: number;
  } | null;
  canPrestige: boolean;
  prestigeHistory: any[];
  lastPrestigeAt: string | null;
}

interface PrestigeLeaderboardPlayer {
  rank: number;
  id: string;
  username: string;
  displayName: string | null;
  avatar: string;
  prestige: {
    rank: number;
    name: string;
    title: string;
    badge: string;
    multiplier: number;
    airdropWeight: number;
    unlocks: string[];
  };
  currentTier: {
    tier: number;
    name: string;
    emoji: string;
    ppRequired: number;
  };
  proofPoints: number;
  totalProofPoints: number;
}

export default function SocialPage() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('leaderboards');
  const [selectedLeaderboard, setSelectedLeaderboard] = useState('overall');
  const [selectedForum, setSelectedForum] = useState('');
  const [friendsFilter, setFriendsFilter] = useState('all');
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [showCreateThread, setShowCreateThread] = useState<boolean>(false);
  const [newThreadTitle, setNewThreadTitle] = useState<string>('');
  const [newThreadContent, setNewThreadContent] = useState<string>('');
  const [newPostContent, setNewPostContent] = useState<string>('');
  const [threadPosts, setThreadPosts] = useState<any[]>([]);
  
  // Data states
  const [leaderboards, setLeaderboards] = useState<Record<string, LeaderboardPlayer[]>>({});
  const [forumCategories, setForumCategories] = useState<ForumCategory[]>([]);
  const [forumThreads, setForumThreads] = useState<ForumThread[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<{ incoming: FriendRequest[]; outgoing: FriendRequest[] }>({ incoming: [], outgoing: [] });
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [prestigeInfo, setPrestigeInfo] = useState<PrestigeInfo | null>(null);
  const [prestigeLeaderboards, setPrestigeLeaderboards] = useState<Record<string, PrestigeLeaderboardPlayer[]>>({});
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data on component mount and tab changes
  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (activeTab === 'leaderboards') {
      fetchLeaderboardData();
    } else if (activeTab === 'prestige') {
      fetchPrestigeData();
    } else if (activeTab === 'forums') {
      fetchForumData();
    } else if (activeTab === 'achievements') {
      fetchAchievementData();
    } else if (activeTab === 'friends') {
      fetchFriendsData();
    }
  }, [activeTab, selectedLeaderboard, selectedForum]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const dashboard = await socialApi.getDashboard();
      setDashboardData(dashboard);
    } catch (err) {
      setError('Failed to load social data');
      console.error('Error fetching initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPrestigeData = async () => {
    try {
      const [userPrestige, leaderboard] = await Promise.all([
        socialApi.getPrestigeInfo(),
        socialApi.getPrestigeLeaderboard(50)
      ]);
      setPrestigeInfo(userPrestige);
      setPrestigeLeaderboards({ main: leaderboard });
    } catch (err) {
      console.error('Error fetching prestige data:', err);
    }
  };

  const fetchLeaderboardData = async () => {
    try {
      const leaderboardData: Record<string, LeaderboardPlayer[]> = {};
      
      if (selectedLeaderboard === 'overall') {
        leaderboardData.overall = await socialApi.getOverallLeaderboard(50);
      } else if (selectedLeaderboard === 'weekly') {
        leaderboardData.weekly = await socialApi.getWeeklyLeaderboard(50);
      } else {
        leaderboardData[selectedLeaderboard] = await socialApi.getGameLeaderboard(selectedLeaderboard, 50);
      }
      
      setLeaderboards(prev => ({ ...prev, ...leaderboardData }));
    } catch (err) {
      console.error('Error fetching leaderboard data:', err);
    }
  };

  const fetchForumData = async () => {
    try {
      if (forumCategories.length === 0) {
        const categories = await socialApi.getForumCategories();
        // Ensure we always set an array, even if API returns null/undefined
        setForumCategories(Array.isArray(categories) ? categories : []);
        if (Array.isArray(categories) && categories.length > 0 && !selectedForum) {
          setSelectedForum(categories[0].id);
        }
      }
      
      if (selectedForum) {
        const threads = await socialApi.getThreadsByCategory(selectedForum, 1, 20);
        // Handle both paginated response format and direct array format
        const threadsArray = threads?.data || threads;
        setForumThreads(Array.isArray(threadsArray) ? threadsArray : []);
      }
    } catch (err) {
      console.error('Error fetching forum data:', err);
      // Set empty arrays on error to prevent map crashes
      setForumCategories([]);
      setForumThreads([]);
    }
  };

  const fetchAchievementData = async () => {
    try {
      const userAchievements = await socialApi.getUserAchievements();
      setAchievements(userAchievements);
    } catch (err) {
      console.error('Error fetching achievement data:', err);
    }
  };

  const fetchFriendsData = async () => {
    try {
      const [friendsList, requests] = await Promise.all([
        socialApi.getFriends(),
        socialApi.getPendingRequests()
      ]);
      setFriends(friendsList);
      setFriendRequests(requests);
    } catch (err) {
      console.error('Error fetching friends data:', err);
    }
  };

  const fetchThreadPosts = async (threadId: string) => {
    try {
      const posts = await socialApi.getPostsByThread(threadId, 1, 50);
      const postsArray = posts?.data || posts;
      setThreadPosts(Array.isArray(postsArray) ? postsArray : []);
    } catch (err) {
      console.error('Error fetching thread posts:', err);
      setThreadPosts([]);
    }
  };

  const handleCreateThread = async () => {
    if (!newThreadTitle.trim() || !newThreadContent.trim() || !selectedForum) {
      alert('Please fill in all fields');
      return;
    }

    try {
      await socialApi.createThread({
        title: newThreadTitle,
        content: newThreadContent,
        categoryId: selectedForum
      });
      
      // Reset form
      setNewThreadTitle('');
      setNewThreadContent('');
      setShowCreateThread(false);
      
      // Refresh threads
      fetchForumData();
    } catch (err) {
      console.error('Error creating thread:', err);
      alert('Failed to create thread. Please try again.');
    }
  };

  const handleCreatePost = async () => {
    if (!newPostContent.trim() || !selectedThread) {
      alert('Please enter a message');
      return;
    }

    try {
      await socialApi.createPost({
        content: newPostContent,
        threadId: selectedThread
      });
      
      // Reset form
      setNewPostContent('');
      
      // Refresh posts
      fetchThreadPosts(selectedThread);
      
      // Also refresh threads to update reply count
      fetchForumData();
    } catch (err) {
      console.error('Error creating post:', err);
      alert('Failed to post message. Please try again.');
    }
  };

  const handleThreadClick = (threadId: string) => {
    setSelectedThread(threadId);
    fetchThreadPosts(threadId);
  };

  const handleBackToThreads = () => {
    setSelectedThread(null);
    setThreadPosts([]);
  };

  const handleFriendRequest = async (action: 'accept' | 'reject', friendshipId: string) => {
    try {
      if (action === 'accept') {
        await socialApi.acceptFriendRequest(friendshipId);
      } else {
        await socialApi.rejectFriendRequest(friendshipId);
      }
      fetchFriendsData(); // Refresh data
    } catch (err) {
      console.error(`Error ${action}ing friend request:`, err);
    }
  };

  const handlePrestige = async () => {
    try {
      const result = await socialApi.prestigeUser();
      if (result.success) {
        // Refresh prestige data
        await fetchPrestigeData();
        // Show success message (you could add a toast notification here)
        alert(result.message);
      } else {
        alert(result.message);
      }
    } catch (err) {
      console.error('Error prestiging user:', err);
      alert('Failed to prestige. Please try again.');
    }
  };

  const tabs = [
    { id: 'leaderboards', name: 'Leaderboards', icon: '🏆' },
    { id: 'referrals', name: 'Referrals', icon: '🎯' },
    { id: 'prestige', name: 'Prestige', icon: '🎖️' },
    { id: 'forums', name: 'Forums', icon: '💬' },
    { id: 'achievements', name: 'Achievements', icon: '🏅' },
    { id: 'friends', name: 'Friends', icon: '👥' },
  ];

  const getRankEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'text-gray-400 border-gray-400';
      case 'uncommon': return 'text-green-400 border-green-400';
      case 'rare': return 'text-blue-400 border-blue-400';
      case 'epic': return 'text-purple-400 border-purple-400';
      case 'legendary': return 'text-yellow-400 border-yellow-400';
      default: return 'text-gray-400 border-gray-400';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-main text-text-primary">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="lg:ml-64 min-h-screen">
          <PageHeader onMenuClick={() => setSidebarOpen(true)} />
          <main className="p-6">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-primary mx-auto mb-4"></div>
                  <p className="text-text-secondary">Loading social hub...</p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-main text-text-primary">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="lg:ml-64 min-h-screen">
          <PageHeader onMenuClick={() => setSidebarOpen(true)} />
          <main className="p-6">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="text-4xl mb-4">⚠️</div>
                  <p className="text-red-400 mb-4">{error}</p>
                  <button 
                    onClick={fetchInitialData}
                    className="px-4 py-2 bg-accent-primary text-black rounded-lg hover:bg-accent-secondary transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-main text-text-primary">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:ml-64 min-h-screen">
        <PageHeader onMenuClick={() => setSidebarOpen(true)} />
        <main className="p-6">
          <div className="max-w-7xl mx-auto">
            
            {/* Header */}
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">🌟</div>
              <h1 className="text-4xl font-bold text-text-primary mb-2 font-audiowide uppercase">
                Social Hub
              </h1>
              <p className="text-lg text-text-secondary font-inter">
                Connect, compete, and climb the ranks with the gaming community
              </p>
            </div>

            {/* Dashboard Stats */}
            {dashboardData && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-bg-secondary border border-border rounded-lg p-4">
                  <div className="text-2xl mb-2">🏆</div>
                  <div className="text-sm text-text-secondary">Your Rank</div>
                  <div className="text-xl font-bold">#{dashboardData.userRank?.rank || 'N/A'}</div>
                </div>
                <div className="bg-bg-secondary border border-border rounded-lg p-4">
                  <div className="text-2xl mb-2">🎖️</div>
                  <div className="text-sm text-text-secondary">Achievements</div>
                  <div className="text-xl font-bold">{dashboardData.achievementStats?.unlockedCount || 0}/{dashboardData.achievementStats?.totalCount || 0}</div>
                </div>
                <div className="bg-bg-secondary border border-border rounded-lg p-4">
                  <div className="text-2xl mb-2">👥</div>
                  <div className="text-sm text-text-secondary">Friends</div>
                  <div className="text-xl font-bold">{dashboardData.friendsCount || 0}</div>
                </div>
                <div className="bg-bg-secondary border border-border rounded-lg p-4">
                  <div className="text-2xl mb-2">🟢</div>
                  <div className="text-sm text-text-secondary">Online Friends</div>
                  <div className="text-xl font-bold">{dashboardData.onlineFriendsCount || 0}</div>
                </div>
              </div>
            )}

            {/* Tab Navigation */}
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-audiowide text-sm transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-accent-primary text-black shadow-lg transform scale-105'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover border border-border'
                  }`}
                >
                  <span className="text-lg">{tab.icon}</span>
                  <span>{tab.name}</span>
                </button>
              ))}
            </div>

            {/* Leaderboards Tab */}
            {activeTab === 'leaderboards' && (
              <div className="space-y-6">
                {/* Leaderboard Selection */}
                <div className="flex flex-wrap justify-center gap-3 mb-6">
                  {[
                    { id: 'overall', name: 'Overall', icon: '🏆' },
                    { id: 'chess', name: 'Chess', icon: '♟️' },
                    { id: 'rps', name: 'Rock Paper Scissors', icon: '✂️' },
                    { id: 'dice', name: 'Dice Roll', icon: '🎲' },
                    { id: 'coinflip', name: 'Coinflip', icon: '🪙' },
                    { id: 'weekly', name: 'Weekly', icon: '📅' },
                  ].map((board) => (
                    <button
                      key={board.id}
                      onClick={() => setSelectedLeaderboard(board.id)}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm transition-all duration-200 ${
                        selectedLeaderboard === board.id
                          ? 'bg-accent-primary text-black'
                          : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover border border-border'
                      }`}
                    >
                      <span>{board.icon}</span>
                      <span>{board.name}</span>
                    </button>
                  ))}
                </div>

                {/* Leaderboard Table */}
                <div className="bg-bg-secondary border border-border rounded-lg overflow-hidden">
                  <div className="p-4 border-b border-border">
                    <h3 className="text-xl font-bold font-audiowide">
                      {selectedLeaderboard.charAt(0).toUpperCase() + selectedLeaderboard.slice(1)} Leaderboard
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-bg-hover">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Rank</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Player</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Wins</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Win Rate</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Earnings</th>
                          {selectedLeaderboard === 'chess' && (
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">ELO</th>
                          )}
                          {selectedLeaderboard === 'rps' && (
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Streak</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {(leaderboards[selectedLeaderboard] || []).map((player) => (
                          <tr key={player.id} className="hover:bg-bg-hover transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-lg font-bold">{getRankEmoji(player.rank)}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-3">
                                <Avatar user={{ avatar: player.avatar, username: player.username, displayName: player.displayName || undefined }} size="md" />
                                <div>
                                  <div className="text-sm font-medium text-text-primary">{player.username}</div>
                                  {player.displayName && (
                                    <div className="text-xs text-text-secondary">{player.displayName}</div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">{player.wins}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">{player.winRate.toFixed(1)}%</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-accent-primary font-medium">{player.earnings.toFixed(2)} SOL</td>
                            {selectedLeaderboard === 'chess' && player.elo && (
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">{player.elo}</td>
                            )}
                            {selectedLeaderboard === 'rps' && player.streak && (
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">{player.streak}</td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Forums Tab */}
            {activeTab === 'forums' && (
              <div className="space-y-6">
                {!selectedThread ? (
                  <>
                {/* Forum Categories */}
                <div className="flex flex-wrap gap-3 mb-6">
                      {(forumCategories || []).map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedForum(category.id)}
                      className={`px-4 py-2 rounded-lg text-sm transition-all duration-200 ${
                        selectedForum === category.id
                          ? 'bg-accent-primary text-black'
                          : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover border border-border'
                      }`}
                    >
                      {category.name}
                    </button>
                  ))}
                      {(!forumCategories || forumCategories.length === 0) && (
                        <div className="text-center py-8 text-text-secondary">
                          <div className="text-4xl mb-2">💬</div>
                          <p>No forum categories available yet.</p>
                        </div>
                      )}
                </div>

                    {/* Create Thread Button */}
                    {selectedForum && user && (
                      <div className="flex justify-end">
                        <button
                          onClick={() => setShowCreateThread(true)}
                          className="bg-accent-primary text-black px-4 py-2 rounded-lg font-medium hover:bg-accent-primary/90 transition-colors"
                        >
                          + New Thread
                        </button>
                      </div>
                    )}

                    {/* Create Thread Form */}
                    {showCreateThread && (
                      <div className="bg-bg-secondary border border-border rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-xl font-bold font-audiowide">Create New Thread</h3>
                          <button
                            onClick={() => {
                              setShowCreateThread(false);
                              setNewThreadTitle('');
                              setNewThreadContent('');
                            }}
                            className="text-text-secondary hover:text-text-primary"
                          >
                            ✕
                          </button>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-text-primary mb-2">
                              Thread Title
                            </label>
                            <input
                              type="text"
                              value={newThreadTitle}
                              onChange={(e) => setNewThreadTitle(e.target.value)}
                              placeholder="Enter thread title..."
                              className="w-full px-4 py-3 bg-bg-card border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent-primary focus:outline-none"
                              maxLength={100}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-text-primary mb-2">
                              Content
                            </label>
                            <textarea
                              value={newThreadContent}
                              onChange={(e) => setNewThreadContent(e.target.value)}
                              placeholder="What's on your mind?"
                              rows={6}
                              className="w-full px-4 py-3 bg-bg-card border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent-primary focus:outline-none resize-none"
                              maxLength={2000}
                            />
                            <div className="text-xs text-text-secondary mt-1">
                              {newThreadContent.length}/2000 characters
                            </div>
                          </div>
                          <div className="flex justify-end space-x-3">
                            <button
                              onClick={() => {
                                setShowCreateThread(false);
                                setNewThreadTitle('');
                                setNewThreadContent('');
                              }}
                              className="px-4 py-2 text-text-secondary hover:text-text-primary border border-border rounded-lg transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleCreateThread}
                              disabled={!newThreadTitle.trim() || !newThreadContent.trim()}
                              className="px-4 py-2 bg-accent-primary text-black rounded-lg font-medium hover:bg-accent-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Create Thread
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                {/* Forum Threads */}
                <div className="bg-bg-secondary border border-border rounded-lg overflow-hidden">
                  <div className="p-4 border-b border-border">
                    <h3 className="text-xl font-bold font-audiowide">
                          {forumCategories?.find(c => c.id === selectedForum)?.name || 'Forum Threads'}
                    </h3>
                  </div>
                  <div className="divide-y divide-border">
                        {(forumThreads || []).map((thread) => (
                          <div 
                            key={thread.id} 
                            className="p-4 hover:bg-bg-hover transition-colors cursor-pointer"
                            onClick={() => handleThreadClick(thread.id)}
                          >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              {thread.isPinned && <span className="text-accent-primary">📌</span>}
                              {thread.isLocked && <span className="text-red-400">🔒</span>}
                                  <h4 className="text-lg font-medium text-text-primary hover:text-accent-primary">
                                {thread.title}
                              </h4>
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-text-secondary">
                            <div className="flex items-center space-x-2">
                                <Avatar user={{ avatar: thread.author.avatar, username: thread.author.username, displayName: thread.author.displayName || undefined }} size="sm" />
                                <span>{thread.author.username}</span>
                            </div>
                              <span>•</span>
                              <span>{thread.replyCount} replies</span>
                              <span>•</span>
                              <span>{thread.viewCount} views</span>
                              <span>•</span>
                              <span>{formatTimeAgo(thread.updatedAt)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                        {(!forumThreads || forumThreads.length === 0) && (
                          <div className="text-center py-12 text-text-secondary">
                            <div className="text-4xl mb-2">📝</div>
                            <p>No threads in this category yet.</p>
                            <p className="text-sm mt-1">Be the first to start a discussion!</p>
                  </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  /* Thread View */
                  <div className="space-y-6">
                    {/* Back Button */}
                    <button
                      onClick={handleBackToThreads}
                      className="flex items-center space-x-2 text-text-secondary hover:text-text-primary transition-colors"
                    >
                      <span>←</span>
                      <span>Back to Threads</span>
                    </button>

                    {/* Thread Content */}
                    {forumThreads.find(t => t.id === selectedThread) && (
                      <div className="bg-bg-secondary border border-border rounded-lg p-6">
                        <div className="flex items-center space-x-2 mb-4">
                          {forumThreads.find(t => t.id === selectedThread)?.isPinned && <span className="text-accent-primary">📌</span>}
                          {forumThreads.find(t => t.id === selectedThread)?.isLocked && <span className="text-red-400">🔒</span>}
                          <h1 className="text-2xl font-bold font-audiowide text-text-primary">
                            {forumThreads.find(t => t.id === selectedThread)?.title}
                          </h1>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-text-secondary mb-4">
                          <div className="flex items-center space-x-2">
                            <Avatar user={{ 
                              avatar: forumThreads.find(t => t.id === selectedThread)?.author.avatar || '', 
                              username: forumThreads.find(t => t.id === selectedThread)?.author.username || '', 
                              displayName: forumThreads.find(t => t.id === selectedThread)?.author.displayName || undefined 
                            }} size="sm" />
                            <span>{forumThreads.find(t => t.id === selectedThread)?.author.username}</span>
                          </div>
                          <span>•</span>
                          <span>{formatTimeAgo(forumThreads.find(t => t.id === selectedThread)?.createdAt || '')}</span>
                        </div>
                        <div className="text-text-primary whitespace-pre-wrap">
                          {forumThreads.find(t => t.id === selectedThread)?.content}
                </div>
                      </div>
                    )}

                    {/* Posts */}
                    <div className="space-y-4">
                      {threadPosts.map((post, index) => (
                        <div key={post.id} className="bg-bg-secondary border border-border rounded-lg p-4">
                          <div className="flex items-center space-x-4 text-sm text-text-secondary mb-3">
                            <div className="flex items-center space-x-2">
                              <Avatar user={{ 
                                avatar: post.author?.avatar || '', 
                                username: post.author?.username || '', 
                                displayName: post.author?.displayName || undefined 
                              }} size="sm" />
                              <span>{post.author?.username}</span>
                            </div>
                            <span>•</span>
                            <span>#{index + 1}</span>
                            <span>•</span>
                            <span>{formatTimeAgo(post.createdAt)}</span>
                            {post.isEdited && (
                              <>
                                <span>•</span>
                                <span className="text-text-secondary italic">edited</span>
                              </>
                            )}
                          </div>
                          <div className="text-text-primary whitespace-pre-wrap">
                            {post.content}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Reply Form */}
                    {user && !forumThreads.find(t => t.id === selectedThread)?.isLocked && (
                      <div className="bg-bg-secondary border border-border rounded-lg p-6">
                        <h3 className="text-lg font-bold font-audiowide mb-4">Reply to Thread</h3>
                        <div className="space-y-4">
                          <textarea
                            value={newPostContent}
                            onChange={(e) => setNewPostContent(e.target.value)}
                            placeholder="Write your reply..."
                            rows={4}
                            className="w-full px-4 py-3 bg-bg-card border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent-primary focus:outline-none resize-none"
                            maxLength={2000}
                          />
                          <div className="flex justify-between items-center">
                            <div className="text-xs text-text-secondary">
                              {newPostContent.length}/2000 characters
                            </div>
                            <button
                              onClick={handleCreatePost}
                              disabled={!newPostContent.trim()}
                              className="px-4 py-2 bg-accent-primary text-black rounded-lg font-medium hover:bg-accent-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Post Reply
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {forumThreads.find(t => t.id === selectedThread)?.isLocked && (
                      <div className="bg-bg-secondary border border-border rounded-lg p-4 text-center">
                        <div className="text-red-400 text-lg mb-2">🔒</div>
                        <p className="text-text-secondary">This thread is locked and cannot accept new replies.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Achievements Tab */}
            {activeTab === 'achievements' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {achievements.map((achievement) => (
                    <div
                      key={achievement.id}
                      className={`bg-bg-secondary border rounded-lg p-6 transition-all duration-200 ${
                        achievement.isUnlocked
                          ? `${getRarityColor(achievement.rarity)} shadow-lg`
                          : 'border-border opacity-60'
                      }`}
                    >
                      <div className="text-center">
                    <div className="text-4xl mb-3">{achievement.icon}</div>
                        <h3 className="text-lg font-bold font-audiowide mb-2">{achievement.name}</h3>
                        <p className="text-sm text-text-secondary mb-4">{achievement.description}</p>
                        
                        {achievement.isUnlocked ? (
                          <div className="text-accent-primary font-medium">
                            ✅ Unlocked {achievement.unlockedAt && formatTimeAgo(achievement.unlockedAt)}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="w-full bg-bg-hover rounded-full h-2">
                              <div
                                className="bg-accent-primary h-2 rounded-full transition-all duration-300"
                                style={{ width: `${(achievement.progress / achievement.maxProgress) * 100}%` }}
                              ></div>
                            </div>
                            <div className="text-sm text-text-secondary">
                              {achievement.progress} / {achievement.maxProgress}
                            </div>
                          </div>
                        )}
                        
                        <div className={`text-xs uppercase font-bold mt-2 ${getRarityColor(achievement.rarity)}`}>
                        {achievement.rarity}
                        </div>
                      </div>
                    </div>
                  ))}
                  </div>
              </div>
            )}

            {/* Prestige Tab */}
            {activeTab === 'prestige' && (
              <div className="space-y-6">
                {/* User Prestige Status */}
                {prestigeInfo && (
                  <div className="bg-bg-secondary border border-border rounded-lg p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-2xl font-bold font-audiowide">Your Prestige Status</h3>
                      <div className="text-4xl">{prestigeInfo.prestige.badge}</div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Current Status */}
                      <div className="space-y-4">
                        <div className="bg-bg-hover rounded-lg p-4">
                          <div className="text-sm text-text-secondary mb-1">Current Rank</div>
                          <div className="text-xl font-bold text-accent-primary">
                            {prestigeInfo.prestige.name}
                          </div>
                          <div className="text-sm text-text-secondary">
                            {prestigeInfo.prestige.title}
                          </div>
                        </div>
                        
                        <div className="bg-bg-hover rounded-lg p-4">
                          <div className="text-sm text-text-secondary mb-1">Current Tier</div>
                          <div className="text-lg font-bold">
                            {prestigeInfo.currentTier.emoji} {prestigeInfo.currentTier.name}
                          </div>
                        </div>
                        
                        <div className="bg-bg-hover rounded-lg p-4">
                          <div className="text-sm text-text-secondary mb-1">Proof Points</div>
                          <div className="text-2xl font-bold text-accent-primary">
                            {prestigeInfo.proofPoints.toLocaleString()}
                          </div>
                          <div className="text-sm text-text-secondary">
                            Total Earned: {prestigeInfo.totalProofPoints.toLocaleString()}
                          </div>
                        </div>
                      </div>
                      
                      {/* Progress & Benefits */}
                      <div className="space-y-4">
                        {prestigeInfo.nextTier && (
                          <div className="bg-bg-hover rounded-lg p-4">
                            <div className="text-sm text-text-secondary mb-2">Next Tier Progress</div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">
                                {prestigeInfo.nextTier.emoji} {prestigeInfo.nextTier.name}
                              </span>
                              <span className="text-sm text-text-secondary">
                                {prestigeInfo.nextTier.ppNeeded.toLocaleString()} PP needed
                              </span>
                            </div>
                            <div className="w-full bg-bg-primary rounded-full h-3">
                              <div
                                className="bg-accent-primary h-3 rounded-full transition-all duration-300"
                                style={{ 
                                  width: `${Math.max(0, Math.min(100, 
                                    ((prestigeInfo.proofPoints - prestigeInfo.currentTier.ppRequired) / 
                                     (prestigeInfo.nextTier.ppRequired - prestigeInfo.currentTier.ppRequired)) * 100
                                  ))}%` 
                                }}
                              ></div>
                            </div>
                          </div>
                        )}
                        
                        <div className="bg-bg-hover rounded-lg p-4">
                          <div className="text-sm text-text-secondary mb-2">Current Benefits</div>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm">PP Multiplier:</span>
                              <span className="text-sm font-bold text-accent-primary">
                                {prestigeInfo.prestige.multiplier}x
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm">Airdrop Weight:</span>
                              <span className="text-sm font-bold text-accent-primary">
                                {prestigeInfo.prestige.airdropWeight}x
                              </span>
                            </div>
                          </div>
                </div>
                
                        {prestigeInfo.canPrestige && (
                          <button
                            onClick={handlePrestige}
                            className="w-full bg-gradient-to-r from-accent-primary to-accent-secondary text-black font-bold py-3 px-6 rounded-lg hover:from-accent-secondary hover:to-accent-primary transition-all duration-200 transform hover:scale-105"
                          >
                            🚀 PRESTIGE UP!
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {/* Unlocks */}
                    {prestigeInfo.prestige.unlocks.length > 0 && (
                      <div className="mt-6 pt-6 border-t border-border">
                        <div className="text-sm text-text-secondary mb-2">Unlocked Features:</div>
                        <div className="flex flex-wrap gap-2">
                          {prestigeInfo.prestige.unlocks.map((unlock, index) => (
                            <span
                              key={index}
                              className="px-3 py-1 bg-accent-primary text-black text-xs font-medium rounded-full"
                            >
                              {unlock}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Prestige Leaderboard */}
                <div className="bg-bg-secondary border border-border rounded-lg">
                  <div className="p-4 border-b border-border">
                    <h3 className="text-xl font-bold font-audiowide">Prestige Leaderboard</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-bg-hover">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Rank</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Player</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Prestige</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Tier</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Proof Points</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Total PP</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {(prestigeLeaderboards.main || []).map((player) => (
                          <tr key={player.id} className="hover:bg-bg-hover transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-lg font-bold">{getRankEmoji(player.rank)}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-3">
                                <Avatar user={{ avatar: player.avatar, username: player.username, displayName: player.displayName || undefined }} size="md" />
                                <div>
                                  <div className="text-sm font-medium text-text-primary">{player.username}</div>
                                  {player.displayName && (
                                    <div className="text-xs text-text-secondary">{player.displayName}</div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                <span className="text-2xl">{player.prestige.badge}</span>
                                <div>
                                  <div className="text-sm font-medium text-accent-primary">{player.prestige.name}</div>
                                  <div className="text-xs text-text-secondary">{player.prestige.multiplier}x PP</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm">
                                {player.currentTier.emoji} {player.currentTier.name}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-accent-primary font-medium">
                              {player.proofPoints.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                              {player.totalProofPoints.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                {/* How to Earn PP Guide */}
                <div className="bg-bg-secondary border border-border rounded-lg p-6">
                  <h3 className="text-xl font-bold font-audiowide mb-4">How to Earn Proof Points</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-bg-hover rounded-lg">
                        <span className="text-sm">Small bets (0.01-0.1 SOL)</span>
                        <span className="text-sm font-bold text-accent-primary">1-10 PP</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-bg-hover rounded-lg">
                        <span className="text-sm">Medium bets (0.1-1 SOL)</span>
                        <span className="text-sm font-bold text-accent-primary">10-100 PP</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-bg-hover rounded-lg">
                        <span className="text-sm">Large bets (1-10 SOL)</span>
                        <span className="text-sm font-bold text-accent-primary">100-1000 PP</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-bg-hover rounded-lg">
                        <span className="text-sm">Whale bets (10+ SOL)</span>
                        <span className="text-sm font-bold text-accent-primary">1000+ PP</span>
                      </div>
                      <div className="p-3 bg-gradient-to-r from-accent-primary/20 to-accent-secondary/20 rounded-lg border border-accent-primary/30">
                        <div className="text-sm font-medium text-accent-primary mb-1">Pro Tip:</div>
                        <div className="text-xs text-text-secondary">
                          Higher prestige ranks earn more PP per bet. GODMODE players earn 10x more PP than mortals!
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Friends Tab */}
            {activeTab === 'friends' && (
              <div className="space-y-6">
                {/* Friend Requests */}
                {(friendRequests.incoming.length > 0 || friendRequests.outgoing.length > 0) && (
                  <div className="bg-bg-secondary border border-border rounded-lg p-4">
                    <h3 className="text-lg font-bold font-audiowide mb-4">Friend Requests</h3>
                    
                    {friendRequests.incoming.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-text-secondary mb-2">Incoming ({friendRequests.incoming.length})</h4>
                        <div className="space-y-2">
                          {friendRequests.incoming.map((request) => (
                            <div key={request.id} className="flex items-center justify-between p-3 bg-bg-hover rounded-lg">
                              <div className="flex items-center space-x-3">
                                <Avatar user={{ avatar: request.requester.avatar, username: request.requester.username, displayName: request.requester.displayName || undefined }} size="md" />
                      <div>
                                  <div className="text-sm font-medium">{request.requester.username}</div>
                                  {request.requester.displayName && (
                                    <div className="text-xs text-text-secondary">{request.requester.displayName}</div>
                                  )}
                                </div>
                              </div>
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleFriendRequest('accept', request.id)}
                                  className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                                >
                                  Accept
                                </button>
                                <button
                                  onClick={() => handleFriendRequest('reject', request.id)}
                                  className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                                >
                                  Reject
                                </button>
                    </div>
                  </div>
                ))}
                        </div>
                      </div>
                    )}
                    
                    {friendRequests.outgoing.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-text-secondary mb-2">Outgoing ({friendRequests.outgoing.length})</h4>
                        <div className="space-y-2">
                          {friendRequests.outgoing.map((request) => (
                            <div key={request.id} className="flex items-center justify-between p-3 bg-bg-hover rounded-lg">
                              <div className="flex items-center space-x-3">
                                <Avatar user={{ avatar: request.recipient.avatar, username: request.recipient.username, displayName: request.recipient.displayName || undefined }} size="md" />
                                <div>
                                  <div className="text-sm font-medium">{request.recipient.username}</div>
                                  {request.recipient.displayName && (
                                    <div className="text-xs text-text-secondary">{request.recipient.displayName}</div>
                                  )}
                                </div>
                              </div>
                              <div className="text-sm text-text-secondary">Pending</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    </div>
                )}

                {/* Friends List */}
                <div className="bg-bg-secondary border border-border rounded-lg">
                  <div className="p-4 border-b border-border">
                    <h3 className="text-xl font-bold font-audiowide">Friends ({friends.length})</h3>
                  </div>
                  <div className="divide-y divide-border">
                    {friends.map((friend) => (
                      <div key={friend.id} className="p-4 hover:bg-bg-hover transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="relative">
                              <Avatar user={{ avatar: friend.avatar, username: friend.username, displayName: friend.displayName || undefined }} size="lg" />
                              <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-bg-secondary ${
                                friend.status === 'online' ? 'bg-green-400' :
                                friend.status === 'in-game' ? 'bg-yellow-400' : 'bg-gray-400'
                              }`}></div>
                            </div>
                      <div>
                              <div className="text-sm font-medium text-text-primary">{friend.username}</div>
                              {friend.displayName && (
                                <div className="text-xs text-text-secondary">{friend.displayName}</div>
                              )}
                              <div className="text-xs text-text-secondary">
                                {friend.status === 'online' ? 'Online' :
                                 friend.status === 'in-game' ? `Playing ${friend.currentGame}` :
                                 `Last seen ${formatTimeAgo(friend.lastSeen)}`}
                              </div>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <button className="px-3 py-1 bg-accent-primary text-black rounded text-sm hover:bg-accent-secondary transition-colors">
                              Message
                            </button>
                            <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors">
                              Invite
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
} 