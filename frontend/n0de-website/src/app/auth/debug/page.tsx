'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface DebugInfo {
  hasToken: boolean;
  hasRefreshToken: boolean;
  hasSession: boolean;
  hasUser: boolean;
  tokenTimestamp: string | null;
  user: any;
  isTokenExpired: boolean;
  backendUrl: string;
}

export default function AuthDebugPage() {
  const { user, token, refreshToken, isLoading } = useAuth();
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [testResults, setTestResults] = useState<{
    backend: boolean;
    auth: boolean;
    billing: boolean;
    error?: string;
  }>({ backend: false, auth: false, billing: false });

  useEffect(() => {
    const info: DebugInfo = {
      hasToken: !!localStorage.getItem('n0de_token'),
      hasRefreshToken: !!localStorage.getItem('n0de_refresh_token'),
      hasSession: !!localStorage.getItem('n0de_session'),
      hasUser: !!localStorage.getItem('n0de_user'),
      tokenTimestamp: localStorage.getItem('n0de_token_timestamp'),
      user: user,
      isTokenExpired: false,
      backendUrl: process.env.NEXT_PUBLIC_AUTH_URL || 'https://n0de-backend-production-4e34.up.railway.app',
    };

    if (info.tokenTimestamp) {
      const tokenAge = Date.now() - parseInt(info.tokenTimestamp);
      info.isTokenExpired = tokenAge > (15 * 60 * 1000); // 15 minutes
    }

    setDebugInfo(info);
  }, [user, token, refreshToken]);

  const testBackendConnection = async () => {
    try {
      const backendUrl = debugInfo?.backendUrl || 'https://n0de-backend-production-4e34.up.railway.app';
      const response = await fetch(`${backendUrl}/api/v1/auth/google`, {
        method: 'HEAD',
        redirect: 'manual' // Don't follow redirects
      });
      
      // Google OAuth endpoint should return a redirect
      setTestResults(prev => ({ 
        ...prev, 
        backend: response.status === 302 || response.type === 'opaqueredirect',
        error: response.status === 302 ? undefined : `Backend responded with ${response.status}`
      }));
    } catch (error) {
      setTestResults(prev => ({ 
        ...prev, 
        backend: false, 
        error: `Backend connection failed: ${error}` 
      }));
    }
  };

  const testAuthEndpoint = async () => {
    try {
      const backendUrl = debugInfo?.backendUrl || 'https://n0de-backend-production-4e34.up.railway.app';
      const storedToken = localStorage.getItem('n0de_token');
      
      if (!storedToken) {
        setTestResults(prev => ({ ...prev, auth: false, error: 'No token found' }));
        return;
      }

      const response = await fetch(`${backendUrl}/api/v1/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${storedToken}`,
        },
      });

      setTestResults(prev => ({ 
        ...prev, 
        auth: response.ok,
        error: response.ok ? undefined : `Auth failed: ${response.status} ${response.statusText}`
      }));
    } catch (error) {
      setTestResults(prev => ({ 
        ...prev, 
        auth: false, 
        error: `Auth test failed: ${error}` 
      }));
    }
  };

  const testBillingEndpoint = async () => {
    try {
      const backendUrl = debugInfo?.backendUrl || 'https://n0de-backend-production-4e34.up.railway.app';
      const storedToken = localStorage.getItem('n0de_token');
      
      if (!storedToken) {
        setTestResults(prev => ({ ...prev, billing: false, error: 'No token found for billing test' }));
        return;
      }

      const response = await fetch(`${backendUrl}/api/v1/billing/health`, {
        headers: {
          'Authorization': `Bearer ${storedToken}`,
        },
      });

      setTestResults(prev => ({ 
        ...prev, 
        billing: response.ok,
        error: response.ok ? undefined : `Billing failed: ${response.status} ${response.statusText}`
      }));
    } catch (error) {
      setTestResults(prev => ({ 
        ...prev, 
        billing: false, 
        error: `Billing test failed: ${error}` 
      }));
    }
  };

  const runAllTests = async () => {
    await testBackendConnection();
    await testAuthEndpoint();
    await testBillingEndpoint();
  };

  const clearAuth = () => {
    localStorage.clear();
    window.location.href = '/';
  };

  const initiateGoogleAuth = () => {
    const backendUrl = debugInfo?.backendUrl || 'https://n0de-backend-production-4e34.up.railway.app';
    window.location.href = `${backendUrl}/api/v1/auth/google`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Loading Authentication Debug...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">N0DE Authentication Debug</h1>
        
        {/* Current Auth Status */}
        <div className="bg-gray-900 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Current Authentication Status</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className={`p-4 rounded ${user ? 'bg-green-900' : 'bg-red-900'}`}>
              <div className="font-semibold">User Status</div>
              <div>{user ? `✅ Logged in as ${user.email}` : '❌ Not logged in'}</div>
            </div>
            <div className={`p-4 rounded ${debugInfo?.hasToken ? 'bg-green-900' : 'bg-red-900'}`}>
              <div className="font-semibold">Access Token</div>
              <div>{debugInfo?.hasToken ? '✅ Present' : '❌ Missing'}</div>
              {debugInfo?.isTokenExpired && <div className="text-red-400">⚠️ Token expired</div>}
            </div>
            <div className={`p-4 rounded ${debugInfo?.hasRefreshToken ? 'bg-green-900' : 'bg-red-900'}`}>
              <div className="font-semibold">Refresh Token</div>
              <div>{debugInfo?.hasRefreshToken ? '✅ Present' : '❌ Missing'}</div>
            </div>
            <div className={`p-4 rounded ${debugInfo?.hasSession ? 'bg-green-900' : 'bg-red-900'}`}>
              <div className="font-semibold">Session</div>
              <div>{debugInfo?.hasSession ? '✅ Present' : '❌ Missing'}</div>
            </div>
          </div>
        </div>

        {/* Backend Configuration */}
        <div className="bg-gray-900 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Backend Configuration</h2>
          <div className="text-gray-300">
            <div><strong>Backend URL:</strong> {debugInfo?.backendUrl}</div>
            <div><strong>Google OAuth URL:</strong> {debugInfo?.backendUrl}/api/v1/auth/google</div>
            <div><strong>Callback URL:</strong> {debugInfo?.backendUrl}/api/v1/auth/google/callback</div>
          </div>
        </div>

        {/* Test Results */}
        <div className="bg-gray-900 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Connection Tests</h2>
          <div className="space-y-4">
            <div className={`p-4 rounded ${testResults.backend ? 'bg-green-900' : 'bg-gray-800'}`}>
              <div className="font-semibold">Backend Connection</div>
              <div>{testResults.backend ? '✅ Backend is responding' : '⚠️ Not tested yet'}</div>
            </div>
            <div className={`p-4 rounded ${testResults.auth ? 'bg-green-900' : 'bg-gray-800'}`}>
              <div className="font-semibold">Auth Endpoint</div>
              <div>{testResults.auth ? '✅ Authentication working' : '⚠️ Not tested yet'}</div>
            </div>
            <div className={`p-4 rounded ${testResults.billing ? 'bg-green-900' : 'bg-gray-800'}`}>
              <div className="font-semibold">Billing Endpoint</div>
              <div>{testResults.billing ? '✅ Billing accessible' : '⚠️ Not tested yet'}</div>
            </div>
            {testResults.error && (
              <div className="p-4 bg-red-900 rounded">
                <div className="font-semibold">Error Details</div>
                <div className="text-red-200">{testResults.error}</div>
              </div>
            )}
          </div>
          <button 
            onClick={runAllTests}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Run All Tests
          </button>
        </div>

        {/* Actions */}
        <div className="bg-gray-900 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Actions</h2>
          <div className="space-y-4">
            {!user && (
              <button
                onClick={initiateGoogleAuth}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold"
              >
                🔐 Login with Google (patchingjoshua@gmail.com)
              </button>
            )}
            
            {user && (
              <div className="space-y-2">
                <div className="text-green-400">✅ Successfully logged in!</div>
                <a 
                  href="/dashboard/billing"
                  className="inline-block px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold"
                >
                  🧾 Access Billing Dashboard
                </a>
              </div>
            )}

            <button
              onClick={clearAuth}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
            >
              Clear All Auth Data
            </button>
          </div>
        </div>

        {/* User Details */}
        {user && (
          <div className="bg-gray-900 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">User Details</h2>
            <pre className="bg-black p-4 rounded text-sm overflow-x-auto">
              {JSON.stringify(user, null, 2)}
            </pre>
          </div>
        )}

        {/* Raw Debug Data */}
        {debugInfo && (
          <div className="bg-gray-900 rounded-lg p-6 mt-6">
            <h2 className="text-xl font-semibold mb-4">Raw Debug Data</h2>
            <pre className="bg-black p-4 rounded text-sm overflow-x-auto">
              {JSON.stringify({
                ...debugInfo,
                storedToken: localStorage.getItem('n0de_token')?.substring(0, 20) + '...',
                storedRefreshToken: localStorage.getItem('n0de_refresh_token')?.substring(0, 20) + '...',
              }, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}