'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { 
  Database, 
  BarChart3, 
  Settings, 
  HardDrive,
  Activity,
  Clock,
  Users,
  TrendingUp
} from 'lucide-react';
import { adminApi } from '@/services/api';

export default function DatabasePage() {
  const [databaseStats, setDatabaseStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDatabaseStats();
  }, []);

  const fetchDatabaseStats = async () => {
    try {
      const response = await adminApi.getDatabaseStats();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setDatabaseStats(response.data as any);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching database stats:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-3xl font-bold text-blue-400">Database Admin</h1>
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
          <h1 className="text-3xl font-bold text-blue-400">Database Admin</h1>
          <p className="text-text-muted mt-1">Database management and performance monitoring</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 admin-card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">Total Tables</p>
              <p className="text-2xl font-bold text-blue-400">{databaseStats?.totalTables || 0}</p>
            </div>
            <Database className="w-8 h-8 text-blue-400" />
          </div>
        </Card>

        <Card className="p-6 admin-card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">Total Records</p>
              <p className="text-2xl font-bold text-green-400">{databaseStats?.totalRecords || 0}</p>
            </div>
            <BarChart3 className="w-8 h-8 text-green-400" />
          </div>
        </Card>

        <Card className="p-6 admin-card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">Storage Used</p>
              <p className="text-2xl font-bold text-yellow-400">{databaseStats?.storageUsed || '0GB'}</p>
            </div>
            <HardDrive className="w-8 h-8 text-yellow-400" />
          </div>
        </Card>

        <Card className="p-6 admin-card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">Query Performance</p>
              <p className="text-2xl font-bold text-purple-400">{databaseStats?.queryPerformance || 'Unknown'}</p>
            </div>
            <Activity className="w-8 h-8 text-purple-400" />
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Database Operations</h2>
          <Settings className="w-5 h-5 text-text-muted" />
        </div>

        {databaseStats?.tables?.length > 0 ? (
          <div className="space-y-3">
            {databaseStats.tables.slice(0, 5).map((table: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Database className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-white font-medium">{table.name || 'Table'}</p>
                    <div className="flex items-center space-x-2 text-sm text-text-muted">
                      <BarChart3 className="w-4 h-4" />
                      <span>{table.records || 0} records</span>
                      <Clock className="w-4 h-4 ml-2" />
                      <span>Updated {table.lastUpdate || 'recently'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                    <span className="text-text-muted text-sm">{table.size || '0MB'}</span>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    table.status === 'healthy' ? 'bg-green-500' : 
                    table.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}>
                    {table.status || 'unknown'}
                  </span>
                </div>
              </div>
            ))}
            
            {/* Database Admin Tools */}
            <div className="mt-6 p-4 bg-gray-800 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Database Tools
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded flex items-center justify-center">
                  <Database className="w-4 h-4 mr-2" />
                  Backup DB
                </button>
                <button className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded flex items-center justify-center">
                  <Activity className="w-4 h-4 mr-2" />
                  Optimize
                </button>
                <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded flex items-center justify-center">
                  <Users className="w-4 h-4 mr-2" />
                  User Cleanup
                </button>
                <button className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded flex items-center justify-center">
                  <HardDrive className="w-4 h-4 mr-2" />
                  Storage Cleanup
                </button>
                <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Generate Report
                </button>
                <button className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded flex items-center justify-center">
                  <Settings className="w-4 h-4 mr-2" />
                  Maintenance
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <Database className="w-16 h-16 text-text-muted mx-auto mb-4" />
            <p className="text-text-muted text-lg">Database management ready</p>
            <p className="text-text-muted text-sm mt-2">Operations dashboard</p>
          </div>
        )}
      </Card>
    </div>
  );
} 