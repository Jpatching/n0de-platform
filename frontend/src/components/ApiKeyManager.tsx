'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Eye, 
  EyeOff, 
  Copy, 
  CheckCircle,
  Edit3,
  Trash2 
} from 'lucide-react';
import useApiKeys from '@/hooks/useApiKeys';

interface ApiKeyManagerProps {
  onCreateKey?: () => void;
  onEditKey?: (keyId: string) => void;
}

export default function ApiKeyManager({
  onCreateKey,
  onEditKey,
}: ApiKeyManagerProps) {
  const [showKey, setShowKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  
  // Use the custom hook for API key management
  const {
    apiKeys,
    isLoading: isLoadingKeys,
    deleteApiKey,
  } = useApiKeys();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'healthy':
      case 'resolved':
        return 'text-n0de-green bg-n0de-green/20 border-n0de-green/30';
      case 'degraded':
      case 'in_progress':
      case 'rate_limited':
        return 'text-n0de-orange bg-n0de-orange/20 border-n0de-orange/30';
      case 'offline':
      case 'inactive':
      case 'open':
        return 'text-n0de-red bg-n0de-red/20 border-n0de-red/30';
      default:
        return 'text-text-muted bg-text-muted/20 border-text-muted/30';
    }
  };

  const copyToClipboard = (text: string, keyId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const toggleKeyVisibility = (keyId: string) => {
    setShowKey(showKey === keyId ? null : keyId);
  };

  const handleDeleteKey = async (keyId: string) => {
    if (confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      await deleteApiKey(keyId);
    }
  };

  const handleCreateKey = () => {
    // Call parent handler if provided, otherwise could open a modal
    onCreateKey?.();
  };

  if (isLoadingKeys) {
    return (
      <div className="space-y-6">
        {/* Loading State */}
        <div className="flex items-center justify-between">
          <div className="h-8 bg-bg-main rounded w-48 animate-pulse"></div>
          <div className="h-10 bg-bg-main rounded w-32 animate-pulse"></div>
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="space-y-4">
                <div className="h-6 bg-bg-main rounded w-1/3"></div>
                <div className="grid grid-cols-4 gap-4">
                  {[...Array(4)].map((_, j) => (
                    <div key={j} className="h-16 bg-bg-main rounded"></div>
                  ))}
                </div>
                <div className="h-12 bg-bg-main rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">API Key Management</h2>
        <button 
          onClick={handleCreateKey}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Key</span>
        </button>
      </div>

      <div className="space-y-4">
        {apiKeys.length === 0 ? (
          <div className="card text-center py-12">
            <div className="text-text-secondary mb-4">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="currentColor" viewBox="0 0 24 24">
                <path d="M7 14c-1.66 0-3 1.34-3 3 0 1.31.84 2.42 2 2.83V22h2v-2.17c1.16-.41 2-1.52 2-2.83 0-1.66-1.34-3-3-3zM8 9c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm7.76 9c-.64 0-1.26-.09-1.76-.26v1.26c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.26c-.5.17-1.12.26-1.76.26zm-.76-6c0 1.1.9 2 2 2h2c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2h-2c-1.1 0-2 .9-2 2v3z"/>
              </svg>
              <h3 className="text-lg font-semibold mb-2">No API Keys</h3>
              <p className="text-sm">Create your first API key to start using the n0de RPC service.</p>
            </div>
            <button 
              onClick={handleCreateKey}
              className="btn-primary"
            >
              Create API Key
            </button>
          </div>
        ) : (
          apiKeys.map((key) => (
            <motion.div 
              key={key.id} 
              className="card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.01 }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <h3 className="font-bold text-lg">{key.name}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(key.status)}`}>
                      {key.status.replace('_', ' ')}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      key.network === 'mainnet' ? 'bg-n0de-green/20 text-n0de-green' :
                      key.network === 'devnet' ? 'bg-n0de-blue/20 text-n0de-blue' :
                      'bg-n0de-purple/20 text-n0de-purple'
                    }`}>
                      {key.network}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <span className="text-text-secondary text-sm">Created</span>
                      <div className="font-medium">{key.created}</div>
                    </div>
                    <div>
                      <span className="text-text-secondary text-sm">Last Used</span>
                      <div className="font-medium">{key.lastUsed}</div>
                    </div>
                    <div>
                      <span className="text-text-secondary text-sm">Requests</span>
                      <div className="font-medium">{key.requests.toLocaleString()}</div>
                    </div>
                    <div>
                      <span className="text-text-secondary text-sm">Rate Limit</span>
                      <div className="font-medium">{key.rateLimit.toLocaleString()}/min</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 mb-4">
                    <span className="text-sm font-medium text-text-secondary">Permissions:</span>
                    {key.permissions.map((permission) => (
                      <span key={permission} className="px-2 py-1 bg-n0de-blue/20 text-n0de-blue text-xs rounded">
                        {permission}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="font-mono text-sm bg-bg-main px-4 py-3 rounded-lg border border-border flex-1">
                      {showKey === key.id ? key.key : key.key.replace(/(?<=.{15}).(?=.{8})/g, '•')}
                    </div>
                    <button
                      onClick={() => toggleKeyVisibility(key.id)}
                      className="p-3 hover:bg-bg-hover rounded-lg transition-colors"
                      title={showKey === key.id ? 'Hide key' : 'Show key'}
                    >
                      {showKey === key.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => copyToClipboard(key.key, key.id)}
                      className="p-3 hover:bg-bg-hover rounded-lg transition-colors"
                      title="Copy to clipboard"
                    >
                      {copiedKey === key.id ? (
                        <CheckCircle className="w-4 h-4 text-n0de-green" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    <button 
                      onClick={() => onEditKey?.(key.id)}
                      className="p-3 hover:bg-bg-hover rounded-lg transition-colors"
                      title="Edit key"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteKey(key.id)}
                      className="p-3 hover:bg-n0de-red/20 text-n0de-red rounded-lg transition-colors"
                      title="Delete key"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
}