'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  Gamepad2, 
  Shield, 
  BarChart3, 
  DollarSign, 
  Settings, 
  ChevronDown, 
  ChevronRight,
  TrendingUp,
  Eye,
  AlertTriangle,
  Zap,
  Bot,
  Globe,
  Trophy,
  Cpu,
  Database,
  Lock,
  Monitor,
  X
} from 'lucide-react';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

interface NavItem {
  title: string;
  href?: string;
  icon: React.ElementType;
  children?: NavItem[];
  colorClass?: string;
}

const navItems: NavItem[] = [
  {
    title: 'Overview',
    href: '/',
    icon: LayoutDashboard,
    colorClass: 'admin-rainbow-text'
  },
  {
    title: 'Game Ecosystem',
    icon: Gamepad2,
    colorClass: 'admin-rainbow-text',
    children: [
      { title: 'Live Matches', href: '/matches', icon: Eye },
      { title: 'Game Analytics', href: '/game-analytics', icon: BarChart3 },
      { title: 'Unity Engine', href: '/unity-engine', icon: Cpu },
      { title: 'Tournaments', href: '/tournaments', icon: Trophy },
    ]
  },
  {
    title: 'Financial Control',
    icon: DollarSign,
    colorClass: 'analytics-glow-text',
    children: [
      { title: 'Revenue Dashboard', href: '/revenue', icon: TrendingUp },
      { title: 'Session Vaults', href: '/session-vaults', icon: Lock },
      { title: 'Bridge Monitoring', href: '/bridge', icon: Globe },
      { title: 'Emergency Controls', href: '/emergency', icon: AlertTriangle },
    ]
  },
  {
    title: 'Security & Users',
    icon: Shield,
    colorClass: 'security-pulse-text',
    children: [
      { title: 'User Management', href: '/users', icon: Users },
      { title: 'Threat Detection', href: '/security', icon: Shield },
      { title: 'Anti-Cheat', href: '/anti-cheat', icon: Bot },
      { title: 'Signature Verification', href: '/signatures', icon: Lock },
    ]
  },
  {
    title: 'AI & Machine Learning',
    icon: Bot,
    colorClass: 'text-accent-cyan',
    children: [
      { title: 'Bot Intelligence', href: '/bot-intelligence', icon: Bot },
      { title: 'Predictive Analytics', href: '/predictive', icon: BarChart3 },
      { title: 'Fraud Detection', href: '/fraud', icon: Shield },
      { title: 'Performance ML', href: '/ml-performance', icon: Cpu },
    ]
  },
  {
    title: 'Live Streaming',
    icon: Monitor,
    colorClass: 'text-accent-pink',
    children: [
      { title: 'Stream Monitoring', href: '/streaming', icon: Monitor },
      { title: 'Content Moderation', href: '/moderation', icon: Eye },
      { title: 'Broadcaster Tools', href: '/broadcaster', icon: Settings },
    ]
  },
  {
    title: 'System Operations',
    icon: Database,
    colorClass: 'text-accent-info',
    children: [
      { title: 'Health Monitoring', href: '/health', icon: TrendingUp },
      { title: 'Database Admin', href: '/database', icon: Database },
      { title: 'API Management', href: '/api', icon: Globe },
      { title: 'Maintenance', href: '/maintenance', icon: Settings },
    ]
  },
];

export default function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>(['Overview']);

  const toggleExpanded = (title: string) => {
    setExpandedItems(prev => 
      prev.includes(title) 
        ? prev.filter(item => item !== title)
        : [...prev, title]
    );
  };

  const isItemActive = (href?: string) => {
    if (!href) return false;
    return pathname === href;
  };

  const isParentActive = (children?: NavItem[]) => {
    if (!children) return false;
    return children.some(child => pathname === child.href);
  };

  const handleNavClick = () => {
    // Close sidebar on mobile when navigation item is clicked
    if (window.innerWidth < 1024 && onClose) {
      onClose();
    }
  };

  const renderNavItem = (item: NavItem, depth = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.title);
    const isActive = isItemActive(item.href);
    const isParentActiveItem = isParentActive(item.children);

    if (hasChildren) {
      return (
        <div key={item.title} className="space-y-1">
          <button
            onClick={() => toggleExpanded(item.title)}
            className={`
              admin-nav-item w-full text-left group
              ${isParentActiveItem ? 'active' : ''}
              ${depth > 0 ? 'ml-4' : ''}
            `}
          >
            <item.icon className="w-5 h-5 text-text-secondary group-hover:text-accent-secondary transition-colors duration-200" />
            <span className={`font-medium ${item.colorClass || 'text-text-primary'}`}>
              {item.title}
            </span>
            <div className="ml-auto">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-text-muted transition-transform duration-200" />
              ) : (
                <ChevronRight className="w-4 h-4 text-text-muted transition-transform duration-200" />
              )}
            </div>
          </button>
          
          {isExpanded && (
            <div className="space-y-1 ml-6 animate-fade-in">
              {item.children?.map(child => renderNavItem(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={item.title}
        href={item.href || '#'}
        onClick={handleNavClick}
        className={`
          admin-nav-item group
          ${isActive ? 'active' : ''}
          ${depth > 0 ? 'ml-4' : ''}
        `}
      >
        <item.icon className="w-5 h-5 text-text-secondary group-hover:text-accent-secondary transition-colors duration-200" />
        <span className={`font-medium ${item.colorClass || 'text-text-primary'} group-hover:text-white transition-colors duration-200`}>
          {item.title}
        </span>
      </Link>
    );
  };

  return (
    <div className={`admin-glass-card border-t-0 border-b-0 border-l-0 rounded-none h-screen w-64 flex flex-col animate-dashboard-float ${!isOpen ? 'hidden lg:flex' : ''}`}>
      {/* Sidebar Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-audiowide text-text-primary">
              Admin Panel
            </h2>
            <p className="text-sm text-text-muted">
              Mission Control
            </p>
          </div>
          
          {/* Mobile close button */}
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-2 hover:bg-bg-hover rounded-lg transition-colors duration-200"
            >
              <X className="w-5 h-5 text-text-muted" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-2">
        {navItems.map(item => renderNavItem(item))}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-border">
        <div className="admin-metric-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-text-secondary">System Status</span>
            <div className="status-online w-2 h-2 rounded-full"></div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-text-muted">CPU</span>
              <span className="text-accent-success">23%</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-text-muted">Memory</span>
              <span className="text-accent-info">1.2GB</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-text-muted">Uptime</span>
              <span className="text-accent-warning">99.9%</span>
            </div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-gradient-to-r from-accent-secondary/10 to-accent-info/10 border border-accent-secondary/20 rounded-lg">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-accent-secondary animate-admin-pulse" />
            <span className="text-sm font-medium text-text-primary">All Systems Operational</span>
          </div>
          <p className="text-xs text-text-muted mt-1">
            Last deployment: 2 hours ago
          </p>
        </div>
      </div>
    </div>
  );
} 