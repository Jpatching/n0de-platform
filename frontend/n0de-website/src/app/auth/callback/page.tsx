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

  useEffect(() => {
    const handleCallback = async () => {
      // Check if user is already authenticated via context
      if (user) {
        console.log('User already authenticated via context, redirecting to dashboard');
        router.push('/dashboard');
        return;
      }

      const token = searchParams.get('token');
      const refreshToken = searchParams.get('refresh');
      const sessionId = searchParams.get('session');
      const userEncoded = searchParams.get('user');
      const error = searchParams.get('error');

      if (error) {
        setError(`Authentication failed: ${error}`);
        setIsProcessing(false);
        setTimeout(() => router.push('/?auth=failed'), 3000);
        return;
      }

      if (token && refreshToken && sessionId) {
        try {
          // Decode user data if provided (from OAuth)
          let userData = null;
          if (userEncoded) {
            try {
              userData = JSON.parse(decodeURIComponent(userEncoded));
            } catch (e) {
              console.warn('Failed to parse user data from URL');
            }
          }
          
          // Use auth context to properly login with refresh token
          await login(token, refreshToken, sessionId, userData);
          
          // Redirect to dashboard
          router.push('/dashboard');
        } catch (err) {
          console.error('Failed to complete authentication:', err);
          setError('Failed to complete authentication');
          setIsProcessing(false);
          setTimeout(() => router.push('/?auth=failed'), 3000);
        }
      } else {
        // No tokens in URL - check if user is already logged in
        const existingToken = localStorage.getItem('n0de_token');
        if (existingToken) {
          // User is already logged in, redirect to dashboard
          console.log('User already authenticated via localStorage, redirecting to dashboard');
          router.push('/dashboard');
        } else {
          // Missing required tokens and not logged in
          setError('Authentication incomplete - missing required data');
          setIsProcessing(false);
          setTimeout(() => router.push('/?auth=failed'), 3000);
        }
      }
    };

    handleCallback();
  }, [searchParams, router, login, user]);

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