'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X, User, Settings, LogOut, ChevronDown } from 'lucide-react';
import AuthModal from './AuthModal';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface SharedHeaderProps {
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
  authMode: 'signin' | 'signup';
  setAuthMode: (mode: 'signin' | 'signup') => void;
}

export default function SharedHeader({
  showAuthModal,
  setShowAuthModal,
  authMode,
  setAuthMode
}: SharedHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const router = useRouter();
  const { user, logout, isLoading } = useAuth();

  const handleLaunchApp = async () => {
    // Prevent double-clicks and add loading state
    if (isNavigating || isLoading) return;

    setIsNavigating(true);

    // Small delay to ensure auth state is settled
    await new Promise(resolve => setTimeout(resolve, 100));

    if (user) {
      router.push('/dashboard');
    } else {
      setAuthMode('signup');
      setShowAuthModal(true);
      setIsNavigating(false);
    }
  };

  return (
    <>
      {/* Navigation */}
      <motion.nav 
        className="fixed top-0 left-0 right-0 z-40 bg-bg-main/95 backdrop-blur-sm border-b border-border/30"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8 }}
        style={{ 
          willChange: 'transform',
          backfaceVisibility: 'hidden',
          transform: 'translateZ(0)'
        }}
      >
        <div className="container-width">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-3 group">
              <Image 
                src="/n0de-alt-background.png" 
                alt="N0DE Logo" 
                width={32}
                height={32}
                className="h-8 w-auto group-hover:scale-105 transition-transform duration-300"
              />
              <span className="text-xl font-bold hidden sm:flex items-center gradient-text">
                N0DE
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <Link href="/#performance" className="nav-link hover:text-N0DE-cyan transition-colors">Performance</Link>
              <Link href="/docs" className="nav-link hover:text-N0DE-cyan transition-colors">Docs</Link>
              <Link href="/developer" className="nav-link hover:text-N0DE-cyan transition-colors">Developer</Link>
              <Link href="/dashboard" className="nav-link hover:text-N0DE-cyan transition-colors">Dashboard</Link>
            </div>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center space-x-4">
              {/* User Profile or Sign In */}
              {user ? (
                <div className="relative">
                  <motion.button
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-bg-hover transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {/* User Avatar */}
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-N0DE-cyan to-N0DE-sky flex items-center justify-center overflow-hidden">
                      {user.avatar ? (
                        <Image src={user.avatar} alt={user.username || user.email} fill className="object-cover" />
                      ) : (
                        <span className="text-white font-semibold text-sm">
                          {(user.firstName?.[0] || user.email[0]).toUpperCase()}
                        </span>
                      )}
                    </div>
                    
                    {/* User Name */}
                    <span className="text-text-primary font-medium">
                      {user.firstName || user.username || user.email.split('@')[0]}
                    </span>
                    
                    {/* Dropdown Arrow */}
                    <ChevronDown className={`w-4 h-4 transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} />
                  </motion.button>
                  
                  {/* Profile Dropdown */}
                  <AnimatePresence>
                    {profileDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 mt-2 w-64 bg-bg-card border border-border rounded-lg shadow-xl z-45"
                      >
                        {/* User Info */}
                        <div className="px-4 py-3 border-b border-border">
                          <div className="font-medium text-text-primary">{user.firstName} {user.lastName}</div>
                          <div className="text-sm text-text-secondary">{user.email}</div>
                        </div>
                        
                        {/* Menu Items */}
                        <div className="py-2">
                          <Link
                            href="/dashboard"
                            className="flex items-center space-x-2 px-4 py-2 text-text-primary hover:bg-bg-hover transition-colors"
                            onClick={() => setProfileDropdownOpen(false)}
                          >
                            <User className="w-4 h-4" />
                            <span>Dashboard</span>
                          </Link>
                          
                          <Link
                            href="/settings"
                            className="flex items-center space-x-2 px-4 py-2 text-text-primary hover:bg-bg-hover transition-colors"
                            onClick={() => setProfileDropdownOpen(false)}
                          >
                            <Settings className="w-4 h-4" />
                            <span>Settings</span>
                          </Link>
                          
                          <button
                            onClick={() => {
                              setProfileDropdownOpen(false);
                              logout();
                            }}
                            className="flex items-center space-x-2 px-4 py-2 text-text-primary hover:bg-bg-hover transition-colors w-full text-left"
                          >
                            <LogOut className="w-4 h-4" />
                            <span>Sign Out</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <motion.button
                  onClick={() => { 
                    setAuthMode('signin'); 
                    setShowAuthModal(true);
                  }}
                  className="relative group"
                  whileHover={{ 
                    scale: 1.02,
                    y: -1
                  }}
                  whileTap={{ 
                    scale: 0.98
                  }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                {/* Main Button Surface */}
                <div className="relative px-4 py-2 bg-transparent border border-N0DE-cyan/20 text-N0DE-cyan rounded-lg overflow-hidden transition-all duration-300 group-hover:border-N0DE-cyan/40 group-hover:bg-N0DE-cyan/5">
                  
                  {/* Top Highlight */}
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-N0DE-cyan/20 to-transparent" />
                  
                  {/* Inner Glow */}
                  <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-N0DE-cyan/3 rounded-lg" />
                  
                  {/* Bottom Shadow */}
                  <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-black/10 to-transparent" />
                  
                  {/* Content */}
                  <div className="relative">
                    <motion.span
                      whileHover={{ x: 1 }}
                      transition={{ type: "spring", stiffness: 300 }}
                      className="font-medium"
                    >
                      Sign In
                    </motion.span>
                  </div>
                </div>
                
                {/* 3D Bottom Edge */}
                <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-b from-N0DE-cyan/20 to-black/20 rounded-b-lg" />
              </motion.button>
              )}
              
              {/* Launch App Button - Simplified */}
              <motion.button
                onClick={handleLaunchApp}
                disabled={isNavigating || isLoading}
                className="relative group"
                whileHover={{ 
                  scale: 1.03,
                  y: -2
                }}
                whileTap={{ 
                  scale: 0.97
                }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                {/* Main Button Surface */}
                <div className="relative px-6 py-2 bg-gradient-to-b from-N0DE-cyan via-N0DE-sky to-N0DE-navy text-white rounded-lg overflow-hidden transition-all duration-300 group-hover:from-N0DE-sky group-hover:via-N0DE-cyan group-hover:to-N0DE-navy">
                  
                  {/* Top Highlight */}
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                  
                  {/* Inner Glow */}
                  <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-white/6 rounded-lg" />
                  
                  {/* Bottom Shadow */}
                  <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-black/30 to-transparent" />
                  
                  {/* Shimmer Effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/12 to-transparent opacity-0 group-hover:opacity-100 group-hover:translate-x-full transition-all duration-700 ease-out rounded-lg" />
                  
                  {/* Content */}
                  <div className="relative">
                    <motion.span
                      whileHover={{ x: 1 }}
                      transition={{ type: "spring", stiffness: 300 }}
                      className="font-medium"
                    >
                      {isNavigating ? 'Loading...' : (user ? 'Dashboard' : 'Launch App')}
                    </motion.span>
                  </div>
                </div>
                
                {/* 3D Bottom Edge */}
                <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-b from-N0DE-navy to-black/50 rounded-b-lg" />
              </motion.button>
            </div>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden text-text-primary hover:text-N0DE-cyan transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <motion.div 
              className="md:hidden bg-bg-elevated border-t border-border/20"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className="px-4 py-4 space-y-4">
                <Link href="/#performance" className="block nav-link hover:text-N0DE-cyan transition-colors">Performance</Link>
                <Link href="/docs" className="block nav-link hover:text-N0DE-cyan transition-colors">Docs</Link>
                <Link href="/developer" className="block nav-link hover:text-N0DE-cyan transition-colors">Developer</Link>
                <Link href="/dashboard" className="block nav-link hover:text-N0DE-cyan transition-colors">Dashboard</Link>
                
                <div className="border-t border-border/20 pt-4 space-y-3">
                  <button
                    onClick={() => { setAuthMode('signin'); setShowAuthModal(true); setMobileMenuOpen(false); }}
                    className="block w-full text-left nav-link hover:text-N0DE-cyan transition-colors"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => { handleLaunchApp(); setMobileMenuOpen(false); }}
                    disabled={isNavigating || isLoading}
                    className="block w-full px-4 py-2 bg-gradient-to-r from-N0DE-cyan via-N0DE-sky to-N0DE-navy text-white rounded-lg font-medium text-center disabled:opacity-50"
                  >
                    {isNavigating ? 'Loading...' : 'Launch App'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </motion.nav>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        mode={authMode}
        onModeChange={setAuthMode}
      />
    </>
  );
}