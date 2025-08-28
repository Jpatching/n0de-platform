'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { 
  Tv, 
  Video, 
  Users, 
  Settings
} from 'lucide-react';
import { adminApi } from '@/services/api';

interface StreamingStats {
  activeStreams: number;
  totalBroadcasters: number;
  quality: string;
  uptime: string;
}

export default function BroadcasterPage() {
  const [streamingStats, setStreamingStats] = useState<StreamingStats | null>(null);
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
        <h1 className="text-3xl font-bold text-indigo-400">Broadcaster Tools</h1>
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
          <h1 className="text-3xl font-bold text-indigo-400">Broadcaster Tools</h1>
          <p className="text-text-muted mt-1">Streaming management and broadcaster controls</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 admin-card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">Active Streams</p>
              <p className="text-2xl font-bold text-red-400">{streamingStats?.activeStreams || 0}</p>
            </div>
            <Tv className="w-8 h-8 text-red-400" />
          </div>
        </Card>

        <Card className="p-6 admin-card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">Registered Broadcasters</p>
              <p className="text-2xl font-bold text-purple-400">{streamingStats?.totalBroadcasters || 0}</p>
            </div>
            <Users className="w-8 h-8 text-purple-400" />
          </div>
        </Card>

        <Card className="p-6 admin-card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">Stream Quality</p>
              <p className="text-2xl font-bold text-green-400">{streamingStats?.quality || 'Unknown'}</p>
            </div>
            <Video className="w-8 h-8 text-green-400" />
          </div>
        </Card>

        <Card className="p-6 admin-card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">Uptime</p>
              <p className="text-2xl font-bold text-blue-400">{streamingStats?.uptime || '0%'}</p>
            </div>
            <Settings className="w-8 h-8 text-blue-400" />
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Streaming Controls</h2>
          <Tv className="w-5 h-5 text-text-muted" />
        </div>

        <div className="text-center py-12">
          <Video className="w-16 h-16 text-text-muted mx-auto mb-4" />
          <p className="text-text-muted text-lg">Broadcaster tools ready</p>
          <p className="text-text-muted text-sm mt-2">Stream management interface</p>
        </div>
      </Card>
    </div>
  );
} 