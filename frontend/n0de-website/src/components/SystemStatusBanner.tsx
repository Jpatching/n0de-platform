'use client';

import { useState, useEffect } from 'react';

interface SystemStatusBannerProps {
  isSystemDown?: boolean;
  lastError?: string;
}

export default function SystemStatusBanner({ isSystemDown = false, lastError }: SystemStatusBannerProps) {
  const [showBanner, setShowBanner] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [nextRetryIn, setNextRetryIn] = useState(0);

  useEffect(() => {
    if (isSystemDown || lastError?.includes('ERR_INSUFFICIENT_RESOURCES')) {
      setShowBanner(true);
      
      // Start countdown for next retry
      if (nextRetryIn > 0) {
        const timer = setTimeout(() => setNextRetryIn(prev => prev - 1), 1000);
        return () => clearTimeout(timer);
      }
    } else {
      setShowBanner(false);
      setRetryCount(0);
    }
  }, [isSystemDown, lastError, nextRetryIn]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setNextRetryIn(Math.min(30, 5 * Math.pow(2, retryCount))); // Exponential backoff, max 30s
    window.location.reload();
  };

  const handleDismiss = () => {
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
              System Temporarily Unavailable
            </h3>
            <div className="mt-2 text-sm text-red-700 dark:text-red-300">
              <p>
                Our servers are experiencing high load. We're working to restore full service.
                {retryCount > 0 && ` (Attempt ${retryCount})`}
              </p>
              {nextRetryIn > 0 && (
                <p className="mt-1">
                  Next automatic retry in {nextRetryIn} seconds...
                </p>
              )}
            </div>
            <div className="mt-4">
              <div className="-mx-2 -my-1.5 flex">
                <button
                  onClick={handleRetry}
                  disabled={nextRetryIn > 0}
                  className="bg-red-50 dark:bg-red-900/20 px-2 py-1.5 rounded-md text-sm font-medium text-red-800 dark:text-red-200 hover:bg-red-100 dark:hover:bg-red-900/40 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-red-50 focus:ring-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {nextRetryIn > 0 ? `Retry in ${nextRetryIn}s` : 'Try Again'}
                </button>
                <button
                  onClick={handleDismiss}
                  className="ml-3 bg-red-50 dark:bg-red-900/20 px-2 py-1.5 rounded-md text-sm font-medium text-red-800 dark:text-red-200 hover:bg-red-100 dark:hover:bg-red-900/40 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-red-50 focus:ring-red-600"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}