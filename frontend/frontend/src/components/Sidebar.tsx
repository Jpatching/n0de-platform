'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { BridgeModal } from './Bridge/BridgeModal';
import AuthButton from './AuthButton';
import MatrixRain from './MatrixRain';
import { Shield, Zap, Trophy, Wallet, Gamepad2, DollarSign, CheckCircle, ArrowLeftRight, Code, CreditCard, Key, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  currentPage?: string;
}

export default function Sidebar({ isOpen = true, onClose, currentPage }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const [showBridgeModal, setShowBridgeModal] = useState(false);
  const [gamesExpanded, setGamesExpanded] = useState(false);
  const [paymentsExpanded, setPaymentsExpanded] = useState(false);
  const [earnExpanded, setEarnExpanded] = useState(false);
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const [profileExpanded, setProfileExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [currentPageKey, setCurrentPageKey] = useState<string>('');
  
  // Color animation states
  const [gamesColorIndex, setGamesColorIndex] = useState(0);
  const [paymentsFlash, setPaymentsFlash] = useState(false);
  const [earnFlash, setEarnFlash] = useState(false);
  const [settingsFlash, setSettingsFlash] = useState(false);
  const [homeFlash, setHomeFlash] = useState(false);
  const [socialFlash, setSocialFlash] = useState(false);
  const [liveFlash, setLiveFlash] = useState(false);
  const [oracleFlash, setOracleFlash] = useState(false);
  const [profileFlash, setProfileFlash] = useState(false);

  const router = useRouter();

  // Color animation arrays
  const rainbowColors = ['#ff0000', '#ff8000', '#ffff00', '#00ff00', '#0080ff', '#8000ff'];
  
  // Color animation effects
  useEffect(() => {
    // Games rainbow animation - slower cycle every 1s for 6s total cycle
    const gamesInterval = setInterval(() => {
      setGamesColorIndex((prev) => (prev + 1) % rainbowColors.length);
    }, 1000);
    return () => clearInterval(gamesInterval);
  }, []);

  useEffect(() => {
    // Payments green flash - every 4s
    const paymentsInterval = setInterval(() => {
      setPaymentsFlash(true);
      setTimeout(() => setPaymentsFlash(false), 2000);
    }, 4000);
    return () => clearInterval(paymentsInterval);
  }, []);

  useEffect(() => {
    // Earn green flash - every 4.5s
    const earnInterval = setInterval(() => {
      setEarnFlash(true);
      setTimeout(() => setEarnFlash(false), 2250);
    }, 4500);
    return () => clearInterval(earnInterval);
  }, []);

  useEffect(() => {
    // Settings blue flash - every 5s
    const settingsInterval = setInterval(() => {
      setSettingsFlash(true);
      setTimeout(() => setSettingsFlash(false), 2500);
    }, 5000);
    return () => clearInterval(settingsInterval);
  }, []);

  useEffect(() => {
    // Home welcome flash - every 3.5s
    const homeInterval = setInterval(() => {
      setHomeFlash(true);
      setTimeout(() => setHomeFlash(false), 1750);
    }, 3500);
    return () => clearInterval(homeInterval);
  }, []);

  useEffect(() => {
    // Social Hub purple flash - every 5.5s
    const socialInterval = setInterval(() => {
      setSocialFlash(true);
      setTimeout(() => setSocialFlash(false), 2750);
    }, 5500);
    return () => clearInterval(socialInterval);
  }, []);

  useEffect(() => {
    // Live Streams red flash - every 6s
    const liveInterval = setInterval(() => {
      setLiveFlash(true);
      setTimeout(() => setLiveFlash(false), 3000);
    }, 6000);
    return () => clearInterval(liveInterval);
  }, []);

  useEffect(() => {
    // Oracle cyan flash - every 6.5s
    const oracleInterval = setInterval(() => {
      setOracleFlash(true);
      setTimeout(() => setOracleFlash(false), 3250);
    }, 6500);
    return () => clearInterval(oracleInterval);
  }, []);

  useEffect(() => {
    // Profile pink flash - every 7s
    const profileInterval = setInterval(() => {
      setProfileFlash(true);
      setTimeout(() => setProfileFlash(false), 3500);
    }, 7000);
    return () => clearInterval(profileInterval);
  }, []);

  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3', '#54A0FF', '#5F27CD'];
  const currentColor = colors[gamesColorIndex % colors.length];

  // Load minimized state from localStorage on component mount
  useEffect(() => {
    const savedMinimizedState = localStorage.getItem('sidebar-minimized');
    if (savedMinimizedState !== null) {
      setIsMinimized(JSON.parse(savedMinimizedState));
    }
  }, []);

  // Listen for hash changes to update current page detection
  useEffect(() => {
    const handleHashChange = () => {
      // Force a re-render when hash changes
      setGamesExpanded(prev => prev); // This triggers a re-render
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('hashchange', handleHashChange);
      return () => window.removeEventListener('hashchange', handleHashChange);
    }
  }, []);

  // Auto-expand sections based on current page
  useEffect(() => {
    const currentKey = getCurrentPage();
    
    // Auto-expand Games section
    if (['chess', 'coinflip', 'rps', 'dice', 'dice-duel', 'mines', 'tournaments', 'high-stakes', 'degen-arena', 'pump-wars', 'battle-royale', 'the-shipment'].includes(currentKey)) {
      setGamesExpanded(true);
    }
    
    // Auto-expand Payments section
    if (['payments', 'bridge', 'coinbase-pay', 'wallets'].includes(currentKey)) {
      setPaymentsExpanded(true);
    }
    
    // Auto-expand Earn section
    if (['earn', 'developer-hub', 'rewards', 'partnership'].includes(currentKey)) {
      setEarnExpanded(true);
    }
    
    // Auto-expand Settings section
    if (['settings', '2fa', 'security-features', 'bankroll'].includes(currentKey)) {
      setSettingsExpanded(true);
    }
    
    // Auto-expand Profile section
    if (['profile', 'pnl-dashboard'].includes(currentKey)) {
      setProfileExpanded(true);
    }
  }, [currentPageKey]);

  // Save minimized state to localStorage whenever it changes
  const toggleMinimized = () => {
    const newMinimizedState = !isMinimized;
    setIsMinimized(newMinimizedState);
    localStorage.setItem('sidebar-minimized', JSON.stringify(newMinimizedState));
  };
  
  // Determine current page from pathname if not provided
  const getCurrentPage = () => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const segments = path.split('/').filter(Boolean);
      return segments[segments.length - 1] || 'home';
    }
    return 'home';
  };

  useEffect(() => {
    setCurrentPageKey(getCurrentPage());
    
    const handleHashChange = () => {
      setCurrentPageKey(getCurrentPage());
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('popstate', handleHashChange);
      return () => window.removeEventListener('popstate', handleHashChange);
    }
  }, []);

  useEffect(() => {
    if (currentPage) {
      setCurrentPageKey(currentPage);
    }
  }, [currentPage]);

  const navigationItems = [
    { name: 'Home', href: '/', key: 'home', customIcon: '/sidebar icons/home.png' },
    { 
      name: 'Games', 
      href: '/games',
      key: 'games', 
      expandable: true,
      customIcon: '/sidebar icons/games.png',
      children: [
        { 
          name: 'Classics', 
          key: 'classics',
          children: [
            { name: 'Chess Blitz', href: '/games/chess', key: 'chess' },
            { name: 'Coin Flip', href: '/games/coinflip', key: 'coinflip' },
            { name: 'Rock Paper Scissors', href: '/games/rps', key: 'rps' },
            { name: 'Dice Duel', href: '/games/dice-duel', key: 'dice-duel' },
            { name: 'Mines', href: '/games/mines', key: 'mines' },
          ]
        },
        { 
          name: 'Degen Arena', 
          key: 'degen-arena',
          children: [
            { name: 'Pump Wars', href: '/games/pump-wars', key: 'pump-wars' },
            { name: 'Battle Royale', href: '/games/battle-royale', key: 'battle-royale' },
          ]
        },

        { name: 'Tournaments', href: '/tournaments', key: 'tournaments' },
        { name: 'High Stakes', href: '/high-stakes', key: 'high-stakes' },
      ]
    },
    { 
      name: 'Payments', 
      href: '/payments',
      key: 'payments', 
      expandable: true,
      customIcon: '/sidebar icons/Payments.png',
      children: [
        { name: 'Bridge', href: '/bridge', key: 'bridge' },
        { name: 'Coinbase Pay', href: '/coinbase-pay', key: 'coinbase-pay' },
        { name: 'Wallets', href: '/payments#wallets', key: 'wallets' },
      ]
    },
    { name: 'Social Hub', href: '/social', key: 'social', customIcon: '/sidebar icons/socialhub.png' },
    { name: 'Live Streams', href: '/live', key: 'live', customIcon: '/sidebar icons/livestream.png' },
    { name: 'PV3 Oracle', href: '/oracle', key: 'oracle', customIcon: '/sidebar icons/oracle.png' },
    { 
      name: 'Earn', 
      href: '/earn',
      key: 'earn', 
      expandable: true,
      customIcon: '/sidebar icons/earn.png',
      children: [
        { name: 'Developer Hub', href: '/developer-hub', key: 'developer-hub', customIcon: '/sidebar icons/developerhub.png' },
        { name: 'Rewards', href: '/rewards', key: 'rewards', customIcon: '/sidebar icons/rewards.png' },
        { name: 'Partnership', href: '/partnership', key: 'partnership', customIcon: '/sidebar icons/partnership.png' },
      ]
    },
    { 
      name: 'Settings', 
      href: '/settings',
      key: 'settings', 
      expandable: true,
      customIcon: '/sidebar icons/settings.png',
      children: [
        { name: '2FA Security', href: '/2fa', key: '2fa', customIcon: '/sidebar icons/2fa.png' },
        { name: 'Security & Features', href: '/security-features', key: 'security-features', customIcon: '/sidebar icons/security.png' },
        { name: 'Bankroll', href: '/bankroll', key: 'bankroll', customIcon: '/sidebar icons/bankroll.png' },
      ]
    },
    { 
      name: 'Profile', 
      href: '/profile', 
      key: 'profile', 
      customIcon: '/sidebar icons/profile.png',
      expandable: true,
      children: [
        { name: 'PnL Dashboard', href: '/profile/pnl-dashboard', key: 'pnl-dashboard', customIcon: '/sidebar icons/profile.png' }
      ]
    },
  ];

  const sidebarClasses = `
    fixed inset-y-0 left-0 z-40 ${isMinimized ? 'w-20' : 'w-56'} border-r
    transform transition-all duration-300 ease-in-out
    ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
  `;

  const handleBridgeClick = () => {
    setShowBridgeModal(true);
    onClose?.(); // Close mobile menu
  };

  const handleBridgeSuccess = (amount: string) => {
    setShowBridgeModal(false);
  };

  const isInSection = (sectionKey: string, item: any): boolean => {
    if (sectionKey === 'games') {
      return ['chess', 'coinflip', 'rps', 'dice-duel', 'mines', 'tournaments', 'high-stakes', 'classics', 'degen-arena', 'pump-wars', 'battle-royale', 'the-shipment'].includes(currentPageKey);
    }
    if (sectionKey === 'payments') {
      return ['payments', 'bridge', 'coinbase-pay', 'wallets'].includes(currentPageKey);
    }
    if (sectionKey === 'earn') {
      return ['earn', 'developer-hub', 'rewards', 'partnership'].includes(currentPageKey);
    }
    if (sectionKey === 'settings') {
      return ['settings', '2fa', 'security-features', 'bankroll'].includes(currentPageKey);
    }
    if (sectionKey === 'profile') {
      return ['profile', 'pnl-dashboard'].includes(currentPageKey);
    }
    return false;
  };

  const renderNavItem = (item: any, level: number = 0) => {
    const isActive = item.key === currentPageKey;
    const hasActiveChild = item.children?.some((child: any) => 
      child.key === currentPageKey || 
      child.children?.some((grandchild: any) => grandchild.key === currentPageKey)
    );
    const shouldShowAsActive = isActive || hasActiveChild;
    const isInActiveSection = isInSection(item.key, item);
    
    if (isMinimized && level > 0) {
      return null; // Don't show nested items when minimized
    }
    
    if (item.expandable) {
      const isExpanded = 
        (item.key === 'games' && gamesExpanded) ||
        (item.key === 'payments' && paymentsExpanded) ||
        (item.key === 'earn' && earnExpanded) ||
        (item.key === 'settings' && settingsExpanded) ||
        (item.key === 'profile' && profileExpanded);

      const toggleExpanded = () => {
        if (item.key === 'games') setGamesExpanded(!gamesExpanded);
        if (item.key === 'payments') setPaymentsExpanded(!paymentsExpanded);
        if (item.key === 'earn') setEarnExpanded(!earnExpanded);
        if (item.key === 'settings') setSettingsExpanded(!settingsExpanded);
        if (item.key === 'profile') setProfileExpanded(!profileExpanded);
      };

      if (isMinimized) {
        return (
          <div key={item.key} className="group relative">
            <Link
              href={item.href}
              onClick={onClose}
              className={`block p-3 rounded-lg transition-all flex items-center justify-center ${
                shouldShowAsActive
                  ? 'bg-bg-hover text-text-primary border-l-4 border-accent-primary' 
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
              }`}
            >
              <span 
                className={`text-xl ${
                  (item.key === '2fa' || item.key === 'security-features') 
                    ? 'security-menu-glow' 
                    : ''
                }`}
              >
                {item.emoji}
              </span>
            </Link>
            {/* Tooltip */}
            <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 bg-bg-elevated border border-border rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 pointer-events-none whitespace-nowrap">
              <span className="text-sm font-audiowide">{item.name}</span>
            </div>
          </div>
        );
      }

      return (
        <div key={item.key}>
          <div className={`flex items-center rounded-lg transition-all ${
            shouldShowAsActive
              ? 'bg-bg-hover text-text-primary border-l-4 border-accent-primary' 
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
          }`} style={{ marginLeft: `${level * 16}px` }}>
            <Link
              href={item.href}
              onClick={onClose}
              className="flex-1 p-2 font-audiowide text-sm flex items-center space-x-2"
            >
              {item.customIcon && (
                <Image
                  src={item.customIcon}
                  alt={item.name}
                  width={40}
                  height={40}
                  className={`w-8 h-8 ${item.key === '2fa' ? 'filter drop-shadow-lg' : ''}`}
                  style={item.key === '2fa' ? { filter: 'brightness(0) invert(1)', mixBlendMode: 'screen' } : {}}
                />
              )}
              <span 
                className="font-audiowide text-sm"
                style={{
                  color: item.key === 'games' ? rainbowColors[gamesColorIndex] :
                         item.key === 'payments' ? (paymentsFlash ? '#00ff00' : '#666666') :
                         item.key === 'earn' ? (earnFlash ? '#00cc00' : '#666666') :
                         item.key === 'settings' ? (settingsFlash ? '#0066ff' : '#666666') :
                         item.key === 'home' ? (homeFlash ? '#ffaa00' : '#ffffff') :
                         item.key === 'social' ? (socialFlash ? '#9966ff' : '#666666') :
                         item.key === 'live' ? (liveFlash ? '#ff4444' : '#666666') :
                         item.key === 'oracle' ? (oracleFlash ? '#00cccc' : '#666666') :
                         item.key === 'profile' ? (profileFlash ? '#ff66cc' : '#666666') :
                         'inherit',
                  fontWeight: (item.key === 'games' || item.key === 'payments' || item.key === 'earn' || item.key === 'settings' || item.key === 'home' || item.key === 'social' || item.key === 'live' || item.key === 'oracle' || item.key === 'profile') ? '700' : '600',
                  transition: item.key === 'games' ? 'none' : 'color 0.5s ease'
                }}
              >{item.name}</span>
            </Link>
            <button
              onClick={toggleExpanded}
              className="p-2 hover:bg-bg-hover rounded-r-lg transition-all"
            >
              <svg 
                className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          {isExpanded && item.children && (
            <div className="mt-1 space-y-1">
              {item.children.map((child: any) => renderNavItem(child, level + 1))}
            </div>
          )}
        </div>
      );
    }

    if (item.children) {
      // This is for Classics which has sub-items but isn't directly expandable
      if (isMinimized) return null;
      
      return (
        <div key={item.key}>
          <div 
            className={`p-2 rounded-lg transition-all font-audiowide text-sm font-semibold ${
              ['chess', 'coinflip', 'rps', 'dice'].includes(currentPageKey)
                ? 'text-text-primary' 
                : 'text-text-secondary'
            }`}
            style={{ marginLeft: `${level * 16}px` }}
          >
            {item.name}
          </div>
          <div className="space-y-1">
            {item.children.map((child: any) => renderNavItem(child, level + 1))}
          </div>
        </div>
      );
    }

    if (isMinimized) {
      return (
        <div key={item.key} className="group relative">
          <Link
            href={item.href}
            onClick={onClose}
            className={`block p-3 rounded-lg transition-all flex items-center justify-center ${
              shouldShowAsActive
                ? 'bg-bg-hover text-text-primary border-l-4 border-accent-primary' 
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
            }`}
          >
            <span 
              className={`text-xl ${
                (item.key === '2fa' || item.key === 'security-features') 
                  ? 'security-menu-glow' 
                  : ''
              }`}
            >
              {item.emoji}
            </span>
          </Link>
          {/* Tooltip */}
          <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 bg-bg-elevated border border-border rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 pointer-events-none whitespace-nowrap">
            <span className="text-sm font-audiowide">{item.name}</span>
          </div>
        </div>
      );
    }

    return (
      <Link
        key={item.key}
        href={item.href}
        onClick={onClose}
        className={`block p-2 rounded-lg transition-all font-audiowide text-sm ${
          shouldShowAsActive
            ? 'bg-bg-hover text-text-primary border-l-4 border-accent-primary' 
            : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
        }`}
        style={{ marginLeft: `${level * 16}px` }}
      >
        <div className="flex items-center space-x-2">
          {item.customIcon && (
            <Image
              src={item.customIcon}
              alt={item.name}
              width={40}
              height={40}
              className={`w-8 h-8 ${item.key === '2fa' ? 'filter drop-shadow-lg' : ''}`}
              style={item.key === '2fa' ? { filter: 'brightness(0) invert(1)', mixBlendMode: 'screen' } : {}}
            />
          )}
          {item.emoji && (
            <span 
              className={`text-lg ${
                (item.key === '2fa' || item.key === 'security-features') 
                  ? 'security-menu-glow' 
                  : ''
              }`}
            >
              {item.emoji}
            </span>
          )}
          <span 
            className="font-audiowide text-sm"
            style={{
              color: item.key === 'games' ? rainbowColors[gamesColorIndex] :
                     item.key === 'payments' ? (paymentsFlash ? '#00ff00' : '#666666') :
                     item.key === 'earn' ? (earnFlash ? '#00cc00' : '#666666') :
                     item.key === 'settings' ? (settingsFlash ? '#0066ff' : '#666666') :
                     item.key === 'home' ? (homeFlash ? '#ffaa00' : '#ffffff') :
                     item.key === 'social' ? (socialFlash ? '#9966ff' : '#666666') :
                     item.key === 'live' ? (liveFlash ? '#ff4444' : '#666666') :
                     item.key === 'oracle' ? (oracleFlash ? '#00cccc' : '#666666') :
                     item.key === 'profile' ? (profileFlash ? '#ff66cc' : '#666666') :
                     'inherit',
              fontWeight: (item.key === 'games' || item.key === 'payments' || item.key === 'earn' || item.key === 'settings' || item.key === 'home' || item.key === 'social' || item.key === 'live' || item.key === 'oracle' || item.key === 'profile') ? '700' : '600',
              transition: item.key === 'games' ? 'none' : 'color 0.5s ease'
            }}
          >{item.name}</span>
        </div>
      </Link>
    );
  };

  return (
    <>
      {/* Sidebar Color Animations */}
      <style jsx global>{`
        @keyframes sidebarGamesRainbow {
          0% { color: #ff0000 !important; }
          16% { color: #ff8000 !important; }
          33% { color: #ffff00 !important; }
          50% { color: #00ff00 !important; }
          66% { color: #0080ff !important; }
          83% { color: #8000ff !important; }
          100% { color: #ff0000 !important; }
        }

        @keyframes sidebarPaymentsGreen {
          0%, 100% { color: #666666 !important; }
          50% { color: #00ff00 !important; }
        }

        @keyframes sidebarEarnGreen {
          0%, 100% { color: #666666 !important; }
          50% { color: #00cc00 !important; }
        }

        @keyframes sidebarHomeWelcome {
          0%, 100% { color: #ffffff !important; }
          50% { color: #ffaa00 !important; }
        }

        @keyframes sidebarSettingsBlue {
          0%, 100% { color: #666666 !important; }
          50% { color: #0066ff !important; }
        }
      `}</style>

      {/* Subtle Security Icon Animations */}
      <style jsx>{`
        @keyframes subtleGlow1 {
          0%, 100% { 
            filter: brightness(0.6);
            opacity: 0.7;
          }
          50% { 
            filter: brightness(2.2);
            opacity: 1;
          }
        }
        
        @keyframes subtleGlow2 {
          0%, 100% { 
            filter: brightness(0.7);
            opacity: 0.7;
          }
          50% { 
            filter: brightness(2.0);
            opacity: 1;
          }
        }
        
        @keyframes subtleGlow3 {
          0%, 100% { 
            filter: brightness(0.5);
            opacity: 0.6;
          }
          50% { 
            filter: brightness(2.5);
            opacity: 1;
          }
        }
        
        @keyframes colorPulse {
          0%, 100% { 
            background-color: rgba(0, 0, 0, 0.85);
          }
          25% { 
            background-color: ${currentColor}08;
          }
          50% { 
            background-color: rgba(0, 0, 0, 0.90);
          }
          75% { 
            background-color: ${currentColor}06;
          }
        }
        
        .security-glow-1 {
          animation: subtleGlow1 3s ease-in-out infinite;
        }
        
        .security-glow-2 {
          animation: subtleGlow2 3.5s ease-in-out infinite;
        }
        
        .security-glow-3 {
          animation: subtleGlow3 4s ease-in-out infinite;
        }
        
        .sidebar-background {
          animation: colorPulse 15s ease-in-out infinite;
        }
      `}</style>

      {/* Mobile Overlay */}
      {isOpen && onClose && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={onClose}
        />
      )}
      
      <aside 
        className={sidebarClasses}
        style={{
          background: `linear-gradient(180deg, 
            ${currentColor}20 0%, 
            ${currentColor}12 15%, 
            ${currentColor}08 25%, 
            ${currentColor}10 35%, 
            ${currentColor}06 45%, 
            ${currentColor}08 55%, 
            ${currentColor}10 65%, 
            ${currentColor}12 75%, 
            ${currentColor}18 85%, 
            ${currentColor}25 100%)`,
          borderRightColor: `${currentColor}40`,
          boxShadow: `2px 0 15px ${currentColor}15`,
        }}
      >
        {/* Matrix Rain Background - Behind everything */}
        <div className="absolute inset-0 overflow-hidden">
          {/* MatrixRain className="w-full h-full opacity-15" */}
        </div>
        
        {/* Animated Background Overlay */}
        <div 
          className="absolute inset-0 sidebar-background"
          style={{
            background: `radial-gradient(ellipse at center, 
              ${currentColor}08 0%, 
              transparent 50%, 
              ${currentColor}05 100%)`
          }}
        />
        
        {/* Content - Above background */}
        <div className="relative z-10 p-3 lg:p-4 h-full flex flex-col">
          {/* Mobile Close Button */}
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden absolute top-4 right-4 text-text-secondary hover:text-text-primary z-10"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          
          {/* Logo and Minimize Button */}
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <Link href="/" className="flex items-center space-x-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src="/logo.png" 
                alt="PV3 Logo" 
                className={`${isMinimized ? 'w-10' : 'w-16'} h-auto transition-all duration-300`}
              />
            </Link>
            <button
              onClick={toggleMinimized}
              className="p-1 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-all duration-200"
              title={isMinimized ? 'Expand sidebar' : 'Minimize sidebar'}
            >
              {isMinimized ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Authentication Section - Hidden when minimized */}
          {!isMinimized && (
            <div className="mb-4 px-2">
              <AuthButton />
            </div>
          )}
          
          {/* Navigation Menu */}
          <nav className={`space-y-2 flex-1 ${isMinimized ? 'space-y-1' : ''}`}>
            {navigationItems.map((item) => renderNavItem(item))}
          </nav>
          
          {/* Security & Features Showcase - Hidden when minimized */}
          {!isMinimized && (
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-text-secondary mb-3 px-2 font-audiowide">
                SECURITY & FEATURES
              </h3>
              
              {/* Optimized 4x3 Grid with smaller spacing */}
              <div className="grid grid-cols-4 gap-2 px-2">
                {/* TOP ROW - Core Security & Infrastructure */}
                <div className="group relative">
                  <div className="w-full h-12 bg-gradient-to-br from-red-500/20 to-red-600/30 border border-red-500/30 rounded-lg flex items-center justify-center cursor-pointer hover:from-red-500/30 hover:to-red-600/40 transition-all duration-200">
                    <Shield className="w-5 h-5 text-red-400 security-glow-1" />
                  </div>
                  <div className="absolute left-0 bottom-full mb-2 w-64 bg-bg-elevated border border-border rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 pointer-events-none">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-4 h-4 text-red-400" />
                      <span className="font-semibold text-red-400">Anti-Cheat Engine</span>
                      <span className="text-xs bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">ACTIVE</span>
                    </div>
                    <p className="text-xs text-text-secondary">
                      Server-side validation, bot detection, win-rate analysis, input monitoring, and replay verification for all games
                    </p>
                  </div>
                </div>

                <div className="group relative">
                  <div className="w-full h-12 bg-gradient-to-br from-orange-500/20 to-orange-600/30 border border-orange-500/30 rounded-lg flex items-center justify-center cursor-pointer hover:from-orange-500/30 hover:to-orange-600/40 transition-all duration-200">
                    <Zap className="w-5 h-5 text-orange-400 security-glow-2" />
                  </div>
                  <div className="absolute left-0 bottom-full mb-2 w-64 bg-bg-elevated border border-border rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 pointer-events-none">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-4 h-4 text-orange-400" />
                      <span className="font-semibold text-orange-400">Instant Settlement</span>
                      <span className="text-xs bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded">LIVE</span>
                    </div>
                    <p className="text-xs text-text-secondary">
                      Immediate SOL payouts upon match completion with cryptographic verification - no waiting periods
                    </p>
                  </div>
                </div>

                <div className="group relative">
                  <div className="w-full h-12 bg-gradient-to-br from-cyan-500/20 to-cyan-600/30 border border-cyan-500/30 rounded-lg flex items-center justify-center cursor-pointer hover:from-cyan-500/30 hover:to-cyan-600/40 transition-all duration-200">
                    <Trophy className="w-5 h-5 text-cyan-400 security-glow-3" />
                  </div>
                  <div className="absolute left-0 bottom-full mb-2 w-64 bg-bg-elevated border border-border rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 pointer-events-none">
                    <div className="flex items-center gap-2 mb-2">
                      <Trophy className="w-4 h-4 text-cyan-400" />
                      <span className="font-semibold text-cyan-400">Live Tournaments</span>
                      <span className="text-xs bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded">BETA</span>
                    </div>
                    <p className="text-xs text-text-secondary">
                      Single/double elimination brackets with ELO ratings, leaderboards, and automated prize distribution
                    </p>
                  </div>
                </div>

                <div className="group relative">
                  <div className="w-full h-12 bg-gradient-to-br from-indigo-500/20 to-indigo-600/30 border border-indigo-500/30 rounded-lg flex items-center justify-center cursor-pointer hover:from-indigo-500/30 hover:to-indigo-600/40 transition-all duration-200">
                    <Wallet className="w-5 h-5 text-indigo-400 security-glow-1" />
                  </div>
                  <div className="absolute left-0 bottom-full mb-2 w-64 bg-bg-elevated border border-border rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 pointer-events-none">
                    <div className="flex items-center gap-2 mb-2">
                      <Wallet className="w-4 h-4 text-indigo-400" />
                      <span className="font-semibold text-indigo-400">Session Vaults</span>
                      <span className="text-xs bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded">CORE</span>
                    </div>
                    <p className="text-xs text-text-secondary">
                      Deposit once, play multiple games seamlessly. Web2 UX with Web3 security and instant withdrawals
                    </p>
                  </div>
                </div>

                {/* SECOND ROW - Core Features */}
                <div className="group relative">
                  <div className="w-full h-12 bg-gradient-to-br from-blue-500/20 to-blue-600/30 border border-blue-500/30 rounded-lg flex items-center justify-center cursor-pointer hover:from-blue-500/30 hover:to-blue-600/40 transition-all duration-200">
                    <Key className="w-5 h-5 text-blue-400 security-glow-2" />
                  </div>
                  <div className="absolute left-0 bottom-full mb-2 w-64 bg-bg-elevated border border-border rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 pointer-events-none">
                    <div className="flex items-center gap-2 mb-2">
                      <Key className="w-4 h-4 text-blue-400" />
                      <span className="font-semibold text-blue-400">Non-Custodial PDAs</span>
                      <span className="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">CORE</span>
                    </div>
                    <p className="text-xs text-text-secondary">
                      Program Derived Addresses ensure you always own your funds - no centralized custody risks
                    </p>
                  </div>
                </div>

                <div className="group relative" onClick={() => router.push('/bankroll')}>
                  <div className="w-full h-12 bg-gradient-to-br from-orange-500/20 to-orange-600/30 border border-orange-500/30 rounded-lg flex items-center justify-center cursor-pointer hover:from-orange-500/30 hover:to-orange-600/40 transition-all duration-200">
                    <DollarSign className="w-5 h-5 text-orange-400 security-glow-3" />
                  </div>
                  <div className="absolute left-0 bottom-full mb-2 w-64 bg-bg-elevated border border-border rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 pointer-events-none">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-4 h-4 text-orange-400" />
                      <span className="font-semibold text-orange-400">Responsible Gaming</span>
                    </div>
                    <p className="text-xs text-text-secondary">
                      Set deposit limits, loss limits, session timers, and wager caps to maintain healthy gaming habits
                    </p>
                  </div>
                </div>
              
                <div className="group relative">
                  <div className="w-full h-12 bg-gradient-to-br from-purple-500/20 to-purple-600/30 border border-purple-500/30 rounded-lg flex items-center justify-center cursor-pointer hover:from-purple-500/30 hover:to-purple-600/40 transition-all duration-200">
                    <Gamepad2 className="w-5 h-5 text-purple-400 security-glow-1" />
                  </div>
                  <div className="absolute left-0 bottom-full mb-2 w-64 bg-bg-elevated border border-border rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 pointer-events-none">
                    <div className="flex items-center gap-2 mb-2">
                      <Gamepad2 className="w-4 h-4 text-purple-400" />
                      <span className="font-semibold text-purple-400">Unity 3D Games</span>
                      <span className="text-xs bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded">PREMIUM</span>
                    </div>
                    <p className="text-xs text-text-secondary">
                      High-quality 3D racing, fighting, sports games with realistic physics and immersive gameplay
                    </p>
                  </div>
                </div>

                <div className="group relative" onClick={() => router.push('/2fa')}>
                  <div className="w-full h-12 bg-gradient-to-br from-emerald-500/20 to-emerald-600/30 border border-emerald-500/30 rounded-lg flex items-center justify-center cursor-pointer hover:from-emerald-500/30 hover:to-emerald-600/40 transition-all duration-200">
                    <Shield className="w-5 h-5 text-emerald-400 security-glow-2" />
                  </div>
                  <div className="absolute left-0 bottom-full mb-2 w-64 bg-bg-elevated border border-border rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 pointer-events-none">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-4 h-4 text-emerald-400" />
                      <span className="font-semibold text-emerald-400">Vault Fortress</span>
                      <span className="text-xs bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">OPT</span>
                    </div>
                    <p className="text-xs text-text-secondary">
                      2FA security with TOTP + backup codes. Get 50% fee discount and unlimited instant withdrawals
                    </p>
                  </div>
                </div>

                {/* THIRD ROW - Advanced Features */}
                <div className="group relative">
                  <div className="w-full h-12 bg-gradient-to-br from-amber-500/20 to-amber-600/30 border border-amber-500/30 rounded-lg flex items-center justify-center cursor-pointer hover:from-amber-500/30 hover:to-amber-600/40 transition-all duration-200">
                    <CheckCircle className="w-5 h-5 text-amber-400 security-glow-3" />
                  </div>
                  <div className="absolute left-0 bottom-full mb-2 w-64 bg-bg-elevated border border-border rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 pointer-events-none">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-4 h-4 text-amber-400" />
                      <span className="font-semibold text-amber-400">Ed25519 Verification</span>
                      <span className="text-xs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">UNIQUE</span>
                    </div>
                    <p className="text-xs text-text-secondary">
                      Military-grade cryptographic signatures provide mathematical proof of every game result
                    </p>
                  </div>
                </div>

                <div className="group relative" onClick={() => router.push('/bridge')}>
                  <div className="w-full h-12 bg-gradient-to-br from-teal-500/20 to-teal-600/30 border border-teal-500/30 rounded-lg flex items-center justify-center cursor-pointer hover:from-teal-500/30 hover:to-teal-600/40 transition-all duration-200">
                    <ArrowLeftRight className="w-5 h-5 text-teal-400 security-glow-1" />
                  </div>
                  <div className="absolute left-0 bottom-full mb-2 w-64 bg-bg-elevated border border-border rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 pointer-events-none">
                    <div className="flex items-center gap-2 mb-2">
                      <ArrowLeftRight className="w-4 h-4 text-teal-400" />
                      <span className="font-semibold text-teal-400">Multi-Chain Bridge</span>
                      <span className="text-xs bg-teal-500/20 text-teal-400 px-1.5 py-0.5 rounded">NEW</span>
                    </div>
                    <p className="text-xs text-text-secondary">
                      Wormhole-powered cross-chain transfers from Ethereum, Polygon, BSC, and more to Solana
                    </p>
                  </div>
                </div>
              
                <div className="group relative">
                  <div className="w-full h-12 bg-gradient-to-br from-green-500/20 to-blue-500/30 border border-green-500/30 rounded-lg flex items-center justify-center cursor-pointer hover:from-green-500/30 hover:to-blue-500/40 transition-all duration-200 relative overflow-hidden">
                    <CreditCard className="w-5 h-5 text-green-400 security-glow-2" />
                    <div className="absolute top-0.5 right-0.5">
                      <span className="bg-green-500 text-white text-xs rounded-full w-3 h-3 flex items-center justify-center font-bold animate-pulse">
                        🔥
                      </span>
                    </div>
                  </div>
                  <div className="absolute left-0 bottom-full mb-2 w-64 bg-bg-elevated border border-border rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 pointer-events-none">
                    <div className="flex items-center gap-2 mb-2">
                      <CreditCard className="w-4 h-4 text-green-400" />
                      <span className="font-semibold text-green-400">Coinbase Commerce</span>
                      <span className="text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">PARTNER</span>
                    </div>
                    <p className="text-xs text-text-secondary">
                      Instant SOL purchases with credit cards and bank transfers - powered by Coinbase Commerce
                    </p>
                  </div>
                </div>

                <div className="group relative">
                  <div className="w-full h-12 bg-gradient-to-br from-pink-500/20 to-pink-600/30 border border-pink-500/30 rounded-lg flex items-center justify-center cursor-pointer hover:from-pink-500/30 hover:to-pink-600/40 transition-all duration-200">
                    <Code className="w-5 h-5 text-pink-400 security-glow-3" />
                  </div>
                  <div className="absolute left-0 bottom-full mb-2 w-64 bg-bg-elevated border border-border rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 pointer-events-none">
                    <div className="flex items-center gap-2 mb-2">
                      <Code className="w-4 h-4 text-pink-400" />
                      <span className="font-semibold text-pink-400">Developer SDK</span>
                      <span className="text-xs bg-pink-500/20 text-pink-400 px-1.5 py-0.5 rounded">BETA</span>
                    </div>
                    <p className="text-xs text-text-secondary">
                      Whitelisted development tools for creating verified games with built-in anti-cheat and payouts
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons - Hidden when minimized */}
          {!isMinimized && (
            <div className="space-y-2 px-2">
              <button
                onClick={handleBridgeClick}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white py-2 px-4 rounded-lg font-audiowide text-sm transition-all duration-200 flex items-center justify-center space-x-2"
              >
                <ArrowLeftRight className="w-4 h-4" />
                <span>Bridge Assets</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Bridge Modal */}
      <BridgeModal
        isOpen={showBridgeModal}
        onClose={() => setShowBridgeModal(false)}
        onSuccess={handleBridgeSuccess}
      />
    </>
  );
} 