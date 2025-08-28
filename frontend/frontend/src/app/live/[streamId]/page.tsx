'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { usePV3 } from '@/hooks/usePV3';
import { useAuth } from '@/contexts/AuthContext';
import PageHeader from '@/components/PageHeader';
import Sidebar from '@/components/Sidebar';
import { VideoPlayer } from '@/components/streaming/VideoPlayer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface StreamData {
  id: string;
  streamerId: string;
  streamer: {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
    prestige: number;
  };
  title: string;
  description?: string;
  category: string;
  gameType?: string;
  stakes?: number;
  isLive: boolean;
  isEducational: boolean;
  isPremium: boolean;
  minPrestigeToView?: number;
  language: string;
  tags: string[];
  viewerCount: number;
  peakViewerCount: number;
  totalTips: number;
  totalSubscribers: number;
  startedAt: string;
  thumbnailUrl?: string;
  playbackUrl: string;
}

interface ChatMessage {
  id: string;
  userId: string;
  user: {
    username: string;
    displayName: string;
    prestige: number;
  };
  message: string;
  isHighlighted: boolean;
  tipAmount?: number;
  createdAt: string;
}

export default function StreamPage() {
  const { streamId } = useParams();
  const { user } = useAuth();
  const { formatSOL } = usePV3();

  const [stream, setStream] = useState<StreamData | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [tipAmount, setTipAmount] = useState('');
  const [tipMessage, setTipMessage] = useState('');
  const [showTipModal, setShowTipModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Helper function to get authentication headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem('pv3_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  };

  useEffect(() => {
    if (streamId) {
      fetchStream();
    }
  }, [streamId]);

  const fetchStream = async () => {
    try {
      const response = await fetch(`/api/streaming/streams/${streamId}`);
      if (response.ok) {
        const data = await response.json();
        setStream(data.stream);
      } else {
        setError('Stream not found');
      }
    } catch (err) {
      setError('Failed to load stream');
    } finally {
      setLoading(false);
    }
  };

  const joinStream = async () => {
    if (!user || !stream) return;

    try {
      await fetch(`/api/streaming/streams/${stream.id}/join`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
    } catch (error) {
      console.error('Failed to join stream:', error);
    }
  };

  const leaveStream = async () => {
    if (!user || !stream) return;

    try {
      await fetch(`/api/streaming/streams/${stream.id}/leave`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
    } catch (error) {
      console.error('Failed to leave stream:', error);
    }
  };

  const sendChatMessage = async () => {
    if (!user || !stream || !newMessage.trim()) return;

    try {
      const response = await fetch(`/api/streaming/streams/${stream.id}/chat`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          message: newMessage,
        }),
      });

      if (response.ok) {
        setNewMessage('');
        // Message will be added via WebSocket
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const sendTip = async () => {
    if (!user || !stream || !tipAmount) return;

    try {
      const response = await fetch(`/api/streaming/streams/${stream.id}/tip`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          amount: parseFloat(tipAmount),
          message: tipMessage,
        }),
      });

      if (response.ok) {
        setTipAmount('');
        setTipMessage('');
        setShowTipModal(false);
        // Tip will be shown via WebSocket
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to send tip');
      }
    } catch (error) {
      console.error('Failed to send tip:', error);
      alert('Failed to send tip');
    }
  };

  const subscribe = async () => {
    if (!user || !stream) return;

    try {
      const response = await fetch(`/api/streaming/streams/${stream.id}/subscribe`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          monthlyAmount: 1, // 1 SOL per month
        }),
      });

      if (response.ok) {
        alert('Successfully subscribed!');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to subscribe');
      }
    } catch (error) {
      console.error('Failed to subscribe:', error);
      alert('Failed to subscribe');
    }
  };

  const getPrestigeBadgeColor = (prestige: number) => {
    if (prestige >= 10) return 'bg-purple-600';
    if (prestige >= 5) return 'bg-blue-600';
    if (prestige >= 2) return 'bg-green-600';
    return 'bg-gray-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="lg:ml-64">
          <PageHeader onMenuClick={() => setSidebarOpen(true)} />
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !stream) {
    return (
      <div className="min-h-screen bg-bg-primary">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="lg:ml-64">
          <PageHeader onMenuClick={() => setSidebarOpen(true)} />
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-text-primary mb-4">Stream Not Found</h2>
              <p className="text-text-secondary">{error || 'The stream you are looking for does not exist.'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:ml-64">
        <PageHeader onMenuClick={() => setSidebarOpen(true)} />
      
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Video Area */}
          <div className="lg:col-span-3">
            <div className="space-y-4">
              {/* Video Player */}
              <VideoPlayer
                src={stream.playbackUrl}
                poster={stream.thumbnailUrl}
                className="w-full"
              />

              {/* Stream Info */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h1 className="text-2xl font-bold text-text-primary mb-2">{stream.title}</h1>
                      <div className="flex items-center space-x-4 text-sm text-text-secondary">
                        <span>{stream.viewerCount} viewers</span>
                        <span>•</span>
                        <span>{formatSOL(stream.totalTips)} SOL tipped</span>
                        <span>•</span>
                        <span>{stream.totalSubscribers} subscribers</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">{stream.category}</Badge>
                      {stream.isEducational && <Badge variant="outline">Educational</Badge>}
                      {stream.stakes && (
                        <Badge variant="destructive">{formatSOL(stream.stakes)} SOL Stakes</Badge>
                      )}
                    </div>
                  </div>

                  {/* Streamer Info */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-accent-primary rounded-full flex items-center justify-center">
                        <span className="text-white font-bold">
                          {stream.streamer.displayName?.[0] || stream.streamer.username?.[0] || 'U'}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-text-primary">
                          {stream.streamer.displayName || stream.streamer.username}
                        </h3>
                        <Badge className="bg-purple-600">
                          P{stream.streamer.prestige}
                        </Badge>
                      </div>
                    </div>

                    {user && user.id !== stream.streamerId && (
                      <div className="flex items-center space-x-2">
                        <Button
                          onClick={() => setShowTipModal(true)}
                          className="bg-accent-primary hover:bg-accent-primary/80"
                        >
                          Tip
                        </Button>
                        <Button
                          onClick={subscribe}
                          variant="outline"
                        >
                          Subscribe
                        </Button>
                      </div>
                    )}
                  </div>

                  {stream.description && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <p className="text-text-secondary">{stream.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Chat Sidebar */}
          <div className="lg:col-span-1">
            <Card className="h-[600px] flex flex-col">
              <CardHeader>
                <CardTitle className="text-lg">Stream Chat</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-0">
                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {chatMessages.map((message) => (
                    <div key={message.id} className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <Badge className={getPrestigeBadgeColor(message.user.prestige)} variant="secondary">
                          P{message.user.prestige}
                        </Badge>
                        <span className="font-medium text-sm text-text-primary">
                          {message.user.displayName || message.user.username}
                        </span>
                        {message.tipAmount && (
                          <Badge variant="destructive" className="text-xs">
                            {formatSOL(message.tipAmount)} SOL
                          </Badge>
                        )}
                      </div>
                      <p className={`text-sm ${message.isHighlighted ? 'text-accent-primary font-medium' : 'text-text-secondary'}`}>
                        {message.message}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Chat Input */}
                {user && (
                  <div className="p-4 border-t border-border">
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                        placeholder="Type a message..."
                        className="flex-1 px-3 py-2 bg-bg-card border border-border rounded text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent-primary"
                      />
                      <Button
                        onClick={sendChatMessage}
                        size="sm"
                        disabled={!newMessage.trim()}
                      >
                        Send
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Tip Modal */}
      {showTipModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Send Tip</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Amount (SOL)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={tipAmount}
                  onChange={(e) => setTipAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-bg-card border border-border rounded text-text-primary focus:outline-none focus:border-accent-primary"
                  placeholder="0.1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Message (optional)
                </label>
                <input
                  type="text"
                  value={tipMessage}
                  onChange={(e) => setTipMessage(e.target.value)}
                  className="w-full px-3 py-2 bg-bg-card border border-border rounded text-text-primary focus:outline-none focus:border-accent-primary"
                  placeholder="Great stream!"
                />
              </div>
              <div className="flex space-x-2">
                <Button
                  onClick={() => setShowTipModal(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={sendTip}
                  className="flex-1 bg-accent-primary hover:bg-accent-primary/80"
                  disabled={!tipAmount || parseFloat(tipAmount) < 0.1}
                >
                  Send Tip
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      </div>
    </div>
  );
} 