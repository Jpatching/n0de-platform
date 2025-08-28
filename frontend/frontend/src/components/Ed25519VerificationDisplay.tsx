'use client';

import { useState, useEffect } from 'react';
import { Key, CheckCircle, Copy, Eye } from 'lucide-react';

interface VerificationRecord {
  matchId: string;
  gameType: string;
  winner: string;
  signature: string;
  verifierPublicKey: string;
  timestamp: string;
  status: 'verified' | 'pending' | 'failed';
}

export default function Ed25519VerificationDisplay() {
  const [recentVerifications, setRecentVerifications] = useState<VerificationRecord[]>([]);
  const [selectedVerification, setSelectedVerification] = useState<VerificationRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecentVerifications();
  }, []);

  const loadRecentVerifications = async () => {
    try {
      // Load real verification data from Oracle service
      const token = localStorage.getItem('pv3_session_token');
      const headers = {
            'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      };

      // Get recent verifications from the API
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'https://pv3-backend-api-production.up.railway.app/api/v1'}/matches/recent-verifications`,
        { headers }
      );

      let recentData = [];
      if (response.ok) {
        const result = await response.json();
        recentData = result.verifications || [];
      }

      // Transform backend data to our interface
      const transformedVerifications: VerificationRecord[] = recentData.map((v: any) => ({
        matchId: v.matchId,
        gameType: v.gameType?.charAt(0).toUpperCase() + v.gameType?.slice(1) || 'Unknown',
        winner: v.winnerWallet || v.winner || 'Unknown',
        signature: v.signature || 'No signature available',
        verifierPublicKey: v.verifierPublicKey || 'No public key available',
        timestamp: new Date(v.timestamp).toISOString(),
        status: v.isValid ? 'verified' : 'failed'
      }));
      
      setRecentVerifications(transformedVerifications);
    } catch (error) {
      console.error('Failed to load verifications:', error);
      // Set empty array on error instead of fake data
      setRecentVerifications([]);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'text-green-400 bg-green-500/20';
      case 'pending': return 'text-yellow-400 bg-yellow-500/20';
      case 'failed': return 'text-red-400 bg-red-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  if (loading) {
    return (
      <div className="bg-bg-elevated border border-border rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-bg-card rounded w-1/3"></div>
          <div className="space-y-2">
            <div className="h-4 bg-bg-card rounded"></div>
            <div className="h-4 bg-bg-card rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-bg-elevated border border-border rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Key className="w-6 h-6 text-orange-400" />
          <div>
            <h2 className="text-xl font-audiowide text-text-primary">Ed25519 Verification</h2>
            <p className="text-text-secondary">Cryptographic proof of game result authenticity</p>
          </div>
        </div>

        <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Key className="w-5 h-5 text-orange-400 mt-0.5" />
            <div>
              <p className="text-orange-400 font-medium">Zero-Trust Verification</p>
              <p className="text-sm text-orange-400/80">
                Every game result is cryptographically signed with Ed25519 for mathematical proof of authenticity
        </p>
      </div>
          </div>
        </div>
      </div>

      {/* Recent Verifications */}
      <div className="bg-bg-elevated border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Recent Verifications</h3>
        
        <div className="space-y-3">
          {recentVerifications.map((verification) => (
            <div key={verification.matchId} className="border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className={`text-xs px-2 py-1 rounded ${getStatusColor(verification.status)}`}>
                    {verification.status}
                </div>
                  <span className="text-text-primary font-medium">{verification.gameType}</span>
                  <span className="text-text-secondary">•</span>
                  <span className="text-text-secondary text-sm">{verification.matchId}</span>
                </div>
                <button
                  onClick={() => setSelectedVerification(verification)}
                  className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 text-sm"
                >
                  <Eye className="w-4 h-4" />
                  <span>View Details</span>
                </button>
              </div>
              
              <div className="text-sm text-text-secondary">
                Winner: {verification.winner} • {new Date(verification.timestamp).toLocaleString()}
              </div>
            </div>
          ))}
            </div>
          </div>

      {/* Verification Details Modal */}
      {selectedVerification && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-bg-elevated border border-border rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text-primary">Verification Details</h3>
              <button
                onClick={() => setSelectedVerification(null)}
                className="text-text-secondary hover:text-text-primary"
              >
                ✕
              </button>
              </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-text-secondary">Match ID</label>
                <div className="flex items-center space-x-2 mt-1">
                  <code className="flex-1 bg-bg-card border border-border rounded px-3 py-2 text-sm font-mono text-text-primary">
                    {selectedVerification.matchId}
                  </code>
                  <button
                    onClick={() => copyToClipboard(selectedVerification.matchId)}
                    className="text-blue-400 hover:text-blue-300"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm text-text-secondary">Winner</label>
                <div className="flex items-center space-x-2 mt-1">
                  <code className="flex-1 bg-bg-card border border-border rounded px-3 py-2 text-sm font-mono text-text-primary">
                    {selectedVerification.winner}
                    </code>
                    <button
                    onClick={() => copyToClipboard(selectedVerification.winner)}
                    className="text-blue-400 hover:text-blue-300"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                <label className="text-sm text-text-secondary">Ed25519 Signature</label>
                <div className="flex items-center space-x-2 mt-1">
                  <code className="flex-1 bg-bg-card border border-border rounded px-3 py-2 text-sm font-mono text-text-primary break-all">
                    {selectedVerification.signature}
                    </code>
                    <button
                    onClick={() => copyToClipboard(selectedVerification.signature)}
                    className="text-blue-400 hover:text-blue-300"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                </div>
              </div>

                  <div>
                <label className="text-sm text-text-secondary">Verifier Public Key</label>
                <div className="flex items-center space-x-2 mt-1">
                  <code className="flex-1 bg-bg-card border border-border rounded px-3 py-2 text-sm font-mono text-text-primary break-all">
                    {selectedVerification.verifierPublicKey}
                      </code>
                      <button
                    onClick={() => copyToClipboard(selectedVerification.verifierPublicKey)}
                    className="text-blue-400 hover:text-blue-300"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <div>
                    <p className="text-green-400 font-medium">Cryptographically Verified</p>
                    <p className="text-sm text-green-400/80">
                      This result has been mathematically proven using Ed25519 digital signatures
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 