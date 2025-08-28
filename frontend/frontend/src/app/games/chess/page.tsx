'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { usePV3 } from '@/hooks/usePV3';
import { useAuth } from '@/contexts/AuthContext';
import { ChessEngine, Position, PieceColor } from '@/lib/games/chess/chess-engine';
import Sidebar from '@/components/Sidebar';
import PageHeader from '@/components/PageHeader';
import Avatar from '@/components/Avatar';
import socketService from '@/services/socketService';
import matchService, { Match } from '@/services/matchService';
import ChessQuickMatch from '@/components/games/chess/ChessQuickMatch';
import ChatPanel from '@/components/ChatPanel';

// 🚀 PHASE 2: Dynamic imports for chess game components
// Chess engine and board are heavy - load only when needed

const ChessBoard = dynamic(() => import('@/components/games/chess/ChessBoard'), {
  loading: () => (
    <div className="w-full max-w-md mx-auto aspect-square bg-gradient-to-br from-amber-100 to-amber-200 rounded-lg flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">♟️</div>
        <div className="text-amber-800 font-semibold">Loading Chess Board...</div>
      </div>
    </div>
  ),
  ssr: false
});

const ChessTimer = dynamic(() => import('@/components/games/chess/ChessTimer'), {
  loading: () => (
    <div className="bg-gray-800 rounded-lg p-4 animate-pulse">
      <div className="h-8 bg-gray-700 rounded mb-2"></div>
      <div className="h-6 bg-gray-700 rounded"></div>
    </div>
  ),
  ssr: false
});

type GamePhase = 'lobby' | 'creating' | 'waiting' | 'joining' | 'playing' | 'finished';

export default function ChessPage() {
  const router = useRouter();
  const { connected, publicKey, formatSOL, vaultBalance, loading } = usePV3();
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Game state
  const [gamePhase, setGamePhase] = useState<GamePhase>('lobby');
  const [engine, setEngine] = useState<ChessEngine>(new ChessEngine());
  const [playerColor, setPlayerColor] = useState<PieceColor>('white');
  const [wagerAmount, setWagerAmount] = useState(0.1);
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);
  const [availableMatches, setAvailableMatches] = useState<Match[]>([]);
  const [gameResult, setGameResult] = useState<{ winner: PieceColor | 'draw' | null; reason: string } | null>(null);
  const [opponent, setOpponent] = useState<{ id: string; wallet: string; username?: string } | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);

  // Timer state
  const [timeRemaining, setTimeRemaining] = useState({ white: 300000, black: 300000 });

  // Draw offer state
  const [drawOfferSent, setDrawOfferSent] = useState(false);
  const [drawOfferReceived, setDrawOfferReceived] = useState(false);
  const [drawOfferFrom, setDrawOfferFrom] = useState<string | null>(null);

  // Cooldown state
  const [joinCooldown, setJoinCooldown] = useState(false);

  // Check if user is authenticated (either via wallet or email/authenticator)
  const isAuthenticated = connected || user;
  const hasVaultFunds = vaultBalance > 0;

  // Helper function to get user wallet address
  const getUserWalletAddress = useCallback(() => {
    if (publicKey) {
      return publicKey.toString(); // Wallet user
    } else if (user?.walletAddress) {
      return user.walletAddress; // Email/authenticator user
    }
    throw new Error('No wallet address available');
  }, [publicKey, user?.walletAddress]);

  // Helper function to get join button text
  const getJoinButtonText = useCallback(() => {
    if (gamePhase === 'joining') return 'Joining...';
    if (joinCooldown) return 'Wait...';
    return 'Join';
  }, [gamePhase, joinCooldown]);

  // End game function
  const endGame = useCallback(async (winner: PieceColor | 'draw', reason: string) => {
    setGameResult({ winner, reason });
    setGamePhase('finished');

    if (!currentMatch) return;

    try {
      // Determine winner ID for backend
      let winnerId = '';
      if (winner === 'white') {
        winnerId = currentMatch.player1.id;
      } else if (winner === 'black') {
        winnerId = currentMatch.player2?.id || '';
      }

      // Convert reason to backend-expected format
      let gameWinner: string;
      let endReason: string;
      
      if (reason.includes('checkmate')) {
        gameWinner = winner; // 'white', 'black', or 'draw'
        endReason = 'checkmate';
      } else if (reason.includes('resigned')) {
        gameWinner = winner; // 'white', 'black', or 'draw'
        endReason = 'resignation';
      } else if (reason.includes('time')) {
        gameWinner = winner; // 'white', 'black', or 'draw'
        endReason = 'timeout';
      } else if (reason.includes('Draw')) {
        gameWinner = 'draw';
        endReason = 'draw';
      } else {
        gameWinner = 'draw';
        endReason = 'draw';
      }

      // Submit result to backend with correct format
      await matchService.submitMatchResult(currentMatch.id, winnerId, {
        moves: engine.moveHistory,
        winner: gameWinner, // ✅ Fixed: Use 'winner' instead of 'outcome'
        endReason,
        whiteTime: engine.whiteTime,
        blackTime: engine.blackTime,
        finalPosition: JSON.stringify(engine.board), // Convert board to string
      });

      // Notify other players via websocket
      socketService.submitMatchResult(currentMatch.id, winnerId, {
        reason,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Failed to submit match result:', error);
    }
  }, [currentMatch, engine]);

  // Load available matches
  const loadAvailableMatches = useCallback(async () => {
    try {
      const matches = await matchService.getAvailableChessMatches();
      console.log('🎯 Available matches loaded:', matches);
      matches.forEach((match, index) => {
        console.log(`🎯 Match ${index}: ID="${match.id}", type=${typeof match.id}, length=${match.id?.length}`);
      });
      setAvailableMatches(matches);
    } catch (error) {
      console.error('Failed to load matches:', error);
    }
  }, []);

  // Websocket event handlers
  const handleMatchState = useCallback((data: { match: Match; connectedPlayers: number }) => {
    console.log('Match state received:', data);
    setCurrentMatch(data.match);
    
    if (data.match.status === 'in_progress' && data.connectedPlayers === 2) {
      // Determine player color based on match participants
      const userWallet = getUserWalletAddress();
      const isPlayer1 = data.match.player1.wallet === userWallet;
      setPlayerColor(isPlayer1 ? 'white' : 'black');
      setOpponent(isPlayer1 ? data.match.player2! : data.match.player1);
      setGamePhase('playing');
      setEngine(new ChessEngine());
    }
  }, [getUserWalletAddress]);

  const handlePlayerJoined = useCallback((data: { playerId: string; matchId: string }) => {
    console.log('Player joined:', data);
    if (currentMatch?.id === data.matchId) {
      loadAvailableMatches(); // Refresh match list
    }
  }, [currentMatch?.id, loadAvailableMatches]);

  const handleOpponentMove = useCallback((data: { playerId: string; moveData: { from: Position; to: Position; piece: string; timestamp: number } }) => {
    console.log('Opponent move received:', data);
    
    // Apply opponent's move to our engine
    const success = engine.makeMove(data.moveData.from, data.moveData.to);
    if (success) {
      // Check for game end
      const winner = engine.getWinner();
      if (winner !== null) {
        const reason = winner === 'draw' ? 'Draw' : 
                      winner === 'white' ? 'White wins by checkmate' : 
                      winner === 'black' ? 'Black wins by checkmate' : 'Draw';
        endGame(winner, reason);
      }

      // Force re-render
      const newEngine = new ChessEngine();
      newEngine.board = [...engine.board.map(row => [...row])];
      newEngine.currentPlayer = engine.currentPlayer;
      newEngine.gameState = engine.gameState;
      newEngine.moveHistory = [...engine.moveHistory];
      newEngine.whiteTime = engine.whiteTime;
      newEngine.blackTime = engine.blackTime;
      newEngine.lastMoveTime = engine.lastMoveTime;
      setEngine(newEngine);
    }
  }, [engine, endGame]);

  const handleMatchCompleted = useCallback((data: { matchId: string; winner: string; gameData: Record<string, unknown> }) => {
    console.log('Match completed:', data);
    if (currentMatch?.id === data.matchId) {
      // Match completed remotely
      setGamePhase('finished');
    }
  }, [currentMatch?.id]);

  const handlePlayerDisconnected = useCallback((data: { playerId: string; matchId: string }) => {
    console.log('Player disconnected:', data);
    if (currentMatch?.id === data.matchId) {
      // Opponent disconnected - player wins
      endGame(playerColor, 'Opponent disconnected');
    }
  }, [currentMatch?.id, playerColor, endGame]);

  // Draw offer event handlers
  const handleDrawOfferReceived = useCallback((data: { matchId: string; fromPlayer: string }) => {
    console.log('Draw offer received:', data);
    const userWallet = getUserWalletAddress();
    if (currentMatch?.id === data.matchId && data.fromPlayer !== userWallet) {
      setDrawOfferReceived(true);
      setDrawOfferFrom(data.fromPlayer);
    }
  }, [currentMatch?.id, getUserWalletAddress]);

  const handleDrawOfferAccepted = useCallback((data: { matchId: string; byPlayer: string }) => {
    console.log('Draw offer accepted:', data);
    if (currentMatch?.id === data.matchId) {
      endGame('draw', 'Draw by mutual agreement');
      setDrawOfferSent(false);
    }
  }, [currentMatch?.id, endGame]);

  const handleDrawOfferDeclined = useCallback((data: { matchId: string; byPlayer: string }) => {
    console.log('Draw offer declined:', data);
    if (currentMatch?.id === data.matchId) {
      setDrawOfferSent(false);
    }
  }, [currentMatch?.id]);

  // Resignation event handler
  const handlePlayerResigned = useCallback((data: { matchId: string; resignedPlayer: string }) => {
    console.log('Player resigned:', data);
    const userWallet = getUserWalletAddress();
    if (currentMatch?.id === data.matchId && data.resignedPlayer !== userWallet) {
      // Opponent resigned - player wins
      endGame(playerColor, 'Opponent resigned');
    }
  }, [currentMatch?.id, getUserWalletAddress, playerColor, endGame]);

  // Initialize websocket connection
  useEffect(() => {
    if (!isAuthenticated) return;

    const initSocket = async () => {
      try {
        await socketService.connect();
        setSocketConnected(true);

        // Set up game event listeners with proper type casting
        socketService.on('match_state', (data: unknown) => handleMatchState(data as { match: Match; connectedPlayers: number }));
        socketService.on('player_joined', (data: unknown) => handlePlayerJoined(data as { playerId: string; matchId: string }));
        socketService.on('game_move', (data: unknown) => handleOpponentMove(data as { playerId: string; moveData: { from: Position; to: Position; piece: string; timestamp: number } }));
        socketService.on('match_completed', (data: unknown) => handleMatchCompleted(data as { matchId: string; winner: string; gameData: Record<string, unknown> }));
        socketService.on('player_disconnected', (data: unknown) => handlePlayerDisconnected(data as { playerId: string; matchId: string }));
        socketService.on('draw_offer_received', (data: unknown) => handleDrawOfferReceived(data as { matchId: string; fromPlayer: string }));
        socketService.on('draw_offer_accepted', (data: unknown) => handleDrawOfferAccepted(data as { matchId: string; byPlayer: string }));
        socketService.on('draw_offer_declined', (data: unknown) => handleDrawOfferDeclined(data as { matchId: string; byPlayer: string }));
        socketService.on('player_resigned', (data: unknown) => handlePlayerResigned(data as { matchId: string; resignedPlayer: string }));
      } catch (error) {
        console.error('Failed to connect to game server:', error);
      }
    };

    initSocket();

    return () => {
      socketService.off('match_state');
      socketService.off('player_joined');
      socketService.off('game_move');
      socketService.off('match_completed');
      socketService.off('player_disconnected');
      socketService.off('draw_offer_received');
      socketService.off('draw_offer_accepted');
      socketService.off('draw_offer_declined');
      socketService.off('player_resigned');
    };
  }, [isAuthenticated, handleMatchState, handlePlayerJoined, handleOpponentMove, handleMatchCompleted, handlePlayerDisconnected, handleDrawOfferReceived, handleDrawOfferAccepted, handleDrawOfferDeclined, handlePlayerResigned]);

  // Load available matches
  useEffect(() => {
    if (gamePhase === 'lobby' && socketConnected) {
      loadAvailableMatches();
    }
  }, [gamePhase, socketConnected, loadAvailableMatches]);

  // Timer updates during game
  useEffect(() => {
    if (gamePhase !== 'playing') return;

    const interval = setInterval(() => {
      const newTime = engine.getTimeRemaining();
      setTimeRemaining(newTime);

      // Check for timeout
      if (newTime.white <= 0 || newTime.black <= 0) {
        const winner = newTime.white <= 0 ? 'black' : 'white';
        endGame(winner, `${winner === 'white' ? 'White' : 'Black'} wins on time`);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [gamePhase, engine, endGame]);

  // Create a new chess match
  const createMatch = useCallback(async () => {
    if (!isAuthenticated || vaultBalance < wagerAmount * 1000000000) {
      alert('Insufficient vault balance');
      return;
    }

    setGamePhase('creating');
    try {
      console.log('🎯 Creating chess match...');
      const match = await matchService.createChessMatch(wagerAmount);
      setCurrentMatch(match);
      setGamePhase('waiting');
      
      // Join the match room via websocket
      socketService.joinMatch(match.id, getUserWalletAddress());
    } catch (error) {
      console.error('Failed to create match:', error);
      alert(`Failed to create match: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setGamePhase('lobby');
    }
  }, [isAuthenticated, vaultBalance, wagerAmount, getUserWalletAddress]);

  // Join an existing match
  const joinMatch = useCallback(async (matchId: string) => {
    if (!isAuthenticated || joinCooldown) return;

    console.log('🎯 Chess page: Attempting to join match with ID:', matchId);
    console.log('🎯 Chess page: Match ID type:', typeof matchId);
    console.log('🎯 Chess page: Match ID length:', matchId?.length);

    setGamePhase('joining');
    setJoinCooldown(true);
    
    try {
      const match = await matchService.joinMatch(matchId);
      setCurrentMatch(match);
      
      // Join the match room via websocket
      socketService.joinMatch(match.id, getUserWalletAddress());
      
      // Game should start automatically when both players are connected
    } catch (error) {
      console.error('Failed to join match:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to join match. Please try again.';
      alert(errorMessage);
      setGamePhase('lobby');
    } finally {
      // Reset cooldown after 2 seconds
      setTimeout(() => {
        setJoinCooldown(false);
      }, 2000);
    }
  }, [isAuthenticated, getUserWalletAddress, joinCooldown]);

  // Handle chess moves
  const handleMove = useCallback((from: Position, to: Position) => {
    if (engine.currentPlayer !== playerColor || !currentMatch) return;

    const success = engine.makeMove(from, to);
    if (success) {
      // Send move to opponent via websocket
      socketService.sendChessMove(currentMatch.id, getUserWalletAddress(), {
        from,
        to,
        piece: engine.getPiece(to).piece!,
        timestamp: Date.now(),
      });

      // Check for game end
      const winner = engine.getWinner();
      if (winner !== null) {
        const reason = winner === 'draw' ? 'Draw' : 
                      winner === 'white' ? 'White wins by checkmate' : 
                      winner === 'black' ? 'Black wins by checkmate' : 'Draw';
        endGame(winner, reason);
      }

      // Force re-render
      const newEngine = new ChessEngine();
      newEngine.board = [...engine.board.map(row => [...row])];
      newEngine.currentPlayer = engine.currentPlayer;
      newEngine.gameState = engine.gameState;
      newEngine.moveHistory = [...engine.moveHistory];
      newEngine.whiteTime = engine.whiteTime;
      newEngine.blackTime = engine.blackTime;
      newEngine.lastMoveTime = engine.lastMoveTime;
      setEngine(newEngine);
    }
  }, [engine, playerColor, currentMatch, getUserWalletAddress, endGame]);

  // Resign game
  const resignGame = useCallback(() => {
    if (!currentMatch || !isAuthenticated) return;
    
    // Send resignation via websocket to notify opponent
    socketService.sendResignation(currentMatch.id, getUserWalletAddress());
    
    // End game locally
    const winner = playerColor === 'white' ? 'black' : 'white';
    endGame(winner, `${playerColor} resigned`);
  }, [currentMatch, isAuthenticated, getUserWalletAddress, playerColor, endGame]);

  // Offer draw
  const offerDraw = useCallback(() => {
    if (!currentMatch || !isAuthenticated) return;
    
    // Send draw offer via websocket
    socketService.sendDrawOffer(currentMatch.id, getUserWalletAddress());
    setDrawOfferSent(true);
    
    // Auto-expire draw offer after 30 seconds
    setTimeout(() => {
      setDrawOfferSent(false);
    }, 30000);
  }, [currentMatch, isAuthenticated, getUserWalletAddress]);

  // Accept draw offer
  const acceptDraw = useCallback(() => {
    if (!currentMatch || !isAuthenticated) return;
    
    // Send draw acceptance via websocket
    socketService.acceptDrawOffer(currentMatch.id, getUserWalletAddress());
    
    // End game as draw
    endGame('draw', 'Draw by mutual agreement');
    
    // Reset draw offer state
    setDrawOfferReceived(false);
    setDrawOfferFrom(null);
  }, [currentMatch, isAuthenticated, getUserWalletAddress, endGame]);

  // Decline draw offer
  const declineDraw = useCallback(() => {
    if (!currentMatch || !isAuthenticated) return;
    
    // Send draw decline via websocket
    socketService.declineDrawOffer(currentMatch.id, getUserWalletAddress());
    
    // Reset draw offer state
    setDrawOfferReceived(false);
    setDrawOfferFrom(null);
  }, [currentMatch, isAuthenticated, getUserWalletAddress]);

  // Return to lobby
  const returnToLobby = useCallback(() => {
    setGamePhase('lobby');
    setEngine(new ChessEngine());
    setGameResult(null);
    setCurrentMatch(null);
    setOpponent(null);
    setTimeRemaining({ white: 300000, black: 300000 });
    loadAvailableMatches();
  }, [loadAvailableMatches]);

  // Cancel waiting for opponent
  const cancelMatch = useCallback(async () => {
    if (!currentMatch) return;

    try {
      await matchService.cancelMatch(currentMatch.id);
      returnToLobby();
    } catch (error) {
      console.error('Failed to cancel match:', error);
      returnToLobby(); // Return to lobby anyway
    }
  }, [currentMatch, returnToLobby]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-main text-text-primary">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="lg:ml-64 min-h-screen">
          <PageHeader onMenuClick={() => setSidebarOpen(true)} />
          <main className="p-6">
            <div className="max-w-4xl mx-auto text-center py-20">
              <div className="text-8xl mb-8">♟️</div>
              <h1 className="text-4xl font-bold text-text-primary mb-4 font-audiowide uppercase">Chess Blitz</h1>
              <p className="text-lg text-text-secondary mb-8 font-inter">
                Please sign in to play 5-minute blitz chess
              </p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!hasVaultFunds) {
    return (
      <div className="min-h-screen bg-main text-text-primary">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="lg:ml-64 min-h-screen">
          <PageHeader onMenuClick={() => setSidebarOpen(true)} />
          <main className="p-6">
            <div className="max-w-4xl mx-auto text-center py-20">
              <div className="text-8xl mb-8">♟️</div>
              <h1 className="text-4xl font-bold text-text-primary mb-4 font-audiowide uppercase">Chess Blitz</h1>
              <p className="text-lg text-text-secondary mb-8 font-inter">
                You need funds in your session vault to play. Current balance: {formatSOL(vaultBalance)}
              </p>
              <p className="text-sm text-text-muted font-inter">
                Visit the Bridge page to add funds to your session vault.
              </p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-main text-text-primary">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="lg:ml-64 min-h-screen">
        <PageHeader onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="p-6">
          <div className="max-w-7xl mx-auto">
            
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-text-primary mb-2 font-audiowide uppercase">♟️ Chess Blitz</h1>
              <p className="text-lg text-text-secondary font-inter">5+0 • Real multiplayer • Winner takes all</p>
              {!socketConnected && (
                <p className="text-sm text-red-400 mt-2">⚠️ Connecting to game server...</p>
              )}
            </div>

            {/* Lobby Phase */}
            {gamePhase === 'lobby' && (
              <div className="max-w-4xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  
                  {/* Create Match */}
                  <div className="glass-card p-8 text-center">
                    <h2 className="text-2xl font-bold text-text-primary mb-6 font-audiowide">Create Match</h2>
                    
                    <div className="mb-6">
                      <label className="block text-text-secondary mb-2 font-inter">Wager Amount</label>
                      <div className="flex items-center justify-center space-x-4">
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
                      </div>
                    </div>

                    <div className="mb-6">
                      <div className="text-sm text-text-secondary font-inter">
                        Vault Balance: {formatSOL(vaultBalance)}
                      </div>
                    </div>

                    <button
                      onClick={createMatch}
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
                          <div className="text-4xl mb-4">🎯</div>
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
                              disabled={!socketConnected || gamePhase !== 'lobby' || joinCooldown}
                              className="px-4 py-2 bg-accent-primary text-black rounded-lg font-audiowide hover:bg-accent-secondary disabled:opacity-50"
                            >
                              {getJoinButtonText()}
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
                <ChessQuickMatch 
                  onMatchFound={(matchId) => {
                    // Join existing match
                    joinMatch(matchId);
                  }}
                  onMatchCreated={(match) => {
                    // Handle created match
                    setCurrentMatch(match);
                    setGamePhase('waiting');
                    if (user || publicKey) {
                      const userWallet = getUserWalletAddress();
                      socketService.joinMatch(match.id, userWallet);
                    }
                  }}
                  socketConnected={socketConnected}
                  gamePhase={gamePhase}
                />
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
                  <p className="text-sm text-text-muted font-inter mb-6">
                    Share your match or wait for someone to join
                  </p>
                  <div className="flex space-x-4 justify-center">
                    <button onClick={cancelMatch} className="secondary-button font-audiowide">
                      Cancel Match
                    </button>
                    <button onClick={loadAvailableMatches} className="primary-button font-audiowide">
                      Refresh
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Playing Phase */}
            {gamePhase === 'playing' && (
              <div className="flex justify-center items-start space-x-8">
                {/* Timer */}
                <ChessTimer
                  whiteTime={timeRemaining.white}
                  blackTime={timeRemaining.black}
                  currentPlayer={engine.currentPlayer}
                  gameState={engine.gameState}
                />

                {/* Chess Board */}
                <div className="flex flex-col items-center">
                  <div className="mb-4 text-center">
                    <div className="text-sm text-text-secondary font-inter">
                      You are playing as <span className="font-bold text-accent-primary">{playerColor}</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2 text-sm text-text-secondary font-inter">
                      <Avatar user={opponent || undefined} size="sm" />
                      <span>vs {opponent?.username || opponent?.wallet.slice(0, 8)}... • {currentMatch?.wager} SOL</span>
                    </div>
                  </div>

                  <ChessBoard
                    engine={engine}
                    onMove={handleMove}
                    playerColor={playerColor}
                    disabled={engine.currentPlayer !== playerColor}
                  />

                  <div className="mt-4 flex space-x-4">
                    <button
                      onClick={resignGame}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg font-audiowide hover:bg-red-700"
                    >
                      Resign
                    </button>
                    
                    {/* Draw Offer System */}
                    {!drawOfferSent && !drawOfferReceived && (
                      <button
                        onClick={offerDraw}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-audiowide hover:bg-blue-700"
                      >
                        Offer Draw
                      </button>
                    )}
                    
                    {drawOfferSent && (
                      <div className="px-4 py-2 bg-yellow-600 text-white rounded-lg font-audiowide">
                        Draw Offered...
                      </div>
                    )}
                  </div>

                  {/* Draw Offer Received Notification */}
                  {drawOfferReceived && (
                    <div className="mt-4 p-4 bg-blue-900/50 border border-blue-500 rounded-lg">
                      <div className="text-center">
                        <div className="text-lg font-audiowide text-blue-300 mb-2">🤝 Draw Offer Received</div>
                        <div className="text-sm text-text-secondary font-inter mb-4">
                          Your opponent has offered a draw
                        </div>
                        <div className="flex space-x-4 justify-center">
                          <button
                            onClick={acceptDraw}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg font-audiowide hover:bg-green-700"
                          >
                            Accept Draw
                          </button>
                          <button
                            onClick={declineDraw}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg font-audiowide hover:bg-red-700"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Game Info */}
                <div className="w-64">
                  <div className="glass-card p-4">
                    <h3 className="font-audiowide text-text-primary mb-4">Game Info</h3>
                    <div className="space-y-2 text-sm font-inter">
                      <div>Wager: {currentMatch?.wager} SOL</div>
                      <div>Time Control: 5+0</div>
                      <div>Current Turn: {engine.currentPlayer}</div>
                      <div>Moves: {engine.moveHistory.length}</div>
                      <div>Status: {engine.gameState}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Game Finished */}
            {gamePhase === 'finished' && gameResult && (
              <div className="max-w-2xl mx-auto text-center">
                <div className="glass-card p-8">
                  <div className="text-6xl mb-4">
                    {gameResult.winner === playerColor ? '🎉' : gameResult.winner === 'draw' ? '🤝' : '😞'}
                  </div>
                  <h2 className="text-3xl font-bold text-text-primary mb-4 font-audiowide">
                    {gameResult.winner === playerColor ? 'You Win!' : 
                     gameResult.winner === 'draw' ? 'Draw!' : 'You Lose!'}
                  </h2>
                  <p className="text-lg text-text-secondary mb-6 font-inter">{gameResult.reason}</p>
                  
                  <div className="mb-6">
                    <div className="text-2xl font-bold text-accent-primary font-audiowide">
                      {gameResult.winner === playerColor ? `+${((currentMatch?.wager || 0) * 2 * 0.935).toFixed(3)} SOL` :
                       gameResult.winner === 'draw' ? `+${((currentMatch?.wager || 0) * 0.935).toFixed(3)} SOL` : 
                       `-${currentMatch?.wager || 0} SOL`}
                    </div>
                    <div className="text-sm text-text-secondary font-inter">
                      {gameResult.winner === 'draw' ? 'Draw - wager returned' :
                       gameResult.winner === playerColor ? 'Victory! You won the match!' : 'Great match! Analyze and improve!'}
                    </div>
                  </div>

                  <div className="flex space-x-4 justify-center">
                    <button onClick={returnToLobby} className="primary-button font-audiowide">
                      Play Again
                    </button>
                    <button onClick={() => router.push('/')} className="secondary-button font-audiowide">
                      Exit
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
} 