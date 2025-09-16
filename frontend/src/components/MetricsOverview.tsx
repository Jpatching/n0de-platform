'use client';

import { motion } from 'framer-motion';
import { 
  Activity, 
  Gauge, 
  Shield, 
  Key, 
  RefreshCw, 
  Download,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface MetricsData {
  totalRequests: number;
  avgLatency: number;
  uptime: number;
  activeKeys: number;
  activeEndpoints: number;
  throughput: number;
  errorRate: number;
  successRate: number;
}

interface UsageData {
  time: string;
  requests: number;
  latency: number;
  errorRate: number;
  throughput: number;
}

interface MetricsOverviewProps {
  currentStats: MetricsData;
  usageData: UsageData[];
  isLoadingMetrics?: boolean;
}

export default function MetricsOverview({ 
  currentStats, 
  usageData, 
  isLoadingMetrics = false 
}: MetricsOverviewProps) {
  const keyMetrics = [
    { 
      title: 'Total Requests', 
      value: currentStats.totalRequests.toLocaleString(),
      change: currentStats.totalRequests > 0 ? 'Active' : 'No data',
      icon: Activity,
      color: 'n0de-green'
    },
    { 
      title: 'Avg Latency', 
      value: `${currentStats.avgLatency}ms`,
      change: currentStats.avgLatency > 0 ? 'Live' : 'No data',
      icon: Gauge,
      color: 'n0de-blue'
    },
    { 
      title: 'Uptime', 
      value: `${currentStats.uptime}%`,
      change: currentStats.uptime > 0 ? 'Operational' : 'No data',
      icon: Shield,
      color: 'n0de-purple'
    },
    { 
      title: 'Active Keys', 
      value: currentStats.activeKeys.toString(),
      change: `${currentStats.activeEndpoints} endpoints`,
      icon: Key,
      color: 'n0de-cyan'
    }
  ];

  const performanceMetrics = [
    { 
      label: 'Throughput', 
      value: `${currentStats.throughput.toLocaleString()}+ RPS`, 
      color: 'n0de-green' 
    },
    { 
      label: 'Error Rate', 
      value: `${currentStats.errorRate}%`, 
      color: 'n0de-green' 
    },
    { 
      label: 'P99 Latency', 
      value: '<2ms', 
      color: 'n0de-blue' 
    },
    { 
      label: 'Success Rate', 
      value: `${currentStats.successRate}%`, 
      color: 'n0de-green' 
    }
  ];

  if (isLoadingMetrics) {
    return (
      <div className="space-y-8">
        {/* Loading State */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-6 bg-bg-main rounded mb-4"></div>
              <div className="h-8 bg-bg-main rounded mb-2"></div>
              <div className="h-4 bg-bg-main rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {keyMetrics.map((metric, index) => (
          <motion.div
            key={metric.title}
            className="card group cursor-pointer"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -5, scale: 1.02 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-text-secondary">{metric.title}</h3>
              <metric.icon className={`w-5 h-5 text-${metric.color}`} />
            </div>
            <div className="text-3xl font-bold gradient-text mb-2">
              {metric.value}
            </div>
            <div className={`text-sm text-${metric.color}`}>
              {metric.change}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Request Volume Chart */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold">Request Volume (24h)</h3>
            <div className="flex items-center space-x-4">
              <button className="p-2 hover:bg-bg-hover rounded-lg">
                <RefreshCw className="w-4 h-4" />
              </button>
              <button className="p-2 hover:bg-bg-hover rounded-lg">
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={usageData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2B2B2B" />
                <XAxis dataKey="time" stroke="#808080" />
                <YAxis stroke="#808080" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1A1A1A', 
                    border: '1px solid #2B2B2B',
                    borderRadius: '8px'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="requests" 
                  stroke="#00FF88" 
                  fill="#00FF88"
                  fillOpacity={0.2}
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold">Performance Overview</h3>
            <select className="bg-bg-main border border-border rounded-lg px-3 py-1 text-sm">
              <option>Last 24h</option>
              <option>Last 7d</option>
              <option>Last 30d</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {performanceMetrics.map((item) => (
              <div key={item.label} className="text-center p-4 bg-bg-main rounded-lg">
                <div className={`text-2xl font-bold text-${item.color} mb-1`}>
                  {item.value}
                </div>
                <div className="text-sm text-text-secondary">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}