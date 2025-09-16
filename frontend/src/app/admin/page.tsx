'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  CreditCard, 
  LifeBuoy, 
  Activity, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  Server,
  Shield
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { toast } from 'sonner';

interface DashboardStats {
  users: {
    total: number;
    active: number;
    growth: number;
  };
  payments: {
    total: number;
    monthlyRevenue: number;
    growth: number;
  };
  support: {
    openTickets: number;
    responseTime: number;
  };
  usage: {
    totalApiKeys: number;
    activeSubscriptions: number;
    requestsToday: number;
  };
}

export default function AdminDashboard() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      router.push('/dashboard');
      return;
    }

    if (user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN')) {
      fetchDashboardStats();
    }
  }, [user, isLoading, router]);

  const fetchDashboardStats = useCallback(async () => {
    try {
      const data = await api.get('/admin/dashboard') as DashboardStats;
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('403') || errorMessage.includes('Access denied')) {
        toast.error('Access denied. Admin privileges required.');
        router.push('/dashboard');
      } else {
        setError('Failed to load dashboard data');
        toast.error('Failed to load dashboard data');
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-bg-main flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-n0de-green mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen bg-bg-main flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-text-secondary">{error || 'Failed to load dashboard'}</p>
          <button 
            onClick={fetchDashboardStats}
            className="btn-primary mt-4"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-main">
      {/* Header */}
      <div className="bg-bg-elevated border-b border-border">
        <div className="container-width">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Admin Dashboard</h1>
                <p className="text-xs text-text-secondary">System management and monitoring</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="font-medium">{user?.firstName || user?.username || 'Admin'}</div>
                <div className="text-xs text-text-secondary">
                  {user?.role === 'ADMIN' ? 'Admin' : 'Enterprise'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-bg-elevated border-b border-border">
        <div className="container-width">
          <div className="flex items-center space-x-8 h-12">
            <button className="text-n0de-green border-b-2 border-n0de-green pb-2 text-sm font-medium">
              Dashboard
            </button>
            <button 
              onClick={() => router.push('/admin/users')}
              className="text-text-secondary hover:text-text-primary pb-2 text-sm font-medium"
            >
              Users
            </button>
            <button 
              onClick={() => router.push('/admin/payments')}
              className="text-text-secondary hover:text-text-primary pb-2 text-sm font-medium"
            >
              Payments
            </button>
            <button 
              onClick={() => router.push('/admin/support')}
              className="text-text-secondary hover:text-text-primary pb-2 text-sm font-medium"
            >
              Support
            </button>
            <button 
              onClick={() => router.push('/admin/system')}
              className="text-text-secondary hover:text-text-primary pb-2 text-sm font-medium"
            >
              System
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container-width py-8">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Users */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-text-secondary">Total Users</h3>
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-3xl font-bold mb-2">{stats.users.total.toLocaleString()}</div>
            <div className="flex items-center space-x-2 text-sm">
              <span className="text-text-muted">Active:</span>
              <span className="font-medium">{stats.users.active.toLocaleString()}</span>
              {stats.users.growth !== 0 && (
                <div className={`flex items-center space-x-1 ${stats.users.growth > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  <TrendingUp className="w-3 h-3" />
                  <span>{stats.users.growth > 0 ? '+' : ''}{stats.users.growth.toFixed(1)}%</span>
                </div>
              )}
            </div>
          </div>

          {/* Monthly Revenue */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-text-secondary">Monthly Revenue</h3>
              <DollarSign className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-3xl font-bold mb-2">${stats.payments.monthlyRevenue.toLocaleString()}</div>
            <div className="flex items-center space-x-2 text-sm">
              <span className="text-text-muted">Payments:</span>
              <span className="font-medium">{stats.payments.total.toLocaleString()}</span>
              {stats.payments.growth !== 0 && (
                <div className={`flex items-center space-x-1 ${stats.payments.growth > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  <TrendingUp className="w-3 h-3" />
                  <span>{stats.payments.growth > 0 ? '+' : ''}{stats.payments.growth.toFixed(1)}%</span>
                </div>
              )}
            </div>
          </div>

          {/* Support Tickets */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-text-secondary">Open Tickets</h3>
              <LifeBuoy className="w-5 h-5 text-orange-500" />
            </div>
            <div className="text-3xl font-bold mb-2">{stats.support.openTickets}</div>
            <div className="flex items-center space-x-2 text-sm">
              <Clock className="w-3 h-3 text-text-muted" />
              <span className="text-text-muted">Avg response:</span>
              <span className="font-medium">{stats.support.responseTime.toFixed(1)}h</span>
            </div>
          </div>

          {/* API Usage */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-text-secondary">API Usage</h3>
              <Activity className="w-5 h-5 text-purple-500" />
            </div>
            <div className="text-3xl font-bold mb-2">{stats.usage.requestsToday.toLocaleString()}</div>
            <div className="flex items-center space-x-2 text-sm">
              <span className="text-text-muted">Today&apos;s requests</span>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Subscription Overview */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Subscriptions</h3>
              <CreditCard className="w-5 h-5 text-text-muted" />
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Active Subscriptions</span>
                <span className="font-semibold">{stats.usage.activeSubscriptions}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Total API Keys</span>
                <span className="font-semibold">{stats.usage.totalApiKeys}</span>
              </div>
            </div>
          </div>

          {/* System Status */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">System Status</h3>
              <Server className="w-5 h-5 text-text-muted" />
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">System Health</span>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="font-semibold text-green-500">Healthy</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Uptime</span>
                <span className="font-semibold">99.9%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-6">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button 
              onClick={() => router.push('/admin/users')}
              className="btn-secondary text-left p-4"
            >
              <Users className="w-5 h-5 mb-2" />
              <div className="font-medium">Manage Users</div>
              <div className="text-sm text-text-secondary">View and edit user accounts</div>
            </button>
            
            <button 
              onClick={() => router.push('/admin/payments')}
              className="btn-secondary text-left p-4"
            >
              <CreditCard className="w-5 h-5 mb-2" />
              <div className="font-medium">View Payments</div>
              <div className="text-sm text-text-secondary">Monitor transactions</div>
            </button>
            
            <button 
              onClick={() => router.push('/admin/support')}
              className="btn-secondary text-left p-4"
            >
              <LifeBuoy className="w-5 h-5 mb-2" />
              <div className="font-medium">Support Tickets</div>
              <div className="text-sm text-text-secondary">Handle customer support</div>
            </button>
            
            <button 
              onClick={() => router.push('/admin/system')}
              className="btn-secondary text-left p-4"
            >
              <Activity className="w-5 h-5 mb-2" />
              <div className="font-medium">System Health</div>
              <div className="text-sm text-text-secondary">Monitor system status</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}