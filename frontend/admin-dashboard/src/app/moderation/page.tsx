'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { 
  Eye, 
  Flag, 
  Shield, 
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { adminApi } from '@/services/api';

export default function ModerationPage() {
  const [moderationData, setModerationData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchModerationData();
  }, []);

  const fetchModerationData = async () => {
    try {
      const response = await adminApi.getSecurityAlerts();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setModerationData(response.data as any);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching moderation data:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-3xl font-bold text-orange-400">Content Moderation</h1>
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
          <h1 className="text-3xl font-bold text-orange-400">Content Moderation</h1>
          <p className="text-text-muted mt-1">Content review and community management</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 admin-card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">Pending Review</p>
              <p className="text-2xl font-bold text-yellow-400">{moderationData?.pendingReview || 0}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-400" />
          </div>
        </Card>

        <Card className="p-6 admin-card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">Flagged Content</p>
              <p className="text-2xl font-bold text-red-400">{moderationData?.flaggedContent || 0}</p>
            </div>
            <Flag className="w-8 h-8 text-red-400" />
          </div>
        </Card>

        <Card className="p-6 admin-card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">Approved Today</p>
              <p className="text-2xl font-bold text-green-400">{moderationData?.approvedToday || 0}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </Card>

        <Card className="p-6 admin-card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">Rejected Today</p>
              <p className="text-2xl font-bold text-red-400">{moderationData?.rejectedToday || 0}</p>
            </div>
            <XCircle className="w-8 h-8 text-red-400" />
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Content Queue</h2>
          <Eye className="w-5 h-5 text-text-muted" />
        </div>

        {moderationData?.contentQueue?.length > 0 ? (
          <div className="space-y-3">
            {moderationData.contentQueue.slice(0, 5).map((content: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                <div className="flex items-center space-x-3">
                  <MessageSquare className="w-5 h-5 text-orange-400" />
                  <div>
                    <p className="text-white font-medium">{content.type || 'Content'}</p>
                    <p className="text-text-muted text-sm">{content.description || 'Content description'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-text-muted text-sm">{content.flagCount || 0} flags</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    content.severity === 'high' ? 'bg-red-500' : 
                    content.severity === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                  }`}>
                    {content.severity || 'low'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <MessageSquare className="w-16 h-16 text-text-muted mx-auto mb-4" />
            <p className="text-text-muted text-lg">No content pending review</p>
            <p className="text-text-muted text-sm mt-2">Moderation queue is empty</p>
          </div>
        )}
      </Card>
    </div>
  );
} 