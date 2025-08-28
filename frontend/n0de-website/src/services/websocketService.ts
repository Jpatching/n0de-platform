import { io, Socket } from 'socket.io-client';

interface MetricsData {
  responseTime: number;
  requestsPerSecond: number;
  successRate: number;
  activeConnections: number;
  timestamp: number;
}

interface UsageData {
  totalRequests: number;
  requestsToday: number;
  activeKeys: number;
  avgLatency: number;
  errorRate: number;
  uptime: number;
}

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connect(token?: string) {
    if (this.socket?.connected) {
      return;
    }

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'wss://n0de-backend-production-4e34.up.railway.app';
    
    this.socket = io(wsUrl, {
      auth: {
        token
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, try to reconnect
        this.attemptReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.attemptReconnect();
    });

    return this.socket;
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    setTimeout(() => {
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      this.socket?.connect();
    }, delay);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Subscribe to real-time metrics
  onMetricsUpdate(callback: (data: MetricsData) => void) {
    this.socket?.on('metrics', callback);
  }

  // Subscribe to usage updates
  onUsageUpdate(callback: (data: UsageData) => void) {
    this.socket?.on('usage', callback);
  }

  // Subscribe to system status updates
  onSystemStatus(callback: (data: { status: string; message?: string }) => void) {
    this.socket?.on('system:status', callback);
  }

  // Subscribe to API key activity
  onApiKeyActivity(callback: (data: { keyId: string; requests: number; lastUsed: string }) => void) {
    this.socket?.on('apikey:activity', callback);
  }

  // Request real-time data (fallback if WebSocket not available)
  requestMetrics() {
    this.socket?.emit('request:metrics');
  }

  requestUsage() {
    this.socket?.emit('request:usage');
  }

  // Check if connected
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  // Remove listeners
  off(event: string, callback?: Function) {
    if (callback) {
      this.socket?.off(event, callback);
    } else {
      this.socket?.off(event);
    }
  }
}

// Create singleton instance
const websocketService = new WebSocketService();
export default websocketService;

// Export types
export type { MetricsData, UsageData };