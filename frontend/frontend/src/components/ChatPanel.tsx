'use client';

import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/contexts/AuthContext';
import { usePV3 } from '@/hooks/usePV3';

interface ChatMessage {
  id: string;
  gameType: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
  type: 'user_message' | 'game_event' | 'system';
}

interface ChatReaction {
  messageId: string;
  playerId: string;
  reaction: '👍' | '💎' | '💣' | '🔥' | '😤';
  timestamp: number;
}

interface ChatPanelProps {
  gameType: string;
  className?: string;
  mobile?: boolean;
  matchId?: string;
  gamePhase?: string;
}

export default function ChatPanel({ gameType, className = '', mobile = false, matchId, gamePhase }: ChatPanelProps) {
  const { user } = useAuth();
  const { publicKey } = usePV3();
  
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reactions, setReactions] = useState<Map<string, ChatReaction[]>>(new Map());
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);
  
  // Voice chat state
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [voiceConnected, setVoiceConnected] = useState(false);
  const [opponentVoiceStatus, setOpponentVoiceStatus] = useState({ connected: false, muted: false });
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const localAudioRef = useRef<HTMLAudioElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  
  // Quick reactions
  const quickReactions = ['👍', '💎', '💣', '🔥', '😤'] as const;

  // Get player info
  const playerId = publicKey?.toString() || user?.walletAddress || '';
  const playerName = user?.username || (playerId ? `Player_${playerId.slice(0, 4)}...${playerId.slice(-2)}` : 'Anonymous');

  // Initialize chat connection
  useEffect(() => {
    if (!playerId || !gameType) return;

    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://pv3-backend-api-production.up.railway.app';
    const chatSocket = io(`${API_BASE}/chat`, {
      transports: ['websocket'],
      forceNew: false, // Don't force new connections
      reconnection: true,
      reconnectionAttempts: 3,
    });

    setSocket(chatSocket);

    // Connection handlers
    chatSocket.on('connect', () => {
      console.log('💬 Connected to chat server');
      setIsConnected(true);
      setError(null);
      
      // Determine chat room type based on current state
      const isInMatch = matchId && [
        // Crash game phases
        'waiting', 'playing', 'rising', 'crashed', 'round-complete', 'round-result', 'round-countdown', 'finished',
        // RPS game phases
        'joining', 'preparing-animation', 'revealing', 'payout-complete',
        // Dice-duel game phases
        'rolling', 'completed',
        // Coinflip game phases
        'flipping', 'round-complete', 'finished'
      ].includes(gamePhase || '');
      
      // Join appropriate chat room
      if (isInMatch) {
        console.log(`💬 Joining private match chat: ${matchId}`);
        chatSocket.emit('join_match_chat', {
          matchId,
          playerId,
          playerName
        });
      } else {
        console.log(`💬 Joining public game chat: ${gameType}`);
        chatSocket.emit('join_game_chat', {
          gameType,
          playerId,
          playerName
        });
      }
    });

    chatSocket.on('disconnect', () => {
      console.log('💬 Disconnected from chat server');
      setIsConnected(false);
    });

    // Chat event handlers
    chatSocket.on('chat_joined', (data) => {
      console.log('💬 Joined chat:', data);
    });

    chatSocket.on('chat_history', (data) => {
      console.log('💬 Received chat history:', data.messages.length, 'messages');
      setMessages(data.messages || []);
    });

    chatSocket.on('chat_message', (message: ChatMessage) => {
      console.log('💬 New message:', message);
      setMessages(prev => [...prev, message]);
    });

    chatSocket.on('chat_reaction', (reaction: ChatReaction) => {
      console.log('💬 New reaction:', reaction);
      setReactions(prev => {
        const newReactions = new Map(prev);
        const messageReactions = newReactions.get(reaction.messageId) || [];
        newReactions.set(reaction.messageId, [...messageReactions, reaction]);
        return newReactions;
      });
    });

    chatSocket.on('message_sent', () => {
      setNewMessage('');
      setRateLimited(false);
    });

    chatSocket.on('chat_error', (data) => {
      console.error('💬 Chat error:', data.message);
      setError(data.message);
      
      if (data.message.includes('Rate limited')) {
        setRateLimited(true);
        setTimeout(() => setRateLimited(false), 45000); // 45 second cooldown
      }
    });

    // Voice chat WebRTC signaling handlers
    chatSocket.on('voice_offer', async (data) => {
      console.log('🎤 Received voice offer');
      await handleVoiceOffer(data.offer, data.from);
    });

    chatSocket.on('voice_answer', async (data) => {
      console.log('🎤 Received voice answer');
      await handleVoiceAnswer(data.answer);
    });

    chatSocket.on('voice_ice_candidate', async (data) => {
      console.log('🎤 Received ICE candidate');
      await handleIceCandidate(data.candidate);
    });

    chatSocket.on('voice_status_update', (data) => {
      console.log('🎤 Voice status update:', data);
      setOpponentVoiceStatus({ connected: data.connected, muted: data.muted });
    });

    return () => {
      // Cleanup voice chat
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (peerConnection) {
        peerConnection.close();
      }
      
      // Leave both types of chat rooms
      chatSocket.emit('leave_game_chat');
      chatSocket.emit('leave_match_chat');
      chatSocket.disconnect();
    };
  }, [playerId, gameType, playerName, matchId]); // Removed gamePhase to prevent frequent reconnections

  // Auto-scroll to bottom (only within chat container)
  useEffect(() => {
    if (messagesEndRef.current) {
      // Use scrollTop instead of scrollIntoView to avoid affecting page scroll
      const messagesContainer = messagesEndRef.current.parentElement;
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }
  }, [messages]);

  // Voice chat functions
  const initializeVoiceChat = async () => {
    try {
      // Get user media (microphone)
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      setLocalStream(stream);
      
      // Create peer connection
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ]
      });

      // Add local stream to peer connection
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Handle remote stream
      pc.ontrack = (event) => {
        console.log('🎤 Received remote stream');
        const [remoteStream] = event.streams;
        setRemoteStream(remoteStream);
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteStream;
        }
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('voice_ice_candidate', {
            candidate: event.candidate,
            matchId
          });
        }
      };

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        console.log('🎤 Connection state:', pc.connectionState);
        setVoiceConnected(pc.connectionState === 'connected');
      };

      setPeerConnection(pc);
      setIsVoiceEnabled(true);
      
      // Notify other player about voice status
      if (socket) {
        socket.emit('voice_status_update', {
          matchId,
          connected: true,
          muted: isMuted
        });
      }

      return pc;
    } catch (error) {
      console.error('🎤 Error initializing voice chat:', error);
      setError('Failed to access microphone. Please check permissions.');
      return null;
    }
  };

  const handleVoiceOffer = async (offer: RTCSessionDescriptionInit, from: string) => {
    try {
      // Initialize peer connection if not already done (receiving side)
      let pc = peerConnection;
      if (!pc) {
        pc = await initializeVoiceChat();
        if (!pc) return;
      }
      
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      if (socket) {
        socket.emit('voice_answer', {
          answer,
          to: from,
          matchId
        });
      }
    } catch (error) {
      console.error('🎤 Error handling voice offer:', error);
    }
  };

  const handleVoiceAnswer = async (answer: RTCSessionDescriptionInit) => {
    if (!peerConnection) return;
    
    try {
      await peerConnection.setRemoteDescription(answer);
    } catch (error) {
      console.error('🎤 Error handling voice answer:', error);
    }
  };

  const handleIceCandidate = async (candidate: RTCIceCandidateInit) => {
    if (!peerConnection) return;
    
    try {
      await peerConnection.addIceCandidate(candidate);
    } catch (error) {
      console.error('🎤 Error adding ICE candidate:', error);
    }
  };

  const startVoiceCall = async () => {
    const pc = await initializeVoiceChat();
    if (!pc || !socket) return;

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      socket.emit('voice_offer', {
        offer,
        matchId,
        to: 'opponent' // Will be handled by backend to route to other player
      });
    } catch (error) {
      console.error('🎤 Error starting voice call:', error);
    }
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMuted;
        setIsMuted(!isMuted);
        
        // Notify other player
        if (socket) {
          socket.emit('voice_status_update', {
            matchId,
            connected: voiceConnected,
            muted: !isMuted
          });
        }
      }
    }
  };

  const toggleDeafen = () => {
    setIsDeafened(!isDeafened);
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = !isDeafened;
    }
  };

  const endVoiceCall = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (peerConnection) {
      peerConnection.close();
    }
    
    setLocalStream(null);
    setRemoteStream(null);
    setPeerConnection(null);
    setIsVoiceEnabled(false);
    setVoiceConnected(false);
    
    if (socket) {
      socket.emit('voice_status_update', {
        matchId,
        connected: false,
        muted: false
      });
    }
  };

  // Send message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!socket || !isConnected || !newMessage.trim() || rateLimited) return;

    socket.emit('send_chat_message', {
      message: newMessage.trim()
    });
  };

  // Add reaction
  const handleAddReaction = (messageId: string, reaction: typeof quickReactions[number]) => {
    if (!socket || !isConnected || rateLimited) return;

    socket.emit('add_chat_reaction', {
      messageId,
      reaction
    });
  };

  // Format timestamp
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Get message style based on type
  const getMessageStyle = (message: ChatMessage) => {
    switch (message.type) {
      case 'system':
        return 'text-blue-400 italic';
      case 'game_event':
        return 'text-accent-success font-medium';
      default:
        return 'text-text-primary';
    }
  };

  if (mobile) {
    return (
      <div className={`fixed bottom-0 left-0 right-0 z-50 ${className}`}>
        {/* Mobile bottom drawer */}
        <div className={`glass-card border-t border-border transition-all duration-300 ${
          isCollapsed ? 'h-12' : 'h-48'
        }`}>
          {/* Collapse toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-full h-12 flex items-center justify-between px-4 bg-bg-elevated/50 hover:bg-bg-hover/50 transition-colors backdrop-blur-sm"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                💬 {(() => {
                  if (matchId && (gamePhase === 'waiting' || gamePhase === 'playing' || gamePhase === 'round-countdown' || gamePhase === 'finished')) {
                    return 'Game Chat';
                  } else if (gamePhase === 'lobby') {
                    return 'Lobby Chat';
                  } else {
                    return 'Live Chat';
                  }
                })()}
              </span>
              {isConnected && (
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              )}
              {voiceConnected && (
                <span className="text-xs text-green-400">🎤</span>
              )}
            </div>
            <span className="text-text-secondary">
              {isCollapsed ? '▲' : '▼'}
            </span>
          </button>

          {/* Chat content */}
          {!isCollapsed && (
            <div className="h-36 flex flex-col">
              {/* Voice controls - Mobile */}
              {matchId && (
                <div className="p-3 bg-gradient-to-r from-bg-elevated/30 to-bg-elevated/10 border-b border-border backdrop-blur-sm">
                  {!isVoiceEnabled ? (
                    <button
                      onClick={startVoiceCall}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg transition-all duration-200 shadow-lg hover:shadow-green-500/25 transform active:scale-95"
                    >
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      <span className="text-xs font-medium">Start Voice</span>
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 715 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                      </svg>
                    </button>
                  ) : (
                    <div className="space-y-2">
                      {/* Voice Status */}
                      <div className="flex items-center justify-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${voiceConnected ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`}></div>
                        <span className="text-xs font-medium text-text-primary">
                          {voiceConnected ? 'Connected' : 'Connecting...'}
                        </span>
                      </div>
                      
                      {/* Voice Controls */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={toggleMute}
                          className={`flex items-center justify-center gap-1 px-2 py-1 rounded transition-all duration-200 shadow-sm transform active:scale-95 ${
                            isMuted 
                              ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-red-500/25' 
                              : 'bg-gradient-to-r from-gray-600 to-gray-700 text-white hover:from-gray-700 hover:to-gray-800 shadow-gray-500/25'
                          }`}
                          title={isMuted ? 'Unmute' : 'Mute'}
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            {isMuted ? (
                              <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
                            ) : (
                              <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 715 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                            )}
                          </svg>
                          <span className="text-xs">{isMuted ? 'Muted' : 'Live'}</span>
                        </button>
                        
                        <button
                          onClick={toggleDeafen}
                          className={`flex items-center justify-center gap-1 px-2 py-1 rounded transition-all duration-200 shadow-sm transform active:scale-95 ${
                            isDeafened 
                              ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-red-500/25' 
                              : 'bg-gradient-to-r from-gray-600 to-gray-700 text-white hover:from-gray-700 hover:to-gray-800 shadow-gray-500/25'
                          }`}
                          title={isDeafened ? 'Enable audio' : 'Disable audio'}
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            {isDeafened ? (
                              <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
                            ) : (
                              <path d="M10 3.75a.75.75 0 00-1.264-.546L5.203 6H2.667a.75.75 0 000 1.5H5.203l3.533 2.796A.75.75 0 0010 9.75V3.75zM15.95 5.05a.75.75 0 00-1.06 1.06L16.69 7.91a2.25 2.25 0 010 3.18l-1.8 1.8a.75.75 0 101.06 1.06l1.8-1.8a3.75 3.75 0 000-5.3l-1.8-1.8z" />
                            )}
                          </svg>
                          <span className="text-xs">{isDeafened ? 'Deaf' : 'Audio'}</span>
                        </button>
                        
                        <button
                          onClick={endVoiceCall}
                          className="flex items-center justify-center gap-1 px-2 py-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded transition-all duration-200 shadow-sm shadow-red-500/25 transform active:scale-95"
                          title="End call"
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                          </svg>
                          <span className="text-xs">End</span>
                        </button>
                        
                        {opponentVoiceStatus.connected && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-bg-elevated/40 rounded border border-border/50">
                            <div className={`w-1 h-1 rounded-full ${opponentVoiceStatus.muted ? 'bg-red-400' : 'bg-green-400 animate-pulse'}`}></div>
                            <span className="text-xs text-text-secondary">
                              {opponentVoiceStatus.muted ? 'Muted' : 'Live'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {messages.map((message) => (
                  <div key={message.id} className="text-xs">
                    <div className="flex items-start gap-2">
                      <span className="text-text-secondary min-w-0 flex-shrink-0">
                        {formatTime(message.timestamp)}
                      </span>
                      <span className="font-medium text-accent-primary min-w-0 flex-shrink-0">
                        {message.playerName}:
                      </span>
                      <span className={`${getMessageStyle(message)} break-words`}>
                        {message.message}
                      </span>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-border">
                <div className="flex gap-2">
                  <input
                    ref={messageInputRef}
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={rateLimited ? "Rate limited..." : "Type a message..."}
                    disabled={!isConnected || rateLimited}
                    maxLength={200}
                    className="flex-1 px-3 py-2 text-sm bg-bg-elevated border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!isConnected || !newMessage.trim() || rateLimited}
                    className="px-4 py-2 bg-accent-primary hover:bg-accent-secondary disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Send
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Hidden audio elements */}
        <audio ref={localAudioRef} muted />
        <audio ref={remoteAudioRef} autoPlay />
      </div>
    );
  }

  if (isCollapsed) {
    // Collapsed state - just a small button
    return (
      <div className={`glass-card ${className}`}>
        <button
          onClick={() => setIsCollapsed(false)}
          className="w-full h-12 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
          title="Expand chat"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm">💬</span>
            {isConnected && (
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            )}
            {voiceConnected && (
              <span className="text-xs text-green-400">🎤</span>
            )}
            <span className="text-xs">Chat</span>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className={`glass-card flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-lg font-audiowide">
            💬 {(() => {
              if (matchId && (gamePhase === 'waiting' || gamePhase === 'playing' || gamePhase === 'round-countdown' || gamePhase === 'finished')) {
                return 'Game Chat';
              } else if (gamePhase === 'lobby') {
                return 'Lobby Chat';
              } else {
                return 'Live Chat';
              }
            })()}
          </h3>
          {isConnected ? (
            <div className="w-2 h-2 bg-green-400 rounded-full" title="Connected"></div>
          ) : (
            <div className="w-2 h-2 bg-red-400 rounded-full" title="Disconnected"></div>
          )}
          {voiceConnected && (
            <span className="text-sm text-green-400" title="Voice connected">🎤</span>
          )}
        </div>
        <button
          onClick={() => setIsCollapsed(true)}
          className="text-text-secondary hover:text-text-primary transition-colors"
          title="Minimize chat"
        >
          ▶
        </button>
      </div>

      {/* Voice Controls - Desktop */}
      {matchId && (
        <div className="p-4 bg-gradient-to-r from-bg-elevated/30 to-bg-elevated/10 border-b border-border backdrop-blur-sm">
          {!isVoiceEnabled ? (
            <div className="flex items-center justify-center">
              <button
                onClick={startVoiceCall}
                className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-green-500/25 transform hover:scale-105 font-audiowide"
              >
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">Start Voice Chat</span>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Voice Status Indicator */}
              <div className="flex items-center justify-center gap-2 py-2">
                <div className={`w-3 h-3 rounded-full ${voiceConnected ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`}></div>
                <span className="text-sm font-medium text-text-primary">
                  {voiceConnected ? 'Voice Connected' : 'Connecting...'}
                </span>
              </div>
              
              {/* Voice Controls */}
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={toggleMute}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 shadow-md transform hover:scale-105 ${
                    isMuted 
                      ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-red-500/25' 
                      : 'bg-gradient-to-r from-gray-600 to-gray-700 text-white hover:from-gray-700 hover:to-gray-800 shadow-gray-500/25'
                  }`}
                  title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    {isMuted ? (
                      <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    ) : (
                      <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                    )}
                  </svg>
                  <span className="text-xs font-medium">{isMuted ? 'Muted' : 'Live'}</span>
                </button>
                
                <button
                  onClick={toggleDeafen}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 shadow-md transform hover:scale-105 ${
                    isDeafened 
                      ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-red-500/25' 
                      : 'bg-gradient-to-r from-gray-600 to-gray-700 text-white hover:from-gray-700 hover:to-gray-800 shadow-gray-500/25'
                  }`}
                  title={isDeafened ? 'Enable audio' : 'Disable audio'}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    {isDeafened ? (
                      <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    ) : (
                      <path d="M10 3.75a.75.75 0 00-1.264-.546L5.203 6H2.667a.75.75 0 000 1.5H5.203l3.533 2.796A.75.75 0 0010 9.75V3.75zM15.95 5.05a.75.75 0 00-1.06 1.06L16.69 7.91a2.25 2.25 0 010 3.18l-1.8 1.8a.75.75 0 101.06 1.06l1.8-1.8a3.75 3.75 0 000-5.3l-1.8-1.8z" />
                    )}
                  </svg>
                  <span className="text-xs font-medium">{isDeafened ? 'Deaf' : 'Audio'}</span>
                </button>
                
                <button
                  onClick={endVoiceCall}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg transition-all duration-200 shadow-md shadow-red-500/25 transform hover:scale-105"
                  title="End voice call"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  </svg>
                  <span className="text-xs font-medium">End</span>
                </button>
              </div>
              
              {/* Opponent Status */}
              {opponentVoiceStatus.connected && (
                <div className="flex items-center justify-center gap-2 py-2 px-3 bg-bg-elevated/40 rounded-lg border border-border/50">
                  <div className={`w-2 h-2 rounded-full ${opponentVoiceStatus.muted ? 'bg-red-400' : 'bg-green-400 animate-pulse'}`}></div>
                  <span className="text-xs text-text-secondary font-medium">
                    Opponent: {opponentVoiceStatus.muted ? 'Muted' : 'Speaking'}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="px-4 py-2 bg-red-500/20 border-b border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {messages.length === 0 ? (
          <div className="text-center text-text-secondary py-8">
            <p>No messages yet</p>
            <p className="text-sm">Be the first to say something!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="group">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="font-medium text-accent-primary text-sm">
                      {message.playerName}
                    </span>
                    <span className="text-xs text-text-secondary">
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                  <p className={`text-sm ${getMessageStyle(message)} break-words`}>
                    {message.message}
                  </p>
                  
                  {/* Reactions */}
                  <div className="flex items-center gap-1 mt-2">
                    {/* Existing reactions */}
                    {reactions.get(message.id)?.map((reaction, index) => (
                      <span key={index} className="text-sm">
                        {reaction.reaction}
                      </span>
                    ))}
                    
                    {/* Quick reaction buttons (show on hover) */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 ml-2">
                      {quickReactions.map((reaction) => (
                        <button
                          key={reaction}
                          onClick={() => handleAddReaction(message.id, reaction)}
                          disabled={!isConnected || rateLimited}
                          className="w-6 h-6 flex items-center justify-center hover:bg-bg-hover rounded transition-colors disabled:opacity-50"
                          title={`React with ${reaction}`}
                        >
                          <span className="text-xs">{reaction}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-border">
        <div className="flex gap-2">
          <input
            ref={messageInputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={
              !isConnected ? "Connecting..." :
              rateLimited ? "Rate limited (45s cooldown)" :
              "Type a message..."
            }
            disabled={!isConnected || rateLimited}
            maxLength={200}
            className="flex-1 px-3 py-2 bg-bg-elevated border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary disabled:opacity-50 text-sm"
          />
          <button
            type="submit"
            disabled={!isConnected || !newMessage.trim() || rateLimited}
            className="px-4 py-2 bg-accent-primary hover:bg-accent-secondary disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors font-audiowide"
          >
            Send
          </button>
        </div>
        <div className="flex justify-between items-center mt-2 text-xs text-text-secondary">
          <span>{newMessage.length}/200</span>
          {rateLimited && (
            <span className="text-red-400">Rate limited - wait 45 seconds</span>
          )}
        </div>
      </form>

      {/* Hidden audio elements */}
      <audio ref={localAudioRef} muted />
      <audio ref={remoteAudioRef} autoPlay />
    </div>
  );
} 