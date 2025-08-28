'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { 
  Lock, 
  DollarSign, 
  Users, 
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Shield,
  Key,
  Wallet,
  XCircle,
  RefreshCw,
  Eye
} from 'lucide-react';
import { adminApi } from '@/services/api';
import Layout from '@/components/admin/Layout';

interface SessionVault {
  id: string;
  userWallet: string;
  balance: number;
  status: 'active' | 'locked' | 'emergency';
  lastActivity: string;
  gamesPlayed: number;
  totalDeposited: number;
  totalWithdrawn: number;
  createdAt: string;
}

interface VaultStats {
  totalVaults: number;
  activeVaults: number;
  lockedVaults: number;
  totalBalance: number;
  emergencyVaults: number;
}

export default function SessionVaultsPage() {
  const [vaults, setVaults] = useState<SessionVault[]>([]);
  const [stats, setStats] = useState<VaultStats>({
    totalVaults: 0,
    activeVaults: 0,
    lockedVaults: 0,
    totalBalance: 0,
    emergencyVaults: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedVault, setSelectedVault] = useState<SessionVault | null>(null);

  useEffect(() => {
    fetchVaults();
    fetchStats();
  }, []);

  const fetchVaults = async () => {
    try {
      const response = await adminApi.getSessionVaults();
      setVaults((response.data as any)?.items || (response.data as any) || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching vaults:', error);
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await adminApi.getSystemStats();
      const data = response.data || {};
      setStats({
        totalVaults: (data as any).totalVaults || 0,
        activeVaults: (data as any).activeVaults || 0,
        lockedVaults: (data as any).lockedVaults || 0,
        totalBalance: (data as any).totalVaultBalance || 0,
        emergencyVaults: (data as any).emergencyVaults || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400';
      case 'locked': return 'text-yellow-400';
      case 'emergency': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'locked': return <Lock className="w-4 h-4 text-yellow-400" />;
      case 'emergency': return <AlertTriangle className="w-4 h-4 text-red-400" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const handleRecoverVault = async (vaultId: string) => {
    try {
      await adminApi.recoverVault(vaultId, 'Admin recovery');
      fetchVaults();
    } catch (error) {
      console.error('Error recovering vault:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-yellow-400">Session Vaults</h1>
            <p className="text-text-muted mt-1">Manage user session vaults and escrow accounts</p>
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
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-yellow-400">Session Vaults</h1>
            <p className="text-text-muted mt-1">Manage user session vaults and escrow accounts</p>
          </div>
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-text-muted" />
            <span className="text-sm text-text-muted">Secure escrow system</span>
          </div>
        </div>

        {/* Vault Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card className="p-6 admin-card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">Total Vaults</p>
                <p className="text-2xl font-bold text-blue-400">{stats.totalVaults.toLocaleString()}</p>
              </div>
              <Lock className="w-8 h-8 text-blue-400" />
            </div>
          </Card>

          <Card className="p-6 admin-card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">Active Vaults</p>
                <p className="text-2xl font-bold text-green-400">{stats.activeVaults.toLocaleString()}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </Card>

          <Card className="p-6 admin-card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">Locked Vaults</p>
                <p className="text-2xl font-bold text-yellow-400">{stats.lockedVaults}</p>
              </div>
              <Lock className="w-8 h-8 text-yellow-400" />
            </div>
          </Card>

          <Card className="p-6 admin-card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">Emergency</p>
                <p className="text-2xl font-bold text-red-400">{stats.emergencyVaults}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
          </Card>

          <Card className="p-6 admin-card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">Total Balance</p>
                <p className="text-2xl font-bold text-purple-400">${stats.totalBalance.toLocaleString()}</p>
              </div>
              <DollarSign className="w-8 h-8 text-purple-400" />
            </div>
          </Card>
        </div>

        {/* Vaults Table */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Session Vaults</h2>
            <div className="flex items-center space-x-2">
              <Key className="w-5 h-5 text-text-muted" />
              <span className="text-sm text-text-muted">Real-time vault data</span>
            </div>
          </div>

          {vaults.length === 0 ? (
            <div className="text-center py-12">
              <Lock className="w-16 h-16 text-text-muted mx-auto mb-4" />
              <p className="text-text-muted text-lg">No session vaults found</p>
              <p className="text-text-muted text-sm mt-2">Vaults will appear as users make deposits</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-3 px-4 text-text-muted font-medium">User</th>
                    <th className="text-left py-3 px-4 text-text-muted font-medium">Status</th>
                    <th className="text-left py-3 px-4 text-text-muted font-medium">Balance</th>
                    <th className="text-left py-3 px-4 text-text-muted font-medium">Games Played</th>
                    <th className="text-left py-3 px-4 text-text-muted font-medium">Total Deposited</th>
                    <th className="text-left py-3 px-4 text-text-muted font-medium">Last Activity</th>
                    <th className="text-left py-3 px-4 text-text-muted font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vaults.map((vault) => (
                    <tr key={vault.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                      <td className="py-3 px-4 font-mono text-sm text-text-primary">
                        {vault.userWallet?.substring(0, 8)}...
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(vault.status)}
                          <span className={`capitalize ${getStatusColor(vault.status)}`}>
                            {vault.status}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-text-primary font-medium">
                        ${vault.balance?.toLocaleString() || '0'}
                      </td>
                      <td className="py-3 px-4 text-text-primary">
                        {vault.gamesPlayed || 0}
                      </td>
                      <td className="py-3 px-4 text-text-primary">
                        ${vault.totalDeposited?.toLocaleString() || '0'}
                      </td>
                      <td className="py-3 px-4 text-text-primary">
                        {vault.lastActivity ? new Date(vault.lastActivity).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setSelectedVault(vault)}
                            className="text-blue-400 hover:text-blue-300 text-sm"
                          >
                            View
                          </button>
                          {vault.status === 'locked' && (
                            <button
                              onClick={() => handleRecoverVault(vault.id)}
                              className="text-green-400 hover:text-green-300 text-sm"
                            >
                              Recover
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
} 