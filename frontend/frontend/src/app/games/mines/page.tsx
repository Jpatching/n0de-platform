'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import PageHeader from '@/components/PageHeader';
import Avatar from '@/components/Avatar';
import { useAuth } from '@/contexts/AuthContext';
import { usePV3 } from '@/hooks/usePV3';
import { audioSprite } from '@/lib/audioSprite';
import { socketService } from '@/services/socketService';
import { matchService } from '@/services/matchService';
import ChatPanel from '@/components/ChatPanel';
import FloatingPanel from '@/components/FloatingPanel';
import GameOverviewPanel from '@/components/panels/GameOverviewPanel';
import ChatPanelContent from '@/components/panels/ChatPanel';
import StatsPanel from '@/components/panels/StatsPanel';
import SettingsPanel from '@/components/panels/SettingsPanel';
import MinesQuickMatch from '@/components/games/mines/MinesQuickMatch';
import PnLCardModal from '@/components/PnLCardModal';
import RecentWins from '@/components/RecentWins';

type GamePhase = 'lobby' | 'creating' | 'waiting' | 'joining' | 'playing' | 'revealing' | 'round-countdown' | 'waiting-for-ready' | 'finished' | 'payout-complete';

interface Match {
  id: string;
  wager: number;
  status: string;
  player1: { id: string; wallet: string; username?: string };
  player2?: { id: string; wallet: string; username?: string };
}

interface MinesGrid {
  size: number;
  mineCount: number;
  mines: string[];
  seed: string;
}

interface MinesGameState {
  matchId: string;
  player1: string;
  player2: string;
  currentRound: number;
  requiredWins: number;
  player1Score: number;
  player2Score: number;
  matchComplete: boolean;
  winner: string | null;
  rounds: any[];
}

export default function MinesPage() {
  const router = useRouter();
  const { connected, publicKey, formatSOL, vaultBalance } = usePV3();
  const { user } = useAuth();
  // Audio effects using optimized sprite system
  const playSound = (soundName: string) => {
    audioSprite.play(soundName);
  };
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Game state
  const [gamePhase, setGamePhase] = useState<GamePhase>('lobby');
  const [wagerAmount, setWagerAmount] = useState(0.1);
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);
  const [availableMatches, setAvailableMatches] = useState<Match[]>([]);
  const [gameState, setGameState] = useState<MinesGameState | null>(null);
  const [opponent, setOpponent] = useState<{ wallet: string; username?: string } | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  
  // Mines-specific state
  const [grid, setGrid] = useState<boolean[][]>([]);
  const [revealedTiles, setRevealedTiles] = useState<Set<string>>(new Set());
  const [mines, setMines] = useState<string[]>([]);
  const [preGeneratedMines, setPreGeneratedMines] = useState<string[]>([]); // 🚀 Store mines locally
  const [currentMultiplier, setCurrentMultiplier] = useState(1.0);
  const [playerTurnComplete, setPlayerTurnComplete] = useState(false);
  const [opponentTurnComplete, setOpponentTurnComplete] = useState(false);
  const [roundResult, setRoundResult] = useState<any>(null);
  const [countdown, setCountdown] = useState(0);
  const [readyCountdown, setReadyCountdown] = useState(20); // 20-second countdown for ready button
  const [playerScore, setPlayerScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [currentRound, setCurrentRound] = useState(1);
  
  // Animation states
  const [animatingTiles, setAnimatingTiles] = useState<Set<string>>(new Set());
  const [explodedTiles, setExplodedTiles] = useState<Set<string>>(new Set());
  const [revealingResult, setRevealingResult] = useState(false);
  const [multiplierPulse, setMultiplierPulse] = useState(false);
  
  // Floating panel states
  const [openPanels, setOpenPanels] = useState({
    overview: false,
    chat: false,
    settings: false,
    stats: false,
    favorites: false
  });

  // Fullscreen mode state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Victory screen state - same as RPS
  const [showPnLCard, setShowPnLCard] = useState(false);
  const [rematchLoading, setRematchLoading] = useState(false);
  const [pendingRematchChallenge, setPendingRematchChallenge] = useState<{
    type: 'standard' | '2x_stake';
    challengerId: string;
    wager: number;
  } | null>(null);
  const [payoutStatus, setPayoutStatus] = useState<'pending' | 'completed' | 'failed' | null>(null);
  const [payoutData, setPayoutData] = useState<any>(null);

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
  
  // Check if user is authenticated
  const isAuthenticated = connected || user;
  const hasVaultFunds = vaultBalance > 0;



  // Initialize 5x5 grid
  useEffect(() => {
    const newGrid = Array(5).fill(null).map(() => Array(5).fill(false));
    setGrid(newGrid);
  }, []);

  // Function to perform the actual reveal animation
  const performRevealAnimation = (minePositions: string[]) => {
    console.log('🎭 Performing reveal animation with mines:', minePositions);
    
    // Clear existing state
    setMines([]);
    
    // Generate all tile positions for 5x5 grid
    const allTilePositions: string[] = [];
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        allTilePositions.push(`${row},${col}`);
      }
    }
    
    // Separate mines and safe tiles
    const safeTiles = allTilePositions.filter(tile => !minePositions.includes(tile));
    
    console.log('💎 Safe tiles to reveal:', safeTiles);
    console.log('💣 Mine tiles to reveal:', minePositions);
    
    // Reveal all tiles with staggered animation (EXACT same logic as final round)
    let revealIndex = 0;
    
    // First reveal all safe tiles as gems
    safeTiles.forEach((tile, index) => {
      setTimeout(() => {
        setRevealedTiles(prev => {
          const newRevealed = new Set(prev);
          newRevealed.add(tile);
          return newRevealed;
        });
      }, revealIndex * 100); // 100ms delay between each tile
      revealIndex++;
    });
    
    // Then reveal mines with dramatic effect
    minePositions.forEach((mine, index) => {
      setTimeout(() => {
        setMines(prev => {
          if (!prev.includes(mine)) {
            return [...prev, mine];
          }
          return prev;
        });
        // Also mark mines as revealed
        setRevealedTiles(prev => {
          const newRevealed = new Set(prev);
          newRevealed.add(mine);
          return newRevealed;
        });
      }, revealIndex * 100); // Continue the sequence
      revealIndex++;
    });
  };

  // Function to start the reveal animation (same as final round)
  const startRevealAnimation = (minePositions: string[] = []) => {
    console.log('🎭 Starting reveal animation with mines:', minePositions);
    setGamePhase('revealing');
    setRevealingResult(true);
    
    // If we have mine positions, start the animation immediately
    if (minePositions.length > 0) {
      performRevealAnimation(minePositions);
    } else {
      // If we don't have mine positions yet, just show the revealing phase
      // The animation will start when handleMinesRoundResult provides the positions
      console.log('🎭 Waiting for mine positions from server...');
    }
  };

  // Handle transition to revealing phase when both players complete their turns
  useEffect(() => {
    if (gamePhase === 'playing' && playerTurnComplete && opponentTurnComplete) {
      console.log('🎭 Both players completed - waiting for server response...');
      // Just wait for the server response, no immediate transition
      // The reveal will happen when handleMinesRoundResult is called
    }
  }, [gamePhase, playerTurnComplete, opponentTurnComplete]);

  // Socket connection and event handlers
  useEffect(() => {
    if (!isAuthenticated) return;

    const connectSocket = async () => {
      try {
        await socketService.connect();
        setSocketConnected(true);
        console.log('🔌 Connected to socket for Mines game');
      } catch (error) {
        console.error('❌ Socket connection failed:', error);
        setSocketConnected(false);
      }
    };

    connectSocket();

    // Socket event listeners
    const handleMatchState = (data: any) => {
      console.log('🎮 Match state updated:', data);
      if (data.match) {
        setCurrentMatch(data.match);
        
        // If match is in_progress and we have both players, start playing
        if (data.match.status === 'in_progress' && data.match.player2) {
        setGamePhase('playing');
        
        // Determine opponent
        const userWallet = publicKey?.toString() || user?.walletAddress;
        const opponent = data.match.player1.wallet === userWallet ? data.match.player2 : data.match.player1;
        setOpponent(opponent);
          
          // Start the first round
          console.log('🚀 Starting first mines round...');
          socketService.emit('start_mines_round', { matchId: data.match.id });
        }
      }
    };

    const handleMinesRoundStarted = (data: any) => {
      console.log('💣 Mines round started:', data);
      
      // 🔊 Play round start sound
      playSound('round-start');
      
      setGamePhase('playing');
      setPlayerTurnComplete(false);
      setOpponentTurnComplete(false);
      setRoundResult(null);
      setRevealedTiles(new Set());
      setCurrentMultiplier(1.0);
      setCurrentRound(data.roundNumber || 1);
      
      // 🔧 FIX: Reset grid state for new round
      const newGrid = Array(5).fill(null).map(() => Array(5).fill(false));
      setGrid(newGrid);
      
      // Reset animation states
      setAnimatingTiles(new Set());
      setExplodedTiles(new Set());
      setRevealingResult(false);
      setMines([]);
      setMultiplierPulse(false);
      
      // 🛡️ SECURITY: Mine positions are kept secret on server for anti-cheat
      // Reset any previous mine knowledge
      setPreGeneratedMines([]);
      console.log('🔒 Mine positions are secret - server will validate each move');
      
      // Enter game mode to prevent disconnections
      if (currentMatch) {
        socketService.enterGameMode(currentMatch.id);
      }
    };

    const handleOpponentTurnComplete = (data: any) => {
      console.log('👥 Opponent completed their turn:', data);
      setOpponentTurnComplete(true);
    };

    const handleMinesRoundResult = (data: any) => {
      console.log('🏆 Mines round result:', data);
      console.log('🔍 Full data structure:', JSON.stringify(data, null, 2));
      
      // Transition to revealing phase and start reveal animation
      setGamePhase('revealing');
      setRevealingResult(true);
      
      // Get mine positions from server - they're in playerResult.grid.mines or opponentResult.grid.mines
      let allMines: string[] = [];
        if (data.playerResult?.grid?.mines) {
        allMines = data.playerResult.grid.mines;
        console.log('🎯 Found mines in playerResult.grid.mines:', allMines);
      } else if (data.opponentResult?.grid?.mines) {
        allMines = data.opponentResult.grid.mines;
        console.log('🎯 Found mines in opponentResult.grid.mines:', allMines);
      } else {
        // Fallback: check other possible locations
        console.log('⚠️ Mine positions not found in expected locations, checking fallbacks...');
        console.log('📊 playerResult:', data.playerResult);
        console.log('📊 opponentResult:', data.opponentResult);
        
        // If both players have grids, use the first one we find
        if (data.playerResult?.grid) {
          allMines = data.playerResult.grid.mines || [];
          console.log('🎯 Using playerResult.grid fallback:', allMines);
        } else if (data.opponentResult?.grid) {
          allMines = data.opponentResult.grid.mines || [];
          console.log('🎯 Using opponentResult.grid fallback:', allMines);
        }
      }
      
      console.log('🎯 Final mine positions for animation:', allMines);
      
      // Start the reveal animation with mine positions
      if (allMines.length > 0) {
        performRevealAnimation(allMines);
      }
      
      // Add explosion animation to any mines that were hit during the round
      const playerHitMines = data.playerResult?.revealedTiles?.filter((tile: string) => 
        allMines.includes(tile)
      ) || [];
      const opponentHitMines = data.opponentResult?.revealedTiles?.filter((tile: string) => 
        allMines.includes(tile)
      ) || [];
            
      const allHitMines = [...playerHitMines, ...opponentHitMines];
      
      if (allHitMines.length > 0) {
            setTimeout(() => {
          setExplodedTiles(new Set(allHitMines));
        }, 2500); // After reveals complete
        }
      
      // Update scores after reveal animation completes
      setTimeout(() => {
        console.log('🔍 Score update debug:', {
          roundWinner: data.roundWinner,
          userWallet: publicKey?.toString() || user?.walletAddress,
          matchScore: data.matchScore,
          playerWonRound: data.roundWinner === (publicKey?.toString() || user?.walletAddress)
        });
        
        setRoundResult(data);
        setPlayerScore(data.matchScore.player);
        setOpponentScore(data.matchScore.opponent);
        setRevealingResult(false);
        
        // 🔊 Play appropriate sound based on round result
        const userWallet = publicKey?.toString() || user?.walletAddress;
        const playerWonRound = data.roundWinner === userWallet;
        const roundWasTie = !data.roundWinner;
        
        if (roundWasTie) {
          // No sound for tie
        } else if (playerWonRound) {
          playSound('game-win');
                    } else {
              playSound('game-lose');
            }
        
        // Keep connection active during round transitions (don't exit game mode)
        // socketService.exitGameMode();

        if (data.matchComplete) {
          setGamePhase('finished');
          // 🔊 Play final match result sound
          if (data.matchWinner === userWallet) {
            playSound('big-win');
          } else {
            playSound('game-lose');
          }
        } else {
          // Wait for "ready for next round" signal instead of automatic countdown
          setGamePhase('round-countdown');
          setCountdown(0); // No countdown, waiting for readiness
          
          // 🔧 FIX: Add fallback timeout in case mines_waiting_for_ready event doesn't come through
          setTimeout(() => {
            console.log('🔧 Fallback: Checking if still in round-countdown phase after 8 seconds');
            setGamePhase(prevPhase => {
              if (prevPhase === 'round-countdown') {
                console.log('🔧 Fallback: Transitioning to waiting-for-ready phase');
                setReadyCountdown(15); // 15-second countdown
                return 'waiting-for-ready';
              }
              return prevPhase;
            });
          }, 8000); // 8 second fallback timeout
        }
              }, 3000); // 3 second total time: 3s animation for better flow
    };

    const handleMinesTileResult = (data: any) => {
      console.log('💣 Secure tile result from server:', data);
      const { tilePosition, isMine, currentMultiplier, gameOver } = data;
      
      // Stop the animation for this tile
      setAnimatingTiles(prev => {
        const newAnimating = new Set(prev);
        newAnimating.delete(tilePosition);
        return newAnimating;
      });
      
      // Reveal the tile
      setRevealedTiles(prev => {
        const newRevealed = new Set(prev);
        newRevealed.add(tilePosition);
        return newRevealed;
      });
      
      if (isMine) {
        // 💥 MINE HIT! Server-validated
        console.log('💥 MINE HIT!', tilePosition);
        
        // 🔊 Play mine explosion sounds
        playSound('mine-explosion');
        
        // Add to mines array for rendering
        setMines(prev => {
          if (!prev.includes(tilePosition)) {
            return [...prev, tilePosition];
          }
          return prev;
        });
        
        // Add explosion animation immediately
        setExplodedTiles(prev => {
          const newExploded = new Set(prev);
          newExploded.add(tilePosition);
          return newExploded;
        });
        
        // End the player's turn immediately
        setPlayerTurnComplete(true);
        setCurrentMultiplier(0);
        
        // Show dramatic game over effect with screen shake
        document.body.style.animation = 'shake 0.6s ease-in-out';
        setTimeout(() => {
          document.body.style.animation = '';
        }, 600);
        
        // Game over notification
        console.log('🚨 GAME OVER - Mine exploded!');
        
      } else {
        // 💎 Safe tile - gem! Server-validated
        console.log('💎 Safe tile!', tilePosition);
        
        // 🔊 Play gem reveal and multiplier sounds
        playSound('gem-reveal');
        
        // Update multiplier from server
        setCurrentMultiplier(currentMultiplier);
        
        // Play multiplier sound based on value
        if (currentMultiplier > 2.0) {
          playSound('coin-win');
          // Add tension as multiplier gets higher
          if (currentMultiplier > 4.0) {
            playSound('tension');
          }
        } else {
          playSound('coin-win');
        }
        
        // Pulse multiplier animation
        setMultiplierPulse(true);
        setTimeout(() => setMultiplierPulse(false), 300);
        
        console.log(`💰 Current multiplier: ${currentMultiplier.toFixed(2)}x`);
        }
    };

    const handleMinesWaitingForReady = (data: any) => {
      console.log('⏳ Waiting for players to be ready:', data);
      setGamePhase('waiting-for-ready');
      setReadyCountdown(20); // Start 20-second countdown
    };

    const handlePlayerMinesRoundReady = (data: any) => {
      console.log('✅ Player ready for next round:', data);
      // Could show "Player X is ready" indicator
    };

    const handleError = (data: any) => {
      console.error('❌ Socket error:', data);
      alert(`Error: ${data.message}`);
    };

    // Register event listeners
    socketService.on('match_state', handleMatchState);
    socketService.on('mines_round_started', handleMinesRoundStarted);
    socketService.on('opponent_mines_turn_complete', handleOpponentTurnComplete);
    socketService.on('mines_round_result', handleMinesRoundResult);
    socketService.on('mines_tile_result', handleMinesTileResult); // 🛡️ Secure server validation
    socketService.on('mines_waiting_for_ready', handleMinesWaitingForReady);
    socketService.on('player_mines_round_ready', handlePlayerMinesRoundReady);
    socketService.on('error', handleError);

    return () => {
      // Cleanup event listeners
      socketService.off('match_state', handleMatchState);
      socketService.off('mines_round_started', handleMinesRoundStarted);
      socketService.off('opponent_mines_turn_complete', handleOpponentTurnComplete);
      socketService.off('mines_round_result', handleMinesRoundResult);
      socketService.off('mines_tile_result', handleMinesTileResult); // 🛡️ Secure server validation
      socketService.off('mines_waiting_for_ready', handleMinesWaitingForReady);
      socketService.off('player_mines_round_ready', handlePlayerMinesRoundReady);
      socketService.off('error', handleError);
    };
  }, [isAuthenticated, publicKey, user?.walletAddress]);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Ready countdown timer (20-second anti-grief timer)
  useEffect(() => {
    if (readyCountdown > 0 && gamePhase === 'waiting-for-ready') {
      const timer = setTimeout(() => {
        setReadyCountdown(readyCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [readyCountdown, gamePhase]);

  // Handle tile click - INSTANT local checking (like crash game)
  const handleTileClick = (row: number, col: number) => {
    if (playerTurnComplete || gamePhase !== 'playing' || revealingResult) return;
    
    const tileKey = `${row},${col}`;
    if (revealedTiles.has(tileKey)) return;

    // 🔊 Play tile click sound
    playSound('click');

    // Add smooth reveal animation
    setAnimatingTiles(prev => {
      const newAnimating = new Set(prev);
    newAnimating.add(tileKey);
      return newAnimating;
    });

    // 🛡️ SECURE: Send tile check to server for validation (prevents cheating)
    const userWallet = publicKey?.toString() || user?.walletAddress;
    if (currentMatch && userWallet) {
      socketService.emit('check_mines_tile', {
        matchId: currentMatch.id,
        playerId: userWallet,
        tilePosition: tileKey
      });
    }
  };

  // Calculate Stake-style mines multiplier
  const calculateMinesMultiplier = (safeTilesRevealed: number): number => {
    if (safeTilesRevealed === 0) return 1.0;
    if (safeTilesRevealed >= 20) return 100.0;
    
    // Stake.com mines formula approximation
    const safeTilesTotal = 20; // 25 tiles - 5 mines
    const remaining = safeTilesTotal - safeTilesRevealed;
    if (remaining <= 0) return 100.0;
    
    const multiplier = safeTilesTotal / remaining;
    return Math.max(1.0, multiplier);
  };

  // Cash out (submit turn)
  const handleCashOut = async () => {
    if (!currentMatch || playerTurnComplete || revealedTiles.size === 0) return;

    try {
      const wallet = publicKey?.toString() || user?.walletAddress;
      if (!wallet) {
        throw new Error('No wallet address available');
      }
      
      // 🔊 Play cash out sound based on multiplier
      if (currentMultiplier >= 3.0) {
        playSound('big-win');
      } else {
        playSound('cash-out');
      }
      
      const revealedArray = Array.from(revealedTiles);
      
      console.log(`💣 Submitting mines turn: ${revealedArray.length} tiles revealed`);
      
      socketService.emit('submit_mines_turn', {
        matchId: currentMatch.id,
        playerId: wallet,
        revealedTiles: revealedArray
      });

      setPlayerTurnComplete(true);
    } catch (error) {
      console.error('❌ Error submitting mines turn:', error);
      alert('Failed to submit turn. Please try again.');
    }
  };

  // Ready for next round
  const handleReadyForNextRound = async () => {
    if (!currentMatch) return;

    try {
      const wallet = publicKey?.toString() || user?.walletAddress;
      if (!wallet) {
        throw new Error('No wallet address available');
      }

      console.log('✅ Player ready for next round');
      
      socketService.emit('mines_round_ready', {
        matchId: currentMatch.id,
        playerId: wallet
      });

      // Show that this player is ready
      setGamePhase('round-countdown');
      setCountdown(0); // Waiting for other player
    } catch (error) {
      console.error('❌ Error signaling ready for next round:', error);
      alert('Failed to signal readiness. Please try again.');
    }
  };

  // Create match
  const handleCreateMatch = async () => {
    if (!isAuthenticated) {
      alert('Please sign in first');
      return;
    }

    if (!hasVaultFunds) {
      alert('Please deposit funds to your vault first');
      return;
    }

    try {
      setGamePhase('creating');
      
      // 🔊 Play button click sound
      playSound('click');
      
      const match = await matchService.createMinesMatch(wagerAmount);
      setCurrentMatch(match);
      setGamePhase('waiting');
      console.log('✅ Mines match created:', match.id);
      
      // Join the WebSocket room for this match
      const userWallet = publicKey?.toString() || user?.walletAddress;
      if (userWallet) {
        socketService.emit('join_match', { matchId: match.id, playerId: userWallet });
        console.log('🔌 Joined WebSocket room for match:', match.id);
      }
    } catch (error) {
      console.error('❌ Error creating match:', error);
      alert('Failed to create match. Please try again.');
      setGamePhase('lobby');
    }
  };

  // Join match
  const handleJoinMatch = async (matchId: string) => {
    if (!isAuthenticated) {
      alert('Please sign in first');
      return;
    }

    try {
      setGamePhase('joining');
      
      // 🔊 Play match join sound
      playSound('click');
      
      const match = await matchService.joinMatch(matchId);
      setCurrentMatch(match);
      console.log('✅ Joined mines match:', matchId);
      
      // Join the WebSocket room for this match
      const userWallet = publicKey?.toString() || user?.walletAddress;
      if (userWallet) {
        socketService.emit('join_match', { matchId: matchId, playerId: userWallet });
        console.log('🔌 Joined WebSocket room for match:', matchId);
      }
      
      // The match_state event will handle starting the first round
    } catch (error) {
      console.error('❌ Error joining match:', error);
      alert('Failed to join match. Please try again.');
      setGamePhase('lobby');
    }
  };

  // Load available matches
  const loadAvailableMatches = async () => {
    try {
      const matches = await matchService.getAvailableMinesMatches();
      setAvailableMatches(matches || []);
    } catch (error) {
      console.error('❌ Error loading matches:', error);
    }
  };

  // Load matches on component mount
  useEffect(() => {
    if (gamePhase === 'lobby') {
      loadAvailableMatches();
    }
  }, [gamePhase]);

  // Victory screen handlers - exact same as RPS
  const handleShareVictory = useCallback(() => {
    if (!roundResult) return;
    
    const userWallet = publicKey?.toString() || user?.walletAddress;
    const playerWonMatch = roundResult.matchWinner === userWallet;
    const gameText = `Mines`;
    
    const shareText = `${playerWonMatch ? '🏆' : '💔'} ${gameText} on PV3\n\n` +
      `Result: ${playerWonMatch ? 'Victory' : 'Defeat'}\n` +
      `Final Score: ${roundResult.matchScore?.player || 0} - ${roundResult.matchScore?.opponent || 0}\n` +
      `Wager: ${wagerAmount} SOL\n\n` +
      `Play at PV3.GAME 🎮`;

    if (navigator.share) {
      navigator.share({
        title: `PV3 Mines ${playerWonMatch ? 'Victory' : 'Result'}`,
        text: shareText,
        url: window.location.origin
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(shareText).then(() => {
        alert('Result copied to clipboard!');
      });
    }
  }, [roundResult, publicKey, user, wagerAmount]);

  const handleGeneratePnLCard = useCallback(() => {
    if (!roundResult) return;
    setShowPnLCard(true);
  }, [roundResult]);

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
    if (!opponent || rematchLoading || vaultBalance < wagerAmount * 2 * 1000000000) return;
    
    setRematchLoading(true);
    try {
      // Temporarily double the wager for this match
      const originalWager = wagerAmount;
      setWagerAmount(wagerAmount * 2);
      await handleCreateMatch();
      setWagerAmount(originalWager); // Reset wager amount
      playSound('success');
    } catch (error) {
      console.error('Failed to create 2x stake rematch:', error);
      playSound('error');
    } finally {
      setRematchLoading(false);
    }
  }, [opponent, rematchLoading, vaultBalance, wagerAmount, handleCreateMatch]);

  const handleQuickMatch = useCallback(async () => {
    try {
      // Reset to lobby and trigger quick match
      setGamePhase('lobby');
      setCurrentMatch(null);
      setRoundResult(null);
      setPlayerScore(0);
      setOpponentScore(0);
      setCurrentRound(1);
      
      // Find and join an available match or create new one
      await loadAvailableMatches();
      playSound('click');
    } catch (error) {
      console.error('Failed to start quick match:', error);
      playSound('error');
    }
  }, [loadAvailableMatches]);

  // 🔥 DRAG & DROP PANEL SYSTEM HANDLERS 🔥
  const handleDragStart = useCallback((e: React.DragEvent, panelId: string) => {
    setIsDragging(true);
    setDraggedPanel(panelId);
    e.dataTransfer.setData('text/plain', panelId);
    e.dataTransfer.effectAllowed = 'move';
    playSound('click');
  }, []);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    setDraggedPanel(null);
    setIsOverDropZone(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!isOverDropZone) {
      setIsOverDropZone(true);
    }
  }, [isOverDropZone]);

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

  // Render tile
  const renderTile = (row: number, col: number) => {
    const tileKey = `${row},${col}`;
    const isRevealed = revealedTiles.has(tileKey);
    const isMine = mines.includes(tileKey);
    const isAnimating = animatingTiles.has(tileKey);
    const isExploded = explodedTiles.has(tileKey);
    
    return (
      <button
        key={tileKey}
        onClick={() => handleTileClick(row, col)}
        disabled={playerTurnComplete || gamePhase !== 'playing' || revealingResult}
        className={`
          ${isFullscreen ? 'w-40 h-40' : 'w-32 h-32'} font-bold text-3xl transition-all duration-300 relative overflow-hidden
          ${isRevealed 
            ? `bg-bg-card/30 border-2 border-border rounded-xl flex items-center justify-center ${isAnimating ? 'animate-bounce' : ''} ${isExploded ? 'animate-pulse' : ''}`
            : `bg-transparent border-0 ${isAnimating ? 'animate-bounce' : ''}`
          }
          ${playerTurnComplete || revealingResult ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-105 active:scale-95'}
          ${isAnimating ? 'scale-110' : ''}
          group
        `}
        style={{
          ...(isRevealed ? {} : {
            backgroundImage: 'url(/mines-game/minescover.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }),
          margin: '0px',
          padding: 0,
          border: 'none',
          outline: 'none',
          boxSizing: 'border-box'
        }}
      >
        {/* Explosion effect for mines */}
        {isExploded && (
          <div className="absolute inset-0 bg-orange-400 animate-ping rounded-lg"></div>
        )}
        
        {/* Reveal animation */}
        {isAnimating && (
          <div className="absolute inset-0 bg-blue-400 opacity-50 animate-pulse rounded-lg"></div>
        )}
        

        
        {/* Content */}
        <span className={`relative z-3 ${isRevealed && !isMine ? 'animate-gem-sparkle' : ''} ${isRevealed && isMine ? 'animate-mine-explode' : ''}`}>
          {isRevealed && (isMine ? '💣' : '💎')}
        </span>
        
        {/* Mine reveal effect during result phase */}
        {revealingResult && isMine && !isRevealed && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-500/20 border-2 border-red-400 rounded-xl animate-fade-in">
            <span className="text-3xl animate-pulse">💣</span>
          </div>
        )}
      </button>
    );
  };

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
              <div className="bg-bg-elevated border border-border rounded-xl overflow-y-auto relative scrollbar-hide" 
                   style={{ 
                     height: isFullscreen ? '95vh' : '950px', 
                     minHeight: isFullscreen ? '95vh' : '950px',
                     width: isFullscreen ? '95vw' : 'auto'
                   }}>
                
                {/* Animated Background Layer - Only during active gameplay */}
                {gamePhase !== 'lobby' && (
                  <div 
                    className="absolute inset-0 rounded-xl"
                    style={{ 
                      backgroundImage: 'url(/mines-game/gamebackground.png)',
                      backgroundSize: '105%',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat',
                      animation: 'minesBackgroundFloat 8s ease-in-out infinite alternate, minesBackgroundShift 12s linear infinite'
                    }}
                  />
                )}
                
                {/* Game Content Container */}
                  <div className="h-full flex flex-col relative z-1 bg-black/10 backdrop-blur-[0.5px]">
                  
                  {/* Game Header - Compact with Round Info */}
                  <div className="flex-shrink-0 px-6 py-4 border-b border-border">
                    <div className="flex items-center justify-between">
                      <div>
                        <h1 className="text-2xl font-bold text-text-primary font-audiowide uppercase">💣 Mines</h1>
                        <p className="text-sm text-text-secondary font-inter">First to 3 wins • 5x5 grid • 5 mines</p>
                      </div>
                      
                      {/* Round Info - Show during active game and results */}
                      {(gamePhase === 'playing' || gamePhase === 'revealing' || gamePhase === 'round-countdown' || gamePhase === 'waiting-for-ready') && (
                        <div className="flex items-center gap-8">
                          <div className="text-center">
                            <p className="text-sm text-text-secondary">You</p>
                            <p className="text-xl font-bold">{playerScore}</p>
                          </div>
                          <div className="text-center">
                            {/* Show round result status if available */}
                            {(gamePhase === 'round-countdown' || gamePhase === 'waiting-for-ready') && roundResult ? (
                              <div>
                                {(() => {
                                  const userWallet = publicKey?.toString() || user?.walletAddress;
                                  const playerWonRound = roundResult.roundWinner === userWallet;
                                  const roundWasTie = !roundResult.roundWinner;
                                  
                                  if (roundWasTie) {
                                    return <p className="text-lg font-bold text-yellow-400">🤝 Round Tied</p>;
                                  } else if (playerWonRound) {
                                    return <p className="text-lg font-bold text-green-400">🎉 Round Won</p>;
                                  } else {
                                    return <p className="text-lg font-bold text-red-400">😞 Round Lost</p>;
                                  }
                                })()}
                                <p className="text-xs text-text-secondary">Round {currentRound} Complete</p>
                              </div>
                            ) : (
                              <div>
                                <p className="text-lg font-bold">Round {currentRound}</p>
                                <p className="text-xs text-text-secondary">First to 3</p>
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
                    <div className="glass-card p-6 text-center">
                      <h2 className="text-2xl font-bold text-text-primary mb-4 font-audiowide">Create Match</h2>
                      
                      <div className="mb-4">
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

                      <div className="mb-4">
                        <div className="text-sm text-text-secondary font-inter">
                          Vault Balance: {formatSOL(vaultBalance)}
                        </div>
                      </div>
                        
                      <button
                        onClick={handleCreateMatch}
                        disabled={!isAuthenticated || !hasVaultFunds || vaultBalance < wagerAmount * 1000000000}
                        className="primary-button font-audiowide disabled:opacity-50"
                      >
                        Create Match ({wagerAmount} SOL)
                      </button>
                    </div>

                    {/* Join Match */}
                    <div className="glass-card p-6">
                      <h2 className="text-2xl font-bold text-text-primary mb-4 font-audiowide text-center">Available Matches</h2>
                      
                      <div className="space-y-4 max-h-64 overflow-y-auto">
                        {availableMatches.length === 0 ? (
                          <div className="text-center text-text-secondary py-8">
                            <div className="text-4xl mb-4">💣</div>
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
                                onClick={() => handleJoinMatch(match.id)}
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
                <div className="mt-6">
                  <div className="glass-card p-6">
                    <MinesQuickMatch 
                      onMatchFound={(matchId) => {
                        // Join existing match
                        handleJoinMatch(matchId);
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
                <div className="max-w-2xl mx-auto text-center">
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
                <div className="max-w-2xl mx-auto text-center">
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

                          {/* DEBUG: Current game phase */}
                          {console.log('🔍 Current gamePhase:', gamePhase, 'playerTurnComplete:', playerTurnComplete, 'opponentTurnComplete:', opponentTurnComplete)}

              {/* Playing Phase - Ultra Compact Layout */}
              {gamePhase === 'playing' && (
                <div className="flex flex-col items-center justify-start min-h-[600px] px-4 -mt-8 ml-8">
                  
                  {/* Mines Grid - Perfectly Centered with Better Spacing */}
                                              <div className="grid grid-cols-5 gap-0 mb-6 mr-4">
                      {Array.from({ length: 25 }, (_, index) => {
                        const row = Math.floor(index / 5);
                        const col = index % 5;
                        return renderTile(row, col);
                      })}
                      </div>

                  {/* Cash Out Button - Centered Below Grid */}
                  {revealedTiles.size > 0 && (
                      <button
                        onClick={handleCashOut}
                        className="px-8 py-4 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg transition-all duration-200 font-audiowide text-xl"
                      >
                        💰 Cash Out ({currentMultiplier.toFixed(2)}x)
                      </button>
                  )}
                    </div>
              )}
                    
                          {/* Revealing Phase - Compact Layout */}
                          {gamePhase === 'revealing' && (
                            <div className="flex flex-col items-center justify-start min-h-[600px] px-4 -mt-8 ml-8">
                              
                              {/* Mines Grid - Perfectly Centered with Better Spacing */}
                              <div className="grid grid-cols-5 gap-0 mb-6 mr-4">
                                  {Array.from({ length: 25 }, (_, index) => {
                                    const row = Math.floor(index / 5);
                                    const col = index % 5;
                                    return renderTile(row, col);
                                  })}
                        </div>

                              {/* Status */}
                                <div className="text-text-secondary">
                                  <div className="animate-spin inline-block w-4 h-4 border-2 border-accent-primary border-t-transparent rounded-full mr-2"></div>
                                  Revealing mines...
                  </div>
                            </div>
                          )}

              {/* Round Countdown - Compact Layout */}
              {gamePhase === 'round-countdown' && roundResult && (
                <div className="text-center space-y-6">
                  
                  {/* Round Results - Compact */}
                  <div className="py-2">
                    <div className="grid grid-cols-2 gap-8 mb-4">
                      <div className="space-y-1">
                        <p className="text-sm text-text-secondary">Your Result</p>
                        <p className={`text-lg font-bold ${roundResult.playerResult.hitMine ? 'text-red-400' : 'text-green-400'}`}>
                          {roundResult.playerResult.hitMine ? '💣 Hit Mine!' : `💎 ${roundResult.playerResult.multiplier.toFixed(2)}x`}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-text-secondary">Opponent Result</p>
                        <p className={`text-lg font-bold ${roundResult.opponentResult.hitMine ? 'text-red-400' : 'text-green-400'}`}>
                          {roundResult.opponentResult.hitMine ? '💣 Hit Mine!' : `💎 ${roundResult.opponentResult.multiplier.toFixed(2)}x`}
                        </p>
                      </div>
                    </div>
                    </div>
                    
                  {/* Mine Reveal Grid - Perfectly Centered */}
                  <div className="flex justify-center mb-6">
                                         <div className="grid grid-cols-5 gap-0">
                    {Array.from({ length: 25 }, (_, index) => {
                      const row = Math.floor(index / 5);
                      const col = index % 5;
                      return renderTile(row, col);
                    })}
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

                          {/* Waiting for Ready - Compact Layout */}
                          {gamePhase === 'waiting-for-ready' && roundResult && (
                            <div className="text-center space-y-6">
                              
                              {/* Round Results - Compact */}
                              <div className="py-2">
                                <div className="grid grid-cols-2 gap-8 mb-4">
                                  <div className="space-y-1">
                                    <p className="text-sm text-text-secondary">Your Result</p>
                                    <p className={`text-lg font-bold ${roundResult.playerResult.hitMine ? 'text-red-400' : 'text-green-400'}`}>
                        {roundResult.playerResult.hitMine ? '💣 Hit Mine!' : `💎 ${roundResult.playerResult.multiplier.toFixed(2)}x`}
                      </p>
                    </div>
                                  <div className="space-y-1">
                                    <p className="text-sm text-text-secondary">Opponent Result</p>
                                    <p className={`text-lg font-bold ${roundResult.opponentResult.hitMine ? 'text-red-400' : 'text-green-400'}`}>
                        {roundResult.opponentResult.hitMine ? '💣 Hit Mine!' : `💎 ${roundResult.opponentResult.multiplier.toFixed(2)}x`}
                      </p>
                                  </div>
                    </div>
                  </div>

                  {/* Mine Reveal Grid - Perfectly Centered */}
                  <div className="flex justify-center mb-6">
                                         <div className="grid grid-cols-5 gap-0">
                    {Array.from({ length: 25 }, (_, index) => {
                      const row = Math.floor(index / 5);
                      const col = index % 5;
                      return renderTile(row, col);
                    })}
                    </div>
                  </div>

                              {/* Ready Button */}
                              <div>
                                <button
                                  onClick={handleReadyForNextRound}
                                  className="px-8 py-4 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg transition-all duration-200 font-audiowide text-xl"
                                >
                                  ✅ Ready for Next Round
                                </button>
                                <p className="text-text-secondary mt-4">
                                  Click when you&apos;re ready to continue
                                  <br />
                                  <span className="text-yellow-400 font-bold">
                                    Auto-start in {readyCountdown}s
                                  </span>
                                </p>
                  </div>
                </div>
              )}

              {/* Finished Phase - Same as RPS */}
              {gamePhase === 'finished' && roundResult && (
                <div className="text-center space-y-4">
                  <div className="text-8xl mb-6">
                    {(() => {
                      const userWallet = publicKey?.toString() || user?.walletAddress;
                      const playerWonMatch = roundResult.matchWinner === userWallet;
                      return playerWonMatch ? '🏆' : '💔';
                    })()}
                  </div>
                  
                  <div className="mb-6">
                    <div className="text-2xl font-bold text-text-primary font-audiowide mb-2">
                      {(() => {
                        const userWallet = publicKey?.toString() || user?.walletAddress;
                        const playerWonMatch = roundResult.matchWinner === userWallet;
                        return playerWonMatch ? '🏆 Victory!' : '💔 Defeat';
                      })()}
                    </div>
                    <div className="text-lg text-text-secondary font-inter">
                      {(() => {
                        const userWallet = publicKey?.toString() || user?.walletAddress;
                        const playerWonMatch = roundResult.matchWinner === userWallet;
                        return playerWonMatch ? 
                          `+${(wagerAmount * 2 * 0.935).toFixed(3)} SOL` : 
                          `-${wagerAmount} SOL`;
                      })()}
                    </div>
                    
                    <div className="text-sm text-text-secondary font-inter mt-2">
                      Final Score: {roundResult.matchScore?.player || 0} - {roundResult.matchScore?.opponent || 0}
                    </div>
                  </div>

                  {/* Professional Button Grid with Tooltips - Same as RPS */}
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
                    
                    {/* Share Result Card */}
                    <div className="relative group">
                      <button
                        onClick={handleShareVictory}
                        className={`relative w-full font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 shadow-lg hover:shadow-2xl border ${
                          (() => {
                            const userWallet = publicKey?.toString() || user?.walletAddress;
                            const playerWonMatch = roundResult.matchWinner === userWallet;
                            return playerWonMatch 
                              ? 'bg-gradient-to-br from-green-600 via-green-500 to-green-600 hover:from-green-500 hover:via-green-400 hover:to-green-500 shadow-green-500/30 border-green-400/50' 
                              : 'bg-gradient-to-br from-cyan-600 via-cyan-500 to-cyan-600 hover:from-cyan-500 hover:via-cyan-400 hover:to-cyan-500 shadow-cyan-500/30 border-cyan-400/50';
                          })()
                        } text-white`}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-xl"></div>
                        <div className="relative">
                          <div className="text-lg mb-1">📱 Share {(() => {
                            const userWallet = publicKey?.toString() || user?.walletAddress;
                            const playerWonMatch = roundResult.matchWinner === userWallet;
                            return playerWonMatch ? 'Victory' : 'Result';
                          })()}</div>
                          <div className="text-xs opacity-90 font-semibold">
                            {(() => {
                              const userWallet = publicKey?.toString() || user?.walletAddress;
                              const playerWonMatch = roundResult.matchWinner === userWallet;
                              return playerWonMatch ? 'Brag Rights' : 'Show Results';
                            })()}
                          </div>
                        </div>
                      </button>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black/90 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                        {(() => {
                          const userWallet = publicKey?.toString() || user?.walletAddress;
                          const playerWonMatch = roundResult.matchWinner === userWallet;
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
                      const playerWonMatch = roundResult.matchWinner === userWallet;
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
                        onClick={() => window.location.href = '/classics'}
                        className="relative w-full bg-gradient-to-br from-gray-600 via-gray-500 to-gray-600 text-white font-bold py-4 px-6 rounded-xl hover:from-gray-500 hover:via-gray-400 hover:to-gray-500 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 shadow-lg hover:shadow-2xl shadow-gray-500/30 border border-gray-400/50"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-xl"></div>
                        <div className="relative">
                          <div className="text-lg mb-1">🏠 Back to Games</div>
                          <div className="text-xs opacity-90 font-semibold">Main Menu</div>
                        </div>
                      </button>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black/90 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                        Return to games selection
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black/90"></div>
                      </div>
                    </div>
                  
                  </div>
                </div>
              )}

                          {/* DEBUG: Fallback if no phase matches */}
                          {!['lobby', 'creating', 'waiting', 'joining', 'playing', 'revealing', 'round-countdown', 'waiting-for-ready', 'finished', 'payout-complete'].includes(gamePhase) && (
                            <div className="glass-card p-8 text-center">
                              <h2 className="text-2xl font-bold text-red-400 mb-4">🚨 DEBUG: Unknown Game Phase</h2>
                              <p className="text-lg mb-4">Current phase: <span className="font-mono bg-red-900 px-2 py-1 rounded">{gamePhase}</span></p>
                              <p className="text-sm text-text-secondary">Player turn complete: {playerTurnComplete ? 'Yes' : 'No'}</p>
                              <p className="text-sm text-text-secondary">Opponent turn complete: {opponentTurnComplete ? 'Yes' : 'No'}</p>
                              <button 
                                onClick={() => setGamePhase('lobby')} 
                                className="mt-4 px-4 py-2 bg-red-500 text-white rounded"
                              >
                                Reset to Lobby
                              </button>
                            </div>
                          )}

                        </div>
                        
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Fullscreen Toggle Button - Bottom Right Corner */}
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
              
              {/* Floating Panel Toggle Bar */}
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

                          {/* Floating Panels */}
            <FloatingPanel
              id="mines-overview"
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
              id="mines-chat"
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
              id="mines-settings"
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
              id="mines-stats"
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
              id="mines-favorites"
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
                      <span className="text-accent-primary font-bold">{playerScore}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Opponent Score:</span>
                      <span className="text-red-400 font-bold">{opponentScore}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Current Round:</span>
                      <span className="text-blue-400 font-bold">{currentRound}</span>
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
                                    <span className="text-accent-primary font-bold">{playerScore}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-text-secondary">Opponent Score:</span>
                                    <span className="text-red-400 font-bold">{opponentScore}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-text-secondary">Current Round:</span>
                                    <span className="text-blue-400 font-bold">{currentRound}</span>
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

          {/* Recent Mines Wins - Game Specific */}
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-text-primary font-audiowide mb-2">💣 Recent Mines Victories</h2>
              <p className="text-text-secondary font-inter">Live feed of recent Mines game wins</p>
            </div>
            <RecentWins gameFilter="mines" />
          </div>
        </main>
      </div>

      {/* Victory Card Modal */}
      {showPnLCard && currentMatch && roundResult && (
        <PnLCardModal
          isOpen={showPnLCard}
          onClose={() => setShowPnLCard(false)}
          game="MINES"
          result={(() => {
            const userWallet = publicKey?.toString() || user?.walletAddress;
            const playerWonMatch = roundResult.matchWinner === userWallet;
            return playerWonMatch ? 'WIN' : 'LOSS';
          })()}
          pnlAmount={(() => {
            const userWallet = publicKey?.toString() || user?.walletAddress;
            const playerWonMatch = roundResult.matchWinner === userWallet;
            return playerWonMatch ? 
              (wagerAmount * 2 * 0.935) - wagerAmount : // Net profit after fees
              -wagerAmount; // Loss
          })()}
          pnlPercentage={(() => {
            const userWallet = publicKey?.toString() || user?.walletAddress;
            const playerWonMatch = roundResult.matchWinner === userWallet;
            return playerWonMatch ? 100 : -100; // 100% profit before fees for wins, -100% for losses
          })()}
          wagerAmount={wagerAmount}
          finalAmount={(() => {
            const userWallet = publicKey?.toString() || user?.walletAddress;
            const playerWonMatch = roundResult.matchWinner === userWallet;
            return playerWonMatch ? 
              (wagerAmount * 2 * 0.935) : // Total after fees
              0; // Loss = 0
          })()}
          username={user?.username}
          walletAddress={publicKey?.toString() || user?.walletAddress || ''}
          userAvatar={user?.avatar}
          gameSpecific={{
            finalScore: `${roundResult.matchScore?.player || 0} - ${roundResult.matchScore?.opponent || 0}`,
            totalRounds: currentRound,
            minesRevealed: mines.length,
            gemsCollected: revealedTiles.size - mines.length,
            multiplier: currentMultiplier
          }}
        />
      )}
    </div>
  );
} 