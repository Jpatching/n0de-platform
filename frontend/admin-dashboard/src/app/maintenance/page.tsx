'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { 
  Wrench, 
  Calendar, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  Settings,
  PlayCircle,
  PauseCircle
} from 'lucide-react';
import { adminApi } from '@/services/api';

export default function MaintenancePage() {
  const [maintenanceData, setMaintenanceData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMaintenanceData();
  }, []);

  const fetchMaintenanceData = async () => {
    try {
      const response = await adminApi.getMaintenanceStatus();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setMaintenanceData(response.data as any);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching maintenance data:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-3xl font-bold text-amber-400">Maintenance</h1>
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
          <h1 className="text-3xl font-bold text-amber-400">Maintenance</h1>
          <p className="text-text-muted mt-1">System maintenance and scheduled tasks</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 admin-card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">Maintenance Status</p>
              <p className="text-2xl font-bold text-green-400">{maintenanceData?.status || 'Unknown'}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </Card>

        <Card className="p-6 admin-card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">Scheduled Tasks</p>
              <p className="text-2xl font-bold text-blue-400">{maintenanceData?.scheduledTasks || 0}</p>
            </div>
            <Calendar className="w-8 h-8 text-blue-400" />
          </div>
        </Card>

        <Card className="p-6 admin-card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">Last Backup</p>
              <p className="text-2xl font-bold text-purple-400">{maintenanceData?.lastBackup || 'Unknown'}</p>
            </div>
            <Clock className="w-8 h-8 text-purple-400" />
          </div>
        </Card>

        <Card className="p-6 admin-card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">System Health</p>
              <p className="text-2xl font-bold text-green-400">{maintenanceData?.systemHealth || 'Unknown'}</p>
            </div>
            <Wrench className="w-8 h-8 text-green-400" />
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Maintenance Schedule</h2>
          <Settings className="w-5 h-5 text-text-muted" />
        </div>

        {maintenanceData?.tasks?.length > 0 ? (
          <div className="space-y-3">
            {maintenanceData.tasks.slice(0, 5).map((task: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Wrench className="w-5 h-5 text-amber-400" />
                  <div>
                    <p className="text-white font-medium">{task.name || 'Maintenance Task'}</p>
                    <p className="text-text-muted text-sm">{task.description || 'Task description'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-text-muted text-sm">{task.schedule || 'No schedule'}</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    task.status === 'completed' ? 'bg-green-500' : 
                    task.status === 'running' ? 'bg-blue-500' : 'bg-gray-500'
                  }`}>
                    {task.status || 'pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Wrench className="w-16 h-16 text-text-muted mx-auto mb-4" />
            <p className="text-text-muted text-lg">No scheduled maintenance</p>
            <p className="text-text-muted text-sm mt-2">System running normally</p>
          </div>
        )}
      </Card>
    </div>
  );
} 