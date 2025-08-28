'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import PageHeader from '@/components/PageHeader';
import WalletStatus from '@/components/WalletStatus';
import { usePV3 } from '@/hooks/usePV3';

export default function EarnPage() {
  const router = useRouter();
  const { 
    connected, 
    balance,
    vaultBalance, 
    loading, 
    formatSOL 
  } = usePV3();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Earning opportunities
  const earnOptions = [
    {
      id: 'developer-hub',
      title: 'Developer Hub',
      description: 'Build verified games with built-in anti-cheat and automated payouts',
      icon: '👨‍💻',
      gradient: 'from-pink-500 to-rose-600',
      route: '/developer-hub',
      features: ['Game SDK', 'Anti-cheat integration', 'Revenue sharing', 'Whitelisted tools'],
      earnings: 'Up to 70% revenue share',
      difficulty: 'Advanced'
    },
    {
      id: 'rewards',
      title: 'Rewards Program',
      description: 'Earn tokens and bonuses through gameplay, referrals, and community participation',
      icon: '🎁',
      gradient: 'from-green-500 to-emerald-600',
      route: '/rewards',
      features: ['Play-to-earn', 'Referral bonuses', 'Daily rewards', 'Loyalty program'],
      earnings: '5-15% bonus rewards',
      difficulty: 'Beginner'
    },
    {
      id: 'partnership',
      title: 'Partnership Program',
      description: 'Partner with PV3 for exclusive opportunities and revenue sharing',
      icon: '🤝',
      gradient: 'from-blue-500 to-indigo-600',
      route: '/partnership',
      features: ['Revenue sharing', 'Co-marketing', 'Exclusive access', 'Custom integration'],
      earnings: 'Negotiable terms',
      difficulty: 'Professional'
    },
  ];

  const handleOptionClick = (route: string) => {
    router.push(route as any);
  };

  // Earning info slider
  const earnSlides = [
    {
      title: 'Multiple Ways to Earn',
      description: 'From playing games to building them - opportunities for everyone',
      icon: '💸',
      gradient: 'from-green-500/20 to-emerald-600/20',
    },
    {
      title: 'Developer Opportunities',
      description: 'Build games on our platform and earn revenue share',
      icon: '🛠️',
      gradient: 'from-pink-500/20 to-rose-600/20',
    },
    {
      title: 'Play-to-Earn Rewards',
      description: 'Earn bonuses and tokens just by playing your favorite games',
      icon: '🎮',
      gradient: 'from-blue-500/20 to-purple-600/20',
    },
    {
      title: 'Partnership Benefits',
      description: 'Join our ecosystem and grow together with exclusive partnerships',
      icon: '🤝',
      gradient: 'from-indigo-500/20 to-blue-600/20',
    },
    {
      title: 'Community Rewards',
      description: 'Active community members earn special bonuses and recognition',
      icon: '👥',
      gradient: 'from-yellow-500/20 to-orange-600/20',
    },
  ];

  const [earnSlide, setEarnSlide] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setEarnSlide((prev) => (prev + 1) % earnSlides.length);
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
            {/* Earn Header */}
            <div className="mb-2">
              <h1 className="text-3xl font-bold font-audiowide mb-1">💸 Earn</h1>
              <p className="text-text-secondary font-inter mb-2">
                Discover multiple ways to earn with PV3 - from playing to building
              </p>
            </div>

            {/* Earning info slider */}
            <div className="relative mb-6 overflow-hidden rounded-xl">
              <div 
                className="flex transition-transform duration-700 ease-in-out"
                style={{ transform: `translateX(-${earnSlide * 100}%)` }}
              >
                {earnSlides.map((slide, idx) => (
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
                {earnSlides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setEarnSlide(idx)}
                    className={`w-3 h-3 rounded-full transition-all ${
                      idx === earnSlide
                        ? 'bg-accent-primary'
                        : 'bg-text-muted hover:bg-text-secondary'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Earning Opportunities Grid */}
            <div className="mb-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {earnOptions.map((option) => (
                  <div
                    key={option.id}
                    className="glass-card p-6 rounded-xl hover:scale-105 transition-all duration-300 cursor-pointer group"
                    onClick={() => handleOptionClick(option.route)}
                  >
                    <div className={`w-16 h-16 rounded-xl bg-gradient-to-r ${option.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                      <span className="text-2xl">{option.icon}</span>
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
                      
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-xs text-text-muted font-inter font-semibold">
                            Potential Earnings:
                          </div>
                          <div className="text-sm text-accent-primary font-semibold">
                            {option.earnings}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-text-muted font-inter font-semibold">
                            Difficulty:
                          </div>
                          <div className={`text-sm font-semibold ${
                            option.difficulty === 'Beginner' ? 'text-green-400' :
                            option.difficulty === 'Advanced' ? 'text-yellow-400' :
                            'text-red-400'
                          }`}>
                            {option.difficulty}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className={`w-full py-2 px-4 rounded-lg bg-gradient-to-r ${option.gradient} text-white text-center font-audiowide text-sm group-hover:shadow-lg transition-all duration-300`}>
                      Explore {option.title}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Earning Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="glass-card p-6 rounded-xl text-center">
                <div className="text-3xl mb-2">🎮</div>
                <h3 className="text-lg font-bold font-audiowide mb-1">Play & Earn</h3>
                <p className="text-text-secondary text-sm font-inter">
                  Earn rewards just by playing your favorite games
                </p>
              </div>
              
              <div className="glass-card p-6 rounded-xl text-center">
                <div className="text-3xl mb-2">🛠️</div>
                <h3 className="text-lg font-bold font-audiowide mb-1">Build & Profit</h3>
                <p className="text-text-secondary text-sm font-inter">
                  Create games and earn revenue share from players
                </p>
              </div>
              
              <div className="glass-card p-6 rounded-xl text-center">
                <div className="text-3xl mb-2">🤝</div>
                <h3 className="text-lg font-bold font-audiowide mb-1">Partner & Grow</h3>
                <p className="text-text-secondary text-sm font-inter">
                  Join our ecosystem for exclusive partnership benefits
                </p>
              </div>

              <div className="glass-card p-6 rounded-xl text-center">
                <div className="text-3xl mb-2">👥</div>
                <h3 className="text-lg font-bold font-audiowide mb-1">Refer & Bonus</h3>
                <p className="text-text-secondary text-sm font-inter">
                  Invite friends and earn bonuses on their gameplay
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
} 