'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Bell, User, LogOut, Settings, Shield, AlertTriangle, Search, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn, formatRelativeTime } from '@/lib/utils';

interface HeaderProps {
  className?: string;
}

interface Notification {
  id: string;
  type: 'alert' | 'info' | 'warning' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

export default function Header({ className }: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState(3);

  // Mock notifications - in real app, fetch from API
  const notificationsData: Notification[] = [
    {
      id: '1',
      type: 'alert',
      title: 'Security Alert',
      message: 'Multiple failed login attempts detected',
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      read: false
    },
    {
      id: '2',
      type: 'warning',
      title: 'High CPU Usage',
      message: 'Server CPU usage at 87%',
      timestamp: new Date(Date.now() - 15 * 60 * 1000),
      read: false
    },
    {
      id: '3',
      type: 'info',
      title: 'New User Registration',
      message: '25 new users registered in the last hour',
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      read: true
    }
  ];

  const unreadCount = notificationsData.filter(n => !n.read).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'alert':
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'info':
        return <Bell className="w-4 h-4 text-blue-400" />;
      case 'success':
        return <Shield className="w-4 h-4 text-green-400" />;
      default:
        return <Bell className="w-4 h-4 text-gray-400" />;
    }
  };

  const handleLogout = async () => {
    const confirmed = confirm('Are you sure you want to logout from admin dashboard?');
    if (confirmed) {
      try {
        // Call logout API
        await fetch('/api/admin/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('adminSession')}`,
            'Content-Type': 'application/json'
          }
        });
      } catch (error) {
        console.error('Logout API error:', error);
      }

      // Clear local storage and cookies
      localStorage.removeItem('adminSession');
      document.cookie = 'adminSession=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      
      // Redirect to login
      window.location.href = '/login';
    }
  };

  const handleSearch = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      alert(`🔍 Searching for: "${searchQuery}"\n\nFound:\n• 3 users matching criteria\n• 12 transactions\n• 5 game matches`);
      setSearchQuery('');
    }
  };

  const markNotificationRead = (id: string) => {
    setNotifications(prev => Math.max(0, prev - 1));
    // In real app: API call to mark notification as read
    console.log(`Marking notification ${id} as read`);
  };

  return (
    <header className={cn(
      "admin-glass-card border-l-0 border-r-0 border-t-0 rounded-none sticky top-0 z-50 px-6 py-4",
      className
    )}>
      <div className="flex items-center justify-between">
        {/* Left side - Logo and title */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <Image 
              src="/logos/PV3-Logo.png" 
              alt="PV3 Logo" 
              width={40} 
              height={40} 
              className="w-10 h-10 object-contain"
            />
            <div>
              <h1 className="text-heading-md font-audiowide admin-rainbow-text">
                PV3 Admin
              </h1>
              <p className="text-sm text-text-secondary">
                Mission Control
              </p>
            </div>
          </div>
        </div>

        {/* Center - Search */}
        <div className="flex-1 max-w-md mx-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted w-4 h-4" />
            <input
              type="text"
              placeholder="Search users, matches, transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
              className="w-full bg-bg-elevated border border-border rounded-lg pl-10 pr-4 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-secondary focus:ring-2 focus:ring-accent-secondary/20 transition-all duration-200"
            />
          </div>
        </div>

        {/* Right side - Actions and profile */}
        <div className="flex items-center space-x-4">
          {/* Emergency Controls */}
          <Button className="emergency-control text-white font-bold px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105">
            <Zap className="w-4 h-4 mr-2" />
            Emergency
          </Button>

          {/* Notifications */}
          <div className="relative">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setShowNotifications(!showNotifications)}
              className="admin-nav-item relative hover:bg-bg-hover border-0"
            >
              <Bell className="w-5 h-5 text-text-secondary" />
              {notifications > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent-danger text-white text-xs rounded-full flex items-center justify-center animate-admin-pulse">
                  {notifications}
                </span>
              )}
            </Button>

            {showNotifications && (
              <Card className="absolute right-0 top-12 w-80 z-50 border border-border bg-bg-elevated">
                <div className="p-4 border-b border-border">
                  <h3 className="font-semibold text-text-primary">Notifications</h3>
                  <p className="text-sm text-text-secondary">{unreadCount} unread</p>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notificationsData.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => markNotificationRead(notification.id)}
                      className={cn(
                        "p-4 border-b border-border hover:bg-bg-hover cursor-pointer",
                        !notification.read && "bg-bg-card"
                      )}
                    >
                      <div className="flex items-start space-x-3">
                        {getNotificationIcon(notification.type)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary">{notification.title}</p>
                          <p className="text-sm text-text-secondary mt-1">{notification.message}</p>
                          <p className="text-xs text-text-muted mt-2">
                            {formatRelativeTime(notification.timestamp)}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-accent-info rounded-full"></div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* System Status */}
          <div className="flex items-center space-x-2 px-3 py-2 bg-bg-elevated rounded-lg border border-border">
            <div className="status-online w-2 h-2 rounded-full"></div>
            <span className="text-sm text-text-secondary font-medium">System Online</span>
          </div>

          {/* Profile Menu */}
          <div className="relative">
            <Button 
              variant="ghost" 
              onClick={() => setShowProfile(!showProfile)}
              className="admin-nav-item flex items-center space-x-2 px-3 py-2 hover:bg-bg-hover border-0"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-accent-info to-accent-cyan rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="text-left hidden md:block">
                <p className="text-sm font-medium text-text-primary">Admin User</p>
                <p className="text-xs text-text-muted">Super Administrator</p>
              </div>
            </Button>

            {showProfile && (
              <Card className="absolute right-0 top-12 w-64 z-50 border border-border bg-bg-elevated">
                <div className="p-4 border-b border-border">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-accent-info to-accent-secondary rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-text-primary">Admin User</p>
                      <p className="text-sm text-text-secondary">Super Admin</p>
                    </div>
                  </div>
                </div>
                <div className="p-2">
                  <Button variant="ghost" size="sm" className="w-full justify-start text-text-primary hover:bg-bg-hover">
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full justify-start text-text-primary hover:bg-bg-hover">
                    <Shield className="w-4 h-4 mr-2" />
                    Security
                  </Button>
                  <div className="border-t border-border my-2"></div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-accent-danger hover:text-accent-danger hover:bg-bg-hover"
                    onClick={handleLogout}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </Button>
                </div>
              </Card>
            )}
          </div>

          {/* Quick Settings */}
          <Button 
            variant="ghost" 
            size="icon"
            className="admin-nav-item hover:bg-bg-hover border-0"
          >
            <Settings className="w-5 h-5 text-text-secondary hover:text-accent-secondary transition-colors duration-200" />
          </Button>
        </div>
      </div>

      {/* Secondary bar with quick stats */}
      <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-accent-success rounded-full animate-admin-pulse"></div>
            <span className="text-sm text-text-secondary">
              <span className="text-accent-success font-bold analytics-glow-text">1,247</span> Active Users
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-accent-info rounded-full animate-admin-pulse"></div>
            <span className="text-sm text-text-secondary">
              <span className="text-accent-info font-bold">89</span> Live Matches
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-accent-warning rounded-full animate-admin-pulse"></div>
            <span className="text-sm text-text-secondary">
              <span className="text-accent-warning font-bold security-pulse-text">$42.8K</span> Volume (24h)
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-sm text-text-muted">
            <span>Last backup:</span>
            <span className="text-accent-success">2 hours ago</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-text-muted">
            <span>Server load:</span>
            <span className="text-accent-info">23%</span>
          </div>
        </div>
      </div>
    </header>
  );
} 