'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [hasAttemptedAuth, setHasAttemptedAuth] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  useEffect(() => {
    // Skip auth check if we're already on auth callback page
    if (pathname === '/auth/callback') {
      return;
    }

    const checkAuth = () => {
      // If still loading, wait
      if (isLoading) {
        return;
      }

      // If we have user, auth is complete
      if (user) {
        setHasAttemptedAuth(true);
        return;
      }

      // If no user and auth context is not loading
      if (!user && !isLoading) {
        // Check if we have tokens in localStorage
        const hasToken = localStorage.getItem('n0de_token');
        const hasRefreshToken = localStorage.getItem('n0de_refresh_token');
        
        if (hasToken || hasRefreshToken) {
          // We have tokens but no user - give AuthContext time to process
          if (retryCount < maxRetries) {
            console.log(`ProtectedRoute: tokens found but user not loaded, retry ${retryCount + 1}/${maxRetries}`);
            setRetryCount(prev => prev + 1);
            
            // Exponential backoff for retries
            const delay = Math.min(1000 * Math.pow(1.5, retryCount), 5000);
            setTimeout(checkAuth, delay);
            return;
          } else {
            // Max retries reached, assume token is invalid
            console.log('ProtectedRoute: max retries reached, clearing tokens and redirecting');
            localStorage.removeItem('n0de_token');
            localStorage.removeItem('n0de_refresh_token');
            localStorage.removeItem('n0de_user');
          }
        }
        
        // No valid tokens or max retries reached, redirect to login
        if (!hasAttemptedAuth) {
          console.log('ProtectedRoute: redirecting to home from', pathname);
          setHasAttemptedAuth(true);
          router.push('/?auth=required&redirect=' + encodeURIComponent(pathname));
        }
      }
    };
    
    // Initial delay to allow hydration
    const timeoutId = setTimeout(checkAuth, 200);
    
    return () => clearTimeout(timeoutId);
  }, [user, isLoading, router, pathname, hasAttemptedAuth, retryCount]);

  // Reset retry count when user changes
  useEffect(() => {
    if (user) {
      setRetryCount(0);
      setHasAttemptedAuth(true);
    }
  }, [user]);

  if (isLoading || (!user && !hasAttemptedAuth)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-main">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-N0DE-cyan" />
          <p className="text-text-secondary">
            {retryCount > 0 ? `Authenticating... (${retryCount}/${maxRetries})` : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Return sign-in required message instead of infinite loading
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-main">
        <div className="max-w-md w-full bg-bg-elevated rounded-lg shadow-xl border border-border p-8 text-center">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-text-primary mb-2">Sign In Required</h1>
            <p className="text-text-secondary">
              You need to sign in to access this page. Please click the button below to continue.
            </p>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={() => router.push('/?auth=required&redirect=' + encodeURIComponent(pathname))}
              className="w-full px-6 py-3 bg-N0DE-cyan hover:bg-N0DE-sky text-black font-semibold rounded-lg transition-colors"
            >
              Sign In to Continue
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full px-6 py-3 bg-bg-hover hover:bg-bg-secondary text-text-primary border border-border rounded-lg transition-colors"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}