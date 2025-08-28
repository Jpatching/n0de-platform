'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { usePV3 } from '@/hooks/usePV3';
import { matchService } from '@/services/matchService';
import { socketService } from '@/services/socketService';

interface RPSQuickMatchProps {
  onMatchFound: (matchId: string) => void;
  onMatchCreated: (match: any) => void;
  socketConnected: boolean;
  gamePhase: string;
}

interface QuickMatchFilters {
  selectedBets: number[];
}

const availableBets = [0.1, 0.25, 0.5, 1.0, 2.5, 5.0];

export default function RPSQuickMatch({ 
  onMatchFound, 
  onMatchCreated, 
  socketConnected, 
  gamePhase 
}: RPSQuickMatchProps) {
  const { user } = useAuth();
  const { vaultBalance, formatSOL } = usePV3();
  
  const [filters, setFilters] = useState<QuickMatchFilters>({
    selectedBets: [0.1] // Default to 0.1 SOL
  });
  
  const [isSearching, setIsSearching] = useState(false);
  const [searchStatus, setSearchStatus] = useState<string>('');
  const [playersSearching, setPlayersSearching] = useState(0);
  const [avgWaitTime, setAvgWaitTime] = useState('45s');

  // Mock data for gambling psychology - in real app would come from backend
  useEffect(() => {
    const interval = setInterval(() => {
      setPlayersSearching(Math.floor(Math.random() * 15) + 5); // 5-19 players
      const times = ['15s', '18s', '22s', '25s', '28s'];
      setAvgWaitTime(times[Math.floor(Math.random() * times.length)]);
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);

  const toggleBetAmount = (amount: number) => {
    if (isSearching) return;
    
    setFilters(prev => {
      const newSelectedBets = prev.selectedBets.includes(amount)
        ? prev.selectedBets.filter(bet => bet !== amount)
        : [...prev.selectedBets, amount];
      
      // Ensure at least one bet is selected
      return {
        selectedBets: newSelectedBets.length > 0 ? newSelectedBets : [amount]
      };
    });
  };

  const handleQuickSearch = async () => {
    if (!user || !socketConnected || gamePhase !== 'lobby') return;
    
    setIsSearching(true);
    setSearchStatus('Searching for matches...');
    
    try {
      // Get matches based on selected bet amounts
      const allMatches = await matchService.getAvailableRPSMatches();
      
      const filteredMatches = allMatches.filter(match => {
        const matchWager = parseFloat(match.wager.toString());
        return filters.selectedBets.includes(matchWager);
      });
      
      if (filteredMatches.length > 0) {
        // Join the first matching game
        const bestMatch = filteredMatches[0];
        setSearchStatus('Match found! Joining...');
        setTimeout(() => {
          onMatchFound(bestMatch.id);
          setIsSearching(false);
        }, 1000);
      } else {
        // Create a match with the first selected bet amount
        setSearchStatus('Creating optimized match...');
        const optimalBet = filters.selectedBets[0];
        
        const match = await matchService.createRPSMatch(optimalBet);
        setTimeout(() => {
          onMatchCreated(match);
          setIsSearching(false);
        }, 1000);
      }
    } catch (error) {
      console.error('Quick match failed:', error);
      setSearchStatus('Search failed. Try again.');
      setIsSearching(false);
    }
  };

  const handleAutoJoin = async () => {
    if (!user || !socketConnected || gamePhase !== 'lobby') return;
    
    setIsSearching(true);
    setSearchStatus('Finding instant match...');
    
    try {
      const allMatches = await matchService.getAvailableRPSMatches();
      
      if (allMatches.length > 0) {
        // Join any available match instantly
        const randomMatch = allMatches[Math.floor(Math.random() * allMatches.length)];
        setSearchStatus('Joining match now!');
        setTimeout(() => {
          onMatchFound(randomMatch.id);
          setIsSearching(false);
        }, 800);
      } else {
        // Create a quick match with first selected bet
        setSearchStatus('Creating instant match...');
        const match = await matchService.createRPSMatch(filters.selectedBets[0]);
        setTimeout(() => {
          onMatchCreated(match);
          setIsSearching(false);
        }, 800);
      }
    } catch (error) {
      console.error('Auto join failed:', error);
      setSearchStatus('Failed to find match.');
      setIsSearching(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="mt-8"
    >
      <div className="glass-card p-6">
        <div className="flex items-center justify-center mb-4">
          <div className="text-2xl font-bold text-text-primary font-audiowide flex items-center gap-2">
            ⚡ Quick Match
            <span className="text-sm text-accent-primary font-inter">Jump In Fast!</span>
          </div>
        </div>
        
        {/* Bet Amount Selection */}
        <div className="mb-4">
          <label className="block text-text-secondary text-sm mb-3 font-inter">Select Bet Amounts (multiple allowed)</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {availableBets.map((amount) => {
              const isSelected = filters.selectedBets.includes(amount);
              const canAfford = vaultBalance >= amount * 1000000000;
              
              return (
                <button
                  key={amount}
                  onClick={() => toggleBetAmount(amount)}
                  disabled={isSearching || !canAfford}
                  className={`px-3 py-2 rounded-lg text-sm font-audiowide transition-colors ${
                    isSelected
                      ? 'bg-accent-primary text-black border-2 border-accent-primary'
                      : canAfford
                      ? 'bg-bg-card text-text-primary border-2 border-border hover:border-accent-primary'
                      : 'bg-bg-card text-text-secondary border-2 border-border opacity-50 cursor-not-allowed'
                  }`}
                >
                  {amount} SOL
                  {isSelected && ' ✓'}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-text-secondary mt-2 font-inter">
            Selected: {filters.selectedBets.length} amount{filters.selectedBets.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Live Stats Row - Gambling Psychology */}
        <div className="grid grid-cols-2 gap-4 mb-4 text-center">
          <div className="bg-bg-card rounded-lg p-3">
            <div className="text-accent-primary font-bold text-lg font-audiowide">{playersSearching}</div>
            <div className="text-text-secondary text-xs font-inter">Players Searching</div>
          </div>
          <div className="bg-bg-card rounded-lg p-3">
            <div className="text-accent-primary font-bold text-lg font-audiowide">{avgWaitTime}</div>
            <div className="text-text-secondary text-xs font-inter">Avg Wait Time</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="relative group">
          <button
            onClick={handleQuickSearch}
              disabled={isSearching || !socketConnected || gamePhase !== 'lobby' || filters.selectedBets.length === 0}
              className={`w-full px-4 py-3 rounded-lg font-audiowide transition-colors ${
                isSearching || !socketConnected || gamePhase !== 'lobby' || filters.selectedBets.length === 0
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-accent-primary text-black hover:bg-accent-secondary'
              }`}
              title="Finds matches that exactly match your selected bet amounts"
            >
              {isSearching ? '🔍 Searching...' : '🎯 Smart Search'}
          </button>
          
            {/* Smart Search Tooltip */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
              <div className="text-center">
                <div className="font-bold">🎯 Smart Search</div>
                <div>Only finds matches with your selected bet amounts</div>
                <div className="text-accent-primary">More selective • Respects preferences</div>
              </div>
              {/* Arrow */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black"></div>
            </div>
          </div>
          
          <div className="relative group">
          <button
            onClick={handleAutoJoin}
            disabled={isSearching || !socketConnected || gamePhase !== 'lobby'}
              className={`w-full px-4 py-3 rounded-lg font-audiowide transition-colors ${
                isSearching || !socketConnected || gamePhase !== 'lobby'
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-red-600 to-orange-600 text-white hover:from-red-700 hover:to-orange-700'
              }`}
              title="Joins any available match regardless of bet amount"
          >
              {isSearching ? '⚡ Joining...' : '⚡ Instant Match'}
          </button>
            
            {/* Instant Match Tooltip */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
              <div className="text-center">
                <div className="font-bold">⚡ Instant Match</div>
                <div>Joins ANY available match immediately</div>
                <div className="text-red-300">Speed focused • Ignores bet preferences</div>
              </div>
              {/* Arrow */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black"></div>
            </div>
          </div>
        </div>

        {/* Status Display */}
        {isSearching && searchStatus && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 text-center"
          >
            <div className="bg-bg-card rounded-lg p-3">
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-accent-primary"></div>
                <span className="text-text-primary font-inter">{searchStatus}</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Help Text */}
        <div className="mt-4 text-center">
          <p className="text-xs text-text-secondary font-inter">
            Smart Search finds matches for your selected amounts • Instant Match joins any available game
          </p>
        </div>
      </div>
    </motion.div>
  );
} 