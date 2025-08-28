'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Users, Gamepad2, Trophy, DollarSign, Clock } from 'lucide-react';
import { formatSOL } from '@/lib/utils';

interface StatCard {
  id: string;
  title: string;
  value: string;
  change: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const stats: StatCard[] = [
  {
    id: 'volume',
    title: '24h Volume',
    value: formatSOL(1247.89),
    change: '+23.5%',
    icon: DollarSign,
    color: 'text-green-400'
  },
  {
    id: 'players',
    title: 'Active Players',
    value: '2,847',
    change: '+12.3%',
    icon: Users,
    color: 'text-blue-400'
  },
  {
    id: 'matches',
    title: 'Matches Today',
    value: '8,432',
    change: '+18.7%',
    icon: Gamepad2,
    color: 'text-purple-400'
  },
  {
    id: 'tournaments',
    title: 'Live Tournaments',
    value: '8',
    change: '+2',
    icon: Trophy,
    color: 'text-yellow-400'
  }
];

export function StatsOverview() {
  const [stats, setStats] = useState({
    volume24h: 1247.89,
    activePlayers: 2847,
    matchesToday: 8432,
    liveTournaments: 8
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-bg-elevated border border-border rounded-xl p-6 hover:border-green-400/50 transition-colors"
      >
        <div className="flex items-center justify-between mb-4">
          <DollarSign className="w-8 h-8 text-green-400" />
          <span className="text-xs text-green-400 font-bold">+23.5%</span>
        </div>
        <div className="text-2xl font-bold text-green-400 mb-1">
          {formatSOL(stats.volume24h)}
        </div>
        <p className="text-text-secondary text-sm">24h Volume</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-bg-elevated border border-border rounded-xl p-6 hover:border-blue-400/50 transition-colors"
      >
        <div className="flex items-center justify-between mb-4">
          <Users className="w-8 h-8 text-blue-400" />
          <span className="text-xs text-blue-400 font-bold">+12.3%</span>
        </div>
        <div className="text-2xl font-bold text-blue-400 mb-1">
          {stats.activePlayers.toLocaleString()}
        </div>
        <p className="text-text-secondary text-sm">Active Players</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-bg-elevated border border-border rounded-xl p-6 hover:border-purple-400/50 transition-colors"
      >
        <div className="flex items-center justify-between mb-4">
          <Gamepad2 className="w-8 h-8 text-purple-400" />
          <span className="text-xs text-purple-400 font-bold">+18.7%</span>
        </div>
        <div className="text-2xl font-bold text-purple-400 mb-1">
          {stats.matchesToday.toLocaleString()}
        </div>
        <p className="text-text-secondary text-sm">Matches Today</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-bg-elevated border border-border rounded-xl p-6 hover:border-yellow-400/50 transition-colors"
      >
        <div className="flex items-center justify-between mb-4">
          <Trophy className="w-8 h-8 text-yellow-400" />
          <span className="text-xs text-yellow-400 font-bold">+2</span>
        </div>
        <div className="text-2xl font-bold text-yellow-400 mb-1">
          {stats.liveTournaments}
        </div>
        <p className="text-text-secondary text-sm">Live Tournaments</p>
      </motion.div>
    </div>
  );
} 