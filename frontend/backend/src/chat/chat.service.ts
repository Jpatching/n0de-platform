import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';

export interface ChatMessage {
  id: string;
  gameType: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
  type: 'user_message' | 'game_event' | 'system';
}

export interface GameEvent {
  type: 'match_start' | 'match_end' | 'player_join' | 'high_stakes';
  message: string;
  gameType: string;
  timestamp: number;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private server: Server;
  
  // Rate limiting: playerId -> { count, resetTime }
  private readonly rateLimits = new Map<string, { count: number; resetTime: number }>();
  private readonly MAX_MESSAGES_PER_PERIOD = 5;
  private readonly RATE_LIMIT_PERIOD = 45000; // 45 seconds
  
  // Message storage: gameType -> messages[]
  private readonly messageStore = new Map<string, ChatMessage[]>();
  private readonly MAX_MESSAGES_PER_GAME = 100;
  
  // Profanity filter - basic implementation
  private readonly bannedWords = [
    'fuck', 'shit', 'bitch', 'asshole', 'damn', 'cunt', 'nigger', 'faggot'
  ];

  setServer(server: Server) {
    this.server = server;
  }

  /**
   * Check rate limit for a player
   */
  checkRateLimit(playerId: string): boolean {
    const now = Date.now();
    const playerLimit = this.rateLimits.get(playerId);

    if (!playerLimit || now > playerLimit.resetTime) {
      // Reset or create new limit
      this.rateLimits.set(playerId, {
        count: 1,
        resetTime: now + this.RATE_LIMIT_PERIOD
      });
      return true;
    }

    if (playerLimit.count >= this.MAX_MESSAGES_PER_PERIOD) {
      return false; // Rate limited
    }

    // Increment count
    playerLimit.count++;
    return true;
  }

  /**
   * Filter profanity from message
   */
  filterMessage(message: string): string {
    let filtered = message;
    this.bannedWords.forEach(word => {
      const regex = new RegExp(word, 'gi');
      filtered = filtered.replace(regex, '*'.repeat(word.length));
    });
    return filtered;
  }

  /**
   * Add user message to chat
   */
  async addUserMessage(
    gameType: string,
    playerId: string,
    playerName: string,
    message: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Check rate limit
      if (!this.checkRateLimit(playerId)) {
        return { 
          success: false, 
          error: `Rate limited. Max ${this.MAX_MESSAGES_PER_PERIOD} messages per ${this.RATE_LIMIT_PERIOD / 1000} seconds.` 
        };
      }

      // Validate message
      if (!message || message.trim().length === 0) {
        return { success: false, error: 'Message cannot be empty' };
      }

      if (message.length > 200) {
        return { success: false, error: 'Message too long (max 200 characters)' };
      }

      // Filter profanity
      const filteredMessage = this.filterMessage(message.trim());

      // Create message
      const chatMessage: ChatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        gameType,
        playerId,
        playerName,
        message: filteredMessage,
        timestamp: Date.now(),
        type: 'user_message'
      };

      // Store message
      this.storeMessage(gameType, chatMessage);

      // Broadcast to game room
      this.server.to(`${gameType}_chat`).emit('chat_message', chatMessage);

      this.logger.log(`💬 Chat message from ${playerName} in ${gameType}: ${filteredMessage}`);
      return { success: true };

    } catch (error) {
      this.logger.error('Error adding user message:', error);
      return { success: false, error: 'Failed to send message' };
    }
  }

  /**
   * Broadcast safe game event to chat
   */
  async broadcastGameEvent(gameType: string, event: GameEvent): Promise<void> {
    try {
      const chatMessage: ChatMessage = {
        id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        gameType,
        playerId: 'system',
        playerName: 'System',
        message: event.message,
        timestamp: event.timestamp,
        type: 'game_event'
      };

      // Store message
      this.storeMessage(gameType, chatMessage);

      // Broadcast to game room
      this.server.to(`${gameType}_chat`).emit('chat_message', chatMessage);

      this.logger.log(`🎮 Game event in ${gameType}: ${event.message}`);
    } catch (error) {
      this.logger.error('Error broadcasting game event:', error);
    }
  }

  /**
   * Store message in memory (with size limits)
   */
  private storeMessage(gameType: string, message: ChatMessage): void {
    if (!this.messageStore.has(gameType)) {
      this.messageStore.set(gameType, []);
    }

    const messages = this.messageStore.get(gameType)!;
    messages.push(message);

    // Keep only latest messages
    if (messages.length > this.MAX_MESSAGES_PER_GAME) {
      messages.splice(0, messages.length - this.MAX_MESSAGES_PER_GAME);
    }
  }

  /**
   * Get recent messages for a game type
   */
  getRecentMessages(gameType: string, limit: number = 50): ChatMessage[] {
    const messages = this.messageStore.get(gameType) || [];
    return messages.slice(-limit);
  }

  /**
   * Handle player reaction to message
   */
  async addReaction(
    gameType: string,
    messageId: string,
    playerId: string,
    reaction: '👍' | '💎' | '💣' | '🔥' | '😤'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Check rate limit (reactions count toward limit)
      if (!this.checkRateLimit(playerId)) {
        return { success: false, error: 'Rate limited' };
      }

      // Broadcast reaction
      this.server.to(`${gameType}_chat`).emit('chat_reaction', {
        messageId,
        playerId,
        reaction,
        timestamp: Date.now()
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Error adding reaction:', error);
      return { success: false, error: 'Failed to add reaction' };
    }
  }

  /**
   * Clean up old rate limits periodically
   */
  cleanupRateLimits(): void {
    const now = Date.now();
    for (const [playerId, limit] of this.rateLimits.entries()) {
      if (now > limit.resetTime) {
        this.rateLimits.delete(playerId);
      }
    }
  }
} 