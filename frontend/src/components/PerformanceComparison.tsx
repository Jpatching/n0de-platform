'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, X, Zap, Shield, Trophy, Target, Clock, Activity } from 'lucide-react';

interface ProviderPerformance {
  name: string;
  avgLatency: number;
  successRate: number;
  status: 'excellent' | 'good' | 'poor' | 'failed';
  methods: {
    getSlot: number | null;
    getBlockHeight: number | null;
    getLatestBlockhash: number | null;
    getEpochInfo: number | null;
    getVersion: number | null;
    getBalance: number | null;
  };
  specs?: {
    cpu?: string;
    ram?: string;
    storage?: string;
    location?: string;
  };
}

const providers: ProviderPerformance[] = [
  {
    name: 'n0de',
    avgLatency: 9,
    successRate: 100,
    status: 'excellent',
    methods: {
      getSlot: 9,
      getBlockHeight: 10,
      getLatestBlockhash: 11,
      getEpochInfo: 9,
      getVersion: 10,
      getBalance: 10
    },
    specs: {
      cpu: 'AMD EPYC 9354 32-Core',
      ram: '755GB',
      storage: '2x 3.5TB NVMe',
      location: 'UK Direct Connection'
    }
  },
  {
    name: 'QuickNode',
    avgLatency: 57.4,
    successRate: 100,
    status: 'good',
    methods: {
      getSlot: 55,
      getBlockHeight: 58,
      getLatestBlockhash: 60,
      getEpochInfo: 56,
      getVersion: 57,
      getBalance: 56
    }
  },
  {
    name: 'Helius (Optimal)',
    avgLatency: 47,
    successRate: 100,
    status: 'good',
    methods: {
      getSlot: 45,
      getBlockHeight: 48,
      getLatestBlockhash: 50,
      getEpochInfo: 46,
      getVersion: 47,
      getBalance: 46
    }
  },
  {
    name: 'Helius (Observed)',
    avgLatency: 210,
    successRate: 100,
    status: 'poor',
    methods: {
      getSlot: 112,
      getBlockHeight: 223,
      getLatestBlockhash: 271,
      getEpochInfo: 277,
      getVersion: 263,
      getBalance: 114
    }
  },
  {
    name: 'Alchemy',
    avgLatency: 0,
    successRate: 0,
    status: 'failed',
    methods: {
      getSlot: null,
      getBlockHeight: null,
      getLatestBlockhash: null,
      getEpochInfo: null,
      getVersion: null,
      getBalance: null
    }
  },
  {
    name: 'Ankr',
    avgLatency: 0,
    successRate: 0,
    status: 'failed',
    methods: {
      getSlot: null,
      getBlockHeight: null,
      getLatestBlockhash: null,
      getEpochInfo: null,
      getVersion: null,
      getBalance: null
    }
  },
  {
    name: 'Syndica',
    avgLatency: 0,
    successRate: 0,
    status: 'failed',
    methods: {
      getSlot: null,
      getBlockHeight: null,
      getLatestBlockhash: null,
      getEpochInfo: null,
      getVersion: null,
      getBalance: null
    }
  }
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'excellent':
      return 'text-n0de-green bg-n0de-green/20 border-n0de-green/30';
    case 'good':
      return 'text-n0de-blue bg-n0de-blue/20 border-n0de-blue/30';
    case 'poor':
      return 'text-n0de-orange bg-n0de-orange/20 border-n0de-orange/30';
    case 'failed':
      return 'text-n0de-red bg-n0de-red/20 border-n0de-red/30';
    default:
      return 'text-text-muted bg-text-muted/20 border-text-muted/30';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'excellent':
      return <Trophy className="w-4 h-4" />;
    case 'good':
      return <CheckCircle className="w-4 h-4" />;
    case 'poor':
      return <Clock className="w-4 h-4" />;
    case 'failed':
      return <X className="w-4 h-4" />;
    default:
      return null;
  }
};

export default function PerformanceComparison() {
  const n0deProvider = providers[0]; // n0de is first
  const workingProviders = providers.filter(p => p.successRate > 0);
  
  return (
    <div className="performance-comparison">
      {/* Header */}
      <div className="text-center mb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-n0de-green/20 to-n0de-blue/20 border border-n0de-green/30 rounded-xl px-6 py-2 mb-4">
            <Trophy className="w-5 h-5 text-n0de-green" />
            <span className="text-n0de-green font-bold text-sm tracking-wide">#1 UK SOLANA RPC NODE</span>
          </div>
          <h2 className="text-3xl font-bold">Independent Performance Analysis</h2>
        </motion.div>
        <p className="text-text-secondary max-w-3xl mx-auto">
          Comprehensive benchmark testing comparing n0de against industry leaders Helius, QuickNode, and Alchemy. 
          Results demonstrate <span className="text-n0de-green font-semibold">84-95% performance advantage</span> with perfect reliability.
        </p>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        <motion.div
          className="card text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Zap className="w-8 h-8 text-n0de-green mx-auto mb-3" />
          <div className="text-2xl font-bold gradient-text">9ms</div>
          <div className="text-sm text-text-secondary">Ultra-Low Latency</div>
          <div className="text-xs text-n0de-green mt-1">84% faster than QuickNode (57.4ms)</div>
        </motion.div>

        <motion.div
          className="card text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Shield className="w-8 h-8 text-n0de-blue mx-auto mb-3" />
          <div className="text-2xl font-bold gradient-text">100%</div>
          <div className="text-sm text-text-secondary">Success Rate</div>
          <div className="text-xs text-n0de-blue mt-1">Zero failures across all methods</div>
        </motion.div>

        <motion.div
          className="card text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Target className="w-8 h-8 text-n0de-purple mx-auto mb-3" />
          <div className="text-2xl font-bold gradient-text">0</div>
          <div className="text-sm text-text-secondary">Slots Behind</div>
          <div className="text-xs text-n0de-purple mt-1">Perfect network synchronization</div>
        </motion.div>

        <motion.div
          className="card text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Activity className="w-8 h-8 text-n0de-orange mx-auto mb-3" />
          <div className="text-2xl font-bold gradient-text">UK</div>
          <div className="text-sm text-text-secondary">Geographic Advantage</div>
          <div className="text-xs text-n0de-orange mt-1">Direct EU validator proximity</div>
        </motion.div>
      </div>

      {/* Detailed Comparison Table */}
      <motion.div
        className="card overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="p-6">
          <h3 className="text-xl font-bold mb-6">Detailed Provider Comparison</h3>
          
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4">Provider</th>
                  <th className="text-center py-3 px-4">Avg Latency</th>
                  <th className="text-center py-3 px-4">Success Rate</th>
                  <th className="text-center py-3 px-4">getSlot</th>
                  <th className="text-center py-3 px-4">getBalance</th>
                  <th className="text-center py-3 px-4">getLatestBlockhash</th>
                  <th className="text-center py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {providers.map((provider, index) => (
                  <motion.tr
                    key={provider.name}
                    className={`border-b border-border/50 ${
                      provider.name === 'n0de' ? 'bg-n0de-green/5' : ''
                    }`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2">
                        {provider.name === 'n0de' && (
                          <Trophy className="w-4 h-4 text-n0de-green" />
                        )}
                        <span className={`font-semibold ${
                          provider.name === 'n0de' ? 'gradient-text' : ''
                        }`}>
                          {provider.name}
                        </span>
                      </div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <span className={`font-bold ${
                        provider.successRate === 0 
                          ? 'text-text-muted' 
                          : provider.name === 'n0de' 
                          ? 'text-n0de-green' 
                          : ''
                      }`}>
                        {provider.successRate === 0 ? 'N/A' : `${provider.avgLatency}ms`}
                      </span>
                    </td>
                    <td className="text-center py-4 px-4">
                      <span className={`font-bold ${
                        provider.successRate === 100 ? 'text-n0de-green' : 'text-n0de-red'
                      }`}>
                        {provider.successRate}%
                      </span>
                    </td>
                    <td className="text-center py-4 px-4">
                      {provider.methods.getSlot ? (
                        <span className="text-sm">{provider.methods.getSlot}ms</span>
                      ) : (
                        <X className="w-4 h-4 text-n0de-red mx-auto" />
                      )}
                    </td>
                    <td className="text-center py-4 px-4">
                      {provider.methods.getBalance ? (
                        <span className="text-sm">{provider.methods.getBalance}ms</span>
                      ) : (
                        <X className="w-4 h-4 text-n0de-red mx-auto" />
                      )}
                    </td>
                    <td className="text-center py-4 px-4">
                      {provider.methods.getLatestBlockhash ? (
                        <span className="text-sm">{provider.methods.getLatestBlockhash}ms</span>
                      ) : (
                        <X className="w-4 h-4 text-n0de-red mx-auto" />
                      )}
                    </td>
                    <td className="text-center py-4 px-4">
                      <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs border ${getStatusColor(provider.status)}`}>
                        {getStatusIcon(provider.status)}
                        <span className="capitalize">{provider.status}</span>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-4">
            {providers.map((provider, index) => (
              <motion.div
                key={provider.name}
                className={`card ${
                  provider.name === 'n0de' ? 'ring-2 ring-n0de-green border-n0de-green/50' : ''
                }`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
              >
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      {provider.name === 'n0de' && (
                        <Trophy className="w-4 h-4 text-n0de-green" />
                      )}
                      <h4 className={`font-bold ${
                        provider.name === 'n0de' ? 'gradient-text' : ''
                      }`}>
                        {provider.name}
                      </h4>
                    </div>
                    <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs border ${getStatusColor(provider.status)}`}>
                      {getStatusIcon(provider.status)}
                      <span className="capitalize">{provider.status}</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-text-secondary">Avg Latency:</span>
                      <span className={`ml-2 font-bold ${
                        provider.successRate === 0 
                          ? 'text-text-muted' 
                          : provider.name === 'n0de' 
                          ? 'text-n0de-green' 
                          : ''
                      }`}>
                        {provider.successRate === 0 ? 'N/A' : `${provider.avgLatency}ms`}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-secondary">Success:</span>
                      <span className={`ml-2 font-bold ${
                        provider.successRate === 100 ? 'text-n0de-green' : 'text-n0de-red'
                      }`}>
                        {provider.successRate}%
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Infrastructure Comparison */}
      {n0deProvider.specs && (
        <motion.div
          className="card mt-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
        >
          <div className="p-6">
            <h3 className="text-xl font-bold mb-6">Infrastructure Specifications</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-n0de-green/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Zap className="w-6 h-6 text-n0de-green" />
                </div>
                <h4 className="font-semibold mb-2">CPU</h4>
                <p className="text-sm text-text-secondary">{n0deProvider.specs.cpu}</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-n0de-blue/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Activity className="w-6 h-6 text-n0de-blue" />
                </div>
                <h4 className="font-semibold mb-2">RAM</h4>
                <p className="text-sm text-text-secondary">{n0deProvider.specs.ram}</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-n0de-purple/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Shield className="w-6 h-6 text-n0de-purple" />
                </div>
                <h4 className="font-semibold mb-2">Storage</h4>
                <p className="text-sm text-text-secondary">{n0deProvider.specs.storage}</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-n0de-orange/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Target className="w-6 h-6 text-n0de-orange" />
                </div>
                <h4 className="font-semibold mb-2">Location</h4>
                <p className="text-sm text-text-secondary">{n0deProvider.specs.location}</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Performance Insights */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
      >
        <div className="card">
          <div className="p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center space-x-2">
              <Trophy className="w-5 h-5 text-n0de-green" />
              <span>Competitive Advantages</span>
            </h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-n0de-green" />
                <span>84% faster than QuickNode (current market leader)</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-n0de-green" />
                <span>81% faster than Helius optimal datacenter performance</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-n0de-green" />
                <span>Only sub-10ms provider in comprehensive testing</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-n0de-green" />
                <span>Perfect ±1ms consistency vs industry 20-40ms variance</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-n0de-green" />
                <span>European infrastructure advantage for EU validator proximity</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="card">
          <div className="p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center space-x-2">
              <Shield className="w-5 h-5 text-n0de-blue" />
              <span>Network Status</span>
            </h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-n0de-green" />
                <span>Perfect synchronization (0 slots behind)</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-n0de-green" />
                <span>Real-time block processing</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-n0de-green" />
                <span>Enterprise-grade hardware infrastructure</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-n0de-green" />
                <span>Direct UK connection for optimal routing</span>
              </li>
            </ul>
          </div>
        </div>
      </motion.div>

      {/* Test Methodology */}
      <motion.div
        className="card mt-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.4 }}
      >
        <div className="p-6">
          <h3 className="text-lg font-bold mb-4">Test Methodology</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div>
              <h4 className="font-semibold text-n0de-green mb-2">Test Configuration</h4>
              <ul className="space-y-1 text-text-secondary">
                <li>• 5 iterations per method</li>
                <li>• 1-second timeout</li>
                <li>• 0.5s delay between requests</li>
                <li>• Independent testing environment</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-n0de-blue mb-2">Methods Tested</h4>
              <ul className="space-y-1 text-text-secondary">
                <li>• getSlot</li>
                <li>• getBlockHeight</li>
                <li>• getLatestBlockhash</li>
                <li>• getEpochInfo</li>
                <li>• getVersion</li>
                <li>• getBalance</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-n0de-purple mb-2">Success Criteria</h4>
              <ul className="space-y-1 text-text-secondary">
                <li>• Response within timeout</li>
                <li>• Valid JSON-RPC response</li>
                <li>• Correct data format</li>
                <li>• No connection errors</li>
              </ul>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}