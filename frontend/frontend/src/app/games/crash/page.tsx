'use client';

import React, { useState, useCallback, useEffect, useRef, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { usePV3 } from '@/hooks/usePV3';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import PageHeader from '@/components/PageHeader';
import Avatar from '@/components/Avatar';
import dynamic from 'next/dynamic';
import { matchService } from '@/services/matchService';
import { socketService } from '@/services/socketService';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { generateDeterministicCrash, calculateCrashTimeFromMultiplier, getHighPrecisionTime } from '@/lib/stakeFormula';
import ChatPanel from '@/components/ChatPanel';
import { useCrashSocket } from '@/hooks/useCrashSocket';
import CrashQuickMatch from '@/components/games/crash/CrashQuickMatch';
import { PnLCardModal } from '@/components/PnLCardModal';
import FloatingPanel from '@/components/FloatingPanel';
import GameOverviewPanel from '@/components/panels/GameOverviewPanel';
import ChatPanelContent from '@/components/panels/ChatPanel';
import StatsPanel from '@/components/panels/StatsPanel';
import SettingsPanel from '@/components/panels/SettingsPanel';
import RecentWins from '@/components/RecentWins';
import { audioSprite } from '@/lib/audioSprite';

// 🚀 PHASE 2: Dynamic imports for crash game components
// Heavy animation component loaded only when needed
const CrashAnimation = dynamic(() => import('@/components/games/crash/CrashAnimation'), {
  loading: () => (
    <div className="w-full h-80 bg-gradient-to-br from-red-900 to-orange-900 rounded-lg flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">🚀</div>
        <div className="text-white font-semibold">Loading Crash Animation...</div>
        <div className="text-sm text-gray-300 mt-2">Preparing rocket launch...</div>
      </div>
    </div>
  ),
  ssr: false
});

type GamePhase = 'lobby' | 'creating' | 'joining' | 'waiting' | 'playing' | 'rising' | 'crashed' | 'round-complete' | 'finished' | 'round-countdown' | 'round-result';

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

export default function CrashPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { connected, publicKey, formatSOL, vaultBalance, loading, depositToVault } = usePV3();
  
  // Check if user is authenticated (logged in)
  const isAuthenticated = !!user;
  
  // 🚀 PERFORMANCE: Audio effects using optimized sprite system
  const playSound = (soundName: string) => {
    audioSprite.play(soundName);
  };
  
  const [error, setError] = useState<string | null>(null);
  
  // Game state
  const [gamePhase, setGamePhase] = useState<GamePhase>('lobby');
  const [wagerAmount, setWagerAmount] = useState(0.1);
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);
  const [availableMatches, setAvailableMatches] = useState<Match[]>([]);
  const [opponent, setOpponent] = useState<Opponent | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  // Crash-specific state
  const [crashMultiplier, setCrashMultiplier] = useState(2.0);
  const [currentMultiplier, setCurrentMultiplier] = useState(1.0);
  const [backendCrashMultiplier, setBackendCrashMultiplier] = useState<number | null>(null); // ✅ Store exact backend crash point
  const [roundStartTime, setRoundStartTime] = useState<number | null>(null); // ✅ NEW: Store round start time
  const [crashDuration, setCrashDuration] = useState<number | null>(null); // ✅ NEW: Store crash duration
  const [player1CashOut, setPlayer1CashOut] = useState<number | null>(null);
  const [player2CashOut, setPlayer2CashOut] = useState<number | null>(null);
  const [playerCashedOut, setPlayerCashedOut] = useState(false);
  const [personalCashOutMultiplier, setPersonalCashOutMultiplier] = useState<number | null>(null); // ✅ NEW: Store YOUR frozen cash-out point
  const [roundResult, setRoundResult] = useState<any>(null);
  const [gameResult, setGameResult] = useState<any>(null);
  
  // 🚀 PERFORMANCE: Local caching for frequently accessed data
  const [cachedMatchData, setCachedMatchData] = useState<Record<string, any>>({}); // Cache match data locally
  const [cachedCrashHistory, setCachedCrashHistory] = useState<any[]>([]); // Cache recent crash results

  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Floating panel states - Mines-style
  const [openPanels, setOpenPanels] = useState({
    overview: false,
    chat: false,
    settings: false,
    stats: false,
    favorites: false
  });

  // Fullscreen mode state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Drag & Drop Panel System - INDIVIDUAL DOCKING 🔥
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
    favorites: 260
  });
  const [resizingPanel, setResizingPanel] = useState<string | null>(null);

  // Victory Screen State - Universal Pattern
  const [showPnLCard, setShowPnLCard] = useState(false);
  const [rematchLoading, setRematchLoading] = useState(false);

  // Panel Management Functions - Mines-style
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
    console.log(`📤 Panel ${panelId} undocked from dashboard!`);
  }, []);

  const handleUndockAll = useCallback(() => {
    setDockedPanels(new Set());
    setOpenPanels({
      overview: false,
      chat: false,
      settings: false,
      stats: false,
      favorites: false
    });
    playSound('click');
  }, []);

  const handleResizeStart = useCallback((e: React.MouseEvent, panelId: string) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = dockedPanelHeights[panelId];
    setResizingPanel(panelId);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const newHeight = Math.max(150, Math.min(600, startHeight + deltaY));
      setDockedPanelHeights(prev => ({ ...prev, [panelId]: newHeight }));
    };

    const handleMouseUp = () => {
      setResizingPanel(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      playSound('click');
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [dockedPanelHeights]);



  // Server-side game state
  const [serverGameState, setServerGameState] = useState<any>(null);

  // Add countdown state
  const [countdown, setCountdown] = useState<number | null>(null);
  
  // ✅ STEP 1: Track animation frame ID for immediate stopping
  const [animationFrameId, setAnimationFrameId] = useState<number | null>(null);
  
  // ✅ STAKE'S LATENCY SYSTEM: Track player latency for precise timing
  const [playerLatency, setPlayerLatency] = useState<number>(100); // Default 100ms
  const [lastPingTime, setLastPingTime] = useState<number>(0);
  
  // ✅ STAKE'S PREDICTIVE SYSTEM: Track predictive crash timing
  const [predictiveCrashTime, setPredictiveCrashTime] = useState<number | null>(null);
  const [highPrecisionStartTime, setHighPrecisionStartTime] = useState<number | null>(null);
  
  // ✅ CLIENT-SIDE CRASH PREDICTION: Track crash predictor state
  const [crashPredictor, setCrashPredictor] = useState<{
    crashPoint: number;
    crashTime: number;
    isActive: boolean;
  } | null>(null);

  // 🚀 PERFORMANCE: Enhanced socket error handling with audio feedback
  const handleSocketError = useCallback((error: any) => {
    console.error('🚨 Socket error:', error);
    
    // ✅ FIX: Filter out false "Round already in progress" errors
    const errorMessage = error.message || 'Unknown error';
    if (errorMessage.includes('Round already in progress')) {
      console.warn('🔇 Ignoring false "Round already in progress" error - game is working correctly');
      return;
    }
    
    // ✅ FIX: Don't kick users to lobby for minor socket errors during gameplay
    if (gamePhase === 'rising' || gamePhase === 'crashed' || gamePhase === 'playing') {
      console.warn('Socket error during gameplay - staying in game');
      setConnectionError(`Connection issue: ${errorMessage}`);
      playSound('error'); // 🚀 Audio feedback for connection issues
      return;
    }
    
    // Only set error for lobby/waiting phases
    setError(`Connection error: ${errorMessage}`);
    playSound('error'); // 🚀 Audio feedback for errors
  }, [gamePhase]);

  const resetGameState = useCallback(() => {
    setCurrentMatch(null);
    setOpponent(null);
    setPlayer1CashOut(null);
    setPlayer2CashOut(null);
    setPlayerCashedOut(false);
    setPersonalCashOutMultiplier(null); // ✅ Reset personal cash-out
    setCurrentMultiplier(1.0);
    setBackendCrashMultiplier(null); // ✅ Reset backend crash point
    setRoundStartTime(null); // ✅ Reset timing data
    setCrashDuration(null); // ✅ Reset timing data
    setCountdown(null); // Reset countdown
    setRoundResult(null);
    setServerGameState(null);
    setGameResult(null);
    console.log('🔄 Reset all crash game state');
  }, []);



  // Initialize websocket connection
  useEffect(() => {
    if (!isAuthenticated) return;

    const initSocket = async () => {
      try {
        console.log('🔌 Initializing socket connection...');
        await socketService.connect();
        setSocketConnected(true);
        setConnectionError(null);
        console.log('✅ Socket connected successfully');

        // Set up crash game event listeners
        socketService.on('crash_round_started', handleCrashRoundStarted);
        socketService.on('crash_cash_out_confirmed', handleCrashCashOutConfirmed);
        socketService.on('crash_cash_out_failed', handleCrashCashOutFailed);
        socketService.on('crash_occurred', handleCrashOccurred);
        socketService.on('crash_result', handleCrashResult);
        socketService.on('round_completed', handleRoundCompleted); // ✅ NEW: Handle round progression
        socketService.on('crash_replay', handleCrashReplay);
        socketService.on('match_state', handleMatchState);
        socketService.on('player_joined', handlePlayerJoined);
        socketService.on('match_voided', handleMatchVoided);
        socketService.on('payout_completed', handlePayoutComplete);
        socketService.on('payout_failed', handlePayoutFailed);
        socketService.on('pong', handlePong); // ✅ STAKE'S LATENCY SYSTEM
        socketService.on('error', handleSocketError);
        
        // ✅ STAKE'S LATENCY SYSTEM: Start latency tracking
        const latencyInterval = setInterval(pingServer, 5000); // Ping every 5 seconds
        
        // Initial ping
        setTimeout(pingServer, 1000);
        
        // Store interval for cleanup
        (initSocket as any).latencyInterval = latencyInterval;
        
      } catch (error) {
        console.error('Failed to connect to game server:', error);
        const errorMsg = error instanceof Error ? error.message : 'Unknown connection error';
        setConnectionError(`Connection failed: ${errorMsg}`);
        setSocketConnected(false);
      }
    };

    initSocket();

    return () => {
      // ✅ STAKE'S LATENCY SYSTEM: Clear latency tracking
      if ((initSocket as any).latencyInterval) {
        clearInterval((initSocket as any).latencyInterval);
      }
      
      socketService.off('crash_round_started');
      socketService.off('crash_cash_out_confirmed');
      socketService.off('crash_cash_out_failed');
      socketService.off('crash_occurred');
      socketService.off('crash_result');
      socketService.off('round_completed'); // ✅ NEW: Cleanup round progression listener
      socketService.off('crash_replay');
      socketService.off('match_voided');
      socketService.off('match_state');
      socketService.off('player_joined');
      socketService.off('payout_completed');
      socketService.off('payout_failed');
      socketService.off('pong');
      socketService.off('error');
    };
  }, [isAuthenticated, handleSocketError]);

  // Event handlers
  const handleCrashRoundStarted = useCallback((data: any) => {
    console.log('🚀 CLIENT PREDICTION: Crash round started with deterministic seeds:', data);
    console.log('🎯 Backend start time:', data.roundStartTime);
    console.log('🔑 Crash seed:', data.crashSeed);
    console.log('🔢 Crash nonce:', data.crashNonce);
    
    // ✅ FIX: Enter active game mode to prevent disconnections during gameplay
    const matchId = data.matchId || currentMatch?.id;
    if (matchId) {
      socketService.enterGameMode(matchId);
      console.log('🎮 Entered active game mode for match:', matchId);
    }
    
    // ✅ CRITICAL FIX: Use frontend's own high-precision start time for animation
    const precisionStartTime = getHighPrecisionTime();
    setHighPrecisionStartTime(precisionStartTime);
    setRoundStartTime(precisionStartTime); // ✅ FIX: Use frontend time, not backend time
    
    console.log('🎯 TIMING FIX: Using frontend start time:', precisionStartTime, 'instead of backend time:', data.roundStartTime);
    console.log('🎮 DEBUG: Setting gamePhase to "rising"');
    
    // ✅ CLIENT-SIDE CRASH PREDICTION: Calculate crash point independently
    if (data.crashSeed && data.crashNonce !== undefined) {
      const predictedCrashPoint = generateDeterministicCrash(data.crashSeed, data.crashNonce);
      const predictedCrashDuration = calculateCrashTimeFromMultiplier(predictedCrashPoint);
      const predictedCrashTime = precisionStartTime + predictedCrashDuration;
      
      setCrashPredictor({
        crashPoint: predictedCrashPoint,
        crashTime: predictedCrashTime,
        isActive: true
      });
      
      console.log('🎯 CLIENT PREDICTION: Crash at', predictedCrashPoint.toFixed(2) + 'x in', (predictedCrashDuration/1000).toFixed(1) + 's');
      console.log('🎯 CLIENT PREDICTION: Crash time:', predictedCrashTime);
      console.log('🎯 CLIENT PREDICTION: Current time:', precisionStartTime);
      console.log('🎯 CLIENT PREDICTION: Time until crash:', (predictedCrashTime - precisionStartTime).toFixed(1) + 'ms');
    } else {
      console.warn('⚠️ No crash seeds received - falling back to server timing');
      setCrashPredictor(null);
    }
    
    setGamePhase('rising');
    setCurrentMultiplier(1.0); // Start at 1.0x
    setPlayer1CashOut(null);
    setPlayer2CashOut(null);
    setPlayerCashedOut(false);
    setPersonalCashOutMultiplier(null); // ✅ Reset personal cash-out for new round
    setPredictiveCrashTime(null); // ✅ Reset predictive crash time
    
    console.log('🎮 TIMING FIX: Animation will use consistent frontend timing!');
    console.log('🌐 Current latency compensation:', playerLatency.toFixed(1) + 'ms');
    
    // ✅ DEBUG: Verify state changes
    setTimeout(() => {
      console.log('🔍 DEBUG: State after handleCrashRoundStarted:', {
        gamePhase,
        roundStartTime: precisionStartTime,
        currentMultiplier,
        crashPredictor
      });
    }, 100);
  }, [playerLatency, currentMatch?.id]);

    const handleCrashCashOutConfirmed = useCallback((data: any) => {
    console.log('💰 Your cash out confirmed:', data);
    
    // ✅ PROPER CRASH GAME: Only update our own cash out state
    // Opponent cash-outs are HIDDEN until round ends
      setPlayerCashedOut(true);
    
    // ✅ CRITICAL FIX: Store YOUR PERSONAL frozen cash-out multiplier
    setPersonalCashOutMultiplier(data.multiplier);
    console.log('🧊 FROZEN: Your personal cash-out at', data.multiplier + 'x');
    
    // ✅ CRITICAL FIX: Store YOUR cash-out multiplier so you can see it
    // but DON'T update opponent's cash-out (keep it secret)
    if (user?.walletAddress === currentMatch?.player1?.wallet) {
      setPlayer1CashOut(data.multiplier);
      console.log('✅ Stored your cash out (Player 1) at', data.multiplier + 'x');
    } else if (user?.walletAddress === currentMatch?.player2?.wallet) {
      setPlayer2CashOut(data.multiplier);
      console.log('✅ Stored your cash out (Player 2) at', data.multiplier + 'x');
    }
    
    console.log('🤐 Opponent cash-out remains HIDDEN until round ends');
  }, [user?.walletAddress, currentMatch?.player1?.wallet, currentMatch?.player2?.wallet]);

  // 🚨 NEW: Handle cash out failures from backend
  const handleCrashCashOutFailed = useCallback((data: any) => {
    console.log('❌ Cash out failed:', data);
    
    // ✅ FIX: Reset player cashed out state if our cash out failed
    if (data.player === user?.walletAddress) {
      setPlayerCashedOut(false);
      setPersonalCashOutMultiplier(null); // ✅ Reset personal cash-out on failure
      console.log('❌ Your cash out was rejected:', data.error);
      
      // Show error message briefly
      setError(`Cash out failed: ${data.error}`);
      setTimeout(() => setError(null), 3000);
    }
  }, [user?.walletAddress]);

  // ✅ STAKE'S LATENCY SYSTEM: Ping for latency measurement
  const pingServer = useCallback(() => {
    if (!socketConnected) return;
    
    const pingTime = performance.now();
    setLastPingTime(pingTime);
    
    socketService.emit('ping', {
      timestamp: pingTime,
      playerId: user?.walletAddress || user?.id || 'unknown'
    });
  }, [socketConnected, user?.walletAddress, user?.id]);

  // ✅ STAKE'S LATENCY SYSTEM: Handle pong response
  const handlePong = useCallback((data: any) => {
    const receiveTime = performance.now();
    const latency = receiveTime - data.timestamp;
    
    setPlayerLatency(latency);
    console.log(`🌐 STAKE LATENCY: ${latency.toFixed(1)}ms`);
  }, []);

  // ✅ STEP 2: Animation stop function
  const stopAnimationImmediately = useCallback(() => {
    if (animationFrameId) {
      console.log('🛑 IMMEDIATE STOP: Canceling animation frame', animationFrameId);
      cancelAnimationFrame(animationFrameId);
      setAnimationFrameId(null);
    }
  }, [animationFrameId]);

  // ✅ CLIENT PREDICTION: Handle server crash confirmation (should match client prediction)
  const handleCrashOccurred = useCallback((data: any) => {
    console.log('🔄 SERVER CONFIRMATION: Crash occurred (should match client prediction):', data);
    console.log('🎯 Server crash point:', data.crashMultiplier + 'x');
    console.log('🎯 Current local multiplier:', currentMultiplier);
    
    // ✅ CLIENT PREDICTION: If client hasn't crashed yet, this is a backup
    if (gamePhase === 'rising') {
      console.warn('⚠️ CLIENT PREDICTION: Server crash received but client still rising - triggering backup crash');
      
      // Deactivate crash predictor and trigger crash
      setCrashPredictor(prev => prev ? { ...prev, isActive: false } : null);
    
      // Set exact crash point
      setCrashMultiplier(data.crashMultiplier);
    setBackendCrashMultiplier(data.crashMultiplier);
      setCurrentMultiplier(data.crashMultiplier);
    setGamePhase('crashed');
    
      // Stop animation
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        setAnimationFrameId(null);
      }
    } else {
      console.log('✅ CLIENT PREDICTION: Server confirmation matches client prediction');
      // Just confirm the crash point (client should have already crashed)
      setCrashMultiplier(data.crashMultiplier);
      setBackendCrashMultiplier(data.crashMultiplier);
    }
    
    console.log('🤐 Cash-outs still SECRET - will be revealed in crash_result');
  }, [currentMultiplier, gamePhase, animationFrameId]);

  // 🚀 UPDATED: Handle final crash result (after backend determines winner)
  const handleCrashResult = useCallback((data: any) => {
    console.log('🏆 Final crash result with winner:', data);
    console.log('🎯 Round winner:', data.roundWinner);
    console.log('🎯 Match winner:', data.matchWinner);
    console.log('🎯 Player 1 result:', data.player1Result);
    console.log('🎯 Player 2 result:', data.player2Result);
    console.log('🎯 User wallet:', user?.walletAddress);
    console.log('🎯 Player 1 wallet:', currentMatch?.player1?.wallet);
    console.log('🎯 Player 2 wallet:', currentMatch?.player2?.wallet);
    console.log('🎯 ROUND RESULT GAME STATE:', data.gameState); // ✅ NEW: Log the game state in round result
    
    // 🎭 PROPER CRASH GAME: NOW reveal opponent cash-outs!
    console.log('🎭 CASH-OUTS NOW REVEALED:');
    console.log('   Player 1 cash out:', data.player1Result?.cashOut);
    console.log('   Player 2 cash out:', data.player2Result?.cashOut);
    
    // Set final cash-out values (now revealed)
    setPlayer1CashOut(data.player1Result?.cashOut || null);
    setPlayer2CashOut(data.player2Result?.cashOut || null);
    
    setRoundResult(data);
    
    // ✅ CRITICAL FIX: Update server game state with new scores from crash result
    if (data.gameState) {
      console.log('📊 Updating game state with new scores:', data.gameState);
      console.log('📊 Player 1 score:', data.gameState.player1Score);
      console.log('📊 Player 2 score:', data.gameState.player2Score);
      console.log('📊 Current round:', data.gameState.currentRound);
      setServerGameState(data.gameState);
    }
    
    // ✅ FIX: Remove competing timers - let handleRoundCompleted handle round progression
    // Just show results immediately and let the dedicated round progression handler take over
    setTimeout(() => {
      if (data.matchComplete) {
        setGamePhase('finished');
        setGameResult(data);
        
        // 🎯 CRITICAL FIX: Only winner confirms payout to prevent duplicate calls
        const isWinner = data.matchWinner === user?.walletAddress;
        if (isWinner) {
          console.log('💰 Winner confirming payout ready after crash match completion');
          socketService.confirmPayoutReady(data.matchId);
        } else {
          console.log('💰 Loser waiting for winner to trigger payout');
        }
      } else {
        // ✅ NEW: Set to round-complete and let handleRoundCompleted take over
        setGamePhase('round-complete');
        console.log('🔄 Round completed - waiting for round_completed event from backend');
        // The backend will send a separate 'round_completed' event to start the next round
      }
    }, 3000); // Show results for 3 seconds only
  }, [currentMatch?.id, user?.walletAddress, currentMatch?.player1?.wallet, currentMatch?.player2?.wallet]);

  // ✅ NEW: Handle round completed event for round progression
  const handleRoundCompleted = useCallback((data: any) => {
    console.log('🔄 Round completed - preparing for next round:', data);
    console.log('📊 Updated game state:', data.gameState);
    console.log('🎯 Round result:', data.roundResult);
    
    // ✅ FIX: Exit active game mode when transitioning between rounds
    socketService.exitGameMode();
    console.log('🎮 Exited active game mode - transitioning between rounds');
    
    // Update game state with new scores
    if (data.gameState) {
      console.log('📊 Updating game state with new scores:', data.gameState);
      console.log('📊 Player 1 score:', data.gameState.player1Score);
      console.log('📊 Player 2 score:', data.gameState.player2Score);
      console.log('📊 Current round:', data.gameState.currentRound);
      setServerGameState(data.gameState);
    }
    
    // Show "Next Round Starting" message and countdown
    setGamePhase('round-countdown');
    setCountdown(8); // 8-second countdown for next round
          
          const countdownInterval = setInterval(() => {
            setCountdown(prev => {
              if (prev === null || prev <= 1) {
                clearInterval(countdownInterval);
          console.log('🚀 Round countdown complete - waiting for next round to start');
                          setCountdown(null);
          
          // ✅ FIX: Only set to 'playing' if round hasn't already started
          // If the round already started (gamePhase is 'rising'), don't override it
          setGamePhase(currentPhase => {
            if (currentPhase === 'rising') {
              console.log('🎯 Round already started during countdown - keeping "rising" phase');
              return currentPhase; // Don't change if already rising
            } else {
              console.log('🎯 Setting to "playing" - waiting for round to start');
              return 'playing'; // Ready for next round
            }
          });
                return null;
              }
              return prev - 1;
            });
          }, 1000);
  }, []);

  const handleCrashReplay = useCallback((data: any) => {
    console.log('🔄 Crash replay:', data);
    
    // ✅ FIX: Don't show alert popup, just handle replay silently
    console.log(`🔄 Round Replay: ${data.message}`);
    
    // Reset for new round but stay in game
    setGamePhase('playing');
    setCurrentMultiplier(1.0);
    setPlayer1CashOut(null);
    setPlayer2CashOut(null);
    setPlayerCashedOut(false);
    setCountdown(null);
    
    // Start new countdown automatically for replay
    setCountdown(3);
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(countdownInterval);
          // Auto-start the round after countdown
          setTimeout(() => {
            console.log('🚀 Replay countdown complete - auto-starting round');
            socketService.emit('start_crash_round', { matchId: currentMatch?.id });
            setCountdown(null);
          }, 1000);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }, [currentMatch?.id]);

  // 🚀 PERFORMANCE: Optimized match loading with local caching and better error handling
  const loadAvailableMatches = useCallback(async () => {
    try {
      console.log('🔍 Loading available crash matches...');
      console.log('🔍 User authenticated:', isAuthenticated);
      console.log('🔍 User wallet:', user?.walletAddress);
      console.log('🔍 Token exists:', !!localStorage.getItem('pv3_token'));
      
      const matches = await matchService.getAvailableCrashMatches();
      
      // 🚀 Cache match data locally for faster access
      const newCacheData: Record<string, any> = {};
      matches.forEach((match: any) => {
        newCacheData[match.id] = {
          ...match,
          cachedAt: Date.now()
        };
      });
      
      setCachedMatchData(prev => ({ ...prev, ...newCacheData }));
      setAvailableMatches(matches);
      console.log(`✅ Loaded ${matches.length} available crash matches with caching`);
    } catch (error) {
      console.error('Failed to load matches:', error);
      setError(`Failed to load matches: ${error instanceof Error ? error.message : 'Unknown error'}`);
      playSound('error'); // 🚀 Audio feedback for errors
    }
  }, [isAuthenticated, user?.walletAddress]);

  const handleMatchVoided = useCallback((data: any) => {
    console.log('🚫 Match voided:', data);
    setGamePhase('finished');
    setError(`Match voided: ${data.voidReason}. Refund: ${data.refundAmount} SOL`);
    
    // Show void notification
    alert(`🚫 Match Voided!\n\nReason: ${data.voidReason}\nRefund: ${data.refundAmount} SOL (minus 6.5% platform fee)\n\nFunds will be returned to your session vault.`);
    
    // Reset game state after showing notification
    setTimeout(() => {
      setCurrentMatch(null);
      setOpponent(null);
      setGamePhase('lobby');
      setError(null);
      loadAvailableMatches();
    }, 3000);
  }, [loadAvailableMatches]);

  const handleMatchState = useCallback((data: any) => {
    console.log('📊 Match state update:', data);
    setCurrentMatch(data.match);
    setServerGameState(data.gameState);
    
    // Set opponent info
    if (data.match.player2 && data.match.player2.wallet !== user?.walletAddress) {
      setOpponent(data.match.player2);
    } else if (data.match.player1 && data.match.player1.wallet !== user?.walletAddress) {
      setOpponent(data.match.player1);
    }
    
    // ✅ AUTO-START: When both players connected, start countdown automatically
    if (data.match.status === 'in_progress' && data.connectedPlayers === 2) {
      console.log('🚀 Both players connected - starting countdown automatically');
      setGamePhase('playing');
      
      // Start 3-second countdown
      setCountdown(3);
      const countdownInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(countdownInterval);
            // Auto-start the round after countdown
            setTimeout(() => {
              console.log('🚀 Countdown complete - auto-starting round');
              socketService.emit('start_crash_round', { matchId: data.match.id });
              setCountdown(null);
            }, 1000);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    }
  }, [user?.walletAddress]);

  const handlePlayerJoined = useCallback((data: any) => {
    console.log('👤 Player joined:', data);
    // ✅ CRITICAL FIX: Don't immediately transition to playing - let handleMatchState handle it
    // This prevents the issue where one player gets stuck on "waiting for opponent"
    if (currentMatch?.id === data.matchId) {
      loadAvailableMatches();
    }
  }, [currentMatch?.id, loadAvailableMatches]);

  const handlePayoutComplete = useCallback((data: any) => {
    console.log('✅ Payout completed:', data);
    alert(`💰 Payout completed! Transaction: ${data.transactionHash?.slice(0, 8)}...`);
    
    setTimeout(() => {
      router.push('/games');
    }, 2000);
  }, [router]);

  const handlePayoutFailed = useCallback((data: any) => {
    console.log('❌ Payout failed:', data);
    
    // 🎯 FIX: Don't show error for "Payout already in progress" since that means the payout is working
    if (data.error && data.error.includes('Payout already in progress')) {
      console.log('💰 Payout already in progress by other player - this is normal');
      return; // Silently ignore this "error" since payout is actually working
    }
    
    // Show actual errors
    setError(`Payout failed: ${data.error}`);
    alert(`❌ Payout failed: ${data.error}`);
  }, []);

  // Game actions
  const handleCreateMatch = useCallback(async () => {
    console.log('🎮 Attempting to create match...');
    console.log('🎮 User authenticated:', isAuthenticated);
    console.log('🎮 Vault balance:', vaultBalance);
    console.log('🎮 Wager amount:', wagerAmount);
    console.log('🎮 User wallet:', user?.walletAddress);
    console.log('🎮 Token exists:', !!localStorage.getItem('pv3_token'));
    
    if (!isAuthenticated) {
      setError('User not authenticated');
      return;
    }
    
    if (vaultBalance < wagerAmount) {
      setError(`Insufficient vault balance. Have: ${vaultBalance} SOL, Need: ${wagerAmount} SOL`);
      return;
    }

    if (!user?.walletAddress) {
      setError('User wallet address not available. Please try refreshing the page.');
      return;
    }
    
    setGamePhase('creating');
    setError(null);
    
    try {
      const match = await matchService.createCrashMatch(wagerAmount);
      console.log('🎮 Match created successfully:', match);
      
      setCurrentMatch(match);
      setGamePhase('waiting');
      
      // Join the match room
      if (user?.walletAddress) {
        socketService.emit('join_match', { matchId: match.id, playerId: user?.walletAddress || 'unknown' });
      } else {
        console.warn('⚠️ Cannot join match room - user wallet address not available');
      }
      
    } catch (error: any) {
      console.error('Failed to create match:', error);
      setError(error.message || 'Failed to create match');
      setGamePhase('lobby');
    }
  }, [isAuthenticated, vaultBalance, wagerAmount, user?.walletAddress]);

  const handleJoinMatch = useCallback(async (match: Match) => {
    if (!isAuthenticated || vaultBalance < match.wager || !user?.walletAddress) return;
    
    setGamePhase('joining');
    setError(null);
    
    try {
      await matchService.joinMatch(match.id);
      setCurrentMatch(match);
      setGamePhase('waiting');
      
      // Join the match room
      if (user?.walletAddress) {
        socketService.emit('join_match', { matchId: match.id, playerId: user?.walletAddress || 'unknown' });
      } else {
        console.warn('⚠️ Cannot join match room - user wallet address not available');
      }
      
    } catch (error: any) {
      console.error('Failed to join match:', error);
      setError(error.message || 'Failed to join match');
      setGamePhase('lobby');
    }
  }, [isAuthenticated, vaultBalance, user?.walletAddress]);

  const handleCashOut = useCallback(() => {
    // ✅ FIX: More strict validation - prevent cash out if crashed or already cashed out
    if (!currentMatch || playerCashedOut || gamePhase !== 'rising' || !user?.walletAddress) {
      console.log('❌ Cash out blocked:', { 
        hasMatch: !!currentMatch, 
        alreadyCashedOut: playerCashedOut, 
        gamePhase, 
        hasWallet: !!user?.walletAddress 
      });
      return;
    }
    
    console.log(`💰 Attempting to cash out at ${currentMultiplier.toFixed(2)}x`);
    
    // ✅ FIX: Set cashed out state immediately to prevent multiple clicks
    setPlayerCashedOut(true);
    
    socketService.emit('crash_cash_out', {
      matchId: currentMatch.id,
      playerId: user?.walletAddress || 'unknown',
      multiplier: currentMultiplier
    });
  }, [currentMatch, playerCashedOut, gamePhase, currentMultiplier, user?.walletAddress]);

  const handleCrashReached = useCallback(() => {
    console.log('💥 CLIENT PREDICTION: Crash point reached!');
    setGamePhase('crashed');
    
    // ✅ CLIENT PREDICTION: Deactivate crash predictor
    setCrashPredictor(prev => prev ? { ...prev, isActive: false } : null);
  }, []);

  // Continue to next round
  const continueToNextRound = useCallback(() => {
    setPlayer1CashOut(null);
    setPlayer2CashOut(null);
    setPlayerCashedOut(false);
    setCurrentMultiplier(1.0);
    setCountdown(null); // Reset countdown
    setGamePhase('playing');
    setRoundResult(null);
    
    console.log('🔄 Continuing to next round');
  }, []);

  // Auto-progression to next round
  useEffect(() => {
    if (gamePhase === 'round-complete' && roundResult && !roundResult.matchComplete) {
      const timer = setTimeout(() => {
        continueToNextRound();
      }, 5000); // 5 seconds to show round result
      
      return () => clearTimeout(timer);
    }
  }, [gamePhase, roundResult, continueToNextRound]);

  // Return to lobby
  const returnToLobby = useCallback(() => {
    setGamePhase('lobby');
    resetGameState();
    loadAvailableMatches();
  }, [resetGameState, loadAvailableMatches]);

  // Victory Screen Handlers - Universal Pattern from Mines/RPS
  const handleShareVictory = useCallback(() => {
    if (!gameResult) return;
    
    const userWallet = publicKey?.toString() || user?.walletAddress;
    const playerWonMatch = gameResult.matchWinner === userWallet;
    const gameText = `Crash`;
    
    const shareText = `${playerWonMatch ? '🏆' : '💔'} ${gameText} on PV3\n\n` +
      `Result: ${playerWonMatch ? 'Victory' : 'Defeat'}\n` +
      `Final Score: ${gameResult.gameState?.player1Score || 0} - ${gameResult.gameState?.player2Score || 0}\n` +
      `Wager: ${wagerAmount} SOL\n\n` +
      `Play at PV3.GAME 🎮`;

    if (navigator.share) {
      navigator.share({
        title: `PV3 Crash ${playerWonMatch ? 'Victory' : 'Result'}`,
        text: shareText,
        url: window.location.origin
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(shareText).then(() => {
        alert('Result copied to clipboard!');
      });
    }
  }, [gameResult, publicKey, user, wagerAmount]);

  const handleGeneratePnLCard = useCallback(() => {
    if (!gameResult) return;
    setShowPnLCard(true);
  }, [gameResult]);

  const handleInstantRematch = useCallback(async () => {
    if (!opponent || rematchLoading) return;
    
    setRematchLoading(true);
    try {
      // Create new match with same wager
      await handleCreateMatch();
      playSound('success');
    } catch (error) {
      console.error('Failed to create rematch:', error);
      playSound('error');
    } finally {
      setRematchLoading(false);
    }
  }, [opponent, rematchLoading, handleCreateMatch]);

  const handle2xStakeRematch = useCallback(async () => {
    if (!opponent || !currentMatch || rematchLoading) return;
    
    const doubleWager = wagerAmount * 2;
    
    // Check if user has enough balance for 2x stake
    if (vaultBalance < doubleWager * 1000000000) {
      setError('Insufficient balance for 2x stake rematch');
      playSound('error');
      return;
    }
    
    setRematchLoading(true);
    playSound('click');
    
    try {
      // TODO: Implement 2x stake rematch challenge in socketService
      console.log('Sending 2x stake rematch challenge:', { matchId: currentMatch.id, opponentId: opponent.id, wager: doubleWager });
      
      // Show waiting state
      setGamePhase('waiting');
      resetGameState();
      
      // Create notification
      setError(`2x Stake challenge (${doubleWager} SOL) sent to ${opponent?.username || opponent?.wallet?.slice(0, 8) || 'Unknown'}...`);
      setTimeout(() => setError(null), 5000);
      
    } catch (error) {
      console.error('Failed to send 2x stake challenge:', error);
      setError('Failed to send 2x stake challenge');
      playSound('error');
    } finally {
      setRematchLoading(false);
    }
  }, [opponent, currentMatch, rematchLoading, wagerAmount, vaultBalance, resetGameState]);

  const handleQuickMatch = useCallback(() => {
    playSound('click');
    setGamePhase('lobby');
    resetGameState();
    
    // Auto-trigger match creation with same settings
    setTimeout(() => {
      loadAvailableMatches();
    }, 500);
  }, [resetGameState, loadAvailableMatches]);

  // Cancel match
  const cancelMatch = useCallback(async () => {
    if (!currentMatch) return;

    try {
      await matchService.cancelMatch(currentMatch.id);
      returnToLobby();
    } catch (error) {
      console.error('Failed to cancel match:', error);
      returnToLobby();
    }
  }, [currentMatch, returnToLobby]);

  // Load matches on lobby phase
  useEffect(() => {
    if (gamePhase === 'lobby' && socketConnected) {
      loadAvailableMatches();
    }
  }, [gamePhase, socketConnected, loadAvailableMatches]);

  // Loading check - prevent rendering until auth is complete
  if (authLoading) {
    return (
      <div className="min-h-screen bg-main text-text-primary">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="lg:ml-64 min-h-screen">
          <PageHeader onMenuClick={() => setSidebarOpen(true)} />
          <main className="p-6">
            <div className="max-w-4xl mx-auto text-center py-20">
              <div className="text-8xl mb-8">🚀</div>
              <h1 className="text-4xl font-bold text-text-primary mb-4 font-audiowide uppercase">Crash</h1>
              <p className="text-lg text-text-secondary mb-8 font-inter">
                Loading...
              </p>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-primary mx-auto"></div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Authentication check
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-main text-text-primary">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="lg:ml-64 min-h-screen">
          <PageHeader onMenuClick={() => setSidebarOpen(true)} />
          <main className="p-6">
            <div className="max-w-4xl mx-auto text-center py-20">
              <div className="text-8xl mb-8">🚀</div>
              <h1 className="text-4xl font-bold text-text-primary mb-4 font-audiowide uppercase">Crash</h1>
              <p className="text-lg text-text-secondary mb-8 font-inter">
                Please log in to play crash
              </p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-main text-text-primary font-inter">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="lg:ml-64 min-h-screen">
        <PageHeader onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="p-6">
          {/* Stake-Style Game Container */}
          <div className="max-w-7xl mx-auto">
            
            {/* Fixed Game Viewport Container */}
            <div className="relative">
              
              {/* Main Game Area - Fixed Dimensions */}
              <div className="bg-bg-elevated border border-border rounded-xl overflow-hidden relative" 
                   style={{ 
                     height: '950px', 
                     minHeight: '950px'
                   }}>
                
                {/* Animated Background Layer - Only during active gameplay */}
                {gamePhase !== 'lobby' && (
                  <div 
                    className="absolute inset-0 rounded-xl"
                    style={{ 
                      backgroundImage: 'url(/crash-game/gamebackground.png)',
                      backgroundSize: '105%',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat',
                      animation: 'crashBackgroundFloat 8s ease-in-out infinite alternate, crashBackgroundShift 12s linear infinite'
                    }}
                  />
                )}
              
                {/* Game Content Container */}
                <div className="h-full flex flex-col relative z-1 bg-black/10 backdrop-blur-[0.5px]">
                  
                  {/* Game Header - Compact with Crash Info */}
                  <div className="flex-shrink-0 px-6 py-4 border-b border-border">
                    <div className="flex items-center justify-between">
                      <div>
                        <h1 className="text-2xl font-bold text-text-primary font-audiowide uppercase">🚀 Crash</h1>
                        <p className="text-sm text-text-secondary font-inter">Cash out before the crash • Winner takes all</p>
                </div>
                      
                      {/* Crash Game Info - Show during active game */}
                      {(gamePhase === 'playing' || gamePhase === 'rising' || gamePhase === 'crashed' || gamePhase === 'round-complete' || gamePhase === 'round-result') && currentMatch && (
                        <div className="flex items-center gap-8">
                          <div className="text-center">
                            <p className="text-sm text-text-secondary">You</p>
                            <p className="text-xl font-bold">
                              {user?.walletAddress === currentMatch?.player1?.wallet 
                                ? (serverGameState?.player1Score || 0)
                                : (serverGameState?.player2Score || 0)
                              }
                            </p>
                          </div>
                          <div className="text-center">
                            {/* Show current multiplier or crash result */}
                            {gamePhase === 'rising' ? (
                              <div>
                                <p className="text-lg font-bold text-green-400">{currentMultiplier.toFixed(2)}x</p>
                                <p className="text-xs text-text-secondary">Rising...</p>
                              </div>
                            ) : gamePhase === 'crashed' || gamePhase === 'round-result' ? (
                              <div>
                                <p className="text-lg font-bold text-red-400">💥 {backendCrashMultiplier?.toFixed(2) || crashMultiplier.toFixed(2)}x</p>
                                <p className="text-xs text-text-secondary">Crashed</p>
                              </div>
                            ) : (
                              <div>
                                <p className="text-lg font-bold">Round {serverGameState?.currentRound || 1}</p>
                                <p className="text-xs text-text-secondary">First to {serverGameState?.requiredWins || 3}</p>
                  </div>
                )}
              </div>
                          <div className="text-center">
                            <p className="text-sm text-text-secondary">Opponent</p>
                            <p className="text-xl font-bold">
                              {user?.walletAddress === currentMatch?.player1?.wallet 
                                ? (serverGameState?.player2Score || 0)
                                : (serverGameState?.player1Score || 0)
                              }
                            </p>
            </div>
                        </div>
                      )}
                      
                      <div className="text-right">
                        {!socketConnected && (
                          <p className="text-sm text-red-400">⚠️ Connecting...</p>
                        )}
                        {socketConnected && (
                          <p className="text-sm text-green-400">🔗 Connected</p>
                        )}
                        {connectionError && (
                          <p className="text-xs text-red-400 mt-1">{connectionError}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Game Content - No Scroll, Direct Layout */}
                  <div className="flex-1 flex flex-col">
                    <div className="flex-1 flex flex-col justify-start pt-4">
                      {/* Game Content - Full Container Width */}
                      <div className="w-full px-6">

                        {/* Game Container */}
                        <div>

            {error && (
                            <div className="mb-6">
                              <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 text-center">
                  <div className="text-red-400">{error}</div>
                </div>
              </div>
            )}

            {/* Lobby Phase */}
            {gamePhase === 'lobby' && (
                            <div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  
                  {/* Create Match */}
                  <div className="glass-card p-8 text-center">
                    <h2 className="text-2xl font-bold text-text-primary mb-6 font-audiowide">Create Match</h2>
                    
                    <div className="mb-6">
                      <label className="block text-text-secondary mb-2 font-inter">Wager Amount</label>
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        <button
                          onClick={() => setWagerAmount(0.1)}
                          className={`px-4 py-2 rounded-lg font-audiowide ${wagerAmount === 0.1 ? 'bg-accent-primary text-black' : 'bg-bg-card text-text-primary'}`}
                        >
                          0.1 SOL
                        </button>
                        <button
                          onClick={() => setWagerAmount(0.25)}
                          className={`px-4 py-2 rounded-lg font-audiowide ${wagerAmount === 0.25 ? 'bg-accent-primary text-black' : 'bg-bg-card text-text-primary'}`}
                        >
                          0.25 SOL
                        </button>
                        <button
                          onClick={() => setWagerAmount(0.5)}
                          className={`px-4 py-2 rounded-lg font-audiowide ${wagerAmount === 0.5 ? 'bg-accent-primary text-black' : 'bg-bg-card text-text-primary'}`}
                        >
                          0.5 SOL
                        </button>
                        <button
                          onClick={() => setWagerAmount(1.0)}
                          className={`px-4 py-2 rounded-lg font-audiowide ${wagerAmount === 1.0 ? 'bg-accent-primary text-black' : 'bg-bg-card text-text-primary'}`}
                        >
                          1.0 SOL
                        </button>
                        <button
                          onClick={() => setWagerAmount(2.5)}
                          className={`px-4 py-2 rounded-lg font-audiowide ${wagerAmount === 2.5 ? 'bg-accent-primary text-black' : 'bg-bg-card text-text-primary'}`}
                        >
                          2.5 SOL
                        </button>
                        <button
                          onClick={() => setWagerAmount(5.0)}
                          className={`px-4 py-2 rounded-lg font-audiowide ${wagerAmount === 5.0 ? 'bg-accent-primary text-black' : 'bg-bg-card text-text-primary'}`}
                        >
                          5.0 SOL
                        </button>
                        <button
                          onClick={() => setWagerAmount(10.0)}
                          className={`px-4 py-2 rounded-lg font-audiowide ${wagerAmount === 10.0 ? 'bg-accent-primary text-black' : 'bg-bg-card text-text-primary'}`}
                        >
                          10.0 SOL
                        </button>
                        </div>
                        </div>

                    <div className="mb-6">
                      <div className="text-sm text-text-secondary font-inter">
                        Vault Balance: {formatSOL(vaultBalance)}
                        </div>
                      </div>
                      
                    <button
                        onClick={handleCreateMatch}
                      disabled={loading || !socketConnected || vaultBalance < wagerAmount * 1000000000}
                      className="primary-button font-audiowide disabled:opacity-50"
                      >
                      Create Match ({wagerAmount} SOL)
                    </button>
                  </div>

                  {/* Join Match */}
                  <div className="glass-card p-8">
                    <h2 className="text-2xl font-bold text-text-primary mb-6 font-audiowide text-center">Available Matches</h2>
                    
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                    {availableMatches.length === 0 ? (
                        <div className="text-center text-text-secondary py-8">
                          <div className="text-4xl mb-4">💥</div>
                          <p className="font-inter">No matches available</p>
                          <p className="text-sm font-inter">Create a match to get started!</p>
                      </div>
                    ) : (
                        availableMatches.map((match) => (
                          <div key={match.id} className="bg-bg-card rounded-lg p-4 flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              {/* 🚀 CRASH FIX: Handle matches without players assigned yet */}
                              {match.player1 ? (
                              <Avatar user={match.player1} size="sm" />
                              ) : (
                                <div className="w-8 h-8 bg-accent-primary/20 rounded-full flex items-center justify-center">
                                  <span className="text-accent-primary text-sm">🚀</span>
                                </div>
                              )}
                              <div className="text-left">
                                <div className="font-audiowide text-text-primary">{match.wager} SOL</div>
                                <div className="text-sm text-text-secondary font-inter">
                                  {match.player1 
                                    ? `vs ${match.player1?.username || match.player1?.wallet?.slice(0, 8) || 'Unknown'}...`
                                    : 'Open Match - Join to Play!'
                                  }
                                </div>
                                </div>
                              </div>
                                                         <button
                               onClick={() => handleJoinMatch(match)}
                               disabled={!socketConnected || gamePhase !== 'lobby'}
                               className="px-4 py-2 bg-accent-primary text-black rounded-lg font-audiowide hover:bg-accent-secondary disabled:opacity-50"
                             >
                                Join
                             </button>
                            </div>
                        ))
                      )}
                          </div>

                    <div className="mt-6 text-center">
                      <button
                        onClick={loadAvailableMatches}
                        disabled={!socketConnected}
                        className="secondary-button font-audiowide"
                      >
                        Refresh
                      </button>
                      </div>
                  </div>
                </div>

                {/* Quick Match Section */}
                <div className="mt-8">
                  <div className="glass-card p-6">
                    <CrashQuickMatch 
                      onMatchFound={(matchId: string) => {
                        // Join existing match
                        handleJoinMatch({ id: matchId } as Match);
                      }}
                      onMatchCreated={(match: any) => {
                        // Handle created match
                        setCurrentMatch(match);
                        setGamePhase('waiting');
                        if (user) {
                          socketService.joinMatch(match.id, user?.walletAddress || user?.id || 'unknown');
                        }
                      }}
                      socketConnected={socketConnected}
                      gamePhase={gamePhase}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Creating/Joining Phase */}
            {(gamePhase === 'creating' || gamePhase === 'joining') && (
                            <div className="text-center">
                <div className="glass-card p-8">
                  <div className="text-6xl mb-4">⏳</div>
                  <h2 className="text-2xl font-bold text-text-primary mb-4 font-audiowide">
                    {gamePhase === 'creating' ? 'Creating Match...' : 'Joining Match...'}
                  </h2>
                  <p className="text-text-secondary font-inter">Please wait...</p>
                </div>
              </div>
            )}

            {/* Waiting for Opponent */}
            {gamePhase === 'waiting' && (
                            <div className="text-center">
                <div className="glass-card p-8">
                  <div className="text-6xl mb-4">👥</div>
                  <h2 className="text-2xl font-bold text-text-primary mb-4 font-audiowide">Waiting for Opponent...</h2>
                  <p className="text-text-secondary font-inter mb-4">
                    Match created with {wagerAmount} SOL wager
                  </p>
                  <div className="flex space-x-4 justify-center">
                                  <button 
                                    onClick={() => {
                                      setGamePhase('lobby');
                                      setCurrentMatch(null);
                                    }} 
                                    className="secondary-button font-audiowide"
                                  >
                      Cancel Match
                    </button>
                    <button onClick={loadAvailableMatches} className="primary-button font-audiowide">
                      Refresh
                    </button>
                  </div>
                </div>
              </div>
            )}

                          {/* Playing Phase - Ultra Compact Layout */}
                          {(gamePhase === 'playing' || gamePhase === 'rising') && (
                            <div className="text-center space-y-4">
                              
                                            {/* Multiplier Display - Top Center */}
              <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-20">
                                <div className="bg-black/90 backdrop-blur-sm rounded-lg px-6 py-3 border border-gray-600 shadow-xl">
                                  <div className="text-4xl font-bold font-audiowide tracking-wider text-center" style={{ color: '#10b981' }}>
                                    {currentMultiplier.toFixed(2)}x
                        </div>
                                  </div>
                        </div>

                                            {/* Crash Animation - Full Integration with Background */}
                              <div className="absolute inset-0 pointer-events-none">
                                <div className="w-full h-full">
                                  <CrashAnimation
                                    isActive={gamePhase === 'rising'}
                                    currentMultiplier={currentMultiplier}
                                    crashMultiplier={backendCrashMultiplier || crashMultiplier}
                                    roundStartTime={roundStartTime}
                                    onCrashReached={handleCrashReached}
                                    gamePhase={gamePhase === 'rising' ? 'rising' : 'waiting'}
                                    onMultiplierUpdate={setCurrentMultiplier}
                                    onAnimationFrameId={setAnimationFrameId}
                                    crashPredictor={crashPredictor}
                                  />
                      </div>
                    </div>

                              {/* Cash Out Button - Premium Gaming Style */}
                              {gamePhase === 'rising' && !playerCashedOut && (
                                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20">
                                  <button
                                    onClick={handleCashOut}
                                    className="relative px-8 py-4 bg-gradient-to-br from-green-600 via-green-500 to-green-600 text-white font-bold rounded-xl hover:from-green-500 hover:via-green-400 hover:to-green-500 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 font-audiowide text-xl shadow-lg hover:shadow-2xl shadow-green-500/30 border border-green-400/50 backdrop-blur-sm"
                                  >
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-xl"></div>
                                    <div className="relative flex items-center gap-2">
                                      <span className="text-2xl">💰</span>
                                      <div>
                                        <div className="text-lg">Cash Out</div>
                                        <div className="text-sm opacity-90 font-bold">{currentMultiplier.toFixed(2)}x</div>
                                      </div>
                                    </div>
                                  </button>
                    </div>
                              )}

                              {playerCashedOut && personalCashOutMultiplier && (
                                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20">
                                  <div className="relative px-8 py-4 bg-gradient-to-br from-blue-600 via-blue-500 to-blue-600 text-white font-bold rounded-xl font-audiowide text-xl shadow-lg shadow-blue-500/30 border border-blue-400/50 backdrop-blur-sm">
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-xl"></div>
                                    <div className="relative flex items-center gap-2">
                                      <span className="text-2xl">✅</span>
                                      <div>
                                        <div className="text-lg">Cashed Out</div>
                                        <div className="text-sm opacity-90 font-bold">{personalCashOutMultiplier.toFixed(2)}x</div>
                                      </div>
                                    </div>
                        </div>
                        </div>
                          )}
                        </div>
                          )}

                          {/* Crashed Phase - Compact Layout */}
                          {gamePhase === 'crashed' && (
                            <div className="text-center space-y-6">
                              
                              {/* Crash Status - Compact */}
                              <div className="py-2">
                                <div className="text-red-400 text-xl">
                                  💥 CRASHED at {backendCrashMultiplier?.toFixed(2) || crashMultiplier.toFixed(2)}x
                  </div>
                </div>

                              {/* Crash Animation - Full Background Integration */}
                              <div className="absolute inset-0 pointer-events-none">
                                <div className="w-full h-full">
                  <CrashAnimation
                                  isActive={false}
                    currentMultiplier={currentMultiplier}
                                  crashMultiplier={backendCrashMultiplier || crashMultiplier}
                    roundStartTime={roundStartTime}
                    onCrashReached={handleCrashReached}
                                  gamePhase="crashed"
                    onMultiplierUpdate={setCurrentMultiplier}
                    onAnimationFrameId={setAnimationFrameId}
                                  crashPredictor={crashPredictor}
                                />
                                </div>
                              </div>

                              {/* Waiting for Results */}
                              <div>
                                <div className="text-text-secondary">
                                  <div className="animate-spin inline-block w-4 h-4 border-2 border-accent-primary border-t-transparent rounded-full mr-2"></div>
                                  Processing round results...
                      </div>
                          </div>
                    </div>
                  )}
                  
                          {/* Round Complete - Compact Layout */}
                          {gamePhase === 'round-complete' && roundResult && (
                            <div className="text-center space-y-6">
                              
                              {/* Round Results - Compact */}
                              <div className="py-2">
                                <div className="grid grid-cols-2 gap-8 mb-4">
                                  <div className="space-y-1">
                                    <p className="text-sm text-text-secondary">Your Result</p>
                                    <p className="text-lg font-bold">
                                      {user?.walletAddress === currentMatch?.player1?.wallet 
                                        ? (roundResult.player1Result?.cashOut ? `💰 ${roundResult.player1Result.cashOut.toFixed(2)}x` : '❌ No Cash Out')
                                        : (roundResult.player2Result?.cashOut ? `💰 ${roundResult.player2Result.cashOut.toFixed(2)}x` : '❌ No Cash Out')
                                      }
                                    </p>
                      </div>
                                  <div className="space-y-1">
                                    <p className="text-sm text-text-secondary">Opponent Result</p>
                                    <p className="text-lg font-bold">
                                      {user?.walletAddress === currentMatch?.player1?.wallet 
                                        ? (roundResult.player2Result?.cashOut ? `💰 ${roundResult.player2Result.cashOut.toFixed(2)}x` : '❌ No Cash Out')
                                        : (roundResult.player1Result?.cashOut ? `💰 ${roundResult.player1Result.cashOut.toFixed(2)}x` : '❌ No Cash Out')
                                      }
                                    </p>
                    </div>
                        </div>
                        </div>
                              
                              {/* Crash Animation - Full Background Integration */}
                              <div className="absolute inset-0 pointer-events-none">
                                <div className="w-full h-full">
                                <CrashAnimation
                                  isActive={false}
                                  currentMultiplier={currentMultiplier}
                                  crashMultiplier={backendCrashMultiplier || crashMultiplier}
                                  roundStartTime={roundStartTime}
                                  onCrashReached={handleCrashReached}
                                  gamePhase="complete"
                                  onMultiplierUpdate={setCurrentMultiplier}
                                  onAnimationFrameId={setAnimationFrameId}
                                  crashPredictor={crashPredictor}
                                />
                                </div>
                      </div>

                              {/* Waiting Status */}
                              <div>
                                <div className="text-xl font-bold text-accent-primary mb-2 font-audiowide">
                                  ⏳ Waiting for opponent...
                    </div>
                                <p className="text-text-secondary">Both players must be ready to continue</p>
                </div>
              </div>
            )}

                          {/* Round Result - Compact Layout */}
                          {gamePhase === 'round-result' && roundResult && (
                            <div className="text-center space-y-6">
                              
                              {/* Round Results - Compact */}
                              <div className="py-2">
                                <div className="grid grid-cols-2 gap-8 mb-4">
                                  <div className="space-y-1">
                                    <p className="text-sm text-text-secondary">Your Result</p>
                                    <p className="text-lg font-bold">
                        {user?.walletAddress === currentMatch?.player1?.wallet 
                                        ? (roundResult.player1Result?.cashOut ? `💰 ${roundResult.player1Result.cashOut.toFixed(2)}x` : '❌ No Cash Out')
                                        : (roundResult.player2Result?.cashOut ? `💰 ${roundResult.player2Result.cashOut.toFixed(2)}x` : '❌ No Cash Out')
                        }
                      </p>
                  </div>
                                  <div className="space-y-1">
                                    <p className="text-sm text-text-secondary">Opponent Result</p>
                                    <p className="text-lg font-bold">
                        {user?.walletAddress === currentMatch?.player1?.wallet 
                                        ? (roundResult.player2Result?.cashOut ? `💰 ${roundResult.player2Result.cashOut.toFixed(2)}x` : '❌ No Cash Out')
                                        : (roundResult.player1Result?.cashOut ? `💰 ${roundResult.player1Result.cashOut.toFixed(2)}x` : '❌ No Cash Out')
                        }
                      </p>
                                  </div>
                  </div>
                </div>
                  
                              {/* Crash Animation - Full Background Integration */}
                              <div className="absolute inset-0 pointer-events-none">
                                <div className="w-full h-full">
                                <CrashAnimation
                                  isActive={false}
                                  currentMultiplier={currentMultiplier}
                                  crashMultiplier={backendCrashMultiplier || crashMultiplier}
                                  roundStartTime={roundStartTime}
                                  onCrashReached={handleCrashReached}
                                  gamePhase="complete"
                                  onMultiplierUpdate={setCurrentMultiplier}
                                  onAnimationFrameId={setAnimationFrameId}
                                  crashPredictor={crashPredictor}
                                />
                                </div>
                  </div>
                </div>
                          )}
                
                          {/* Round Countdown - Compact Layout */}
                          {gamePhase === 'round-countdown' && (
                            <div className="text-center space-y-6">
                              
                              {/* Countdown Status - Compact */}
                              <div className="py-2">
                                <div className="text-yellow-400 text-xl">
                                  🚀 Next round starting...
                                </div>
                              </div>
                              
                              {/* Countdown Display */}
                              <div className="text-6xl font-bold text-yellow-400 mb-4">
                      {countdown}
                </div>
                              
                              {/* Status */}
                              <div>
                                <p className="text-text-secondary">Get ready for the next round!</p>
                  </div>
              </div>
            )}

                          {/* Victory/Defeat Screen - Universal Pattern from Mines/RPS */}
            {gamePhase === 'finished' && gameResult && (
              <div className="text-center space-y-4">
                <div className="text-8xl mb-6">
                  {(() => {
                    const userWallet = publicKey?.toString() || user?.walletAddress;
                    const playerWonMatch = gameResult.matchWinner === userWallet;
                    return playerWonMatch ? '🏆' : '💔';
                  })()}
                  </div>
                
                <div className="mb-6">
                  <div className="text-2xl font-bold text-text-primary font-audiowide mb-2">
                    {(() => {
                      const userWallet = publicKey?.toString() || user?.walletAddress;
                      const playerWonMatch = gameResult.matchWinner === userWallet;
                      return playerWonMatch ? '🏆 Victory!' : '💔 Defeat';
                    })()}
                  </div>
                  <div className="text-lg text-text-secondary font-inter">
                    {(() => {
                      const userWallet = publicKey?.toString() || user?.walletAddress;
                      const playerWonMatch = gameResult.matchWinner === userWallet;
                      return playerWonMatch ? 
                        `+${(wagerAmount * 2 * 0.935).toFixed(3)} SOL` : 
                        `-${wagerAmount} SOL`;
                    })()}
                  </div>
                  
                  <div className="text-sm text-text-secondary font-inter mt-2">
                    Final Score: {user?.walletAddress === currentMatch?.player1?.wallet 
                      ? `${gameResult.gameState?.player1Score || 0} - ${gameResult.gameState?.player2Score || 0}`
                      : `${gameResult.gameState?.player2Score || 0} - ${gameResult.gameState?.player1Score || 0}`
                    }
                  </div>
                </div>

                {/* Professional Button Grid with Tooltips - Same as RPS/Mines */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
                  
                  {/* Instant Rematch */}
                  {opponent && (
                    <div className="relative group">
                                <button
                        onClick={handleInstantRematch}
                        disabled={rematchLoading}
                        className="relative w-full bg-gradient-to-br from-blue-600 via-blue-500 to-blue-600 text-white font-bold py-4 px-6 rounded-xl hover:from-blue-500 hover:via-blue-400 hover:to-blue-500 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 disabled:opacity-50 shadow-lg hover:shadow-2xl shadow-blue-500/30 border border-blue-400/50"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-xl"></div>
                        <div className="relative">
                          {rematchLoading ? (
                            <div className="flex items-center justify-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Creating...
                            </div>
                          ) : (
                            <>
                              <div className="text-lg mb-1">🎯 Instant Rematch</div>
                              <div className="text-xs opacity-90 font-semibold">{wagerAmount} SOL</div>
                            </>
                          )}
                        </div>
                                </button>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black/90 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                        Challenge the same opponent again
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black/90"></div>
                </div>
              </div>
            )}

                  {/* 2x Stake Challenge */}
                  {opponent && (
                    <div className="relative group">
                      <button
                        onClick={handle2xStakeRematch}
                        disabled={rematchLoading}
                        className="relative w-full bg-gradient-to-br from-red-600 via-red-500 to-red-600 text-white font-bold py-4 px-6 rounded-xl hover:from-red-500 hover:via-red-400 hover:to-red-500 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 disabled:opacity-50 shadow-lg hover:shadow-2xl shadow-red-500/30 border border-red-400/50"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-xl"></div>
                        <div className="relative">
                          {rematchLoading ? (
                            <div className="flex items-center justify-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Sending...
                        </div>
                          ) : (
                            <>
                              <div className="text-lg mb-1">⚡ 2x Stake Challenge</div>
                              <div className="text-xs opacity-90 font-semibold">{(wagerAmount * 2).toFixed(2)} SOL</div>
                            </>
                          )}
                      </div>
                      </button>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black/90 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                        Double the stakes for high-risk rematch
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black/90"></div>
                      </div>
                    </div>
                  )}
                  
                  {/* Quick Match - Find new opponent */}
                  <div className="relative group">
                  <button
                      onClick={handleQuickMatch}
                      className="relative w-full bg-gradient-to-br from-green-600 via-green-500 to-green-600 text-white font-bold py-4 px-6 rounded-xl hover:from-green-500 hover:via-green-400 hover:to-green-500 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 shadow-lg hover:shadow-2xl shadow-green-500/30 border border-green-400/50"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-xl"></div>
                      <div className="relative">
                        <div className="text-lg mb-1">🎲 Quick Match</div>
                        <div className="text-xs opacity-90 font-semibold">Find Opponent</div>
                      </div>
                  </button>
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black/90 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                      Start a new match with a different opponent
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black/90"></div>
                      </div>
                    </div>
                  
                  {/* Share Victory/Result */}
                  <div className="relative group">
                  <button
                      onClick={handleShareVictory}
                      className="relative w-full bg-gradient-to-br from-gray-600 via-gray-500 to-gray-600 text-white font-bold py-4 px-6 rounded-xl hover:from-gray-500 hover:via-gray-400 hover:to-gray-500 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 shadow-lg hover:shadow-2xl shadow-gray-500/30 border border-gray-400/50"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-xl"></div>
                      <div className="relative">
                        <div className="text-lg mb-1">📱 Share {(() => {
                          const userWallet = publicKey?.toString() || user?.walletAddress;
                          const playerWonMatch = gameResult.matchWinner === userWallet;
                          return playerWonMatch ? 'Victory' : 'Result';
                        })()}</div>
                        <div className="text-xs opacity-90 font-semibold">
                          {(() => {
                            const userWallet = publicKey?.toString() || user?.walletAddress;
                            const playerWonMatch = gameResult.matchWinner === userWallet;
                            return playerWonMatch ? 'Brag Rights' : 'Show Results';
                          })()}
                        </div>
                      </div>
                  </button>
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black/90 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                      {(() => {
                        const userWallet = publicKey?.toString() || user?.walletAddress;
                        const playerWonMatch = gameResult.matchWinner === userWallet;
                        return playerWonMatch ? 'Share your victory on social media' : 'Share your match results';
                      })()}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black/90"></div>
                    </div>
                </div>
                
                  {/* Victory Card Generation */}
                  <div className="relative group">
                  <button
                      onClick={handleGeneratePnLCard}
                      className="relative w-full bg-gradient-to-br from-purple-600 via-pink-500 to-purple-600 text-white font-bold py-4 px-6 rounded-xl hover:from-purple-500 hover:via-pink-400 hover:to-purple-500 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 shadow-lg hover:shadow-2xl shadow-purple-500/30 border border-purple-400/50"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-xl"></div>
                      <div className="relative">
                        <div className="text-lg mb-1">🏆 Victory Card</div>
                        <div className="text-xs opacity-90 font-semibold">Trading Style</div>
                      </div>
                  </button>
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black/90 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                      Generate professional trading-style Victory Card
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black/90"></div>
                    </div>
                  </div>
                  
                  {/* Revenge Match - For losers */}
                  {(() => {
                    const userWallet = publicKey?.toString() || user?.walletAddress;
                    const playerWonMatch = gameResult.matchWinner === userWallet;
                    return !playerWonMatch && opponent && (
                      <div className="relative group">
                  <button
                          onClick={handleInstantRematch}
                          disabled={rematchLoading}
                          className="relative w-full bg-gradient-to-br from-amber-600 via-orange-500 to-amber-600 text-white font-bold py-4 px-6 rounded-xl hover:from-amber-500 hover:via-orange-400 hover:to-amber-500 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 disabled:opacity-50 shadow-lg hover:shadow-2xl shadow-amber-500/30 border border-amber-400/50"
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-xl"></div>
                          <div className="relative">
                            <div className="text-lg mb-1">⚔️ Revenge Match</div>
                            <div className="text-xs opacity-90 font-semibold">Get Even</div>
                          </div>
                  </button>
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black/90 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                          Challenge them again to get your revenge
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black/90"></div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Back to Games */}
                  <div className="relative group">
                  <button
                      onClick={() => router.push('/')}
                      className="relative w-full bg-gradient-to-br from-gray-700 via-gray-600 to-gray-700 text-white font-bold py-4 px-6 rounded-xl hover:from-gray-600 hover:via-gray-500 hover:to-gray-600 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 shadow-lg hover:shadow-2xl shadow-gray-600/30 border border-gray-500/50"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-xl"></div>
                      <div className="relative">
                        <div className="text-lg mb-1">🏠 Back to Games</div>
                        <div className="text-xs opacity-90 font-semibold">Main Menu</div>
                      </div>
                  </button>
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black/90 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                      Return to the main games menu
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black/90"></div>
                    </div>
                  </div>
                  
                    </div>
                  </div>
            )}

                        </div>
                        
                      </div>
                      </div>
                    </div>
                    </div>
                </div>
                

              
                          {/* Floating Panels */}
            <FloatingPanel
              id="crash-overview"
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
              id="crash-chat"
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
              id="crash-settings"
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
              id="crash-stats"
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
              id="crash-favorites"
              title="Favorites & Bookmarks"
              icon="⭐"
              isOpen={!dockedPanels.has('favorites') && openPanels.favorites}
              onClose={() => closePanel('favorites')}
              defaultPosition={{ x: 150, y: 200 }}
              defaultSize={{ width: 320, height: 450 }}
            >
                          <div className="space-y-4">
                <div className="bg-bg-card rounded-lg p-4">
                  <h4 className="font-semibold text-text-primary mb-3">Current Match</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-text-secondary">Your Score:</span>
                      <span className="text-accent-primary font-bold">
                      {user?.walletAddress === currentMatch?.player1?.wallet 
                                      ? (serverGameState?.player1Score || 0)
                                      : (serverGameState?.player2Score || 0)
                      }
                                  </span>
                    </div>
                                <div className="flex justify-between">
                                  <span className="text-text-secondary">Opponent Score:</span>
                                  <span className="text-red-400 font-bold">
                      {user?.walletAddress === currentMatch?.player1?.wallet 
                                      ? (serverGameState?.player2Score || 0)
                                      : (serverGameState?.player1Score || 0)
                      }
                                  </span>
                    </div>
                                <div className="flex justify-between">
                      <span className="text-text-secondary">Multiplier:</span>
                      <span className="text-green-400 font-bold">{currentMultiplier.toFixed(2)}x</span>
                                </div>
                  </div>
                </div>
                
                <div className="bg-bg-card rounded-lg p-4">
                  <h4 className="font-semibold text-text-primary mb-3">Quick Actions</h4>
                  <div className="space-y-2">
                    <button className="w-full text-left p-2 bg-bg-main hover:bg-bg-hover rounded transition-colors text-sm">
                      Bookmark Strategy
                    </button>
                    <button className="w-full text-left p-2 bg-bg-main hover:bg-bg-hover rounded transition-colors text-sm">
                      Save Game State
                    </button>
                  </div>
                </div>
              </div>
            </FloatingPanel>
            </div>
          </div>
          
          {/* Floating Panel Toggle Bar - Exact Mines/RPS Style */}
          <div className="flex justify-center mt-4">
            <div className="flex items-center gap-3 bg-bg-elevated/90 backdrop-blur-sm border border-border rounded-xl px-4 py-2">
              
              {/* Docking Status Indicator */}
              <div className="flex items-center gap-2 px-3 py-1 bg-bg-card/50 rounded-lg border border-border/30">
                <span className="text-xs font-audiowide text-text-secondary">
                  {dockedPanels.size === 0 ? '🎯 ALL FLOATING' : 
                   dockedPanels.size === 5 ? '📋 ALL DOCKED' :
                   `📋 ${dockedPanels.size}/5 DOCKED`}
                                  </span>
                {dockedPanels.size > 0 && (
                  <button
                    onClick={handleUndockAll}
                    className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
                    title="Undock all panels"
                  >
                    📤 CLEAR ALL
                  </button>
                )}
                                </div>

              {/* Draggable Panel Icons */}
              <div className="flex items-center gap-3">
                
                {/* Game Overview */}
                <button
                  draggable
                  onDragStart={(e) => handleDragStart(e, 'overview')}
                  onDragEnd={handleDragEnd}
                  onClick={() => !dockedPanels.has('overview') ? togglePanel('overview') : null}
                  className={`p-3 rounded-lg transition-all duration-200 transform hover:scale-110 active:scale-95 cursor-grab active:cursor-grabbing ${
                    (!dockedPanels.has('overview') && openPanels.overview) || dockedPanels.has('overview')
                      ? 'bg-accent-primary text-white shadow-lg shadow-accent-primary/30' 
                      : 'bg-bg-card hover:bg-bg-hover text-text-secondary hover:text-text-primary'
                  } ${isDragging && draggedPanel === 'overview' ? 'opacity-50 scale-110' : ''}`}
                  title={!dockedPanels.has('overview') ? "Game Overview - Click to open or drag to dock" : "Game Overview - Docked (drag to undock)"}
                >
                  <span className="text-xl">🎮</span>
                </button>
                
                {/* Chat Toggle */}
                <button
                  draggable
                  onDragStart={(e) => handleDragStart(e, 'chat')}
                  onDragEnd={handleDragEnd}
                  onClick={() => !dockedPanels.has('chat') ? togglePanel('chat') : null}
                  className={`p-3 rounded-lg transition-all duration-200 transform hover:scale-110 active:scale-95 cursor-grab active:cursor-grabbing ${
                    (!dockedPanels.has('chat') && openPanels.chat) || dockedPanels.has('chat')
                      ? 'bg-accent-primary text-white shadow-lg shadow-accent-primary/30' 
                      : 'bg-bg-card hover:bg-bg-hover text-text-secondary hover:text-text-primary'
                  } ${isDragging && draggedPanel === 'chat' ? 'opacity-50 scale-110' : ''}`}
                  title={!dockedPanels.has('chat') ? "Live Chat - Click to open or drag to dock" : "Live Chat - Docked (drag to undock)"}
                >
                  <span className="text-xl">💬</span>
                </button>
                
                {/* Settings */}
                <button
                  draggable
                  onDragStart={(e) => handleDragStart(e, 'settings')}
                  onDragEnd={handleDragEnd}
                  onClick={() => !dockedPanels.has('settings') ? togglePanel('settings') : null}
                  className={`p-3 rounded-lg transition-all duration-200 transform hover:scale-110 active:scale-95 cursor-grab active:cursor-grabbing ${
                    (!dockedPanels.has('settings') && openPanels.settings) || dockedPanels.has('settings')
                      ? 'bg-accent-primary text-white shadow-lg shadow-accent-primary/30' 
                      : 'bg-bg-card hover:bg-bg-hover text-text-secondary hover:text-text-primary'
                  } ${isDragging && draggedPanel === 'settings' ? 'opacity-50 scale-110' : ''}`}
                  title={!dockedPanels.has('settings') ? "Game Settings - Click to open or drag to dock" : "Game Settings - Docked (drag to undock)"}
                >
                  <span className="text-xl">⚙️</span>
                </button>
                
                {/* Stats/Analytics */}
                <button
                  draggable
                  onDragStart={(e) => handleDragStart(e, 'stats')}
                  onDragEnd={handleDragEnd}
                  onClick={() => !dockedPanels.has('stats') ? togglePanel('stats') : null}
                  className={`p-3 rounded-lg transition-all duration-200 transform hover:scale-110 active:scale-95 cursor-grab active:cursor-grabbing ${
                    (!dockedPanels.has('stats') && openPanels.stats) || dockedPanels.has('stats')
                      ? 'bg-accent-primary text-white shadow-lg shadow-accent-primary/30' 
                      : 'bg-bg-card hover:bg-bg-hover text-text-secondary hover:text-text-primary'
                  } ${isDragging && draggedPanel === 'stats' ? 'opacity-50 scale-110' : ''}`}
                  title={!dockedPanels.has('stats') ? "Game Statistics - Click to open or drag to dock" : "Game Statistics - Docked (drag to undock)"}
                >
                  <span className="text-xl">📊</span>
                </button>
                
                {/* Favorite/Bookmark */}
                <button
                  draggable
                  onDragStart={(e) => handleDragStart(e, 'favorites')}
                  onDragEnd={handleDragEnd}
                  onClick={() => !dockedPanels.has('favorites') ? togglePanel('favorites') : null}
                  className={`p-3 rounded-lg transition-all duration-200 transform hover:scale-110 active:scale-95 cursor-grab active:cursor-grabbing ${
                    (!dockedPanels.has('favorites') && openPanels.favorites) || dockedPanels.has('favorites')
                      ? 'bg-accent-primary text-white shadow-lg shadow-accent-primary/30' 
                      : 'bg-bg-card hover:bg-bg-hover text-text-secondary hover:text-text-primary'
                  } ${isDragging && draggedPanel === 'favorites' ? 'opacity-50 scale-110' : ''}`}
                  title={!dockedPanels.has('favorites') ? "Favorites - Click to open or drag to dock" : "Favorites - Docked (drag to undock)"}
                >
                  <span className="text-xl">⭐</span>
                </button>
              </div>
              
            </div>
          </div>

          {/* 🔥 DROP ZONE & DOCKED DASHBOARD - INDIVIDUAL DOCKING 🔥 */}
          {(isDragging || dockedPanels.size > 0) && (
            <div className="max-w-7xl mx-auto px-6 py-4">
              {/* Drop Zone */}
              {isDragging && (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`
                    mb-6 p-8 border-2 border-dashed rounded-xl transition-all duration-300 text-center
                    ${isOverDropZone 
                      ? 'border-accent-primary bg-accent-primary/10 scale-105' 
                      : 'border-border/50 bg-bg-elevated/30'
                    }
                  `}
                >
                  <div className={`text-4xl mb-2 transition-all duration-300 ${isOverDropZone ? 'animate-bounce' : ''}`}>
                    📋
                                </div>
                  <h3 className="text-xl font-bold text-text-primary font-audiowide mb-2">
                    {isOverDropZone ? '🔥 DROP TO DOCK!' : '📥 Dashboard Dock Zone'}
                  </h3>
                  <p className="text-text-secondary font-inter">
                    {isOverDropZone 
                      ? 'Release to dock this panel to your dashboard!' 
                      : 'Drag panel icons here to dock them individually'
                    }
                  </p>
                  {isOverDropZone && (
                    <div className="mt-4 flex justify-center">
                      <div className="flex items-center gap-2 px-4 py-2 bg-accent-primary/20 rounded-lg border border-accent-primary/30">
                        <span className="text-accent-primary font-audiowide text-sm">⚡ DOCKING PANEL</span>
                              </div>
                            </div>
                  )}
                </div>
              )}
                            
              {/* Docked Dashboard */}
              {dockedPanels.size > 0 && (
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                            <div>
                      <h2 className="text-2xl font-bold text-text-primary font-audiowide mb-2">🔥 Command Dashboard</h2>
                      <p className="text-text-secondary font-inter">Your docked panels - click on each section to interact</p>
                            </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 px-3 py-1 bg-accent-primary/10 rounded-lg border border-accent-primary/20">
                        <span className="text-accent-primary font-audiowide text-sm">📋 {dockedPanels.size} PANELS DOCKED</span>
                  </div>
                      <button
                        onClick={handleUndockAll}
                        className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors font-audiowide text-sm"
                      >
                        📤 UNDOCK ALL
                      </button>
                    </div>
                  </div>

                                     {/* Docked Panels Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                      
                      {/* Game Overview Panel */}
                      {dockedPanels.has('overview') && (
                        <div className="bg-bg-elevated border border-border rounded-xl overflow-hidden hover:border-accent-primary/30 transition-colors relative">
                          <div className="flex items-center justify-between p-4 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">🎮</span>
                              <h3 className="text-lg font-bold text-text-primary font-audiowide">Game Overview</h3>
                            </div>
                            <button
                              draggable
                              onDragStart={(e) => {
                                handleDragStart(e, 'overview');
                                handleUndockPanel('overview');
                              }}
                              onDragEnd={handleDragEnd}
                              onClick={() => handleUndockPanel('overview')}
                              className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors cursor-grab active:cursor-grabbing"
                              title="Click to undock or drag to move as floating panel"
                            >
                              📤
                            </button>
                          </div>
                          <div 
                            className="px-4 pb-4 overflow-y-auto"
                            style={{ height: `${dockedPanelHeights.overview - 80}px` }}
                          >
                            <div className="bg-bg-card rounded-lg p-3">
                              <GameOverviewPanel />
                            </div>
                          </div>
                          {/* Resize Handle */}
                          <div
                            className={`absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-accent-primary/20 transition-colors group ${resizingPanel === 'overview' ? 'bg-accent-primary/30' : ''}`}
                            onMouseDown={(e) => handleResizeStart(e, 'overview')}
                            title="Drag to resize panel"
                          >
                            <div className="absolute inset-x-0 bottom-0 h-1 bg-border group-hover:bg-accent-primary/50 transition-colors"></div>
                </div>
              </div>
            )}

                      {/* Chat Panel */}
                      {dockedPanels.has('chat') && (
                        <div className="bg-bg-elevated border border-border rounded-xl overflow-hidden hover:border-accent-primary/30 transition-colors relative">
                          <div className="flex items-center justify-between p-4 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">💬</span>
                              <h3 className="text-lg font-bold text-text-primary font-audiowide">Live Chat</h3>
                            </div>
                            <button
                              draggable
                              onDragStart={(e) => {
                                handleDragStart(e, 'chat');
                                handleUndockPanel('chat');
                              }}
                              onDragEnd={handleDragEnd}
                              onClick={() => handleUndockPanel('chat')}
                              className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors cursor-grab active:cursor-grabbing"
                              title="Click to undock or drag to move as floating panel"
                            >
                              📤
                            </button>
                          </div>
                          <div 
                            className="px-4 pb-4 overflow-y-auto"
                            style={{ height: `${dockedPanelHeights.chat - 80}px` }}
                          >
                            <div className="bg-bg-card rounded-lg p-3 h-full overflow-hidden">
                              <ChatPanelContent />
                            </div>
                          </div>
                          {/* Resize Handle */}
                          <div
                            className={`absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-accent-primary/20 transition-colors group ${resizingPanel === 'chat' ? 'bg-accent-primary/30' : ''}`}
                            onMouseDown={(e) => handleResizeStart(e, 'chat')}
                            title="Drag to resize panel"
                          >
                            <div className="absolute inset-x-0 bottom-0 h-1 bg-border group-hover:bg-accent-primary/50 transition-colors"></div>
                          </div>
                      </div>
                    )}
                    
                      {/* Settings Panel */}
                      {dockedPanels.has('settings') && (
                        <div className="bg-bg-elevated border border-border rounded-xl overflow-hidden hover:border-accent-primary/30 transition-colors relative">
                          <div className="flex items-center justify-between p-4 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">⚙️</span>
                              <h3 className="text-lg font-bold text-text-primary font-audiowide">Game Settings</h3>
                          </div>
                            <button
                              draggable
                              onDragStart={(e) => {
                                handleDragStart(e, 'settings');
                                handleUndockPanel('settings');
                              }}
                              onDragEnd={handleDragEnd}
                              onClick={() => handleUndockPanel('settings')}
                              className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors cursor-grab active:cursor-grabbing"
                              title="Click to undock or drag to move as floating panel"
                            >
                              📤
                            </button>
                            </div>
                          <div 
                            className="px-4 pb-4 overflow-y-auto"
                            style={{ height: `${dockedPanelHeights.settings - 80}px` }}
                          >
                            <div className="bg-bg-card rounded-lg p-3">
                              <SettingsPanel />
                  </div>
                </div>
                          {/* Resize Handle */}
                          <div
                            className={`absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-accent-primary/20 transition-colors group ${resizingPanel === 'settings' ? 'bg-accent-primary/30' : ''}`}
                            onMouseDown={(e) => handleResizeStart(e, 'settings')}
                            title="Drag to resize panel"
                          >
                            <div className="absolute inset-x-0 bottom-0 h-1 bg-border group-hover:bg-accent-primary/50 transition-colors"></div>
                </div>
              </div>
            )}

                      {/* Stats Panel */}
                      {dockedPanels.has('stats') && (
                        <div className="bg-bg-elevated border border-border rounded-xl overflow-hidden hover:border-accent-primary/30 transition-colors relative">
                          <div className="flex items-center justify-between p-4 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">📊</span>
                              <h3 className="text-lg font-bold text-text-primary font-audiowide">Game Statistics</h3>
                            </div>
                            <button
                              draggable
                              onDragStart={(e) => {
                                handleDragStart(e, 'stats');
                                handleUndockPanel('stats');
                              }}
                              onDragEnd={handleDragEnd}
                              onClick={() => handleUndockPanel('stats')}
                              className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors cursor-grab active:cursor-grabbing"
                              title="Click to undock or drag to move as floating panel"
                            >
                              📤
                            </button>
                          </div>
                          <div 
                            className="px-4 pb-4 overflow-y-auto"
                            style={{ height: `${dockedPanelHeights.stats - 80}px` }}
                          >
                            <div className="bg-bg-card rounded-lg p-3">
                              <StatsPanel />
                            </div>
                          </div>
                          {/* Resize Handle */}
                          <div
                            className={`absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-accent-primary/20 transition-colors group ${resizingPanel === 'stats' ? 'bg-accent-primary/30' : ''}`}
                            onMouseDown={(e) => handleResizeStart(e, 'stats')}
                            title="Drag to resize panel"
                          >
                            <div className="absolute inset-x-0 bottom-0 h-1 bg-border group-hover:bg-accent-primary/50 transition-colors"></div>
                          </div>
                        </div>
                      )}

                      {/* Favorites Panel */}
                      {dockedPanels.has('favorites') && (
                        <div className="bg-bg-elevated border border-border rounded-xl overflow-hidden hover:border-accent-primary/30 transition-colors relative">
                          <div className="flex items-center justify-between p-4 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">⭐</span>
                              <h3 className="text-lg font-bold text-text-primary font-audiowide">Favorites & Bookmarks</h3>
                            </div>
                            <button
                              draggable
                              onDragStart={(e) => {
                                handleDragStart(e, 'favorites');
                                handleUndockPanel('favorites');
                              }}
                              onDragEnd={handleDragEnd}
                              onClick={() => handleUndockPanel('favorites')}
                              className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors cursor-grab active:cursor-grabbing"
                              title="Click to undock or drag to move as floating panel"
                            >
                              📤
                            </button>
                          </div>
                          <div 
                            className="px-4 pb-4 overflow-y-auto"
                            style={{ height: `${dockedPanelHeights.favorites - 80}px` }}
                          >
                            <div className="bg-bg-card rounded-lg p-3">
                              <div className="space-y-4">
                                <div className="bg-bg-main rounded-lg p-3">
                                  <h4 className="font-semibold text-text-primary mb-2 text-sm">Current Match</h4>
                                  <div className="space-y-2 text-xs">
                                    <div className="flex justify-between">
                                      <span className="text-text-secondary">Your Score:</span>
                                      <span className="text-accent-primary font-bold">
                        {user?.walletAddress === currentMatch?.player1?.wallet 
                                ? (serverGameState?.player1Score || 0)
                                : (serverGameState?.player2Score || 0)
                        }
                                      </span>
                      </div>
                                    <div className="flex justify-between">
                                      <span className="text-text-secondary">Opponent Score:</span>
                                      <span className="text-red-400 font-bold">
                        {user?.walletAddress === currentMatch?.player1?.wallet 
                                ? (serverGameState?.player2Score || 0)
                                : (serverGameState?.player1Score || 0)
                        }
                                      </span>
                      </div>
                                    <div className="flex justify-between">
                                      <span className="text-text-secondary">Multiplier:</span>
                                      <span className="text-green-400 font-bold">{currentMultiplier.toFixed(2)}x</span>
                    </div>
                  </div>
                </div>
                                
                                <div className="bg-bg-main rounded-lg p-3">
                                  <h4 className="font-semibold text-text-primary mb-2 text-sm">Quick Actions</h4>
                                  <div className="space-y-2">
                                    <button className="w-full text-left p-2 bg-bg-card hover:bg-bg-hover rounded transition-colors text-sm">
                                      Bookmark Strategy
                                    </button>
                                    <button className="w-full text-left p-2 bg-bg-card hover:bg-bg-hover rounded transition-colors text-sm">
                                      Save Game State
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          {/* Resize Handle */}
                          <div
                            className={`absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-accent-primary/20 transition-colors group ${resizingPanel === 'favorites' ? 'bg-accent-primary/30' : ''}`}
                            onMouseDown={(e) => handleResizeStart(e, 'favorites')}
                            title="Drag to resize panel"
                          >
                            <div className="absolute inset-x-0 bottom-0 h-1 bg-border group-hover:bg-accent-primary/50 transition-colors"></div>
                </div>
              </div>
            )}
                    
                    </div>
                  </div>
                )}
                  </div>
                )}
                
            {/* Recent Crash Wins - Game Specific */}
            <div className="max-w-7xl mx-auto px-6 py-8">
              <div className="mb-4">
                <h2 className="text-2xl font-bold text-text-primary font-audiowide mb-2">🚀 Recent Crash Victories</h2>
                <p className="text-text-secondary font-inter">Live feed of recent Crash game wins</p>
              </div>
              <RecentWins gameFilter="crash" />
          </div>
        </main>
      </div>

      {/* Victory Card Modal */}
      {showPnLCard && gameResult && user && (
        <PnLCardModal
          isOpen={showPnLCard}
          onClose={() => setShowPnLCard(false)}
          game="CRASH"
          result={(() => {
            const userWallet = publicKey?.toString() || user?.walletAddress;
            const playerWonMatch = gameResult.matchWinner === userWallet;
            return playerWonMatch ? 'WIN' : 'LOSS';
          })()}
          pnlAmount={(() => {
            const userWallet = publicKey?.toString() || user?.walletAddress;
            const playerWonMatch = gameResult.matchWinner === userWallet;
            return playerWonMatch ? 
              (wagerAmount * 2 * 0.935) - wagerAmount : // Net profit after fees
              -wagerAmount; // Loss
          })()}
          pnlPercentage={(() => {
            const userWallet = publicKey?.toString() || user?.walletAddress;
            const playerWonMatch = gameResult.matchWinner === userWallet;
            return playerWonMatch ? 100 : -100; // 100% profit before fees for wins, -100% for losses
          })()}
          wagerAmount={wagerAmount}
          finalAmount={(() => {
            const userWallet = publicKey?.toString() || user?.walletAddress;
            const playerWonMatch = gameResult.matchWinner === userWallet;
            return playerWonMatch ? 
              (wagerAmount * 2 * 0.935) : // Total after fees
              0; // Loss = 0
          })()}
          username={user?.username}
          walletAddress={user?.walletAddress || user?.id || 'Unknown'}
          userAvatar={user?.avatar}
          gameSpecific={{
            finalScore: `${gameResult.gameState?.player1Score || 0}-${gameResult.gameState?.player2Score || 0}`,
            totalRounds: gameResult.totalRounds || 1,
            winRate: gameResult.totalRounds > 0 
              ? ((gameResult.gameState?.player1Score || 0) / ((gameResult.gameState?.player1Score || 0) + (gameResult.gameState?.player2Score || 0))) * 100 
              : 0,
            multiplier: backendCrashMultiplier || crashMultiplier
          }}
          baseImageUrl="/pnl/pnlcard.png"
        />
      )}

      {/* CSS animations for crash background */}
      <style jsx>{`
        @keyframes crashBackgroundFloat {
          0%, 100% { 
            transform: scale(1) rotate(0deg); 
            opacity: 0.6; 
          }
          50% { 
            transform: scale(1.02) rotate(0.5deg); 
            opacity: 0.8; 
          }
        }

        @keyframes crashBackgroundShift {
          0% { 
            background-position: 0% 0%; 
            filter: hue-rotate(0deg); 
          }
          25% { 
            background-position: 100% 0%; 
            filter: hue-rotate(5deg); 
          }
          50% { 
            background-position: 100% 100%; 
            filter: hue-rotate(10deg); 
          }
          75% { 
            background-position: 0% 100%; 
            filter: hue-rotate(5deg); 
          }
          100% { 
            background-position: 0% 0%; 
            filter: hue-rotate(0deg); 
          }
        }
      `}</style>
    </div>
  );
} 