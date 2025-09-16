'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ApiConfig } from '@/lib/api-config';

interface User {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  emailVerified?: boolean;
  role?: "USER" | "ADMIN" | "SUPER_ADMIN" | "ENTERPRISE";
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
  const _maxRetries = 3;
  const refreshAccessTokenRef = useRef<(() => Promise<string | null>) | null>(null);

  // Handle client-side hydration
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Refresh access token - simplified without retries to prevent loops
  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    if (typeof window === 'undefined') return null;
    const storedRefreshToken = localStorage.getItem('n0de_refresh_token');
    if (!storedRefreshToken) return null;

    try {
      // Use centralized API configuration - FIXED: No more URL duplication
      const response = await fetch(ApiConfig.buildApiUrl('auth/refresh'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ refreshToken: storedRefreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update tokens and user
        if (typeof window !== 'undefined') {
          localStorage.setItem('n0de_token', data.accessToken);
          localStorage.setItem('n0de_token_timestamp', Date.now().toString());
        }
        setToken(data.accessToken);
        
        if (data.user) {
          setUser(data.user);
          if (typeof window !== 'undefined') {
            localStorage.setItem('n0de_user', JSON.stringify(data.user));
          }
        }
        
        return data.accessToken;
      } else {
        // Any error with refresh token - clear auth (no retries)
        console.warn('Refresh token failed, clearing auth');
        // Don't call logout here to prevent circular dependency
        return null;
      }
    } catch (error) {
      console.error('Failed to refresh token:', error);
      // Network error - return null instead of clearing auth immediately
      return null;
    }
  }, []); // Remove router dependency to prevent circular reference

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

  // Fetch user profile with token - simplified without retries
  const fetchUserProfile = async (authToken: string): Promise<User | null> => {
    if (!authToken) return null;
    try {
      // Use centralized API configuration - FIXED: No more URL duplication  
      const response = await fetch(ApiConfig.buildApiUrl('auth/profile'), {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        if (typeof window !== 'undefined') {
          localStorage.setItem('n0de_user', JSON.stringify(userData));
        }
        return userData;
      } else {
        console.warn('Profile fetch failed with status:', response.status);
        // Don't logout automatically - might be temporary issue
        throw new Error(`Profile fetch failed: ${response.status}`);
      }
    } catch (error) {
      // Detect CORS issues and provide better error messaging
      if (error instanceof Error && (error.message?.includes('CORS') || error.message?.includes('Access-Control'))) {
        console.error('CORS error detected during profile fetch:', error);
        throw new Error('CORS configuration issue - please contact support');
      }
      console.error('Failed to fetch user profile:', error);
      throw error;
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
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('n0de_token', authToken);
        localStorage.setItem('n0de_refresh_token', refreshTokenStr);
        localStorage.setItem('n0de_session', sessionId);
        localStorage.setItem('n0de_token_timestamp', Date.now().toString());
      }
      
      setToken(authToken);
      setRefreshToken(refreshTokenStr);
      
      let finalUserData = userData;
      
      // If user data provided (from OAuth), use it immediately
      if (userData) {
        setUser(userData);
        if (typeof window !== 'undefined') {
          localStorage.setItem('n0de_user', JSON.stringify(userData));
        }
      }
      
      // Always try to fetch fresh profile to ensure we have complete data
      try {
        const profileData = await fetchUserProfile(authToken);
        finalUserData = profileData || userData;
      } catch (profileError) {
        console.error('Failed to fetch profile during login:', profileError);
        // If we have userData from OAuth, continue with that
        if (!userData) {
          throw profileError;
        }
      }
      
      // Ensure user state is set before resolving
      if (finalUserData) {
        setUser(finalUserData);
        console.log('User avatar URL:', finalUserData.avatar);
        if (typeof window !== 'undefined') {
          localStorage.setItem('n0de_user', JSON.stringify(finalUserData));
        }
      }
      
      // Schedule token refresh
      scheduleTokenRefresh();
      
      // Trigger storage event for other tabs
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('storage'));
      }
      
      console.log('Login completed successfully, user state updated');
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
    
    // Clear all auth data (only on client)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('n0de_token');
      localStorage.removeItem('n0de_refresh_token');
      localStorage.removeItem('n0de_session');
      localStorage.removeItem('n0de_user');
      localStorage.removeItem('n0de_token_timestamp');
      window.dispatchEvent(new Event('storage'));
    }
    
    setUser(null);
    setToken(null);
    setRefreshToken(null);
    
    // Reset retry count
    retryCountRef.current = 0;
    
    // Only redirect if we're on the client and not already on home page or auth callback
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      if (currentPath !== '/' && currentPath !== '/auth/callback') {
        router.push('/');
      }
    }
  }, [router]);

  // Update user data
  const updateUser = (userData: User) => {
    setUser(userData);
    if (typeof window !== 'undefined') {
      localStorage.setItem('n0de_user', JSON.stringify(userData));
    }
  };

  // Check for existing session on mount - only after hydration
  useEffect(() => {
    const initAuth = async () => {
      if (typeof window === 'undefined' || !isHydrated) {
        setIsLoading(false);
        return;
      }

      // Skip initialization if we're in the OAuth callback process
      if (window.location.pathname === '/auth/callback') {
        setIsLoading(false);
        return;
      }

      console.log('🔐 AuthContext: Initializing authentication...');
      
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
              try {
                setUser(JSON.parse(storedUser));
              } catch (_e) {
                console.warn('Failed to parse stored user data, clearing...');
                localStorage.removeItem('n0de_user');
              }
            }
            
            // Schedule refresh
            scheduleTokenRefresh();
            
            // Simple background verification - no retries
            fetchUserProfile(storedToken).catch(() => {
              // Silently fail background verification
            });
          } else {
            // Token expired, try refresh once
            try {
              const newToken = await refreshAccessToken();
              if (newToken) {
                setToken(newToken);
                if (storedUser) {
                  try {
                    setUser(JSON.parse(storedUser));
                  } catch (_e) {
                    localStorage.removeItem('n0de_user');
                  }
                }
                await fetchUserProfile(newToken);
              }
            } catch (_e) {
              // Refresh failed, clear auth
              logout();
            }
          }
        } else {
          // No access token but have refresh token, try once
          try {
            const newToken = await refreshAccessToken();
            if (newToken) {
              setToken(newToken);
              await fetchUserProfile(newToken);
            }
          } catch (_e) {
            // Clear invalid refresh token
            logout();
          }
        }
      }
      
      setIsLoading(false);
    };

    initAuth();

    // Listen for auth changes from other tabs
    const handleStorageChange = () => {
      if (typeof window === 'undefined') return;
      
      const newToken = localStorage.getItem('n0de_token');
      const newRefreshToken = localStorage.getItem('n0de_refresh_token');
      const newUser = localStorage.getItem('n0de_user');
      
      if (newToken !== token) {
        setToken(newToken);
        setRefreshToken(newRefreshToken);
        
        if (newUser) {
          try {
            setUser(JSON.parse(newUser));
          } catch (_e) {
            setUser(null);
          }
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

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange);
    }
    
    // Cleanup on unmount
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorageChange);
      }
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
    
    // Only run after hydration is complete
    if (isHydrated) {
      initAuth();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps  
  }, [isHydrated]); // Run when hydration is complete

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