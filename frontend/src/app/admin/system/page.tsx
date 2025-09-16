'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Activity, 
  Server, 
  Shield,
  Zap,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  Database,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { toast } from 'sonner';

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'down';
  metrics: {
    totalUsers: number;
    activeSubscriptions: number;
    totalRequests24h: number;
    errorRate: number;
    averageLatency: number;
  };
  rpcNodes: Array<{
    id: string;
    name: string;
    region: string;
    isActive: boolean;
    avgLatency: number;
    uptime: number;
    currentRps: number;
    maxRps: number;
  }>;
  lastUpdated: string;
}

export default function AdminSystemPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!isLoading && (!user || user.role === 'USER')) {
      router.push('/dashboard');
      return;
    }

    if (user) {
      fetchSystemHealth();
      
      // Auto-refresh every 30 seconds
      const interval = setInterval(fetchSystemHealth, 30000);
      return () => clearInterval(interval);
    }
  }, [user, isLoading, router]);

  const fetchSystemHealth = async (manual = false) => {
    if (manual) setRefreshing(true);
    
    try {
      const data = await api.get('/admin/system/health');
      setSystemHealth(data);
    } catch (error) {
      console.error('Failed to fetch system health:', error);
      toast.error('Failed to load system health');
    } finally {
      setLoading(false);
      if (manual) setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchSystemHealth(true);
    toast.success('System health refreshed');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-500';
      case 'degraded':
        return 'text-yellow-500';
      case 'down':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'down':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getNodeStatusIcon = (isActive: boolean, uptime: number) => {
    if (!isActive) return <XCircle className="w-4 h-4 text-red-500" />;
    if (uptime >= 99.5) return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (uptime >= 95) return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    return <XCircle className="w-4 h-4 text-red-500" />;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatLatency = (ms: number) => {
    return `${ms.toFixed(1)}ms`;
  };

  const formatUptime = (uptime: number) => {
    return `${uptime.toFixed(2)}%`;
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-bg-main flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-n0de-green mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading system health...</p>
        </div>
      </div>
    );
  }

  if (!systemHealth) {
    return (
      <div className="min-h-screen bg-bg-main flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-text-secondary">Failed to load system health</p>
          <button onClick={() => fetchSystemHealth(true)} className="btn-primary mt-4">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-main">
      {/* Header */}
      <div className="bg-bg-elevated border-b border-border">
        <div className="container-width">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button onClick={() => router.push('/admin')} className="flex items-center space-x-2 text-text-secondary hover:text-text-primary">
                <Shield className="w-4 h-4" />
                <span>Admin</span>
              </button>
              <span className="text-text-muted">/</span>
              <h1 className="text-xl font-bold">System Health</h1>
            </div>
            
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center space-x-2 btn-secondary"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container-width py-8">
        {/* Overall Status */}
        <div className="card mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {getStatusIcon(systemHealth.status)}
              <div>
                <h2 className="text-2xl font-bold">System Status</h2>
                <p className={`text-lg font-medium ${getStatusColor(systemHealth.status)}`}>
                  {systemHealth.status.charAt(0).toUpperCase() + systemHealth.status.slice(1)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-text-secondary">Last Updated</div>
              <div className="font-medium">
                {new Date(systemHealth.lastUpdated).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          {/* Total Users */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-text-secondary">Total Users</h3>
              <Database className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-2xl font-bold mb-2">{formatNumber(systemHealth.metrics.totalUsers)}</div>
            <div className="text-sm text-text-secondary">Registered accounts</div>
          </div>

          {/* Active Subscriptions */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-text-secondary">Active Subs</h3>
              <Activity className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-2xl font-bold mb-2">{formatNumber(systemHealth.metrics.activeSubscriptions)}</div>
            <div className="text-sm text-text-secondary">Paying customers</div>
          </div>

          {/* 24h Requests */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-text-secondary">24h Requests</h3>
              <TrendingUp className="w-5 h-5 text-purple-500" />
            </div>
            <div className="text-2xl font-bold mb-2">{formatNumber(systemHealth.metrics.totalRequests24h)}</div>
            <div className="text-sm text-text-secondary">API calls today</div>
          </div>

          {/* Error Rate */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-text-secondary">Error Rate</h3>
              <AlertTriangle className="w-5 h-5 text-orange-500" />
            </div>
            <div className="text-2xl font-bold mb-2">{systemHealth.metrics.errorRate.toFixed(2)}%</div>
            <div className="text-sm text-text-secondary">Last 24 hours</div>
          </div>

          {/* Average Latency */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-text-secondary">Avg Latency</h3>
              <Zap className="w-5 h-5 text-yellow-500" />
            </div>
            <div className="text-2xl font-bold mb-2">{formatLatency(systemHealth.metrics.averageLatency)}</div>
            <div className="text-sm text-text-secondary">Response time</div>
          </div>
        </div>

        {/* RPC Nodes Status */}
        <div className="card mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold">RPC Nodes</h3>
            <div className="flex items-center space-x-2 text-sm text-text-secondary">
              <Server className="w-4 h-4" />
              <span>{systemHealth.rpcNodes.length} nodes</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {systemHealth.rpcNodes.map((node) => (
              <div key={node.id} className="p-4 bg-bg-main rounded-lg border border-border">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    {getNodeStatusIcon(node.isActive, node.uptime)}
                    <h4 className="font-semibold">{node.name}</h4>
                  </div>
                  <span className="px-2 py-1 bg-bg-elevated rounded text-xs font-medium">
                    {node.region}
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary">Status</span>
                    <span className={`text-sm font-medium ${node.isActive ? 'text-green-400' : 'text-red-400'}`}>
                      {node.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary">Uptime</span>
                    <span className="text-sm font-medium">{formatUptime(node.uptime)}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary">Latency</span>
                    <span className="text-sm font-medium">{formatLatency(node.avgLatency)}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary">Load</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">
                        {formatNumber(node.currentRps)}/{formatNumber(node.maxRps)} RPS
                      </span>
                      <div className="w-12 h-2 bg-bg-elevated rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-n0de-green transition-all duration-300"
                          style={{ width: `${Math.min((node.currentRps / node.maxRps) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Components */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* API Service */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold">API Service</h4>
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Status</span>
                <span className="text-green-400 font-medium">Healthy</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Uptime</span>
                <span className="font-medium">99.9%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Response</span>
                <span className="font-medium">{formatLatency(systemHealth.metrics.averageLatency)}</span>
              </div>
            </div>
          </div>

          {/* Database */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold">Database</h4>
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Status</span>
                <span className="text-green-400 font-medium">Healthy</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Connections</span>
                <span className="font-medium">12/100</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Query Time</span>
                <span className="font-medium">2.1ms</span>
              </div>
            </div>
          </div>

          {/* Payment System */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold">Payment System</h4>
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Coinbase</span>
                <span className="text-green-400 font-medium">Online</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">NOWPayments</span>
                <span className="text-green-400 font-medium">Online</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Webhooks</span>
                <span className="text-green-400 font-medium">Active</span>
              </div>
            </div>
          </div>

          {/* CDN */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold">CDN</h4>
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Status</span>
                <span className="text-green-400 font-medium">Healthy</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Hit Rate</span>
                <span className="font-medium">98.2%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Edge Locations</span>
                <span className="font-medium">Global</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}