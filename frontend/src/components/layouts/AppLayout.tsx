'use client';

import { useState, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home,
  Key, 
  BarChart3, 
  Settings, 
  Code,
  Database,
  Webhook,
  Users,
  CreditCard,
  Shield,
  Bell,
  Search,
  Menu,
  X,
  ChevronDown,
  LogOut,
  User,
  HelpCircle,
  ExternalLink,
  Activity
} from 'lucide-react';

interface AppLayoutProps {
  children: ReactNode;
}

interface NavItem {
  name: string;
  href: string;
  icon: any;
  badge?: string | number;
}

const navigation: NavItem[] = [
  { name: 'Overview', href: '/dashboard', icon: Home },
  { name: 'API Keys', href: '/dashboard/api-keys', icon: Key, badge: 'New' },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Webhooks', href: '/dashboard/webhooks', icon: Webhook },
  { name: 'Database', href: '/dashboard/database', icon: Database },
  { name: 'Playground', href: '/dashboard/playground', icon: Code },
  { name: 'Team', href: '/dashboard/team', icon: Users },
  { name: 'Billing', href: '/dashboard/billing', icon: CreditCard },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

const AppLayout = ({ children }: AppLayoutProps) => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const isActiveRoute = (href: string) => {
    return pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
  };

  return (
    <div className="min-h-screen bg-black flex">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-72' : 'w-20'} transition-all duration-300 bg-zinc-950 border-r border-zinc-800 flex flex-col`}>
        {/* Sidebar Header */}
        <div className="p-6 border-b border-zinc-800">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-black font-bold text-sm">N0</span>
            </div>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col"
              >
                <span className="text-white font-semibold text-lg">N0DE</span>
                <span className="text-zinc-400 text-xs">Production API</span>
              </motion.div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4">
          <div className="space-y-1 px-3">
            {navigation.map((item) => {
              const isActive = isActiveRoute(item.href);
              const Icon = item.icon;
              
              return (
                <div key={item.name} className="relative">
                  <button
                    onClick={() => router.push(item.href)}
                    className={`w-full flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                    }`}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {sidebarOpen && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="ml-3 flex items-center justify-between w-full"
                      >
                        <span>{item.name}</span>
                        {item.badge && (
                          <span className="bg-cyan-500/20 text-cyan-400 text-xs px-2 py-0.5 rounded-full">
                            {item.badge}
                          </span>
                        )}
                      </motion.div>
                    )}
                  </button>
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-cyan-400 rounded-r-full"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-zinc-800">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center justify-center p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="bg-zinc-950/80 backdrop-blur-sm border-b border-zinc-800 px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left side - Search */}
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-zinc-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search APIs, docs, settings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchOpen(true)}
                  className="block w-80 pl-10 pr-3 py-2 border border-zinc-700 rounded-lg bg-zinc-800/50 text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Right side - Notifications & User Menu */}
            <div className="flex items-center space-x-4">
              {/* Status Indicator */}
              <div className="flex items-center space-x-2 text-sm">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-zinc-400">All systems operational</span>
              </div>

              {/* Notifications */}
              <button className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-cyan-400 rounded-full"></span>
              </button>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-black font-semibold text-sm">
                      {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-white">
                      {user?.firstName && user?.lastName 
                        ? `${user.firstName} ${user.lastName}` 
                        : user?.username || user?.email?.split('@')[0]
                      }
                    </p>
                    <p className="text-xs text-zinc-400">Pro Plan</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-zinc-400" />
                </button>

                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-56 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50"
                    >
                      <div className="py-2">
                        <div className="px-4 py-2 border-b border-zinc-700">
                          <p className="text-sm font-medium text-white">{user?.email}</p>
                          <p className="text-xs text-zinc-400">Personal Account</p>
                        </div>
                        
                        <button
                          onClick={() => router.push('/dashboard/settings')}
                          className="w-full flex items-center px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
                        >
                          <User className="h-4 w-4 mr-3" />
                          Account Settings
                        </button>
                        
                        <button
                          onClick={() => router.push('/dashboard/billing')}
                          className="w-full flex items-center px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
                        >
                          <CreditCard className="h-4 w-4 mr-3" />
                          Billing
                        </button>
                        
                        <button className="w-full flex items-center px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors">
                          <HelpCircle className="h-4 w-4 mr-3" />
                          Support
                        </button>
                        
                        <button
                          onClick={() => window.open('https://docs.n0de.com', '_blank')}
                          className="w-full flex items-center px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
                        >
                          <ExternalLink className="h-4 w-4 mr-3" />
                          Documentation
                        </button>
                        
                        <hr className="my-2 border-zinc-700" />
                        
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                        >
                          <LogOut className="h-4 w-4 mr-3" />
                          Sign Out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 bg-black">
          {children}
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default AppLayout;