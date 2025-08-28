'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthContext';
import { usePV3 } from '@/hooks/usePV3';
import { Button } from '@/components/ui/button';
import { matchService, type Match } from '@/services/matchService';
import socketService from '@/services/socketService';
import Sidebar from '@/components/Sidebar';
import PageHeader from '@/components/PageHeader';
import Avatar from '@/components/Avatar';
import RecentWins from '@/components/RecentWins';
import { audioSprite } from '@/lib/audioSprite';
import RealisticDiceRoller from '@/components/games/dice/RealisticDiceRoller';

// 🚀 PHASE 2: Dynamic import for realistic 3D dice 
// Load only when user actually plays the game
const DiceBoxLoader = dynamic(() => import('@/components/games/dice/RealisticDiceRoller'), {
  loading: () => (
    <div className="w-full h-64 bg-gradient-to-br from-green-900 to-blue-900 rounded-lg flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">🎲</div>
        <div className="text-white font-semibold">Loading Realistic 3D Dice...</div>
        <div className="text-sm text-gray-300 mt-2">Generating dice with proper pips...</div>
      </div>
    </div>
  ),
  ssr: false
});

// Remove the heavy 3D dice initialization from the main component
// This will be handled by the RealisticDiceRoller component

export default function DiceDuelPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { connected, publicKey, formatSOL, vaultBalance, loading } = usePV3();
  
  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Game state  
  const [gamePhase, setGamePhase] = useState<'lobby' | 'waiting' | 'build-selection' | 'playing' | 'rolling' | 'revealing' | 'completed'>('lobby');
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);
  const [availableMatches, setAvailableMatches] = useState<Match[]>([]);
  const [selectedWager, setSelectedWager] = useState(0.1);
  
  // Match creation/joining states
  const [isCreatingMatch, setIsCreatingMatch] = useState(false);
  const [isJoiningMatch, setIsJoiningMatch] = useState(false);
  
  // Dice game states
  const [canRoll, setCanRoll] = useState(false);
  const [playerRoll, setPlayerRoll] = useState<number | null>(null);
  const [opponentRoll, setOpponentRoll] = useState<number | null>(null);
  const [roundWinner, setRoundWinner] = useState<'player' | 'opponent' | 'tie' | null>(null);
  const [playerScore, setPlayerScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [currentRound, setCurrentRound] = useState(1);
  const [matchComplete, setMatchComplete] = useState(false);
  const [matchWinner, setMatchWinner] = useState<'player' | 'opponent' | null>(null);
  
  // 🚀 RPG DUEL: Build Selection System
  const [selectedBuild, setSelectedBuild] = useState<string | null>(null);
  const [opponentBuild, setOpponentBuild] = useState<string | null>(null);
  const [showBuildSelection, setShowBuildSelection] = useState(false);
  const [playerBuildLocked, setPlayerBuildLocked] = useState(false);
  const [opponentBuildLocked, setOpponentBuildLocked] = useState(false);
  const [waitingForOpponentBuild, setWaitingForOpponentBuild] = useState(false);

  // 🎲 RPG Build Configurations
  const rpgBuilds = {
    assassin: {
      name: 'Assassin',
      emoji: '🗡️',
      dice: '3d4',
      description: 'Consistent damage • Low variance',
      tooltip: 'Rolls 3 four-sided dice (3-12 damage). Most consistent build with predictable outcomes.',
      avgDamage: 7.5,
      minDamage: 3,
      maxDamage: 12,
      color: 'text-purple-400',
      bgColor: 'bg-purple-900/20',
      borderColor: 'border-purple-500'
    },
    warrior: {
      name: 'Warrior',
      emoji: '⚔️',
      dice: '2d6+2',
      description: 'Balanced approach • Reliable',
      tooltip: 'Rolls 2 six-sided dice plus 2 bonus (4-14 damage). Balanced risk and consistency.',
      avgDamage: 9,
      minDamage: 4,
      maxDamage: 14,
      color: 'text-blue-400',
      bgColor: 'bg-blue-900/20',
      borderColor: 'border-blue-500'
    },
    berserker: {
      name: 'Berserker',
      emoji: '🪓',
      dice: '1d12+1',
      description: 'High risk • High reward',
      tooltip: 'Rolls 1 twelve-sided die plus 1 bonus (2-13 damage). High variance, big swings.',
      avgDamage: 7.5,
      minDamage: 2,
      maxDamage: 13,
      color: 'text-red-400',
      bgColor: 'bg-red-900/20',
      borderColor: 'border-red-500'
    },
    mage: {
      name: 'Mage',
      emoji: '🔮',
      dice: '1d20',
      description: 'Pure chaos • Maximum variance',
      tooltip: 'Rolls 1 twenty-sided die (1-20 damage). Ultimate risk vs reward - anything can happen!',
      avgDamage: 10.5,
      minDamage: 1,
      maxDamage: 20,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-900/20',
      borderColor: 'border-yellow-500'
    }
  };
  
  // WebSocket states
  const [socketConnected, setSocketConnected] = useState(false);
  const [opponentConnected, setOpponentConnected] = useState(false);
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  
  // 3D dice state
  const diceContainerRef = useRef<HTMLDivElement>(null);
  const diceBoxRef = useRef<any>(null);
  const [diceInitialized, setDiceInitialized] = useState(false);
  


  // 🚀 UNIVERSAL SYSTEM: Floating panel states - Exact Crash/Mines style
  const [openPanels, setOpenPanels] = useState({
    overview: false,
    chat: false,
    settings: false,
    stats: false,
    favorites: false
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
    favorites: 260
  });
  const [resizingPanel, setResizingPanel] = useState<string | null>(null);

  // 🚀 PERFORMANCE: Audio effects using optimized sprite system
  const playSound = (soundName: string) => {
    audioSprite.play(soundName);
  };

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

  // 🔄 SYNCHRONIZED BUILD SELECTION: Transition to playing when both players have confirmed builds
  useEffect(() => {
    if (gamePhase === 'build-selection' && playerBuildLocked && opponentBuildLocked) {
      console.log('🎯 SYNCHRONIZED: Both players have confirmed their builds - transitioning to playing phase!');
      setGamePhase('playing');
      setCanRoll(true);
      setWaitingForOpponentBuild(false);
      playSound('victory');
    }
  }, [gamePhase, playerBuildLocked, opponentBuildLocked]);

  // WebSocket connection and event handlers
  useEffect(() => {
    if (!user) return;

    const initSocket = async () => {
      try {
        if (!socketService.isConnected()) {
          await socketService.connect();
        }
        setSocketConnected(true);
        console.log('🔌 Connected to game server for dice duel');

        // Set up dice duel specific event handlers
        socketService.onDiceResult(handleDiceResult);
        socketService.onOpponentRolled(handleOpponentRolled);
        socketService.onDiceGameState(handleDiceGameState);
        socketService.onPlayerJoined(handlePlayerJoined);
        socketService.onMatchState(handleMatchState);
        socketService.onPlayerDisconnected(handlePlayerDisconnected);
        socketService.onMatchCompleted(handleMatchCompleted);

        // Add debug logging for all events
        socketService.on('match_state', (data) => {
          console.log('🔍 DEBUG: Received match_state event:', data);
          handleMatchState(data as { match: any; connectedPlayers: number });
        });

        socketService.on('player_joined', (data) => {
          console.log('🔍 DEBUG: Received player_joined event:', data);
          handlePlayerJoined(data as { playerId: string; matchId: string });
        });

        // 🔄 SYNCHRONIZED BUILD SELECTION: Handle opponent build confirmations
        socketService.on('opponent_build_confirmed', (data: any) => {
          console.log('🗡️ Opponent confirmed their build:', data);
          setOpponentBuildLocked(true);
          if (data.build) {
            setOpponentBuild(data.build);
          }
        });

      } catch (error) {
        console.error('Failed to connect to game server:', error);
        setSocketConnected(false);
      }
    };

    initSocket();

    return () => {
      // Clean up event handlers
      socketService.offDiceDuelEvents();
      socketService.offPlayerJoined(handlePlayerJoined);
      socketService.offMatchState(handleMatchState);
      socketService.offPlayerDisconnected(handlePlayerDisconnected);
      socketService.offMatchCompleted(handleMatchCompleted);
      socketService.off('match_state');
      socketService.off('player_joined');
      socketService.off('opponent_build_confirmed');
    };
  }, [user]);

  // WebSocket Event Handlers
  const handleDiceResult = useCallback((data: {
    matchId: string;
    roundNumber: number;
    playerDice: number;
    opponentDice: number;
    winner: 'player' | 'opponent' | 'tie';
    playerScore: number;
    opponentScore: number;
    matchComplete: boolean;
    matchWinner?: 'player' | 'opponent';
    animationStartTime: number;
    animationDuration: number; // 🎰 CASINO-GRADE: Now required from backend
    timestamp: number;
    // 🎲 RPG BUILD INFO: Build data from backend
    playerBuild?: { build: string; dice: string; buildName: string } | null;
    opponentBuild?: { build: string; dice: string; buildName: string } | null;
  }) => {
    console.log('🎲 🔥 SYNCHRONIZED RPG DICE RESULT RECEIVED:', data);
    console.log(`🎯 Animation starts at: ${data.animationStartTime}, duration: ${data.animationDuration}ms`);
    console.log(`🎯 Player damage: ${data.playerDice}, Opponent damage: ${data.opponentDice}`);
    console.log(`⚔️ Player build: ${selectedBuild}, Opponent build: ${opponentBuild}`);
    
    // Calculate delay to synchronized animation start
    const currentTime = Date.now();
    const delay = Math.max(0, data.animationStartTime - currentTime);
    
    console.log(`⏰ Current time: ${currentTime}, Start time: ${data.animationStartTime}, Delay: ${delay}ms`);
    
    // STEP 1: Wait for synchronized animation start time
    setTimeout(() => {
      console.log('🎬 STARTING SYNCHRONIZED RPG DICE ANIMATION!');
      setGamePhase('rolling');
      setWaitingForOpponent(false);
      
      // 🎲 🎰 START SYNCHRONIZED 3D RPG DICE ANIMATION
      // 🔧 CRITICAL FIX: Check dice box directly instead of React state flag (avoids async timing issues)
      if (diceBoxRef.current && typeof diceBoxRef.current.rollWithNotation === 'function') {
        console.log(`🎲 🎰 ROLLING RPG 3D DICE: Player=${data.playerDice}, Opponent=${data.opponentDice}`);
        
        // 🔧 ENHANCED: Use RPG dice notation from backend (more reliable than frontend state)
        const playerBuildData = data.playerBuild || (selectedBuild ? rpgBuilds[selectedBuild as keyof typeof rpgBuilds] : null);
        const opponentBuildData = data.opponentBuild || null;
        
        // Create RPG dice notation with predetermined results from backend builds
        const playerDiceNotation = playerBuildData ? `${playerBuildData.dice}@${data.playerDice}` : `1d6@${data.playerDice}`;
        const opponentDiceNotation = opponentBuildData ? `${opponentBuildData.dice}@${data.opponentDice}` : `1d6@${data.opponentDice}`;
        
        console.log(`🎲 RPG Dice Notations: Player=${playerDiceNotation}, Opponent=${opponentDiceNotation}`);
        // Get build names safely
        const playerBuildName = data.playerBuild?.buildName || (playerBuildData as any)?.name || 'Basic';
        const opponentBuildName = data.opponentBuild?.buildName || 'Basic';
        console.log(`🎲 Build Info: Player=${playerBuildName}, Opponent=${opponentBuildName}`);
        
        // 🔧 SYNC OPPONENT BUILD: Update opponent build state from backend data
        if (data.opponentBuild && data.opponentBuild.build !== opponentBuild) {
          setOpponentBuild(data.opponentBuild.build);
          console.log(`🔄 Updated opponent build from backend: ${opponentBuildName}`);
        }
        
        // 🎰 CASINO-GRADE: Roll both dice simultaneously with RPG notation and predetermined results
        const animationCompletedAt = Date.now();
        const combinedNotation = `${playerDiceNotation},${opponentDiceNotation}`;
        
        diceBoxRef.current.rollWithNotation(combinedNotation).then((results: any) => {
          const actualAnimationDuration = Date.now() - animationCompletedAt;
          console.log('🎲 ✅ RPG 3D DICE ANIMATION COMPLETED SUCCESSFULLY in', actualAnimationDuration, 'ms');
          console.log('🎯 Final RPG damage values:', results.map((r: any) => r.value));
          
          // 🎰 SMART TIMING: If animation completed early, adjust the reveal timing
          const remainingDelay = Math.max(2000, data.animationDuration - actualAnimationDuration);
          console.log(`🎯 Animation took ${actualAnimationDuration}ms, backend expects ${data.animationDuration}ms - adjusting reveal delay to ${remainingDelay}ms`);
          
          // 🎰 PROFESSIONAL: Give players 2-3 seconds to absorb the settled dice before revealing results
          setTimeout(() => {
            console.log('🎯 Revealing dice results after optimal timing!');
            setPlayerRoll(data.playerDice);
            setOpponentRoll(data.opponentDice);
            setRoundWinner(data.winner);
            setPlayerScore(data.playerScore);
            setOpponentScore(data.opponentScore);
            setCurrentRound(data.roundNumber + 1);
            setMatchComplete(data.matchComplete);
            setMatchWinner(data.matchWinner || null);
            setGamePhase('revealing');
          
            // Show results for 5 seconds (like real casinos), then prepare for next round
            setTimeout(() => {
              if (data.matchComplete) {
                setGamePhase('completed');
                console.log('🏆 Match completed!');
              } else {
                // 🎲 CRITICAL FIX: Clear dice system between rounds to prevent freezing
                if (diceBoxRef.current && typeof diceBoxRef.current.clear === 'function') {
                  console.log('🎲 🧹 CLEARING DICE SYSTEM for next round to prevent freezing!');
                  diceBoxRef.current.clear();
                }
                
                // Prepare for next round
                setGamePhase('playing');
                setCanRoll(true);
                setPlayerRoll(null);
                setOpponentRoll(null);
                setRoundWinner(null);
                console.log('🔄 Ready for next round!');
              }
            }, 5000); // 5 seconds to absorb the results
          }, remainingDelay);
          
        }).catch((error: any) => {
          console.error('❌ RPG 3D DICE ANIMATION ERROR:', error);
          // 🛡️ FALLBACK: Continue with original timing even if animation fails
          setTimeout(() => {
            console.log('🎯 Revealing dice results (animation failed, using fallback timing)');
            setPlayerRoll(data.playerDice);
            setOpponentRoll(data.opponentDice);
            setRoundWinner(data.winner);
            setPlayerScore(data.playerScore);
            setOpponentScore(data.opponentScore);
            setCurrentRound(data.roundNumber + 1);
            setMatchComplete(data.matchComplete);
            setMatchWinner(data.matchWinner || null);
            setGamePhase('revealing');
          
            setTimeout(() => {
              if (data.matchComplete) {
                setGamePhase('completed');
                console.log('🏆 Match completed!');
              } else {
                setGamePhase('playing');
                setCanRoll(true);
                setPlayerRoll(null);
                setOpponentRoll(null);
                setRoundWinner(null);
                console.log('🔄 Ready for next round!');
              }
            }, 5000);
          }, data.animationDuration);
        });
      } else {
        console.error('❌ CRITICAL: 3D DICE NOT INITIALIZED!');
        console.error('diceBoxRef.current:', diceBoxRef.current);
        console.error('diceInitialized:', diceInitialized);
        console.log('🎰 RPG game continues with logic only (no visual dice)');
        
        // 🛡️ FALLBACK: If dice not initialized, use original timing
        setTimeout(() => {
          console.log('🎯 Revealing dice results (no 3D dice available, using fallback timing)');
          setPlayerRoll(data.playerDice);
          setOpponentRoll(data.opponentDice);
          setRoundWinner(data.winner);
          setPlayerScore(data.playerScore);
          setOpponentScore(data.opponentScore);
          setCurrentRound(data.roundNumber + 1);
          setMatchComplete(data.matchComplete);
          setMatchWinner(data.matchWinner || null);
          setGamePhase('revealing');
        
          // Show results for 5 seconds (like real casinos), then prepare for next round
          setTimeout(() => {
            if (data.matchComplete) {
              setGamePhase('completed');
              console.log('🏆 Match completed!');
            } else {
              // 🎲 CRITICAL FIX: Clear dice system between rounds to prevent freezing
              if (diceBoxRef.current && typeof diceBoxRef.current.clear === 'function') {
                console.log('🎲 🧹 CLEARING DICE SYSTEM for next round to prevent freezing!');
                diceBoxRef.current.clear();
              }
              
              // Prepare for next round
              setGamePhase('playing');
              setCanRoll(true);
              setPlayerRoll(null);
              setOpponentRoll(null);
              setRoundWinner(null);
              console.log('🔄 Ready for next round!');
            }
          }, 5000); // 5 seconds to absorb the results
        }, data.animationDuration); // 🎰 Use exact casino-grade timing from backend
      }
      
    }, delay);
  }, []);

  const handleOpponentRolled = useCallback((data: {
    matchId: string;
    playerId: string;
    timestamp: number;
  }) => {
    console.log('🎲 Opponent has rolled, waiting for results...');
    setWaitingForOpponent(false);
    // Both players have rolled, waiting for results
  }, []);

  const handleDiceGameState = useCallback((data: {
    matchId: string;
    gameState: any;
    playerScore: number;
    opponentScore: number;
    timestamp: number;
  }) => {
    console.log('🎲 Game state update:', data);
    setPlayerScore(data.playerScore);
    setOpponentScore(data.opponentScore);
    if (data.gameState?.currentRound) {
      setCurrentRound(data.gameState.currentRound);
    }
  }, []);

  const handlePlayerJoined = useCallback((data: { playerId: string; matchId: string }) => {
    console.log('👤 Player joined:', data);
    setOpponentConnected(true);
    
    // 🔄 SYNCHRONIZED BUILD SELECTION: Don't immediately transition to playing
    // Let the match_state event handle synchronized phase transitions
    console.log('🎯 Player joined - waiting for synchronized match state update for build selection...');
  }, []);

  const handleMatchState = useCallback((data: { match: any; connectedPlayers: number }) => {
    console.log('🎮 🔥 CRITICAL MATCH STATE UPDATE:', data);
    console.log(`🎯 Current phase: ${gamePhase}, Match status: ${data.match?.status}, Players: ${data.connectedPlayers}`);
    
    // Update match data
    if (data.match) {
      setCurrentMatch(data.match);
      
      // 🔄 SYNCHRONIZED BUILD SELECTION: Both players enter build-selection together
      if (data.match.status === 'in_progress' && data.match.player2) {
        setGamePhase(prevPhase => {
          console.log(`🔄 🎯 SYNCHRONIZED PHASE TRANSITION: ${prevPhase} -> build-selection (Match: ${data.match.status}, Players: ${data.connectedPlayers})`);
          
          // ✅ CRITICAL FIX: Only transition if we're in waiting phase
          if (prevPhase === 'waiting') {
            setOpponentConnected(true);
            console.log('🎯 ✅ SYNCHRONIZED: Both players connected - transitioning to build selection!');
            return 'build-selection';
          } else if (prevPhase === 'lobby') {
            // Handle edge case where player is still in lobby
            console.log('🔄 Edge case: Player still in lobby, transitioning through waiting to build-selection');
            setTimeout(() => {
              setGamePhase('build-selection');
              setOpponentConnected(true);
            }, 100);
            return 'waiting';
          }
          
          console.log(`🎯 No phase transition needed (current: ${prevPhase})`);
          return prevPhase;
        });
      }
    }
    
    // Update connected players count
    setOpponentConnected(data.connectedPlayers > 1);
    console.log(`🔄 Updated opponent connected status: ${data.connectedPlayers > 1}`);
  }, [gamePhase]);

  const handlePlayerDisconnected = useCallback((data: { playerId: string; matchId: string }) => {
    console.log('👤 Player disconnected:', data);
    setOpponentConnected(false);
  }, []);

  const handleMatchCompleted = useCallback((data: { matchId: string; winner: string; gameData: any }) => {
    console.log('🏆 Match completed:', data);
    setGamePhase('completed');
  }, []);

  // Load available matches
  const loadAvailableMatches = async () => {
    try {
      const matches = await matchService.getAvailableDiceDuelMatches();
      setAvailableMatches(matches);
    } catch (error) {
      console.error('Failed to load matches:', error);
    }
  };

  useEffect(() => {
    if (gamePhase === 'lobby') {
      loadAvailableMatches();
      const interval = setInterval(loadAvailableMatches, 3000);
      return () => clearInterval(interval);
    }
  }, [gamePhase]);

  // Monitor match state
  useEffect(() => {
    if (!currentMatch) return;

    const checkMatchState = async () => {
      try {
        const updatedMatch = await matchService.getMatch(currentMatch.id);
        if (updatedMatch) {
          setCurrentMatch(updatedMatch);
          updateGamePhase(updatedMatch);
        }
      } catch (error) {
        console.error('Failed to check match state:', error);
      }
    };

    const interval = setInterval(checkMatchState, 2000);
    return () => clearInterval(interval);
  }, [currentMatch]);

  const updateGamePhase = (match: Match) => {
    console.log('🔄 Updating game phase based on match:', match.status);
    
    if (match.status === 'pending') {
      setGamePhase('waiting');
    } else if (match.status === 'in_progress') {
      setGamePhase(prevPhase => {
        console.log(`🔄 Match in progress, current phase: ${prevPhase}`);
        // 🔄 SYNCHRONIZED BUILD SELECTION: Respect build-selection phase
        if (prevPhase === 'waiting') {
          setOpponentConnected(!!match.player2);
          console.log(`🔄 Phase transition: ${prevPhase} -> build-selection (match in progress - synchronized)`);
          
          // 🚀 PERFORMANCE: Game runs on Vercel with CDN assets (no redirect needed)
          // Cloudflare CDN assets provide the speed boost without changing user experience
          
          return 'build-selection';
        } else if (prevPhase !== 'playing' && prevPhase !== 'rolling' && prevPhase !== 'revealing' && prevPhase !== 'build-selection') {
          setCanRoll(true);
          setOpponentConnected(!!match.player2);
          console.log(`🔄 Phase transition: ${prevPhase} -> playing (match in progress)`);
          return 'playing';
        }
        return prevPhase;
      });
    } else if (match.status === 'completed') {
      setGamePhase('completed');
    }

    // Update game data from match
    if (match.gameData) {
      setPlayerScore(match.gameData.player1Score || 0);
      setOpponentScore(match.gameData.player2Score || 0);
      setCurrentRound(match.gameData.currentRound || 1);
      setMatchComplete(match.gameData.matchComplete || false);
    }
  };

  const createMatch = async () => {
    if (!user || isCreatingMatch) return;
    
    console.log('🎮 Creating dice duel match with wager:', selectedWager);
    setIsCreatingMatch(true);
    try {
      const match = await matchService.createDiceDuelMatch(selectedWager);
      console.log('🎮 Match created:', match);
      setCurrentMatch(match);
      setGamePhase('waiting');
      console.log('🔄 Phase set to waiting, now joining WebSocket room...');
      
      // ✅ CRITICAL FIX: Ensure WebSocket connection is ready before joining room
      if (socketService.isConnected() && user.walletAddress) {
        // Small delay to ensure WebSocket is fully ready
        await new Promise(resolve => setTimeout(resolve, 100));
        await socketService.joinMatch(match.id, user.walletAddress);
        console.log('🎮 ✅ Successfully joined match room:', match.id);
        
        // ✅ SYNC FIX: Force immediate match state check to catch any missed events
        setTimeout(async () => {
          try {
            const updatedMatch = await matchService.getMatch(match.id);
            if (updatedMatch && updatedMatch.status === 'in_progress' && gamePhase === 'waiting') {
              console.log('🔄 SYNC RECOVERY: Match already in progress, transitioning to build-selection');
              setGamePhase('build-selection');
              setOpponentConnected(true);
            }
          } catch (error) {
            console.error('Error checking match state:', error);
          }
        }, 500);
        
      } else {
        console.warn('⚠️ Cannot join WebSocket room - not connected or no wallet address');
      }
    } catch (error) {
      console.error('Failed to create match:', error);
    } finally {
      setIsCreatingMatch(false);
    }
  };

  const joinMatch = async (matchId: string) => {
    if (!user || isJoiningMatch) return;
    
    console.log('🎮 Joining dice duel match:', matchId);
    setIsJoiningMatch(true);
    try {
      const result = await matchService.joinDiceDuelMatch(matchId);
      console.log('🎮 Join result:', result);
      if (result.success && result.match) {
        setCurrentMatch(result.match);
        // 🔄 SYNCHRONIZED BUILD SELECTION: Don't immediately go to build-selection
        // Wait for WebSocket match_state event to synchronize both players
        setGamePhase('waiting');
        console.log('🔄 Phase set to waiting - both players will enter build-selection together via WebSocket sync...');
        
        // ✅ CRITICAL FIX: Ensure WebSocket connection is ready before joining room
        if (socketService.isConnected() && user.walletAddress) {
          await socketService.joinMatch(result.match.id, user.walletAddress);
          console.log('🎮 ✅ Successfully joined match room:', result.match.id);
          
          // ✅ SYNC FIX: Immediately check if we should transition to build-selection
          // This handles the case where the joiner processes the match faster than the WebSocket event
          if (result.match.status === 'in_progress' && result.match.player2) {
            console.log('🔄 SYNC FIX: Match already in progress, both players present - transitioning to build-selection');
            setTimeout(() => {
              setGamePhase('build-selection');
              setOpponentConnected(true);
            }, 200); // Small delay to ensure smooth transition
          }
        } else {
          console.warn('⚠️ Cannot join WebSocket room - not connected or no wallet address');
        }
      }
    } catch (error) {
      console.error('Failed to join match:', error);
    } finally {
      setIsJoiningMatch(false);
    }
  };

  const rollDice = async () => {
    if (!canRoll || !currentMatch || !user || !selectedBuild) {
      console.warn('Cannot roll dice: conditions not met', { 
        canRoll, 
        currentMatch: !!currentMatch, 
        user: !!user,
        selectedBuild 
      });
      return;
    }
    
    console.log('🎲 🔥 PLAYER INITIATED RPG ROLL - REQUESTING SYNCHRONIZED GAME!');
    console.log('⚔️ Selected build:', selectedBuild, rpgBuilds[selectedBuild as keyof typeof rpgBuilds]);
    setCanRoll(false);
    setWaitingForOpponent(true);
    
    try {
      // 🎰 CRITICAL FIX: Use WebSocket for synchronized dice rolls (not HTTP REST)
      console.log('🔒 Sending synchronized RPG dice roll via WebSocket...');
      
      if (!socketService.isConnected() || !user.walletAddress) {
        throw new Error('WebSocket not connected or no wallet address');
      }
      
      // Send RPG dice roll request via WebSocket with build info
      const buildData = rpgBuilds[selectedBuild as keyof typeof rpgBuilds];
      socketService.sendDiceDuelRoll(currentMatch.id, user.walletAddress, {
        build: selectedBuild,
        dice: buildData.dice,
        buildName: buildData.name
      });
      
      console.log('✅ WebSocket RPG dice roll request sent! Waiting for synchronized game start...');
      console.log('⏰ Both players must roll before synchronized animation begins');
      
      // Backend will send synchronized dice results via WebSocket when both players have rolled
      // This triggers handleDiceResult() which starts the synchronized animation
      
    } catch (error) {
      console.error('❌ Failed to send WebSocket RPG dice roll request:', error);
      setCanRoll(true);
      setWaitingForOpponent(false);
    }
  };

  const returnToLobby = () => {
    setGamePhase('lobby');
    setCurrentMatch(null);
    setPlayerRoll(null);
    setOpponentRoll(null);
    setRoundWinner(null);
    setPlayerScore(0);
    setOpponentScore(0);
    setCurrentRound(1);
    setMatchComplete(false);
    setMatchWinner(null);
    setCanRoll(false);
    setWaitingForOpponent(false);
    setOpponentConnected(false);
    
    // 🚀 RPG DUEL: Reset build selection
    setSelectedBuild(null);
    setOpponentBuild(null);
    setPlayerBuildLocked(false);
    setOpponentBuildLocked(false);
    setShowBuildSelection(false);
    setWaitingForOpponentBuild(false);
    
    // Clear WebSocket match
    socketService.clearCurrentMatch();
  };

  const getDisplayName = (username: string) => {
    return username.length > 12 ? `${username.substring(0, 12)}...` : username;
  };

  const getDiceEmoji = (roll: number | null): string => {
    if (!roll) return '🎲';
    switch (roll) {
      case 1: return '⚀';
      case 2: return '⚁';
      case 3: return '⚂';
      case 4: return '⚃';
      case 5: return '⚄';
      case 6: return '⚅';
      default: return '🎲';
    }
  };

  // 🚀 UNIVERSAL SYSTEM: Drag & Drop Functions - Exact Crash/Mines style
  const handleDragStart = useCallback((e: React.DragEvent, panelType: string) => {
    setIsDragging(true);
    setDraggedPanel(panelType);
    e.dataTransfer.setData('text/plain', panelType);
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
    console.log(`🔥 Panel ${panelId} undocked from dashboard!`);
  }, []);

  const handleUndockAll = useCallback(() => {
    setDockedPanels(new Set());
  }, []);

  // 🚀 UNIVERSAL SYSTEM: Resizing Functions
  const handleResizeStart = useCallback((e: React.MouseEvent, panelId: string) => {
    e.preventDefault();
    setResizingPanel(panelId);
    const startY = e.clientY;
    const startHeight = dockedPanelHeights[panelId];

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const newHeight = Math.max(200, Math.min(600, startHeight + deltaY));
      setDockedPanelHeights(prev => ({ ...prev, [panelId]: newHeight }));
    };

    const handleMouseUp = () => {
      setResizingPanel(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [dockedPanelHeights]);

  // Loading state check - show loading until auth is complete
  if (authLoading) {
    return (
      <div className="min-h-screen bg-bg-main text-text-primary">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="lg:ml-64 min-h-screen">
          <PageHeader onMenuClick={() => setSidebarOpen(true)} />
          <main className="p-6">
            <div className="max-w-4xl mx-auto text-center py-20">
              <div className="text-8xl mb-8">🎲</div>
              <h1 className="text-4xl font-bold text-text-primary mb-4 font-audiowide uppercase">RPG Dice Duel</h1>
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

  // Authentication check - show login prompt if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-bg-main text-text-primary">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="lg:ml-64 min-h-screen">
          <PageHeader onMenuClick={() => setSidebarOpen(true)} />
          <main className="p-6">
            <div className="max-w-4xl mx-auto text-center py-20">
              <div className="text-8xl mb-8">🎲</div>
              <h1 className="text-4xl font-bold text-text-primary mb-4 font-audiowide uppercase">RPG Dice Duel</h1>
              <p className="text-lg text-text-secondary mb-8 font-inter">
                Please log in to play RPG Dice Duel
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
                   style={{ height: '1000px', minHeight: '1000px' }}>

                {/* Static Background Layer - Stable dice table surface */}
                {gamePhase !== 'lobby' && (
                  <div 
                    className="absolute inset-0 rounded-xl"
                    style={{ 
                      backgroundImage: 'url(https://pv3-game-assets-cdn.patchingjoshua.workers.dev/dice/backgrounds/gamebackground.png)',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat'
                    }}
                  />
                )}
                
                {/* Game Content Container */}
                <div className="h-full flex flex-col relative z-1 bg-black/10 backdrop-blur-[0.5px]">
                  
                  {/* Game Header - Compact with Dice Info */}
                  <div className="flex-shrink-0 px-6 py-4 border-b border-border">
                    <div className="flex items-center justify-between">
                      <div>
                        <h1 className="text-2xl font-bold text-text-primary font-audiowide uppercase">⚔️ RPG Dice Duel</h1>
                        <p className="text-sm text-text-secondary font-inter">Best of 5 rounds • First to 3 wins • Choose your build!</p>
                      </div>
                      
                      {/* Round Info - Show during active game and results */}
                      {(gamePhase === 'playing' || gamePhase === 'rolling' || gamePhase === 'revealing' || gamePhase === 'completed') && currentMatch && (
                        <div className="flex items-center gap-8">
                          <div className="text-center">
                            <p className="text-sm text-text-secondary">You</p>
                            <p className="text-xl font-bold">{playerScore}</p>
                          </div>
                          <div className="text-center">
                            {/* Show round result status if available */}
                            {gamePhase === 'revealing' && roundWinner ? (
                              <div>
                                {roundWinner === 'player' ? (
                                  <p className="text-lg font-bold text-green-400">🎉 Round Won</p>
                                ) : roundWinner === 'opponent' ? (
                                  <p className="text-lg font-bold text-red-400">😞 Round Lost</p>
                                ) : (
                                  <p className="text-lg font-bold text-yellow-400">🤝 Round Tied</p>
                                )}
                                <p className="text-xs text-text-secondary">Round {currentRound - 1} Complete</p>
                              </div>
                            ) : gamePhase === 'completed' ? (
                              <div>
                                {matchWinner === 'player' ? (
                                  <p className="text-lg font-bold text-green-400">🏆 Match Won</p>
                                ) : (
                                  <p className="text-lg font-bold text-red-400">💔 Match Lost</p>
                                )}
                                <p className="text-xs text-text-secondary">Final Result</p>
                              </div>
                            ) : (
                              <div>
                                <p className="text-lg font-bold">Round {currentRound}</p>
                                <p className="text-xs text-text-secondary">of 5</p>
                              </div>
                            )}
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-text-secondary">Opponent</p>
                            <p className="text-xl font-bold">{opponentScore}</p>
                          </div>
                        </div>
                      )}
                      
                      <div className="text-right">
                        <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-inter ${
                          socketConnected 
                            ? 'bg-green-900/20 border border-green-500 text-green-400' 
                            : 'bg-red-900/20 border border-red-500 text-red-400'
                        }`}>
                          <div className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                          <span>{socketConnected ? 'Connected' : 'Connecting...'}</span>
                        </div>
                        {currentMatch && (
                          <p className="text-xs text-text-secondary mt-1">
                            {opponentConnected ? '👥 Opponent Online' : '⏳ Waiting for Opponent'}
                          </p>
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
                                        onClick={() => setSelectedWager(0.1)}
                                        className={`px-4 py-2 rounded-lg font-audiowide ${selectedWager === 0.1 ? 'bg-accent-primary text-black' : 'bg-bg-card text-text-primary'}`}
                                      >
                                        0.1 SOL
                                      </button>
                                      <button
                                        onClick={() => setSelectedWager(0.25)}
                                        className={`px-4 py-2 rounded-lg font-audiowide ${selectedWager === 0.25 ? 'bg-accent-primary text-black' : 'bg-bg-card text-text-primary'}`}
                                      >
                                        0.25 SOL
                                      </button>
                                      <button
                                        onClick={() => setSelectedWager(0.5)}
                                        className={`px-4 py-2 rounded-lg font-audiowide ${selectedWager === 0.5 ? 'bg-accent-primary text-black' : 'bg-bg-card text-text-primary'}`}
                                      >
                                        0.5 SOL
                                      </button>
                                      <button
                                        onClick={() => setSelectedWager(1.0)}
                                        className={`px-4 py-2 rounded-lg font-audiowide ${selectedWager === 1.0 ? 'bg-accent-primary text-black' : 'bg-bg-card text-text-primary'}`}
                                      >
                                        1.0 SOL
                                      </button>
                                      <button
                                        onClick={() => setSelectedWager(2.5)}
                                        className={`px-4 py-2 rounded-lg font-audiowide ${selectedWager === 2.5 ? 'bg-accent-primary text-black' : 'bg-bg-card text-text-primary'}`}
                                      >
                                        2.5 SOL
                                      </button>
                                      <button
                                        onClick={() => setSelectedWager(5.0)}
                                        className={`px-4 py-2 rounded-lg font-audiowide ${selectedWager === 5.0 ? 'bg-accent-primary text-black' : 'bg-bg-card text-text-primary'}`}
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
                                    disabled={isCreatingMatch || !socketConnected}
                                    className="primary-button font-audiowide disabled:opacity-50"
                                  >
                                    {isCreatingMatch ? 'Creating...' : `Create Match (${selectedWager} SOL)`}
                                  </button>
                                </div>

                                {/* Join Match */}
                                <div className="glass-card p-8">
                                  <h2 className="text-2xl font-bold text-text-primary mb-6 font-audiowide text-center">Available Matches</h2>
                                  
                                  <div className="space-y-4 max-h-96 overflow-y-auto">
                                    {availableMatches.length === 0 ? (
                                      <div className="text-center text-text-secondary py-8">
                                        <div className="text-4xl mb-4">🎲</div>
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
                                                vs {match.player1?.username || match.player1?.wallet?.slice(0, 8)}...
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
                              <div className="bg-bg-card rounded-lg p-6 text-center">
                                <h3 className="text-lg font-bold text-text-primary mb-4 font-audiowide">Quick Match</h3>
                                <p className="text-text-secondary font-inter mb-4">Quick match functionality coming soon</p>
                                <div className="grid grid-cols-2 gap-4">
                                  <button
                                    onClick={() => {
                                      // Handle match found logic
                                      const matchId: string = "sample-match-id";
                                      joinMatch(matchId);
                                    }}
                                    className="primary-button font-audiowide"
                                  >
                                    Find Match
                                  </button>
                                  <button
                                    onClick={() => {
                                      // Handle match created logic
                                      const match: Match = {
                                        id: "new-match-id",
                                        wager: selectedWager,
                                        status: "pending",
                                        gameType: "dice_duel",
                                        createdAt: new Date().toISOString(),
                                        player1: { id: user?.id || "", wallet: user?.walletAddress || "" }
                                      };
                                      setCurrentMatch(match);
                                      setGamePhase('waiting');
                                      if (user) {
                                        socketService.joinMatch(match.id, user.walletAddress || user.id);
                                      }
                                    }}
                                    className="secondary-button font-audiowide"
                                  >
                                    Create Match
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Waiting for Opponent */}
                          {gamePhase === 'waiting' && (
                            <div className="text-center space-y-4">
                              <div className="text-6xl mb-4">👥</div>
                              <h2 className="text-2xl font-bold text-text-primary mb-4 font-audiowide">Waiting for Opponent...</h2>
                              <p className="text-text-secondary font-inter mb-4">
                                Match created with {selectedWager} SOL wager
                              </p>
                              <div className="flex space-x-4 justify-center">
                                <button onClick={returnToLobby} className="secondary-button font-audiowide">
                                  Cancel Match
                                </button>
                                <button onClick={loadAvailableMatches} className="primary-button font-audiowide">
                                  Refresh
                                </button>
                              </div>
                            </div>
                          )}

                          {/* 🚀 RPG BUILD SELECTION PHASE */}
                          {gamePhase === 'build-selection' && (
                            <div className="max-w-5xl mx-auto px-4 py-4 max-h-screen overflow-y-auto">
                              <div className="text-center mb-4">
                                <div className="text-4xl mb-3">⚔️</div>
                                <h2 className="text-2xl font-bold text-text-primary mb-3 font-audiowide">Choose Your RPG Build</h2>
                                <p className="text-text-secondary font-inter text-base mb-2">
                                  Each build uses different dice combinations with unique risk/reward profiles
                                </p>
                                <p className="text-accent-primary font-inter font-semibold text-sm">
                                  {selectedBuild ? `Selected: ${rpgBuilds[selectedBuild as keyof typeof rpgBuilds].name}` : 'Select a build to continue'}
                                </p>
                              </div>

                              {/* Build Selection Cards - Compact Design */}
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
                                {Object.entries(rpgBuilds).map(([buildKey, build]) => (
                                  <div
                                    key={buildKey}
                                    onClick={() => setSelectedBuild(buildKey)}
                                    className={`cursor-pointer transition-all duration-300 transform hover:scale-102 ${
                                      selectedBuild === buildKey 
                                        ? `${build.bgColor} ${build.borderColor} border-2 shadow-lg` 
                                        : 'bg-bg-card border border-border hover:border-accent-primary/50'
                                    } rounded-xl p-4`}
                                  >
                                    <div className="text-center">
                                      {/* Build Icon & Name */}
                                      <div className="text-3xl mb-2">{build.emoji}</div>
                                      <h3 className={`text-xl font-bold font-audiowide mb-2 ${build.color}`}>
                                        {build.name}
                                      </h3>
                                      
                                      {/* Dice Notation */}
                                      <div className="mb-3">
                                        <p className="text-text-primary font-mono text-lg font-bold bg-black/30 rounded-lg py-1 px-3 inline-block">
                                          {build.dice}
                                        </p>
                                      </div>
                                      
                                      {/* Description */}
                                      <p className="text-text-secondary font-inter text-xs mb-3">
                                        {build.description}
                                      </p>
                                      
                                      {/* Stats - Compact */}
                                      <div className="bg-black/20 rounded-lg p-3 mb-3">
                                        <div className="grid grid-cols-3 gap-2 text-center">
                                          <div>
                                            <p className="text-xs text-text-secondary">Min Damage</p>
                                            <p className="text-base font-bold text-red-400">{build.minDamage}</p>
                                          </div>
                                          <div>
                                            <p className="text-xs text-text-secondary">Avg Damage</p>
                                            <p className="text-base font-bold text-yellow-400">{build.avgDamage}</p>
                                          </div>
                                          <div>
                                            <p className="text-xs text-text-secondary">Max Damage</p>
                                            <p className="text-base font-bold text-green-400">{build.maxDamage}</p>
                                          </div>
                                        </div>
                                      </div>
                                      
                                      {/* Tooltip - Reduced */}
                                      <p className="text-xs text-text-secondary font-inter leading-tight">
                                        {build.tooltip}
                                      </p>
                                      
                                      {/* Selection Indicator - Compact */}
                                      {selectedBuild === buildKey && (
                                        <div className="mt-2">
                                          <div className="inline-flex items-center space-x-1 bg-accent-primary text-black px-3 py-1 rounded-full font-audiowide font-bold text-sm">
                                            <span>✓</span>
                                            <span>SELECTED</span>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>

                              {/* Confirm Build Button - Compact */}
                              <div className="text-center mt-4">
                                <button
                                  onClick={() => {
                                    if (selectedBuild) {
                                      setPlayerBuildLocked(true);
                                      setWaitingForOpponentBuild(true);
                                      console.log(`🗡️ Build locked: ${selectedBuild} - waiting for opponent to confirm their build...`);
                                      playSound('success');
                                      
                                      // 🔄 SYNCHRONIZED BUILD Selection: Simulate opponent build confirmation for demo
                                      // In real implementation, this would be handled by backend WebSocket events
                                      setTimeout(() => {
                                        // Simulate opponent selecting a random build and confirming
                                        const builds = ['assassin', 'warrior', 'berserker', 'mage'];
                                        const randomBuild = builds[Math.floor(Math.random() * builds.length)];
                                        console.log(`🤖 Simulated opponent build confirmation: ${randomBuild}`);
                                        setOpponentBuild(randomBuild);
                                        setOpponentBuildLocked(true);
                                      }, 2000); // 2-second delay to simulate opponent thinking
                                    }
                                  }}
                                  disabled={!selectedBuild || playerBuildLocked}
                                  className="primary-button px-8 py-3 text-lg font-audiowide disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {playerBuildLocked ? 'Build Confirmed - Waiting for Opponent' : 
                                   selectedBuild ? `Confirm ${rpgBuilds[selectedBuild as keyof typeof rpgBuilds].name} Build` : 'Select a Build First'}
                                </button>
                                
                                <p className="text-xs text-text-secondary mt-2 font-inter">
                                  {playerBuildLocked ? 
                                    '⏳ Waiting for opponent to select their build...' : 
                                    'You can change your build selection before confirming'
                                  }
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Playing/Rolling/Revealing Phase - Direct on Background */}
                          {(gamePhase === 'playing' || gamePhase === 'rolling' || gamePhase === 'revealing') && currentMatch && (
                            <>
                              {/* 3D Dice Container - Full Background Coverage */}
                              <div 
                                ref={diceContainerRef}
                                className="absolute inset-0 w-full h-full"
                              >
                                {/* 3D Realistic Dice with Proper Pips */}
                                <RealisticDiceRoller
                                  className="w-full h-full"
                                  diceColor="white"
                                  useShadows={true}
                                  onRollComplete={(results) => {
                                    console.log('🎲 Realistic dice animation completed:', results);
                                    playSound('dice-roll');
                                    // The dice results are handled by WebSocket events
                                  }}
                                  onDiceInitialized={(initialized, diceBoxInstance) => {
                                    console.log('🎲 Realistic dice initialization callback:', { initialized, diceBoxInstance: !!diceBoxInstance });
                                    setDiceInitialized(initialized);
                                    if (initialized && diceBoxInstance) {
                                      diceBoxRef.current = diceBoxInstance;
                                      console.log('🎲 ✅ REALISTIC 3D DICE READY FOR DICE DUEL GAMING!');
                                      console.log('🎰 Players can now roll dice with REAL PIPS and 3D physics!');
                                    }
                                  }}
                                />
                                


                                {gamePhase === 'rolling' && waitingForOpponent && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                    <div className="text-center bg-black/80 backdrop-blur-sm rounded-xl p-6">
                                      <div className="animate-pulse text-4xl mb-4">⏳</div>
                                      <p className="text-white text-lg font-inter">Waiting for opponent...</p>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Floating Game Status Overlay */}
                              <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-10">
                                <div className="bg-black/80 backdrop-blur-sm rounded-xl p-4 text-center border border-white/10">
                                  {gamePhase === 'playing' && !waitingForOpponent && (
                                    <div>
                                      <h2 className="text-xl font-bold mb-2 text-white font-audiowide">⚔️ Roll Your RPG Dice!</h2>
                                      {selectedBuild && (
                                        <div className="mb-2">
                                          <p className="text-accent-primary font-audiowide text-lg">
                                            {rpgBuilds[selectedBuild as keyof typeof rpgBuilds].emoji} {rpgBuilds[selectedBuild as keyof typeof rpgBuilds].name}
                                          </p>
                                          <p className="text-gray-400 font-mono text-sm">
                                            {rpgBuilds[selectedBuild as keyof typeof rpgBuilds].dice} • {rpgBuilds[selectedBuild as keyof typeof rpgBuilds].minDamage}-{rpgBuilds[selectedBuild as keyof typeof rpgBuilds].maxDamage} damage
                                          </p>
                                        </div>
                                      )}
                                      <p className="text-gray-300 text-sm font-inter">Click to roll - animation starts when both players are ready!</p>
                                    </div>
                                  )}
                                  {waitingForOpponent && gamePhase === 'playing' && (
                                    <div>
                                      <h2 className="text-xl font-bold mb-2 text-yellow-400 font-audiowide">⏳ Waiting for Opponent</h2>
                                      <p className="text-gray-300 text-sm font-inter">
                                        You&apos;re ready! Waiting for opponent to roll their dice...
                                      </p>
                                    </div>
                                  )}
                                  {gamePhase === 'rolling' && (
                                    <div>
                                      <h2 className="text-xl font-bold mb-2 animate-pulse text-green-400 font-audiowide">🎲 🔥 SYNCHRONIZED DICE ROLLING!</h2>
                                      <p className="text-gray-300 text-sm font-inter">
                                        Both players&apos; dice are rolling together in perfect sync!
                                      </p>
                                    </div>
                                  )}
                                                                    {gamePhase === 'revealing' && (
                                    <div>
                                      <h2 className="text-xl font-bold mb-4 text-white font-audiowide">⚔️ Round {currentRound - 1} RPG Battle Results</h2>
                                      
                                      {/* Build Display */}
                                      <div className="flex justify-center gap-8 mb-6">
                                        {selectedBuild && (
                                          <div className="text-center">
                                            <p className="text-sm text-gray-300 font-inter">Your Build</p>
                                            <p className="text-lg font-bold text-blue-400 font-audiowide">
                                              {rpgBuilds[selectedBuild as keyof typeof rpgBuilds].emoji} {rpgBuilds[selectedBuild as keyof typeof rpgBuilds].name}
                                            </p>
                                            <p className="text-xs text-gray-400 font-mono">{rpgBuilds[selectedBuild as keyof typeof rpgBuilds].dice}</p>
                                          </div>
                                        )}
                                        {opponentBuild && (
                                          <div className="text-center">
                                            <p className="text-sm text-gray-300 font-inter">Opponent Build</p>
                                            <p className="text-lg font-bold text-red-400 font-audiowide">
                                              {rpgBuilds[opponentBuild as keyof typeof rpgBuilds]?.emoji} {rpgBuilds[opponentBuild as keyof typeof rpgBuilds]?.name}
                                            </p>
                                            <p className="text-xs text-gray-400 font-mono">{rpgBuilds[opponentBuild as keyof typeof rpgBuilds]?.dice}</p>
                                          </div>
                                        )}
                                      </div>
                                      
                                      {/* Damage Results */}
                                      <div className="flex justify-center gap-8 mb-4">
                                        <div className="text-center">
                                          <p className="text-sm text-gray-300 font-inter">Your Damage</p>
                                          <p className="text-4xl font-bold text-blue-400 font-audiowide">{playerRoll}</p>
                                          <p className="text-xs text-gray-400 font-inter">
                                            {selectedBuild && `vs Max: ${rpgBuilds[selectedBuild as keyof typeof rpgBuilds].maxDamage}`}
                                          </p>
                                        </div>
                                        <div className="text-center">
                                          <p className="text-sm text-gray-300 font-inter">Opponent Damage</p>
                                          <p className="text-4xl font-bold text-red-400 font-audiowide">{opponentRoll}</p>
                                          <p className="text-xs text-gray-400 font-inter">
                                            {opponentBuild && `vs Max: ${rpgBuilds[opponentBuild as keyof typeof rpgBuilds]?.maxDamage}`}
                                          </p>
                                        </div>
                                      </div>
                                      
                                      {/* Round Winner Display */}
                                      <div className="text-center">
                                        {roundWinner === 'player' ? (
                                          <p className="text-2xl font-bold text-green-400 font-audiowide">🏆 Victory!</p>
                                        ) : roundWinner === 'opponent' ? (
                                          <p className="text-2xl font-bold text-red-400 font-audiowide">💔 Defeated!</p>
                                        ) : (
                                          <p className="text-2xl font-bold text-yellow-400 font-audiowide">🤝 Draw!</p>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Floating Roll Button */}
                              {gamePhase === 'playing' && (
                                <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-10">
                                  <div className="text-center">
                                    <Button
                                      onClick={rollDice}
                                      disabled={!canRoll || !diceInitialized || !socketConnected || !selectedBuild}
                                      className="primary-button px-12 py-4 text-xl font-audiowide bg-accent-primary/90 backdrop-blur-sm border border-accent-primary/50 hover:bg-accent-primary disabled:opacity-50"
                                    >
                                      {selectedBuild ? `⚔️ ${rpgBuilds[selectedBuild as keyof typeof rpgBuilds].emoji} Attack!` : '🎲 Choose Build First'}
                                    </Button>
                                    <p className="text-sm text-gray-300 mt-2 bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2 font-inter">
                                      {!socketConnected ? 'Connecting to server...' : 
                                       !diceInitialized ? 'Loading 3D dice...' : 
                                       'Ready to roll!'}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </>
                          )}

                          {/* Victory/Defeat Screen - Universal Pattern from Crash/RPS/Mines */}
                          {gamePhase === 'completed' && currentMatch && (
                            <div className="text-center space-y-4">
                              <div className="text-8xl mb-6">
                                {matchWinner === 'player' ? '🏆' : matchWinner === 'opponent' ? '💔' : '🤝'}
                              </div>
                              
                              <div className="mb-6">
                                <div className="text-2xl font-bold text-text-primary font-audiowide mb-2">
                                  {matchWinner === 'player' ? '🏆 Victory!' : matchWinner === 'opponent' ? '💔 Defeat' : '🤝 Draw'}
                                </div>
                                <div className="text-lg text-text-secondary font-inter">
                                  {matchWinner === 'player' ? 
                                    `+${(selectedWager * 2 * 0.935).toFixed(3)} SOL` : 
                                    `-${selectedWager} SOL`}
                                </div>
                                
                                <div className="text-sm text-text-secondary font-inter mt-2">
                                  Final Score: {playerScore} - {opponentScore}
                                </div>
                              </div>

                              {/* Professional Button Grid with Tooltips - Same as Crash/RPS/Mines */}
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
                                
                                {/* Instant Rematch */}
                                <div className="relative group">
                                  <button
                                    onClick={() => {
                                      // Handle instant rematch logic
                                      returnToLobby();
                                    }}
                                    className="relative w-full bg-gradient-to-br from-blue-600 via-blue-500 to-blue-600 text-white font-bold py-4 px-6 rounded-xl hover:from-blue-500 hover:via-blue-400 hover:to-blue-500 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 shadow-lg hover:shadow-2xl shadow-blue-500/30 border border-blue-400/50"
                                  >
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-xl"></div>
                                    <div className="relative">
                                      <div className="text-lg mb-1">🎯 Instant Rematch</div>
                                      <div className="text-xs opacity-90 font-semibold">{selectedWager} SOL</div>
                                    </div>
                                  </button>
                                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black/90 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                                    Challenge the same opponent again
                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black/90"></div>
                                  </div>
                                </div>

                                {/* 2x Stake Challenge */}
                                <div className="relative group">
                                  <button
                                    onClick={() => {
                                      // Handle 2x stake rematch logic
                                      returnToLobby();
                                    }}
                                    className="relative w-full bg-gradient-to-br from-red-600 via-red-500 to-red-600 text-white font-bold py-4 px-6 rounded-xl hover:from-red-500 hover:via-red-400 hover:to-red-500 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 shadow-lg hover:shadow-2xl shadow-red-500/30 border border-red-400/50"
                                  >
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-xl"></div>
                                    <div className="relative">
                                      <div className="text-lg mb-1">⚡ 2x Stake Challenge</div>
                                      <div className="text-xs opacity-90 font-semibold">{(selectedWager * 2).toFixed(2)} SOL</div>
                                    </div>
                                  </button>
                                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black/90 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                                    Double the stakes for high-risk rematch
                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black/90"></div>
                                  </div>
                                </div>
                                
                                {/* Quick Match - Find new opponent */}
                                <div className="relative group">
                                  <button
                                    onClick={() => {
                                      // Handle quick match logic
                                      returnToLobby();
                                    }}
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
                                    onClick={() => {
                                      // Handle share victory logic
                                      console.log('Sharing dice duel result...');
                                    }}
                                    className="relative w-full bg-gradient-to-br from-gray-600 via-gray-500 to-gray-600 text-white font-bold py-4 px-6 rounded-xl hover:from-gray-500 hover:via-gray-400 hover:to-gray-500 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 shadow-lg hover:shadow-2xl shadow-gray-500/30 border border-gray-400/50"
                                  >
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-xl"></div>
                                    <div className="relative">
                                      <div className="text-lg mb-1">📱 Share {matchWinner === 'player' ? 'Victory' : 'Result'}</div>
                                      <div className="text-xs opacity-90 font-semibold">
                                        {matchWinner === 'player' ? 'Brag Rights' : 'Show Results'}
                                      </div>
                                    </div>
                                  </button>
                                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black/90 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                                    {matchWinner === 'player' ? 'Share your victory on social media' : 'Share your match results'}
                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black/90"></div>
                                  </div>
                                </div>
                                
                                {/* Victory Card Generation */}
                                <div className="relative group">
                                  <button
                                    onClick={() => {
                                      // Handle PnL card generation logic
                                      console.log('Generating dice duel PnL card...');
                                    }}
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

                                {/* Revenge Match (for losers) OR Back to Games */}
                                {matchWinner !== 'player' ? (
                                  <div className="relative group">
                                    <button
                                      onClick={() => {
                                        // Handle revenge match logic
                                        returnToLobby();
                                      }}
                                      className="relative w-full bg-gradient-to-br from-amber-600 via-orange-500 to-amber-600 text-white font-bold py-4 px-6 rounded-xl hover:from-amber-500 hover:via-orange-400 hover:to-amber-500 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 shadow-lg hover:shadow-2xl shadow-amber-500/30 border border-amber-400/50"
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
                                ) : (
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
                                )}
                                
                              </div>
                            </div>
                          )}

                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
              
          {/* 🚀 UNIVERSAL SYSTEM: Floating Panel Toggle Bar - Exact Crash/Mines Style */}
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

          {/* Recent Dice Duel Wins - Game Specific */}
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-text-primary font-audiowide mb-2">🎲 Recent Dice Duel Victories</h2>
              <p className="text-text-secondary font-inter">Live feed of recent Dice Duel wins</p>
            </div>
            <RecentWins gameFilter="dice_duel" />
          </div>
        </main>
      </div>

      {/* CSS animations for dice background */}
      <style jsx>{`
        @keyframes diceBackgroundFloat {
          0%, 100% { 
            transform: scale(1) rotate(0deg); 
            opacity: 0.6; 
          }
          50% { 
            transform: scale(1.02) rotate(0.5deg); 
            opacity: 0.8; 
          }
        }

        @keyframes diceBackgroundShift {
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