'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/layouts/AppLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { motion } from 'framer-motion';
import { 
  User,
  Shield,
  Bell,
  CreditCard,
  Webhook,
  Key,
  Save,
  Camera,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';

interface SettingsTab {
  id: string;
  name: string;
  icon: any;
}

const settingsTabs: SettingsTab[] = [
  { id: 'profile', name: 'Profile', icon: User },
  { id: 'security', name: 'Security', icon: Shield },
  { id: 'notifications', name: 'Notifications', icon: Bell },
  { id: 'billing', name: 'Billing', icon: CreditCard },
  { id: 'webhooks', name: 'Webhooks', icon: Webhook },
  { id: 'api', name: 'API Settings', icon: Key }
];

const SettingsPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    username: user?.username || '',
    company: '',
    website: '',
    location: '',
    phone: '',
    bio: ''
  });
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    smsAlerts: false,
    webhookAlerts: true,
    maintenanceAlerts: true,
    usageAlerts: true,
    securityAlerts: true
  });
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setUnsavedChanges(true);
  };

  const handleNotificationChange = (field: string, value: boolean) => {
    setNotifications(prev => ({ ...prev, [field]: value }));
    setUnsavedChanges(true);
  };

  const handleSave = () => {
    // Save changes logic here
    setUnsavedChanges(false);
  };

  const renderProfileTab = () => (
    <div className="space-y-6">
      {/* Avatar Section */}
      <div className="flex items-center space-x-6">
        <div className="relative">
          <div className="w-20 h-20 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center">
            <span className="text-black font-bold text-2xl">
              {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
            </span>
          </div>
          <button className="absolute -bottom-2 -right-2 w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center hover:bg-cyan-400 transition-colors">
            <Camera className="h-4 w-4 text-black" />
          </button>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Profile Picture</h3>
          <p className="text-sm text-zinc-400">Update your avatar to personalize your account</p>
        </div>
      </div>

      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">First Name</label>
          <input
            type="text"
            value={formData.firstName}
            onChange={(e) => handleInputChange('firstName', e.target.value)}
            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            placeholder="Enter your first name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">Last Name</label>
          <input
            type="text"
            value={formData.lastName}
            onChange={(e) => handleInputChange('lastName', e.target.value)}
            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            placeholder="Enter your last name"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">Email Address</label>
          <div className="relative">
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              placeholder="Enter your email"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <CheckCircle className="h-4 w-4 text-green-400" />
            </div>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">Username</label>
          <input
            type="text"
            value={formData.username}
            onChange={(e) => handleInputChange('username', e.target.value)}
            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            placeholder="Choose a username"
          />
        </div>
      </div>

      {/* Company Information */}
      <div className="border-t border-zinc-800 pt-6">
        <h4 className="text-lg font-medium text-white mb-4">Company Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Company</label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) => handleInputChange('company', e.target.value)}
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              placeholder="Your company name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Website</label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) => handleInputChange('website', e.target.value)}
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              placeholder="https://example.com"
            />
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="border-t border-zinc-800 pt-6">
        <h4 className="text-lg font-medium text-white mb-4">Contact Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Phone Number</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              placeholder="+1 (555) 000-0000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Location</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              placeholder="City, Country"
            />
          </div>
        </div>
      </div>

      {/* Bio */}
      <div className="border-t border-zinc-800 pt-6">
        <label className="block text-sm font-medium text-zinc-300 mb-2">Bio</label>
        <textarea
          value={formData.bio}
          onChange={(e) => handleInputChange('bio', e.target.value)}
          rows={4}
          className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
          placeholder="Tell us about yourself..."
        />
      </div>
    </div>
  );

  const renderNotificationsTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-2">Notification Preferences</h3>
        <p className="text-sm text-zinc-400">Choose how you want to be notified about your account activity.</p>
      </div>

      <div className="space-y-4">
        {[
          { key: 'emailAlerts', label: 'Email Alerts', description: 'Receive important updates via email' },
          { key: 'smsAlerts', label: 'SMS Alerts', description: 'Get critical alerts via text message' },
          { key: 'webhookAlerts', label: 'Webhook Notifications', description: 'Receive alerts via configured webhooks' },
          { key: 'maintenanceAlerts', label: 'Maintenance Notifications', description: 'Get notified about scheduled maintenance' },
          { key: 'usageAlerts', label: 'Usage Alerts', description: 'Alerts when approaching limits' },
          { key: 'securityAlerts', label: 'Security Alerts', description: 'Important security-related notifications' }
        ].map((item) => (
          <div key={item.key} className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-lg">
            <div>
              <p className="text-sm font-medium text-white">{item.label}</p>
              <p className="text-xs text-zinc-400">{item.description}</p>
            </div>
            <button
              onClick={() => handleNotificationChange(item.key, !notifications[item.key as keyof typeof notifications])}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-zinc-900 ${
                notifications[item.key as keyof typeof notifications] ? 'bg-cyan-500' : 'bg-zinc-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  notifications[item.key as keyof typeof notifications] ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSecurityTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-2">Security Settings</h3>
        <p className="text-sm text-zinc-400">Manage your account security and authentication methods.</p>
      </div>

      {/* Password Section */}
      <div className="bg-zinc-800/30 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-md font-medium text-white">Password</h4>
            <p className="text-sm text-zinc-400">Last changed 30 days ago</p>
          </div>
          <button className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors">
            Change Password
          </button>
        </div>
      </div>

      {/* Two-Factor Authentication */}
      <div className="bg-zinc-800/30 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-md font-medium text-white">Two-Factor Authentication</h4>
            <p className="text-sm text-zinc-400">Add an extra layer of security to your account</p>
          </div>
          <button className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black rounded-lg transition-colors font-medium">
            Enable 2FA
          </button>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="bg-zinc-800/30 rounded-lg p-6">
        <h4 className="text-md font-medium text-white mb-4">Active Sessions</h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-zinc-700/50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-white">Current Session</p>
              <p className="text-xs text-zinc-400">Chrome on macOS • Last active now</p>
            </div>
            <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded border border-green-500/30">
              Active
            </span>
          </div>
        </div>
      </div>

      {/* API Keys Access */}
      <div className="bg-zinc-800/30 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-md font-medium text-white">API Key Management</h4>
            <p className="text-sm text-zinc-400">Manage your API keys and access permissions</p>
          </div>
          <button className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors flex items-center space-x-2">
            <Key className="h-4 w-4" />
            <span>Manage Keys</span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return renderProfileTab();
      case 'notifications':
        return renderNotificationsTab();
      case 'security':
        return renderSecurityTab();
      case 'billing':
        return (
          <div className="text-center py-12">
            <CreditCard className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-400">Billing settings coming soon</p>
          </div>
        );
      case 'webhooks':
        return (
          <div className="text-center py-12">
            <Webhook className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-400">Webhook configuration coming soon</p>
          </div>
        );
      case 'api':
        return (
          <div className="text-center py-12">
            <Key className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-400">API settings coming soon</p>
          </div>
        );
      default:
        return renderProfileTab();
    }
  };

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="min-h-full bg-black">
          <div className="flex">
            {/* Settings Sidebar */}
            <div className="w-64 bg-zinc-950/50 border-r border-zinc-800 p-6">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-white">Settings</h2>
                <p className="text-sm text-zinc-400">Manage your account preferences</p>
              </div>
              
              <nav className="space-y-1">
                {settingsTabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === tab.id
                          ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                          : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{tab.name}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Settings Content */}
            <div className="flex-1 p-6">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="max-w-4xl"
              >
                {renderTabContent()}

                {/* Save Button */}
                {(activeTab === 'profile' || activeTab === 'notifications') && (
                  <div className="mt-8 pt-6 border-t border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {unsavedChanges && (
                        <>
                          <AlertTriangle className="h-4 w-4 text-yellow-400" />
                          <p className="text-sm text-yellow-400">You have unsaved changes</p>
                        </>
                      )}
                    </div>
                    <button
                      onClick={handleSave}
                      disabled={!unsavedChanges}
                      className={`flex items-center space-x-2 px-6 py-2 rounded-lg font-medium transition-colors ${
                        unsavedChanges
                          ? 'bg-cyan-500 hover:bg-cyan-400 text-black'
                          : 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
                      }`}
                    >
                      <Save className="h-4 w-4" />
                      <span>Save Changes</span>
                    </button>
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
};

export default SettingsPage;