'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/layouts/AppLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { toast } from 'sonner';
import { 
  Key,
  Plus,
  Copy,
  Eye,
  EyeOff,
  Trash2,
  MoreVertical,
  AlertCircle,
  Calendar,
  Activity,
  Shield,
  Edit3,
  RefreshCw,
  X
} from 'lucide-react';

interface ApiKey {
  id: string;
  name: string;
  keyPreview: string;
  key?: string;
  permissions: string[];
  lastUsedAt: string | null;
  totalRequests: number;
  createdAt: string;
  isActive: boolean;
  rateLimit: number;
}

interface CreateApiKeyData {
  name: string;
  permissions: string[];
  rateLimit: number;
}

const ApiKeysPage = () => {
  const { user } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newKeyData, setNewKeyData] = useState<CreateApiKeyData>({
    name: '',
    permissions: ['read'],
    rateLimit: 1000
  });

  // Load API keys from backend
  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      setIsLoading(true);
      const keys = await api.get<ApiKey[]>('/api-keys');
      setApiKeys(keys);
    } catch (error: any) {
      console.error('Failed to load API keys:', error);
      toast.error('Failed to load API keys');
    } finally {
      setIsLoading(false);
    }
  };

  const createApiKey = async () => {
    if (!newKeyData.name.trim()) {
      toast.error('Please enter a name for the API key');
      return;
    }

    setIsCreating(true);
    try {
      const newKey = await api.post<ApiKey & { key: string }>('/api-keys', newKeyData);
      
      // Add the new key to the list
      setApiKeys(prev => [newKey, ...prev]);
      
      // Show the full key in a toast (only time it's shown)
      toast.success(
        `API Key created successfully! Key: ${newKey.key}`, 
        { 
          duration: 10000,
          description: 'Save this key now - it won\'t be shown again!'
        }
      );
      
      // Reset form and close modal
      setNewKeyData({ name: '', permissions: ['read'], rateLimit: 1000 });
      setShowCreateModal(false);
    } catch (error: any) {
      console.error('Failed to create API key:', error);
      toast.error(error.message || 'Failed to create API key');
    } finally {
      setIsCreating(false);
    }
  };

  const deleteApiKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/api-keys/${keyId}`);
      setApiKeys(prev => prev.filter(key => key.id !== keyId));
      toast.success('API key deleted successfully');
    } catch (error: any) {
      console.error('Failed to delete API key:', error);
      toast.error(error.message || 'Failed to delete API key');
    }
  };

  const toggleKeyVisibility = (keyId: string) => {
    const newVisible = new Set(visibleKeys);
    if (newVisible.has(keyId)) {
      newVisible.delete(keyId);
    } else {
      newVisible.add(keyId);
    }
    setVisibleKeys(newVisible);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const maskKey = (key: string) => {
    if (!key) return 'n0de_live_••••••••••••••••••••';
    return key.slice(0, 12) + '••••••••••••••••••••' + key.slice(-4);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatLastUsed = (lastUsedAt: string | null) => {
    if (!lastUsedAt) return 'Never used';
    
    const date = new Date(lastUsedAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
  };

  // Calculate stats from API keys
  const stats = {
    totalKeys: apiKeys.length,
    activeKeys: apiKeys.filter(key => key.isActive).length,
    totalRequests: apiKeys.reduce((sum, key) => sum + key.totalRequests, 0),
    recentlyUsed: apiKeys.filter(key => {
      if (!key.lastUsedAt) return false;
      const lastUsed = new Date(key.lastUsedAt);
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return lastUsed > oneDayAgo;
    }).length
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="min-h-full bg-black p-6 flex items-center justify-center">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-cyan-400 mx-auto mb-4" />
              <p className="text-zinc-400">Loading API keys...</p>
            </div>
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="min-h-full bg-black p-6">
          {/* Page Header */}
          <div className="mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between"
            >
              <div>
                <h1 className="text-2xl font-bold text-white mb-2">API Keys</h1>
                <p className="text-zinc-400">
                  Manage your API keys and control access to your endpoints.
                </p>
              </div>
              <button 
                onClick={() => setShowCreateModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-cyan-500 text-black rounded-lg hover:bg-cyan-400 transition-colors font-medium"
              >
                <Plus className="h-4 w-4" />
                <span>Create API Key</span>
              </button>
            </motion.div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-4"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-cyan-500/10 rounded-lg">
                  <Key className="h-5 w-5 text-cyan-400" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-white">{stats.activeKeys}</p>
                  <p className="text-sm text-zinc-400">Active Keys</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-4"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Activity className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-white">{stats.totalRequests.toLocaleString()}</p>
                  <p className="text-sm text-zinc-400">Total Requests</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-4"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-yellow-500/10 rounded-lg">
                  <Shield className="h-5 w-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-white">{stats.totalKeys}</p>
                  <p className="text-sm text-zinc-400">Total Keys</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-4"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Calendar className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-white">{stats.recentlyUsed}</p>
                  <p className="text-sm text-zinc-400">Used Today</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* API Keys List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-zinc-950/50 border border-zinc-800 rounded-lg overflow-hidden"
          >
            <div className="p-6 border-b border-zinc-800">
              <h3 className="text-lg font-semibold text-white">Your API Keys</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-zinc-900/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      Name & Key
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      Environment
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      Usage
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      Last Used
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {apiKeys.map((apiKey, index) => (
                    <motion.tr
                      key={apiKey.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 + index * 0.1 }}
                      className="hover:bg-zinc-800/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <div className="flex items-center space-x-3 mb-2">
                            <p className="text-sm font-medium text-white">{apiKey.name}</p>
                            <span className={`px-2 py-1 text-xs font-medium rounded border ${
                              apiKey.isActive 
                                ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                                : 'bg-red-500/10 text-red-400 border-red-500/20'
                            }`}>
                              {apiKey.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <code className="text-sm text-zinc-300 bg-zinc-800 px-2 py-1 rounded font-mono">
                              {visibleKeys.has(apiKey.id) && apiKey.key ? apiKey.key : maskKey(apiKey.keyPreview)}
                            </code>
                            {apiKey.key && (
                              <button
                                onClick={() => toggleKeyVisibility(apiKey.id)}
                                className="p-1 text-zinc-400 hover:text-white transition-colors"
                              >
                                {visibleKeys.has(apiKey.id) ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </button>
                            )}
                            <button
                              onClick={() => copyToClipboard(apiKey.key || apiKey.keyPreview)}
                              className="p-1 text-zinc-400 hover:text-white transition-colors"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col space-y-1">
                          <span className="text-sm text-zinc-300">{apiKey.permissions.join(', ')}</span>
                          <span className="text-xs text-zinc-500">Rate: {apiKey.rateLimit}/min</span>
                          <span className="text-xs text-zinc-500">Created {formatDate(apiKey.createdAt)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-white">{apiKey.totalRequests.toLocaleString()}</span>
                          <span className="text-xs text-zinc-400">requests</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-zinc-300">{formatLastUsed(apiKey.lastUsedAt)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => deleteApiKey(apiKey.id)}
                            className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                            title="Delete API key"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Security Notice */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-6 bg-amber-500/10 border border-amber-500/20 rounded-lg p-4"
          >
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-amber-400 mb-1">Security Best Practices</h4>
                <p className="text-sm text-amber-200/80">
                  • Keep your API keys secure and never expose them in client-side code
                  • Rotate keys regularly and revoke unused keys
                  • Use different keys for different environments
                  • Monitor usage patterns for unusual activity
                </p>
              </div>
            </div>
          </motion.div>

          {/* Create API Key Modal */}
          {showCreateModal && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-white">Create API Key</h3>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="text-zinc-400 hover:text-white transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Name
                    </label>
                    <input
                      type="text"
                      value={newKeyData.name}
                      onChange={(e) => setNewKeyData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                      placeholder="e.g., Production API Key"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-3">
                      Permissions
                    </label>
                    <div className="space-y-3">
                      {[
                        {
                          value: 'read',
                          label: 'Read Access',
                          description: 'Access to RPC endpoints, account data, and blockchain queries'
                        },
                        {
                          value: 'write',
                          label: 'Write Access',
                          description: 'Submit transactions, modify data, and perform state changes'
                        }
                      ].map(permission => (
                        <label key={permission.value} className="flex items-start space-x-3 p-3 border border-zinc-700 rounded-lg hover:border-zinc-600 transition-colors cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newKeyData.permissions.includes(permission.value)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewKeyData(prev => ({
                                  ...prev,
                                  permissions: [...prev.permissions, permission.value]
                                }));
                              } else {
                                setNewKeyData(prev => ({
                                  ...prev,
                                  permissions: prev.permissions.filter(p => p !== permission.value)
                                }));
                              }
                            }}
                            className="mt-0.5 rounded border-zinc-700 bg-zinc-800 text-cyan-500 focus:ring-cyan-500"
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-white">{permission.label}</div>
                            <div className="text-xs text-zinc-400">{permission.description}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-3">
                      Rate Limit
                    </label>
                    <p className="text-xs text-zinc-400 mb-3">
                      Controls how many requests this API key can make per minute. Higher limits allow for more intensive applications.
                    </p>
                    <div className="space-y-2">
                      {[
                        { value: 100, label: '100 requests/min', description: 'Light usage - Testing & development' },
                        { value: 1000, label: '1,000 requests/min', description: 'Standard - Small applications' },
                        { value: 5000, label: '5,000 requests/min', description: 'High - Production applications' },
                        { value: 10000, label: '10,000 requests/min', description: 'Maximum - Heavy workloads' }
                      ].map(option => (
                        <label key={option.value} className="flex items-center space-x-3 p-3 border border-zinc-700 rounded-lg hover:border-zinc-600 transition-colors cursor-pointer">
                          <input
                            type="radio"
                            name="rateLimit"
                            value={option.value}
                            checked={newKeyData.rateLimit === option.value}
                            onChange={(e) => setNewKeyData(prev => ({ ...prev, rateLimit: parseInt(e.target.value) }))}
                            className="text-cyan-500 border-zinc-700 bg-zinc-800 focus:ring-cyan-500"
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-white">{option.label}</div>
                            <div className="text-xs text-zinc-400">{option.description}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-2 text-zinc-400 border border-zinc-700 rounded-lg hover:bg-zinc-800 transition-colors"
                    disabled={isCreating}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createApiKey}
                    disabled={isCreating || !newKeyData.name.trim()}
                    className="flex-1 px-4 py-2 bg-cyan-500 text-black rounded-lg hover:bg-cyan-400 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {isCreating ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      'Create API Key'
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
};

export default ApiKeysPage;