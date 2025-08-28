'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '../../components/Layout';
import { 
  Users, 
  Shield, 
  TrendingUp, 
  CheckCircle, 
  AlertTriangle, 
  Star,
  DollarSign,
  Eye,
  Target,
  Award,
  Zap,
  Globe,
  BarChart3,
  UserCheck
} from 'lucide-react';

interface PartnerStats {
  totalEarnings: number;
  totalReferrals: number;
  activeReferrals: number;
  conversionRate: number;
  tier: string;
  revenueShare: number;
}

interface PartnerApplication {
  id: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  submittedAt: string;
  adminFeedback?: string;
  tier?: string;
  revenueShare?: number;
}

export default function PartnershipPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [isPartner, setIsPartner] = useState(false);
  const [application, setApplication] = useState<PartnerApplication | null>(null);
  const [stats, setStats] = useState<PartnerStats>({
    totalEarnings: 0,
    totalReferrals: 0,
    activeReferrals: 0,
    conversionRate: 0,
    tier: 'standard',
    revenueShare: 30
  });

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    username: '',
    bio: '',
    website: '',
    twitterHandle: '',
    twitterFollowers: '',
    youtubeChannel: '',
    youtubeSubscribers: '',
    tiktokHandle: '',
    tiktokFollowers: '',
    instagramHandle: '',
    instagramFollowers: '',
    discordServer: '',
    discordMembers: '',
    applicationReason: '',
    contentStrategy: '',
    expectedReach: '',
    previousPartnerships: '',
    mediaKitUrl: '',
    portfolioUrl: '',
    demoContent: '',
    primaryAudience: '',
    audienceAge: '',
    audienceGeo: ''
  });

  useEffect(() => {
    if (user) {
      loadPartnerData();
    }
  }, [user]);

  const loadPartnerData = async () => {
    try {
      const response = await fetch('/api/partner/profile', {
        headers: {
          'Authorization': `Bearer ${user?.walletAddress}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setIsPartner(true);
        setStats(data.stats);
        setApplication(data.application);
      }
    } catch (error) {
      console.error('Error loading partner data:', error);
    }
  };

  const submitApplication = async () => {
    if (!user?.walletAddress) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/partner/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.walletAddress}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const result = await response.json();
        setApplication(result.application);
        setActiveTab('status');
      } else {
        const error = await response.json();
        alert(error.message || 'Application failed');
      }
    } catch (error) {
      console.error('Error submitting application:', error);
      alert('Application failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-400 bg-green-900/30';
      case 'under_review': return 'text-yellow-400 bg-yellow-900/30';
      case 'rejected': return 'text-red-400 bg-red-900/30';
      default: return 'text-blue-400 bg-blue-900/30';
    }
  };

  if (!user) {
    return (
      <Layout 
        currentPage="partnership" 
        title="" 
        subtitle=""
        showWalletStatus={false}
      >
        <div className="max-w-4xl mx-auto text-center py-8">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Users className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-text-primary mb-4 font-audiowide">
            ELITE KOL PARTNERSHIP PROGRAM
          </h1>
          <p className="text-text-secondary mb-8 text-lg">
            Exclusive partnerships for verified influencers. Connect your wallet to apply.
          </p>
          <div className="bg-bg-elevated border border-border rounded-lg p-8">
            <AlertTriangle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <p className="text-text-secondary">Please sign in to access the exclusive KOL application</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout currentPage="partnership" title="" subtitle="" showWalletStatus={false}>
      <div className="max-w-6xl mx-auto p-6">
        {/* Page Header */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-text-primary mb-1 font-audiowide">
            🤝 ELITE KOL PARTNERSHIP HUB
          </h1>
          <p className="text-text-secondary text-sm">Exclusive partnerships. Professional verification. Custom revenue deals.</p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-6 bg-bg-elevated rounded-lg p-1">
          {[
            { id: 'overview', label: 'Overview', icon: Eye },
            { id: 'apply', label: 'Apply Now', icon: UserCheck },
            { id: 'status', label: 'Application Status', icon: BarChart3 },
            { id: 'earnings', label: 'Earnings Dashboard', icon: DollarSign }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-accent-primary text-black'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-card'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Overview Section */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Hero Section */}
            <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-8 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Award className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-text-primary mb-4 font-audiowide">
                THE MOST EXCLUSIVE KOL PROGRAM IN WEB3
              </h2>
              <p className="text-text-secondary text-lg mb-6 max-w-3xl mx-auto">
                We partner with verified, high-quality influencers who drive real engagement. 
                Our professional verification team ensures only authentic KOLs join our elite program.
              </p>
              <div className="grid md:grid-cols-3 gap-4 text-center">
                <div className="bg-bg-elevated border border-border rounded-lg p-4">
                  <div className="text-2xl font-bold text-purple-400">&lt; 5%</div>
                  <div className="text-sm text-text-secondary">Acceptance Rate</div>
                </div>
                <div className="bg-bg-elevated border border-border rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-400">$100K+</div>
                  <div className="text-sm text-text-secondary">Elite Tier Potential</div>
                </div>
                <div className="bg-bg-elevated border border-border rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-400">24-48h</div>
                  <div className="text-sm text-text-secondary">Review Time</div>
                </div>
              </div>
            </div>

            {/* Why We're Different */}
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-bg-elevated border border-border rounded-xl p-6">
                <h3 className="text-xl font-bold text-text-primary mb-4 font-audiowide">🔍 PROFESSIONAL VERIFICATION</h3>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <Shield className="w-5 h-5 text-blue-400 mt-0.5" />
                    <div>
                      <p className="font-semibold text-text-primary">Anti-Bot Detection</p>
                      <p className="text-sm text-text-secondary">Advanced algorithms detect fake followers and engagement</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Target className="w-5 h-5 text-green-400 mt-0.5" />
                    <div>
                      <p className="font-semibold text-text-primary">Engagement Analysis</p>
                      <p className="text-sm text-text-secondary">We verify real engagement rates, not just follower counts</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <UserCheck className="w-5 h-5 text-purple-400 mt-0.5" />
                    <div>
                      <p className="font-semibold text-text-primary">Manual Review Process</p>
                      <p className="text-sm text-text-secondary">Human experts review every application personally</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-bg-elevated border border-border rounded-xl p-6">
                <h3 className="text-xl font-bold text-text-primary mb-4 font-audiowide">💰 CUSTOM DEAL STRUCTURES</h3>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <TrendingUp className="w-5 h-5 text-green-400 mt-0.5" />
                    <div>
                      <p className="font-semibold text-text-primary">Performance-Based Tiers</p>
                      <p className="text-sm text-text-secondary">Every follower becomes a perpetual income stream that compounds infinitely</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Zap className="w-5 h-5 text-orange-400 mt-0.5" />
                    <div>
                      <p className="font-semibold text-text-primary">Instant Payouts</p>
                      <p className="text-sm text-text-secondary">Real-time earnings tracking with instant withdrawals</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Globe className="w-5 h-5 text-blue-400 mt-0.5" />
                    <div>
                      <p className="font-semibold text-text-primary">Global Opportunities</p>
                      <p className="text-sm text-text-secondary">Custom campaigns based on your audience demographics</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Partnership Tiers */}
            <div className="bg-bg-elevated border border-border rounded-xl p-6">
              <h3 className="text-xl font-bold text-text-primary mb-6 font-audiowide text-center">PARTNERSHIP TIERS</h3>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-lg p-6 text-center">
                  <div className="text-3xl mb-2">🤝</div>
                  <h4 className="font-bold text-blue-400 mb-2">STANDARD</h4>
                  <div className="text-2xl font-bold text-green-400 mb-2">$5K+</div>
                  <p className="text-sm text-text-secondary mb-4">Monthly Infinite Loop</p>
                  <div className="text-left space-y-1 text-sm">
                    <div>• 10K+ verified followers</div>
                    <div>• 3%+ engagement rate</div>
                    <div>• Gaming/crypto audience</div>
                    <div>• Perpetual revenue stream</div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg p-6 text-center">
                  <div className="text-3xl mb-2">💎</div>
                  <h4 className="font-bold text-purple-400 mb-2">PREMIUM</h4>
                  <div className="text-2xl font-bold text-green-400 mb-2">$25K+</div>
                  <p className="text-sm text-text-secondary mb-4">Monthly Compounding</p>
                  <div className="text-left space-y-1 text-sm">
                    <div>• 100K+ verified followers</div>
                    <div>• 5%+ engagement rate</div>
                    <div>• Dedicated support</div>
                    <div>• Accelerated wealth building</div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-lg p-6 text-center relative">
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                    <span className="bg-yellow-500 text-black px-3 py-1 rounded-full text-xs font-bold">ELITE</span>
                  </div>
                  <div className="text-3xl mb-2">👑</div>
                  <h4 className="font-bold text-yellow-400 mb-2">ELITE</h4>
                  <div className="text-2xl font-bold text-green-400 mb-2">$100K+</div>
                  <p className="text-sm text-text-secondary mb-4">Monthly Elite Engine</p>
                  <div className="text-left space-y-1 text-sm">
                    <div>• 1M+ verified followers</div>
                    <div>• 7%+ engagement rate</div>
                    <div>• Custom campaigns</div>
                    <div>• Perpetual wealth creation</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Call to Action */}
            <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-8 text-center">
              <h3 className="text-2xl font-bold text-text-primary mb-4 font-audiowide">Ready to Build Your Infinite Empire?</h3>
              <p className="text-text-secondary mb-6">
                Transform your audience into a perpetual revenue machine. Every follower becomes lifelong income.
              </p>
              <button
                onClick={() => setActiveTab('apply')}
                className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-8 py-4 rounded-lg font-bold text-lg hover:from-purple-600 hover:to-pink-700 transition-all transform hover:scale-105"
              >
                🚀 Start Elite Application
              </button>
              <p className="text-xs text-text-secondary mt-4">
                Professional review • Custom terms • Exclusive opportunities
              </p>
            </div>
          </div>
        )}

        {/* Application Status Section */}
        {activeTab === 'status' && (
          <div className="space-y-6">
            {application ? (
              <div className="bg-bg-elevated border border-border rounded-xl p-6">
                <h2 className="text-2xl font-bold text-text-primary mb-6 font-audiowide">APPLICATION STATUS</h2>
                
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-text-primary">Your Application</h3>
                    <p className="text-text-secondary">Submitted {new Date(application.submittedAt).toLocaleDateString()}</p>
                  </div>
                  <div className={`px-4 py-2 rounded-full text-sm font-bold ${getStatusColor(application.status)}`}>
                    {application.status.toUpperCase().replace('_', ' ')}
                  </div>
                </div>

                {application.adminFeedback && (
                  <div className="bg-bg-card border border-border rounded-lg p-4 mb-6">
                    <h4 className="font-bold text-text-primary mb-2">Admin Feedback</h4>
                    <p className="text-text-secondary">{application.adminFeedback}</p>
                  </div>
                )}

                {application.status === 'approved' && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-6">
                    <h4 className="font-bold text-green-400 mb-4">🎉 Congratulations! You&apos;re Approved!</h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-text-secondary mb-2">Partnership Tier:</p>
                        <p className="font-bold text-text-primary">{application.tier?.toUpperCase()}</p>
                      </div>
                      <div>
                        <p className="text-text-secondary mb-2">Revenue Share:</p>
                        <p className="font-bold text-green-400">{application.revenueShare}%</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab('earnings')}
                      className="mt-4 bg-green-500 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-600 transition-colors"
                    >
                      View Earnings Dashboard
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-bg-elevated border border-border rounded-xl p-8 text-center">
                <AlertTriangle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-text-primary mb-2">No Application Found</h3>
                <p className="text-text-secondary mb-6">You haven&apos;t submitted a partnership application yet.</p>
                <button
                  onClick={() => setActiveTab('apply')}
                  className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-6 py-3 rounded-lg font-bold hover:from-purple-600 hover:to-pink-700 transition-all"
                >
                  Submit Application
                </button>
              </div>
            )}
          </div>
        )}

        {/* Earnings Dashboard Section */}
        {activeTab === 'earnings' && (
          <div className="space-y-6">
            {isPartner ? (
              <>
                <div className="grid md:grid-cols-4 gap-6">
                  <div className="bg-bg-elevated border border-border rounded-xl p-6 text-center">
                    <DollarSign className="w-8 h-8 text-green-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-green-400">${stats.totalEarnings.toFixed(2)}</div>
                    <div className="text-sm text-text-secondary">Infinite Earnings</div>
                  </div>
                  <div className="bg-bg-elevated border border-border rounded-xl p-6 text-center">
                    <Users className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-blue-400">{stats.totalReferrals}</div>
                    <div className="text-sm text-text-secondary">Loop Contributors</div>
                  </div>
                  <div className="bg-bg-elevated border border-border rounded-xl p-6 text-center">
                    <TrendingUp className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-purple-400">{stats.activeReferrals}</div>
                    <div className="text-sm text-text-secondary">Compounding Now</div>
                  </div>
                  <div className="bg-bg-elevated border border-border rounded-xl p-6 text-center">
                    <Target className="w-8 h-8 text-orange-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-orange-400">{(stats.conversionRate * 100).toFixed(1)}%</div>
                    <div className="text-sm text-text-secondary">Conversion Rate</div>
                  </div>
                </div>

                <div className="bg-bg-elevated border border-border rounded-xl p-6">
                  <h3 className="text-xl font-bold text-text-primary mb-4">Partnership Details</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-text-secondary mb-2">Current Tier:</p>
                      <p className="font-bold text-text-primary text-lg">{stats.tier.toUpperCase()}</p>
                    </div>
                    <div>
                      <p className="text-text-secondary mb-2">Revenue Share:</p>
                      <p className="font-bold text-green-400 text-lg">{stats.revenueShare}%</p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-bg-elevated border border-border rounded-xl p-8 text-center">
                <Shield className="w-16 h-16 text-blue-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-text-primary mb-2">Partner Access Required</h3>
                <p className="text-text-secondary mb-6">You need to be an approved partner to view earnings.</p>
                <button
                  onClick={() => setActiveTab('apply')}
                  className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-6 py-3 rounded-lg font-bold hover:from-purple-600 hover:to-pink-700 transition-all"
                >
                  Apply for Partnership
                </button>
              </div>
            )}
          </div>
        )}

        {/* Application Form Section */}
        {activeTab === 'apply' && (
          <div className="space-y-6">
            <div className="bg-bg-elevated border border-border rounded-xl p-6">
              <h2 className="text-2xl font-bold text-text-primary mb-6 font-audiowide">ELITE KOL APPLICATION</h2>
              <p className="text-text-secondary mb-6">
                Complete this comprehensive application. Our verification team will review your metrics and engagement quality.
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Personal Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-text-primary">Personal Information</h3>
                  <input
                    type="text"
                    placeholder="Full Name *"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-3 bg-bg-card border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent-primary focus:outline-none"
                  />
                  <input
                    type="email"
                    placeholder="Email Address *"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-3 bg-bg-card border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent-primary focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Primary Username/Handle"
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    className="w-full px-4 py-3 bg-bg-card border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent-primary focus:outline-none"
                  />
                  <input
                    type="url"
                    placeholder="Website/Portfolio URL"
                    value={formData.website}
                    onChange={(e) => setFormData({...formData, website: e.target.value})}
                    className="w-full px-4 py-3 bg-bg-card border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent-primary focus:outline-none"
                  />
                  <textarea
                    placeholder="Brief Bio (What makes you unique?)"
                    value={formData.bio}
                    onChange={(e) => setFormData({...formData, bio: e.target.value})}
                    rows={3}
                    className="w-full px-4 py-3 bg-bg-card border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent-primary focus:outline-none resize-none"
                  />
                </div>

                {/* Social Media Metrics */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-text-primary">Social Media Presence</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Twitter Handle"
                      value={formData.twitterHandle}
                      onChange={(e) => setFormData({...formData, twitterHandle: e.target.value})}
                      className="px-4 py-3 bg-bg-card border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent-primary focus:outline-none"
                    />
                    <input
                      type="number"
                      placeholder="Twitter Followers"
                      value={formData.twitterFollowers}
                      onChange={(e) => setFormData({...formData, twitterFollowers: e.target.value})}
                      className="px-4 py-3 bg-bg-card border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent-primary focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="YouTube Channel"
                      value={formData.youtubeChannel}
                      onChange={(e) => setFormData({...formData, youtubeChannel: e.target.value})}
                      className="px-4 py-3 bg-bg-card border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent-primary focus:outline-none"
                    />
                    <input
                      type="number"
                      placeholder="YouTube Subscribers"
                      value={formData.youtubeSubscribers}
                      onChange={(e) => setFormData({...formData, youtubeSubscribers: e.target.value})}
                      className="px-4 py-3 bg-bg-card border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent-primary focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="TikTok Handle"
                      value={formData.tiktokHandle}
                      onChange={(e) => setFormData({...formData, tiktokHandle: e.target.value})}
                      className="px-4 py-3 bg-bg-card border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent-primary focus:outline-none"
                    />
                    <input
                      type="number"
                      placeholder="TikTok Followers"
                      value={formData.tiktokFollowers}
                      onChange={(e) => setFormData({...formData, tiktokFollowers: e.target.value})}
                      className="px-4 py-3 bg-bg-card border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent-primary focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Instagram Handle"
                      value={formData.instagramHandle}
                      onChange={(e) => setFormData({...formData, instagramHandle: e.target.value})}
                      className="px-4 py-3 bg-bg-card border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent-primary focus:outline-none"
                    />
                    <input
                      type="number"
                      placeholder="Instagram Followers"
                      value={formData.instagramFollowers}
                      onChange={(e) => setFormData({...formData, instagramFollowers: e.target.value})}
                      className="px-4 py-3 bg-bg-card border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent-primary focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Application Details */}
              <div className="mt-6 space-y-4">
                <h3 className="text-lg font-bold text-text-primary">Application Details</h3>
                <textarea
                  placeholder="Why do you want to partner with PV3? What makes you a great fit? *"
                  value={formData.applicationReason}
                  onChange={(e) => setFormData({...formData, applicationReason: e.target.value})}
                  rows={4}
                  className="w-full px-4 py-3 bg-bg-card border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent-primary focus:outline-none resize-none"
                />
                <textarea
                  placeholder="How do you plan to promote PV3 to your audience? Describe your content strategy. *"
                  value={formData.contentStrategy}
                  onChange={(e) => setFormData({...formData, contentStrategy: e.target.value})}
                  rows={4}
                  className="w-full px-4 py-3 bg-bg-card border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent-primary focus:outline-none resize-none"
                />
                <div className="grid md:grid-cols-3 gap-4">
                  <input
                    type="number"
                    placeholder="Expected Monthly Reach *"
                    value={formData.expectedReach}
                    onChange={(e) => setFormData({...formData, expectedReach: e.target.value})}
                    className="px-4 py-3 bg-bg-card border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent-primary focus:outline-none"
                  />
                  <select
                    value={formData.primaryAudience}
                    onChange={(e) => setFormData({...formData, primaryAudience: e.target.value})}
                    className="px-4 py-3 bg-bg-card border border-border rounded-lg text-text-primary focus:border-accent-primary focus:outline-none"
                  >
                    <option value="">Primary Audience</option>
                    <option value="gaming">Gaming</option>
                    <option value="crypto">Crypto/Web3</option>
                    <option value="tech">Technology</option>
                    <option value="lifestyle">Lifestyle</option>
                    <option value="finance">Finance</option>
                    <option value="entertainment">Entertainment</option>
                  </select>
                  <select
                    value={formData.audienceAge}
                    onChange={(e) => setFormData({...formData, audienceAge: e.target.value})}
                    className="px-4 py-3 bg-bg-card border border-border rounded-lg text-text-primary focus:border-accent-primary focus:outline-none"
                  >
                    <option value="">Audience Age</option>
                    <option value="13-17">13-17</option>
                    <option value="18-24">18-24</option>
                    <option value="25-34">25-34</option>
                    <option value="35-44">35-44</option>
                    <option value="45+">45+</option>
                  </select>
                </div>
                <textarea
                  placeholder="Previous gaming/crypto partnerships (if any)"
                  value={formData.previousPartnerships}
                  onChange={(e) => setFormData({...formData, previousPartnerships: e.target.value})}
                  rows={3}
                  className="w-full px-4 py-3 bg-bg-card border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent-primary focus:outline-none resize-none"
                />
              </div>

              {/* Media Kit & Portfolio */}
              <div className="mt-6 space-y-4">
                <h3 className="text-lg font-bold text-text-primary">Media Kit & Portfolio</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <input
                    type="url"
                    placeholder="Media Kit URL (Google Drive, Dropbox, etc.)"
                    value={formData.mediaKitUrl}
                    onChange={(e) => setFormData({...formData, mediaKitUrl: e.target.value})}
                    className="px-4 py-3 bg-bg-card border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent-primary focus:outline-none"
                  />
                  <input
                    type="url"
                    placeholder="Portfolio/Best Content URL"
                    value={formData.portfolioUrl}
                    onChange={(e) => setFormData({...formData, portfolioUrl: e.target.value})}
                    className="px-4 py-3 bg-bg-card border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent-primary focus:outline-none"
                  />
                </div>
                <textarea
                  placeholder="Links to your best gaming/crypto content (YouTube videos, tweets, etc.)"
                  value={formData.demoContent}
                  onChange={(e) => setFormData({...formData, demoContent: e.target.value})}
                  rows={3}
                  className="w-full px-4 py-3 bg-bg-card border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent-primary focus:outline-none resize-none"
                />
              </div>

              {/* Submit Button */}
              <div className="mt-8 text-center">
                <button
                  onClick={submitApplication}
                  disabled={loading || !formData.name || !formData.email || !formData.applicationReason || !formData.contentStrategy}
                  className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-8 py-4 rounded-lg font-bold text-lg hover:from-purple-600 hover:to-pink-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Submitting Application...' : '🚀 Submit Elite Application'}
                </button>
                <p className="text-xs text-text-secondary mt-4">
                  * Required fields • Review within 24-48 hours • Professional verification process
                </p>
              </div>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
} 