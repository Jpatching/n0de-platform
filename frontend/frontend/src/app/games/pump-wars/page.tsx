
'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { usePV3 } from '@/hooks/usePV3';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import PageHeader from '@/components/PageHeader';
import Avatar from '@/components/Avatar';
import { matchService } from '@/services/matchService';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import ChatPanel from '@/components/ChatPanel';
import { audioSprite } from '@/lib/audioSprite';
import FloatingPanel from '@/components/FloatingPanel';
import { PnLCardModal } from '@/components/PnLCardModal';
import RecentWins from '@/components/RecentWins';
import GameOverviewPanel from '@/components/panels/GameOverviewPanel';
import ChatPanelContent from '@/components/panels/ChatPanel';
import StatsPanel from '@/components/panels/StatsPanel';
import SettingsPanel from '@/components/panels/SettingsPanel';
import { TrendingUp, TrendingDown, Clock, Users, DollarSign, Trophy, Zap, Target, BarChart3, Activity, 
         Maximize2, Minimize2, Bookmark, BookmarkCheck, X, Settings, Info, MessageCircle, Home, 
         Rocket, Timer, Coins, Star, Flame, Award, ChevronUp, ChevronDown, RefreshCw, Play, 
         Pause, RotateCcw, Volume2, VolumeX, Eye, EyeOff, Lock, Unlock, ArrowUp, ArrowDown } from 'lucide-react';

type GamePhase = 'lobby' | 'creating' | 'waiting' | 'joining' | 'playing' | 'betting' | 'tracking' | 'payout' | 'completed' | 'round-complete' | 'finished' | 'payout-complete';

interface Match {
  id: string;
  wager: number;
  status: string;
  player1: { id: string; wallet: string; username?: string };
  player2?: { id: string; wallet: string; username?: string };
}

interface Opponent {
  id: string;
  wallet: string;
  username?: string;
}

// Token address mapping for Dexscreener
const getDexscreenerTokenAddress = (token: string): string => {
  const tokenAddresses: { [key: string]: string } = {
    'sol': 'So11111111111111111111111111111111111111112',
    'bonk': 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    'wif': 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
    'pepe': 'BzBBveUDymEYoYzcMWeCBPotWxo8LCSzmcx8FhRDEGjX',
    'jup': 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
    'pyth': 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3',
    'ray': '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
    'jito': 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn',
    'popcat': '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr',
    'usdc': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    'usdt': 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    'wen': 'WENWENvqqNya429ubCdR81ZmD69brwQaaBYY6p3LCpk'
  };
  
  return tokenAddresses[token.toLowerCase()] || tokenAddresses['sol'];
};

// 🔥 DYNAMIC TOKEN SYSTEM: Fetch hundreds of verified tokens from Jupiter
interface JupiterToken {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
  daily_volume?: number;
}

// Cache for token data
let cachedTokens: JupiterToken[] = [];
let lastTokenFetch = 0;
const TOKEN_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Fetch verified tokens from Jupiter Token API V2
const fetchVerifiedTokens = async (): Promise<JupiterToken[]> => {
  try {
    // Check cache first
    if (cachedTokens.length > 0 && Date.now() - lastTokenFetch < TOKEN_CACHE_DURATION) {
      return cachedTokens;
    }

    // Fetch verified tokens from Jupiter Token API V1 (working endpoint)
    const response = await fetch('https://tokens.jup.ag/tokens?tags=verified', {
      headers: { 
        'Accept': 'application/json',
        'Origin': 'https://pv3.games' // Required for rate limiting
      }
    });
    
    if (!response.ok) {
      throw new Error(`Token API error: ${response.status}`);
    }
    
    const tokens = await response.json() as JupiterToken[];
    
    // Filter tokens with good volume and exclude stablecoins for more volatility
    const filteredTokens = tokens
      .filter(token => 
        token.daily_volume && 
        token.daily_volume > 10000 && // Min $10k daily volume
        !['USDC', 'USDT', 'USDH', 'PAI'].includes(token.symbol.toUpperCase()) && // Exclude stablecoins
        token.symbol.length <= 10 && // Reasonable symbol length
        token.address !== 'So11111111111111111111111111111111111111112' // Exclude native SOL
      )
      .sort((a, b) => (b.daily_volume || 0) - (a.daily_volume || 0)) // Sort by volume
      .slice(0, 500); // Top 500 tokens

    // Add SOL manually at the beginning
    const solToken: JupiterToken = {
      address: 'So11111111111111111111111111111111111111112',
      name: 'Solana',
      symbol: 'SOL',
      decimals: 9,
      logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
      daily_volume: 1000000000 // High volume for sorting
    };

    cachedTokens = [solToken, ...filteredTokens];
    lastTokenFetch = Date.now();
    
    console.log(`🚀 Fetched ${cachedTokens.length} verified tokens for Pump Wars`);
    return cachedTokens;
    
  } catch (error) {
    console.error('Error fetching tokens:', error);
    
    // Return fallback tokens if API fails
    return [
      { address: 'So11111111111111111111111111111111111111112', name: 'Solana', symbol: 'SOL', decimals: 9 },
      { address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', name: 'Bonk', symbol: 'BONK', decimals: 5 },
      { address: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm', name: 'dogwifhat', symbol: 'WIF', decimals: 6 },
      { address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', name: 'Jupiter', symbol: 'JUP', decimals: 6 },
      { address: 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3', name: 'Pyth Network', symbol: 'PYTH', decimals: 6 }
    ];
  }
};

// Validate token availability on both platforms
const validateTokenAvailability = async (tokenAddress: string): Promise<boolean> => {
  try {
    // Check Jupiter Price API
    const priceResponse = await fetch(`https://lite-api.jup.ag/price/v3?ids=${tokenAddress}`);
    const priceData = await priceResponse.json();
    
    if (!priceData[tokenAddress] || !priceData[tokenAddress].usdPrice) {
      return false;
    }

    // Check Dexscreener (simplified - we assume if price API works, charts work)
    // In production, you could also validate Dexscreener availability
    
    return true;
  } catch (error) {
    console.warn(`Token ${tokenAddress} validation failed:`, error);
    return false;
  }
};

// Select random token from verified list
const selectRandomToken = async (): Promise<{ symbol: string; address: string }> => {
  try {
    const tokens = await fetchVerifiedTokens();
    const randomToken = tokens[Math.floor(Math.random() * Math.min(tokens.length, 100))]; // Top 100 for reliability
    
    return {
      symbol: randomToken.symbol,
      address: randomToken.address
    };
  } catch (error) {
    console.error('Error selecting random token:', error);
    // Fallback to SOL
    return {
      symbol: 'SOL',
      address: 'So11111111111111111111111111111111111111112'
    };
  }
};

// Enhanced token address mapping that works with dynamic tokens
const getTokenAddress = (tokenSymbol: string): string => {
  // For dynamically selected tokens, we should store the address when selected
  // This is a simplified version - in production you'd maintain a map
  const staticMap: { [key: string]: string } = {
    'SOL': 'So11111111111111111111111111111111111111112',
    'BONK': 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    'WIF': 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
    'JUP': 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
    'PYTH': 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3',
  };
  
  return staticMap[tokenSymbol.toUpperCase()] || staticMap['SOL'];
};

const PumpWarsChart = ({ 
  token, 
  tokenSymbol,
  timeRemaining, 
  startPrice, 
  currentPrice, 
  priceHistory, 
  gamePhase,
  roundStartTime
}: {
  token: string;
  tokenSymbol: string;
  timeRemaining: number | null;
  startPrice: number | null;
  currentPrice: number | null;
  priceHistory: Array<{timestamp: number, price: number}>;
  gamePhase: string;
  roundStartTime?: number | null;
}) => {
  // Use the passed-in prices from the main component for perfect sync
  const displayPrice = currentPrice || startPrice;
  
  // Price change calculation based on game phase
  let priceChange = 0;
  let priceChangePercent = 0;
  
  if (gamePhase === 'tracking' || gamePhase === 'payout') {
    // During tracking/payout: compare current price to start price
    if (currentPrice && startPrice) {
      priceChange = currentPrice - startPrice;
      priceChangePercent = (priceChange / startPrice) * 100;
    }
  } else {
    // During betting/waiting: show 0% change (no tracking yet)
    priceChangePercent = 0;
  }

  // Calculate Dexscreener URL with stable parameters
  const getDexscreenerUrl = () => {
    const baseUrl = `https://dexscreener.com/solana/${token}`;
    const params = new URLSearchParams({
      embed: '1',
      theme: 'dark',
      trades: '0',
      info: '0',
      interval: '1', // Always use 1 minute chart for maximum responsiveness
      autoRefresh: '1', // Enable auto-refresh for real-time updates
      // Add cache-busting parameter for new rounds to ensure fresh chart data
      t: gamePhase === 'betting' ? Date.now().toString() : '1' 
    });

    return `${baseUrl}?${params.toString()}`;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Chart Header - Jupiter API Price Display */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-xl font-bold text-purple-400">{tokenSymbol}/USD</div>
            <div className="text-2xl font-bold">
              ${displayPrice?.toFixed(2) || 'Loading...'}
            </div>
            <div className={`text-sm px-2 py-1 rounded ${priceChangePercent >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
              {priceChangePercent >= 0 ? '+' : ''}{priceChangePercent.toFixed(2)}%
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400">Time Remaining</div>
            <div className="text-lg font-bold">{timeRemaining || 0}s</div>
          </div>
        </div>
      </div>

      {/* Chart Area - Clean Dexscreener Chart Only */}
      <div className="flex-1 relative bg-gray-900/50">
        {/* Token Debug Info */}
        <div className="absolute top-2 left-2 bg-gray-900/80 backdrop-blur-sm rounded-lg px-2 py-1 border border-gray-700 text-xs z-10">
          <div className="text-gray-400">Token: {tokenSymbol}</div>
          <div className="text-gray-500 font-mono text-xs">{token.slice(0, 8)}...</div>
        </div>
        
        {/* Dexscreener iframe */}
        <iframe
          key={`dexscreener-${token}`}
          src={getDexscreenerUrl()}
          className="w-full h-full border-0 rounded-lg"
          style={{ 
            minHeight: '400px',
            background: 'transparent'
          }}
          title={`${tokenSymbol} Price Chart`}
          loading="eager"
          sandbox="allow-scripts allow-same-origin allow-popups"
        />
      </div>
    </div>
  );
};



export default function PumpWarsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { connected, publicKey, formatSOL, vaultBalance, loading } = usePV3();
  
  // Check if user is authenticated
  const isAuthenticated = !!user;
  const hasVaultFunds = vaultBalance > 0;
  
  const [error, setError] = useState<string | null>(null);
  

  
  // Game state - Following exact same pattern as RPS/Crash/Mines
  const [gamePhase, setGamePhase] = useState<GamePhase>('lobby');
  const [currentRoundId, setCurrentRoundId] = useState<string | null>(null);
  const [roundStartTime, setRoundStartTime] = useState<number | null>(null);
  const [bettingTimeRemaining, setBettingTimeRemaining] = useState<number | null>(null);
  const [gameLoading, setGameLoading] = useState(false);
  const [gameStateLoading, setGameStateLoading] = useState(false);
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);
  const [opponent, setOpponent] = useState<Opponent | null>(null);
  
  // UI state - Exact same pattern as other games
  const [socketConnected, setSocketConnected] = useState(false);
  const [availableMatches, setAvailableMatches] = useState<Match[]>([]);
  const [wagerAmount, setWagerAmount] = useState(0.1);

  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Fullscreen mode state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 🚀 UNIVERSAL SYSTEM: Floating panel states - Exact Crash/Mines style
  const [openPanels, setOpenPanels] = useState({
    overview: false,
    chat: false,
    settings: false,
    stats: false,
    favorites: false,
    recentwins: false
  });

  // 🚀 UNIVERSAL SYSTEM: Drag & Drop Panel System - INDIVIDUAL DOCKING 🔥
  const [isDragging, setIsDragging] = useState(false);
  const [draggedPanel, setDraggedPanel] = useState<string | null>(null);
  const [isOverDropZone, setIsOverDropZone] = useState(false);
  const [dockedPanels, setDockedPanels] = useState<Set<string>>(new Set());
  
  // Resizable docked panels state
  const [dockedPanelHeights, setDockedPanelHeights] = useState<Record<string, number>>({
    overview: 300,
    chat: 250,
    settings: 280,
    stats: 320,
    favorites: 260,
    recentwins: 280
  });
  const [resizingPanel, setResizingPanel] = useState<string | null>(null);

  // Victory Screen State - Universal Pattern
  const [showPnLCard, setShowPnLCard] = useState(false);
  const [rematchLoading, setRematchLoading] = useState(false);

  // 🎰 GAMBLING PSYCHOLOGY STATE
  const [winStreak, setWinStreak] = useState(0);
  const [lossStreak, setLossStreak] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);
  const [isOnFire, setIsOnFire] = useState(false); // 3+ win streak
  const [hotStreak, setHotStreak] = useState(0);
  const [maxWinStreak, setMaxWinStreak] = useState(0);

  // 🚀 PUMP WARS SPECIFIC STATE
  const [selectedToken, setSelectedToken] = useState('SOL');
  const [selectedTokenAddress, setSelectedTokenAddress] = useState('So11111111111111111111111111111111111111112');
  const [selectedTimeFrame, setSelectedTimeFrame] = useState(60); // seconds
  const [availableTokens, setAvailableTokens] = useState<JupiterToken[]>([]);
  const [tokenLoadingError, setTokenLoadingError] = useState<string | null>(null);
  const [priceDirection, setPriceDirection] = useState<'up' | 'down' | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [startPrice, setStartPrice] = useState<number | null>(null);
  const [endPrice, setEndPrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<number | null>(null);
  const [priceChangePercent, setPriceChangePercent] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [payoutTimeRemaining, setPayoutTimeRemaining] = useState<number | null>(null);
  const [roundEndTime, setRoundEndTime] = useState<number | null>(null);
  const [playerPrediction, setPlayerPrediction] = useState<'up' | 'down' | null>(null);
  const [roundResult, setRoundResult] = useState<'win' | 'loss' | 'tie' | null>(null);
  const [matchResult, setMatchResult] = useState<'victory' | 'defeat' | 'tie' | null>(null);
  const [payoutAmount, setPayoutAmount] = useState<number | null>(null);
  const [potentialWinnings, setPotentialWinnings] = useState<number | null>(null);
  const [priceHistory, setPriceHistory] = useState<Array<{timestamp: number, price: number}>>([]);
  const [chartData, setChartData] = useState<Array<{time: number, price: number}>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [animationPhase, setAnimationPhase] = useState<'idle' | 'countdown' | 'active' | 'revealing' | 'complete'>('idle');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [autoRematch, setAutoRematch] = useState(false);
  const [favoriteTokens, setFavoriteTokens] = useState<string[]>(['SOL', 'BONK']);
  const [recentPnL, setRecentPnL] = useState<number>(0);
  const [dailyPnL, setDailyPnL] = useState<number>(0);
  const [weeklyPnL, setWeeklyPnL] = useState<number>(0);
  const [monthlyPnL, setMonthlyPnL] = useState<number>(0);
  const [winRate, setWinRate] = useState<number>(0);
  const [avgWinAmount, setAvgWinAmount] = useState<number>(0);
  const [avgLossAmount, setAvgLossAmount] = useState<number>(0);
  const [biggestWin, setBiggestWin] = useState<number>(0);
  const [biggestLoss, setBiggestLoss] = useState<number>(0);
  const [volumeTraded, setVolumeTraded] = useState<number>(0);
  const [favoriteTimeFrame, setFavoriteTimeFrame] = useState<number>(60);
  const [bestToken, setBestToken] = useState<string>('SOL');
  const [worstToken, setWorstToken] = useState<string>('');
  const [lastGameResult, setLastGameResult] = useState<'win' | 'loss' | 'tie' | null>(null);
  const [consecutiveWins, setConsecutiveWins] = useState(0);
  const [consecutiveLosses, setConsecutiveLosses] = useState(0);
  const [currentSession, setCurrentSession] = useState({
    startTime: Date.now(),
    gamesPlayed: 0,
    pnl: 0,
    winRate: 0
  });

  // 👥 MULTIPLAYER STATE (up to 100 players per round)
  const [totalPlayersInRound, setTotalPlayersInRound] = useState<number>(1);
  const [pumpPredictions, setPumpPredictions] = useState<number>(0);
  const [dumpPredictions, setDumpPredictions] = useState<number>(0);
  const [totalPot, setTotalPot] = useState<number>(0);
  const [winnersPot, setWinnersPot] = useState<number>(0);

  // 🎯 BET TRACKING STATE
  const [betPlaced, setBetPlaced] = useState(false);
  const [playerBetAmount, setPlayerBetAmount] = useState<number>(0);
  const [playerBetPrediction, setPlayerBetPrediction] = useState<'up' | 'down' | null>(null);
  
  // 🔒 ROUND PROTECTION STATE
  const [roundTimerActive, setRoundTimerActive] = useState(false);

  // 🚀 PERFORMANCE: Audio effects using optimized sprite system
  const playSound = (soundName: string) => {
    if (soundEnabled) {
      audioSprite.play(soundName);
    }
  };

  // 🎮 MULTIPLAYER SIMULATION - Demo logic for round participants
  useEffect(() => {
          if (gamePhase === 'betting' || gamePhase === 'tracking') {
      // Simulate players joining the round
      const interval = setInterval(() => {
        setTotalPlayersInRound(prev => Math.min(100, prev + Math.floor(Math.random() * 3)));
        setPumpPredictions(prev => prev + Math.floor(Math.random() * 2));
        setDumpPredictions(prev => prev + Math.floor(Math.random() * 2));
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [gamePhase]);

  // Calculate multiplayer pot and winnings
  useEffect(() => {
    const avgBet = 0.5; // Average bet size
    const newTotalPot = totalPlayersInRound * avgBet;
    setTotalPot(newTotalPot);
    
    // Calculate potential winnings based on prediction split
    const yourPredictionCount = playerPrediction === 'up' ? pumpPredictions : dumpPredictions;
    const winnersShare = yourPredictionCount > 0 ? (newTotalPot * 0.9) / yourPredictionCount : 0; // 10% platform fee
    setPotentialWinnings(winnersShare);
  }, [totalPlayersInRound, pumpPredictions, dumpPredictions, playerPrediction]);

  // 🚀 UNIVERSAL SYSTEM: Panel Management Functions - Exact Crash style
  const togglePanel = (panelId: keyof typeof openPanels) => {
    setOpenPanels(prev => ({
      ...prev,
      [panelId]: !prev[panelId]
    }));
  };

  const closePanel = (panelId: keyof typeof openPanels) => {
    setOpenPanels(prev => ({
      ...prev,
      [panelId]: false
    }));
  };

  const toggleFullscreen = () => {
    setIsFullscreen(prev => !prev);
  };

  // 🚀 PERFORMANCE: Drag & Drop Functions with useCallback optimization
  const handleDragStart = useCallback((e: React.DragEvent, panelId: string) => {
    e.dataTransfer.setData('text/plain', panelId);
    setDraggedPanel(panelId);
    setIsDragging(true);
    playSound('click');
  }, []);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    setDraggedPanel(null);
    setIsOverDropZone(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsOverDropZone(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsOverDropZone(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const panelId = e.dataTransfer.getData('text/plain');
    if (panelId) {
      setDockedPanels(prev => new Set([...prev, panelId]));
      setOpenPanels(prev => ({ ...prev, [panelId]: false }));
      setIsOverDropZone(false);
      setIsDragging(false);
      setDraggedPanel(null);
      playSound('success');
      console.log(`🔥 Panel ${panelId} docked to dashboard!`);
    }
  }, []);

  const handleUndockPanel = useCallback((panelId: string) => {
    setDockedPanels(prev => {
      const newSet = new Set(prev);
      newSet.delete(panelId);
      return newSet;
    });
    setOpenPanels(prev => ({ ...prev, [panelId]: true }));
    playSound('click');
  }, []);

  // 🚀 PERFORMANCE: Panel resizing with useCallback
  const handlePanelResize = useCallback((panelId: string, newHeight: number) => {
    setDockedPanelHeights(prev => ({
      ...prev,
      [panelId]: Math.max(200, Math.min(800, newHeight))
    }));
  }, []);

  const handleResizeStart = useCallback((panelId: string) => {
    setResizingPanel(panelId);
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newHeight = moveEvent.clientY;
      handlePanelResize(panelId, newHeight);
    };
    
    const handleMouseUp = () => {
      setResizingPanel(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [handlePanelResize]);

  // 🚀 DYNAMIC TOKEN LOADING: Load hundreds of verified tokens on mount
  useEffect(() => {
    const loadTokens = async () => {
      try {
        const tokens = await fetchVerifiedTokens();
        setAvailableTokens(tokens);
        console.log(`✅ Loaded ${tokens.length} verified tokens for Pump Wars`);
      } catch (error) {
        console.error('Failed to load tokens:', error);
        setTokenLoadingError('Failed to load token list');
      }
    };
    
    loadTokens();
  }, []);

  const timeFrames = [
    { value: 30, label: '30s', description: 'Lightning' },
    { value: 60, label: '1m', description: 'Quick' },
    { value: 300, label: '5m', description: 'Strategic' },
    { value: 900, label: '15m', description: 'Expert' }
  ];

  // Initialize game state on page load
  useEffect(() => {
    if (isAuthenticated) {
      loadCurrentGameState();
    }
  }, [isAuthenticated]);

  // Initialize socket connection and automatic round creation
  useEffect(() => {
    if (isAuthenticated) {
      // Socket connection is handled by the main socketService when placing bets
      setSocketConnected(true);
      
      // Start automatic round creation system
      startAutomaticRounds();
    }
  }, [isAuthenticated]);

  // Auto-start new rounds after completion with proper timing
  useEffect(() => {
    if (gamePhase === 'completed') {
      // Wait 8 seconds to show results, then start new round
      const roundRestartTimer = setTimeout(() => {
        setGamePhase('waiting');
        // Another 3 seconds for waiting phase, then start new round
        setTimeout(() => {
          startNewRound();
        }, 3000);
      }, 8000);
      
      return () => clearTimeout(roundRestartTimer);
    }
  }, [gamePhase]);

  // Automatic round creation system
  const startAutomaticRounds = () => {
    // If no round is active, start one immediately
    if (!currentRoundId) {
      setTimeout(() => {
        startNewRound();
      }, 2000); // 2 second delay to allow UI to settle
    }
  };

  // Start a new round with random token
  const startNewRound = async () => {
    try {
      // 🔒 Prevent multiple rounds from starting simultaneously
      if (roundTimerActive) {
        console.log('🚫 Round already in progress, ignoring start request');
        return;
      }
      
      console.log('🚀 Starting new Pump Wars round...');
      
      // 📊 API CALL SCHEDULE (6 calls max per round):
      // Call 1/6: Initial price fetch (here)
      // Call 2/6: Mid-betting update (15s)
      // Call 3/6: Tracking start price (startPriceTracking)
      // Call 4/6: Mid-tracking update (90s remaining)
      // Call 5/6: Late-tracking update (60s remaining)
      // Call 6/6: Final price (endRound)
      setRoundTimerActive(true);
      
      // Reset round state first (keeping previous chart until betting starts)
      setGamePhase('betting');
      setBettingTimeRemaining(30); // 30 second betting window
      setTimeRemaining(null);
      setPayoutTimeRemaining(null);
      setStartPrice(null);
      setCurrentPrice(null);
      setPriceChangePercent(null);
      setBetPlaced(false);
      setPlayerPrediction(null);
      setTotalPlayersInRound(0);
      setPumpPredictions(0);
      setDumpPredictions(0);
      setTotalPot(0);
      setPotentialWinnings(0);
      setRoundStartTime(null);
      
      // Select random token for this round
      const randomToken = await selectRandomToken();
      
      // Generate unique round ID
      const roundId = `pump_wars_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setCurrentRoundId(roundId);
      
      // Only update token and chart when we actually start the new round
      setSelectedToken(randomToken.symbol);
      setSelectedTokenAddress(randomToken.address);
      
      // 🎯 INITIAL PRICE FETCH: Call 1/6 - Get starting price for chart header
      try {
        const initialPrice = await fetchTokenPrice(randomToken.address);
        if (initialPrice) {
          setCurrentPrice(initialPrice);
          console.log(`💰 Initial price loaded for ${randomToken.symbol}: $${initialPrice.toFixed(2)} (Call 1/6)`);
        }
      } catch (error) {
        console.error('Failed to fetch initial price:', error);
      }
      
      // Start betting countdown with minimal price updates (max 6 calls per round)
      const bettingInterval = setInterval(async () => {
        setBettingTimeRemaining(prev => {
          if (prev && prev > 1) {
            // Strategic update: Mid-betting price check (Call 2/6)
            if (prev === 15) {
              fetchTokenPrice(randomToken.address).then(price => {
                if (price) {
                  setCurrentPrice(price);
                  console.log(`💰 Mid-betting price update: $${price.toFixed(2)} (Call 2/6)`);
                }
              });
            }
            return prev - 1;
          } else {
            clearInterval(bettingInterval);
            // Only start price tracking when betting countdown actually finishes
            startPriceTracking(roundId, randomToken);
            return null;
          }
        });
      }, 1000);
      
      console.log(`🎯 New round started: ${roundId} with token ${randomToken.symbol}`);
      
    } catch (error) {
      console.error('💥 Error starting new round:', error);
      setError('Failed to start new round');
      setRoundTimerActive(false); // Clear protection on error
    }
  };

  // Start price tracking phase
  const startPriceTracking = async (roundId: string, token: { symbol: string; address: string }) => {
    try {
      console.log(`📊 Starting price tracking for round ${roundId}`);
      
      // Get tracking baseline price (Call 3/6)
      const initialPrice = await fetchTokenPrice(token.address);
      if (!initialPrice) {
        throw new Error('Failed to get tracking baseline price');
      }
      
      // NOW update the chart with new token data
      setStartPrice(initialPrice);
      setCurrentPrice(initialPrice);
      setGamePhase('tracking');
      setTimeRemaining(120); // 120 second tracking period (2 minutes)
      setRoundStartTime(Date.now());
      
      // Initialize fresh price history for the new token
      const initialPricePoint = { timestamp: Date.now(), price: initialPrice };
      setPriceHistory([initialPricePoint]);
      
      // 🎯 STRATEGIC TIMING: Only 3 price updates during 120s tracking (max 6 calls per round)
      const roundInterval = setInterval(async () => {
        setTimeRemaining(prev => {
          if (prev && prev > 1) {
            // Strategic price updates at key moments during tracking
            if (prev === 90 || prev === 60) {
              // Call 4/6 and 5/6 (final call 6/6 happens in endRound)
              const callNumber = prev === 90 ? '4/6' : '5/6';
              fetchTokenPrice(token.address).then(currentPriceValue => {
                if (currentPriceValue) {
                  setCurrentPrice(currentPriceValue);
                  const priceChange = ((currentPriceValue - initialPrice) / initialPrice) * 100;
                  setPriceChangePercent(priceChange);
                  
                  console.log(`💰 Tracking price update: $${currentPriceValue.toFixed(2)} (${priceChange.toFixed(2)}%) (Call ${callNumber})`);
                  
                  // Update price history
                  setPriceHistory(prev => [...prev, {
                    timestamp: Date.now(),
                    price: currentPriceValue
                  }]);
                }
              });
            }
            
            return prev - 1;
          } else {
            clearInterval(roundInterval);
            // End round only when countdown finishes
            endRound(roundId, token, initialPrice);
            return 0;
          }
        });
      }, 1000);
      
    } catch (error) {
      console.error('💥 Error in price tracking:', error);
      setError('Failed to track price');
    }
  };

  // End round and start payout phase
  const endRound = async (roundId: string, token: { symbol: string; address: string }, initialPrice: number) => {
    try {
      console.log(`🏁 Ending round ${roundId}`);
      
      // Get final price for result calculation (Call 6/6)
      const finalPrice = await fetchTokenPrice(token.address);
      if (!finalPrice) {
        throw new Error('Failed to get final price');
      }
      
      const finalPriceChange = ((finalPrice - initialPrice) / initialPrice) * 100;
      setPriceChangePercent(finalPriceChange);
      setCurrentPrice(finalPrice);
      
      console.log(`💰 Final price: $${finalPrice.toFixed(2)} (${finalPriceChange.toFixed(2)}%) (Call 6/6)`);
      
      // Determine winning direction
      const winningDirection = finalPriceChange > 0 ? 'up' : 'down';
      
      // Check if player won
      const playerWon = playerPrediction === winningDirection;
      
      // Update session stats
      if (betPlaced) {
        setCurrentSession(prev => ({
          ...prev,
          gamesPlayed: prev.gamesPlayed + 1,
          pnl: prev.pnl + (playerWon ? wagerAmount : -wagerAmount)
        }));
        
        if (playerWon) {
          setWinStreak(prev => prev + 1);
          setLossStreak(0);
        } else {
          setLossStreak(prev => prev + 1);
          setWinStreak(0);
        }
      }
      
      // Start payout phase (15 seconds)
      setGamePhase('payout');
      setPayoutTimeRemaining(15);
      
      console.log(`🎉 Round ${roundId} completed: ${token.symbol} ${finalPriceChange.toFixed(2)}% - Winner: ${winningDirection.toUpperCase()}`);
      
      // Start payout countdown
      const payoutInterval = setInterval(() => {
        setPayoutTimeRemaining(prev => {
          if (prev && prev > 1) {
            return prev - 1;
          } else {
            clearInterval(payoutInterval);
            // Clear round protection before starting new round
            setRoundTimerActive(false);
            // After payout, automatically start new round
            startNewRound();
            return null;
          }
        });
      }, 1000);
      
    } catch (error) {
      console.error('💥 Error ending round:', error);
      setError('Failed to end round');
    }
  };

  // Helper function to fetch token price
  const fetchTokenPrice = async (tokenAddress: string): Promise<number | null> => {
    try {
      const response = await fetch(`https://api.jup.ag/price/v2?ids=${tokenAddress}`, {
        headers: { 'Accept': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`Price API error: ${response.status}`);
      }
      
      const data = await response.json();
      return data.data?.[tokenAddress]?.price || null;
    } catch (error) {
      console.error('💥 Error fetching token price:', error);
      return null;
    }
  };

  // Load available matches - EXACT same pattern as other games
  useEffect(() => {
    if (gamePhase === 'playing' && isAuthenticated) {
      loadAvailableMatches();
      const interval = setInterval(loadAvailableMatches, 5000);
      return () => clearInterval(interval);
    }
  }, [gamePhase, isAuthenticated]);

  // Load current game state from backend
  const loadCurrentGameState = async () => {
    try {
      setGameStateLoading(true);
      
      // 🔒 CRITICAL FIX: Don't change tokens during active rounds
      if (gamePhase === 'betting' || gamePhase === 'tracking' || gamePhase === 'payout') {
        console.log('🚫 Skipping game state sync - round in progress to prevent token changes');
        setGameStateLoading(false);
        return;
      }
      
      const apiUrl = process.env.NEXT_PUBLIC_PUMP_WARS_API_URL || 'https://pump-wars-backend-production.up.railway.app';
      const response = await fetch(`${apiUrl}/pump-wars/state`);
      if (!response.ok) {
        throw new Error('Failed to load current game state');
      }
      
      const result = await response.json();
      console.log('🚀 Current game state loaded:', result);
      
      if (result.success && result.data && result.data.currentRound) {
        const round = result.data.currentRound;
        
        // Set current round data - but only update tokens if not in active round
        setCurrentRoundId(round.id);
        
        // 🔒 Only change tokens if we're not in an active local round
        if (gamePhase === 'waiting' || gamePhase === 'completed' || gamePhase === 'lobby') {
        setSelectedToken(round.token.symbol);
        setSelectedTokenAddress(round.token.mint);
        }
        
        setStartPrice(round.prices.startPrice);
        setCurrentPrice(round.prices.endPrice);
        
        console.log('🎯 Token state updated:', {
          symbol: round.token.symbol,
          mint: round.token.mint,
          oldToken: selectedToken,
          newToken: round.token.symbol
        });
        
        // Calculate time remaining in seconds from the API
        const timeRemainingSeconds = Math.max(0, Math.ceil(round.timing.timeRemaining / 1000));
        
        // Set game phase based on round status from API
        if (round.status === 'betting') {
          setGamePhase('betting');
          setBettingTimeRemaining(timeRemainingSeconds);
          setTimeRemaining(null);
        } else if (round.status === 'tracking') {
          setGamePhase('tracking');
          setBettingTimeRemaining(null);
          setTimeRemaining(timeRemainingSeconds);
        } else if (round.status === 'completed') {
          setGamePhase('completed');
          setTimeRemaining(0);
          setBettingTimeRemaining(null);
          setEndPrice(round.prices.endPrice);
        }
        
        // Set round statistics from betting object (these are SOL amounts, not player counts)
        const totalPotSOL = round.betting.totalUpBets + round.betting.totalDownBets;
        const estimatedPlayers = totalPotSOL > 0 ? Math.ceil(totalPotSOL / 0.1) : 0; // Estimate based on 0.1 SOL average bet
        
        setTotalPlayersInRound(estimatedPlayers);
        setTotalPot(totalPotSOL);
        setPumpPredictions(round.betting.upPercentage);
        setDumpPredictions(round.betting.downPercentage);
        
        console.log('🎮 Game state initialized:', {
          phase: round.status,
          token: round.token.symbol,
          roundId: round.id,
          timeRemaining: timeRemainingSeconds,
          totalPot: totalPotSOL,
          estimatedPlayers: estimatedPlayers,
          upPercentage: round.betting.upPercentage,
          downPercentage: round.betting.downPercentage
        });
      } else {
        console.log('🎮 No active round found, staying in game interface');
        // Don't reset to lobby - users should stay in the game interface
        // and see the waiting state instead
        setCurrentRoundId(null);
        
        // Reset round-specific state for next round
        setPlayerPrediction(null);
        setBetPlaced(false);
        setTimeRemaining(null);
        setBettingTimeRemaining(null);
        setStartPrice(null);
        setCurrentPrice(null);
        setEndPrice(null);
        setPriceChangePercent(null);
        
        // Keep the current game phase if already in game, otherwise set to playing
        if (gamePhase === 'lobby') {
          setGamePhase('playing');
        }
      }
      
    } catch (error) {
      console.error('Failed to load current game state:', error);
      setError('Failed to connect to game server');
    } finally {
      setGameStateLoading(false);
    }
  };



  const loadAvailableMatches = async () => {
    try {
      const matches = await matchService.getAvailableMatches('pump-wars');
      setAvailableMatches(matches);
    } catch (err) {
      console.error('Failed to load matches:', err);
    }
  };

  // Create match function - EXACT same pattern as other games
  const handleCreateMatch = async () => {
    if (!isAuthenticated || !hasVaultFunds) return;
    
    try {
      setGameLoading(true);
      const match = await matchService.createPumpWarsMatch(wagerAmount);
      
      setCurrentMatch(match);
      setGamePhase('waiting');
      playSound('createMatch');
      
    } catch (error: any) {
      console.error('Failed to create match:', error);
      setError(error.message);
      setGamePhase('playing');
    } finally {
      setGameLoading(false);
    }
  };

  // Join match function - EXACT same pattern as other games
  const handleJoinMatch = async (matchId: string) => {
    if (!isAuthenticated || !hasVaultFunds) return;
    
    try {
      setGameLoading(true);
      const match = await matchService.joinMatch(matchId);
      
      setCurrentMatch(match);
      setGamePhase('betting');
      playSound('joinMatch');
      
    } catch (error: any) {
      console.error('Failed to join match:', error);
      setError(error.message);
      setGamePhase('playing');
    } finally {
      setGameLoading(false);
    }
  };

  // Join current round function
  const handleStartGame = async () => {
    if (!isAuthenticated || !hasVaultFunds || wagerAmount <= 0) {
      setError('Please ensure you are authenticated, have vault funds, and set a valid wager amount');
      return;
    }

    if (!playerPrediction) {
      setError('Please select PUMP or DUMP prediction first');
      return;
    }

    if (vaultBalance < wagerAmount) {
      setError(`Insufficient vault balance. Need ${wagerAmount} SOL, you have ${formatSOL(vaultBalance)} SOL`);
      return;
    }

    if (!currentRoundId) {
      setError('No active betting round. Please wait for next round to start.');
      return;
    }

    try {
      setGameLoading(true);
      setError(null);
      
      console.log('🎯 Placing bet in local round system:', {
          roundId: currentRoundId,
        amount: wagerAmount,
          prediction: playerPrediction,
        token: selectedToken
      });
      
      // Update local state to indicate bet placed
      setBetPlaced(true);
      setPlayerBetAmount(wagerAmount);
      setPlayerBetPrediction(playerPrediction);
      
      // Update round analytics
      setTotalPlayersInRound(prev => prev + 1);
      setTotalPot(prev => prev + wagerAmount);
      
      if (playerPrediction === 'up') {
        setPumpPredictions(prev => prev + 1);
      } else {
        setDumpPredictions(prev => prev + 1);
      }
      
      // Calculate potential winnings (simplified 80% return for winners)
      const potentialWin = wagerAmount * 1.8;
      setPotentialWinnings(potentialWin);
      
      // Update session tracking
      setCurrentSession(prev => ({
        ...prev,
        gamesPlayed: prev.gamesPlayed + 1
      }));
      
      playSound('bet-placed');
      
      console.log('✅ Bet placed successfully in local round system');
      
    } catch (err) {
      console.error('💥 Error placing bet:', err);
      setError(err instanceof Error ? err.message : 'Failed to place bet');
    } finally {
      setGameLoading(false);
    }
  };

  // Handle game result
  const handleGameResult = async () => {
    try {
      // Validate price data
      if (!currentPrice || !startPrice) {
        setError('Price data unavailable');
        return;
      }

      // Calculate result based on price movement
      const priceChange = currentPrice - startPrice;
            const isPlayerCorrect = (playerPrediction === 'up' && priceChange > 0) ||
                             (playerPrediction === 'down' && priceChange < 0);
      
      if (isPlayerCorrect) {
        setWinStreak(prev => prev + 1);
        setLossStreak(0);
        setCurrentSession(prev => ({
          ...prev,
          pnl: prev.pnl + (wagerAmount * 0.8) // 80% payout
        }));
        playSound('winSound');
      } else {
        setLossStreak(prev => prev + 1);
        setWinStreak(0);
        setCurrentSession(prev => ({
          ...prev,
          pnl: prev.pnl - wagerAmount
        }));
        playSound('loseSound');
      }
      
      // Reset for next game
      setTimeout(() => {
        setGamePhase('playing');
        setPlayerPrediction(null);
        setStartPrice(0);
        setTimeRemaining(0);
      }, 3000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process game result');
    }
  };

  // Game timer for countdown updates
  useEffect(() => {
    if (gamePhase === 'betting' || gamePhase === 'tracking') {
      const timer = setInterval(() => {
        if (gamePhase === 'betting' && bettingTimeRemaining !== null) {
          setBettingTimeRemaining(prev => {
            if (prev === null || prev <= 0) {
              setGamePhase('tracking');
              setTimeRemaining(60);
              return null;
            }
            return prev - 1;
          });
        } else if (gamePhase === 'tracking' && timeRemaining !== null) {
          setTimeRemaining(prev => {
            if (prev === null || prev <= 0) {
              setGamePhase('completed');
              return 0;
            }
            return prev - 1;
          });
        }
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [gamePhase, bettingTimeRemaining, timeRemaining]);

  // Periodic game state sync
  useEffect(() => {
    if (isAuthenticated && gamePhase !== 'lobby') {
      const syncInterval = setInterval(() => {
        loadCurrentGameState();
      }, 10000); // Sync every 10 seconds
      
      return () => clearInterval(syncInterval);
    }
  }, [isAuthenticated, gamePhase]);

  // 🎮 GAME ENTRY PAGE - Description and Enter Game button
  // Only show lobby if: not authenticated OR explicitly in lobby mode (before entering game)
  if (!isAuthenticated || gamePhase === 'lobby') {
    return (
      <div className="min-h-screen bg-main text-text-primary">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <div className="lg:ml-64 min-h-screen">
          <PageHeader onMenuClick={() => setSidebarOpen(true)} />
          
          <main className="p-6">
            <div className="max-w-6xl mx-auto">
              {/* 🚀 HERO SECTION */}
              <div className="text-center mb-12">
                <div className="text-8xl mb-6 animate-bounce">🚀</div>
                <h1 className="text-6xl font-bold font-audiowide mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  PUMP WARS
                </h1>
                <p className="text-xl text-text-secondary font-inter max-w-2xl mx-auto leading-relaxed">
                  Every minute a random crypto token appears. Bet on whether its price will pump or dump in the next 60 seconds!
                </p>
              </div>

              {/* 🎯 GAME FEATURES GRID */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <Card className="p-6 bg-gradient-to-br from-green-900/20 to-green-700/20 border-green-500/30">
                  <div className="text-center">
                    <div className="text-4xl mb-4">📈</div>
                    <h3 className="text-xl font-bold text-green-400 mb-2">Real Price Data</h3>
                    <p className="text-sm text-gray-300">
                      Based on live crypto prices from major exchanges. No manipulation, pure market movements.
                    </p>
                  </div>
                </Card>
                
                <Card className="p-6 bg-gradient-to-br from-purple-900/20 to-purple-700/20 border-purple-500/30">
                  <div className="text-center">
                    <div className="text-4xl mb-4">⚡</div>
                    <h3 className="text-xl font-bold text-purple-400 mb-2">60-Second Rounds</h3>
                    <p className="text-sm text-gray-300">
                      Every round lasts exactly 60 seconds. Random token each round keeps it exciting!
                    </p>
                  </div>
                </Card>
                
                <Card className="p-6 bg-gradient-to-br from-orange-900/20 to-orange-700/20 border-orange-500/30">
                  <div className="text-center">
                    <div className="text-4xl mb-4">💰</div>
                    <h3 className="text-xl font-bold text-orange-400 mb-2">Proportional Payouts</h3>
                    <p className="text-sm text-gray-300">
                      Win more based on your bet amount. Higher bets = higher rewards!
                    </p>
                  </div>
                </Card>
              </div>

              {/* 🎲 HOW TO PLAY */}
              <Card className="mb-8 p-8 bg-gradient-to-br from-blue-900/10 to-purple-900/10 border-accent/20">
                <h2 className="text-3xl font-bold text-center mb-8 text-accent">How to Play</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">1️⃣</span>
                    </div>
                    <h3 className="font-bold mb-2">Place Your Bet</h3>
                    <p className="text-sm text-gray-400">Choose your bet amount in SOL</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">2️⃣</span>
                    </div>
                    <h3 className="font-bold mb-2">Watch Random Token</h3>
                    <p className="text-sm text-gray-400">Each round a random crypto appears</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">3️⃣</span>
                    </div>
                    <h3 className="font-bold mb-2">Predict Direction</h3>
                    <p className="text-sm text-gray-400">🚀 PUMP (up) or 📉 DUMP (down)</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">4️⃣</span>
                    </div>
                    <h3 className="font-bold mb-2">Win in 60 Seconds</h3>
                    <p className="text-sm text-gray-400">Every round lasts exactly 1 minute</p>
                  </div>
                </div>
              </Card>

              {/* ⚠️ AUTH WARNING */}
              {!isAuthenticated && (
                <Card className="mb-8 p-6 bg-yellow-500/10 border border-yellow-500/20">
                  <div className="flex items-center space-x-3">
                    <div className="text-3xl">⚠️</div>
                    <div>
                      <h3 className="text-lg font-bold text-yellow-500 font-audiowide">Connect Wallet Required</h3>
                      <p className="text-text-secondary font-inter">
                        Sign in with your Solana wallet to start playing Pump Wars
                      </p>
                    </div>
                  </div>
                </Card>
              )}

              {/* 💰 VAULT BALANCE */}
              {isAuthenticated && (
                <Card className="mb-8 p-6 bg-gradient-to-r from-green-900/20 to-blue-900/20 border-accent/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-accent">🏦 Vault Balance</h3>
                      <p className="text-3xl font-bold">{formatSOL(vaultBalance)} SOL</p>
                      <p className="text-sm text-gray-400">Ready for price prediction battles</p>
                    </div>
                    {!hasVaultFunds && (
                      <div className="text-center">
                        <Badge variant="destructive" className="mb-2">Deposit Required</Badge>
                        <p className="text-xs text-gray-400">Add SOL to start playing</p>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* 🎮 ENTER GAME BUTTON */}
              <div className="text-center">
                <Button
                  onClick={() => {
                    if (currentRoundId) {
                      // If there's an active round, go directly to the game
                      setGamePhase('playing');
                    } else {
                      // Otherwise, enter the game and wait for next round
                      setGamePhase('playing');
                    }
                  }}
                  disabled={!isAuthenticated || !hasVaultFunds || gameStateLoading}
                  className="px-12 py-6 text-xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 transform hover:scale-105 transition-all duration-200 shadow-lg shadow-purple-500/25"
                >
                  {gameStateLoading ? (
                    <>⏳ Loading Game State...</>
                  ) : !isAuthenticated ? (
                    <>🔐 Connect Wallet to Play</>
                  ) : !hasVaultFunds ? (
                    <>💰 Deposit SOL to Play</>
                  ) : currentRoundId ? (
                    <>🎯 JOIN ACTIVE ROUND</>
                  ) : (
                    <>🚀 ENTER PUMP WARS</>
                  )}
                </Button>
                
                {isAuthenticated && hasVaultFunds && !gameStateLoading && (
                  <p className="text-sm text-gray-400 mt-3">
                    {currentRoundId 
                      ? `Active round found! Click to join ${selectedToken} prediction game`
                      : `Click to enter the game and wait for the next round`
                    }
                  </p>
                )}
              </div>

              {/* 🏆 RECENT ACTIVITY */}
              <div className="mt-16">
                <h2 className="text-2xl font-bold text-center mb-8 text-accent">Recent Pump Wars</h2>
                <RecentWins gameFilter="pump-wars" />
              </div>
            </div>
          </main>
        </div>

        {/* 🚨 ERROR TOAST */}
        {error && (
          <div className="fixed bottom-4 right-4 bg-red-500/90 backdrop-blur-sm text-white p-4 rounded-lg shadow-lg border border-red-500/50 z-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <X className="h-5 w-5" />
                <span>{error}</span>
              </div>
              <button
                onClick={() => setError(null)}
                className="ml-4 hover:bg-white/20 rounded p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 🚀 FULL GAME INTERFACE - Simplified and clean
  return (
    <div className={`min-h-screen bg-main text-text-primary relative ${isFullscreen ? 'fullscreen' : ''}`}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className={`${isFullscreen ? '' : 'lg:ml-64'} min-h-screen`}>
        <PageHeader onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="p-6">
          <div className="max-w-7xl mx-auto">
            {/* 🎮 GAME HEADER */}
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className="text-3xl animate-pulse">🚀</div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                      Pump Wars
                    </h1>
                  </div>
                  <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                    {gamePhase.toUpperCase()}
                  </Badge>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => togglePanel('overview')}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    title="Game Overview"
                  >
                    <Info className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => togglePanel('stats')}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    title="Statistics"
                  >
                    <BarChart3 className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => togglePanel('chat')}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    title="Chat"
                  >
                    <MessageCircle className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => togglePanel('settings')}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    title="Settings"
                  >
                    <Settings className="h-5 w-5" />
                  </button>
                  <button
                    onClick={toggleFullscreen}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                  >
                    {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </div>
            
            {/* 🎯 MAIN GAME AREA - Optimized layout */}
            <div className="grid grid-cols-12 gap-6">
              {/* 🎮 GAME BOARD */}
              <div className="col-span-12 lg:col-span-9">
                <Card className="p-6 bg-gradient-to-br from-purple-900/20 to-pink-900/20 border-purple-500/30">
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="text-3xl font-bold text-purple-400">{selectedToken}</div>
                        <div className="flex items-center space-x-1">
                          <Coins className="h-5 w-5 text-gray-400" />
                          <span className="text-lg text-gray-400">Price Action</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="text-lg text-gray-400">
                          {gamePhase === 'betting' ? 'Betting:' : gamePhase === 'payout' ? 'Payout:' : 'Round:'}
                        </div>
                        <div className="text-2xl font-bold text-accent">
                          {gamePhase === 'betting' 
                            ? `${bettingTimeRemaining || 0}s` 
                            : gamePhase === 'payout'
                            ? `${payoutTimeRemaining || 0}s`
                            : `${timeRemaining || 0}s`
                          }
                        </div>
                        <div className="text-sm text-gray-400">
                          {gamePhase === 'betting' ? '(Place bets)' : gamePhase === 'payout' ? '(Calculating payouts)' : '(Round active)'}
                        </div>
                      </div>
                    </div>
                    
                    {/* 📈 PRICE CHART */}
                    <div className="w-full h-[500px] bg-gradient-to-br from-green-900/20 to-blue-900/20 rounded-lg border border-accent/20 relative overflow-hidden">
                      <PumpWarsChart
                        token={selectedTokenAddress}
                        tokenSymbol={selectedToken}
                        timeRemaining={timeRemaining}
                        startPrice={startPrice}
                        currentPrice={currentPrice}
                        priceHistory={priceHistory}
                        gamePhase={gamePhase}
                        roundStartTime={roundStartTime}
                      />
                    </div>
                  </div>
                  
                  {/* 🎯 GAME STATUS */}
                  <div className="space-y-4">
                    <div className="text-center">
                      <h3 className="text-xl font-bold mb-2">Price Movement Tracker</h3>
                      <p className="text-gray-400 text-sm">
                        {gamePhase === 'waiting'
                          ? 'Preparing next round with a random token...'
                          : gamePhase === 'betting' 
                          ? `Will ${selectedToken} price go up or down in the next 2 minutes?`
                          : gamePhase === 'tracking'
                          ? `Round in progress - ${selectedToken} price movement being tracked`
                          : gamePhase === 'payout'
                          ? `Round complete - ${selectedToken} moved ${priceChangePercent ? (priceChangePercent > 0 ? 'UP' : 'DOWN') : ''} - Processing payouts...`
                          : gamePhase === 'completed'
                          ? `Round complete - ${selectedToken} moved ${priceChangePercent ? (priceChangePercent > 0 ? 'UP' : 'DOWN') : ''}`
                          : 'Loading next round...'
                        }
                      </p>
                    </div>
                    
                    {/* 🎯 PHASE STATUS */}
                    {gamePhase === 'waiting' && (
                      <div className="text-center p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                        <div className="text-lg font-bold text-blue-400 mb-1">
                          ⏳ Next Round Starting Soon
                        </div>
                        <div className="text-sm text-gray-400">
                          Get ready for the next token prediction...
                        </div>
                        <div className="mt-2">
                          <Button
                            onClick={() => startNewRound()}
                            size="sm"
                            className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                          >
                            🚀 Start Round Now
                          </Button>
                        </div>
                    </div>
                    )}
                    
                    {gamePhase === 'betting' && (
                      <div className="text-center p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                        <div className="text-lg font-bold text-yellow-400 mb-1">
                          🎲 Betting Phase Active
                        </div>
                        <div className="text-sm text-gray-400">
                          Place your bet and prediction in the sidebar →
                        </div>
                      </div>
                    )}
                    
                    {gamePhase === 'tracking' && (
                      <div className="text-center p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                        <div className="text-lg font-bold text-blue-400 mb-1">
                          ⚡ Round Active
                        </div>
                        <div className="text-sm text-gray-400">
                          Tracking {selectedToken} price movement...
                        </div>
                      </div>
                    )}
                    
                    {gamePhase === 'payout' && (
                      <div className="text-center p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                        <div className="text-lg font-bold text-purple-400 mb-1">
                          💰 Payout Phase
                        </div>
                        <div className="text-sm text-gray-400">
                          {priceChangePercent !== null && (
                            <>
                              {selectedToken} moved {priceChangePercent > 0 ? '⬆️' : '⬇️'} {Math.abs(priceChangePercent).toFixed(2)}%
                              {playerPrediction && (
                                <span className={`ml-2 font-bold ${
                                  (priceChangePercent > 0 && playerPrediction === 'up') || 
                                  (priceChangePercent < 0 && playerPrediction === 'down')
                                    ? 'text-green-400' : 'text-red-400'
                                }`}>
                                  {(priceChangePercent > 0 && playerPrediction === 'up') || 
                                   (priceChangePercent < 0 && playerPrediction === 'down') ? '✅ YOU WON!' : '❌ YOU LOST'}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-2">
                          Next round starts in {payoutTimeRemaining || 0} seconds...
                        </div>
                      </div>
                    )}
                    
                    {gamePhase === 'completed' && (
                      <div className="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                        <div className="text-lg font-bold text-green-400 mb-1">
                          🏁 Round Complete
                        </div>
                        <div className="text-sm text-gray-400">
                          {priceChangePercent !== null && (
                            <>
                              {selectedToken} moved {priceChangePercent > 0 ? '⬆️' : '⬇️'} {Math.abs(priceChangePercent).toFixed(2)}%
                              {playerPrediction && (
                                <span className={`ml-2 font-bold ${
                                  (priceChangePercent > 0 && playerPrediction === 'up') || 
                                  (priceChangePercent < 0 && playerPrediction === 'down')
                                    ? 'text-green-400' : 'text-red-400'
                                }`}>
                                  {(priceChangePercent > 0 && playerPrediction === 'up') || 
                                   (priceChangePercent < 0 && playerPrediction === 'down') ? '✅ YOU WON!' : '❌ YOU LOST'}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
              
              {/* 🎮 BETTING CONTROLS */}
              <div className="col-span-12 lg:col-span-3 space-y-4">
                <Card className="p-4 bg-gradient-to-br from-green-900/20 to-blue-900/20 border-green-500/30">
                  <h3 className="font-bold mb-3 text-green-400">💰 Place Your Bet</h3>
                  <div className="space-y-4">
                    <div className="text-center p-3 bg-purple-500/10 rounded-lg border border-purple-500/30">
                      <div className="text-xs text-gray-400 mb-1">This Round&apos;s Token</div>
                      <div className="text-lg font-bold text-purple-400">{selectedToken}</div>
                      <div className="text-xs text-gray-400">2 minute round</div>
                    </div>
                    
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Bet Amount (SOL)</label>
                      <input
                        type="number"
                        value={wagerAmount}
                        onChange={(e) => setWagerAmount(Number(e.target.value))}
                        className="w-full p-2 rounded-lg bg-gray-800 border border-gray-600 text-white"
                        placeholder="0.1"
                        min="0.01"
                        step="0.01"
                      />
                    </div>
                    
                    {/* 🎯 PREDICTION BUTTONS - Moved from main area to betting controls */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Your Prediction</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setPlayerPrediction('up')}
                          disabled={betPlaced || gamePhase !== 'betting'}
                          className={`p-3 rounded-lg border-2 transition-all duration-300 hover:scale-105 ${
                            playerPrediction === 'up' 
                              ? 'border-green-500 bg-green-500/20 text-green-400' 
                              : gamePhase === 'betting' && !betPlaced
                              ? 'border-gray-600 bg-gray-800/50 hover:border-green-500/50'
                              : 'border-gray-700 bg-gray-800/30 opacity-50 cursor-not-allowed'
                          }`}
                        >
                          <div className="text-center">
                            <div className="text-xl mb-1">🚀</div>
                            <div className="text-sm font-bold">PUMP</div>
                            <div className="text-xs text-gray-400">Price UP</div>
                          </div>
                        </button>
                        
                        <button
                          onClick={() => setPlayerPrediction('down')}
                          disabled={betPlaced || gamePhase !== 'betting'}
                          className={`p-3 rounded-lg border-2 transition-all duration-300 hover:scale-105 ${
                            playerPrediction === 'down' 
                              ? 'border-red-500 bg-red-500/20 text-red-400' 
                              : gamePhase === 'betting' && !betPlaced
                              ? 'border-gray-600 bg-gray-800/50 hover:border-red-500/50'
                              : 'border-gray-700 bg-gray-800/30 opacity-50 cursor-not-allowed'
                          }`}
                        >
                          <div className="text-center">
                            <div className="text-xl mb-1">📉</div>
                            <div className="text-sm font-bold">DUMP</div>
                            <div className="text-xs text-gray-400">Price DOWN</div>
                          </div>
                        </button>
                      </div>
                      
                      {/* Prediction Status */}
                      {gamePhase === 'betting' && playerPrediction && (
                        <div className="mt-2 text-center p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                          <div className="text-sm font-bold text-yellow-400">
                            Selected: {playerPrediction === 'up' ? '🚀 PUMP' : '📉 DUMP'}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <Button
                      onClick={handleStartGame}
                      disabled={
                        !isAuthenticated || 
                        !hasVaultFunds || 
                        gameLoading ||
                        (gamePhase === 'betting' && !playerPrediction) ||
                        (gamePhase === 'tracking') ||
                        (gamePhase === 'payout') ||
                        (gamePhase === 'completed') ||
                        betPlaced
                      }
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50"
                    >
                      {!isAuthenticated ? (
                        'Connect Wallet'
                      ) : !hasVaultFunds ? (
                        'Deposit SOL First'
                      ) : gameLoading ? (
                        'Placing Bet...'
                      ) : betPlaced ? (
                        '✅ Bet Placed'
                      ) : gamePhase === 'betting' && !playerPrediction ? (
                        'Select Prediction First'
                      ) : gamePhase === 'betting' && playerPrediction ? (
                        `🎯 Place Bet (${wagerAmount} SOL)`
                      ) : gamePhase === 'tracking' ? (
                        '⏱️ Round in Progress'
                      ) : gamePhase === 'payout' ? (
                        `💰 Payout Processing...`
                      ) : gamePhase === 'completed' ? (
                        '🏁 Round Complete'
                      ) : (
                        'Waiting for Round...'
                      )}
                    </Button>
                  </div>
                </Card>
                
                {/* 📊 ROUND ANALYTICS */}
                <Card className="p-4 bg-gradient-to-br from-purple-900/20 to-pink-900/20 border-purple-500/30">
                  <h3 className="font-bold mb-3 text-purple-400">📊 Round Analytics</h3>
                  <div className="space-y-3">
                    <div className="text-center p-3 bg-accent/10 rounded-lg">
                      <div className="text-2xl font-bold text-accent">{totalPlayersInRound}</div>
                      <div className="text-xs text-gray-400">Players Joined</div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-center p-2 bg-green-500/10 rounded border border-green-500/30">
                        <div className="text-lg font-bold text-green-400">{pumpPredictions}</div>
                        <div className="text-xs text-gray-400">🚀 PUMP</div>
                      </div>
                      <div className="text-center p-2 bg-red-500/10 rounded border border-red-500/30">
                        <div className="text-lg font-bold text-red-400">{dumpPredictions}</div>
                        <div className="text-xs text-gray-400">📉 DUMP</div>
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-400 space-y-1">
                      <div className="flex justify-between">
                        <span>Total Pot:</span>
                        <span className="text-green-400">{formatSOL(totalPot)} SOL</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Your Potential:</span>
                        <span className="text-accent">{formatSOL(potentialWinnings || 0)} SOL</span>
                      </div>
                    </div>
                  </div>
                </Card>
                
                {/* 🏆 YOUR STATS */}
                <Card className="p-4 bg-gradient-to-br from-orange-900/20 to-yellow-900/20 border-orange-500/30">
                  <h3 className="font-bold mb-3 text-orange-400">🏆 Your Stats</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Win Rate:</span>
                      <span className="font-bold">{winRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Current Streak:</span>
                      <span className={`font-bold ${winStreak > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {winStreak > 0 ? `${winStreak}W` : `${lossStreak}L`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Session P&L:</span>
                      <span className={`font-bold ${currentSession.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {currentSession.pnl >= 0 ? '+' : ''}{formatSOL(currentSession.pnl)} SOL
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Games:</span>
                      <span className="font-bold">{currentSession.gamesPlayed}</span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
      
      {/* 🚀 FLOATING PANELS - Full system restored */}
      <FloatingPanel
        id="pump-wars-overview"
        title="Game Overview"
        icon="🎮"
        isOpen={!dockedPanels.has('overview') && openPanels.overview}
        onClose={() => closePanel('overview')}
        defaultPosition={{ x: isFullscreen ? 100 : 50, y: 100 }}
        defaultSize={{ width: isFullscreen ? 400 : 350, height: isFullscreen ? 600 : 500 }}
      >
        <GameOverviewPanel />
      </FloatingPanel>

      <FloatingPanel
        id="pump-wars-chat"
        title="Live Chat"
        icon="💬"
        isOpen={!dockedPanels.has('chat') && openPanels.chat}
        onClose={() => closePanel('chat')}
        defaultPosition={{ x: isFullscreen ? 520 : 420, y: 100 }}
        defaultSize={{ width: isFullscreen ? 450 : 400, height: isFullscreen ? 650 : 550 }}
      >
        <ChatPanelContent />
      </FloatingPanel>

      <FloatingPanel
        id="pump-wars-settings"
        title="Game Settings"
        icon="⚙️"
        isOpen={!dockedPanels.has('settings') && openPanels.settings}
        onClose={() => closePanel('settings')}
        defaultPosition={{ x: 100, y: 150 }}
        defaultSize={{ width: 320, height: 600 }}
      >
        <SettingsPanel />
      </FloatingPanel>

      <FloatingPanel
        id="pump-wars-stats"
        title="Game Statistics"
        icon="📊"
        isOpen={!dockedPanels.has('stats') && openPanels.stats}
        onClose={() => closePanel('stats')}
        defaultPosition={{ x: isFullscreen ? 1000 : 790, y: 100 }}
        defaultSize={{ width: isFullscreen ? 420 : 380, height: isFullscreen ? 700 : 600 }}
      >
        <StatsPanel />
      </FloatingPanel>

      <FloatingPanel
        id="pump-wars-recentwins"
        title="Recent Wins"
        icon="🏆"
        isOpen={!dockedPanels.has('recentwins') && openPanels.recentwins}
        onClose={() => closePanel('recentwins')}
        defaultPosition={{ x: 150, y: 200 }}
        defaultSize={{ width: 320, height: 450 }}
      >
        <RecentWins />
      </FloatingPanel>

      {/* 🎯 DOCK ZONE - Full system */}
      <div
        className={`fixed bottom-0 left-0 right-0 transition-all duration-300 ${
          isDragging ? 'h-32 bg-accent/20 border-t-2 border-accent/50' : 'h-0'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragging && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl mb-2">🎯</div>
              <div className="text-sm font-medium">
                {isOverDropZone ? 'Drop to dock panel' : 'Drag here to dock'}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* 🎮 DOCKED PANELS */}
      {dockedPanels.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border">
          <div className="flex">
            {Array.from(dockedPanels).map((panelId) => (
              <div
                key={panelId}
                className="flex-1 border-r border-border last:border-r-0"
                style={{ height: `${dockedPanelHeights[panelId]}px` }}
              >
                <div className="p-2 bg-accent/10 border-b border-border flex items-center justify-between">
                  <span className="text-sm font-medium capitalize">{panelId}</span>
                  <button
                    onClick={() => handleUndockPanel(panelId)}
                    className="p-1 hover:bg-white/10 rounded"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="h-full overflow-auto p-4">
                  {panelId === 'overview' && <GameOverviewPanel />}
                  {panelId === 'chat' && <ChatPanelContent />}
                  {panelId === 'settings' && <SettingsPanel />}
                  {panelId === 'stats' && <StatsPanel />}
                  {panelId === 'recentwins' && <RecentWins />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* 🏆 PnL CARD MODAL */}
      {showPnLCard && user && (
        <PnLCardModal
          isOpen={showPnLCard}
          onClose={() => setShowPnLCard(false)}
          game="CRASH"
          result={matchResult === 'victory' ? 'WIN' : 'LOSS'}
          pnlAmount={payoutAmount || 0}
          pnlPercentage={(() => {
            const wager = wagerAmount || 0;
            if (matchResult === 'victory') {
              return wager > 0 ? ((payoutAmount || 0) / wager) * 100 : 0;
            }
            return -100;
          })()}
          wagerAmount={wagerAmount || 0}
          finalAmount={matchResult === 'victory' ? (payoutAmount || 0) : 0}
          username={user?.username}
          walletAddress={user?.walletAddress || user?.id || 'Unknown'}
          userAvatar={user?.avatar}
          gameSpecific={{
            finalScore: `${selectedToken} ${playerPrediction === 'up' ? '🚀' : '📉'}`,
            totalRounds: 1,
            winRate: matchResult === 'victory' ? 100 : 0,
            multiplier: (() => {
              const change = priceChangePercent || 0;
              return Math.abs(change) / 100;
            })()
          }}
          baseImageUrl="/pnl/pnlcard.png"
        />
      )}

      {/* 🚨 ERROR TOAST */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500/90 backdrop-blur-sm text-white p-4 rounded-lg shadow-lg border border-red-500/50 z-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <X className="h-5 w-5" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-4 hover:bg-white/20 rounded p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
