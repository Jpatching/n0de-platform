'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { 
  Globe, 
  ArrowLeftRight, 
  DollarSign, 
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Activity,
  RefreshCw,
  Eye
} from 'lucide-react';
import { adminApi } from '@/services/api';
import Layout from '@/components/admin/Layout';

interface BridgeTransaction {
  id: string;
  fromChain: string;
  toChain: string;
  amount: number;
  status: string;
  timestamp: string;
  hash: string;
}

interface BridgeStats {
  totalTransactions: number;
  successRate: number;
  pendingTransactions: number;
  failedTransactions: number;
  volume24h: number;
  transactions?: BridgeTransaction[];
}

export default function BridgePage() {
  const [transactions, setTransactions] = useState<BridgeTransaction[]>([]);
  const [bridgeStats, setBridgeStats] = useState<BridgeStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBridgeData();
  }, []);

  const fetchBridgeData = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getBridgeStats();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setBridgeStats(response.data as any);
    } catch (error) {
      console.error('Error fetching bridge data:', error);
      setBridgeStats({ totalTransactions: 0, successRate: 0, pendingTransactions: 0, failedTransactions: 0, volume24h: 0, transactions: [] });
    } finally {
      setLoading(false);
    }
  };

  const retryTransaction = async (transactionId: string) => {
    try {
      await adminApi.retryFailedBridge(transactionId);
      fetchBridgeData();
    } catch (error) {
      console.error('Error retrying transaction:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'text-green-400';
      case 'pending': return 'text-yellow-400';
      case 'failed': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'failed': return <AlertTriangle className="w-4 h-4 text-red-400" />;
      default: return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-blue-400">Bridge Monitoring</h1>
              <p className="text-text-muted mt-1">Cross-chain bridge transactions</p>
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
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-blue-400">Bridge Monitoring</h1>
            <p className="text-text-muted mt-1">Cross-chain bridge transactions</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
            <span className="text-sm text-text-muted">Live bridge data</span>
          </div>
        </div>

        {/* Bridge Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 admin-card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">Total Transactions</p>
                <p className="text-2xl font-bold text-blue-400">{bridgeStats?.totalTransactions.toLocaleString() || '0'}</p>
              </div>
              <ArrowLeftRight className="w-8 h-8 text-blue-400" />
            </div>
          </Card>

          <Card className="p-6 admin-card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">Pending</p>
                <p className="text-2xl font-bold text-yellow-400">{bridgeStats?.pendingTransactions || '0'}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-400" />
            </div>
          </Card>

          <Card className="p-6 admin-card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">Success Rate</p>
                <p className="text-2xl font-bold text-green-400">{bridgeStats?.successRate.toFixed(1) || '0'}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-400" />
            </div>
          </Card>

          <Card className="p-6 admin-card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">Total Volume</p>
                <p className="text-2xl font-bold text-purple-400">${bridgeStats?.volume24h.toLocaleString() || '0'}</p>
              </div>
              <DollarSign className="w-8 h-8 text-purple-400" />
            </div>
          </Card>
        </div>

        {/* Bridge Transactions */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Bridge Transactions</h2>
            <div className="flex items-center space-x-2">
              <Globe className="w-5 h-5 text-text-muted" />
              <span className="text-sm text-text-muted">Cross-chain transfers</span>
            </div>
          </div>

          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <ArrowLeftRight className="w-16 h-16 text-text-muted mx-auto mb-4" />
              <p className="text-text-muted text-lg">No bridge transactions</p>
              <p className="text-text-muted text-sm mt-2">Cross-chain transfers will appear here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-3 px-4 text-text-muted font-medium">Transaction</th>
                    <th className="text-left py-3 px-4 text-text-muted font-medium">Route</th>
                    <th className="text-left py-3 px-4 text-text-muted font-medium">Amount</th>
                    <th className="text-left py-3 px-4 text-text-muted font-medium">Status</th>
                    <th className="text-left py-3 px-4 text-text-muted font-medium">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                      <td className="py-3 px-4 font-mono text-sm text-text-primary">
                        {tx.hash?.substring(0, 8)}...
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-text-primary capitalize">{tx.fromChain}</span>
                          <ArrowLeftRight className="w-4 h-4 text-text-muted" />
                          <span className="text-text-primary capitalize">{tx.toChain}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-text-primary font-medium">
                        ${tx.amount?.toLocaleString() || '0'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(tx.status)}
                          <span className={`capitalize ${getStatusColor(tx.status)}`}>
                            {tx.status}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-text-primary">
                        {tx.timestamp ? new Date(tx.timestamp).toLocaleTimeString() : 'N/A'}
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