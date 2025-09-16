'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home,
  BarChart3,
  Settings,
  Zap,
  Database,
  Globe,
  Code,
  Shield,
  Users,
  FileText,
  ChevronLeft,
  ChevronRight,
  Gauge
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  className?: string;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href?: string;
  badge?: string;
  subItems?: {
    id: string;
    label: string;
    href: string;
    badge?: string;
  }[];
}

export default function Sidebar({ className }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeItem, setActiveItem] = useState('dashboard');

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <Home className="w-5 h-5" />,
      href: '/dashboard'
    },
    {
      id: 'rpc-nodes',
      label: 'RPC Nodes',
      icon: <Database className="w-5 h-5" />,
      badge: 'LIVE',
      subItems: [
        { id: 'mainnet', label: 'Mainnet', href: '/rpc/mainnet', badge: '99.99%' },
        { id: 'devnet', label: 'Devnet', href: '/rpc/devnet' },
        { id: 'testnet', label: 'Testnet', href: '/rpc/testnet' }
      ]
    },
    {
      id: 'performance',
      label: 'Performance',
      icon: <Gauge className="w-5 h-5" />,
      badge: '8ms',
      subItems: [
        { id: 'metrics', label: 'Real-time Metrics', href: '/performance/metrics' },
        { id: 'latency', label: 'Latency Monitor', href: '/performance/latency' },
        { id: 'uptime', label: 'Uptime Status', href: '/performance/uptime', badge: '99.99%' }
      ]
    },
    {
      id: 'grpc',
      label: 'gRPC Streaming',
      icon: <Zap className="w-5 h-5" />,
      badge: 'NEW',
      subItems: [
        { id: 'yellowstone', label: 'Yellowstone Plugin', href: '/grpc/yellowstone' },
        { id: 'geyser', label: 'Geyser Streams', href: '/grpc/geyser' },
        { id: 'websockets', label: 'WebSockets', href: '/grpc/websockets' }
      ]
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: <BarChart3 className="w-5 h-5" />,
      subItems: [
        { id: 'requests', label: 'Request Analytics', href: '/analytics/requests' },
        { id: 'errors', label: 'Error Tracking', href: '/analytics/errors' },
        { id: 'usage', label: 'Usage Reports', href: '/analytics/usage' }
      ]
    },
    {
      id: 'apis',
      label: 'Enhanced APIs',
      icon: <Code className="w-5 h-5" />,
      subItems: [
        { id: 'das', label: 'DAS API', href: '/apis/das' },
        { id: 'webhooks', label: 'Webhooks', href: '/apis/webhooks' },
        { id: 'compression', label: 'Compression', href: '/apis/compression' }
      ]
    },
    {
      id: 'network',
      label: 'Network',
      icon: <Globe className="w-5 h-5" />,
      subItems: [
        { id: 'validators', label: 'Validator Network', href: '/network/validators' },
        { id: 'staking', label: 'Staking Pool', href: '/network/staking' },
        { id: 'governance', label: 'Governance', href: '/network/governance' }
      ]
    },
    {
      id: 'security',
      label: 'Security',
      icon: <Shield className="w-5 h-5" />,
      subItems: [
        { id: 'keys', label: 'API Keys', href: '/security/keys' },
        { id: 'access', label: 'Access Control', href: '/security/access' },
        { id: 'audit', label: 'Audit Logs', href: '/security/audit' }
      ]
    },
    {
      id: 'team',
      label: 'Team',
      icon: <Users className="w-5 h-5" />,
      href: '/team'
    },
    {
      id: 'docs',
      label: 'Documentation',
      icon: <FileText className="w-5 h-5" />,
      href: '/docs'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-5 h-5" />,
      href: '/settings'
    }
  ];

  return (
    <motion.div
      initial={{ x: -280 }}
      animate={{ x: 0, width: isCollapsed ? 80 : 280 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-bg-card/95 backdrop-blur-xl border-r border-border',
        'flex flex-col',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center space-x-3"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-n0de-green via-n0de-blue to-n0de-purple rounded-lg flex items-center justify-center">
              <span className="text-black font-bold text-lg">n</span>
            </div>
            <div>
              <span className="text-lg font-bold gradient-text">n0de</span>
              <div className="text-xs text-text-muted">RPC Dashboard</div>
            </div>
          </motion.div>
        )}
        
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 hover:bg-bg-hover rounded-lg transition-colors"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Status Indicator */}
      <div className="p-4 border-b border-border">
        <div className={cn(
          'flex items-center space-x-3 p-3 rounded-lg bg-n0de-green/10 border border-n0de-green/20',
          isCollapsed && 'justify-center'
        )}>
          <div className="w-2 h-2 bg-n0de-green rounded-full animate-pulse" />
          {!isCollapsed && (
            <div>
              <div className="text-sm font-semibold text-n0de-green">All Systems Operational</div>
              <div className="text-xs text-text-muted">99.99% uptime • 8ms avg latency</div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-2">
          {navItems.map((item) => (
            <NavItemComponent
              key={item.id}
              item={item}
              isCollapsed={isCollapsed}
              isActive={activeItem === item.id}
              onActivate={() => setActiveItem(item.id)}
            />
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className={cn(
          'flex items-center space-x-3 p-3 rounded-lg bg-bg-elevated',
          isCollapsed && 'justify-center'
        )}>
          <div className="w-8 h-8 bg-gradient-to-r from-n0de-blue to-n0de-purple rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-semibold">A</span>
          </div>
          {!isCollapsed && (
            <div>
              <div className="text-sm font-semibold">Admin User</div>
              <div className="text-xs text-text-muted">Enterprise Plan</div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function NavItemComponent({ 
  item, 
  isCollapsed, 
  isActive, 
  onActivate 
}: { 
  item: NavItem; 
  isCollapsed: boolean; 
  isActive: boolean; 
  onActivate: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasSubItems = item.subItems && item.subItems.length > 0;

  const handleClick = () => {
    onActivate();
    if (hasSubItems && !isCollapsed) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div>
      <motion.button
        onClick={handleClick}
        className={cn(
          'w-full flex items-center space-x-3 p-3 rounded-lg transition-all duration-200',
          'hover:bg-bg-hover',
          isActive && 'bg-n0de-green/10 border border-n0de-green/20',
          isCollapsed && 'justify-center'
        )}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className={cn(
          'flex items-center justify-center',
          isActive ? 'text-n0de-green' : 'text-text-secondary'
        )}>
          {item.icon}
        </div>
        
        {!isCollapsed && (
          <>
            <div className="flex-1 text-left">
              <div className={cn(
                'text-sm font-medium',
                isActive ? 'text-n0de-green' : 'text-text-primary'
              )}>
                {item.label}
              </div>
            </div>
            
            {item.badge && (
              <span className={cn(
                'px-2 py-1 text-xs font-semibold rounded-full',
                item.badge === 'LIVE' && 'bg-n0de-green/20 text-n0de-green',
                item.badge === 'NEW' && 'bg-n0de-blue/20 text-n0de-blue',
                item.badge.includes('ms') && 'bg-n0de-purple/20 text-n0de-purple',
                item.badge.includes('%') && 'bg-green-500/20 text-green-400'
              )}>
                {item.badge}
              </span>
            )}
            
            {hasSubItems && (
              <ChevronRight className={cn(
                'w-4 h-4 transition-transform duration-200',
                isExpanded && 'rotate-90'
              )} />
            )}
          </>
        )}
      </motion.button>

      {/* Sub Items */}
      <AnimatePresence>
        {hasSubItems && isExpanded && !isCollapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="ml-6 mt-2 space-y-1"
          >
            {item.subItems?.map((subItem) => (
              <motion.a
                key={subItem.id}
                href={subItem.href}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-bg-hover transition-colors group"
                whileHover={{ x: 4 }}
              >
                <span className="text-sm text-text-secondary group-hover:text-text-primary">
                  {subItem.label}
                </span>
                {subItem.badge && (
                  <span className={cn(
                    'px-2 py-1 text-xs font-semibold rounded-full',
                    subItem.badge.includes('%') && 'bg-green-500/20 text-green-400'
                  )}>
                    {subItem.badge}
                  </span>
                )}
              </motion.a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}