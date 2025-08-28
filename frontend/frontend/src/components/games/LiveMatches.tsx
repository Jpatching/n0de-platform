'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Clock, TrendingUp, Eye, Play } from 'lucide-react';
import { cn, formatSOL, formatWallet, formatTimeAgo } from '@/lib/utils';
import Link from 'next/link';

interface LiveMatch {
  id: string;
  gameType: string;
  player1: {
    wallet: string;
    username?: string;
  };
  player2?: {
    wallet: string;
    username?: string;
  };
  wager: number;
  status: 'waiting' | 'active' | 'completed';
  createdAt: string;
}

export function LiveMatches() {
  const [matches, setMatches] = useState<LiveMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const response = await fetch('/api/v1/matches/available?limit=6');
        if (response.ok) {
          const data = await response.json();
          setMatches(data.matches || []);
        }
      } catch (error) {
        console.error('Failed to fetch matches:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
    const interval = setInterval(fetchMatches, 10000);
    return () => clearInterval(interval);
  }, []);

  const getGameName = (type: string) => {
    const names: Record<string, string> = {
      'coin-flip': 'Coin Flip',
      'rock-paper-scissors': 'RPS',
      'chess': 'Chess',
      'mines': 'Mines',
      'crash': 'Crash'
    };
    return names[type] || type;
  };

  if (loading) {
    return (
      <div className="bg-bg-elevated border border-border rounded-xl p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <h2 className="text-xl font-bold font-audiowide">Live Matches</h2>
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse bg-bg-card rounded-lg p-4">
              <div className="h-4 bg-surface rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-surface rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg-elevated border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <h2 className="text-xl font-bold font-audiowide">Live Matches</h2>
        </div>
        <Link href="/games" className="text-accent-primary hover:text-accent-primary/80 text-sm">
          View All
        </Link>
      </div>

      {matches.length === 0 ? (
        <div className="text-center py-8 text-text-secondary">
          <div className="text-4xl mb-4">🎮</div>
          <p>No live matches right now</p>
          <Link href="/games" className="inline-block mt-4 bg-accent-primary text-black font-bold py-2 px-4 rounded-lg hover:bg-accent-primary/90 transition-colors">
            Create Match
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {matches.slice(0, 6).map((match) => (
            <div key={match.id} className="bg-bg-card border border-border rounded-lg p-4 hover:bg-bg-hover transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`w-2 h-2 rounded-full ${match.status === 'active' ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
                  <span className="font-medium text-sm">{getGameName(match.gameType)}</span>
                  <div className="text-sm text-text-secondary">
                    <span>{match.player1.username || formatWallet(match.player1.wallet)}</span>
                    {match.player2 ? (
                      <> vs {match.player2.username || formatWallet(match.player2.wallet)}</>
                    ) : (
                      <span className="text-yellow-400"> • Waiting</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="font-bold text-accent-primary">{formatSOL(match.wager)}</div>
                  {match.status === 'waiting' && (
                    <Link href={`/games/${match.gameType}?join=${match.id}`} className="bg-accent-primary text-black font-bold py-1 px-3 rounded text-sm hover:bg-accent-primary/90 transition-colors">
                      Join
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 