'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePV3 } from '@/hooks/usePV3';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import PageHeader from '@/components/PageHeader';
import Avatar from '@/components/Avatar';
import { CoinFlipEngine, CoinSide, CoinFlipResult } from '@/lib/games/coinflip/coinflip-engine';
import CoinFlipSimple3D from '@/components/games/coinflip/CoinFlipSimple3D';
import CoinChoice3D from '@/components/games/coinflip/CoinChoice3D';
import { matchService } from '@/services/matchService';
import { socketService } from '@/services/socketService';
import CoinFlipSounds, { useCoinFlipSounds, SoundEffect } from '@/components/games/coinflip/CoinFlipSounds';
import CoinflipQuickMatch from '@/components/games/coinflip/CoinflipQuickMatch';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import PayoutVerificationButton from '@/components/PayoutVerificationButton';
import ChatPanel from '@/components/ChatPanel';

type GamePhase = 'lobby' | 'creating' | 'joining' | 'waiting' | 'playing' | 'flipping' | 'round-complete' | 'finished' | 'payout-complete';

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

export default function CoinFlipPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { connected, publicKey, formatSOL, vaultBalance, loading, depositToVault } = usePV3();
  
  // Check if user is authenticated (logged in)
  const isAuthenticated = !!user;
  
  // 🎵 SOUND EFFECTS INTEGRATION
  const { playSound } = useCoinFlipSounds();

  // Sound control state
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Helper function to play sound only if enabled
  const playSoundIfEnabled = useCallback((soundType: SoundEffect, volume: number = 1) => {
    if (soundEnabled) {
      playSound(soundType, volume);
    }
  }, [soundEnabled, playSound]);
  
  // Game state
  const [gamePhase, setGamePhase] = useState<GamePhase>('lobby');
  const [wagerAmount, setWagerAmount] = useState(0.1);
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);
  const [availableMatches, setAvailableMatches] = useState<Match[]>([]);
  const [gameResult, setGameResult] = useState<CoinFlipResult | null>(null);
  const [opponent, setOpponent] = useState<Opponent | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [playerChoice, setPlayerChoice] = useState<CoinSide | null>(null);
  const [opponentChoice, setOpponentChoice] = useState<CoinSide | null>(null);
  const [opponentHasChosen, setOpponentHasChosen] = useState(false);
  const [bothPlayersReady, setBothPlayersReady] = useState(false);
  
  // Animation state
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipResult, setFlipResult] = useState<CoinSide | null>(null);
  
  // 🚀 ANIMATION SYSTEM: Smart background loading
  // Only Simple 3D animation now - removed fast 2D and complex 3D/WASM
  const [animationReady, setAnimationReady] = useState(false);
  const [showLoadingState, setShowLoadingState] = useState(false);
  
  // 3D Choice hover states
  const [headsHovered, setHeadsHovered] = useState(false);
  const [tailsHovered, setTailsHovered] = useState(false);

  // 🎰 GAMBLING PSYCHOLOGY STATE
  const [winStreak, setWinStreak] = useState(0);
  const [lossStreak, setLossStreak] = useState(0);
  const [nearMissCount, setNearMissCount] = useState(0);
  const [totalGamesPlayed, setTotalGamesPlayed] = useState(0);
  const [isOnFire, setIsOnFire] = useState(false); // 3+ win streak

  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<'overview' | 'chat' | 'settings' | 'stats' | 'bookmark' | null>(null);

  // Server-side game state
  const [serverGameState, setServerGameState] = useState<any>(null);
  const [roundResult, setRoundResult] = useState<any>(null);

  // 🔧 NEW: Round readiness tracking
  const [playerRoundReady, setPlayerRoundReady] = useState(false);
  const [opponentRoundReady, setOpponentRoundReady] = useState(false);
  const [isTransitioningRound, setIsTransitioningRound] = useState(false);

  // 💰 NEW: Payout status tracking
  const [payoutStatus, setPayoutStatus] = useState<'pending' | 'processing' | 'completed' | 'failed' | null>(null);
  const [payoutData, setPayoutData] = useState<any>(null);

  // Event handlers - MOVED BEFORE USEFFECT TO FIX DEPENDENCY ISSUE

  // Handle socket errors (especially payout failures)
  const handleSocketError = useCallback((error: any) => {
    console.error('❌ Socket error occurred:', error);
    
    try {
      // More sophisticated error handling
      const errorMessage = error?.message || error?.toString() || 'Unknown socket error';
      
      // Check if this is a critical error that requires complete reset
      const criticalErrors = [
        'connection_failed',
        'authentication_failed', 
        'server_disconnected',
        'payout_failed',
        'match_corrupted'
      ];
      
      const isCriticalError = criticalErrors.some(criticalError => 
        errorMessage.toLowerCase().includes(criticalError)
      );
      
      if (isCriticalError) {
        console.warn('🚨 Critical error detected - resetting game state');
        setError(`Critical error: ${errorMessage}`);
        setIsFlipping(false);
        setGamePhase('lobby');
        
        // Reset all game state
        setGameResult(null);
        setCurrentMatch(null);
        setOpponent(null);
        setPlayerChoice(null);
        setOpponentChoice(null);
        setBothPlayersReady(false);
        setFlipResult(null);
        setServerGameState(null);
        setRoundResult(null);
      } else {
        // Regular error handling - don't reset everything
        console.error('Game error:', errorMessage);
        setError(errorMessage);
      }
    } catch (errorProcessingError) {
      console.error('❌ Error processing socket error:', errorProcessingError);
      setError('Critical system error occurred');
      setIsFlipping(false);
      setGamePhase('lobby');
      
      // Reset all game state as fallback
      setGameResult(null);
      setCurrentMatch(null);
      setOpponent(null);
      setPlayerChoice(null);
      setOpponentChoice(null);
      setBothPlayersReady(false);
      setFlipResult(null);
      setServerGameState(null);
      setRoundResult(null);
    }
  }, []);

  // ✅ SERVER-SIDE EVENT HANDLERS - Define before use
  const handleOpponentChoiceMade = useCallback((data: { matchId: string; playerId: string; timestamp: number }) => {
    console.log('🤖 Opponent made their choice:', data);
    // Don't reveal the actual choice until result comes
    setOpponentHasChosen(true);
    
    // ✅ CRITICAL FIX: Only set both ready if WE have also chosen
    if (playerChoice) {
      console.log('🎬 Both players have now chosen - ready for animation!');
    setBothPlayersReady(true);
    } else {
      console.log('⏳ Opponent chose, but we haven\'t chosen yet - waiting...');
    }
  }, [playerChoice]);

  // ✅ NEW: Start loading state when BOTH players have chosen
  useEffect(() => {
    if (bothPlayersReady && playerChoice && gamePhase === 'playing') {
      console.log('🎬 Both players chose - starting loading state and preloading 3D!');
      
      // 🔧 CRITICAL FIX: Reset animation ready state for new round
      setAnimationReady(false);
      
      // 🎵 DRAMATIC COIN FLIP SOUND
      playSoundIfEnabled('coin_flip', 1.2);
      
      // Show loading state immediately
      setShowLoadingState(true);
      setGamePhase('flipping');
      
      // Start 3D preloading timer - if not ready in 4 seconds, use fast animation
      const fallbackTimer = setTimeout(() => {
        if (!animationReady) {
          console.log('⚡ 3D taking too long (>4s) - falling back to fast animation');
          setIsFlipping(true);
          setShowLoadingState(false);
        }
      }, 4000);
      
      return () => clearTimeout(fallbackTimer);
    }
  }, [bothPlayersReady, playerChoice, gamePhase, playSoundIfEnabled, animationReady]);

  // ✅ NEW: Switch to 3D animation when it's ready
  useEffect(() => {
    if (showLoadingState && animationReady) {
      console.log('🎬 3D coin rendered - switching from loading to 3D animation!');
      setIsFlipping(true);
      setShowLoadingState(false);
    }
  }, [showLoadingState, animationReady]);

  const handleCoinFlipGameState = useCallback((data: { matchId: string; gameState: any; timestamp: number }) => {
    console.log('🎮 Server game state update:', data);
    setServerGameState(data.gameState);
  }, []);

  const handlePlayerRoundReady = useCallback((data: { matchId: string; playerId: string; timestamp: number }) => {
    console.log('🎯 Player round ready:', data);
    
    const userWallet = user?.walletAddress || user?.id || '';
    if (data.playerId === userWallet) {
      // This is us
      setPlayerRoundReady(true);
    } else {
      // This is opponent
      setOpponentRoundReady(true);
    }
  }, [user]);

  const handleCoinFlipResult = useCallback((data: any) => {
    console.log('🪙 Server coin flip result:', data);
    
    try {
      const { roundResult, gameState } = data;
      
      // Validate required data structure
      if (!roundResult || !gameState) {
        console.error('❌ Invalid coin flip result data:', data);
        setError('Invalid game result received from server');
        setGamePhase('lobby');
        return;
      }
      
      setRoundResult(roundResult);
      setServerGameState(gameState);

      // Set the actual opponent choice now that we have the result
      const targetRoundNumber = gameState.matchComplete ? 
        gameState.currentRound : 
        gameState.currentRound - 1;
        
      const completedRound = gameState.rounds.find((round: any) => 
        round.roundNumber === targetRoundNumber
      );
      
      const userWallet = user?.walletAddress || user?.id || '';
      const isPlayer1 = gameState.player1 === userWallet;
      
      // Add null check for completedRound
      if (!completedRound) {
        console.error('❌ Completed round not found in game state:', gameState);
        setError('Game state error - round data missing');
        setGamePhase('lobby');
        return;
      }
      
      const opponentChoice = isPlayer1 ? completedRound.player2Choice : completedRound.player1Choice;
      setOpponentChoice(opponentChoice);
      
      // Validate coin result
      if (!roundResult.coinResult || !['heads', 'tails'].includes(roundResult.coinResult)) {
        console.error('❌ Invalid coin result:', roundResult.coinResult);
        setError('Invalid coin flip result');
        setGamePhase('lobby');
        return;
      }
      
      // ✅ SETTLE ANIMATION: Set result to settle the already-running animation
      console.log('🎯 Settling animation with server result:', roundResult.coinResult);
      setFlipResult(roundResult.coinResult);
      
      // Animation is already running from user choice, just update the result
      // The animation will detect the result change and settle accordingly
      
      // Create game result for UI display
      const gameResult: CoinFlipResult = {
        currentRound: {
          roundNumber: completedRound.roundNumber,
          playerChoice: isPlayer1 ? completedRound.player1Choice : completedRound.player2Choice,
          opponentChoice: opponentChoice,
          result: roundResult.coinResult,
          winner: roundResult.roundWinner === userWallet ? 'player' as const : 
                  roundResult.roundWinner === null ? null : 'opponent' as const,
          timestamp: completedRound.timestamp
        },
        playerScore: isPlayer1 ? gameState.player1Score : gameState.player2Score,
        opponentScore: isPlayer1 ? gameState.player2Score : gameState.player1Score,
        matchComplete: gameState.matchComplete,
        matchWinner: gameState.matchWinner === userWallet ? 'player' as const : 
                     gameState.matchWinner === null ? null : 'opponent' as const,
        totalRounds: gameState.rounds.length,
        timestamp: Date.now()
      };
      
      // 🎵 COIN LANDING SOUND (delayed for animation sync)
      setTimeout(() => {
        playSoundIfEnabled('coin_land', 0.8);
        
        // ✅ CRITICAL FIX: Update scores AFTER animation completes
        setGameResult(gameResult);
        
        // 🎯 STEP 2: Add payout confirmation when match completes (like crash)
        if (gameResult.matchComplete && currentMatch) {
          console.log('💰 Confirming payout ready after coinflip match completion');
          socketService.confirmPayoutReady(currentMatch.id);
        }
        
        // 🎵 PSYCHOLOGICAL SOUND TRIGGERS
        if (gameResult.currentRound.winner === 'player') {
          playSoundIfEnabled('round_win', 1.0);
          // 🎵 STREAK BONUS SOUND
          if (winStreak >= 2) {
            setTimeout(() => playSoundIfEnabled('streak_bonus', 0.9), 300);
          }
        } else if (gameResult.currentRound.winner === 'opponent') {
          playSoundIfEnabled('round_lose', 0.6);
        } else {
          playSoundIfEnabled('near_miss', 0.5);
        }
      }, 8000); // 🎰 Extended to 8 seconds for better suspense and psychological impact
      
      // 🛡️ SAFETY TIMEOUT: Ensure game state transitions even if animation fails
      setTimeout(() => {
        // Use a state check function to avoid closure issues
        setGamePhase(currentPhase => {
          if (currentPhase === 'flipping') {
          console.warn('⚠️ Animation timeout - forcing game state transition');
          setIsFlipping(false);
          
          if (gameResult.matchComplete) {
              return 'finished';
          } else {
              return 'round-complete';
          }
        }
          return currentPhase;
        });
      }, 12000); // 12 second safety timeout (increased to accommodate longer animation)
      
    } catch (error) {
      console.error('❌ Error processing coin flip result:', error);
      setError('Failed to process game result');
      setIsFlipping(false);
      setGamePhase('lobby');
      
      // Reset all game state
      setGameResult(null);
      setCurrentMatch(null);
      setOpponent(null);
      setPlayerChoice(null);
      setOpponentChoice(null);
      setBothPlayersReady(false);
      setFlipResult(null);
      setServerGameState(null);
      setRoundResult(null);
    }
  }, [user, playSoundIfEnabled, winStreak, gamePhase, currentMatch]);

  // ✅ SOCKET CONNECTION AND EVENT LISTENERS
  useEffect(() => {
    if (!isAuthenticated) return;

    console.log('🔌 Setting up socket connection...');
    
    const initSocket = async () => {
      try {
        console.log('🔌 Starting socket connection...');
        await socketService.connect();
        console.log('✅ Socket connected successfully');
        
        // 🔧 CRITICAL FIX: Immediately check and set connection status
        const isConnected = socketService.isConnected();
        console.log('🔧 Socket service isConnected():', isConnected);
        setSocketConnected(isConnected);
        
        // 🔧 FORCE CONNECTION STATUS: If socket exists and is connected, set to true
        if (socketService.isSocketConnected()) {
          console.log('🔧 Force setting socketConnected to true - socket.connected is true');
          setSocketConnected(true);
        }
        
        // Set up game event listeners
        socketService.on('match_state', (data: unknown) => handleMatchState(data as { match: Match; connectedPlayers: number }));
        socketService.on('player_joined', (data: unknown) => handlePlayerJoined(data as { playerId: string; matchId: string }));
        socketService.on('game_move', (data: unknown) => handleOpponentMove(data as { playerId: string; moveData: { choice: CoinSide } }));
        
        // ✅ ADD COINFLIP-SPECIFIC EVENT LISTENERS
        socketService.onOpponentChoiceMade(handleOpponentChoiceMade);
        socketService.onCoinFlipGameState(handleCoinFlipGameState);
        socketService.onCoinFlipResult(handleCoinFlipResult);
        
        // 🔧 NEW: Round readiness event listeners - use type assertion
        socketService.on('player_round_ready', (data: unknown) => {
          handlePlayerRoundReady(data as { matchId: string; playerId: string; timestamp: number });
        });
        
        // 🔧 CRITICAL FIX: Monitor socket disconnection
        socketService.on('disconnect', () => {
          console.log('🔌 Socket disconnected');
          setSocketConnected(false);
        });
        
        // 🔧 CRITICAL FIX: Monitor socket reconnection
        socketService.on('connect', () => {
          console.log('🔌 Socket reconnected');
          setSocketConnected(true);
        });
        
      } catch (error) {
        console.error('❌ Socket connection failed:', error);
        setSocketConnected(false);
        handleSocketError(error);
      }
    };

    initSocket();

    // 🔧 CRITICAL FIX: Aggressive connection monitoring every 1 second
    const connectionMonitor = setInterval(() => {
      const isActuallyConnected = socketService.isConnected();
      const socketExists = socketService.hasSocket();
      const socketConnectedDirect = socketService.isSocketConnected();
      
      console.log('🔧 Connection monitor:', {
        isActuallyConnected,
        socketExists,
        socketConnectedDirect,
        currentState: socketConnected
      });
      
      // Use the most direct check - if socket exists and is connected, we're connected
      const shouldBeConnected = socketExists && socketConnectedDirect;
      
      if (shouldBeConnected !== socketConnected) {
        console.log('🔧 Connection state mismatch - updating to:', shouldBeConnected);
        setSocketConnected(shouldBeConnected);
      }
    }, 1000); // Check every 1 second for faster updates

    return () => {
      console.log('🔌 Cleaning up socket listeners...');
      
      // 🔧 CRITICAL FIX: Clear connection monitor
      clearInterval(connectionMonitor);
      
      // 🔧 CRITICAL FIX: Reset socket connection state on cleanup
      setSocketConnected(false);
      
      // ✅ CLEAN UP COINFLIP-SPECIFIC LISTENERS
      socketService.offCoinFlipEvents();
      
      // 🔧 NEW: Clean up round readiness listeners
      socketService.off('player_round_ready', (data: unknown) => {
        handlePlayerRoundReady(data as { matchId: string; playerId: string; timestamp: number });
      });
    };
  }, [isAuthenticated, handleSocketError, handleOpponentChoiceMade, handleCoinFlipGameState, handleCoinFlipResult, handlePlayerRoundReady]);

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

  const handleOpponentMove = useCallback((data: { playerId: string; moveData: { choice: CoinSide } }) => {
    console.log('Opponent choice received:', data);
    setOpponentChoice(data.moveData.choice);
    
    // Server will handle the coin flip automatically when both players are ready
      setBothPlayersReady(true);
  }, []);

  // Load available matches
  const loadAvailableMatches = useCallback(async () => {
    try {
      const matches = await matchService.getAvailableCoinFlipMatches();
      setAvailableMatches(matches);
    } catch (error) {
      console.error('Failed to load matches:', error);
    }
  }, []);

  // Create a new match
  const createMatch = useCallback(async () => {
    if (!isAuthenticated || vaultBalance < wagerAmount * 1000000000) {
      alert('Insufficient vault balance');
      return;
    }

    setGamePhase('creating');
    try {
      const match = await matchService.createCoinFlipMatch(wagerAmount);
      setCurrentMatch(match);
      setGamePhase('waiting');
      
      socketService.joinMatch(match.id, user!.walletAddress || user!.id);
    } catch (error) {
      console.error('Failed to create match:', error);
      alert('Failed to create match. Please try again.');
      setGamePhase('lobby');
    }
  }, [isAuthenticated, vaultBalance, wagerAmount, user]);

  // Join an existing match
  const joinMatch = useCallback(async (matchId: string) => {
    if (!isAuthenticated) return;

    setGamePhase('joining');
    try {
      const match = await matchService.joinMatch(matchId);
      setCurrentMatch(match);
      
      socketService.joinMatch(match.id, user!.walletAddress || user!.id);
    } catch (error) {
      console.error('Failed to join match:', error);
      alert('Failed to join match. Please try again.');
      setGamePhase('lobby');
    }
  }, [isAuthenticated, user]);

  // Make player choice - WAIT FOR BOTH PLAYERS BEFORE ANIMATION
  const makeChoice = useCallback((choice: CoinSide) => {
    if (gamePhase !== 'playing' || playerChoice) return;
    
    console.log(`🎯 Player chose: ${choice}`);
    
    // 🎵 SATISFYING CHOICE SOUND
    playSoundIfEnabled('choice_select');
    
    // ✅ FIXED: Just set choice, don't start animation yet
      setPlayerChoice(choice);
    setFlipResult(null);
    
    console.log('⏳ Waiting for both players to choose before starting animation');
      
    if (currentMatch && socketConnected) {
      console.log(`📡 Sending choice to server: ${choice}`);
      socketService.sendCoinFlipChoice(currentMatch.id, user?.walletAddress || user?.id || '', choice);
    } else {
      console.error('❌ Cannot send choice - no match or socket connection');
    }
  }, [gamePhase, playerChoice, playSoundIfEnabled, currentMatch, socketConnected, user]);

  // ✅ NEW: Check if both players are ready when player choice changes
  useEffect(() => {
    if (playerChoice && opponentHasChosen) {
      console.log('🎬 Both players have chosen - setting both ready!');
      setBothPlayersReady(true);
    }
  }, [playerChoice, opponentHasChosen]);

  // 🔧 NEW: Check if both players are ready and transition to playing
  useEffect(() => {
    if (isTransitioningRound && playerRoundReady && opponentRoundReady) {
      console.log('🎮 Both players ready for next round - transitioning to playing state');
      setGamePhase('playing');
      setIsTransitioningRound(false);
      setPlayerRoundReady(false);
      setOpponentRoundReady(false);
        }
  }, [isTransitioningRound, playerRoundReady, opponentRoundReady]);

  // Continue to next round
  const continueToNextRound = useCallback(() => {
    // 🎵 SUBTLE PROGRESSION SOUND
    playSoundIfEnabled('notification', 0.3);
    
    // ✅ Reset state for next round
    setPlayerChoice(null);
    setOpponentChoice(null);
    setOpponentHasChosen(false);
    setBothPlayersReady(false);
    setFlipResult(null);
    setRoundResult(null);
    
    // ✅ IMMEDIATE TRANSITION: Go to playing state immediately
    setGamePhase('playing');
    
    // 🔧 REQUEST FRESH STATE: Ensure both players have the latest game state
    if (currentMatch && socketConnected) {
      console.log('🔄 Requesting game state sync for next round...');
      setTimeout(() => {
        if (socketConnected) {
          socketService.getCoinFlipState(currentMatch.id);
        }
      }, 500); // Small delay to ensure backend is ready
    }
    
    console.log('🔄 Transitioned to next round - state reset complete');
  }, [playSoundIfEnabled, currentMatch, socketConnected]);

  // 🎰 AUTO-PROGRESSION: Automatically continue to next round after 5 seconds (only if match is NOT complete)
  useEffect(() => {
    if (gamePhase === 'round-complete' && gameResult && !gameResult.matchComplete) {
      console.log('🔄 Setting up auto-progression for next round...', {
        playerScore: gameResult.playerScore,
        opponentScore: gameResult.opponentScore,
        matchComplete: gameResult.matchComplete
      });
      
      // 🎵 COUNTDOWN TICKS
      const countdownInterval = setInterval(() => {
        playSoundIfEnabled('countdown', 0.2);
      }, 1000);
      
      const timer = setTimeout(() => {
        clearInterval(countdownInterval);
        
        // 🔧 TRIPLE CHECK: Ensure match is still not complete and we're still in round-complete phase
        if (gameResult && !gameResult.matchComplete && gamePhase === 'round-complete' && socketConnected) {
          console.log('✅ Auto-progressing to next round');
        continueToNextRound();
        } else if (gameResult && gameResult.matchComplete) {
          console.log('🏁 Match completed during auto-progression timer, transitioning to finished');
          setGamePhase('finished');
        } else if (gamePhase !== 'round-complete') {
          console.log('🔄 Game phase changed during auto-progression, canceling timer');
          // Phase changed (probably due to match_completed event), do nothing
        } else {
          console.warn('⚠️ Socket disconnected during round transition, returning to lobby');
          setError('Connection lost during game. Please try again.');
          setGamePhase('lobby');
        }
      }, 8000); // Extended to 8 seconds - let players savor wins/process losses
      
      return () => {
        clearTimeout(timer);
        clearInterval(countdownInterval);
      };
    }
  }, [gamePhase, gameResult, continueToNextRound, playSoundIfEnabled, socketConnected]);

  // Return to lobby
  const returnToLobby = useCallback(() => {
    setGamePhase('lobby');
    setGameResult(null);
    setCurrentMatch(null);
    setOpponent(null);
    setPlayerChoice(null);
    setOpponentChoice(null);
    setOpponentHasChosen(false);
    setBothPlayersReady(false);
    setIsFlipping(false);
    setFlipResult(null);
    setServerGameState(null);
    setRoundResult(null);
    // 🔧 CRITICAL FIX: Reset animation states
    setAnimationReady(false);
    setShowLoadingState(false);
    console.log('🏠 Returned to lobby');
    loadAvailableMatches();
  }, [loadAvailableMatches]);

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

  // ✅ PAYOUT SYSTEM EVENT LISTENERS
  useEffect(() => {
    if (!socketConnected) return;

    const handlePayoutComplete = (data: any) => {
      console.log('✅ Payout completed:', data);
      
      // 🔧 INTEGRATE PAYOUT INTO GAME FLOW
      setPayoutStatus('completed');
      setPayoutData(data);
      setGamePhase('payout-complete');
      
      // 🎵 SUCCESS SOUND
      playSoundIfEnabled('choice_select', 0.8);
    };

    const handlePayoutFailed = (data: any) => {
      console.log('❌ Payout failed:', data);
      
      // 🔧 INTEGRATE PAYOUT ERROR INTO GAME FLOW
      setPayoutStatus('failed');
      setPayoutData(data);
      setError(`Payout failed: ${data.error}`);
      
      // Still show end screen but with error state
      setGamePhase('payout-complete');
    };

    // Add match_completed listener here to consolidate event handling
    socketService.on('payout_complete', handlePayoutComplete);
    socketService.on('payout_failed', handlePayoutFailed);

    return () => {
      socketService.off('payout_complete', handlePayoutComplete);
      socketService.off('payout_failed', handlePayoutFailed);
    };
  }, [socketConnected, router]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-main text-text-primary">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="lg:ml-64 min-h-screen">
          <PageHeader onMenuClick={() => setSidebarOpen(true)} />
          <main className="p-6">
            <div className="max-w-4xl mx-auto text-center py-20">
              <div className="text-8xl mb-8">🪙</div>
              <h1 className="text-4xl font-bold text-text-primary mb-4 font-audiowide uppercase">Coin Flip</h1>
              <p className="text-lg text-text-secondary mb-8 font-inter">
                Please log in to play coin flip
              </p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-main text-text-primary font-inter">
      {/* 🎵 SOUND EFFECTS COMPONENT */}
      <CoinFlipSounds isFlipping={isFlipping} result={flipResult} />
      
      {/* Main Sidebar - Always visible */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="lg:ml-64 min-h-screen">
        <PageHeader onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="p-6">
          <div className="max-w-7xl mx-auto">
            
            {/* Fixed Game Container - Stake Style */}
            <div className="bg-bg-elevated border border-border rounded-lg mx-auto" style={{ width: '1000px', height: '1000px', minHeight: '1000px' }}>
              
              {/* Compact Header */}
              <div className="border-b border-border p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">🪙</div>
                    <div>
                      <h1 className="text-xl font-bold text-text-primary font-audiowide">Coin Flip</h1>
                      <p className="text-sm text-text-secondary">50/50 odds • Winner takes all</p>
                    </div>
                  </div>
                  
                  {/* Game Status */}
                  {currentMatch && gamePhase !== 'lobby' && (
                    <div className="text-right">
                      <div className="text-sm font-medium text-text-primary">
                        {gameResult ? `${gameResult.playerScore} - ${gameResult.opponentScore}` : 'Match in Progress'}
                      </div>
                      <div className="text-xs text-text-secondary">
                        {gamePhase === 'waiting' && 'Waiting for opponent...'}
                        {gamePhase === 'playing' && 'Make your choice'}
                        {gamePhase === 'flipping' && 'Flipping coin...'}
                        {gamePhase === 'round-complete' && 'Round complete'}
                        {gamePhase === 'finished' && 'Match finished'}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Main Game Area */}
              <div className="flex justify-start pt-4" style={{ height: 'calc(100% - 80px)' }}>
                <div className="w-full space-y-4 px-4">{/* Reduced from space-y-6 to space-y-4 */}

                  {/* Lobby Phase */}
                  {gamePhase === 'lobby' && (
                    <div className="space-y-4">
                      {/* Enhanced Wager Selection */}
                      <div className="bg-bg-card border border-border rounded-lg p-4">
                        <h3 className="text-lg font-bold text-text-primary mb-3 font-audiowide">Create Match</h3>
                        
                        <div className="mb-4">
                          <label className="block text-text-secondary mb-2 text-sm">Wager Amount</label>
                          <div className="grid grid-cols-3 gap-2">
                            {[0.1, 0.25, 0.5, 1.0, 2.5, 5.0].map((amount) => (
                              <button
                                key={amount}
                                onClick={() => setWagerAmount(amount)}
                                className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                                  wagerAmount === amount 
                                    ? 'bg-accent-primary text-black' 
                                    : 'bg-bg-elevated text-text-primary hover:bg-bg-hover border border-border'
                                }`}
                              >
                                {amount} SOL
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="mb-4">
                          <div className="text-xs text-text-secondary">
                            Vault Balance: {formatSOL(vaultBalance)}
                          </div>
                        </div>

                        <button
                          onClick={createMatch}
                          disabled={loading || !socketConnected || vaultBalance < wagerAmount * 1000000000}
                          className="w-full bg-accent-primary text-black font-medium py-2 rounded hover:bg-accent-secondary disabled:opacity-50 transition-colors"
                        >
                          Create Match ({wagerAmount} SOL)
                        </button>
                      </div>

                      {/* Available Matches */}
                      <div className="bg-bg-card border border-border rounded-lg p-4">
                        <h3 className="text-lg font-bold text-text-primary mb-3 font-audiowide">Available Matches</h3>
                        
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {availableMatches.length === 0 ? (
                            <div className="text-center text-text-secondary py-6">
                              <div className="text-2xl mb-2">🎯</div>
                              <p className="text-sm">No matches available</p>
                              <p className="text-xs text-text-muted">Create a match to get started!</p>
                            </div>
                          ) : (
                            availableMatches.map((match) => (
                              <div key={match.id} className="bg-bg-elevated border border-border rounded p-3 flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <Avatar user={match.player1} size="sm" />
                                  <div>
                                    <div className="font-medium text-text-primary text-sm">{match.wager} SOL</div>
                                    <div className="text-xs text-text-secondary">
                                      vs {match.player1.username || match.player1.wallet.slice(0, 8)}...
                                    </div>
                                  </div>
                                </div>
                                <button
                                  onClick={() => joinMatch(match.id)}
                                  disabled={!socketConnected || gamePhase !== 'lobby'}
                                  className="px-3 py-1 bg-accent-primary text-black rounded text-sm font-medium hover:bg-accent-secondary disabled:opacity-50 transition-colors"
                                >
                                  Join
                                </button>
                              </div>
                            ))
                          )}
                        </div>

                        <div className="mt-3 text-center">
                          <button
                            onClick={loadAvailableMatches}
                            disabled={!socketConnected}
                            className="px-4 py-2 bg-bg-elevated text-text-primary border border-border rounded hover:bg-bg-hover text-sm transition-colors"
                          >
                            Refresh
                          </button>
                        </div>
                      </div>

                      {/* Quick Match Section */}
                      <CoinflipQuickMatch 
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

                      {/* Connection Status */}
                      {!socketConnected && (
                        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 text-center">
                          <p className="text-sm text-red-400">⚠️ Connecting to game server...</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Creating/Joining Phase */}
                  {(gamePhase === 'creating' || gamePhase === 'joining') && (
                    <div className="text-center py-8">
                      <div className="bg-bg-card border border-border rounded-lg p-6">
                        <div className="text-4xl mb-3">⏳</div>
                        <h2 className="text-lg font-bold text-text-primary mb-2 font-audiowide">
                          {gamePhase === 'creating' ? 'Creating Match...' : 'Joining Match...'}
                        </h2>
                        <p className="text-text-secondary text-sm">Please wait...</p>
                      </div>
                    </div>
                  )}

                  {/* Waiting for Opponent */}
                  {gamePhase === 'waiting' && (
                    <div className="text-center py-8">
                      <div className="bg-bg-card border border-border rounded-lg p-6">
                        <div className="text-4xl mb-3">👥</div>
                        <h2 className="text-lg font-bold text-text-primary mb-2 font-audiowide">Waiting for Opponent...</h2>
                        <p className="text-text-secondary text-sm mb-4">
                          Match created with {wagerAmount} SOL wager
                        </p>
                        <div className="flex space-x-3 justify-center">
                          <button 
                            onClick={cancelMatch} 
                            className="px-4 py-2 bg-bg-elevated text-text-primary border border-border rounded hover:bg-bg-hover text-sm transition-colors"
                          >
                            Cancel Match
                          </button>
                          <button 
                            onClick={loadAvailableMatches} 
                            className="px-4 py-2 bg-accent-primary text-black rounded hover:bg-accent-secondary text-sm transition-colors"
                          >
                            Refresh
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Playing Phase */}
                  {gamePhase === 'playing' && (
                    <div className="space-y-6">
                      {/* Professional Match Header */}
                      <div className="bg-bg-card border border-border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          {/* Left: Player Status */}
                          <div className="flex items-center space-x-3">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 text-sm font-bold transition-all ${
                              playerChoice ? 'border-green-500 bg-green-500/20 text-green-400' : 'border-amber-500 bg-amber-500/20 text-amber-400'
                            }`}>
                              {playerChoice ? '✓' : '⏳'}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-text-primary">You</div>
                            {playerChoice && (
                                <div className={`text-xs font-bold ${
                                  playerChoice === 'heads' ? 'text-orange-400' : 'text-blue-400'
                              }`}>
                                {playerChoice.toUpperCase()}
                              </div>
                            )}
                            </div>
                          </div>
                          
                          {/* Center: Match Info & Status */}
                          <div className="text-center">
                            <div className="flex items-center justify-center space-x-2 text-sm text-text-secondary mb-1">
                              <Avatar user={opponent || undefined} size="sm" />
                              <span>vs {opponent?.username || opponent?.wallet.slice(0, 8)}...</span>
                            </div>
                            <div className="text-xs text-accent-primary font-medium mb-1">
                              {currentMatch?.wager} SOL Wager
                            </div>
                            <div className="text-xs font-medium text-text-primary">
                              {!playerChoice ? 'Choose Heads or Tails' : 
                               !opponentHasChosen ? 'Waiting for opponent...' :
                               bothPlayersReady ? 'Both ready! Flipping coin...' : 'Both players ready!'}
                            </div>
                          </div>
                          
                          {/* Right: Opponent Status */}
                          <div className="flex items-center space-x-3">
                            <div>
                              <div className="text-sm font-medium text-text-primary text-right">Opponent</div>
                            {opponentChoice && (
                                <div className={`text-xs font-bold text-right ${
                                  opponentChoice === 'heads' ? 'text-orange-400' : 'text-blue-400'
                              }`}>
                                {opponentChoice.toUpperCase()}
                              </div>
                            )}
                            </div>
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 text-sm font-bold transition-all ${
                              opponentHasChosen ? 'border-green-500 bg-green-500/20 text-green-400' : 'border-amber-500 bg-amber-500/20 text-amber-400'
                            }`}>
                              {opponentHasChosen ? '✓' : '⏳'}
                            </div>
                          </div>
                          </div>
                        </div>

                      {/* Large 3D Choice Area */}
                      <div className="bg-bg-card border border-border rounded-lg p-8">
                          
                          {!playerChoice && (
                          <div className="text-center space-y-8">
                            <h2 className="text-2xl font-bold text-text-primary">Choose Your Side</h2>
                            <div className="flex justify-center space-x-12 py-8">
                              <CoinChoice3D
                                side="heads"
                                isSelected={false}
                                isHovered={headsHovered}
                                onClick={() => {
                                  playSoundIfEnabled('hover', 0.3);
                                  makeChoice('heads');
                                }}
                                onHover={setHeadsHovered}
                                  disabled={!!playerChoice}
                              />
                              
                              <CoinChoice3D
                                side="tails"
                                isSelected={false}
                                isHovered={tailsHovered}
                                onClick={() => {
                                  playSoundIfEnabled('hover', 0.3);
                                  makeChoice('tails');
                                }}
                                onHover={setTailsHovered}
                                  disabled={!!playerChoice}
                              />
                              </div>
                            </div>
                          )}

                          {playerChoice && (
                          <div className="text-center space-y-8">
                            <h2 className="text-2xl font-bold text-text-primary">Your Choice</h2>
                            
                            {/* Show selected 3D coin - bigger */}
                            <div className="flex justify-center py-8">
                              <div className="scale-125">
                                <CoinChoice3D
                                  side={playerChoice}
                                  isSelected={true}
                                  isHovered={false}
                                  onClick={() => {}}
                                  onHover={() => {}}
                                  disabled={true}
                                />
                                    </div>
                                    </div>
                              
                            {/* Status messages */}
                              {!opponentChoice && (
                              <div className="text-text-secondary text-lg text-center">
                                <div className="animate-pulse">⏳ Waiting for opponent to choose...</div>
                                </div>
                              )}
                              
                              {bothPlayersReady && (
                              <div className="text-accent-primary text-2xl text-center animate-pulse font-bold">
                                🪙 Get ready to flip!
                                </div>
                              )}
                            </div>
                          )}
                      </div>
                    </div>
                  )}

                  {/* Flipping Phase */}
                  {gamePhase === 'flipping' && (
                    <div className="space-y-4">
                      {/* Match Info */}
                      <div className="bg-bg-card border border-border rounded-lg p-4">
                        <div className="flex items-center justify-center space-x-2 text-sm text-text-secondary mb-2">
                          <Avatar user={opponent || undefined} size="sm" />
                          <span>vs {opponent?.username || opponent?.wallet.slice(0, 8)}... • {currentMatch?.wager} SOL</span>
                        </div>
                        
                        {/* Match Score */}
                        {gameResult && (
                          <div className="text-sm font-medium text-accent-primary text-center mb-2">
                            Round {gameResult.currentRound.roundNumber} • First to 3 wins
                          </div>
                        )}
                        
                        <div className="flex justify-center items-center space-x-6">
                          <div className="text-center">
                            <div className="text-lg font-bold text-accent-primary">{gameResult?.playerScore || 0}</div>
                            <div className="text-xs text-text-secondary">You</div>
                          </div>
                          <div className="text-text-secondary">-</div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-accent-primary">{gameResult?.opponentScore || 0}</div>
                            <div className="text-xs text-text-secondary">Opponent</div>
                          </div>
                        </div>
                      </div>

                      {/* Coin Animation */}
                      <div className="bg-bg-card border border-border rounded-lg p-6 text-center">
                        {/* Simple 3D Animation Only */}
                        <div className="mb-4 flex justify-center">
                          <div className="px-3 py-1 rounded text-xs bg-accent-primary text-white">
                            🎮 Simple 3D Animation
                          </div>
                        </div>
                        
                        {/* Simple 3D Animation with Result Overlay */}
                        <div className="relative w-full h-[400px]">
                          <CoinFlipSimple3D 
                          isFlipping={isFlipping}
                          result={flipResult}
                            onRenderReady={() => {
                              console.log('🎮 Simple 3D coin rendered and ready! Setting animationReady to true');
                              setAnimationReady(true);
                            }}
                          onAnimationComplete={() => {
                      console.log('🎬 3D Animation completed, transitioning game state...');
                      console.log('🔍 Animation completion debug:', {
                        gameResultExists: !!gameResult,
                        matchComplete: gameResult?.matchComplete,
                        playerScore: gameResult?.playerScore,
                        opponentScore: gameResult?.opponentScore,
                        matchWinner: gameResult?.matchWinner,
                        currentGamePhase: gamePhase
                      });
                      
                      // Stop the flipping animation
                      setIsFlipping(false);
                      
                      // ⚡ EXTENDED ABSORPTION TIME: Give players time to process the result
                      setTimeout(() => {
                      // 🔧 IMPROVED MATCH COMPLETION DETECTION
                      const isMatchComplete = gameResult?.matchComplete === true || 
                                            (gameResult && (gameResult.playerScore >= 3 || gameResult.opponentScore >= 3));
                      
                      if (isMatchComplete) {
                        console.log('🏁 Match complete detected, transitioning to finished state');
                        console.log('🏁 Match completion details:', {
                          matchComplete: gameResult?.matchComplete,
                          playerScore: gameResult?.playerScore,
                          opponentScore: gameResult?.opponentScore,
                          requiredWins: 3
                        });
                        
                        setGamePhase('finished');
                        
                        // 🎯 CRITICAL FIX: Confirm payout ready after animation completes
                        console.log('💰 Confirming payout ready after animation completion');
                        socketService.confirmPayoutReady(currentMatch!.id);
                        
                        // 🎵 MATCH COMPLETION SOUNDS
                        if (gameResult?.matchWinner === 'player') {
                          setTimeout(() => {
                            playSoundIfEnabled('match_win', 1.3);
                            // 🎵 PAYOUT SOUND - Most important psychological trigger
                            setTimeout(() => playSoundIfEnabled('payout', 1.5), 800);
                          }, 500);
                        } else {
                          setTimeout(() => playSoundIfEnabled('match_lose', 0.4), 500);
                        }
                      } else {
                        console.log('🔄 Round complete, transitioning to round-complete state');
                        console.log('🔄 Round completion details:', {
                          playerScore: gameResult?.playerScore,
                          opponentScore: gameResult?.opponentScore,
                          roundNumber: gameResult?.currentRound?.roundNumber
                        });
                        setGamePhase('round-complete');
                      }
                      }, 4000); // Extended to 4 seconds for proper absorption time
                            }}
                          />
                          
                          {/* Loading overlay - shows on top of animation while it initializes */}
                          {showLoadingState && (
                            <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center rounded-2xl z-10">
                              <div className="text-center">
                                <div className="text-6xl mb-4 animate-spin">🪙</div>
                                <div className="text-white text-lg font-bold mb-2">Loading 3D Coin...</div>
                                <div className="text-white/70 text-sm">Preparing realistic flip animation</div>
                                <div className="mt-4">
                                  <div className="w-32 h-1 bg-gray-700 rounded-full mx-auto overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse"></div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* ⚡ SEAMLESS RESULT OVERLAY - Shows immediately after coin settles */}
                          {!isFlipping && (
                            <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-gray-900/95 via-gray-800/95 to-black/95 flex items-center justify-center rounded-2xl z-20 animate-in fade-in duration-300">
                              <div className="text-center">
                                <div className="text-8xl mb-4">
                                  {(() => {
                                    if (!gameResult) return '🪙';
                                    return gameResult.currentRound.winner === 'player' ? '🎉' : 
                                           gameResult.currentRound.winner === 'opponent' ? '😞' : '🤝';
                                  })()}
                                </div>
                                
                                <h2 className="text-2xl font-bold text-white mb-4 font-audiowide">
                                  {(() => {
                                    if (!gameResult) return 'Coin Settled!';
                                    if (gameResult.currentRound.winner === 'player') {
                                      return 'Round Won!';
                                    } else if (gameResult.currentRound.winner === 'opponent') {
                                      return 'Round Lost!';
                                    } else {
                                      return 'Round Tied!';
                                    }
                                  })()}
                                </h2>
                                
                                {/* Show result details */}
                                {flipResult && (
                                  <div className="text-lg text-white/80 mb-4">
                                    The coin landed on{' '}
                                    <span className={`font-bold ${
                                      flipResult === 'heads' ? 'text-orange-400' : 'text-blue-400'
                                    }`}>
                                      {flipResult.toUpperCase()}
                                    </span>
                                  </div>
                                )}
                                
                                {!flipResult && (
                                  <div className="text-lg text-white/80 mb-4">
                                    Determining result...
                                  </div>
                                )}
                                
                                {/* Current Score - only show if we have game result */}
                                {gameResult && (
                                  <div className="p-4 bg-black/30 rounded-lg backdrop-blur-sm">
                                    <div className="text-sm font-medium text-white/70 mb-2">Match Score</div>
                                    <div className="flex justify-center items-center space-x-6">
                                      <div className="text-center">
                                        <div className="text-2xl font-bold text-accent-primary">{gameResult.playerScore}</div>
                                        <div className="text-xs text-white/60">You</div>
                                      </div>
                                      <div className="text-white/60">-</div>
                                      <div className="text-center">
                                        <div className="text-2xl font-bold text-accent-primary">{gameResult.opponentScore}</div>
                                        <div className="text-xs text-white/60">Opponent</div>
                                      </div>
                                    </div>
                                    <div className="text-xs text-white/50 mt-2">First to 3 wins!</div>
                                  </div>
                                )}
                                
                                <div className="text-white/60 text-sm mt-4 animate-pulse">
                                  {gameResult?.matchComplete ? 'Finalizing match...' : 'Absorbing the result...'}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="mt-4">
                          {gameResult && (
                            <div className="text-xs text-text-secondary">
                              {(() => {
                                if (gameResult.currentRound.winner === 'player') {
                                  return 'You won this round!';
                                } else if (gameResult.currentRound.winner === 'opponent') {
                                  return 'Opponent won this round!';
                                } else {
                                  return 'Round tied!';
                                }
                              })()}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Round Complete */}
                  {gamePhase === 'round-complete' && gameResult && (
                    <div className="text-center py-8">
                      <div className="bg-bg-card border border-border rounded-lg p-6">
                        {(() => {
                          // Safety check for match completion
                          const shouldBeFinished = gameResult.matchComplete === true || 
                                                 gameResult.playerScore >= 3 || 
                                                 gameResult.opponentScore >= 3;
                          
                          if (shouldBeFinished) {
                            setTimeout(() => setGamePhase('finished'), 100);
                          }
                          
                          return null;
                        })()}
                        
                        <div className="text-4xl mb-3">
                          {gameResult.currentRound.winner === 'player' ? '🎉' : 
                           gameResult.currentRound.winner === 'opponent' ? '😞' : '🤝'}
                        </div>
                        
                        <h2 className="text-lg font-bold text-text-primary mb-2 font-audiowide">
                          {(() => {
                            if (gameResult.currentRound.winner === 'player') {
                              return 'Round Won!';
                            } else if (gameResult.currentRound.winner === 'opponent') {
                              return 'Round Lost!';
                            } else {
                              return 'Round Tied!';
                            }
                          })()}
                        </h2>
                        
                        {/* Psychological messaging */}
                        {gameResult.currentRound.winner === 'player' && (
                          <div className="text-green-400 mb-3 text-xs">Nice call</div>
                        )}
                        {gameResult.currentRound.winner === 'opponent' && lossStreak <= 1 && (
                          <div className="text-blue-400 mb-3 text-xs">Close one</div>
                        )}
                        {gameResult.currentRound.winner === null && (
                          <div className="text-yellow-400 mb-3 text-xs">Even odds</div>
                        )}
                        
                        {/* Current Score */}
                        <div className="mb-4 p-3 bg-bg-elevated rounded-lg">
                          <div className="text-sm font-medium text-text-primary mb-2">Match Score</div>
                          <div className="flex justify-center items-center space-x-6">
                            <div className="text-center">
                              <div className="text-xl font-bold text-accent-primary">{gameResult.playerScore}</div>
                              <div className="text-xs text-text-secondary">You</div>
                            </div>
                            <div className="text-text-secondary">-</div>
                            <div className="text-center">
                              <div className="text-xl font-bold text-accent-primary">{gameResult.opponentScore}</div>
                              <div className="text-xs text-text-secondary">Opponent</div>
                            </div>
                          </div>
                          <div className="text-xs text-text-muted mt-2">First to 3 wins!</div>
                        </div>

                        <div className="text-text-secondary text-xs">
                          Next round in a moment...
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Game Finished */}
                  {gamePhase === 'finished' && gameResult && (
                    <div className="text-center py-8">
                      <div className="bg-bg-card border border-border rounded-lg p-6">
                        <div className="text-4xl mb-3">
                          {gameResult.matchWinner === 'player' ? '🏆' : '😞'}
                        </div>
                        <h2 className="text-lg font-bold text-text-primary mb-3 font-audiowide">
                          {gameResult.matchWinner === 'player' ? 'Match Victory!' : 'Match Defeat!'}
                        </h2>
                        
                        {/* Final Score */}
                        <div className="mb-4 p-3 bg-bg-elevated rounded-lg">
                          <div className="text-sm font-medium text-text-primary mb-2">Final Score</div>
                          <div className="flex justify-center items-center space-x-6">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-accent-primary">{gameResult.playerScore}</div>
                              <div className="text-xs text-text-secondary">You</div>
                            </div>
                            <div className="text-text-secondary">-</div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-accent-primary">{gameResult.opponentScore}</div>
                              <div className="text-xs text-text-secondary">Opponent</div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="mb-4">
                          <div className="text-lg font-bold text-accent-primary">
                            {gameResult.matchWinner === 'player' ? 
                              `+${((currentMatch?.wager || 0) * 2 * 0.935).toFixed(3)} SOL` : 
                              `-${currentMatch?.wager || 0} SOL`}
                          </div>
                          <div className="text-xs text-text-secondary">
                            {gameResult.matchWinner === 'player' ? 'Victory! You won the match!' : 'Great timing! Try again!'}
                          </div>
                        </div>
                        
                        {/* Show payout processing status for winners */}
                        {gameResult.matchWinner === 'player' && (
                          <div className="mb-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                            <div className="text-blue-400 text-xs mb-1">Processing Payout...</div>
                            <div className="text-xs text-blue-300/70">
                              Your winnings are being transferred to your session vault
                            </div>
                          </div>
                        )}
                        
                        {/* Payout Verification Button for Winners */}
                        {gameResult.matchWinner === 'player' && currentMatch && (
                          <div className="mb-4">
                            <PayoutVerificationButton 
                              matchId={currentMatch.id}
                              isWinner={true}
                              className="w-full"
                            />
                          </div>
                        )}
                        
                        {/* Psychological replay triggers */}
                        {gameResult.matchWinner === 'player' && winStreak >= 2 && (
                          <div className="mb-4 p-2 bg-green-900/10 border border-green-800/30 rounded-lg">
                            <div className="text-green-400 text-xs mb-1">Great session!</div>
                            <div className="text-xs text-green-300/70">
                              {winStreak} wins - you&apos;re on fire! 🔥
                            </div>
                          </div>
                        )}
                        
                        {gameResult.matchWinner === 'opponent' && lossStreak <= 2 && (
                          <div className="mb-4 p-2 bg-blue-900/10 border border-blue-800/30 rounded-lg">
                            <div className="text-blue-400 text-xs mb-1">Tough break</div>
                            <div className="text-xs text-blue-300/70">
                              These happen in coin flip
                            </div>
                          </div>
                        )}

                        <div className="flex space-x-3 justify-center">
                          <Button 
                            onClick={returnToLobby} 
                            onMouseEnter={() => playSoundIfEnabled('hover', 0.3)}
                            className="px-4 py-2 bg-accent-primary text-black rounded hover:bg-accent-secondary text-sm transition-colors"
                          >
                            {gameResult.matchWinner === 'player' ? 'Play Again' : 'Try Again'}
                          </Button>
                          <Button 
                            onClick={() => router.push('/classics')} 
                            onMouseEnter={() => playSoundIfEnabled('hover', 0.3)}
                            className="px-4 py-2 bg-bg-elevated text-text-primary border border-border rounded hover:bg-bg-hover text-sm transition-colors"
                          >
                            Other Games
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Payout Complete - End Screen */}
                  {gamePhase === 'payout-complete' && gameResult && (
                    <div className="text-center py-8">
                      <div className="bg-bg-card border border-border rounded-lg p-6">
                        
                        {/* Payout Success */}
                        {payoutStatus === 'completed' && (
                          <>
                            <div className="text-4xl mb-3">💰</div>
                            <h2 className="text-lg font-bold text-green-400 mb-3 font-audiowide">
                              Payout Successful!
                            </h2>
                            
                            <div className="mb-4 p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
                              <div className="text-green-400 text-sm mb-2">
                                +{((currentMatch?.wager || 0) * 2 * 0.935).toFixed(3)} SOL
                              </div>
                              <div className="text-xs text-green-300/70 mb-2">
                                Transferred to your session vault
                              </div>
                              {payoutData?.transactionHash && (
                                <div className="text-xs text-green-300/50">
                                  TX: {payoutData.transactionHash.slice(0, 8)}...{payoutData.transactionHash.slice(-8)}
                                </div>
                              )}
                            </div>
                          </>
                        )}

                        {/* Payout Failed */}
                        {payoutStatus === 'failed' && (
                          <>
                            <div className="text-4xl mb-3">❌</div>
                            <h2 className="text-lg font-bold text-red-400 mb-3 font-audiowide">
                              Payout Failed
                            </h2>
                            
                            <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                              <div className="text-red-400 text-xs mb-2">
                                {payoutData?.error || 'Transaction failed'}
                              </div>
                              <div className="text-xs text-red-300/70">
                                Please contact support if this issue persists
                              </div>
                            </div>
                          </>
                        )}

                        {/* Final Match Results */}
                        <div className="mb-4 p-3 bg-bg-elevated rounded-lg">
                          <div className="text-sm font-medium text-text-primary mb-2">Final Match</div>
                          <div className="flex justify-center items-center space-x-6">
                            <div className="text-center">
                              <div className="text-xl font-bold text-accent-primary">{gameResult.playerScore}</div>
                              <div className="text-xs text-text-secondary">You</div>
                            </div>
                            <div className="text-text-secondary">-</div>
                            <div className="text-center">
                              <div className="text-xl font-bold text-accent-primary">{gameResult.opponentScore}</div>
                              <div className="text-xs text-text-secondary">Opponent</div>
                            </div>
                          </div>
                        </div>

                        {/* Psychological replay triggers */}
                        {gameResult.matchWinner === 'player' && winStreak >= 2 && (
                          <div className="mb-4 p-2 bg-green-900/10 border border-green-800/30 rounded-lg">
                            <div className="text-green-400 text-xs mb-1">Great session!</div>
                            <div className="text-xs text-green-300/70">
                              {winStreak} wins - you&apos;re on fire! 🔥
                            </div>
                          </div>
                        )}

                        {/* End Screen Actions */}
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 gap-2">
                            <Button 
                              onClick={() => {
                                // Reset all states and return to lobby for rematch
                                setGamePhase('lobby');
                                setPayoutStatus(null);
                                setPayoutData(null);
                                setGameResult(null);
                                setCurrentMatch(null);
                                setOpponent(null);
                                setPlayerChoice(null);
                                setOpponentChoice(null);
                                setBothPlayersReady(false);
                                setFlipResult(null);
                                setRoundResult(null);
                                setError(null);
                                loadAvailableMatches();
                              }}
                              onMouseEnter={() => playSoundIfEnabled('hover', 0.3)}
                              className="w-full px-4 py-2 bg-accent-primary text-black rounded hover:bg-accent-secondary text-sm transition-colors"
                            >
                              🎯 Rematch
                            </Button>
                            
                            <Button 
                              onClick={() => {
                                setGamePhase('lobby');
                                setPayoutStatus(null);
                                setPayoutData(null);
                                setGameResult(null);
                                setCurrentMatch(null);
                                setOpponent(null);
                                setPlayerChoice(null);
                                setOpponentChoice(null);
                                setBothPlayersReady(false);
                                setFlipResult(null);
                                setRoundResult(null);
                                setError(null);
                                loadAvailableMatches();
                              }}
                              onMouseEnter={() => playSoundIfEnabled('hover', 0.3)}
                              className="w-full px-4 py-2 bg-bg-elevated text-text-primary border border-border rounded hover:bg-bg-hover text-sm transition-colors"
                            >
                              🔍 Find Match
                            </Button>
                            
                            <Button 
                              onClick={() => router.push('/games')} 
                              onMouseEnter={() => playSoundIfEnabled('hover', 0.3)}
                              className="w-full px-4 py-2 bg-bg-elevated text-text-primary border border-border rounded hover:bg-bg-hover text-sm transition-colors"
                            >
                              🏠 Home
                            </Button>
                          </div>

                          <div className="text-xs text-text-muted text-center">
                            Thanks for playing PV3! 🎮
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </div>

              {/* 5-Tab System */}
              <div className="border-t border-border">
                <div className="flex">
                  {[
                    { id: 'overview', icon: '🎮', label: 'Game Overview' },
                    { id: 'chat', icon: '💬', label: 'Chat' },
                    { id: 'settings', icon: '⚙️', label: 'Settings' },
                    { id: 'stats', icon: '📊', label: 'Stats' },
                    { id: 'bookmark', icon: '⭐', label: 'Bookmark' }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActivePanel(activePanel === tab.id ? null : tab.id as any)}
                      className={`flex-1 p-3 text-center border-r border-border last:border-r-0 transition-colors ${
                        activePanel === tab.id 
                          ? 'bg-accent-primary text-black' 
                          : 'bg-bg-elevated text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                      }`}
                    >
                      <div className="text-lg mb-1">{tab.icon}</div>
                      <div className="text-xs font-medium">{tab.label}</div>
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                {activePanel && (
                  <div className="bg-bg-card border-t border-border" style={{ height: '500px' }}>
                    
                    {/* Game Overview Panel */}
                    {activePanel === 'overview' && (
                      <div className="p-4 h-full overflow-y-auto">
                        <h3 className="text-lg font-bold text-text-primary mb-4">🪙 Coin Flip Rules</h3>
                        
                        {/* Game Cover Video */}
                        <div className="mb-4 rounded-lg overflow-hidden bg-bg-elevated">
                          <video 
                            autoPlay 
                            muted 
                            loop 
                            className="w-full h-32 object-cover"
                          >
                            <source src="/game-covers/coinflip.mp4" type="video/mp4" />
                          </video>
                        </div>

                        <div className="space-y-3 text-sm">
                          <div className="bg-bg-elevated rounded-lg p-3">
                            <h4 className="font-semibold text-text-primary mb-2">How to Play</h4>
                            <ul className="text-text-secondary space-y-1">
                              <li>• Choose heads or tails before the coin flip</li>
                              <li>• First player to win 3 rounds wins the match</li>
                              <li>• Winner takes 93.5% of the total pot (6.5% house edge)</li>
                              <li>• Each round is provably fair and verifiable</li>
                            </ul>
                          </div>

                          <div className="bg-bg-elevated rounded-lg p-3">
                            <h4 className="font-semibold text-text-primary mb-2">Current Status</h4>
                            <div className="text-text-secondary space-y-1">
                              <div>Phase: <span className="text-accent-primary">{gamePhase}</span></div>
                              {currentMatch && (
                                <>
                                  <div>Wager: <span className="text-accent-primary">{currentMatch.wager} SOL</span></div>
                                  {gameResult && (
                                    <div>Score: <span className="text-accent-primary">{gameResult.playerScore} - {gameResult.opponentScore}</span></div>
                                  )}
                                </>
                              )}
                              <div>Connection: <span className={socketConnected ? 'text-green-400' : 'text-red-400'}>
                                {socketConnected ? 'Connected' : 'Disconnected'}
                              </span></div>
                            </div>
                          </div>

                          <div className="bg-bg-elevated rounded-lg p-3">
                            <h4 className="font-semibold text-text-primary mb-2">Strategy Tips</h4>
                            <ul className="text-text-secondary space-y-1">
                              <li>• Each flip is independent - past results don&apos;t affect future flips</li>
                              <li>• True 50/50 odds on every single flip</li>
                              <li>• Manage your bankroll carefully</li>
                              <li>• Set win/loss limits before playing</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Chat Panel */}
                    {activePanel === 'chat' && (
                      <ChatPanel 
                        gameType="coinflip"
                        gamePhase={gamePhase}
                        matchId={currentMatch?.id}
                        className="h-full"
                      />
                    )}

                    {/* Settings Panel */}
                    {activePanel === 'settings' && (
                      <div className="p-4 h-full overflow-y-auto">
                        <h3 className="text-lg font-bold text-text-primary mb-4">⚙️ Game Settings</h3>
                        
                        <div className="space-y-4">
                          <div className="bg-bg-elevated rounded-lg p-3">
                            <h4 className="font-semibold text-text-primary mb-3">Audio Settings</h4>
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-text-secondary text-sm">Sound Effects</span>
                                <button
                                  onClick={() => setSoundEnabled(!soundEnabled)}
                                  className={`w-12 h-6 rounded-full transition-colors ${
                                    soundEnabled ? 'bg-accent-primary' : 'bg-bg-hover'
                                  }`}
                                >
                                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                                    soundEnabled ? 'translate-x-6' : 'translate-x-0.5'
                                  }`} />
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="bg-bg-elevated rounded-lg p-3">
                            <h4 className="font-semibold text-text-primary mb-3">Display Settings</h4>
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-text-secondary text-sm">Animations</span>
                                <button
                                  className="w-12 h-6 rounded-full bg-accent-primary"
                                >
                                  <div className="w-5 h-5 bg-white rounded-full translate-x-6" />
                                </button>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-text-secondary text-sm">Auto-scroll Chat</span>
                                <button
                                  className="w-12 h-6 rounded-full bg-accent-primary"
                                >
                                  <div className="w-5 h-5 bg-white rounded-full translate-x-6" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Stats Panel */}
                    {activePanel === 'stats' && (
                      <div className="p-4 h-full overflow-y-auto">
                        <h3 className="text-lg font-bold text-text-primary mb-4">📊 Your Statistics</h3>
                        
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-bg-elevated rounded-lg p-3 text-center">
                              <div className="text-2xl font-bold text-accent-primary">{winStreak}</div>
                              <div className="text-xs text-text-secondary">Current Win Streak</div>
                            </div>
                            <div className="bg-bg-elevated rounded-lg p-3 text-center">
                              <div className="text-2xl font-bold text-text-primary">{totalGamesPlayed}</div>
                              <div className="text-xs text-text-secondary">Games Played</div>
                            </div>
                          </div>

                          <div className="bg-bg-elevated rounded-lg p-3">
                            <h4 className="font-semibold text-text-primary mb-3">Choice Distribution</h4>
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-text-secondary text-sm">Heads</span>
                                <div className="flex items-center space-x-2">
                                  <div className="w-24 h-2 bg-bg-hover rounded-full">
                                    <div className="h-full bg-accent-primary rounded-full" style={{ width: '60%' }} />
                                  </div>
                                  <span className="text-text-primary text-sm">60%</span>
                                </div>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-text-secondary text-sm">Tails</span>
                                <div className="flex items-center space-x-2">
                                  <div className="w-24 h-2 bg-bg-hover rounded-full">
                                    <div className="h-full bg-accent-secondary rounded-full" style={{ width: '40%' }} />
                                  </div>
                                  <span className="text-text-primary text-sm">40%</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="bg-bg-elevated rounded-lg p-3">
                            <h4 className="font-semibold text-text-primary mb-3">Session Summary</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-text-secondary">Win Rate</span>
                                <span className="text-green-400">52.3%</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-text-secondary">Longest Streak</span>
                                <span className="text-text-primary">5 wins</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-text-secondary">Total Wagered</span>
                                <span className="text-text-primary">12.5 SOL</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Bookmark Panel */}
                    {activePanel === 'bookmark' && (
                      <div className="p-4 h-full overflow-y-auto">
                        <h3 className="text-lg font-bold text-text-primary mb-4">⭐ Bookmarks</h3>
                        
                        <div className="text-center py-8">
                          <div className="text-4xl mb-3">📌</div>
                          <p className="text-text-secondary text-sm mb-4">Bookmark feature coming soon!</p>
                          <p className="text-text-muted text-xs">Save your favorite matches and strategies</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

          </div>
        </main>
        
        {/* 🎵 SOUND TOGGLE BUTTON */}
        <div className="fixed bottom-4 right-4 z-40">
          <div className="flex flex-col space-y-2">
            {/* Test Sound Button (for debugging) */}
            {process.env.NODE_ENV === 'development' && (
              <Button
                onClick={() => {
                  console.log('🧪 Testing sound system...');
                  playSoundIfEnabled('choice_select');
                }}
                className="w-12 h-12 rounded-full bg-yellow-500 hover:bg-yellow-600 text-white text-xs"
                title="Test Sound"
              >
                🧪
              </Button>
            )}
            
            {/* Main Sound Toggle */}
            <Button
              onClick={() => {
                console.log(`🎵 Sound toggle: ${soundEnabled ? 'OFF' : 'ON'}`);
                setSoundEnabled(!soundEnabled);
              }}
              onMouseEnter={() => playSoundIfEnabled('hover', 0.3)}
              className={`w-12 h-12 rounded-full shadow-lg transition-all ${
                soundEnabled 
                  ? 'bg-accent-primary hover:bg-accent-secondary text-white' 
                  : 'bg-background-secondary hover:bg-background-tertiary text-text-secondary border border-border-primary'
              }`}
              title={soundEnabled ? 'Disable Sound' : 'Enable Sound'}
            >
              {soundEnabled ? '🔊' : '🔇'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 