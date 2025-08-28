'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { 
  TrendingUp, 
  Brain, 
  Target, 
  Activity,
  BarChart3,
  Zap,
  Users,
  DollarSign
} from 'lucide-react';
import { adminApi } from '@/services/api';

interface PredictiveModel {
  id: string;
  name: string;
  type: string;
  accuracy: number;
  status: 'active' | 'training' | 'inactive';
  lastTrained: string;
  predictions: number;
}

export default function PredictivePage() {
  const [aiMetrics, setAiMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAIMetrics();
  }, []);

  const fetchAIMetrics = async () => {
    try {
      const response = await adminApi.getAIMetrics();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setAiMetrics(response.data as any);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching AI metrics:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-3xl font-bold text-purple-400">Predictive Analytics</h1>
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
          <h1 className="text-3xl font-bold text-purple-400">Predictive Analytics</h1>
          <p className="text-text-muted mt-1">Machine learning models and prediction monitoring</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 admin-card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">Active Models</p>
              <p className="text-2xl font-bold text-purple-400">{aiMetrics?.activeModels || 0}</p>
            </div>
            <Brain className="w-8 h-8 text-purple-400" />
          </div>
        </Card>

        <Card className="p-6 admin-card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">Avg Accuracy</p>
              <p className="text-2xl font-bold text-green-400">{aiMetrics?.avgAccuracy || '0'}%</p>
            </div>
            <Target className="w-8 h-8 text-green-400" />
          </div>
        </Card>

        <Card className="p-6 admin-card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">Predictions Today</p>
              <p className="text-2xl font-bold text-blue-400">{aiMetrics?.predictionsToday || 0}</p>
            </div>
            <Activity className="w-8 h-8 text-blue-400" />
          </div>
        </Card>

        <Card className="p-6 admin-card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">Model Performance</p>
              <p className="text-2xl font-bold text-yellow-400">{aiMetrics?.performance || 'N/A'}</p>
            </div>
            <BarChart3 className="w-8 h-8 text-yellow-400" />
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">ML Models</h2>
          <Brain className="w-5 h-5 text-text-muted" />
        </div>

        <div className="text-center py-12">
          <Brain className="w-16 h-16 text-text-muted mx-auto mb-4" />
          <p className="text-text-muted text-lg">Predictive models loading</p>
          <p className="text-text-muted text-sm mt-2">ML analytics will appear here</p>
        </div>
      </Card>
    </div>
  );
} 