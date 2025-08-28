'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { X, Mail, Smartphone, Wallet, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import OptimizedImage from '@/components/ui/OptimizedImage';
import { useReferral } from '@/hooks/useReferral';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: any) => void;
}

type AuthMethod = 'email' | 'authenticator' | 'wallet';
type AuthMode = 'signin' | 'signup';

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const { login, signup } = useAuth();
  const { getStoredReferralCode, clearStoredReferralCode } = useReferral();
  const [authMethod, setAuthMethod] = useState<AuthMethod | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Authenticator setup state
  const [authenticatorSetup, setAuthenticatorSetup] = useState<{
    qrCode: string;
    secret: string;
    setupUrl: string;
    user: any;
  } | null>(null);

  // Form states
  const [emailForm, setEmailForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
    displayName: ''
  });

  const [authenticatorForm, setAuthenticatorForm] = useState({
    username: '',
    displayName: '',
    totpCode: ''
  });

  useEffect(() => {
    if (isOpen) {
      setAuthMethod(null);
      setError('');
      setAuthenticatorSetup(null);
      setEmailForm({
        email: '',
        password: '',
        confirmPassword: '',
        username: '',
        displayName: ''
      });
      setAuthenticatorForm({
        username: '',
        displayName: '',
        totpCode: ''
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleEmailAuth = async () => {
    setLoading(true);
    setError('');

    try {
      if (authMode === 'signup') {
        // Validate form
        if (!emailForm.email || !emailForm.password || !emailForm.confirmPassword) {
          throw new Error('Please fill in all required fields');
        }
        if (emailForm.password !== emailForm.confirmPassword) {
          throw new Error('Passwords do not match');
        }
        if (emailForm.password.length < 8) {
          throw new Error('Password must be at least 8 characters');
        }

        // Sign up with email
        const result = await signup({
          authMethod: 'email',
          email: emailForm.email,
          password: emailForm.password,
          username: emailForm.username,
          displayName: emailForm.displayName,
          referralCode: getStoredReferralCode(),
        });

        // Clear referral code after successful signup
        clearStoredReferralCode();

        onSuccess(result?.user || true);
      } else {
        // Sign in with email
        await login({
          authMethod: 'email',
          email: emailForm.email,
          password: emailForm.password,
        });

        onSuccess(true);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthenticatorAuth = async () => {
    setLoading(true);
    setError('');

    try {
      if (authMode === 'signup') {
        if (!authenticatorForm.username) {
          throw new Error('Username is required');
        }

        // Setup authenticator - this returns QR code data
        const setupData = await signup({
          authMethod: 'authenticator',
          username: authenticatorForm.username,
          displayName: authenticatorForm.displayName,
          referralCode: getStoredReferralCode(), // 🎯 Include referral code
        });

        // Show QR code setup
        setAuthenticatorSetup(setupData);
      } else {
        // Sign in with authenticator
        if (!authenticatorForm.username || !authenticatorForm.totpCode) {
          throw new Error('Username and authenticator code are required');
        }

        await login({
          authMethod: 'authenticator',
          username: authenticatorForm.username,
          totpCode: authenticatorForm.totpCode,
        });

        onSuccess(true);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthenticatorVerify = async () => {
    setLoading(true);
    setError('');

    try {
      if (!authenticatorForm.totpCode || !authenticatorSetup) {
        throw new Error('Please enter the 6-digit code from your authenticator app');
      }

      // Verify the setup
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://pv3-backend-api-production.up.railway.app'}/api/v1/auth/authenticator/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: authenticatorSetup.user.username,
          totpCode: authenticatorForm.totpCode,
          secret: authenticatorSetup.secret,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Verification failed');
      }

      const data = await response.json();
      
      // Store token
      if (data.token) {
        localStorage.setItem('pv3_token', data.token);
        localStorage.setItem('pv3_token_expires', data.expiresAt.toString());
      }

      // Clear referral code after successful signup
      clearStoredReferralCode();

      onSuccess(data.user);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleWalletAuth = async () => {
    setLoading(true);
    setError('');

    try {
      // Check if wallet is available
      if (typeof window === 'undefined' || !window.solana) {
        throw new Error('Please install a Solana wallet (like Phantom) to continue');
      }

      const wallet = window.solana;
      
      if (!wallet.isConnected) {
        // Connect wallet first
        await wallet.connect();
      }

      const walletAddress = wallet.publicKey.toString();
      
      if (authMode === 'signup') {
        // Generate message for signing
        const message = `Sign this message to create your PV3 account.\n\nWallet: ${walletAddress}\nTimestamp: ${Date.now()}`;
        const encodedMessage = new TextEncoder().encode(message);
        
        // Sign message
        const signedMessage = await wallet.signMessage(encodedMessage);
        
        // Convert signature to base58 string
        const bs58 = await import('bs58');
        const signature = bs58.default.encode(signedMessage.signature);

        // This would need wallet signup endpoint in backend
        throw new Error('Wallet signup not yet implemented. Please use email or authenticator signup.');
      } else {
        // Sign in with wallet
        // Get auth message from backend
        const messageResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://pv3-backend-api-production.up.railway.app'}/api/v1/auth/generate-message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ wallet: walletAddress }),
        });

        if (!messageResponse.ok) {
          throw new Error('Failed to get authentication message');
        }

        const { message } = await messageResponse.json();
        
        // Sign the message
        const encodedMessage = new TextEncoder().encode(message);
        const signedMessage = await wallet.signMessage(encodedMessage);
        const bs58 = await import('bs58');
        const signature = bs58.default.encode(signedMessage.signature);

        // Authenticate
        await login({
          authMethod: 'wallet',
          walletAddress,
          signature,
          message,
          timestamp: Date.now(),
        });

        onSuccess(true);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const renderMethodSelection = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-text-primary font-audiowide mb-2">
          {authMode === 'signin' ? 'Sign In to PV3' : 'Create PV3 Account'}
        </h2>
        <p className="text-text-secondary font-inter">
          Choose your preferred authentication method
        </p>
      </div>

      {/* Email Option */}
      <button
        onClick={() => setAuthMethod('email')}
        className="w-full p-4 bg-surface border border-border rounded-lg hover:bg-bg-hover transition-colors flex items-center space-x-4"
      >
        <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                          <OptimizedImage src="/logos/gmail.png" alt="Gmail" width={24} height={24} />
        </div>
        <div className="text-left">
          <h3 className="font-semibold text-text-primary font-inter">Email & Password</h3>
          <p className="text-sm text-text-secondary font-inter">Traditional email authentication</p>
        </div>
      </button>

      {/* Authenticator Option */}
      <button
        onClick={() => setAuthMethod('authenticator')}
        className="w-full p-4 bg-surface border border-border rounded-lg hover:bg-bg-hover transition-colors flex items-center space-x-4"
      >
        <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                          <OptimizedImage src="/logos/authenticator.png" alt="Authenticator" width={24} height={24} />
        </div>
        <div className="text-left">
          <h3 className="font-semibold text-text-primary font-inter">Authenticator App</h3>
          <p className="text-sm text-text-secondary font-inter">Google Authenticator, Authy, etc.</p>
        </div>
      </button>

      {/* Wallet Option */}
      <button
        onClick={() => setAuthMethod('wallet')}
        className="w-full p-4 bg-surface border border-border rounded-lg hover:bg-bg-hover transition-colors flex items-center space-x-4"
      >
        <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
          <Wallet className="w-6 h-6 text-purple-400" />
        </div>
        <div className="text-left">
          <h3 className="font-semibold text-text-primary font-inter">Crypto Wallet</h3>
          <p className="text-sm text-text-secondary font-inter">Phantom, Solflare, etc.</p>
        </div>
      </button>

      {/* Toggle between signin/signup */}
      <div className="text-center pt-4 border-t border-border">
        <p className="text-text-secondary font-inter">
          {authMode === 'signin' ? "Don't have an account?" : 'Already have an account?'}
          <button
            onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
            className="ml-2 text-accent-primary hover:text-accent-secondary font-semibold"
          >
            {authMode === 'signin' ? 'Sign Up' : 'Sign In'}
          </button>
        </p>
      </div>
    </div>
  );

  const renderEmailForm = () => (
    <div className="space-y-4">
      <div className="flex items-center space-x-4 mb-6">
        <button
          onClick={() => setAuthMethod(null)}
          className="p-2 hover:bg-bg-hover rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-text-secondary" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-text-primary font-audiowide">
            {authMode === 'signin' ? 'Sign In with Email' : 'Sign Up with Email'}
          </h2>
        </div>
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2 font-inter">
          Email Address
        </label>
        <input
          type="email"
          value={emailForm.email}
          onChange={(e) => setEmailForm(prev => ({ ...prev, email: e.target.value }))}
          className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent-primary focus:outline-none font-inter"
          placeholder="your@email.com"
        />
      </div>

      {/* Username (signup only) */}
      {authMode === 'signup' && (
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2 font-inter">
            Username (Optional)
          </label>
          <input
            type="text"
            value={emailForm.username}
            onChange={(e) => setEmailForm(prev => ({ ...prev, username: e.target.value.toLowerCase() }))}
            className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent-primary focus:outline-none font-inter"
            placeholder="yourusername"
            maxLength={20}
          />
        </div>
      )}

      {/* Display Name (signup only) */}
      {authMode === 'signup' && (
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2 font-inter">
            Display Name (Optional)
          </label>
          <input
            type="text"
            value={emailForm.displayName}
            onChange={(e) => setEmailForm(prev => ({ ...prev, displayName: e.target.value }))}
            className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent-primary focus:outline-none font-inter"
            placeholder="Your Display Name"
            maxLength={50}
          />
        </div>
      )}

      {/* Password */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2 font-inter">
          Password
        </label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={emailForm.password}
            onChange={(e) => setEmailForm(prev => ({ ...prev, password: e.target.value }))}
            className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent-primary focus:outline-none font-inter pr-12"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-secondary hover:text-text-primary"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Confirm Password (signup only) */}
      {authMode === 'signup' && (
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2 font-inter">
            Confirm Password
          </label>
          <input
            type={showPassword ? 'text' : 'password'}
            value={emailForm.confirmPassword}
            onChange={(e) => setEmailForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
            className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent-primary focus:outline-none font-inter"
            placeholder="••••••••"
          />
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm font-inter">
          {error}
        </div>
      )}

      <button
        onClick={handleEmailAuth}
        disabled={loading}
        className="w-full py-3 bg-accent-primary text-black font-bold rounded-lg hover:bg-accent-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-inter"
      >
        {loading ? 'Processing...' : (authMode === 'signin' ? 'Sign In' : 'Create Account')}
      </button>
    </div>
  );

  const renderAuthenticatorForm = () => {
    if (authenticatorSetup) {
      return renderAuthenticatorSetup();
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-4 mb-6">
          <button
            onClick={() => setAuthMethod(null)}
            className="p-2 hover:bg-bg-hover rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-text-secondary" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-text-primary font-audiowide">
              {authMode === 'signin' ? 'Sign In with Authenticator' : 'Setup Authenticator'}
            </h2>
          </div>
        </div>

        {/* Username */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2 font-inter">
            Username
          </label>
          <input
            type="text"
            value={authenticatorForm.username}
            onChange={(e) => setAuthenticatorForm(prev => ({ ...prev, username: e.target.value.toLowerCase() }))}
            className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent-primary focus:outline-none font-inter"
            placeholder="yourusername"
            maxLength={20}
          />
        </div>

        {/* Display Name (signup only) */}
        {authMode === 'signup' && (
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2 font-inter">
              Display Name (Optional)
            </label>
            <input
              type="text"
              value={authenticatorForm.displayName}
              onChange={(e) => setAuthenticatorForm(prev => ({ ...prev, displayName: e.target.value }))}
              className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent-primary focus:outline-none font-inter"
              placeholder="Your Display Name"
              maxLength={50}
            />
          </div>
        )}

        {/* TOTP Code (signin only) */}
        {authMode === 'signin' && (
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2 font-inter">
              Authenticator Code
            </label>
            <input
              type="text"
              value={authenticatorForm.totpCode}
              onChange={(e) => setAuthenticatorForm(prev => ({ ...prev, totpCode: e.target.value.replace(/\D/g, '') }))}
              className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent-primary focus:outline-none font-inter text-center text-2xl tracking-widest"
              placeholder="000000"
              maxLength={6}
            />
            <p className="text-xs text-text-secondary mt-1 font-inter">
              Enter the 6-digit code from your authenticator app
            </p>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm font-inter">
            {error}
          </div>
        )}

        <button
          onClick={handleAuthenticatorAuth}
          disabled={loading}
          className="w-full py-3 bg-accent-primary text-black font-bold rounded-lg hover:bg-accent-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-inter"
        >
          {loading ? 'Processing...' : (authMode === 'signin' ? 'Sign In' : 'Setup Authenticator')}
        </button>
      </div>
    );
  };

  const renderAuthenticatorSetup = () => (
    <div className="space-y-4">
      <div className="flex items-center space-x-4 mb-6">
        <button
          onClick={() => {
            setAuthenticatorSetup(null);
            setAuthenticatorForm(prev => ({ ...prev, totpCode: '' }));
          }}
          className="p-2 hover:bg-bg-hover rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-text-secondary" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-text-primary font-audiowide">
            Setup Your Authenticator
          </h2>
        </div>
      </div>

      <div className="text-center space-y-4">
        <p className="text-text-secondary font-inter">
          Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
        </p>
        
        {/* QR Code */}
        <div className="flex justify-center">
          <Image 
            src={authenticatorSetup?.qrCode || ''} 
            alt="QR Code for authenticator setup"
            width={192}
            height={192}
            className="border border-border rounded-lg"
          />
        </div>

        <p className="text-xs text-text-secondary font-inter">
          Can&apos;t scan? Manual entry key: <code className="bg-surface px-2 py-1 rounded">{authenticatorSetup?.secret || ''}</code>
        </p>
      </div>

      {/* Verification Code */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2 font-inter">
          Enter the 6-digit code from your app
        </label>
        <input
          type="text"
          value={authenticatorForm.totpCode}
          onChange={(e) => setAuthenticatorForm(prev => ({ ...prev, totpCode: e.target.value.replace(/\D/g, '') }))}
          className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent-primary focus:outline-none font-inter text-center text-2xl tracking-widest"
          placeholder="000000"
          maxLength={6}
        />
      </div>

      {error && (
        <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm font-inter">
          {error}
        </div>
      )}

      <button
        onClick={handleAuthenticatorVerify}
        disabled={loading || authenticatorForm.totpCode.length !== 6}
        className="w-full py-3 bg-accent-primary text-black font-bold rounded-lg hover:bg-accent-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-inter"
      >
        {loading ? 'Verifying...' : 'Complete Setup'}
      </button>
    </div>
  );

  const renderWalletForm = () => (
    <div className="space-y-4">
      <div className="flex items-center space-x-4 mb-6">
        <button
          onClick={() => setAuthMethod(null)}
          className="p-2 hover:bg-bg-hover rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-text-secondary" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-text-primary font-audiowide">
            {authMode === 'signin' ? 'Connect Wallet' : 'Create Account with Wallet'}
          </h2>
        </div>
      </div>

      <div className="text-center space-y-4">
        <p className="text-text-secondary font-inter mb-6">
          {authMode === 'signin' 
            ? 'Connect your Solana wallet to sign in to your account'
            : 'Connect your Solana wallet to create a new account'
          }
        </p>

        {/* Wallet Selection Grid */}
        <div className="grid grid-cols-1 gap-3">
          <button
            onClick={handleWalletAuth}
            disabled={loading}
            className="w-full p-4 bg-surface border border-border rounded-lg hover:bg-bg-hover transition-colors flex items-center space-x-4 disabled:opacity-50"
          >
            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <OptimizedImage src="/logos/phantom.png" alt="Phantom" width={28} height={28} />
            </div>
            <div className="text-left flex-1">
              <h3 className="font-semibold text-text-primary font-inter">Phantom Wallet</h3>
              <p className="text-sm text-text-secondary font-inter">Most popular Solana wallet</p>
            </div>
          </button>

          <button
            onClick={handleWalletAuth}
            disabled={loading}
            className="w-full p-4 bg-surface border border-border rounded-lg hover:bg-bg-hover transition-colors flex items-center space-x-4 disabled:opacity-50"
          >
            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <OptimizedImage src="/logos/solflare.png" alt="Solflare" width={28} height={28} />
            </div>
            <div className="text-left flex-1">
              <h3 className="font-semibold text-text-primary font-inter">Solflare Wallet</h3>
              <p className="text-sm text-text-secondary font-inter">Secure Solana wallet</p>
            </div>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm font-inter">
          {error}
        </div>
      )}

      <div className="text-center">
        <p className="text-xs text-text-secondary font-inter">
          {loading ? 'Connecting wallet...' : 'Click on your preferred wallet to connect'}
        </p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-bg-elevated border border-border rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-bg-hover rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>

          {/* Content */}
          {!authMethod && renderMethodSelection()}
          {authMethod === 'email' && renderEmailForm()}
          {authMethod === 'authenticator' && renderAuthenticatorForm()}
          {authMethod === 'wallet' && renderWalletForm()}
        </div>
      </div>
    </div>
  );
} 