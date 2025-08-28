import { Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

interface ConnectionStatus {
  isConnected: boolean;
  lastSeen: number;
  socketId?: string;
  isValidated: boolean;
  reconnectAttempts: number;
}

@Injectable()
export class ConnectionRecoveryService {
  private readonly logger = new Logger(ConnectionRecoveryService.name);
  
  // Track player connections with recovery data
  private playerConnections = new Map<string, ConnectionStatus>();
  private playerSockets = new Map<string, Socket>();
  private socketToPlayer = new Map<string, string>();
  
  // Recovery configuration
  private readonly CONNECTION_GRACE_PERIOD = 10000; // 10 seconds
  private readonly MAX_RECONNECT_ATTEMPTS = 3;
  private readonly VALIDATION_TIMEOUT = 5000; // 5 seconds
  
  private recoveryStats = {
    totalValidations: 0,
    failedValidations: 0,
    successfulRecoveries: 0,
    forcedStartsRequired: 0
  };

  /**
   * 🔌 Register player connection
   */
  registerConnection(playerId: string, socket: Socket): void {
    this.logger.debug(`🔌 Registering connection for player ${playerId}`);
    
    this.playerConnections.set(playerId, {
      isConnected: true,
      lastSeen: Date.now(),
      socketId: socket.id,
      isValidated: true,
      reconnectAttempts: 0
    });
    
    this.playerSockets.set(playerId, socket);
    this.socketToPlayer.set(socket.id, playerId);
  }

  /**
   * 🔌 Handle player disconnection
   */
  handleDisconnection(socketId: string): string | null {
    const playerId = this.socketToPlayer.get(socketId);
    
    if (playerId) {
      this.logger.debug(`🔌 Handling disconnection for player ${playerId}`);
      
      const status = this.playerConnections.get(playerId);
      if (status) {
        // Mark as disconnected but keep grace period
        status.isConnected = false;
        status.lastSeen = Date.now();
        status.isValidated = false;
        
        this.playerConnections.set(playerId, status);
      }
      
      this.playerSockets.delete(playerId);
      this.socketToPlayer.delete(socketId);
      
      // Start recovery timer
      this.startRecoveryTimer(playerId);
    }
    
    return playerId;
  }

  /**
   * 🔍 Enhanced connection validation with recovery
   */
  async validatePlayerConnections(player1Id: string, player2Id: string): Promise<{
    bothConnected: boolean;
    player1Status: ConnectionStatus;
    player2Status: ConnectionStatus;
    canProceed: boolean;
    action: 'proceed' | 'wait' | 'force_start' | 'abort';
    message?: string;
  }> {
    this.recoveryStats.totalValidations++;
    
    const player1Status = this.getConnectionStatus(player1Id);
    const player2Status = this.getConnectionStatus(player2Id);
    
    this.logger.debug(`🔍 Connection validation: P1=${player1Status.isConnected}, P2=${player2Status.isConnected}`);
    
    // Both connected - proceed normally
    if (player1Status.isConnected && player2Status.isConnected) {
      return {
        bothConnected: true,
        player1Status,
        player2Status,
        canProceed: true,
        action: 'proceed'
      };
    }
    
    // Check if disconnections are within grace period
    const now = Date.now();
    const p1InGrace = !player1Status.isConnected && (now - player1Status.lastSeen) < this.CONNECTION_GRACE_PERIOD;
    const p2InGrace = !player2Status.isConnected && (now - player2Status.lastSeen) < this.CONNECTION_GRACE_PERIOD;
    
    // If either player is in grace period, wait for reconnection
    if (p1InGrace || p2InGrace) {
      return {
        bothConnected: false,
        player1Status,
        player2Status,
        canProceed: false,
        action: 'wait',
        message: 'Waiting for player reconnection...'
      };
    }
    
    // One player connected, other definitively disconnected
    if (player1Status.isConnected || player2Status.isConnected) {
      this.recoveryStats.forcedStartsRequired++;
      return {
        bothConnected: false,
        player1Status,
        player2Status,
        canProceed: true,
        action: 'force_start',
        message: 'One player disconnected - proceeding with connected player'
      };
    }
    
    // Both players disconnected
    this.recoveryStats.failedValidations++;
    return {
      bothConnected: false,
      player1Status,
      player2Status,
      canProceed: false,
      action: 'abort',
      message: 'Both players disconnected'
    };
  }

  /**
   * 🔍 Get connection status with smart detection
   */
  private getConnectionStatus(playerId: string): ConnectionStatus {
    const stored = this.playerConnections.get(playerId);
    
    if (!stored) {
      // Player never connected - treat as disconnected
      return {
        isConnected: false,
        lastSeen: 0,
        isValidated: false,
        reconnectAttempts: 0
      };
    }
    
    // Check if socket is still alive
    const socket = this.playerSockets.get(playerId);
    if (socket && socket.connected) {
      // Update last seen and mark as connected
      stored.isConnected = true;
      stored.lastSeen = Date.now();
      stored.isValidated = true;
      this.playerConnections.set(playerId, stored);
    }
    
    return stored;
  }

  /**
   * ⏰ Start recovery timer for disconnected player
   */
  private startRecoveryTimer(playerId: string): void {
    setTimeout(() => {
      const status = this.playerConnections.get(playerId);
      if (status && !status.isConnected) {
        this.logger.log(`⏰ Recovery timeout for player ${playerId} - marking as definitively disconnected`);
        
        // Clean up after grace period
        this.playerConnections.delete(playerId);
      }
    }, this.CONNECTION_GRACE_PERIOD);
  }

  /**
   * 🔄 Attempt to recover connection
   */
  async attemptConnectionRecovery(playerId: string, server: Server): Promise<boolean> {
    const status = this.playerConnections.get(playerId);
    if (!status) return false;
    
    this.logger.log(`🔄 Attempting connection recovery for player ${playerId}`);
    
    // Send reconnection request to all sockets (in case player has new socket)
    server.emit('connection_recovery_request', {
      playerId,
      timestamp: Date.now(),
      gracePeriod: this.CONNECTION_GRACE_PERIOD
    });
    
    // Wait for response
    return new Promise((resolve) => {
      setTimeout(() => {
        const updatedStatus = this.getConnectionStatus(playerId);
        const recovered = updatedStatus.isConnected;
        
        if (recovered) {
          this.recoveryStats.successfulRecoveries++;
          this.logger.log(`✅ Connection recovery successful for player ${playerId}`);
        } else {
          this.logger.warn(`❌ Connection recovery failed for player ${playerId}`);
        }
        
        resolve(recovered);
      }, this.VALIDATION_TIMEOUT);
    });
  }

  /**
   * 🧹 Cleanup disconnected players
   */
  cleanupDisconnectedPlayers(): void {
    const now = Date.now();
    const toRemove: string[] = [];
    
    for (const [playerId, status] of this.playerConnections.entries()) {
      if (!status.isConnected && (now - status.lastSeen) > this.CONNECTION_GRACE_PERIOD * 2) {
        toRemove.push(playerId);
      }
    }
    
    toRemove.forEach(playerId => {
      this.logger.debug(`🧹 Cleaning up stale connection for player ${playerId}`);
      this.playerConnections.delete(playerId);
      this.playerSockets.delete(playerId);
    });
  }

  /**
   * 🎯 Check if specific player is connected
   */
  isPlayerConnected(playerId: string): boolean {
    const status = this.getConnectionStatus(playerId);
    return status.isConnected;
  }

  /**
   * 📊 Get connection statistics
   */
  getConnectionStats() {
    const totalConnected = Array.from(this.playerConnections.values())
      .filter(status => status.isConnected).length;
    
    const totalTracked = this.playerConnections.size;
    
    const successRate = this.recoveryStats.totalValidations > 0 
      ? ((this.recoveryStats.totalValidations - this.recoveryStats.failedValidations) / this.recoveryStats.totalValidations) * 100 
      : 100;
    
    return {
      ...this.recoveryStats,
      totalConnected,
      totalTracked,
      successRate: Math.round(successRate * 100) / 100,
      recoveryRate: this.recoveryStats.totalValidations > 0 
        ? (this.recoveryStats.successfulRecoveries / this.recoveryStats.totalValidations) * 100 
        : 0
    };
  }

  /**
   * 🔧 Force refresh player connection status
   */
  refreshPlayerConnection(playerId: string, socket: Socket): void {
    this.logger.debug(`🔧 Force refreshing connection for player ${playerId}`);
    this.registerConnection(playerId, socket);
  }

  /**
   * 🎯 Get player by socket ID
   */
  getPlayerBySocketId(socketId: string): string | null {
    return this.socketToPlayer.get(socketId) || null;
  }

  /**
   * 🎯 Get socket by player ID
   */
  getSocketByPlayerId(playerId: string): Socket | null {
    return this.playerSockets.get(playerId) || null;
  }
} 