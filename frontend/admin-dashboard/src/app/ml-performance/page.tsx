'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { 
  Cpu, 
  Zap, 
  TrendingUp, 
  Activity,
  BarChart3,
  Settings,
  Brain,
  Target
} from 'lucide-react';
import { adminApi } from '@/services/api';

export default function MLPerformancePage() {
  const [mlMetrics, setMLMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const response = await adminApi.getAIMetrics();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setMLMetrics(response.data as any);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching ML metrics:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-3xl font-bold text-cyan-400">ML Performance</h1>
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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-cyan-400">ML Performance</h1>
          <p className="text-text-muted mt-1">Machine learning model optimization and metrics</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 admin-card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">Model Latency</p>
              <p className="text-2xl font-bold text-green-400">{mlMetrics?.latency || '0ms'}</p>
            </div>
            <Zap className="w-8 h-8 text-green-400" />
          </div>
        </Card>

        <Card className="p-6 admin-card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">Throughput</p>
              <p className="text-2xl font-bold text-blue-400">{mlMetrics?.throughput || '0/sec'}</p>
            </div>
            <Activity className="w-8 h-8 text-blue-400" />
          </div>
        </Card>

        <Card className="p-6 admin-card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">CPU Usage</p>
              <p className="text-2xl font-bold text-yellow-400">{mlMetrics?.cpuUsage || '0%'}</p>
            </div>
            <Cpu className="w-8 h-8 text-yellow-400" />
          </div>
        </Card>

        <Card className="p-6 admin-card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">Accuracy</p>
              <p className="text-2xl font-bold text-purple-400">{mlMetrics?.accuracy || '0%'}</p>
            </div>
            <Target className="w-8 h-8 text-purple-400" />
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Model Performance</h2>
          <Brain className="w-5 h-5 text-text-muted" />
        </div>

        {mlMetrics?.models?.length > 0 ? (
          <div className="space-y-3">
            {mlMetrics.models.slice(0, 5).map((model: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Brain className="w-5 h-5 text-cyan-400" />
                  <div>
                    <p className="text-white font-medium">{model.name || 'ML Model'}</p>
                    <p className="text-text-muted text-sm">{model.type || 'Unknown type'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-text-muted text-sm">{model.accuracy || '0%'} accuracy</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    model.status === 'active' ? 'bg-green-500' : 
                    model.status === 'training' ? 'bg-blue-500' : 'bg-gray-500'
                  }`}>
                    {model.status || 'inactive'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Cpu className="w-16 h-16 text-text-muted mx-auto mb-4" />
            <p className="text-text-muted text-lg">ML performance metrics</p>
            <p className="text-text-muted text-sm mt-2">Optimization data will appear here</p>
          </div>
        )}
      </Card>
    </div>
  );
} 