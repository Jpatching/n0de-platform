'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { 
  Zap, 
  ArrowRight, 
  Play,
  Rocket,
  Shield,
  Clock,
  Users,
  BarChart3,
  Database,
  TrendingUp,
  CreditCard,
  Lock,
  Menu,
  X
} from 'lucide-react';
import PricingSection from '@/components/PricingSection';
import EnhancedPerformanceComparison from '@/components/EnhancedPerformanceComparison';

import SectionBackground from '@/components/SectionBackground';
import InteractiveBackground from '@/components/InteractiveBackground';
import AuthModal from '@/components/AuthModal';
import SupportSystem from '@/components/SupportSystem';
import FloatingSupportButton from '@/components/FloatingSupportButton';
import { ScrollSlideUp } from '@/components/ScrollReveal';
import { ScrollFadeIn, ScrollStagger, ScrollScale } from '@/components/ScrollAnimations';
import ApiPlayground from '@/components/ApiPlayground';
import SafeAnimatedCounter from '@/components/SafeAnimatedCounter';
import ClientOnly from '@/components/ClientOnly';
import HydrationSafe from '@/components/HydrationSafe';

export default function HomePage() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');
  const [showSupport, setShowSupport] = useState(false);
  const [showApiDemo, setShowApiDemo] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  // Import auth context to check if user is logged in
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-bg-main text-text-primary overflow-x-hidden relative" style={{ fontFamily: 'var(--font-body)' }}>
      
      {/* Interactive Background - Client Only */}
      <ClientOnly>
        <InteractiveBackground />
      </ClientOnly>
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-bg-main/80 backdrop-blur-lg border-b border-border">
        <div className="container-width flex items-center justify-between py-4">
          <div className="flex items-center space-x-8">
            {/* Logo */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex items-center space-x-3"
            >
              <motion.div 
                className="w-8 h-8 rounded-lg overflow-hidden"
                whileHover={{ scale: 1.1, rotate: 5 }}
                animate={isMounted ? { 
                  boxShadow: [
                    "0 0 0 rgba(1, 211, 244, 0)",
                    "0 0 10px rgba(1, 211, 244, 0.3)",
                    "0 0 0 rgba(1, 211, 244, 0)"
                  ]
                } : {}}
                transition={{
                  boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                }}
              >
                <img 
                  src="/ChatGPT Image Aug 6, 2025, 10_20_26 PM.png" 
                  alt="N0DE Logo" 
                  className="w-full h-full object-cover"
                />
              </motion.div>
              <span className="text-xl font-bold flex items-center" style={{ fontFamily: 'var(--font-display)' }}>
                <span 
                  style={{
                    background: 'linear-gradient(135deg, #01d3f4, #0b86f8, #00255e)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    color: '#01d3f4'
                  }}
                >
                  N
                </span>
                <span className="relative inline-block">
                  <span 
                    className="relative"
                    style={{
                      background: 'linear-gradient(135deg, #01d3f4, #0b86f8, #00255e)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      color: '#01d3f4'
                    }}
                  >
                    0
                  </span>
                  <div 
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ transform: 'rotate(-15deg)' }}
                  >
                    <div 
                      className="w-3 h-0.5 bg-gradient-to-r from-N0DE-cyan via-N0DE-sky to-N0DE-navy"
                      style={{ transform: 'translateY(1px)' }}
                    />
              </div>
                </span>
                <span 
                  style={{
                    background: 'linear-gradient(135deg, #01d3f4, #0b86f8, #00255e)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    color: '#01d3f4'
                  }}
                >
                  DE
                </span>
              </span>
            </motion.div>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-6">
              <Link href="/performance" className="text-text-secondary hover:text-N0DE-cyan transition-colors">Performance</Link>
              <a href="#pricing" className="text-text-secondary hover:text-N0DE-cyan transition-colors">Pricing</a>
              <Link href="/docs" className="text-text-secondary hover:text-N0DE-cyan transition-colors">Docs</Link>
              <Link href="/developer" className="text-text-secondary hover:text-N0DE-cyan transition-colors">Developer</Link>
            </div>
          </div>
              
          {/* Right Side Actions */}
          <div className="flex items-center space-x-4">
            {/* Desktop Links */}
            <Link 
              href="/dashboard"
              className="hidden sm:block text-text-secondary hover:text-N0DE-cyan font-medium transition-colors px-4 py-2"
            >
              Dashboard
            </Link>
          
            {/* Launch App / Dashboard Button */}
            <HydrationSafe>
              <motion.button
                onClick={() => { 
                  if (user) {
                    router.push('/dashboard');
                  } else {
                    setAuthMode('signup'); 
                    setShowAuthModal(true); 
                  }
                }}
                whileHover={{ scale: 1.05, y: -4 }}
                whileTap={{ scale: 0.95, y: -1 }}
                className="relative group"
                style={{ 
                  fontFamily: 'var(--font-display)',
                  perspective: '1000px',
                  transformStyle: 'preserve-3d'
                }}
              >
                {/* Main Button Surface */}
                <div className="relative px-6 py-3 bg-gradient-to-b from-N0DE-cyan via-N0DE-sky to-N0DE-navy rounded-xl overflow-hidden transition-all duration-300 group-hover:from-N0DE-sky group-hover:via-N0DE-cyan group-hover:to-N0DE-sky">
                  
                  {/* Top Highlight */}
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  
                  {/* Content */}
                  <div className="relative flex items-center space-x-2 text-white font-bold">
                    <Rocket className="w-4 h-4" />
                    <span className="text-sm font-bold tracking-wide">
                      {user ? 'Dashboard' : 'Launch App'}
                    </span>
                  </div>
                </div>
                
                {/* 3D Bottom Edge */}
                <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-b from-N0DE-navy to-black/50 rounded-b-xl transform translateZ-2" />
              </motion.button>
            </HydrationSafe>

            {/* Mobile Menu Button */}
            <motion.button 
              className="md:hidden text-text-primary hover:text-N0DE-cyan transition-colors p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </motion.button>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        <HydrationSafe>
          <motion.div
            className="md:hidden fixed inset-x-0 top-20 bg-bg-elevated/95 backdrop-blur-xl border-b border-border z-40"
            initial={{ opacity: 0, y: -20 }}
            animate={{ 
              opacity: mobileMenuOpen ? 1 : 0,
              y: mobileMenuOpen ? 0 : -20
            }}
            transition={{ duration: 0.2 }}
            style={{ pointerEvents: mobileMenuOpen ? 'auto' : 'none' }}
          >
            <div className="container-width py-6 space-y-4">
              <a href="#performance" className="block text-lg font-medium text-text-secondary hover:text-N0DE-cyan transition-colors py-3 border-b border-border/50">
                Performance
              </a>
              <a href="#pricing" className="block text-lg font-medium text-text-secondary hover:text-N0DE-cyan transition-colors py-3 border-b border-border/50">
                Pricing
              </a>
              <Link href="/docs" className="block text-lg font-medium text-text-secondary hover:text-N0DE-cyan transition-colors py-3 border-b border-border/50">
                Docs
              </Link>
              <Link href="/developer" className="block text-lg font-medium text-text-secondary hover:text-N0DE-cyan transition-colors py-3 border-b border-border/50">
                Developer
              </Link>
              <Link href="/dashboard" className="block text-lg font-medium text-text-secondary hover:text-N0DE-cyan transition-colors py-3">
                Dashboard
              </Link>
            </div>
          </motion.div>
        </HydrationSafe>
      </nav>

      {/* Hero Section */}
      <section className="section-padding pt-36 relative overflow-hidden z-10">
        <SectionBackground variant="hero" />
        
        <div className="container-width relative z-10">
          <div className="text-center max-w-5xl mx-auto">
            
            {/* Status Badge */}
            <div className="mb-8">
              <motion.div 
                className="inline-flex items-center space-x-3 bg-gradient-to-r from-N0DE-cyan/10 via-N0DE-sky/5 to-N0DE-navy/10 border border-N0DE-cyan/30 rounded-xl px-6 py-3 backdrop-blur-sm shadow-lg"
                whileHover={{ scale: 1.05, y: -2 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="flex items-center space-x-2">
                  <motion.div 
                    className="w-3 h-3 bg-N0DE-cyan rounded-full shadow-lg"
                    animate={isMounted ? { 
                      boxShadow: [
                        '0 0 5px rgba(1,211,244,0.5)',
                        '0 0 15px rgba(1,211,244,0.8)',
                        '0 0 5px rgba(1,211,244,0.5)'
                      ]
                    } : {}}
                    transition={{ 
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                  <span className="text-N0DE-cyan font-bold text-sm tracking-wide" style={{ fontFamily: 'var(--font-display)' }}>
                    LIVE
                  </span>
                </div>
                <div className="w-px h-4 bg-N0DE-cyan/30" />
                <span className="text-white font-semibold text-sm tracking-wide" style={{ fontFamily: 'var(--font-display)' }}>
                  100% SUCCESS RATE
                </span>
                <div className="w-px h-4 bg-N0DE-sky/30" />
                <span className="text-N0DE-sky font-semibold text-sm tracking-wide" style={{ fontFamily: 'var(--font-display)' }}>
                  MAINNET ONLY
                </span>
              </motion.div>
            </div>

            {/* Main Headline */}
            <div className="mb-8">
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-bold mb-6 py-6 sm:py-8 lg:py-12" style={{ fontFamily: 'var(--font-display)', lineHeight: '1.3' }}>
                <span className="text-white block mb-4">Built for the</span>
                <span 
                  className="block font-black"
                  style={{ 
                    background: 'linear-gradient(135deg, #01d3f4, #0b86f8, #00255e)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    color: '#01d3f4',
                    fontSize: '1.1em',
                    fontWeight: '900',
                    textShadow: '0 0 20px rgba(1,211,244,0.3)'
                  }}
                >
                  Dominate
                </span>
              </h1>
              <div className="w-24 h-1 bg-gradient-to-r from-N0DE-cyan via-N0DE-sky to-N0DE-navy rounded-full mx-auto mb-8" />
            </div>

            {/* Value Proposition */}
            <div className="mb-8">
              <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-text-secondary leading-relaxed max-w-4xl mx-auto px-4 sm:px-0">
                <span className="text-N0DE-green font-semibold">Europe's Fastest Solana RPC</span> with dedicated enterprise infrastructure. 
                <span className="text-N0DE-cyan font-semibold">84% faster than QuickNode</span>, 
                <span className="text-N0DE-purple font-semibold">9ms response times</span>, and <span className="text-N0DE-green font-semibold">perfect reliability</span>.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex justify-center">
              <HydrationSafe>
                <motion.button
                  onClick={() => {
                    setAuthMode('signup');
                    setShowAuthModal(true);
                  }}
                  whileHover={{ scale: 1.08, y: -8 }}
                  whileTap={{ scale: 0.95, y: -2 }}
                  className="relative group inline-flex"
                  style={{ 
                    fontFamily: 'var(--font-display)',
                    perspective: '1000px',
                    transformStyle: 'preserve-3d'
                  }}
                >
                  {/* Main Button Surface */}
                  <div className="relative px-10 py-5 bg-gradient-to-b from-N0DE-cyan via-N0DE-sky to-N0DE-navy text-white font-bold text-lg rounded-2xl overflow-hidden transition-all duration-300 group-hover:from-N0DE-sky group-hover:via-N0DE-cyan group-hover:to-N0DE-navy">
                    
                    {/* Content */}
                    <div className="relative flex items-center space-x-3 text-white font-bold">
                      <Rocket className="w-6 h-6" />
                      <span className="font-black tracking-wide">Get Started Free</span>
                      <ArrowRight className="w-6 h-6" />
                    </div>
                  </div>
                  
                  {/* 3D Bottom Edge */}
                  <div className="absolute inset-x-0 bottom-0 h-1.5 bg-gradient-to-b from-N0DE-navy to-black/60 rounded-b-2xl" />
                </motion.button>
              </HydrationSafe>
            </div>
          </div>
        </div>
      </section>

      {/* Performance Section */}
      <section id="performance" className="pt-2 pb-16 bg-bg-elevated/30">
        <div className="container-width">
          {/* Performance Metrics - Hydration-Safe Animated Counters */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
            <ClientOnly fallback={<div className="text-center"><div className="text-3xl font-bold">9ms</div><div className="text-text-secondary text-sm">Response Time</div></div>}>
              <SafeAnimatedCounter 
                endValue={9}
                suffix="ms"
                label="Response Time"
                comparison="vs QuickNode: 57.4ms"
                delay={0}
              />
            </ClientOnly>
            <ClientOnly fallback={<div className="text-center"><div className="text-3xl font-bold">50K</div><div className="text-text-secondary text-sm">RPS</div></div>}>
              <SafeAnimatedCounter 
                endValue={50000}
                label="RPS"
                comparison="vs Helius: 25,000"
                delay={0.1}
              />
            </ClientOnly>
            <ClientOnly fallback={<div className="text-center"><div className="text-3xl font-bold">100%</div><div className="text-text-secondary text-sm">Success Rate</div></div>}>
              <SafeAnimatedCounter 
                endValue={100}
                suffix="%"
                label="Success Rate"
                comparison="vs 50% provider failures"
                delay={0.2}
              />
            </ClientOnly>
            <ClientOnly fallback={<div className="text-center"><div className="text-3xl font-bold">1ms</div><div className="text-text-secondary text-sm">Consistency</div></div>}>
              <SafeAnimatedCounter 
                endValue={1}
                suffix="ms"
                label="Consistency"
                comparison="±1ms vs 20-40ms variance"
                delay={0.3}
              />
            </ClientOnly>
          </div>
        </div>
      </section>

      {/* Enhanced Performance Comparison */}
      <ClientOnly>
        <EnhancedPerformanceComparison />
      </ClientOnly>

      {/* Pricing Section */}
      <section id="pricing">
        <ClientOnly>
          <PricingSection />
        </ClientOnly>
      </section>

      {/* Modals - Client Only */}
      <ClientOnly>
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          mode={authMode}
          onModeChange={setAuthMode}
        />

        <SupportSystem 
          isOpen={showSupport}
          onClose={() => setShowSupport(false)}
        />

        <ApiPlayground 
          isOpen={showApiDemo}
          onClose={() => setShowApiDemo(false)}
        />

        <FloatingSupportButton onSupportClick={() => setShowSupport(true)} />
      </ClientOnly>
    </div>
  );
}