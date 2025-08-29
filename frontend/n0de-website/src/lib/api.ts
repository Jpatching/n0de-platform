import { toast } from 'sonner';

interface ApiOptions extends RequestInit {
  retry?: number;
  retryDelay?: number;
  requiresAuth?: boolean;
  skipRefresh?: boolean;
}

class ApiClient {
  private baseURL: string;
  private refreshPromise: Promise<string | null> | null = null;
  private requestQueue: Array<{ resolve: Function; reject: Function; request: () => Promise<any> }> = [];
  private isRefreshing = false;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async getAuthHeaders(skipRefresh = false): Promise<HeadersInit> {
    const token = localStorage.getItem('n0de_token');
    const tokenTimestamp = localStorage.getItem('n0de_token_timestamp');
    
    if (!token) return {};
    
    // Check if token needs refresh (older than 10 minutes)
    if (!skipRefresh && tokenTimestamp) {
      const tokenAge = Date.now() - parseInt(tokenTimestamp);
      if (tokenAge > 10 * 60 * 1000) {
        // Token needs refresh
        await this.refreshToken();
        const newToken = localStorage.getItem('n0de_token');
        return newToken ? { 'Authorization': `Bearer ${newToken}` } : {};
      }
    }
    
    return { 'Authorization': `Bearer ${token}` };
  }

  private async refreshToken(): Promise<string | null> {
    // Prevent multiple simultaneous refresh calls
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    // If already refreshing, queue this request
    if (this.isRefreshing) {
      return new Promise((resolve, reject) => {
        this.requestQueue.push({
          resolve,
          reject,
          request: () => this.refreshToken()
        });
      });
    }

    this.isRefreshing = true;
    
    this.refreshPromise = (async () => {
      const refreshToken = localStorage.getItem('n0de_refresh_token');
      if (!refreshToken) {
        this.processQueue(null, new Error('No refresh token'));
        return null;
      }

      try {
        const response = await fetch(`${this.baseURL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (response.ok) {
          const data = await response.json();
          const newToken = data.accessToken;
          
          localStorage.setItem('n0de_token', newToken);
          localStorage.setItem('n0de_token_timestamp', Date.now().toString());
          
          if (data.user) {
            localStorage.setItem('n0de_user', JSON.stringify(data.user));
          }
          
          // Process queued requests with new token
          this.processQueue(newToken, null);
          
          return newToken;
        } else {
          // Refresh failed, clear auth and redirect to login
          this.clearAuth();
          this.processQueue(null, new Error('Token refresh failed'));
          return null;
        }
      } catch (error) {
        console.error('Token refresh failed:', error);
        this.processQueue(null, error);
        return null;
      } finally {
        this.refreshPromise = null;
        this.isRefreshing = false;
      }
    })();

    return this.refreshPromise;
  }

  private processQueue(token: string | null, error: any) {
    this.requestQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(token);
      }
    });
    this.requestQueue = [];
  }

  private clearAuth() {
    localStorage.removeItem('n0de_token');
    localStorage.removeItem('n0de_refresh_token');
    localStorage.removeItem('n0de_session');
    localStorage.removeItem('n0de_user');
    localStorage.removeItem('n0de_token_timestamp');
    window.dispatchEvent(new Event('storage'));
    
    // Only redirect if not already on auth pages
    if (!window.location.pathname.includes('/auth') && window.location.pathname !== '/') {
      window.location.href = '/?auth=expired';
    }
  }

  async request<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
    const {
      retry = 3,
      retryDelay = 1000,
      requiresAuth = true,
      skipRefresh = false,
      headers = {},
      ...fetchOptions
    } = options;

    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt <= retry) {
      try {
        const authHeaders = requiresAuth ? await this.getAuthHeaders(skipRefresh) : {};
        
        const response = await fetch(`${this.baseURL}${endpoint}`, {
          ...fetchOptions,
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
            ...headers,
          },
        });

        // Handle 401 - try to refresh token once
        if (response.status === 401 && requiresAuth && !skipRefresh && attempt === 0) {
          const newToken = await this.refreshToken();
          if (newToken) {
            // Retry with new token
            attempt++;
            continue;
          } else {
            // Refresh failed, clear auth
            this.clearAuth();
            throw new Error('Session expired. Please sign in again.');
          }
        }

        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const delay = retryAfter ? parseInt(retryAfter) * 1000 : retryDelay * Math.pow(2, attempt);
          
          if (attempt < retry) {
            await new Promise(resolve => setTimeout(resolve, delay));
            attempt++;
            continue;
          }
          
          throw new Error('Too many requests. Please try again later.');
        }

        // Handle server errors with retry
        if (response.status >= 500 && attempt < retry) {
          const delay = retryDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
          attempt++;
          continue;
        }

        // Parse response
        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(data?.message || `Request failed with status ${response.status}`);
        }

        return data as T;
      } catch (error) {
        lastError = error as Error;
        
        // Network errors - retry with exponential backoff
        if (error instanceof TypeError && error.message.includes('fetch')) {
          if (attempt < retry) {
            const delay = retryDelay * Math.pow(2, attempt);
            await new Promise(resolve => setTimeout(resolve, delay));
            attempt++;
            continue;
          }
        }
        
        // Don't retry for client errors (4xx except 429)
        if (error instanceof Error && error.message.includes('4')) {
          break;
        }
        
        attempt++;
      }
    }

    // All retries exhausted
    const errorMessage = lastError?.message || 'Request failed after multiple attempts';
    toast.error(errorMessage);
    throw lastError || new Error(errorMessage);
  }

  // Convenience methods
  async get<T>(endpoint: string, options?: ApiOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(endpoint: string, body?: any, options?: ApiOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(endpoint: string, body?: any, options?: ApiOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string, options?: ApiOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

// Create singleton instance
const api = new ApiClient('https://n0de-backend-production-4e34.up.railway.app/api/v1');

export default api;

// Export types for use in components
export type { ApiOptions };