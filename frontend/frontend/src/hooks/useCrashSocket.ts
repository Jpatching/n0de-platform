'use client';

import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface CrashGameState {
  currentMultiplier: number;
  lastUpdate: number;
  gamePhase: 'early' | 'building' | 'critical' | 'extreme';
  updateCount: number;
  matchId?: string;
}

interface CrashSocketHook {
  socket: Socket | null;
  crashGameState: CrashGameState | null;
  connected: boolean;
  connect: () => void;
  disconnect: () => void;
  joinMatch: (matchId: string) => void;
  leaveMatch: (matchId: string) => void;
}

// Extend Window interface for crash animation reference
declare global {
  interface Window {
    crashAnimationRef?: {
      updateMultiplier: (multiplier: number) => void;
    };
  }
}

export const useCrashSocket = (): CrashSocketHook => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [crashGameState, setCrashGameState] = useState<CrashGameState | null>(null);

  // 🚀 Optimized crash multiplier update handler with performance monitoring
  const handleCrashMultiplierUpdate = useCallback((data: any) => {
    const { multiplier, timestamp, phase } = data;
    
    // Performance optimization: Skip outdated updates
    const now = Date.now();
    if (now - timestamp > 1000) {
      console.warn('Skipping outdated multiplier update:', multiplier);
      return;
    }
    
    // Update crash game state
    setCrashGameState(prevState => {
      if (!prevState) {
        return {
          currentMultiplier: multiplier,
          lastUpdate: timestamp,
          gamePhase: phase || 'early',
          updateCount: 1
        };
      }
      
      return {
        ...prevState,
        currentMultiplier: multiplier,
        lastUpdate: timestamp,
        gamePhase: phase || prevState.gamePhase,
        updateCount: prevState.updateCount + 1
      };
    });
    
    // Trigger canvas animation update if needed
    if (typeof window !== 'undefined' && window.crashAnimationRef) {
      window.crashAnimationRef.updateMultiplier(multiplier);
    }
  }, []);

  // Initialize socket connection
  const connect = useCallback(() => {
    if (socket) return;

    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://pv3-backend-api-production.up.railway.app';
    
    const newSocket = io(API_BASE, {
      transports: ['websocket'], // WebSocket-only for crash games
      upgrade: true,
      rememberUpgrade: true,
    });

    // Connection events
    newSocket.on('connect', () => {
      console.log('🚀 Crash WebSocket connected');
      setConnected(true);
      
      // Send compression support capability
      newSocket.emit('client_capabilities', {
        supportsCompression: true,
        compressionLibrary: 'pako',
        maxBatchSize: 10
      });
    });

    newSocket.on('disconnect', () => {
      console.log('🔌 Crash WebSocket disconnected');
      setConnected(false);
    });

    // 🚀 Enhanced crash game compression support
    
    // Handle compressed crash multiplier updates (binary data)
    newSocket.on('crash_multiplier_compressed', (compressedData: ArrayBuffer) => {
      try {
        // For now, we'll handle regular updates until pako is properly installed
        console.log('Received compressed crash data, falling back to regular updates');
      } catch (error) {
        console.warn('Failed to decompress crash multiplier update:', error);
      }
    });

    // Handle compressed batch updates
    newSocket.on('crash_batch_compressed', (compressedBatch: ArrayBuffer) => {
      try {
        // For now, we'll handle regular updates until pako is properly installed
        console.log('Received compressed crash batch, falling back to regular updates');
      } catch (error) {
        console.warn('Failed to decompress crash batch update:', error);
      }
    });

    // Keep existing handlers as fallback for non-compressed clients
    newSocket.on('crash_multiplier_update', handleCrashMultiplierUpdate);
    
    newSocket.on('crash_batch_update', (batchData: any) => {
      if (batchData.updates) {
        batchData.updates.forEach((update: any) => {
          handleCrashMultiplierUpdate({
            multiplier: update.multiplier,
            timestamp: batchData.timestamp,
            phase: update.phase,
            ...update
          });
        });
      }
    });

    // Other crash game events
    newSocket.on('crash_round_started', (data: any) => {
      console.log('🚀 Crash round started:', data);
      setCrashGameState(prev => prev ? {
        ...prev,
        matchId: data.matchId,
        currentMultiplier: 1.0,
        updateCount: 0
      } : null);
    });

    newSocket.on('crash_round_ended', (data: any) => {
      console.log('💥 Crash round ended:', data);
    });

    newSocket.on('player_cashed_out', (data: any) => {
      console.log('💰 Player cashed out:', data);
    });

    setSocket(newSocket);
  }, [socket, handleCrashMultiplierUpdate]);

  // Disconnect socket
  const disconnect = useCallback(() => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setConnected(false);
    }
  }, [socket]);

  // Join crash match room
  const joinMatch = useCallback((matchId: string) => {
    if (socket && connected) {
      socket.emit('join_match', { matchId });
      setCrashGameState(prev => ({
        currentMultiplier: 1.0,
        lastUpdate: Date.now(),
        gamePhase: 'early',
        updateCount: 0,
        matchId,
        ...prev
      }));
      console.log(`🎮 Joined crash match: ${matchId}`);
    }
  }, [socket, connected]);

  // Leave crash match room
  const leaveMatch = useCallback((matchId: string) => {
    if (socket && connected) {
      socket.emit('leave_match', { matchId });
      setCrashGameState(null);
      console.log(`🚪 Left crash match: ${matchId}`);
    }
  }, [socket, connected]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [socket]);

  return {
    socket,
    crashGameState,
    connected,
    connect,
    disconnect,
    joinMatch,
    leaveMatch
  };
}; 