'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  Globe, 
  Activity, 
  Users, 
  Clock, 
  TrendingUp, 
  CheckCircle,
  Layers,
  Network,
  Cpu,
  BarChart3
} from 'lucide-react';
import { ScrollSlideUp } from '@/components/ScrollReveal';
import { GlassCard } from '@/components/GlassmorphismCard';

const technicalFeatures = [
  {
    id: 'hybrid-architecture',
    title: 'Hybrid Node Architecture',
    subtitle: 'Best of Both Worlds',
    description: 'Our revolutionary hybrid architecture combines the cost-effectiveness of shared nodes with the performance of dedicated infrastructure.',
    icon: Layers,
    gradient: 'from-n0de-green to-green-400',
    features: [
      'Shared resources for cost optimization',
      'Dedicated paths for critical operations',
      'Automatic load balancing',
      'Zero-downtime failover',
      'Custom resource allocation'
    ],
    stats: [
      { label: 'Cost Reduction', value: '70%' },
      { label: 'Performance Gain', value: '5x' },
      { label: 'Uptime', value: '99.99%' }
    ]
  },
  {
    id: 'grpc-geyser',
    title: 'gRPC Geyser Streaming',
    subtitle: 'Ultra-Low Latency Data',
    description: 'Our advanced gRPC Geyser implementation provides the fastest real-time blockchain data streaming available on Solana.',
    icon: Activity,
    gradient: 'from-n0de-blue to-blue-400',
    features: [
      'Sub-millisecond data propagation',
      'Bi-directional streaming',
      'Custom filter capabilities',
      'Historical data replay',
      'Multi-region redundancy'
    ],
    stats: [
      { label: 'Latency', value: '0.8ms' },
      { label: 'Throughput', value: '1M/s' },
      { label: 'Reliability', value: '99.9%' }
    ]
  },
  {
    id: 'staked-connections',
    title: 'Staked Connections',
    subtitle: 'Maximum Transaction Success',
    description: 'Our staked validator connections ensure the highest transaction landing rates in the industry, critical for MEV and trading applications.',
    icon: TrendingUp,
    gradient: 'from-n0de-purple to-purple-400',
    features: [
      'Direct validator relationships',
      'Priority transaction routing',
      'Guaranteed slot inclusion',
      'MEV-optimized pathways',
      'Real-time success tracking'
    ],
    stats: [
      { label: 'Landing Rate', value: '99.9%' },
      { label: 'Confirmation', value: '<400ms' },
      { label: 'Success Rate', value: '99.8%' }
    ]
  },
  {
    id: 'enterprise-grade',
    title: 'Enterprise Infrastructure',
    subtitle: 'SOC 2 Compliant',
    description: 'Built for enterprise with SOC 2 Type II compliance, dedicated support, and custom SLAs that guarantee performance.',
    icon: Shield,
    gradient: 'from-orange-500 to-red-500',
    features: [
      'SOC 2 Type II certified',
      '24/7 Solana-native engineers',
      'Custom SLA guarantees',
      'Dedicated account management',
      'Priority support channels'
    ],
    stats: [
      { label: 'Support Response', value: '<5min' },
      { label: 'Engineer Availability', value: '24/7' },
      { label: 'SLA Compliance', value: '100%' }
    ]
  }
];

const supportMetrics = [
  {
    metric: 'Average Response Time',
    value: '4.2 minutes',
    description: 'Fastest support in the industry',
    icon: Clock
  },
  {
    metric: 'Engineer Availability',
    value: '24/7/365',
    description: 'Solana-native engineers always online',
    icon: Users
  },
  {
    metric: 'Issue Resolution',
    value: '< 30 minutes',
    description: 'Critical issues resolved rapidly',
    icon: CheckCircle
  },
  {
    metric: 'Customer Satisfaction',
    value: '98.5%',
    description: 'Industry-leading satisfaction scores',
    icon: BarChart3
  }
];

export default function TechnicalFeatures() {
  const [activeFeature, setActiveFeature] = useState(technicalFeatures[0]);
  const [hoveredMetric, setHoveredMetric] = useState<string | null>(null);

  return (
    <section className="section-padding bg-gradient-to-b from-transparent to-bg-elevated/30">
      <div className="container-width">
        <ScrollSlideUp className="text-center mb-16">
          <div className="inline-flex items-center space-x-2 bg-n0de-green/10 border border-n0de-green/20 rounded-full px-4 py-2 mb-6">
            <Cpu className="w-4 h-4 text-n0de-green" />
            <span className="text-n0de-green font-semibold text-sm" style={{ fontFamily: 'var(--font-display)' }}>
              TECHNICAL EXCELLENCE
            </span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold mb-6" style={{ fontFamily: 'var(--font-display)' }}>
            Enterprise-Grade <span className="gradient-text bg-gradient-to-r from-n0de-green to-n0de-blue bg-clip-text text-transparent">
              Infrastructure
            </span>
          </h2>
          <p className="text-xl text-text-secondary max-w-4xl mx-auto leading-relaxed">
            Built by Solana-native engineers with enterprise-grade reliability, 
            advanced streaming capabilities, and the industry&apos;s best support team.
          </p>
        </ScrollSlideUp>

        {/* Feature Tabs */}
        <ScrollSlideUp delay={0.2} className="flex flex-wrap justify-center gap-4 mb-12">
          {technicalFeatures.map((feature) => (
            <button
              key={feature.id}
              onClick={() => setActiveFeature(feature)}
              className={`flex items-center space-x-3 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                activeFeature.id === feature.id
                  ? 'bg-n0de-green text-black shadow-lg'
                  : 'bg-bg-elevated text-text-secondary hover:text-white hover:bg-bg-hover'
              }`}
              style={{ fontFamily: 'var(--font-display)' }}
            >
              <feature.icon className="w-5 h-5" />
              <span>{feature.title}</span>
            </button>
          ))}
        </ScrollSlideUp>

        {/* Active Feature Display */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          <ScrollSlideUp delay={0.4}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeFeature.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <GlassCard className="p-8 h-full">
                  <div className="flex items-start space-x-4 mb-6">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center bg-gradient-to-r ${activeFeature.gradient} bg-opacity-10`}>
                      <activeFeature.icon className={`w-8 h-8 bg-gradient-to-r ${activeFeature.gradient} bg-clip-text text-transparent`} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                        {activeFeature.title}
                      </h3>
                      <p className="text-n0de-green font-semibold">{activeFeature.subtitle}</p>
                    </div>
                  </div>
                  
                  <p className="text-text-secondary text-lg leading-relaxed mb-8">
                    {activeFeature.description}
                  </p>

                  <div className="space-y-3">
                    <h4 className="font-semibold text-white mb-4">Key Capabilities:</h4>
                    {activeFeature.features.map((feature, index) => (
                      <motion.div
                        key={feature}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center space-x-3"
                      >
                        <CheckCircle className="w-5 h-5 text-n0de-green flex-shrink-0" />
                        <span className="text-text-secondary">{feature}</span>
                      </motion.div>
                    ))}
                  </div>
                </GlassCard>
              </motion.div>
            </AnimatePresence>
          </ScrollSlideUp>

          <ScrollSlideUp delay={0.6}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeFeature.id + '-stats'}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Performance Stats */}
                <GlassCard className="p-6">
                  <h4 className="text-xl font-bold text-white mb-6" style={{ fontFamily: 'var(--font-display)' }}>
                    Performance Metrics
                  </h4>
                  <div className="grid grid-cols-1 gap-4">
                    {activeFeature.stats.map((stat, index) => (
                      <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-bg-elevated/50 rounded-xl p-4 flex items-center justify-between"
                      >
                        <span className="text-text-secondary">{stat.label}</span>
                        <span className="text-2xl font-bold text-n0de-green" style={{ fontFamily: 'var(--font-display)' }}>
                          {stat.value}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </GlassCard>

                {/* Visual Indicator */}
                <GlassCard className="p-6">
                  <div className="text-center">
                    <div className={`w-24 h-24 mx-auto rounded-full bg-gradient-to-r ${activeFeature.gradient} bg-opacity-10 flex items-center justify-center mb-4`}>
                      <activeFeature.icon className={`w-12 h-12 bg-gradient-to-r ${activeFeature.gradient} bg-clip-text text-transparent`} />
                    </div>
                    <h5 className="font-bold text-white mb-2" style={{ fontFamily: 'var(--font-display)' }}>
                      {activeFeature.subtitle}
                    </h5>
                    <p className="text-text-secondary text-sm">
                      Industry-leading performance metrics
                    </p>
                  </div>
                </GlassCard>
              </motion.div>
            </AnimatePresence>
          </ScrollSlideUp>
        </div>

        {/* Support Metrics */}
        <ScrollSlideUp delay={0.8}>
          <GlassCard className="p-8 bg-gradient-to-r from-n0de-blue/5 via-transparent to-n0de-purple/5">
            <div className="text-center mb-12">
              <h3 className="text-3xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-display)' }}>
                24/7 Solana-Native Support
              </h3>
              <p className="text-text-secondary text-lg max-w-3xl mx-auto">
                Our support team consists entirely of Solana-native engineers who understand 
                your challenges and can provide expert guidance when you need it most.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {supportMetrics.map((metric, index) => (
                <motion.div
                  key={metric.metric}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1 + index * 0.1 }}
                  className="text-center"
                  onMouseEnter={() => setHoveredMetric(metric.metric)}
                  onMouseLeave={() => setHoveredMetric(null)}
                >
                  <motion.div
                    className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 transition-all duration-300 ${
                      hoveredMetric === metric.metric
                        ? 'bg-n0de-green/20 scale-110'
                        : 'bg-n0de-green/10'
                    }`}
                    whileHover={{ scale: 1.1 }}
                  >
                    <metric.icon className="w-8 h-8 text-n0de-green" />
                  </motion.div>
                  <div className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-display)' }}>
                    {metric.value}
                  </div>
                  <div className="font-semibold text-white mb-1">{metric.metric}</div>
                  <div className="text-text-secondary text-sm">{metric.description}</div>
                </motion.div>
              ))}
            </div>

            <div className="text-center mt-12">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-gradient-to-r from-n0de-green to-n0de-blue text-black font-bold px-8 py-4 rounded-xl hover:shadow-xl transition-all duration-300 flex items-center space-x-2 mx-auto"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                <Users className="w-5 h-5" />
                <span>Talk to Our Engineers</span>
              </motion.button>
            </div>
          </GlassCard>
        </ScrollSlideUp>

        {/* Geographic Coverage */}
        <ScrollSlideUp delay={1.2} className="mt-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-3xl font-bold text-white mb-6" style={{ fontFamily: 'var(--font-display)' }}>
                Global Infrastructure
              </h3>
              <p className="text-text-secondary text-lg leading-relaxed mb-8">
                Our hybrid nodes are strategically located across three continents to provide 
                the lowest latency possible, no matter where your users are located.
              </p>
              
              <div className="space-y-4">
                {[
                  { region: 'Frankfurt, Germany', latency: '6ms', users: '2.1M' },
                  { region: 'Amsterdam, Netherlands', latency: '8ms', users: '1.8M' },
                  { region: 'North America (Multi)', latency: '12ms', users: '3.2M' }
                ].map((location, index) => (
                  <motion.div
                    key={location.region}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.4 + index * 0.1 }}
                    className="flex items-center justify-between bg-bg-elevated/30 rounded-xl p-4"
                  >
                    <div className="flex items-center space-x-3">
                      <Globe className="w-5 h-5 text-n0de-green" />
                      <span className="text-white font-semibold">{location.region}</span>
                    </div>
                    <div className="flex items-center space-x-6 text-sm">
                      <div className="text-text-secondary">
                        <span className="text-n0de-green font-bold">{location.latency}</span> avg
                      </div>
                      <div className="text-text-secondary">
                        <span className="text-white font-bold">{location.users}</span> users
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="relative">
              <GlassCard className="p-8 text-center">
                <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-r from-n0de-green/20 to-n0de-blue/20 flex items-center justify-center mb-6">
                  <Network className="w-16 h-16 text-n0de-green" />
                </div>
                <h4 className="text-2xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-display)' }}>
                  99.99% Global Uptime
                </h4>
                <p className="text-text-secondary mb-6">
                  Our multi-region architecture ensures your applications stay online, 
                  even during regional outages or maintenance windows.
                </p>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-n0de-green">3</div>
                    <div className="text-text-secondary text-sm">Continents</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-n0de-green">12</div>
                    <div className="text-text-secondary text-sm">Data Centers</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-n0de-green">7M+</div>
                    <div className="text-text-secondary text-sm">Users Served</div>
                  </div>
                </div>
              </GlassCard>
            </div>
          </div>
        </ScrollSlideUp>
      </div>
    </section>
  );
}