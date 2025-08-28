'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { 
  Lock, 
  Key, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Shield,
  Clock,
  Search
} from 'lucide-react';
import { adminApi } from '@/services/api';
import Layout from '@/components/admin/Layout';

interface SignatureVerification {
  id: string;
  walletAddress: string;
  message: string;
  signature: string;
  isValid: boolean;
  timestamp: string;
  gameType?: string;
  matchId?: string;
  verificationMethod: string;
}

interface SignatureStats {
  totalVerifications: number;
  validSignatures: number;
  invalidSignatures: number;
  successRate: number;
}

export default function SignaturesPage() {
  const [verifications, setVerifications] = useState<SignatureVerification[]>([]);
  const [stats, setStats] = useState<SignatureStats>({
    totalVerifications: 0,
    validSignatures: 0,
    invalidSignatures: 0,
    successRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchVerifications();
    fetchStats();
    
    const interval = setInterval(() => {
      fetchVerifications();
      fetchStats();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchVerifications = async () => {
    try {
      const response = await adminApi.getSignatureVerifications();
      setVerifications((response.data as any) || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching verifications:', error);
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await adminApi.getSystemStats();
      const data = response.data || {};
      setStats({
        totalVerifications: (data as any).totalSignatureVerifications || 0,
        validSignatures: (data as any).validSignatures || 0,
        invalidSignatures: (data as any).invalidSignatures || 0,
        successRate: (data as any).signatureSuccessRate || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const filteredVerifications = verifications.filter(verification =>
    verification.walletAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
    verification.matchId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-blue-400">Signature Verification</h1>
            <p className="text-text-muted mt-1">Cryptographic signature validation and monitoring</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-300 rounded w-1/2"></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-blue-400">Signature Verification</h1>
          <p className="text-text-muted mt-1">Cryptographic signature validation and monitoring</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
          <span className="text-sm text-text-muted">Live verification monitoring</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 admin-card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">Total Verifications</p>
              <p className="text-2xl font-bold text-blue-400">{stats.totalVerifications.toLocaleString()}</p>
            </div>
            <Lock className="w-8 h-8 text-blue-400" />
          </div>
        </Card>

        <Card className="p-6 admin-card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">Valid Signatures</p>
              <p className="text-2xl font-bold text-green-400">{stats.validSignatures.toLocaleString()}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </Card>

        <Card className="p-6 admin-card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">Invalid Signatures</p>
              <p className="text-2xl font-bold text-red-400">{stats.invalidSignatures.toLocaleString()}</p>
            </div>
            <XCircle className="w-8 h-8 text-red-400" />
          </div>
        </Card>

        <Card className="p-6 admin-card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">Success Rate</p>
              <p className="text-2xl font-bold text-purple-400">{stats.successRate.toFixed(1)}%</p>
            </div>
            <Shield className="w-8 h-8 text-purple-400" />
          </div>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="p-6">
        <div className="flex items-center space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted w-4 h-4" />
            <input
              type="text"
              placeholder="Search by wallet address or match ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-bg-elevated border border-gray-700 rounded-lg text-white placeholder-text-muted focus:outline-none focus:border-blue-400"
            />
          </div>
        </div>
      </Card>

      {/* Verification List */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Recent Verifications</h2>
          <Key className="w-5 h-5 text-text-muted" />
        </div>

        {filteredVerifications.length === 0 ? (
          <div className="text-center py-12">
            <Lock className="w-16 h-16 text-text-muted mx-auto mb-4" />
            <p className="text-text-muted text-lg">No signature verifications</p>
            <p className="text-text-muted text-sm mt-2">Verification data will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredVerifications.slice(0, 20).map((verification) => (
              <div
                key={verification.id}
                className="p-4 rounded-lg border border-gray-700 bg-gray-800/50 hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    {verification.isValid ? (
                      <CheckCircle className="w-5 h-5 text-green-400 mt-1" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-400 mt-1" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-semibold text-white">
                          {verification.walletAddress.substring(0, 8)}...{verification.walletAddress.substring(-8)}
                        </h3>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          verification.isValid 
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}>
                          {verification.isValid ? 'Valid' : 'Invalid'}
                        </span>
                      </div>
                      
                      <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-text-muted">Method:</span>
                          <span className="text-white ml-2">{verification.verificationMethod}</span>
                        </div>
                        {verification.gameType && (
                          <div>
                            <span className="text-text-muted">Game:</span>
                            <span className="text-blue-400 ml-2 capitalize">{verification.gameType}</span>
                          </div>
                        )}
                        {verification.matchId && (
                          <div>
                            <span className="text-text-muted">Match ID:</span>
                            <span className="text-purple-400 ml-2 font-mono text-xs">
                              {verification.matchId.substring(0, 8)}...
                            </span>
                          </div>
                        )}
                        <div>
                          <span className="text-text-muted">Timestamp:</span>
                          <span className="text-white ml-2">
                            {new Date(verification.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 space-y-2">
                        <div>
                          <span className="text-text-muted text-xs">Message:</span>
                          <p className="text-white text-xs font-mono bg-gray-900 p-2 rounded mt-1 break-all">
                            {verification.message.length > 100 
                              ? verification.message.substring(0, 100) + '...' 
                              : verification.message
                            }
                          </p>
                        </div>
                        <div>
                          <span className="text-text-muted text-xs">Signature:</span>
                          <p className="text-blue-400 text-xs font-mono bg-gray-900 p-2 rounded mt-1 break-all">
                            {verification.signature.substring(0, 50)}...
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Security Notice */}
      <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-blue-400 font-semibold">Signature Security</h4>
            <p className="text-sm text-text-muted mt-1">
              All game actions require cryptographic signature verification for security. Invalid signatures may indicate 
              attempted fraud or compromised wallets. Monitor failure rates closely and investigate suspicious patterns.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 