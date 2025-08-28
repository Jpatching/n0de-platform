'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { 
  Monitor, 
  Users, 
  Eye, 
  Play,
  TrendingUp,
  DollarSign,
  Activity,
  Video
} from 'lucide-react';
import { adminApi } from '@/services/api';
import Layout from '@/components/admin/Layout';

export default function StreamingPage() {
  const [streamingStats, setStreamingStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStreamingStats();
  }, []);

  const fetchStreamingStats = async () => {
    try {
      const response = await adminApi.getStreamingStats();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setStreamingStats(response.data as any);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching streaming stats:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-3xl font-bold text-pink-400">Stream Monitoring</h1>
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
          <h1 className="text-3xl font-bold text-pink-400">Stream Monitoring</h1>
          <p className="text-text-muted mt-1">Live streaming oversight and analytics</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 admin-card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">Live Streams</p>
              <p className="text-2xl font-bold text-red-400">{streamingStats?.liveStreams || 0}</p>
            </div>
            <Video className="w-8 h-8 text-red-400" />
          </div>
        </Card>

        <Card className="p-6 admin-card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">Total Viewers</p>
              <p className="text-2xl font-bold text-purple-400">{streamingStats?.totalViewers || 0}</p>
            </div>
            <Users className="w-8 h-8 text-purple-400" />
          </div>
        </Card>

        <Card className="p-6 admin-card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">Stream Revenue</p>
              <p className="text-2xl font-bold text-green-400">${streamingStats?.revenue || 0}</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-400" />
          </div>
        </Card>

        <Card className="p-6 admin-card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">Avg Watch Time</p>
              <p className="text-2xl font-bold text-blue-400">{streamingStats?.avgWatchTime || '0m'}</p>
            </div>
            <Activity className="w-8 h-8 text-blue-400" />
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Active Streams</h2>
          <Monitor className="w-5 h-5 text-text-muted" />
        </div>

        {streamingStats?.activeStreams?.length > 0 ? (
          <div className="space-y-3">
            {streamingStats.activeStreams.slice(0, 5).map((stream: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Video className="w-5 h-5 text-red-400" />
                  <div>
                    <p className="text-white font-medium">{stream.title || 'Live Stream'}</p>
                    <p className="text-text-muted text-sm">{stream.streamer || 'Anonymous'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-1 bg-red-500 rounded-full text-xs">LIVE</span>
                  <span className="text-text-muted text-sm">{stream.viewers || 0} viewers</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Video className="w-16 h-16 text-text-muted mx-auto mb-4" />
            <p className="text-text-muted text-lg">No active streams</p>
            <p className="text-text-muted text-sm mt-2">Stream monitoring will appear here</p>
          </div>
        )}
      </Card>
    </div>
  );
} 