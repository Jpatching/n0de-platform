'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Code, 
  Copy, 
  CheckCircle, 
  Zap, 
  Settings,
  Terminal,
  Globe,
  Shield,
  ArrowRight
} from 'lucide-react';

export default function DocsPage() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState('quickstart');

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const sections = [
    { id: 'quickstart', title: 'Quick Start', icon: Zap },
    { id: 'authentication', title: 'Authentication', icon: Shield },
    { id: 'endpoints', title: 'API Endpoints', icon: Globe },
    { id: 'websockets', title: 'WebSockets', icon: Terminal },
    { id: 'examples', title: 'Code Examples', icon: Code },
    { id: 'configuration', title: 'Configuration', icon: Settings },
  ];

  const codeExamples = {
    javascript: `// Install the n0de SDK
npm install @n0de/solana-sdk

// Initialize the client
import { N0deClient } from '@n0de/solana-sdk';

const client = new N0deClient({
  apiKey: 'your-api-key',
  cluster: 'mainnet-beta'
});

// Get account info
const accountInfo = await client.getAccountInfo(
  'So11111111111111111111111111111111111111112'
);
console.log(accountInfo);`,
    
    python: `# Install the n0de Python SDK
pip install n0de-solana

# Initialize the client
from n0de import N0deClient

client = N0deClient(
    api_key='your-api-key',
    cluster='mainnet-beta'
)

# Get account info
account_info = client.get_account_info(
    'So11111111111111111111111111111111111111112'
)
print(account_info)`,

    curl: `# Direct API call
curl -X POST https://api.n0de.io/v1/rpc \\
  -H "Authorization: Bearer your-api-key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "getAccountInfo",
    "params": [
      "So11111111111111111111111111111111111111112",
      {"encoding": "base64"}
    ]
  }'`
  };

  return (
    <div className="min-h-screen bg-bg-main text-text-primary">
      <div className="container-width py-8">
        {/* Page Header */}
        <div className="mb-12">
          <h1 
            className="text-4xl lg:text-5xl font-bold mb-4"
            style={{
              background: 'linear-gradient(135deg, #01d3f4, #0b86f8, #00255e)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              color: '#01d3f4'
            }}
          >
            N0DE Documentation
          </h1>
          <p className="text-text-secondary text-lg max-w-2xl">
            Everything you need to integrate with N0DE&apos;s high-performance Solana RPC infrastructure. Get started in minutes.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <nav className="sticky top-8 space-y-2">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeSection === section.id
                      ? 'bg-n0de-green/10 text-n0de-green border border-n0de-green/20'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                  }`}
                >
                  <section.icon className="w-5 h-5" />
                  <span>{section.title}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              {/* Quick Start */}
              {activeSection === 'quickstart' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-3xl font-bold mb-4 gradient-text">Quick Start</h2>
                    <p className="text-text-secondary text-lg">
                      Get up and running with n0de in under 5 minutes. Experience the fastest Solana RPC available.
                    </p>
                  </div>

                  <div className="card">
                    <h3 className="text-xl font-bold mb-4 flex items-center space-x-2">
                      <span className="bg-n0de-green text-black w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">1</span>
                      <span>Get Your API Key</span>
                    </h3>
                    <p className="text-text-secondary mb-4">
                      Sign up for a free account and get your API key instantly. No credit card required for the starter plan.
                    </p>
                    <button className="btn-primary">Get Free API Key</button>
                  </div>

                  <div className="card">
                    <h3 className="text-xl font-bold mb-4 flex items-center space-x-2">
                      <span className="bg-n0de-green text-black w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">2</span>
                      <span>Install SDK</span>
                    </h3>
                    <p className="text-text-secondary mb-4">
                      Choose your preferred language and install our optimized SDK.
                    </p>
                    
                    <div className="space-y-4">
                      <div className="relative">
                        <div className="code-block">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-n0de-green font-semibold">JavaScript/TypeScript</span>
                            <button
                              onClick={() => copyToClipboard('npm install @n0de/solana-sdk', 'js-install')}
                              className="p-1 hover:bg-bg-hover rounded transition-colors"
                            >
                              {copiedCode === 'js-install' ? (
                                <CheckCircle className="w-4 h-4 text-n0de-green" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                          <code>npm install @n0de/solana-sdk</code>
                        </div>
                      </div>

                      <div className="relative">
                        <div className="code-block">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-n0de-green font-semibold">Python</span>
                            <button
                              onClick={() => copyToClipboard('pip install n0de-solana', 'py-install')}
                              className="p-1 hover:bg-bg-hover rounded transition-colors"
                            >
                              {copiedCode === 'py-install' ? (
                                <CheckCircle className="w-4 h-4 text-n0de-green" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                          <code>pip install n0de-solana</code>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <h3 className="text-xl font-bold mb-4 flex items-center space-x-2">
                      <span className="bg-n0de-green text-black w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">3</span>
                      <span>Make Your First Call</span>
                    </h3>
                    <p className="text-text-secondary mb-4">
                      Test the connection with a simple account info request.
                    </p>
                    
                    <div className="relative">
                      <div className="code-block">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-n0de-green font-semibold">Example</span>
                          <button
                            onClick={() => copyToClipboard(codeExamples.javascript, 'first-call')}
                            className="p-1 hover:bg-bg-hover rounded transition-colors"
                          >
                            {copiedCode === 'first-call' ? (
                              <CheckCircle className="w-4 h-4 text-n0de-green" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                        <pre className="text-sm overflow-x-auto">
                          <code>{codeExamples.javascript}</code>
                        </pre>
                      </div>
                    </div>
                  </div>

                  <div className="card bg-n0de-green/5 border-n0de-green/20">
                    <div className="flex items-start space-x-3">
                      <Zap className="w-6 h-6 text-n0de-green flex-shrink-0 mt-1" />
                      <div>
                        <h4 className="font-bold text-lg mb-2">You&apos;re Ready!</h4>
                        <p className="text-text-secondary">
                          That&apos;s it! You&apos;re now connected to the fastest Solana RPC network. 
                          Your requests will be processed with sub-20ms latency through our Yellowstone gRPC infrastructure.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Authentication */}
              {activeSection === 'authentication' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-3xl font-bold mb-4 gradient-text">Authentication</h2>
                    <p className="text-text-secondary text-lg">
                      Secure your API access with industry-standard authentication methods.
                    </p>
                  </div>

                  <div className="card">
                    <h3 className="text-xl font-bold mb-4">API Key Authentication</h3>
                    <p className="text-text-secondary mb-4">
                      Include your API key in the Authorization header of every request.
                    </p>
                    
                    <div className="code-block">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-n0de-green font-semibold">HTTP Header</span>
                        <button
                          onClick={() => copyToClipboard('Authorization: Bearer your-api-key-here', 'auth-header')}
                          className="p-1 hover:bg-bg-hover rounded transition-colors"
                        >
                          {copiedCode === 'auth-header' ? (
                            <CheckCircle className="w-4 h-4 text-n0de-green" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      <code>Authorization: Bearer your-api-key-here</code>
                    </div>
                  </div>

                  <div className="card">
                    <h3 className="text-xl font-bold mb-4">Rate Limiting</h3>
                    <p className="text-text-secondary mb-4">
                      API keys are rate limited based on your subscription plan:
                    </p>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-border last:border-b-0">
                        <span className="font-medium">Starter Plan</span>
                        <span className="text-n0de-green">5,000 RPS</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-border last:border-b-0">
                        <span className="font-medium">Professional Plan</span>
                        <span className="text-n0de-green">25,000 RPS</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="font-medium">Enterprise Plan</span>
                        <span className="text-n0de-green">100,000+ RPS</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* API Endpoints */}
              {activeSection === 'endpoints' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-3xl font-bold mb-4 gradient-text">API Endpoints</h2>
                    <p className="text-text-secondary text-lg">
                      Complete reference for all available Solana RPC methods optimized for maximum performance.
                    </p>
                  </div>

                  <div className="card">
                    <h3 className="text-xl font-bold mb-4">Base URL</h3>
                    <div className="code-block">
                      <code>https://api.n0de.io/v1/rpc</code>
                    </div>
                  </div>

                  <div className="card">
                    <h3 className="text-xl font-bold mb-4">Popular Methods</h3>
                    <div className="space-y-4">
                      {[
                        { method: 'getAccountInfo', description: 'Get account data and metadata' },
                        { method: 'getTokenAccounts', description: 'Get all token accounts for an owner' },
                        { method: 'getTransaction', description: 'Get transaction details by signature' },
                        { method: 'getProgramAccounts', description: 'Get accounts owned by a program' },
                        { method: 'getMultipleAccounts', description: 'Get multiple account infos in one call' },
                      ].map((endpoint) => (
                        <div key={endpoint.method} className="flex items-center justify-between p-4 bg-bg-main rounded-lg">
                          <div>
                            <code className="text-n0de-green font-semibold">{endpoint.method}</code>
                            <p className="text-text-secondary text-sm mt-1">{endpoint.description}</p>
                          </div>
                          <ArrowRight className="w-5 h-5 text-text-secondary" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Code Examples */}
              {activeSection === 'examples' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-3xl font-bold mb-4 gradient-text">Code Examples</h2>
                    <p className="text-text-secondary text-lg">
                      Ready-to-use code snippets in multiple programming languages.
                    </p>
                  </div>

                  <div className="card">
                    <h3 className="text-xl font-bold mb-4">JavaScript/TypeScript</h3>
                    <div className="code-block">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-n0de-green font-semibold">Complete Example</span>
                        <button
                          onClick={() => copyToClipboard(codeExamples.javascript, 'js-example')}
                          className="p-1 hover:bg-bg-hover rounded transition-colors"
                        >
                          {copiedCode === 'js-example' ? (
                            <CheckCircle className="w-4 h-4 text-n0de-green" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      <pre className="text-sm overflow-x-auto">
                        <code>{codeExamples.javascript}</code>
                      </pre>
                    </div>
                  </div>

                  <div className="card">
                    <h3 className="text-xl font-bold mb-4">Python</h3>
                    <div className="code-block">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-n0de-green font-semibold">Complete Example</span>
                        <button
                          onClick={() => copyToClipboard(codeExamples.python, 'py-example')}
                          className="p-1 hover:bg-bg-hover rounded transition-colors"
                        >
                          {copiedCode === 'py-example' ? (
                            <CheckCircle className="w-4 h-4 text-n0de-green" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      <pre className="text-sm overflow-x-auto">
                        <code>{codeExamples.python}</code>
                      </pre>
                    </div>
                  </div>

                  <div className="card">
                    <h3 className="text-xl font-bold mb-4">cURL</h3>
                    <div className="code-block">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-n0de-green font-semibold">Direct HTTP Call</span>
                        <button
                          onClick={() => copyToClipboard(codeExamples.curl, 'curl-example')}
                          className="p-1 hover:bg-bg-hover rounded transition-colors"
                        >
                          {copiedCode === 'curl-example' ? (
                            <CheckCircle className="w-4 h-4 text-n0de-green" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      <pre className="text-sm overflow-x-auto">
                        <code>{codeExamples.curl}</code>
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}