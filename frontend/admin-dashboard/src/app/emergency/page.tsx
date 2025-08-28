'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { 
  AlertTriangle, 
  Play, 
  Pause, 
  Activity,
  Zap
} from 'lucide-react';
import { adminApi } from '@/services/api';
import Layout from '@/components/admin/Layout';

interface EmergencyStatus {
  status: string;
  message: string;
  timestamp: string;
  lastAction?: string;
}

export default function EmergencyPage() {
  const [emergencyStatus, setEmergencyStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmergencyStatus();
    
    const interval = setInterval(() => {
      fetchEmergencyStatus();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const fetchEmergencyStatus = async () => {
    try {
      const response = await adminApi.getEmergencyStatus();
      setEmergencyStatus((response.data as any) || null);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching emergency status:', error);
      setLoading(false);
    }
  };

  const handleEmergencyAction = async (action: string) => {
    try {
      let response;
      switch (action) {
        case 'shutdown':
          response = await adminApi.triggerEmergencyShutdown('Emergency shutdown initiated');
          break;
        case 'pause':
          response = await adminApi.emergencyPauseAllGames();
          break;
        case 'resume':
          response = await adminApi.emergencyResumeAllGames();
          break;
        default:
          response = await adminApi.getEmergencyStatus();
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setEmergencyStatus(response.data as any);
    } catch (error) {
      console.error('Error executing emergency action:', error);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-red-400">Emergency Controls</h1>
              <p className="text-text-muted mt-1">Critical system controls and emergency procedures</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
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
            <h1 className="text-3xl font-bold text-red-400">Emergency Controls</h1>
            <p className="text-text-muted mt-1">Critical system controls and emergency procedures</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse"></div>
            <span className="text-sm text-text-muted">Emergency monitoring active</span>
          </div>
        </div>

        {/* Current Status */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Emergency Controls</h2>
            <AlertTriangle className="w-5 h-5 text-text-muted" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => handleEmergencyAction('shutdown')}
              className="p-4 bg-red-600 hover:bg-red-700 rounded-lg flex items-center justify-center space-x-2 transition-colors"
            >
              <AlertTriangle className="w-5 h-5" />
              <span>Emergency Shutdown</span>
            </button>
            
            <button 
              onClick={() => handleEmergencyAction('pause')}
              className="p-4 bg-yellow-600 hover:bg-yellow-700 rounded-lg flex items-center justify-center space-x-2 transition-colors"
            >
              <Pause className="w-5 h-5" />
              <span>Pause All Games</span>
            </button>
            
            <button 
              onClick={() => handleEmergencyAction('resume')}
              className="p-4 bg-green-600 hover:bg-green-700 rounded-lg flex items-center justify-center space-x-2 transition-colors"
            >
              <Play className="w-5 h-5" />
              <span>Resume Operations</span>
            </button>
            
            <button 
              onClick={() => handleEmergencyAction('boost')}
              className="p-4 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center justify-center space-x-2 transition-colors"
            >
              <Zap className="w-5 h-5" />
              <span>Performance Boost</span>
            </button>
          </div>
          
          {emergencyStatus && (
            <div className="mt-6 p-4 bg-gray-800 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-2 flex items-center">
                <Activity className="w-5 h-5 mr-2" />
                System Status
              </h3>
              <p className="text-text-muted">Status: {emergencyStatus.status || 'Unknown'}</p>
              <p className="text-text-muted">Last Action: {emergencyStatus.lastAction || 'None'}</p>
            </div>
          )}
        </Card>

        {/* Emergency Procedures */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Emergency Procedures</h2>
            <AlertTriangle className="w-6 h-6 text-text-muted" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-yellow-400">⚠️ When to Use Emergency Controls</h3>
              <ul className="space-y-2 text-sm text-text-muted">
                <li>• Security breach or suspected attack</li>
                <li>• Critical system vulnerabilities discovered</li>
                <li>• Database corruption or data integrity issues</li>
                <li>• Solana network instability affecting payouts</li>
                <li>• Widespread game manipulation detected</li>
                <li>• Regulatory compliance emergencies</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-green-400">✅ Post-Emergency Checklist</h3>
              <ul className="space-y-2 text-sm text-text-muted">
                <li>• Verify all user funds are secure</li>
                <li>• Check session vault balances</li>
                <li>• Review security logs for threats</li>
                <li>• Test game functionality before resuming</li>
                <li>• Notify users of service restoration</li>
                <li>• Document incident for future reference</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Warning Banner */}
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-red-400 font-semibold">Critical Warning</h4>
              <p className="text-sm text-text-muted mt-1">
                Emergency controls should only be used in genuine emergencies. All actions are logged and audited. 
                Unnecessary use of emergency controls may result in user disruption and financial impact.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
} 