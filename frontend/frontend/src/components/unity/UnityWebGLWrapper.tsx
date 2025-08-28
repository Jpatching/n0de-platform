'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { GameType } from '@/types/game-types';

interface UnityWebGLWrapperProps {
  gameType: GameType;
  matchId: string;
  photonRoomId: string;
  playerId: string;
  onGameComplete: (result: UnityGameResult) => void;
  onGameError: (error: string) => void;
}

interface UnityGameResult {
  photonRoomId: string;
  gameDurationMs: number;
  player1Score: number;
  player2Score: number;
  totalActions: number;
  gameEventsHash: string;
  photonSessionHash: string;
  unityBuildVersion: string;
  antiCheatSignature: string;
  winner: string;
}

interface UnityInstance {
  SendMessage: (gameObjectName: string, methodName: string, value?: string) => void;
  SetFullscreen: (fullscreen: boolean) => void;
  Quit: () => Promise<void>;
}

declare global {
  interface Window {
    unityInstance?: UnityInstance;
    // Unity WebGL communication functions
    onUnityGameReady?: () => void;
    onUnityGameComplete?: (resultJson: string) => void;
    onUnityGameError?: (error: string) => void;
    onUnityPhotonConnected?: (roomId: string) => void;
    onUnityPhotonDisconnected?: () => void;
    onUnityAntiCheatAlert?: (alertJson: string) => void;
  }
}

export default function UnityWebGLWrapper({
  gameType,
  matchId,
  photonRoomId,
  playerId,
  onGameComplete,
  onGameError,
}: UnityWebGLWrapperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [gameState, setGameState] = useState<'loading' | 'connecting' | 'ready' | 'playing' | 'finished'>('loading');
  const [connectionStatus, setConnectionStatus] = useState<string>('Initializing...');

  // Unity WebGL communication callbacks
  const setupUnityCallbacks = useCallback(() => {
    // Game ready callback
    window.onUnityGameReady = () => {
      console.log('🎮 Unity game ready');
      setGameState('connecting');
      setConnectionStatus('Connecting to Photon...');
      
      // 🚀 HYBRID ARCHITECTURE: Send config for both Photon AND your backend
      if (window.unityInstance) {
        const gameConfig = {
          // Photon configuration (for real-time gameplay)
          photon: {
            appId: process.env.NEXT_PUBLIC_PHOTON_APP_ID, // Your Photon App ID
            region: 'us', // Auto-select best region
            roomId: photonRoomId,
            playerId: playerId,
            gameVersion: '1.0.0'
          },
          
          // Your backend configuration (for match management & validation)
          pv3Backend: {
          matchId,
          gameType,
          apiUrl: process.env.NEXT_PUBLIC_API_URL,
            wsUrl: process.env.NEXT_PUBLIC_WS_URL,
            authToken: localStorage.getItem('pv3_token')
          }
        };
        
        window.unityInstance.SendMessage('GameManager', 'InitializeHybridGame', JSON.stringify(gameConfig));
      }
    };

    // 🎯 PHOTON: Real-time connection status
    window.onUnityPhotonConnected = (roomId: string) => {
      console.log(`🔗 Connected to Photon room: ${roomId}`);
      setGameState('ready');
      setConnectionStatus('Connected - Waiting for players...');
    };

    window.onUnityPhotonDisconnected = () => {
      console.log('🔗 Disconnected from Photon');
      setConnectionStatus('Disconnected from game server');
    };

    // 🎯 BACKEND: Final game results (not real-time actions)
    window.onUnityGameComplete = (resultJson: string) => {
      try {
        const result: UnityGameResult = JSON.parse(resultJson);
        console.log('🏁 Unity game completed:', result);
        setGameState('finished');
        
        // Send results to YOUR backend for validation & smart contract
        onGameComplete(result);
      } catch (error) {
        console.error('❌ Failed to parse Unity game result:', error);
        onGameError('Failed to parse game result');
      }
    };

    // 🚨 ANTI-CHEAT: Real-time monitoring (background)
    window.onUnityAntiCheatAlert = (alertJson: string) => {
      try {
        const alert = JSON.parse(alertJson);
        console.warn('🚨 Anti-cheat alert:', alert);
        
        // Send anti-cheat alerts to your backend immediately
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/matches/${matchId}/anti-cheat-alert`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('pv3_token')}`
          },
          body: JSON.stringify({
            photonRoomId,
            alertType: alert.type,
            playerData: alert.data,
            timestamp: Date.now()
          })
        });
      } catch (error) {
        console.error('❌ Failed to process anti-cheat alert:', error);
      }
    };

    // Game error callback
    window.onUnityGameError = (error: string) => {
      console.error('❌ Unity game error:', error);
      onGameError(error);
    };
  }, [matchId, photonRoomId, playerId, gameType, onGameComplete, onGameError]);

  // Load Unity WebGL build
  useEffect(() => {
    setupUnityCallbacks();

    const loadUnityBuild = async () => {
      try {
        // In a real implementation, you would:
        // 1. Load the Unity WebGL build files
        // 2. Initialize the Unity instance
        // 3. Set up the canvas and rendering context
        // 4. Handle loading progress updates

        // Simulate Unity loading process
        const loadingInterval = setInterval(() => {
          setLoadingProgress(prev => {
            if (prev >= 100) {
              clearInterval(loadingInterval);
              setIsLoading(false);
              
              // Simulate Unity initialization
              setTimeout(() => {
                if (window.onUnityGameReady) {
                  window.onUnityGameReady();
                }
              }, 1000);
              
              return 100;
            }
            return prev + 10;
          });
        }, 200);

      } catch (error) {
        console.error('❌ Failed to load Unity build:', error);
        onGameError('Failed to load Unity game');
      }
    };

    loadUnityBuild();

    // Cleanup on unmount
    return () => {
      if (window.unityInstance) {
        window.unityInstance.Quit();
      }
      
      // Clear callbacks
      delete window.onUnityGameReady;
      delete window.onUnityGameComplete;
      delete window.onUnityGameError;
      delete window.onUnityPhotonConnected;
      delete window.onUnityPhotonDisconnected;
      delete window.onUnityAntiCheatAlert;
    };
  }, [setupUnityCallbacks, onGameError]);

  // Send messages to Unity
  const sendMessageToUnity = useCallback((objectName: string, methodName: string, value?: string) => {
    if (window.unityInstance) {
      window.unityInstance.SendMessage(objectName, methodName, value);
    }
  }, []);

  // Handle fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (window.unityInstance) {
      window.unityInstance.SetFullscreen(true);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-main text-text-primary flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🎮</div>
          <h2 className="text-2xl font-bold text-text-primary mb-4 font-audiowide">
            Unity WebGL + Photon
          </h2>
          <p className="text-text-secondary font-inter mb-4">
            Unity WebGL games with Photon multiplayer integration ready for implementation
          </p>
          <div className="space-y-2 text-sm text-text-secondary">
            <div>✅ Smart contract validation</div>
            <div>✅ Photon room management</div>
            <div>✅ Anti-cheat verification</div>
            <div>✅ Result cryptographic proof</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-main text-text-primary">
      {/* Game Header */}
      <div className="bg-bg-card border-b border-border-primary p-4">
        <div className="flex justify-between items-center max-w-6xl mx-auto">
          <div>
            <h1 className="text-xl font-bold text-text-primary font-audiowide">
              {gameType.replace(/([A-Z])/g, ' $1').trim()}
            </h1>
            <p className="text-text-secondary text-sm font-inter">
              Match ID: {matchId} | Room: {photonRoomId}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm">
              <span className="text-text-secondary">Status: </span>
              <span className={`font-medium ${
                gameState === 'ready' ? 'text-green-400' :
                gameState === 'playing' ? 'text-blue-400' :
                gameState === 'finished' ? 'text-purple-400' :
                'text-yellow-400'
              }`}>
                {connectionStatus}
              </span>
            </div>
            <button
              onClick={toggleFullscreen}
              className="secondary-button text-sm font-audiowide"
            >
              Fullscreen
            </button>
          </div>
        </div>
      </div>

      {/* Unity Canvas Container */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="relative w-full max-w-6xl bg-black rounded-lg overflow-hidden">
          <canvas
            ref={canvasRef}
            id="unity-canvas"
            className="w-full h-[600px] block"
            style={{ background: '#000' }}
          />
          
          {/* Game State Overlay */}
          {gameState !== 'playing' && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <div className="text-center text-white">
                {gameState === 'connecting' && (
                  <>
                    <div className="text-4xl mb-4">🔗</div>
                    <div className="text-xl font-bold mb-2">Connecting to Game</div>
                    <div className="text-sm">{connectionStatus}</div>
                  </>
                )}
                {gameState === 'ready' && (
                  <>
                    <div className="text-4xl mb-4">⏳</div>
                    <div className="text-xl font-bold mb-2">Waiting for Players</div>
                    <div className="text-sm">Game will start when both players are ready</div>
                  </>
                )}
                {gameState === 'finished' && (
                  <>
                    <div className="text-4xl mb-4">🏁</div>
                    <div className="text-xl font-bold mb-2">Game Complete</div>
                    <div className="text-sm">Processing results...</div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Game Controls */}
      <div className="bg-bg-card border-t border-border-primary p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center">
            <div className="text-sm text-text-secondary font-inter">
              <div>🎯 Use WASD or arrow keys to move</div>
              <div>🖱️ Mouse to aim and interact</div>
              <div>📱 Touch controls available on mobile</div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => sendMessageToUnity('GameManager', 'PauseGame')}
                className="secondary-button text-sm font-audiowide"
                disabled={gameState !== 'playing'}
              >
                Pause
              </button>
              <button
                onClick={() => sendMessageToUnity('GameManager', 'QuitGame')}
                className="danger-button text-sm font-audiowide"
              >
                Quit Game
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 