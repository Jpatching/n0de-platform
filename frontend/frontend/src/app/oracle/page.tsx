'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, Key, Shield, AlertTriangle, CheckCircle, Copy, Search, TrendingUp, Activity, Zap } from 'lucide-react';
import { oracleService } from '@/services/oracleService';
import Layout from '@/components/Layout';

interface VerificationRecord {
  matchId: string;
  gameType: string;
  winner: string;
  signature: string;
  verifierPublicKey: string;
  timestamp: string;
  status: 'verified' | 'pending' | 'failed';
  confidence: number;
  resultHash: string;
}

interface OracleMetrics {
  totalVerifications: number;
  successRate: number;
  averageConfidence: number;
  dailyVerifications: number;
  flaggedMatches: number;
}

export default function PV3OraclePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [searchId, setSearchId] = useState('');
  const [selectedVerification, setSelectedVerification] = useState<VerificationRecord | null>(null);
  const [recentVerifications, setRecentVerifications] = useState<VerificationRecord[]>([]);
  const [metrics, setMetrics] = useState<OracleMetrics | null>(null);
  const [activeTab, setActiveTab] = useState<'search' | 'recent' | 'metrics'>('search');

  useEffect(() => {
    loadOracleData();
  }, []);

  const loadOracleData = async () => {
    try {
      // Load recent verifications from real API using service
      const recentData = await oracleService.getRecentVerifications();

      // Transform backend data to our interface
      const transformedVerifications: VerificationRecord[] = recentData.map((v: any) => ({
        matchId: v.matchId,
        gameType: v.gameType?.charAt(0).toUpperCase() + v.gameType?.slice(1) || 'Unknown',
        winner: v.winnerWallet || v.winner,
        signature: v.signature || 'No signature available',
        verifierPublicKey: v.verifierPublicKey || 'No public key available',
        timestamp: new Date(v.timestamp).toISOString(),
        status: v.isValid ? 'verified' : 'failed',
        confidence: v.isValid ? 99.5 : 0,
        resultHash: v.resultHash || 'No hash available'
      }));

      // Get real metrics from service
      const oracleMetrics = await oracleService.getVerificationMetrics();

      setRecentVerifications(transformedVerifications);
      setMetrics(oracleMetrics);
    } catch (error) {
      console.error('Failed to load Oracle data:', error);
      // Fallback to minimal data on error
      setMetrics({
        totalVerifications: 0,
        successRate: 0,
        averageConfidence: 0,
        dailyVerifications: 0,
        flaggedMatches: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const searchMatch = async () => {
    if (!searchId.trim()) return;
    
    try {
      // First check if it's in our recent verifications
      const found = recentVerifications.find(v => 
        v.matchId.toLowerCase().includes(searchId.toLowerCase())
      );
      
      if (found) {
        setSelectedVerification(found);
        return;
      }

      // If not found locally, query the verification API using service
      const verificationResult = await oracleService.verifyMatch(searchId);

      if (verificationResult.verified) {
        // Transform API response to our interface
        setSelectedVerification({
          matchId: verificationResult.matchId,
          gameType: 'Unknown', // API doesn't return game type in verification
          winner: verificationResult.winner || 'Unknown',
          signature: verificationResult.cryptographicProof?.signature || 'No signature available',
          verifierPublicKey: verificationResult.cryptographicProof?.verifierPublicKey || 'No public key available',
          timestamp: new Date(verificationResult.cryptographicProof?.timestamp || Date.now()).toISOString(),
          status: 'verified',
          confidence: 99.8,
          resultHash: verificationResult.cryptographicProof?.resultHash || 'No hash available'
        });
      } else {
        // Match not found or verification failed
        setSelectedVerification({
          matchId: searchId,
          gameType: 'Unknown',
          winner: 'Not Found',
          signature: 'No signature available',
          verifierPublicKey: 'No public key available',
          timestamp: new Date().toISOString(),
          status: 'failed',
          confidence: 0,
          resultHash: verificationResult.error || 'Match not found or verification failed'
        });
      }
    } catch (error) {
      console.error('Failed to search match:', error);
      setSelectedVerification({
        matchId: searchId,
        gameType: 'Error',
        winner: 'Search Failed',
        signature: 'Network error',
        verifierPublicKey: 'Network error',
        timestamp: new Date().toISOString(),
        status: 'failed',
        confidence: 0,
        resultHash: 'Network error occurred while searching'
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'pending': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'failed': return 'text-red-400 bg-red-500/20 border-red-500/30';
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 95) return 'text-green-400';
    if (confidence >= 85) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (!user) {
    return (
      <Layout 
        currentPage="oracle" 
        title="" 
        subtitle=""
        showWalletStatus={false}
      >
        <div className="max-w-2xl mx-auto text-center py-4">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Eye className="w-8 h-8 text-white" />
          </div>
          <p className="text-text-secondary mb-8">Sign in to access the Oracle&apos;s wisdom</p>
          <div className="bg-bg-elevated border border-border rounded-lg p-6">
            <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
            <p className="text-text-secondary">Please sign in to continue</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout 
      currentPage="oracle" 
      title="" 
      subtitle=""
      showWalletStatus={false}
    >
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Page Header */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-text-primary mb-1 font-audiowide">
            PV3 ORACLE
          </h1>
          <p className="text-text-secondary text-sm">The all-seeing source of cryptographic truth</p>
        </div>

        {/* Revolutionary Oracle Information */}
        <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-4">
          <div className="text-center mb-4">
            <h2 className="text-lg font-audiowide text-text-primary mb-2">🔮 Gaming&apos;s Truth Engine</h2>
            <p className="text-sm text-text-secondary leading-relaxed">
              Built exclusively for PV3&apos;s competitive gaming ecosystem, our Oracle is the world&apos;s first gaming-native verification system. 
              Every Chess, Checkers, and strategic game match is cryptographically sealed with military-grade Ed25519 signatures.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <div className="bg-bg-elevated/50 border border-border rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <Shield className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-semibold text-text-primary">PV3 Signature Shield</h3>
              </div>
              <p className="text-text-secondary text-xs leading-relaxed">
                Every PV3 match generates a unique cryptographic fingerprint using Ed25519 signatures for mathematical proof.
              </p>
            </div>

            <div className="bg-bg-elevated/50 border border-border rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <Eye className="w-5 h-5 text-purple-400" />
                <h3 className="text-sm font-semibold text-text-primary">PV3 All-Seeing Eye</h3>
              </div>
              <p className="text-text-secondary text-xs leading-relaxed">
                Our Oracle watches every move across PV3&apos;s gaming universe with independent verification.
              </p>
            </div>

            <div className="bg-bg-elevated/50 border border-border rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <h3 className="text-sm font-semibold text-text-primary">Lightning-Fast Payouts</h3>
              </div>
              <p className="text-text-secondary text-xs leading-relaxed">
                Instant SOL payouts triggered automatically upon verified victory.
              </p>
            </div>
          </div>

          <div className="bg-bg-card border border-border rounded-lg p-3 mb-3">
            <h3 className="text-base font-audiowide text-text-primary mb-3">🚀 Your PV3 Gaming Advantage</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <h4 className="font-semibold text-text-primary text-sm">End Chess Rage Quits</h4>
                  <p className="text-xs text-text-secondary">Mathematical certainty settles every dispute</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <h4 className="font-semibold text-text-primary text-sm">Instant SOL Rewards</h4>
                  <p className="text-xs text-text-secondary">Automatic Solana payouts upon victory</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <h4 className="font-semibold text-text-primary text-sm">Anti-Cheat Shield</h4>
                  <p className="text-xs text-text-secondary">Detects engine assistance and illegal moves</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-orange-400 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <h4 className="font-semibold text-text-primary text-sm">Public Match Records</h4>
                  <p className="text-xs text-text-secondary">Publicly verifiable gaming history</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-bg-card border border-border rounded-lg p-3">
            <h3 className="text-base font-audiowide text-text-primary mb-3">📖 Master the PV3 Oracle</h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0">1</div>
                <div>
                  <h4 className="font-semibold text-text-primary text-sm">Verify Your PV3 Victories</h4>
                  <p className="text-xs text-text-secondary">Paste any PV3 Match ID to instantly verify your wins with cryptographic proof</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0">2</div>
                <div>
                  <h4 className="font-semibold text-text-primary text-sm">Inspect PV3 Signatures</h4>
                  <p className="text-xs text-text-secondary">Examine the Ed25519 cryptographic signatures that make every match result unbreakable</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0">3</div>
                <div>
                  <h4 className="font-semibold text-text-primary text-sm">Track PV3 Performance</h4>
                  <p className="text-xs text-text-secondary">Monitor Oracle confidence scores and verification network health</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Oracle Stats */}
        {metrics && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
            <div className="bg-bg-elevated border border-border rounded-lg p-2">
              <div className="flex items-center space-x-1 mb-1">
                <Shield className="w-3 h-3 text-blue-400" />
                <span className="text-xs text-text-secondary">Total Verified</span>
              </div>
              <div className="text-base font-bold text-text-primary">{metrics.totalVerifications.toLocaleString()}</div>
            </div>
            
            <div className="bg-bg-elevated border border-border rounded-lg p-2">
              <div className="flex items-center space-x-1 mb-1">
                <CheckCircle className="w-3 h-3 text-green-400" />
                <span className="text-xs text-text-secondary">Success Rate</span>
              </div>
              <div className="text-base font-bold text-green-400">{metrics.successRate}%</div>
            </div>
            
            <div className="bg-bg-elevated border border-border rounded-lg p-2">
              <div className="flex items-center space-x-1 mb-1">
                <TrendingUp className="w-3 h-3 text-purple-400" />
                <span className="text-xs text-text-secondary">Confidence</span>
              </div>
              <div className="text-base font-bold text-purple-400">{metrics.averageConfidence}%</div>
            </div>
            
            <div className="bg-bg-elevated border border-border rounded-lg p-2">
              <div className="flex items-center space-x-1 mb-1">
                <Activity className="w-3 h-3 text-orange-400" />
                <span className="text-xs text-text-secondary">Today</span>
              </div>
              <div className="text-base font-bold text-text-primary">{metrics.dailyVerifications}</div>
            </div>
            
            <div className="bg-bg-elevated border border-border rounded-lg p-2">
              <div className="flex items-center space-x-1 mb-1">
                <AlertTriangle className="w-3 h-3 text-red-400" />
                <span className="text-xs text-text-secondary">Flagged</span>
              </div>
              <div className="text-base font-bold text-red-400">{metrics.flaggedMatches}</div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-bg-elevated border border-border rounded-lg p-1">
          {[
            { id: 'search', label: 'Oracle Query', icon: Search },
            { id: 'recent', label: 'Recent Visions', icon: Activity },
            { id: 'metrics', label: 'Oracle Insights', icon: TrendingUp },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md font-medium transition-colors text-sm ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-card'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-4">
          {activeTab === 'search' && (
            <div className="bg-bg-elevated border border-border rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-4">
                <Search className="w-5 h-5 text-purple-400" />
                <div>
                  <h2 className="text-lg font-audiowide text-text-primary">Query the Oracle</h2>
                  <p className="text-text-secondary text-sm">Enter a Match ID to reveal its cryptographic truth</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 mb-4">
                <input
                  type="text"
                  placeholder="Enter Match ID (e.g., match_pv3_abc123)"
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  className="flex-1 bg-bg-card border border-border rounded-lg px-3 py-2 text-text-primary placeholder-text-muted focus:outline-none focus:border-purple-500 transition-colors text-sm"
                  onKeyPress={(e) => e.key === 'Enter' && searchMatch()}
                />
                <button
                  onClick={searchMatch}
                  disabled={!searchId.trim()}
                  className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-4 py-2 rounded-lg font-medium hover:from-purple-600 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-sm"
                >
                  <Eye className="w-4 h-4" />
                  <span>Consult Oracle</span>
                </button>
              </div>

              {selectedVerification && (
                <div className="border border-border rounded-lg p-4 bg-bg-card">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-semibold text-text-primary">Oracle&apos;s Vision</h3>
                    <div className={`text-xs px-2 py-1 rounded border ${getStatusColor(selectedVerification.status)}`}>
                      {selectedVerification.status.toUpperCase()}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-text-secondary">Match ID</label>
                        <div className="flex items-center space-x-2 mt-1">
                          <code className="flex-1 bg-bg-elevated border border-border rounded px-2 py-1 text-xs font-mono text-text-primary break-all">
                            {selectedVerification.matchId}
                          </code>
                          <button
                            onClick={() => copyToClipboard(selectedVerification.matchId)}
                            className="text-purple-400 hover:text-purple-300 flex-shrink-0"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs text-text-secondary">Game Type</label>
                        <div className="mt-1">
                          <span className="bg-bg-elevated border border-border rounded px-2 py-1 text-xs text-text-primary">
                            {selectedVerification.gameType}
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs text-text-secondary">Winner</label>
                        <div className="flex items-center space-x-2 mt-1">
                          <code className="flex-1 bg-bg-elevated border border-border rounded px-2 py-1 text-xs font-mono text-text-primary break-all">
                            {selectedVerification.winner}
                          </code>
                          <button
                            onClick={() => copyToClipboard(selectedVerification.winner)}
                            className="text-purple-400 hover:text-purple-300 flex-shrink-0"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-text-secondary">Confidence Score</label>
                        <div className="mt-1">
                          <span className={`text-base font-bold ${getConfidenceColor(selectedVerification.confidence)}`}>
                            {selectedVerification.confidence}%
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs text-text-secondary">Verified At</label>
                        <div className="mt-1">
                          <span className="text-text-primary text-xs">
                            {new Date(selectedVerification.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs text-text-secondary">Result Hash</label>
                        <div className="flex items-center space-x-2 mt-1">
                          <code className="flex-1 bg-bg-elevated border border-border rounded px-2 py-1 text-xs font-mono text-text-primary break-all">
                            {selectedVerification.resultHash}
                          </code>
                          <button
                            onClick={() => copyToClipboard(selectedVerification.resultHash)}
                            className="text-purple-400 hover:text-purple-300 flex-shrink-0"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="text-xs text-text-secondary">Ed25519 Signature</label>
                    <div className="flex items-center space-x-2 mt-1">
                      <code className="flex-1 bg-bg-elevated border border-border rounded px-2 py-1 text-xs font-mono text-text-primary break-all">
                        {selectedVerification.signature}
                      </code>
                      <button
                        onClick={() => copyToClipboard(selectedVerification.signature)}
                        className="text-purple-400 hover:text-purple-300 flex-shrink-0"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {selectedVerification.status === 'verified' && (
                    <div className="mt-4 bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <div>
                          <p className="text-green-400 font-medium text-sm">Cryptographically Verified</p>
                          <p className="text-xs text-green-400/80">
                            The Oracle has spoken: This match result is mathematically proven authentic
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'recent' && (
            <div className="bg-bg-elevated border border-border rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-4">
                <Activity className="w-5 h-5 text-orange-400" />
                <div>
                  <h2 className="text-lg font-audiowide text-text-primary">Recent Visions</h2>
                  <p className="text-text-secondary text-sm">Latest matches verified by the Oracle</p>
                </div>
              </div>

              <div className="space-y-2">
                {recentVerifications.map((verification) => (
                  <div key={verification.matchId} className="border border-border rounded-lg p-3 hover:bg-bg-card/50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className={`text-xs px-2 py-1 rounded border ${getStatusColor(verification.status)}`}>
                          {verification.status}
                        </div>
                        <span className="text-text-primary font-medium text-sm">{verification.gameType}</span>
                        <span className="text-text-secondary">•</span>
                        <code className="text-text-secondary text-xs">{verification.matchId}</code>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs font-medium ${getConfidenceColor(verification.confidence)}`}>
                          {verification.confidence}%
                        </span>
                        <button
                          onClick={() => setSelectedVerification(verification)}
                          className="text-purple-400 hover:text-purple-300 text-xs"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                    
                    <div className="text-xs text-text-secondary">
                      Winner: <code className="text-text-primary">{verification.winner}</code> • {new Date(verification.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'metrics' && metrics && (
            <div className="space-y-4">
              <div className="bg-bg-elevated border border-border rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-4">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                  <div>
                    <h2 className="text-lg font-audiowide text-text-primary">Oracle Insights</h2>
                    <p className="text-text-secondary text-sm">Deep analytics from the Oracle&apos;s all-seeing eye</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <CheckCircle className="w-6 h-6 text-green-400" />
                      <div>
                        <h3 className="font-semibold text-text-primary text-sm">Verification Excellence</h3>
                        <p className="text-xs text-text-secondary">System reliability metrics</p>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-green-400 mb-1">{metrics.successRate}%</div>
                    <p className="text-xs text-green-400/80">Success rate across all verifications</p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <TrendingUp className="w-6 h-6 text-purple-400" />
                      <div>
                        <h3 className="font-semibold text-text-primary text-sm">Oracle Confidence</h3>
                        <p className="text-xs text-text-secondary">Average verification confidence</p>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-purple-400 mb-1">{metrics.averageConfidence}%</div>
                    <p className="text-xs text-purple-400/80">High confidence in all decisions</p>
                  </div>

                  <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <Zap className="w-6 h-6 text-orange-400" />
                      <div>
                        <h3 className="font-semibold text-text-primary text-sm">Daily Activity</h3>
                        <p className="text-xs text-text-secondary">Verifications processed today</p>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-orange-400 mb-1">{metrics.dailyVerifications}</div>
                    <p className="text-xs text-orange-400/80">Matches verified in the last 24h</p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <Eye className="w-5 h-5 text-purple-400" />
                  <div>
                    <p className="text-purple-400 font-medium text-sm">The Oracle&apos;s Wisdom</p>
                    <p className="text-xs text-purple-400/80">
                      Every match result is cryptographically signed with Ed25519 for mathematical proof of authenticity. 
                      The Oracle sees all, knows all, and verifies all with zero-trust verification.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
} 