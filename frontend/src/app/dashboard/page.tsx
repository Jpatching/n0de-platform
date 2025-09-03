'use client';

import Dashboard from '@/components/Dashboard';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/layouts/AppLayout';
import { ErrorBoundary } from 'react-error-boundary';
import { AlertCircle, RefreshCw } from 'lucide-react';

function DashboardErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-2xl border border-gray-700 p-8 text-center">
        <div className="mb-4 p-4 bg-red-500/10 rounded-full inline-block">
          <AlertCircle className="w-12 h-12 text-red-500" />
        </div>
        
        <h1 className="text-2xl font-bold text-white mb-2">Dashboard Loading Error</h1>
        <p className="text-gray-400 mb-6">
          We encountered an issue loading your dashboard. This may be a temporary initialization problem.
        </p>
        
        {process.env.NODE_ENV === 'development' && (
          <details className="w-full mb-6 text-left">
            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-400">
              Error Details
            </summary>
            <div className="mt-2 p-3 bg-gray-900 rounded text-xs text-gray-400 overflow-auto">
              <p className="font-mono">{error.toString()}</p>
              {error.stack && (
                <pre className="mt-2 whitespace-pre-wrap text-xs">{error.stack}</pre>
              )}
            </div>
          </details>
        )}
        
        <div className="flex gap-3 w-full">
          <button
            onClick={resetErrorBoundary}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <ErrorBoundary
          FallbackComponent={DashboardErrorFallback}
          onError={(error, errorInfo) => {
            console.error('Dashboard Error:', error, errorInfo);
            
            // Log TDZ errors specifically
            if (error.message.includes('before initialization') || error.message.includes('Cannot access')) {
              console.error('TDZ Error detected in Dashboard:', {
                error: error.message,
                stack: error.stack,
                componentStack: errorInfo.componentStack
              });
            }
          }}
          onReset={() => {
            // Clear any potentially corrupted state
            if (typeof window !== 'undefined') {
              // Force a hard refresh to clear any cached state issues
              window.location.reload();
            }
          }}
        >
          <Dashboard />
        </ErrorBoundary>
      </AppLayout>
    </ProtectedRoute>
  );
}