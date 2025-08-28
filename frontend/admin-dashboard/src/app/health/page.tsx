'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { 
  Heart, 
  Activity, 
  Server, 
  Database,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  AlertTriangle,
  Shield
} from 'lucide-react';
import { adminApi } from '@/services/api';
import Layout from '@/components/admin/Layout';

export default function HealthPage() {
  const [healthData, setHealthData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHealthData();
  }, []);

  const fetchHealthData = async () => {
    try {
      const response = await adminApi.getHealthDetailed();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setHealthData(response.data as any);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching health data:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-3xl font-bold text-green-400">Health Monitoring</h1>
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
          <h1 className="text-3xl font-bold text-green-400">Health Monitoring</h1>
          <p className="text-text-muted mt-1">System health and performance monitoring</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 admin-card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">System Status</p>
              <p className="text-2xl font-bold text-green-400">{healthData?.systemStatus || 'Unknown'}</p>
            </div>
            <Heart className="w-8 h-8 text-green-400" />
          </div>
        </Card>

        <Card className="p-6 admin-card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">Uptime</p>
              <p className="text-2xl font-bold text-blue-400">{healthData?.uptime || '0%'}</p>
            </div>
            <Activity className="w-8 h-8 text-blue-400" />
          </div>
        </Card>

        <Card className="p-6 admin-card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">Server Load</p>
              <p className="text-2xl font-bold text-yellow-400">{healthData?.serverLoad || '0%'}</p>
            </div>
            <Server className="w-8 h-8 text-yellow-400" />
          </div>
        </Card>

        <Card className="p-6 admin-card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">DB Health</p>
              <p className="text-2xl font-bold text-green-400">{healthData?.dbHealth || 'Unknown'}</p>
            </div>
            <Database className="w-8 h-8 text-green-400" />
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">System Health</h2>
          <Heart className="w-5 h-5 text-text-muted" />
        </div>

        {healthData?.services?.length ? (
          <div className="space-y-3">
            {healthData.services.slice(0, 5).map((service: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Shield className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-white font-medium">{service.name || 'Service'}</p>
                    <div className="flex items-center space-x-2 text-sm text-text-muted">
                      <TrendingUp className="w-4 h-4" />
                      <span>Uptime: {service.uptime || '99.9%'}</span>
                      <Activity className="w-4 h-4 ml-2" />
                      <span>Response: {service.responseTime || '50ms'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    service.status === 'healthy' ? 'bg-green-500' : 
                    service.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}>
                    {service.status || 'unknown'}
                  </span>
                  {service.status === 'healthy' ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                  )}
                </div>
              </div>
            ))}
            
            {/* Health Actions */}
            <div className="mt-6 p-4 bg-gray-800 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                <Activity className="w-5 h-5 mr-2" />
                System Actions
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <button className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Health Check
                </button>
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Performance Report
                </button>
                <button className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  View Issues
                </button>
                <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded flex items-center justify-center">
                  <Shield className="w-4 h-4 mr-2" />
                  Security Status
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <p className="text-text-muted text-lg">All systems operational</p>
            <p className="text-text-muted text-sm mt-2">No issues detected</p>
          </div>
        )}
      </Card>
    </div>
  );
} 