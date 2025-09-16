'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { getSafeDate } from '@/lib/dateUtils';
import MetricsOverview from './MetricsOverview';
import ApiKeyManager from './ApiKeyManager';
import { 
  Activity, 
  Key, 
  Settings, 
  TrendingUp, 
  Clock, 
  Copy,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle,
  Home,
  CreditCard,
  HelpCircle,
  Code,
  BarChart3,
  Globe,
  Shield,
  Zap,
  Users,
  Server,
  Bell,
  Search,
  Filter,
  Download,
  Upload,
  ExternalLink,
  RefreshCw,
  Gauge,
  Target,
  LineChart as LineChartIcon,
  Terminal,
  FileText,
  Bookmark,
  Edit3,
  MoreVertical,
  AlertTriangle,
  UserPlus,
  Crown,
  Lock,
  Webhook,
  Cloud,
  Cpu,
  TrendingDown,
  Calendar,
  Mail,
  Phone,
  Slack,
  MessageSquare,
  MonitorSpeaker,
  History,
  AlertOctagon,
  MapPin,
  Network,
  Layers,
  GitBranch,
  PieChart,
  BarChart,
  ChevronRight,
  UserCog,
  Building,
  ShieldCheck,
  FileBarChart,
  Radar,
  Link,
  Play,
  Pause,
  RotateCcw,
  Send
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart as RechartsBarChart, Bar, PieChart as RechartsPieChart, Cell } from 'recharts';

// Enhanced interfaces for enterprise dashboard
interface APIKey {
  id: string;
  name: string;
  key: string;
  created: string;
  lastUsed: string;
  requests: number;
  status: 'active' | 'inactive' | 'rate_limited';
  permissions: string[];
  rateLimit: number;
  network: 'mainnet' | 'devnet' | 'testnet';
}

// Enterprise Team Management interfaces
interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'developer' | 'viewer';
  status: 'active' | 'pending' | 'suspended';
  joinedDate: string;
  lastActive: string;
  permissions: string[];
}

interface Organization {
  id: string;
  name: string;
  domain: string;
  ssoEnabled: boolean;
  ipWhitelist: string[];
  auditLogsEnabled: boolean;
  complianceLevel: 'basic' | 'soc2' | 'pci';
}

// Advanced Monitoring interfaces
interface AlertRule {
  id: string;
  name: string;
  condition: string;
  threshold: number;
  status: 'active' | 'paused';
  severity: 'low' | 'medium' | 'high' | 'critical';
  channels: string[];
  created: string;
  lastTriggered: string | null;
}

interface Incident {
  id: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  created: string;
  resolved: string | null;
  affectedServices: string[];
  description: string;
}

// Webhook & Integration interfaces
interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  status: 'active' | 'inactive' | 'failed';
  secret: string;
  created: string;
  lastDelivery: string | null;
  successRate: number;
}

interface Integration {
  id: string;
  name: string;
  type: 'slack' | 'discord' | 'pagerduty' | 'datadog' | 'custom';
  status: 'connected' | 'disconnected' | 'error';
  configured: string;
  lastSync: string | null;
}

// Infrastructure Control interfaces
interface InfrastructureConfig {
  regions: string[];
  loadBalancing: boolean;
  caching: boolean;
  cdnEnabled: boolean;
  autoScaling: {
    enabled: boolean;
    minNodes: number;
    maxNodes: number;
    targetCPU: number;
  };
  customDomains: string[];
}

// Security & Compliance interfaces
interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  resource: string;
  details: string;
  ipAddress: string;
  userAgent: string;
}

interface SecurityEvent {
  id: string;
  type: 'failed_login' | 'suspicious_ip' | 'rate_limit_exceeded' | 'unauthorized_access';
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  details: string;
  resolved: boolean;
}

// Business Intelligence interfaces
interface ForecastData {
  period: string;
  predictedRequests: number;
  predictedCost: number;
  confidence: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

interface Endpoint {
  id: string;
  name: string;
  url: string;
  network: 'mainnet' | 'devnet' | 'testnet';
  status: 'healthy' | 'degraded' | 'offline';
  latency: number;
  uptime: number;
  requests24h: number;
  created: string;
}

interface UsageData {
  time: string;
  requests: number;
  latency: number;
  errorRate: number;
  throughput: number;
}

interface SupportTicket {
  id: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  created: string;
  lastUpdate: string;
  category: 'technical' | 'billing' | 'general';
}

interface BillingData {
  currentPeriod: {
    start: string;
    end: string;
    usage: number;
    limit: number;
    cost: number;
  };
  plan: {
    name: string;
    cost: number;
    limit: number;
  };
  paymentMethod: {
    type: 'SOL' | 'USDC' | 'USDT';
    walletAddress: string;
  };
}

// Enhanced tab interface
interface DashboardTab {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
  color?: string;
}

export default function Dashboard() {
  // Ensure proper initialization order to prevent TDZ errors
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // API Keys State - Fetch from backend
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [isLoadingKeys, setIsLoadingKeys] = useState(true);

  // Endpoints State - Fetch from backend
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [isLoadingEndpoints, setIsLoadingEndpoints] = useState(true);
  
  const [showKey, setShowKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Usage data - fetch from backend
  const [usageData, setUsageData] = useState<UsageData[]>([]);
  const [isLoadingUsage, setIsLoadingUsage] = useState(true);

  // Performance metrics - fetch from backend
  const [performanceMetrics, setPerformanceMetrics] = useState<any>(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);

  // Billing data - Fetch from backend (moved before currentStats to fix TDZ error)
  const [billingData, setBillingData] = useState<BillingData | null>(null);
  const [isLoadingBilling, setIsLoadingBilling] = useState(true);

  // Current stats computed from real data - no fallback values
  const currentStats = {
    totalRequests: performanceMetrics?.totalRequests || 0,
    avgLatency: performanceMetrics?.avgLatency || 0,
    uptime: performanceMetrics?.uptime || 0,
    activeKeys: performanceMetrics?.activeKeys || apiKeys.filter(key => key.status === 'active').length,
    requestsToday: performanceMetrics?.usage?.requestsUsed || 0,
    errorRate: performanceMetrics?.errorRate || 0,
    throughput: performanceMetrics?.throughput || 0,
    activeEndpoints: endpoints.filter(ep => ep.status === 'healthy').length,
    costThisMonth: billingData?.currentPeriod?.cost || 0,
    usagePercentage: performanceMetrics?.usage ? (performanceMetrics.usage.requestsUsed / performanceMetrics.usage.rateLimit) * 100 : 0,
    successRate: performanceMetrics?.successRate || 0,
    // Remove Jito-specific fields that don't exist in backend
    // jitoBundles: performanceMetrics?.jitoBundles?.dailyVolume || 0,
    // jitoSuccess: performanceMetrics?.jitoBundles?.successRate || 0,
    // dailyProfit: performanceMetrics?.jitoBundles?.dailyProfit || 0
  };

  // Support tickets - fetch from backend
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(true);

  // Team data - fetch from backend API
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoadingTeam, setIsLoadingTeam] = useState(true);

  // Alert rules - fetch from backend
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(true);

  // Incidents - fetch from backend
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoadingIncidents, setIsLoadingIncidents] = useState(true);

  // Webhooks State - Fetch from backend
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [isLoadingWebhooks, setIsLoadingWebhooks] = useState(true);

  // Integrations - fetch from backend
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [isLoadingIntegrations, setIsLoadingIntegrations] = useState(true);

  const infrastructureConfig: InfrastructureConfig = {
    regions: ['us-east-1', 'us-west-2', 'eu-west-1'],
    loadBalancing: true,
    caching: true,
    cdnEnabled: true,
    autoScaling: {
      enabled: true,
      minNodes: 3,
      maxNodes: 50,
      targetCPU: 70
    },
    customDomains: ['api.n0de.pro', 'rpc.n0de.pro']
  };

  // Audit logs - fetch from backend
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [isLoadingAuditLogs, setIsLoadingAuditLogs] = useState(true);

  // Security events - fetch from backend
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [isLoadingSecurityEvents, setIsLoadingSecurityEvents] = useState(true);

  // Forecast data - fetch from backend
  const [forecastData, setForecastData] = useState<ForecastData[]>([]);
  const [isLoadingForecast, setIsLoadingForecast] = useState(true);

  // Enhanced tab configuration with enterprise features
  const tabs: DashboardTab[] = [
    { id: 'overview', label: 'Command Center', icon: Home, color: 'n0de-green' },
    { id: 'endpoints', label: 'Endpoints', icon: Server, badge: endpoints.length, color: 'n0de-blue' },
    { id: 'keys', label: 'API Keys', icon: Key, badge: apiKeys.length, color: 'n0de-purple' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, color: 'n0de-cyan' },
    { id: 'billing', label: 'Billing', icon: CreditCard, color: 'n0de-orange' },
    { id: 'developer', label: 'Dev Tools', icon: Code, color: 'n0de-pink' },
    { id: 'team', label: 'Team', icon: Users, badge: teamMembers.length, color: 'n0de-green' },
    { id: 'monitoring', label: 'Monitoring', icon: Radar, badge: incidents.filter(i => i.status !== 'resolved').length, color: 'n0de-red' },
    { id: 'security', label: 'Security', icon: ShieldCheck, badge: securityEvents.filter(e => !e.resolved).length, color: 'n0de-purple' },
    { id: 'integrations', label: 'Integrations', icon: Link, color: 'n0de-blue' },
    { id: 'infrastructure', label: 'Infrastructure', icon: Cloud, color: 'n0de-cyan' },
    { id: 'intelligence', label: 'Intelligence', icon: FileBarChart, color: 'n0de-orange' },
    { id: 'support', label: 'Support', icon: HelpCircle, badge: supportTickets.filter(t => t.status === 'open').length, color: 'n0de-red' }
  ];

  const copyToClipboard = (text: string, keyId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'healthy':
      case 'resolved':
        return 'text-n0de-green bg-n0de-green/20 border-n0de-green/30';
      case 'degraded':
      case 'in_progress':
      case 'rate_limited':
        return 'text-n0de-orange bg-n0de-orange/20 border-n0de-orange/30';
      case 'offline':
      case 'inactive':
      case 'open':
        return 'text-n0de-red bg-n0de-red/20 border-n0de-red/30';
      default:
        return 'text-text-muted bg-text-muted/20 border-text-muted/30';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <AlertTriangle className="w-4 h-4 text-n0de-red" />;
      case 'high':
        return <AlertCircle className="w-4 h-4 text-n0de-orange" />;
      case 'medium':
        return <Clock className="w-4 h-4 text-n0de-blue" />;
      default:
        return <CheckCircle className="w-4 h-4 text-n0de-green" />;
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch API keys
        setIsLoadingKeys(true);
        const keysResponse = await api.get<any>('/api-keys');
        setApiKeys(keysResponse || []);
        setIsLoadingKeys(false);

        // Fetch subscription and usage data
        setIsLoadingBilling(true);
        const usageResponse = await api.get<any>('/subscriptions/usage');
        if (usageResponse) {
          setBillingData({
            currentPeriod: {
              start: (() => {
                const date = getSafeDate(usageResponse.subscription.currentPeriodStart);
                return date ? date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
              })(),
              end: (() => {
                const date = getSafeDate(usageResponse.subscription.currentPeriodEnd);
                return date ? date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
              })(),
              usage: usageResponse.usage.requests.used,
              limit: usageResponse.usage.requests.limit === -1 ? Infinity : usageResponse.usage.requests.limit,
              cost: usageResponse.billing.amount
            },
            plan: {
              name: usageResponse.subscription.plan.name,
              cost: usageResponse.subscription.plan.price,
              limit: usageResponse.subscription.plan.limits.requests === -1 ? Infinity : usageResponse.subscription.plan.limits.requests
            },
            paymentMethod: {
              type: 'USDC',
              walletAddress: user?.email || 'Not configured'
            }
          });
        }
        setIsLoadingBilling(false);

        // Fetch usage statistics
        try {
          const usageStatsResponse = await api.get<any>('/usage');
          if (usageStatsResponse) {
            // Transform usage stats into chart data format
            const chartData = [{
              time: '00:00',
              requests: usageStatsResponse.requestsToday || 0,
              latency: usageStatsResponse.avgLatency || 0,
              errorRate: usageStatsResponse.errorRate || 0,
              throughput: usageStatsResponse.requestsToday ? usageStatsResponse.requestsToday / 24 : 0,
            }];
            setUsageData(chartData);
          }
        } catch (error) {
          console.error('Failed to fetch usage data:', error);
        }

        // Fetch dashboard metrics with real user data
        setIsLoadingMetrics(true);
        try {
          const dashboardMetricsResponse = await api.get<any>('/metrics/dashboard');
          console.log('Dashboard metrics received:', dashboardMetricsResponse);
          setPerformanceMetrics(dashboardMetricsResponse);
          
          // Process hourly stats for charts
          if (dashboardMetricsResponse?.hourlyStats?.length > 0) {
            const chartData = dashboardMetricsResponse.hourlyStats.map((stat: any) => ({
              time: `${stat.hour.toString().padStart(2, '0')}:00`,
              requests: stat.requests,
              latency: stat.latency,
              errorRate: stat.requests > 0 ? (stat.errors / stat.requests) * 100 : 0.00,
              throughput: Math.round(stat.requests / 3600 * 100) / 100, // per second
            }));
            setUsageData(chartData);
          }
        } catch (error) {
          console.error('Failed to fetch dashboard metrics:', error);
        }
        setIsLoadingMetrics(false);

        // Fetch webhooks
        setIsLoadingWebhooks(true);
        try {
          const webhooksResponse = await api.get<any>('/webhooks');
          setWebhooks(webhooksResponse || []);
        } catch (error) {
          console.error('Failed to fetch webhooks:', error);
        }
        setIsLoadingWebhooks(false);

        // Fetch team data
        setIsLoadingTeam(true);
        try {
          const teamResponse = await api.get<any>('/users/team');
          setTeamMembers(teamResponse || []);
        } catch (error) {
          console.error('Failed to fetch team data:', error);
          // No team data found - user is solo for now
          setTeamMembers([]);
        }
        setIsLoadingTeam(false);

        // Fetch endpoints data
        setIsLoadingEndpoints(true);
        try {
          const endpointsResponse = await api.get<any>('/endpoints');
          setEndpoints(endpointsResponse || []);
        } catch (error) {
          console.error('Failed to fetch endpoints:', error);
          // Fallback to default endpoints if API fails
          setEndpoints([
            {
              id: '1',
              name: 'Mainnet Primary',
              url: 'https://api.n0de.pro/mainnet',
              network: 'mainnet',
              status: 'healthy',
              latency: 1.8,
              uptime: 99.99,
              requests24h: performanceMetrics?.totalRequests || 0,
              created: '2025-01-01'
            }
          ]);
        }
        setIsLoadingEndpoints(false);

        // Support tickets - using empty array for now (endpoint not implemented)
        setIsLoadingTickets(true);
        setSupportTickets([]);
        setIsLoadingTickets(false);

        // Alert rules - using empty array for now (endpoint not implemented)
        setIsLoadingAlerts(true);
        setAlertRules([]);
        setIsLoadingAlerts(false);

        // Incidents - using empty array for now (endpoint not implemented)
        setIsLoadingIncidents(true);
        setIncidents([]);
        setIsLoadingIncidents(false);

        // Fetch integrations
        setIsLoadingIntegrations(true);
        try {
          const integrationsResponse = await api.get<any>('/integrations');
          setIntegrations(integrationsResponse || []);
        } catch (error) {
          console.error('Failed to fetch integrations:', error);
        }
        setIsLoadingIntegrations(false);

        // Audit logs - using empty array for now (endpoint not implemented)
        setIsLoadingAuditLogs(true);
        setAuditLogs([]);
        setIsLoadingAuditLogs(false);

        // Security events - using empty array for now (endpoint not implemented)
        setIsLoadingSecurityEvents(true);
        setSecurityEvents([]);
        setIsLoadingSecurityEvents(false);

        // Forecast data - using empty array for now (endpoint not implemented)
        setIsLoadingForecast(true);
        setForecastData([]);
        setIsLoadingForecast(false);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        setIsLoadingKeys(false);
        setIsLoadingWebhooks(false);
        setIsLoadingBilling(false);
        setIsLoadingMetrics(false);
        setIsLoadingUsage(false);
        setIsLoadingEndpoints(false);
        setIsLoadingTickets(false);
        setIsLoadingAlerts(false);
        setIsLoadingIncidents(false);
        setIsLoadingIntegrations(false);
        setIsLoadingAuditLogs(false);
        setIsLoadingSecurityEvents(false);
        setIsLoadingForecast(false);
      }
    };

    if (user) {
      fetchDashboardData();
    }
  }, [user, performanceMetrics?.totalRequests]);

  return (
    <div className="min-h-screen bg-bg-main text-text-primary">
      {/* Header */}
      <div className="bg-bg-elevated border-b border-border sticky top-0 z-40">
        <div className="container-width">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <motion.div 
                className="w-10 h-10 bg-gradient-to-r from-n0de-green to-n0de-blue rounded-lg flex items-center justify-center"
                whileHover={{ scale: 1.05, rotate: 5 }}
              >
                <span className="text-black font-bold text-lg">n</span>
              </motion.div>
              <div>
                <h1 className="text-2xl font-bold gradient-text">Welcome, {user?.firstName || user?.username || 'User'}</h1>
                <p className="text-xs text-text-secondary">Your Enterprise RPC Dashboard</p>
              </div>
            </div>
            
            {/* Header Actions */}
            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search dashboard..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-bg-main border border-border rounded-lg text-sm focus:ring-2 focus:ring-n0de-green/20 focus:border-n0de-green transition-colors w-64"
                />
              </div>

              {/* System Status */}
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-n0de-green rounded-full animate-pulse" />
                <span className="text-sm text-text-secondary">All systems operational</span>
              </div>
              
              {/* Notifications */}
              <motion.button 
                className="p-2 hover:bg-bg-hover rounded-lg relative"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-xs flex items-center justify-center text-white">2</span>
              </motion.button>

              {/* Upgrade Button */}
              <motion.button 
                className="btn-primary"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push('/subscription')}
              >
                Upgrade Plan
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      <div className="container-width py-8">
        {/* Enhanced Tab Navigation */}
        <div className="flex flex-wrap gap-2 bg-bg-elevated border border-border rounded-xl p-2 mb-8 overflow-x-auto">
          {tabs.map((tab) => (
            <motion.button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? `bg-gradient-to-r from-${tab.color}/20 to-${tab.color}/10 text-${tab.color} border border-${tab.color}/30`
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge && tab.badge > 0 && (
                <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                  activeTab === tab.id 
                    ? `bg-${tab.color}/20 text-${tab.color}` 
                    : 'bg-n0de-blue/20 text-n0de-blue'
                }`}>
                  {tab.badge}
                </span>
              )}
            </motion.button>
          ))}
        </div>

        {/* Command Center - Overview Tab */}
        {activeTab === 'overview' && (
          <MetricsOverview
            currentStats={currentStats}
            usageData={usageData}
            isLoadingMetrics={isLoadingMetrics}
          />
        )}

        {/* TEMP - Old overview content removed */}
        {false && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { 
                  title: 'Total Requests', 
                  value: currentStats.totalRequests.toLocaleString(),
                  change: '+12.5%',
                  icon: Activity,
                  color: 'n0de-green'
                },
                { 
                  title: 'Avg Latency', 
                  value: `${currentStats.avgLatency}ms`,
                  change: '-8.2%',
                  icon: Gauge,
                  color: 'n0de-blue'
                },
                { 
                  title: 'Uptime', 
                  value: `${currentStats.uptime}%`,
                  change: '99.99%',
                  icon: Shield,
                  color: 'n0de-purple'
                },
                { 
                  title: 'Active Keys', 
                  value: currentStats.activeKeys.toString(),
                  change: `${currentStats.activeEndpoints} endpoints`,
                  icon: Key,
                  color: 'n0de-cyan'
                }
              ].map((metric, index) => (
                <motion.div
                  key={metric.title}
                  className="card group cursor-pointer"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -5, scale: 1.02 }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-text-secondary">{metric.title}</h3>
                    <metric.icon className={`w-5 h-5 text-${metric.color}`} />
                  </div>
                  <div className="text-3xl font-bold gradient-text mb-2">
                    {metric.value}
                  </div>
                  <div className={`text-sm text-${metric.color}`}>
                    {metric.change}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Jito Bundle Performance Section */}
            <div className="card bg-gradient-to-r from-n0de-green/10 via-n0de-blue/5 to-n0de-green/5 border-n0de-green/30">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-n0de-green">Jito Bundle Network Performance</h3>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-n0de-green rounded-full animate-pulse"></div>
                  <span className="text-sm text-n0de-green font-medium">Live Data</span>
                </div>
              </div>
              
              {/* Jito-specific metrics section removed - not supported in current backend */}
              
              <div className="mt-6 p-4 bg-n0de-green/5 rounded-lg border border-n0de-green/20">
                <div className="flex items-center gap-3 mb-2">
                  <Shield className="w-5 h-5 text-n0de-green" />
                  <span className="font-semibold text-n0de-green">MEV Protection Active</span>
                </div>
                <p className="text-sm text-gray-300">
                  Direct integration with Jito&apos;s bundle network provides atomic transaction execution and MEV protection. 
                  Your transactions are bundled and executed with priority, ensuring optimal performance and protection from MEV attacks.
                </p>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Request Volume Chart */}
              <div className="card">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold">Request Volume (24h)</h3>
                  <div className="flex items-center space-x-4">
                    <button className="p-2 hover:bg-bg-hover rounded-lg">
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button className="p-2 hover:bg-bg-hover rounded-lg">
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={usageData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2B2B2B" />
                      <XAxis dataKey="time" stroke="#808080" />
                      <YAxis stroke="#808080" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1A1A1A', 
                          border: '1px solid #2B2B2B',
                          borderRadius: '8px'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="requests" 
                        stroke="#00FF88" 
                        fill="#00FF88"
                        fillOpacity={0.2}
                        strokeWidth={3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="card">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold">Performance Overview</h3>
                  <select className="bg-bg-main border border-border rounded-lg px-3 py-1 text-sm">
                    <option>Last 24h</option>
                    <option>Last 7d</option>
                    <option>Last 30d</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Throughput', value: `${currentStats.throughput.toLocaleString()}+ RPS`, color: 'n0de-green' },
                    { label: 'Error Rate', value: `${currentStats.errorRate}%`, color: 'n0de-green' },
                    { label: 'P99 Latency', value: '<2ms', color: 'n0de-blue' },
                    { label: 'Success Rate', value: `${currentStats.successRate}%`, color: 'n0de-green' }
                  ].map((item) => (
                    <div key={item.label} className="text-center p-4 bg-bg-main rounded-lg">
                      <div className={`text-2xl font-bold text-${item.color} mb-1`}>
                        {item.value}
                      </div>
                      <div className="text-sm text-text-secondary">{item.label}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Monthly Usage</span>
                    <span className="text-sm text-n0de-green">{currentStats.usagePercentage}%</span>
                  </div>
                  <div className="w-full bg-bg-main rounded-full h-2">
                    <motion.div 
                      className="bg-gradient-to-r from-n0de-green to-n0de-blue h-2 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${currentStats.usagePercentage}%` }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="card">
              <h3 className="text-xl font-bold mb-6">Recent Activity</h3>
              <div className="space-y-4">
                {[
                  { action: 'API Key created', resource: 'Analytics Service', time: '5 minutes ago', status: 'success' },
                  { action: 'High latency detected', resource: 'Mainnet Backup', time: '12 minutes ago', status: 'warning' },
                  { action: 'Rate limit reached', resource: 'Development', time: '1 hour ago', status: 'error' },
                  { action: 'Endpoint updated', resource: 'Mainnet Primary', time: '2 hours ago', status: 'success' }
                ].map((activity, index) => (
                  <motion.div 
                    key={index}
                    className="flex items-center justify-between p-4 bg-bg-main rounded-lg hover:bg-bg-hover transition-colors"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${
                        activity.status === 'success' ? 'bg-n0de-green' :
                        activity.status === 'warning' ? 'bg-n0de-orange' : 'bg-n0de-red'
                      }`} />
                      <div>
                        <div className="font-medium">{activity.action}</div>
                        <div className="text-sm text-text-secondary">{activity.resource}</div>
                      </div>
                    </div>
                    <div className="text-sm text-text-muted">{activity.time}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Endpoints Tab */}
        {activeTab === 'endpoints' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">RPC Endpoints</h2>
              <button className="btn-primary flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>Add Endpoint</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {endpoints.map((endpoint) => (
                <motion.div 
                  key={endpoint.id}
                  className="card group"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ y: -5 }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        endpoint.status === 'healthy' ? 'bg-n0de-green' :
                        endpoint.status === 'degraded' ? 'bg-n0de-orange' : 'bg-n0de-red'
                      }`} />
                      <h3 className="font-bold text-lg">{endpoint.name}</h3>
                    </div>
                    <button className="p-1 opacity-0 group-hover:opacity-100 hover:bg-bg-hover rounded transition-all">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-text-secondary">Network</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        endpoint.network === 'mainnet' ? 'bg-n0de-green/20 text-n0de-green' :
                        endpoint.network === 'devnet' ? 'bg-n0de-blue/20 text-n0de-blue' :
                        'bg-n0de-purple/20 text-n0de-purple'
                      }`}>
                        {endpoint.network}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-text-secondary">Latency</span>
                      <span className="font-semibold">{endpoint.latency}ms</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-text-secondary">Uptime</span>
                      <span className="font-semibold text-n0de-green">{endpoint.uptime}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-text-secondary">24h Requests</span>
                      <span className="font-semibold">{endpoint.requests24h.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <code className="text-xs bg-bg-main px-2 py-1 rounded font-mono text-n0de-cyan">
                      {endpoint.url}
                    </code>
                    <button className="p-1 hover:bg-bg-hover rounded">
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Enhanced API Keys Tab */}
        {activeTab === 'keys' && (
          <ApiKeyManager />
        )}

        {/* TEMP - Old keys content removed */}
        {false && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">API Key Management</h2>
              <button className="btn-primary flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>Create New Key</span>
              </button>
            </div>

            <div className="space-y-4">
              {apiKeys.map((key) => (
                <motion.div 
                  key={key.id} 
                  className="card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.01 }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <h3 className="font-bold text-lg">{key.name}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(key.status)}`}>
                          {key.status.replace('_', ' ')}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          key.network === 'mainnet' ? 'bg-n0de-green/20 text-n0de-green' :
                          key.network === 'devnet' ? 'bg-n0de-blue/20 text-n0de-blue' :
                          'bg-n0de-purple/20 text-n0de-purple'
                        }`}>
                          {key.network}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <span className="text-text-secondary text-sm">Created</span>
                          <div className="font-medium">{key.created}</div>
                        </div>
                        <div>
                          <span className="text-text-secondary text-sm">Last Used</span>
                          <div className="font-medium">{key.lastUsed}</div>
                        </div>
                        <div>
                          <span className="text-text-secondary text-sm">Requests</span>
                          <div className="font-medium">{key.requests.toLocaleString()}</div>
                        </div>
                        <div>
                          <span className="text-text-secondary text-sm">Rate Limit</span>
                          <div className="font-medium">{key.rateLimit.toLocaleString()}/min</div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 mb-4">
                        <span className="text-sm font-medium text-text-secondary">Permissions:</span>
                        {key.permissions.map((permission) => (
                          <span key={permission} className="px-2 py-1 bg-n0de-blue/20 text-n0de-blue text-xs rounded">
                            {permission}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center space-x-2">
                        <div className="font-mono text-sm bg-bg-main px-4 py-3 rounded-lg border border-border flex-1">
                          {showKey === key.id ? key.key : key.key.replace(/(?<=.{15}).(?=.{8})/g, '•')}
                        </div>
                        <button
                          onClick={() => setShowKey(showKey === key.id ? null : key.id)}
                          className="p-3 hover:bg-bg-hover rounded-lg transition-colors"
                        >
                          {showKey === key.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => copyToClipboard(key.key, key.id)}
                          className="p-3 hover:bg-bg-hover rounded-lg transition-colors"
                        >
                          {copiedKey === key.id ? (
                            <CheckCircle className="w-4 h-4 text-n0de-green" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                        <button className="p-3 hover:bg-bg-hover rounded-lg transition-colors">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button className="p-3 hover:bg-n0de-red/20 text-n0de-red rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Analytics Tab - Enhanced */}
        {activeTab === 'analytics' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Analytics & Insights</h2>
              <div className="flex items-center space-x-3">
                <select className="bg-bg-elevated border border-border rounded-lg px-3 py-2">
                  <option>Last 24h</option>
                  <option>Last 7d</option>
                  <option>Last 30d</option>
                </select>
                <button className="btn-secondary flex items-center space-x-2">
                  <Download className="w-4 h-4" />
                  <span>Export</span>
                </button>
              </div>
            </div>

            {/* Analytics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Request Distribution */}
              <div className="card">
                <h3 className="text-lg font-semibold mb-4">Method Distribution</h3>
                <div className="space-y-4">
                  {[
                    { method: 'getAccountInfo', percentage: 34.2, requests: 847291 },
                    { method: 'getTokenAccounts', percentage: 28.7, requests: 692847 },
                    { method: 'getTransaction', percentage: 18.4, requests: 445892 },
                    { method: 'sendTransaction', percentage: 12.1, requests: 293847 },
                    { method: 'Other Methods', percentage: 6.6, requests: 159823 }
                  ].map((item) => (
                    <div key={item.method} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium">{item.method}</span>
                          <span className="text-sm text-text-secondary">{item.percentage}%</span>
                        </div>
                        <div className="w-full bg-bg-main rounded-full h-2">
                          <motion.div 
                            className="bg-gradient-to-r from-n0de-cyan to-n0de-blue h-2 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${item.percentage}%` }}
                            transition={{ duration: 1, delay: 0.2 }}
                          />
                        </div>
                        <div className="text-xs text-text-muted mt-1">{item.requests.toLocaleString()} requests</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Error Analysis */}
              <div className="card">
                <h3 className="text-lg font-semibold mb-4">Error Analysis</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart data={usageData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2B2B2B" />
                      <XAxis dataKey="time" stroke="#808080" />
                      <YAxis stroke="#808080" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1A1A1A', 
                          border: '1px solid #2B2B2B',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="errorRate" fill="#FF6B6B" />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Performance Trends */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Performance Trends</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={usageData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2B2B2B" />
                    <XAxis dataKey="time" stroke="#808080" />
                    <YAxis stroke="#808080" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1A1A1A', 
                        border: '1px solid #2B2B2B',
                        borderRadius: '8px'
                      }}
                    />
                    <Line type="monotone" dataKey="latency" stroke="#00D2FF" strokeWidth={2} />
                    <Line type="monotone" dataKey="throughput" stroke="#00FF88" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>
        )}

        {/* Billing Tab */}
        {activeTab === 'billing' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Billing & Usage</h2>
              <div className="flex items-center space-x-3">
                <button className="btn-secondary flex items-center space-x-2">
                  <Download className="w-4 h-4" />
                  <span>Download Invoice</span>
                </button>
                <button 
                  onClick={() => router.push('/subscription')}
                  className="btn-primary flex items-center space-x-2"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Upgrade Plan</span>
                </button>
              </div>
            </div>

            {/* Billing Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* Current Usage */}
                <div className="card">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold">Current Usage</h3>
                    <span className="text-sm text-text-secondary">January 2025</span>
                  </div>

                  <div className="space-y-6">
                    {/* Usage Progress */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">API Requests</span>
                        <span className="text-n0de-green font-semibold">
                          {currentStats.totalRequests.toLocaleString()} / 5,000,000
                        </span>
                      </div>
                      <div className="w-full bg-bg-main rounded-full h-3">
                        <motion.div 
                          className="bg-gradient-to-r from-n0de-green to-n0de-blue h-3 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${(currentStats.totalRequests / 5000000) * 100}%` }}
                          transition={{ duration: 1.5, ease: "easeOut" }}
                        />
                      </div>
                      <div className="text-sm text-text-muted mt-1">
                        {((currentStats.totalRequests / 5000000) * 100).toFixed(1)}% of monthly limit
                      </div>
                    </div>

                    {/* Cost Breakdown */}
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold mb-3">This Month</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-text-secondary">Base Plan</span>
                            <span>{billingData?.plan.cost || 0} USDC</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-secondary">Overage</span>
                            <span>0 USDC</span>
                          </div>
                          <div className="border-t border-border pt-2 mt-2">
                            <div className="flex justify-between font-semibold">
                              <span>Total</span>
                              <span className="text-n0de-green">{billingData?.plan.cost || 0} USDC</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-3">Next Billing</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-text-secondary">Date</span>
                            <span>{billingData?.currentPeriod.end || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-secondary">Amount</span>
                            <span>{billingData?.plan.cost || 0} USDC</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-secondary">Wallet</span>
                            <span className="font-mono text-sm">7xKJ...8mN2</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Usage History Chart */}
                <div className="card">
                  <h3 className="text-lg font-semibold mb-4">Usage History</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={usageData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2B2B2B" />
                        <XAxis dataKey="time" stroke="#808080" />
                        <YAxis stroke="#808080" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1A1A1A', 
                            border: '1px solid #2B2B2B',
                            borderRadius: '8px'
                          }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="requests" 
                          stroke="#00D2FF" 
                          fill="#00D2FF"
                          fillOpacity={0.2}
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Billing Sidebar */}
              <div className="space-y-6">
                {/* Current Plan */}
                <div className="card">
                  <h3 className="text-lg font-semibold mb-4">Current Plan</h3>
                  <div className="text-center mb-4">
                    <div className="text-2xl font-bold text-n0de-green mb-1">Professional</div>
                    <div className="text-3xl font-bold mb-2">299<span className="text-lg text-text-secondary"> USDC/month</span></div>
                    <div className="text-sm text-text-secondary">5M requests/month</div>
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-n0de-green" />
                      <span className="text-sm">25,000 RPS</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-n0de-green" />
                      <span className="text-sm">WebSocket Support</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-n0de-green" />
                      <span className="text-sm">Priority Support</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-n0de-green" />
                      <span className="text-sm">99.99% Uptime SLA</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => router.push('/subscription')}
                    className="btn-secondary w-full mb-2"
                  >
                    Upgrade Plan
                  </button>
                  <button className="text-n0de-red text-sm hover:underline w-full">Cancel Plan</button>
                </div>

                {/* Crypto Wallet */}
                <div className="card">
                  <h3 className="text-lg font-semibold mb-4">Payment Wallet</h3>
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-r from-n0de-green to-n0de-blue rounded flex items-center justify-center">
                      <span className="text-black font-bold text-sm">₿</span>
                    </div>
                    <div>
                      <div className="font-medium font-mono text-sm">7xKJfQAP...Bx7A8mN2</div>
                      <div className="text-sm text-text-secondary flex items-center space-x-2">
                        <span className="w-2 h-2 bg-n0de-green rounded-full"></span>
                        <span>USDC Balance: $1,247.50</span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button className="btn-secondary text-sm">Change Wallet</button>
                    <button className="btn-secondary text-sm">Add Funds</button>
                  </div>
                </div>

                {/* Supported Tokens */}
                <div className="card">
                  <h3 className="text-lg font-semibold mb-4">Accepted Tokens</h3>
                  <div className="space-y-3">
                    {[
                      { token: 'USDC', icon: '◎', status: 'preferred', color: 'n0de-green' },
                      { token: 'USDT', icon: '₮', status: 'accepted', color: 'n0de-blue' },
                      { token: 'SOL', icon: '◉', status: 'accepted', color: 'n0de-purple' }
                    ].map((payment) => (
                      <div key={payment.token} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{payment.icon}</span>
                          <span className="font-medium text-sm">{payment.token}</span>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium bg-${payment.color}/20 text-${payment.color}`}>
                          {payment.status}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-3 bg-n0de-green/10 border border-n0de-green/20 rounded-lg">
                    <div className="text-xs text-n0de-green font-medium">💡 Auto-Pay Available</div>
                    <div className="text-xs text-text-secondary mt-1">Set up automatic USDC payments from your wallet</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Developer Tools Tab */}
        {activeTab === 'developer' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Developer Tools</h2>
              <div className="flex items-center space-x-3">
                <button className="btn-secondary flex items-center space-x-2">
                  <FileText className="w-4 h-4" />
                  <span>API Docs</span>
                </button>
                <button className="btn-primary flex items-center space-x-2">
                  <Terminal className="w-4 h-4" />
                  <span>Test Endpoint</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* API Testing */}
              <div className="card">
                <h3 className="text-lg font-semibold mb-4">API Testing</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Endpoint</label>
                    <select className="w-full bg-bg-main border border-border rounded-lg px-3 py-2">
                      <option>https://api.n0de.com/mainnet</option>
                      <option>https://api.n0de.com/devnet</option>
                      <option>https://api.n0de.com/testnet</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Method</label>
                    <select className="w-full bg-bg-main border border-border rounded-lg px-3 py-2">
                      <option>getAccountInfo</option>
                      <option>getBalance</option>
                      <option>getTransaction</option>
                      <option>sendTransaction</option>
                      <option>getTokenAccounts</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Parameters</label>
                    <textarea 
                      className="w-full bg-bg-main border border-border rounded-lg px-3 py-2 h-32 font-mono text-sm"
                      placeholder='{\n  "account": "11111111111111111111111111111112",\n  "encoding": "base64"\n}'
                    />
                  </div>
                  <button className="btn-primary w-full">Send Request</button>
                </div>
              </div>

              {/* Response */}
              <div className="card">
                <h3 className="text-lg font-semibold mb-4">Response</h3>
                <div className="bg-bg-main border border-border rounded-lg p-4 h-80 overflow-auto">
                  <pre className="text-sm font-mono text-n0de-cyan">
{`{
  "jsonrpc": "2.0",
  "result": {
    "context": {
      "slot": 1234567890
    },
    "value": {
      "data": [
        "base64encodeddata...",
        "base64"
      ],
      "executable": false,
      "lamports": 1000000000,
      "owner": "11111111111111111111111111111112",
      "rentEpoch": 18446744073709551615
    }
  },
  "id": 1
}`}
                  </pre>
                </div>
                <div className="mt-4 flex items-center justify-between text-sm text-text-secondary">
                  <span>Response time: 8.2ms</span>
                  <button className="text-n0de-cyan hover:underline">Copy Response</button>
                </div>
              </div>
            </div>

            {/* Code Examples */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Code Examples</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { name: 'JavaScript', lang: 'javascript', code: `const response = await fetch('https://api.n0de.com/mainnet', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_API_KEY'
  },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'getAccountInfo',
    params: ['11111111111111111111111111111112']
  })
});` },
                  { name: 'Python', lang: 'python', code: `import requests

url = 'https://api.n0de.com/mainnet'
headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_API_KEY'
}
data = {
    'jsonrpc': '2.0',
    'id': 1,
    'method': 'getAccountInfo',
    'params': ['11111111111111111111111111111112']
}

response = requests.post(url, json=data, headers=headers)` },
                  { name: 'cURL', lang: 'bash', code: `curl -X POST https://api.n0de.com/mainnet \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "getAccountInfo",
    "params": ["11111111111111111111111111111112"]
  }'` }
                ].map((example) => (
                  <div key={example.name} className="bg-bg-main border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">{example.name}</h4>
                      <button className="text-n0de-cyan hover:underline text-sm">Copy</button>
                    </div>
                    <pre className="text-xs text-text-secondary overflow-x-auto">
                      {example.code}
                    </pre>
                  </div>
                ))}
              </div>
            </div>

            {/* SDK Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="card">
                <h3 className="text-lg font-semibold mb-4">Official SDKs</h3>
                <div className="space-y-3">
                  {[
                    { name: 'JavaScript/TypeScript', npm: '@n0de/sdk', stars: '1.2k' },
                    { name: 'Python', pip: 'n0de-python', stars: '876' },
                    { name: 'Rust', crate: 'n0de-rust', stars: '654' },
                    { name: 'Go', module: 'github.com/n0de/go-sdk', stars: '432' }
                  ].map((sdk) => (
                    <div key={sdk.name} className="flex items-center justify-between p-3 bg-bg-main rounded-lg">
                      <div>
                        <div className="font-medium">{sdk.name}</div>
                        <div className="text-sm text-text-secondary">
                          {sdk.npm && `npm install ${sdk.npm}`}
                          {sdk.pip && `pip install ${sdk.pip}`}
                          {sdk.crate && `cargo add ${sdk.crate}`}
                          {sdk.module && `go get ${sdk.module}`}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-n0de-cyan">{sdk.stars} ★</span>
                        <button className="text-n0de-cyan hover:underline text-sm">Install</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
                <div className="space-y-3">
                  {[
                    { name: 'API Documentation', icon: FileText },
                    { name: 'Rate Limits', icon: Gauge },
                    { name: 'WebSocket Streams', icon: Zap },
                    { name: 'Status Page', icon: Activity },
                    { name: 'GitHub Examples', icon: Code },
                    { name: 'Discord Community', icon: Users }
                  ].map((link) => (
                    <button key={link.name} className="w-full text-left p-3 hover:bg-bg-hover rounded-lg flex items-center justify-between group">
                      <div className="flex items-center space-x-3">
                        <link.icon className="w-4 h-4 text-n0de-blue" />
                        <span>{link.name}</span>
                      </div>
                      <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Support Tab */}
        {activeTab === 'support' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Support Center</h2>
              <button className="btn-primary flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>New Ticket</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-lg font-semibold">Recent Tickets</h3>
                {supportTickets.map((ticket) => (
                  <motion.div 
                    key={ticket.id}
                    className="card"
                    whileHover={{ scale: 1.01 }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        {getPriorityIcon(ticket.priority)}
                        <div>
                          <h4 className="font-semibold">{ticket.subject}</h4>
                          <p className="text-sm text-text-secondary">#{ticket.id} • {ticket.category}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                        {ticket.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-text-muted">
                      <span>Created: {ticket.created}</span>
                      <span>Updated: {ticket.lastUpdate}</span>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="space-y-6">
                <div className="card">
                  <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                  <div className="space-y-3">
                    <button className="w-full text-left p-3 hover:bg-bg-hover rounded-lg flex items-center space-x-3">
                      <FileText className="w-4 h-4" />
                      <span>API Documentation</span>
                    </button>
                    <button className="w-full text-left p-3 hover:bg-bg-hover rounded-lg flex items-center space-x-3">
                      <Terminal className="w-4 h-4" />
                      <span>Test Endpoints</span>
                    </button>
                    <button className="w-full text-left p-3 hover:bg-bg-hover rounded-lg flex items-center space-x-3">
                      <Bookmark className="w-4 h-4" />
                      <span>Status Page</span>
                    </button>
                  </div>
                </div>

                <div className="card">
                  <h3 className="text-lg font-semibold mb-4">Contact Support</h3>
                  <p className="text-sm text-text-secondary mb-4">
                    Need immediate assistance? Our team is available 24/7.
                  </p>
                  <button className="btn-primary w-full">Chat with Support</button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Team Management Tab */}
        {activeTab === 'team' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Team Management</h2>
              <div className="flex items-center space-x-3">
                <button className="btn-secondary flex items-center space-x-2">
                  <Settings className="w-4 h-4" />
                  <span>Organization Settings</span>
                </button>
                <button className="btn-primary flex items-center space-x-2">
                  <UserPlus className="w-4 h-4" />
                  <span>Invite Member</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-3 space-y-6">
                {/* Team Members List */}
                <div className="card">
                  <h3 className="text-lg font-semibold mb-4">Team Members</h3>
                  <div className="space-y-3">
                    {teamMembers.map((member) => (
                      <motion.div 
                        key={member.id}
                        className="flex items-center justify-between p-4 bg-bg-main rounded-lg hover:bg-bg-hover transition-colors"
                        whileHover={{ scale: 1.01 }}
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-gradient-to-r from-n0de-green to-n0de-blue rounded-full flex items-center justify-center">
                            <span className="text-black font-bold text-sm">
                              {member.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">{member.name}</span>
                              {member.role === 'admin' && <Crown className="w-4 h-4 text-n0de-orange" />}
                            </div>
                            <div className="text-sm text-text-secondary">{member.email}</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <div className={`px-2 py-1 rounded text-xs font-medium ${
                              member.role === 'admin' ? 'bg-n0de-orange/20 text-n0de-orange' :
                              member.role === 'developer' ? 'bg-n0de-blue/20 text-n0de-blue' :
                              'bg-n0de-purple/20 text-n0de-purple'
                            }`}>
                              {member.role}
                            </div>
                            <div className="text-xs text-text-muted mt-1">{member.lastActive}</div>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(member.status)}`}>
                            {member.status}
                          </span>
                          <button className="p-2 hover:bg-bg-hover rounded-lg">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Role Permissions */}
                <div className="card">
                  <h3 className="text-lg font-semibold mb-4">Role Permissions</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-4">Permission</th>
                          <th className="text-center py-3 px-4">Admin</th>
                          <th className="text-center py-3 px-4">Developer</th>
                          <th className="text-center py-3 px-4">Viewer</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { name: 'View Dashboard', admin: true, developer: true, viewer: true },
                          { name: 'Manage API Keys', admin: true, developer: true, viewer: false },
                          { name: 'View Analytics', admin: true, developer: true, viewer: true },
                          { name: 'Manage Billing', admin: true, developer: false, viewer: false },
                          { name: 'Team Management', admin: true, developer: false, viewer: false },
                          { name: 'Security Settings', admin: true, developer: false, viewer: false },
                          { name: 'Audit Logs', admin: true, developer: false, viewer: false }
                        ].map((perm) => (
                          <tr key={perm.name} className="border-b border-border/50">
                            <td className="py-3 px-4 font-medium">{perm.name}</td>
                            <td className="text-center py-3 px-4">
                              {perm.admin ? <CheckCircle className="w-5 h-5 text-n0de-green mx-auto" /> : '-'}
                            </td>
                            <td className="text-center py-3 px-4">
                              {perm.developer ? <CheckCircle className="w-5 h-5 text-n0de-green mx-auto" /> : '-'}
                            </td>
                            <td className="text-center py-3 px-4">
                              {perm.viewer ? <CheckCircle className="w-5 h-5 text-n0de-green mx-auto" /> : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {/* Quick Stats */}
                <div className="card">
                  <h3 className="text-lg font-semibold mb-4">Team Stats</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-text-secondary">Total Members</span>
                      <span className="font-bold text-n0de-green">{teamMembers.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-text-secondary">Active</span>
                      <span className="font-bold">{teamMembers.filter(m => m.status === 'active').length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-text-secondary">Pending</span>
                      <span className="font-bold text-n0de-orange">{teamMembers.filter(m => m.status === 'pending').length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-text-secondary">Admins</span>
                      <span className="font-bold">{teamMembers.filter(m => m.role === 'admin').length}</span>
                    </div>
                  </div>
                </div>

                {/* Organization Settings */}
                <div className="card">
                  <h3 className="text-lg font-semibold mb-4">Organization</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Organization Name</label>
                      <input 
                        type="text" 
                        value="Your Organization"
                        className="w-full bg-bg-main border border-border rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Domain</label>
                      <input 
                        type="text" 
                        value="yourcompany.com"
                        className="w-full bg-bg-main border border-border rounded-lg px-3 py-2"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">SSO Enabled</span>
                      <input type="checkbox" className="rounded" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">2FA Required</span>
                      <input type="checkbox" className="rounded" defaultChecked />
                    </div>
                    <button className="btn-primary w-full">Save Changes</button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Advanced Monitoring Tab */}
        {activeTab === 'monitoring' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Advanced Monitoring</h2>
              <div className="flex items-center space-x-3">
                <button className="btn-secondary flex items-center space-x-2">
                  <MonitorSpeaker className="w-4 h-4" />
                  <span>Notification Settings</span>
                </button>
                <button className="btn-primary flex items-center space-x-2">
                  <Plus className="w-4 h-4" />
                  <span>Create Alert</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* Active Incidents */}
                <div className="card">
                  <h3 className="text-lg font-semibold mb-4">Active Incidents</h3>
                  <div className="space-y-4">
                    {incidents.filter(i => i.status !== 'resolved').map((incident) => (
                      <motion.div 
                        key={incident.id}
                        className="p-4 bg-bg-main rounded-lg border-l-4 border-l-n0de-red"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            {incident.severity === 'critical' ? 
                              <AlertTriangle className="w-5 h-5 text-n0de-red" /> :
                              incident.severity === 'high' ? 
                              <AlertCircle className="w-5 h-5 text-n0de-orange" /> :
                              <Clock className="w-5 h-5 text-n0de-blue" />
                            }
                            <div>
                              <h4 className="font-semibold">{incident.title}</h4>
                              <p className="text-sm text-text-secondary">{incident.description}</p>
                            </div>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(incident.status)}`}>
                            {incident.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm text-text-muted">
                          <span>Created: {incident.created}</span>
                          <div className="flex items-center space-x-2">
                            <span>Affected: {incident.affectedServices.join(', ')}</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Alert Rules */}
                <div className="card">
                  <h3 className="text-lg font-semibold mb-4">Alert Rules</h3>
                  <div className="space-y-3">
                    {alertRules.map((rule) => (
                      <div key={rule.id} className="flex items-center justify-between p-4 bg-bg-main rounded-lg">
                        <div className="flex items-center space-x-3">
                          {rule.status === 'active' ? 
                            <Play className="w-4 h-4 text-n0de-green" /> : 
                            <Pause className="w-4 h-4 text-text-muted" />
                          }
                          <div>
                            <div className="font-medium">{rule.name}</div>
                            <div className="text-sm text-text-secondary">{rule.condition}</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            rule.severity === 'critical' ? 'bg-n0de-red/20 text-n0de-red' :
                            rule.severity === 'high' ? 'bg-n0de-orange/20 text-n0de-orange' :
                            rule.severity === 'medium' ? 'bg-n0de-blue/20 text-n0de-blue' :
                            'bg-n0de-green/20 text-n0de-green'
                          }`}>
                            {rule.severity}
                          </span>
                          <div className="text-sm text-text-muted">
                            {rule.lastTriggered ? `Last: ${rule.lastTriggered}` : 'Never triggered'}
                          </div>
                          <button className="p-1 hover:bg-bg-hover rounded">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {/* System Health */}
                <div className="card">
                  <h3 className="text-lg font-semibold mb-4">System Health</h3>
                  <div className="space-y-4">
                    {[
                      { service: 'API Gateway', status: 'healthy', uptime: '99.99%' },
                      { service: 'Database', status: 'healthy', uptime: '99.97%' },
                      { service: 'Cache Layer', status: 'degraded', uptime: '99.85%' },
                      { service: 'Load Balancer', status: 'healthy', uptime: '100%' }
                    ].map((service) => (
                      <div key={service.service} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${
                            service.status === 'healthy' ? 'bg-n0de-green' :
                            service.status === 'degraded' ? 'bg-n0de-orange' : 'bg-n0de-red'
                          }`} />
                          <span className="text-sm font-medium">{service.service}</span>
                        </div>
                        <span className="text-sm text-text-secondary">{service.uptime}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Alert Channels */}
                <div className="card">
                  <h3 className="text-lg font-semibold mb-4">Alert Channels</h3>
                  <div className="space-y-3">
                    {[
                      { name: 'Email', type: 'email', enabled: true, icon: Mail },
                      { name: 'Slack', type: 'slack', enabled: true, icon: Slack },
                      { name: 'PagerDuty', type: 'pagerduty', enabled: true, icon: Phone },
                      { name: 'Discord', type: 'discord', enabled: false, icon: MessageSquare }
                    ].map((channel) => (
                      <div key={channel.type} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <channel.icon className="w-4 h-4" />
                          <span className="text-sm font-medium">{channel.name}</span>
                        </div>
                        <input 
                          type="checkbox" 
                          className="rounded" 
                          defaultChecked={channel.enabled} 
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Alerts */}
                <div className="card">
                  <h3 className="text-lg font-semibold mb-4">Recent Alerts</h3>
                  <div className="space-y-2 text-sm">
                    <div className="text-n0de-red">• High latency detected - 14:30</div>
                    <div className="text-n0de-orange">• Usage 85% - 12:45</div>
                    <div className="text-n0de-green">• System recovered - 09:15</div>
                    <div className="text-n0de-blue">• Maintenance window - 02:00</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Security & Compliance Tab */}
        {activeTab === 'security' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Security & Compliance</h2>
              <div className="flex items-center space-x-3">
                <button className="btn-secondary flex items-center space-x-2">
                  <FileBarChart className="w-4 h-4" />
                  <span>Generate Report</span>
                </button>
                <button className="btn-primary flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Security Scan</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* Security Events */}
                <div className="card">
                  <h3 className="text-lg font-semibold mb-4">Security Events</h3>
                  <div className="space-y-4">
                    {securityEvents.map((event) => (
                      <motion.div 
                        key={event.id}
                        className="flex items-center justify-between p-4 bg-bg-main rounded-lg"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                      >
                        <div className="flex items-center space-x-3">
                          {event.severity === 'critical' ? 
                            <AlertTriangle className="w-5 h-5 text-n0de-red" /> :
                            event.severity === 'high' ? 
                            <AlertCircle className="w-5 h-5 text-n0de-orange" /> :
                            <Shield className="w-5 h-5 text-n0de-blue" />
                          }
                          <div>
                            <div className="font-medium capitalize">{event.type.replace('_', ' ')}</div>
                            <div className="text-sm text-text-secondary">{event.details}</div>
                            <div className="text-xs text-text-muted">{event.timestamp}</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {event.resolved ? (
                            <span className="px-2 py-1 rounded text-xs bg-n0de-green/20 text-n0de-green">Resolved</span>
                          ) : (
                            <span className="px-2 py-1 rounded text-xs bg-n0de-red/20 text-n0de-red">Active</span>
                          )}
                          <button className="p-1 hover:bg-bg-hover rounded">
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Audit Logs */}
                <div className="card">
                  <h3 className="text-lg font-semibold mb-4">Audit Logs</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-2">Timestamp</th>
                          <th className="text-left py-3 px-2">User</th>
                          <th className="text-left py-3 px-2">Action</th>
                          <th className="text-left py-3 px-2">Resource</th>
                          <th className="text-left py-3 px-2">IP Address</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditLogs.map((log) => (
                          <tr key={log.id} className="border-b border-border/50 hover:bg-bg-hover">
                            <td className="py-2 px-2 font-mono text-xs">{log.timestamp}</td>
                            <td className="py-2 px-2">{log.user}</td>
                            <td className="py-2 px-2">
                              <span className="px-2 py-1 bg-n0de-blue/20 text-n0de-blue rounded text-xs">
                                {log.action}
                              </span>
                            </td>
                            <td className="py-2 px-2">{log.resource}</td>
                            <td className="py-2 px-2 font-mono text-xs">{log.ipAddress}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {/* Security Status */}
                <div className="card">
                  <h3 className="text-lg font-semibold mb-4">Security Status</h3>
                  <div className="space-y-4">
                    {[
                      { item: 'SSL Certificate', status: 'valid', expires: 'Aug 15, 2025' },
                      { item: '2FA Enforcement', status: 'enabled', coverage: '100%' },
                      { item: 'IP Whitelist', status: 'active', rules: '12 rules' },
                      { item: 'Rate Limiting', status: 'active', blocked: '847 today' },
                      { item: 'Audit Logging', status: 'enabled', retention: '90 days' }
                    ].map((item) => (
                      <div key={item.item} className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">{item.item}</div>
                          <div className="text-xs text-text-muted">
                            {item.expires || item.coverage || item.rules || item.blocked || item.retention}
                          </div>
                        </div>
                        <div className={`w-2 h-2 rounded-full ${
                          item.status === 'valid' || item.status === 'enabled' || item.status === 'active' 
                            ? 'bg-n0de-green' : 'bg-n0de-red'
                        }`} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Compliance */}
                <div className="card">
                  <h3 className="text-lg font-semibold mb-4">Compliance</h3>
                  <div className="space-y-3">
                    {[
                      { standard: 'SOC 2 Type II', status: 'certified', date: 'Dec 2024' },
                      { standard: 'PCI DSS', status: 'compliant', date: 'Nov 2024' },
                      { standard: 'GDPR', status: 'compliant', date: 'Ongoing' },
                      { standard: 'CCPA', status: 'compliant', date: 'Ongoing' }
                    ].map((comp) => (
                      <div key={comp.standard} className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">{comp.standard}</div>
                          <div className="text-xs text-text-muted">{comp.date}</div>
                        </div>
                        <span className="px-2 py-1 rounded text-xs bg-n0de-green/20 text-n0de-green">
                          {comp.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Security Actions */}
                <div className="card">
                  <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                  <div className="space-y-2">
                    <button className="w-full text-left p-3 hover:bg-bg-hover rounded-lg flex items-center space-x-2">
                      <Lock className="w-4 h-4" />
                      <span className="text-sm">Force Password Reset</span>
                    </button>
                    <button className="w-full text-left p-3 hover:bg-bg-hover rounded-lg flex items-center space-x-2">
                      <Shield className="w-4 h-4" />
                      <span className="text-sm">Update IP Whitelist</span>
                    </button>
                    <button className="w-full text-left p-3 hover:bg-bg-hover rounded-lg flex items-center space-x-2">
                      <AlertOctagon className="w-4 h-4" />
                      <span className="text-sm">Security Incident</span>
                    </button>
                    <button className="w-full text-left p-3 hover:bg-bg-hover rounded-lg flex items-center space-x-2">
                      <History className="w-4 h-4" />
                      <span className="text-sm">Export Audit Logs</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Integrations Tab */}
        {activeTab === 'integrations' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Integrations & Webhooks</h2>
              <div className="flex items-center space-x-3">
                <button className="btn-secondary flex items-center space-x-2">
                  <Webhook className="w-4 h-4" />
                  <span>Webhook Logs</span>
                </button>
                <button className="btn-primary flex items-center space-x-2">
                  <Plus className="w-4 h-4" />
                  <span>Add Integration</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Third-party Integrations */}
              <div className="card">
                <h3 className="text-lg font-semibold mb-4">Third-party Integrations</h3>
                <div className="space-y-4">
                  {integrations.map((integration) => (
                    <motion.div 
                      key={integration.id}
                      className="flex items-center justify-between p-4 bg-bg-main rounded-lg"
                      whileHover={{ scale: 1.01 }}
                    >
                      <div className="flex items-center space-x-3">
                        {integration.type === 'slack' && <Slack className="w-6 h-6 text-purple-500" />}
                        {integration.type === 'pagerduty' && <Phone className="w-6 h-6 text-green-500" />}
                        {integration.type === 'datadog' && <BarChart className="w-6 h-6 text-purple-600" />}
                        <div>
                          <div className="font-medium">{integration.name}</div>
                          <div className="text-sm text-text-secondary">
                            Configured: {integration.configured}
                          </div>
                          {integration.lastSync && (
                            <div className="text-xs text-text-muted">
                              Last sync: {integration.lastSync}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(integration.status)}`}>
                          {integration.status}
                        </span>
                        <button className="p-1 hover:bg-bg-hover rounded">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Webhooks */}
              <div className="card">
                <h3 className="text-lg font-semibold mb-4">Configured Webhooks</h3>
                <div className="space-y-4">
                  {webhooks.map((webhook) => (
                    <motion.div 
                      key={webhook.id}
                      className="p-4 bg-bg-main rounded-lg"
                      whileHover={{ scale: 1.01 }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <Webhook className="w-4 h-4" />
                          <span className="font-medium">{webhook.name}</span>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(webhook.status)}`}>
                          {webhook.status}
                        </span>
                      </div>
                      
                      <div className="text-sm text-text-secondary mb-2 font-mono">
                        {webhook.url.length > 40 ? `${webhook.url.substring(0, 40)}...` : webhook.url}
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-text-muted">
                        <span>{webhook.events.length} events</span>
                        <span>{webhook.successRate}% success rate</span>
                      </div>
                      
                      <div className="mt-3 flex flex-wrap gap-1">
                        {webhook.events.slice(0, 3).map((event) => (
                          <span key={event} className="px-2 py-1 bg-n0de-blue/20 text-n0de-blue rounded text-xs">
                            {event}
                          </span>
                        ))}
                        {webhook.events.length > 3 && (
                          <span className="px-2 py-1 bg-text-muted/20 text-text-muted rounded text-xs">
                            +{webhook.events.length - 3} more
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            {/* Available Integrations */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Available Integrations</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { name: 'Discord', icon: MessageSquare, category: 'Communication' },
                  { name: 'Telegram', icon: Send, category: 'Communication' },
                  { name: 'Microsoft Teams', icon: Users, category: 'Communication' },
                  { name: 'Grafana', icon: BarChart, category: 'Monitoring' },
                  { name: 'New Relic', icon: Radar, category: 'Monitoring' },
                  { name: 'Splunk', icon: Search, category: 'Analytics' },
                  { name: 'Zapier', icon: Zap, category: 'Automation' },
                  { name: 'Custom Webhook', icon: Code, category: 'Custom' }
                ].map((integration) => (
                  <motion.button 
                    key={integration.name}
                    className="p-4 bg-bg-main rounded-lg hover:bg-bg-hover transition-colors text-center"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <integration.icon className="w-8 h-8 mx-auto mb-2 text-n0de-blue" />
                    <div className="font-medium text-sm">{integration.name}</div>
                    <div className="text-xs text-text-muted">{integration.category}</div>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Infrastructure Tab */}
        {activeTab === 'infrastructure' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Infrastructure Management</h2>
              <div className="flex items-center space-x-3">
                <button className="btn-secondary flex items-center space-x-2">
                  <MapPin className="w-4 h-4" />
                  <span>Region Status</span>
                </button>
                <button className="btn-primary flex items-center space-x-2">
                  <Settings className="w-4 h-4" />
                  <span>Configure</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* Regional Deployment */}
                <div className="card">
                  <h3 className="text-lg font-semibold mb-4">Regional Deployment</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {infrastructureConfig.regions.map((region) => (
                      <div key={region} className="p-4 bg-bg-main rounded-lg text-center">
                        <div className="w-3 h-3 bg-n0de-green rounded-full mx-auto mb-2" />
                        <div className="font-medium text-sm">{region}</div>
                        <div className="text-xs text-text-muted">Active</div>
                        <div className="text-xs text-n0de-green mt-1">&lt;2ms avg latency</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Auto Scaling Configuration */}
                <div className="card">
                  <h3 className="text-lg font-semibold mb-4">Auto Scaling Configuration</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-n0de-green">{infrastructureConfig.autoScaling.minNodes}</div>
                      <div className="text-sm text-text-secondary">Min Nodes</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-n0de-blue">{infrastructureConfig.autoScaling.maxNodes}</div>
                      <div className="text-sm text-text-secondary">Max Nodes</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-n0de-purple">{infrastructureConfig.autoScaling.targetCPU}%</div>
                      <div className="text-sm text-text-secondary">Target CPU</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-n0de-cyan">12</div>
                      <div className="text-sm text-text-secondary">Current Nodes</div>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-4 bg-bg-main rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">CPU Usage</span>
                      <span className="text-sm text-n0de-cyan">68%</span>
                    </div>
                    <div className="w-full bg-bg-elevated rounded-full h-2">
                      <motion.div 
                        className="bg-gradient-to-r from-n0de-cyan to-n0de-blue h-2 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: '68%' }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                </div>

                {/* Performance Features */}
                <div className="card">
                  <h3 className="text-lg font-semibold mb-4">Performance Features</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { feature: 'Load Balancing', enabled: infrastructureConfig.loadBalancing, description: 'Distributes traffic across multiple nodes' },
                      { feature: 'CDN', enabled: infrastructureConfig.cdnEnabled, description: 'Global content delivery network' },
                      { feature: 'Caching', enabled: infrastructureConfig.caching, description: 'Redis-based response caching' },
                      { feature: 'Auto Scaling', enabled: infrastructureConfig.autoScaling.enabled, description: 'Dynamic resource scaling' }
                    ].map((item) => (
                      <div key={item.feature} className="p-4 bg-bg-main rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{item.feature}</span>
                          <div className={`w-2 h-2 rounded-full ${item.enabled ? 'bg-n0de-green' : 'bg-n0de-red'}`} />
                        </div>
                        <p className="text-sm text-text-secondary">{item.description}</p>
                        <button className="text-xs text-n0de-blue hover:underline mt-2">
                          {item.enabled ? 'Configure' : 'Enable'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {/* Custom Domains */}
                <div className="card">
                  <h3 className="text-lg font-semibold mb-4">Custom Domains</h3>
                  <div className="space-y-3">
                    {infrastructureConfig.customDomains.map((domain) => (
                      <div key={domain} className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">{domain}</div>
                          <div className="text-xs text-n0de-green">SSL Active</div>
                        </div>
                        <CheckCircle className="w-4 h-4 text-n0de-green" />
                      </div>
                    ))}
                  </div>
                  <button className="btn-secondary w-full mt-4">Add Domain</button>
                </div>

                {/* Resource Usage */}
                <div className="card">
                  <h3 className="text-lg font-semibold mb-4">Resource Usage</h3>
                  <div className="space-y-4">
                    {[
                      { resource: 'CPU', usage: 68, color: 'n0de-blue' },
                      { resource: 'Memory', usage: 45, color: 'n0de-green' },
                      { resource: 'Storage', usage: 23, color: 'n0de-purple' },
                      { resource: 'Network', usage: 89, color: 'n0de-orange' }
                    ].map((item) => (
                      <div key={item.resource}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium">{item.resource}</span>
                          <span className={`text-sm text-${item.color}`}>{item.usage}%</span>
                        </div>
                        <div className="w-full bg-bg-main rounded-full h-2">
                          <motion.div 
                            className={`bg-${item.color} h-2 rounded-full`}
                            initial={{ width: 0 }}
                            animate={{ width: `${item.usage}%` }}
                            transition={{ duration: 1, delay: 0.2 }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Infrastructure Actions */}
                <div className="card">
                  <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                  <div className="space-y-2">
                    <button className="w-full text-left p-3 hover:bg-bg-hover rounded-lg flex items-center space-x-2">
                      <Cpu className="w-4 h-4" />
                      <span className="text-sm">Scale Resources</span>
                    </button>
                    <button className="w-full text-left p-3 hover:bg-bg-hover rounded-lg flex items-center space-x-2">
                      <Network className="w-4 h-4" />
                      <span className="text-sm">Network Config</span>
                    </button>
                    <button className="w-full text-left p-3 hover:bg-bg-hover rounded-lg flex items-center space-x-2">
                      <Layers className="w-4 h-4" />
                      <span className="text-sm">Load Balancer</span>
                    </button>
                    <button className="w-full text-left p-3 hover:bg-bg-hover rounded-lg flex items-center space-x-2">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm">Add Region</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Business Intelligence Tab */}
        {activeTab === 'intelligence' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Business Intelligence</h2>
              <div className="flex items-center space-x-3">
                <button className="btn-secondary flex items-center space-x-2">
                  <Calendar className="w-4 h-4" />
                  <span>Custom Period</span>
                </button>
                <button className="btn-primary flex items-center space-x-2">
                  <FileBarChart className="w-4 h-4" />
                  <span>Generate Report</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* Usage Forecasting */}
                <div className="card">
                  <h3 className="text-lg font-semibold mb-4">Usage Forecasting</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={forecastData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2B2B2B" />
                        <XAxis dataKey="period" stroke="#808080" />
                        <YAxis stroke="#808080" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1A1A1A', 
                            border: '1px solid #2B2B2B',
                            borderRadius: '8px'
                          }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="predictedRequests" 
                          stroke="#00D2FF" 
                          fill="#00D2FF"
                          fillOpacity={0.2}
                          strokeWidth={3}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Cost Analysis */}
                <div className="card">
                  <h3 className="text-lg font-semibold mb-4">Cost Analysis & Optimization</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-3">Current vs Forecast</h4>
                      <div className="space-y-3">
                        {forecastData.map((period) => (
                          <div key={period.period} className="flex items-center justify-between p-3 bg-bg-main rounded-lg">
                            <div>
                              <div className="font-medium text-sm">{period.period}</div>
                              <div className="text-xs text-text-muted">{period.confidence}% confidence</div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-n0de-green">{period.predictedCost} USDC</div>
                              <div className={`text-xs flex items-center ${
                                period.trend === 'increasing' ? 'text-n0de-red' :
                                period.trend === 'decreasing' ? 'text-n0de-green' : 'text-n0de-blue'
                              }`}>
                                {period.trend === 'increasing' ? <TrendingUp className="w-3 h-3 mr-1" /> :
                                 period.trend === 'decreasing' ? <TrendingDown className="w-3 h-3 mr-1" /> :
                                 <Target className="w-3 h-3 mr-1" />}
                                {period.trend}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-3">Optimization Recommendations</h4>
                      <div className="space-y-3">
                        {[
                          { action: 'Enable response caching', saving: '45 USDC/mo', impact: 'high' },
                          { action: 'Optimize API key usage', saving: '23 USDC/mo', impact: 'medium' },
                          { action: 'Right-size infrastructure', saving: '67 USDC/mo', impact: 'high' },
                          { action: 'Implement request batching', saving: '12 USDC/mo', impact: 'low' }
                        ].map((rec) => (
                          <div key={rec.action} className="p-3 bg-bg-main rounded-lg">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium">{rec.action}</span>
                              <span className="text-sm text-n0de-green font-bold">{rec.saving}</span>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded ${
                              rec.impact === 'high' ? 'bg-n0de-green/20 text-n0de-green' :
                              rec.impact === 'medium' ? 'bg-n0de-orange/20 text-n0de-orange' :
                              'bg-n0de-blue/20 text-n0de-blue'
                            }`}>
                              {rec.impact} impact
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {/* KPI Summary */}
                <div className="card">
                  <h3 className="text-lg font-semibold mb-4">Key Performance Indicators</h3>
                  <div className="space-y-4">
                    {[
                      { kpi: 'Revenue Growth', value: '+24.5%', trend: 'up', target: '25%' },
                      { kpi: 'Customer Acquisition', value: '847', trend: 'up', target: '1000' },
                      { kpi: 'Churn Rate', value: '2.1%', trend: 'down', target: '<3%' },
                      { kpi: 'Avg Revenue/User', value: '342 USDC', trend: 'up', target: '400 USDC' },
                      { kpi: 'API Adoption', value: '89%', trend: 'stable', target: '90%' }
                    ].map((item) => (
                      <div key={item.kpi} className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">{item.kpi}</div>
                          <div className="text-xs text-text-muted">Target: {item.target}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-n0de-green">{item.value}</div>
                          <div className={`text-xs flex items-center justify-end ${
                            item.trend === 'up' ? 'text-n0de-green' :
                            item.trend === 'down' ? 'text-n0de-red' : 'text-n0de-blue'
                          }`}>
                            {item.trend === 'up' ? <TrendingUp className="w-3 h-3 mr-1" /> :
                             item.trend === 'down' ? <TrendingDown className="w-3 h-3 mr-1" /> :
                             <Target className="w-3 h-3 mr-1" />}
                            {item.trend}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Competitor Analysis */}
                <div className="card">
                  <h3 className="text-lg font-semibold mb-4">Competitive Position</h3>
                  <div className="space-y-4">
                    {[
                      { provider: 'n0de', latency: 1.8, price: 299, color: 'n0de-green' },
                      { provider: 'Helius', latency: 89, price: 1900, color: 'red-500' },
                      { provider: 'Alchemy', latency: 45, price: 1200, color: 'blue-500' },
                      { provider: 'QuickNode', latency: 67, price: 800, color: 'purple-500' }
                    ].map((provider) => (
                      <div key={provider.provider} className="p-3 bg-bg-main rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{provider.provider}</span>
                          {provider.provider === 'n0de' && <Crown className="w-4 h-4 text-n0de-orange" />}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-text-secondary">Latency:</span>
                            <span className={`ml-2 font-bold ${provider.provider === 'n0de' ? 'text-n0de-green' : 'text-n0de-red'}`}>
                              {provider.latency}ms
                            </span>
                          </div>
                          <div>
                            <span className="text-text-secondary">Price:</span>
                            <span className={`ml-2 font-bold ${provider.provider === 'n0de' ? 'text-n0de-green' : 'text-n0de-red'}`}>
                              {provider.provider === 'n0de' ? `${provider.price} USDC` : `$${provider.price}`}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Business Insights */}
                <div className="card">
                  <h3 className="text-lg font-semibold mb-4">Key Insights</h3>
                  <div className="space-y-3 text-sm">
                    <div className="p-3 bg-n0de-green/10 border border-n0de-green/20 rounded-lg">
                      <div className="font-medium text-n0de-green mb-1">💡 Opportunity</div>
                      <div className="text-text-secondary">Enterprise segment shows 67% higher retention rates</div>
                    </div>
                    <div className="p-3 bg-n0de-blue/10 border border-n0de-blue/20 rounded-lg">
                      <div className="font-medium text-n0de-blue mb-1">📊 Trend</div>
                      <div className="text-text-secondary">WebSocket usage increased 89% this quarter</div>
                    </div>
                    <div className="p-3 bg-n0de-orange/10 border border-n0de-orange/20 rounded-lg">
                      <div className="font-medium text-n0de-orange mb-1">⚠️ Watch</div>
                      <div className="text-text-secondary">Devnet usage approaching production levels</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}