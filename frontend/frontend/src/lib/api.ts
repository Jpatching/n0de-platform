// API Configuration
const API_BASE_URL = `${process.env.NEXT_PUBLIC_API_URL || 'https://pv3-backend-api-production.up.railway.app'}/api/v1`;

const getAuthHeaders = (): HeadersInit => {
  // Try multiple token sources to match what's working for session vault
  const token = localStorage.getItem('pv3_token');
  const expiresAt = localStorage.getItem('pv3_token_expires');
  
  console.log('🔍 Social API getAuthHeaders - token found:', !!token);
  console.log('🔍 Social API getAuthHeaders - token preview:', token ? token.substring(0, 20) + '...' : 'null');
  console.log('🔍 Social API getAuthHeaders - expires at:', expiresAt);
  
  // Check if token is expired
  if (token && expiresAt) {
    const now = Date.now();
    const expiry = parseInt(expiresAt);
    if (now > expiry) {
      console.log('❌ Social API - Token expired, clearing');
      localStorage.removeItem('pv3_token');
      localStorage.removeItem('pv3_token_expires');
      return {
        'Content-Type': 'application/json',
      };
    }
  }
  
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
};

// Social API functions
export const socialApi = {
  // Dashboard
  getDashboard: async () => {
    const response = await fetch(`${API_BASE_URL}/social/dashboard`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch social dashboard');
    return response.json();
  },

  // Leaderboards
  getOverallLeaderboard: async (limit: number = 50) => {
    const response = await fetch(`${API_BASE_URL}/social/leaderboards/overall?limit=${limit}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch overall leaderboard');
    return response.json();
  },

  getGameLeaderboard: async (gameType: string, limit: number = 50) => {
    const response = await fetch(`${API_BASE_URL}/social/leaderboards/game/${gameType}?limit=${limit}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch game leaderboard');
    return response.json();
  },

  getWeeklyLeaderboard: async (limit: number = 50) => {
    const response = await fetch(`${API_BASE_URL}/social/leaderboards/weekly?limit=${limit}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch weekly leaderboard');
    return response.json();
  },

  getUserRank: async (type: string) => {
    const response = await fetch(`${API_BASE_URL}/social/leaderboards/rank/${type}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch user rank');
    return response.json();
  },

  // Forum
  getForumCategories: async () => {
    const response = await fetch(`${API_BASE_URL}/social/forum/categories`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch forum categories');
    return response.json();
  },

  getThreadsByCategory: async (categoryId: string, page: number = 1, limit: number = 20) => {
    const response = await fetch(`${API_BASE_URL}/social/forum/categories/${categoryId}/threads?page=${page}&limit=${limit}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch threads');
    return response.json();
  },

  getThread: async (threadId: string) => {
    const response = await fetch(`${API_BASE_URL}/social/forum/threads/${threadId}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch thread');
    return response.json();
  },

  getPostsByThread: async (threadId: string, page: number = 1, limit: number = 20) => {
    const response = await fetch(`${API_BASE_URL}/social/forum/threads/${threadId}/posts?page=${page}&limit=${limit}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch posts');
    return response.json();
  },

  createThread: async (data: { title: string; content: string; categoryId: string }) => {
    const response = await fetch(`${API_BASE_URL}/social/forum/threads`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create thread');
    return response.json();
  },

  createPost: async (data: { content: string; threadId: string }) => {
    const response = await fetch(`${API_BASE_URL}/social/forum/posts`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create post');
    return response.json();
  },

  searchThreads: async (query: string, categoryId?: string, page: number = 1, limit: number = 20) => {
    const params = new URLSearchParams({
      q: query,
      page: page.toString(),
      limit: limit.toString(),
    });
    if (categoryId) params.append('categoryId', categoryId);

    const response = await fetch(`${API_BASE_URL}/social/forum/search?${params}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to search threads');
    return response.json();
  },

  // Achievements
  getUserAchievements: async () => {
    const response = await fetch(`${API_BASE_URL}/social/achievements`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch achievements');
    return response.json();
  },

  getAchievementStats: async () => {
    const response = await fetch(`${API_BASE_URL}/social/achievements/stats`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch achievement stats');
    return response.json();
  },

  getRecentUnlocks: async (limit: number = 5) => {
    const response = await fetch(`${API_BASE_URL}/social/achievements/recent?limit=${limit}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch recent unlocks');
    return response.json();
  },

  updateAchievementProgress: async () => {
    const response = await fetch(`${API_BASE_URL}/social/achievements/update`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to update achievement progress');
    return response.json();
  },

  // Friends
  getFriends: async () => {
    const response = await fetch(`${API_BASE_URL}/social/friends`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch friends');
    return response.json();
  },

  getPendingRequests: async () => {
    const response = await fetch(`${API_BASE_URL}/social/friends/requests`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch friend requests');
    return response.json();
  },

  sendFriendRequest: async (username: string) => {
    const response = await fetch(`${API_BASE_URL}/social/friends/request`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ username }),
    });
    if (!response.ok) throw new Error('Failed to send friend request');
    return response.json();
  },

  acceptFriendRequest: async (friendshipId: string) => {
    const response = await fetch(`${API_BASE_URL}/social/friends/accept/${friendshipId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to accept friend request');
    return response.json();
  },

  rejectFriendRequest: async (friendshipId: string) => {
    const response = await fetch(`${API_BASE_URL}/social/friends/reject/${friendshipId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to reject friend request');
    return response.json();
  },

  cancelFriendRequest: async (friendshipId: string) => {
    const response = await fetch(`${API_BASE_URL}/social/friends/cancel/${friendshipId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to cancel friend request');
    return response.json();
  },

  removeFriend: async (friendshipId: string) => {
    const response = await fetch(`${API_BASE_URL}/social/friends/${friendshipId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to remove friend');
    return response.json();
  },

  blockUser: async (userId: string) => {
    const response = await fetch(`${API_BASE_URL}/social/friends/block/${userId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to block user');
    return response.json();
  },

  unblockUser: async (userId: string) => {
    const response = await fetch(`${API_BASE_URL}/social/friends/unblock/${userId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to unblock user');
    return response.json();
  },

  getBlockedUsers: async () => {
    const response = await fetch(`${API_BASE_URL}/social/friends/blocked`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch blocked users');
    return response.json();
  },

  searchUsers: async (query: string, limit: number = 20) => {
    const response = await fetch(`${API_BASE_URL}/social/friends/search?q=${encodeURIComponent(query)}&limit=${limit}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to search users');
    return response.json();
  },

  getFriendshipStatus: async (userId: string) => {
    const response = await fetch(`${API_BASE_URL}/social/friends/status/${userId}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to get friendship status');
    return response.json();
  },

  // Prestige
  getPrestigeInfo: async () => {
    const response = await fetch(`${API_BASE_URL}/social/prestige/info`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch prestige info');
    return response.json();
  },

  getPrestigeLeaderboard: async (limit: number = 50) => {
    const response = await fetch(`${API_BASE_URL}/social/prestige/leaderboard?limit=${limit}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch prestige leaderboard');
    return response.json();
  },

  prestigeUser: async () => {
    const response = await fetch(`${API_BASE_URL}/social/prestige/advance`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to prestige user');
    return response.json();
  },
}; 