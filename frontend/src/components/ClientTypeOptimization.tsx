'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bot, 
  Coins, 
  Wallet, 
  BarChart3, 
  Shuffle, 
  Image, 
  Gamepad2, 
 
  Building, 
  Cpu, 
  Zap,
  Clock,
  TrendingUp,
  Shield,
  Activity
} from 'lucide-react';
import { ScrollSlideUp, ScrollStagger } from '@/components/ScrollReveal';
import { GlassCard } from '@/components/GlassmorphismCard';

const clientTypes = [
  {
    id: 'mev-bots',
    title: 'MEV Bots',
    icon: Bot,
    description: 'Ultra-low latency, lightning-fast mempool access, unlimited rate limits.',
    features: [
      'Sub-10ms response times',
      'Priority mempool access',
      'Unlimited burst traffic',
      'Staked connections for 99.9% landing rates',
      'Direct validator connections'
    ],
    specs: {
      latency: '6ms',
      rps: 'Unlimited',
      uptime: '99.99%',
      regions: 'Frankfurt, Amsterdam'
    },
    gradient: 'from-red-500 to-orange-500',
    bgGradient: 'from-red-500/10 to-orange-500/10'
  },
  {
    id: 'defi-protocols',
    title: 'DeFi Protocols',
    icon: Coins,
    description: 'Fast reads, stable performance, optimized for DeFi operations.',
    features: [
      'Consistent 8ms response times',
      'High-throughput transaction processing',
      'Advanced WebSocket streams',
      'Real-time price feed integration',
      'Arbitrage-optimized routing'
    ],
    specs: {
      latency: '8ms',
      rps: '50,000',
      uptime: '99.99%',
      regions: 'Global'
    },
    gradient: 'from-green-500 to-emerald-500',
    bgGradient: 'from-green-500/10 to-emerald-500/10'
  },
  {
    id: 'wallets',
    title: 'Wallet Applications',
    icon: Wallet,
    description: 'Fast balance lookups, low error rates, optimized for user experience.',
    features: [
      'Instant balance updates',
      'Transaction status tracking',
      'Multi-account monitoring',
      'Push notification support',
      'Mobile-optimized endpoints'
    ],
    specs: {
      latency: '12ms',
      rps: '25,000',
      uptime: '99.9%',
      regions: 'Global'
    },
    gradient: 'from-blue-500 to-cyan-500',
    bgGradient: 'from-blue-500/10 to-cyan-500/10'
  },
  {
    id: 'analytics',
    title: 'Analytics & Indexers',
    icon: BarChart3,
    description: 'High throughput, historical data access, bulk operations.',
    features: [
      'Batch request processing',
      'Historical data archives',
      'Custom data pipelines',
      'Real-time indexing',
      'Export capabilities'
    ],
    specs: {
      latency: '15ms',
      rps: '100,000',
      uptime: '99.9%',
      regions: 'Global'
    },
    gradient: 'from-purple-500 to-violet-500',
    bgGradient: 'from-purple-500/10 to-violet-500/10'
  },
  {
    id: 'bridges',
    title: 'Cross-Chain Bridges',
    icon: Shuffle,
    description: 'Maximum accuracy, guaranteed uptime, fast finality confirmation.',
    features: [
      'Transaction finality guarantees',
      'Cross-chain state synchronization',
      'Validator consensus tracking',
      'Fraud-proof generation',
      'Emergency pause capabilities'
    ],
    specs: {
      latency: '10ms',
      rps: '15,000',
      uptime: '99.99%',
      regions: 'Multi-region'
    },
    gradient: 'from-indigo-500 to-purple-500',
    bgGradient: 'from-indigo-500/10 to-purple-500/10'
  },
  {
    id: 'nft-platforms',
    title: 'NFT Platforms',
    icon: Image,
    description: 'Metadata fetching, batch reads, stable throughput for collections.',
    features: [
      'Bulk metadata processing',
      'Collection floor tracking',
      'Marketplace integration',
      'Royalty calculation',
      'Rarity analysis support'
    ],
    specs: {
      latency: '18ms',
      rps: '30,000',
      uptime: '99.9%',
      regions: 'Global'
    },
    gradient: 'from-pink-500 to-rose-500',
    bgGradient: 'from-pink-500/10 to-rose-500/10'
  },
  {
    id: 'gamefi',
    title: 'GameFi Applications',
    icon: Gamepad2,
    description: 'High-volume read queries, indexed access, real-time game state.',
    features: [
      'Game state synchronization',
      'Leaderboard updates',
      'Asset transfer tracking',
      'Tournament management',
      'Reward distribution'
    ],
    specs: {
      latency: '14ms',
      rps: '40,000',
      uptime: '99.9%',
      regions: 'Global'
    },
    gradient: 'from-yellow-500 to-orange-500',
    bgGradient: 'from-yellow-500/10 to-orange-500/10'
  },
  {
    id: 'enterprise',
    title: 'Enterprise Solutions',
    icon: Building,
    description: 'Custom SLAs, dedicated support, compliance-ready infrastructure.',
    features: [
      'SOC 2 Type II compliance',
      'Dedicated account management',
      'Custom rate limits',
      'White-label solutions',
      'Priority support channels'
    ],
    specs: {
      latency: 'Custom',
      rps: 'Unlimited',
      uptime: '99.99%',
      regions: 'Dedicated'
    },
    gradient: 'from-gray-500 to-slate-500',
    bgGradient: 'from-gray-500/10 to-slate-500/10'
  }
];

export default function ClientTypeOptimization() {
  const [selectedClient, setSelectedClient] = useState(clientTypes[0]);
  const [hoveredClient, setHoveredClient] = useState<string | null>(null);

  return (
    <section className="section-padding bg-gradient-to-b from-transparent to-bg-elevated/30">
      <div className="container-width">
        <ScrollSlideUp className="text-center mb-16">
          <div className="inline-flex items-center space-x-2 bg-n0de-blue/10 border border-n0de-blue/20 rounded-full px-4 py-2 mb-6">
            <Cpu className="w-4 h-4 text-n0de-blue" />
            <span className="text-n0de-blue font-semibold text-sm" style={{ fontFamily: 'var(--font-display)' }}>
              OPTIMIZED FOR YOUR USE CASE
            </span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold mb-6" style={{ fontFamily: 'var(--font-display)' }}>
            Endpoint Optimization by <span className="gradient-text bg-gradient-to-r from-n0de-blue to-n0de-purple bg-clip-text text-transparent">
              Client Type
            </span>
          </h2>
          <p className="text-xl text-text-secondary max-w-4xl mx-auto leading-relaxed">
            Every application has unique requirements. Our hybrid node architecture automatically optimizes 
            performance based on your specific use case and traffic patterns.
          </p>
        </ScrollSlideUp>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Client Type Selector */}
          <ScrollStagger className="lg:col-span-1">
            <div className="space-y-3">
              {clientTypes.map((client, index) => (
                <motion.div
                  key={client.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`cursor-pointer transition-all duration-300 ${
                    selectedClient.id === client.id ? 'scale-105' : 'hover:scale-102'
                  }`}
                  onClick={() => setSelectedClient(client)}
                  onMouseEnter={() => setHoveredClient(client.id)}
                  onMouseLeave={() => setHoveredClient(null)}
                >
                  <GlassCard 
                    className={`p-4 border-2 transition-all duration-300 ${
                      selectedClient.id === client.id 
                        ? 'border-n0de-green bg-n0de-green/5' 
                        : hoveredClient === client.id
                        ? 'border-n0de-green/50'
                        : 'border-transparent'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-r ${client.bgGradient}`}>
                        <client.icon className={`w-6 h-6 bg-gradient-to-r ${client.gradient} bg-clip-text text-transparent`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-white" style={{ fontFamily: 'var(--font-display)' }}>
                          {client.title}
                        </h3>
                        <p className="text-text-secondary text-sm line-clamp-1">
                          {client.description}
                        </p>
                      </div>
                      {selectedClient.id === client.id && (
                        <div className="w-3 h-3 bg-n0de-green rounded-full animate-pulse" />
                      )}
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </ScrollStagger>

          {/* Selected Client Details */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedClient.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <GlassCard className="p-8 h-full">
                  {/* Header */}
                  <div className="flex items-start space-x-4 mb-8">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center bg-gradient-to-r ${selectedClient.bgGradient}`}>
                      <selectedClient.icon className={`w-8 h-8 bg-gradient-to-r ${selectedClient.gradient} bg-clip-text text-transparent`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-display)' }}>
                        {selectedClient.title}
                      </h3>
                      <p className="text-text-secondary text-lg leading-relaxed">
                        {selectedClient.description}
                      </p>
                    </div>
                  </div>

                  {/* Performance Specs */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {[
                      { label: 'Latency', value: selectedClient.specs.latency, icon: Clock },
                      { label: 'Max RPS', value: selectedClient.specs.rps, icon: TrendingUp },
                      { label: 'Uptime', value: selectedClient.specs.uptime, icon: Shield },
                      { label: 'Regions', value: selectedClient.specs.regions, icon: Activity }
                    ].map((spec, index) => (
                      <motion.div
                        key={spec.label}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-bg-elevated/50 rounded-xl p-4 text-center"
                      >
                        <spec.icon className="w-6 h-6 text-n0de-green mx-auto mb-2" />
                        <div className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
                          {spec.value}
                        </div>
                        <div className="text-text-secondary text-sm">{spec.label}</div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Features */}
                  <div>
                    <h4 className="text-xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-display)' }}>
                      Optimized Features
                    </h4>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {selectedClient.features.map((feature, index) => (
                        <motion.div
                          key={feature}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-center space-x-3"
                        >
                          <div className="w-2 h-2 bg-n0de-green rounded-full flex-shrink-0" />
                          <span className="text-text-secondary">{feature}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="mt-8 pt-6 border-t border-border">
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="font-semibold text-white mb-1">Ready to optimize for {selectedClient.title}?</h5>
                        <p className="text-text-secondary text-sm">Get started with our tailored configuration</p>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="bg-gradient-to-r from-n0de-green to-n0de-blue text-black font-semibold px-6 py-3 rounded-lg hover:shadow-lg transition-all duration-300 flex items-center space-x-2"
                        style={{ fontFamily: 'var(--font-display)' }}
                      >
                        <Zap className="w-4 h-4" />
                        <span>Get Started</span>
                      </motion.button>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Bottom CTA */}
        <ScrollSlideUp delay={0.6} className="text-center mt-16">
          <GlassCard className="p-8 bg-gradient-to-r from-n0de-green/5 via-transparent to-n0de-blue/5">
            <h3 className="text-2xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-display)' }}>
              Don&apos;t see your use case?
            </h3>
            <p className="text-text-secondary mb-6 max-w-2xl mx-auto">
              Our Solana-native engineers can create custom optimizations for any application. 
              From high-frequency trading to enterprise integrations, we&apos;ve got you covered.
            </p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-gradient-to-r from-n0de-green to-n0de-blue text-black font-bold px-8 py-4 rounded-xl hover:shadow-xl transition-all duration-300"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Contact Our Engineers
            </motion.button>
          </GlassCard>
        </ScrollSlideUp>
      </div>
    </section>
  );
}