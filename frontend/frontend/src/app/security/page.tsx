'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Shield, AlertTriangle, Lock, Key, CheckCircle, Eye, Settings, Bell, Clock, MapPin, TrendingUp } from 'lucide-react';
import TwoFactorManager from '../../components/TwoFactorManager';

interface SecuritySettings {
  twoFactorEnabled: boolean;
  lastVerification?: string;
  backupCodesGenerated: boolean;
  securityScore: number;
  recentActivity: Array<{
    id: string;
    type: string;
    action: string;
    timestamp: string;
    ipAddress?: string;
    location?: string;
  }>;
  loginSessions: Array<{
    id: string;
    device: string;
    location: string;
    lastActive: string;
    current: boolean;
  }>;
  securityNotifications: {
    loginAlerts: boolean;
    withdrawalAlerts: boolean;
    securityEvents: boolean;
    weeklyReports: boolean;
  };
}

interface SecurityMetrics {
  summary: {
    totalSecurityEvents: number;
    criticalAlerts: number;
    blockedAttempts: number;
    successfulVerifications: number;
    systemHealth: number;
    activeThreats: number;
  };
  verificationMetrics: {
    ed25519Signatures: number;
    failedSignatures: number;
    averageVerificationTime: number;
    successRate: number;
  };
  twoFactorStats: {
    enabledPercentage: number;
    totalEnabled: number;
    dailyVerifications: number;
    failedAttempts: number;
    backupCodeUsage: number;
  };
  riskAnalysis: {
    suspiciousPatterns: Array<{
      type: string;
      severity: string;
      description: string;
      count: number;
    }>;
    highRiskUsers: number;
    ipBlocks: number;
    geographicRisks: Array<{
      country: string;
      riskLevel: number;
      detections: number;
    }>;
  };
  antiCheatDetections: Array<{
    id: string;
    type: string;
    severity: number;
    description: string;
    timestamp: string;
    status: string;
    playerWallet: string;
    userId: string;
    gameType: string;
    detectionType: string;
    flags: string[];
    confidence: number;
  }>;
}

export default function SecurityPage() {
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [timeRange, setTimeRange] = useState('day');
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('overview');

  useEffect(() => {
    fetchSecurityMetrics();
  }, [timeRange]);

  const fetchSecurityMetrics = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('pv3_session_token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'https://pv3-backend-api-production.up.railway.app/api/v1'}/analytics/security?timeRange=${timeRange}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setMetrics(data.metrics);
      }
    } catch (error) {
      console.error('Failed to fetch security metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: number) => {
    if (severity >= 4) return 'text-red-400 bg-red-500/10 border-red-500/20';
    if (severity >= 3) return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
    if (severity >= 2) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
    return 'text-green-400 bg-green-500/10 border-green-500/20';
  };

  const getSeverityLabel = (severity: number) => {
    if (severity >= 4) return 'CRITICAL';
    if (severity >= 3) return 'HIGH';
    if (severity >= 2) return 'MEDIUM';
    return 'LOW';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'FLAGGED': return 'text-red-400 bg-red-500/10';
      case 'REVIEWED': return 'text-yellow-400 bg-yellow-500/10';
      case 'RESOLVED': return 'text-green-400 bg-green-500/10';
      case 'FALSE_POSITIVE': return 'text-gray-400 bg-gray-500/10';
      default: return 'text-gray-400 bg-gray-500/10';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary text-text-primary">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-primary"></div>
          </div>
            </div>
            </div>
    );
  }

  if (!metrics) {
    return (
      <div className="min-h-screen bg-bg-primary text-text-primary">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Security Dashboard</h1>
            <p className="text-text-secondary">Failed to load security metrics</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-audiowide text-text-primary mb-2">
              🛡️ Security Command Center
            </h1>
            <p className="text-text-secondary">
              Real-time anti-cheat monitoring and threat analysis
            </p>
          </div>

          {/* Time Range Selector */}
          <div className="flex items-center space-x-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-bg-card border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-accent-primary"
            >
              <option value="hour">Last Hour</option>
              <option value="day">Last 24 Hours</option>
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
            </select>
          </div>
        </div>

        {/* Security Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary">Total Events</p>
                <p className="text-2xl font-bold text-text-primary">
                  {metrics.summary.totalSecurityEvents.toLocaleString()}
                </p>
              </div>
              <Shield className="w-8 h-8 text-blue-400" />
            </div>
          </div>

          <div className="bg-bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between">
            <div>
                <p className="text-sm text-text-secondary">Critical Alerts</p>
                <p className="text-2xl font-bold text-red-400">
                  {metrics.summary.criticalAlerts}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
          </div>

          <div className="bg-bg-card border border-border rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                <p className="text-sm text-text-secondary">Blocked Attempts</p>
                <p className="text-2xl font-bold text-orange-400">
                  {metrics.summary.blockedAttempts}
                </p>
                    </div>
              <Shield className="w-8 h-8 text-orange-400" />
                    </div>
                  </div>

          <div className="bg-bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary">Successful Verifications</p>
                <p className="text-2xl font-bold text-green-400">
                  {metrics.summary.successfulVerifications.toLocaleString()}
                </p>
                </div>
              <Lock className="w-8 h-8 text-green-400" />
                  </div>
                </div>

          <div className="bg-bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary">Active Threats</p>
                <p className="text-2xl font-bold text-yellow-400">
                  {metrics.summary.activeThreats}
                </p>
              </div>
              <Eye className="w-8 h-8 text-yellow-400" />
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-6 bg-bg-card border border-border rounded-lg p-1">
          {[
            { id: 'overview', label: '🛡️ Overview', icon: Shield },
            { id: 'anticheat', label: '🎯 Anti-Cheat', icon: AlertTriangle },
            { id: '2fa', label: '🔐 2FA Stats', icon: Lock },
            { id: 'verification', label: '✅ Ed25519', icon: TrendingUp },
            { id: 'risks', label: '⚠️ Risk Analysis', icon: MapPin },
            ].map((tab) => (
              <button
                key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                selectedTab === tab.id
                  ? 'bg-accent-primary text-white'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                }`}
              >
                <tab.icon className="w-4 h-4" />
              <span className="text-sm font-medium">{tab.label}</span>
              </button>
            ))}
        </div>

        {/* Tab Content */}
        {selectedTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Verification Metrics */}
            <div className="bg-bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-audiowide text-text-primary mb-4">
                🔐 Verification Overview
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">Success Rate</span>
                  <span className="text-green-400 font-medium">
                    {metrics.verificationMetrics.successRate.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">Ed25519 Signatures</span>
                  <span className="text-text-primary font-medium">
                    {metrics.verificationMetrics.ed25519Signatures.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">Avg Verification Time</span>
                  <span className="text-text-primary font-medium">
                    {metrics.verificationMetrics.averageVerificationTime}ms
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">Failed Signatures</span>
                  <span className="text-red-400 font-medium">
                    {metrics.verificationMetrics.failedSignatures}
                  </span>
                </div>
              </div>
            </div>

            {/* 2FA Stats */}
            <div className="bg-bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-audiowide text-text-primary mb-4">
                🔐 2FA Adoption
              </h3>
                <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">Users with 2FA</span>
                  <span className="text-green-400 font-medium">
                    {metrics.twoFactorStats.totalEnabled.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">Adoption Rate</span>
                  <span className="text-green-400 font-medium">
                    {metrics.twoFactorStats.enabledPercentage.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">Daily Verifications</span>
                  <span className="text-text-primary font-medium">
                    {metrics.twoFactorStats.dailyVerifications}
                  </span>
                    </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">Failed Attempts</span>
                  <span className="text-red-400 font-medium">
                    {metrics.twoFactorStats.failedAttempts}
                      </span>
                    </div>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'anticheat' && (
          <div className="bg-bg-card border border-border rounded-lg">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-audiowide text-text-primary">
                🎯 Anti-Cheat Detections
              </h3>
              <p className="text-sm text-text-secondary mt-1">
                Real-time cheat detection and player behavior analysis
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-bg-elevated">
                  <tr>
                    <th className="text-left p-4 text-text-secondary font-medium">Player</th>
                    <th className="text-left p-4 text-text-secondary font-medium">Game</th>
                    <th className="text-left p-4 text-text-secondary font-medium">Detection</th>
                    <th className="text-left p-4 text-text-secondary font-medium">Severity</th>
                    <th className="text-left p-4 text-text-secondary font-medium">Confidence</th>
                    <th className="text-left p-4 text-text-secondary font-medium">Status</th>
                    <th className="text-left p-4 text-text-secondary font-medium">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.antiCheatDetections.map((detection) => (
                    <tr key={detection.id} className="border-t border-border hover:bg-bg-hover">
                      <td className="p-4">
                        <div>
                          <div className="font-medium text-text-primary">
                            {detection.playerWallet}
                          </div>
                          <div className="text-sm text-text-secondary">
                            {detection.userId.substring(0, 8)}...
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="capitalize text-text-primary">
                          {detection.gameType.replace('-', ' ')}
                        </span>
                      </td>
                      <td className="p-4">
                        <div>
                          <div className="font-medium text-text-primary">
                            {detection.detectionType.replace(/_/g, ' ')}
                          </div>
                          <div className="text-sm text-text-secondary">
                            {detection.flags.join(', ')}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getSeverityColor(detection.severity)}`}>
                          {getSeverityLabel(detection.severity)}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center">
                          <div className="w-16 bg-gray-700 rounded-full h-2 mr-2">
                            <div
                              className="bg-gradient-to-r from-red-500 to-green-500 h-2 rounded-full"
                              style={{ width: `${detection.confidence}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-text-primary">{detection.confidence}%</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(detection.status)}`}>
                          {detection.status}
                        </span>
                      </td>
                      <td className="p-4 text-text-secondary text-sm">
                        {new Date(detection.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selectedTab === 'verification' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-audiowide text-text-primary mb-4">
                ✅ Ed25519 Signature Verification
              </h3>
              <div className="space-y-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-400 mb-2">
                    {metrics.verificationMetrics.successRate.toFixed(1)}%
                  </div>
                  <div className="text-text-secondary">Success Rate</div>
                  </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">
                      {metrics.verificationMetrics.ed25519Signatures.toLocaleString()}
                    </div>
                    <div className="text-sm text-text-secondary">Valid Signatures</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-400">
                      {metrics.verificationMetrics.failedSignatures}
                    </div>
                    <div className="text-sm text-text-secondary">Failed Signatures</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-audiowide text-text-primary mb-4">
                🔍 Verification Details
              </h3>
              <div className="space-y-4">
                <div className="bg-bg-elevated border border-border rounded-lg p-4">
                  <h4 className="font-medium text-text-primary mb-2">Cryptographic Security</h4>
                  <ul className="space-y-2 text-sm text-text-secondary">
                    <li>✅ Ed25519 elliptic curve signatures</li>
                    <li>✅ 32-byte public key verification</li>
                    <li>✅ Timestamp-based message integrity</li>
                    <li>✅ Replay attack prevention</li>
                  </ul>
                  </div>

                <div className="bg-bg-elevated border border-border rounded-lg p-4">
                  <h4 className="font-medium text-text-primary mb-2">Performance Metrics</h4>
                  <div className="flex justify-between items-center">
                    <span className="text-text-secondary">Average Verification Time</span>
                    <span className="text-green-400 font-medium">
                      {metrics.verificationMetrics.averageVerificationTime}ms
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedTab === '2fa' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-audiowide text-text-primary mb-4">
                📊 Adoption Stats
              </h3>
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-400 mb-2">
                    {metrics.twoFactorStats.enabledPercentage.toFixed(1)}%
                  </div>
                  <div className="text-text-secondary">Users with 2FA</div>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-red-500 to-green-500 h-3 rounded-full"
                    style={{ width: `${metrics.twoFactorStats.enabledPercentage}%` }}
                  ></div>
                </div>
                <div className="text-center text-text-secondary text-sm">
                  {metrics.twoFactorStats.totalEnabled.toLocaleString()} users secured
                </div>
              </div>
            </div>

            <div className="bg-bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-audiowide text-text-primary mb-4">
                📈 Usage Analytics
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">Daily Verifications</span>
                  <span className="text-green-400 font-medium">
                    {metrics.twoFactorStats.dailyVerifications}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">Failed Attempts</span>
                  <span className="text-red-400 font-medium">
                    {metrics.twoFactorStats.failedAttempts}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">Backup Code Usage</span>
                  <span className="text-yellow-400 font-medium">
                    {metrics.twoFactorStats.backupCodeUsage}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-audiowide text-text-primary mb-4">
                🔒 Security Benefits
              </h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-sm text-text-secondary">Unlimited instant withdrawals</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span className="text-sm text-text-secondary">50% reduced withdrawal fees</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                  <span className="text-sm text-text-secondary">Enhanced account protection</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                  <span className="text-sm text-text-secondary">Priority customer support</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'risks' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-audiowide text-text-primary mb-4">
                ⚠️ Suspicious Patterns
              </h3>
              <div className="space-y-4">
                {metrics.riskAnalysis.suspiciousPatterns.map((pattern, index) => (
                  <div key={index} className="border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-text-primary">{pattern.type}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        pattern.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                        pattern.severity === 'HIGH' ? 'bg-orange-500/20 text-orange-400' :
                        pattern.severity === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        {pattern.severity}
                      </span>
                    </div>
                    <p className="text-sm text-text-secondary mb-2">{pattern.description}</p>
                    <div className="text-sm text-text-primary font-medium">
                      {pattern.count} detections
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-audiowide text-text-primary mb-4">
                🌍 Geographic Risk Analysis
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-text-secondary">High-Risk Users</span>
                  <span className="text-red-400 font-medium">
                    {metrics.riskAnalysis.highRiskUsers}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-text-secondary">IP Blocks Active</span>
                  <span className="text-orange-400 font-medium">
                    {metrics.riskAnalysis.ipBlocks}
                  </span>
              </div>

                <div className="space-y-3">
                  <h4 className="font-medium text-text-primary">Risk by Region</h4>
                  {metrics.riskAnalysis.geographicRisks.map((risk, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <MapPin className="w-4 h-4 text-text-secondary" />
                        <span className="text-text-primary">{risk.country}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-1">
                          <div className="w-16 bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-green-500 to-red-500 h-2 rounded-full"
                              style={{ width: `${(risk.riskLevel / 10) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-text-secondary">{risk.riskLevel}/10</span>
                        </div>
                        <span className="text-sm text-text-secondary">
                          ({risk.detections} detections)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            </div>
          )}
      </div>
    </div>
  );
} 