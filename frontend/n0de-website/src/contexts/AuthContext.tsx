'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  emailVerified?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  login: (token: string, refreshToken: string, sessionId: string, userData?: User | null) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Token refresh interval - refresh 5 minutes before expiry
const TOKEN_REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes
const TOKEN_EXPIRY_TIME = 15 * 60 * 1000; // 15 minutes

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);
  const router = useRouter();
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;
  const refreshAccessTokenRef = useRef<(() => Promise<string | null>) | null>(null);
  const lastFailureRef = useRef<number>(0);
  const circuitBreakerRef = useRef<boolean>(false);

  // Handle client-side hydration
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Refresh access token - must not have dependencies to avoid circular refs
  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    const storedRefreshToken = localStorage.getItem('n0de_refresh_token');
    if (!storedRefreshToken) return null;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_AUTH_URL || 'https://n0de-backend-production-4e34.up.railway.app';
      const response = await fetch(`${apiUrl}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: storedRefreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update tokens and user
        localStorage.setItem('n0de_token', data.accessToken);
        localStorage.setItem('n0de_token_timestamp', Date.now().toString());
        setToken(data.accessToken);
        
        if (data.user) {
          setUser(data.user);
          localStorage.setItem('n0de_user', JSON.stringify(data.user));
        }
        
        // Reset retry count on successful refresh
        retryCountRef.current = 0;
        
        return data.accessToken;
      } else if (response.status === 401) {
        // Refresh token expired or invalid - clear auth
        localStorage.removeItem('n0de_token');
        localStorage.removeItem('n0de_refresh_token');
        localStorage.removeItem('n0de_session');
        localStorage.removeItem('n0de_user');
        localStorage.removeItem('n0de_token_timestamp');
        setUser(null);
        setToken(null);
        setRefreshToken(null);
        window.dispatchEvent(new Event('storage'));
        router.push('/');
        return null;
      }
    } catch (error) {
      console.error('Failed to refresh token:', error);
      
      // Retry with exponential backoff
      if (retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
        await new Promise(resolve => setTimeout(resolve, delay));
        // Recursive call for retry
        return await refreshAccessToken();
      }
      
      // Max retries reached, clear auth
      localStorage.removeItem('n0de_token');
      localStorage.removeItem('n0de_refresh_token');
      localStorage.removeItem('n0de_session');
      localStorage.removeItem('n0de_user');
      localStorage.removeItem('n0de_token_timestamp');
      setUser(null);
      setToken(null);
      setRefreshToken(null);
      return null;
    }
    return null;
  }, [router]);

  // Store refreshAccessToken in ref to break circular dependency
  refreshAccessTokenRef.current = refreshAccessToken;

  // Schedule token refresh
  const scheduleTokenRefresh = useCallback(() => {
    // Clear existing timer
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    // Schedule refresh 5 minutes before token expires
    refreshTimerRef.current = setTimeout(async () => {
      if (refreshAccessTokenRef.current) {
        const newToken = await refreshAccessTokenRef.current();
        if (newToken) {
          // Reschedule next refresh
          scheduleTokenRefresh();
        }
      }
    }, TOKEN_REFRESH_INTERVAL);
  }, []);

  // Fetch user profile with token - with circuit breaker
  const fetchUserProfile = async (authToken: string, retry = true): Promise<any> => {
    // Circuit breaker: if we've had failures recently, don't retry immediately
    const now = Date.now();
    const timeSinceLastFailure = now - lastFailureRef.current;
    
    if (circuitBreakerRef.current && timeSinceLastFailure < 30000) { // 30 second cooldown
      console.log('Circuit breaker active, skipping profile fetch');
      return null;
    }
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_AUTH_URL || 'https://n0de-backend-production-4e34.up.railway.app';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(`${apiUrl}/api/v1/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        localStorage.setItem('n0de_user', JSON.stringify(userData));
        // Reset circuit breaker on success
        circuitBreakerRef.current = false;
        retryCountRef.current = 0;
        return userData;
      } else if (response.status === 401 && retry) {
        // Token expired, try to refresh once
        console.log('Token expired, attempting refresh...');
        const newToken = await refreshAccessToken();
        if (newToken) {
          return fetchUserProfile(newToken, false);
        }
        throw new Error('Authentication failed');
      } else if (response.status >= 500 || response.status === 429) {
        // Server error or rate limit - activate circuit breaker
        console.warn(`Server error ${response.status}, activating circuit breaker`);
        lastFailureRef.current = now;
        circuitBreakerRef.current = true;
        throw new Error(`Server temporarily unavailable: ${response.status}`);
      } else {
        console.error('Profile fetch failed with status:', response.status);
        throw new Error(`Request failed: ${response.status}`);
      }
    } catch (error: any) {
      console.error('Failed to fetch user profile:', error);
      
      // Check if it's a network error that suggests resource exhaustion
      if (error.name === 'AbortError' || error.message?.includes('ERR_INSUFFICIENT_RESOURCES') || error.message?.includes('Failed to fetch')) {
        console.warn('Network/resource error detected, activating circuit breaker');
        lastFailureRef.current = now;
        circuitBreakerRef.current = true;
        
        // Don't retry on resource exhaustion
        return null;
      }
      
      if (retry && retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        const backoffDelay = Math.min(1000 * Math.pow(2, retryCountRef.current), 10000); // Exponential backoff, max 10s
        console.log(`Retrying profile fetch in ${backoffDelay}ms (attempt ${retryCountRef.current}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
        return fetchUserProfile(authToken, false);
      }
      
      // Max retries exceeded or non-retryable error
      console.error('Profile fetch failed after all retries');
      lastFailureRef.current = now;
      circuitBreakerRef.current = true;
      
      // Don't logout on network errors - just return null
      return null;
    }
  };

  // Login function
  const login = async (authToken: string, refreshTokenStr: string, sessionId: string, userData?: User | null) => {
    try {
      console.log('Login called with:', { 
        hasToken: !!authToken, 
        hasRefresh: !!refreshTokenStr, 
        hasSession: !!sessionId,
        hasUserData: !!userData 
      });
      
      localStorage.setItem('n0de_token', authToken);
      localStorage.setItem('n0de_refresh_token', refreshTokenStr);
      localStorage.setItem('n0de_session', sessionId);
      localStorage.setItem('n0de_token_timestamp', Date.now().toString());
      
      setToken(authToken);
      setRefreshToken(refreshTokenStr);
      
      // If user data provided (from OAuth), use it immediately
      if (userData) {
        setUser(userData);
        localStorage.setItem('n0de_user', JSON.stringify(userData));
      }
      
      // Try to fetch fresh profile, but don't fail login if it's unavailable
      try {
        const freshProfile = await fetchUserProfile(authToken);
        if (!freshProfile && userData) {
          // Fallback to OAuth data if profile fetch fails
          setUser(userData);
          localStorage.setItem('n0de_user', JSON.stringify(userData));
        }
      } catch (profileError) {
        console.error('Failed to fetch profile during login:', profileError);
        // Continue with OAuth userData if available, don't block login
        if (userData) {
          setUser(userData);
          localStorage.setItem('n0de_user', JSON.stringify(userData));
        }
      }
      
      // Schedule token refresh
      scheduleTokenRefresh();
      
      // Trigger storage event for other tabs
      window.dispatchEvent(new Event('storage'));
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  // Logout function
  const logout = useCallback(() => {
    // Clear refresh timer
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    
    // Clear all auth data
    localStorage.removeItem('n0de_token');
    localStorage.removeItem('n0de_refresh_token');
    localStorage.removeItem('n0de_session');
    localStorage.removeItem('n0de_user');
    localStorage.removeItem('n0de_token_timestamp');
    
    setUser(null);
    setToken(null);
    setRefreshToken(null);
    
    // Reset retry count
    retryCountRef.current = 0;
    
    window.dispatchEvent(new Event('storage'));
    router.push('/');
  }, [router]);

  // Update user data
  const updateUser = (userData: User) => {
    setUser(userData);
    localStorage.setItem('n0de_user', JSON.stringify(userData));
  };

  // Check for existing session on mount (only after hydration)
  useEffect(() => {
    if (!isHydrated) return; // Wait for client-side hydration
    
    const initAuth = async () => {
      const storedToken = localStorage.getItem('n0de_token');
      const storedRefreshToken = localStorage.getItem('n0de_refresh_token');
      const storedUser = localStorage.getItem('n0de_user');
      const tokenTimestamp = localStorage.getItem('n0de_token_timestamp');
      
      if (storedRefreshToken) {
        setRefreshToken(storedRefreshToken);
        
        // Check if access token exists and is still valid
        if (storedToken && tokenTimestamp) {
          const tokenAge = Date.now() - parseInt(tokenTimestamp);
          
          if (tokenAge < TOKEN_EXPIRY_TIME - 60000) {
            // Token still valid for at least 1 minute
            setToken(storedToken);
            
            if (storedUser) {
              setUser(JSON.parse(storedUser));
            }
            
            // Schedule refresh
            scheduleTokenRefresh();
            
            // Verify token in background - don't fail if network is slow
            fetchUserProfile(storedToken).catch((error) => {
              console.error('Failed to verify session in background:', error);
              // Don't logout - user data is already loaded from localStorage
            });
          } else {
            // Token expired or about to expire, refresh immediately
            const newToken = await refreshAccessToken();
            if (newToken) {
              setToken(newToken);
              if (storedUser) {
                setUser(JSON.parse(storedUser));
              }
              await fetchUserProfile(newToken);
            }
          }
        } else {
          // No access token but have refresh token, get new access token
          const newToken = await refreshAccessToken();
          if (newToken) {
            setToken(newToken);
            await fetchUserProfile(newToken);
          }
        }
      }
      
      setIsLoading(false);
    };

    initAuth();

    // Listen for auth changes from other tabs
    const handleStorageChange = () => {
      const newToken = localStorage.getItem('n0de_token');
      const newRefreshToken = localStorage.getItem('n0de_refresh_token');
      const newUser = localStorage.getItem('n0de_user');
      
      if (newToken !== token) {
        setToken(newToken);
        setRefreshToken(newRefreshToken);
        
        if (newUser) {
          setUser(JSON.parse(newUser));
        } else {
          setUser(null);
        }
        
        // Update refresh timer
        if (newToken) {
          scheduleTokenRefresh();
        } else if (refreshTimerRef.current) {
          clearTimeout(refreshTimerRef.current);
          refreshTimerRef.current = null;
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Cleanup on unmount
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, [isHydrated, scheduleTokenRefresh, refreshAccessToken, fetchUserProfile, router, token]);

  return (
    <AuthContext.Provider value={{ user, token, refreshToken, isLoading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};