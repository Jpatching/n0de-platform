'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  keyPreview: string;
  status: 'active' | 'inactive' | 'rate_limited';
  network: 'mainnet' | 'devnet' | 'testnet';
  created: string;
  lastUsed: string;
  requests: number;
  rateLimit: number;
  permissions: string[];
  expiresAt?: string;
  totalRequests?: number;
}

export interface CreateApiKeyRequest {
  name: string;
  permissions: string[];
  rateLimit?: number;
  network?: string;
  expiresAt?: string;
}

export interface UpdateApiKeyRequest {
  name?: string;
  permissions?: string[];
  rateLimit?: number;
  isActive?: boolean;
}

export interface UseApiKeysReturn {
  // State
  apiKeys: ApiKey[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchApiKeys: () => Promise<void>;
  createApiKey: (data: CreateApiKeyRequest) => Promise<ApiKey | null>;
  updateApiKey: (keyId: string, data: UpdateApiKeyRequest) => Promise<boolean>;
  deleteApiKey: (keyId: string) => Promise<boolean>;
  regenerateApiKey: (keyId: string) => Promise<string | null>;
  
  // Utilities
  getApiKeyById: (keyId: string) => ApiKey | undefined;
  getActiveKeys: () => ApiKey[];
  getTotalRequests: () => number;
}

export function useApiKeys(): UseApiKeysReturn {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all API keys
  const fetchApiKeys = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await api.get<ApiKey[]>('/api-keys');
      
      // Transform backend data to match frontend interface
      const transformedKeys = (response || []).map(key => ({
        ...key,
        key: key.key || key.keyPreview + '...', // Handle key display
        created: formatDate(key.created),
        lastUsed: key.lastUsedAt ? formatDate(key.lastUsedAt) : 'Never',
        requests: key.totalRequests || 0,
      }));
      
      setApiKeys(transformedKeys);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch API keys';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create new API key
  const createApiKey = useCallback(async (data: CreateApiKeyRequest): Promise<ApiKey | null> => {
    try {
      setError(null);
      
      const response = await api.post<ApiKey>('/api-keys', data);
      
      if (response) {
        const newKey = {
          ...response,
          created: formatDate(response.created),
          lastUsed: 'Never',
          requests: 0,
        };
        
        setApiKeys(prev => [...prev, newKey]);
        toast.success(`API key "${data.name}" created successfully`);
        return newKey;
      }
      
      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create API key';
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    }
  }, []);

  // Update API key
  const updateApiKey = useCallback(async (keyId: string, data: UpdateApiKeyRequest): Promise<boolean> => {
    try {
      setError(null);
      
      const response = await api.put<ApiKey>(`/api-keys/${keyId}`, data);
      
      if (response) {
        setApiKeys(prev => prev.map(key => 
          key.id === keyId 
            ? { ...key, ...response, lastUsed: key.lastUsed } // Preserve lastUsed formatting
            : key
        ));
        
        toast.success('API key updated successfully');
        return true;
      }
      
      return false;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update API key';
      setError(errorMessage);
      toast.error(errorMessage);
      return false;
    }
  }, []);

  // Delete API key
  const deleteApiKey = useCallback(async (keyId: string): Promise<boolean> => {
    try {
      setError(null);
      
      const keyToDelete = apiKeys.find(key => key.id === keyId);
      
      await api.delete(`/api-keys/${keyId}`);
      
      setApiKeys(prev => prev.filter(key => key.id !== keyId));
      
      if (keyToDelete) {
        toast.success(`API key "${keyToDelete.name}" deleted successfully`);
      }
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete API key';
      setError(errorMessage);
      toast.error(errorMessage);
      return false;
    }
  }, [apiKeys]);

  // Regenerate API key
  const regenerateApiKey = useCallback(async (keyId: string): Promise<string | null> => {
    try {
      setError(null);
      
      const response = await api.post<{ key: string }>(`/api-keys/${keyId}/regenerate`);
      
      if (response?.key) {
        setApiKeys(prev => prev.map(key => 
          key.id === keyId 
            ? { ...key, key: response.key, keyPreview: response.key.substring(0, 15) + '...' }
            : key
        ));
        
        toast.success('API key regenerated successfully');
        return response.key;
      }
      
      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to regenerate API key';
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    }
  }, []);

  // Utility functions
  const getApiKeyById = useCallback((keyId: string): ApiKey | undefined => {
    return apiKeys.find(key => key.id === keyId);
  }, [apiKeys]);

  const getActiveKeys = useCallback((): ApiKey[] => {
    return apiKeys.filter(key => key.status === 'active');
  }, [apiKeys]);

  const getTotalRequests = useCallback((): number => {
    return apiKeys.reduce((total, key) => total + (key.requests || 0), 0);
  }, [apiKeys]);

  // Auto-fetch on mount
  useEffect(() => {
    fetchApiKeys();
  }, [fetchApiKeys]);

  return {
    // State
    apiKeys,
    isLoading,
    error,
    
    // Actions
    fetchApiKeys,
    createApiKey,
    updateApiKey,
    deleteApiKey,
    regenerateApiKey,
    
    // Utilities
    getApiKeyById,
    getActiveKeys,
    getTotalRequests,
  };
}

// Helper function to format dates
function formatDate(dateInput: string | Date): string {
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 30) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  } catch (_error) {
    return 'Invalid date';
  }
}

// Default export
export default useApiKeys;