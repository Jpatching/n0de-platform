'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Zap, Users, Clock, Wifi, WifiOff } from 'lucide-react';
import useWebSocket from '@/hooks/useWebSocket';
import api from '@/lib/api';

interface LiveMetricsProps {
  showTitle?: boolean;
  className?: string;
}

const LiveMetrics: React.FC<LiveMetricsProps> = ({ 
  showTitle = true, 
  className = '' 
}) => {
  const { isConnected, metrics, usage, requestMetrics, requestUsage } = useWebSocket();
  
  // Fallback to REST API if WebSocket not available
  const [fallbackData, setFallbackData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // If WebSocket is connected, request initial data
    if (isConnected) {
      requestMetrics();
      requestUsage();
      setIsLoading(false);
    } else {
      // Fallback to REST API
      loadFallbackData();
    }
  }, [isConnected]);

  const loadFallbackData = async () => {
    try {
      setIsLoading(true);
      const [healthData, usageData] = await Promise.all([
        api.get('/health'),
        api.get('/stats/usage').catch(() => null)
      ]);

      setFallbackData({
        health: healthData,
        usage: usageData
      });
    } catch (error) {
      console.error('Failed to load fallback data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh fallback data every 5 seconds if WebSocket not connected
  useEffect(() => {
    if (!isConnected) {
      const interval = setInterval(loadFallbackData, 5000);
      return () => clearInterval(interval);
    }
  }, [isConnected]);

  if (isLoading) {
    return (
      <div className={`bg-zinc-950/50 border border-zinc-800 rounded-lg p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-zinc-700 rounded w-1/3 mb-3"></div>
          <div className="space-y-2">
            <div className="h-3 bg-zinc-700 rounded w-full"></div>
            <div className="h-3 bg-zinc-700 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  // Use WebSocket data if available, otherwise fallback data
  const currentMetrics = metrics || {
    responseTime: fallbackData?.health?.responseTime ? parseInt(String(fallbackData.health.responseTime).replace('ms', '')) : 0,
    requestsPerSecond: 0,
    successRate: 100,
    activeConnections: 1,
    timestamp: Date.now()
  };

  const currentUsage = usage || fallbackData?.usage || {
    totalRequests: 0,
    requestsToday: 0,
    activeKeys: 0,
    avgLatency: 0,
    errorRate: 0,
    uptime: fallbackData?.health?.uptime || 100
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatUptime = (uptime: number) => {
    if (uptime > 100) {
      // Uptime is in seconds, convert to percentage-like display
      const hours = Math.floor(uptime / 3600);
      const days = Math.floor(hours / 24);
      if (days > 0) return `${days}d`;
      if (hours > 0) return `${hours}h`;
      return `${Math.floor(uptime / 60)}m`;
    }
    return `${uptime.toFixed(1)}%`;
  };

  return (
    <div className={`bg-zinc-950/50 border border-zinc-800 rounded-lg p-4 ${className}`}>
      {showTitle && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Activity className="h-5 w-5 text-cyan-400" />
            Live Metrics
          </h3>
          <div className="flex items-center gap-1">
            {isConnected ? (
              <Wifi className="h-4 w-4 text-green-400" />
            ) : (
              <WifiOff className="h-4 w-4 text-yellow-400" />
            )}
            <span className="text-xs text-zinc-400">
              {isConnected ? 'Live' : 'Polling'}
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="flex items-center justify-center mb-2">
            <Zap className="h-4 w-4 text-cyan-400 mr-1" />
          </div>
          <div className="text-xl font-bold text-white">
            {currentMetrics.responseTime}ms
          </div>
          <div className="text-xs text-zinc-400">Response Time</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center"
        >
          <div className="flex items-center justify-center mb-2">
            <Activity className="h-4 w-4 text-green-400 mr-1" />
          </div>
          <div className="text-xl font-bold text-white">
            {formatNumber(currentUsage.totalRequests)}
          </div>
          <div className="text-xs text-zinc-400">Total Requests</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center"
        >
          <div className="flex items-center justify-center mb-2">
            <Users className="h-4 w-4 text-blue-400 mr-1" />
          </div>
          <div className="text-xl font-bold text-white">
            {currentUsage.activeKeys}
          </div>
          <div className="text-xs text-zinc-400">Active Keys</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center"
        >
          <div className="flex items-center justify-center mb-2">
            <Clock className="h-4 w-4 text-purple-400 mr-1" />
          </div>
          <div className="text-xl font-bold text-white">
            {formatUptime(currentUsage.uptime)}
          </div>
          <div className="text-xs text-zinc-400">Uptime</div>
        </motion.div>
      </div>

      {/* Success rate indicator */}
      <div className="mt-4 pt-4 border-t border-zinc-800">
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-400">Success Rate</span>
          <span className="text-green-400 font-medium">
            {(100 - currentUsage.errorRate).toFixed(1)}%
          </span>
        </div>
        <div className="mt-2 w-full bg-zinc-800 rounded-full h-1">
          <div 
            className="bg-green-400 h-1 rounded-full transition-all duration-300"
            style={{ width: `${100 - currentUsage.errorRate}%` }}
          />
        </div>
      </div>

      {/* Last updated */}
      <div className="mt-3 text-xs text-zinc-500 text-center">
        Last updated: {new Date(currentMetrics.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
};

export default LiveMetrics;