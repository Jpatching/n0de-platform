'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import PageHeader from '@/components/PageHeader';
import Sidebar from '@/components/Sidebar';
import { StreamCard } from '@/components/streaming/StreamCard';
import { StreamFilters } from '@/components/streaming/StreamFilters';
import { FeaturedStream } from '@/components/streaming/FeaturedStream';
import { StreamCategories } from '@/components/streaming/StreamCategories';

interface StreamInfo {
  id: string;
  streamerId: string;
  streamerUsername: string;
  streamerDisplayName?: string;
  streamerAvatar?: string;
  streamerPrestige: number;
  title: string;
  description?: string;
  category: string;
  gameType?: string;
  stakes?: number;
  isLive: boolean;
  viewerCount: number;
  startedAt: string;
  totalTips: number;
  totalSubscribers: number;
  thumbnailUrl?: string;
  tags: string[];
  isEducational: boolean;
  isPremium: boolean;
  minPrestigeToView?: number;
  language: string;
}

export default function LivePage() {
  const { user } = useAuth();
  const [featuredStream, setFeaturedStream] = useState<StreamInfo | null>(null);
  const [activeStreams, setActiveStreams] = useState<StreamInfo[]>([]);
  const [prestigeStreams, setPrestigeStreams] = useState<StreamInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filters, setFilters] = useState({
    minPrestige: '',
    maxPrestige: '',
    minStakes: '',
    maxStakes: '',
    language: '',
    isEducational: false,
    tags: [] as string[],
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // API Base URL
  const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'https://pv3-backend-api-production.up.railway.app') + '/api/v1';

  // Helper function to get authentication headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem('pv3_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  };

  // Load streams
  const loadStreams = async () => {
    try {
      setLoading(true);

      // Load featured stream
      const featuredResponse = await fetch(`${API_BASE}/streaming/featured`);
      if (featuredResponse.ok) {
        const featuredData = await featuredResponse.json();
        setFeaturedStream(featuredData.stream);
      }

      // Load active streams with filters
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }
      if (filters.minPrestige) params.append('minPrestige', filters.minPrestige);
      if (filters.maxPrestige) params.append('maxPrestige', filters.maxPrestige);
      if (filters.minStakes) params.append('minStakes', filters.minStakes);
      if (filters.maxStakes) params.append('maxStakes', filters.maxStakes);
      if (filters.language) params.append('language', filters.language);
      if (filters.isEducational) params.append('isEducational', 'true');
      filters.tags.forEach(tag => params.append('tags', tag));

      const activeResponse = await fetch(`${API_BASE}/streaming/active?${params.toString()}`);
      if (activeResponse.ok) {
        const activeData = await activeResponse.json();
        setActiveStreams(activeData.streams || []);
      }

      // Load prestige streamers
      const prestigeResponse = await fetch(`${API_BASE}/streaming/prestige`);
      if (prestigeResponse.ok) {
        const prestigeData = await prestigeResponse.json();
        setPrestigeStreams(prestigeData.streams || []);
      }

    } catch (error) {
      console.error('Failed to load streams:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStreams();
  }, [selectedCategory, filters]);

  // Auto-refresh streams every 30 seconds
  useEffect(() => {
    const interval = setInterval(loadStreams, 30000);
    return () => clearInterval(interval);
  }, [selectedCategory, filters]);

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
  };

  const handleFiltersChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
  };

  const getCategoryStreams = (category: string) => {
    if (category === 'all') return activeStreams;
    return activeStreams.filter(stream => stream.category === category);
  };

  return (
    <div className="min-h-screen bg-bg-primary">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:ml-64">
        <PageHeader onMenuClick={() => setSidebarOpen(true)} />
        <main className="p-6">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-text-primary mb-2 font-audiowide">
                🎥 Live Streams
              </h1>
              <p className="text-text-secondary">
                Watch, learn, and earn with PV3&apos;s streaming platform
              </p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-primary"></div>
                <span className="ml-3 text-text-secondary">Loading streams...</span>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Featured Stream */}
                {featuredStream && (
                  <section>
                    <h2 className="text-2xl font-bold text-text-primary mb-4 font-audiowide">
                      🌟 Featured Stream
                    </h2>
                    <FeaturedStream stream={featuredStream} />
                  </section>
                )}

                {/* Stream Categories */}
                <section>
                  <h2 className="text-2xl font-bold text-text-primary mb-4 font-audiowide">
                    📂 Browse Categories
                  </h2>
                  <StreamCategories 
                    selectedCategory={selectedCategory}
                    onCategoryChange={handleCategoryChange}
                    streamCounts={{
                      all: activeStreams.length,
                      high_stakes: activeStreams.filter(s => s.category === 'high_stakes').length,
                      educational: activeStreams.filter(s => s.category === 'educational').length,
                      prestige_showcase: activeStreams.filter(s => s.category === 'prestige_showcase').length,
                      tournaments: activeStreams.filter(s => s.category === 'tournaments').length,
                      just_chatting: activeStreams.filter(s => s.category === 'just_chatting').length,
                    }}
                  />
                </section>

                {/* Prestige Streamers */}
                {prestigeStreams.length > 0 && (
                  <section>
                    <h2 className="text-2xl font-bold text-text-primary mb-4 font-audiowide">
                      👑 Prestige Streamers (P2+)
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {prestigeStreams.map((stream) => (
                        <StreamCard key={stream.id} stream={stream} />
                      ))}
                    </div>
                  </section>
                )}

                {/* Filters */}
                <section>
                  <StreamFilters 
                    filters={filters}
                    onFiltersChange={handleFiltersChange}
                  />
                </section>

                {/* Active Streams */}
                <section>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-text-primary font-audiowide">
                      {selectedCategory === 'all' ? '🔴 All Live Streams' : `🔴 ${selectedCategory.replace('_', ' ').toUpperCase()} Streams`}
                    </h2>
                    <div className="text-sm text-text-secondary">
                      {getCategoryStreams(selectedCategory).length} streams live
                    </div>
                  </div>

                  {getCategoryStreams(selectedCategory).length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">📺</div>
                      <h3 className="text-xl font-bold text-text-primary mb-2">No streams found</h3>
                      <p className="text-text-secondary">
                        {selectedCategory === 'all' 
                          ? 'No one is streaming right now. Be the first to go live!'
                          : `No ${selectedCategory.replace('_', ' ')} streams are currently live.`
                        }
                      </p>
                      {user && (
                        <button className="mt-4 bg-accent-primary hover:bg-accent-primary/80 text-white px-6 py-2 rounded-lg font-semibold transition-colors">
                          Start Streaming
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {getCategoryStreams(selectedCategory).map((stream) => (
                        <StreamCard key={stream.id} stream={stream} />
                      ))}
                    </div>
                  )}
                </section>

                {/* Educational Spotlight */}
                {activeStreams.filter(s => s.isEducational).length > 0 && (
                  <section>
                    <h2 className="text-2xl font-bold text-text-primary mb-4 font-audiowide">
                      🎓 Educational Spotlight
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {activeStreams
                        .filter(s => s.isEducational)
                        .slice(0, 6)
                        .map((stream) => (
                          <StreamCard key={stream.id} stream={stream} showEducationalBadge />
                        ))}
                    </div>
                  </section>
                )}

                {/* High Stakes */}
                {activeStreams.filter(s => s.stakes && s.stakes >= 10).length > 0 && (
                  <section>
                    <h2 className="text-2xl font-bold text-text-primary mb-4 font-audiowide">
                      💎 High Stakes Action
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {activeStreams
                        .filter(s => s.stakes && s.stakes >= 10)
                        .sort((a, b) => (b.stakes || 0) - (a.stakes || 0))
                        .slice(0, 6)
                        .map((stream) => (
                          <StreamCard key={stream.id} stream={stream} showStakesBadge />
                        ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    );
  } 
 