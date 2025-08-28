'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { 
  Shield, 
  AlertTriangle, 
  Eye, 
  Ban, 
  TrendingUp,
  Users,
  Activity,
  Clock,
  MapPin,
  Wifi,
  Zap,
  Lock,
  UserX,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { adminApi } from '@/services/api';
import Layout from '@/components/admin/Layout';

interface SecurityAlert {
  id: string;
  type: 'suspicious_activity' | 'failed_login' | 'bot_detection' | 'fraud_attempt';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  userWallet?: string;
  timestamp: string;
  status: 'active' | 'acknowledged' | 'resolved';
  details?: Record<string, any>;
}

interface SecurityStats {
  totalAlerts: number;
  activeThreats: number;
  blockedAttempts: number;
  suspiciousUsers: number;
  failedLogins: number;
  botDetections: number;
}

export default function SecurityPage() {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [stats, setStats] = useState<SecurityStats>({
    totalAlerts: 0,
    activeThreats: 0,
    blockedAttempts: 0,
    suspiciousUsers: 0,
    failedLogins: 0,
    botDetections: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSecurityData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchSecurityData();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchSecurityData = async () => {
    try {
      const alertsResponse = await adminApi.getSecurityAlerts();
      setAlerts((alertsResponse.data as any)?.items || (alertsResponse.data as any) || []);
      
      const statsResponse = await adminApi.getSystemStats();
      const data = statsResponse.data || {};
      setStats({
        totalAlerts: (data as any).totalSecurityAlerts || 0,
        activeThreats: (data as any).activeThreats || 0,
        blockedAttempts: (data as any).blockedAttempts || 0,
        suspiciousUsers: (data as any).suspiciousUsers || 0,
        failedLogins: (data as any).failedLogins || 0,
        botDetections: (data as any).botDetections || 0
      });
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching security data:', error);
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-500 bg-red-500/10 border-red-500';
      case 'high': return 'text-orange-500 bg-orange-500/10 border-orange-500';
      case 'medium': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500';
      case 'low': return 'text-green-500 bg-green-500/10 border-green-500';
      default: return 'text-gray-500 bg-gray-500/10 border-gray-500';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'suspicious_activity': return <Eye className="w-4 h-4" />;
      case 'failed_login': return <Lock className="w-4 h-4" />;
      case 'bot_detection': return <Activity className="w-4 h-4" />;
      case 'fraud_attempt': return <Ban className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await adminApi.acknowledgeAlert(alertId);
      fetchSecurityData();
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold security-pulse-text">Security & Threat Detection</h1>
              <p className="text-text-muted mt-1">Monitor threats and security alerts</p>
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
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold security-pulse-text">Security & Threat Detection</h1>
            <p className="text-text-muted mt-1">Monitor threats and security alerts</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse"></div>
            <span className="text-sm text-text-muted">Real-time monitoring</span>
          </div>
        </div>

        {/* Security Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 admin-card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">Active Threats</p>
                <p className="text-2xl font-bold text-red-400">{stats.activeThreats}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
          </Card>

          <Card className="p-6 admin-card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">Blocked Attempts</p>
                <p className="text-2xl font-bold text-orange-400">{stats.blockedAttempts}</p>
              </div>
              <Ban className="w-8 h-8 text-orange-400" />
            </div>
          </Card>

          <Card className="p-6 admin-card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">Suspicious Users</p>
                <p className="text-2xl font-bold text-yellow-400">{stats.suspiciousUsers}</p>
              </div>
              <Users className="w-8 h-8 text-yellow-400" />
            </div>
          </Card>

          <Card className="p-6 admin-card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">Bot Detections</p>
                <p className="text-2xl font-bold text-purple-400">{stats.botDetections}</p>
              </div>
              <Activity className="w-8 h-8 text-purple-400" />
            </div>
          </Card>
        </div>

        {/* Security Alerts */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Security Alerts</h2>
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-text-muted" />
              <span className="text-sm text-text-muted">Live monitoring</span>
            </div>
          </div>

          {alerts.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="w-16 h-16 text-text-muted mx-auto mb-4" />
              <p className="text-text-muted text-lg">No security alerts</p>
              <p className="text-text-muted text-sm mt-2">Your platform is secure</p>
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border ${getSeverityColor(alert.severity)} ${
                    alert.status === 'active' ? 'animate-pulse' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      {getAlertIcon(alert.type)}
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold text-white">{alert.message}</h3>
                          <span className={`text-xs px-2 py-1 rounded-full ${getSeverityColor(alert.severity)}`}>
                            {alert.severity.toUpperCase()}
                          </span>
                        </div>
                        {alert.userWallet && (
                          <p className="text-sm text-text-muted mt-1">
                            User: {alert.userWallet.substring(0, 8)}...
                          </p>
                        )}
                        <div className="flex items-center space-x-4 mt-2 text-sm text-text-muted">
                          <div className="flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span>{new Date(alert.timestamp).toLocaleString()}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Zap className="w-4 h-4" />
                            <span className="capitalize">{alert.type.replace('_', ' ')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {alert.status === 'active' && (
                        <button
                          onClick={() => handleAcknowledgeAlert(alert.id)}
                          className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded transition-colors"
                        >
                          Acknowledge
                        </button>
                      )}
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        alert.status === 'active' ? 'bg-red-500/20 text-red-400' :
                        alert.status === 'acknowledged' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        {alert.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
} 