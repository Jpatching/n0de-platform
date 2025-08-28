'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { 
  Bot, 
  Activity, 
  TrendingUp, 
  Zap,
  Settings,
  Eye,
  CheckCircle,
  AlertTriangle,
  Cpu,
  BarChart3,
  Brain,
  Users,
  DollarSign,
  Play,
  Pause
} from 'lucide-react';
import { adminApi } from '@/services/api';
import Layout from '@/components/admin/Layout';

interface BotMetrics {
  activeBots: number;
  totalMatches: number;
  totalEarnings: number;
  winRate: number;
  avgResponseTime: number;
  performance: string;
  bots?: BotStatus[];
}

interface BotStatus {
  id: string;
  name: string;
  status: string;
  winRate: number;
  earnings: number;
  lastActive: string;
}

interface BotStats {
  totalBots: number;
  activeBots: number;
  totalGamesPlayed: number;
  averageWinRate: number;
  totalEarnings: number;
  systemLoad: number;
}

export default function BotIntelligencePage() {
  const [botMetrics, setBotMetrics] = useState<BotMetrics | null>(null);
  const [stats, setStats] = useState<BotStats>({
    totalBots: 0,
    activeBots: 0,
    totalGamesPlayed: 0,
    averageWinRate: 0,
    totalEarnings: 0,
    systemLoad: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBotData();
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(() => {
      fetchBotData();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const fetchBotData = async () => {
    try {
      const botsResponse = await adminApi.getBotStatuses();
      setBotMetrics((botsResponse.data as any) || null);
      
      const statsResponse = await adminApi.getSystemStats();
      const data = statsResponse.data || {};
      setStats({
        totalBots: (data as any).totalBots || 0,
        activeBots: (data as any).activeBots || 0,
        totalGamesPlayed: (data as any).botGamesPlayed || 0,
        averageWinRate: (data as any).averageBotWinRate || 0,
        totalEarnings: (data as any).totalBotEarnings || 0,
        systemLoad: (data as any).systemLoad || 0
      });
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching bot data:', error);
      setLoading(false);
    }
  };

  const fetchBotMetrics = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getBotStatuses();
      const bots = response.data || [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setBotMetrics({ 
        totalBots: bots.length,
        activeBots: bots.filter((bot: any) => bot.isActive).length,
        totalEarnings: bots.reduce((sum: number, bot: any) => sum + (bot.totalEarnings || 0), 0),
        avgWinRate: bots.length > 0 ? bots.reduce((sum: number, bot: any) => sum + (bot.winRate || 0), 0) / bots.length : 0,
        bots: bots
      } as any);
    } catch (error) {
      console.error('Error fetching bot metrics:', error);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setBotMetrics({ totalBots: 0, activeBots: 0, totalEarnings: 0, avgWinRate: 0, bots: [] } as any);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-cyan-400">Bot Intelligence</h1>
            <p className="text-text-muted mt-1">AI bot monitoring and analytics</p>
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
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-cyan-400">Bot Intelligence</h1>
            <p className="text-text-muted mt-1">AI bot monitoring and analytics</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-cyan-400 rounded-full animate-pulse"></div>
            <span className="text-sm text-text-muted">AI systems online</span>
          </div>
        </div>

        {/* Bot Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 admin-card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">Total Bots</p>
                <p className="text-2xl font-bold text-cyan-400">{stats.totalBots}</p>
              </div>
              <Bot className="w-8 h-8 text-cyan-400" />
            </div>
          </Card>

          <Card className="p-6 admin-card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">Active Bots</p>
                <p className="text-2xl font-bold text-green-400">{stats.activeBots}</p>
              </div>
              <Activity className="w-8 h-8 text-green-400" />
            </div>
          </Card>

          <Card className="p-6 admin-card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">Avg Win Rate</p>
                <p className="text-2xl font-bold text-purple-400">{stats.averageWinRate.toFixed(1)}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-400" />
            </div>
          </Card>

          <Card className="p-6 admin-card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">System Load</p>
                <p className="text-2xl font-bold text-yellow-400">{stats.systemLoad}%</p>
              </div>
              <Cpu className="w-8 h-8 text-yellow-400" />
            </div>
          </Card>
        </div>

        {/* Bot Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {botMetrics?.bots?.length ? (
            <div className="space-y-3">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {botMetrics.bots.slice(0, 5).map((bot: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Brain className="w-5 h-5 text-purple-400" />
                    <div>
                      <p className="text-white font-medium">{bot.name || 'AI Bot'}</p>
                      <div className="flex items-center space-x-2 text-sm text-text-muted">
                        <TrendingUp className="w-4 h-4" />
                        <span>{bot.winRate || 0}% win rate</span>
                        <DollarSign className="w-4 h-4 ml-2" />
                        <span>${bot.totalEarnings || 0}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      bot.status === 'active' ? 'bg-green-500' : 
                      bot.status === 'paused' ? 'bg-yellow-500' : 'bg-gray-500'
                    }`}>
                      {bot.status || 'inactive'}
                    </span>
                    {bot.status === 'active' ? (
                      <button className="p-1 bg-yellow-600 hover:bg-yellow-700 rounded">
                        <Pause className="w-4 h-4" />
                      </button>
                    ) : (
                      <button className="p-1 bg-green-600 hover:bg-green-700 rounded">
                        <Play className="w-4 h-4" />
                      </button>
                    )}
                    <button className="p-1 bg-blue-600 hover:bg-blue-700 rounded">
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              
              {/* Bot Control Panel */}
              <div className="mt-6 p-4 bg-gray-800 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                  <Zap className="w-5 h-5 mr-2" />
                  Bot Management
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <button className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded flex items-center justify-center">
                    <Play className="w-4 h-4 mr-2" />
                    Start All
                  </button>
                  <button className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded flex items-center justify-center">
                    <Pause className="w-4 h-4 mr-2" />
                    Pause All
                  </button>
                  <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Analytics
                  </button>
                  <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded flex items-center justify-center">
                    <Zap className="w-4 h-4 mr-2" />
                    Optimize
                  </button>
                  <button className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded flex items-center justify-center">
                    <Settings className="w-4 h-4 mr-2" />
                    Configure
                  </button>
                  <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded flex items-center justify-center">
                    <Users className="w-4 h-4 mr-2" />
                    Deploy New
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="col-span-full text-center py-12">
              <Bot className="w-16 h-16 text-text-muted mx-auto mb-4" />
              <p className="text-text-muted text-lg">No bots configured</p>
              <p className="text-text-muted text-sm mt-2">Bot systems will appear here</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
} 