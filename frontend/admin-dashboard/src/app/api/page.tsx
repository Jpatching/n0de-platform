'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { 
  Code, 
  Activity, 
  Shield, 
  Clock,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Zap
} from 'lucide-react';
import { adminApi } from '@/services/api';

interface ApiStats {
  status: string;
  requestsPerMin: number;
  avgResponse: string;
  rateLimits: string;
  endpoints?: ApiEndpoint[];
}

interface ApiEndpoint {
  path: string;
  method: string;
  requests: number;
  status: string;
}

export default function APIPage() {
  const [apiStats, setApiStats] = useState<ApiStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApiStats();
  }, []);

  const fetchApiStats = async () => {
    try {
      const response = await adminApi.getAPIStats();
      setApiStats(response.data as ApiStats);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching API stats:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-3xl font-bold text-cyan-400">API Management</h1>
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
          <h1 className="text-3xl font-bold text-cyan-400">API Management</h1>
          <p className="text-text-muted mt-1">API monitoring and rate limiting controls</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 admin-card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">API Status</p>
              <p className="text-2xl font-bold text-green-400">{apiStats?.status || 'Unknown'}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </Card>

        <Card className="p-6 admin-card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">Requests/min</p>
              <p className="text-2xl font-bold text-blue-400">{apiStats?.requestsPerMin || 0}</p>
            </div>
            <Activity className="w-8 h-8 text-blue-400" />
          </div>
        </Card>

        <Card className="p-6 admin-card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">Avg Response</p>
              <p className="text-2xl font-bold text-yellow-400">{apiStats?.avgResponse || '0ms'}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-400" />
          </div>
        </Card>

        <Card className="p-6 admin-card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">Rate Limits</p>
              <p className="text-2xl font-bold text-purple-400">{apiStats?.rateLimits || 'Unknown'}</p>
            </div>
            <Shield className="w-8 h-8 text-purple-400" />
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">API Analytics</h2>
          <Code className="w-5 h-5 text-text-muted" />
        </div>

        {apiStats?.endpoints?.length ? (
          <div className="space-y-3">
            {apiStats.endpoints.slice(0, 5).map((endpoint: ApiEndpoint, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Code className="w-5 h-5 text-cyan-400" />
                  <div>
                    <p className="text-white font-medium">{endpoint.path || 'API Endpoint'}</p>
                    <p className="text-text-muted text-sm">{endpoint.method || 'GET'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-text-muted text-sm">{endpoint.requests || 0} requests</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    endpoint.status === 'healthy' ? 'bg-green-500' : 
                    endpoint.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}>
                    {endpoint.status || 'unknown'}
                  </span>
                  {endpoint.status === 'warning' && (
                    <AlertTriangle className="w-4 h-4 text-yellow-400" />
                  )}
                </div>
              </div>
            ))}
            
            {/* API Performance Tools */}
            <div className="mt-6 p-4 bg-gray-800 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                <Zap className="w-5 h-5 mr-2" />
                Performance Tools
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded flex items-center justify-center">
                  <Zap className="w-4 h-4 mr-2" />
                  Optimize Routes
                </button>
                <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  View Analytics
                </button>
                <button className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Check Issues
                </button>
                <button className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded flex items-center justify-center">
                  <Shield className="w-4 h-4 mr-2" />
                  Security Scan
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <BarChart3 className="w-16 h-16 text-text-muted mx-auto mb-4" />
            <p className="text-text-muted text-lg">API performance metrics</p>
            <p className="text-text-muted text-sm mt-2">Real-time monitoring active</p>
          </div>
        )}
      </Card>
    </div>
  );
} 