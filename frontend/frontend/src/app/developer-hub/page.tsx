'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Code, 
  Gamepad2, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Shield, 
  Zap, 
  Upload, 
  CheckCircle, 
  AlertTriangle,
  Plus,
  Eye,
  Edit,
  BarChart3,
  Globe,
  Star,
  Clock,
  FileText,
  Send
} from 'lucide-react';
import Layout from '@/components/Layout';

interface DeveloperProject {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'live' | 'rejected';
  gameType: string;
  submittedAt: string;
  revenue: number;
  players: number;
  matches: number;
}

interface DeveloperStats {
  totalRevenue: number;
  totalPlayers: number;
  totalMatches: number;
  activeProjects: number;
  pendingProjects: number;
  approvedProjects: number;
}

export default function DeveloperHubPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'games' | 'submit' | 'analytics' | 'earnings' | 'my-games'>('overview');
  const [projects, setProjects] = useState<DeveloperProject[]>([]);
  const [stats, setStats] = useState<DeveloperStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  // Form states
  const [projectForm, setProjectForm] = useState({
    name: '',
    description: '',
    gameType: '',
    repositoryUrl: '',
    demoUrl: '',
    documentation: '',
    contactEmail: ''
  });

  useEffect(() => {
    if (user && user.walletAddress) {
      loadDeveloperData();
    }
  }, [user]);

  const loadDeveloperData = async () => {
    setLoading(true);
    try {
      // Get the session token for authentication
      const token = localStorage.getItem('pv3_session_token');
      if (!token) {
        console.error('No session token found. Please reconnect your wallet.');
        return;
      }

      // Check if developer is registered
      const response = await fetch(`/api/developer/profile?wallet=${user?.walletAddress}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        setIsRegistered(true);
        const data = await response.json();
        setProjects(data.projects || []);
        setStats(data.stats || {
          totalRevenue: 0,
          totalPlayers: 0,
          totalMatches: 0,
          activeProjects: 0,
          pendingProjects: 0,
          approvedProjects: 0
        });
      }
    } catch (error) {
      console.error('Failed to load developer data:', error);
    } finally {
      setLoading(false);
    }
  };

  const registerDeveloper = async () => {
    if (!user?.walletAddress) {
      console.error('No wallet address available');
      return;
    }
    
    setLoading(true);
    try {
      // Get the session token for authentication
      const token = localStorage.getItem('pv3_session_token');
      if (!token) {
        console.error('No session token found. Please reconnect your wallet.');
        alert('Please reconnect your wallet to continue.');
        return;
      }

      console.log('🔐 Registering developer with wallet:', user.walletAddress);
      console.log('🔑 Using token:', token.substring(0, 20) + '...');

      const response = await fetch('/api/developer/register', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // Add auth header
        },
        body: JSON.stringify({
          walletAddress: user.walletAddress
          // Remove registeredAt - backend doesn't need it
        })
      });

      console.log('📡 Registration response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Registration successful:', data);
        setIsRegistered(true);
        await loadDeveloperData();
      } else {
        const error = await response.json();
        console.error('❌ Registration failed:', error);
        alert(`Registration failed: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('💥 Failed to register developer:', error);
      alert('Failed to register developer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const submitProject = async () => {
    if (!user?.walletAddress || !projectForm.name || !projectForm.description) return;

    setLoading(true);
    try {
      // Get the session token for authentication
      const token = localStorage.getItem('pv3_session_token');
      if (!token) {
        console.error('No session token found. Please reconnect your wallet.');
        return;
      }

      const response = await fetch('/api/developer/projects', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...projectForm,
          developerWallet: user.walletAddress,
          submittedAt: new Date().toISOString(),
          status: 'submitted'
        })
      });

      if (response.ok) {
        setProjectForm({
          name: '',
          description: '',
          gameType: '',
          repositoryUrl: '',
          demoUrl: '',
          documentation: '',
          contactEmail: ''
        });
        await loadDeveloperData();
        setActiveTab('games');
      } else {
        const error = await response.json();
        console.error('Project submission failed:', error);
      }
    } catch (error) {
      console.error('Failed to submit project:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live': return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'approved': return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
      case 'under_review': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'submitted': return 'text-purple-400 bg-purple-500/20 border-purple-500/30';
      case 'rejected': return 'text-red-400 bg-red-500/20 border-red-500/30';
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
    }
  };

  if (!user) {
    return (
      <Layout 
        currentPage="developer-hub" 
        title="" 
        subtitle=""
        showWalletStatus={false}
      >
        <div className="max-w-4xl mx-auto text-center py-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Code className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-text-primary mb-4 font-audiowide">
            PV3 DEVELOPER HUB
          </h1>
          <p className="text-text-secondary mb-8 text-lg">
            Skip the platform building. Start earning immediately. Connect your wallet to join the revolution.
          </p>
          <div className="bg-bg-elevated border border-border rounded-lg p-8">
            <AlertTriangle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <p className="text-text-secondary">Please sign in to access instant revenue opportunities</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!isRegistered) {
    return (
      <Layout 
        currentPage="developer-hub" 
        title="" 
        subtitle=""
        showWalletStatus={false}
      >
        <div className="max-w-4xl mx-auto py-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Code className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-text-primary mb-4 font-audiowide">
              BUILD ONCE, EARN FOREVER
            </h1>
            <p className="text-text-secondary text-lg mb-2">
              Create games that generate perpetual revenue streams - every match played pays you infinitely
            </p>
            <p className="text-green-400 font-semibold text-lg">
              🔄 Elite developers building passive income empires that compound daily
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-6">
              <h3 className="text-xl font-bold text-text-primary mb-4">💰 The PV3 Advantage</h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <DollarSign className="w-5 h-5 text-green-400 mt-0.5" />
                  <div>
                    <p className="font-semibold text-text-primary">Infinite Revenue Engine</p>
                    <p className="text-sm text-text-secondary">Every game becomes a perpetual income generator that pays you forever.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Users className="w-5 h-5 text-blue-400 mt-0.5" />
                  <div>
                    <p className="font-semibold text-text-primary">Self-Sustaining Player Loop</p>
                    <p className="text-sm text-text-secondary">Each player becomes a lifelong revenue source feeding your income stream.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Shield className="w-5 h-5 text-purple-400 mt-0.5" />
                  <div>
                    <p className="font-semibold text-text-primary">Enterprise-Grade Infrastructure</p>
                    <p className="text-sm text-text-secondary">Anti-cheat, escrow, payments - all handled seamlessly.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Zap className="w-5 h-5 text-orange-400 mt-0.5" />
                  <div>
                    <p className="font-semibold text-text-primary">Lightning-Fast Deployment</p>
                    <p className="text-sm text-text-secondary">From submission to earning in days, not months.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-bg-elevated border border-border rounded-xl p-6">
              <h3 className="text-xl font-bold text-text-primary mb-4">🔥 What Makes Games Successful Here</h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <Gamepad2 className="w-5 h-5 text-green-400 mt-0.5" />
                  <div>
                    <p className="font-semibold text-text-primary">Competitive & Skill-Based</p>
                    <p className="text-sm text-text-secondary">Strategy, puzzle, card games that reward player skill</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Globe className="w-5 h-5 text-blue-400 mt-0.5" />
                  <div>
                    <p className="font-semibold text-text-primary">Web-Optimized</p>
                    <p className="text-sm text-text-secondary">Browser-ready games that load instantly</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-purple-400 mt-0.5" />
                  <div>
                    <p className="font-semibold text-text-primary">Deterministic Outcomes</p>
                    <p className="text-sm text-text-secondary">Clear winners and losers for fair competition</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Star className="w-5 h-5 text-orange-400 mt-0.5" />
                  <div>
                    <p className="font-semibold text-text-primary">Premium Quality</p>
                    <p className="text-sm text-text-secondary">Polished experiences that keep players engaged</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-bg-elevated border border-border rounded-xl p-8 text-center">
            <h3 className="text-2xl font-bold text-text-primary mb-4">Ready to Join the Elite?</h3>
            <p className="text-text-secondary mb-2">
              Build games that generate wealth while you sleep. Create your passive income empire.
            </p>
            <p className="text-green-400 font-semibold mb-6">
              🔄 Deploy once, earn infinitely. Your games become perpetual money machines.
            </p>
            <button
              onClick={registerDeveloper}
              disabled={loading}
              className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-8 py-4 rounded-lg font-bold text-lg hover:from-green-600 hover:to-emerald-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Joining the Elite...' : '🚀 Become a PV3 Developer'}
            </button>
            <p className="text-xs text-text-secondary mt-4">
              Exclusive access. Revolutionary rewards. The future starts now.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout 
      currentPage="developer-hub" 
      title="" 
      subtitle=""
      showWalletStatus={false}
    >
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Page Header */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-text-primary mb-1 font-audiowide">
            🔄 PV3 INFINITE INCOME ENGINE
          </h1>
          <p className="text-text-secondary text-sm">Build once, earn forever. Your games become perpetual revenue streams.</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-bg-elevated border border-border rounded-lg p-1">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'games', label: 'Games', icon: Gamepad2 },
            { id: 'submit', label: 'Submit Game', icon: Plus },
            { id: 'analytics', label: 'Analytics', icon: TrendingUp },
            { id: 'earnings', label: 'Earnings', icon: DollarSign },
            { id: 'my-games', label: 'My Games', icon: Gamepad2 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md font-medium transition-colors text-sm ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-card'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-4">
          {activeTab === 'overview' && stats && (
            <div className="space-y-4">
              {/* Stats Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-bg-elevated border border-border rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <DollarSign className="w-5 h-5 text-green-400" />
                    <span className="text-sm text-text-secondary">Total Revenue</span>
                  </div>
                  <div className="text-xl font-bold text-green-400">{stats.totalRevenue.toFixed(4)} SOL</div>
                </div>

                <div className="bg-bg-elevated border border-border rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Users className="w-5 h-5 text-blue-400" />
                    <span className="text-sm text-text-secondary">Total Players</span>
                  </div>
                  <div className="text-xl font-bold text-text-primary">{stats.totalPlayers.toLocaleString()}</div>
                </div>

                <div className="bg-bg-elevated border border-border rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Gamepad2 className="w-5 h-5 text-purple-400" />
                    <span className="text-sm text-text-secondary">Total Matches</span>
                  </div>
                  <div className="text-xl font-bold text-text-primary">{stats.totalMatches.toLocaleString()}</div>
                </div>

                <div className="bg-bg-elevated border border-border rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-orange-400" />
                    <span className="text-sm text-text-secondary">Live Games</span>
                  </div>
                  <div className="text-xl font-bold text-text-primary">{stats.activeProjects}</div>
                </div>
              </div>

              {/* Recent Projects */}
              <div className="bg-bg-elevated border border-border rounded-lg p-4">
                <h3 className="text-lg font-bold text-text-primary mb-4">🚀 Your Money-Making Games</h3>
                <div className="space-y-3">
                  {projects.slice(0, 3).map((project) => (
                    <div key={project.id} className="flex items-center justify-between p-3 bg-bg-card border border-border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Gamepad2 className="w-5 h-5 text-purple-400" />
                        <div>
                          <p className="font-medium text-text-primary">{project.name}</p>
                          <p className="text-sm text-text-secondary">{project.gameType}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className={`text-xs px-2 py-1 rounded border ${getStatusColor(project.status)}`}>
                          {project.status.replace('_', ' ')}
                        </div>
                        <div className="text-right">
                          <span className="text-sm text-green-400 font-medium">
                            {(project.revenue * 0.5).toFixed(4)} SOL
                          </span>
                          <div className="text-xs text-text-secondary">Your Cut</div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {projects.length === 0 && (
                    <div className="text-center py-6">
                      <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                        <DollarSign className="w-8 h-8 text-white" />
                      </div>
                      <p className="text-text-primary font-semibold mb-1">Your Revenue Empire Awaits</p>
                      <p className="text-sm text-text-secondary mb-3">Submit your first game and start earning immediately</p>
                      <button
                        onClick={() => setActiveTab('submit')}
                        className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:from-blue-600 hover:to-purple-700 transition-all"
                      >
                        🚀 Launch Your First Money-Maker
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'games' && (
            <div className="bg-bg-elevated border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-text-primary">💰 Your Revenue Generators</h3>
                <button
                  onClick={() => setActiveTab('submit')}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-lg text-sm hover:from-green-600 hover:to-emerald-700 transition-all"
                >
                  <Plus className="w-4 h-4 inline mr-2" />
                  Add Money-Maker
                </button>
              </div>

              <div className="space-y-3">
                {projects.map((project) => (
                  <div key={project.id} className="border border-border rounded-lg p-4 hover:bg-bg-card/50 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <Gamepad2 className="w-6 h-6 text-purple-400" />
                        <div>
                          <h4 className="font-semibold text-text-primary">{project.name}</h4>
                          <p className="text-sm text-text-secondary">{project.gameType}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className={`text-xs px-3 py-1 rounded border ${getStatusColor(project.status)}`}>
                          {project.status.replace('_', ' ').toUpperCase()}
                        </div>
                        <button className="text-blue-400 hover:text-blue-300">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="text-purple-400 hover:text-purple-300">
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <p className="text-sm text-text-secondary mb-3">{project.description}</p>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-text-secondary">Your Earnings:</span>
                        <span className="text-green-400 font-medium ml-2">{(project.revenue * 0.5).toFixed(4)} SOL</span>
                      </div>
                      <div>
                        <span className="text-text-secondary">Players Hooked:</span>
                        <span className="text-text-primary font-medium ml-2">{project.players.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-text-secondary">Money Matches:</span>
                        <span className="text-text-primary font-medium ml-2">{project.matches.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}

                {projects.length === 0 && (
                  <div className="text-center py-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Gamepad2 className="w-10 h-10 text-white" />
                    </div>
                    <h4 className="text-xl font-bold text-text-primary mb-2">Time to Build Your Money Machine</h4>
                    <p className="text-text-secondary mb-4">Every game you submit is a potential revenue stream</p>
                    <button
                      onClick={() => setActiveTab('submit')}
                      className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-lg font-bold hover:from-green-600 hover:to-emerald-700 transition-all transform hover:scale-105"
                    >
                      🚀 Create Your First Revenue Stream
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'submit' && (
            <div className="bg-bg-elevated border border-border rounded-lg p-4">
              <h3 className="text-lg font-bold text-text-primary mb-4">🚀 Launch Your Next Revenue Stream</h3>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">Game Name *</label>
                    <input
                      type="text"
                      value={projectForm.name}
                      onChange={(e) => setProjectForm({...projectForm, name: e.target.value})}
                      className="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-green-500"
                      placeholder="Your next money-maker's name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">Game Type *</label>
                    <select
                      value={projectForm.gameType}
                      onChange={(e) => setProjectForm({...projectForm, gameType: e.target.value})}
                      className="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-green-500"
                    >
                      <option value="">Choose your profit category</option>
                      <option value="strategy">Strategy (High engagement)</option>
                      <option value="puzzle">Puzzle (Addictive potential)</option>
                      <option value="card">Card Game (Proven money-maker)</option>
                      <option value="board">Board Game (Classic appeal)</option>
                      <option value="arcade">Arcade (Quick matches)</option>
                      <option value="other">Other (Unique opportunity)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">Repository URL</label>
                    <input
                      type="url"
                      value={projectForm.repositoryUrl}
                      onChange={(e) => setProjectForm({...projectForm, repositoryUrl: e.target.value})}
                      className="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-green-500"
                      placeholder="https://github.com/username/money-maker"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">Demo URL</label>
                    <input
                      type="url"
                      value={projectForm.demoUrl}
                      onChange={(e) => setProjectForm({...projectForm, demoUrl: e.target.value})}
                      className="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-green-500"
                      placeholder="https://yourgame.com/demo"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">Contact Email *</label>
                    <input
                      type="email"
                      value={projectForm.contactEmail}
                      onChange={(e) => setProjectForm({...projectForm, contactEmail: e.target.value})}
                      className="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-green-500"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">Game Description *</label>
                    <textarea
                      value={projectForm.description}
                      onChange={(e) => setProjectForm({...projectForm, description: e.target.value})}
                      rows={4}
                      className="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-green-500"
                      placeholder="Describe your revenue-generating masterpiece..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">Documentation URL</label>
                    <input
                      type="url"
                      value={projectForm.documentation}
                      onChange={(e) => setProjectForm({...projectForm, documentation: e.target.value})}
                      className="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-green-500"
                      placeholder="https://docs.yourgame.com"
                    />
                  </div>

                  <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg p-4">
                    <h4 className="font-semibold text-green-400 mb-2">💰 Revenue Potential Calculator</h4>
                    <div className="text-sm text-text-secondary space-y-1">
                      <div>Conservative: 50 matches/day = <span className="text-green-400 font-bold">~$750/month</span></div>
                      <div>Popular: 200 matches/day = <span className="text-green-400 font-bold">~$3,000/month</span></div>
                      <div>Viral: 1,000 matches/day = <span className="text-green-400 font-bold">~$15,000/month</span></div>
                      <div className="text-xs text-yellow-400 mt-2">💡 Your game could be the next big earner!</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex space-x-4 mt-6">
                <button
                  onClick={() => setProjectForm({
                    name: '',
                    description: '',
                    gameType: '',
                    repositoryUrl: '',
                    demoUrl: '',
                    documentation: '',
                    contactEmail: ''
                  })}
                  className="px-6 py-2 border border-border rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-card transition-colors"
                >
                  Clear Form
                </button>
                <button
                  onClick={submitProject}
                  disabled={loading || !projectForm.name || !projectForm.description || !projectForm.contactEmail}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-8 py-2 rounded-lg font-bold hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Launching Revenue Stream...' : '🚀 Launch & Start Earning'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && stats && (
            <div className="space-y-4">
              <div className="bg-bg-elevated border border-border rounded-lg p-4">
                <h3 className="text-lg font-bold text-text-primary mb-4">💰 Your Money-Making Analytics</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg p-4">
                    <h4 className="font-semibold text-green-400 mb-3">🚀 Revenue Performance</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Total Platform Revenue:</span>
                        <span className="text-text-primary font-bold">{stats.totalRevenue.toFixed(4)} SOL</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Your Money (50%):</span>
                        <span className="text-green-400 font-bold">{(stats.totalRevenue * 0.5).toFixed(4)} SOL</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Platform Cut:</span>
                        <span className="text-text-secondary">{(stats.totalRevenue * 0.5).toFixed(4)} SOL</span>
                      </div>
                      <div className="border-t border-green-500/20 pt-2 mt-2">
                        <div className="flex justify-between">
                          <span className="text-green-400 font-semibold">USD Value:</span>
                          <span className="text-green-400 font-bold">${((stats.totalRevenue * 0.5) * 100).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-400 mb-3">📊 Profit Metrics</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Your $ per Match:</span>
                        <span className="text-blue-400 font-bold">
                          ${stats.totalMatches > 0 ? (((stats.totalRevenue * 0.5) / stats.totalMatches) * 100).toFixed(3) : '0.000'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Player Retention:</span>
                        <span className="text-blue-400 font-bold">
                          {stats.totalPlayers > 0 ? (stats.totalMatches / stats.totalPlayers).toFixed(1) : '0.0'} matches/player
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Revenue Streams:</span>
                        <span className="text-blue-400 font-bold">{stats.activeProjects} live games</span>
                      </div>
                      <div className="border-t border-blue-500/20 pt-2 mt-2">
                        <div className="flex justify-between">
                          <span className="text-blue-400 font-semibold">Monthly Potential:</span>
                          <span className="text-blue-400 font-bold">
                            ${stats.totalMatches > 0 ? (((stats.totalRevenue * 0.5) / stats.totalMatches) * 100 * 30 * stats.totalMatches / 30).toFixed(0) : '0'}/mo
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-bg-elevated border border-border rounded-lg p-4">
                <h3 className="text-lg font-bold text-text-primary mb-4">🎮 Individual Money-Makers Performance</h3>
                <div className="space-y-3">
                  {projects.filter(p => p.status === 'live').map((project) => (
                    <div key={project.id} className="bg-bg-card border border-border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-text-primary">{project.name}</h4>
                        <div className="text-right">
                          <div className="text-green-400 font-bold">{(project.revenue * 0.5).toFixed(4)} SOL</div>
                          <div className="text-xs text-green-400">${((project.revenue * 0.5) * 100).toFixed(2)} earned</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-text-secondary">Players Hooked:</span>
                          <div className="text-text-primary font-medium">{project.players.toLocaleString()}</div>
                        </div>
                        <div>
                          <span className="text-text-secondary">Money Matches:</span>
                          <div className="text-text-primary font-medium">{project.matches.toLocaleString()}</div>
                        </div>
                        <div>
                          <span className="text-text-secondary">Your $/Match:</span>
                          <div className="text-green-400 font-medium">
                            ${project.matches > 0 ? (((project.revenue * 0.5) / project.matches) * 100).toFixed(3) : '0.000'}
                          </div>
                        </div>
                        <div>
                          <span className="text-text-secondary">Monthly Potential:</span>
                          <div className="text-blue-400 font-medium">
                            ${project.matches > 0 ? (((project.revenue * 0.5) / project.matches) * 100 * 30).toFixed(0) : '0'}/mo
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {projects.filter(p => p.status === 'live').length === 0 && (
                    <div className="text-center py-8">
                      <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <BarChart3 className="w-10 h-10 text-white" />
                      </div>
                      <h4 className="text-xl font-bold text-text-primary mb-2">No Live Revenue Streams Yet</h4>
                      <p className="text-text-secondary mb-4">Get your games approved to start seeing money-making analytics</p>
                      <button
                        onClick={() => setActiveTab('submit')}
                        className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-lg font-bold hover:from-green-600 hover:to-emerald-700 transition-all transform hover:scale-105"
                      >
                        🚀 Launch Your First Revenue Stream
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Claim Earnings Section */}
          {activeTab === 'earnings' && stats && (
            <div className="space-y-6">
              {/* Revolutionary Hero Section */}
              <div className="bg-gradient-to-br from-green-500/20 via-emerald-500/20 to-teal-500/20 border border-green-500/30 rounded-xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-gradient-to-l from-yellow-400 to-orange-500 text-black px-4 py-1 text-xs font-bold rounded-bl-lg">
                  🔥 REVOLUTIONARY
                </div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-3xl font-bold text-green-400 font-audiowide mb-2">💰 THE DEVELOPER REVOLUTION</h2>
                    <p className="text-text-secondary text-lg">Break free from traditional revenue models. Earn what you deserve, instantly.</p>
                    <p className="text-green-400 font-semibold mt-1">🚀 For Solo Devs • Indie Teams • Game Studios</p>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-bold text-green-400 font-audiowide">
                      {(stats.totalRevenue * 0.5).toFixed(4)} SOL
                    </div>
                    <div className="text-sm text-text-secondary">Ready to Claim Now</div>
                    <div className="text-xs text-green-400 font-semibold mt-1">≈ ${((stats.totalRevenue * 0.5) * 100).toFixed(2)} USD</div>
                  </div>
                </div>
                
                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-center">
                    <Zap className="w-8 h-8 text-green-400 mx-auto mb-2" />
                    <div className="text-lg font-bold text-green-400">{(stats.totalRevenue * 0.5).toFixed(4)} SOL</div>
                    <div className="text-xs text-text-secondary">Instant Withdrawal</div>
                  </div>
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-center">
                    <Clock className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                    <div className="text-lg font-bold text-blue-400">2 Seconds</div>
                    <div className="text-xs text-text-secondary">From Click to Wallet</div>
                  </div>
                  <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4 text-center">
                    <Shield className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                    <div className="text-lg font-bold text-purple-400">50/50</div>
                    <div className="text-xs text-text-secondary">Fair Revenue Split</div>
                  </div>
                </div>

                <button
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 rounded-lg font-bold text-xl hover:from-green-600 hover:to-emerald-700 transition-all transform hover:scale-[1.02] shadow-lg"
                  disabled={stats.totalRevenue === 0}
                >
                  <DollarSign className="w-6 h-6 inline mr-2" />
                  Claim {(stats.totalRevenue * 0.5).toFixed(4)} SOL Instantly
                </button>
                
                <div className="mt-4 text-center">
                  <p className="text-xs text-text-secondary">
                    💡 <span className="text-green-400 font-semibold">Pro Tip:</span> Unlike traditional platforms that hold your money for 30-90 days, 
                    PV3 lets you access YOUR earnings immediately. No waiting, no excuses.
                  </p>
                </div>
              </div>

              {/* Revolutionary Opportunity */}
              <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-6">
                <h3 className="text-2xl font-bold text-purple-400 font-audiowide mb-4">🎯 THE OPPORTUNITY OF A LIFETIME</h3>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Users className="w-8 h-8 text-white" />
                    </div>
                    <h4 className="font-bold text-text-primary mb-2">Solo Developers</h4>
                    <p className="text-sm text-text-secondary">Turn your side projects into passive income streams. One good game = financial freedom.</p>
                    <div className="mt-2 text-green-400 font-bold">$500-5,000/month potential</div>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Gamepad2 className="w-8 h-8 text-white" />
                    </div>
                    <h4 className="font-bold text-text-primary mb-2">Indie Teams</h4>
                    <p className="text-sm text-text-secondary">Scale your revenue without scaling your headaches. Fair splits, instant payouts, zero politics.</p>
                    <div className="mt-2 text-green-400 font-bold">$2,000-20,000/month potential</div>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Star className="w-8 h-8 text-white" />
                    </div>
                    <h4 className="font-bold text-text-primary mb-2">Game Studios</h4>
                    <p className="text-sm text-text-secondary">Diversify your revenue streams. Launch experimental games with guaranteed fair monetization.</p>
                    <div className="mt-2 text-green-400 font-bold">$10,000-100,000/month potential</div>
                  </div>
                </div>
              </div>

              {/* Why This Changes Everything */}
              <div className="bg-bg-elevated border border-border rounded-xl p-6">
                <h3 className="text-xl font-bold text-text-primary mb-4 font-audiowide">🔥 THE PV3 REVOLUTION</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg p-4">
                      <h4 className="font-bold text-green-400 mb-3">🚀 Revolutionary Game Economics</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          <span className="text-text-secondary">Instant 2-second withdrawals to your wallet</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          <span className="text-text-secondary">Perfect 50/50 revenue split, always</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          <span className="text-text-secondary">No minimums - claim any amount, anytime</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          <span className="text-text-secondary">Zero fees, zero deductions, pure profit</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          <span className="text-text-secondary">Blockchain transparency and security</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          <span className="text-text-secondary">Complete control over your earnings 24/7</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg p-4">
                      <h4 className="font-bold text-purple-400 mb-3">⚡ Next-Gen Developer Experience</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center space-x-2">
                          <Star className="w-4 h-4 text-purple-400" />
                          <span className="text-text-secondary">Enterprise-grade anti-cheat protection</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Star className="w-4 h-4 text-purple-400" />
                          <span className="text-text-secondary">Automated escrow and dispute resolution</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Star className="w-4 h-4 text-purple-400" />
                          <span className="text-text-secondary">Real-time analytics and performance tracking</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Star className="w-4 h-4 text-purple-400" />
                          <span className="text-text-secondary">Massive engaged player community</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Star className="w-4 h-4 text-purple-400" />
                          <span className="text-text-secondary">Lightning-fast deployment pipeline</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Star className="w-4 h-4 text-purple-400" />
                          <span className="text-text-secondary">Blockchain-powered smart contracts</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">🌟</div>
                    <div>
                      <h4 className="font-bold text-yellow-400">You&apos;re Part of Gaming History</h4>
                      <p className="text-sm text-text-secondary">
                        PV3 is pioneering the future of competitive gaming. The developers building here today 
                        are creating the foundation of tomorrow&apos;s gaming economy.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Real Success Scenarios */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-bg-elevated border border-border rounded-xl p-6">
                  <h3 className="text-lg font-bold text-text-primary mb-4">💰 Real Success Scenarios</h3>
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-400 mb-2">🎮 &quot;Weekend Warrior&quot; Solo Dev</h4>
                      <div className="text-sm text-text-secondary space-y-1">
                        <div>Simple puzzle game • 50 matches/day</div>
                        <div>Daily: <span className="text-green-400 font-bold">0.25 SOL ($25)</span></div>
                        <div>Monthly: <span className="text-green-400 font-bold">7.5 SOL ($750)</span></div>
                        <div>Yearly: <span className="text-green-400 font-bold">90 SOL ($9,000)</span></div>
                        <div className="text-xs text-yellow-400 mt-2">💡 That&apos;s a nice car payment from a weekend project!</div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg p-4">
                      <h4 className="font-semibold text-green-400 mb-2">🔥 &quot;Viral Hit&quot; Indie Team</h4>
                      <div className="text-sm text-text-secondary space-y-1">
                        <div>Addictive strategy game • 2,000 matches/day</div>
                        <div>Daily: <span className="text-green-400 font-bold">10 SOL ($1,000)</span></div>
                        <div>Monthly: <span className="text-green-400 font-bold">300 SOL ($30,000)</span></div>
                        <div>Yearly: <span className="text-green-400 font-bold">3,600 SOL ($360,000)</span></div>
                        <div className="text-xs text-yellow-400 mt-2">💡 Quit your day job and build your dream studio!</div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg p-4">
                      <h4 className="font-semibold text-purple-400 mb-2">🚀 &quot;Portfolio Power&quot; Multi-Game Dev</h4>
                      <div className="text-sm text-text-secondary space-y-1">
                        <div>5 games • 200 matches/day each</div>
                        <div>Daily: <span className="text-green-400 font-bold">5 SOL ($500)</span></div>
                        <div>Monthly: <span className="text-green-400 font-bold">150 SOL ($15,000)</span></div>
                        <div>Yearly: <span className="text-green-400 font-bold">1,800 SOL ($180,000)</span></div>
                        <div className="text-xs text-yellow-400 mt-2">💡 Diversified passive income that grows while you sleep!</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-bg-elevated border border-border rounded-xl p-6">
                  <h3 className="text-lg font-bold text-text-primary mb-4">🎯 Your Revenue Breakdown</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-bg-card rounded-lg">
                      <span className="text-text-secondary">Total Platform Revenue:</span>
                      <span className="text-text-primary font-bold">{stats.totalRevenue.toFixed(4)} SOL</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <span className="text-green-400 font-semibold">Your Fair Share (50%):</span>
                      <span className="text-green-400 font-bold text-lg">{(stats.totalRevenue * 0.5).toFixed(4)} SOL</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-bg-card rounded-lg">
                      <span className="text-text-secondary">Platform Operations (50%):</span>
                      <span className="text-text-secondary">{(stats.totalRevenue * 0.5).toFixed(4)} SOL</span>
                    </div>
                    <div className="border-t border-border pt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-text-secondary">Your Avg per Match:</span>
                        <span className="text-blue-400 font-bold">
                          {stats.totalMatches > 0 ? ((stats.totalRevenue * 0.5) / stats.totalMatches).toFixed(6) : '0.000000'} SOL
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg p-4">
                    <h4 className="font-semibold text-green-400 mb-2">🎉 The Math is Beautiful</h4>
                    <div className="text-sm text-text-secondary space-y-1">
                      <div>• Every match = instant revenue share</div>
                      <div>• More players = more matches = more money</div>
                      <div>• Build once, earn forever</div>
                      <div>• Scale your income by building more games</div>
                      <div className="text-green-400 font-semibold mt-2">
                        💰 This is how developers become financially independent
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Game Performance */}
              <div className="bg-bg-elevated border border-border rounded-xl p-6">
                <h3 className="text-lg font-bold text-text-primary mb-4">🎮 Your Games & Earnings Performance</h3>
                <div className="space-y-3">
                  {projects.filter(p => p.status === 'live' || p.revenue > 0).map((project) => (
                    <div key={project.id} className="bg-bg-card border border-border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <Gamepad2 className="w-6 h-6 text-purple-400" />
                          <div>
                            <h4 className="font-semibold text-text-primary">{project.name}</h4>
                            <p className="text-sm text-text-secondary">{project.gameType}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-green-400 font-bold text-lg">{(project.revenue * 0.5).toFixed(4)} SOL</div>
                          <div className="text-xs text-green-400">${((project.revenue * 0.5) * 100).toFixed(2)} earned</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-text-secondary">Total Revenue:</span>
                          <div className="text-text-primary font-medium">{project.revenue.toFixed(4)} SOL</div>
                        </div>
                        <div>
                          <span className="text-text-secondary">Players:</span>
                          <div className="text-text-primary font-medium">{project.players.toLocaleString()}</div>
                        </div>
                        <div>
                          <span className="text-text-secondary">Matches:</span>
                          <div className="text-text-primary font-medium">{project.matches.toLocaleString()}</div>
                        </div>
                        <div>
                          <span className="text-text-secondary">Your $/Match:</span>
                          <div className="text-green-400 font-medium">
                            ${project.matches > 0 ? (((project.revenue * 0.5) / project.matches) * 100).toFixed(3) : '0.000'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {projects.filter(p => p.status === 'live' || p.revenue > 0).length === 0 && (
                    <div className="text-center py-8">
                      <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <DollarSign className="w-10 h-10 text-white" />
                      </div>
                      <h4 className="text-xl font-bold text-text-primary mb-2">Your Revenue Empire Starts Here</h4>
                      <p className="text-text-secondary mb-2">Submit your first game and start earning immediately</p>
                      <p className="text-sm text-green-400 font-semibold mb-4">
                        💡 The sooner you start, the sooner you&apos;re making money while you sleep
                      </p>
                      <button
                        onClick={() => setActiveTab('submit')}
                        className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-3 rounded-lg font-bold hover:from-blue-600 hover:to-purple-700 transition-all transform hover:scale-105"
                      >
                        🚀 Launch Your First Money-Making Game
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* My Games Section */}
          {activeTab === 'my-games' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-text-primary font-audiowide">My Games</h2>
                <div className="flex space-x-2">
                  <select className="px-4 py-2 bg-surface border border-border rounded-lg text-text-primary font-inter">
                    <option>All Status</option>
                    <option>Draft</option>
                    <option>Submitted</option>
                    <option>Under Review</option>
                    <option>Approved</option>
                    <option>Live</option>
                    <option>Rejected</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-6">
                {[
                  {
                    id: 1,
                    name: "Chess Master Pro",
                    status: "under_review",
                    submittedAt: "2024-01-15",
                    gameType: "Chess",
                    revenue: 0,
                    players: 0,
                    adminFeedback: "Initial review in progress. Game mechanics look solid.",
                    priority: "normal",
                    estimatedReviewTime: "3-5 business days"
                  },
                  {
                    id: 2,
                    name: "Speed Checkers",
                    status: "approved",
                    submittedAt: "2024-01-10",
                    approvedAt: "2024-01-12",
                    gameType: "Checkers",
                    revenue: 45.2,
                    players: 127,
                    adminFeedback: "Excellent implementation! Game is now live on the platform.",
                    priority: "high"
                  }
                ].map((game) => (
                  <div key={game.id} className="glass-card p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-text-primary font-audiowide mb-2">{game.name}</h3>
                        <div className="flex items-center space-x-4 text-sm text-text-secondary">
                          <span className="font-inter">{game.gameType}</span>
                          <span className="font-inter">Submitted {new Date(game.submittedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium font-inter ${
                          game.status === 'approved' ? 'bg-green-900/30 text-green-400' :
                          game.status === 'under_review' ? 'bg-yellow-900/30 text-yellow-400' :
                          'bg-gray-900/30 text-gray-400'
                        }`}>
                          {game.status === 'under_review' ? 'Under Review' :
                           game.status.charAt(0).toUpperCase() + game.status.slice(1)}
                        </div>
                      </div>
                    </div>

                    {/* Admin Feedback */}
                    {game.adminFeedback && (
                      <div className="mb-4 p-4 bg-surface/50 rounded-lg border-l-4 border-accent-primary">
                        <h4 className="text-sm font-bold text-text-primary mb-2 font-inter">Admin Feedback</h4>
                        <p className="text-sm text-text-secondary font-inter">{game.adminFeedback}</p>
                      </div>
                    )}

                    {/* Game Stats */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-lg font-bold text-accent-success font-audiowide">
                          ${game.revenue.toFixed(2)}
                        </div>
                        <div className="text-xs text-text-secondary font-inter">Revenue</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-accent-primary font-audiowide">{game.players}</div>
                        <div className="text-xs text-text-secondary font-inter">Players</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-accent-warning font-audiowide">
                          {game.status === 'approved' ? 'Active' : 'Inactive'}
                        </div>
                        <div className="text-xs text-text-secondary font-inter">Status</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
} 