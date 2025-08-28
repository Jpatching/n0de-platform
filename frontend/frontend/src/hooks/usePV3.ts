'use client';

import { useState, useCallback, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useAuth } from '@/contexts/AuthContext';
import bs58 from 'bs58';
import { 
  PV3_CONFIG, 
  derivePDAs, 
  formatSOL, 
  parseSOL 
} from '@/lib/solana-config';
import { 
  SystemProgram, 
  Transaction, 
  LAMPORTS_PER_SOL,
  PublicKey
} from '@solana/web3.js';

export interface Match {
  id: string;
  creator: string;
  joiner?: string;
  wagerAmount: number;
  gameType: number;
  status: 'waiting' | 'active' | 'completed';
  createdAt: number;
}

export interface GameStats {
  activeMatches: number;
  totalVolume: number;
  activePlayers: number;
  uptime: number;
  biggestWin: number;
  uniqueGamesPlayed: number;
}

export interface PlayerStats {
  gamesPlayed: number;
  gamesWon: number;
  winRate: number;
  totalWinnings: number;
  totalLosses: number;
  netProfit: number;
  currentStreak: number;
  longestStreak: number;
}

export interface ReferralStats {
  referralCode: string;
  totalReferred: number;
  totalEarned: number; // in lamports
  pendingRewards: number; // in lamports
  weeklyEarnings: number; // in lamports
}

export interface RewardHistory {
  date: string;
  type: string;
  amount: number;
  status: 'claimed' | 'pending';
}

export interface UserProfile {
  id: string;
  walletAddress: string;
  username?: string;
  displayName?: string;
  avatar?: string;
  email?: string;
  bio?: string;
  showUsername: boolean;
  profileVisibility: string;
  totalEarnings: number;
  totalMatches: number;
  wins: number;
  losses: number;
  winRate: number;
  reputation: number;
  createdAt: string;
}

// Global vault balance cache to persist across components
let globalVaultBalance = -1;
let globalVaultBalanceTimestamp = 0;
const VAULT_CACHE_DURATION = 30000; // 30 seconds cache

// Invisible performance optimization: API call debouncing
const apiCallCache = new Map<string, { data: any; timestamp: number }>();
const pendingCalls = new Map<string, Promise<any>>();
const API_CACHE_DURATION = 15000; // 15 seconds cache for API calls

// Debounced fetch function - invisible to user but prevents duplicate calls
const debouncedFetch = async (url: string, options?: RequestInit): Promise<any> => {
  const cacheKey = `${url}_${JSON.stringify(options)}`;
  const now = Date.now();
  
  // Check cache first (invisible speedup)
  const cached = apiCallCache.get(cacheKey);
  if (cached && (now - cached.timestamp) < API_CACHE_DURATION) {
    return cached.data;
  }
  
  // Check if call is already pending (prevents duplicate requests)
  const pending = pendingCalls.get(cacheKey);
  if (pending) {
    return pending;
  }
  
  // Make the call and cache it
  const promise = fetch(url, options).then(async (response) => {
    const data = await response.json();
    apiCallCache.set(cacheKey, { data, timestamp: now });
    pendingCalls.delete(cacheKey);
    return data;
  }).catch((error) => {
    pendingCalls.delete(cacheKey);
    throw error;
  });
  
  pendingCalls.set(cacheKey, promise);
  return promise;
};

export const usePV3 = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, signMessage, select, wallets } = useWallet();
  const { user } = useAuth();
  
  // State
  const [balance, setBalance] = useState(0);
  const [vaultBalance, setVaultBalance] = useState(globalVaultBalance);
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [playerStats, setPlayerStats] = useState<PlayerStats>({
    gamesPlayed: 47,
    gamesWon: 29,
    winRate: 61.7,
    totalWinnings: 2.45,
    totalLosses: 1.82,
    netProfit: 0.63,
    currentStreak: 3,
    longestStreak: 8,
  });
  const [gameStats] = useState<GameStats>({
    activeMatches: 2,
    totalVolume: 7.5,
    activePlayers: 1247,
    uptime: 99.2,
    biggestWin: 0,
    uniqueGamesPlayed: 0,
  });



  // API Base URL with proper prefix
  const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'https://pv3-backend-api-production.up.railway.app') + '/api/v1';

  // Wallet Authentication
  const authenticateWallet = useCallback(async () => {
    if (!publicKey || !signMessage) {
      throw new Error('Wallet not connected or does not support message signing');
    }

    try {
      setLoading(true);
      
      // Step 1: Get authentication message from backend
      const messageResponse = await fetch(`${API_BASE}/auth/generate-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: publicKey.toString() }),
      });

      if (!messageResponse.ok) {
        throw new Error('Failed to get authentication message');
      }

      const { message } = await messageResponse.json();
      console.log('Got auth message:', message);
      
      // Extract timestamp from the message (backend embeds it)
      const timestampMatch = message.match(/Timestamp: (\d+)/);
      const messageTimestamp = timestampMatch ? parseInt(timestampMatch[1]) : Date.now();
      console.log('Extracted timestamp from message:', messageTimestamp);
      
      // Step 2: Sign the message with wallet
      const messageBytes = new TextEncoder().encode(message);
      const signature = await signMessage(messageBytes);
      
      // Convert signature to base58 (required by backend)
      const signatureBase58 = bs58.encode(signature);
      console.log('Signature created');

      // Step 3: Send signature to get session token
      const authResponse = await fetch(`${API_BASE}/auth/authenticate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: publicKey.toString(),
          signature: signatureBase58,
          message,
          timestamp: messageTimestamp, // Use the timestamp from the message
        }),
      });

      if (!authResponse.ok) {
        const error = await authResponse.json();
        throw new Error(error.message || 'Authentication failed');
      }

      const authData = await authResponse.json();
      console.log('Authentication response:', authData);
      
      // Step 4: Use the real token from the backend response
      // The backend returns the actual session token that we need to use
      const token = authData.token;
      
      if (!token) {
        throw new Error('No token received from server');
      }
      
      setSessionToken(token);
      localStorage.setItem('pv3_token', token);
      localStorage.setItem('pv3_token_expires', authData.expiresAt.toString());
      
      console.log('Authentication successful');
      return authData;
    } catch (error) {
      console.error('Authentication error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [publicKey, signMessage, API_BASE]);

  // Helper function to get auth headers with real session token
  const getAuthHeaders = useCallback(() => {
    if (!sessionToken) {
      throw new Error('No session token available. Please authenticate first.');
    }
    
    console.log('🔍 usePV3 getAuthHeaders - sessionToken found:', !!sessionToken);
    console.log('🔍 usePV3 getAuthHeaders - sessionToken preview:', sessionToken ? sessionToken.substring(0, 20) + '...' : 'null');
    
    return {
      'Authorization': `Bearer ${sessionToken}`,
      'Content-Type': 'application/json',
    };
  }, [sessionToken]);

  // Sync with AuthContext authentication state
  useEffect(() => {
    console.log('👤 usePV3: User changed:', user);
    if (user) {
      console.log('👤 usePV3: User authenticated, syncing token...');
      // User is authenticated via AuthContext, sync the token
      const storedToken = localStorage.getItem('pv3_token');
      const storedExpiry = localStorage.getItem('pv3_token_expires');
      
      if (storedToken && storedExpiry) {
        const expiresAt = parseInt(storedExpiry);
        if (Date.now() < expiresAt) {
          setSessionToken(storedToken);
          console.log('🔄 Synced session token from AuthContext');
        }
      }
    } else {
      console.log('👤 usePV3: User logged out, clearing session token');
      // User logged out from AuthContext
      setSessionToken(null);
    }
  }, [user]);

  // Check for existing session on wallet connection
  useEffect(() => {
    if (publicKey) {
      const storedToken = localStorage.getItem('pv3_token'); // Use same key as AuthContext
      const storedExpiry = localStorage.getItem('pv3_token_expires'); // Use same key as AuthContext
      
      if (storedToken && storedExpiry) {
        const expiresAt = parseInt(storedExpiry);
        if (Date.now() < expiresAt) {
          // Token is still valid
          setSessionToken(storedToken);
          console.log('Restored existing session');
        } else {
          // Token expired, clear it
          localStorage.removeItem('pv3_token');
          localStorage.removeItem('pv3_token_expires');
          console.log('Session expired');
        }
      }
    }
    // Don't clear session token when publicKey is undefined - user might be authenticated via email/authenticator
    // Only clear when wallet is explicitly disconnected (handled by wallet adapter events)
  }, [publicKey]);

  // Periodic check for authentication completion (fixes timing issue)
  useEffect(() => {
    // Run for wallet users OR authenticated users
    if (!publicKey && !user) return;

    const checkForToken = () => {
      const storedToken = localStorage.getItem('pv3_token');
      const storedExpiry = localStorage.getItem('pv3_token_expires');
      
      if (storedToken && storedExpiry && !sessionToken) {
        const expiresAt = parseInt(storedExpiry);
        if (Date.now() < expiresAt) {
          setSessionToken(storedToken);
          console.log('🔄 Synced authentication token from centralized auth');
        }
      }
    };

    // Check only once to prevent infinite loops
    checkForToken();
    
    // No cleanup needed since we're not using intervals
  }, [publicKey, user, sessionToken]); // Keep original dependencies but fix the interval logic

  // Auto-authenticate on wallet connection if no valid session
  useEffect(() => {
    // DISABLED: Prevent multiple components from triggering authentication
    // Only authenticate manually when needed
    // if (publicKey && !sessionToken && signMessage) {
    //   // Auto-authenticate when wallet connects
    //   authenticateWallet().catch(error => {
    //     console.error('Auto-authentication failed:', error);
    //   });
    // }
  }, [publicKey, sessionToken, signMessage]);

  // Add throttling to prevent rate limiting
  const [lastBalanceLoad, setLastBalanceLoad] = useState(0);
  const BALANCE_LOAD_THROTTLE = 2000; // 2 seconds minimum between calls

  // Load wallet and session vault balances
  const loadBalance = useCallback(async (forceRefresh = false) => {
    const now = Date.now();
    if (!forceRefresh && now - lastBalanceLoad < BALANCE_LOAD_THROTTLE) {
      console.log('⏳ loadBalance throttled, skipping call');
      return;
    }
    
    // Check if we have a fresh cached vault balance (skip if force refresh)
    if (!forceRefresh && globalVaultBalance !== -1 && (now - globalVaultBalanceTimestamp) < VAULT_CACHE_DURATION) {
      console.log('💾 Using cached vault balance:', globalVaultBalance);
      setVaultBalance(globalVaultBalance);
      // Still load wallet balance if needed
      if (publicKey) {
        try {
          const walletBalance = await connection.getBalance(publicKey);
          setBalance(walletBalance);
          console.log('✅ Wallet balance loaded:', walletBalance);
        } catch (error) {
          console.error('Error loading wallet balance:', error);
          setBalance(0);
        }
      }
      return;
    }
    
    setLastBalanceLoad(now);

    console.log('💰 loadBalance called');
    console.log('📊 State:', {
      publicKey: publicKey?.toString(),
      sessionToken: !!sessionToken,
      user: !!user,
      userWalletAddress: user?.walletAddress
    });

    // For wallet balance, we need a connected wallet
    if (publicKey) {
      try {
      const walletBalance = await connection.getBalance(publicKey);
      setBalance(walletBalance);
        console.log('✅ Wallet balance loaded:', walletBalance);
      } catch (error) {
        console.error('Error loading wallet balance:', error);
        setBalance(0);
      }
    } else {
      setBalance(0);
    }

    // For vault balance, use authenticated user's wallet address or connected wallet
      if (sessionToken) {
      // Determine which wallet address to use for vault balance
      const vaultWalletAddress = user?.walletAddress || publicKey?.toString();
      console.log('🏦 Vault wallet address:', vaultWalletAddress);
      
      if (vaultWalletAddress) {
        try {
          console.log('🔍 Fetching session vault balance for wallet:', vaultWalletAddress);
          const headers = getAuthHeaders(); // Get headers safely since we checked sessionToken
          const response = await fetch(`${API_BASE}/matches/session-vault/${vaultWalletAddress}`, {
            method: 'GET',
            headers,
          });

          console.log('📡 Session vault API response status:', response.status);

          if (response.ok) {
            const result = await response.json();
            console.log('📊 Session vault API result:', result);
            console.log('💰 Balance from API:', result.balance, 'type:', typeof result.balance);
            
            if (result.balance !== undefined && result.balance !== null) {
              const balance = result.balance;
              setVaultBalance(balance); // Balance in lamports (0 or positive)
              // Update global cache
              globalVaultBalance = balance;
              globalVaultBalanceTimestamp = Date.now();
              console.log('✅ Vault balance set to:', balance, '(cached)');
            } else {
              console.warn('⚠️ API returned undefined/null balance');
              setVaultBalance(-1); // Vault doesn't exist
              globalVaultBalance = -1;
              globalVaultBalanceTimestamp = Date.now();
            }
          } else {
            // Session vault doesn't exist or error occurred
            console.log('❌ Session vault API error, status:', response.status);
            const errorText = await response.text();
            console.log('❌ Error response:', errorText);
            setVaultBalance(-1); // Vault doesn't exist
            globalVaultBalance = -1;
            globalVaultBalanceTimestamp = Date.now();
          }
        } catch (error) {
          console.log('❌ Session vault fetch error:', error);
          setVaultBalance(-1); // Vault doesn't exist
          globalVaultBalance = -1;
          globalVaultBalanceTimestamp = Date.now();
        }
      } else {
        console.log('ℹ️ No wallet address available for vault balance');
        setVaultBalance(-1);
        globalVaultBalance = -1;
        globalVaultBalanceTimestamp = Date.now();
        }
      } else {
        console.log('ℹ️ No session token, setting vault balance to -1');
        setVaultBalance(-1); // Not authenticated
        globalVaultBalance = -1;
        globalVaultBalanceTimestamp = Date.now();
      }
  }, [connection, publicKey, sessionToken, user?.walletAddress, API_BASE, getAuthHeaders, lastBalanceLoad, user]);

  // Load wallet balance only (separate from vault balance)
  const loadWalletBalance = useCallback(async () => {
    console.log('💳 loadWalletBalance called - refreshing wallet balance only');
    
    // Determine which wallet address to use
    let walletAddress: string | null = null;
    if (publicKey) {
      // Wallet user - use connected wallet address
      walletAddress = publicKey.toString();
      console.log('🎯 Using connected wallet address:', walletAddress);
    } else if (user?.walletAddress) {
      // Email/authenticator user - use backend-generated wallet address
      walletAddress = user.walletAddress;
      console.log('🎯 Using authenticated user wallet address:', walletAddress);
    }
    
    if (walletAddress) {
      try {
        const walletPubkey = new PublicKey(walletAddress);
        const walletBalance = await connection.getBalance(walletPubkey);
        setBalance(walletBalance);
        console.log('✅ Wallet balance refreshed:', walletBalance, 'lamports =', (walletBalance / 1e9).toFixed(9), 'SOL');
      } catch (error) {
        console.error('Error loading wallet balance:', error);
        setBalance(0);
      }
    } else {
      console.log('ℹ️ No wallet address available, setting balance to 0');
      setBalance(0);
    }
  }, [connection, publicKey, user?.walletAddress]);

  // Deposit SOL to session vault - USER SIGNS TRANSACTION
  const depositToVault = useCallback(async (amount: number) => {
    console.log('🔍 depositToVault called with amount:', amount);
    console.log('🔍 publicKey:', publicKey?.toString());
    console.log('🔍 sendTransaction exists:', !!sendTransaction);
    console.log('🔍 sessionToken exists:', !!sessionToken);
    console.log('🔍 user.walletAddress:', user?.walletAddress);
    
    // Use authenticated user's wallet address (this should match the connected wallet)
    const walletAddress = user?.walletAddress;
    if (!walletAddress) {
      throw new Error('No wallet address found - please authenticate first');
    }

    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    if (!sessionToken) {
      throw new Error('Please authenticate first');
    }

    setLoading(true);
    try {
      // Step 1: Ensure wallet is properly connected before proceeding
      let currentPublicKey = publicKey;
      let currentSendTransaction = sendTransaction;
      
      if (!currentPublicKey || !currentSendTransaction) {
        console.log('🔍 Wallet not connected, attempting to reconnect...');
        
        // Try to reconnect using wallet adapter
        if (select && wallets.length > 0) {
          // Find the currently selected wallet or default to first available
          const walletName = localStorage.getItem('walletName') || 'Phantom';
          let selectedWallet = wallets.find(w => w.adapter.name === walletName);
          
          // If preferred wallet not found, try Phantom specifically
          if (!selectedWallet) {
            selectedWallet = wallets.find(w => w.adapter.name === 'Phantom');
          }
          
          // If still not found, use first available
          if (!selectedWallet && wallets.length > 0) {
            selectedWallet = wallets[0];
          }
          
          if (selectedWallet) {
            try {
              console.log('🔍 Selecting wallet:', selectedWallet.adapter.name);
              select(selectedWallet.adapter.name);
              
              // Wait a moment for wallet selection to process
              await new Promise(resolve => setTimeout(resolve, 1500));
              
              // Check if wallet is now connected
              if (publicKey && sendTransaction) {
                currentPublicKey = publicKey;
                currentSendTransaction = sendTransaction;
                console.log('✅ Wallet reconnected via adapter');
              } else {
                console.log('⚠️ Wallet selected but not connected, trying to connect...');
                // Force connection after selection
                if (selectedWallet.adapter.connect) {
                  await selectedWallet.adapter.connect();
                  // Wait a bit more for connection
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  
                  if (publicKey && sendTransaction) {
                    currentPublicKey = publicKey;
                    currentSendTransaction = sendTransaction;
                    console.log('✅ Wallet force-connected after selection');
                  }
                }
              }
            } catch (error) {
              console.log('⚠️ Wallet adapter reconnection failed:', error);
            }
          }
        }
        
        // Fallback: Try direct connection to window.solana (Phantom)
        if (!currentPublicKey && typeof window !== 'undefined' && window.solana) {
          try {
            console.log('🔍 Attempting direct Phantom connection...');
            await window.solana.connect();
            console.log('🔍 Direct wallet connection successful');
            
            // Note: For direct connection, we still need the wallet adapter's sendTransaction
            // So this is mainly for debugging - the user should use the reconnect button
            if (window.solana.publicKey) {
              console.log('🔍 Direct wallet publicKey:', window.solana.publicKey.toString());
            }
          } catch (error) {
            console.log('⚠️ Direct wallet connection failed:', error);
          }
        }
      }
      
      // Step 2: Final check - ensure we have what we need
      if (!currentPublicKey || !currentSendTransaction) {
        throw new Error('Wallet not connected or does not support transactions. Please reconnect your wallet and try again.');
      }
      
      // Step 3: Verify wallet address matches authenticated user
      if (currentPublicKey.toString() !== walletAddress) {
        throw new Error(`Wallet address mismatch. Expected: ${walletAddress}, Got: ${currentPublicKey.toString()}. Please connect the correct wallet.`);
      }

      // Step 4: Get transaction from backend
      const response = await fetch(`${API_BASE}/matches/session-vault/deposit`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          userWallet: walletAddress,
          amount: amount
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create deposit transaction');
      }

      const result = await response.json();
      console.log('✅ Got deposit transaction from backend:', result);
      
      // Step 5: Deserialize and sign transaction with user's wallet
      const transaction = Transaction.from(Buffer.from(result.transaction, 'base64'));
      
      // Step 6: Send transaction with user's wallet
      console.log('🔍 Sending transaction with publicKey:', currentPublicKey.toString());
      const signature = await currentSendTransaction(transaction, connection);
      console.log('✅ Transaction sent via wallet adapter:', signature);
      
      // Step 7: Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');
      console.log('✅ Transaction confirmed');
      
      // Step 8: Reload balances to reflect the change
      await loadBalance();
      
      return signature;
    } catch (error) {
      console.error('❌ Deposit error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [publicKey, sendTransaction, connection, sessionToken, API_BASE, getAuthHeaders, loadBalance, user, select, wallets]);

  // Withdraw SOL from session vault via backend
  const withdrawFromVault = useCallback(async (amount: number) => {
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }

    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    if (!sessionToken) {
      throw new Error('Please authenticate first');
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/matches/session-vault/withdraw`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          wallet: publicKey.toString(),
          amount: amount
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to withdraw from session vault');
      }

      const result = await response.json();
      console.log('✅ Withdraw successful:', result);
      
      // Reload balances to reflect the change
      await loadBalance();
      
      return result.transactionId;
    } catch (error) {
      console.error('❌ Withdraw error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [publicKey, sessionToken, API_BASE, getAuthHeaders, loadBalance]);

  // Load live matches from backend API
  const loadMatches = useCallback(async () => {
    try {
      const headers = getAuthHeaders();
      const response = await fetch(`${API_BASE}/matches/available`, { headers });
      
      if (response.ok) {
        const data = await response.json();
        const apiMatches: Match[] = data.matches?.map((match: any) => ({
          id: match.id,
          creator: match.player1?.wallet || match.creator,
          joiner: match.player2?.wallet,
          wagerAmount: match.wager,
          gameType: getGameTypeNumber(match.gameType),
          status: match.status === 'pending' ? 'waiting' : match.status,
          createdAt: new Date(match.createdAt).getTime(),
        })) || [];
        
        setMatches(apiMatches);
      } else {
        // No matches available or API error - show empty list
        setMatches([]);
      }
    } catch (error) {
      console.error('Failed to load matches:', error);
      setMatches([]);
    }
  }, [API_BASE, getAuthHeaders]);

  // Helper function to convert game type string to number
  const getGameTypeNumber = (gameType: string): number => {
    switch (gameType?.toLowerCase()) {
      case 'chess': return 0;
      case 'dice': return 1;
      case 'rockpaperscissors': return 2;
      case 'coinflip': return 3;
      default: return 3; // Default to coinflip
    }
  };

  // Only load balance once when authentication is established
  useEffect(() => {
    // Only load if we don't have a fresh cached balance and we're authenticated
    const now = Date.now();
    const hasFreshCache = globalVaultBalance !== -1 && (now - globalVaultBalanceTimestamp) < VAULT_CACHE_DURATION;
    
    if (sessionToken && !hasFreshCache) {
      console.log('🔄 Session token ready and no fresh cache, loading balance...');
      loadBalance();
      loadMatches();
    } else if (sessionToken && hasFreshCache) {
      console.log('💾 Session token ready with fresh cache, using cached balance');
      setVaultBalance(globalVaultBalance);
    }
    
    if (!sessionToken) {
      setBalance(0);
      setVaultBalance(-1);
      setMatches([]);
    }
  }, [sessionToken, loadBalance, loadMatches]);

  // Game functionality
  const createGame = useCallback(async (gameType: number, wagerAmount: number) => {
    if (!publicKey || !sendTransaction) {
      throw new Error('Wallet not connected');
    }

    if (wagerAmount <= 0) {
      throw new Error('Wager amount must be greater than 0');
    }

    const wagerLamports = wagerAmount * LAMPORTS_PER_SOL;
    
    if (vaultBalance < wagerLamports) {
      throw new Error('Insufficient vault balance');
    }

    setLoading(true);
    try {
      // In production, this would call the smart contract
      // For now, we'll simulate game creation
      const newMatch: Match = {
        id: `match_${Date.now()}`,
        creator: publicKey.toString(),
        wagerAmount,
        gameType,
        status: 'waiting',
        createdAt: Date.now(),
      };

      setMatches(prev => [newMatch, ...prev]);
      
      // Simulate vault balance deduction
      setVaultBalance(prev => prev - wagerLamports);
      
      return newMatch.id;
    } catch (error) {
      console.error('Game creation error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [publicKey, sendTransaction, vaultBalance]);

  // Process game completion - this should be called after each game
  const processGameCompletion = useCallback(async (matchId: string, wagerAmount: number, won: boolean) => {
    if (!publicKey) return;

    try {
      // Calculate platform fee (6.5% of pot)
      const totalPot = wagerAmount * 2;
      const platformFee = totalPot * 0.065;

      // Call backend to process referral rewards
      const headers = getAuthHeaders();
      await fetch(`${API_BASE}/matches/${matchId}/complete`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          winner: won ? publicKey.toString() : 'opponent',
          platformFee,
          wagerAmount,
        }),
      });
    } catch (error) {
      console.error('Error processing game completion:', error);
    }
  }, [publicKey, API_BASE, getAuthHeaders]);

  const playGame = useCallback(async (matchId: string) => {
    const match = matches.find(m => m.id === matchId);
    if (!match) {
      throw new Error('Match not found');
    }

    setLoading(true);
    try {
      let result;
      const totalPot = match.wagerAmount * 2;
      const fee = totalPot * 0.065; // 6.5% platform fee
      const winnings = totalPot - fee;

      // Simple game logic based on game type
      switch (match.gameType) {
        case 1: // COIN_FLIP
          result = Math.random() < 0.5;
          break;
        case 3: // DICE_DUEL
          const playerRoll = Math.floor(Math.random() * 6) + 1;
          const opponentRoll = Math.floor(Math.random() * 6) + 1;
          result = playerRoll > opponentRoll;
          break;
        case 2: // ROCK_PAPER_SCISSORS
          result = Math.random() < 0.5;
          break;
        default:
          result = Math.random() < 0.5;
      }

      // Update match to completed
      setMatches(prev => prev.map(m => 
        m.id === matchId 
          ? { ...m, status: 'completed' as const }
          : m
      ));

      // Update player statistics
      setPlayerStats(prev => {
        const newStats = {
          ...prev,
          gamesPlayed: prev.gamesPlayed + 1,
          gamesWon: result ? prev.gamesWon + 1 : prev.gamesWon,
          currentStreak: result ? prev.currentStreak + 1 : 0,
        };

        if (result) {
          newStats.totalWinnings += winnings;
          newStats.longestStreak = Math.max(newStats.longestStreak, newStats.currentStreak);
        } else {
          newStats.totalLosses += match.wagerAmount;
        }

        newStats.netProfit = newStats.totalWinnings - newStats.totalLosses;
        newStats.winRate = (newStats.gamesWon / newStats.gamesPlayed) * 100;

        return newStats;
      });

      // Process referral rewards after game completion
      await processGameCompletion(matchId, match.wagerAmount, result);

      // If player wins, add winnings to vault
      if (result) {
        setVaultBalance(prev => prev + (winnings * LAMPORTS_PER_SOL));
        return { won: true, amount: winnings, matchId };
      } else {
        return { won: false, amount: 0, matchId };
      }
    } catch (error) {
      console.error('Play game error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [matches, processGameCompletion]);

  const joinGame = useCallback(async (matchId: string) => {
    if (!publicKey || !sendTransaction) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    try {
      const match = matches.find(m => m.id === matchId);
      if (!match) {
        throw new Error('Match not found');
      }

      if (match.status !== 'waiting') {
        throw new Error('Match is not available to join');
      }

      const wagerLamports = match.wagerAmount * LAMPORTS_PER_SOL;
      
      if (vaultBalance < wagerLamports) {
        throw new Error('Insufficient vault balance');
      }

      // Update match status
      setMatches(prev => prev.map(m => 
        m.id === matchId 
          ? { ...m, joiner: publicKey.toString(), status: 'active' as const }
          : m
      ));

      // Deduct wager from vault
      setVaultBalance(prev => prev - wagerLamports);

      // Start the game automatically
      setTimeout(() => playGame(matchId), 1000);

      return matchId;
    } catch (error) {
      console.error('Join game error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [publicKey, sendTransaction, vaultBalance, matches, playGame]);

  const quickPlay = useCallback(async (gameType: number, wagerAmount: number) => {
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    try {
      // Create game and play immediately
      const matchId = await createGame(gameType, wagerAmount);
      
      // Simulate finding an opponent and playing
      setTimeout(async () => {
        try {
          const result = await playGame(matchId);
          
          if (result.won) {
            alert(`🎉 You won ${formatSOL(result.amount * LAMPORTS_PER_SOL)} SOL!`);
          } else {
            alert(`😞 You lost ${wagerAmount} SOL. Better luck next time!`);
          }
        } catch (error) {
          alert(`Game error: ${error}`);
        }
      }, 2000);
      
      return matchId;
    } catch (error) {
      console.error('Quick play error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [publicKey, createGame, playGame]);

  // Load referral stats
  const loadReferralStats = useCallback(async (): Promise<ReferralStats | null> => {
    if (!sessionToken) return null;

    try {
      const headers = getAuthHeaders();
      console.log('API_BASE:', API_BASE);
      console.log('Headers:', headers);
      
      // Get referral code
      console.log('Fetching referral code...');
      const codeResponse = await fetch(`${API_BASE}/referrals/my-code`, { headers });
      console.log('Code response status:', codeResponse.status);
      
      if (!codeResponse.ok) {
        console.error('Failed to fetch referral code:', codeResponse.statusText);
        const walletAddress = user?.walletAddress || publicKey?.toString() || '';
        return {
          referralCode: `REF_${walletAddress.slice(0, 8)}`,
          totalReferred: 0,
          totalEarned: 0,
          pendingRewards: 0,
          weeklyEarnings: 0,
        };
      }
      
      const codeData = await codeResponse.json();
      const walletAddress = user?.walletAddress || publicKey?.toString() || '';
      return {
        referralCode: codeData.referralCode || `REF_${walletAddress.slice(0, 8)}`,
        totalReferred: 0,
        totalEarned: 0,
        pendingRewards: 0,
        weeklyEarnings: 0,
      };
    } catch (error) {
      console.error('Error loading referral stats:', error);
      return {
        referralCode: '',
        totalReferred: 0,
        totalEarned: 0,
        pendingRewards: 0,
        weeklyEarnings: 0,
      };
    }
  }, [sessionToken, user?.walletAddress, publicKey, API_BASE, getAuthHeaders]);

  // Create session vault via backend
  const createSessionVault = useCallback(async () => {
    console.log('🏦 createSessionVault called');
    console.log('🔍 Debug state:', {
      sessionToken: !!sessionToken,
      sessionTokenPreview: sessionToken ? sessionToken.substring(0, 20) + '...' : 'null',
      publicKey: publicKey?.toString(),
      userWalletAddress: user?.walletAddress,
      user: !!user,
      loading
    });

    // Try to get token from localStorage if sessionToken is not set
    let effectiveToken = sessionToken;
    if (!effectiveToken) {
      const storedToken = localStorage.getItem('pv3_token');
      const storedExpiry = localStorage.getItem('pv3_token_expires');
      
      if (storedToken && storedExpiry) {
        const expiresAt = parseInt(storedExpiry);
        if (Date.now() < expiresAt) {
          effectiveToken = storedToken;
          console.log('🔄 Using token from localStorage');
        }
      }
    }

    if (!effectiveToken) {
      const errorMsg = 'No authentication token found. Please log in first.';
      console.error('❌ ' + errorMsg);
      throw new Error(errorMsg);
    }

    const walletAddress = publicKey?.toString() || user?.walletAddress;
    if (!walletAddress) {
      const errorMsg = 'No wallet address available. Please connect wallet or authenticate.';
      console.error('❌ ' + errorMsg);
      throw new Error(errorMsg);
    }

    console.log('🎯 Using wallet address:', walletAddress);
    console.log('🎯 Using token:', effectiveToken.substring(0, 20) + '...');

    setLoading(true);
    try {
      const headers = {
        'Authorization': `Bearer ${effectiveToken}`,
        'Content-Type': 'application/json',
      };
      
      console.log('📡 Making request to:', `${API_BASE}/matches/session-vault/create`);
      console.log('📡 Request headers:', { ...headers, Authorization: 'Bearer [REDACTED]' });
      console.log('📡 Request body:', { wallet: walletAddress });

      const response = await fetch(`${API_BASE}/matches/session-vault/create`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ wallet: walletAddress }),
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Response error text:', errorText);
        
        let errorMessage;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorJson.error || 'Failed to create session vault';
        } catch {
          errorMessage = errorText || 'Failed to create session vault';
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('✅ Create vault success:', result);
      
      await loadBalance();
      return result.vaultAddress;
    } catch (error) {
      console.error('❌ Create vault error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [publicKey, sessionToken, user?.walletAddress, API_BASE, loadBalance, loading, user]);

  // Load user profile
  const loadUserProfile = useCallback(async (): Promise<UserProfile | null> => {
    if (!sessionToken) return null;

    try {
      const headers = getAuthHeaders();
      console.log('Fetching user profile...');
      const response = await fetch(`${API_BASE}/auth/profile`, { headers });
      console.log('Profile response status:', response.status);
      
      if (!response.ok) {
        console.error('Failed to fetch user profile:', response.statusText);
        return null;
      }
      
      const data = await response.json();
      console.log('Profile data:', data);

      return {
        id: data.user.id,
        walletAddress: data.user.wallet,
        username: data.user.username,
        displayName: data.user.displayName,
        avatar: data.user.avatar,
        email: data.user.email,
        bio: data.user.bio,
        showUsername: data.user.showUsername ?? true,
        profileVisibility: data.user.profileVisibility ?? 'public',
        totalEarnings: data.user.totalEarnings || 0,
        totalMatches: data.user.totalMatches || 0,
        wins: data.user.wins || 0,
        losses: data.user.losses || 0,
        winRate: data.user.winRate || 0,
        reputation: data.user.reputation || 1000,
        createdAt: data.user.createdAt,
      };
    } catch (error) {
      console.error('Error loading user profile:', error);
      return null;
    }
  }, [sessionToken, API_BASE, getAuthHeaders]);

  // Claim referral rewards
  const claimReferralRewards = useCallback(async () => {
    if (!sessionToken) {
      throw new Error('Please authenticate first');
    }
    
    const walletAddress = user?.walletAddress || publicKey?.toString();
    if (!walletAddress) {
      throw new Error('No wallet address available');
    }

    setLoading(true);
    try {
      const headers = getAuthHeaders();
      
      const response = await fetch(`${API_BASE}/referrals/claim-sol`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          destinationWallet: walletAddress,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to claim rewards');
      }

      const data = await response.json();
      
      // Reload wallet balance after claim
      await loadBalance();
      
      return {
        success: data.success,
        transactionId: data.transactionId,
        amount: data.amount,
      };
    } catch (error) {
      console.error('Claim rewards error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [sessionToken, user?.walletAddress, publicKey, API_BASE, loadBalance, getAuthHeaders]);

  // Get reward history
  const loadRewardHistory = useCallback(async (): Promise<RewardHistory[]> => {
    if (!sessionToken) return [];

    try {
      const headers = getAuthHeaders();
      console.log('Fetching reward history...');
      const response = await fetch(`${API_BASE}/referrals/sol-history`, { headers });
      console.log('History response status:', response.status);
      
      if (!response.ok) {
        console.error('Failed to fetch reward history:', response.statusText);
        return []; // Return empty array instead of throwing
      }
      
      const data = await response.json();
      console.log('History data:', data);

      return data.history?.map((item: { timestamp: string; amount: number; claimed: boolean }) => ({
        date: new Date(item.timestamp).toISOString().split('T')[0],
        type: 'Referral Rakeback',
        amount: Math.floor(item.amount * LAMPORTS_PER_SOL),
        status: item.claimed ? 'claimed' : 'pending',
      })) || [];
    } catch (error) {
      console.error('Error loading reward history:', error);
      return []; // Return empty array instead of throwing
    }
  }, [sessionToken, API_BASE, getAuthHeaders]);



  return {
    // State
    connected: !!publicKey,
    publicKey,
    balance,
    vaultBalance,
    loading,
    matches,
    gameStats,
    playerStats,
    
    // Actions
    loadBalance,
    forceRefreshBalance: () => loadBalance(true),
    loadWalletBalance,
    depositToVault,
    withdrawFromVault,
    createGame,
    joinGame,
    playGame,
    quickPlay,
    
    // Referral & Rewards
    loadReferralStats,
    loadUserProfile,
    claimReferralRewards,
    loadRewardHistory,
    
    // Utilities
    formatSOL,
    parseSOL,
    
    // Config
    gameTypes: PV3_CONFIG.GAME_TYPES,
    fees: PV3_CONFIG.FEES,
    
    // New actions
    createSessionVault,
  };
};