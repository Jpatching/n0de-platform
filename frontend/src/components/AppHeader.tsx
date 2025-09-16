'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell,
  Search,
  Plus,
  Key,
  Code,
  Database,
  HelpCircle,
  X,
  Clock,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import api from '@/lib/api';

interface QuickAction {
  name: string;
  description: string;
  href: string;
  icon: any;
  shortcut?: string;
}

const quickActions: QuickAction[] = [
  {
    name: 'Create API Key',
    description: 'Generate a new API key',
    href: '/app/api-keys/new',
    icon: Key,
    shortcut: 'Cmd+K'
  },
  {
    name: 'Open Playground',
    description: 'Test API endpoints',
    href: '/app/playground',
    icon: Code,
    shortcut: 'Cmd+P'
  },
  {
    name: 'View Database',
    description: 'Manage your data',
    href: '/app/database',
    icon: Database,
    shortcut: 'Cmd+D'
  },
  {
    name: 'API Documentation',
    description: 'Browse API reference',
    href: 'https://docs.n0de.com',
    icon: HelpCircle,
    shortcut: 'Cmd+?'
  }
];

interface Notification {
  id: string;
  title: string;
  description: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
  read: boolean;
}


const AppHeader = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);
  const searchRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const quickActionsRef = useRef<HTMLDivElement>(null);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
          case 'k':
            e.preventDefault();
            setSearchOpen(!searchOpen);
            break;
          case 'j':
            e.preventDefault();
            setQuickActionsOpen(!quickActionsOpen);
            break;
        }
      }
      
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setNotificationsOpen(false);
        setQuickActionsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [searchOpen, quickActionsOpen]);

  // Handle clicks outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
      if (quickActionsRef.current && !quickActionsRef.current.contains(event.target as Node)) {
        setQuickActionsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-400" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-400" />;
      default:
        return <Clock className="h-4 w-4 text-blue-400" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  // Fetch notifications on component mount
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setIsLoadingNotifications(true);
        const notificationsResponse = await api.get<any>('/notifications');
        setNotifications(notificationsResponse || []);
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      } finally {
        setIsLoadingNotifications(false);
      }
    };

    if (user) {
      fetchNotifications();
      // Set up polling for real-time notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  return (
    <>
      {/* Command Palette Search */}
      <div ref={searchRef} className="relative flex-1 max-w-lg">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-zinc-400" />
          </div>
          <input
            type="text"
            placeholder="Search or jump to... (⌘K)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchOpen(true)}
            className="block w-full pl-10 pr-4 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <kbd className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-700 text-zinc-300 border border-zinc-600">
              ⌘K
            </kbd>
          </div>
        </div>

        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute top-full mt-2 w-full bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 overflow-hidden"
            >
              {searchQuery ? (
                <div className="p-4">
                  <p className="text-sm text-zinc-400 mb-2">Search results for &quot;{searchQuery}&quot;</p>
                  <div className="space-y-2">
                    <div className="p-2 hover:bg-zinc-800 rounded cursor-pointer">
                      <p className="text-sm text-white">No results found</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="p-3 border-b border-zinc-700">
                    <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Quick Actions</p>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {quickActions.map((action) => {
                      const Icon = action.icon;
                      return (
                        <button
                          key={action.name}
                          onClick={() => {
                            if (action.href.startsWith('http')) {
                              window.open(action.href, '_blank');
                            } else {
                              router.push(action.href);
                            }
                            setSearchOpen(false);
                          }}
                          className="w-full flex items-center p-3 hover:bg-zinc-800 transition-colors text-left"
                        >
                          <Icon className="h-4 w-4 text-cyan-400 mr-3" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-white">{action.name}</p>
                            <p className="text-xs text-zinc-400">{action.description}</p>
                          </div>
                          {action.shortcut && (
                            <kbd className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-700 text-zinc-300">
                              {action.shortcut}
                            </kbd>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Quick Actions Button */}
      <div ref={quickActionsRef} className="relative">
        <button
          onClick={() => setQuickActionsOpen(!quickActionsOpen)}
          className="flex items-center space-x-2 px-3 py-2 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/20 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span className="text-sm font-medium">New</span>
        </button>

        <AnimatePresence>
          {quickActionsOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute right-0 mt-2 w-64 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50"
            >
              <div className="p-2">
                {quickActions.slice(0, 3).map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.name}
                      onClick={() => {
                        if (action.href.startsWith('http')) {
                          window.open(action.href, '_blank');
                        } else {
                          router.push(action.href);
                        }
                        setQuickActionsOpen(false);
                      }}
                      className="w-full flex items-center p-3 hover:bg-zinc-800 rounded-lg transition-colors text-left"
                    >
                      <Icon className="h-4 w-4 text-cyan-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-white">{action.name}</p>
                        <p className="text-xs text-zinc-400">{action.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Notifications */}
      <div ref={notificationsRef} className="relative">
        <button
          onClick={() => setNotificationsOpen(!notificationsOpen)}
          className="relative p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-cyan-500 text-black text-xs font-bold rounded-full flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>

        <AnimatePresence>
          {notificationsOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute right-0 mt-2 w-80 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50"
            >
              <div className="p-4 border-b border-zinc-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-white">Notifications</h3>
                  <button
                    onClick={() => setNotificationsOpen(false)}
                    className="text-zinc-400 hover:text-white transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <div className="max-h-64 overflow-y-auto">
                {isLoadingNotifications ? (
                  <div className="p-4 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-400"></div>
                    <span className="ml-3 text-sm text-zinc-400">Loading notifications...</span>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-4 text-center text-zinc-400">
                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No notifications</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors ${
                      !notification.read ? 'bg-cyan-500/5' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      {getNotificationIcon(notification.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-white truncate">
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-cyan-400 rounded-full ml-2"></div>
                          )}
                        </div>
                        <p className="text-sm text-zinc-400 mt-1">{notification.description}</p>
                        <p className="text-xs text-zinc-500 mt-1">{notification.timestamp}</p>
                      </div>
                    </div>
                  </div>
                  ))
                )}
              </div>
              
              <div className="p-3 border-t border-zinc-700">
                <button className="w-full text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
                  View all notifications
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default AppHeader;