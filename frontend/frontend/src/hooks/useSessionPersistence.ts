import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface SessionPersistenceOptions {
  key: string;
  defaultValue?: any;
  expireAfter?: number; // milliseconds
  syncAcrossTabs?: boolean;
}

interface StoredData<T> {
  value: T;
  timestamp: number;
  userId?: string;
}

export function useSessionPersistence<T>(options: SessionPersistenceOptions) {
  const { key, defaultValue, expireAfter, syncAcrossTabs = true } = options;
  const { user, isSessionValid } = useAuth();
  const [value, setValue] = useState<T>(defaultValue);
  const [isLoading, setIsLoading] = useState(true);
  const hasInitialized = useRef(false);

  // Create user-specific key
  const storageKey = user?.id ? `${key}_${user.id}` : key;

  // Load persisted data
  const loadPersistedData = useCallback(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) {
        setValue(defaultValue);
        setIsLoading(false);
        return;
      }

      const parsedData: StoredData<T> = JSON.parse(stored);
      
      // Check if data has expired
      if (expireAfter && Date.now() - parsedData.timestamp > expireAfter) {
        localStorage.removeItem(storageKey);
        setValue(defaultValue);
        setIsLoading(false);
        return;
      }

      // Check if data belongs to current user
      if (user?.id && parsedData.userId && parsedData.userId !== user.id) {
        setValue(defaultValue);
        setIsLoading(false);
        return;
      }

      setValue(parsedData.value);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load persisted data:', error);
      setValue(defaultValue);
      setIsLoading(false);
    }
  }, [storageKey, defaultValue, expireAfter, user?.id]);

  // Save data to localStorage
  const persistData = useCallback((newValue: T) => {
    try {
      const dataToStore: StoredData<T> = {
        value: newValue,
        timestamp: Date.now(),
        userId: user?.id,
      };
      
      localStorage.setItem(storageKey, JSON.stringify(dataToStore));
    } catch (error) {
      console.error('Failed to persist data:', error);
    }
  }, [storageKey, user?.id]);

  // Update value and persist
  const updateValue = useCallback((newValue: T | ((prev: T) => T)) => {
    setValue(prevValue => {
      const finalValue = typeof newValue === 'function' 
        ? (newValue as (prev: T) => T)(prevValue)
        : newValue;
      
      persistData(finalValue);
      return finalValue;
    });
  }, [persistData]);

  // Clear persisted data
  const clearPersistedData = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      setValue(defaultValue);
    } catch (error) {
      console.error('Failed to clear persisted data:', error);
    }
  }, [storageKey, defaultValue]);

  // Load data on mount and when user changes
  useEffect(() => {
    if (!hasInitialized.current || (user?.id && isSessionValid)) {
      loadPersistedData();
      hasInitialized.current = true;
    }
  }, [loadPersistedData, user?.id, isSessionValid]);

  // Handle cross-tab synchronization
  useEffect(() => {
    if (!syncAcrossTabs) return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === storageKey && e.newValue) {
        try {
          const parsedData: StoredData<T> = JSON.parse(e.newValue);
          
          // Check if data belongs to current user
          if (user?.id && parsedData.userId && parsedData.userId !== user.id) {
            return;
          }

          setValue(parsedData.value);
        } catch (error) {
          console.error('Failed to sync data across tabs:', error);
        }
      } else if (e.key === storageKey && !e.newValue) {
        // Data was cleared in another tab
        setValue(defaultValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [storageKey, syncAcrossTabs, user?.id, defaultValue]);

  // Clear data when user logs out
  useEffect(() => {
    if (!isSessionValid && hasInitialized.current) {
      clearPersistedData();
    }
  }, [isSessionValid, clearPersistedData]);

  return {
    value,
    setValue: updateValue,
    clearValue: clearPersistedData,
    isLoading,
    isPersistedDataAvailable: !isLoading && value !== defaultValue,
  };
}

// Game state persistence hook
export function useGameStatePersistence(gameType: string) {
  return useSessionPersistence({
    key: `game_state_${gameType}`,
    defaultValue: null,
    expireAfter: 24 * 60 * 60 * 1000, // 24 hours
    syncAcrossTabs: true,
  });
}

// Navigation state persistence hook
export function useNavigationPersistence() {
  return useSessionPersistence({
    key: 'navigation_state',
    defaultValue: {
      lastVisitedPage: '/',
      sidebarState: false,
      preferredGameFilters: {},
    },
    expireAfter: 7 * 24 * 60 * 60 * 1000, // 7 days
    syncAcrossTabs: true,
  });
}

// User preferences persistence hook
export function useUserPreferencesPersistence() {
  return useSessionPersistence({
    key: 'user_preferences',
    defaultValue: {
      theme: 'dark',
      soundEnabled: true,
      animationsEnabled: true,
      autoJoinMatches: false,
      preferredWagerAmounts: [0.1, 0.5, 1.0],
    },
    syncAcrossTabs: true,
  });
} 