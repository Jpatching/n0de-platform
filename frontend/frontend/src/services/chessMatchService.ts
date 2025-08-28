import { ChessEngine } from '../lib/games/chess/chess-engine';

export interface ChessMatch {
  matchId: string;
  escrowAddress: string;
  whitePlayer: string;
  blackPlayer: string;
  wager: number;
  status: 'waiting' | 'in_progress' | 'completed';
  timeControl: string;
}

export class ChessMatchService {
  private apiBaseUrl: string;

  constructor(apiBaseUrl?: string) {
    this.apiBaseUrl = apiBaseUrl || process.env.NEXT_PUBLIC_API_URL || 'https://pv3-backend-api-production.up.railway.app';
  }

  /**
   * Create a new chess match
   */
  async createChessMatch(
    playerWallet: string, 
    wager: number, 
    timeControl: string = '5+0'
  ): Promise<ChessMatch> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/matches/chess`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wager,
          playerWallet,
          timeControl
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to create chess match: ${response.statusText}`);
      }

      const result = await response.json();
      
      return {
        matchId: result.matchId,
        escrowAddress: result.escrowAddress,
        whitePlayer: playerWallet, // Creator is white
        blackPlayer: '', // Will be filled when someone joins
        wager,
        status: 'waiting',
        timeControl
      };

    } catch (error) {
      console.error('Error creating chess match:', error);
      throw error;
    }
  }

  /**
   * Join an existing chess match
   */
  async joinChessMatch(matchId: string, playerWallet: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/matches/${matchId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerWallet
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to join chess match: ${response.statusText}`);
      }

      return await response.json();

    } catch (error) {
      console.error('Error joining chess match:', error);
      throw error;
    }
  }

  /**
   * Submit chess game result
   */
  async submitChessResult(
    matchId: string,
    chessEngine: ChessEngine,
    whitePlayerWallet: string,
    blackPlayerWallet: string
  ): Promise<{ success: boolean; winner: string | null }> {
    try {
      const gameState = chessEngine.exportGameState();
      
      const response = await fetch(`${this.apiBaseUrl}/matches/${matchId}/chess-result`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          moves: gameState.moves,
          winner: gameState.winner,
          endReason: gameState.endReason,
          whiteTime: gameState.whiteTime,
          blackTime: gameState.blackTime,
          whitePlayer: whitePlayerWallet,
          blackPlayer: blackPlayerWallet
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to submit chess result: ${response.statusText}`);
      }

      return await response.json();

    } catch (error) {
      console.error('Error submitting chess result:', error);
      throw error;
    }
  }

  /**
   * Get match status
   */
  async getMatchStatus(matchId: string): Promise<any> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/matches/${matchId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to get match status: ${response.statusText}`);
      }

      return await response.json();

    } catch (error) {
      console.error('Error getting match status:', error);
      throw error;
    }
  }

  /**
   * Get available chess matches to join
   */
  async getAvailableMatches(): Promise<ChessMatch[]> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/matches?gameType=chess-blitz`);
      
      if (!response.ok) {
        throw new Error(`Failed to get available matches: ${response.statusText}`);
      }

      const result = await response.json();
      return result.matches || [];

    } catch (error) {
      console.error('Error getting available matches:', error);
      return [];
    }
  }

  /**
   * Handle game end and submit result automatically
   */
  async handleGameEnd(
    matchId: string,
    chessEngine: ChessEngine,
    whitePlayerWallet: string,
    blackPlayerWallet: string,
    onResultSubmitted?: (result: { success: boolean; winner: string | null }) => void
  ): Promise<void> {
    // Check if game is actually ended
    if (chessEngine.gameState === 'playing' || chessEngine.gameState === 'check') {
      return; // Game is still ongoing
    }

    try {
      console.log('🎯 Chess game ended, submitting result...');
      const result = await this.submitChessResult(
        matchId, 
        chessEngine, 
        whitePlayerWallet, 
        blackPlayerWallet
      );
      
      console.log('✅ Chess result submitted:', result);
      
      if (onResultSubmitted) {
        onResultSubmitted(result);
      }

    } catch (error) {
      console.error('❌ Failed to submit chess result:', error);
    }
  }
} 