'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Play, TrendingUp, Users, Clock, Star } from 'lucide-react';
import { cn, buttonStyles, formatSOL } from '@/lib/utils';
import Link from 'next/link';

export function FeaturedBanner() {
  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-purple-600/20 via-blue-600/20 to-green-600/20 border border-accent-primary/30 p-8">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-blue-600/10 to-green-600/10 animate-pulse"></div>
      
      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <Star className="w-5 h-5 text-yellow-400 fill-current" />
              <span className="text-yellow-400 font-bold text-sm font-audiowide">FEATURED GAME</span>
            </div>
            
            <h2 className="text-3xl font-bold mb-2 font-audiowide bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 bg-clip-text text-transparent">
              Mines
            </h2>
            
            <p className="text-text-secondary mb-4 max-w-md">
              Navigate through the minefield and cash out at the perfect moment. 
              Risk vs reward at its finest.
            </p>
            
            <div className="flex items-center space-x-6 mb-6">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-green-400" />
                <span className="text-sm">
                  <span className="font-bold text-green-400">34</span> players online
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                <span className="text-sm">
                  <span className="font-bold text-blue-400">5</span> active matches
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-purple-400" />
                <span className="text-sm">
                  <span className="font-bold text-purple-400">~2min</span> per game
                </span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link 
                href="/games/mines"
                className="bg-accent-primary text-black font-bold py-3 px-6 rounded-lg hover:bg-accent-primary/90 transition-colors flex items-center space-x-2 font-audiowide"
              >
                <Play className="w-4 h-4" />
                <span>PLAY NOW</span>
              </Link>
              
              <div className="text-sm text-text-secondary">
                Wager: <span className="font-bold text-accent-primary">0.1 - 10 SOL</span>
              </div>
            </div>
          </div>
          
          {/* Game preview */}
          <div className="hidden lg:block ml-8">
            <div className="relative w-48 h-32 rounded-lg overflow-hidden border border-accent-primary/50">
              <img
                src="/game-covers/mines.webp"
                alt="Mines Game"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
              <div className="absolute bottom-2 left-2 right-2">
                <div className="text-xs font-bold text-white">Latest Win: +4.2 SOL</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Decorative elements */}
      <div className="absolute top-4 right-4 w-2 h-2 bg-accent-primary rounded-full animate-ping"></div>
      <div className="absolute bottom-4 left-4 w-1 h-1 bg-blue-400 rounded-full animate-pulse"></div>
    </div>
  );
} 