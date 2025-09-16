'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Code, 
  Play, 
  Copy, 
  Download, 
  Terminal, 
  CheckCircle,
  Book,
  Settings,
  FileText,
  Package,
  Activity,
  Cpu,
  ArrowRight,
  Monitor,
  Clock,
  Globe
} from 'lucide-react';
import { GlassCard } from '@/components/GlassmorphismCard';
import { ScrollSlideUp, ScrollFadeIn } from '@/components/ScrollReveal';

interface CodeExample {
  id: string;
  title: string;
  language: string;
  code: string;
  description: string;
}

interface SDK {
  name: string;
  language: string;
  version: string;
  downloads: string;
  icon: React.ReactNode;
  installCommand: string;
  quickStart: string;
  features: string[];
}

export default function DeveloperExperience() {
  const [activeTab, setActiveTab] = useState<'playground' | 'sdks' | 'tools' | 'examples'>('playground');
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
  const [apiResponse, setApiResponse] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string>('');

  const codeExamples: CodeExample[] = [
    {
      id: 'js-basic',
      title: 'Basic Account Info',
      language: 'javascript',
      code: `// Get account information
import { Connection, PublicKey } from '@solana/web3.js';

const connection = new Connection('https://api.n0de.com/mainnet', {
  commitment: 'confirmed',
  httpHeaders: {
    'Authorization': 'Bearer YOUR_API_KEY'
  }
});

const publicKey = new PublicKey('11111111111111111111111111111112');
const accountInfo = await connection.getAccountInfo(publicKey);

console.log('Account Info:', accountInfo);`,
      description: 'Fetch account information using the standard Solana Web3.js library with n0de endpoints.'
    },
    {
      id: 'py-streaming',
      title: 'gRPC Streaming',
      language: 'python',
      code: `# Real-time account updates via gRPC
import grpc
from n0de_grpc import yellowstone_pb2_grpc, yellowstone_pb2

# Connect to n0de Yellowstone gRPC
channel = grpc.secure_channel('grpc.n0de.com:443', grpc.ssl_channel_credentials())
stub = yellowstone_pb2_grpc.GeyserStub(channel)

# Subscribe to account updates
request = yellowstone_pb2.SubscribeRequest(
    accounts={
        "account_updates": yellowstone_pb2.SubscribeRequestFilterAccounts(
            account=["TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"]
        )
    }
)

# Stream real-time updates
for update in stub.Subscribe(request):
    print(f"Account Update: {update}")`,
      description: 'Stream real-time account updates using n0de\'s Yellowstone gRPC plugin for ultra-low latency.'
    },
    {
      id: 'rust-tx',
      title: 'Transaction Submission',
      language: 'rust',
      code: `// High-performance transaction submission
use solana_client::rpc_client::RpcClient;
use solana_sdk::{
    signature::{Keypair, Signer},
    transaction::Transaction,
    pubkey::Pubkey,
    system_instruction,
};

let rpc_url = "https://api.n0de.com/mainnet";
let client = RpcClient::new_with_commitment(
    rpc_url.to_string(),
    solana_sdk::commitment_config::CommitmentConfig::confirmed()
);

// Create and send transaction
let from_keypair = Keypair::new();
let to_pubkey = Pubkey::new_unique();

let instruction = system_instruction::transfer(
    &from_keypair.pubkey(),
    &to_pubkey,
    1_000_000, // 0.001 SOL
);

let transaction = Transaction::new_signed_with_payer(
    &[instruction],
    Some(&from_keypair.pubkey()),
    &[&from_keypair],
    client.get_latest_blockhash().unwrap(),
);

let signature = client.send_and_confirm_transaction(&transaction)?;
println!("Transaction confirmed: {}", signature);`,
      description: 'Submit transactions with guaranteed delivery using n0de\'s priority routing and staked connections.'
    },
    {
      id: 'curl-api',
      title: 'REST API Calls',
      language: 'bash',
      code: `# Get multiple accounts efficiently
curl -X POST https://api.n0de.com/mainnet \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "getMultipleAccounts",
    "params": [
      [
        "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        "11111111111111111111111111111112"
      ],
      {
        "commitment": "confirmed",
        "encoding": "jsonParsed"
      }
    ]
  }'

# Batch multiple requests
curl -X POST https://api.n0de.com/mainnet \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '[
    {"jsonrpc": "2.0", "id": 1, "method": "getSlot"},
    {"jsonrpc": "2.0", "id": 2, "method": "getBlockHeight"},
    {"jsonrpc": "2.0", "id": 3, "method": "getHealth"}
  ]'`,
      description: 'Efficient batch requests and optimized REST API calls with built-in authentication.'
    }
  ];

  const sdks: SDK[] = [
    {
      name: 'n0de-js',
      language: 'JavaScript/TypeScript',
      version: '1.2.3',
      downloads: '50K+',
      icon: <FileText className="w-6 h-6" />,
      installCommand: 'npm install @n0de/sdk',
      quickStart: `import { N0deClient } from '@n0de/sdk';
const client = new N0deClient('YOUR_API_KEY');`,
      features: ['Auto-retry logic', 'Rate limit handling', 'TypeScript support', 'WebSocket streaming']
    },
    {
      name: 'n0de-python',
      language: 'Python',
      version: '1.1.8',
      downloads: '25K+',
      icon: <Code className="w-6 h-6" />,
      installCommand: 'pip install n0de-sdk',
      quickStart: `from n0de import N0deClient
client = N0deClient('YOUR_API_KEY')`,
      features: ['Async/await support', 'Pandas integration', 'gRPC streaming', 'Auto-pagination']
    },
    {
      name: 'n0de-rust',
      language: 'Rust',
      version: '0.8.2',
      downloads: '15K+',
      icon: <Settings className="w-6 h-6" />,
      installCommand: 'cargo add n0de-sdk',
      quickStart: `use n0de_sdk::N0deClient;
let client = N0deClient::new("YOUR_API_KEY");`,
      features: ['Zero-copy parsing', 'Tokio async', 'Connection pooling', 'Custom serialization']
    },
    {
      name: 'n0de-go',
      language: 'Go',
      version: '1.0.5',
      downloads: '8K+',
      icon: <Package className="w-6 h-6" />,
      installCommand: 'go get github.com/n0de/sdk-go',
      quickStart: `import "github.com/n0de/sdk-go"
client := n0de.NewClient("YOUR_API_KEY")`,
      features: ['Context support', 'Connection pooling', 'Structured logging', 'Metrics export']
    }
  ];

  const tools = [
    {
      name: 'n0de CLI',
      description: 'Command-line interface for managing your n0de infrastructure',
      icon: <Terminal className="w-8 h-8" />,
      features: ['Account management', 'Real-time monitoring', 'Deployment scripts', 'Log streaming'],
      installCommand: 'npm install -g @n0de/cli',
      usage: 'n0de status --region frankfurt'
    },
    {
      name: 'Performance Monitor',
      description: 'Real-time performance monitoring and alerting dashboard',
      icon: <Activity className="w-8 h-8" />,
      features: ['Latency tracking', 'Error monitoring', 'Custom alerts', 'SLA reporting'],
      installCommand: 'Available in dashboard',
      usage: 'Built-in web interface'
    },
    {
      name: 'Load Tester',
      description: 'Stress test your applications against n0de infrastructure',
      icon: <Cpu className="w-8 h-8" />,
      features: ['Realistic workloads', 'Performance reports', 'Bottleneck detection', 'Scaling recommendations'],
      installCommand: 'docker pull n0de/load-tester',
      usage: 'docker run n0de/load-tester --target mainnet'
    },
    {
      name: 'Migration Assistant',
      description: 'Seamlessly migrate from other RPC providers to n0de',
      icon: <ArrowRight className="w-8 h-8" />,
      features: ['Config analysis', 'Compatibility check', 'Gradual migration', 'Performance comparison'],
      installCommand: 'npx @n0de/migrate',
      usage: 'migrate --from alchemy --to n0de'
    }
  ];

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(''), 2000);
  };

  const runApiTest = async () => {
    setIsLoading(true);
    setApiResponse('');
    
    // Simulate API call
    setTimeout(() => {
      setApiResponse(`{
  "jsonrpc": "2.0",
  "result": {
    "context": {
      "slot": 284562847,
      "apiVersion": "1.18.23"
    },
    "value": {
      "data": ["", "base64"],
      "executable": false,
      "lamports": 1461600,
      "owner": "11111111111111111111111111111112",
      "rentEpoch": 18446744073709551615,
      "space": 0
    }
  },
  "id": 1,
  "responseTime": "12ms",
  "region": "frankfurt"
}`);
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-bg-main text-text-primary">
      {/* Hero Section */}
      <section className="section-padding pt-36 relative">
        {/* Removed interfering background gradient */}
        <div className="container-width relative z-10">
          <ScrollSlideUp className="text-center mb-16">
            <div className="inline-flex items-center space-x-2 bg-n0de-green/10 border border-n0de-green/20 rounded-full px-4 py-2 mb-6">
              <Code className="w-4 h-4 text-n0de-green" />
              <span className="text-n0de-green font-semibold text-sm">DEVELOPER TOOLS</span>
            </div>
            <h1 className="text-5xl lg:text-7xl font-bold font-display leading-none mb-6">
              <span className="text-white">Developer</span>
              <br />
              <span className="gradient-text">Experience</span>
              <br />
              <span className="text-white">Built Right</span>
            </h1>
            <p className="text-xl text-text-secondary max-w-3xl mx-auto">
              Everything developers need to build on Solana. From SDKs to monitoring tools, 
              we&apos;ve built the complete developer experience from the ground up.
            </p>
          </ScrollSlideUp>

          {/* Quick Stats */}
          <ScrollFadeIn delay={0.2}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-16">
              {[
                { label: 'SDKs Available', value: '8+', icon: Package },
                { label: 'Languages Supported', value: '12+', icon: Code },
                { label: 'Developer Tools', value: '15+', icon: Settings },
                { label: 'API Endpoints', value: '50+', icon: Globe }
              ].map((stat) => (
                <GlassCard key={stat.label} className="p-6 text-center">
                  <stat.icon className="w-8 h-8 text-n0de-green mx-auto mb-3" />
                  <div className="text-3xl font-bold gradient-text mb-1">{stat.value}</div>
                  <div className="text-sm text-text-secondary">{stat.label}</div>
                </GlassCard>
              ))}
            </div>
          </ScrollFadeIn>
        </div>
      </section>

      {/* Main Content */}
      <section className="section-padding">
        <div className="container-width">
          {/* Tab Navigation */}
          <div className="flex flex-wrap justify-center gap-2 mb-12">
            {[
              { id: 'playground', label: 'API Playground', icon: Play },
              { id: 'sdks', label: 'SDKs & Libraries', icon: Package },
              { id: 'tools', label: 'Developer Tools', icon: Settings },
              { id: 'examples', label: 'Code Examples', icon: Code }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'playground' | 'sdks' | 'tools' | 'examples')}
                className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-n0de-green to-n0de-blue text-black'
                    : 'bg-bg-card border border-border text-text-secondary hover:text-text-primary hover:border-n0de-green/50'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* API Playground */}
          {activeTab === 'playground' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold gradient-text mb-4">Interactive API Playground</h2>
                <p className="text-text-secondary">Test our APIs in real-time with live data from our infrastructure</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* API Request Panel */}
                <GlassCard className="p-6">
                  <h3 className="text-xl font-semibold mb-4 flex items-center">
                    <Terminal className="w-5 h-5 text-n0de-green mr-2" />
                    API Request
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-2">Endpoint</label>
                      <div className="bg-bg-main border border-border rounded-lg p-3 font-mono text-sm">
                        POST https://api.n0de.com/mainnet
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-2">Request Body</label>
                      <div className="bg-bg-main border border-border rounded-lg p-4 font-mono text-sm">
                        <pre className="text-n0de-green">{`{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "getAccountInfo",
  "params": [
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    {
      "commitment": "confirmed",
      "encoding": "jsonParsed"
    }
  ]
}`}</pre>
                      </div>
                    </div>

                    <button
                      onClick={runApiTest}
                      disabled={isLoading}
                      className="w-full bg-gradient-to-r from-n0de-green to-n0de-blue text-black font-semibold py-3 rounded-lg hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                    >
                      {isLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                          <span>Running...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          <span>Run Request</span>
                        </>
                      )}
                    </button>
                  </div>
                </GlassCard>

                {/* API Response Panel */}
                <GlassCard className="p-6">
                  <h3 className="text-xl font-semibold mb-4 flex items-center">
                    <Monitor className="w-5 h-5 text-n0de-blue mr-2" />
                    API Response
                  </h3>
                  
                  <div className="bg-bg-main border border-border rounded-lg p-4 h-80 overflow-y-auto">
                    {isLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <div className="w-8 h-8 border-2 border-n0de-green border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                          <p className="text-text-secondary text-sm">Executing request...</p>
                        </div>
                      </div>
                    ) : apiResponse ? (
                      <pre className="text-sm text-n0de-green font-mono whitespace-pre-wrap">{apiResponse}</pre>
                    ) : (
                      <div className="flex items-center justify-center h-full text-text-muted">
                        <p>Click &quot;Run Request&quot; to see the API response</p>
                      </div>
                    )}
                  </div>

                  {apiResponse && (
                    <div className="mt-4 flex items-center justify-between text-sm text-text-secondary">
                      <span className="flex items-center space-x-2">
                        <Clock className="w-4 h-4" />
                        <span>Response time: 12ms</span>
                      </span>
                      <button
                        onClick={() => copyToClipboard(apiResponse, 'response')}
                        className="flex items-center space-x-1 text-n0de-green hover:text-n0de-green/80 transition-colors"
                      >
                        {copiedCode === 'response' ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        <span>{copiedCode === 'response' ? 'Copied!' : 'Copy'}</span>
                      </button>
                    </div>
                  )}
                </GlassCard>
              </div>
            </motion.div>
          )}

          {/* SDKs & Libraries */}
          {activeTab === 'sdks' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold gradient-text mb-4">SDKs & Libraries</h2>
                <p className="text-text-secondary">Official SDKs and community libraries for every major language</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {sdks.map((sdk) => (
                  <GlassCard key={sdk.name} className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-n0de-green/10 rounded-lg">
                          {sdk.icon}
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold text-text-primary">{sdk.name}</h3>
                          <p className="text-text-secondary text-sm">{sdk.language}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-n0de-green">v{sdk.version}</div>
                        <div className="text-xs text-text-muted">{sdk.downloads} downloads</div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold text-text-secondary mb-2">Installation</h4>
                        <div className="bg-bg-main border border-border rounded-lg p-3 font-mono text-sm flex items-center justify-between">
                          <code className="text-n0de-green">{sdk.installCommand}</code>
                          <button
                            onClick={() => copyToClipboard(sdk.installCommand, sdk.name + '-install')}
                            className="text-text-muted hover:text-n0de-green transition-colors"
                          >
                            {copiedCode === sdk.name + '-install' ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold text-text-secondary mb-2">Quick Start</h4>
                        <div className="bg-bg-main border border-border rounded-lg p-3 font-mono text-sm">
                          <pre className="text-n0de-green">{sdk.quickStart}</pre>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold text-text-secondary mb-2">Features</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {sdk.features.map((feature) => (
                            <div key={feature} className="flex items-center space-x-2 text-sm">
                              <CheckCircle className="w-3 h-3 text-n0de-green" />
                              <span className="text-text-secondary">{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex space-x-3 pt-2">
                        <button className="flex-1 bg-gradient-to-r from-n0de-green to-n0de-blue text-black font-semibold py-2 rounded-lg hover:shadow-lg transition-all text-sm">
                          <Download className="w-4 h-4 inline mr-2" />
                          Download
                        </button>
                        <button className="flex-1 bg-bg-card border border-border text-text-primary font-semibold py-2 rounded-lg hover:border-n0de-green/50 transition-all text-sm">
                          <Book className="w-4 h-4 inline mr-2" />
                          Docs
                        </button>
                      </div>
                    </div>
                  </GlassCard>
                ))}
              </div>
            </motion.div>
          )}

          {/* Developer Tools */}
          {activeTab === 'tools' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold gradient-text mb-4">Developer Tools</h2>
                <p className="text-text-secondary">Professional-grade tools to build, test, and monitor your applications</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {tools.map((tool) => (
                  <GlassCard key={tool.name} className="p-6">
                    <div className="flex items-start space-x-4 mb-4">
                      <div className="p-3 bg-gradient-to-r from-n0de-green/20 to-n0de-blue/20 rounded-xl">
                        {tool.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-text-primary mb-2">{tool.name}</h3>
                        <p className="text-text-secondary text-sm mb-4">{tool.description}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold text-text-secondary mb-2">Features</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {tool.features.map((feature) => (
                            <div key={feature} className="flex items-center space-x-2 text-sm">
                              <CheckCircle className="w-3 h-3 text-n0de-green" />
                              <span className="text-text-secondary">{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-bg-main border border-border rounded-lg p-3">
                        <div className="text-xs text-text-muted mb-1">Installation</div>
                        <code className="text-n0de-green text-sm">{tool.installCommand}</code>
                      </div>

                      <div className="bg-bg-main border border-border rounded-lg p-3">
                        <div className="text-xs text-text-muted mb-1">Usage</div>
                        <code className="text-n0de-blue text-sm">{tool.usage}</code>
                      </div>

                      <button className="w-full bg-gradient-to-r from-n0de-green to-n0de-blue text-black font-semibold py-2 rounded-lg hover:shadow-lg transition-all">
                        Get Started
                      </button>
                    </div>
                  </GlassCard>
                ))}
              </div>
            </motion.div>
          )}

          {/* Code Examples */}
          {activeTab === 'examples' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold gradient-text mb-4">Code Examples</h2>
                <p className="text-text-secondary">Ready-to-use code snippets for common use cases</p>
              </div>

              <div className="flex flex-wrap justify-center gap-2 mb-8">
                {['javascript', 'python', 'rust', 'bash'].map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setSelectedLanguage(lang)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors capitalize ${
                      selectedLanguage === lang
                        ? 'bg-n0de-green text-black'
                        : 'bg-bg-card text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>

              <div className="space-y-8">
                {codeExamples
                  .filter(example => example.language === selectedLanguage)
                  .map((example) => (
                    <GlassCard key={example.id} className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-semibold text-text-primary mb-2">{example.title}</h3>
                          <p className="text-text-secondary text-sm">{example.description}</p>
                        </div>
                        <button
                          onClick={() => copyToClipboard(example.code, example.id)}
                          className="flex items-center space-x-2 px-3 py-1 bg-bg-card border border-border rounded-lg hover:border-n0de-green/50 transition-colors"
                        >
                          {copiedCode === example.id ? <CheckCircle className="w-4 h-4 text-n0de-green" /> : <Copy className="w-4 h-4" />}
                          <span className="text-sm">{copiedCode === example.id ? 'Copied!' : 'Copy'}</span>
                        </button>
                      </div>
                      
                      <div className="bg-bg-main border border-border rounded-lg p-4 overflow-x-auto">
                        <pre className="text-sm">
                          <code className="text-n0de-green">{example.code}</code>
                        </pre>
                      </div>
                    </GlassCard>
                  ))}
              </div>
            </motion.div>
          )}
        </div>
      </section>
    </div>
  );
}