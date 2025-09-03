'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Copy, CheckCircle, Zap, Terminal, Code2, Sparkles } from 'lucide-react';

interface ApiPlaygroundProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ApiPlayground({ isOpen, onClose }: ApiPlaygroundProps) {
  const [selectedMethod, setSelectedMethod] = useState('getAccountInfo');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const apiMethods = [
    {
      id: 'getAccountInfo',
      name: 'Get Account Info',
      description: 'Retrieve account information',
      endpoint: 'getAccountInfo',
      params: '["So11111111111111111111111111111111111111112"]',
      response: `{
  "context": { "slot": 123456789 },
  "value": {
    "data": ["base64encodeddata", "base64"],
    "executable": false,
    "lamports": 2039280,
    "owner": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    "rentEpoch": 361
  }
}`
    },
    {
      id: 'getBalance',
      name: 'Get Balance',
      description: 'Get account balance in lamports',
      endpoint: 'getBalance',
      params: '["9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"]',
      response: `{
  "context": { "slot": 123456789 },
  "value": 5000000000
}`
    },
    {
      id: 'getRecentBlockhash',
      name: 'Get Recent Blockhash',
      description: 'Get the latest blockhash',
      endpoint: 'getRecentBlockhash',
      params: '[]',
      response: `{
  "context": { "slot": 123456789 },
  "value": {
    "blockhash": "EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N",
    "feeCalculator": { "lamportsPerSignature": 5000 }
  }
}`
    }
  ];

  const currentMethod = apiMethods.find(m => m.id === selectedMethod)!;

  const runDemo = async () => {
    setIsLoading(true);
    setResult('');
    
    // Simulate API call with realistic timing
    await new Promise(resolve => setTimeout(resolve, 800));
    
    setResult(currentMethod.response);
    setIsLoading(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const curlCommand = `curl -X POST https://n0de.app/api/v1/rpc \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: your-api-key" \\
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "${currentMethod.endpoint}",
    "params": ${currentMethod.params}
  }'`;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-bg-main border border-border rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border bg-gradient-to-r from-bg-elevated to-bg-card">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-N0DE-cyan via-N0DE-sky to-N0DE-navy rounded-lg">
                <Terminal className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Live API Playground</h2>
                <p className="text-text-secondary text-sm">Test N0DE&apos;s Solana RPC endpoints in real-time</p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1 px-3 py-1 bg-green-500/10 rounded-full">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-green-400 text-xs font-medium">LIVE</span>
                </div>
                <div className="px-3 py-1 bg-N0DE-cyan/10 rounded-full">
                  <span className="text-N0DE-cyan text-xs font-medium">12ms latency</span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-bg-hover rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex h-[70vh]">
            {/* Sidebar */}
            <div className="w-1/3 border-r border-border bg-bg-elevated p-4">
              <h3 className="text-lg font-semibold mb-4 text-white">API Methods</h3>
              <div className="space-y-2">
                {apiMethods.map((method) => (
                  <motion.button
                    key={method.id}
                    onClick={() => setSelectedMethod(method.id)}
                    className={`w-full p-4 rounded-lg text-left transition-all duration-200 ${
                      selectedMethod === method.id
                        ? 'bg-gradient-to-r from-N0DE-cyan/20 to-N0DE-sky/20 border border-N0DE-cyan/30'
                        : 'bg-bg-card hover:bg-bg-hover border border-transparent'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${
                        selectedMethod === method.id ? 'bg-N0DE-cyan' : 'bg-text-muted'
                      }`} />
                      <div>
                        <div className="font-medium text-white">{method.name}</div>
                        <div className="text-sm text-text-secondary">{method.description}</div>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
              {/* Request Section */}
              <div className="flex-1 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Request</h3>
                  <button
                    onClick={() => copyToClipboard(curlCommand)}
                    className="flex items-center space-x-2 px-3 py-1 bg-bg-elevated hover:bg-bg-hover rounded-lg transition-colors"
                  >
                    {copied ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    <span className="text-sm">Copy cURL</span>
                  </button>
                </div>
                
                <div className="bg-bg-elevated rounded-lg p-4 mb-4 font-mono text-sm overflow-x-auto">
                  <pre className="text-text-secondary whitespace-pre-wrap">{curlCommand}</pre>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Response</h3>
                  <motion.button
                    onClick={runDemo}
                    disabled={isLoading}
                    className="relative group disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ 
                      perspective: '1000px',
                      transformStyle: 'preserve-3d'
                    }}
                    whileHover={{ 
                      scale: 1.06, 
                      y: -4,
                      rotateX: 5,
                      rotateY: 2,
                      boxShadow: [
                        "0 18px 30px rgba(1, 211, 244, 0.4)",
                        "inset 0 1px 0 rgba(255, 255, 255, 0.12)",
                        "inset 0 -1px 0 rgba(0, 0, 0, 0.2)"
                      ].join(', ')
                    }}
                    whileTap={{ 
                      scale: 0.96,
                      y: -1,
                      boxShadow: [
                        "0 8px 15px rgba(1, 211, 244, 0.3)",
                        "inset 0 2px 4px rgba(0, 0, 0, 0.3)",
                        "inset 0 -1px 0 rgba(255, 255, 255, 0.08)"
                      ].join(', ')
                    }}
                    animate={{
                      boxShadow: [
                        [
                          "0 10px 20px rgba(1, 211, 244, 0.2)",
                          "inset 0 1px 0 rgba(255, 255, 255, 0.08)",
                          "inset 0 -1px 0 rgba(0, 0, 0, 0.15)"
                        ].join(', '),
                        [
                          "0 12px 25px rgba(1, 211, 244, 0.25)",
                          "inset 0 1px 0 rgba(255, 255, 255, 0.1)",
                          "inset 0 -1px 0 rgba(0, 0, 0, 0.18)"
                        ].join(', '),
                        [
                          "0 10px 20px rgba(1, 211, 244, 0.2)",
                          "inset 0 1px 0 rgba(255, 255, 255, 0.08)",
                          "inset 0 -1px 0 rgba(0, 0, 0, 0.15)"
                        ].join(', ')
                      ]
                    }}
                    transition={{
                      boxShadow: { duration: 3, repeat: Infinity, ease: "easeInOut" }
                    }}
                  >
                    {/* Main Button Surface */}
                    <div className="relative flex items-center space-x-2 px-4 py-2 bg-gradient-to-b from-N0DE-cyan via-N0DE-sky to-N0DE-navy text-white rounded-lg overflow-hidden transition-all duration-300 group-hover:from-N0DE-sky group-hover:via-N0DE-cyan group-hover:to-N0DE-navy disabled:from-gray-400 disabled:via-gray-500 disabled:to-gray-600">
                      
                      {/* Top Highlight */}
                      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                      
                      {/* Inner Glow */}
                      <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-white/6 rounded-lg" />
                      
                      {/* Bottom Shadow */}
                      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-black/30 to-transparent" />
                      
                      {/* Shimmer Effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/12 to-transparent opacity-0 group-hover:opacity-100 group-hover:translate-x-full transition-all duration-700 ease-out rounded-lg" />
                      
                      {/* Content */}
                      <div className="relative flex items-center space-x-2">
                        {isLoading ? (
                          <>
                            <motion.div 
                              className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            />
                            <span>Running...</span>
                          </>
                        ) : (
                          <>
                            <motion.div
                              whileHover={{ 
                                rotate: [0, -10, 10, 0], 
                                scale: 1.1
                              }}
                              transition={{ 
                                rotate: { duration: 0.6, ease: "easeInOut" },
                                scale: { type: "spring", stiffness: 400 }
                              }}
                            >
                              <Play className="w-4 h-4" />
                            </motion.div>
                            <span>Run Demo</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* 3D Bottom Edge */}
                    <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-b from-N0DE-navy to-black/50 rounded-b-lg" />
                  </motion.button>
                </div>

                <div className="bg-bg-elevated rounded-lg p-4 h-64 overflow-y-auto">
                  {result ? (
                    <pre className="text-green-400 text-sm whitespace-pre-wrap font-mono">{result}</pre>
                  ) : (
                    <div className="flex items-center justify-center h-full text-text-muted">
                      <div className="text-center">
                        <Code2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>Click &quot;Run Demo&quot; to see the API response</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-border p-4 bg-bg-elevated/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 text-sm text-text-secondary">
                    <div className="flex items-center space-x-1">
                      <Zap className="w-4 h-4 text-N0DE-cyan" />
                      <span>Mainnet-only</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Sparkles className="w-4 h-4 text-N0DE-sky" />
                      <span>99.99% uptime</span>
                    </div>
                  </div>
                  <motion.button
                    onClick={() => {
                      onClose();
                      // You could open the signup modal here
                    }}
                    className="relative group"
                    style={{ 
                      perspective: '1000px',
                      transformStyle: 'preserve-3d'
                    }}
                    whileHover={{ 
                      scale: 1.06, 
                      y: -4,
                      rotateX: 5,
                      rotateY: 2,
                      boxShadow: [
                        "0 18px 30px rgba(1, 211, 244, 0.4)",
                        "inset 0 1px 0 rgba(255, 255, 255, 0.12)",
                        "inset 0 -1px 0 rgba(0, 0, 0, 0.2)"
                      ].join(', ')
                    }}
                    whileTap={{ 
                      scale: 0.96,
                      y: -1,
                      boxShadow: [
                        "0 8px 15px rgba(1, 211, 244, 0.3)",
                        "inset 0 2px 4px rgba(0, 0, 0, 0.3)",
                        "inset 0 -1px 0 rgba(255, 255, 255, 0.08)"
                      ].join(', ')
                    }}
                    animate={{
                      boxShadow: [
                        [
                          "0 10px 20px rgba(1, 211, 244, 0.2)",
                          "inset 0 1px 0 rgba(255, 255, 255, 0.08)",
                          "inset 0 -1px 0 rgba(0, 0, 0, 0.15)"
                        ].join(', '),
                        [
                          "0 12px 25px rgba(1, 211, 244, 0.25)",
                          "inset 0 1px 0 rgba(255, 255, 255, 0.1)",
                          "inset 0 -1px 0 rgba(0, 0, 0, 0.18)"
                        ].join(', '),
                        [
                          "0 10px 20px rgba(1, 211, 244, 0.2)",
                          "inset 0 1px 0 rgba(255, 255, 255, 0.08)",
                          "inset 0 -1px 0 rgba(0, 0, 0, 0.15)"
                        ].join(', ')
                      ]
                    }}
                    transition={{
                      boxShadow: { duration: 3.5, repeat: Infinity, ease: "easeInOut" }
                    }}
                  >
                    {/* Main Button Surface */}
                    <div className="relative px-4 py-2 bg-gradient-to-b from-N0DE-cyan via-N0DE-sky to-N0DE-navy text-white rounded-lg overflow-hidden transition-all duration-300 group-hover:from-N0DE-sky group-hover:via-N0DE-cyan group-hover:to-N0DE-navy">
                      
                      {/* Top Highlight */}
                      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                      
                      {/* Inner Glow */}
                      <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-white/6 rounded-lg" />
                      
                      {/* Bottom Shadow */}
                      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-black/30 to-transparent" />
                      
                      {/* Shimmer Effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/12 to-transparent opacity-0 group-hover:opacity-100 group-hover:translate-x-full transition-all duration-700 ease-out rounded-lg" />
                      
                      {/* Content */}
                      <div className="relative">
                        <motion.span
                          whileHover={{ x: 1 }}
                          transition={{ type: "spring", stiffness: 300 }}
                          className="font-semibold"
                        >
                          Get API Key
                        </motion.span>
                      </div>
                    </div>
                    
                    {/* 3D Bottom Edge */}
                    <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-b from-N0DE-navy to-black/50 rounded-b-lg" />
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}