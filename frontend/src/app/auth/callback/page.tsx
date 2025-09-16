'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, user } = useAuth();
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(true);
  const [hasProcessed, setHasProcessed] = useState(false); // Prevent multiple executions

  useEffect(() => {
    const handleCallback = async () => {
      // Prevent multiple executions of the same callback
      if (hasProcessed) {
        console.log('OAuth callback already processed, ignoring duplicate');
        return;
      }

      const token = searchParams.get('token');
      const refreshToken = searchParams.get('refresh');
      const sessionId = searchParams.get('session');
      const userEncoded = searchParams.get('user');
      const error = searchParams.get('error');
      const currentUrl = typeof window !== 'undefined' ? window.location.href : 'unknown';

      console.log('OAuth callback processing:', {
        url: currentUrl,
        hasToken: !!token,
        hasRefresh: !!refreshToken, 
        hasSession: !!sessionId,
        hasUser: !!userEncoded,
        error,
        isUserAlreadyLoggedIn: !!user,
        hasProcessed,
        timestamp: new Date().toISOString()
      });

      // Mark as processing to prevent concurrent executions
      setHasProcessed(true);

      // Check for redirect loops by detecting Vercel share parameters
      const hasVercelShare = searchParams.get('_vercel_share');
      if (hasVercelShare) {
        console.warn('Detected Vercel share parameter - possible redirect loop detected');
        setError('Redirect loop detected. Clearing authentication state.');
        setIsProcessing(false);
        setTimeout(() => {
          if (typeof window !== 'undefined') {
            localStorage.clear();
            window.location.href = '/';
          }
        }, 3000);
        return;
      }

      // If user is already authenticated and we don't have new tokens, just redirect
      if (user && !token) {
        console.log('User already authenticated, redirecting to dashboard');
        router.push('/dashboard');
        return;
      }

      if (error) {
        setError(`Authentication failed: ${error}`);
        setIsProcessing(false);
        setTimeout(() => router.push('/?auth=failed'), 3000);
        return;
      }

      if (token && refreshToken && sessionId) {
        try {
          // Validate token format before processing
          const tokenParts = token.split('.');
          if (tokenParts.length !== 3) {
            throw new Error('Invalid token format - not a valid JWT');
          }

          // Basic JWT payload validation
          try {
            const payload = JSON.parse(atob(tokenParts[1]));
            if (!payload.exp || payload.exp < Date.now() / 1000) {
              throw new Error('Token has expired');
            }
            console.log('Token validation passed:', { exp: payload.exp, userId: payload.sub });
          } catch (tokenError) {
            throw new Error('Invalid token payload: ' + tokenError.message);
          }

          // Decode user data if provided (from OAuth)
          let userData = null;
          if (userEncoded) {
            try {
              userData = JSON.parse(decodeURIComponent(userEncoded));
              console.log('Decoded user data:', userData);
              
              // Validate user data structure
              if (!userData.id || !userData.email) {
                console.warn('User data missing required fields:', userData);
              }
            } catch (e) {
              console.warn('Failed to parse user data from URL:', e);
            }
          }
          
          console.log('Attempting login with validated tokens...');
          // Use auth context to properly login with refresh token
          await login(token, refreshToken, sessionId, userData);
          
          // Wait a moment to ensure the AuthContext state is fully updated
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Check for stored redirect path from OAuth flow
          const storedRedirect = typeof window !== 'undefined' ? 
            sessionStorage.getItem('oauth_redirect') || '/dashboard' : 
            '/dashboard';
          
          console.log('Login successful, redirecting to:', storedRedirect);
          
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('oauth_redirect');
          }
          
          // Set processing to false before redirect
          setIsProcessing(false);
          
          // Clear URL parameters to prevent re-processing
          if (typeof window !== 'undefined') {
            const cleanUrl = new URL(window.location.href);
            cleanUrl.search = ''; // Remove all query parameters
            window.history.replaceState({}, '', cleanUrl.toString());
          }

          // Additional safety check before redirect
          if (storedRedirect === '/auth/callback') {
            console.warn('Preventing redirect loop to callback, using dashboard instead');
            router.replace('/dashboard');
          } else {
            // Use replace to avoid back button issues and prevent loops
            router.replace(storedRedirect);
          }
        } catch (err) {
          console.error('Failed to complete authentication:', err);
          setError('Failed to complete authentication');
          setIsProcessing(false);
          setTimeout(() => router.push('/?auth=failed'), 3000);
        }
      } else {
        // No tokens in URL - check if user is already logged in
        const existingToken = localStorage.getItem('n0de_token');
        if (existingToken && !user) {
          // User has token but context hasn't loaded yet, wait a bit
          console.log('User has token but context loading, waiting...');
          setTimeout(() => {
            if (!user) {
              router.push('/dashboard');
            }
          }, 1000);
        } else if (user) {
          // User is already logged in via context
          console.log('User authenticated via context, redirecting to dashboard');
          router.push('/dashboard');
        } else {
          // Missing required tokens and not logged in
          setError('Authentication incomplete - missing required data');
          setIsProcessing(false);
          setTimeout(() => router.push('/?auth=failed'), 3000);
        }
      }
    };

    // Add a small delay to prevent race conditions with auth context
    const timeoutId = setTimeout(handleCallback, 100);
    return () => clearTimeout(timeoutId);
  }, [searchParams, router, login, user, hasProcessed]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-center">
        {error ? (
          <>
            <div className="text-red-500 text-xl mb-2">Authentication Error</div>
            <div className="text-gray-400">{error}</div>
            <div className="text-gray-500 text-sm mt-4">Redirecting...</div>
            <button
              onClick={() => {
                // Clear any stuck auth state
                localStorage.clear();
                window.location.href = '/';
              }}
              className="mt-4 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
            >
              Clear Auth & Try Again
            </button>
          </>
        ) : isProcessing ? (
          <>
            <div className="animate-pulse text-white text-xl">Authenticating...</div>
            <div className="mt-4 text-gray-400">Please wait while we sign you in</div>
            <div className="mt-8 text-gray-500 text-sm">
              If this takes more than 5 seconds, 
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.href = '/';
                }}
                className="ml-2 underline hover:text-gray-400"
              >
                click here to retry
              </button>
            </div>
          </>
        ) : (
          <div className="text-gray-400">Redirecting...</div>
        )}
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="animate-pulse text-white text-xl">Loading...</div>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}