'use client';

// Fraud Detection Page - Admin Dashboard
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
// Import all required icons for fraud detection
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Clock,
  Eye,
  DollarSign,
  Search
} from 'lucide-react';
import { adminApi } from '@/services/api';

// Fraud Detection Page Component
export default function FraudPage() {
  const [fraudData, setFraudData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchFraudData = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getSecurityAlerts();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setFraudData({
        alerts: response.data?.data || [],
        totalAlerts: response.data?.total || 0,
        activeAlerts: response.data?.data?.filter((alert: any) => !alert.acknowledged).length || 0,
        resolvedAlerts: response.data?.data?.filter((alert: any) => alert.acknowledged).length || 0
      } as any);
    } catch (error) {
      console.error('Error fetching fraud data:', error);
      setFraudData({ alerts: [], totalAlerts: 0, activeAlerts: 0, resolvedAlerts: 0 });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-3xl font-bold text-red-400">Fraud Detection</h1>
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
          <h1 className="text-3xl font-bold text-red-400">Fraud Detection</h1>
          <p className="text-text-muted mt-1">Real-time fraud monitoring and investigation</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 admin-card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">Active Alerts</p>
              <p className="text-2xl font-bold text-red-400">{fraudData?.activeAlerts || 0}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
        </Card>

        <Card className="p-6 admin-card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">Total Alerts</p>
              <p className="text-2xl font-bold text-green-400">{fraudData?.totalAlerts || 0}</p>
            </div>
            <Shield className="w-8 h-8 text-green-400" />
          </div>
        </Card>

        <Card className="p-6 admin-card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">High Priority</p>
              <p className="text-2xl font-bold text-yellow-400">{fraudData?.highPriorityAlerts || 0}</p>
            </div>
            <DollarSign className="w-8 h-8 text-yellow-400" />
          </div>
        </Card>

        <Card className="p-6 admin-card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">Resolved</p>
              <p className="text-2xl font-bold text-blue-400">{fraudData?.resolvedAlerts || 0}</p>
            </div>
            <Search className="w-8 h-8 text-blue-400" />
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Security Alerts</h2>
          <Eye className="w-5 h-5 text-text-muted" />
        </div>

        {fraudData?.alerts?.length > 0 ? (
          <div className="space-y-3">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {fraudData.alerts.slice(0, 5).map((alert: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  <div>
                    <p className="text-white font-medium">{alert.type || 'Security Alert'}</p>
                    <p className="text-text-muted text-sm">{alert.message || 'Alert details'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    alert.severity === 'high' ? 'bg-red-500' : 
                    alert.severity === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                  }`}>
                    {alert.severity || 'low'}
                  </span>
                  <span className="text-text-muted text-sm">{alert.timestamp || new Date().toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Shield className="w-16 h-16 text-text-muted mx-auto mb-4" />
            <p className="text-text-muted text-lg">No security alerts</p>
            <p className="text-text-muted text-sm mt-2">System is secure</p>
          </div>
        )}
      </Card>
    </div>
  );
} 