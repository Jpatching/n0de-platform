'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { 
  Zap, 
  DollarSign, 
  TrendingUp,
  Award,
  Target
} from 'lucide-react';
import { ScrollSlideUp, ScrollStagger } from '@/components/ScrollReveal';
import { GlassCard } from '@/components/GlassmorphismCard';

const performanceData = [
  { name: 'n0de', responseTime: 8, color: '#01d3f4', requests: 60000 },
  { name: 'Helius', responseTime: 45, color: '#ff6b35', requests: 25000 },
  { name: 'QuickNode', responseTime: 120, color: '#7c3aed', requests: 15000 },
  { name: 'Alchemy', responseTime: 180, color: '#ec4899', requests: 12000 },
  { name: 'Syndica', responseTime: 95, color: '#06b6d4', requests: 18000 }
];

const costComparisonData = [
  { 
    provider: 'n0de', 
    requests: '500M Requests',
    credits: '500M Requests',
    plan: 'Enterprise',
    baseCost: 1999,
    additionalCost: 0,
    total: 1999,
    color: '#01d3f4'
  },
  { 
    provider: 'QuickNode', 
    requests: '500M Requests',
    credits: '15B Credits',
    plan: 'Business',
    baseCost: 199,
    additionalCost: 4777.50,
    total: 4976.50,
    color: '#7c3aed'
  },
  { 
    provider: 'Alchemy', 
    requests: '500M Requests',
    credits: '33B CU',
    plan: 'Scale',
    baseCost: 199,
    additionalCost: 31500,
    total: 31699,
    color: '#ec4899'
  },
  { 
    provider: 'Helius', 
    requests: '500M Requests',
    credits: '500M Credits',
    plan: 'Enterprise',
    baseCost: 2500,
    additionalCost: 2000,
    total: 4500,
    color: '#ff6b35'
  }
];

const uptimeData = [
  { name: 'n0de', uptime: 99.99, color: '#01d3f4' },
  { name: 'Helius', uptime: 99.84, color: '#ff6b35' },
  { name: 'QuickNode', uptime: 99.85, color: '#7c3aed' },
  { name: 'Alchemy', uptime: 99.80, color: '#ec4899' },
  { name: 'Syndica', uptime: 99.75, color: '#06b6d4' }
];

export default function InteractivePerformanceCharts() {
  const [activeChart, setActiveChart] = useState<'performance' | 'cost' | 'uptime'>('performance');

  const chartVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  };

  return (
    <section className="section-padding bg-gradient-to-b from-bg-elevated/30 to-transparent">
      <div className="container-width">
        <ScrollSlideUp className="text-center mb-16">
          <div className="inline-flex items-center space-x-2 bg-n0de-green/10 border border-n0de-green/20 rounded-full px-4 py-2 mb-6">
            <TrendingUp className="w-4 h-4 text-n0de-green" />
            <span className="text-n0de-green font-semibold text-sm" style={{ fontFamily: 'var(--font-display)' }}>
              PERFORMANCE BENCHMARKS
            </span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold mb-6" style={{ fontFamily: 'var(--font-display)' }}>
            See Why We&apos;re <span className="gradient-text bg-gradient-to-r from-n0de-green to-n0de-blue bg-clip-text text-transparent">
              5x Faster
            </span>
          </h2>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto leading-relaxed">
            Real performance data from independent benchmarks. No marketing fluff, just facts.
          </p>
        </ScrollSlideUp>

        {/* Chart Navigation */}
        <ScrollSlideUp delay={0.2} className="flex justify-center mb-12">
          <div className="bg-bg-elevated rounded-xl p-2 flex space-x-2">
            {[
              { key: 'performance', label: 'Response Time', icon: Zap },
              { key: 'cost', label: 'Cost Analysis', icon: DollarSign },
              { key: 'uptime', label: 'Reliability', icon: Award }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveChart(tab.key as 'performance' | 'cost' | 'uptime')}
                className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
                  activeChart === tab.key
                    ? 'bg-n0de-green text-black'
                    : 'text-text-secondary hover:text-white hover:bg-bg-hover'
                }`}
                style={{ fontFamily: 'var(--font-display)' }}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </ScrollSlideUp>

        {/* Charts Container */}
        <ScrollStagger className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          {/* Main Chart */}
          <div className="lg:col-span-2">
            <GlassCard className="p-8 h-96">
              <AnimatePresence mode="wait">
                {activeChart === 'performance' && (
                  <motion.div
                    key="performance"
                    variants={chartVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="h-full"
                  >
                    <h3 className="text-2xl font-bold mb-6 text-white" style={{ fontFamily: 'var(--font-display)' }}>
                      Average Response Time (ms)
                    </h3>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={performanceData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="name" stroke="#888" />
                        <YAxis stroke="#888" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1a1a1a', 
                            border: '1px solid #333',
                            borderRadius: '8px'
                          }}
                          formatter={(value: number) => [`${value}ms`, 'Response Time']}
                        />
                        <Bar 
                          dataKey="responseTime" 
                          fill="#01d3f4"
                          radius={[4, 4, 0, 0]}

                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </motion.div>
                )}

                {activeChart === 'cost' && (
                  <motion.div
                    key="cost"
                    variants={chartVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="h-full"
                  >
                    <h3 className="text-2xl font-bold mb-6 text-white" style={{ fontFamily: 'var(--font-display)' }}>
                      Cost for 500M Requests ($USD)
                    </h3>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={costComparisonData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="provider" stroke="#888" />
                        <YAxis stroke="#888" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1a1a1a', 
                            border: '1px solid #333',
                            borderRadius: '8px'
                          }}
                          formatter={(value: number) => [`$${value.toLocaleString()}`, 'Total Cost']}
                        />
                        <Bar 
                          dataKey="total" 
                          fill="#01d3f4"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </motion.div>
                )}

                {activeChart === 'uptime' && (
                  <motion.div
                    key="uptime"
                    variants={chartVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="h-full"
                  >
                    <h3 className="text-2xl font-bold mb-6 text-white" style={{ fontFamily: 'var(--font-display)' }}>
                      Uptime Reliability (%)
                    </h3>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={uptimeData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="name" stroke="#888" />
                        <YAxis domain={[99.5, 100]} stroke="#888" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1a1a1a', 
                            border: '1px solid #333',
                            borderRadius: '8px'
                          }}
                          formatter={(value: number) => [`${value}%`, 'Uptime']}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="uptime" 
                          stroke="#01d3f4" 
                          strokeWidth={3}
                          dot={{ fill: '#01d3f4', r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </motion.div>
                )}
              </AnimatePresence>
            </GlassCard>
          </div>

          {/* Stats Panel */}
          <div className="space-y-6">
            <GlassCard className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-n0de-green/10 rounded-xl flex items-center justify-center">
                  <Target className="w-6 h-6 text-n0de-green" />
                </div>
                <div>
                  <h3 className="font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
                    n0de Advantage
                  </h3>
                  <p className="text-text-secondary text-sm">Industry Leading</p>
                </div>
              </div>
              
              {activeChart === 'performance' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-text-secondary">Response Time</span>
                    <span className="font-bold text-n0de-green">8ms</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-secondary">vs Closest Competitor</span>
                    <span className="font-bold text-white">5.6x Faster</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-secondary">Max RPS</span>
                    <span className="font-bold text-n0de-green">60,000</span>
                  </div>
                </div>
              )}

              {activeChart === 'cost' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-text-secondary">Our Price</span>
                    <span className="font-bold text-n0de-green">$1,999</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-secondary">Savings vs Alchemy</span>
                    <span className="font-bold text-white">94% Less</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-secondary">1 Request =</span>
                    <span className="font-bold text-n0de-green">1 Request</span>
                  </div>
                </div>
              )}

              {activeChart === 'uptime' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-text-secondary">Our Uptime</span>
                    <span className="font-bold text-n0de-green">99.99%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-secondary">Downtime/Month</span>
                    <span className="font-bold text-white">4.3 minutes</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-secondary">SLA Guarantee</span>
                    <span className="font-bold text-n0de-green">99.9%</span>
                  </div>
                </div>
              )}
            </GlassCard>

            <GlassCard className="p-6">
              <h4 className="font-bold mb-4 text-white" style={{ fontFamily: 'var(--font-display)' }}>
                Why We&apos;re Different
              </h4>
              <div className="space-y-3 text-sm">
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-n0de-green rounded-full mt-2 flex-shrink-0" />
                  <span className="text-text-secondary">
                    <strong className="text-white">Hybrid Node Architecture:</strong> Best of shared and dedicated
                  </span>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-n0de-green rounded-full mt-2 flex-shrink-0" />
                  <span className="text-text-secondary">
                    <strong className="text-white">Honest Pricing:</strong> 1 request = 1 request, no hidden credits
                  </span>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-n0de-green rounded-full mt-2 flex-shrink-0" />
                  <span className="text-text-secondary">
                    <strong className="text-white">Mainnet Only:</strong> No shared resources with test networks
                  </span>
                </div>
              </div>
            </GlassCard>
          </div>
        </ScrollStagger>

        {/* Cost Comparison Table */}
        <ScrollSlideUp delay={0.4}>
          <GlassCard className="p-8">
            <h3 className="text-3xl font-bold mb-8 text-center text-white" style={{ fontFamily: 'var(--font-display)' }}>
              Honest RPC System - No Hidden Credits
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-4 px-4 font-semibold text-white">Provider</th>
                    <th className="text-left py-4 px-4 font-semibold text-white">Requests Needed</th>
                    <th className="text-left py-4 px-4 font-semibold text-white">Plan</th>
                    <th className="text-left py-4 px-4 font-semibold text-white">Base Cost</th>
                    <th className="text-left py-4 px-4 font-semibold text-white">Additional</th>
                    <th className="text-left py-4 px-4 font-semibold text-white">Total Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {costComparisonData.map((item, index) => (
                    <motion.tr 
                      key={item.provider}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`border-b border-border/50 ${item.provider === 'n0de' ? 'bg-n0de-green/5' : ''}`}
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-3">
                          {item.provider === 'n0de' && (
                            <div className="w-3 h-3 bg-n0de-green rounded-full" />
                          )}
                          <span className={`font-semibold ${item.provider === 'n0de' ? 'text-n0de-green' : 'text-white'}`}>
                            {item.provider}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-text-secondary">{item.credits}</td>
                      <td className="py-4 px-4 text-text-secondary">{item.plan}</td>
                      <td className="py-4 px-4 text-white">${item.baseCost.toLocaleString()}</td>
                      <td className="py-4 px-4 text-text-secondary">${item.additionalCost.toLocaleString()}</td>
                      <td className="py-4 px-4">
                        <span className={`font-bold text-xl ${item.provider === 'n0de' ? 'text-n0de-green' : 'text-white'}`}>
                          ${item.total.toLocaleString()}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-8 text-center">
              <p className="text-text-secondary">
                *Comparison based on public pricing as of January 2025. n0de saves you up to 94% vs competitors.
              </p>
            </div>
          </GlassCard>
        </ScrollSlideUp>
      </div>
    </section>
  );
}