'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import PageHeader from '@/components/PageHeader';
import WalletStatus from '@/components/WalletStatus';
import { usePV3 } from '@/hooks/usePV3';

export default function SettingsPage() {
  const router = useRouter();
  const { 
    connected, 
    balance,
    vaultBalance, 
    loading, 
    formatSOL 
  } = usePV3();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Settings categories
  const settingsOptions = [
    {
      id: '2fa',
      title: '2FA Security',
      description: 'Enable two-factor authentication for enhanced vault security and fee discounts',
      icon: '🔐',
      gradient: 'from-emerald-500 to-green-600',
      route: '/2fa',
      features: ['TOTP authentication', 'Backup codes', '50% fee discount', 'Unlimited withdrawals'],
      status: 'Optional',
      priority: 'High'
    },
    {
      id: 'security-features',
      title: 'Security & Features',
      description: 'Explore all security features and platform capabilities',
      icon: '🛡️',
      gradient: 'from-blue-500 to-indigo-600',
      route: '/security-features',
      features: ['Anti-cheat engine', 'Vault fortress', 'Ed25519 verification', 'Non-custodial PDAs'],
      status: 'Active',
      priority: 'Core'
    },
    {
      id: 'bankroll',
      title: 'Bankroll Management',
      description: 'Set deposit limits, loss limits, and responsible gaming controls',
      icon: '💰',
      gradient: 'from-orange-500 to-red-600',
      route: '/bankroll',
      features: ['Deposit limits', 'Loss limits', 'Session timers', 'Wager caps'],
      status: 'Recommended',
      priority: 'Important'
    },
  ];

  const handleOptionClick = (route: string) => {
    router.push(route);
  };

  // Settings info slider
  const settingsSlides = [
    {
      title: 'Secure Your Account',
      description: 'Multiple layers of security to protect your gaming vault',
      icon: '🔒',
      gradient: 'from-emerald-500/20 to-green-600/20',
    },
    {
      title: 'Two-Factor Authentication',
      description: 'Add an extra layer of security and get 50% fee discounts',
      icon: '🔐',
      gradient: 'from-blue-500/20 to-indigo-600/20',
    },
    {
      title: 'Responsible Gaming',
      description: 'Set limits and controls to maintain healthy gaming habits',
      icon: '⚖️',
      gradient: 'from-orange-500/20 to-red-600/20',
    },
    {
      title: 'Advanced Security',
      description: 'Military-grade encryption and anti-cheat protection',
      icon: '🛡️',
      gradient: 'from-purple-500/20 to-pink-600/20',
    },
    {
      title: 'Complete Control',
      description: 'Customize your gaming experience with powerful settings',
      icon: '⚙️',
      gradient: 'from-indigo-500/20 to-blue-600/20',
    },
  ];

  const [settingsSlide, setSettingsSlide] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setSettingsSlide((prev) => (prev + 1) % settingsSlides.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-main text-text-primary">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="lg:ml-64 min-h-screen">
        <PageHeader onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="p-6">
          <div className="w-full">
            {/* Settings Header */}
            <div className="mb-2">
              <h1 className="text-3xl font-bold font-audiowide mb-1">⚙️ Settings</h1>
              <p className="text-text-secondary font-inter mb-2">
                Configure your account security and gaming preferences
              </p>
            </div>

            {/* Settings info slider */}
            <div className="relative mb-6 overflow-hidden rounded-xl">
              <div 
                className="flex transition-transform duration-700 ease-in-out"
                style={{ transform: `translateX(-${settingsSlide * 100}%)` }}
              >
                {settingsSlides.map((slide, idx) => (
                  <div
                    key={idx}
                    className={`w-full flex-shrink-0 glass-card p-8 bg-gradient-to-r ${slide.gradient}`}
                  >
                    <div className="flex items-center">
                      <div className="flex-1 flex items-center">
                        <span className="text-5xl mr-6">{slide.icon}</span>
                        <div>
                          <h2 className="text-2xl font-bold text-text-primary mb-2 font-audiowide uppercase">
                            {slide.title}
                          </h2>
                          <p className="text-text-secondary text-xl font-inter">
                            {slide.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                {settingsSlides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSettingsSlide(idx)}
                    className={`w-3 h-3 rounded-full transition-all ${
                      idx === settingsSlide
                        ? 'bg-accent-primary'
                        : 'bg-text-muted hover:bg-text-secondary'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Account Status */}
            {connected && (
              <div className="mb-6 glass-card p-6 rounded-xl">
                <h3 className="text-lg font-bold font-audiowide mb-4">🔐 Account Security Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-bg-elevated p-4 rounded-lg">
                    <div className="text-sm text-text-secondary mb-1">Wallet Connected</div>
                    <div className="text-lg font-bold text-green-400">✅ Active</div>
                  </div>
                  <div className="bg-bg-elevated p-4 rounded-lg">
                    <div className="text-sm text-text-secondary mb-1">2FA Status</div>
                    <div className="text-lg font-bold text-yellow-400">⚠️ Not Enabled</div>
                  </div>
                  <div className="bg-bg-elevated p-4 rounded-lg">
                    <div className="text-sm text-text-secondary mb-1">Vault Balance</div>
                    <div className="text-lg font-bold text-text-primary">{formatSOL(vaultBalance)} SOL</div>
                  </div>
                </div>
              </div>
            )}

            {/* Settings Options Grid */}
            <div className="mb-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {settingsOptions.map((option) => (
                  <div
                    key={option.id}
                    className="glass-card p-6 rounded-xl hover:scale-105 transition-all duration-300 cursor-pointer group"
                    onClick={() => handleOptionClick(option.route)}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className={`w-16 h-16 rounded-xl bg-gradient-to-r ${option.gradient} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                        <span className="text-2xl">{option.icon}</span>
                      </div>
                      <div className="text-right">
                        <div className={`text-xs px-2 py-1 rounded font-semibold ${
                          option.status === 'Active' ? 'bg-green-500/20 text-green-400' :
                          option.status === 'Optional' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-blue-500/20 text-blue-400'
                        }`}>
                          {option.status}
                        </div>
                        <div className={`text-xs mt-1 px-2 py-1 rounded font-semibold ${
                          option.priority === 'High' ? 'bg-red-500/20 text-red-400' :
                          option.priority === 'Important' ? 'bg-orange-500/20 text-orange-400' :
                          'bg-purple-500/20 text-purple-400'
                        }`}>
                          {option.priority}
                        </div>
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-bold font-audiowide mb-2 text-text-primary">
                      {option.title}
                    </h3>
                    
                    <p className="text-text-secondary text-sm mb-4 font-inter">
                      {option.description}
                    </p>
                    
                    <div className="space-y-3 mb-4">
                      <div>
                        <div className="text-xs text-text-muted font-inter font-semibold mb-1">
                          Features:
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {option.features.map((feature, idx) => (
                            <span key={idx} className="text-xs bg-bg-elevated px-2 py-1 rounded text-text-secondary">
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className={`w-full py-2 px-4 rounded-lg bg-gradient-to-r ${option.gradient} text-white text-center font-audiowide text-sm group-hover:shadow-lg transition-all duration-300`}>
                      Configure {option.title}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Security Benefits */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="glass-card p-6 rounded-xl text-center">
                <div className="text-3xl mb-2">🔐</div>
                <h3 className="text-lg font-bold font-audiowide mb-1">2FA Protection</h3>
                <p className="text-text-secondary text-sm font-inter">
                  Add two-factor authentication for maximum security
                </p>
              </div>
              
              <div className="glass-card p-6 rounded-xl text-center">
                <div className="text-3xl mb-2">💰</div>
                <h3 className="text-lg font-bold font-audiowide mb-1">Smart Limits</h3>
                <p className="text-text-secondary text-sm font-inter">
                  Set responsible gaming limits to stay in control
                </p>
              </div>
              
              <div className="glass-card p-6 rounded-xl text-center">
                <div className="text-3xl mb-2">🛡️</div>
                <h3 className="text-lg font-bold font-audiowide mb-1">Advanced Security</h3>
                <p className="text-text-secondary text-sm font-inter">
                  Military-grade encryption protects your assets
                </p>
              </div>

              <div className="glass-card p-6 rounded-xl text-center">
                <div className="text-3xl mb-2">⚙️</div>
                <h3 className="text-lg font-bold font-audiowide mb-1">Full Control</h3>
                <p className="text-text-secondary text-sm font-inter">
                  Customize every aspect of your gaming experience
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
