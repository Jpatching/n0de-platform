'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Zap, Crown, Rocket } from 'lucide-react';
import { safeBoxShadow, safeMotionAnimate } from '@/lib/css-utils';

interface PricingTier {
  name: string;
  price: number;
  originalPrice?: number;
  description: string;
  icon: React.ReactNode;
  features: string[];
  limitations?: string[];
  popular?: boolean;
  enterprise?: boolean;
  rps: string;
  latency: string;
  uptime: string;
  support: string;
}

export default function PricingSection() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');

  const pricingTiers: PricingTier[] = [
    {
      name: 'Starter',
      price: billingPeriod === 'monthly' ? 99 : 990,
      description: 'Perfect for mainnet applications and production workloads',
      icon: <Zap className="w-6 h-6" />,
      rps: '5,000',
      latency: '9ms',
      uptime: '99.9%',
      support: 'Community',
      features: [
        'Yellowstone gRPC access',
        '5,000 requests per second',
        'Global CDN',
        'Basic analytics',
        'Discord support',
        'Free SSL certificates',
        'API key management'
      ],
      limitations: [
        'Community support only',
        'Standard rate limits'
      ]
    },
    {
      name: 'Professional',
      price: billingPeriod === 'monthly' ? 299 : 2990,
      originalPrice: billingPeriod === 'monthly' ? 599 : 5990,
      description: 'For production applications that demand performance',
      icon: <Crown className="w-6 h-6" />,
      popular: true,
      rps: '25,000',
      latency: '9ms',
      uptime: '99.95%',
      support: 'Priority',
      features: [
        'Everything in Starter',
        '25,000 requests per second',
        'Priority routing',
        'Advanced analytics & monitoring',
        'Custom webhooks',
        'Priority support (24/7)',
        'Dedicated account manager',
        'Custom rate limits',
        'Historical data access'
      ]
    },
    {
      name: 'Enterprise',
      price: billingPeriod === 'monthly' ? 899 : 8990,
      originalPrice: billingPeriod === 'monthly' ? 1900 : 19000,
      description: 'Maximum performance for high-scale applications',
      icon: <Rocket className="w-6 h-6" />,
      enterprise: true,
      rps: '100,000+',
      latency: '9ms',
      uptime: '99.99%',
      support: 'White-glove',
      features: [
        'Everything in Professional',
        '100,000+ requests per second',
        'Dedicated infrastructure',
        'Custom SLA agreements',
        'White-glove onboarding',
        'Direct engineering support',
        'Custom integrations',
        'Multi-region deployment',
        'Advanced security features',
        'Custom contracts available'
      ]
    }
  ];

  const competitorComparison = [
    { 
      provider: 'N0DE', 
      price: 299, 
      rps: '25,000', 
      latency: '9ms', 
      features: 'All included',
      pricing: '1 request = 1 request',
      monthlyRequests: '65M requests',
      costPer1k: '$0.0046'
    },
    { 
      provider: 'Helius', 
      price: 1900, 
      rps: '10,000', 
      latency: '47-210ms', 
      features: 'Limited',
      pricing: '1 request = 10+ CUs',
      monthlyRequests: '10M CUs (~1M requests)',
      costPer1k: '$1.90'
    },
    { 
      provider: 'Alchemy', 
      price: 2000, 
      rps: '15,000', 
      latency: '156ms', 
      features: 'Basic',
      pricing: '1 request = 5-50 CUs',
      monthlyRequests: '15M CUs (~750K requests)',
      costPer1k: '$2.67'
    },
    { 
      provider: 'QuickNode', 
      price: 1500, 
      rps: '12,000', 
      latency: '57.4ms', 
      features: 'Standard',
      pricing: '1 request = 3-25 credits',
      monthlyRequests: '10M credits (~500K requests)',
      costPer1k: '$3.00'
    }
  ];

  return (
    <div className="section-padding relative overflow-hidden">
      {/* Removed background - let custom background show through */}

      <div className="container-width relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl lg:text-6xl font-bold font-display mb-6">
            <span className="gradient-text">Pricing That</span>
            <br />
            <span className="text-white">Destroys The Competition</span>
          </h2>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto mb-8">
            Get enterprise-grade performance at a fraction of the cost. 
            Save thousands while getting better speed and reliability.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center bg-bg-card rounded-lg p-1 border border-border">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-6 py-2 rounded-md font-medium transition-all ${
                billingPeriod === 'monthly'
                  ? 'bg-gradient-to-r from-N0DE-cyan to-N0DE-sky text-black font-bold'
                  : 'text-text-secondary hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={`px-6 py-2 rounded-md font-medium transition-all relative ${
                billingPeriod === 'yearly'
                  ? 'bg-gradient-to-r from-N0DE-cyan to-N0DE-sky text-black font-bold'
                  : 'text-text-secondary hover:text-white'
              }`}
            >
              Yearly
              <span className="absolute -top-1 -right-1 bg-gradient-to-r from-N0DE-sky to-N0DE-navy text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
                -17%
              </span>
            </button>
          </div>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          {pricingTiers.map((tier, index) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className={`relative ${
                tier.popular
                  ? 'pricing-card-popular transform scale-105'
                  : 'pricing-card'
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-n0de-green to-n0de-blue text-black px-4 py-1 rounded-full text-sm font-semibold">
                    MOST POPULAR
                  </span>
                </div>
              )}

              <div className="p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className={tier.popular ? 'text-n0de-green' : 'text-text-secondary'}>
                      {tier.icon}
                    </div>
                    <h3 className="text-2xl font-bold">{tier.name}</h3>
                  </div>
                  {tier.enterprise && (
                    <span className="bg-n0de-purple text-white px-2 py-1 rounded text-xs font-semibold">
                      ENTERPRISE
                    </span>
                  )}
                </div>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline space-x-2">
                    <span className="text-4xl font-bold gradient-text">
                      ${tier.price.toLocaleString()}
                    </span>
                    <span className="text-text-secondary">
                      /{billingPeriod === 'monthly' ? 'month' : 'year'}
                    </span>
                  </div>
                  {tier.originalPrice && (
                    <div className="flex items-center space-x-2 mt-2">
                      <span className="text-text-muted line-through">
                        ${tier.originalPrice.toLocaleString()}
                      </span>
                      <span className="bg-n0de-green text-black text-xs px-2 py-1 rounded font-semibold">
                        SAVE {Math.round((1 - tier.price / tier.originalPrice) * 100)}%
                      </span>
                    </div>
                  )}
                </div>

                <p className="text-text-secondary mb-8">{tier.description}</p>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-4 mb-8 p-4 bg-bg-main rounded-lg">
                  <div className="text-center">
                    <div className="text-lg font-bold text-n0de-green">{tier.rps}</div>
                    <div className="text-xs text-text-muted">RPS</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-n0de-blue">{tier.latency}</div>
                    <div className="text-xs text-text-muted">Latency</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-n0de-purple">{tier.uptime}</div>
                    <div className="text-xs text-text-muted">Uptime</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-text-primary">{tier.support}</div>
                    <div className="text-xs text-text-muted">Support</div>
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-3 mb-8">
                  {tier.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center space-x-3">
                      <Check className="w-5 h-5 text-n0de-green flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                  {tier.limitations?.map((limitation, idx) => (
                    <div key={idx} className="flex items-center space-x-3 opacity-60">
                      <X className="w-5 h-5 text-text-muted flex-shrink-0" />
                      <span className="text-sm text-text-muted">{limitation}</span>
                    </div>
                  ))}
                </div>

                {/* CTA Button - 3D Neumorphism */}
                <motion.button
                  whileHover={safeMotionAnimate({
                    scale: tier.popular ? 1.06 : 1.04,
                    y: tier.popular ? -6 : -4,
                    rotateX: tier.popular ? 6 : 4,
                    rotateY: tier.popular ? 2 : 1,
                    boxShadow: safeBoxShadow(tier.popular ? [
                      "0 20px 35px rgba(1, 211, 244, 0.4)",
                      "inset 0 1px 0 rgba(255, 255, 255, 0.12)",
                      "inset 0 -1px 0 rgba(0, 0, 0, 0.2)"
                    ].join(', ') : [
                      "0 15px 25px rgba(1, 211, 244, 0.2)",
                      "inset 0 1px 0 rgba(255, 255, 255, 0.08)",
                      "inset 0 -1px 0 rgba(0, 0, 0, 0.15)"
                    ].join(', '))
                  }, 'PricingSection-whileHover')}
                  whileTap={safeMotionAnimate({
                    scale: 0.96,
                    y: -1,
                    boxShadow: safeBoxShadow([
                      "0 8px 15px rgba(1, 211, 244, 0.3)",
                      "inset 0 2px 4px rgba(0, 0, 0, 0.3)",
                      "inset 0 -1px 0 rgba(255, 255, 255, 0.08)"
                    ].join(', '))
                  }, 'PricingSection-whileTap')}
                  className="w-full relative group"
                  style={{ 
                    perspective: '1000px',
                    transformStyle: 'preserve-3d'
                  }}
                  animate={safeMotionAnimate({
                    boxShadow: safeBoxShadow(tier.popular ? [
                      "0 12px 25px rgba(1, 211, 244, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.08), inset 0 -1px 0 rgba(0, 0, 0, 0.15)",
                      "0 15px 30px rgba(1, 211, 244, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1), inset 0 -1px 0 rgba(0, 0, 0, 0.18)",
                      "0 12px 25px rgba(1, 211, 244, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.08), inset 0 -1px 0 rgba(0, 0, 0, 0.15)"
                    ] : [
                      "0 8px 15px rgba(1, 211, 244, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.05), inset 0 -1px 0 rgba(0, 0, 0, 0.1)",
                      "0 10px 20px rgba(1, 211, 244, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.06), inset 0 -1px 0 rgba(0, 0, 0, 0.12)",
                      "0 8px 15px rgba(1, 211, 244, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.05), inset 0 -1px 0 rgba(0, 0, 0, 0.1)"
                    ])
                  }, 'PricingSection-animate')}
                  transition={{
                    boxShadow: { duration: tier.popular ? 3 : 4, repeat: Infinity, ease: "easeInOut" }
                  }}
                >
                  {/* Main Button Surface */}
                  <div className={`relative py-4 font-semibold text-lg rounded-lg overflow-hidden transition-all duration-300 ${
                    tier.popular
                      ? 'bg-gradient-to-b from-N0DE-green via-N0DE-cyan to-N0DE-blue text-black group-hover:from-N0DE-cyan group-hover:via-N0DE-green group-hover:to-N0DE-sky'
                      : 'bg-gradient-to-b from-bg-elevated via-bg-card to-bg-elevated border border-N0DE-cyan/20 text-white group-hover:border-N0DE-cyan/40 group-hover:from-bg-card group-hover:via-bg-elevated group-hover:to-bg-card'
                  }`}>
                    
                    {/* Top Highlight */}
                    <div className={`absolute inset-x-0 top-0 h-px ${
                      tier.popular 
                        ? 'bg-gradient-to-r from-transparent via-white/25 to-transparent'
                        : 'bg-gradient-to-r from-transparent via-N0DE-cyan/30 to-transparent'
                    }`} />
                    
                    {/* Inner Glow */}
                    <div className={`absolute inset-0 rounded-lg ${
                      tier.popular
                        ? 'bg-gradient-to-t from-transparent via-transparent to-white/6'
                        : 'bg-gradient-to-t from-transparent via-transparent to-N0DE-cyan/5'
                    }`} />
                    
                    {/* Bottom Shadow */}
                    <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-black/30 to-transparent" />
                    
                    {/* Shimmer Effect */}
                    <div className={`absolute inset-0 bg-gradient-to-r from-transparent to-transparent opacity-0 group-hover:opacity-100 group-hover:translate-x-full transition-all duration-700 ease-out rounded-lg ${
                      tier.popular
                        ? 'via-white/12'
                        : 'via-N0DE-cyan/15'
                    }`} />
                    
                    {/* Content */}
                    <div className="relative">
                      <motion.span
                        whileHover={{ x: 1 }}
                        transition={{ type: "spring", stiffness: 300 }}
                        className="font-black tracking-wide"
                      >
                        {tier.enterprise ? 'Contact Sales' : 'Get Started'}
                      </motion.span>
                    </div>
                  </div>
                  
                  {/* 3D Bottom Edge */}
                  <div className={`absolute inset-x-0 bottom-0 h-1 rounded-b-lg ${
                    tier.popular
                      ? 'bg-gradient-to-b from-N0DE-blue to-black/50'
                      : 'bg-gradient-to-b from-bg-card to-black/40'
                  }`} />
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Competitor Comparison */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="card max-w-5xl mx-auto"
        >
          <div className="text-center mb-8">
            <h3 className="text-3xl font-bold mb-4 gradient-text">
              True Cost Comparison: No Hidden Fees
            </h3>
            <p className="text-text-secondary text-lg mb-4">
              While competitors use confusing credit systems, we believe in transparent pricing
            </p>
            <div className="inline-flex items-center space-x-4 bg-bg-main rounded-lg p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-n0de-green">1 Request</div>
                <div className="text-sm text-text-muted">= 1 Request</div>
                <div className="text-xs text-n0de-green font-semibold">N0DE</div>
              </div>
              <div className="text-text-muted">vs</div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400">1 Request</div>
                <div className="text-sm text-text-muted">= 3-50 Credits/CUs</div>
                <div className="text-xs text-red-400 font-semibold">Competitors</div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-4 px-4">Provider</th>
                  <th className="text-center py-4 px-4">Price/Month</th>
                  <th className="text-center py-4 px-4">Pricing Model</th>
                  <th className="text-center py-4 px-4">Monthly Allowance</th>
                  <th className="text-center py-4 px-4">Cost per 1K</th>
                  <th className="text-center py-4 px-4">Latency</th>
                </tr>
              </thead>
              <tbody>
                {competitorComparison.map((provider) => (
                  <tr
                    key={provider.provider}
                    className={`border-b border-border last:border-b-0 ${
                      provider.provider === 'n0de' 
                        ? 'comparison-winner' 
                        : 'comparison-loser'
                    }`}
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-3">
                        {provider.provider === 'N0DE' && (
                          <Crown className="w-5 h-5 text-n0de-green" />
                        )}
                        <span className={`font-semibold ${
                          provider.provider === 'N0DE' ? 'text-n0de-green' : 'text-text-primary'
                        }`}>
                          {provider.provider}
                        </span>
                      </div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <span className={`text-xl font-bold ${
                        provider.provider === 'N0DE' ? 'text-n0de-green' : 'text-text-primary'
                      }`}>
                        ${provider.price.toLocaleString()}
                      </span>
                    </td>
                    <td className="text-center py-4 px-4">
                      <div className={`text-xs px-2 py-1 rounded ${
                        provider.provider === 'N0DE' 
                          ? 'bg-n0de-green/20 text-n0de-green' 
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {provider.pricing}
                      </div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <div className="text-sm font-medium">{provider.monthlyRequests}</div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <span className={`text-lg font-bold ${
                        provider.provider === 'N0DE' ? 'text-n0de-green' : 'text-red-400'
                      }`}>
                        {provider.costPer1k}
                      </span>
                    </td>
                    <td className="text-center py-4 px-4">
                      <span className={provider.provider === 'n0de' ? 'text-n0de-green' : 'text-text-primary'}>
                        {provider.latency}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="bg-bg-main rounded-lg p-6">
              <div className="text-2xl font-bold text-n0de-green mb-2">$1,601/month</div>
              <div className="text-sm text-text-secondary">Savings vs Helius</div>
              <div className="text-xs text-text-muted mt-1">84% cheaper</div>
            </div>
            <div className="bg-bg-main rounded-lg p-6">
              <div className="text-2xl font-bold text-n0de-green mb-2">$1,701/month</div>
              <div className="text-sm text-text-secondary">Savings vs Alchemy</div>
              <div className="text-xs text-text-muted mt-1">85% cheaper</div>
            </div>
            <div className="bg-bg-main rounded-lg p-6">
              <div className="text-2xl font-bold text-n0de-green mb-2">$1,201/month</div>
              <div className="text-sm text-text-secondary">Savings vs QuickNode</div>
              <div className="text-xs text-text-muted mt-1">80% cheaper</div>
            </div>
          </div>
          
          <div className="mt-8 text-center">
            <div className="bg-gradient-to-r from-n0de-green/10 to-n0de-blue/10 rounded-lg p-6 border border-n0de-green/20">
              <h4 className="text-xl font-bold mb-4 gradient-text">The N0DE Advantage</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center justify-center space-x-2">
                  <Check className="w-4 h-4 text-n0de-green" />
                  <span>No confusing credit systems</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <Check className="w-4 h-4 text-n0de-green" />
                  <span>True 1:1 request pricing</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <Check className="w-4 h-4 text-n0de-green" />
                  <span>65M requests/month included</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <Check className="w-4 h-4 text-n0de-green" />
                  <span>84% faster than competitors</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}