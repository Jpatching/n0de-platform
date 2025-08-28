'use client';

import { io, Socket } from 'socket.io-client';
import { Match } from './matchService';

interface ChessMove {
  from: { row: number; col: number };
  to: { row: number; col: number };
  piece: string;
  timestamp: number;
}

export interface DiceRollMove {
  roll: number;
  timestamp: number;
}

// Union type for all possible move types
type GameMove = ChessMove | DiceRollMove;

interface GameState {
  matchId: string;
  state: Record<string, unknown>;
  timestamp: number;
}

interface MatchData {
  match: Match;
  connectedPlayers: number;
}

interface PlayerData {
  playerId: string;
  matchId: string;
}

interface GameMoveData {
  playerId: string;
  moveData: GameMove;
  timestamp: number;
}

interface MatchResultData {
  matchId: string;
  winner: string;
  gameData: Record<string, unknown>;
}

class SocketService {
  private socket: Socket | null = null;
  private connectedState = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5; // Reduced from 10
  private reconnectDelay = 1000;
  private currentMatchId: string | null = null;
  private currentPlayerId: string | null = null;
  private isReconnecting = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private connectionStable = false;
  private lastActivity = Date.now();
  private inActiveGame = false; // NEW: Track if player is in active gameplay

  connect(): Promise<Socket> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve(this.socket);
        return;
      }

      // Use the same API base URL but for websocket connection
      const serverUrl = process.env.NEXT_PUBLIC_API_URL || 'https://pv3-backend-api-production.up.railway.app';
      
      console.log('🔌 Connecting to game server:', serverUrl);
      
      // Firefox-specific connection options
      const isFirefox = typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('firefox');
      console.log('🦊 Firefox detected:', isFirefox);
      
      this.socket = io(serverUrl, {
        transports: ['polling', 'websocket'], // Try polling first for Firefox compatibility
        autoConnect: true,
        reconnection: true, // Enable automatic reconnection
        reconnectionAttempts: 3,
        reconnectionDelay: 2000,
        timeout: 20000, // Increased timeout for slower connections
        forceNew: false,
        upgrade: true,
        rememberUpgrade: false, // Don't remember upgrade for better compatibility
        withCredentials: false, // Disable credentials for CORS
        secure: true, // Force secure connection
        rejectUnauthorized: false // Allow self-signed certificates if needed
      });

      this.socket.on('connect', () => {
        console.log('🔌 Connected to game server');
        this.connectedState = true;
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.isReconnecting = false;
        this.lastActivity = Date.now();
        
        // Mark connection as stable after 5 seconds
        setTimeout(() => {
          if (this.connectedState) {
            this.connectionStable = true;
            console.log('✅ Connection marked as stable');
          }
        }, 5000);
        
        // Start heartbeat
        this.startHeartbeat();
        
        // Auto-rejoin match if we were in one (check both memory and localStorage)
        let matchInfo = null;
        
        // First try current memory
        if (this.currentMatchId && this.currentPlayerId) {
          matchInfo = {
            matchId: this.currentMatchId,
            playerId: this.currentPlayerId
          };
        } else {
          // Try localStorage for persistence across page reloads
          try {
            const stored = localStorage.getItem('pv3_current_match');
            if (stored) {
              matchInfo = JSON.parse(stored);
              // Update current memory from localStorage
              this.currentMatchId = matchInfo.matchId;
              this.currentPlayerId = matchInfo.playerId;
            }
          } catch (error) {
            console.log('⚠️ Failed to parse stored match info:', error);
          }
        }
        
        if (matchInfo?.matchId && matchInfo?.playerId) {
          console.log('🔄 Found stored match info:', matchInfo.matchId);
          
          // CRITICAL FIX: Only auto-rejoin if the stored match is still valid
          // Check if the match is still active before auto-rejoining
          console.log('🔍 Checking if stored match is still valid before auto-rejoin...');
          
          // Use setTimeout to ensure connection is fully established
          setTimeout(() => {
            if (this.socket?.connected) {
              // First, check if the match is still active
              this.socket.emit('check_match_status', { 
                matchId: matchInfo.matchId,
                playerId: matchInfo.playerId 
              });
              
              // Listen for match status response
              this.socket.once('match_status_response', (response: { 
                matchId: string; 
                isActive: boolean; 
                status: string;
              }) => {
                if (response.isActive && response.status === 'in_progress') {
                  console.log('✅ Match is still active, proceeding with auto-rejoin:', response.matchId);
                  if (this.socket?.connected) {
                    this.socket.emit('join_match', { 
                      matchId: matchInfo.matchId, 
                      playerId: matchInfo.playerId 
                    });
                    console.log('📤 Auto-rejoin request sent to server');
                    
                    // Request current game state after rejoining
                    setTimeout(() => {
                      this.requestGameStateSync(matchInfo.matchId);
                    }, 1000);
                  }
                } else {
                  console.log('❌ Stored match is no longer active, clearing stored data');
                  this.clearCurrentMatch();
                }
              });
            }
          }, 1000);
        }
        
        resolve(this.socket!);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('🔌 Disconnected from game server, reason:', reason);
        this.connectedState = false;
        this.connectionStable = false;
        this.stopHeartbeat();
        
        // During active games, be VERY conservative about reconnecting
        if (this.inActiveGame) {
          console.log('🎮 Disconnected during active game - waiting longer before reconnect attempt');
          // Only reconnect for legitimate network issues, not client disconnects
          if (reason === 'transport error' || reason === 'transport close') {
            setTimeout(() => {
              if (this.reconnectAttempts < this.maxReconnectAttempts) {
                this.attemptReconnection();
              }
            }, 5000); // Wait 5 seconds during active games
          }
        } else {
          // Normal lobby reconnection logic
        if (reason !== 'io client disconnect' && reason !== 'io server disconnect') {
          if (this.connectionStable && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.attemptReconnection();
            }
          }
        }
      });

      this.socket.on('connect_error', (error) => {
        console.error('🔌 Connection error:', error);
        this.connectedState = false;
        this.connectionStable = false;
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          reject(error);
        } else {
          this.attemptReconnection();
        }
      });

      // Simplified reconnection handling
      this.socket.on('reconnect', () => {
        console.log('🔄 Reconnected successfully');
        this.isReconnecting = false;
      });

      this.socket.on('pong', () => {
        this.lastActivity = Date.now();
      });

      // Game-specific event handlers
      this.setupGameEventHandlers();
    });
  }

  private startHeartbeat() {
    if (this.heartbeatInterval) return;
    
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping');
        
        // COMPLETELY DISABLE stale detection during active games
        if (this.inActiveGame) {
          console.log('🎮 In active game - skipping stale connection check');
          return;
        }
        
        // Only check for stale connections when NOT in active gameplay
        if (Date.now() - this.lastActivity > 300000) { // 5 minutes
          console.log('⚠️ Connection appears stale (lobby only), refreshing...');
          this.refreshConnection();
        }
      }
    }, 30000);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private refreshConnection() {
    if (!this.socket) return;
    
    console.log('🔄 Refreshing stale connection...');
    this.socket.disconnect();
    
    setTimeout(() => {
      this.connect().catch(console.error);
    }, 1000);
  }

  private attemptReconnection() {
    if (this.isReconnecting) return;
    
    this.isReconnecting = true;
    this.reconnectAttempts++;
    
    console.log(`🔄 Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${this.reconnectDelay}ms`);
    
    setTimeout(() => {
      if (!this.socket?.connected) {
        this.connect().catch(() => {
          // Exponential backoff with jitter
          this.reconnectDelay = Math.min(this.reconnectDelay * 1.5 + Math.random() * 1000, 10000);
          this.isReconnecting = false;
        });
      }
    }, this.reconnectDelay);
  }

  private requestGameStateSync(matchId: string) {
    if (!this.socket?.connected) return;
    
    console.log('🔄 Requesting game state sync for match:', matchId);
    this.socket.emit('request_game_state', { matchId });
  }

  // NEW: Enter game mode - disable all connection monitoring
  enterGameMode(matchId: string) {
    this.inActiveGame = true;
    this.currentMatchId = matchId;
    console.log('🎮 Entered game mode - connection monitoring DISABLED');
  }

  // NEW: Exit game mode - re-enable connection monitoring  
  exitGameMode() {
    this.inActiveGame = false;
    this.currentMatchId = null;
    console.log('🏠 Exited game mode - connection monitoring re-enabled');
  }

  // Store current match info for auto-rejoin
  setCurrentMatch(matchId: string, playerId: string) {
    this.currentMatchId = matchId;
    this.currentPlayerId = playerId;
    this.lastActivity = Date.now();
    this.enterGameMode(matchId); // Automatically enter game mode
    console.log('💾 Stored match info for auto-rejoin:', { matchId, playerId });
  }

  // Clear match info when leaving
  clearCurrentMatch() {
    this.exitGameMode(); // Exit game mode
    this.currentMatchId = null;
    this.currentPlayerId = null;
    
    // Also clear from localStorage
    localStorage.removeItem('pv3_current_match');
    console.log('🧹 Cleared current match info from memory and storage');
    
    // CRITICAL FIX: If socket is connected, ensure we're not trying to auto-rejoin old matches
    if (this.socket?.connected) {
      console.log('🔄 Refreshing socket connection to prevent auto-rejoin conflicts');
      // Remove any lingering match room associations
      try {
        this.socket.emit('leave_all_matches', {
          timestamp: Date.now()
        });
      } catch (error) {
        console.log('⚠️ Failed to emit leave_all_matches:', error);
      }
    }
  }

  // CRITICAL FIX: Method to be called when navigating away from games
  leaveCurrentMatch() {
    if (this.currentMatchId) {
      console.log('🚪 Leaving current match:', this.currentMatchId);
      this.clearCurrentMatch();
    }
  }

  // Enhanced connection status
  isConnected(): boolean {
    return this.connectedState && this.socket?.connected || false;
  }

  isStable(): boolean {
    return this.connectionStable && this.isConnected();
  }

  // 🔧 NEW: Direct socket connection check
  isSocketConnected(): boolean {
    return !!this.socket?.connected;
  }

  // 🔧 NEW: Check if socket exists
  hasSocket(): boolean {
    return !!this.socket;
  }

  // Graceful disconnect
  disconnect() {
    console.log('🔌 Gracefully disconnecting...');
    this.stopHeartbeat();
    this.clearCurrentMatch();
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.connectedState = false;
    this.connectionStable = false;
    this.isReconnecting = false;
  }

  private setupGameEventHandlers() {
    if (!this.socket) return;

    // Update activity on ANY socket event
    const updateActivity = () => {
      this.lastActivity = Date.now();
    };

    this.socket.on('player_joined', (data: PlayerData) => {
      updateActivity();
      console.log('👥 Player joined match:', data);
    });

    this.socket.on('player_disconnected', (data: PlayerData) => {
      updateActivity();
      console.log('👥 Player disconnected:', data);
    });

    this.socket.on('match_state', (data: MatchData) => {
      updateActivity();
      console.log('🎮 Match state:', data);
    });

    this.socket.on('game_move', (data: GameMoveData) => {
      updateActivity();
      console.log('🎯 Game move received:', data);
    });

    this.socket.on('game_state_update', (data: GameState) => {
      updateActivity();
      console.log('🔄 Game state update:', data);
    });

    this.socket.on('match_completed', (data: MatchResultData) => {
      updateActivity();
      console.log('🏆 Match completed:', data);
      
      // CRITICAL FIX: Auto-clear match info when match completes to prevent conflicts
      if (this.currentMatchId === data.matchId) {
        console.log('🧹 Auto-clearing completed match info:', data.matchId);
        setTimeout(() => {
          this.clearCurrentMatch();
        }, 2000); // Small delay to allow UI to process completion
      }
    });

    this.socket.on('error', (error: { message: string }) => {
      updateActivity();
      console.error('🚨 Game error:', error);
    });

    // Draw offer events
    this.socket.on('draw_offer_received', (data: { matchId: string; fromPlayer: string }) => {
      updateActivity();
      console.log('🤝 Draw offer received:', data);
    });

    this.socket.on('draw_offer_accepted', (data: { matchId: string; byPlayer: string }) => {
      updateActivity();
      console.log('✅ Draw offer accepted:', data);
    });

    this.socket.on('draw_offer_declined', (data: { matchId: string; byPlayer: string }) => {
      updateActivity();
      console.log('❌ Draw offer declined:', data);
    });

    // Resignation events
    this.socket.on('player_resigned', (data: { matchId: string; resignedPlayer: string }) => {
      updateActivity();
      console.log('🏳️ Player resigned:', data);
    });

    // Update activity on ALL events including crash-specific ones
    this.socket.on('crash_round_started', updateActivity);
    this.socket.on('crash_cash_out', updateActivity);
    this.socket.on('crash_result', updateActivity);
    this.socket.on('coinflip_choice_made', updateActivity);
    this.socket.on('coinflip_result', updateActivity);
    this.socket.on('payout_complete', updateActivity);
    this.socket.on('payout_failed', updateActivity);
    this.socket.on('pong', updateActivity); // Server heartbeat response
  }

  // Match management
  async joinMatch(matchId: string, playerId: string): Promise<void> {
    console.log('🎯 Attempting to join match with ID:', matchId);
    console.log('🎯 Match ID type:', typeof matchId);
    console.log('🎯 Match ID length:', matchId.length);
    
    // CRITICAL FIX: Clear any previous match info to prevent conflicts
    if (this.currentMatchId && this.currentMatchId !== matchId) {
      console.log('🧹 Clearing previous match info before joining new match');
      console.log('🧹 Previous match:', this.currentMatchId, '-> New match:', matchId);
      this.clearCurrentMatch();
      
      // Small delay to ensure cleanup is processed
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Store match info for auto-rejoin functionality
    this.currentMatchId = matchId;
    this.currentPlayerId = playerId;
    
    // Store in localStorage for persistence across page reloads
    localStorage.setItem('pv3_current_match', JSON.stringify({
      matchId,
      playerId
    }));
    
    console.log('💾 Stored match info for auto-rejoin:', { matchId, playerId });
    
    // If not connected, try to establish connection first
    if (!this.socket?.connected) {
      console.log('🔌 Socket not connected, attempting to connect...');
      
      try {
        // Try to connect/reconnect
        await this.connect();
        console.log('✅ Socket connected, proceeding with join...');
      } catch (error) {
        console.error('❌ Failed to connect to game server:', error);
        throw new Error('Failed to connect to game server. Please refresh the page and try again.');
      }
    }
    
    // Double-check connection after connect attempt
    if (!this.socket?.connected) {
      throw new Error('Not connected to game server');
    }
    
    // Emit the join request
    this.socket.emit('join_match', { matchId, playerId });
    console.log('📤 Join match request sent to server');
  }

  // Chess-specific move handling
  sendChessMove(matchId: string, playerId: string, move: ChessMove) {
    if (!this.socket?.connected) {
      throw new Error('Not connected to game server');
    }
    
    this.socket.emit('game_move', {
      matchId,
      playerId,
      moveData: move,
      timestamp: Date.now(),
    });
  }

  // Game state updates
  sendGameState(matchId: string, state: Record<string, unknown>) {
    if (!this.socket?.connected) {
      throw new Error('Not connected to game server');
    }
    
    this.socket.emit('game_state_update', {
      matchId,
      state,
      timestamp: Date.now(),
    });
  }

  // Submit match result
  submitMatchResult(matchId: string, winner: string, gameData: Record<string, unknown>) {
    if (!this.socket?.connected) {
      throw new Error('Not connected to game server');
    }
    
    this.socket.emit('match_result', {
      matchId,
      winner,
      gameData,
    });
  }

  // Draw offer system
  sendDrawOffer(matchId: string, playerId: string) {
    if (!this.socket?.connected) {
      throw new Error('Not connected to game server');
    }
    
    this.socket.emit('draw_offer', {
      matchId,
      playerId,
      timestamp: Date.now(),
    });
  }

  acceptDrawOffer(matchId: string, playerId: string) {
    if (!this.socket?.connected) {
      throw new Error('Not connected to game server');
    }
    
    this.socket.emit('draw_accept', {
      matchId,
      playerId,
      timestamp: Date.now(),
    });
  }

  declineDrawOffer(matchId: string, playerId: string) {
    if (!this.socket?.connected) {
      throw new Error('Not connected to game server');
    }
    
    this.socket.emit('draw_decline', {
      matchId,
      playerId,
      timestamp: Date.now(),
    });
  }

  // Resignation system
  sendResignation(matchId: string, playerId: string) {
    if (!this.socket?.connected) {
      throw new Error('Not connected to game server');
    }
    
    this.socket.emit('player_resign', {
      matchId,
      playerId,
      timestamp: Date.now(),
    });
  }

  // Generic move handling for all game types
  makeMove(matchId: string, playerId: string, moveData: GameMove) {
    if (!this.socket?.connected) {
      throw new Error('Not connected to game server');
    }
    
    this.socket.emit('game_move', {
      matchId,
      playerId,
      moveData,
      timestamp: Date.now(),
    });
  }

  // Event listener methods for React components
  onMatchState(callback: (data: MatchData) => void) {
    if (!this.socket) return;
    this.socket.on('match_state', callback);
  }

  offMatchState(callback: (data: MatchData) => void) {
    if (!this.socket) return;
    this.socket.off('match_state', callback);
  }

  onPlayerJoined(callback: (data: PlayerData) => void) {
    if (!this.socket) return;
    this.socket.on('player_joined', callback);
  }

  offPlayerJoined(callback: (data: PlayerData) => void) {
    if (!this.socket) return;
    this.socket.off('player_joined', callback);
  }

  onOpponentMove(callback: (data: GameMoveData) => void) {
    if (!this.socket) return;
    this.socket.on('game_move', callback);
  }

  offOpponentMove(callback: (data: GameMoveData) => void) {
    if (!this.socket) return;
    this.socket.off('game_move', callback);
  }

  onMatchCompleted(callback: (data: MatchResultData) => void) {
    if (!this.socket) return;
    this.socket.on('match_completed', callback);
  }

  offMatchCompleted(callback: (data: MatchResultData) => void) {
    if (!this.socket) return;
    this.socket.off('match_completed', callback);
  }

  onPlayerDisconnected(callback: (data: PlayerData) => void) {
    if (!this.socket) return;
    this.socket.on('player_disconnected', callback);
  }

  offPlayerDisconnected(callback: (data: PlayerData) => void) {
    if (!this.socket) return;
    this.socket.off('player_disconnected', callback);
  }

  onDrawOfferReceived(callback: (data: { matchId: string; fromPlayer: string }) => void) {
    if (!this.socket) return;
    this.socket.on('draw_offer_received', callback);
  }

  offDrawOfferReceived(callback: (data: { matchId: string; fromPlayer: string }) => void) {
    if (!this.socket) return;
    this.socket.off('draw_offer_received', callback);
  }

  onDrawOfferAccepted(callback: (data: { matchId: string; byPlayer: string }) => void) {
    if (!this.socket) return;
    this.socket.on('draw_offer_accepted', callback);
  }

  offDrawOfferAccepted(callback: (data: { matchId: string; byPlayer: string }) => void) {
    if (!this.socket) return;
    this.socket.off('draw_offer_accepted', callback);
  }

  onDrawOfferDeclined(callback: (data: { matchId: string; byPlayer: string }) => void) {
    if (!this.socket) return;
    this.socket.on('draw_offer_declined', callback);
  }

  offDrawOfferDeclined(callback: (data: { matchId: string; byPlayer: string }) => void) {
    if (!this.socket) return;
    this.socket.off('draw_offer_declined', callback);
  }

  onPlayerResigned(callback: (data: { matchId: string; resignedPlayer: string }) => void) {
    if (!this.socket) return;
    this.socket.on('player_resigned', callback);
  }

  offPlayerResigned(callback: (data: { matchId: string; resignedPlayer: string }) => void) {
    if (!this.socket) return;
    this.socket.off('player_resigned', callback);
  }

  // Generic event listeners for backwards compatibility
  on(event: string, callback: (data: unknown) => void) {
    if (this.socket) {
      // Wrap callback to track activity
      const wrappedCallback = (data: unknown) => {
        this.lastActivity = Date.now(); // Track activity on any event
        callback(data);
      };
      this.socket.on(event, wrappedCallback);
    } else {
      console.warn('Socket not connected, cannot register event listener for:', event);
    }
  }

  off(event: string, callback?: (data: unknown) => void) {
    if (!this.socket) return;
    this.socket.off(event, callback);
  }

  // Generic emit method for custom events
  emit(event: string, data?: unknown) {
    if (!this.socket?.connected) {
      throw new Error('Not connected to game server');
    }
    this.socket.emit(event, data);
  }

  // Type-safe event handlers for specific game types
  onDiceRollMove(callback: (data: { playerId: string; moveData: DiceRollMove; timestamp: number }) => void) {
    if (!this.socket) return;
    this.socket.on('game_move', (data: GameMoveData) => {
      // Type guard to check if this is a dice roll move
      if ('roll' in data.moveData) {
        callback(data as { playerId: string; moveData: DiceRollMove; timestamp: number });
      }
    });
  }

  offDiceRollMove(callback: (data: { playerId: string; moveData: DiceRollMove; timestamp: number }) => void) {
    if (!this.socket) return;
    // For off handlers, we need to remove the generic handler, but this is complex
    // For now, we'll use the generic off method
    this.socket.off('game_move');
  }

  // Coinflip-specific methods
  sendCoinFlipChoice(matchId: string, playerId: string, choice: 'heads' | 'tails') {
    if (!this.socket?.connected) {
      throw new Error('Not connected to game server');
    }
    
    console.log(`📡 Sending coinflip choice: ${choice} for player ${playerId} in match ${matchId}`);
    this.socket.emit('coinflip_choice', {
      matchId,
      playerId,
      choice,
      timestamp: Date.now(),
    });
  }

  // RPS-specific methods
  sendRPSChoice(matchId: string, playerId: string, choice: 'rock' | 'paper' | 'scissors') {
    if (!this.socket?.connected) {
      throw new Error('Not connected to game server');
    }
    
    console.log(`📡 Sending RPS choice: ${choice} for player ${playerId} in match ${matchId}`);
    this.socket.emit('rps_choice', {
      matchId,
      playerId,
      choice,
      timestamp: Date.now(),
    });
  }

  getCoinFlipState(matchId: string) {
    if (!this.socket?.connected) {
      throw new Error('Not connected to game server');
    }
    
    this.socket.emit('get_coinflip_state', {
      matchId,
      timestamp: Date.now(),
    });
  }

  // Coinflip event listeners
  onOpponentChoiceMade(callback: (data: { matchId: string; playerId: string; timestamp: number }) => void) {
    this.socket?.on('opponent_choice_made', callback);
  }

  onCoinFlipGameState(callback: (data: { matchId: string; gameState: any; timestamp: number }) => void) {
    this.socket?.on('coinflip_game_state', callback);
  }

  onCoinFlipResult(callback: (data: { matchId: string; roundResult: any; gameState: any; timestamp: number }) => void) {
    this.socket?.on('coinflip_result', callback);
  }

  // Remove coinflip listeners
  offCoinFlipEvents() {
    if (!this.socket) return;
    this.socket.off('opponent_choice_made');
    this.socket.off('coinflip_game_state');
    this.socket.off('coinflip_result');
  }

  // Payout confirmation method
  confirmPayoutReady(matchId: string) {
    if (!this.socket?.connected) {
      throw new Error('Not connected to game server');
    }
    
    console.log(`💰 Confirming payout ready for match: ${matchId}`);
    this.socket.emit('confirm_payout_ready', {
      matchId,
      timestamp: Date.now(),
    });
  }

  // RPS Event Handlers
  onRPSResult(callback: (data: { matchId: string; currentRound: any; playerScore: number; opponentScore: number; matchComplete: boolean; matchWinner: string | null; totalRounds: number; timestamp: number }) => void) {
    this.socket?.on('rps_result', callback);
  }

  onRPSOpponentChoice(callback: (data: { matchId: string; playerId: string; timestamp: number }) => void) {
    this.socket?.on('rps_opponent_choice', callback);
  }

  onRPSGameState(callback: (data: { matchId: string; gameState: any; timestamp: number }) => void) {
    this.socket?.on('rps_game_state', callback);
  }

  getRPSState(matchId: string) {
    if (!this.socket?.connected) {
      console.warn('Socket not connected, cannot get RPS state');
      return;
    }
    
    console.log('🎯 Requesting RPS game state for match:', matchId);
    this.socket.emit('get_rps_state', { matchId });
  }

  offRPSEvents() {
    if (!this.socket) return;
    this.socket.off('rps_result');
    this.socket.off('rps_opponent_choice');
    this.socket.off('rps_game_state');
  }

  // ===== DICE DUEL METHODS =====

    // Send dice roll request to backend (with optional RPG build data)
  sendDiceDuelRoll(matchId: string, playerId: string, buildData?: { build: string; dice: string; buildName: string }) {
    if (!this.socket?.connected) {
      throw new Error('Not connected to game server');
    }
    
    if (buildData) {
      console.log(`🎲 Sending RPG dice roll request for player ${playerId} in match ${matchId} with build: ${buildData.buildName} (${buildData.dice})`);
    } else {
      console.log(`🎲 Sending dice roll request for player ${playerId} in match ${matchId}`);
    }
    
    this.socket.emit('dice_duel', {
      matchId,
      playerId,
      buildData,
      timestamp: Date.now(),
    });
  }

  // Get dice duel game state
  getDiceDuelState(matchId: string) {
    if (!this.socket?.connected) {
      console.warn('Socket not connected, cannot get dice duel state');
      return;
    }
    
    console.log('🎲 Requesting dice duel game state for match:', matchId);
    this.socket.emit('get_dice_duel_state', { matchId });
  }

  // Dice Duel Event Handlers
  onDiceResult(callback: (data: { 
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
    animationDuration: number; // 🎰 CASINO-GRADE: Professional gambling animation duration
    timestamp: number;
  }) => void) {
    this.socket?.on('dice_result', callback);
  }

  onOpponentRolled(callback: (data: { 
    matchId: string; 
    playerId: string; 
    timestamp: number;
  }) => void) {
    this.socket?.on('opponent_rolled', callback);
  }

  onDiceGameState(callback: (data: { 
    matchId: string; 
    gameState: any; 
    playerScore: number;
    opponentScore: number;
    timestamp: number;
  }) => void) {
    this.socket?.on('dice_game_state', callback);
  }

  // Remove dice duel listeners
  offDiceDuelEvents() {
    if (!this.socket) return;
    this.socket.off('dice_result');
    this.socket.off('opponent_rolled');
    this.socket.off('dice_game_state');
  }
}

// Export singleton instance
export const socketService = new SocketService();
export default socketService; 