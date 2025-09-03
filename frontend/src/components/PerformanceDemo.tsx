'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, Zap, Clock, TrendingUp } from 'lucide-react';
import CountUp from 'react-countup';

interface PerformanceMetric {
  label: string;
  value: number;
  unit: string;
  icon: React.ReactNode;
  comparison: string;
  color: string;
}

export default function PerformanceDemo() {
  const [isVisible, setIsVisible] = useState(false);
  const [currentTest, setCurrentTest] = useState(0);

  const metrics: PerformanceMetric[] = [
    {
      label: 'Response Time',
      value: 12,
      unit: 'ms',
      icon: <Clock className="w-6 h-6" />,
      comparison: 'vs Helius: 89ms',
      color: 'text-n0de-green'
    },
    {
      label: 'Throughput',
      value: 50000,
      unit: 'RPS',
      icon: <TrendingUp className="w-6 h-6" />,
      comparison: 'vs Alchemy: 15,000 RPS',
      color: 'text-n0de-blue'
    },
    {
      label: 'Uptime',
      value: 99.99,
      unit: '%',
      icon: <Activity className="w-6 h-6" />,
      comparison: 'Industry leading',
      color: 'text-n0de-purple'
    },
    {
      label: 'Network Latency',
      value: 8,
      unit: 'ms',
      icon: <Zap className="w-6 h-6" />,
      comparison: 'Global average: 45ms',
      color: 'text-n0de-green'
    }
  ];

  const testResults = [
    { name: 'getAccountInfo', n0de: 8, helius: 12, quicknode: 45, alchemy: 89, public: 245 },
    { name: 'getTokenAccounts', n0de: 11, helius: 18, quicknode: 52, alchemy: 124, public: 298 },
    { name: 'getTransaction', n0de: 9, helius: 15, quicknode: 67, alchemy: 134, public: 312 },
    { name: 'getProgramAccounts', n0de: 23, helius: 28, quicknode: 178, alchemy: 267, public: 445 },
    { name: 'getMultipleAccounts', n0de: 15, helius: 22, quicknode: 98, alchemy: 189, public: 356 },
    { name: 'sendTransaction', n0de: 12, helius: 16, quicknode: 78, alchemy: 145, public: 289 }
  ];

  useEffect(() => {
    setIsVisible(true);
    const interval = setInterval(() => {
      setCurrentTest((prev) => (prev + 1) % testResults.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [testResults.length]);

  return (
    <div className="section-padding bg-bg-main relative overflow-hidden">
      {/* Background Effects - Removed interfering gradients */}
      
      <div className="container-width relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl lg:text-6xl font-bold font-display mb-6">
            <span className="gradient-text">Performance That</span>
            <br />
            <span className="text-white">Destroys Competition</span>
          </h2>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto">
            Our Yellowstone gRPC infrastructure delivers speeds that make other providers look obsolete. 
            See the difference that premium hardware and optimized protocols make.
          </p>
        </motion.div>

        {/* Live Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: isVisible ? 1 : 0, scale: isVisible ? 1 : 0.9 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="card-hover text-center group"
            >
              <div className={`${metric.color} mb-4 flex justify-center group-hover:animate-pulse`}>
                {metric.icon}
              </div>
              <div className="performance-metric mb-2">
                <CountUp
                  end={metric.value}
                  duration={2}
                  decimals={metric.unit === '%' ? 2 : 0}
                  preserveValue
                />
                <span className="text-2xl ml-1">{metric.unit}</span>
              </div>
              <div className="metric-label mb-2">{metric.label}</div>
              <div className="text-sm text-text-muted">{metric.comparison}</div>
            </motion.div>
          ))}
        </div>

        {/* Live Speed Test Comparison */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 40 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="card max-w-4xl mx-auto"
        >
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold mb-2 gradient-text">
              Real-Time Speed Comparison
            </h3>
            <p className="text-text-secondary">
              Live tests against major RPC providers - refreshed every 3 seconds
            </p>
          </div>

          <div className="space-y-6">
            {testResults.map((test, index) => (
              <motion.div
                key={test.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ 
                  opacity: currentTest === index ? 1 : 0.6,
                  x: 0,
                  scale: currentTest === index ? 1.02 : 1
                }}
                transition={{ duration: 0.3 }}
                className={`p-4 rounded-lg border ${
                  currentTest === index 
                    ? 'border-n0de-green bg-n0de-green/5' 
                    : 'border-border bg-bg-elevated'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-lg font-semibold">
                    {test.name}
                  </span>
                  {currentTest === index && (
                    <span className="text-n0de-green text-sm font-medium animate-pulse">
                      TESTING...
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                  {/* n0de */}
                  <div className="text-center">
                    <div className="text-2xl font-bold text-n0de-green mb-1">
                      {test.n0de}ms
                    </div>
                    <div className="text-sm font-medium text-n0de-green">n0de</div>
                    <div className="text-xs bg-n0de-green/20 text-n0de-green px-2 py-1 rounded-full mt-1">FASTEST</div>
                    <div className="w-full bg-bg-main rounded-full h-2 mt-2">
                      <div 
                        className="bg-gradient-to-r from-n0de-green to-n0de-blue h-2 rounded-full"
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>

                  {/* Helius */}
                  <div className="text-center">
                    <div className="text-2xl font-bold text-text-secondary mb-1">
                      {test.helius}ms
                    </div>
                    <div className="text-sm text-text-secondary">Helius</div>
                    <div className="text-xs text-text-muted mt-1">Solana-only</div>
                    <div className="w-full bg-bg-main rounded-full h-2 mt-2">
                      <div 
                        className="bg-purple-500 h-2 rounded-full"
                        style={{ width: `${(test.n0de / test.helius) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* QuickNode */}
                  <div className="text-center">
                    <div className="text-2xl font-bold text-text-secondary mb-1">
                      {test.quicknode}ms
                    </div>
                    <div className="text-sm text-text-secondary">QuickNode</div>
                    <div className="text-xs text-text-muted mt-1">Multi-chain</div>
                    <div className="w-full bg-bg-main rounded-full h-2 mt-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${(test.n0de / test.quicknode) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Alchemy */}
                  <div className="text-center">
                    <div className="text-2xl font-bold text-text-secondary mb-1">
                      {test.alchemy}ms
                    </div>
                    <div className="text-sm text-text-secondary">Alchemy</div>
                    <div className="text-xs text-text-muted mt-1">Multi-chain</div>
                    <div className="w-full bg-bg-main rounded-full h-2 mt-2">
                      <div 
                        className="bg-orange-500 h-2 rounded-full"
                        style={{ width: `${(test.n0de / test.alchemy) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Public RPC */}
                  <div className="text-center">
                    <div className="text-2xl font-bold text-text-secondary mb-1">
                      {test.public}ms
                    </div>
                    <div className="text-sm text-text-secondary">Public RPC</div>
                    <div className="text-xs text-text-muted mt-1">Rate limited</div>
                    <div className="w-full bg-bg-main rounded-full h-2 mt-2">
                      <div 
                        className="bg-gray-500 h-2 rounded-full"
                        style={{ width: `${(test.n0de / test.public) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-center">
                  <span className="text-sm text-n0de-green font-semibold">
                    n0de is {Math.round(test.helius / test.n0de)}x faster than Helius, 
                    {Math.round(test.alchemy / test.n0de)}x faster than Alchemy
                  </span>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="btn-primary text-lg px-8 py-4"
            >
              Start Your Speed Test
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}