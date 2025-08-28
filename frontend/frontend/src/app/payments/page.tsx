'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Sidebar from '@/components/Sidebar';
import OptimizedImage from '@/components/ui/OptimizedImage';
import PageHeader from '@/components/PageHeader';
import WalletStatus from '@/components/WalletStatus';
import { usePV3 } from '@/hooks/usePV3';

export default function PaymentsPage() {
  const router = useRouter();
  const { 
    connected, 
    balance,
    vaultBalance, 
    loading, 
    formatSOL,
    loadBalance,
    loadWalletBalance
  } = usePV3();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Payment options
  const paymentOptions = [
    {
      id: 'bridge',
      title: 'Multi-Chain Bridge',
      description: 'Transfer assets from Ethereum, Polygon, BSC, and more to Solana using Wormhole',
      icon: '🌉',
      logo: '/logos/wormhole.png',
      gradient: 'from-teal-500 to-cyan-600',
      route: '/bridge',
      features: ['Cross-chain transfers', 'Wormhole powered', 'Multiple networks', 'Secure & fast'],
      supportedChains: ['Ethereum', 'Polygon', 'BSC', 'Avalanche']
    },
    {
      id: 'coinbase-pay',
      title: 'Coinbase Commerce',
      description: 'Buy SOL instantly with credit cards and bank transfers - powered by Coinbase',
      icon: '💰',
      logo: '/logos/Coinbase.png',
      gradient: 'from-blue-500 to-indigo-600',
      route: '/coinbase-pay',
      features: ['Credit card payments', 'Bank transfers', 'Instant SOL', 'Coinbase powered'],
      supportedMethods: ['Visa', 'Mastercard', 'Bank Transfer', 'Apple Pay']
    },
    {
      id: 'wallets',
      title: 'Wallet Connections',
      description: 'Connect your favorite crypto wallets to deposit and play directly from your holdings',
      icon: '👛',
      gradient: 'from-purple-500 to-violet-600',
      route: '#wallets',
      features: ['Direct wallet deposits', 'Multiple wallet support', 'Instant transfers', 'Secure connections'],
      supportedWallets: [
        { name: 'Phantom', logo: '/logos/phantom.png' },
        { name: 'Solflare', logo: '/logos/solflare.png' },
        { name: 'MetaMask', icon: '🦊' },
        { name: 'Coinbase Wallet', logo: '/logos/Coinbase.png' }
      ]
    },
  ];

  const handleOptionClick = (route: string) => {
    if (route === '#wallets') {
      // Scroll to wallets section
      const walletsSection = document.getElementById('wallets');
      if (walletsSection) {
        walletsSection.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      router.push(route);
    }
  };

  // Payment info slider
  const paymentSlides = [
    {
      title: 'Seamless Payments',
      description: 'Multiple ways to fund your gaming vault with ease',
      icon: '💳',
      gradient: 'from-blue-500/20 to-purple-600/20',
    },
    {
      title: 'Cross-Chain Bridge',
      description: 'Bring assets from any major blockchain to Solana',
      icon: '🌉',
      gradient: 'from-teal-500/20 to-cyan-600/20',
    },
    {
      title: 'Fiat On-Ramp',
      description: 'Buy SOL directly with your credit card or bank account',
      icon: '🏦',
      gradient: 'from-green-500/20 to-emerald-600/20',
    },
    {
      title: 'Wallet Connections',
      description: 'Connect Phantom, MetaMask, and other wallets for instant deposits',
      icon: '👛',
      gradient: 'from-purple-500/20 to-violet-600/20',
    },
    {
      title: 'Instant Deposits',
      description: 'Start playing immediately with fast payment processing',
      icon: '⚡',
      gradient: 'from-yellow-500/20 to-orange-600/20',
    },
    {
      title: 'Secure Transactions',
      description: 'Bank-grade security for all your payment transactions',
      icon: '🔒',
      gradient: 'from-purple-500/20 to-pink-600/20',
    },
  ];

  const [paymentSlide, setPaymentSlide] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setPaymentSlide((prev) => (prev + 1) % paymentSlides.length);
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
            {/* Payments Header */}
            <div className="mb-2">
              <h1 className="text-3xl font-bold font-audiowide mb-1">💳 Payments</h1>
              <p className="text-text-secondary font-inter mb-2">
                Fund your gaming vault with multiple payment options
              </p>
            </div>

            {/* Payment info slider */}
            <div className="relative mb-6 overflow-hidden rounded-xl">
              <div 
                className="flex transition-transform duration-700 ease-in-out"
                style={{ transform: `translateX(-${paymentSlide * 100}%)` }}
              >
                {paymentSlides.map((slide, idx) => (
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
                {paymentSlides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setPaymentSlide(idx)}
                    className={`w-3 h-3 rounded-full transition-all ${
                      idx === paymentSlide
                        ? 'bg-accent-primary'
                        : 'bg-text-muted hover:bg-text-secondary'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Current Wallet Status */}
            {connected && (
              <div className="mb-6 glass-card p-6 rounded-xl">
                <h3 className="text-lg font-bold font-audiowide mb-4">💰 Current Wallet Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-bg-elevated p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-sm text-text-secondary">Wallet Balance</div>
                      <button
                        onClick={loadWalletBalance}
                        disabled={loading}
                        className="text-xs bg-accent-primary/20 hover:bg-accent-primary/30 text-accent-primary px-2 py-1 rounded transition-colors disabled:opacity-50"
                        title="Refresh balance"
                      >
                        {loading ? '🔄' : '↻'}
                      </button>
                    </div>
                    <div className="text-xl font-bold text-text-primary">{formatSOL(balance)} SOL</div>
                  </div>
                  <div className="bg-bg-elevated p-4 rounded-lg">
                    <div className="text-sm text-text-secondary mb-1">Vault Balance</div>
                    <div className="text-xl font-bold text-text-primary">{formatSOL(vaultBalance)} SOL</div>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Options Grid */}
            <div className="mb-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {paymentOptions.map((option) => (
                  <div
                    key={option.id}
                    className="glass-card p-6 rounded-xl hover:scale-105 transition-all duration-300 cursor-pointer group"
                    onClick={() => handleOptionClick(option.route)}
                  >
                    <div className={`w-16 h-16 rounded-xl bg-gradient-to-r ${option.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 relative`}>
                      {option.logo ? (
                        <>
                          <span className="text-2xl absolute">{option.icon}</span>
                          <div className="absolute bottom-0 right-0 w-6 h-6 bg-white rounded-full flex items-center justify-center">
                            <Image src={option.logo} alt={option.title} width={16} height={16} />
                          </div>
                        </>
                      ) : (
                        <span className="text-2xl">{option.icon}</span>
                      )}
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
                      
                      <div>
                        <div className="text-xs text-text-muted font-inter font-semibold mb-1">
                          {option.id === 'bridge' ? 'Supported Chains:' : 
                           option.id === 'wallets' ? 'Supported Wallets:' : 'Payment Methods:'}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {(option.supportedChains || option.supportedMethods || option.supportedWallets)?.map((item, idx) => (
                            <span key={idx} className="text-xs bg-accent-primary/20 px-2 py-1 rounded text-accent-primary">
                              {typeof item === 'string' ? item : item.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className={`w-full py-2 px-4 rounded-lg bg-gradient-to-r ${option.gradient} text-white text-center font-audiowide text-sm group-hover:shadow-lg transition-all duration-300`}>
                      {option.id === 'wallets' ? 'Connect Wallet' : `Use ${option.title}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Wallets Section */}
            <div id="wallets" className="mb-8">
              <h2 className="text-2xl font-bold font-audiowide mb-4">👛 Wallet Connections</h2>
              <div className="glass-card p-6 rounded-xl">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Wallet Info */}
                  <div>
                    <h3 className="text-xl font-bold font-audiowide mb-3 text-text-primary">
                      Connect Your Crypto Wallet
                    </h3>
                    <p className="text-text-secondary font-inter mb-4">
                      Connect your favorite crypto wallet to deposit SOL directly from your existing holdings. 
                      No need to buy new crypto - use what you already have!
                    </p>
                    
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">🔗</span>
                        <div>
                          <div className="font-semibold text-text-primary">Direct Deposits</div>
                          <div className="text-sm text-text-secondary">Transfer SOL directly from your wallet to your gaming vault</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">⚡</span>
                        <div>
                          <div className="font-semibold text-text-primary">Instant Transfers</div>
                          <div className="text-sm text-text-secondary">Start playing immediately after connecting your wallet</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">🔒</span>
                        <div>
                          <div className="font-semibold text-text-primary">Secure Connection</div>
                          <div className="text-sm text-text-secondary">Your private keys never leave your wallet</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Supported Wallets */}
                  <div>
                    <h3 className="text-xl font-bold font-audiowide mb-3 text-text-primary">
                      Supported Wallets
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-bg-elevated p-4 rounded-lg text-center hover:bg-bg-hover transition-colors">
                        <div className="flex justify-center mb-2">
                          <OptimizedImage src="/logos/phantom.png" alt="Phantom" width={32} height={32} />
                        </div>
                        <div className="font-semibold text-text-primary">Phantom</div>
                        <div className="text-xs text-text-secondary">Most popular Solana wallet</div>
                      </div>
                      
                      <div className="bg-bg-elevated p-4 rounded-lg text-center hover:bg-bg-hover transition-colors">
                        <div className="text-2xl mb-2">🦊</div>
                        <div className="font-semibold text-text-primary">MetaMask</div>
                        <div className="text-xs text-text-secondary">Multi-chain support</div>
                      </div>
                      
                      <div className="bg-bg-elevated p-4 rounded-lg text-center hover:bg-bg-hover transition-colors">
                        <div className="flex justify-center mb-2">
                          <OptimizedImage src="/logos/solflare.png" alt="Solflare" width={32} height={32} />
                        </div>
                        <div className="font-semibold text-text-primary">Solflare</div>
                        <div className="text-xs text-text-secondary">Native Solana wallet</div>
                      </div>
                      
                      <div className="bg-bg-elevated p-4 rounded-lg text-center hover:bg-bg-hover transition-colors">
                        <div className="flex justify-center mb-2">
                          <OptimizedImage src="/logos/Coinbase.png" alt="Coinbase Wallet" width={32} height={32} />
                        </div>
                        <div className="font-semibold text-text-primary">Coinbase Wallet</div>
                        <div className="text-xs text-text-secondary">Self-custody wallet</div>
                      </div>
                    </div>
                    
                    <div className="mt-4 p-3 bg-accent-primary/10 rounded-lg border border-accent-primary/20">
                      <div className="text-sm font-semibold text-accent-primary mb-1">
                        💡 Pro Tip
                      </div>
                      <div className="text-xs text-text-secondary">
                        For the best experience on Solana, we recommend using Phantom or Solflare wallets. 
                        They offer the fastest transactions and lowest fees.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Security Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glass-card p-6 rounded-xl text-center">
                <div className="text-3xl mb-2">🔒</div>
                <h3 className="text-lg font-bold font-audiowide mb-1">Bank-Grade Security</h3>
                <p className="text-text-secondary text-sm font-inter">
                  All transactions protected with enterprise-level encryption
                </p>
              </div>
              
              <div className="glass-card p-6 rounded-xl text-center">
                <div className="text-3xl mb-2">⚡</div>
                <h3 className="text-lg font-bold font-audiowide mb-1">Instant Processing</h3>
                <p className="text-text-secondary text-sm font-inter">
                  Fast payment processing to get you gaming immediately
                </p>
              </div>
              
              <div className="glass-card p-6 rounded-xl text-center">
                <div className="text-3xl mb-2">🛡️</div>
                <h3 className="text-lg font-bold font-audiowide mb-1">Non-Custodial</h3>
                <p className="text-text-secondary text-sm font-inter">
                  Your funds go directly to your vault - we never hold them
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
} 