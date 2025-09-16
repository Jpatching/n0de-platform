'use client';

import { Component, ReactNode, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { ApiConfig } from '@/lib/api-config';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class AuthErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Auth Error Boundary caught:', error, errorInfo);
    
    // Log to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      // Send error to monitoring service
      this.logErrorToService(error, errorInfo);
    }

    // Clear auth if it's an authentication error
    if (this.isAuthError(error)) {
      this.clearAuth();
    }

    this.setState({
      error,
      errorInfo,
    });
  }

  isAuthError(error: Error): boolean {
    const authKeywords = ['auth', 'token', 'session', 'unauthorized', '401', 'forbidden'];
    const errorString = error.toString().toLowerCase();
    return authKeywords.some(keyword => errorString.includes(keyword));
  }

  clearAuth() {
    try {
      localStorage.removeItem('n0de_token');
      localStorage.removeItem('n0de_refresh_token');
      localStorage.removeItem('n0de_session');
      localStorage.removeItem('n0de_user');
      localStorage.removeItem('n0de_token_timestamp');
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.error('Failed to clear auth:', e);
    }
  }

  logErrorToService(error: Error, errorInfo: ErrorInfo) {
    // Log error to backend service
    try {
      const apiUrl = ApiConfig.getApiUrl();
      
      // Format error data to match backend DTO expectations
      const errorData = {
        message: error.message || 'Unknown error',
        stack: error.stack || 'No stack trace available',
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        userAgent: typeof window !== 'undefined' ? navigator.userAgent : undefined,
        severity: 'high' as const,
        context: {
          errorName: error.name,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString(),
        },
      };

      // Note: errors/log endpoint may not exist yet, failing silently
      fetch(`${apiUrl}/errors/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorData),
      }).catch(() => {
        // Silently fail - don't want to create more errors
        console.warn('Failed to log error to backend');
      });
    } catch (_e) {
      // Silently fail
      console.warn('Error logging service unavailable');
    }
  }

  handleRefresh = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleRetry = () => {
    // Clear any potential auth state issues before retry
    this.clearAuth();
    
    // Check for initialization errors before accessing state
    const hasInitializationError = this.state.error && 
      (this.state.error.message.includes('Cannot access') || 
       this.state.error.message.includes('before initialization'));
    
    // Reset component state
    this.setState({ hasError: false, error: null, errorInfo: null });
    
    // Force a clean slate by reloading if initialization error detected
    if (hasInitializationError) {
      console.warn('Initialization error detected, forcing page reload');
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      const isAuthError = this.state.error && this.isAuthError(this.state.error);

      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
          <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-2xl border border-gray-700 p-8">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 p-4 bg-red-500/10 rounded-full">
                <AlertTriangle className="w-12 h-12 text-red-500" />
              </div>
              
              <h1 className="text-2xl font-bold text-white mb-2">
                {isAuthError ? 'Authentication Error' : 'Something went wrong'}
              </h1>
              
              <p className="text-gray-400 mb-6">
                {isAuthError 
                  ? 'There was a problem with your authentication. Please try signing in again.'
                  : 'We encountered an unexpected error. Please try again or contact support if the problem persists.'}
              </p>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="w-full mb-6 text-left">
                  <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-400">
                    Error Details
                  </summary>
                  <div className="mt-2 p-3 bg-gray-900 rounded text-xs text-gray-400 overflow-auto">
                    <p className="font-mono">{this.state.error.toString()}</p>
                    {this.state.error.stack && (
                      <pre className="mt-2 whitespace-pre-wrap">{this.state.error.stack}</pre>
                    )}
                  </div>
                </details>
              )}

              <div className="flex gap-3 w-full">
                {isAuthError ? (
                  <button
                    onClick={this.handleGoHome}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Home className="w-4 h-4" />
                    Sign In Again
                  </button>
                ) : (
                  <>
                    <button
                      onClick={this.handleRetry}
                      className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Try Again
                    </button>
                    <button
                      onClick={this.handleGoHome}
                      className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <Home className="w-4 h-4" />
                      Go Home
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AuthErrorBoundary;