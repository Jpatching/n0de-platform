'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, LogOut, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from '@/components/auth/AuthModal';
import Avatar from './Avatar';

export default function AuthButton() {
  const { user, logout, loading } = useAuth();
  const isAuthenticated = !!user;
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const router = useRouter();

  const handleAuthSuccess = (userData: any) => {
    setShowAuthModal(false);
    // User state will be updated by the AuthContext
  };

  const handleLogout = async () => {
    try {
      await logout();
      setShowUserMenu(false);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleProfileClick = () => {
    setShowUserMenu(false);
    router.push('/profile');
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-surface rounded-full animate-pulse"></div>
      </div>
    );
  }

  if (isAuthenticated && user) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="flex items-center space-x-2 lg:space-x-3 p-2 bg-surface border border-border rounded-lg hover:bg-bg-hover transition-colors"
        >
          <Avatar user={user} size="md" />
          <div className="text-left hidden sm:block">
            <p className="text-sm font-semibold text-text-primary font-inter">
              {(user as any).displayName || user.username}
            </p>
            <p className="text-xs text-text-secondary font-inter capitalize">
              {user.authMethod} account
            </p>
          </div>
        </button>

        {showUserMenu && (
          <div className="absolute right-0 top-full mt-2 w-48 bg-bg-elevated border border-border rounded-lg shadow-lg z-50">
            <div className="p-3 border-b border-border">
              <p className="font-semibold text-text-primary font-inter">
                {(user as any).displayName || user.username}
              </p>
              <p className="text-xs text-text-secondary font-inter">
                {(user as any).email || 
                 (user.walletAddress ? `${user.walletAddress.slice(0, 8)}...` : '') || 
                 'Authenticator'}
              </p>
            </div>
            
            <div className="p-1">
              <button
                onClick={handleProfileClick}
                className="w-full flex items-center space-x-2 p-2 text-left hover:bg-bg-hover rounded-md transition-colors"
              >
                <Settings className="w-4 h-4 text-text-secondary" />
                <span className="text-sm text-text-primary font-inter">Profile Settings</span>
              </button>
              
              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-2 p-2 text-left hover:bg-bg-hover rounded-md transition-colors text-red-400 hover:text-red-300"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-inter">Sign Out</span>
              </button>
            </div>
          </div>
        )}

        {/* Click outside to close menu */}
        {showUserMenu && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowUserMenu(false)}
          />
        )}
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowAuthModal(true)}
        className="group relative px-4 py-2.5 lg:px-6 lg:py-3 bg-white/5 backdrop-blur-sm border border-white/10 text-white font-bold rounded-lg font-audiowide text-sm lg:text-base overflow-hidden transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:scale-105"
      >
        {/* Subtle animated background */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        
        {/* Gentle shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
        
        {/* Button text */}
        <span className="relative z-10 flex items-center space-x-2">
          <svg className="w-4 h-4 transition-transform duration-300 group-hover:rotate-12" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zm7.707 3.293a1 1 0 010 1.414L9.414 9H17a1 1 0 110 2H9.414l1.293 1.293a1 1 0 01-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          <span>Sign In</span>
        </span>
        
        {/* Subtle glow effect */}
        <div className="absolute inset-0 rounded-lg bg-white/5 blur-lg opacity-0 group-hover:opacity-50 transition-opacity duration-300 -z-10"></div>
      </button>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
      />
    </>
  );
} 