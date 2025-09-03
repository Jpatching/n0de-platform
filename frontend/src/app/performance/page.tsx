'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Trophy, Zap, Shield, Target, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import PerformanceComparison from '@/components/PerformanceComparison';

export default function PerformancePage() {
  return (
    <div className="min-h-screen bg-bg-main">
      {/* Header */}
      <div className="bg-bg-elevated border-b border-border">
        <div className="container-width">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center space-x-2 text-text-secondary hover:text-text-primary">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
            </Link>
            
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-n0de-green to-n0de-blue rounded-lg flex items-center justify-center">
                <span className="text-black font-bold text-lg">n</span>
              </div>
              <div>
                <h1 className="text-xl font-bold gradient-text">Performance Benchmarks</h1>
                <p className="text-xs text-text-secondary">Independent RPC Provider Testing</p>
              </div>
            </div>
            
            <div className="w-16"></div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="container-width py-16">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-n0de-green/20 to-n0de-blue/20 border border-n0de-green/30 rounded-xl px-6 py-3 mb-6">
              <Trophy className="w-6 h-6 text-n0de-green" />
              <span className="text-n0de-green font-bold text-lg tracking-wide">#1 UK SOLANA RPC NODE</span>
            </div>
            <h1 className="text-5xl font-bold mb-6">
              Performance <span className="gradient-text">Leadership</span>
            </h1>
            <p className="text-2xl text-text-secondary max-w-4xl mx-auto">
              Independent analysis proves n0de delivers <span className="text-n0de-green font-semibold">84% faster performance than QuickNode</span> 
              and <span className="text-n0de-blue font-semibold">81% faster than Helius</span> with optimal European infrastructure positioning.
            </p>
          </motion.div>

          {/* Key Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto"
          >
            <div className="text-center">
              <div className="text-4xl font-bold gradient-text mb-2">84%</div>
              <div className="text-sm text-text-secondary">Faster than QuickNode (57.4ms)</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold gradient-text mb-2">81%</div>
              <div className="text-sm text-text-secondary">Faster than Helius (47ms)</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold gradient-text mb-2">9ms</div>
              <div className="text-sm text-text-secondary">Ultra-Low Latency</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold gradient-text mb-2">±1ms</div>
              <div className="text-sm text-text-secondary">Perfect Consistency</div>
            </div>
          </motion.div>
        </div>

        {/* Performance Comparison Component */}
        <PerformanceComparison />

        {/* UK Market Leadership */}
        <motion.div
          className="mt-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.6 }}
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-6">European Market Leadership</h2>
            <p className="text-text-secondary max-w-3xl mx-auto">
              Strategic European infrastructure positioning delivers unmatched performance advantages for European traders and enterprises.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <div className="card text-center">
              <div className="p-6">
                <div className="w-12 h-12 bg-n0de-green/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Target className="w-6 h-6 text-n0de-green" />
                </div>
                <h3 className="font-bold mb-2">EU Validator Proximity</h3>
                <p className="text-sm text-text-secondary">
                  Direct UK connection provides optimal routing to European Solana validators, reducing network hops and latency.
                </p>
              </div>
            </div>

            <div className="card text-center">
              <div className="p-6">
                <div className="w-12 h-12 bg-n0de-blue/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-6 h-6 text-n0de-blue" />
                </div>
                <h3 className="font-bold mb-2">London Trading Hours</h3>
                <p className="text-sm text-text-secondary">
                  Peak performance during European trading sessions when speed matters most for arbitrage and MEV opportunities.
                </p>
              </div>
            </div>

            <div className="card text-center">
              <div className="p-6">
                <div className="w-12 h-12 bg-n0de-purple/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-6 h-6 text-n0de-purple" />
                </div>
                <h3 className="font-bold mb-2">Regulatory Advantage</h3>
                <p className="text-sm text-text-secondary">
                  UK-based infrastructure with clear regulatory framework for institutional and enterprise blockchain adoption.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Why Performance Matters */}
        <motion.div
          className="mt-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.8 }}
        >
          <h2 className="text-3xl font-bold text-center mb-12">Why Sub-10ms Performance Matters</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card text-center">
              <div className="p-6">
                <div className="w-12 h-12 bg-n0de-green/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-6 h-6 text-n0de-green" />
                </div>
                <h3 className="font-bold mb-2">Faster Trading</h3>
                <p className="text-sm text-text-secondary">
                  9ms response times enable high-frequency trading and arbitrage opportunities that slower providers miss.
                </p>
              </div>
            </div>

            <div className="card text-center">
              <div className="p-6">
                <div className="w-12 h-12 bg-n0de-blue/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-6 h-6 text-n0de-blue" />
                </div>
                <h3 className="font-bold mb-2">Better UX</h3>
                <p className="text-sm text-text-secondary">
                  Sub-10ms latency creates seamless user experiences for DeFi applications and NFT marketplaces.
                </p>
              </div>
            </div>

            <div className="card text-center">
              <div className="p-6">
                <div className="w-12 h-12 bg-n0de-purple/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Target className="w-6 h-6 text-n0de-purple" />
                </div>
                <h3 className="font-bold mb-2">MEV Opportunities</h3>
                <p className="text-sm text-text-secondary">
                  Perfect synchronization (0 slots behind) ensures you never miss profitable MEV opportunities.
                </p>
              </div>
            </div>

            <div className="card text-center">
              <div className="p-6">
                <div className="w-12 h-12 bg-n0de-orange/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-6 h-6 text-n0de-orange" />
                </div>
                <h3 className="font-bold mb-2">Reliable Data</h3>
                <p className="text-sm text-text-secondary">
                  100% success rate means your applications never fail due to RPC timeouts or connection issues.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Technical Details */}
        <motion.div
          className="mt-16 grid grid-cols-1 lg:grid-cols-2 gap-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.8 }}
        >
          <div className="card">
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center space-x-2">
                <Zap className="w-5 h-5 text-n0de-green" />
                <span>Network Architecture</span>
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Processor:</span>
                  <span className="font-mono">AMD EPYC 9354 32-Core</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Memory:</span>
                  <span className="font-mono">755GB DDR4</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Storage:</span>
                  <span className="font-mono">2x 3.5TB NVMe SSD</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Network:</span>
                  <span className="font-mono">UK Direct Connection</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Sync Status:</span>
                  <span className="font-mono text-n0de-green">0 slots behind</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center space-x-2">
                <Target className="w-5 h-5 text-n0de-blue" />
                <span>Benchmark Results</span>
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-secondary">getSlot:</span>
                  <span className="font-mono text-n0de-green">9ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">getBalance:</span>
                  <span className="font-mono text-n0de-green">10ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">getLatestBlockhash:</span>
                  <span className="font-mono text-n0de-green">11ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">getEpochInfo:</span>
                  <span className="font-mono text-n0de-green">9ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Success Rate:</span>
                  <span className="font-mono text-n0de-green">100%</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Call to Action */}
        <motion.div
          className="text-center mt-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.0 }}
        >
          <div className="card max-w-2xl mx-auto">
            <div className="p-8">
              <h3 className="text-2xl font-bold mb-4">Experience the Performance Difference</h3>
              <p className="text-text-secondary mb-6">
                Join the fastest-growing Solana developers who chose n0de for unmatched performance and reliability.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/payment" className="btn-primary">
                  Start Building Today
                </Link>
                <Link href="/dashboard" className="btn-secondary">
                  View Dashboard
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}