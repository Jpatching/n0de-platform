'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePV3, UserProfile } from '@/hooks/usePV3';
import { socialApi } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import PageHeader from '@/components/PageHeader';
import AuthStatus from '@/components/AuthStatus';
import UsernameUpdate from '@/components/UsernameUpdate';
import AvatarUpload from '@/components/AvatarUpload';
import Avatar from '@/components/Avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PnLCard } from '@/components/PnLCard';
import { PnLCardModal } from '@/components/PnLCardModal';
import Link from 'next/link';

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

interface PnLSummary {
  totalGames: number;
  totalWins: number;
  totalLosses: number;
  winRate: number;
  totalWagered: number;
  totalPnL: number;
  totalProfit: number;
  totalLoss: number;
  totalFees: number;
  bestWin: number;
  worstLoss: number;
  currentStreak: number;
  bestWinStreak: number;
  worstLossStreak: number;
  lastUpdated: Date;
}

interface PnLRecord {
  id: string;
  game: string;
  result: 'WIN' | 'LOSS';
  pnlAmount: number;
  pnlPercentage: number;
  wagerAmount: number;
  finalAmount: number;
  username?: string;
  walletAddress: string;
  gameSpecific?: any;
  cardData?: any;
  createdAt: Date;
}

interface PnLDashboard {
  summary: PnLSummary;
  recentCards: PnLRecord[];
  topPerformers: any[];
  chartData: {
    daily: Array<{ date: string; pnl: number; games: number }>;
    gameTypes: Array<{ game: string; pnl: number; games: number; winRate: number }>;
  };
}

export default function ProfilePage() {
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const { balance, formatSOL, loadUserProfile, loading } = usePV3();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [prestigeInfo, setPrestigeInfo] = useState<PrestigeInfo | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    username: '',
    displayName: '',
    bio: '',
    email: '',
    showUsername: true,
    profileVisibility: 'public'
  });
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [dashboard, setDashboard] = useState<PnLDashboard | null>(null);
  const [cards, setCards] = useState<PnLRecord[]>([]);
  const [selectedCard, setSelectedCard] = useState<PnLRecord | null>(null);
  const [timeframe, setTimeframe] = useState('30d');
  const [gameTypeFilter, setGameTypeFilter] = useState('all');
  const [cardsPage, setCardsPage] = useState(1);
  const [hasMoreCards, setHasMoreCards] = useState(true);

  // Load user profile data
  const loadProfileData = useCallback(async () => {
    setDataLoading(true);
    try {
      const profile = await loadUserProfile();
      setUserProfile(profile);
    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      setDataLoading(false);
    }
  }, [loadUserProfile]);

  // Load profile data when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      loadProfileData();
    } else {
      setUserProfile(null);
    }
  }, [isAuthenticated, user, loadProfileData]);

  // Update form when profile loads
  useEffect(() => {
    if (userProfile) {
      setProfileForm({
        username: userProfile.username || '',
        displayName: userProfile.displayName || '',
        bio: userProfile.bio || '',
        email: userProfile.email || '',
        showUsername: Boolean(userProfile.showUsername),
        profileVisibility: userProfile.profileVisibility || 'public'
      });
    }
  }, [userProfile]);

  // Check username availability
  const checkUsernameAvailability = useCallback(async (username: string) => {
    if (!username || username.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    setCheckingUsername(true);
    try {
      const response = await fetch('/api/v1/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });

      const data = await response.json();
      setUsernameAvailable(data.available);
    } catch (error) {
      console.error('Error checking username:', error);
      setUsernameAvailable(null);
    } finally {
      setCheckingUsername(false);
    }
  }, []);

  // Save profile changes
  const saveProfile = useCallback(async () => {
    if (!user) return;

    setDataLoading(true);
    try {
      const response = await fetch('/api/v1/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          ...profileForm
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update profile');
      }

      const data = await response.json();
      setUserProfile(data.user);
      setEditingProfile(false);
      
      // Show success message (you could add a toast here)
      console.log('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      // Show error message (you could add a toast here)
    } finally {
      setDataLoading(false);
    }
  }, [user, profileForm]);

  // Calculate derived stats from real user data
  const userStats = userProfile ? {
    totalGamesPlayed: userProfile.totalMatches,
    gamesWon: userProfile.wins,
    gamesLost: userProfile.losses,
    winRate: userProfile.winRate,
    totalEarnings: userProfile.totalEarnings,
    totalLosses: userProfile.totalMatches > 0 ? (userProfile.totalMatches - userProfile.wins) * 0.1 : 0, // Estimate
    netProfit: userProfile.totalEarnings,
    currentStreak: 0, // Not available from backend yet
    level: Math.floor(userProfile.reputation / 100),
    xp: userProfile.reputation,
    xpToNext: (Math.floor(userProfile.reputation / 100) + 1) * 100 - userProfile.reputation,
  } : {
    // Fallback values when profile is loading or not available
    totalGamesPlayed: 0,
    gamesWon: 0,
    gamesLost: 0,
    winRate: 0,
    totalEarnings: 0,
    totalLosses: 0,
    netProfit: 0,
    currentStreak: 0,
    level: 1,
    xp: 1000,
    xpToNext: 100,
  };

  useEffect(() => {
    if (isAuthenticated && user?.walletAddress) {
      loadDashboard();
      loadCards();
    }
  }, [isAuthenticated, user, timeframe, gameTypeFilter]);

  const loadDashboard = async () => {
    try {
      const token = localStorage.getItem('pv3_token');
      const API_BASE = `${process.env.NEXT_PUBLIC_API_URL || 'https://pv3-backend-api-production.up.railway.app'}/api/v1`;
      const response = await fetch(`${API_BASE}/pnl/dashboard/${user?.walletAddress}?timeframe=${timeframe}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDashboard(data);
      }
    } catch (error) {
      console.error('Failed to load PnL dashboard:', error);
    }
  };

  const loadCards = async (page = 1, reset = true) => {
    try {
      const token = localStorage.getItem('pv3_token');
      const filterParam = gameTypeFilter !== 'all' ? `&gameType=${gameTypeFilter}` : '';
      const API_BASE = `${process.env.NEXT_PUBLIC_API_URL || 'https://pv3-backend-api-production.up.railway.app'}/api/v1`;
      const response = await fetch(
        `${API_BASE}/pnl/cards/${user?.walletAddress}?limit=12&offset=${(page - 1) * 12}&sortBy=createdAt&sortOrder=desc${filterParam}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          }
        }
      );

      if (response.ok) {
        const newCards = await response.json();
        
        if (reset) {
          setCards(newCards);
        } else {
          setCards(prev => [...prev, ...newCards]);
        }
        
        setHasMoreCards(newCards.length === 12);
      }
    } catch (error) {
      console.error('Failed to load PnL cards:', error);
    }
  };

  const loadMoreCards = () => {
    const nextPage = cardsPage + 1;
    setCardsPage(nextPage);
    loadCards(nextPage, false);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Card className="bg-gray-900 border-gray-800 p-8">
          <CardContent className="text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Sign In Required</h2>
            <p className="text-gray-400 mb-6">
              Please sign in to view your PnL dashboard and trading performance.
            </p>
            <Link href="/auth-demo">
              <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                Sign In
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading your PnL dashboard...</div>
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
            {/* Loading State */}
            {(dataLoading || loading) && !userProfile && (
              <div className="text-center glass-card p-12 mb-8">
                <div className="text-4xl mb-4">⏳</div>
                <h2 className="text-2xl font-bold text-text-primary mb-4 font-audiowide">Loading Profile...</h2>
                <p className="text-text-secondary font-inter">Fetching your gaming data from the blockchain</p>
              </div>
            )}

            {/* Profile Header */}
            <div className="mb-8">
              <div className="glass-card p-6">
                <div className="flex items-center space-x-6">
                    <Avatar user={user} size="xl" showIcon={false} />
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold text-text-primary font-audiowide mb-2">
                      {user?.username || userProfile?.username || 'Loading...'}
                    </h1>
                    <div className="flex items-center space-x-4 text-sm text-text-secondary">
                      <span className="font-inter">Level {userStats?.level} • {(userProfile?.reputation ?? 1000) >= 1500 ? 'Gold' : (userProfile?.reputation ?? 1000) >= 1000 ? 'Silver' : 'Bronze'} Rank</span>
                      <span className="font-inter">
                        {userProfile?.createdAt ? 
                          `Joined ${new Date(userProfile.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}` : 
                          'New Player'
                        }
                      </span>
                      {(dataLoading || loading) && <span className="font-inter text-accent-primary">Loading...</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-accent-success font-audiowide">
                      +{formatSOL(userStats?.netProfit)} SOL
                    </div>
                    <div className="text-sm text-text-secondary font-inter">Net Profit</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Prestige Status Section */}
            {prestigeInfo && (
              <div className="mb-8">
                <div className="glass-card p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-text-primary font-audiowide">🎖️ Prestige Status</h3>
                    <div className="text-4xl">{prestigeInfo.prestige.badge}</div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Current Rank */}
                    <div className="bg-surface/50 border border-border rounded-lg p-4">
                      <div className="text-sm text-text-secondary mb-1">Current Rank</div>
                      <div className="text-xl font-bold text-accent-primary">
                        {prestigeInfo.prestige.name}
                      </div>
                      <div className="text-sm text-text-secondary">
                        {prestigeInfo.prestige.title}
                      </div>
                    </div>
                    
                    {/* Current Tier */}
                    <div className="bg-surface/50 border border-border rounded-lg p-4">
                      <div className="text-sm text-text-secondary mb-1">Current Tier</div>
                      <div className="text-lg font-bold">
                        {prestigeInfo.currentTier.emoji} {prestigeInfo.currentTier.name}
                      </div>
                    </div>
                    
                    {/* Proof Points */}
                    <div className="bg-surface/50 border border-border rounded-lg p-4">
                      <div className="text-sm text-text-secondary mb-1">Proof Points</div>
                      <div className="text-xl font-bold text-accent-primary">
                        {prestigeInfo.proofPoints.toLocaleString()}
                      </div>
                      <div className="text-xs text-text-secondary">
                        Total: {prestigeInfo.totalProofPoints.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  
                  {/* Benefits */}
                  <div className="mt-6 pt-6 border-t border-border">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex justify-between">
                        <span className="text-sm text-text-secondary">PP Multiplier:</span>
                        <span className="text-sm font-bold text-accent-primary">
                          {prestigeInfo.prestige.multiplier}x
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-text-secondary">Airdrop Weight:</span>
                        <span className="text-sm font-bold text-accent-primary">
                          {prestigeInfo.prestige.airdropWeight}x
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Avatar Upload Section */}
            <div className="mb-8">
              <AvatarUpload onSuccess={loadProfileData} />
            </div>

            {/* Username Update Section */}
            <div className="mb-8">
              <UsernameUpdate onSuccess={loadProfileData} />
            </div>

            {/* Profile Management */}
            <div className="mb-8">
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-text-primary font-audiowide">👤 Profile Settings</h3>
                  <button
                    onClick={() => setEditingProfile(!editingProfile)}
                    className="px-4 py-2 bg-accent-primary text-black font-bold rounded-lg hover:bg-accent-secondary transition-colors font-inter"
                  >
                    {editingProfile ? 'Cancel' : 'Edit Profile'}
                  </button>
                </div>

                {editingProfile ? (
                  <div className="space-y-6">
                    {/* Username Section */}
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2 font-inter">
                        Username {user?.username ? '(Cannot be changed)' : '(One-time only)'}
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={profileForm.username}
                          onChange={(e) => {
                            const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                            setProfileForm(prev => ({ ...prev, username: value }));
                            if (value !== userProfile?.username) {
                              checkUsernameAvailability(value);
                            }
                          }}
                          disabled={!!user?.username}
                          placeholder="Enter unique username"
                          className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent-primary focus:outline-none font-inter disabled:opacity-50 disabled:cursor-not-allowed"
                          maxLength={20}
                          minLength={3}
                        />
                        {checkingUsername && (
                          <div className="absolute right-3 top-3">
                            <div className="w-5 h-5 border-2 border-accent-primary border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        )}
                      </div>
                      {profileForm.username && profileForm.username !== userProfile?.username && (
                        <div className="mt-2 text-sm">
                          {usernameAvailable === true && (
                            <span className="text-accent-success">✓ Username available</span>
                          )}
                          {usernameAvailable === false && (
                            <span className="text-accent-danger">✗ Username already taken</span>
                          )}
                          {profileForm.username.length < 3 && (
                            <span className="text-text-secondary">Username must be at least 3 characters</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Display Name */}
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2 font-inter">
                        Display Name (Optional)
                      </label>
                      <input
                        type="text"
                        value={profileForm.displayName}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, displayName: e.target.value }))}
                        placeholder="Your display name for leaderboards and games"
                        className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent-primary focus:outline-none font-inter"
                        maxLength={50}
                      />
                      <div className="mt-2 text-xs text-text-secondary font-inter">
                        <div className="flex items-start space-x-2">
                          <span className="text-accent-primary">💡</span>
                          <div>
                            <p className="mb-1"><strong>How your name appears:</strong></p>
                            <ul className="space-y-1 ml-2">
                              <li>• <strong>Display Name set + Public:</strong> Shows &quot;{profileForm.displayName || 'YourDisplayName'}&quot; in leaderboards and games</li>
                              <li>• <strong>No Display Name + Public:</strong> Shows your username &quot;{profileForm.username || 'yourusername'}&quot; instead</li>
                              <li>• <strong>Privacy = Private:</strong> Shows &quot;Anonymous Player&quot; everywhere</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bio */}
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2 font-inter">
                        Bio (Optional)
                      </label>
                      <textarea
                        value={profileForm.bio}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, bio: e.target.value }))}
                        placeholder="Tell others about yourself..."
                        className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent-primary focus:outline-none font-inter resize-none"
                        rows={3}
                        maxLength={200}
                      />
                      <div className="text-xs text-text-secondary mt-1 font-inter">
                        {profileForm.bio.length}/200 characters
                      </div>
                    </div>

                    {/* Privacy Settings */}
                    <div className="border-t border-border pt-6">
                      <h4 className="text-lg font-bold text-text-primary mb-4 font-audiowide">🔒 Privacy & Display Settings</h4>
                      
                      <div className="space-y-6">
                        <div className="bg-surface/50 border border-border rounded-lg p-4">
                          <h5 className="text-sm font-semibold text-text-primary mb-3 font-inter">Profile Visibility</h5>
                          <select
                            value={profileForm.profileVisibility}
                            onChange={(e) => setProfileForm(prev => ({ ...prev, profileVisibility: e.target.value }))}
                            className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text-primary focus:border-accent-primary focus:outline-none font-inter mb-3"
                          >
                            <option value="public">🌍 Public - Show my name in leaderboards and games</option>
                            <option value="friends">👥 Friends Only - Limited visibility</option>
                            <option value="private">🔒 Private - Always show as &quot;Anonymous Player&quot;</option>
                          </select>
                          
                          <div className="text-xs text-text-secondary font-inter">
                            <div className="flex items-start space-x-2">
                              <span className="text-accent-warning">⚠️</span>
                              <div>
                                <p className="mb-2"><strong>How this affects your gaming experience:</strong></p>
                                <div className="space-y-2">
                                  <div className="bg-bg-elevated border border-green-500/20 rounded p-2">
                                    <p className="text-green-400 font-semibold">🌍 Public Profile:</p>
                                    <ul className="mt-1 space-y-1 text-text-secondary">
                                      <li>• Your {profileForm.displayName ? 'display name' : 'username'} appears on leaderboards</li>
                                      <li>• Other players can see your stats and achievements</li>
                                      <li>• You can be found and challenged by other players</li>
                                      <li>• Maximum social gaming experience</li>
                                    </ul>
                                  </div>
                                  
                                  <div className="bg-bg-elevated border border-orange-500/20 rounded p-2">
                                    <p className="text-orange-400 font-semibold">👥 Friends Only:</p>
                                    <ul className="mt-1 space-y-1 text-text-secondary">
                                      <li>• Limited visibility to connected friends</li>
                                      <li>• Still appears as &quot;Anonymous&quot; in public leaderboards</li>
                                      <li>• Balanced privacy with some social features</li>
                                    </ul>
                                  </div>
                                  
                                  <div className="bg-bg-elevated border border-red-500/20 rounded p-2">
                                    <p className="text-red-400 font-semibold">🔒 Private Profile:</p>
                                    <ul className="mt-1 space-y-1 text-text-secondary">
                                      <li>• Always shows as &quot;Anonymous Player&quot; everywhere</li>
                                      <li>• No leaderboard presence with your name</li>
                                      <li>• Maximum privacy, minimal social features</li>
                                      <li>• Stats still tracked but not publicly visible</li>
                                    </ul>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="bg-surface/50 border border-border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <label className="text-sm font-medium text-text-primary font-inter">Advanced Username Control</label>
                              <p className="text-xs text-text-secondary font-inter">Override display name and force username display</p>
                            </div>
                            <button
                              onClick={() => setProfileForm(prev => ({ ...prev, showUsername: !prev.showUsername }))}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                profileForm.showUsername ? 'bg-accent-primary' : 'bg-gray-600'
                              }`}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                  profileForm.showUsername ? 'translate-x-6' : 'translate-x-1'
                                }`}
                              />
                            </button>
                          </div>
                          <div className="text-xs text-text-secondary font-inter">
                            {profileForm.showUsername ? (
                              <p>✅ When enabled: Shows username &quot;{profileForm.username || 'yourusername'}&quot; instead of display name in some contexts</p>
                            ) : (
                              <p>❌ When disabled: Always prioritizes display name &quot;{profileForm.displayName || 'YourDisplayName'}&quot; when available</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end space-x-4 pt-6 border-t border-border">
                      <button
                        onClick={() => setEditingProfile(false)}
                        className="px-6 py-3 bg-surface border border-border text-text-primary rounded-lg hover:bg-gray-700 transition-colors font-inter"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveProfile}
                        disabled={Boolean(dataLoading || (profileForm.username && profileForm.username !== userProfile?.username && usernameAvailable !== true))}
                        className="px-6 py-3 bg-accent-primary text-black font-bold rounded-lg hover:bg-accent-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-inter"
                      >
                        {dataLoading ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-text-secondary mb-2 font-inter">Username</h4>
                      <p className="text-text-primary font-inter">
                        {userProfile?.username || 'Not set'}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-text-secondary mb-2 font-inter">Display Name</h4>
                      <p className="text-text-primary font-inter">
                        {userProfile?.displayName || 'Not set'}
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <h4 className="text-sm font-medium text-text-secondary mb-2 font-inter">Bio</h4>
                      <p className="text-text-primary font-inter">
                        {userProfile?.bio || 'No bio added yet'}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-text-secondary mb-2 font-inter">Username Visibility</h4>
                      <p className="text-text-primary font-inter">
                        {userProfile?.showUsername ? 'Visible' : 'Hidden'}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-text-secondary mb-2 font-inter">Profile Visibility</h4>
                      <p className="text-text-primary font-inter capitalize">
                        {userProfile?.profileVisibility || 'Public'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

                          {/* Auth Status */}
              <AuthStatus />

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="glass-card p-4 text-center">
                <div className="text-2xl font-bold text-text-primary font-audiowide">{userStats?.totalGamesPlayed}</div>
                <div className="text-sm text-text-secondary font-inter">Games Played</div>
              </div>
              <div className="glass-card p-4 text-center">
                <div className="text-2xl font-bold text-accent-success font-audiowide">{userStats?.gamesWon}</div>
                <div className="text-sm text-text-secondary font-inter">Games Won</div>
              </div>
              <div className="glass-card p-4 text-center">
                <div className="text-2xl font-bold text-accent-primary font-audiowide">{userStats?.winRate}%</div>
                <div className="text-sm text-text-secondary font-inter">Win Rate</div>
              </div>
              <div className="glass-card p-4 text-center">
                <div className="text-2xl font-bold text-accent-warning font-audiowide">{userStats?.currentStreak}</div>
                <div className="text-sm text-text-secondary font-inter">Win Streak</div>
              </div>
            </div>

            {/* Earnings Summary */}
            <div className="glass-card p-6 mb-8">
              <h3 className="text-xl font-bold text-text-primary mb-4 font-audiowide">💰 Earnings Summary</h3>
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-accent-success font-audiowide">+{formatSOL(userStats?.totalEarnings)}</div>
                  <div className="text-sm text-text-secondary font-inter">Total Winnings</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-accent-danger font-audiowide">-{formatSOL(userStats?.totalLosses)}</div>
                  <div className="text-sm text-text-secondary font-inter">Total Losses</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold font-audiowide ${userStats?.netProfit >= 0 ? 'text-accent-success' : 'text-accent-danger'}`}>
                    {userStats?.netProfit >= 0 ? '+' : ''}{formatSOL(userStats?.netProfit)}
                  </div>
                  <div className="text-sm text-text-secondary font-inter">Net Profit/Loss</div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="glass-card p-6">
              <h3 className="text-xl font-bold text-text-primary mb-6 font-audiowide">Recent Games</h3>
              
              {!userProfile || userProfile.totalMatches === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">🎯</div>
                  <h4 className="text-xl font-bold text-text-primary mb-2 font-audiowide">No Games Played Yet</h4>
                  <p className="text-text-secondary font-inter">Start playing games to see your match history here!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center py-8">
                    <div className="text-3xl mb-2">🔄</div>
                    <p className="text-text-secondary font-inter">Game history integration coming soon...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
} 