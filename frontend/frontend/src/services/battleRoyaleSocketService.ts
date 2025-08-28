import { io, Socket } from 'socket.io-client';

interface BattleRoyaleEvents {
  // Client to server
  join_battle: (data: { battleId: string; userId: string }) => void;
  leave_battle: (data: { battleId: string; userId: string }) => void;
  select_token: (data: { battleId: string; userId: string; tokenId: string }) => void;
  ping: () => void;
  
  // Server to client
  battle_updated: (data: any) => void;
  phase_changed: (data: { phase: string; timeRemaining: number }) => void;
  player_joined: (data: { player: any; playerCount: number }) => void;
  player_left: (data: { playerId: string; playerCount: number }) => void;
  token_selected: (data: { playerId: string; tokenId: string }) => void;
  price_update: (data: { tokenId: string; price: number; timestamp: number }) => void;
  elimination: (data: { eliminatedTokens: string[]; remainingTokens: string[] }) => void;
  battle_complete: (data: { winnerId: string; prizePool: number }) => void;
  pong: () => void;
}

class BattleRoyaleSocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, ((data?: any) => void)[]> = new Map();
  private isConnected = false;
  private currentBattleId: string | null = null;

  connect(userId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Connect to the battle royale backend
        this.socket = io('https://meme-battle-production.up.railway.app', {
          transports: ['websocket'],
          auth: { userId },
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: 5,
          timeout: 5000,
        });

        this.socket.on('connect', () => {
          console.log('🔗 Connected to Battle Royale backend');
          this.isConnected = true;
          resolve();
        });

        this.socket.on('disconnect', () => {
          console.log('🔌 Disconnected from Battle Royale backend');
          this.isConnected = false;
        });

        this.socket.on('connect_error', (error) => {
          console.error('❌ Battle Royale connection error:', error);
          reject(error);
        });

        // Set up event listeners
        this.setupEventListeners();

      } catch (error) {
        console.error('❌ Failed to connect to Battle Royale backend:', error);
        reject(error);
      }
    });
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    // Battle state updates
    this.socket.on('battle_updated', (data) => {
      console.log('🎮 Battle updated:', data);
      this.emit('battle_updated', data);
    });

    this.socket.on('phase_changed', (data) => {
      console.log('⏱️ Phase changed:', data);
      this.emit('phase_changed', data);
    });

    // Player events
    this.socket.on('player_joined', (data) => {
      console.log('👥 Player joined:', data);
      this.emit('player_joined', data);
    });

    this.socket.on('player_left', (data) => {
      console.log('👋 Player left:', data);
      this.emit('player_left', data);
    });

    this.socket.on('token_selected', (data) => {
      console.log('🎯 Token selected:', data);
      this.emit('token_selected', data);
    });

    // Price updates
    this.socket.on('price_update', (data) => {
      this.emit('price_update', data);
    });

    // Game events
    this.socket.on('elimination', (data) => {
      console.log('❌ Token elimination:', data);
      this.emit('elimination', data);
    });

    this.socket.on('battle_complete', (data) => {
      console.log('🏆 Battle complete:', data);
      this.emit('battle_complete', data);
    });

    // Ping/pong for connection health
    this.socket.on('pong', () => {
      this.emit('pong');
    });
  }

  joinBattle(battleId: string, userId: string): void {
    if (!this.socket || !this.isConnected) {
      console.error('❌ Socket not connected');
      return;
    }

    this.currentBattleId = battleId;
    this.socket.emit('join_battle', { battleId, userId });
    console.log(`🎮 Joined battle: ${battleId}`);
  }

  leaveBattle(battleId: string, userId: string): void {
    if (!this.socket || !this.isConnected) {
      console.error('❌ Socket not connected');
      return;
    }

    this.socket.emit('leave_battle', { battleId, userId });
    this.currentBattleId = null;
    console.log(`👋 Left battle: ${battleId}`);
  }

  selectToken(battleId: string, userId: string, tokenId: string): void {
    if (!this.socket || !this.isConnected) {
      console.error('❌ Socket not connected');
      return;
    }

    this.socket.emit('select_token', { battleId, userId, tokenId });
    console.log(`🎯 Selected token: ${tokenId} in battle: ${battleId}`);
  }

  getBattleStatus(): void {
    if (!this.socket || !this.isConnected || !this.currentBattleId) {
      console.error('❌ Socket not connected or no active battle');
      return;
    }

    this.socket.emit('get_battle_status');
  }

  ping(): void {
    if (!this.socket || !this.isConnected) {
      console.error('❌ Socket not connected');
      return;
    }

    this.socket.emit('ping');
  }

  // Event listener management
  on(event: string, callback: (data?: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: (data?: any) => void): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(callback);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`❌ Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.currentBattleId = null;
    this.listeners.clear();
    console.log('🔌 Battle Royale socket disconnected');
  }

  isSocketConnected(): boolean {
    return this.isConnected && this.socket !== null;
  }

  getCurrentBattleId(): string | null {
    return this.currentBattleId;
  }

  // Health check
  startHealthCheck(): void {
    const healthCheck = setInterval(() => {
      if (this.isConnected) {
        this.ping();
      } else {
        clearInterval(healthCheck);
      }
    }, 30000); // Ping every 30 seconds
  }
}

// Export singleton instance
export const battleRoyaleSocketService = new BattleRoyaleSocketService();
export default battleRoyaleSocketService; 