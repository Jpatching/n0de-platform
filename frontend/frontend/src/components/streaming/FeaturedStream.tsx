'use client';

import { useState } from 'react';
import Link from 'next/link';

interface StreamInfo {
  id: string;
  streamerId: string;
  streamerUsername: string;
  streamerDisplayName?: string;
  streamerAvatar?: string;
  streamerPrestige: number;
  title: string;
  description?: string;
  category: string;
  gameType?: string;
  stakes?: number;
  isLive: boolean;
  viewerCount: number;
  startedAt: string;
  totalTips: number;
  totalSubscribers: number;
  thumbnailUrl?: string;
  tags: string[];
  isEducational: boolean;
  isPremium: boolean;
  minPrestigeToView?: number;
  language: string;
}

interface FeaturedStreamProps {
  stream: StreamInfo;
}

const getPrestigeBadge = (prestige: number) => {
  switch (prestige) {
    case 0: return { emoji: '🔰', name: 'Mortal Warrior', color: 'text-gray-400' };
    case 1: return { emoji: '⚔️', name: 'Spartan General', color: 'text-blue-400' };
    case 2: return { emoji: '⚡', name: 'Olympian Commander', color: 'text-purple-400' };
    case 3: return { emoji: '🏛️', name: 'Divine Emperor', color: 'text-yellow-400' };
    case 4: return { emoji: '👑', name: 'GODMODE', color: 'text-red-400' };
    default: return { emoji: '🔰', name: 'Mortal Warrior', color: 'text-gray-400' };
  }
};

const getCategoryInfo = (category: string) => {
  switch (category) {
    case 'high_stakes': return { emoji: '💎', name: 'High Stakes', color: 'bg-red-500' };
    case 'educational': return { emoji: '🎓', name: 'Educational', color: 'bg-blue-500' };
    case 'prestige_showcase': return { emoji: '👑', name: 'Prestige Showcase', color: 'bg-purple-500' };
    case 'tournaments': return { emoji: '🏆', name: 'Tournaments', color: 'bg-yellow-500' };
    case 'just_chatting': return { emoji: '💬', name: 'Just Chatting', color: 'bg-green-500' };
    case 'strategy_analysis': return { emoji: '🧠', name: 'Strategy Analysis', color: 'bg-indigo-500' };
    case 'live_matches': return { emoji: '⚡', name: 'Live Matches', color: 'bg-orange-500' };
    default: return { emoji: '📺', name: 'General', color: 'bg-gray-500' };
  }
};

const formatDuration = (startedAt: string) => {
  const start = new Date(startedAt);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (diffHours > 0) {
    return `${diffHours}h ${diffMinutes}m`;
  }
  return `${diffMinutes}m`;
};

export function FeaturedStream({ stream }: FeaturedStreamProps) {
  const [imageError, setImageError] = useState(false);
  const prestigeBadge = getPrestigeBadge(stream.streamerPrestige);
  const categoryInfo = getCategoryInfo(stream.category);

  return (
    <Link href={`/live/${stream.id}`}>
      <div className="relative bg-gradient-to-r from-accent-primary/20 to-accent-secondary/20 border-2 border-accent-primary/50 rounded-xl overflow-hidden hover:border-accent-primary transition-all duration-300 hover:shadow-2xl hover:shadow-accent-primary/20 cursor-pointer group">
        {/* Featured badge */}
        <div className="absolute top-4 left-4 z-10 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black px-4 py-2 rounded-lg font-bold text-sm flex items-center shadow-lg">
          ⭐ FEATURED STREAM
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
          {/* Thumbnail */}
          <div className="relative aspect-video rounded-lg overflow-hidden bg-bg-main">
            {stream.thumbnailUrl && !imageError ? (
              <img
                src={stream.thumbnailUrl}
                alt={stream.title}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-bg-main to-bg-hover">
                <div className="text-center">
                  <div className="text-6xl mb-4">{categoryInfo.emoji}</div>
                  <div className="text-lg text-text-muted">Featured Live Stream</div>
                </div>
              </div>
            )}
            
            {/* Live indicator */}
            <div className="absolute top-3 left-3 bg-red-500 text-white px-3 py-1 rounded-lg text-sm font-bold flex items-center shadow-lg">
              <div className="w-3 h-3 bg-white rounded-full mr-2 animate-pulse"></div>
              LIVE
            </div>

            {/* Viewer count */}
            <div className="absolute top-3 right-3 bg-black/80 text-white px-3 py-1 rounded-lg text-sm flex items-center shadow-lg">
              👀 {stream.viewerCount.toLocaleString()} viewers
            </div>

            {/* Duration */}
            <div className="absolute bottom-3 right-3 bg-black/80 text-white px-3 py-1 rounded-lg text-sm shadow-lg">
              {formatDuration(stream.startedAt)}
            </div>

            {/* Stakes badge */}
            {stream.stakes && stream.stakes >= 10 && (
              <div className="absolute bottom-3 left-3 bg-yellow-500 text-black px-3 py-1 rounded-lg text-sm font-bold shadow-lg">
                💎 {stream.stakes} SOL Stakes
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex flex-col justify-between">
            {/* Header */}
            <div>
              {/* Streamer info */}
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center text-white font-bold text-lg mr-4 shadow-lg">
                  {stream.streamerAvatar ? (
                    <img
                      src={stream.streamerAvatar}
                      alt={stream.streamerUsername}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    stream.streamerUsername.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center mb-1">
                    <h4 className="text-xl font-bold text-text-primary mr-3">
                      {stream.streamerDisplayName || stream.streamerUsername}
                    </h4>
                    <span className={`text-lg ${prestigeBadge.color}`} title={prestigeBadge.name}>
                      {prestigeBadge.emoji}
                    </span>
                  </div>
                  <p className="text-text-muted">@{stream.streamerUsername}</p>
                </div>
              </div>

              {/* Title */}
              <h2 className="text-2xl font-bold text-text-primary mb-3 group-hover:text-accent-primary transition-colors">
                {stream.title}
              </h2>

              {/* Description */}
              {stream.description && (
                <p className="text-text-secondary mb-4 line-clamp-2">
                  {stream.description}
                </p>
              )}

              {/* Category and game type */}
              <div className="flex items-center flex-wrap gap-3 mb-4">
                <span className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium text-white ${categoryInfo.color} shadow-md`}>
                  {categoryInfo.emoji} {categoryInfo.name}
                </span>
                {stream.gameType && (
                  <span className="bg-bg-card text-text-primary px-3 py-1 rounded-lg text-sm font-medium border border-border">
                    🎮 {stream.gameType}
                  </span>
                )}
                {stream.isEducational && (
                  <span className="bg-blue-500 text-white px-3 py-1 rounded-lg text-sm font-medium shadow-md">
                    🎓 Educational
                  </span>
                )}
                {stream.isPremium && (
                  <span className="bg-purple-500 text-white px-3 py-1 rounded-lg text-sm font-medium shadow-md">
                    ⭐ Premium
                  </span>
                )}
              </div>

              {/* Tags */}
              {stream.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {stream.tags.slice(0, 5).map((tag, index) => (
                    <span
                      key={index}
                      className="text-sm bg-bg-hover text-text-secondary px-2 py-1 rounded border border-border"
                    >
                      #{tag}
                    </span>
                  ))}
                  {stream.tags.length > 5 && (
                    <span className="text-sm text-text-muted">
                      +{stream.tags.length - 5} more
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-bg-card border border-border rounded-lg p-3">
                <div className="text-2xl font-bold text-accent-primary">
                  {stream.totalTips.toFixed(1)}
                </div>
                <div className="text-sm text-text-muted">SOL Tips Received</div>
              </div>
              <div className="bg-bg-card border border-border rounded-lg p-3">
                <div className="text-2xl font-bold text-accent-primary">
                  {stream.totalSubscribers}
                </div>
                <div className="text-sm text-text-muted">Subscribers</div>
              </div>
            </div>

            {/* Watch button */}
            <div className="mt-6">
              <div className="bg-gradient-to-r from-accent-primary to-accent-secondary text-white px-6 py-3 rounded-lg font-bold text-center hover:shadow-lg hover:shadow-accent-primary/30 transition-all duration-300 group-hover:scale-105">
                🎥 Watch Featured Stream
              </div>
            </div>

            {/* Prestige requirement */}
            {stream.minPrestigeToView && stream.minPrestigeToView > 0 && (
              <div className="mt-3 text-sm text-yellow-400 bg-yellow-400/10 px-3 py-2 rounded-lg border border-yellow-400/20">
                🔒 Requires {getPrestigeBadge(stream.minPrestigeToView).name} or higher
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
} 