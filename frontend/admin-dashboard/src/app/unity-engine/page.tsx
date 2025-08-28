'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { 
  Cpu, 
  MemoryStick, 
  Activity, 
  Gamepad2,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Zap,
  Monitor,
  Settings,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';
import { adminApi } from '@/services/api';
import Layout from '@/components/admin/Layout';

interface UnityInstance {
  id: string;
  gameType: string;
  status: 'running' | 'idle' | 'error' | 'starting';
  playersConnected: number;
  maxPlayers: number;
  cpuUsage: number;
  memoryUsage: number;
  uptime: number;
  fps: number;
  version: string;
  lastActivity: string;
  serverRegion: string;
}

interface UnityStats {
  totalInstances: number;
  activeInstances: number;
  totalPlayers: number;
  averageCpuUsage: number;
  averageMemoryUsage: number;
  averageFps: number;
  totalUptime: number;
  errorInstances: number;
}

interface EngineMetrics {
  timestamp: string;
  cpuUsage: number;
  memoryUsage: number;
  fps: number;
  activeConnections: number;
}

export default function UnityEnginePage() {
  const [instances, setInstances] = useState<UnityInstance[]>([]);
  const [stats, setStats] = useState<UnityStats>({
    totalInstances: 0,
    activeInstances: 0,
    totalPlayers: 0,
    averageCpuUsage: 0,
    averageMemoryUsage: 0,
    averageFps: 0,
    totalUptime: 0,
    errorInstances: 0
  });
  const [metrics, setMetrics] = useState<EngineMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInstance, setSelectedInstance] = useState<UnityInstance | null>(null);

  useEffect(() => {
    fetchUnityData();
    
    // Auto-refresh every 5 seconds for real-time monitoring
    const interval = setInterval(() => {
      fetchUnityData();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const fetchUnityData = async () => {
    try {
      const [instancesResponse, statsResponse, metricsResponse] = await Promise.all([
        adminApi.getUnityInstances(),
        adminApi.getUnityStats(),
        adminApi.getUnityMetrics()
      ]);

      setInstances((instancesResponse.data as any) || []);
      
      const statsData = statsResponse.data || {};
      setStats({
        totalInstances: (statsData as any).totalInstances || 0,
        activeInstances: (statsData as any).activeInstances || 0,
        totalPlayers: (statsData as any).totalUnityPlayers || 0,
        averageCpuUsage: (statsData as any).averageCpuUsage || 0,
        averageMemoryUsage: (statsData as any).averageMemoryUsage || 0,
        averageFps: (statsData as any).averageFps || 0,
        totalUptime: (statsData as any).totalUptime || 0,
        errorInstances: (statsData as any).errorInstances || 0
      });

      setMetrics((metricsResponse.data as any) || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching Unity data:', error);
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-green-400';
      case 'idle': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      case 'starting': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Play className="w-4 h-4 text-green-400" />;
      case 'idle': return <Pause className="w-4 h-4 text-yellow-400" />;
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case 'starting': return <RotateCcw className="w-4 h-4 text-blue-400 animate-spin" />;
      default: return <Monitor className="w-4 h-4 text-gray-400" />;
    }
  };

  const getPerformanceColor = (value: number, type: 'cpu' | 'memory' | 'fps') => {
    switch (type) {
      case 'cpu':
      case 'memory':
        if (value >= 80) return 'text-red-400';
        if (value >= 60) return 'text-yellow-400';
        return 'text-green-400';
      case 'fps':
        if (value >= 55) return 'text-green-400';
        if (value >= 30) return 'text-yellow-400';
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const handleRestartInstance = async (instanceId: string) => {
    try {
      await adminApi.restartUnityInstance(instanceId);
      fetchUnityData();
    } catch (error) {
      console.error('Error restarting instance:', error);
    }
  };

  const handleStopInstance = async (instanceId: string) => {
    try {
      await adminApi.stopUnityInstance(instanceId);
      fetchUnityData();
    } catch (error) {
      console.error('Error stopping instance:', error);
    }
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-purple-400">Unity Engine Monitor</h1>
            <p className="text-text-muted mt-1">Real-time engine performance and instance management</p>
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
            <h1 className="text-3xl font-bold text-purple-400">Unity Engine Monitor</h1>
            <p className="text-text-muted mt-1">Real-time engine performance and instance management</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse"></div>
            <span className="text-sm text-text-muted">Live monitoring</span>
          </div>
        </div>

        {/* Engine Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 admin-card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">Active Instances</p>
                <p className="text-2xl font-bold text-green-400">{stats.activeInstances}</p>
                <p className="text-sm text-text-muted">of {stats.totalInstances} total</p>
              </div>
              <Gamepad2 className="w-8 h-8 text-green-400" />
            </div>
          </Card>

          <Card className="p-6 admin-card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">Avg CPU Usage</p>
                <p className={`text-2xl font-bold ${getPerformanceColor(stats.averageCpuUsage, 'cpu')}`}>
                  {stats.averageCpuUsage.toFixed(1)}%
                </p>
              </div>
              <Cpu className="w-8 h-8 text-blue-400" />
            </div>
          </Card>

          <Card className="p-6 admin-card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">Avg Memory</p>
                <p className={`text-2xl font-bold ${getPerformanceColor(stats.averageMemoryUsage, 'memory')}`}>
                  {stats.averageMemoryUsage.toFixed(1)}%
                </p>
              </div>
              <MemoryStick className="w-8 h-8 text-purple-400" />
            </div>
          </Card>

          <Card className="p-6 admin-card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">Avg FPS</p>
                <p className={`text-2xl font-bold ${getPerformanceColor(stats.averageFps, 'fps')}`}>
                  {stats.averageFps.toFixed(0)}
                </p>
              </div>
              <Activity className="w-8 h-8 text-yellow-400" />
            </div>
          </Card>
        </div>

        {/* Unity Instances */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Unity Instances</h2>
              <Monitor className="w-5 h-5 text-text-muted" />
            </div>

            {instances.length === 0 ? (
              <div className="text-center py-12">
                <Gamepad2 className="w-16 h-16 text-text-muted mx-auto mb-4" />
                <p className="text-text-muted text-lg">No Unity instances</p>
                <p className="text-text-muted text-sm mt-2">Engine instances will appear here</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {instances.map((instance) => (
                  <div
                    key={instance.id}
                    className="p-4 rounded-lg border border-gray-700 bg-gray-800/50 hover:bg-gray-800 transition-colors cursor-pointer"
                    onClick={() => setSelectedInstance(instance)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        {getStatusIcon(instance.status)}
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold text-white capitalize">{instance.gameType}</h3>
                            <span className={`text-xs px-2 py-1 rounded-full bg-gray-700 ${getStatusColor(instance.status)}`}>
                              {instance.status}
                            </span>
                          </div>
                          <p className="text-sm text-text-muted mt-1">
                            {instance.playersConnected}/{instance.maxPlayers} players • {instance.serverRegion}
                          </p>
                          
                          <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                            <div>
                              <span className="text-text-muted">CPU:</span>
                              <span className={`ml-1 ${getPerformanceColor(instance.cpuUsage, 'cpu')}`}>
                                {instance.cpuUsage.toFixed(1)}%
                              </span>
                            </div>
                            <div>
                              <span className="text-text-muted">RAM:</span>
                              <span className={`ml-1 ${getPerformanceColor(instance.memoryUsage, 'memory')}`}>
                                {instance.memoryUsage.toFixed(1)}%
                              </span>
                            </div>
                            <div>
                              <span className="text-text-muted">FPS:</span>
                              <span className={`ml-1 ${getPerformanceColor(instance.fps, 'fps')}`}>
                                {instance.fps}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRestartInstance(instance.id);
                          }}
                          className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded"
                          title="Restart"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                        {instance.status === 'running' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStopInstance(instance.id);
                            }}
                            className="text-sm bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded"
                            title="Stop"
                          >
                            <Pause className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Instance Details */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">
                {selectedInstance ? `Instance Details` : 'Performance Overview'}
              </h2>
              <Settings className="w-5 h-5 text-text-muted" />
            </div>

            {!selectedInstance ? (
              <div className="space-y-6">
                <div className="text-center py-8">
                  <Cpu className="w-16 h-16 text-text-muted mx-auto mb-4" />
                  <p className="text-text-muted text-lg">Select an instance</p>
                  <p className="text-text-muted text-sm mt-2">Click on an instance to view detailed metrics</p>
                </div>
                
                {stats.errorInstances > 0 && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                      <div>
                        <p className="text-red-400 font-semibold">System Alert</p>
                        <p className="text-sm text-text-muted">
                          {stats.errorInstances} instance{stats.errorInstances > 1 ? 's' : ''} in error state
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Instance ID:</span>
                    <span className="text-white font-mono text-sm">{selectedInstance.id.substring(0, 8)}...</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Game Type:</span>
                    <span className="text-white capitalize">{selectedInstance.gameType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Version:</span>
                    <span className="text-white">v{selectedInstance.version}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Uptime:</span>
                    <span className="text-white">{formatUptime(selectedInstance.uptime)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Region:</span>
                    <span className="text-white">{selectedInstance.serverRegion}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Performance Metrics</h3>
                  
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-text-muted">CPU Usage</span>
                        <span className={`font-medium ${getPerformanceColor(selectedInstance.cpuUsage, 'cpu')}`}>
                          {selectedInstance.cpuUsage.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-700 rounded-full">
                        <div 
                          className={`h-full rounded-full ${
                            selectedInstance.cpuUsage >= 80 ? 'bg-red-400' :
                            selectedInstance.cpuUsage >= 60 ? 'bg-yellow-400' : 'bg-green-400'
                          }`}
                          style={{ width: `${selectedInstance.cpuUsage}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-text-muted">Memory Usage</span>
                        <span className={`font-medium ${getPerformanceColor(selectedInstance.memoryUsage, 'memory')}`}>
                          {selectedInstance.memoryUsage.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-700 rounded-full">
                        <div 
                          className={`h-full rounded-full ${
                            selectedInstance.memoryUsage >= 80 ? 'bg-red-400' :
                            selectedInstance.memoryUsage >= 60 ? 'bg-yellow-400' : 'bg-green-400'
                          }`}
                          style={{ width: `${selectedInstance.memoryUsage}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-text-muted">Frame Rate:</span>
                      <span className={`font-medium ${getPerformanceColor(selectedInstance.fps, 'fps')}`}>
                        {selectedInstance.fps} FPS
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-text-muted">Connected Players:</span>
                      <span className="text-blue-400 font-medium">
                        {selectedInstance.playersConnected}/{selectedInstance.maxPlayers}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-800">
                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleRestartInstance(selectedInstance.id)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium"
                    >
                      Restart Instance
                    </button>
                    {selectedInstance.status === 'running' && (
                      <button
                        onClick={() => handleStopInstance(selectedInstance.id)}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg font-medium"
                      >
                        Stop Instance
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </Layout>
  );
} 