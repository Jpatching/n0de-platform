'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import PageHeader from '@/components/PageHeader';
import { PnLCard } from '@/components/PnLCard';
import { PnLCardModal } from '@/components/PnLCardModal';
import { PnLCardActions } from '@/components/PnLCardActions';
import { Button } from '@/components/ui/button';
import { 
  Heart, 
  Folder, 
  FolderPlus, 
  Trash2, 
  ChevronLeft, 
  Globe, 
  TrendingUp,
  BarChart3,
  Filter,
  Users
} from 'lucide-react';

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

interface Collection {
  id: string;
  name: string;
  description?: string;
  isPublic: boolean;
  _count: { cards: number };
  createdAt: Date;
  updatedAt: Date;
  cards?: Array<{
    id: string;
    card: PnLRecord;
  }>;
}

export default function PnLDashboardPage() {
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<PnLRecord[]>([]);
  const [favorites, setFavorites] = useState<Array<{ id: string; card: PnLRecord }>>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [selectedCard, setSelectedCard] = useState<PnLRecord | null>(null);
  const [dashboard, setDashboard] = useState<PnLDashboard | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [cleanupCount, setCleanupCount] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);

  // Load dashboard data
  const loadDashboard = async () => {
    if (!isAuthenticated) return;
    
    try {
      const API_BASE = `${process.env.NEXT_PUBLIC_API_URL || 'https://pv3-backend-api-production.up.railway.app'}/api/v1`;
      const response = await fetch(`${API_BASE}/pnl/dashboard`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('pv3_token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setDashboard(data);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    }
  };

  // Load PnL cards
  const loadCards = async (page = 1, reset = true) => {
    if (!isAuthenticated) return;
    
    try {
      setLoading(true);
      const API_BASE = `${process.env.NEXT_PUBLIC_API_URL || 'https://pv3-backend-api-production.up.railway.app'}/api/v1`;
      // Convert page to offset (page 1 = offset 0, page 2 = offset 12, etc.)
      const offset = (page - 1) * 12;
      const response = await fetch(`${API_BASE}/pnl/cards?offset=${offset}&limit=12`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('pv3_token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (reset) {
          setCards(data.cards);
        } else {
          setCards(prev => [...prev, ...data.cards]);
        }
        setHasMore(data.hasMore);
        setPage(page);
      }
    } catch (error) {
      console.error('Error loading cards:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load favorites
  const loadFavorites = async () => {
    if (!isAuthenticated) return;
    
    try {
      const API_BASE = `${process.env.NEXT_PUBLIC_API_URL || 'https://pv3-backend-api-production.up.railway.app'}/api/v1`;
      const response = await fetch(`${API_BASE}/pnl/favorites`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('pv3_token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setFavorites(data);
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  };

  // Load collections
  const loadCollections = async () => {
    if (!isAuthenticated) return;
    
    try {
      const API_BASE = `${process.env.NEXT_PUBLIC_API_URL || 'https://pv3-backend-api-production.up.railway.app'}/api/v1`;
      const response = await fetch(`${API_BASE}/pnl/favorites/collections`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('pv3_token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCollections(data);
      }
    } catch (error) {
      console.error('Error loading collections:', error);
    }
  };

  // Load specific collection
  const loadCollection = async (collectionId: string) => {
    try {
      const API_BASE = `${process.env.NEXT_PUBLIC_API_URL || 'https://pv3-backend-api-production.up.railway.app'}/api/v1`;
      const response = await fetch(`${API_BASE}/pnl/favorites/collections/${collectionId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('pv3_token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSelectedCollection(data);
      }
    } catch (error) {
      console.error('Error loading collection:', error);
    }
  };

  // Load cleanup stats
  const loadCleanupStats = async () => {
    if (!isAuthenticated) return;
    
    try {
      const API_BASE = `${process.env.NEXT_PUBLIC_API_URL || 'https://pv3-backend-api-production.up.railway.app'}/api/v1`;
      const response = await fetch(`${API_BASE}/pnl/cleanup-stats`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('pv3_token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCleanupCount(data.cardsToBeDeleted);
      }
    } catch (error) {
      console.error('Error loading cleanup stats:', error);
    }
  };

  // Initial load
  useEffect(() => {
    if (isAuthenticated) {
      loadDashboard();
      loadCards();
      loadFavorites();
      loadCollections();
      loadCleanupStats();
    }
  }, [isAuthenticated]);

  // Handle tab change
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSelectedCollection(null);
    setBulkSelectMode(false);
    setSelectedCards([]);
  };

  // Delete collection
  const deleteCollection = async (collectionId: string) => {
    if (!confirm('Are you sure you want to delete this collection?')) return;
    
    try {
      const API_BASE = `${process.env.NEXT_PUBLIC_API_URL || 'https://pv3-backend-api-production.up.railway.app'}/api/v1`;
      const response = await fetch(`${API_BASE}/pnl/favorites/collections/${collectionId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('pv3_token')}` }
      });
      if (response.ok) {
        loadCollections();
      }
    } catch (error) {
      console.error('Error deleting collection:', error);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-main text-text-primary">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <div className="lg:ml-64 min-h-screen">
          <PageHeader onMenuClick={() => setSidebarOpen(true)} />
          
          <main className="p-6">
            <div className="max-w-7xl mx-auto">
              <div className="text-center glass-card p-12">
                <div className="text-6xl mb-6">🔒</div>
                <h2 className="text-3xl font-bold text-text-primary mb-4 font-audiowide">Authentication Required</h2>
                <p className="text-text-secondary font-inter mb-8">
                  Please sign in to view your trading performance and PnL analytics.
                </p>
                <Button className="bg-accent-primary text-black font-bold hover:bg-accent-secondary font-inter">
                  Sign In to Continue
                </Button>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (loading && cards.length === 0) {
    return (
      <div className="min-h-screen bg-main text-text-primary">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <div className="lg:ml-64 min-h-screen">
          <PageHeader onMenuClick={() => setSidebarOpen(true)} />
          
          <main className="p-6">
            <div className="max-w-7xl mx-auto">
              <div className="text-center glass-card p-12">
                <div className="text-4xl mb-4">⏳</div>
                <h2 className="text-2xl font-bold text-text-primary mb-4 font-audiowide">Loading PnL Dashboard...</h2>
                <p className="text-text-secondary font-inter">Fetching your trading performance data</p>
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
            {/* Page Header */}
            <div className="mb-8">
              <div className="glass-card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-3xl font-bold text-text-primary font-audiowide mb-2">
                      📊 PnL Dashboard
                    </h1>
                    <p className="text-text-secondary font-inter">
                      Track your trading performance and manage your success stories
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className={`px-4 py-2 rounded-lg transition-colors font-inter ${
                        showFilters ? 'bg-accent-primary text-black' : 'bg-surface border border-border text-text-primary hover:bg-surface/80'
                      }`}
                    >
                      <Filter className="h-4 w-4 mr-2 inline" />
                      Filters
                    </button>
                    <button
                      onClick={() => setBulkSelectMode(!bulkSelectMode)}
                      className={`px-4 py-2 rounded-lg transition-colors font-inter ${
                        bulkSelectMode ? 'bg-accent-primary text-black' : 'bg-surface border border-border text-text-primary hover:bg-surface/80'
                      }`}
                    >
                      {bulkSelectMode ? 'Cancel Selection' : 'Bulk Select'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary Stats */}
            {dashboard?.summary && (
              <div className="mb-8">
                <div className="glass-card p-6">
                  <h3 className="text-xl font-bold text-text-primary mb-6 font-audiowide">💰 Performance Overview</h3>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    <div className="bg-surface/50 border border-border rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-text-primary font-audiowide">{dashboard.summary.totalGames}</div>
                      <div className="text-sm text-text-secondary font-inter">Total Games</div>
                    </div>
                    <div className="bg-surface/50 border border-border rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-accent-success font-audiowide">{dashboard.summary.totalWins}</div>
                      <div className="text-sm text-text-secondary font-inter">Wins</div>
                    </div>
                    <div className="bg-surface/50 border border-border rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-accent-danger font-audiowide">{dashboard.summary.totalLosses}</div>
                      <div className="text-sm text-text-secondary font-inter">Losses</div>
                    </div>
                    <div className="bg-surface/50 border border-border rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-accent-primary font-audiowide">{dashboard.summary.winRate}%</div>
                      <div className="text-sm text-text-secondary font-inter">Win Rate</div>
                    </div>
                    <div className="bg-surface/50 border border-border rounded-lg p-4 text-center">
                      <div className={`text-2xl font-bold font-audiowide ${dashboard.summary.totalPnL >= 0 ? 'text-accent-success' : 'text-accent-danger'}`}>
                        {dashboard.summary.totalPnL >= 0 ? '+' : ''}{dashboard.summary.totalPnL.toFixed(2)} SOL
                      </div>
                      <div className="text-sm text-text-secondary font-inter">Net P&L</div>
                    </div>
                    <div className="bg-surface/50 border border-border rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-accent-warning font-audiowide">{dashboard.summary.currentStreak}</div>
                      <div className="text-sm text-text-secondary font-inter">Current Streak</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Cleanup Warning */}
            {cleanupCount > 0 && (
              <div className="mb-8">
                <div className="glass-card p-4 border-l-4 border-accent-warning">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">⚠️</div>
                    <div>
                      <h4 className="font-bold text-accent-warning font-audiowide">Auto-Cleanup Notice</h4>
                      <p className="text-text-secondary text-sm font-inter">
                        {cleanupCount} Victory Cards will be automatically deleted in the next cleanup (cards older than 15 days that aren&apos;t favorited or in collections).
                        <button className="ml-2 text-accent-primary hover:underline">Favorite them to keep forever!</button>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Smart Filter Panel - Coming Soon */}
            {showFilters && (
              <div className="mb-8">
                <div className="glass-card p-6">
                  <h3 className="text-lg font-bold text-text-primary mb-4 font-audiowide">Smart Filters</h3>
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">🔧</div>
                    <p className="text-text-secondary font-inter">Advanced filtering options coming soon!</p>
                  </div>
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="mb-8">
              <div className="glass-card p-1">
                <div className="flex space-x-1 overflow-x-auto">
                  {[
                    { id: 'all', label: 'All Cards', icon: BarChart3 },
                    { id: 'favorites', label: 'Favorites', icon: Heart },
                    { id: 'collections', label: 'Collections', icon: Folder },
                    { id: 'social', label: 'Social Hub', icon: Users },
                    { id: 'analytics', label: 'Analytics', icon: TrendingUp }
                  ].map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id)}
                        className={`flex items-center space-x-2 px-4 py-3 rounded-lg transition-colors font-inter whitespace-nowrap ${
                          activeTab === tab.id
                            ? 'bg-accent-primary text-black font-bold'
                            : 'text-text-secondary hover:text-text-primary hover:bg-surface/50'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* All Cards Tab */}
            {activeTab === 'all' && (
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-text-primary font-audiowide">
                    All Victory Cards ({cards.length})
                  </h3>
                  {bulkSelectMode && selectedCards.length > 0 && (
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-text-secondary font-inter">
                        {selectedCards.length} selected
                      </span>
                      <button className="px-3 py-1 bg-accent-success text-black rounded font-inter text-sm">
                        Add to Favorites
                      </button>
                      <button className="px-3 py-1 bg-accent-primary text-black rounded font-inter text-sm">
                        Create Collection
                      </button>
                    </div>
                  )}
                </div>

                {cards.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="text-8xl mb-6">📈</div>
                    <div className="text-text-primary text-xl mb-4 font-audiowide">No Victory Cards Yet</div>
                    <p className="text-text-secondary mb-8 max-w-md mx-auto font-inter">
                      Start playing games to generate Victory Cards that showcase your epic wins!
                    </p>
                    <Button className="bg-accent-primary text-black font-bold hover:bg-accent-secondary font-inter">
                      Play Games Now
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1">
                    {cards.map((card) => (
                      <div
                        key={card.id}
                        className="relative group cursor-pointer transform hover:scale-105 transition-all duration-200 hover:shadow-xl"
                        onClick={() => !bulkSelectMode && setSelectedCard(card)}
                      >
                        {bulkSelectMode && (
                          <div className="absolute top-3 left-3 z-10">
                            <input
                              type="checkbox"
                              checked={selectedCards.includes(card.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedCards(prev => [...prev, card.id]);
                                } else {
                                  setSelectedCards(prev => prev.filter(id => id !== card.id));
                                }
                              }}
                              className="w-5 h-5 rounded border-border bg-surface focus:ring-accent-primary"
                            />
                          </div>
                        )}
                        
                        <PnLCard
                          game={card.game as 'RPS' | 'MINES' | 'CRASH' | 'CHESS' | 'COINFLIP'}
                          result={card.result}
                          pnlAmount={card.pnlAmount}
                          pnlPercentage={card.pnlPercentage}
                          wagerAmount={card.wagerAmount}
                          finalAmount={card.finalAmount}
                          username={card.username}
                          walletAddress={card.walletAddress}
                          userAvatar={card.cardData?.userAvatar || user?.avatar} // USE SAVED AVATAR
                          gameSpecific={card.cardData?.gameSpecific || card.gameSpecific} // USE SAVED GAME DATA
                          baseImageUrl={card.cardData?.baseImageUrl || "/pnl/pnlcard.png"} // USE SAVED BASE IMAGE
                          showShare={false} // HIDE BUTTONS IN GRID VIEW
                        />
                        
                        {!bulkSelectMode && (
                          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <PnLCardActions
                              cardId={card.id}
                              onFavoriteChange={loadFavorites}
                              onCollectionChange={loadCollections}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {hasMore && (
                  <div className="text-center mt-8">
                    <Button
                      onClick={() => loadCards(page + 1, false)}
                      disabled={loading}
                      className="bg-surface border border-border text-text-primary hover:bg-surface/80 font-inter"
                    >
                      {loading ? 'Loading...' : 'Load More Cards'}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Favorites Tab */}
            {activeTab === 'favorites' && (
              <div className="glass-card p-6">
                <h3 className="text-xl font-bold text-text-primary mb-6 font-audiowide">
                  <Heart className="h-5 w-5 text-red-400 inline mr-2" />
                  Favorite Cards ({favorites.length})
                </h3>

                {favorites.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="text-8xl mb-6">💝</div>
                    <div className="text-text-primary text-xl mb-4 font-audiowide">No favorites yet</div>
                    <p className="text-text-secondary mb-8 max-w-md mx-auto font-inter">
                      Heart your best Victory Cards to save them here forever! Favorited cards won&apos;t be deleted by the 15-day cleanup.
                    </p>
                    <Button 
                      onClick={() => setActiveTab('all')}
                      className="bg-accent-primary text-black font-bold hover:bg-accent-secondary font-inter"
                    >
                      Browse All Cards
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1">
                    {favorites.map((favorite) => (
                      <div
                        key={favorite.id}
                        className="relative group cursor-pointer transform hover:scale-105 transition-all duration-200 hover:shadow-xl"
                        onClick={() => setSelectedCard(favorite.card)}
                      >
                        <PnLCard
                          game={favorite.card.game as 'RPS' | 'MINES' | 'CRASH' | 'CHESS' | 'COINFLIP'}
                          result={favorite.card.result}
                          pnlAmount={favorite.card.pnlAmount}
                          pnlPercentage={favorite.card.pnlPercentage}
                          wagerAmount={favorite.card.wagerAmount}
                          finalAmount={favorite.card.finalAmount}
                          username={favorite.card.username}
                          walletAddress={favorite.card.walletAddress}
                          userAvatar={favorite.card.cardData?.userAvatar || user?.avatar} // USE SAVED AVATAR
                          gameSpecific={favorite.card.cardData?.gameSpecific || favorite.card.gameSpecific} // USE SAVED GAME DATA
                          baseImageUrl={favorite.card.cardData?.baseImageUrl || "/pnl/pnlcard.png"} // USE SAVED BASE IMAGE
                          showShare={false} // HIDE BUTTONS IN GRID VIEW
                        />
                        
                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <PnLCardActions
                            cardId={favorite.card.id}
                            onFavoriteChange={loadFavorites}
                            onCollectionChange={loadCollections}
                          />
                        </div>
                        
                        <div className="absolute top-3 left-3">
                          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-2">
                            <Heart className="h-4 w-4 text-red-400 fill-current" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Collections Tab */}
            {activeTab === 'collections' && (
              <div>
                {!selectedCollection ? (
                  <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold text-text-primary font-audiowide">
                        <Folder className="h-5 w-5 text-blue-400 inline mr-2" />
                        My Collections ({collections.length})
                      </h3>
                      <Button
                        onClick={async () => {
                          const name = prompt('Enter collection name:');
                          if (!name?.trim()) return;
                          const description = prompt('Enter collection description (optional):');
                          
                          try {
                                    const response = await fetch('/api/v1/pnl/favorites/collections', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('pv3_token')}`
          },
          body: JSON.stringify({
            name: name.trim(),
            description: description?.trim() || undefined,
            isPublic: false
          })
        });
                            if (response.ok) {
                              loadCollections();
                            }
                          } catch (error) {
                            alert('Failed to create collection');
                          }
                        }}
                        className="bg-accent-primary text-black font-bold hover:bg-accent-secondary font-inter"
                      >
                        <FolderPlus className="h-4 w-4 mr-2" />
                        New Collection
                      </Button>
                    </div>

                    {collections.length === 0 ? (
                      <div className="text-center py-16">
                        <div className="text-8xl mb-6">📁</div>
                        <div className="text-text-primary text-xl mb-4 font-audiowide">No collections yet</div>
                        <p className="text-text-secondary mb-8 max-w-md mx-auto font-inter">
                          Create collections to organize your favorite Victory Cards by theme, game type, or any category you want!
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {collections.map((collection) => (
                          <div
                            key={collection.id}
                            className="group bg-surface/50 border border-border rounded-lg p-6 hover:bg-surface/80 transition-all duration-200 cursor-pointer hover:border-accent-primary"
                            onClick={() => loadCollection(collection.id)}
                          >
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center space-x-3">
                                <div className="p-3 bg-blue-600/20 border border-blue-600/30 rounded-lg">
                                  <Folder className="h-6 w-6 text-blue-400" />
                                </div>
                                <div>
                                  <h3 className="font-bold text-text-primary text-lg group-hover:text-accent-primary transition-colors font-audiowide">
                                    {collection.name}
                                  </h3>
                                  <p className="text-text-secondary text-sm font-inter">
                                    {collection._count.cards} cards
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteCollection(collection.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-600/20 rounded-lg"
                              >
                                <Trash2 className="h-4 w-4 text-red-400" />
                              </button>
                            </div>
                            
                            {collection.description && (
                              <p className="text-text-secondary text-sm mb-4 line-clamp-2 font-inter">
                                {collection.description}
                              </p>
                            )}
                            
                            <div className="flex items-center justify-between text-xs text-text-secondary font-inter">
                              <span>
                                {collection.isPublic ? 'Public' : 'Private'}
                              </span>
                              <span>
                                {new Date(collection.updatedAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-4">
                        <Button
                          onClick={() => setSelectedCollection(null)}
                          variant="ghost"
                          size="sm"
                          className="text-text-secondary hover:text-text-primary font-inter"
                        >
                          <ChevronLeft className="h-4 w-4 mr-2" />
                          Back to Collections
                        </Button>
                        <div>
                          <h3 className="text-xl font-bold text-text-primary font-audiowide">
                            <Folder className="h-5 w-5 text-blue-400 inline mr-2" />
                            {selectedCollection.name}
                          </h3>
                          <p className="text-text-secondary text-sm font-inter">
                            {selectedCollection.cards ? selectedCollection.cards.length : 0} cards in collection
                          </p>
                        </div>
                      </div>
                    </div>

                    {!selectedCollection.cards || selectedCollection.cards.length === 0 ? (
                      <div className="text-center py-16">
                        <div className="text-8xl mb-6">📂</div>
                        <div className="text-text-primary text-xl mb-4 font-audiowide">Empty collection</div>
                        <p className="text-text-secondary mb-8 max-w-md mx-auto font-inter">
                          Add Victory Cards to this collection from the &quot;All Cards&quot; tab using the actions menu.
                        </p>
                        <Button 
                          onClick={() => setActiveTab('all')}
                          className="bg-accent-primary text-black font-bold hover:bg-accent-secondary font-inter"
                        >
                          Browse All Cards
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1">
                        {selectedCollection.cards.map((collectionCard: any) => (
                          <div
                            key={collectionCard.id}
                            className="relative group cursor-pointer transform hover:scale-105 transition-all duration-200 hover:shadow-xl"
                            onClick={() => setSelectedCard(collectionCard.card)}
                          >
                            <PnLCard
                              game={collectionCard.card.game as 'RPS' | 'MINES' | 'CRASH' | 'CHESS' | 'COINFLIP'}
                              result={collectionCard.card.result}
                              pnlAmount={collectionCard.card.pnlAmount}
                              pnlPercentage={collectionCard.card.pnlPercentage}
                              wagerAmount={collectionCard.card.wagerAmount}
                              finalAmount={collectionCard.card.finalAmount}
                              username={collectionCard.card.username}
                              walletAddress={collectionCard.card.walletAddress}
                              userAvatar={collectionCard.card.cardData?.userAvatar || user?.avatar} // USE SAVED AVATAR
                              gameSpecific={collectionCard.card.cardData?.gameSpecific || collectionCard.card.gameSpecific} // USE SAVED GAME DATA
                              baseImageUrl={collectionCard.card.cardData?.baseImageUrl || "/pnl/pnlcard.png"} // USE SAVED BASE IMAGE
                              showShare={false} // HIDE BUTTONS IN GRID VIEW
                            />
                            
                            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <PnLCardActions
                                cardId={collectionCard.card.id}
                                onFavoriteChange={loadFavorites}
                                onCollectionChange={() => loadCollection(selectedCollection.id)}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Social Hub Tab */}
            {activeTab === 'social' && (
              <div className="glass-card p-6">
                <h3 className="text-xl font-bold text-text-primary mb-6 font-audiowide">
                  <Globe className="h-5 w-5 text-cyan-400 inline mr-2" />
                  Social Collections Hub
                </h3>
                <p className="text-text-secondary mb-8 font-inter">
                  Share your best moments with the community and discover trending collections
                </p>

                {/* Social features coming soon */}
                <div className="text-center py-16">
                  <div className="text-8xl mb-6">🌐</div>
                  <div className="text-text-primary text-xl mb-4 font-audiowide">Social Features Coming Soon</div>
                  <p className="text-text-secondary mb-8 max-w-md mx-auto font-inter">
                    We&apos;re building social collection sharing, community trending, and public leaderboards. 
                    Stay tuned for the social gaming revolution!
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                    <div className="bg-surface/50 border border-border rounded-lg p-4">
                      <div className="text-cyan-400 font-bold font-audiowide">🔗 Share Collections</div>
                      <div className="text-xs text-text-secondary mt-1 font-inter">Make collections public</div>
                    </div>
                    <div className="bg-surface/50 border border-border rounded-lg p-4">
                      <div className="text-orange-400 font-bold font-audiowide">🔥 Trending Feed</div>
                      <div className="text-xs text-text-secondary mt-1 font-inter">Discover popular content</div>
                    </div>
                    <div className="bg-surface/50 border border-border rounded-lg p-4">
                      <div className="text-accent-success font-bold font-audiowide">👑 Leaderboards</div>
                      <div className="text-xs text-text-secondary mt-1 font-inter">Community rankings</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div className="glass-card p-6">
                <h3 className="text-xl font-bold text-text-primary mb-6 font-audiowide">
                  <TrendingUp className="h-5 w-5 text-accent-primary inline mr-2" />
                  Performance Analytics
                </h3>
                <p className="text-text-secondary mb-8 font-inter">
                  Advanced analytics and performance metrics for your gaming sessions
                </p>

                <div className="text-center py-16">
                  <div className="text-8xl mb-6">📊</div>
                  <div className="text-text-primary text-xl mb-4 font-audiowide">Advanced Analytics Coming Soon</div>
                  <p className="text-text-secondary mb-8 max-w-md mx-auto font-inter">
                    We&apos;re building comprehensive analytics including performance charts, streak analysis, 
                    volatility metrics, and professional trading insights.
                  </p>
                  <div className="flex justify-center space-x-4">
                    <div className="bg-surface/50 border border-border rounded-lg p-4">
                      <div className="text-accent-primary font-bold font-audiowide">📈 Performance Charts</div>
                      <div className="text-xs text-text-secondary mt-1 font-inter">Visual performance tracking</div>
                    </div>
                    <div className="bg-surface/50 border border-border rounded-lg p-4">
                      <div className="text-cyan-400 font-bold font-audiowide">🎯 Streak Analysis</div>
                      <div className="text-xs text-text-secondary mt-1 font-inter">Win/loss pattern insights</div>
                    </div>
                    <div className="bg-surface/50 border border-border rounded-lg p-4">
                      <div className="text-accent-success font-bold font-audiowide">📊 Trading Metrics</div>
                      <div className="text-xs text-text-secondary mt-1 font-inter">Professional analytics</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* PnL Card Modal */}
      {selectedCard && (
        <PnLCardModal
          isOpen={true}
          onClose={() => setSelectedCard(null)}
          game={selectedCard.game as 'RPS' | 'MINES' | 'CRASH' | 'CHESS' | 'COINFLIP'}
          result={selectedCard.result}
          pnlAmount={selectedCard.pnlAmount}
          pnlPercentage={selectedCard.pnlPercentage}
          wagerAmount={selectedCard.wagerAmount}
          finalAmount={selectedCard.finalAmount}
          username={selectedCard.username}
          walletAddress={selectedCard.walletAddress}
          userAvatar={selectedCard.cardData?.userAvatar || user?.avatar} // USE SAVED AVATAR
          gameSpecific={selectedCard.cardData?.gameSpecific || selectedCard.gameSpecific} // USE SAVED GAME DATA
          baseImageUrl={selectedCard.cardData?.baseImageUrl || "/pnl/pnlcard.png"} // USE SAVED BASE IMAGE
        />
      )}
    </div>
  );
} 