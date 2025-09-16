'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layouts/AppLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import ErrorBoundary, { ApiErrorBoundary } from '@/components/ErrorBoundary';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { 
  Users, 
  Plus, 
  Mail, 
  Crown,
  Shield,
  Edit3,
  Trash2,
  MoreVertical,
  Lock,
  Zap
} from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'developer' | 'viewer';
  avatar?: string;
  lastActive: string;
  status: 'active' | 'pending' | 'inactive';
}

const TeamPage = () => {
  const { user } = useAuth();
  const [userSubscription, setUserSubscription] = useState<any>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Check user subscription and fetch team data on component mount
  useEffect(() => {
    if (user) {
      // Check if user has enterprise plan
      const subscription = user.subscription;
      setUserSubscription(subscription);
      
      // Fetch team members from backend API
      fetchTeamMembers();
    }
  }, [user]);
  
  const fetchTeamMembers = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setIsLoading(false);
        return;
      }
      
      const response = await fetch('/api/v1/users/team', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTeamMembers(data);
      } else {
        console.error('Failed to fetch team members:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching team members:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const isEnterpriseUser = userSubscription?.planType === 'ENTERPRISE';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  
  // Team members are now fetched from the backend API

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'admin':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'developer':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'viewer':
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
      default:
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-4 w-4" />;
      case 'admin':
        return <Shield className="h-4 w-4" />;
      default:
        return null;
    }
  };

  // Show upgrade prompt for non-enterprise users
  if (!isLoading && !isEnterpriseUser && !isSuperAdmin) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="min-h-full bg-black p-6">
            <div className="max-w-2xl mx-auto text-center py-16">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-12"
              >
                <div className="w-16 h-16 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Lock className="h-8 w-8 text-black" />
                </div>
                
                <h1 className="text-3xl font-bold text-white mb-4">
                  Team Management
                </h1>
                
                <p className="text-zinc-400 text-lg mb-8">
                  Team management is available exclusively for Enterprise customers. 
                  Upgrade your plan to invite team members and manage permissions.
                </p>
                
                <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-6 mb-8">
                  <h3 className="text-white font-semibold mb-3">Enterprise Features Include:</h3>
                  <ul className="text-zinc-300 text-sm space-y-2">
                    <li className="flex items-center">
                      <Users className="h-4 w-4 text-green-400 mr-3" />
                      Unlimited team members
                    </li>
                    <li className="flex items-center">
                      <Shield className="h-4 w-4 text-green-400 mr-3" />
                      Role-based access control
                    </li>
                    <li className="flex items-center">
                      <Crown className="h-4 w-4 text-green-400 mr-3" />
                      Admin permissions management
                    </li>
                  </ul>
                </div>
                
                <button 
                  onClick={() => window.location.href = '/payment?plan=ENTERPRISE'}
                  className="bg-gradient-to-r from-yellow-500 to-orange-500 text-black px-8 py-3 rounded-xl font-semibold hover:from-yellow-600 hover:to-orange-600 transition-all duration-200 flex items-center mx-auto"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Upgrade to Enterprise
                </button>
              </motion.div>
            </div>
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <ErrorBoundary>
        <ApiErrorBoundary>
          <AppLayout>
        <div className="min-h-full bg-black p-6">
          <div className="mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between"
            >
              <div>
                <h1 className="text-2xl font-bold text-white mb-2">Team</h1>
                <p className="text-zinc-400">
                  Manage your team members and their permissions.
                </p>
              </div>
              <button className="flex items-center space-x-2 px-4 py-2 bg-cyan-500 text-black rounded-lg hover:bg-cyan-400 transition-colors font-medium">
                <Plus className="h-4 w-4" />
                <span>Invite Member</span>
              </button>
            </motion.div>
          </div>

          {/* Team Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-4"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-cyan-500/10 rounded-lg">
                  <Users className="h-5 w-5 text-cyan-400" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-white">{teamMembers.length}</p>
                  <p className="text-sm text-zinc-400">Total Members</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-4"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Shield className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-white">{teamMembers.filter(m => m.status === 'active').length}</p>
                  <p className="text-sm text-zinc-400">Active Members</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-4"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-yellow-500/10 rounded-lg">
                  <Mail className="h-5 w-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-white">{teamMembers.filter(m => m.status === 'pending').length}</p>
                  <p className="text-sm text-zinc-400">Pending Invites</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-4"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <Crown className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-white">{teamMembers.filter(m => m.role === 'owner' || m.role === 'admin').length}</p>
                  <p className="text-sm text-zinc-400">Admins</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Team Members List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-zinc-950/50 border border-zinc-800 rounded-lg overflow-hidden"
          >
            <div className="p-6 border-b border-zinc-800">
              <h3 className="text-lg font-semibold text-white">Team Members</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-zinc-900/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      Member
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      Last Active
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center">
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-400"></div>
                          <span className="ml-3 text-zinc-400">Loading team members...</span>
                        </div>
                      </td>
                    </tr>
                  ) : teamMembers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center">
                        <div className="text-zinc-400">
                          <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No team members found</p>
                          <p className="text-sm mt-1">Invite team members to get started</p>
                        </div>
                      </td>
                    </tr>
                  ) : teamMembers.map((member, index) => (
                    <motion.tr
                      key={member.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 + index * 0.1 }}
                      className="hover:bg-zinc-800/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-black font-semibold text-sm">
                              {member.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{member.name}</p>
                            <p className="text-sm text-zinc-400">{member.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          {getRoleIcon(member.role)}
                          <span className={`px-2 py-1 text-xs font-medium rounded border ${getRoleColor(member.role)}`}>
                            {member.role}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded border ${
                          member.status === 'active' 
                            ? 'bg-green-500/10 text-green-400 border-green-500/20'
                            : member.status === 'pending'
                              ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                              : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                        }`}>
                          {member.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-zinc-300">{member.lastActive}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <button className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded transition-colors">
                            <Edit3 className="h-4 w-4" />
                          </button>
                          {member.role !== 'owner' && (
                            <button className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                          <button className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded transition-colors">
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Roles & Permissions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-6 bg-zinc-950/50 border border-zinc-800 rounded-lg p-6"
          >
            <h3 className="text-lg font-semibold text-white mb-4">Roles & Permissions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-zinc-800/30 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Crown className="h-4 w-4 text-yellow-400" />
                  <h4 className="text-sm font-medium text-white">Owner</h4>
                </div>
                <p className="text-xs text-zinc-400">Full access to all features and settings</p>
              </div>
              
              <div className="p-4 bg-zinc-800/30 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Shield className="h-4 w-4 text-red-400" />
                  <h4 className="text-sm font-medium text-white">Admin</h4>
                </div>
                <p className="text-xs text-zinc-400">Manage team members and API keys</p>
              </div>
              
              <div className="p-4 bg-zinc-800/30 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Users className="h-4 w-4 text-blue-400" />
                  <h4 className="text-sm font-medium text-white">Developer</h4>
                </div>
                <p className="text-xs text-zinc-400">Create API keys and access analytics</p>
              </div>
              
              <div className="p-4 bg-zinc-800/30 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Users className="h-4 w-4 text-zinc-400" />
                  <h4 className="text-sm font-medium text-white">Viewer</h4>
                </div>
                <p className="text-xs text-zinc-400">View-only access to analytics</p>
              </div>
            </div>
          </motion.div>
        </div>
          </AppLayout>
        </ApiErrorBoundary>
      </ErrorBoundary>
    </ProtectedRoute>
  );
};

export default TeamPage;