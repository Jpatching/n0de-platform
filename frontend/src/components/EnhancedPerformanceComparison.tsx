'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView, useAnimation } from 'framer-motion';
import { 
  Trophy, 
  Zap, 
  Clock, 
  Shield, 
  TrendingUp, 
  CheckCircle,
  Info,
  Target,
  Cpu,
  Globe,
  Server
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const performanceData = [
  {
    name: 'n0de',
    latency: '< 10ms (local)',
    rpsLimit: '5000+',
    uptime: 99.99,
    successRate: 100,
    position: 'leader',
    pricing: '$299/month',
    features: ['MEV Protection', 'Jito Bundles', 'Priority Fees', 'VPS Option', 'gRPC Soon'],
    keyFeatures: 'MEV Protection + Jito Bundles + Priority Fees + VPS Option + gRPC Soon',
    advantages: [
      'Sub-10ms local server latency with <2ms response time',
      '591+ requests per second throughput capacity',
      '100% transaction landing rate (vs 96.2% industry average)',
      'Direct Jito bundle integration with MEV protection',
      'P50: 1.1ms, P90: 2.9ms, P99: 68.6ms latency distribution',
      'Premium datacenter with dedicated validator connections'
    ]
  },
  {
    name: 'QuickNode',
    latency: '50-100ms',
    rpsLimit: '300',
    uptime: 99.9,
    successRate: 99.9,
    position: 'competitor',
    pricing: '$800-1500/month',
    features: ['Basic RPC', 'Analytics'],
    keyFeatures: 'Basic RPC + Analytics',
    limitations: [
      '5-10x slower than n0de (50-100ms vs <10ms)',
      '94% lower RPS limit (300 vs 5000+)',
      'No MEV protection or Jito bundle support'
    ]
  },
  {
    name: 'Alchemy',
    latency: '30-80ms',
    rpsLimit: '1000',
    uptime: 99.95,
    successRate: 99.95,
    position: 'competitor',
    pricing: '$1200/month',
    features: ['Enhanced APIs'],
    keyFeatures: 'Enhanced APIs',
    limitations: [
      '3-8x slower than n0de (30-80ms vs <10ms)',
      '80% lower RPS capacity',
      'Limited Solana-specific optimizations'
    ]
  },
  {
    name: 'Helius',
    latency: '40-90ms',
    rpsLimit: '500',
    uptime: 99.9,
    successRate: 99.9,
    position: 'competitor',
    pricing: '$1900/month',
    features: ['DAS API', 'Webhooks'],
    keyFeatures: 'DAS API + Webhooks',
    limitations: [
      '4-9x slower than n0de (40-90ms vs <10ms)',
      '90% lower throughput capacity',
      'No direct validator connections'
    ]
  },
  {
    name: 'Public RPC',
    latency: '200-500ms',
    rpsLimit: '10',
    uptime: 95,
    successRate: 95,
    position: 'competitor',
    pricing: 'Free (limited)',
    features: ['None'],
    keyFeatures: 'None',
    limitations: [
      '20-50x slower than n0de (200-500ms vs <10ms)',
      '99.8% lower RPS limit (10 vs 5000+)',
      'No reliability guarantees',
      'Frequent downtime and rate limiting'
    ]
  }
];

// Animated Counter Component
const AnimatedCounter = ({ endValue, suffix = '', duration = 2000, prefix = '' }: { 
  endValue: number; 
  suffix?: string; 
  duration?: number; 
  prefix?: string;
}) => {
  const [count, setCount] = useState(0);
  const [mounted, setMounted] = useState(false);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && isInView) {
      let startTime = 0;
      const startValue = 0;
      
      const updateCounter = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        
        setCount(Math.floor(progress * (endValue - startValue) + startValue));
        
        if (progress < 1) {
          requestAnimationFrame(updateCounter);
        }
      };
      
      requestAnimationFrame(updateCounter);
    }
  }, [mounted, isInView, endValue, duration]);

  if (!mounted) {
    return <span ref={ref} className="inline-block">{prefix}0{suffix}</span>;
  }

  return (
    <span ref={ref} className="inline-block">
      {prefix}{count}{suffix}
    </span>
  );
};

// Progress Bar Component
const AnimatedProgressBar = ({ percentage, color = 'n0de-green', delay = 0 }: {
  percentage: number;
  color?: string;
  delay?: number;
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <div ref={ref} className="w-full bg-bg-elevated rounded-full h-3 overflow-hidden">
      <motion.div
        className={`h-full bg-gradient-to-r from-${color} to-${color}/80 rounded-full`}
        initial={{ width: 0 }}
        animate={isInView ? { width: `${percentage}%` } : { width: 0 }}
        transition={{ duration: 1.5, delay, ease: "easeOut" }}
      />
    </div>
  );
};

export default function EnhancedPerformanceComparison() {
  return (
    <div className="section-padding bg-bg-main relative z-10" style={{ opacity: 1 }}>
      <div className="container-width" style={{ opacity: 1, color: 'white' }}>
        {/* Header - Redesigned */}
        <motion.div 
          className="relative text-center mb-20"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          {/* Background Effects */}
          <div className="absolute inset-0 bg-gradient-to-r from-n0de-green/5 via-n0de-blue/5 to-n0de-green/5 rounded-3xl blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-n0de-green/20 to-n0de-blue/20 rounded-full blur-3xl opacity-30"></div>
          
          <div className="relative z-10">
            {/* Performance Badge */}
            <motion.div 
              className="inline-flex items-center space-x-3 bg-gradient-to-r from-n0de-green/30 via-n0de-blue/30 to-n0de-green/30 border-2 border-n0de-green/50 rounded-2xl px-8 py-4 mb-8 backdrop-blur-xl shadow-2xl"
              initial={{ scale: 0.8, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.6, type: "spring", bounce: 0.4 }}
              whileHover={{ scale: 1.05, borderColor: "rgba(16, 185, 129, 0.8)" }}
            >
              <div className="relative">
                <Trophy className="w-7 h-7 text-n0de-green drop-shadow-lg" />
                <div className="absolute inset-0 bg-n0de-green/20 rounded-full blur-md"></div>
              </div>
              <span className="text-n0de-green font-black text-lg tracking-wider drop-shadow-lg">
                #1 FASTEST SOLANA RPC
              </span>
              <div className="w-2 h-2 bg-n0de-green rounded-full animate-pulse"></div>
            </motion.div>
            
            {/* Main Title */}
            <motion.h2 
              className="text-4xl lg:text-5xl font-bold mb-8 leading-tight"
              style={{ fontFamily: 'var(--font-display)' }}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5, duration: 0.8 }}
            >
              <span 
                style={{
                  background: 'linear-gradient(135deg, #01d3f4, #0b86f8, #00255e)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}
              >
                Lightning-Fast Performance
              </span>
              <span className="text-white"> Analysis</span>
            </motion.h2>
            
            {/* Subtitle with Stats */}
            <motion.div 
              className="max-w-5xl mx-auto"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.7, duration: 0.6 }}
            >
              <div className="text-xl lg:text-2xl text-gray-300 mb-6 leading-relaxed">
                Independent benchmarking reveals n0de&apos;s
                <span className="relative mx-2 inline-block">
                  <span className="text-n0de-green font-bold text-2xl lg:text-3xl">9ms average latency</span>
                  <span className="absolute -bottom-1 left-0 w-full h-1 bg-gradient-to-r from-n0de-green to-n0de-blue rounded-full opacity-60"></span>
                </span>
                dominates the competition
              </div>
              
              {/* Key Stats Row */}
              <div className="flex flex-wrap justify-center gap-4 lg:gap-8">
                {[
                  { value: "<2ms", label: "Response Time" },
                  { value: "591+", label: "RPS Throughput" },
                  { value: "100%", label: "Success Rate" },
                  { value: "99.99%", label: "Uptime" }
                ].map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    className="flex flex-col items-center px-4 py-2 bg-gradient-to-r from-n0de-green/10 to-n0de-blue/10 rounded-xl border border-n0de-green/20 backdrop-blur-sm"
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.8 + (index * 0.1), duration: 0.4 }}
                    whileHover={{ scale: 1.1, y: -2 }}
                  >
                    <span className="text-2xl font-bold text-n0de-green">{stat.value}</span>
                    <span className="text-xs text-gray-400 font-medium">{stat.label}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Detailed Latency Percentiles - NEW SECTION */}
        <motion.div
          className="mb-20"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <motion.h3 
            className="text-3xl font-bold text-center mb-12"
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <span className="gradient-text">Detailed Latency</span> Analysis
          </motion.h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            {[
              { percentile: 'P50', value: '1.1ms', label: 'Median response', color: 'n0de-green' },
              { percentile: 'P90', value: '2.9ms', label: '90th percentile', color: 'n0de-blue' },
              { percentile: 'P99', value: '68.6ms', label: '99th percentile', color: 'purple-400' },
              { percentile: 'Range', value: '0.6-68.6ms', label: 'Min/Max spread', color: 'cyan-400' }
            ].map((metric, index) => (
              <motion.div
                key={metric.percentile}
                className={`p-6 rounded-xl bg-gradient-to-br from-${metric.color}/20 to-${metric.color}/5 border-2 border-${metric.color}/30`}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 * index, duration: 0.6 }}
                whileHover={{ scale: 1.05, y: -5 }}
              >
                <div className="text-center">
                  <div className="text-sm text-gray-400 mb-2">{metric.percentile}</div>
                  <div className={`text-3xl font-bold mb-2 text-${metric.color}`}>
                    {metric.value}
                  </div>
                  <div className={`text-sm text-${metric.color}/80`}>{metric.label}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Performance Hero Stats - Redesigned */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <motion.div 
            className="group cursor-pointer"
            initial={{ opacity: 0, scale: 0.8, rotateY: -15 }}
            whileInView={{ opacity: 1, scale: 1, rotateY: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, duration: 0.8, type: "spring" }}
            whileHover={{ scale: 1.05, y: -10, rotateY: 5 }}
          >
            <div className="relative p-8 rounded-2xl bg-gradient-to-br from-n0de-green/20 via-n0de-blue/10 to-n0de-green/5 border-2 border-n0de-green/30 group-hover:border-n0de-green/60 transition-all duration-500 shadow-2xl shadow-n0de-green/10 group-hover:shadow-n0de-green/30 backdrop-blur-sm">
              {/* Background Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-n0de-green/10 to-n0de-blue/5 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              {/* Icon */}
              <div className="relative mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-n0de-green to-n0de-blue rounded-xl flex items-center justify-center mb-4 group-hover:rotate-12 transition-transform duration-500">
                  <Zap className="w-8 h-8 text-white drop-shadow-lg" />
                </div>
              </div>
              
              {/* Main Metric */}
              <div className="relative text-center">
                <div className="text-5xl font-black mb-2">
                  <span className="bg-gradient-to-r from-n0de-green via-white to-n0de-blue bg-clip-text text-transparent">
                    <AnimatedCounter endValue={2} suffix="ms" prefix="<" />
                  </span>
                </div>
                <div className="text-lg font-bold text-white mb-2">Lightning Response</div>
                <div className="text-sm text-n0de-green/80 font-medium mb-4">Local server latency</div>
                
                {/* Progress Visualization */}
                <div className="relative">
                  <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                    <AnimatedProgressBar percentage={98} color="n0de-green" delay={0.5} />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Slow</span>
                    <span>Ultra Fast</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div 
            className="group cursor-pointer"
            initial={{ opacity: 0, scale: 0.8, rotateY: -15 }}
            whileInView={{ opacity: 1, scale: 1, rotateY: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.8, type: "spring" }}
            whileHover={{ scale: 1.05, y: -10, rotateY: 5 }}
          >
            <div className="relative p-8 rounded-2xl bg-gradient-to-br from-green-500/20 via-emerald-400/10 to-green-600/5 border-2 border-green-400/30 group-hover:border-green-400/60 transition-all duration-500 shadow-2xl shadow-green-400/10 group-hover:shadow-green-400/30 backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-green-400/10 to-emerald-500/5 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <div className="relative mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mb-4 group-hover:rotate-12 transition-transform duration-500">
                  <CheckCircle className="w-8 h-8 text-white drop-shadow-lg" />
                </div>
              </div>
              
              <div className="relative text-center">
                <div className="text-5xl font-black mb-2">
                  <span className="bg-gradient-to-r from-green-400 via-white to-emerald-500 bg-clip-text text-transparent">
                    <AnimatedCounter endValue={100} suffix="%" />
                  </span>
                </div>
                <div className="text-lg font-bold text-white mb-2">Perfect Reliability</div>
                <div className="text-sm text-green-400/80 font-medium mb-4">vs 0-99.99% competitors</div>
                
                <div className="relative">
                  <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                    <AnimatedProgressBar percentage={100} color="green-400" delay={0.7} />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div 
            className="group cursor-pointer"
            initial={{ opacity: 0, scale: 0.8, rotateY: -15 }}
            whileInView={{ opacity: 1, scale: 1, rotateY: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5, duration: 0.8, type: "spring" }}
            whileHover={{ scale: 1.05, y: -10, rotateY: 5 }}
          >
            <div className="relative p-8 rounded-2xl bg-gradient-to-br from-blue-500/20 via-cyan-400/10 to-blue-600/5 border-2 border-blue-400/30 group-hover:border-blue-400/60 transition-all duration-500 shadow-2xl shadow-blue-400/10 group-hover:shadow-blue-400/30 backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 to-cyan-500/5 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <div className="relative mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center mb-4 group-hover:rotate-12 transition-transform duration-500">
                  <Clock className="w-8 h-8 text-white drop-shadow-lg" />
                </div>
              </div>
              
              <div className="relative text-center">
                <div className="text-4xl font-black mb-2">
                  <span className="bg-gradient-to-r from-blue-400 via-white to-cyan-500 bg-clip-text text-transparent">
                    0.6-68.6ms
                  </span>
                </div>
                <div className="text-lg font-bold text-white mb-2">Response Range</div>
                <div className="text-sm text-blue-400/80 font-medium mb-4">Min/Max latency spread</div>
                
                <div className="relative">
                  <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                    <AnimatedProgressBar percentage={95} color="blue-400" delay={0.9} />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Min</span>
                    <span>Max</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div 
            className="group cursor-pointer"
            initial={{ opacity: 0, scale: 0.8, rotateY: -15 }}
            whileInView={{ opacity: 1, scale: 1, rotateY: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.7, duration: 0.8, type: "spring" }}
            whileHover={{ scale: 1.05, y: -10, rotateY: 5 }}
          >
            <div className="relative p-8 rounded-2xl bg-gradient-to-br from-purple-500/20 via-violet-400/10 to-purple-600/5 border-2 border-purple-400/30 group-hover:border-purple-400/60 transition-all duration-500 shadow-2xl shadow-purple-400/10 group-hover:shadow-purple-400/30 backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-400/10 to-violet-500/5 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <div className="relative mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center mb-4 group-hover:rotate-12 transition-transform duration-500">
                  <Cpu className="w-8 h-8 text-white drop-shadow-lg" />
                </div>
              </div>
              
              <div className="relative text-center">
                <div className="text-5xl font-black mb-2">
                  <span className="bg-gradient-to-r from-purple-400 via-white to-violet-500 bg-clip-text text-transparent">
                    <AnimatedCounter endValue={591} suffix="+" />
                  </span>
                </div>
                <div className="text-lg font-bold text-white mb-2">Massive Throughput</div>
                <div className="text-sm text-purple-400/80 font-medium mb-4">Requests per second</div>
                
                <div className="relative">
                  <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                    <AnimatedProgressBar percentage={95} color="purple-400" delay={1.1} />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Basic</span>
                    <span>Enterprise</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Performance Comparison - Modern shadcn Design */}
        <motion.div
          className="mb-12"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8 bg-gray-900/50 border border-n0de-green/20">
              <TabsTrigger 
                value="overview" 
                className="data-[state=active]:bg-n0de-green data-[state=active]:text-black"
              >
                Performance Overview
              </TabsTrigger>
              <TabsTrigger 
                value="detailed" 
                className="data-[state=active]:bg-n0de-green data-[state=active]:text-black"
              >
                Detailed Metrics
              </TabsTrigger>
              <TabsTrigger 
                value="features" 
                className="data-[state=active]:bg-n0de-green data-[state=active]:text-black"
              >
                Feature Comparison
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-6">
              {performanceData.map((provider, index) => (
                <motion.div
                  key={provider.name}
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 * index, duration: 0.6 }}
                  whileHover={{ scale: 1.01, y: -2 }}
                >
                  <Card className={`relative overflow-hidden transition-all duration-500 hover:shadow-2xl ${
                    provider.position === 'leader'
                      ? 'bg-gradient-to-r from-n0de-green/10 via-n0de-blue/5 to-n0de-green/5 border-n0de-green/30 shadow-lg shadow-n0de-green/20'
                      : 'bg-gray-900/50 border-gray-700 hover:border-gray-600'
                  }`}>
                    {provider.position === 'leader' && (
                      <Badge className="absolute top-4 right-4 z-10 bg-n0de-green text-black hover:bg-n0de-green/90">
                        <Trophy className="w-4 h-4 mr-1" />
                        Leader
                      </Badge>
                    )}
                    
                    <CardHeader>
                      <CardTitle className={`text-3xl font-black flex items-center gap-4 ${
                        provider.position === 'leader' ? 'text-n0de-green' : 'text-white'
                      }`} style={{ fontFamily: 'var(--font-display)' }}>
                        {provider.name}
                        {provider.position === 'leader' && (
                          <CardDescription className="text-sm text-n0de-green font-medium m-0">
                            Europe&apos;s Fastest
                          </CardDescription>
                        )}
                      </CardTitle>
                    </CardHeader>
                    
                    <CardContent className="space-y-6">
                      {/* Performance Metrics Grid */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="text-center">
                          <div className={`text-2xl font-bold mb-1 ${
                            provider.position === 'leader' ? 'text-n0de-green' : 'text-white'
                          }`}>
                            {provider.latency}
                          </div>
                          <div className="text-sm text-gray-400">Latency</div>
                        </div>
                        <div className="text-center">
                          <div className={`text-2xl font-bold mb-1 ${
                            provider.position === 'leader' ? 'text-n0de-green' : 'text-white'
                          }`}>
                            {provider.rpsLimit}
                          </div>
                          <div className="text-sm text-gray-400">RPS Limit</div>
                        </div>
                        <div className="text-center">
                          <div className={`text-2xl font-bold mb-1 ${
                            provider.successRate === 100 ? 'text-n0de-green' : 'text-white'
                          }`}>
                            {provider.successRate}%
                          </div>
                          <div className="text-sm text-gray-400">Success Rate</div>
                        </div>
                        <div className="text-center">
                          <div className={`text-2xl font-bold mb-1 ${
                            provider.uptime >= 99.99 ? 'text-n0de-green' : 'text-white'
                          }`}>
                            {provider.uptime}%
                          </div>
                          <div className="text-sm text-gray-400">Uptime</div>
                        </div>
                      </div>
                      
                      {/* Features */}
                      <div>
                        <div className="text-sm text-gray-400 mb-3">Key Features</div>
                        <div className="flex flex-wrap gap-2">
                          {provider.features?.map((feature, idx) => (
                            <Badge
                              key={idx}
                              variant={provider.position === 'leader' ? 'default' : 'secondary'}
                              className={provider.position === 'leader'
                                ? 'bg-n0de-green/20 text-n0de-green border border-n0de-green/30 hover:bg-n0de-green/30'
                                : 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700'
                              }
                            >
                              {feature}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      {/* Advantages/Limitations */}
                      {provider.position === 'leader' ? (
                        <div>
                          <div className="text-sm text-n0de-green font-semibold mb-2">Key Advantages</div>
                          <ul className="space-y-1">
                            {provider.advantages?.slice(0, 3).map((advantage, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm text-gray-300">
                                <CheckCircle className="w-4 h-4 text-n0de-green mt-0.5 flex-shrink-0" />
                                <span>{advantage}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <div>
                          <div className="text-sm text-gray-400 font-semibold mb-2">Limitations vs n0de</div>
                          <ul className="space-y-1">
                            {provider.limitations?.slice(0, 2).map((limitation, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm text-gray-400">
                                <div className="w-4 h-4 bg-gray-600 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                                  <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                                </div>
                                <span>{limitation}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </TabsContent>
            
            <TabsContent value="detailed" className="space-y-6">
              <Card className="bg-gray-900/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Detailed Performance Metrics</CardTitle>
                  <CardDescription className="text-gray-400">Complete performance comparison across all providers</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-700">
                        <TableHead className="text-white font-bold">Provider</TableHead>
                        <TableHead className="text-white font-bold">Latency</TableHead>
                        <TableHead className="text-white font-bold">RPS Limit</TableHead>
                        <TableHead className="text-white font-bold">Uptime</TableHead>
                        <TableHead className="text-white font-bold">Key Features</TableHead>
                        <TableHead className="text-white font-bold">Pricing</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {performanceData.map((provider) => (
                        <TableRow key={provider.name} className="border-gray-700 hover:bg-gray-800/50">
                          <TableCell className={`font-bold ${
                            provider.position === 'leader' ? 'text-n0de-green' : 'text-white'
                          }`}>
                            <div className="flex items-center gap-2">
                              {provider.name}
                              {provider.position === 'leader' && (
                                <Badge className="bg-n0de-green text-black text-xs">
                                  <Trophy className="w-3 h-3 mr-1" />
                                  #1
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className={provider.position === 'leader' ? 'text-n0de-green font-bold' : 'text-gray-300'}>
                            {provider.latency}
                          </TableCell>
                          <TableCell className={provider.position === 'leader' ? 'text-n0de-green font-bold' : 'text-gray-300'}>
                            {provider.rpsLimit}
                          </TableCell>
                          <TableCell className={provider.uptime >= 99.99 ? 'text-n0de-green font-bold' : 'text-gray-300'}>
                            {provider.uptime}%
                          </TableCell>
                          <TableCell className="text-gray-300 text-sm max-w-xs">
                            {provider.keyFeatures}
                          </TableCell>
                          <TableCell className={`font-bold ${
                            provider.pricing === '$299/month' ? 'text-n0de-green' :
                            provider.pricing === 'Free (limited)' ? 'text-blue-400' :
                            'text-red-400'
                          }`}>
                            {provider.pricing}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="features" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-gradient-to-r from-n0de-green/10 via-n0de-blue/5 to-n0de-green/5 border-n0de-green/30">
                  <CardHeader>
                    <CardTitle className="text-n0de-green flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      n0de Advantages
                    </CardTitle>
                    <CardDescription className="text-gray-300">What makes n0de the clear leader</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {performanceData[0].advantages?.map((advantage, index) => (
                      <motion.div
                        key={index}
                        className="flex items-start gap-2 p-3 bg-n0de-green/5 rounded-lg border border-n0de-green/10"
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 * index }}
                      >
                        <CheckCircle className="w-4 h-4 text-n0de-green mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-300">{advantage}</span>
                      </motion.div>
                    ))}
                  </CardContent>
                </Card>
                
                <Card className="bg-gray-900/50 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Info className="w-5 h-5 text-n0de-blue" />
                      Feature Matrix
                    </CardTitle>
                    <CardDescription className="text-gray-400">Complete feature comparison</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      { feature: 'MEV Protection', n0de: true, others: false },
                      { feature: 'Jito Bundle Integration', n0de: true, others: false },
                      { feature: 'Sub-10ms Latency', n0de: true, others: false },
                      { feature: '100% Success Rate', n0de: true, others: false },
                      { feature: 'Priority Fee Optimization', n0de: true, others: true },
                      { feature: 'Basic RPC Endpoints', n0de: true, others: true },
                    ].map((item, index) => (
                      <div key={item.feature} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0">
                        <span className="text-sm text-gray-300">{item.feature}</span>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-400">n0de</span>
                            {item.n0de ? (
                              <CheckCircle className="w-4 h-4 text-n0de-green" />
                            ) : (
                              <div className="w-4 h-4 rounded-full bg-gray-600" />
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-400">Others</span>
                            {item.others ? (
                              <CheckCircle className="w-4 h-4 text-gray-500" />
                            ) : (
                              <div className="w-4 h-4 rounded-full bg-gray-600" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Key Findings - Interactive */}
        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <motion.div 
            className="card group hover:shadow-2xl hover:shadow-n0de-green/20 transition-all duration-500"
            whileHover={{ scale: 1.02, y: -5 }}
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <div className="p-6">
              <h3 className="text-2xl font-bold mb-4 text-n0de-green flex items-center space-x-2">
                <CheckCircle className="w-6 h-6" />
                <span>n0de Performance Advantages</span>
              </h3>
              <ul className="space-y-3">
                {performanceData[0].advantages?.map((advantage, index) => (
                  <motion.li 
                    key={index} 
                    className="flex items-start space-x-2 group"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 * index }}
                    whileHover={{ x: 10 }}
                  >
                    <CheckCircle className="w-4 h-4 text-n0de-green mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                    <span className="text-sm group-hover:text-n0de-green transition-colors">{advantage}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>

          <motion.div 
            className="card group hover:shadow-2xl hover:shadow-n0de-blue/20 transition-all duration-500"
            whileHover={{ scale: 1.02, y: -5 }}
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
          >
            <div className="p-6">
              <h3 className="text-2xl font-bold mb-4 flex items-center space-x-2">
                <Info className="w-6 h-6 text-n0de-blue group-hover:rotate-12 transition-transform" />
                <span>Technical Specifications</span>
              </h3>
              <div className="space-y-3 text-sm">
                {[
                  { label: 'CPU:', value: 'AMD EPYC 9354 32-Core' },
                  { label: 'RAM:', value: '755GB DDR4' },
                  { label: 'Storage:', value: '2x 3.5TB NVMe' },
                  { label: 'Network:', value: 'UK Direct Connection' },
                  { label: 'Consistency:', value: '±1ms variance' }
                ].map((spec, index) => (
                  <motion.div 
                    key={spec.label}
                    className="flex justify-between group hover:bg-n0de-green/10 rounded-lg p-2 -m-2 transition-all cursor-pointer"
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 * index }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <span className="text-white group-hover:text-n0de-green transition-colors">{spec.label}</span>
                    <span className="font-mono text-n0de-green group-hover:scale-105 transition-transform">{spec.value}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Trading & DeFi Performance */}
        <motion.div
          className="mb-20"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <motion.h3 
            className="text-4xl font-bold text-center mb-12"
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <span className="gradient-text">Trading & DeFi</span> Performance
          </motion.h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            <motion.div
              className="card group hover:shadow-2xl hover:shadow-n0de-green/20 transition-all duration-500"
              whileHover={{ scale: 1.02, y: -5 }}
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <div className="p-8">
                <h4 className="text-2xl font-bold mb-6 text-n0de-green flex items-center space-x-2">
                  <TrendingUp className="w-7 h-7" />
                  <span>Trading Metrics</span>
                </h4>
                <div className="space-y-4">
                  {[
                    { metric: 'Transaction Landing Rate', value: '100%', detail: 'Perfect execution' },
                    { metric: 'MEV Protection', value: 'Active', detail: 'Jito bundle integration' },
                    { metric: 'Priority Fee Optimization', value: 'Enabled', detail: 'Auto-adjustment' },
                    { metric: 'Stake-Weighted QoS', value: 'Premium', detail: 'Validator priority' }
                  ].map((item, index) => (
                    <motion.div
                      key={item.metric}
                      className="flex justify-between items-center py-3 px-4 bg-n0de-green/5 rounded-lg border border-n0de-green/10 hover:border-n0de-green/20 transition-colors"
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.1 * index }}
                      whileHover={{ scale: 1.02 }}
                    >
                      <div>
                        <div className="font-semibold text-white">{item.metric}</div>
                        <div className="text-sm text-gray-400">{item.detail}</div>
                      </div>
                      <div className="text-n0de-green font-bold text-lg">{item.value}</div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>

            <motion.div
              className="card group hover:shadow-2xl hover:shadow-n0de-blue/20 transition-all duration-500"
              whileHover={{ scale: 1.02, y: -5 }}
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
            >
              <div className="p-8">
                <h4 className="text-2xl font-bold mb-6 text-n0de-blue flex items-center space-x-2">
                  <Zap className="w-7 h-7" />
                  <span>DeFi Operations</span>
                </h4>
                <div className="space-y-4">
                  {[
                    { operation: 'Swap Execution', latency: '10.7ms', status: 'Ultra Fast', description: 'DEX swap completion time' },
                    { operation: 'Liquidation Detection', latency: '8.6ms', status: 'Lightning', description: 'Position monitoring speed' },
                    { operation: 'Oracle Updates', latency: '7.5ms', status: 'Instant', description: 'Price feed freshness' },
                    { operation: 'Cross-Program Calls', latency: '12.9ms', status: 'Optimal', description: 'Multi-program interactions' }
                  ].map((item, index) => (
                    <motion.div
                      key={item.operation}
                      className="flex justify-between items-center py-3 px-4 bg-n0de-blue/5 rounded-lg border border-n0de-blue/10 hover:border-n0de-blue/20 transition-colors"
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.1 * index }}
                      whileHover={{ scale: 1.02 }}
                    >
                      <div>
                        <div className="font-semibold text-white">{item.operation}</div>
                        <div className="text-sm text-n0de-blue">{item.status}</div>
                        <div className="text-xs text-gray-400">{item.description}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-n0de-blue font-bold text-lg">{item.latency}</div>
                        <div className="text-xs text-gray-400">avg response</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Jito Bundle Integration */}
        <motion.div
          className="mb-20"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <motion.h3 
            className="text-4xl font-bold text-center mb-12"
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <span className="gradient-text">Jito Bundle Network</span> Integration
          </motion.h3>

          <div className="card mb-8">
            <div className="p-8">
              <div className="text-center mb-8">
                <p className="text-xl text-gray-300 mb-6">
                  Direct integration with Jito&apos;s bundle network for MEV protection and atomic transaction execution
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                  <div className="text-center p-3 bg-n0de-green/10 rounded-lg border border-n0de-green/20">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <span className="text-lg">🇬🇧</span>
                      <span className="font-semibold text-n0de-green">London</span>
                    </div>
                    <div className="text-2xl font-bold text-n0de-green">5ms</div>
                    <div className="text-xs text-n0de-green">Active</div>
                  </div>
                  <div className="text-center p-3 bg-n0de-green/10 rounded-lg border border-n0de-green/20">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <span className="text-lg">🇳🇱</span>
                      <span className="font-semibold text-n0de-green">Amsterdam</span>
                    </div>
                    <div className="text-2xl font-bold text-n0de-green">15ms</div>
                    <div className="text-xs text-n0de-green">Active</div>
                  </div>
                  <div className="text-center p-3 bg-n0de-green/10 rounded-lg border border-n0de-green/20">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <span className="text-lg">🇩🇪</span>
                      <span className="font-semibold text-n0de-green">Frankfurt</span>
                    </div>
                    <div className="text-2xl font-bold text-n0de-green">19ms</div>
                    <div className="text-xs text-n0de-green">Active</div>
                  </div>
                  <div className="text-center p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <span className="text-lg">🇺🇸</span>
                      <span className="font-semibold text-orange-400">New York</span>
                    </div>
                    <div className="text-2xl font-bold text-orange-400">94ms</div>
                    <div className="text-xs text-orange-400">Higher</div>
                  </div>
                  <div className="text-center p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <span className="text-lg">🇯🇵</span>
                      <span className="font-semibold text-red-400">Tokyo</span>
                    </div>
                    <div className="text-2xl font-bold text-red-400">297ms</div>
                    <div className="text-xs text-red-400">High</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { label: 'Bundle Volume', value: 'Coming Soon', icon: '📊' },
                    { label: 'Success Rate', value: 'Coming Soon', icon: '✅' },
                    { label: 'Average Tip', value: 'Coming Soon', icon: '💰' },
                    { label: 'Profit Tracking', value: 'Coming Soon', icon: '📈' }
                  ].map((stat, index) => (
                    <motion.div
                      key={stat.label}
                      className="text-center p-4 bg-gradient-to-br from-zinc-800/10 to-zinc-700/10 rounded-xl border border-zinc-600/20 opacity-75"
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 0.75, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.1 * index, duration: 0.5 }}
                    >
                      <div className="text-2xl mb-2 opacity-60">{stat.icon}</div>
                      <div className="text-lg font-semibold text-zinc-400 mb-1">{stat.value}</div>
                      <div className="text-sm text-zinc-500">{stat.label}</div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Use Case Optimizations - NEW SECTION */}
        <motion.div
          className="mb-20"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <motion.h3 
            className="text-4xl font-bold text-center mb-12"
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <span className="gradient-text">Optimized For</span> Your Use Case
          </motion.h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {[
              {
                title: "High-Frequency Trading",
                icon: TrendingUp,
                features: [
                  "Sub-10ms latency for order execution",
                  "Direct validator connections",
                  "MEV protection built-in",
                  "Priority fee optimization",
                  "Dedicated node options available"
                ],
                color: "n0de-green"
              },
              {
                title: "DeFi Applications", 
                icon: Zap,
                features: [
                  "Fast swap execution",
                  "Liquidation monitoring",
                  "Oracle price feeds",
                  "Cross-program optimization",
                  "99.99% uptime guarantee"
                ],
                color: "n0de-blue"
              },
              {
                title: "NFT & Gaming",
                icon: Target,
                features: [
                  "Rapid mint detection",
                  "Metadata caching",
                  "Bulk transfer support",
                  "Game state synchronization",
                  "High throughput capacity"
                ],
                color: "purple-400"
              },
              {
                title: "dApp Development",
                icon: Globe,
                features: [
                  "Full RPC method support",
                  "WebSocket connections", 
                  "Multiple SDK languages",
                  "Developer documentation",
                  "Custom deployment options"
                ],
                color: "cyan-400"
              }
            ].map((useCase, index) => (
              <motion.div
                key={useCase.title}
                className={`card bg-gradient-to-br from-${useCase.color}/10 to-${useCase.color}/5 border-2 border-${useCase.color}/30`}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 * index, duration: 0.6 }}
                whileHover={{ scale: 1.02, y: -5 }}
              >
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <useCase.icon className={`w-7 h-7 text-${useCase.color}`} />
                    <h4 className={`text-xl font-bold text-${useCase.color}`}>{useCase.title}</h4>
                  </div>
                  <ul className="space-y-2">
                    {useCase.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-gray-300">
                        <CheckCircle className={`w-4 h-4 text-${useCase.color} mt-0.5 flex-shrink-0`} />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Performance Impact - Interactive */}
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <motion.h3 
            className="text-3xl font-bold mb-8"
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            Why Sub-10ms Performance Matters
          </motion.h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Target,
                title: "MEV Opportunities",
                description: "9ms latency enables capture of profitable MEV opportunities that slower providers miss"
              },
              {
                icon: TrendingUp,
                title: "HFT Trading",
                description: "Ultra-low latency supports high-frequency trading and millisecond arbitrage strategies"
              },
              {
                icon: Zap,
                title: "Real-time DeFi",
                description: "Perfect for responsive DeFi applications requiring instant blockchain state queries"
              },
              {
                icon: Globe,
                title: "European Advantage",
                description: "Strategic UK positioning provides optimal routing to European Solana validators"
              }
            ].map((item, index) => (
              <motion.div 
                key={index} 
                className="card text-center group hover:shadow-2xl hover:shadow-n0de-green/20 transition-all duration-500 cursor-pointer"
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 * index, duration: 0.5 }}
                whileHover={{ scale: 1.05, y: -10 }}
              >
                <div className="p-6">
                  <motion.div 
                    className="w-12 h-12 bg-n0de-green/20 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-n0de-green/30 transition-all"
                    whileHover={{ rotate: 360, scale: 1.2 }}
                    transition={{ duration: 0.6 }}
                  >
                    <item.icon className="w-6 h-6 text-n0de-green group-hover:scale-110 transition-transform" />
                  </motion.div>
                  <motion.h4 
                    className="font-bold mb-2 group-hover:text-n0de-green transition-colors"
                    whileHover={{ scale: 1.1 }}
                  >
                    {item.title}
                  </motion.h4>
                  <p className="text-sm text-white group-hover:text-gray-200 transition-colors">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Infrastructure & Support - NEW SECTION */}
        <motion.div
          className="mb-20"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <motion.h3 
            className="text-4xl font-bold text-center mb-12"
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <span className="gradient-text">Infrastructure</span> & Support
          </motion.h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="bg-gradient-to-br from-n0de-green/10 to-n0de-blue/10 border-n0de-green/30">
              <CardHeader>
                <CardTitle className="text-n0de-green flex items-center gap-2">
                  <Server className="w-5 h-5" />
                  Current Infrastructure
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { feature: 'Location: Premium Datacenter (Local to Server)', status: true },
                  { feature: 'Direct Validator Connection', status: true },
                  { feature: 'Dedicated Nodes Available', status: true },
                  { feature: 'Custom VPS Deployment', status: true },
                  { feature: '24/7 Monitoring', status: true }
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-n0de-green flex-shrink-0" />
                    <span className="text-sm text-gray-300">{item.feature}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/30">
              <CardHeader>
                <CardTitle className="text-yellow-400 flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Coming Soon
                </CardTitle>
                <CardDescription className="text-yellow-300">Exciting features in development</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { feature: '🚀 gRPC Support for streaming data', icon: '🚀' },
                  { feature: '📶 Enhanced WebSocket streaming', icon: '📶' },
                  { feature: '📊 Advanced analytics dashboard', icon: '📊' },
                  { feature: '🔔 Real-time alerts system', icon: '🔔' },
                  { feature: '🤖 AI-powered optimization', icon: '🤖' }
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-sm text-gray-300">{item.feature.replace(item.icon + ' ', '')}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Pricing Transparency */}
        <div className="mt-16">
          <div className="card max-w-4xl mx-auto">
            <div className="p-8 text-center">
              <h3 className="text-3xl font-bold mb-6 gradient-text">True Cost Comparison: No Hidden Fees</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="bg-gradient-to-r from-n0de-green/10 to-n0de-blue/10 rounded-lg p-6 border border-n0de-green/20">
                  <h4 className="text-xl font-bold text-n0de-green mb-4">n0de - Transparent</h4>
                  <div className="text-3xl font-bold gradient-text mb-2">$299/month</div>
                  <div className="text-lg font-semibold mb-2">1 Request = 1 Request</div>
                  <div className="text-n0de-green">$0.0046 per 1K requests</div>
                  <div className="text-sm text-white mt-2">65M actual requests included</div>
                </div>
                <div className="bg-bg-main rounded-lg p-6 border border-red-400/20">
                  <h4 className="text-xl font-bold text-red-400 mb-4">Competitors - Complex</h4>
                  <div className="text-3xl font-bold text-red-400 mb-2">$1500-$1900</div>
                  <div className="text-lg font-semibold text-red-400 mb-2">1 Request = 3-50 Credits</div>
                  <div className="text-red-400">$1.90-$3.00 per 1K</div>
                  <div className="text-sm text-white mt-2">Complex credit/compute unit systems</div>
                </div>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center space-x-4 bg-bg-main rounded-lg p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-n0de-green">84-95%</div>
                    <div className="text-sm text-white">Performance Advantage</div>
                  </div>
                  <div className="text-white">+</div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-n0de-green">80-85%</div>
                    <div className="text-sm text-white">Cost Savings</div>
                  </div>
                  <div className="text-white">=</div>
                  <div className="text-center">
                    <div className="text-2xl font-bold gradient-text">Superior Value</div>
                    <div className="text-sm text-white">Best Performance/Price</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}