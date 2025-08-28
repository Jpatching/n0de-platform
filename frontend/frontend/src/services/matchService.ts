'use client';

export interface Match {
  id: string;
  gameType: string;
  wager: number;
  status: 'pending' | 'in_progress' | 'completed';
  player1: {
    id: string;
    wallet: string;
    username?: string;
  };
  player2?: {
    id: string;
    wallet: string;
    username?: string;
  };
  winner?: {
    id: string;
    wallet: string;
    username?: string;
  };
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  escrowAddress?: string;
  gameData?: {
    cryptographicProof?: {
      resultHash: string;
      signature: string;
      verifierPublicKey: string;
      message: string;
      timestamp: number;
      verificationInstructions: {
        description: string;
        steps: string[];
        verifierContract: string;
      };
    };
    [key: string]: any;
  };
}

export interface VerificationResult {
  verified: boolean;
  matchId: string;
  winner?: string;
  cryptographicProof?: {
    resultHash: string;
    verifierPublicKey: string;
    timestamp: number;
    signature: string;
    verificationInstructions: any;
  };
  verificationDetails?: {
    description: string;
    securityLevel: string;
    tamperProof: string;
    transparency: string;
    auditTrail: string;
  };
  howToVerify?: {
    step1: string;
    step2: string;
    step3: string;
    step4: string;
    step5: string;
  };
  error?: string;
}

class MatchService {
  private API_BASE: string;

  constructor() {
    this.API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'https://pv3-backend-api-production.up.railway.app') + '/api/v1';
  }

  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('pv3_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }

  // Create a new chess match
  async createChessMatch(wager: number): Promise<Match> {
    try {
      console.log('🎯 Creating match with wager:', wager);
      
      // First, cancel any existing pending matches
      console.log('🗑️ Checking for existing pending matches...');
      await this.cancelAllPendingMatches();
      
      // Extract wallet from JWT token
      const token = localStorage.getItem('pv3_token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      let playerWallet = '';
      try {
        // JWT tokens have 3 parts: header.payload.signature
        const parts = token.split('.');
        if (parts.length !== 3) {
          throw new Error('Invalid JWT token format');
        }
        
        // Decode the payload (second part)
        const payload = JSON.parse(atob(parts[1]));
        playerWallet = payload.wallet;
        console.log('🏦 Extracted wallet from JWT token:', playerWallet);
      } catch (e) {
        console.error('JWT decode error:', e);
        throw new Error('Failed to extract wallet from authentication token');
      }
      
      if (!playerWallet) {
        throw new Error('No wallet found in authentication token');
      }
      
      const requestBody = {
        gameType: 'chess-blitz',
        wager,
        playerWallet,
        expiryMinutes: 30,
      };
      console.log('🎯 Request body:', requestBody);
      
      // 🔧 DEBUG: Log the exact token being used
      console.log('🔑 Using token for request:', token?.substring(0, 20) + '...');
      
      const response = await fetch(`${this.API_BASE}/matches`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('🎯 Backend error response:', error);
        console.error('🚨 Full error details:', JSON.stringify(error, null, 2));
        // 🔧 Add detailed error analysis
        if (error.error && error.error.includes('Non-base58 character')) {
          console.error('🚨 SOLANA ERROR: Invalid base58 data detected');
          console.error('🚨 This suggests the backend is using invalid wallet data for escrow creation');
        }
        throw new Error(error.message || 'Failed to create match');
      }

      const data = await response.json();
      console.log('🎯 Backend response data:', data);
      
      // ✅ CONNECTION TRACKING: Start tracking user activity after creating match
      this.startActivityTracking();

      // Handle both old format {matchId, escrowAddress} and new format {match, matchId, escrowAddress}
      if (data.match) {
        // New format with complete match object
        console.log('🎯 Using new format, match ID:', data.match.id);
        return data.match;
      } else {
        // Old format - create match object from basic data
        console.log('🎯 Using old format, match ID:', data.matchId);
        return {
          id: data.matchId,
          escrowAddress: data.escrowAddress,
          gameType: 'chess-blitz',
          wager: wager,
          status: 'pending',
          createdAt: new Date().toISOString(),
          player1: {
            id: playerWallet,
            wallet: playerWallet,
            username: undefined
          },
          player2: undefined
        } as Match;
      }
    } catch (error) {
      console.error('Failed to create chess match:', error);
      throw error;
    }
  }



  // Create a new dice duel match
  async createDiceDuelMatch(wager: number): Promise<Match> {
    return await this.createMatch('dice-duel', wager);
  }

  // Create a new RPS match
  async createRPSMatch(wager: number): Promise<Match> {
    return await this.createMatch('rock-paper-scissors', wager);
  }

  // Create a new coin flip match
  async createCoinFlipMatch(wager: number): Promise<Match> {
    return await this.createMatch('coin-flip', wager);
  }

  // Create a new crash match
  async createCrashMatch(wager: number): Promise<Match> {
    return await this.createMatch('crash', wager);
  }

  // Create a new mines match
  async createMinesMatch(wager: number): Promise<Match> {
    return await this.createMatch('mines', wager);
  }

  // Create a new pump wars match
  async createPumpWarsMatch(wager: number): Promise<Match> {
    return await this.createMatch('pump-wars', wager);
  }

  // Generic create match method
  private async createMatch(gameType: string, wager: number): Promise<Match> {
    try {
      console.log(`🎯 Creating ${gameType} match with wager:`, wager);
      
      // Skip automatic cleanup to avoid rate limiting issues
      console.log('🚀 Skipping pending match cleanup to avoid rate limits...');
      
      // Extract wallet from JWT token
      const token = localStorage.getItem('pv3_token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      let playerWallet = '';
      try {
        // JWT tokens have 3 parts: header.payload.signature
        const parts = token.split('.');
        if (parts.length !== 3) {
          throw new Error('Invalid JWT token format');
        }
        
        // Decode the payload (second part)
        const payload = JSON.parse(atob(parts[1]));
        playerWallet = payload.wallet;
        console.log('🏦 Extracted wallet from JWT token:', playerWallet);
      } catch (e) {
        console.error('JWT decode error:', e);
        throw new Error('Failed to extract wallet from authentication token');
      }
      
      if (!playerWallet) {
        throw new Error('No wallet found in authentication token');
      }
      
      const requestBody = {
        gameType,
        wager,
        playerWallet,
        expiryMinutes: 30,
      };
      console.log('🎯 Request body:', requestBody);
      
      const response = await fetch(`${this.API_BASE}/matches`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('🎯 Backend error response:', error);
        throw new Error(error.message || 'Failed to create match');
      }

      const data = await response.json();
      
      // ✅ CONNECTION TRACKING: Start tracking user activity after creating match
      this.startActivityTracking();
      
      // Handle both old format {matchId, escrowAddress} and new format {match, matchId, escrowAddress}
      if (data.match) {
        return data.match;
      } else {
        return {
          id: data.matchId,
          escrowAddress: data.escrowAddress,
          gameType,
          wager: wager,
          status: 'pending',
          createdAt: new Date().toISOString(),
          player1: {
            id: playerWallet,
            wallet: playerWallet,
            username: undefined
          },
          player2: undefined
        } as Match;
      }
    } catch (error) {
      console.error(`Failed to create ${gameType} match:`, error);
      throw error;
    }
  }

  // Join a chess match
  async joinChessMatch(matchId: string): Promise<Match> {
    const result = await this.joinMatchGeneric(matchId);
    return result.match;
  }

  // Generic join match method
  async joinMatch(matchId: string): Promise<Match> {
    const result = await this.joinMatchGeneric(matchId);
    return result.match;
  }



  // Join RPS match
  async joinRPSMatch(matchId: string): Promise<{ success: boolean; message: string; match: Match }> {
    return await this.joinMatchGeneric(matchId);
  }

  // Join coin flip match
  async joinCoinFlipMatch(matchId: string): Promise<{ success: boolean; message: string; match: Match }> {
    return await this.joinMatchGeneric(matchId);
  }

  // Join dice duel match
  async joinDiceDuelMatch(matchId: string): Promise<{ success: boolean; message: string; match: Match }> {
    return await this.joinMatchGeneric(matchId);
  }

  // Get available matches for different game types
  async getAvailableChessMatches(excludeWallet?: string): Promise<Match[]> {
    return await this.getAvailableMatches('chess-blitz', excludeWallet);
  }



  async getAvailableRPSMatches(excludeWallet?: string): Promise<Match[]> {
    return await this.getAvailableMatches('rock-paper-scissors', excludeWallet);
  }

  async getAvailableCoinFlipMatches(excludeWallet?: string): Promise<Match[]> {
    return await this.getAvailableMatches('coin-flip', excludeWallet);
  }

  async getAvailableCrashMatches(excludeWallet?: string): Promise<Match[]> {
    return await this.getAvailableMatches('crash', excludeWallet);
  }

  async getAvailableMinesMatches(excludeWallet?: string): Promise<Match[]> {
    return await this.getAvailableMatches('mines', excludeWallet);
  }

  async getAvailableDiceDuelMatches(excludeWallet?: string): Promise<Match[]> {
    return await this.getAvailableMatches('dice-duel', excludeWallet);
  }

  async getAvailablePumpWarsMatches(excludeWallet?: string): Promise<Match[]> {
    return await this.getAvailableMatches('pump-wars', excludeWallet);
  }

  // Public method to get available matches for any game type
  async getAvailableMatches(gameType: string, excludeWallet?: string): Promise<Match[]> {
    try {
      let url = `${this.API_BASE}/matches/available?gameType=${gameType}`;
      if (excludeWallet) {
        url += `&excludeWallet=${excludeWallet}`;
      }
      
      const response = await fetch(url, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch matches');
      }

      const data = await response.json();
      return data.matches || [];
    } catch (error) {
      console.error('Failed to fetch available matches:', error);
      return []; // Return empty array on error
    }
  }

  // Get match details
  async getMatch(matchId: string): Promise<Match | null> {
    try {
      const response = await fetch(`${this.API_BASE}/matches/${matchId}`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.match;
    } catch (error) {
      console.error('Failed to fetch match:', error);
      return null;
    }
  }

  // Submit dice roll for dice duel game
  async submitDiceDuelRoll(matchId: string, rollValue: number): Promise<any> {
    try {
      const response = await fetch(`${this.API_BASE}/matches/${matchId}/dice-duel`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          rollValue
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to submit dice duel roll');
      }

      const data = await response.json();
      return data; // Return the full backend response
    } catch (error) {
      console.error('Failed to submit dice duel roll:', error);
      throw error;
    }
  }

  // Submit match result
  async submitMatchResult(matchId: string, winnerId: string, gameData: Record<string, unknown>): Promise<Match> {
    try {
      const response = await fetch(`${this.API_BASE}/matches/${matchId}/submit-result`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          matchId,
          gameState: gameData,
          winnerWallet: winnerId || null, // For draws, this will be null
          signature: 'frontend_generated', // Backend will generate the real signature
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to submit result');
      }

      const data = await response.json();
      return data.match;
    } catch (error) {
      console.error('Failed to submit match result:', error);
      throw error;
    }
  }

  // Cancel a match
  async cancelMatch(matchId: string): Promise<void> {
    try {
      const response = await fetch(`${this.API_BASE}/matches/${matchId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to cancel match');
      }
    } catch (error) {
      console.error('Failed to cancel match:', error);
      throw error;
    }
  }

  // Get user's matches
  async getUserMatches(): Promise<Match[]> {
    try {
      const response = await fetch(`${this.API_BASE}/matches/history`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch user matches');
      }

      const data = await response.json();
      return data.matches || [];
    } catch (error) {
      console.error('Failed to fetch user matches:', error);
      return [];
    }
  }

  // Get user's pending matches specifically
  async getUserPendingMatches(): Promise<Match[]> {
    try {
      const matches = await this.getUserMatches();
      return matches.filter(match => match.status === 'pending');
    } catch (error) {
      console.error('Failed to fetch pending matches:', error);
      return [];
    }
  }

  // Cancel all pending matches for the user
  async cancelAllPendingMatches(): Promise<void> {
    try {
      const pendingMatches = await this.getUserPendingMatches();
      console.log('🗑️ Found pending matches to cancel:', pendingMatches.length);
      
      if (pendingMatches.length === 0) {
        console.log('🗑️ No pending matches to cancel');
        return; // No matches to cancel, this is fine
      }
      
      // Cancel each match, but don't fail the whole operation if one fails
      const cancelPromises = pendingMatches.map(async (match) => {
        try {
          await this.cancelMatch(match.id);
          console.log('🗑️ Cancelled match:', match.id);
        } catch (error) {
          console.warn('🗑️ Failed to cancel match:', match.id, error);
          // Don't throw - just log and continue
        }
      });
      
      await Promise.allSettled(cancelPromises);
      console.log('🗑️ Finished cancelling pending matches');
    } catch (error) {
      console.warn('🗑️ Error during pending match cleanup (continuing anyway):', error);
      // Don't throw the error up - the main match creation should still proceed
    }
  }

  // ✅ CONNECTION TRACKING: Track user activity to prevent bots joining abandoned matches
  async trackUserActivity(): Promise<void> {
    try {
      const token = localStorage.getItem('pv3_token');
      if (!token) return; // No token, user not authenticated

      const response = await fetch(`${this.API_BASE}/matches/track-activity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        console.log('🔗 User activity tracked successfully');
      } else {
        console.warn('🔗 Failed to track user activity:', response.status);
      }
    } catch (error) {
      console.warn('🔗 Error tracking user activity:', error);
      // Don't throw - this is not critical
    }
  }

  // ✅ AUTO-TRACKING: Start automatic activity tracking
  private activityTrackingInterval: NodeJS.Timeout | null = null;

  startActivityTracking(): void {
    // Track activity immediately
    this.trackUserActivity();
    
    // Set up periodic tracking every 2 minutes (faster than the 5-minute timeout)
    if (this.activityTrackingInterval) {
      clearInterval(this.activityTrackingInterval);
    }
    
    this.activityTrackingInterval = setInterval(() => {
      this.trackUserActivity();
    }, 2 * 60 * 1000); // 2 minutes
    
    console.log('🔗 Started automatic activity tracking');
  }

  stopActivityTracking(): void {
    if (this.activityTrackingInterval) {
      clearInterval(this.activityTrackingInterval);
      this.activityTrackingInterval = null;
      console.log('🔗 Stopped automatic activity tracking');
    }
  }

  // ✅ SURGICAL PRECISION: Verify cryptographic proof of match result
  async verifyMatchResult(matchId: string): Promise<VerificationResult> {
    try {
      const response = await fetch(`${this.API_BASE}/matches/${matchId}/verify`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to verify match result');
      }

      const data = await response.json();
      return data as VerificationResult;
    } catch (error) {
      console.error('Failed to verify match result:', error);
      return {
        verified: false,
        matchId: matchId,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ✅ SURGICAL PRECISION: Check if match has cryptographic proof
  hasVerifiableProof(match: Match): boolean {
    return !!(match.gameData?.cryptographicProof?.resultHash);
  }

  // ✅ SURGICAL PRECISION: Get verification status display
  getVerificationStatus(match: Match): {
    status: 'verified' | 'unverified' | 'pending';
    icon: string;
    description: string;
    color: string;
  } {
    if (match.status !== 'completed') {
      return {
        status: 'pending',
        icon: '⏳',
        description: 'Match in progress',
        color: 'text-yellow-600'
      };
    }

    if (this.hasVerifiableProof(match)) {
      return {
        status: 'verified',
        icon: '🔐',
        description: 'Cryptographically verified',
        color: 'text-green-600'
      };
    }

    return {
      status: 'unverified',
      icon: '⚠️',
      description: 'No cryptographic proof',
      color: 'text-red-600'
    };
  }

  // ✅ SURGICAL PRECISION: Export verification data for external verification
  exportVerificationData(match: Match): string | null {
    if (!this.hasVerifiableProof(match)) {
      return null;
    }

    const verificationData = {
      platform: 'PV3 Gaming Platform',
      matchId: match.id,
      winner: match.winner?.wallet,
      escrowAddress: match.escrowAddress,
      cryptographicProof: match.gameData?.cryptographicProof,
      verificationInstructions: {
        description: 'This data can be independently verified using Ed25519 signature verification',
        steps: [
          '1. Use any Ed25519 verification library (e.g., tweetnacl, libsodium)',
          '2. Recreate message: matchPDA + winnerPubkey + resultHash (all as bytes)',
          '3. Verify signature using verifierPublicKey',
          '4. Check that resultHash matches the game data',
          '5. Verify on Solana blockchain using the verifierContract'
        ],
        contractAddress: '7KV8dJTTARc5KoDNjWpRCrVQpiuj4HoKYqTcqK2iTz8W',
        network: 'Solana Devnet'
      },
      exportedAt: new Date().toISOString(),
      exportedBy: 'PV3 Gaming Platform Frontend'
    };

    return JSON.stringify(verificationData, null, 2);
  }

  private async joinMatchGeneric(matchId: string): Promise<{ success: boolean; message: string; match: Match }> {
    try {
      console.log('🎯 Attempting to join match with ID:', matchId);
      console.log('🎯 Match ID type:', typeof matchId);
      console.log('🎯 Match ID length:', matchId?.length);
      
      // Extract wallet from JWT token
      const token = localStorage.getItem('pv3_token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      let playerWallet = '';
      try {
        const parts = token.split('.');
        const payload = JSON.parse(atob(parts[1]));
        playerWallet = payload.wallet;
      } catch (e) {
        throw new Error('Failed to extract wallet from authentication token');
      }

      const response = await fetch(`${this.API_BASE}/matches/${matchId}/join`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          playerWallet,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        
        // Handle rate limiting with user-friendly message
        if (response.status === 429) {
          throw new Error('Please wait a moment before trying to join another match. Too many attempts detected.');
        }
        
        throw new Error(error.message || 'Failed to join match');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to join match:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const matchService = new MatchService();
export default matchService; 