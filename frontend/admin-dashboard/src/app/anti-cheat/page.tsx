'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { 
  Shield, 
  AlertTriangle, 
  Ban, 
  Eye,
  Activity,
  TrendingUp,
  Users,
  Clock,
  Zap,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { adminApi } from '@/services/api';
import type { AntiCheatEvent } from '@/types/admin';
import Layout from '@/components/admin/Layout';

interface AntiCheatStats {
  totalEvents: number;
  activeEvents: number;
  resolvedEvents: number;
  bannedUsers: number;
  detectionRate: number;
  falsePositives: number;
}

export default function AntiCheatPage() {
  const [events, setEvents] = useState<AntiCheatEvent[]>([]);
  const [stats, setStats] = useState<AntiCheatStats>({
    totalEvents: 0,
    activeEvents: 0,
    resolvedEvents: 0,
    bannedUsers: 0,
    detectionRate: 0,
    falsePositives: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAntiCheatEvents();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchAntiCheatEvents();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchAntiCheatEvents = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getAntiCheatEvents();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setEvents(response.data?.data || [] as any);
      
      // Get stats from system stats
      const statsResponse = await adminApi.getSystemStats();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setStats({
        totalEvents: 0,
        activeEvents: 0,
        resolvedEvents: 0,
        bannedUsers: 0,
        detectionRate: 0,
        falsePositives: 0
      } as any);
    } catch (error) {
      console.error('Error fetching anti-cheat events:', error);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setEvents([] as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setStats({ totalEvents: 0, activeEvents: 0, resolvedEvents: 0 } as any);
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeEvent = async (eventId: string) => {
    try {
      await adminApi.acknowledgeAlert(eventId);
      fetchAntiCheatEvents();
    } catch (error) {
      console.error('Error acknowledging event:', error);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-red-400">Anti-Cheat System</h1>
              <p className="text-text-muted mt-1">Cheat detection and monitoring</p>
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
            <h1 className="text-3xl font-bold text-red-400">Anti-Cheat System</h1>
            <p className="text-text-muted mt-1">Cheat detection and monitoring</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse"></div>
            <span className="text-sm text-text-muted">Active monitoring</span>
          </div>
        </div>

        {/* Anti-Cheat Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 admin-card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">Total Events</p>
                <p className="text-2xl font-bold text-red-400">{stats.totalEvents}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
          </Card>

          <Card className="p-6 admin-card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">Active Events</p>
                <p className="text-2xl font-bold text-orange-400">{stats.activeEvents}</p>
              </div>
              <Activity className="w-8 h-8 text-orange-400" />
            </div>
          </Card>

          <Card className="p-6 admin-card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">Detection Rate</p>
                <p className="text-2xl font-bold text-green-400">{stats.detectionRate.toFixed(1)}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-400" />
            </div>
          </Card>

          <Card className="p-6 admin-card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">Banned Users</p>
                <p className="text-2xl font-bold text-purple-400">{stats.bannedUsers}</p>
              </div>
              <Ban className="w-8 h-8 text-purple-400" />
            </div>
          </Card>
        </div>

        {/* Anti-Cheat Events */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Anti-Cheat Events</h2>
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-text-muted" />
              <span className="text-sm text-text-muted">Real-time detection</span>
            </div>
          </div>

          {events.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="w-16 h-16 text-text-muted mx-auto mb-4" />
              <p className="text-text-muted text-lg">No anti-cheat events</p>
              <p className="text-text-muted text-sm mt-2">System is actively monitoring for cheats</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.slice(0, 5).map((event: AntiCheatEvent, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {event.eventType === 'behavior' ? (
                      <Eye className="w-5 h-5 text-yellow-400" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                    )}
                    <div>
                      <p className="text-white font-medium">{event.eventType || 'Cheat Detection'}</p>
                      <div className="flex items-center space-x-2 text-sm text-text-muted">
                        <Users className="w-4 h-4" />
                        <span>{event.userId?.slice(0, 8)}...</span>
                        <Clock className="w-4 h-4 ml-2" />
                        <span>{new Date(event.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1">
                      <TrendingUp className="w-4 h-4 text-blue-400" />
                      <span className="text-text-muted text-sm">{event.confidence || 0}% confidence</span>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      event.confidence > 80 ? 'bg-red-500' : 
                      event.confidence > 50 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}>
                      {event.confidence > 80 ? 'high' : event.confidence > 50 ? 'medium' : 'low'}
                    </span>
                    {event.action === 'flagged' ? (
                      <button 
                        onClick={() => acknowledgeEvent(event.id)}
                        className="p-1 bg-blue-600 hover:bg-blue-700 rounded"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    ) : (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    )}
                  </div>
                </div>
              ))}
              
              {/* Action Panel */}
              <div className="mt-6 p-4 bg-gray-800 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                  <Activity className="w-5 h-5 mr-2" />
                  Quick Actions
                </h3>
                <div className="flex space-x-3">
                  <button className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded flex items-center">
                    <XCircle className="w-4 h-4 mr-2" />
                    Mass Investigation
                  </button>
                  <button className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded flex items-center">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve All Low Risk
                  </button>
                  <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded flex items-center">
                    <Shield className="w-4 h-4 mr-2" />
                    Update Detection Rules
                  </button>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
} 