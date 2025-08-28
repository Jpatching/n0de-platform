'use client';

import AppLayout from '@/components/layouts/AppLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { motion } from 'framer-motion';
import { 
  Users, 
  Plus, 
  Mail, 
  Crown,
  Shield,
  Edit3,
  Trash2,
  MoreVertical
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
  const teamMembers: TeamMember[] = [
    {
      id: '1',
      name: 'John Doe',
      email: 'john@company.com',
      role: 'owner',
      lastActive: 'Active now',
      status: 'active'
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane@company.com',
      role: 'admin',
      lastActive: '2 hours ago',
      status: 'active'
    },
    {
      id: '3',
      name: 'Mike Johnson',
      email: 'mike@company.com',
      role: 'developer',
      lastActive: '1 day ago',
      status: 'active'
    },
    {
      id: '4',
      name: 'Sarah Wilson',
      email: 'sarah@company.com',
      role: 'viewer',
      lastActive: 'Never',
      status: 'pending'
    }
  ];

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

  return (
    <ProtectedRoute>
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
                  <p className="text-lg font-semibold text-white">4</p>
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
                  <p className="text-lg font-semibold text-white">3</p>
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
                  <p className="text-lg font-semibold text-white">1</p>
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
                  <p className="text-lg font-semibold text-white">2</p>
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
                  {teamMembers.map((member, index) => (
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
    </ProtectedRoute>
  );
};

export default TeamPage;