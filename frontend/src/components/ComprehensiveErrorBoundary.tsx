'use client';

import React, { Component, ReactNode, ErrorInfo } from 'react';
import { RefreshCw, AlertTriangle, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackComponent?: ReactNode;
  showDetails?: boolean;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  retryCount: number;
}

/**
 * Comprehensive error boundary that handles React errors gracefully
 * Fixes React Error #418 and provides user-friendly error recovery
 */
export default class ComprehensiveErrorBoundary extends Component<Props, State> {
  private retryTimeoutId?: NodeJS.Timeout;

  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details for debugging
    console.error('🚨 React Error Boundary Caught:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      retryCount: this.state.retryCount
    });

    this.setState({ errorInfo });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Report to error monitoring service
    this.reportError(error, errorInfo);
  }

  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    // In a real app, you'd send this to your error monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to error monitoring service
      console.log('Reporting error to monitoring service:', {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString()
      });
    }
  };

  private handleRetry = () => {
    const { retryCount } = this.state;
    
    // Limit retry attempts
    if (retryCount >= 3) {
      console.warn('Maximum retry attempts reached');
      return;
    }

    this.setState(prevState => ({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      retryCount: prevState.retryCount + 1
    }));

    // Auto-retry with exponential backoff for certain errors
    if (this.shouldAutoRetry()) {
      this.retryTimeoutId = setTimeout(() => {
        this.handleRetry();
      }, Math.pow(2, retryCount) * 1000); // 1s, 2s, 4s, 8s...
    }
  };

  private shouldAutoRetry = (): boolean => {
    const { error } = this.state;
    if (!error) return false;

    // Auto-retry for network-related or hydration errors
    const retryableErrors = [
      'ChunkLoadError',
      'Loading chunk failed',
      'NetworkError',
      'Hydration failed'
    ];

    return retryableErrors.some(errorType => 
      error.message.includes(errorType) || error.name.includes(errorType)
    );
  };

  private handleGoHome = () => {
    // Clear error state and navigate to home
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      retryCount: 0
    });
    
    // Navigate to home page
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  render() {
    const { hasError, error, errorInfo, retryCount } = this.state;
    const { children, fallbackComponent, showDetails = false } = this.props;

    if (hasError && error) {
      // Show custom fallback component if provided
      if (fallbackComponent) {
        return fallbackComponent;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-bg-main flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <div className="bg-bg-elevated border border-border rounded-lg p-6 text-center">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              
              <h2 className="text-xl font-bold text-white mb-2">
                Oops! Something went wrong
              </h2>
              
              <p className="text-text-secondary mb-6">
                We encountered an unexpected error. Don&apos;t worry, this happens sometimes.
              </p>

              <div className="space-y-3">
                <button
                  onClick={this.handleRetry}
                  disabled={retryCount >= 3}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-N0DE-cyan hover:bg-N0DE-cyan/90 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  {retryCount >= 3 ? 'Max retries reached' : `Try Again ${retryCount > 0 ? `(${retryCount}/3)` : ''}`}
                </button>

                <button
                  onClick={this.handleGoHome}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  <Home className="w-4 h-4" />
                  Go to Homepage
                </button>
              </div>

              {/* Development error details */}
              {process.env.NODE_ENV === 'development' && showDetails && (
                <details className="mt-6 text-left">
                  <summary className="cursor-pointer text-sm font-medium text-gray-400 hover:text-white">
                    Error Details (Development)
                  </summary>
                  <div className="mt-3 p-3 bg-gray-800 rounded text-xs font-mono text-red-300 overflow-auto">
                    <div className="mb-2">
                      <strong>Error:</strong> {error.message}
                    </div>
                    {error.stack && (
                      <div className="mb-2">
                        <strong>Stack:</strong>
                        <pre className="whitespace-pre-wrap mt-1">{error.stack}</pre>
                      </div>
                    )}
                    {errorInfo?.componentStack && (
                      <div>
                        <strong>Component Stack:</strong>
                        <pre className="whitespace-pre-wrap mt-1">{errorInfo.componentStack}</pre>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}