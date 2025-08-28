'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import Sidebar from '@/components/Sidebar';
import PageHeader from '@/components/PageHeader';
import { BridgeModal } from '@/components/Bridge/BridgeModal';
import Image from 'next/image';

export default function BridgePage() {
  const { connected } = useWallet();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showBridgeModal, setShowBridgeModal] = useState(false);

  const handleBridgeClick = () => {
    if (!connected) {
      alert('Please connect your wallet first!');
      return;
    }
    setShowBridgeModal(true);
  };

  const handleBridgeSuccess = (amount: string) => {
    setShowBridgeModal(false);
  };

  return (
    <div className="min-h-screen bg-main text-text-primary">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="lg:ml-56 min-h-screen">
        <PageHeader onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="p-6">
          <div className="max-w-6xl mx-auto">
            
            {/* Hero Section */}
            <div className="text-center mb-12">
              <div className="relative inline-block mb-6">
                <div className="text-8xl mb-4 relative">
                  <span className="relative z-10">🌉</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-xl"></div>
                </div>
              </div>
              <h1 className="text-5xl font-bold text-text-primary mb-4 font-audiowide uppercase bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Multi-Chain Bridge
              </h1>
              <p className="text-xl text-text-secondary max-w-3xl mx-auto font-inter mb-8">
                Seamlessly transfer assets from any blockchain to Solana. Powered by Wormhole technology 
                for instant, secure, and decentralized cross-chain transactions.
              </p>
              
              {/* Status Badge */}
              <div className="inline-flex items-center space-x-2 bg-blue-500/10 border border-blue-500/30 rounded-full px-4 py-2 mb-8">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-blue-300 font-medium text-sm">Bridge Online • 99.9% Uptime</span>
              </div>
            </div>

            {/* Main Bridge Interface */}
            <div className="grid lg:grid-cols-3 gap-8 mb-12">
              
              {/* Bridge Card */}
              <div className="lg:col-span-2">
                <div className="glass-card p-8 relative overflow-hidden">
                  {/* Animated Background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5"></div>
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                  
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-bold font-audiowide">Bridge Assets</h2>
                      <div className="flex items-center space-x-2 text-sm text-text-secondary">
                        <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M10,17L6,13L7.41,11.59L10,14.17L16.59,7.58L18,9L10,17Z"/>
                        </svg>
                        <span>Secured by Wormhole</span>
                      </div>
                    </div>

                    {/* Bridge Action */}
                    <div className="text-center py-12">
                      <div className="mb-6">
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                          </svg>
                        </div>
                        <h3 className="text-xl font-bold text-text-primary mb-2 font-audiowide">Ready to Bridge</h3>
                        <p className="text-text-secondary font-inter">
                          Connect your wallet and start bridging assets from any supported blockchain
                        </p>
                      </div>

                      <button
                        onClick={handleBridgeClick}
                        disabled={!connected}
                        className={`px-8 py-4 rounded-lg font-medium font-audiowide text-lg transition-all ${
                          connected
                            ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl'
                            : 'bg-bg-card border border-border text-text-muted cursor-not-allowed'
                        }`}
                      >
                        {connected ? '🌉 Open Bridge Interface' : '🔒 Connect Wallet First'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Info Panel */}
              <div className="space-y-6">
                
                {/* Supported Networks */}
                <div className="glass-card p-6">
                  <h3 className="text-lg font-bold text-text-primary mb-4 font-audiowide">Supported Networks</h3>
                  <div className="space-y-3">
                    {[
                      { name: 'Ethereum', logo: '/logos/ethereum.png', color: 'text-blue-400' },
                      { name: 'Polygon', logo: '/logos/polygon.png', color: 'text-purple-400' },
                      { name: 'BSC', logo: '/logos/bsc.png', color: 'text-yellow-400' },
                      { name: 'Avalanche', icon: '🔺', color: 'text-red-400' },
                      { name: 'Arbitrum', icon: '🔷', color: 'text-blue-300' },
                      { name: 'Base', logo: '/logos/base.png', color: 'text-red-300' },
                    ].map((network) => (
                      <div key={network.name} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-bg-hover transition-colors">
                        {network.logo ? (
                          <Image src={network.logo} alt={network.name} width={20} height={20} />
                        ) : (
                          <span className={`text-lg ${network.color}`}>{network.icon}</span>
                        )}
                        <span className="text-text-primary font-medium">{network.name}</span>
                        <div className="ml-auto w-2 h-2 bg-green-400 rounded-full"></div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bridge Stats */}
                <div className="glass-card p-6">
                  <h3 className="text-lg font-bold text-text-primary mb-4 font-audiowide">Bridge Statistics</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Total Volume</span>
                      <span className="text-text-primary font-bold">$2.4M</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Transactions</span>
                      <span className="text-text-primary font-bold">8,432</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Avg. Time</span>
                      <span className="text-text-primary font-bold">~2 min</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Success Rate</span>
                      <span className="text-green-400 font-bold">99.8%</span>
                    </div>
                  </div>
                </div>

                {/* Security Notice */}
                <div className="glass-card p-6 border-l-4 border-green-500">
                  <div className="flex items-start space-x-3">
                    <svg className="w-5 h-5 text-green-400 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M10,17L6,13L7.41,11.59L10,14.17L16.59,7.58L18,9L10,17Z"/>
                    </svg>
                    <div>
                      <h4 className="text-text-primary font-bold mb-1">Secure & Audited</h4>
                      <p className="text-xs text-text-secondary">
                        Powered by Wormhole&apos;s battle-tested infrastructure. All transactions are cryptographically verified.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* How It Works */}
            <div className="glass-card p-8 mb-12">
              <h2 className="text-2xl font-bold text-text-primary mb-8 text-center font-audiowide">How Bridge Works</h2>
              <div className="grid md:grid-cols-3 gap-8">
                {[
                  {
                    step: '1',
                    title: 'Select Source Chain',
                    description: 'Choose the blockchain where your assets currently reside',
                    icon: '🔗'
                  },
                  {
                    step: '2',
                    title: 'Lock & Verify',
                    description: 'Assets are locked on source chain and verified by Wormhole guardians',
                    icon: '🔒'
                  },
                  {
                    step: '3',
                    title: 'Mint on Solana',
                    description: 'Wrapped assets are minted on Solana and sent to your wallet',
                    icon: '✨'
                  }
                ].map((step) => (
                  <div key={step.step} className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">{step.icon}</span>
                    </div>
                    <div className="w-8 h-8 bg-accent-primary rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-black font-bold font-audiowide">{step.step}</span>
                    </div>
                    <h3 className="text-lg font-bold text-text-primary mb-2 font-audiowide">{step.title}</h3>
                    <p className="text-text-secondary text-sm font-inter">{step.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* FAQ Section */}
            <div className="glass-card p-8">
              <h2 className="text-2xl font-bold text-text-primary mb-6 font-audiowide">Frequently Asked Questions</h2>
              <div className="grid md:grid-cols-2 gap-6">
                {[
                  {
                    q: 'How long does bridging take?',
                    a: 'Most transactions complete within 2-5 minutes, depending on network congestion.'
                  },
                  {
                    q: 'What are the fees?',
                    a: 'Bridge fees vary by network but typically range from $5-20 depending on gas costs.'
                  },
                  {
                    q: 'Is bridging secure?',
                    a: 'Yes, powered by Wormhole which has secured over $30B in cross-chain value.'
                  },
                  {
                    q: 'Can I bridge back to other chains?',
                    a: 'Yes, you can bridge assets back to their original chains or to other supported networks.'
                  }
                ].map((faq, index) => (
                  <div key={index} className="p-4 bg-bg-card rounded-lg">
                    <h4 className="text-text-primary font-bold mb-2 font-audiowide">{faq.q}</h4>
                    <p className="text-text-secondary text-sm font-inter">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </main>
      </div>

      {/* Bridge Modal */}
      <BridgeModal
        isOpen={showBridgeModal}
        onClose={() => setShowBridgeModal(false)}
        onSuccess={handleBridgeSuccess}
      />
    </div>
  );
} 