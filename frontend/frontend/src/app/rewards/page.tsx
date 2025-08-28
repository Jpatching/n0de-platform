'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import PageHeader from '@/components/PageHeader';
import { usePV3, ReferralStats, RewardHistory } from '@/hooks/usePV3';
import { socialApi } from '@/lib/api';

export default function RewardsPage() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'referrals' | 'history' | 'prestige'>('overview');
  const [notification, setNotification] = useState<{type: 'success' | 'error'; message: string} | null>(null);
  
  const { 
    formatSOL, 
    loading,
    loadReferralStats,
    claimReferralRewards,
    loadRewardHistory
  } = usePV3();

  // Real data state
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null);
  const [rewardHistory, setRewardHistory] = useState<RewardHistory[]>([]);
  const [prestigeInfo, setPrestigeInfo] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(false);

  const loadAllData = useCallback(async () => {
    setDataLoading(true);
    try {
      const [stats, history, prestige] = await Promise.all([
        loadReferralStats(),
        loadRewardHistory(),
        socialApi.getPrestigeInfo().catch(() => null), // Don't fail if prestige API fails
      ]);

      setReferralStats(stats);
      setRewardHistory(history);
      setPrestigeInfo(prestige);
    } catch (error) {
      console.error('Error loading rewards data:', error);
      setNotification({ type: 'error', message: 'Failed to load rewards data' });
    } finally {
      setDataLoading(false);
    }
  }, [loadReferralStats, loadRewardHistory]);

  // Load all data when user is authenticated
  useEffect(() => {
    if (user) {
      loadAllData();
    } else {
      setReferralStats(null);
      setRewardHistory([]);
      setPrestigeInfo(null);
    }
  }, [user, loadAllData]);

  // Auto-hide notification
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const copyReferralCode = () => {
    if (!referralStats) return;
    
    const fullReferralLink = `${window.location.origin}?ref=${referralStats.referralCode}`;
    navigator.clipboard.writeText(fullReferralLink);
    setNotification({ type: 'success', message: 'Referral link copied to clipboard!' });
  };

  const claimRewards = async () => {
    if (!user || !referralStats || referralStats.pendingRewards === 0) return;
    
    try {
      const result = await claimReferralRewards();
      setNotification({ 
        type: 'success', 
        message: `Successfully claimed ${formatSOL(Math.floor(result.amount * 1000000000))} SOL!` 
      });
      
      // Reload data after successful claim
      await loadAllData();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to claim rewards';
      setNotification({ type: 'error', message: errorMessage });
    }
  };

  return (
    <div className="min-h-screen bg-main text-text-primary">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="lg:ml-64 min-h-screen">
        <PageHeader onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="p-6">
          {/* Built-in Notification */}
          {notification && (
            <div className={`mb-4 p-3 rounded-lg border max-w-6xl mx-auto ${
              notification.type === 'success' 
                ? 'bg-green-500/10 border-green-500/20 text-green-400' 
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            } animate-pulse-slow`}>
              <div className="flex items-center space-x-2">
                {notification.type === 'success' ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <span className="font-inter text-sm">{notification.message}</span>
              </div>
            </div>
          )}

          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">💰</div>
              <h1 className="text-4xl font-bold text-text-primary mb-2 font-audiowide uppercase">Infinite Earning Engine</h1>
              <p className="text-lg text-text-secondary font-inter">Build your perpetual SOL income stream - every friend becomes a lifelong revenue source</p>
            </div>

            {/* Tab Navigation */}
            <div className="flex bg-bg-card rounded-lg p-1 mb-8 max-w-2xl mx-auto">
              {[
                { key: 'overview' as const, label: '📊 Overview' },
                { key: 'referrals' as const, label: '👥 Referrals' },
                { key: 'history' as const, label: '📜 History' },
                { key: 'prestige' as const, label: '👑 Prestige' }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 py-3 px-4 rounded-md font-audiowide text-sm transition-all ${
                    activeTab === tab.key
                      ? 'bg-accent-primary text-black'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {!user && (
              <div className="text-center glass-card p-12">
                <div className="text-4xl mb-4">🔗</div>
                <h2 className="text-2xl font-bold text-text-primary mb-4 font-audiowide">Connect Wallet</h2>
                <p className="text-text-secondary font-inter">Connect your wallet to view your referral rakeback stats</p>
              </div>
            )}

            {user && (
              <>
                {/* Loading State */}
                {(dataLoading || loading) && (
                  <div className="text-center glass-card p-12">
                    <div className="text-4xl mb-4">⏳</div>
                    <h2 className="text-2xl font-bold text-text-primary mb-4 font-audiowide">Loading...</h2>
                    <p className="text-text-secondary font-inter">Fetching your rakeback data from the blockchain</p>
                  </div>
                )}

                {/* Overview Tab */}
                {activeTab === 'overview' && !dataLoading && !loading && referralStats && (
                  <div className="space-y-6">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="glass-card p-6">
                        <div className="text-text-secondary text-sm font-inter mb-1">Total Earned</div>
                        <div className="text-2xl font-bold text-accent-primary font-audiowide">
                          {formatSOL(referralStats.totalEarned)}
                        </div>
                      </div>
                      <div className="glass-card p-6">
                        <div className="text-text-secondary text-sm font-inter mb-1">Pending Rakeback</div>
                        <div className="text-2xl font-bold text-yellow-400 font-audiowide">
                          {formatSOL(referralStats.pendingRewards)}
                        </div>
                      </div>
                      <div className="glass-card p-6">
                        <div className="text-text-secondary text-sm font-inter mb-1">This Week</div>
                        <div className="text-2xl font-bold text-green-400 font-audiowide">
                          {formatSOL(referralStats.weeklyEarnings)}
                        </div>
                      </div>
                      <div className="glass-card p-6">
                        <div className="text-text-secondary text-sm font-inter mb-1">Referrals</div>
                        <div className="text-2xl font-bold text-text-primary font-audiowide">
                          {referralStats.totalReferred}
                        </div>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="glass-card p-6">
                        <h3 className="text-xl font-bold text-text-primary mb-4 font-audiowide">💸 Quick Claim</h3>
                        <p className="text-text-secondary font-inter mb-4">
                          Your infinite earning engine has generated {formatSOL(referralStats.pendingRewards)} SOL
                        </p>
                        <button
                          onClick={claimRewards}
                          disabled={referralStats.pendingRewards === 0 || loading}
                          className="primary-button w-full font-audiowide disabled:opacity-50"
                        >
                          {loading ? 'Processing...' : 'Harvest SOL'}
                        </button>
                      </div>

                      <div className="glass-card p-6">
                        <h3 className="text-xl font-bold text-text-primary mb-4 font-audiowide">🔄 Infinite Loop</h3>
                        <p className="text-text-secondary font-inter mb-4">
                          Every referral creates a permanent income stream that compounds forever
                        </p>
                        <button
                          onClick={copyReferralCode}
                          className="secondary-button w-full font-audiowide"
                        >
                          Copy Referral Link
                        </button>
                      </div>
                    </div>

                    {/* How Rakeback Works */}
                    <div className="glass-card p-6">
                      <h3 className="text-xl font-bold text-text-primary mb-4 font-audiowide">🔄 The Infinite Earning Loop</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-text-secondary font-inter">
                        <div className="text-center">
                          <div className="text-3xl mb-2">👥</div>
                          <h4 className="font-audiowide text-text-primary mb-2">Refer Forever</h4>
                          <p>Each friend you refer becomes a permanent revenue source that never expires</p>
                        </div>
                        <div className="text-center">
                          <div className="text-3xl mb-2">🎮</div>
                          <h4 className="font-audiowide text-text-primary mb-2">They Play Forever</h4>
                          <p>Every game, every match, every wager generates continuous income for you</p>
                        </div>
                        <div className="text-center">
                          <div className="text-3xl mb-2">💰</div>
                          <h4 className="font-audiowide text-text-primary mb-2">You Earn Forever</h4>
                          <p>Automatic SOL payouts that grow exponentially as your network expands</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Referrals Tab */}
                {activeTab === 'referrals' && !dataLoading && !loading && referralStats && (
                  <div className="space-y-6">
                    <div className="glass-card p-6">
                      <h2 className="text-2xl font-bold text-text-primary mb-6 font-audiowide">👥 Referral Program</h2>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                          <h3 className="text-lg font-bold text-text-primary mb-4 font-audiowide">Your Referral Code</h3>
                          <div className="bg-bg-card border border-border rounded-lg p-4 mb-4">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-accent-primary text-lg">{referralStats.referralCode}</span>
                              <button
                                onClick={copyReferralCode}
                                className="text-accent-secondary hover:text-accent-primary transition-colors"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              </button>
                            </div>
                          </div>
                          <p className="text-sm text-text-muted font-inter">
                            Share: {window.location.origin}?ref={referralStats.referralCode}
                          </p>
                        </div>

                        <div>
                          <h3 className="text-lg font-bold text-text-primary mb-4 font-audiowide">The Compound Loop</h3>
                          <div className="space-y-3 text-sm text-text-secondary font-inter">
                            <div className="flex items-start space-x-2">
                              <span className="text-accent-primary">🔗</span>
                              <span>Share your unique link and start building your income empire</span>
                            </div>
                            <div className="flex items-start space-x-2">
                              <span className="text-accent-primary">🎮</span>
                              <span>Friends join and every game they play forever feeds your wallet</span>
                            </div>
                            <div className="flex items-start space-x-2">
                              <span className="text-accent-primary">💰</span>
                              <span>Each referral becomes a permanent SOL generator with no expiration</span>
                            </div>
                            <div className="flex items-start space-x-2">
                              <span className="text-accent-primary">🔄</span>
                              <span>Income compounds as your network grows - creating exponential wealth</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                        <div className="bg-bg-card border border-border rounded-lg p-4">
                          <div className="text-text-secondary text-sm font-inter mb-1">Total Referred</div>
                          <div className="text-2xl font-bold text-text-primary font-audiowide">{referralStats.totalReferred}</div>
                        </div>
                        <div className="bg-bg-card border border-border rounded-lg p-4">
                          <div className="text-text-secondary text-sm font-inter mb-1">Infinite Earnings</div>
                          <div className="text-2xl font-bold text-accent-primary font-audiowide">{formatSOL(referralStats.totalEarned)}</div>
                        </div>
                        <div className="bg-bg-card border border-border rounded-lg p-4">
                          <div className="text-text-secondary text-sm font-inter mb-1">Compounding Now</div>
                          <div className="text-2xl font-bold text-yellow-400 font-audiowide">{formatSOL(referralStats.pendingRewards)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* History Tab */}
                {activeTab === 'history' && !dataLoading && !loading && (
                  <div className="space-y-6">
                    <div className="glass-card p-6">
                      <h2 className="text-2xl font-bold text-text-primary mb-6 font-audiowide">📜 Rakeback History</h2>
                      
                      {rewardHistory.length === 0 ? (
                        <div className="text-center py-12">
                          <div className="text-4xl mb-4">📭</div>
                          <h3 className="text-xl font-bold text-text-primary mb-2 font-audiowide">Infinite Loop Not Started</h3>
                          <p className="text-text-secondary font-inter">Refer your first friend and begin building your perpetual SOL machine!</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {rewardHistory.map((reward, index) => (
                            <div key={index} className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
                              <div>
                                <div className="font-audiowide text-text-primary">{reward.type}</div>
                                <div className="text-sm text-text-secondary font-inter">{reward.date}</div>
                              </div>
                              <div className="text-right">
                                <div className="font-audiowide text-accent-primary">+{formatSOL(reward.amount)}</div>
                                <div className={`text-xs font-inter ${
                                  reward.status === 'claimed' ? 'text-green-400' : 'text-yellow-400'
                                }`}>
                                  {reward.status.toUpperCase()}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                                )}

                {/* Prestige Tab */}
                {activeTab === 'prestige' && !dataLoading && !loading && prestigeInfo && (
                  <div className="space-y-6">
                    <div className="glass-card p-6">
                      <div className="text-center mb-8">
                        <div className="text-4xl mb-4">{prestigeInfo.prestige.badge}</div>
                        <h2 className="text-2xl font-bold text-text-primary mb-4 font-audiowide">Prestige Dashboard</h2>
                        <p className="text-text-secondary font-inter">
                          Unlock exclusive rewards and status as you climb the prestige ranks
                        </p>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Current Prestige Status */}
                        <div className="space-y-6">
                          <div className="bg-bg-card border border-border rounded-lg p-6">
                            <h3 className="text-lg font-bold text-text-primary mb-4 font-audiowide flex items-center">
                              <span className="text-2xl mr-2">🏆</span>
                              Current Prestige
                            </h3>
                            
                            <div className="flex items-center space-x-4 mb-4">
                              <div className="text-4xl">{prestigeInfo.prestige.badge}</div>
                              <div>
                                <div className="text-2xl font-bold text-accent-primary font-audiowide">{prestigeInfo.prestige.name}</div>
                                <div className="text-sm text-text-secondary font-inter">{prestigeInfo.prestige.title}</div>
                              </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="mb-4">
                              <div className="flex justify-between text-sm text-text-secondary font-inter mb-2">
                                <span>Current Tier: {prestigeInfo.currentTier.emoji} {prestigeInfo.currentTier.name}</span>
                                <span>{prestigeInfo.proofPoints.toLocaleString()} PP</span>
                              </div>
                              {prestigeInfo.nextTier && (
                                <>
                                  <div className="w-full bg-bg-main rounded-full h-3">
                                    <div 
                                      className="bg-gradient-to-r from-accent-primary to-yellow-400 h-3 rounded-full transition-all duration-500"
                                      style={{ width: `${Math.min(100, (prestigeInfo.proofPoints / prestigeInfo.nextTier.ppRequired) * 100)}%` }}
                                    ></div>
                                  </div>
                                  <div className="flex justify-between text-xs text-text-muted font-inter mt-2">
                                    <span>Next: {prestigeInfo.nextTier.emoji} {prestigeInfo.nextTier.name}</span>
                                    <span>{prestigeInfo.nextTier.ppNeeded.toLocaleString()} PP needed</span>
                                  </div>
                                </>
                              )}
                              {!prestigeInfo.nextTier && (
                                <div className="text-center py-2">
                                  <span className="text-yellow-400 font-audiowide text-sm">MAX TIER REACHED!</span>
                                  {prestigeInfo.canPrestige && (
                                    <div className="text-accent-primary font-audiowide text-sm mt-1">🔥 PRESTIGE AVAILABLE! 🔥</div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Prestige Benefits */}
                          <div className="bg-bg-card border border-border rounded-lg p-6">
                            <h3 className="text-lg font-bold text-text-primary mb-4 font-audiowide flex items-center">
                              <span className="text-2xl mr-2">🎁</span>
                              Active Benefits
                            </h3>
                            
                            <div className="space-y-3">
                              <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-b-0">
                                <div className="flex items-center space-x-2">
                                  <span className="text-green-400">✓</span>
                                  <span className="text-sm font-inter">PP Multiplier</span>
                                </div>
                                <span className="text-accent-primary font-audiowide text-sm">{prestigeInfo.prestige.multiplier}x</span>
                              </div>
                              <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-b-0">
                                <div className="flex items-center space-x-2">
                                  <span className="text-green-400">✓</span>
                                  <span className="text-sm font-inter">Airdrop Weight</span>
                                </div>
                                <span className="text-accent-primary font-audiowide text-sm">{prestigeInfo.prestige.airdropWeight}x</span>
                              </div>
                              {prestigeInfo.prestige.unlocks.map((unlock: string, index: number) => (
                                <div key={index} className="flex items-center justify-between py-2 border-b border-border/50 last:border-b-0">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-green-400">✓</span>
                                    <span className="text-sm font-inter">{unlock}</span>
                                  </div>
                                  <span className="text-green-400 font-audiowide text-sm">UNLOCKED</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Prestige Ranks & Rewards */}
                        <div className="space-y-6">
                          <div className="bg-bg-card border border-border rounded-lg p-6">
                            <h3 className="text-lg font-bold text-text-primary mb-4 font-audiowide flex items-center">
                              <span className="text-2xl mr-2">🎖️</span>
                              Prestige Ranks
                            </h3>
                            
                            <div className="space-y-3 max-h-64 overflow-y-auto">
                              {[
                                { rank: 0, name: 'Mortal Warrior', badge: '🔰', current: prestigeInfo.prestige.rank === 0 },
                                { rank: 1, name: 'Spartan General', badge: '⚔️', current: prestigeInfo.prestige.rank === 1 },
                                { rank: 2, name: 'Olympian Commander', badge: '⚡', current: prestigeInfo.prestige.rank === 2 },
                                { rank: 3, name: 'Divine Emperor', badge: '🏛️', current: prestigeInfo.prestige.rank === 3 },
                                { rank: 4, name: 'GODMODE', badge: '👑', current: prestigeInfo.prestige.rank === 4 },
                              ].map((prestige) => (
                                <div 
                                  key={prestige.rank}
                                  className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                                    prestige.current 
                                      ? 'bg-accent-primary/10 border-accent-primary/30' 
                                      : prestige.rank <= prestigeInfo.prestige.rank
                                        ? 'bg-green-500/5 border-green-500/20' 
                                        : 'bg-bg-main border-border/50'
                                  }`}
                                >
                                  <div className="flex items-center space-x-3">
                                    <span className="text-2xl">{prestige.badge}</span>
                                    <div>
                                      <div className={`font-audiowide text-sm ${
                                        prestige.current ? 'text-accent-primary' : prestige.rank <= prestigeInfo.prestige.rank ? 'text-green-400' : 'text-text-muted'
                                      }`}>
                                        {prestige.name}
                                      </div>
                                      <div className={`text-xs font-inter ${
                                        prestige.rank <= prestigeInfo.prestige.rank ? 'text-text-secondary' : 'text-text-muted'
                                      }`}>
                                        Prestige {prestige.rank}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    {prestige.current && (
                                      <div className="text-xs text-accent-primary font-audiowide">CURRENT</div>
                                    )}
                                    {prestige.rank < prestigeInfo.prestige.rank && (
                                      <div className="text-xs text-green-400">✓ ACHIEVED</div>
                                    )}
                                    {prestige.rank > prestigeInfo.prestige.rank && (
                                      <div className="text-xs text-text-muted">LOCKED</div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* PP Sources */}
                          <div className="bg-bg-card border border-border rounded-lg p-6">
                            <h3 className="text-lg font-bold text-text-primary mb-4 font-audiowide flex items-center">
                              <span className="text-2xl mr-2">⚡</span>
                              Earn Proof Points
                            </h3>
                            
                            <div className="space-y-2 text-sm font-inter">
                              <div className="flex justify-between">
                                <span className="text-text-secondary">Win 1 SOL match</span>
                                <span className="text-accent-primary font-audiowide">+3 PP</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-text-secondary">Win 10 SOL match</span>
                                <span className="text-accent-primary font-audiowide">+8 PP</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-text-secondary">Win 100 SOL match</span>
                                <span className="text-accent-primary font-audiowide">+75 PP</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-text-secondary">🎯 Referral signup</span>
                                <span className="text-accent-primary font-audiowide">+5,000 PP</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-text-secondary">🎯 Referral first game</span>
                                <span className="text-accent-primary font-audiowide">+15,000 PP</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-text-secondary">🎯 Referral milestone</span>
                                <span className="text-accent-primary font-audiowide">+25,000 PP</span>
                              </div>
                              <div className="text-xs text-text-muted mt-3 p-2 bg-bg-main rounded">
                                💡 All PP is multiplied by your prestige multiplier ({prestigeInfo.prestige.multiplier}x)
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Prestige Action */}
                      <div className="mt-8 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg p-6">
                        <div className="text-center">
                          {prestigeInfo.canPrestige ? (
                            <>
                              <div className="text-3xl mb-2">🔥</div>
                              <h3 className="text-xl font-bold text-text-primary mb-2 font-audiowide">PRESTIGE AVAILABLE!</h3>
                              <p className="text-text-secondary font-inter mb-4">
                                You&apos;ve reached God tier! Prestige now to unlock the next rank with enhanced multipliers and exclusive benefits.
                              </p>
                              <button className="bg-accent-primary text-black font-audiowide px-6 py-3 rounded-lg hover:bg-accent-primary/80 transition-colors">
                                🔥 PRESTIGE NOW 🔥
                              </button>
                            </>
                          ) : (
                            <>
                              <div className="text-3xl mb-2">{prestigeInfo.currentTier.emoji}</div>
                              <h3 className="text-xl font-bold text-text-primary mb-2 font-audiowide">Current Progress</h3>
                              <p className="text-text-secondary font-inter mb-4">
                                {prestigeInfo.nextTier 
                                  ? `Continue earning PP to reach ${prestigeInfo.nextTier.emoji} ${prestigeInfo.nextTier.name} tier`
                                  : 'You&apos;ve reached the maximum tier! Earn more PP to unlock prestige.'
                                }
                              </p>
                              <div className="inline-flex items-center space-x-2 bg-bg-card border border-border rounded-lg px-4 py-2">
                                <span className="text-sm text-text-secondary font-inter">Total PP:</span>
                                <span className="text-accent-primary font-audiowide">{prestigeInfo.totalProofPoints.toLocaleString()}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}