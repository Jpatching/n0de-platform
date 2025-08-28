'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Play, Users, DollarSign, Clock, Eye, AlertTriangle, TrendingUp, Gamepad2 } from 'lucide-react';
import { adminApi } from '@/services/api';
import type { ActiveMatch } from '@/types/admin';
import Layout from '@/components/admin/Layout';

export default function LiveMatchesPage() {
  const [matches, setMatches] = useState<ActiveMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeMatches: 0,
    totalPlayers: 0,
    totalValue: 0,
    completedToday: 0
  });

  useEffect(() => {
    fetchMatches();
    fetchStats();
    
    // Auto-refresh every 5 seconds
    const interval = setInterval(() => {
      fetchMatches();
      fetchStats();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const fetchMatches = async () => {
    try {
      const response = await adminApi.getMatches();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setMatches(response.data?.matches || [] as any);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching matches:', error);
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await adminApi.getSystemStats();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = response.data || {} as any;
      setStats({
        activeMatches: data.activeMatches || 0,
        totalPlayers: data.onlineUsers || 0,
        totalValue: data.totalMatchValue || 0,
        completedToday: data.completedMatchesToday || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400';
      case 'completed': return 'text-blue-400';
      case 'pending': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Play className="w-4 h-4 text-green-400" />;
      case 'completed': return <TrendingUp className="w-4 h-4 text-blue-400" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-400" />;
      default: return <AlertTriangle className="w-4 h-4 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold admin-rainbow-text">Live Matches</h1>
              <p className="text-text-muted mt-1">Real-time match monitoring and analytics</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <Card key={i} className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-300 rounded w-1/2"></div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold admin-rainbow-text">Live Matches</h1>
            <p className="text-text-muted mt-1">Real-time match monitoring and analytics</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm text-text-muted">Live Updates</span>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 admin-card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">Active Matches</p>
                <p className="text-2xl font-bold text-green-400">{stats.activeMatches}</p>
              </div>
              <Play className="w-8 h-8 text-green-400" />
            </div>
          </Card>

          <Card className="p-6 admin-card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">Total Players</p>
                <p className="text-2xl font-bold text-blue-400">{stats.totalPlayers}</p>
              </div>
              <Users className="w-8 h-8 text-blue-400" />
            </div>
          </Card>

          <Card className="p-6 admin-card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">Total Value</p>
                <p className="text-2xl font-bold text-purple-400">${stats.totalValue.toLocaleString()}</p>
              </div>
              <DollarSign className="w-8 h-8 text-purple-400" />
            </div>
          </Card>

          <Card className="p-6 admin-card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">Completed Today</p>
                <p className="text-2xl font-bold text-yellow-400">{stats.completedToday}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-yellow-400" />
            </div>
          </Card>
        </div>

        {/* Live Matches Table */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Live Matches</h2>
            <div className="flex items-center space-x-2">
              <Eye className="w-5 h-5 text-text-muted" />
              <span className="text-sm text-text-muted">Real-time monitoring</span>
            </div>
          </div>

          {matches.length === 0 ? (
            <div className="text-center py-12">
              <Gamepad2 className="w-16 h-16 text-text-muted mx-auto mb-4" />
              <p className="text-text-muted text-lg">No active matches</p>
              <p className="text-text-muted text-sm mt-2">Check back later for live match data</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-3 px-4 text-text-muted font-medium">Match ID</th>
                    <th className="text-left py-3 px-4 text-text-muted font-medium">Game Type</th>
                    <th className="text-left py-3 px-4 text-text-muted font-medium">Status</th>
                    <th className="text-left py-3 px-4 text-text-muted font-medium">Players</th>
                    <th className="text-left py-3 px-4 text-text-muted font-medium">Value</th>
                    <th className="text-left py-3 px-4 text-text-muted font-medium">Duration</th>
                    <th className="text-left py-3 px-4 text-text-muted font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map((match) => (
                    <tr key={match.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                      <td className="py-3 px-4 font-mono text-sm text-text-primary">
                        {match.id?.substring(0, 8)}...
                      </td>
                      <td className="py-3 px-4 text-text-primary">
                        {match.gameType}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(match.status)}
                          <span className={getStatusColor(match.status)}>
                            {match.status}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-text-primary">
                        {match.player1?.substring(0, 8)}... vs {match.player2?.substring(0, 8)}...
                      </td>
                      <td className="py-3 px-4 text-text-primary">
                        ${match.stake?.toLocaleString() || 0}
                      </td>
                      <td className="py-3 px-4 text-text-primary">
                        {match.startTime ? new Date(match.startTime).toLocaleTimeString() : 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        <button className="text-blue-400 hover:text-blue-300 text-sm">
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
} 