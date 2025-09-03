'use client';

import { useEffect } from 'react';
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

  useEffect(() => {
    // Add a small delay to allow for auth transitions after callback
    const checkAuth = () => {
      if (!isLoading && !user && pathname !== '/auth/callback') {
        // Check if we have tokens in localStorage but context hasn't loaded yet
        const hasTokens = localStorage.getItem('n0de_token') && localStorage.getItem('n0de_refresh_token');
        
        if (hasTokens) {
          // Give AuthContext more time to process existing tokens
          console.log('ProtectedRoute: tokens found but user not loaded, waiting...');
          setTimeout(checkAuth, 1000);
          return;
        }
        
        // No tokens and no user, redirect to auth
        console.log('ProtectedRoute: redirecting to home from', pathname);
        router.push('/?auth=required&redirect=' + encodeURIComponent(pathname));
      }
    };
    
    // Small initial delay to handle immediate redirects from auth callback
    setTimeout(checkAuth, 100);
  }, [user, isLoading, router, pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-main">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-N0DE-cyan" />
          <p className="text-text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Return null while redirecting
    return null;
  }

  return <>{children}</>;
}