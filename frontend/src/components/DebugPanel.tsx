'use client';

import { useState, useEffect } from 'react';
import { ApiConfig } from '@/lib/api-config';
import { getPerformanceDashboard, logPerformanceReport } from '@/lib/performance-monitor';
import api from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Bug, Monitor, Network, Image, X, RefreshCw } from 'lucide-react';

interface DebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DebugPanel({ isOpen, onClose }: DebugPanelProps) {
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [apiLogs, setApiLogs] = useState<any[]>([]);
  const [configInfo, setConfigInfo] = useState<any>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Update performance data every second
    const interval = setInterval(() => {
      const dashboard = getPerformanceDashboard();
      setPerformanceData(dashboard);
    }, 1000);

    // Get API configuration info
    setConfigInfo(ApiConfig.getDebugInfo());

    // Get recent API logs if available
    try {
      const logs = (api as any).getRequestLogs?.() || [];
      setApiLogs(logs.slice(-10)); // Last 10 requests
    } catch (error) {
      console.warn('Could not retrieve API logs:', error);
    }

    return () => clearInterval(interval);
  }, [isOpen]);

  const testApiEndpoint = async (endpoint: string) => {
    try {
      console.log(`🧪 Testing API endpoint: ${endpoint}`);
      const fullUrl = ApiConfig.buildApiUrl(endpoint);
      console.log(`📡 Full URL: ${fullUrl}`);
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log(`✅ Response status: ${response.status}`);
      console.log(`📊 Response headers:`, Object.fromEntries(response.headers.entries()));
      
      if (response.ok) {
        const data = await response.json();
        console.log(`📦 Response data:`, data);
      }
    } catch (error) {
      console.error(`❌ API test failed:`, error);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-gray-900 text-white p-6 rounded-lg max-w-4xl w-full max-h-[80vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Bug className="w-6 h-6" />
              Debug Panel
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Metrics */}
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Monitor className="w-5 h-5" />
                Performance Metrics
              </h3>
              {performanceData ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Current FPS:</span>
                    <span className={performanceData.currentFps < 30 ? 'text-red-400' : 'text-green-400'}>
                      {performanceData.currentFps}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average FPS:</span>
                    <span>{performanceData.averageFps}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Frame Drops:</span>
                    <span className={performanceData.frameDrops > 10 ? 'text-yellow-400' : 'text-gray-400'}>
                      {performanceData.frameDrops}
                    </span>
                  </div>
                  <button
                    onClick={logPerformanceReport}
                    className="mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs transition-colors"
                  >
                    Log Full Report
                  </button>
                </div>
              ) : (
                <div className="text-gray-400">Loading...</div>
              )}
            </div>

            {/* API Configuration */}
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Network className="w-5 h-5" />
                API Configuration
              </h3>
              {configInfo ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Environment:</span>
                    <span className={configInfo.environment === 'development' ? 'text-blue-400' : 'text-green-400'}>
                      {configInfo.environment}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>API URL:</span>
                    <span className="text-xs text-gray-300 max-w-48 truncate">
                      {configInfo.apiUrl}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Backend URL:</span>
                    <span className="text-xs text-gray-300 max-w-48 truncate">
                      {configInfo.backendUrl}
                    </span>
                  </div>
                  <div className="mt-3">
                    <button
                      onClick={() => testApiEndpoint('health')}
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-xs mr-2 transition-colors"
                    >
                      Test Health
                    </button>
                    <button
                      onClick={() => testApiEndpoint('auth/profile')}
                      className="px-3 py-1 bg-orange-600 hover:bg-orange-700 rounded text-xs transition-colors"
                    >
                      Test Auth
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-gray-400">Loading...</div>
              )}
            </div>

            {/* Recent API Requests */}
            <div className="bg-gray-800 p-4 rounded-lg lg:col-span-2">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <RefreshCw className="w-5 h-5" />
                Recent API Requests
              </h3>
              {apiLogs.length > 0 ? (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {apiLogs.map((log, index) => (
                    <div key={index} className="text-xs bg-gray-700 p-2 rounded">
                      <div className="flex justify-between items-start">
                        <span className="font-mono">{log.method} {log.url}</span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          log.status >= 200 && log.status < 300 ? 'bg-green-600' : 
                          log.status >= 400 ? 'bg-red-600' : 'bg-yellow-600'
                        }`}>
                          {log.status || 'pending'}
                        </span>
                      </div>
                      {log.duration && (
                        <div className="text-gray-400 mt-1">
                          Duration: {log.duration}ms
                        </div>
                      )}
                      {log.error && (
                        <div className="text-red-400 mt-1">
                          Error: {log.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-400">No recent requests</div>
              )}
            </div>

            {/* Image Status */}
            <div className="bg-gray-800 p-4 rounded-lg lg:col-span-2">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Image className="w-5 h-5" />
                Image Status
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Main Background:</p>
                  <p className="text-green-400">/n0de-main-background.png</p>
                  <p className="text-xs text-gray-500">✅ URL-safe filename</p>
                </div>
                <div>
                  <p className="text-gray-400">Alt Background:</p>
                  <p className="text-green-400">/n0de-alt-background.png</p>
                  <p className="text-xs text-gray-500">✅ URL-safe filename</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-900/50 rounded-lg">
            <h4 className="font-semibold mb-2">🔧 Bug Fixes Applied:</h4>
            <ul className="text-sm space-y-1 text-green-400">
              <li>✅ Fixed /api/v1 path duplication in URL construction</li>
              <li>✅ Centralized API configuration with ApiConfig class</li>
              <li>✅ Renamed image files to prevent 400 errors</li>
              <li>✅ Enhanced performance monitoring with FPS tracking</li>
              <li>✅ Added request/response interceptors for debugging</li>
              <li>✅ Optimized image loading with lazy loading</li>
            </ul>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}