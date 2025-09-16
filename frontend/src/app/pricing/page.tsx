'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ScrollSlideUp } from '@/components/ScrollReveal';
import SectionBackground from '@/components/SectionBackground';

export default function PricingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-bg-main text-text-primary" style={{ fontFamily: 'var(--font-body)' }}>
      {/* Navigation Spacer */}
      <div className="h-20" />
      
      {/* Pricing Section */}
      <section className="section-padding bg-bg-main relative overflow-hidden">
        <SectionBackground variant="enterprise" />
        <div className="absolute inset-0 bg-gradient-to-br from-N0DE-navy/5 to-N0DE-cyan/5" />
        <div className="container-width relative z-10">
          <ScrollSlideUp>
            <div className="text-center mb-16">
              <h1 className="text-4xl lg:text-6xl font-black mb-6">
                <span 
                  style={{ 
                    background: 'linear-gradient(135deg, #01d3f4, #0b86f8, #00255e)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    color: '#01d3f4'
                  }}
                >
                  Simple, Transparent
                </span>
                <br />
                <span className="text-white">Pricing</span>
              </h1>
              <p className="text-xl text-text-secondary max-w-2xl mx-auto">
                Choose the perfect plan for your needs. All plans include our enterprise-grade infrastructure with 9ms response times and 100% uptime.
              </p>
            </div>
          </ScrollSlideUp>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Starter Plan */}
            <ScrollSlideUp delay={0.1}>
              <motion.div
                whileHover={{ y: -8, scale: 1.02 }}
                className="relative bg-bg-elevated border border-border rounded-2xl p-8 group"
              >
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-white mb-2">Starter</h3>
                  <p className="text-text-secondary mb-4">Perfect for getting started</p>
                  <div className="flex items-baseline">
                    <span className="text-4xl font-black text-N0DE-cyan">$99</span>
                    <span className="text-text-secondary ml-2">/month</span>
                  </div>
                </div>
                
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center text-text-secondary">
                    <div className="w-2 h-2 bg-N0DE-green rounded-full mr-3" />
                    1M requests/month
                  </li>
                  <li className="flex items-center text-text-secondary">
                    <div className="w-2 h-2 bg-N0DE-green rounded-full mr-3" />
                    5,000 RPS
                  </li>
                  <li className="flex items-center text-text-secondary">
                    <div className="w-2 h-2 bg-N0DE-green rounded-full mr-3" />
                    99.9% Uptime SLA
                  </li>
                  <li className="flex items-center text-text-secondary">
                    <div className="w-2 h-2 bg-N0DE-green rounded-full mr-3" />
                    Standard Support
                  </li>
                </ul>

                <button
                  onClick={() => router.push('/payment?plan=STARTER')}
                  className="w-full py-3 px-6 bg-gradient-to-r from-N0DE-green to-N0DE-cyan text-black font-bold rounded-xl hover:shadow-lg hover:shadow-N0DE-cyan/20 transition-all duration-200"
                >
                  Get Started
                </button>
              </motion.div>
            </ScrollSlideUp>

            {/* Professional Plan - Popular */}
            <ScrollSlideUp delay={0.2}>
              <motion.div
                whileHover={{ y: -8, scale: 1.02 }}
                className="relative bg-gradient-to-b from-N0DE-cyan/10 to-N0DE-navy/10 border-2 border-N0DE-cyan rounded-2xl p-8 group"
              >
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-N0DE-green to-N0DE-cyan text-black px-4 py-1 rounded-full text-sm font-bold">
                    MOST POPULAR
                  </span>
                </div>

                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-white mb-2">Professional</h3>
                  <p className="text-text-secondary mb-4">Best for production apps</p>
                  <div className="flex items-baseline">
                    <span className="text-4xl font-black text-N0DE-cyan">$299</span>
                    <span className="text-text-secondary ml-2">/month</span>
                  </div>
                </div>
                
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center text-text-secondary">
                    <div className="w-2 h-2 bg-N0DE-green rounded-full mr-3" />
                    5M requests/month
                  </li>
                  <li className="flex items-center text-text-secondary">
                    <div className="w-2 h-2 bg-N0DE-green rounded-full mr-3" />
                    25,000 RPS
                  </li>
                  <li className="flex items-center text-text-secondary">
                    <div className="w-2 h-2 bg-N0DE-green rounded-full mr-3" />
                    99.95% Uptime SLA
                  </li>
                  <li className="flex items-center text-text-secondary">
                    <div className="w-2 h-2 bg-N0DE-green rounded-full mr-3" />
                    Priority Support
                  </li>
                  <li className="flex items-center text-text-secondary">
                    <div className="w-2 h-2 bg-N0DE-green rounded-full mr-3" />
                    WebSocket Streaming
                  </li>
                </ul>

                <button
                  onClick={() => router.push('/payment?plan=PROFESSIONAL')}
                  className="w-full py-3 px-6 bg-gradient-to-r from-N0DE-cyan to-N0DE-navy text-white font-bold rounded-xl hover:shadow-lg hover:shadow-N0DE-cyan/30 transition-all duration-200"
                >
                  Start Professional
                </button>
              </motion.div>
            </ScrollSlideUp>

            {/* Enterprise Plan */}
            <ScrollSlideUp delay={0.3}>
              <motion.div
                whileHover={{ y: -8, scale: 1.02 }}
                className="relative bg-bg-elevated border border-border rounded-2xl p-8 group"
              >
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-white mb-2">Enterprise</h3>
                  <p className="text-text-secondary mb-4">For large scale applications</p>
                  <div className="flex items-baseline">
                    <span className="text-4xl font-black text-N0DE-cyan">$899</span>
                    <span className="text-text-secondary ml-2">/month</span>
                  </div>
                </div>
                
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center text-text-secondary">
                    <div className="w-2 h-2 bg-N0DE-green rounded-full mr-3" />
                    50M requests/month
                  </li>
                  <li className="flex items-center text-text-secondary">
                    <div className="w-2 h-2 bg-N0DE-green rounded-full mr-3" />
                    Unlimited RPS
                  </li>
                  <li className="flex items-center text-text-secondary">
                    <div className="w-2 h-2 bg-N0DE-green rounded-full mr-3" />
                    99.99% Uptime SLA
                  </li>
                  <li className="flex items-center text-text-secondary">
                    <div className="w-2 h-2 bg-N0DE-green rounded-full mr-3" />
                    24/7 Dedicated Support
                  </li>
                  <li className="flex items-center text-text-secondary">
                    <div className="w-2 h-2 bg-N0DE-green rounded-full mr-3" />
                    Custom Infrastructure
                  </li>
                  <li className="flex items-center text-text-secondary">
                    <div className="w-2 h-2 bg-N0DE-green rounded-full mr-3" />
                    Team Management
                  </li>
                </ul>

                <button
                  onClick={() => router.push('/payment?plan=ENTERPRISE')}
                  className="w-full py-3 px-6 bg-gradient-to-r from-N0DE-green to-N0DE-cyan text-black font-bold rounded-xl hover:shadow-lg hover:shadow-N0DE-cyan/20 transition-all duration-200"
                >
                  Go Enterprise
                </button>
              </motion.div>
            </ScrollSlideUp>
          </div>

          <ScrollSlideUp delay={0.4}>
            <div className="text-center mt-12">
              <p className="text-text-secondary mb-6">
                Already have an account? 
                <button 
                  onClick={() => router.push('/subscription')}
                  className="text-N0DE-cyan hover:text-N0DE-green ml-2 font-semibold"
                >
                  Manage your subscription →
                </button>
              </p>
              
              <div className="space-y-4 max-w-3xl mx-auto">
                <h3 className="text-xl font-semibold text-white mb-4">Why Choose N0DE?</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-N0DE-cyan mb-1">9ms</div>
                    <div className="text-sm text-text-secondary">Response Time</div>
                    <div className="text-xs text-N0DE-green">84% faster than QuickNode</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-N0DE-cyan mb-1">100%</div>
                    <div className="text-sm text-text-secondary">Success Rate</div>
                    <div className="text-xs text-N0DE-green">Zero failures while others go down</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-N0DE-cyan mb-1">±1ms</div>
                    <div className="text-sm text-text-secondary">Consistency</div>
                    <div className="text-xs text-N0DE-green">vs 20-40ms industry variance</div>
                  </div>
                </div>
              </div>
            </div>
          </ScrollSlideUp>
        </div>
      </section>
    </div>
  );
}