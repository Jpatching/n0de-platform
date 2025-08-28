import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import websocketService, { MetricsData, UsageData } from '@/services/websocketService';

interface UseWebSocketOptions {
  autoConnect?: boolean;
  reconnect?: boolean;
}

interface WebSocketState {
  isConnected: boolean;
  metrics: MetricsData | null;
  usage: UsageData | null;
  systemStatus: { status: string; message?: string } | null;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { autoConnect = true, reconnect = true } = options;
  const { token } = useAuth();
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    metrics: null,
    usage: null,
    systemStatus: null,
  });

  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = () => {
    if (!token) return;
    
    websocketService.connect(token);
    
    // Set up event listeners
    websocketService.onMetricsUpdate((metrics) => {
      setState(prev => ({ ...prev, metrics }));
    });

    websocketService.onUsageUpdate((usage) => {
      setState(prev => ({ ...prev, usage }));
    });

    websocketService.onSystemStatus((systemStatus) => {
      setState(prev => ({ ...prev, systemStatus }));
    });

    // Update connection state
    const checkConnection = () => {
      setState(prev => ({ 
        ...prev, 
        isConnected: websocketService.isConnected() 
      }));
    };

    // Check connection every second
    const connectionChecker = setInterval(checkConnection, 1000);
    
    return () => {
      clearInterval(connectionChecker);
    };
  };

  const disconnect = () => {
    websocketService.disconnect();
    setState(prev => ({ ...prev, isConnected: false }));
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
  };

  const requestMetrics = () => {
    websocketService.requestMetrics();
  };

  const requestUsage = () => {
    websocketService.requestUsage();
  };

  useEffect(() => {
    if (autoConnect && token) {
      const cleanup = connect();
      
      return cleanup;
    }

    return () => {
      if (!reconnect) {
        disconnect();
      }
    };
  }, [token, autoConnect, reconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return {
    ...state,
    connect,
    disconnect,
    requestMetrics,
    requestUsage,
  };
}

export default useWebSocket;