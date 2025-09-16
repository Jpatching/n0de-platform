'use client';

import { motion } from 'framer-motion';
import { 
  Quote, 
  Users, 
  Zap, 
  Target, 
  Award,
  Rocket,
  Heart,
  Code,
  Globe
} from 'lucide-react';
import { ScrollSlideUp, ScrollStagger } from '@/components/ScrollReveal';
import { GlassCard } from '@/components/GlassmorphismCard';

const milestones = [
  {
    year: '2021',
    title: 'The Problem',
    description: 'Experienced firsthand the pain of unreliable RPC providers while building high-frequency trading systems',
    icon: Target
  },
  {
    year: '2022',
    title: 'The Research',
    description: 'Spent months analyzing every major RPC provider, identifying critical gaps in performance and pricing',
    icon: Code
  },
  {
    year: '2023',
    title: 'The Solution',
    description: 'Developed hybrid node architecture combining the best of shared and dedicated infrastructure',
    icon: Zap
  },
  {
    year: '2024',
    title: 'The Launch',
    description: 'Launched n0de with enterprise-grade infrastructure at a fraction of competitor costs',
    icon: Rocket
  }
];

const stats = [
  { value: '1000+', label: 'Teams Trust Us', icon: Users },
  { value: '99.99%', label: 'Uptime Achieved', icon: Award },
  { value: '8ms', label: 'Avg Response Time', icon: Zap },
  { value: '50M+', label: 'Daily Requests', icon: Globe }
];

export default function FounderStory() {
  return (
    <section className="section-padding bg-gradient-to-b from-bg-elevated/30 to-transparent relative overflow-hidden">
      {/* Background Elements */}
              {/* Removed interfering background gradient */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-n0de-green/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-40 h-40 bg-n0de-blue/10 rounded-full blur-3xl" />

      <div className="container-width relative z-10">
        <ScrollSlideUp className="text-center mb-16">
          <div className="inline-flex items-center space-x-2 bg-n0de-purple/10 border border-n0de-purple/20 rounded-full px-4 py-2 mb-6">
            <Heart className="w-4 h-4 text-n0de-purple" />
            <span className="text-n0de-purple font-semibold text-sm" style={{ fontFamily: 'var(--font-display)' }}>
              OUR STORY
            </span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold mb-6" style={{ fontFamily: 'var(--font-display)' }}>
            Built by Developers, <span className="gradient-text bg-gradient-to-r from-n0de-purple to-n0de-green bg-clip-text text-transparent">
              For Developers
            </span>
          </h2>
        </ScrollSlideUp>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-16">
          {/* Founder Image & Quote */}
          <ScrollSlideUp delay={0.2}>
            <div className="relative">
              <GlassCard className="p-8">
                <div className="flex items-start space-x-4 mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-n0de-green to-n0de-blue rounded-2xl flex items-center justify-center text-black font-bold text-2xl" style={{ fontFamily: 'var(--font-display)' }}>
                    AK
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                      Alex Kim
                    </h3>
                    <p className="text-n0de-green font-semibold">Founder & CEO, n0de</p>
                    <p className="text-text-secondary text-sm">Ex-Solana Labs, Ex-Jump Trading</p>
                  </div>
                </div>
                
                <div className="relative">
                  <Quote className="w-8 h-8 text-n0de-green/30 absolute -top-2 -left-2" />
                  <blockquote className="text-lg text-text-secondary leading-relaxed pl-6">
                    &quot;After spending years building high-frequency trading systems on Solana, I was frustrated by 
                    the lack of reliable, cost-effective RPC infrastructure. Every provider either charged 
                    enterprise prices for basic service or delivered unreliable performance when it mattered most.&quot;
                  </blockquote>
                </div>
              </GlassCard>
            </div>
          </ScrollSlideUp>

          {/* Story Content */}
          <ScrollSlideUp delay={0.4}>
            <div className="space-y-6">
              <div>
                <h3 className="text-3xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-display)' }}>
                  From Frustration to Innovation
                </h3>
                <p className="text-text-secondary text-lg leading-relaxed mb-6">
                  n0de was born out of the challenges developers and traders face in the Solana ecosystem. 
                  As a team of former Solana Labs engineers and high-frequency traders, we experienced 
                  firsthand the pain of unreliable RPC providers, hidden pricing, and poor support.
                </p>
              </div>

              <div>
                <h4 className="text-xl font-bold text-white mb-3" style={{ fontFamily: 'var(--font-display)' }}>
                  The Genesis of n0de
                </h4>
                <p className="text-text-secondary leading-relaxed mb-4">
                  Traditional RPC providers treat requests like commodities, using complex credit systems 
                  and shared infrastructure that fails under pressure. We envisioned something different: 
                  honest pricing, hybrid architecture, and Solana-native optimization.
                </p>
                <p className="text-text-secondary leading-relaxed">
                  Today, n0de powers some of the largest trading operations and DeFi protocols on Solana, 
                  delivering the reliability and performance that the ecosystem deserves.
                </p>
              </div>
            </div>
          </ScrollSlideUp>
        </div>

        {/* Milestones Timeline */}
        <ScrollSlideUp delay={0.6} className="mb-16">
          <h3 className="text-3xl font-bold text-center text-white mb-12" style={{ fontFamily: 'var(--font-display)' }}>
            Our Journey
          </h3>
          
          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-gradient-to-b from-n0de-green to-n0de-blue rounded-full" />
            
            <div className="space-y-16">
              {milestones.map((milestone, index) => (
                <motion.div
                  key={milestone.year}
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + index * 0.2 }}
                  className={`flex items-center ${index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}`}
                >
                  <div className={`w-1/2 ${index % 2 === 0 ? 'pr-8 text-right' : 'pl-8 text-left'}`}>
                    <GlassCard className="p-6">
                      <div className={`flex items-center space-x-3 mb-4 ${index % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                        <div className={`w-12 h-12 bg-n0de-green/10 rounded-xl flex items-center justify-center ${index % 2 !== 0 ? 'order-first' : ''}`}>
                          <milestone.icon className="w-6 h-6 text-n0de-green" />
                        </div>
                        <div>
                          <h4 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
                            {milestone.title}
                          </h4>
                          <p className="text-n0de-green font-semibold">{milestone.year}</p>
                        </div>
                      </div>
                      <p className="text-text-secondary leading-relaxed">
                        {milestone.description}
                      </p>
                    </GlassCard>
                  </div>
                  
                  {/* Timeline Node */}
                  <div className="relative z-10">
                    <div className="w-6 h-6 bg-n0de-green rounded-full border-4 border-bg-main" />
                  </div>
                  
                  <div className="w-1/2" />
                </motion.div>
              ))}
            </div>
          </div>
        </ScrollSlideUp>

        {/* Stats Grid */}
        <ScrollStagger className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.2 + index * 0.1 }}
            >
              <GlassCard className="p-6 text-center hover:border-n0de-green/50 transition-all duration-300">
                <div className="w-12 h-12 bg-n0de-green/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <stat.icon className="w-6 h-6 text-n0de-green" />
                </div>
                <div className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-display)' }}>
                  {stat.value}
                </div>
                <div className="text-text-secondary text-sm">{stat.label}</div>
              </GlassCard>
            </motion.div>
          ))}
        </ScrollStagger>

        {/* Mission Statement */}
        <ScrollSlideUp delay={1.4}>
          <GlassCard className="p-8 lg:p-12 text-center bg-gradient-to-r from-n0de-green/5 via-transparent to-n0de-blue/5">
            <h3 className="text-3xl lg:text-4xl font-bold text-white mb-6" style={{ fontFamily: 'var(--font-display)' }}>
              Our Mission
            </h3>
            <p className="text-xl text-text-secondary leading-relaxed max-w-4xl mx-auto mb-8">
              To provide the most reliable, cost-effective, and developer-friendly RPC infrastructure 
              on Solana. We believe that great infrastructure should be invisible – it should just work, 
              every time, without breaking the bank.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-gradient-to-r from-n0de-green to-n0de-blue text-black font-bold px-8 py-4 rounded-xl hover:shadow-xl transition-all duration-300 flex items-center space-x-2"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                <Rocket className="w-5 h-5" />
                <span>Join Our Mission</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-bg-elevated border border-border text-white font-semibold px-8 py-4 rounded-xl hover:border-n0de-green/50 transition-all duration-300"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Read Our Blog
              </motion.button>
            </div>
          </GlassCard>
        </ScrollSlideUp>
      </div>
    </section>
  );
}