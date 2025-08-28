'use client';

import { motion } from 'framer-motion';
import GameCard from '../GameCard';
import Link from 'next/link';

interface Game {
  id: string;
  name: string;
  description: string;
  minWager: number;
  maxWager: number;
  activeMatches: number;
  totalPlayers: number;
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  estimatedDuration: string;
  thumbnail: string;
  path: string;
}

const games: Game[] = [
  {
    id: 'coinflip',
    name: 'Coin Flip',
    description: 'Classic heads or tails with instant results',
    minWager: 0.1,
    maxWager: 50,
    activeMatches: 12,
    totalPlayers: 89,
    category: 'popular',
    difficulty: 'Easy',
    estimatedDuration: '10s',
    thumbnail: '/game-covers/coinflip.webp',
    path: '/games/coinflip',
  },
  {
    id: 'rps',
    name: 'Rock Paper Scissors',
    description: 'Best of 3 rounds strategic battle',
    minWager: 0.1,
    maxWager: 25,
    activeMatches: 8,
    totalPlayers: 56,
    category: 'popular',
    difficulty: 'Easy',
    estimatedDuration: '30s',
    thumbnail: '/game-covers/rps.webp',
    path: '/games/rps',
  },
  {
    id: 'mines',
    name: 'Mines',
    description: 'Navigate the minefield and cash out safely',
    minWager: 0.1,
    maxWager: 10,
    activeMatches: 5,
    totalPlayers: 34,
    category: 'skill',
    difficulty: 'Medium',
    estimatedDuration: '2m',
    thumbnail: '/game-covers/mines.webp',
    path: '/games/mines',
  },
  {
    id: 'chess',
    name: 'Chess Blitz',
    description: '5-minute rapid chess matches',
    minWager: 0.1,
    maxWager: 100,
    activeMatches: 3,
    totalPlayers: 18,
    category: 'skill',
    difficulty: 'Hard',
    estimatedDuration: '10m',
    thumbnail: '/game-covers/chess.webp',
    path: '/games/chess',
  },
  {
    id: 'crash',
    name: 'Crash',
    description: 'Cash out before the multiplier crashes',
    minWager: 0.1,
    maxWager: 20,
    activeMatches: 7,
    totalPlayers: 42,
    category: 'high-risk',
    difficulty: 'Medium',
    estimatedDuration: '1m',
    thumbnail: '/game-covers/crash.webp',
    path: '/games/crash',
  },
];

interface GameGridProps {
  category?: string;
  limit?: number;
}

export function GameGrid({ category, limit = 6 }: GameGridProps) {
  const filteredGames = category 
    ? games.filter(game => game.category === category)
    : games;
  
  const displayGames = limit 
    ? filteredGames.slice(0, limit)
    : filteredGames;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {displayGames.map((game, index) => (
        <motion.div
          key={game.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Link href={game.path}>
            <div className="bg-bg-elevated border border-border rounded-xl overflow-hidden hover:border-accent-primary/50 transition-all duration-300 cursor-pointer group">
              <div className="relative aspect-video overflow-hidden">
                <img
                  src={game.thumbnail}
                  alt={game.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-bold">
                  {game.activeMatches} Live
                </div>
                <div className="absolute top-2 right-2 bg-accent-primary text-black px-2 py-1 rounded text-xs font-bold">
                  {game.difficulty}
                </div>
              </div>
              
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-lg font-audiowide">{game.name}</h3>
                  <span className="text-sm text-text-secondary">{game.estimatedDuration}</span>
                </div>
                
                <p className="text-text-secondary text-sm mb-4">{game.description}</p>
                
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <span className="text-text-secondary">Wager: </span>
                    <span className="font-bold text-accent-primary">
                      {game.minWager} - {game.maxWager} SOL
                    </span>
                  </div>
                  <div className="text-sm text-text-secondary">
                    {game.totalPlayers} players
                  </div>
                </div>
              </div>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
} 