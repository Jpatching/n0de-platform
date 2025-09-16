'use client';

import AppLayout from '@/components/layouts/AppLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { motion } from 'framer-motion';
import { 
  Code, 
  Play,
  Save, 
  Share
} from 'lucide-react';

const PlaygroundPage = () => {
  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="min-h-full bg-black p-6">
          <div className="mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between"
            >
              <div>
                <h1 className="text-2xl font-bold text-white mb-2">API Playground</h1>
                <p className="text-zinc-400">
                  Test your API endpoints and explore the N0DE platform.
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <button className="flex items-center space-x-2 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white hover:bg-zinc-700 transition-colors">
                  <Save className="h-4 w-4" />
                  <span>Save</span>
                </button>
                <button className="flex items-center space-x-2 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white hover:bg-zinc-700 transition-colors">
                  <Share className="h-4 w-4" />
                  <span>Share</span>
                </button>
                <button className="flex items-center space-x-2 px-4 py-2 bg-cyan-500 text-black rounded-lg hover:bg-cyan-400 transition-colors font-medium">
                  <Play className="h-4 w-4" />
                  <span>Run</span>
                </button>
              </div>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Request Panel */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-zinc-950/50 border border-zinc-800 rounded-lg overflow-hidden"
            >
              <div className="p-4 border-b border-zinc-800">
                <h3 className="text-lg font-semibold text-white">Request</h3>
              </div>
              
              {/* Method and URL */}
              <div className="p-4 border-b border-zinc-800">
                <div className="flex space-x-3">
                  <select className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white text-sm">
                    <option>GET</option>
                    <option>POST</option>
                    <option>PUT</option>
                    <option>DELETE</option>
                  </select>
                  <input
                    type="text"
                    placeholder="https://api.n0de.com/v1/..."
                    className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              {/* Headers and Body */}
              <div className="p-4">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Headers</label>
                  <textarea
                    rows={4}
                    placeholder='{"Authorization": "Bearer your-api-key"}'
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono text-sm resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Request Body</label>
                  <textarea
                    rows={6}
                    placeholder='{"key": "value"}'
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono text-sm resize-none"
                  />
                </div>
              </div>
            </motion.div>

            {/* Response Panel */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-zinc-950/50 border border-zinc-800 rounded-lg overflow-hidden"
            >
              <div className="p-4 border-b border-zinc-800">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Response</h3>
                  <div className="flex items-center space-x-2 text-sm text-zinc-400">
                    <span>Status:</span>
                    <span className="text-green-400">200 OK</span>
                    <span>•</span>
                    <span>42ms</span>
                  </div>
                </div>
              </div>
              
              <div className="p-4">
                <div className="bg-zinc-900/50 rounded p-4 h-80 overflow-auto">
                  <pre className="text-sm text-zinc-300 font-mono">
{`{
  "success": true,
  "data": {
    "message": "Hello from N0DE API!",
    "timestamp": "2024-03-15T10:30:00Z",
    "version": "1.0.0"
  }
}`}
                  </pre>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-4">
              <h4 className="text-sm font-medium text-white mb-2">Code Examples</h4>
              <p className="text-xs text-zinc-400 mb-3">Generate client code for your requests</p>
              <button className="flex items-center space-x-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
                <Code className="h-4 w-4" />
                <span>Generate Code</span>
              </button>
            </div>

            <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-4">
              <h4 className="text-sm font-medium text-white mb-2">Environment</h4>
              <p className="text-xs text-zinc-400 mb-3">Switch between different environments</p>
              <select className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-white text-sm">
                <option>Production</option>
                <option>Staging</option>
                <option>Development</option>
              </select>
            </div>

            <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-4">
              <h4 className="text-sm font-medium text-white mb-2">Collections</h4>
              <p className="text-xs text-zinc-400 mb-3">Save requests to collections</p>
              <button className="flex items-center space-x-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
                <Save className="h-4 w-4" />
                <span>Save to Collection</span>
              </button>
            </div>
          </motion.div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
};

export default PlaygroundPage;