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

interface StreamCardProps {
  stream: StreamInfo;
  showEducationalBadge?: boolean;
  showStakesBadge?: boolean;
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

export function StreamCard({ stream, showEducationalBadge, showStakesBadge }: StreamCardProps) {
  const [imageError, setImageError] = useState(false);
  const prestigeBadge = getPrestigeBadge(stream.streamerPrestige);
  const categoryInfo = getCategoryInfo(stream.category);

  return (
    <Link href={`/live/${stream.id}`}>
      <div className="bg-bg-card border border-border rounded-lg overflow-hidden hover:border-accent-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-accent-primary/10 cursor-pointer group">
        {/* Thumbnail */}
        <div className="relative aspect-video bg-bg-main">
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
                <div className="text-4xl mb-2">{categoryInfo.emoji}</div>
                <div className="text-sm text-text-muted">Live Stream</div>
              </div>
            </div>
          )}
          
          {/* Live indicator */}
          <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-bold flex items-center">
            <div className="w-2 h-2 bg-white rounded-full mr-1 animate-pulse"></div>
            LIVE
          </div>

          {/* Viewer count */}
          <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs flex items-center">
            👀 {stream.viewerCount.toLocaleString()}
          </div>

          {/* Duration */}
          <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
            {formatDuration(stream.startedAt)}
          </div>

          {/* Educational badge */}
          {(showEducationalBadge || stream.isEducational) && (
            <div className="absolute bottom-2 left-2 bg-blue-500 text-white px-2 py-1 rounded text-xs font-bold">
              🎓 Educational
            </div>
          )}

          {/* Stakes badge */}
          {(showStakesBadge || (stream.stakes && stream.stakes >= 10)) && stream.stakes && (
            <div className="absolute top-8 left-2 bg-yellow-500 text-black px-2 py-1 rounded text-xs font-bold">
              💎 {stream.stakes} SOL
            </div>
          )}

          {/* Premium badge */}
          {stream.isPremium && (
            <div className="absolute top-8 right-2 bg-purple-500 text-white px-2 py-1 rounded text-xs font-bold">
              ⭐ Premium
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Streamer info */}
          <div className="flex items-center mb-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center text-white font-bold text-sm mr-3">
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
            <div className="flex-1 min-w-0">
              <div className="flex items-center">
                <span className="font-semibold text-text-primary truncate">
                  {stream.streamerDisplayName || stream.streamerUsername}
                </span>
                <span className={`ml-2 text-sm ${prestigeBadge.color}`} title={prestigeBadge.name}>
                  {prestigeBadge.emoji}
                </span>
              </div>
              <div className="text-xs text-text-muted">
                @{stream.streamerUsername}
              </div>
            </div>
          </div>

          {/* Title */}
          <h3 className="font-bold text-text-primary mb-2 line-clamp-2 group-hover:text-accent-primary transition-colors">
            {stream.title}
          </h3>

          {/* Category */}
          <div className="flex items-center mb-3">
            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium text-white ${categoryInfo.color}`}>
              {categoryInfo.emoji} {categoryInfo.name}
            </span>
            {stream.gameType && (
              <span className="ml-2 text-xs text-text-muted bg-bg-main px-2 py-1 rounded">
                {stream.gameType}
              </span>
            )}
          </div>

          {/* Tags */}
          {stream.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {stream.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="text-xs bg-bg-hover text-text-secondary px-2 py-1 rounded"
                >
                  #{tag}
                </span>
              ))}
              {stream.tags.length > 3 && (
                <span className="text-xs text-text-muted">
                  +{stream.tags.length - 3} more
                </span>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center justify-between text-xs text-text-muted">
            <div className="flex items-center space-x-3">
              <span className="flex items-center">
                💰 {stream.totalTips.toFixed(1)} SOL
              </span>
              <span className="flex items-center">
                🔔 {stream.totalSubscribers}
              </span>
            </div>
            <div className="flex items-center">
              <span className="text-text-secondary">
                {stream.language.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Prestige requirement */}
          {stream.minPrestigeToView && stream.minPrestigeToView > 0 && (
            <div className="mt-2 text-xs text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded">
              🔒 Requires {getPrestigeBadge(stream.minPrestigeToView).name}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
} 