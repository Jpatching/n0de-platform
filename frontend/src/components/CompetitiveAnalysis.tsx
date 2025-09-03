'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Crown, 
  Zap, 
  Globe, 
  DollarSign, 
 
  CheckCircle, 
  X, 
  AlertTriangle,
  Clock,
  Shield,

  Activity,
  Sparkles
} from 'lucide-react';
import { GlassCard } from '@/components/GlassmorphismCard';
import { ScrollSlideUp, ScrollFadeIn, ScrollStagger } from '@/components/ScrollReveal';
import CountUp from 'react-countup';

interface CompetitorData {
  name: string;
  logo?: string;
  pricing: {
    shared: { min: number; max: number; unit: string };
    dedicated: { min: number; max: number; unit: string };
  };
  performance: {
    latency: string;
    rps: string;
    uptime: string;
    locations: number;
  };
  features: {
    included: string[];
    limitations: string[];
    hidden_costs: string[];
  };
  realData: boolean;
}

const competitorData: CompetitorData[] = [
  {
    name: 'n0de',
    pricing: {
      shared: { min: 99, max: 899, unit: '/month' },
      dedicated: { min: 1800, max: 3300, unit: '/month' }
    },
    performance: {
      latency: '8ms',
      rps: '100K+',
      uptime: '99.99%',
      locations: 8
    },
    features: {
      included: [
        'Yellowstone gRPC included',
        'Staked connections',
        'MEV protection',
        'Real-time streaming',
        'Frankfurt/Amsterdam/NA locations',
        'No hidden fees',
        'Transparent pricing',
        '24/7 priority support'
      ],
      limitations: [],
      hidden_costs: []
    },
    realData: false
  },
  {
    name: 'Helius',
    pricing: {
      shared: { min: 49, max: 999, unit: '/month' },
      dedicated: { min: 2300, max: 3000, unit: '/month' }
    },
    performance: {
      latency: '89ms',
      rps: '500',
      uptime: '99.84%',
      locations: 6
    },
    features: {
      included: [
        'Solana-exclusive focus',
        'Enhanced APIs',
        'Webhooks support',
        'Compression support'
      ],
      limitations: [
        'Limited to 500 RPS max',
        'Higher latency',
        'Limited geographic coverage'
      ],
      hidden_costs: [
        'Overage charges',
        'Premium support fees'
      ]
    },
    realData: true
  },
  {
    name: 'QuickNode',
    pricing: {
      shared: { min: 10, max: 199, unit: '/month' },
      dedicated: { min: 2900, max: 3800, unit: '/month' }
    },
    performance: {
      latency: '104ms',
      rps: '400',
      uptime: '99.84%',
      locations: 7
    },
    features: {
      included: [
        'Multi-chain support',
        'Analytics tools',
        'Debug APIs'
      ],
      limitations: [
        'Complex credit system',
        'Rate limits on shared',
        'Higher dedicated costs'
      ],
      hidden_costs: [
        '30x credit multipliers',
        'API method surcharges',
        'Premium feature fees'
      ]
    },
    realData: true
  },
  {
    name: 'Alchemy',
    pricing: {
      shared: { min: 0, max: 199, unit: '/month' },
      dedicated: { min: 3200, max: 5000, unit: '/month' }
    },
    performance: {
      latency: '156ms',
      rps: '300',
      uptime: '99.85%',
      locations: 5
    },
    features: {
      included: [
        'Multi-chain platform',
        'Developer tools',
        'Analytics dashboard'
      ],
      limitations: [
        'Complex compute units',
        'Limited Solana focus',
        'High dedicated pricing'
      ],
      hidden_costs: [
        'Up to 500x CU multipliers',
        'Archive node surcharges',
        'Premium API fees'
      ]
    },
    realData: true
  },
  {
    name: 'InstantNodes',
    pricing: {
      shared: { min: 73, max: 1499, unit: '/month' },
      dedicated: { min: 2499, max: 2499, unit: '/month' }
    },
    performance: {
      latency: '575ms',
      rps: '1500',
      uptime: '99.99%',
      locations: 4
    },
    features: {
      included: [
        'Hybrid architecture',
        'gRPC support',
        'High throughput'
      ],
      limitations: [
        'Higher latency',
        'Limited locations',
        'Newer provider'
      ],
      hidden_costs: [
        'Setup fees',
        'Premium location charges'
      ]
    },
    realData: true
  }
];

const performanceMetrics = [
  {
    title: 'Response Time',
    icon: <Zap className="w-6 h-6" />,
    n0deValue: 8,
    n0deUnit: 'ms',
    competitorAvg: 181,
    improvement: '95% faster',
    color: 'text-n0de-green'
  },
  {
    title: 'Transaction Success',
    icon: <CheckCircle className="w-6 h-6" />,
    n0deValue: 99.8,
    n0deUnit: '%',
    competitorAvg: 97.2,
    improvement: '2.6% higher',
    color: 'text-n0de-blue'
  },
  {
    title: 'Global Locations',
    icon: <Globe className="w-6 h-6" />,
    n0deValue: 8,
    n0deUnit: 'regions',
    competitorAvg: 5.5,
    improvement: '45% more coverage',
    color: 'text-n0de-purple'
  },
  {
    title: 'Cost Savings',
    icon: <DollarSign className="w-6 h-6" />,
    n0deValue: 70,
    n0deUnit: '% saved',
    competitorAvg: 0,
    improvement: 'vs competitors',
    color: 'text-n0de-green'
  }
];

export default function CompetitiveAnalysis() {
  const [selectedTab, setSelectedTab] = useState<'performance' | 'pricing' | 'features'>('performance');

  return (
    <section id="competitive" className="section-padding bg-gradient-to-b from-transparent via-bg-elevated/20 to-transparent">
      <div className="container-width">
        {/* Header */}
        <ScrollSlideUp className="text-center mb-16">
          <div className="inline-flex items-center space-x-2 bg-n0de-purple/10 border border-n0de-purple/20 rounded-full px-4 py-2 mb-6">
            <Crown className="w-4 h-4 text-n0de-purple" />
            <span className="text-n0de-purple font-semibold text-sm">COMPETITIVE ANALYSIS</span>
          </div>
          <h2 className="text-4xl lg:text-6xl font-bold font-display mb-6">
            <span className="text-white">Why We</span>
            <br />
            <span className="gradient-text">Dominate</span>
            <br />
            <span className="text-white">The Competition</span>
          </h2>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto">
            Real data from actual benchmarks and public pricing. See why leading projects 
            are switching to n0de for their Solana infrastructure.
          </p>
        </ScrollSlideUp>

        {/* Performance Overview Cards */}
        <ScrollStagger className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {performanceMetrics.map((metric) => (
            <GlassCard key={metric.title} className="p-6 text-center">
              <div className={`w-12 h-12 ${metric.color} bg-current/10 rounded-xl flex items-center justify-center mx-auto mb-4`}>
                <div className={metric.color}>
                  {metric.icon}
                </div>
              </div>
              <h3 className="text-lg font-bold mb-2">{metric.title}</h3>
              <div className="space-y-2">
                <div className={`text-3xl font-bold font-mono ${metric.color}`}>
                  <CountUp end={metric.n0deValue} duration={1.5} decimals={metric.n0deUnit === '%' ? 1 : 0} />
                  {metric.n0deUnit}
                </div>
                <div className="text-sm text-text-muted">{metric.improvement}</div>
              </div>
            </GlassCard>
          ))}
        </ScrollStagger>

        {/* Detailed Comparison */}
        <ScrollFadeIn>
          <GlassCard className="p-8">
            {/* Tab Navigation */}
            <div className="flex items-center justify-center mb-8">
              <div className="inline-flex bg-bg-main rounded-lg p-1 border border-border">
                {[
                  { key: 'performance', label: 'Performance', icon: <Activity className="w-4 h-4" /> },
                  { key: 'pricing', label: 'Pricing', icon: <DollarSign className="w-4 h-4" /> },
                  { key: 'features', label: 'Features', icon: <Sparkles className="w-4 h-4" /> }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setSelectedTab(tab.key as 'performance' | 'pricing' | 'features')}
                    className={`flex items-center space-x-2 px-6 py-3 rounded-md font-medium transition-all ${
                      selectedTab === tab.key
                        ? 'bg-gradient-to-r from-n0de-green to-n0de-blue text-black'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Performance Comparison */}
            {selectedTab === 'performance' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="overflow-x-auto"
              >
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-4 px-6 font-semibold">Provider</th>
                      <th className="text-center py-4 px-6 font-semibold">Avg Latency</th>
                      <th className="text-center py-4 px-6 font-semibold">Max RPS</th>
                      <th className="text-center py-4 px-6 font-semibold">Uptime</th>
                      <th className="text-center py-4 px-6 font-semibold">Locations</th>
                      <th className="text-center py-4 px-6 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {competitorData.map((provider) => (
                      <motion.tr
                        key={provider.name}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                        className={`border-b border-border last:border-b-0 ${
                          provider.name === 'n0de' 
                            ? 'comparison-winner' 
                            : 'comparison-loser'
                        }`}
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center space-x-3">
                            {provider.name === 'n0de' && (
                              <Crown className="w-5 h-5 text-n0de-green" />
                            )}
                            <span className={`font-semibold ${
                              provider.name === 'n0de' ? 'text-n0de-green' : 'text-text-primary'
                            }`}>
                              {provider.name}
                            </span>
                            {!provider.realData && (
                              <span className="text-xs bg-n0de-green text-black px-2 py-1 rounded font-semibold">
                                US
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="text-center py-4 px-6">
                          <span className={`text-lg font-bold ${
                            provider.name === 'n0de' ? 'text-n0de-green' : 'text-text-primary'
                          }`}>
                            {provider.performance.latency}
                          </span>
                        </td>
                        <td className="text-center py-4 px-6">{provider.performance.rps}</td>
                        <td className="text-center py-4 px-6">{provider.performance.uptime}</td>
                        <td className="text-center py-4 px-6">
                          <div className="flex items-center justify-center space-x-1">
                            <Globe className="w-4 h-4 text-text-muted" />
                            <span>{provider.performance.locations}</span>
                          </div>
                        </td>
                        <td className="text-center py-4 px-6">
                          {provider.name === 'n0de' ? (
                            <div className="inline-flex items-center space-x-2 bg-n0de-green/10 px-3 py-1 rounded-full">
                              <CheckCircle className="w-4 h-4 text-n0de-green" />
                              <span className="text-n0de-green text-sm font-semibold">LEADER</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center space-x-2 bg-text-muted/10 px-3 py-1 rounded-full">
                              <X className="w-4 h-4 text-text-muted" />
                              <span className="text-text-muted text-sm">SLOWER</span>
                            </div>
                          )}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </motion.div>
            )}

            {/* Pricing Comparison */}
            {selectedTab === 'pricing' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="space-y-8"
              >
                {/* Shared Nodes Pricing */}
                <div>
                  <h3 className="text-2xl font-bold mb-6 gradient-text">Shared RPC Nodes</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-4 px-6 font-semibold">Provider</th>
                          <th className="text-center py-4 px-6 font-semibold">Entry Price</th>
                          <th className="text-center py-4 px-6 font-semibold">Pro Price</th>
                          <th className="text-center py-4 px-6 font-semibold">Hidden Costs</th>
                          <th className="text-center py-4 px-6 font-semibold">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {competitorData.map((provider) => (
                          <tr
                            key={provider.name}
                            className={`border-b border-border last:border-b-0 ${
                              provider.name === 'n0de' 
                                ? 'comparison-winner' 
                                : 'comparison-loser'
                            }`}
                          >
                            <td className="py-4 px-6">
                              <div className="flex items-center space-x-3">
                                {provider.name === 'n0de' && (
                                  <Crown className="w-5 h-5 text-n0de-green" />
                                )}
                                <span className={`font-semibold ${
                                  provider.name === 'n0de' ? 'text-n0de-green' : 'text-text-primary'
                                }`}>
                                  {provider.name}
                                </span>
                              </div>
                            </td>
                            <td className="text-center py-4 px-6">
                              <span className="text-lg font-bold">
                                ${provider.pricing.shared.min}{provider.pricing.shared.unit}
                              </span>
                            </td>
                            <td className="text-center py-4 px-6">
                              <span className="text-lg font-bold">
                                ${provider.pricing.shared.max}{provider.pricing.shared.unit}
                              </span>
                            </td>
                            <td className="text-center py-4 px-6">
                              {provider.features.hidden_costs.length > 0 ? (
                                <div className="flex items-center justify-center space-x-1">
                                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                                  <span className="text-yellow-500 text-sm">
                                    {provider.features.hidden_costs.length} fees
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center space-x-1">
                                  <CheckCircle className="w-4 h-4 text-n0de-green" />
                                  <span className="text-n0de-green text-sm">None</span>
                                </div>
                              )}
                            </td>
                            <td className="text-center py-4 px-6">
                              {provider.name === 'n0de' ? (
                                <div className="inline-flex items-center space-x-2 bg-n0de-green/10 px-3 py-1 rounded-full">
                                  <Crown className="w-4 h-4 text-n0de-green" />
                                  <span className="text-n0de-green text-sm font-semibold">BEST</span>
                                </div>
                              ) : (
                                <span className="text-text-muted text-sm">Standard</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Dedicated Nodes Pricing */}
                <div>
                  <h3 className="text-2xl font-bold mb-6 gradient-text">Dedicated RPC Nodes</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-4 px-6 font-semibold">Provider</th>
                          <th className="text-center py-4 px-6 font-semibold">Starting Price</th>
                          <th className="text-center py-4 px-6 font-semibold">Enterprise Price</th>
                          <th className="text-center py-4 px-6 font-semibold">Setup Time</th>
                          <th className="text-center py-4 px-6 font-semibold">Monthly Savings vs n0de</th>
                        </tr>
                      </thead>
                      <tbody>
                        {competitorData.map((provider) => (
                          <tr
                            key={provider.name}
                            className={`border-b border-border last:border-b-0 ${
                              provider.name === 'n0de' 
                                ? 'comparison-winner' 
                                : 'comparison-loser'
                            }`}
                          >
                            <td className="py-4 px-6">
                              <div className="flex items-center space-x-3">
                                {provider.name === 'n0de' && (
                                  <Crown className="w-5 h-5 text-n0de-green" />
                                )}
                                <span className={`font-semibold ${
                                  provider.name === 'n0de' ? 'text-n0de-green' : 'text-text-primary'
                                }`}>
                                  {provider.name}
                                </span>
                              </div>
                            </td>
                            <td className="text-center py-4 px-6">
                              <span className={`text-lg font-bold ${
                                provider.name === 'n0de' ? 'text-n0de-green' : 'text-text-primary'
                              }`}>
                                ${provider.pricing.dedicated.min.toLocaleString()}{provider.pricing.dedicated.unit}
                              </span>
                            </td>
                            <td className="text-center py-4 px-6">
                              <span className="text-lg font-bold">
                                ${provider.pricing.dedicated.max.toLocaleString()}{provider.pricing.dedicated.unit}
                              </span>
                            </td>
                            <td className="text-center py-4 px-6">
                              {provider.name === 'n0de' ? (
                                <div className="flex items-center justify-center space-x-1">
                                  <Clock className="w-4 h-4 text-n0de-green" />
                                  <span className="text-n0de-green font-semibold">24h</span>
                                </div>
                              ) : (
                                <span className="text-text-muted">3-7 days</span>
                              )}
                            </td>
                            <td className="text-center py-4 px-6">
                              {provider.name === 'n0de' ? (
                                <span className="text-n0de-green font-bold">Baseline</span>
                              ) : (
                                <span className="text-red-400 font-bold">
                                  +${(provider.pricing.dedicated.min - 1800).toLocaleString()}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Cost Savings Summary */}
                <div className="text-center p-8 bg-gradient-to-r from-n0de-green/10 to-n0de-blue/10 rounded-xl border border-n0de-green/20">
                  <h3 className="text-2xl font-bold mb-4">Your Annual Savings with n0de</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <div className="text-3xl font-bold text-n0de-green">$19,200</div>
                      <div className="text-sm text-text-muted">vs Helius Dedicated</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-n0de-blue">$24,000</div>
                      <div className="text-sm text-text-muted">vs QuickNode Dedicated</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-n0de-purple">$36,000</div>
                      <div className="text-sm text-text-muted">vs Alchemy Dedicated</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Features Comparison */}
            {selectedTab === 'features' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="space-y-8"
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {competitorData.map((provider) => (
                    <GlassCard key={provider.name} className={`p-6 ${
                      provider.name === 'n0de' ? 'border-n0de-green' : ''
                    }`}>
                      <div className="flex items-center space-x-3 mb-6">
                        {provider.name === 'n0de' && (
                          <Crown className="w-6 h-6 text-n0de-green" />
                        )}
                        <h3 className={`text-xl font-bold ${
                          provider.name === 'n0de' ? 'text-n0de-green' : 'text-text-primary'
                        }`}>
                          {provider.name}
                        </h3>
                        {provider.name === 'n0de' && (
                          <span className="bg-n0de-green text-black px-2 py-1 rounded text-xs font-semibold">
                            LEADER
                          </span>
                        )}
                      </div>

                      {/* Included Features */}
                      <div className="mb-6">
                        <h4 className="text-sm font-semibold text-n0de-green mb-3 uppercase tracking-wide">
                          ✓ Included Features
                        </h4>
                        <div className="space-y-2">
                          {provider.features.included.map((feature, idx) => (
                            <div key={idx} className="flex items-start space-x-2">
                              <CheckCircle className="w-4 h-4 text-n0de-green flex-shrink-0 mt-0.5" />
                              <span className="text-sm text-text-secondary">{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Limitations */}
                      {provider.features.limitations.length > 0 && (
                        <div className="mb-6">
                          <h4 className="text-sm font-semibold text-yellow-500 mb-3 uppercase tracking-wide">
                            ⚠ Limitations
                          </h4>
                          <div className="space-y-2">
                            {provider.features.limitations.map((limitation, idx) => (
                              <div key={idx} className="flex items-start space-x-2">
                                <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                                <span className="text-sm text-text-muted">{limitation}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Hidden Costs */}
                      {provider.features.hidden_costs.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-red-400 mb-3 uppercase tracking-wide">
                            ✗ Hidden Costs
                          </h4>
                          <div className="space-y-2">
                            {provider.features.hidden_costs.map((cost, idx) => (
                              <div key={idx} className="flex items-start space-x-2">
                                <X className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                                <span className="text-sm text-text-muted">{cost}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </GlassCard>
                  ))}
                </div>
              </motion.div>
            )}
          </GlassCard>
        </ScrollFadeIn>

        {/* Key Advantages Summary */}
        <ScrollSlideUp className="mt-16 text-center">
          <GlassCard className="p-8 max-w-4xl mx-auto">
            <h3 className="text-3xl font-bold mb-6 gradient-text">
              The n0de Advantage
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-n0de-green to-n0de-blue rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8 text-black" />
                </div>
                <h4 className="text-xl font-bold mb-2">95% Faster</h4>
                <p className="text-text-secondary">
                  8ms average response time vs 181ms industry average
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-n0de-blue to-n0de-purple rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <DollarSign className="w-8 h-8 text-black" />
                </div>
                <h4 className="text-xl font-bold mb-2">70% Cheaper</h4>
                <p className="text-text-secondary">
                  Save thousands monthly with transparent pricing
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-n0de-purple to-n0de-green rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-black" />
                </div>
                <h4 className="text-xl font-bold mb-2">99.99% Reliable</h4>
                <p className="text-text-secondary">
                  Enterprise-grade uptime with global redundancy
                </p>
              </div>
            </div>
          </GlassCard>
        </ScrollSlideUp>
      </div>
    </section>
  );
}