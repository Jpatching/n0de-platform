'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';

interface User {
  id: string;
  email?: string;
  username?: string;
  displayName?: string;
  authMethod: 'email' | 'authenticator' | 'wallet';
  profileVisibility: string;
  showUsername: boolean;
  walletAddress?: string;
  usernameChanged?: boolean;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (credentials: any) => Promise<void>;
  signup: (userData: any) => Promise<any>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUsername: (newUsername: string) => Promise<void>;
  isSessionValid: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

// Use backend API URL with correct prefix
const API_BASE = `${process.env.NEXT_PUBLIC_API_URL || 'https://pv3-backend-api-production.up.railway.app'}/api/v1`;

// Session configuration
const SESSION_CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes
const TOKEN_REFRESH_THRESHOLD = 10 * 60 * 1000; // Refresh when 10 minutes left
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000; // 1 second

function handleError(error: unknown, defaultMessage: string): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return defaultMessage;
}

// Utility function for retrying failed requests
async function retryRequest(fn: () => Promise<any>, maxAttempts: number = MAX_RETRY_ATTEMPTS): Promise<any> {
  let lastError;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
      }
    }
  }
  
  throw lastError;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSessionValid, setIsSessionValid] = useState(false);
  
  // Refs for managing intervals and preventing multiple simultaneous calls
  const sessionCheckInterval = useRef<NodeJS.Timeout | null>(null);
  const isCheckingAuth = useRef(false);
  const isRefreshingToken = useRef(false);

  // Enhanced token management
  const getStoredToken = useCallback(() => {
    try {
      const token = localStorage.getItem('pv3_token');
      const expiresAt = localStorage.getItem('pv3_token_expires');
      
      if (!token || !expiresAt) return null;
      
      return {
        token,
        expiresAt: parseInt(expiresAt),
        isExpired: Date.now() > parseInt(expiresAt),
        needsRefresh: Date.now() > (parseInt(expiresAt) - TOKEN_REFRESH_THRESHOLD)
      };
    } catch (error) {
      console.error('Error reading stored token:', error);
      return null;
    }
  }, []);

  const clearStoredAuth = useCallback(() => {
    try {
      localStorage.removeItem('pv3_token');
      localStorage.removeItem('pv3_token_expires');
      localStorage.removeItem('pv3_user_data');
      setUser(null);
      setIsSessionValid(false);
    } catch (error) {
      console.error('Error clearing stored auth:', error);
    }
  }, []);

  const storeAuthData = useCallback((token: string, expiresAt: number, userData: User) => {
    try {
      localStorage.setItem('pv3_token', token);
      localStorage.setItem('pv3_token_expires', expiresAt.toString());
      localStorage.setItem('pv3_user_data', JSON.stringify(userData));
      setUser(userData);
      setIsSessionValid(true);
    } catch (error) {
      console.error('Error storing auth data:', error);
    }
  }, []);

  // Enhanced token refresh function
  const refreshToken = useCallback(async (): Promise<boolean> => {
    if (isRefreshingToken.current) return false;
    
    try {
      isRefreshingToken.current = true;
      const tokenData = getStoredToken();
      
      if (!tokenData || tokenData.isExpired) {
        clearStoredAuth();
        return false;
      }

      // Since backend doesn't have dedicated refresh endpoint, 
      // we'll validate the current token and extend session if valid
      const response = await retryRequest(async () => {
        return fetch(`${API_BASE}/auth/profile`, {
          headers: {
            'Authorization': `Bearer ${tokenData.token}`,
          },
        });
      });

      if (response.ok) {
        const data = await response.json();
        const userData = {
          ...data.user,
          walletAddress: data.user.wallet
        };
        
        // Extend token expiry by another hour if it's still valid
        const newExpiry = Date.now() + (60 * 60 * 1000); // 1 hour from now
        storeAuthData(tokenData.token, newExpiry, userData);
        console.log('🔄 Session extended successfully');
        return true;
      } else {
        console.warn('Token validation failed, clearing auth');
        clearStoredAuth();
        return false;
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      clearStoredAuth();
      return false;
    } finally {
      isRefreshingToken.current = false;
    }
  }, [getStoredToken, clearStoredAuth, storeAuthData]);

  // Enhanced auth status check
  const checkAuthStatus = useCallback(async (skipLoading = false) => {
    if (isCheckingAuth.current) return;
    
    try {
      isCheckingAuth.current = true;
      if (!skipLoading) setLoading(true);
      
      const tokenData = getStoredToken();
      
      if (!tokenData) {
        setIsSessionValid(false);
        return;
      }

      // If token is expired, try to refresh
      if (tokenData.isExpired) {
        const refreshed = await refreshToken();
        if (!refreshed) return;
        return; // refreshToken already updates the state
      }

      // If token needs refresh soon, refresh it proactively
      if (tokenData.needsRefresh) {
        refreshToken(); // Don't await, let it happen in background
      }

      // Validate current token with backend
      const response = await retryRequest(async () => {
        return fetch(`${API_BASE}/auth/profile`, {
          headers: {
            'Authorization': `Bearer ${tokenData.token}`,
          },
        });
      });

      if (response.ok) {
        const data = await response.json();
        const userData = {
          ...data.user,
          walletAddress: data.user.wallet
        };
        
        // Update stored user data if it changed
        const storedUserData = localStorage.getItem('pv3_user_data');
        if (storedUserData !== JSON.stringify(userData)) {
          localStorage.setItem('pv3_user_data', JSON.stringify(userData));
        }
        
        setUser(userData);
        setIsSessionValid(true);
      } else {
        console.warn('Token validation failed, attempting refresh');
        const refreshed = await refreshToken();
        if (!refreshed) {
          clearStoredAuth();
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      // Try to load user from stored data as fallback
      try {
        const storedUserData = localStorage.getItem('pv3_user_data');
        if (storedUserData) {
          setUser(JSON.parse(storedUserData));
          setIsSessionValid(true);
          console.log('📱 Loaded user from stored data (offline mode)');
        }
      } catch (parseError) {
        console.error('Failed to parse stored user data:', parseError);
        clearStoredAuth();
      }
    } finally {
      isCheckingAuth.current = false;
      if (!skipLoading) setLoading(false);
    }
  }, [getStoredToken, refreshToken, clearStoredAuth]);

  // Set up background session validation
  const startSessionMonitoring = useCallback(() => {
    if (sessionCheckInterval.current) {
      clearInterval(sessionCheckInterval.current);
    }
    
    sessionCheckInterval.current = setInterval(() => {
      if (user && isSessionValid) {
        checkAuthStatus(true); // Skip loading for background checks
      }
    }, SESSION_CHECK_INTERVAL);
  }, [user, isSessionValid, checkAuthStatus]);

  const stopSessionMonitoring = useCallback(() => {
    if (sessionCheckInterval.current) {
      clearInterval(sessionCheckInterval.current);
      sessionCheckInterval.current = null;
    }
  }, []);

  // Handle visibility change to check auth when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user && isSessionValid) {
        checkAuthStatus(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, isSessionValid, checkAuthStatus]);

  // Handle storage changes (for cross-tab synchronization)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'pv3_token' || e.key === 'pv3_user_data') {
        if (!e.newValue) {
          // Token was removed in another tab
          setUser(null);
          setIsSessionValid(false);
          stopSessionMonitoring();
        } else if (e.key === 'pv3_user_data' && e.newValue) {
          // User data updated in another tab
          try {
            const userData = JSON.parse(e.newValue);
            setUser(userData);
            setIsSessionValid(true);
          } catch (error) {
            console.error('Failed to parse user data from storage event:', error);
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [stopSessionMonitoring]);

  // Initial auth check and session monitoring setup
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  useEffect(() => {
    if (user && isSessionValid) {
      startSessionMonitoring();
    } else {
      stopSessionMonitoring();
    }

    return () => stopSessionMonitoring();
  }, [user, isSessionValid, startSessionMonitoring, stopSessionMonitoring]);

  // Enhanced login function
  const login = async (credentials: any) => {
    try {
      setLoading(true);
      setError(null);

      let response;
      
      if (credentials.authMethod === 'wallet') {
        console.log('🔐 Authenticating with wallet via backend...');
        
        const messageResponse = await retryRequest(async () => {
          return fetch(`${API_BASE}/auth/generate-message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wallet: credentials.walletAddress }),
          });
        });

        if (!messageResponse.ok) {
          throw new Error('Failed to get authentication message');
        }

        const { message } = await messageResponse.json();
        
        response = await retryRequest(async () => {
          return fetch(`${API_BASE}/auth/authenticate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              wallet: credentials.walletAddress,
              signature: credentials.signature,
              message: credentials.message,
              timestamp: credentials.timestamp || Date.now(),
              referralCode: credentials.referralCode,
            }),
          });
        });
      } else if (credentials.authMethod === 'email') {
        response = await retryRequest(async () => {
          return fetch(`${API_BASE}/auth/email/signin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });
        });
      } else if (credentials.authMethod === 'authenticator') {
        response = await retryRequest(async () => {
          return fetch(`${API_BASE}/auth/authenticator/signin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: credentials.username,
              totpCode: credentials.totpCode,
            }),
          });
        });
      } else {
        throw new Error('Invalid authentication method');
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Login failed');
      }

      const data = await response.json();
      const userData = {
        ...data.user,
        walletAddress: data.user.wallet
      };
      
      storeAuthData(data.token, data.expiresAt, userData);
      console.log('✅ Login successful, session established');
      
    } catch (err: unknown) {
      const errorMessage = handleError(err, 'Login failed');
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const signup = async (userData: any) => {
    try {
      setLoading(true);
      setError(null);

      let response;

      if (userData.authMethod === 'email') {
        response = await retryRequest(async () => {
          return fetch(`${API_BASE}/auth/email/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: userData.email,
              password: userData.password,
              username: userData.username,
              displayName: userData.displayName,
              referralCode: userData.referralCode,
            }),
          });
        });
      } else if (userData.authMethod === 'authenticator') {
        response = await retryRequest(async () => {
          return fetch(`${API_BASE}/auth/authenticator/setup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: userData.username,
              displayName: userData.displayName,
              referralCode: userData.referralCode,
            }),
          });
        });
      } else if (userData.authMethod === 'wallet') {
        throw new Error('Wallet signup not yet implemented in backend. Please contact support.');
      } else {
        throw new Error('Invalid authentication method');
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Signup failed');
      }

      const data = await response.json();
      
      // For authenticator setup, return the setup data instead of logging in
      if (userData.authMethod === 'authenticator') {
        return data;
      }
      
      // For email signup, user is automatically logged in
      const userToStore = {
        ...data.user,
        walletAddress: data.user.wallet
      };

      storeAuthData(data.token, data.expiresAt, userToStore);

      // Log referral success if applicable
      if (userData.referralCode && data.referralProcessed) {
        console.log(`🎯 VIRAL SIGNUP SUCCESS: User signed up with referral code ${userData.referralCode}!`);
      }

      console.log('✅ Signup successful, session established');
      return data;
    } catch (error) {
      console.error('Signup error:', error);
      const errorMessage = handleError(error, 'Signup failed');
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      
      const tokenData = getStoredToken();
      
      if (tokenData && !tokenData.isExpired) {
        // Try to call backend logout endpoint
        try {
          await retryRequest(async () => {
            return fetch(`${API_BASE}/auth/logout`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${tokenData.token}`,
                'Content-Type': 'application/json',
              },
            });
          });
          console.log('✅ Backend logout successful');
        } catch (err: unknown) {
          console.warn('Backend logout failed (continuing with local logout):', handleError(err, 'Backend logout failed'));
        }
      }
    } catch (err: unknown) {
      console.error('Logout error:', handleError(err, 'Logout failed'));
    } finally {
      // Always clear client-side state
      clearStoredAuth();
      stopSessionMonitoring();
      setLoading(false);
      console.log('🚪 User logged out, session cleared');
    }
  };

  const refreshUser = async () => {
    await checkAuthStatus(true); // Skip loading for manual refresh
  };

  const updateUsername = async (newUsername: string) => {
    try {
      setLoading(true);
      setError(null);

      const tokenData = getStoredToken();
      if (!tokenData || tokenData.isExpired) {
        throw new Error('Not authenticated');
      }

      const response = await retryRequest(async () => {
        return fetch(`${API_BASE}/auth/username`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${tokenData.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username: newUsername }),
        });
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Failed to update username');
      }

      const data = await response.json();
      const updatedUser = {
        ...data.user,
        walletAddress: data.user.wallet
      };
      
      // Update stored user data
      localStorage.setItem('pv3_user_data', JSON.stringify(updatedUser));
      setUser(updatedUser);
      
      console.log('✅ Username updated successfully');

    } catch (err: unknown) {
      const errorMessage = handleError(err, 'Failed to update username');
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    signup,
    logout,
    refreshUser,
    updateUsername,
    isSessionValid,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
} 