'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/layouts/AppLayout';
import LiveMetrics from '@/components/LiveMetrics';
import api from '@/lib/api';
import { toast } from 'sonner';
import { 
  Key,
  Activity,
  TrendingUp,
  Clock,
  RefreshCw,
  ExternalLink,
  ArrowUpRight,
  BarChart3,
  Globe,
  Zap,
  Shield,
  Calendar
} from 'lucide-react';

interface DashboardStats {
  totalApiKeys: number;
  activeApiKeys: number;
  totalRequests: number;
  requestsToday: number;
  avgLatency: number;
  successRate: number;
  uptime: number;
}

interface RecentActivity {
  id: string;
  type: 'api_key_created' | 'api_request' | 'subscription_changed';
  description: string;
  timestamp: string;
}

const AppOverview = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalApiKeys: 0,
    activeApiKeys: 0,
    totalRequests: 0,
    requestsToday: 0,
    avgLatency: 0,
    successRate: 100,
    uptime: 100
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Load API keys for stats
      const apiKeys = await api.get('/api-keys').catch(() => []);
      
      // Load usage statistics
      const usage = await api.get('/stats/usage').catch(() => ({
        totalRequests: 0,
        requestsToday: 0,
        avgLatency: 0,
        errorRate: 0,
        uptime: 100,
        activeKeys: 0
      }));

      setStats({
        totalApiKeys: Array.isArray(apiKeys) ? apiKeys.length : 0,
        activeApiKeys: Array.isArray(apiKeys) ? apiKeys.filter((key: any) => key.isActive).length : 0,
        totalRequests: usage.totalRequests || 0,
        requestsToday: usage.requestsToday || 0,
        avgLatency: usage.avgLatency || 0,
        successRate: 100 - (usage.errorRate || 0),
        uptime: usage.uptime || 100
      });

      // Load real recent activity from backend
      try {
        const activity = await api.get('/stats/recent-activity').catch(() => []);
        if (Array.isArray(activity)) {
          setRecentActivity(activity);
        } else if (Array.isArray(apiKeys) && apiKeys.length > 0) {
          // Fallback: create activity from API key usage if backend endpoint doesn't exist
          const activities = apiKeys
            .filter((key: any) => key.lastUsedAt)
            .slice(0, 5)
            .map((key: any) => ({
              id: key.id,
              type: 'api_request' as const,
              description: `API request made with key "${key.name}"`,
              timestamp: key.lastUsedAt
            }));
          
          setRecentActivity(activities);
        }
      } catch (error) {
        console.error('Failed to load recent activity:', error);
      }

    } catch (error: any) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="min-h-full bg-black p-6">
          {/* Header */}
          <div className="mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between"
            >
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  Welcome back, {user?.firstName || user?.email?.split('@')[0] || 'Developer'}
                </h1>
                <p className="text-zinc-400">
                  Here's what's happening with your n0de infrastructure today.
                </p>
              </div>
              <button 
                onClick={loadDashboardData}
                disabled={isLoading}
                className="flex items-center space-x-2 px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </motion.div>
          </div>

          {/* Live Metrics */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <LiveMetrics />
          </motion.div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-cyan-500/10 rounded-lg">
                  <Key className="h-6 w-6 text-cyan-400" />
                </div>
                <span className="text-xs text-zinc-500">API Keys</span>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-white">{stats.activeApiKeys}</p>
                <p className="text-sm text-zinc-400">of {stats.totalApiKeys} total</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Activity className="h-6 w-6 text-green-400" />
                </div>
                <span className="text-xs text-zinc-500">Requests</span>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-white">{formatNumber(stats.totalRequests)}</p>
                <p className="text-sm text-zinc-400">{formatNumber(stats.requestsToday)} today</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Zap className="h-6 w-6 text-blue-400" />
                </div>
                <span className="text-xs text-zinc-500">Performance</span>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-white">{stats.avgLatency}ms</p>
                <p className="text-sm text-zinc-400">{stats.successRate.toFixed(1)}% success</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Shield className="h-6 w-6 text-purple-400" />
                </div>
                <span className="text-xs text-zinc-500">Uptime</span>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-white">
                  {stats.uptime > 100 ? '100%' : `${stats.uptime.toFixed(2)}%`}
                </p>
                <p className="text-sm text-zinc-400">Last 30 days</p>
              </div>
            </motion.div>
          </div>

          {/* Recent Activity & Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Activity */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-zinc-950/50 border border-zinc-800 rounded-lg"
            >
              <div className="p-6 border-b border-zinc-800">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Clock className="h-5 w-5 text-cyan-400" />
                  Recent Activity
                </h3>
              </div>
              <div className="p-6">
                {recentActivity.length > 0 ? (
                  <div className="space-y-4">
                    {recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-start space-x-3">
                        <div className="p-1 bg-zinc-800 rounded-full">
                          <Activity className="h-3 w-3 text-cyan-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-white">{activity.description}</p>
                          <p className="text-xs text-zinc-400">
                            {formatTimeAgo(activity.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Activity className="h-8 w-8 text-zinc-600 mx-auto mb-3" />
                    <p className="text-zinc-400">No recent activity</p>
                    <p className="text-sm text-zinc-500">Activity will appear here once you start using your API keys</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="bg-zinc-950/50 border border-zinc-800 rounded-lg"
            >
              <div className="p-6 border-b border-zinc-800">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Zap className="h-5 w-5 text-cyan-400" />
                  Quick Actions
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <a
                  href="/dashboard/api-keys"
                  className="flex items-center justify-between p-4 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg transition-colors group"
                >
                  <div className="flex items-center space-x-3">
                    <Key className="h-5 w-5 text-cyan-400" />
                    <div>
                      <p className="text-white font-medium">Manage API Keys</p>
                      <p className="text-sm text-zinc-400">Create, view, and manage your API keys</p>
                    </div>
                  </div>
                  <ArrowUpRight className="h-5 w-5 text-zinc-400 group-hover:text-cyan-400 transition-colors" />
                </a>

                <a
                  href="/dashboard/analytics"
                  className="flex items-center justify-between p-4 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg transition-colors group"
                >
                  <div className="flex items-center space-x-3">
                    <BarChart3 className="h-5 w-5 text-green-400" />
                    <div>
                      <p className="text-white font-medium">View Analytics</p>
                      <p className="text-sm text-zinc-400">Detailed usage and performance metrics</p>
                    </div>
                  </div>
                  <ArrowUpRight className="h-5 w-5 text-zinc-400 group-hover:text-green-400 transition-colors" />
                </a>

                <a
                  href="/subscription"
                  className="flex items-center justify-between p-4 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg transition-colors group"
                >
                  <div className="flex items-center space-x-3">
                    <TrendingUp className="h-5 w-5 text-blue-400" />
                    <div>
                      <p className="text-white font-medium">Upgrade Plan</p>
                      <p className="text-sm text-zinc-400">Scale your usage with higher limits</p>
                    </div>
                  </div>
                  <ArrowUpRight className="h-5 w-5 text-zinc-400 group-hover:text-blue-400 transition-colors" />
                </a>

                <a
                  href="https://docs.n0de.pro"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg transition-colors group"
                >
                  <div className="flex items-center space-x-3">
                    <Globe className="h-5 w-5 text-purple-400" />
                    <div>
                      <p className="text-white font-medium">API Documentation</p>
                      <p className="text-sm text-zinc-400">Learn how to integrate n0de RPC</p>
                    </div>
                  </div>
                  <ExternalLink className="h-5 w-5 text-zinc-400 group-hover:text-purple-400 transition-colors" />
                </a>
              </div>
            </motion.div>
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
};

export default AppOverview;