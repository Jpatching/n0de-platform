'use client';

import { io, Socket } from 'socket.io-client';

class PumpWarsSocketService {
  private socket: Socket | null = null;
  private connectedState = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connect(): Promise<Socket> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve(this.socket);
        return;
      }

      // Use the pump wars backend URL
      const serverUrl = process.env.NEXT_PUBLIC_PUMP_WARS_API_URL || 'https://pump-wars-backend-production.up.railway.app';
      
      console.log('🚀 Connecting to Pump Wars server:', serverUrl);
      
      this.socket = io(serverUrl, {
        transports: ['polling', 'websocket'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 2000,
        timeout: 20000,
        forceNew: false,
        upgrade: true,
        rememberUpgrade: false,
        withCredentials: false,
        secure: true,
        rejectUnauthorized: false
      });

      this.socket.on('connect', () => {
        console.log('🚀 Connected to Pump Wars server');
        this.connectedState = true;
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        resolve(this.socket!);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('🚀 Disconnected from Pump Wars server, reason:', reason);
        this.connectedState = false;
        
        if (reason === 'transport error' || reason === 'transport close') {
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            setTimeout(() => {
              this.attemptReconnection();
            }, this.reconnectDelay);
          }
        }
      });

      this.socket.on('connect_error', (error) => {
        console.error('🚀 Pump Wars connection error:', error);
        reject(error);
      });
    });
  }

  private attemptReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('🚀 Max reconnection attempts reached for Pump Wars');
      return;
    }

    this.reconnectAttempts++;
    console.log(`🚀 Attempting to reconnect to Pump Wars (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    this.connect().catch(() => {
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 10000);
    });
  }

  isConnected(): boolean {
    return this.connectedState && this.socket?.connected === true;
  }

  disconnect() {
    if (this.socket) {
      console.log('🚀 Disconnecting from Pump Wars server');
      this.socket.disconnect();
      this.socket = null;
      this.connectedState = false;
      this.reconnectAttempts = 0;
    }
  }

  // Pump Wars specific event listeners
  on(event: string, callback: (data: unknown) => void) {
    if (this.socket) {
      const wrappedCallback = (data: unknown) => {
        console.log(`🚀 Pump Wars event received: ${event}`, data);
        callback(data);
      };
      this.socket.on(event, wrappedCallback);
    }
  }

  off(event: string, callback?: (data: unknown) => void) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  emit(event: string, data?: unknown) {
    if (this.socket?.connected) {
      console.log(`🚀 Pump Wars event emitted: ${event}`, data);
      this.socket.emit(event, data);
    } else {
      console.warn('🚀 Cannot emit event - Pump Wars socket not connected:', event);
    }
  }

  // Pump Wars specific methods
  authenticateUser(token: string) {
    this.emit('authenticate', { token });
  }

  joinGame(gameData: any) {
    this.emit('join_game', gameData);
  }

  placeBet(betData: any) {
    this.emit('place_bet', betData);
  }

  getGameState() {
    this.emit('get_game_state');
  }

  getUserStats() {
    this.emit('get_user_stats');
  }
}

// Export singleton instance
export const pumpWarsSocketService = new PumpWarsSocketService(); 