'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/layouts/AppLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { motion } from 'framer-motion';
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
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { AnimatePresence } from 'framer-motion';

interface ApiKey {
  id: string;
  name: string;
  keyPreview: string;
  permissions: string[];
  rateLimit: number;
  isActive: boolean;
  totalRequests: number;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CreateApiKeyData {
  name: string;
  permissions?: string[];
  rateLimit?: number;
}

const ApiKeysPage = () => {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);

  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showNewKeyModal, setShowNewKeyModal] = useState(false);
  const [createForm, setCreateForm] = useState<CreateApiKeyData>({
    name: '',
    permissions: ['read'],
    rateLimit: 1000
  });

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      setLoading(true);
      const response = await api.get<ApiKey[]>('/api-keys');
      setApiKeys(response || []);
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
      toast.error('Failed to load API keys');
    } finally {
      setLoading(false);
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
    toast.success('API key copied to clipboard');
  };

  const maskKey = (keyPreview: string) => {
    // Backend already returns a preview like "n0de_live_12345678..."
    return keyPreview;
  };

  const getEnvironmentColor = (keyPreview: string) => {
    if (keyPreview.includes('live_')) {
      return 'bg-red-500/10 text-red-400 border-red-500/20';
    } else if (keyPreview.includes('test_')) {
      return 'bg-green-500/10 text-green-400 border-green-500/20';
    }
    return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
  };

  const getEnvironmentName = (keyPreview: string) => {
    if (keyPreview.includes('live_')) return 'production';
    if (keyPreview.includes('test_')) return 'development';
    return 'unknown';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatLastUsed = (lastUsedAt: string | null) => {
    if (!lastUsedAt) return 'Never';
    const date = new Date(lastUsedAt);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;
    return `${Math.floor(diffInMinutes / 1440)} days ago`;
  };

  const createApiKey = async () => {
    try {
      setCreating(true);
      const response = await api.post<ApiKey & { key: string }>('/api-keys', createForm);
      setNewApiKey(response.key);
      setShowNewKeyModal(true);
      setShowCreateModal(false);
      setCreateForm({ name: '', permissions: ['read'], rateLimit: 1000 });
      await fetchApiKeys();
      toast.success('API key created successfully');
    } catch (error: any) {
      console.error('Failed to create API key:', error);
      if (error.message?.includes('API key limit reached')) {
        toast.error('API key limit reached for your subscription plan. Please upgrade to create more keys.');
      } else {
        toast.error('Failed to create API key');
      }
    } finally {
      setCreating(false);
    }
  };

  const deleteApiKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      return;
    }
    
    try {
      await api.delete(`/api-keys/${keyId}`);
      await fetchApiKeys();
      toast.success('API key deleted successfully');
    } catch (error) {
      console.error('Failed to delete API key:', error);
      toast.error('Failed to delete API key');
    }
  };

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
                disabled={creating}
                className="flex items-center space-x-2 px-4 py-2 bg-cyan-500 text-black rounded-lg hover:bg-cyan-400 transition-colors font-medium disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                <span>{creating ? 'Creating...' : 'Create API Key'}</span>
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
                  <p className="text-lg font-semibold text-white">{apiKeys.length}</p>
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
                  <p className="text-lg font-semibold text-white">{apiKeys.reduce((acc, key) => acc + key.totalRequests, 0).toLocaleString()}</p>
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
                  <p className="text-lg font-semibold text-white">{apiKeys.filter(k => k.keyPreview.includes('live_')).length}</p>
                  <p className="text-sm text-zinc-400">Prod Keys</p>
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
                  <p className="text-lg font-semibold text-white">{apiKeys.length > 0 ? Math.floor((Date.now() - new Date(apiKeys[0].createdAt).getTime()) / (24 * 60 * 60 * 1000)) : 0}</p>
                  <p className="text-sm text-zinc-400">Days Active</p>
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
              {loading ? (
                <div className="p-8 text-center">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-cyan-500" />
                  <p className="text-zinc-400">Loading API keys...</p>
                </div>
              ) : apiKeys.length === 0 ? (
                <div className="p-8 text-center">
                  <Key className="h-12 w-12 mx-auto mb-4 text-zinc-600" />
                  <p className="text-lg font-medium text-white mb-2">No API keys yet</p>
                  <p className="text-zinc-400 mb-4">Create your first API key to start using the N0DE platform.</p>
                  <button 
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2 bg-cyan-500 text-black rounded-lg hover:bg-cyan-400 transition-colors font-medium"
                  >
                    Create API Key
                  </button>
                </div>
              ) : (
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
                            <span className={`px-2 py-1 text-xs font-medium rounded border ${getEnvironmentColor(apiKey.keyPreview)}`}>
                              {getEnvironmentName(apiKey.keyPreview)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <code className="text-sm text-zinc-300 bg-zinc-800 px-2 py-1 rounded font-mono">
                              {maskKey(apiKey.keyPreview)}
                            </code>
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
                            <button
                              onClick={() => copyToClipboard(apiKey.keyPreview)}
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
                          <button className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded transition-colors">
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => deleteApiKey(apiKey.id)}
                            className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                          <button className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded transition-colors">
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                    ))}
                  </tbody>
                </table>
              )}
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
          <AnimatePresence>
            {showCreateModal && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-zinc-950 border border-zinc-800 rounded-lg p-6 w-full max-w-md"
                >
                  <h3 className="text-xl font-semibold text-white mb-4">Create API Key</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">Name</label>
                      <input
                        type="text"
                        value={createForm.name}
                        onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                        placeholder="e.g., Production App"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">Permissions</label>
                      <div className="space-y-2">
                        {['read', 'write', 'admin'].map((permission) => (
                          <label key={permission} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={createForm.permissions?.includes(permission)}
                              onChange={(e) => {
                                const permissions = createForm.permissions || ['read'];
                                if (e.target.checked) {
                                  setCreateForm({ ...createForm, permissions: [...permissions, permission] });
                                } else {
                                  setCreateForm({ ...createForm, permissions: permissions.filter(p => p !== permission) });
                                }
                              }}
                              className="rounded border-zinc-600 bg-zinc-800 text-cyan-500 focus:ring-cyan-500"
                            />
                            <span className="text-sm text-zinc-300 capitalize">{permission}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">Rate Limit (requests/minute)</label>
                      <input
                        type="number"
                        value={createForm.rateLimit}
                        onChange={(e) => setCreateForm({ ...createForm, rateLimit: parseInt(e.target.value) || 1000 })}
                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                        min="1"
                        max="100000"
                      />
                    </div>
                  </div>
                  
                  <div className="flex space-x-3 mt-6">
                    <button
                      onClick={() => setShowCreateModal(false)}
                      className="flex-1 px-4 py-2 text-zinc-400 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={createApiKey}
                      disabled={creating || !createForm.name.trim()}
                      className="flex-1 px-4 py-2 bg-cyan-500 text-black rounded-lg hover:bg-cyan-400 transition-colors disabled:opacity-50"
                    >
                      {creating ? 'Creating...' : 'Create Key'}
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* New API Key Modal */}
          <AnimatePresence>
            {showNewKeyModal && newApiKey && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-zinc-950 border border-zinc-800 rounded-lg p-6 w-full max-w-lg"
                >
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="p-2 bg-green-500/10 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-white">API Key Created!</h3>
                  </div>
                  
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-4">
                    <div className="flex items-start space-x-3">
                      <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-medium text-amber-400 mb-1">Important Security Notice</h4>
                        <p className="text-sm text-amber-200/80">
                          This is the only time you&apos;ll see the complete API key. Copy it now and store it securely.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-between">
                      <code className="text-sm text-green-400 font-mono break-all">{newApiKey}</code>
                      <button
                        onClick={() => copyToClipboard(newApiKey)}
                        className="p-2 text-zinc-400 hover:text-white transition-colors flex-shrink-0 ml-3"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      setShowNewKeyModal(false);
                      setNewApiKey(null);
                    }}
                    className="w-full px-4 py-2 bg-cyan-500 text-black rounded-lg hover:bg-cyan-400 transition-colors font-medium"
                  >
                    I&apos;ve Saved the Key
                  </button>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
};

export default ApiKeysPage;