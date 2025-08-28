'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePV3 } from '@/hooks/usePV3';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import PageHeader from '@/components/PageHeader';
import Avatar from '@/components/Avatar';
import { matchService } from '@/services/matchService';
import { socketService } from '@/services/socketService';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import RPSRevealAnimation, { CompactResultDisplay } from '@/components/games/rps/RPSRevealAnimation';
import RPSChoice3D from '@/components/games/rps/RPSChoice3D';
import RPSQuickMatch from '@/components/games/rps/RPSQuickMatch';
import ModelDebugger from '@/components/games/rps/ModelDebugger';
import ChatPanel from '@/components/ChatPanel';
import { audioSprite } from '@/lib/audioSprite';
import FloatingPanel from '@/components/FloatingPanel';
import PnLCardModal from '@/components/PnLCardModal';
import RecentWins from '@/components/RecentWins';

type RPSChoice = 'rock' | 'paper' | 'scissors';
type GamePhase = 'lobby' | 'creating' | 'waiting' | 'joining' | 'playing' | 'preparing-animation' | 'revealing' | 'round-complete' | 'finished' | 'payout-complete';

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

interface RPSResult {
  currentRound: {
    roundNumber: number;
    playerChoice: RPSChoice;
    opponentChoice: RPSChoice;
    result: RPSChoice | null; // Winner's choice or null for draw
    winner: 'player' | 'opponent' | null;
    timestamp: number;
  };
  playerScore: number;
  opponentScore: number;
  matchComplete: boolean;
  matchWinner: 'player' | 'opponent' | null;
  totalRounds: number;
  timestamp: number;
}

export default function RPSPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { connected, publicKey, formatSOL, vaultBalance, loading } = usePV3();
  
  // Check if user is authenticated
  const isAuthenticated = !!user;
  const hasVaultFunds = vaultBalance > 0;
  
  const [error, setError] = useState<string | null>(null);
  
  // 🚀 ROBUST IMPROVEMENT: Audio effects using optimized sprite system
  const playSound = (soundName: string) => {
    audioSprite.play(soundName);
  };
  
  // Game state
  const [gamePhase, setGamePhase] = useState<GamePhase>('lobby');
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);
  const [opponent, setOpponent] = useState<Opponent | null>(null);
  const [gameResult, setGameResult] = useState<RPSResult | null>(null);
  
  // Round state
  const [playerChoice, setPlayerChoice] = useState<RPSChoice | null>(null);
  const [opponentChoice, setOpponentChoice] = useState<RPSChoice | null>(null);
  const [opponentHasChosen, setOpponentHasChosen] = useState(false);
  const [bothPlayersReady, setBothPlayersReady] = useState(false);
  const [roundResult, setRoundResult] = useState<any>(null);
  const [isRevealing, setIsRevealing] = useState(false);
  
  // Score state - Track previous scores to prevent spoilers during reveal
  const [previousScores, setPreviousScores] = useState<{playerScore: number, opponentScore: number} | null>(null);
  
  // UI state
  const [gameLoading, setGameLoading] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [availableMatches, setAvailableMatches] = useState<Match[]>([]);
  const [wagerAmount, setWagerAmount] = useState(0.1);

  // Payout state
  const [payoutStatus, setPayoutStatus] = useState<'pending' | 'completed' | 'failed' | null>(null);
  const [payoutData, setPayoutData] = useState<any>(null);

  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // 🚀 ROBUST IMPROVEMENT: Fullscreen mode state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 🚀 ROBUST IMPROVEMENT: Floating panel states
  const [openPanels, setOpenPanels] = useState({
    overview: false,
    chat: false,
    settings: false,
    stats: false,
    favorites: false,
    recentwins: false
  });

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
    favorites: 260,
    recentwins: 350
  });
  const [resizingPanel, setResizingPanel] = useState<string | null>(null);

  // 🚀 GAMBLING PSYCHOLOGY: Rematch and engagement state
  const [showMatchDetails, setShowMatchDetails] = useState(false);
  const [rematchLoading, setRematchLoading] = useState(false);
  const [pendingRematchChallenge, setPendingRematchChallenge] = useState<{
    type: 'standard' | '2x_stake';
    challengerId: string;
    wager: number;
  } | null>(null);

  // 🚀 PnL CARD: Modal state for sharing victory/loss cards
  const [showPnLCard, setShowPnLCard] = useState(false);

  // 🚀 ROBUST IMPROVEMENT: Panel management functions
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

  // Drag & Drop Handlers
  const handleDragStart = useCallback((e: React.DragEvent, panelId: string) => {
    e.dataTransfer.setData('text/plain', panelId);
    setIsDragging(true);
    setDraggedPanel(panelId);
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
      // Add panel to docked set
      setDockedPanels(prev => new Set([...prev, panelId]));
      
      // Close floating panel since it's now docked
      setOpenPanels(prev => ({ ...prev, [panelId as keyof typeof openPanels]: false }));
      
      playSound('success');
      console.log(`🔥 Panel ${panelId} docked to dashboard!`);
    }
    
    setIsOverDropZone(false);
    setIsDragging(false);
    setDraggedPanel(null);
  }, []);

  const handleUndockPanel = useCallback((panelId: string) => {
    setDockedPanels(prev => {
      const newSet = new Set(prev);
      newSet.delete(panelId);
      return newSet;
    });
    playSound('click');
    console.log(`📤 Panel ${panelId} undocked from dashboard!`);
  }, []);

  const handleUndockAll = useCallback(() => {
    setDockedPanels(new Set());
    playSound('click');
  }, []);

  // Panel resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent, panelId: string) => {
    e.preventDefault();
    setResizingPanel(panelId);
    
    const startY = e.clientY;
    const startHeight = dockedPanelHeights[panelId];
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const newHeight = Math.max(150, Math.min(600, startHeight + deltaY));
      
      setDockedPanelHeights(prev => ({
        ...prev,
        [panelId]: newHeight
      }));
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

  // Get choice emoji
  const getChoiceEmoji = (choice: RPSChoice): string => {
    switch (choice) {
      case 'rock': return '🪨';
      case 'paper': return '📄';
      case 'scissors': return '✂️';
      default: return '❓';
    }
  };

  // Calculate round result
  const calculateResult = (player: RPSChoice, opponent: RPSChoice): 'win' | 'lose' | 'draw' => {
    if (player === opponent) return 'draw';
    
    if (
      (player === 'rock' && opponent === 'scissors') ||
      (player === 'paper' && opponent === 'rock') ||
      (player === 'scissors' && opponent === 'paper')
    ) {
      return 'win';
    }
    
    return 'lose';
  };

  // Handle socket errors
  const handleSocketError = useCallback((error: any) => {
    console.error('🚨 Socket error:', error);
    setError(`Connection error: ${error.message || 'Unknown error'}`);
    playSound('error'); // 🚀 Audio feedback
  }, []);

  // Reset game state
  const resetGameState = useCallback(() => {
    setGameResult(null);
    setPlayerChoice(null);
    setOpponentChoice(null);
    setOpponentHasChosen(false);
    setBothPlayersReady(false);
    setRoundResult(null);
    setIsRevealing(false);
    setCurrentMatch(null);
    setOpponent(null);
    setPreviousScores(null); // Clear previous scores to prevent stale data
    
    console.log('🔄 Reset all game state');
  }, []);

  // Event handlers
  const handleRPSResult = useCallback((data: any) => {
    console.log('🎯 RPS result received:', data);
    console.log('🔍 Player1 result:', data.player1Result);
    console.log('🔍 Player2 result:', data.player2Result);
    console.log('🔍 Game state:', data.gameState);
    console.log('🎬 Animation start time:', data.animationStartTime);
    
    try {
      // 🔧 FIX: Extract server data with both player results
      const { gameState, player1Result, player2Result, animationStartTime } = data;
      
      // Validate required data structure
      if (!gameState || !player1Result || !player2Result || !animationStartTime) {
        console.error('❌ Invalid RPS result data:', data);
        setError('Invalid game result received from server');
        setGamePhase('lobby');
        return;
      }
      
      // Get user identity
      const userWallet = user?.walletAddress || user?.id || '';
      const isPlayer1 = gameState.player1 === userWallet;
      
      // 🔧 CRITICAL FIX: Pick the correct result based on which player the user is
      const playerResult = isPlayer1 ? player1Result : player2Result;
      const roundResult = playerResult.roundResult;
      
      console.log(`🎯 User is ${isPlayer1 ? 'Player 1' : 'Player 2'}`);
      console.log(`🎯 Round winner from their perspective: ${roundResult.winner}`);
      
      // Find the completed round
      const targetRoundNumber = gameState.matchComplete ? 
        gameState.currentRound - 1 : // For completed matches, look at the last completed round
        gameState.currentRound - 1;  // For ongoing matches, also look at the last completed round
        
      console.log(`🔍 Looking for round ${targetRoundNumber} in rounds:`, gameState.rounds);
        
      const completedRound = gameState.rounds.find((round: any) => 
        round.roundNumber === targetRoundNumber
      );
      
      // If not found, try the latest round as fallback
      const fallbackRound = gameState.rounds[gameState.rounds.length - 1];
      const roundToUse = completedRound || fallbackRound;
      
      // Add null check for completedRound
      if (!roundToUse) {
        console.error('❌ Completed round not found in game state:', gameState);
        setError('Game state error - round data missing');
        setGamePhase('lobby');
        return;
      }
      
      // Extract opponent choice
      const opponentChoice = isPlayer1 ? roundToUse.player2Choice : roundToUse.player1Choice;
      setOpponentChoice(opponentChoice);
      
      // Extract player choice
      const playerChoice = isPlayer1 ? roundToUse.player1Choice : roundToUse.player2Choice;
      
      console.log('🎮 CHOICE EXTRACTION DEBUG:');
      console.log('   - User wallet:', userWallet);
      console.log('   - Player1 wallet:', gameState.player1);
      console.log('   - Player2 wallet:', gameState.player2);
      console.log('   - Is Player1?:', isPlayer1);
      console.log('   - Round data:', roundToUse);
      console.log('   - Round player1Choice:', roundToUse.player1Choice);
      console.log('   - Round player2Choice:', roundToUse.player2Choice);
      console.log('   - Extracted playerChoice:', playerChoice);
      console.log('   - Extracted opponentChoice:', opponentChoice);
      
      // 🔧 FIX: Create gameResult object using the personalized player result
      const gameResult: RPSResult = {
        currentRound: {
          roundNumber: roundToUse.roundNumber,
          playerChoice: playerChoice,
          opponentChoice: opponentChoice,
          result: roundResult.result,
          winner: roundResult.winner, // This is already personalized ('player', 'opponent', or null)
          timestamp: roundToUse.timestamp
        },
        // ✅ CRITICAL FIX: Use the personalized scores from the selected player result
        playerScore: playerResult.playerScore,
        opponentScore: playerResult.opponentScore,
        matchComplete: gameState.matchComplete,
        matchWinner: playerResult.matchWinner, // This is also personalized ('player', 'opponent', or null)
        totalRounds: gameState.rounds.length,
          timestamp: Date.now()
      };
      
      console.log('🎯 Created gameResult with personalized data:');
      console.log('   - Round winner:', gameResult.currentRound.winner);
      console.log('   - Player score:', gameResult.playerScore);
      console.log('   - Opponent score:', gameResult.opponentScore);
      console.log('   - Match winner:', gameResult.matchWinner);
      
      // 🎯 CRITICAL: Store previous scores BEFORE updating gameResult to prevent spoilers
      setGameResult((currentGameResult) => {
        if (currentGameResult) {
          setPreviousScores({
            playerScore: currentGameResult.playerScore,
            opponentScore: currentGameResult.opponentScore
          });
          console.log('💾 Stored previous scores for reveal:', currentGameResult.playerScore, '-', currentGameResult.opponentScore);
        }
        return gameResult; // Return the new gameResult
      });
      
      // Set choices for reveal animation
      setPlayerChoice(gameResult.currentRound.playerChoice);
      setOpponentChoice(gameResult.currentRound.opponentChoice);
      
      // 🎬 SYNC FIX: Wait for synchronized animation start time
      const currentTime = Date.now();
      const timeToWait = Math.max(0, animationStartTime - currentTime);
      
      console.log(`🎬 Current time: ${currentTime}, Animation start: ${animationStartTime}, Waiting: ${timeToWait}ms`);
      
      if (timeToWait > 0) {
        // Show "Preparing animation..." state while waiting
        setGamePhase('preparing-animation');
        
        setTimeout(() => {
          console.log('🎬 Starting synchronized animation now!');
          setIsRevealing(true);
          setGamePhase('revealing');
        }, timeToWait);
      } else {
        // Start immediately if we're past the start time
        console.log('🎬 Starting animation immediately (past sync time)');
        setIsRevealing(true);
        setGamePhase('revealing');
      }
      
    } catch (error) {
      console.error('❌ Error processing RPS result:', error);
      setError('Failed to process game result');
      setGamePhase('lobby');
      
      // Reset all game state
      setGameResult(null);
      setCurrentMatch(null);
      setOpponent(null);
      setPlayerChoice(null);
      setOpponentChoice(null);
      setBothPlayersReady(false);
      setRoundResult(null);
      setPreviousScores(null); // Clear previous scores on error
    }
  }, [user]);

  // Handle reveal animation completion
  const handleRevealComplete = useCallback(() => {
    console.log('🎬 Reveal animation completed');
    
    // 🎯 CRITICAL: Clear previous scores so current scores are now displayed
    setPreviousScores(null);
    console.log('🗑️ Cleared previous scores - now showing current scores');
    
    if (gameResult) {
      // 🚀 Audio feedback for round results
      if (gameResult.currentRound.winner === 'player') {
        playSound('win');
      } else if (gameResult.currentRound.winner === 'opponent') {
        playSound('lose');
      } else {
        playSound('click'); // Draw sound
      }
      
      if (gameResult.matchComplete) {
        setGamePhase('finished');
        
        // 🚀 Audio feedback for match completion
        if (gameResult.matchWinner === 'player') {
          playSound('bigWin');
        } else {
          playSound('lose');
        }
        
        // 🎯 CRITICAL FIX: RPS has AUTOMATIC payout (like crash games)
        // Do NOT call confirmPayoutReady - the backend already processed payout automatically
        console.log('🎯 RPS match complete - waiting for automatic payout result');
      } else {
        setGamePhase('round-complete');
      }
    }
    
    setIsRevealing(false);
  }, [gameResult]);

  const handleMatchState = useCallback((data: { match: Match; connectedPlayers: number }) => {
    console.log('Match state received:', data);
    setCurrentMatch(data.match);
    
    if (data.match.status === 'in_progress' && data.connectedPlayers === 2) {
      const userIdentifier = user?.walletAddress || user?.id;
      setOpponent(data.match.player1.wallet === userIdentifier ? data.match.player2! : data.match.player1);
      setGamePhase('playing');
    }
  }, [user]);

  const handlePlayerJoined = useCallback((data: { playerId: string; matchId: string }) => {
    console.log('Player joined:', data);
    if (currentMatch?.id === data.matchId) {
      loadAvailableMatches();
    }
  }, [currentMatch?.id]);

  const handleOpponentChoiceMade = useCallback((data: any) => {
    console.log('🎯 Opponent choice made (not revealed):', data.matchId);
    // Don't reveal the opponent's choice yet, just mark that they've chosen
    setOpponentHasChosen(true);
  }, []);

  // Payout event handlers
  const handlePayoutComplete = useCallback((data: any) => {
    console.log('✅ RPS Payout completed:', data);
    console.log('🎯 Transitioning to payout-complete phase');
    console.log('🎯 Match ID:', currentMatch?.id);
    console.log('🎯 Event data:', JSON.stringify(data, null, 2));
    
    // Set payout status and transition to payout-complete phase
    setPayoutStatus('completed');
    setPayoutData(data);
    setGamePhase('payout-complete');
    
    // Clear any existing errors
    setError(null);
  }, [currentMatch?.id]);

  const handlePayoutFailed = useCallback((data: any) => {
    console.log('❌ RPS Payout failed:', data);
    console.log('🎯 Transitioning to payout-complete phase with failed status');
    console.log('🎯 Match ID:', currentMatch?.id);
    console.log('🎯 Event data:', JSON.stringify(data, null, 2));
    
    // Set payout status and show error
    setPayoutStatus('failed');
    setPayoutData(data);
    setError(`Payout failed: ${data.error || data.message || 'Unknown error'}`);
    
    // Still show end screen but with error state
    setGamePhase('payout-complete');
  }, [currentMatch?.id]);

  // Initialize socket connection
  useEffect(() => {
    if (!isAuthenticated) return;

    const initSocket = async () => {
      try {
        console.log('🔌 Initializing socket connection...');
          await socketService.connect();
        setSocketConnected(true);
        console.log('✅ Socket connected successfully');

        // Set up RPS event listeners (optimized - no dual listeners)
        socketService.on('rps_result', handleRPSResult);
        socketService.on('match_state', (data: unknown) => {
          handleMatchState(data as { match: Match; connectedPlayers: number });
        });
        socketService.on('player_joined', (data: unknown) => {
          handlePlayerJoined(data as { playerId: string; matchId: string });
        });
        socketService.on('rps_opponent_choice', handleOpponentChoiceMade);
        socketService.on('error', handleSocketError);
        
        // Add payout event listeners
        socketService.on('payout_complete', handlePayoutComplete);
        socketService.on('payout_failed', handlePayoutFailed);

      // 🚀 GAMBLING PSYCHOLOGY: Rematch event listeners (TODO: Implement in socketService)
      // socketService.on('rematch_challenge', handleRematchChallenge);
      // socketService.on('rematch_accepted', handleRematchAccepted);
      // socketService.on('rematch_declined', handleRematchDeclined);

      } catch (error) {
        console.error('Failed to connect to game server:', error);
        setError('Failed to connect to game server. Please refresh the page.');
        setSocketConnected(false);
      }
    };

    initSocket();

    return () => {
      // Clean up listeners
      socketService.off('rps_result');
      socketService.off('match_state');
      socketService.off('player_joined');
      socketService.off('rps_opponent_choice');
      socketService.off('error');
      socketService.off('payout_complete');
      socketService.off('payout_failed');
      
      // Cleanup rematch event listeners
      // socketService.off('rematch_challenge');
      // socketService.off('rematch_accepted');
      // socketService.off('rematch_declined');
    };
  }, [isAuthenticated, handleRPSResult, handleMatchState, handlePlayerJoined, handleOpponentChoiceMade, handleSocketError, handlePayoutComplete, handlePayoutFailed]);

  // Load available matches
  const loadAvailableMatches = useCallback(async () => {
    try {
      const matches = await matchService.getAvailableRPSMatches();
      setAvailableMatches(matches);
    } catch (error) {
      console.error('Failed to load matches:', error);
    }
  }, []);

  // 🚀 ROBUST IMPROVEMENT: Enhanced match creation with better validation
  const createMatch = useCallback(async () => {
    if (!isAuthenticated || !hasVaultFunds || vaultBalance < wagerAmount * 1000000000) {
      setError('Insufficient vault balance');
      playSound('error');
      return;
    }

    setGamePhase('creating');
    setGameLoading(true);
    setError(null);
    
    try {
      playSound('click'); // Audio feedback for action
      const match = await matchService.createRPSMatch(wagerAmount);
      setCurrentMatch(match);
      setGamePhase('waiting');
      
      socketService.joinMatch(match.id, user!.walletAddress || user!.id);
      playSound('roundStart'); // Audio feedback for match creation
    } catch (error) {
      console.error('Failed to create match:', error);
      setError('Failed to create match. Please try again.');
      playSound('error');
      setGamePhase('lobby');
    } finally {
      setGameLoading(false);
    }
  }, [isAuthenticated, hasVaultFunds, vaultBalance, wagerAmount, user]);

  // 🚀 ROBUST IMPROVEMENT: Enhanced match joining with better error handling
  const joinMatch = useCallback(async (matchId: string) => {
    if (!isAuthenticated) {
      setError('Please log in to join a match');
      playSound('error');
      return;
    }

    setGamePhase('joining');
    setGameLoading(true);
    setError(null);
    
    try {
      playSound('click'); // Audio feedback for action
      const match = await matchService.joinMatch(matchId);
      setCurrentMatch(match);
      
      socketService.joinMatch(match.id, user!.walletAddress || user!.id);
      playSound('roundStart'); // Audio feedback for successful join
    } catch (error) {
      console.error('Failed to join match:', error);
      setError('Failed to join match. Please try again.');
      playSound('error');
      setGamePhase('lobby');
    } finally {
      setGameLoading(false);
    }
  }, [isAuthenticated, user]);

  // Make choice
  const makeChoice = useCallback((choice: RPSChoice) => {
    if (gamePhase !== 'playing' || playerChoice) return;
    
    console.log(`🎯 Player chose: ${choice}`);
    setPlayerChoice(choice);
    playSound('click'); // 🚀 Audio feedback for choice selection
    
    if (currentMatch && socketConnected) {
      console.log(`📡 Sending choice to server: ${choice}`);
      socketService.sendRPSChoice(currentMatch.id, user?.walletAddress || user?.id || '', choice);
    }
  }, [gamePhase, playerChoice, currentMatch, socketConnected, user]);

  // Check when both players are ready
  useEffect(() => {
    if (playerChoice && opponentHasChosen && !bothPlayersReady) {
      console.log('🎯 Both players have made choices - setting ready state');
      setBothPlayersReady(true);
    }
  }, [playerChoice, opponentHasChosen, bothPlayersReady]);

  // Handle transition to reveal animation when both players are ready
  useEffect(() => {
    if (bothPlayersReady && gamePhase === 'playing') {
      console.log('🎯 Both players ready - transitioning to reveal animation');
      // Add a small delay for better UX
      const timer = setTimeout(() => {
        setGamePhase('preparing-animation');
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [bothPlayersReady, gamePhase]);

  // Continue to next round
  const continueToNextRound = useCallback(() => {
    // ✅ FIX: Reset round-specific state but preserve gameResult with scores
    setPlayerChoice(null);
    setOpponentChoice(null);
    setOpponentHasChosen(false);
    setBothPlayersReady(false);
    setRoundResult(null);
    setIsRevealing(false);
    setPreviousScores(null); // Clear previous scores for next round
    setGamePhase('playing');
    
    // ✅ CRITICAL: DO NOT reset gameResult - it contains the current match scores!
    // gameResult should persist between rounds to show correct scores in playing phase
    
    console.log('🔄 Transitioned to next round - preserving scores:', gameResult?.playerScore, '-', gameResult?.opponentScore);
    console.log('🔄 GameResult scores:', gameResult?.playerScore, '-', gameResult?.opponentScore);
  }, [gameResult]);

  // Auto-progression to next round
  useEffect(() => {
    if (gamePhase === 'round-complete' && gameResult && !gameResult.matchComplete) {
      const timer = setTimeout(() => {
        if (gameResult && !gameResult.matchComplete && gamePhase === 'round-complete' && socketConnected) {
          console.log('✅ Auto-progressing to next round');
          continueToNextRound();
        } else if (gameResult && gameResult.matchComplete) {
          console.log('🏁 Match completed during auto-progression timer, transitioning to finished');
          setGamePhase('finished');
        }
      }, 5000); // 5 second delay like coinflip
      
      return () => clearTimeout(timer);
    }
  }, [gamePhase, gameResult, continueToNextRound, socketConnected]);

  // Return to lobby
  const returnToLobby = useCallback(() => {
    setGamePhase('lobby');
    resetGameState();
    loadAvailableMatches();
  }, [resetGameState, loadAvailableMatches]);

  // 🚀 GAMBLING PSYCHOLOGY: Enhanced engagement functions
  const handleInstantRematch = useCallback(async () => {
    if (!opponent || !currentMatch || rematchLoading) return;
    
    setRematchLoading(true);
    playSound('click');
    
    try {
      // TODO: Implement rematch challenge in socketService
      // socketService.sendRematchChallenge(currentMatch.id, opponent.id, 'standard', wagerAmount);
      console.log('Sending standard rematch challenge:', { matchId: currentMatch.id, opponentId: opponent.id, wager: wagerAmount });
      
      // Show waiting state
      setGamePhase('waiting');
      resetGameState();
      
      // Create a notification that challenge was sent
      setError(`Rematch challenge sent to ${opponent.username || opponent.wallet.slice(0, 8)}...`);
      setTimeout(() => setError(null), 3000);
      
    } catch (error) {
      console.error('Failed to send rematch challenge:', error);
      setError('Failed to send rematch challenge');
      playSound('error');
    } finally {
      setRematchLoading(false);
    }
  }, [opponent, currentMatch, rematchLoading, wagerAmount]);

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
      // socketService.sendRematchChallenge(currentMatch.id, opponent.id, '2x_stake', doubleWager);
      console.log('Sending 2x stake rematch challenge:', { matchId: currentMatch.id, opponentId: opponent.id, wager: doubleWager });
      
      // Show waiting state
      setGamePhase('waiting');
      resetGameState();
      
      // Create notification
      setError(`2x Stake challenge (${doubleWager} SOL) sent to ${opponent.username || opponent.wallet.slice(0, 8)}...`);
      setTimeout(() => setError(null), 5000);
      
    } catch (error) {
      console.error('Failed to send 2x stake challenge:', error);
      setError('Failed to send 2x stake challenge');
      playSound('error');
    } finally {
      setRematchLoading(false);
    }
  }, [opponent, currentMatch, rematchLoading, wagerAmount, vaultBalance]);

  const handleQuickMatch = useCallback(() => {
    playSound('click');
    setGamePhase('lobby');
    resetGameState();
    
    // Auto-trigger match creation with same settings
    setTimeout(() => {
      createMatch();
    }, 500);
  }, [resetGameState, createMatch]);

  const handleShareVictory = useCallback(() => {
    if (!gameResult) return;
    
    playSound('click');
    
    // Show PnL card modal instead of basic text sharing
    setShowPnLCard(true);
  }, [gameResult]);

  const handleGeneratePnLCard = useCallback(() => {
    if (!gameResult || !currentMatch) return;
    
    playSound('click');
    
    // Show PnL card modal with trading-style card
    setShowPnLCard(true);
  }, [gameResult, currentMatch]);

  const toggleMatchDetails = useCallback(() => {
    setShowMatchDetails(prev => !prev);
    playSound('click');
  }, []);

  // Load matches on mount
  useEffect(() => {
    if (isAuthenticated && socketConnected) {
      loadAvailableMatches();
    }
  }, [isAuthenticated, socketConnected, loadAvailableMatches]);

  // Auto-transition from finished to payout-complete if no payout event received
  useEffect(() => {
    if (gamePhase === 'finished' && gameResult?.matchComplete) {
      console.log('🎯 Starting payout timeout - waiting for automatic payout result');
      
      // Set a 10-second timeout to transition to payout-complete with unknown status
      // This handles edge cases where payout events might be missed
      const payoutTimeout = setTimeout(() => {
        console.log('⏰ Payout timeout reached - transitioning to payout-complete with unknown status');
        setPayoutStatus('completed'); // Assume success since money usually goes through
        setGamePhase('payout-complete');
      }, 10000); // 10 seconds
      
      return () => {
        clearTimeout(payoutTimeout);
      };
    }
  }, [gamePhase, gameResult?.matchComplete]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-bg-main text-text-primary">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="lg:ml-64 min-h-screen">
          <PageHeader onMenuClick={() => setSidebarOpen(true)} />
          <main className="p-6">
            <div className="max-w-4xl mx-auto text-center py-20">
              <div className="text-8xl mb-8">✂️</div>
              <h1 className="text-4xl font-bold text-text-primary mb-4 font-audiowide uppercase">Rock Paper Scissors</h1>
              <p className="text-lg text-text-secondary mb-8 font-inter">
                Please log in to play Rock Paper Scissors
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
                     backgroundImage: 'url(/rps-game/gamebackground.png)',
                      backgroundSize: '105%',
                     backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat',
                      animation: 'rpsBackgroundFloat 8s ease-in-out infinite alternate, rpsBackgroundShift 12s linear infinite'
                    }}
                  />
                )}
                
                {/* Game Content Container */}
                <div className="h-full flex flex-col relative z-1 bg-black/10 backdrop-blur-[0.5px]">
                  
                  {/* Game Header - Compact with RPS Info */}
                  <div className="flex-shrink-0 px-6 py-4 border-b border-border">
                    <div className="flex items-center justify-between">
                      <div>
                        <h1 className="text-2xl font-bold text-text-primary font-audiowide uppercase">✂️ Rock Paper Scissors</h1>
                        <p className="text-sm text-text-secondary font-inter">First to 3 wins • Classic strategy</p>
                      </div>
                      
                      {/* Round Info - Show during active game and results */}
                      {(gamePhase === 'playing' || gamePhase === 'preparing-animation' || gamePhase === 'revealing' || gamePhase === 'round-complete' || gamePhase === 'finished') && gameResult && (
                        <div className="flex items-center gap-12">
                          <div className="text-center">
                            <p className="text-sm text-text-secondary">You</p>
                            <div className="flex items-center gap-2">
                              {/* Show previous scores during reveal phases to prevent spoilers */}
                              <p className="text-2xl font-bold">
                                {(gamePhase === 'preparing-animation' || gamePhase === 'revealing') && previousScores 
                                  ? previousScores.playerScore 
                                  : gameResult.playerScore}
                              </p>
                              {gamePhase === 'playing' && (
                                <span className="text-lg">
                                  {playerChoice ? '✓' : '⏳'}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-center">
                            {/* Show round result status if available */}
                            {gamePhase === 'round-complete' && gameResult.currentRound ? (
                              <div>
                                {gameResult.currentRound.winner === 'player' ? (
                                  <p className="text-lg font-bold text-green-400">🎉 Round Won</p>
                                ) : gameResult.currentRound.winner === 'opponent' ? (
                                  <p className="text-lg font-bold text-red-400">😞 Round Lost</p>
                                ) : (
                                  <p className="text-lg font-bold text-yellow-400">🤝 Round Tied</p>
                                )}
                                <p className="text-xs text-text-secondary">Round {gameResult.currentRound.roundNumber} Complete</p>
                              </div>
                            ) : gamePhase === 'finished' ? (
                              <div>
                                {gameResult.matchWinner === 'player' ? (
                                  <p className="text-lg font-bold text-green-400">🏆 Match Won</p>
                                ) : (
                                  <p className="text-lg font-bold text-red-400">💔 Match Lost</p>
                                )}
                                <p className="text-xs text-text-secondary">Final Result</p>
                              </div>
                            ) : (
                              <div>
                                <p className="text-lg font-bold">Round {(gameResult.totalRounds || 0) + 1}</p>
                                <p className="text-xs text-text-secondary">First to 3</p>
                              </div>
                            )}
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-text-secondary">Opponent</p>
                            <div className="flex items-center gap-2">
                              {/* Show previous scores during reveal phases to prevent spoilers */}
                              <p className="text-2xl font-bold">
                                {(gamePhase === 'preparing-animation' || gamePhase === 'revealing') && previousScores 
                                  ? previousScores.opponentScore 
                                  : gameResult.opponentScore}
                              </p>
                              {gamePhase === 'playing' && (
                                <span className="text-lg">
                                  {opponentHasChosen ? '✓' : '⏳'}
                                </span>
                              )}
                            </div>
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
                    </div>
                  </div>

                        <div className="mb-6">
                    <div className="text-sm text-text-secondary font-inter">
                      Vault Balance: {formatSOL(vaultBalance)}
                    </div>
                  </div>

                  <button
                    onClick={createMatch}
                          disabled={gameLoading || !socketConnected || vaultBalance < wagerAmount * 1000000000}
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
                              <div className="text-4xl mb-4">✂️</div>
                              <p className="font-inter">No matches available</p>
                              <p className="text-sm font-inter">Create a match to get started!</p>
                      </div>
                    ) : (
                      availableMatches.map((match) => (
                              <div key={match.id} className="bg-bg-card rounded-lg p-4 flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Avatar user={match.player1} size="sm" />
                                  <div className="text-left">
                              <div className="font-audiowide text-text-primary">{match.wager} SOL</div>
                              <div className="text-sm text-text-secondary font-inter">
                                      vs {match.player1.username || match.player1.wallet.slice(0, 8)}...
                              </div>
                            </div>
                          </div>
                          <button
                                  onClick={() => joinMatch(match.id)}
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
                    <RPSQuickMatch 
                      onMatchFound={(matchId) => {
                        // Join existing match
                        joinMatch(matchId);
                      }}
                      onMatchCreated={(match) => {
                        // Handle created match
                        setCurrentMatch(match);
                        setGamePhase('waiting');
                        if (user) {
                          socketService.joinMatch(match.id, user.walletAddress || user.id);
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
                            <div className="text-center space-y-4">
                  <div className="text-6xl mb-4">⏳</div>
                    <h2 className="text-2xl font-bold text-text-primary mb-4 font-audiowide">
                      {gamePhase === 'creating' ? 'Creating Match...' : 'Joining Match...'}
                    </h2>
                    <p className="text-text-secondary font-inter">Please wait...</p>
                  </div>
                )}

                {/* Waiting for Opponent */}
                {gamePhase === 'waiting' && (
                            <div className="text-center space-y-4">
                    <div className="text-6xl mb-4">👥</div>
                    <h2 className="text-2xl font-bold text-text-primary mb-4 font-audiowide">Waiting for Opponent</h2>
                    <p className="text-text-secondary mb-6 font-inter">Share your match or wait for someone to join</p>
                  <button
                    onClick={returnToLobby}
                    className="secondary-button font-audiowide"
                  >
                      Cancel Match
                  </button>
                  </div>
                )}

                {/* Preparing Animation Phase */}
                {gamePhase === 'preparing-animation' && (
                            <div className="text-center space-y-4">
                    <div className="text-6xl mb-4">⏱️</div>
                    <h2 className="text-2xl font-bold text-text-primary mb-4 font-audiowide">Synchronizing...</h2>
                    <p className="text-text-secondary font-inter">Preparing synchronized reveal animation</p>
                    <div className="mt-4">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent-primary"></div>
                </div>
              </div>
            )}

                          {/* Playing Phase - 3D Interface */}
            {gamePhase === 'playing' && (
              <div 
                className="text-center space-y-6"
                style={{ background: 'transparent', backgroundColor: 'transparent' }}
              >
                              <h3 className="text-2xl font-audiowide text-text-primary">Choose Your Weapon</h3>
                      
                <div style={{ background: 'transparent', backgroundColor: 'transparent' }}>
                      <RPSChoice3D
                        onChoice={makeChoice}
                        selectedChoice={playerChoice}
                        disabled={!!playerChoice}
                      />
                </div>

                      {/* Status message when both players are ready */}
                      {bothPlayersReady && (
                        <div className="mt-6">
                          <div className="bg-bg-elevated border border-border rounded-lg px-6 py-4 max-w-md mx-auto">
                            <p className="text-accent-primary font-audiowide text-lg">
                              Both Players Ready!
                            </p>
                            <p className="text-text-secondary text-sm font-inter">
                              Preparing reveal animation...
                          </p>
                          </div>
                        </div>
                      )}
                  </div>
                )}

                {/* Revealing Phase with Beautiful Animation */}
                {gamePhase === 'revealing' && isRevealing && playerChoice && opponentChoice && gameResult && (
                            <div className="flex justify-center rps-game-transparent">
                  <RPSRevealAnimation
                    playerChoice={playerChoice}
                    opponentChoice={opponentChoice}
                    winner={gameResult.currentRound.winner === 'player' ? 'player' : gameResult.currentRound.winner === 'opponent' ? 'opponent' : 'draw'}
                    onAnimationComplete={handleRevealComplete}
                  />
                            </div>
                )}

                          {/* Round Complete Phase - Compact Layout */}
                {gamePhase === 'round-complete' && gameResult && (
                  <div className="text-center space-y-4 rps-game-transparent">
                    {/* 3D Models Display */}
                    <div className="mb-6 rps-game-transparent">
                      <CompactResultDisplay 
                        playerChoice={gameResult.currentRound.playerChoice}
                        opponentChoice={gameResult.currentRound.opponentChoice}
                      />
                    </div>
                    
                    {/* Labels */}
                    <div className="flex items-center justify-center space-x-8">
                      <div className="text-center">
                        <div className="font-audiowide text-text-primary">You</div>
                        <div className="text-sm text-blue-300">{gameResult.currentRound.playerChoice.toUpperCase()}</div>
                      </div>
                      
                      <div className="text-2xl font-audiowide text-accent-primary">VS</div>
                      
                      <div className="text-center">
                        <div className="font-audiowide text-text-primary">Opponent</div>
                        <div className="text-sm text-red-300">{gameResult.currentRound.opponentChoice.toUpperCase()}</div>
                      </div>
                    </div>
                    
                    <div className="text-sm text-text-secondary font-inter">
                      Next round starts in 5 seconds...
                    </div>
                  </div>
                )}

                          {/* Finished Phase - Compact Layout */}
                {gamePhase === 'finished' && gameResult && (
                            <div className="text-center space-y-4 rps-game-transparent">
                    <div className="text-8xl mb-6">
                      {gameResult.matchWinner === 'player' ? '🏆' : '💔'}
                  </div>
                  
                  <div className="mb-6">
                      <div className="text-lg text-text-secondary font-inter">
                        {gameResult.matchWinner === 'player' ? 
                          `+${(wagerAmount * 2 * 0.935).toFixed(3)} SOL` : 
                          `-${wagerAmount} SOL`}
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-center space-y-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-primary"></div>
                      <div className="text-sm text-text-secondary font-inter">
                        Processing payout... Please wait
                      </div>
                    </div>
                  </div>
                )}

                          {/* Payout Complete Phase - Enhanced Layout with Multiple Options */}
                {gamePhase === 'payout-complete' && gameResult && (
                            <div className="text-center space-y-6 rps-game-transparent">
                    <div className="text-8xl mb-4">
                      {payoutStatus === 'completed' ? '💰' : '❌'}
                    </div>
                    
                    <div className="mb-6">
                      <div className="text-2xl font-bold text-text-primary font-audiowide mb-2">
                        {gameResult.matchWinner === 'player' ? '🏆 Victory!' : '💔 Defeat'}
                      </div>
                      <div className="text-lg text-text-secondary font-inter">
                        {gameResult.matchWinner === 'player' ? 
                          `+${(wagerAmount * 2 * 0.935).toFixed(3)} SOL` : 
                          `-${wagerAmount} SOL`}
                      </div>
                      
                      <div className="text-sm text-text-secondary font-inter mt-2">
                        Final Score: {gameResult.playerScore} - {gameResult.opponentScore}
                      </div>
                      
                      {payoutStatus === 'completed' && payoutData?.transactionHash && (
                        <div className="text-sm text-green-400 font-inter mt-2">
                          Transaction: {payoutData.transactionHash.slice(0, 8)}...
                        </div>
                      )}
                  </div>

                    {/* 🚀 PROFESSIONAL BUTTON GRID with Tooltips */}
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl mx-auto">
                      
                      {/* Instant Rematch - Primary CTA */}
                      {opponent && (
                        <div className="relative group">
                          <button
                            onClick={handleInstantRematch}
                            disabled={rematchLoading}
                            className="relative w-full bg-gradient-to-br from-accent-primary via-yellow-400 to-accent-secondary text-black font-bold py-4 px-6 rounded-xl hover:from-yellow-300 hover:via-accent-primary hover:to-yellow-400 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 disabled:opacity-50 disabled:transform-none shadow-lg hover:shadow-2xl shadow-yellow-400/30 border border-yellow-300/50"
                          >
                            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-xl"></div>
                            <div className="relative">
                              {rematchLoading ? (
                                <div className="flex items-center justify-center">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                                  Sending...
                                </div>
                              ) : (
                                <>
                                  <div className="text-lg mb-1">🔥 Instant Rematch</div>
                                  <div className="text-xs opacity-80 font-semibold">{wagerAmount} SOL</div>
                                </>
                              )}
                            </div>
                          </button>
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black/90 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                            Challenge same opponent with same wager
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black/90"></div>
                          </div>
                        </div>
                      )}
                      
                      {/* 2x Stake Rematch - High stakes appeal */}
                      {opponent && vaultBalance >= wagerAmount * 2 * 1000000000 && (
                        <div className="relative group">
                          <button
                            onClick={handle2xStakeRematch}
                            disabled={rematchLoading}
                            className="relative w-full bg-gradient-to-br from-red-600 via-red-500 to-red-600 text-white font-bold py-4 px-6 rounded-xl hover:from-red-500 hover:via-red-400 hover:to-red-500 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 disabled:opacity-50 disabled:transform-none shadow-lg hover:shadow-2xl shadow-red-500/30 border border-red-400/50"
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
                          className="relative w-full bg-gradient-to-br from-blue-600 via-blue-500 to-blue-600 text-white font-bold py-4 px-6 rounded-xl hover:from-blue-500 hover:via-blue-400 hover:to-blue-500 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 shadow-lg hover:shadow-2xl shadow-blue-500/30 border border-blue-400/50"
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-xl"></div>
                          <div className="relative">
                            <div className="text-lg mb-1">🎯 Quick Match</div>
                            <div className="text-xs opacity-90 font-semibold">New Opponent</div>
                          </div>
                        </button>
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black/90 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                          Instantly find a new opponent to play
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black/90"></div>
                        </div>
                      </div>
                      
                      {/* Share Result Card - Available for both wins and losses */}
                      <div className="relative group">
                        <button
                          onClick={handleShareVictory}
                          className={`relative w-full font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 shadow-lg hover:shadow-2xl border ${
                            gameResult.matchWinner === 'player' 
                              ? 'bg-gradient-to-br from-green-600 via-green-500 to-green-600 hover:from-green-500 hover:via-green-400 hover:to-green-500 shadow-green-500/30 border-green-400/50' 
                              : 'bg-gradient-to-br from-cyan-600 via-cyan-500 to-cyan-600 hover:from-cyan-500 hover:via-cyan-400 hover:to-cyan-500 shadow-cyan-500/30 border-cyan-400/50'
                          } text-white`}
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-xl"></div>
                          <div className="relative">
                            <div className="text-lg mb-1">📱 Share {gameResult.matchWinner === 'player' ? 'Victory' : 'Result'}</div>
                            <div className="text-xs opacity-90 font-semibold">
                              {gameResult.matchWinner === 'player' ? 'Brag Rights' : 'Show Results'}
                            </div>
                          </div>
                        </button>
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black/90 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                          {gameResult.matchWinner === 'player' ? 'Share your victory on social media' : 'Share your match results'}
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black/90"></div>
                        </div>
                      </div>
                      
                      {/* PnL Card Generation */}
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
                      {gameResult.matchWinner === 'opponent' && opponent && (
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
                      )}
                      
                      {/* Match Details */}
                      <div className="relative group">
                        <button
                          onClick={toggleMatchDetails}
                          className="relative w-full bg-gradient-to-br from-slate-600 via-slate-500 to-slate-600 text-white font-bold py-4 px-6 rounded-xl hover:from-slate-500 hover:via-slate-400 hover:to-slate-500 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 shadow-lg hover:shadow-2xl shadow-slate-500/30 border border-slate-400/50"
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-xl"></div>
                          <div className="relative">
                            <div className="text-lg mb-1">📊 Match Details</div>
                            <div className="text-xs opacity-90 font-semibold">Round by Round</div>
                          </div>
                        </button>
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black/90 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                          View detailed breakdown of each round
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black/90"></div>
                        </div>
                      </div>
                      
                      {/* Play Again - Regular flow */}
                      <div className="relative group">
                      <button
                        onClick={returnToLobby}
                          className="relative w-full bg-gradient-to-br from-gray-600 via-gray-500 to-gray-600 text-white font-bold py-4 px-6 rounded-xl hover:from-gray-500 hover:via-gray-400 hover:to-gray-500 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 shadow-lg hover:shadow-2xl shadow-gray-500/30 border border-gray-400/50"
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-xl"></div>
                          <div className="relative">
                            <div className="text-lg mb-1">🎮 Play Again</div>
                            <div className="text-xs opacity-90 font-semibold">New Match</div>
                          </div>
                    </button>
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black/90 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                          Return to lobby and start a new match
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black/90"></div>
                        </div>
                      </div>
                      
                      {/* Back to Home */}
                      <div className="relative group">
                      <button
                        onClick={() => router.push('/')}
                          className="relative w-full bg-gradient-to-br from-gray-700 via-gray-600 to-gray-700 text-white font-bold py-4 px-6 rounded-xl hover:from-gray-600 hover:via-gray-500 hover:to-gray-600 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 shadow-lg hover:shadow-2xl shadow-gray-600/30 border border-gray-500/50 col-span-1"
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-xl"></div>
                          <div className="relative">
                            <div className="text-lg mb-1">🏠 Back to Home</div>
                            <div className="text-xs opacity-90 font-semibold">Main Menu</div>
                          </div>
                    </button>
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black/90 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                          Return to main menu and browse other games
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black/90"></div>
                        </div>
                      </div>
                    </div>

                    {/* 🚀 GAMBLING PSYCHOLOGY: Match Details Expansion */}
                    {showMatchDetails && gameResult && (
                      <div className="mt-6 bg-bg-card/50 backdrop-blur-sm rounded-lg p-4 max-w-lg mx-auto">
                        <h4 className="font-bold text-text-primary mb-3 font-audiowide">Match Breakdown</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-text-secondary">Total Rounds:</span>
                            <span className="text-text-primary">{gameResult.totalRounds}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-secondary">Match Duration:</span>
                            <span className="text-text-primary">~{Math.floor(gameResult.totalRounds * 30)} seconds</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-secondary">Decisive Rounds:</span>
                            <span className="text-text-primary">{gameResult.playerScore + gameResult.opponentScore}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-secondary">Your Winning %:</span>
                            <span className={`font-bold ${gameResult.matchWinner === 'player' ? 'text-green-400' : 'text-red-400'}`}>
                              {gameResult.totalRounds > 0 ? Math.round((gameResult.playerScore / (gameResult.playerScore + gameResult.opponentScore)) * 100) : 0}%
                            </span>
                          </div>
                          {opponent && (
                            <div className="mt-4 pt-3 border-t border-border">
                              <div className="flex justify-between">
                                <span className="text-text-secondary">Opponent:</span>
                                <span className="text-text-primary">{opponent.username || opponent.wallet.slice(0, 8)}...</span>
                  </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                </div>
                )}

                        </div>
                      </div>
                    </div>
                  </div>
              </div>
            </div>

              {/* 🚀 ROBUST IMPROVEMENT: Fullscreen Toggle Button - Bottom Right Corner */}
              <button
                onClick={toggleFullscreen}
                className="absolute bottom-4 right-4 z-10 bg-black/50 hover:bg-black/70 p-3 rounded-lg border border-border/50 transition-all duration-200 transform hover:scale-105 active:scale-95"
                title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              >
                <span className="text-xl">
                  {isFullscreen ? '🔍' : '🖥️'}
                </span>
              </button>
            </div>

            {/* 🚀 ROBUST IMPROVEMENT: Individual Panel Docking System */}
              <div className="flex justify-center mt-4">
                <div className="flex flex-col items-center">
                  {/* Dynamic Status Indicator */}
                  <div className="mb-3 px-4 py-2 bg-bg-elevated border border-border rounded-lg">
                    <span className="text-sm font-semibold text-text-primary">
                      📋 {dockedPanels.size}/6 DOCKED
                    </span>
                  </div>
                  
                  <div className="flex gap-2">
                    {/* Game Overview Panel */}
                    <div className="relative">
                      <button
                        draggable={!dockedPanels.has('overview')}
                        onDragStart={(e) => !dockedPanels.has('overview') && handleDragStart(e, 'overview')}
                        onDragEnd={handleDragEnd}
                        onClick={() => !dockedPanels.has('overview') && setOpenPanels(prev => ({ ...prev, overview: !prev.overview }))}
                        className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-200 ${
                          dockedPanels.has('overview')
                            ? 'bg-green-500/20 border-2 border-green-400 text-green-400 cursor-default'
                            : openPanels.overview 
                              ? 'bg-accent-primary text-black' 
                              : 'bg-bg-elevated border border-border text-text-secondary hover:text-text-primary hover:bg-bg-card cursor-grab active:cursor-grabbing'
                        } ${draggedPanel === 'overview' ? 'opacity-50' : ''}`}
                        title={dockedPanels.has('overview') ? 'Game Overview (Docked)' : 'Game Overview (Drag to dock)'}
                      >
                        🎮
                      </button>
                      {dockedPanels.has('overview') && (
                        <div className="absolute -top-2 -right-2 w-4 h-4 bg-green-400 rounded-full flex items-center justify-center">
                          <span className="text-xs text-black">✓</span>
                        </div>
                      )}
                    </div>

                    {/* Live Chat Panel */}
                    <div className="relative">
                      <button
                        draggable={!dockedPanels.has('chat')}
                        onDragStart={(e) => !dockedPanels.has('chat') && handleDragStart(e, 'chat')}
                        onDragEnd={handleDragEnd}
                        onClick={() => !dockedPanels.has('chat') && setOpenPanels(prev => ({ ...prev, chat: !prev.chat }))}
                        className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-200 ${
                          dockedPanels.has('chat')
                            ? 'bg-green-500/20 border-2 border-green-400 text-green-400 cursor-default'
                            : openPanels.chat 
                              ? 'bg-accent-primary text-black' 
                              : 'bg-bg-elevated border border-border text-text-secondary hover:text-text-primary hover:bg-bg-card cursor-grab active:cursor-grabbing'
                        } ${draggedPanel === 'chat' ? 'opacity-50' : ''}`}
                        title={dockedPanels.has('chat') ? 'Live Chat (Docked)' : 'Live Chat (Drag to dock)'}
                      >
                        💬
                      </button>
                      {dockedPanels.has('chat') && (
                        <div className="absolute -top-2 -right-2 w-4 h-4 bg-green-400 rounded-full flex items-center justify-center">
                          <span className="text-xs text-black">✓</span>
                        </div>
                      )}
                    </div>

                    {/* Game Settings Panel */}
                    <div className="relative">
                      <button
                        draggable={!dockedPanels.has('settings')}
                        onDragStart={(e) => !dockedPanels.has('settings') && handleDragStart(e, 'settings')}
                        onDragEnd={handleDragEnd}
                        onClick={() => !dockedPanels.has('settings') && setOpenPanels(prev => ({ ...prev, settings: !prev.settings }))}
                        className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-200 ${
                          dockedPanels.has('settings')
                            ? 'bg-green-500/20 border-2 border-green-400 text-green-400 cursor-default'
                            : openPanels.settings 
                              ? 'bg-accent-primary text-black' 
                              : 'bg-bg-elevated border border-border text-text-secondary hover:text-text-primary hover:bg-bg-card cursor-grab active:cursor-grabbing'
                        } ${draggedPanel === 'settings' ? 'opacity-50' : ''}`}
                        title={dockedPanels.has('settings') ? 'Game Settings (Docked)' : 'Game Settings (Drag to dock)'}
                      >
                        ⚙️
                      </button>
                      {dockedPanels.has('settings') && (
                        <div className="absolute -top-2 -right-2 w-4 h-4 bg-green-400 rounded-full flex items-center justify-center">
                          <span className="text-xs text-black">✓</span>
                        </div>
                      )}
                    </div>

                    {/* Game Statistics Panel */}
                    <div className="relative">
                      <button
                        draggable={!dockedPanels.has('stats')}
                        onDragStart={(e) => !dockedPanels.has('stats') && handleDragStart(e, 'stats')}
                        onDragEnd={handleDragEnd}
                        onClick={() => !dockedPanels.has('stats') && setOpenPanels(prev => ({ ...prev, stats: !prev.stats }))}
                        className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-200 ${
                          dockedPanels.has('stats')
                            ? 'bg-green-500/20 border-2 border-green-400 text-green-400 cursor-default'
                            : openPanels.stats 
                              ? 'bg-accent-primary text-black' 
                              : 'bg-bg-elevated border border-border text-text-secondary hover:text-text-primary hover:bg-bg-card cursor-grab active:cursor-grabbing'
                        } ${draggedPanel === 'stats' ? 'opacity-50' : ''}`}
                        title={dockedPanels.has('stats') ? 'Game Statistics (Docked)' : 'Game Statistics (Drag to dock)'}
                      >
                        📊
                      </button>
                      {dockedPanels.has('stats') && (
                        <div className="absolute -top-2 -right-2 w-4 h-4 bg-green-400 rounded-full flex items-center justify-center">
                          <span className="text-xs text-black">✓</span>
                        </div>
                      )}
                    </div>

                    {/* Favorites Panel */}
                    <div className="relative">
                      <button
                        draggable={!dockedPanels.has('favorites')}
                        onDragStart={(e) => !dockedPanels.has('favorites') && handleDragStart(e, 'favorites')}
                        onDragEnd={handleDragEnd}
                        onClick={() => !dockedPanels.has('favorites') && setOpenPanels(prev => ({ ...prev, favorites: !prev.favorites }))}
                        className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-200 ${
                          dockedPanels.has('favorites')
                            ? 'bg-green-500/20 border-2 border-green-400 text-green-400 cursor-default'
                            : openPanels.favorites 
                              ? 'bg-accent-primary text-black' 
                              : 'bg-bg-elevated border border-border text-text-secondary hover:text-text-primary hover:bg-bg-card cursor-grab active:cursor-grabbing'
                        } ${draggedPanel === 'favorites' ? 'opacity-50' : ''}`}
                        title={dockedPanels.has('favorites') ? 'Favorites (Docked)' : 'Favorites (Drag to dock)'}
                      >
                        ⭐
                      </button>
                      {dockedPanels.has('favorites') && (
                        <div className="absolute -top-2 -right-2 w-4 h-4 bg-green-400 rounded-full flex items-center justify-center">
                          <span className="text-xs text-black">✓</span>
                        </div>
                      )}
                    </div>

                    {/* Recent Wins Panel */}
                    <div className="relative">
                      <button
                        draggable={!dockedPanels.has('recentwins')}
                        onDragStart={(e) => !dockedPanels.has('recentwins') && handleDragStart(e, 'recentwins')}
                        onDragEnd={handleDragEnd}
                        onClick={() => !dockedPanels.has('recentwins') && setOpenPanels(prev => ({ ...prev, recentwins: !prev.recentwins }))}
                        className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-200 ${
                          dockedPanels.has('recentwins')
                            ? 'bg-green-500/20 border-2 border-green-400 text-green-400 cursor-default'
                            : openPanels.recentwins 
                              ? 'bg-accent-primary text-black' 
                              : 'bg-bg-elevated border border-border text-text-secondary hover:text-text-primary hover:bg-bg-card cursor-grab active:cursor-grabbing'
                        } ${draggedPanel === 'recentwins' ? 'opacity-50' : ''}`}
                        title={dockedPanels.has('recentwins') ? 'Recent Wins (Docked)' : 'Recent Wins (Drag to dock)'}
                      >
                        🏆
                      </button>
                      {dockedPanels.has('recentwins') && (
                        <div className="absolute -top-2 -right-2 w-4 h-4 bg-green-400 rounded-full flex items-center justify-center">
                          <span className="text-xs text-black">✓</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Expandable Panel Content */}
              
              {/* 🔥 DOCKED PANELS DASHBOARD */}
              {dockedPanels.size > 0 && (
                <div className="mt-6 mx-auto max-w-7xl">
                  {/* Drag & Drop Zone */}
                  <div 
                    className={`relative border-2 border-dashed rounded-xl p-6 transition-all duration-300 ${
                      isOverDropZone 
                        ? 'border-accent-primary bg-accent-primary/10 shadow-lg' 
                        : 'border-border/50 bg-bg-elevated/50'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    {/* Dashboard Header */}
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <h3 className="text-lg font-bold text-text-primary">RPS Dashboard</h3>
                        <span className="text-sm text-text-secondary">({dockedPanels.size} panels)</span>
                      </div>
                      <button
                        onClick={handleUndockAll}
                        className="px-3 py-1 text-xs bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors"
                      >
                        Undock All
                      </button>
                    </div>

                    {/* Docked Panels Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                      
                      {/* Game Overview Panel */}
                      {dockedPanels.has('overview') && (
                        <div className="bg-bg-card border border-border rounded-lg overflow-hidden">
                          <div className="flex items-center justify-between p-3 bg-bg-elevated border-b border-border">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">🎮</span>
                              <span className="font-semibold text-text-primary">Game Overview</span>
                            </div>
                            <button
                              draggable
                              onDragStart={(e) => {
                                handleDragStart(e, 'overview');
                                setTimeout(() => handleUndockPanel('overview'), 0);
                              }}
                              onClick={() => handleUndockPanel('overview')}
                              className="p-1 hover:bg-bg-card rounded cursor-grab active:cursor-grabbing text-text-secondary hover:text-text-primary"
                              title="Undock panel"
                            >
                              📤
                            </button>
                          </div>
                          <div 
                            className="p-4 overflow-y-auto scrollbar-thin"  
                            style={{ height: `${dockedPanelHeights.overview}px` }}
                          >
                            <div className="space-y-4">
                              <div className="bg-bg-elevated rounded-lg p-3">
                                <h4 className="font-bold text-text-primary mb-2 text-sm">Game Rules</h4>
                                <ul className="text-xs text-text-secondary space-y-1">
                                  <li>• Rock beats Scissors</li>
                                  <li>• Paper beats Rock</li>
                                  <li>• Scissors beats Paper</li>
                                  <li>• Same choice = Draw (replay)</li>
                                  <li>• First to 3 wins takes all</li>
                                </ul>
                              </div>
                              <div className="bg-bg-elevated rounded-lg p-3">
                                <h4 className="font-bold text-text-primary mb-2 text-sm">Current Status</h4>
                                <div className="text-xs space-y-1">
                                  <div className="flex justify-between">
                                    <span className="text-text-secondary">Phase:</span>
                                    <span className="text-text-primary capitalize">{gamePhase.replace('-', ' ')}</span>
                                  </div>
                                  {currentMatch && (
                                    <div className="flex justify-between">
                                      <span className="text-text-secondary">Wager:</span>
                                      <span className="text-text-primary">{wagerAmount} SOL</span>
                                    </div>
                                  )}
                                  {gameResult && (
                                    <>
                                      <div className="flex justify-between">
                                        <span className="text-text-secondary">Your Score:</span>
                                        <span className="text-text-primary">{gameResult.playerScore}/3</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-text-secondary">Opponent:</span>
                                        <span className="text-text-primary">{gameResult.opponentScore}/3</span>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div 
                            className={`h-2 bg-bg-elevated border-t border-border cursor-ns-resize hover:bg-accent-primary/20 transition-colors ${
                              resizingPanel === 'overview' ? 'bg-accent-primary/30' : ''
                            }`}
                            onMouseDown={(e) => handleResizeStart(e, 'overview')}
                            title="Drag to resize"
                          >
                            <div className="w-full h-full flex items-center justify-center">
                              <div className="w-8 h-0.5 bg-text-secondary/50 rounded"></div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Live Chat Panel */}
                      {dockedPanels.has('chat') && (
                        <div className="bg-bg-card border border-border rounded-lg overflow-hidden">
                          <div className="flex items-center justify-between p-3 bg-bg-elevated border-b border-border">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">💬</span>
                              <span className="font-semibold text-text-primary">Live Chat</span>
                            </div>
                            <button
                              draggable
                              onDragStart={(e) => {
                                handleDragStart(e, 'chat');
                                setTimeout(() => handleUndockPanel('chat'), 0);
                              }}
                              onClick={() => handleUndockPanel('chat')}
                              className="p-1 hover:bg-bg-card rounded cursor-grab active:cursor-grabbing text-text-secondary hover:text-text-primary"
                              title="Undock panel"
                            >
                              📤
                            </button>
                          </div>
                          <div style={{ height: `${dockedPanelHeights.chat}px` }}>
                            <ChatPanel 
                              gameType="rps" 
                              gamePhase={gamePhase}
                              matchId={currentMatch?.id}
                            />
                          </div>
                          <div 
                            className={`h-2 bg-bg-elevated border-t border-border cursor-ns-resize hover:bg-accent-primary/20 transition-colors ${
                              resizingPanel === 'chat' ? 'bg-accent-primary/30' : ''
                            }`}
                            onMouseDown={(e) => handleResizeStart(e, 'chat')}
                            title="Drag to resize"
                          >
                            <div className="w-full h-full flex items-center justify-center">
                              <div className="w-8 h-0.5 bg-text-secondary/50 rounded"></div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Game Settings Panel */}
                      {dockedPanels.has('settings') && (
                        <div className="bg-bg-card border border-border rounded-lg overflow-hidden">
                          <div className="flex items-center justify-between p-3 bg-bg-elevated border-b border-border">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">⚙️</span>
                              <span className="font-semibold text-text-primary">Game Settings</span>
                            </div>
                            <button
                              draggable
                              onDragStart={(e) => {
                                handleDragStart(e, 'settings');
                                setTimeout(() => handleUndockPanel('settings'), 0);
                              }}
                              onClick={() => handleUndockPanel('settings')}
                              className="p-1 hover:bg-bg-card rounded cursor-grab active:cursor-grabbing text-text-secondary hover:text-text-primary"
                              title="Undock panel"
                            >
                              📤
                            </button>
                          </div>
                          <div 
                            className="p-4 overflow-y-auto scrollbar-thin"  
                            style={{ height: `${dockedPanelHeights.settings}px` }}
                          >
                            <div className="space-y-4">
                              <div className="bg-bg-elevated rounded-lg p-3">
                                <h4 className="font-bold text-text-primary mb-2 text-sm">Audio Settings</h4>
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <span className="text-text-secondary text-xs">Sound Effects</span>
                                    <button 
                                      onClick={() => playSound('click')}
                                      className="w-10 h-5 bg-accent-primary rounded-full relative text-xs"
                                    >
                                      <div className="w-4 h-4 bg-white rounded-full absolute top-0.5 right-0.5"></div>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div 
                            className={`h-2 bg-bg-elevated border-t border-border cursor-ns-resize hover:bg-accent-primary/20 transition-colors ${
                              resizingPanel === 'settings' ? 'bg-accent-primary/30' : ''
                            }`}
                            onMouseDown={(e) => handleResizeStart(e, 'settings')}
                            title="Drag to resize"
                          >
                            <div className="w-full h-full flex items-center justify-center">
                              <div className="w-8 h-0.5 bg-text-secondary/50 rounded"></div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Game Statistics Panel */}
                      {dockedPanels.has('stats') && (
                        <div className="bg-bg-card border border-border rounded-lg overflow-hidden">
                          <div className="flex items-center justify-between p-3 bg-bg-elevated border-b border-border">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">📊</span>
                              <span className="font-semibold text-text-primary">Game Statistics</span>
                            </div>
                            <button
                              draggable
                              onDragStart={(e) => {
                                handleDragStart(e, 'stats');
                                setTimeout(() => handleUndockPanel('stats'), 0);
                              }}
                              onClick={() => handleUndockPanel('stats')}
                              className="p-1 hover:bg-bg-card rounded cursor-grab active:cursor-grabbing text-text-secondary hover:text-text-primary"
                              title="Undock panel"
                            >
                              📤
                            </button>
                          </div>
                          <div 
                            className="p-4 overflow-y-auto scrollbar-thin"  
                            style={{ height: `${dockedPanelHeights.stats}px` }}
                          >
                            <div className="grid grid-cols-2 gap-3">
                              <div className="bg-bg-elevated rounded-lg p-3 text-center">
                                <div className="text-lg font-bold text-accent-primary">0</div>
                                <div className="text-xs text-text-secondary">Won</div>
                              </div>
                              <div className="bg-bg-elevated rounded-lg p-3 text-center">
                                <div className="text-lg font-bold text-red-400">0</div>
                                <div className="text-xs text-text-secondary">Lost</div>
                              </div>
                            </div>
                          </div>
                          <div 
                            className={`h-2 bg-bg-elevated border-t border-border cursor-ns-resize hover:bg-accent-primary/20 transition-colors ${
                              resizingPanel === 'stats' ? 'bg-accent-primary/30' : ''
                            }`}
                            onMouseDown={(e) => handleResizeStart(e, 'stats')}
                            title="Drag to resize"
                          >
                            <div className="w-full h-full flex items-center justify-center">
                              <div className="w-8 h-0.5 bg-text-secondary/50 rounded"></div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Favorites Panel */}
                      {dockedPanels.has('favorites') && (
                        <div className="bg-bg-card border border-border rounded-lg overflow-hidden">
                          <div className="flex items-center justify-between p-3 bg-bg-elevated border-b border-border">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">⭐</span>
                              <span className="font-semibold text-text-primary">Favorites</span>
                            </div>
                            <button
                              draggable
                              onDragStart={(e) => {
                                handleDragStart(e, 'favorites');
                                setTimeout(() => handleUndockPanel('favorites'), 0);
                              }}
                              onClick={() => handleUndockPanel('favorites')}
                              className="p-1 hover:bg-bg-card rounded cursor-grab active:cursor-grabbing text-text-secondary hover:text-text-primary"
                              title="Undock panel"
                            >
                              📤
                            </button>
                          </div>
                          <div 
                            className="p-4 overflow-y-auto scrollbar-thin"  
                            style={{ height: `${dockedPanelHeights.favorites}px` }}
                          >
                            <div className="text-center text-text-secondary">
                              <div className="text-2xl mb-2">⭐</div>
                              <p className="text-xs">No bookmarks yet</p>
                              <p className="text-xs opacity-75">Bookmark matches to review later</p>
                            </div>
                          </div>
                          <div 
                            className={`h-2 bg-bg-elevated border-t border-border cursor-ns-resize hover:bg-accent-primary/20 transition-colors ${
                              resizingPanel === 'favorites' ? 'bg-accent-primary/30' : ''
                            }`}
                            onMouseDown={(e) => handleResizeStart(e, 'favorites')}
                            title="Drag to resize"
                          >
                            <div className="w-full h-full flex items-center justify-center">
                              <div className="w-8 h-0.5 bg-text-secondary/50 rounded"></div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Recent Wins Panel */}
                      {dockedPanels.has('recentwins') && (
                        <div className="bg-bg-card border border-border rounded-lg overflow-hidden">
                          <div className="flex items-center justify-between p-3 bg-bg-elevated border-b border-border">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">🏆</span>
                              <span className="font-semibold text-text-primary">Recent Wins</span>
                            </div>
                            <button
                              draggable
                              onDragStart={(e) => {
                                handleDragStart(e, 'recentwins');
                                setTimeout(() => handleUndockPanel('recentwins'), 0);
                              }}
                              onClick={() => handleUndockPanel('recentwins')}
                              className="p-1 hover:bg-bg-card rounded cursor-grab active:cursor-grabbing text-text-secondary hover:text-text-primary"
                              title="Undock panel"
                            >
                              📤
                            </button>
                          </div>
                          <div 
                            className="overflow-hidden"  
                            style={{ height: `${dockedPanelHeights.recentwins}px` }}
                          >
                            <RecentWins 
                              gameFilter="rps"
                              isDocked={true}
                              isDraggable={false}
                              onUndock={() => handleUndockPanel('recentwins')}
                            />
                          </div>
                          <div 
                            className={`h-2 bg-bg-elevated border-t border-border cursor-ns-resize hover:bg-accent-primary/20 transition-colors ${
                              resizingPanel === 'recentwins' ? 'bg-accent-primary/30' : ''
                            }`}
                            onMouseDown={(e) => handleResizeStart(e, 'recentwins')}
                            title="Drag to resize"
                          >
                            <div className="w-full h-full flex items-center justify-center">
                              <div className="w-8 h-0.5 bg-text-secondary/50 rounded"></div>
                            </div>
                          </div>
                        </div>
                      )}

                    </div>

                    {/* Drop Zone Visual Feedback */}
                    {isDragging && (
                      <div className="absolute inset-0 bg-accent-primary/5 border-2 border-accent-primary border-dashed rounded-xl flex items-center justify-center pointer-events-none">
                        <div className="text-accent-primary font-bold text-lg">
                          🎯 Drop here to dock panel
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
                         {/* 🚀 ROBUST IMPROVEMENT: Floating Panels */}
             <FloatingPanel
               id="rps-overview"
               title="Game Overview"
               icon="🎮"
               isOpen={openPanels.overview}
               onClose={() => closePanel('overview')}
               defaultPosition={{ x: isFullscreen ? 100 : 50, y: 100 }}
               defaultSize={{ width: isFullscreen ? 400 : 350, height: isFullscreen ? 600 : 500 }}
             >
               <div className="p-4 space-y-4">
                          <div className="bg-bg-card rounded-lg p-4">
                            <h4 className="font-bold text-text-primary mb-3 font-audiowide">Game Rules</h4>
                            <ul className="text-sm text-text-secondary space-y-1 font-inter">
                              <li>• Rock beats Scissors</li>
                              <li>• Paper beats Rock</li>
                              <li>• Scissors beats Paper</li>
                              <li>• Same choice = Draw (replay round)</li>
                              <li>• First to 3 wins takes all</li>
                              <li>• 6.5% platform fee on winnings</li>
                            </ul>
                          </div>

                          <div className="bg-bg-card rounded-lg p-4">
                            <h4 className="font-bold text-text-primary mb-3 font-audiowide">Current Status</h4>
                            <div className="text-sm space-y-2 font-inter">
                              <div className="flex justify-between">
                                <span className="text-text-secondary">Phase:</span>
                                <span className="text-text-primary capitalize">{gamePhase.replace('-', ' ')}</span>
                              </div>
                              {currentMatch && (
                                <div className="flex justify-between">
                                  <span className="text-text-secondary">Wager:</span>
                                  <span className="text-text-primary">{wagerAmount} SOL</span>
                                </div>
                              )}
                              {gameResult && (
                                <>
                                  <div className="flex justify-between">
                                    <span className="text-text-secondary">Your Score:</span>
                                    <span className="text-text-primary">{gameResult.playerScore}/3</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-text-secondary">Opponent Score:</span>
                                    <span className="text-text-primary">{gameResult.opponentScore}/3</span>
                                  </div>
                                </>
                              )}
                              <div className="flex justify-between">
                                <span className="text-text-secondary">Connection:</span>
                                <span className={socketConnected ? 'text-green-400' : 'text-red-400'}>
                                  {socketConnected ? 'Connected' : 'Connecting...'}
                                </span>
                              </div>
                            </div>
                          </div>
                          </div>
             </FloatingPanel>

             <FloatingPanel
               id="rps-chat"
               title="Live Chat"
               icon="💬"
               isOpen={openPanels.chat}
               onClose={() => closePanel('chat')}
               defaultPosition={{ x: isFullscreen ? 520 : 420, y: 100 }}
               defaultSize={{ width: isFullscreen ? 450 : 400, height: isFullscreen ? 650 : 550 }}
             >
                    <div className="h-[500px]">
                      <ChatPanel 
                        gameType="rps" 
                        gamePhase={gamePhase}
                        matchId={currentMatch?.id}
                      />
                    </div>
             </FloatingPanel>

             <FloatingPanel
               id="rps-settings"
               title="Game Settings"
               icon="⚙️"
               isOpen={openPanels.settings}
               onClose={() => closePanel('settings')}
               defaultPosition={{ x: 100, y: 150 }}
               defaultSize={{ width: 320, height: 600 }}
             >
               <div className="p-4 space-y-4">
                        <div className="bg-bg-card rounded-lg p-4">
                   <h4 className="font-bold text-text-primary mb-3 font-audiowide">Audio Settings</h4>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-text-secondary font-inter">Sound Effects</span>
                       <button 
                         onClick={() => playSound('click')}
                         className="w-12 h-6 bg-accent-primary rounded-full relative"
                       >
                                <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5"></div>
                              </button>
                            </div>
                            </div>
                          </div>
                        </div>
             </FloatingPanel>

             <FloatingPanel
               id="rps-stats"
               title="Game Statistics"
               icon="📊"
               isOpen={openPanels.stats}
               onClose={() => closePanel('stats')}
               defaultPosition={{ x: isFullscreen ? 1000 : 790, y: 100 }}
               defaultSize={{ width: isFullscreen ? 420 : 380, height: isFullscreen ? 700 : 600 }}
             >
               <div className="p-4 space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                        <div className="bg-bg-card rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold text-accent-primary">0</div>
                          <div className="text-sm text-text-secondary font-inter">Matches Won</div>
                        </div>
                        <div className="bg-bg-card rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold text-red-400">0</div>
                          <div className="text-sm text-text-secondary font-inter">Matches Lost</div>
                        </div>
                        </div>
                        </div>
             </FloatingPanel>

            {openPanels.favorites && (
              <div className="mt-4 bg-bg-elevated border border-border rounded-xl overflow-hidden">

                  {/* Bookmark Panel */}
                    <div className="p-6">
                      <h3 className="text-xl font-bold text-text-primary mb-4 font-audiowide">Bookmarks</h3>
                      <div className="text-center text-text-secondary py-8">
                        <div className="text-4xl mb-4">⭐</div>
                        <p className="font-inter">No bookmarks yet</p>
                        <p className="text-sm font-inter">Bookmark interesting matches to review later</p>
                      </div>
                    </div>

                </div>
              )}

              {/* Recent Wins Floating Panel */}
              {openPanels.recentwins && (
                <div className="mt-4">
                  <RecentWins 
                    gameFilter="rps"
                    isDocked={false}
                    isDraggable={true}
                    onDragStart={(e) => handleDragStart(e, 'recentwins')}
                    onDragEnd={handleDragEnd}
                    onUndock={() => setOpenPanels(prev => ({ ...prev, recentwins: false }))}
                  />
                </div>
              )}

          </div>

          {/* Recent RPS Wins - Game Specific */}
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-text-primary font-audiowide mb-2">🥊 Recent RPS Victories</h2>
              <p className="text-text-secondary font-inter">Live feed of recent Rock Paper Scissors wins</p>
            </div>
            <RecentWins gameFilter="rps" />
          </div>
        </main>
      </div>

      {/* 🚀 PnL CARD: Professional trading-style game result cards */}
      {gameResult && user && (
        <PnLCardModal
          isOpen={showPnLCard}
          onClose={() => setShowPnLCard(false)}
          game="RPS"
          result={gameResult.matchWinner === 'player' ? 'WIN' : 'LOSS'}
          pnlAmount={
            gameResult.matchWinner === 'player' 
              ? wagerAmount  // Full profit before fees (win = double, so profit = original wager)
              : -wagerAmount  // Loss = negative wager amount
          }
          pnlPercentage={
            gameResult.matchWinner === 'player' 
              ? 100  // 100% profit (you double your money)
              : -100  // Loss is always 100% loss
          }
          wagerAmount={wagerAmount}
          finalAmount={
            gameResult.matchWinner === 'player' 
              ? wagerAmount * 2  // Full winnings before fees (like Axiom shows gross profit)
              : 0  // Loss = 0 final amount
          }
          username={user.username}
          walletAddress={user.walletAddress || user.id || 'Unknown'}
          userAvatar={user.avatar}
          gameSpecific={{
            finalScore: `${gameResult.playerScore}-${gameResult.opponentScore}`,
            totalRounds: gameResult.totalRounds,
            winRate: gameResult.totalRounds > 0 
              ? (gameResult.playerScore / (gameResult.playerScore + gameResult.opponentScore)) * 100 
              : 0
          }}
          baseImageUrl="/pnl/pnlcard.png"
        />
      )}
    </div>
  );
} 