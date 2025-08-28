'use client';

import { motion } from 'framer-motion';
import { 
  Code, 
  Database, 
  Zap, 
  Activity, 
  Globe, 
  Terminal,
  FileCode,
  ArrowRight,
  CheckCircle,
  Copy,
  Download,
  ExternalLink,
  Webhook,
  Shield
} from 'lucide-react';
import { useState } from 'react';

const apiEndpoints = [
  {
    category: 'Core RPC',
    description: 'Standard Solana RPC methods with enhanced performance',
    endpoints: [
      { method: 'getAccountInfo', description: 'Retrieve account data and metadata' },
      { method: 'getBalance', description: 'Get SOL balance for any account' },
      { method: 'getTransaction', description: 'Fetch transaction details and status' },
      { method: 'sendTransaction', description: 'Submit transactions to the network' },
      { method: 'getLatestBlockhash', description: 'Get the latest blockhash for transactions' }
    ]
  },
  {
    category: 'Streaming APIs',
    description: 'Real-time data streams for live applications',
    endpoints: [
      { method: 'accountSubscribe', description: 'Subscribe to account changes' },
      { method: 'programSubscribe', description: 'Monitor program account updates' },
      { method: 'logsSubscribe', description: 'Stream transaction logs in real-time' },
      { method: 'signatureSubscribe', description: 'Track transaction confirmations' },
      { method: 'slotSubscribe', description: 'Monitor slot progression' }
    ]
  },
  {
    category: 'Enhanced APIs',
    description: 'n0de-exclusive APIs for advanced use cases',
    endpoints: [
      { method: 'getTokenAccounts', description: 'Optimized token account queries' },
      { method: 'getTransactionHistory', description: 'Paginated transaction history' },
      { method: 'getNFTMetadata', description: 'NFT metadata with IPFS resolution' },
      { method: 'getDeFiPositions', description: 'DeFi protocol position tracking' },
      { method: 'getStakeAccounts', description: 'Staking account information' }
    ]
  },
  {
    category: 'gRPC Geyser',
    description: 'High-performance gRPC streaming for enterprise',
    endpoints: [
      { method: 'SubscribeAccountUpdates', description: 'Real-time account state changes' },
      { method: 'SubscribeTransactionUpdates', description: 'Transaction processing events' },
      { method: 'SubscribeBlockUpdates', description: 'Block production notifications' },
      { method: 'SubscribeProgramUpdates', description: 'Program-specific data streams' },
      { method: 'GetSnapshot', description: 'Point-in-time state snapshots' }
    ]
  }
];

const sdks = [
  {
    name: '@n0de/solana-sdk',
    language: 'JavaScript/TypeScript',
    icon: FileCode,
    description: 'Full-featured SDK with automatic retries, caching, and TypeScript support',
    features: ['Automatic failover', 'Built-in caching', 'TypeScript definitions', 'Rate limit handling'],
    installation: 'npm install @n0de/solana-sdk'
  },
  {
    name: 'n0de-py',
    language: 'Python',
    icon: Code,
    description: 'Python SDK for data science and backend applications',
    features: ['Async/await support', 'Pandas integration', 'Jupyter notebook ready', 'Type hints'],
    installation: 'pip install n0de-py'
  },
  {
    name: 'n0de-rust',
    language: 'Rust',
    icon: Terminal,
    description: 'High-performance Rust SDK for on-chain programs and services',
    features: ['Zero-copy parsing', 'Tokio async runtime', 'Custom serialization', 'Memory efficient'],
    installation: 'cargo add n0de-rust'
  },
  {
    name: 'n0de-go',
    language: 'Go',
    icon: Database,
    description: 'Go SDK for microservices and high-throughput applications',
    features: ['Context support', 'Connection pooling', 'Structured logging', 'Metrics integration'],
    installation: 'go get github.com/n0de/n0de-go'
  }
];

const tools = [
  {
    name: 'n0de CLI',
    icon: Terminal,
    description: 'Command-line interface for managing API keys, monitoring usage, and testing endpoints',
    features: ['API key management', 'Usage analytics', 'Endpoint testing', 'Bulk operations']
  },
  {
    name: 'Postman Collection',
    icon: Download,
    description: 'Pre-built Postman collection with all n0de endpoints and examples',
    features: ['All RPC methods', 'Environment variables', 'Test scripts', 'Documentation']
  },
  {
    name: 'OpenAPI Spec',
    icon: FileCode,
    description: 'Complete OpenAPI 3.0 specification for automatic client generation',
    features: ['Auto-generated clients', 'Interactive docs', 'Schema validation', 'Mock servers']
  },
  {
    name: 'Webhook System',
    icon: Webhook,
    description: 'Real-time notifications for account changes, transactions, and system events',
    features: ['Custom filters', 'Retry logic', 'Signature verification', 'Rate limiting']
  }
];

export default function ApiEcosystem() {
  const [activeCategory, setActiveCategory] = useState(0);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const codeExample = `import { N0deClient } from '@n0de/solana-sdk';

const client = new N0deClient({
  apiKey: 'your-api-key',
  cluster: 'mainnet-beta',
  options: {
    commitment: 'finalized',
    retries: 3,
    timeout: 30000
  }
});

// Get account info with automatic caching
const accountInfo = await client.getAccountInfo(
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
);

// Subscribe to real-time updates
const subscription = client.onAccountChange(
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  (accountInfo) => {
    console.log('Account updated:', accountInfo);
  }
);

// Enhanced APIs - Token account queries
const tokenAccounts = await client.getTokenAccounts(
  'owner-address',
  { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' }
);`;

  return (
    <div className="section-padding bg-bg-elevated relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        {/* Removed interfering background gradient */}
        <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-5" />
      </div>

      <div className="container-width relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center space-x-2 bg-n0de-blue/10 text-n0de-blue px-4 py-2 rounded-full text-sm font-semibold mb-6">
            <Code className="w-4 h-4" />
            <span>Complete API Ecosystem</span>
          </div>
          
          <h2 className="text-4xl lg:text-6xl font-bold font-display mb-6">
            <span className="text-white">Beyond</span>
            <br />
            <span className="gradient-text">Standard RPC</span>
          </h2>
          
          <p className="text-xl text-text-secondary max-w-3xl mx-auto">
            From REST APIs to gRPC streams, WebSockets to webhooks - n0de provides 
            the most comprehensive Solana API ecosystem available.
          </p>
        </motion.div>

        {/* API Categories */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            {apiEndpoints.map((category, index) => (
              <button
                key={category.category}
                onClick={() => setActiveCategory(index)}
                className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                  activeCategory === index
                    ? 'bg-n0de-green text-black'
                    : 'bg-bg-card text-text-secondary hover:text-text-primary border border-border hover:border-n0de-green/50'
                }`}
              >
                {category.category}
              </button>
            ))}
          </div>

          <div className="card">
            <div className="p-8">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold mb-4">{apiEndpoints[activeCategory].category}</h3>
                <p className="text-text-secondary">{apiEndpoints[activeCategory].description}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {apiEndpoints[activeCategory].endpoints.map((endpoint, index) => (
                  <motion.div
                    key={endpoint.method}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className="p-4 bg-bg-main rounded-lg border border-border hover:border-n0de-green/50 transition-colors"
                  >
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-2 h-2 bg-n0de-green rounded-full" />
                      <code className="text-n0de-green font-mono text-sm">{endpoint.method}</code>
                    </div>
                    <p className="text-text-secondary text-sm">{endpoint.description}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Code Example */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="card mb-16"
        >
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold">Quick Start Example</h3>
              <button
                onClick={() => copyToClipboard(codeExample, 'main-example')}
                className="flex items-center space-x-2 px-4 py-2 bg-bg-main rounded-lg border border-border hover:border-n0de-green/50 transition-colors"
              >
                {copiedCode === 'main-example' ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-n0de-green" />
                    <span className="text-n0de-green">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <div className="bg-bg-main rounded-lg p-6 font-mono text-sm overflow-x-auto">
              <pre className="text-text-primary">
                <code>{codeExample}</code>
              </pre>
            </div>
          </div>
        </motion.div>

        {/* SDKs Grid */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold mb-4 gradient-text">Official SDKs</h3>
            <p className="text-text-secondary text-lg">
              Native SDKs for every major programming language with built-in optimizations
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {sdks.map((sdk, index) => (
              <motion.div
                key={sdk.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="card group hover:border-n0de-blue/50 transition-all duration-300"
              >
                <div className="p-6">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="p-3 bg-n0de-blue/10 rounded-lg group-hover:bg-n0de-blue/20 transition-colors">
                      <sdk.icon className="w-6 h-6 text-n0de-blue" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold">{sdk.name}</h4>
                      <p className="text-text-muted text-sm">{sdk.language}</p>
                    </div>
                  </div>

                  <p className="text-text-secondary mb-4">{sdk.description}</p>

                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {sdk.features.map((feature) => (
                      <div key={feature} className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-n0de-green flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <div className="bg-bg-main rounded-lg p-3 font-mono text-sm flex items-center justify-between">
                    <code className="text-n0de-green">{sdk.installation}</code>
                    <button
                      onClick={() => copyToClipboard(sdk.installation, sdk.name)}
                      className="p-1 hover:bg-bg-elevated rounded transition-colors"
                    >
                      {copiedCode === sdk.name ? (
                        <CheckCircle className="w-4 h-4 text-n0de-green" />
                      ) : (
                        <Copy className="w-4 h-4 text-text-muted hover:text-text-primary" />
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Developer Tools */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold mb-4 gradient-text">Developer Tools</h3>
            <p className="text-text-secondary text-lg">
              Everything you need to build, test, and deploy with confidence
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {tools.map((tool, index) => (
              <motion.div
                key={tool.name}
                initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="card group hover:border-n0de-purple/50 transition-all duration-300"
              >
                <div className="p-6">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="p-3 bg-n0de-purple/10 rounded-lg group-hover:bg-n0de-purple/20 transition-colors">
                      <tool.icon className="w-6 h-6 text-n0de-purple" />
                    </div>
                    <h4 className="text-xl font-bold">{tool.name}</h4>
                  </div>

                  <p className="text-text-secondary mb-4">{tool.description}</p>

                  <ul className="space-y-2">
                    {tool.features.map((feature) => (
                      <li key={feature} className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-n0de-green flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-6">
                    <button className="flex items-center space-x-2 text-n0de-purple hover:text-n0de-purple/80 transition-colors">
                      <span className="text-sm font-semibold">Download</span>
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Performance Stats */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="card"
        >
          <div className="p-8">
            <div className="text-center mb-8">
              <h3 className="text-3xl font-bold mb-4 gradient-text">
                API Performance Metrics
              </h3>
              <p className="text-text-secondary">
                Real-world performance data from our global infrastructure
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {[
                { metric: '8ms', label: 'Average Response Time', icon: Zap, color: 'n0de-green' },
                { metric: '99.99%', label: 'API Uptime', icon: Shield, color: 'n0de-blue' },
                { metric: '50M+', label: 'Daily API Calls', icon: Activity, color: 'n0de-purple' },
                { metric: '15+', label: 'Global Endpoints', icon: Globe, color: 'n0de-green' }
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="text-center"
                >
                  <div className={`inline-flex items-center justify-center w-16 h-16 bg-${stat.color}/10 rounded-xl mb-4`}>
                    <stat.icon className={`w-8 h-8 text-${stat.color}`} />
                  </div>
                  <div className="text-3xl font-bold text-white font-display mb-2">
                    {stat.metric}
                  </div>
                  <div className="text-text-secondary text-sm">{stat.label}</div>
                </motion.div>
              ))}
            </div>

            <div className="mt-12 text-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn-primary text-lg px-8 py-4 inline-flex items-center space-x-3"
              >
                <FileCode className="w-5 h-5" />
                <span>Explore API Documentation</span>
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}