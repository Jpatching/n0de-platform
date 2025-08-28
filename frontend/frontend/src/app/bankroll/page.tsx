'use client';

import { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import PageHeader from '../../components/PageHeader';

export default function BankrollPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  
  // Initialize with conservative defaults - will be loaded from user preferences
  const [limits, setLimits] = useState({
    dailyDeposit: 10,
    weeklyDeposit: 50,
    monthlyDeposit: 200,
    dailyLoss: 100,
    weeklyLoss: 500,
    monthlyLoss: 2000,
    sessionTime: 120, // minutes
    maxWager: 10
  });

  // Track real usage from user's actual activity
  const [currentUsage, setCurrentUsage] = useState({
    dailyDeposited: 0,
    weeklyDeposited: 0,
    monthlyDeposited: 0,
    dailyLost: 0,
    weeklyLost: 0,
    monthlyLost: 0,
    sessionTime: 0,
    currentWager: 0
  });

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'limits', label: 'Set Limits', icon: '🛡️' },
    { id: 'tools', label: 'Safety Tools', icon: '⚠️' },
    { id: 'analytics', label: 'Analytics', icon: '📈' },
    { id: 'history', label: 'Transaction History', icon: '🕒' },
  ];

  useEffect(() => {
    loadBankrollData();
    loadTransactionHistory();
  }, []);

  const loadBankrollData = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      // const response = await fetch('/api/v1/user/balance');
      // const data = await response.json();
      // setBalance(data.balance);
      
      // Temporary placeholder - remove when API is ready
      setBalance(12.5);
    } catch (error) {
      console.error('Failed to load bankroll data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTransactionHistory = async () => {
    try {
      // TODO: Replace with actual API call
      // const response = await fetch('/api/v1/user/transactions');
      // const data = await response.json();
      // setTransactions(data.transactions || []);
      
      // For now, show empty state until API is implemented
      setTransactions([]);
    } catch (error) {
      console.error('Failed to load transaction history:', error);
      setTransactions([]);
    }
  };

  const handleLimitChange = (type: string, value: number) => {
    setLimits(prev => ({ ...prev, [type]: value }));
  };

  const saveLimits = async () => {
    try {
      // TODO: Replace with actual API call
      // await fetch('/api/v1/user/limits', {
      //   method: 'POST',
      //   body: JSON.stringify(limits)
      // });
      console.log('Limits saved:', limits);
    } catch (error) {
      console.error('Failed to save limits:', error);
    }
  };

  return (
    <div className="min-h-screen bg-main text-text-primary">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:ml-64 min-h-screen">
        <PageHeader onMenuClick={() => setSidebarOpen(true)} />
        <main className="p-6">
          <div className="max-w-6xl mx-auto">
            
            {/* Header */}
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">💰</div>
              <h1 className="text-4xl font-bold text-text-primary mb-2 font-audiowide uppercase">
                Bankroll Management
              </h1>
              <p className="text-lg text-text-secondary font-inter">
                Set limits, track spending, and play responsibly
              </p>
            </div>

            {/* Responsible Gaming Notice */}
            <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-500/50 rounded-xl p-6 mb-8">
              <div className="flex items-center space-x-3 mb-3">
                <span className="text-2xl">🛡️</span>
                <h2 className="text-xl font-bold font-audiowide">Responsible Gaming Commitment</h2>
              </div>
              <p className="text-sm text-text-secondary">
                PV3 is committed to promoting responsible gaming. Set limits that work for you and stick to them. 
                Gaming should be fun and entertaining, never a way to solve financial problems.
              </p>
            </div>

            {/* Tab Navigation */}
            <div className="flex flex-wrap justify-center mb-8 bg-bg-elevated border border-border rounded-lg p-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-audiowide text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'bg-accent-primary text-black'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Spending Limits Tab */}
            {activeTab === 'limits' && (
              <div className="space-y-8">
                
                {/* Current Usage Overview */}
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="bg-bg-elevated border border-border rounded-xl p-6">
                    <h3 className="text-lg font-bold mb-4 font-audiowide">Daily Usage</h3>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Deposited</span>
                          <span>${currentUsage.dailyDeposited} / ${limits.dailyDeposit}</span>
                        </div>
                        <div className="w-full bg-bg-card rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full" 
                            style={{ width: `${(currentUsage.dailyDeposited / limits.dailyDeposit) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Lost</span>
                          <span>${currentUsage.dailyLost} / ${limits.dailyLoss}</span>
                        </div>
                        <div className="w-full bg-bg-card rounded-full h-2">
                          <div 
                            className="bg-red-500 h-2 rounded-full" 
                            style={{ width: `${(currentUsage.dailyLost / limits.dailyLoss) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-bg-elevated border border-border rounded-xl p-6">
                    <h3 className="text-lg font-bold mb-4 font-audiowide">Weekly Usage</h3>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Deposited</span>
                          <span>${currentUsage.weeklyDeposited} / ${limits.weeklyDeposit}</span>
                        </div>
                        <div className="w-full bg-bg-card rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full" 
                            style={{ width: `${(currentUsage.weeklyDeposited / limits.weeklyDeposit) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Lost</span>
                          <span>${currentUsage.weeklyLost} / ${limits.weeklyLoss}</span>
                        </div>
                        <div className="w-full bg-bg-card rounded-full h-2">
                          <div 
                            className="bg-red-500 h-2 rounded-full" 
                            style={{ width: `${(currentUsage.weeklyLost / limits.weeklyLoss) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-bg-elevated border border-border rounded-xl p-6">
                    <h3 className="text-lg font-bold mb-4 font-audiowide">Monthly Usage</h3>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Deposited</span>
                          <span>${currentUsage.monthlyDeposited} / ${limits.monthlyDeposit}</span>
                        </div>
                        <div className="w-full bg-bg-card rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full" 
                            style={{ width: `${(currentUsage.monthlyDeposited / limits.monthlyDeposit) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Lost</span>
                          <span>${currentUsage.monthlyLost} / ${limits.monthlyLoss}</span>
                        </div>
                        <div className="w-full bg-bg-card rounded-full h-2">
                          <div 
                            className="bg-red-500 h-2 rounded-full" 
                            style={{ width: `${(currentUsage.monthlyLost / limits.monthlyLoss) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Limit Settings */}
                <div className="grid md:grid-cols-2 gap-8">
                  
                  {/* Deposit Limits */}
                  <div className="bg-bg-elevated border border-border rounded-xl p-6">
                    <h3 className="text-xl font-bold mb-6 font-audiowide">Deposit Limits</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Daily Deposit Limit (SOL)</label>
                        <input
                          type="number"
                          value={limits.dailyDeposit}
                          onChange={(e) => handleLimitChange('dailyDeposit', Number(e.target.value))}
                          className="w-full p-3 bg-bg-card border border-border rounded-lg focus:border-accent-primary focus:outline-none"
                          min="0"
                          step="0.1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Weekly Deposit Limit (SOL)</label>
                        <input
                          type="number"
                          value={limits.weeklyDeposit}
                          onChange={(e) => handleLimitChange('weeklyDeposit', Number(e.target.value))}
                          className="w-full p-3 bg-bg-card border border-border rounded-lg focus:border-accent-primary focus:outline-none"
                          min="0"
                          step="0.1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Monthly Deposit Limit (SOL)</label>
                        <input
                          type="number"
                          value={limits.monthlyDeposit}
                          onChange={(e) => handleLimitChange('monthlyDeposit', Number(e.target.value))}
                          className="w-full p-3 bg-bg-card border border-border rounded-lg focus:border-accent-primary focus:outline-none"
                          min="0"
                          step="0.1"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Loss Limits */}
                  <div className="bg-bg-elevated border border-border rounded-xl p-6">
                    <h3 className="text-xl font-bold mb-6 font-audiowide">Loss Limits</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Daily Loss Limit (SOL)</label>
                        <input
                          type="number"
                          value={limits.dailyLoss}
                          onChange={(e) => handleLimitChange('dailyLoss', Number(e.target.value))}
                          className="w-full p-3 bg-bg-card border border-border rounded-lg focus:border-accent-primary focus:outline-none"
                          min="0"
                          step="0.1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Weekly Loss Limit (SOL)</label>
                        <input
                          type="number"
                          value={limits.weeklyLoss}
                          onChange={(e) => handleLimitChange('weeklyLoss', Number(e.target.value))}
                          className="w-full p-3 bg-bg-card border border-border rounded-lg focus:border-accent-primary focus:outline-none"
                          min="0"
                          step="0.1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Monthly Loss Limit (SOL)</label>
                        <input
                          type="number"
                          value={limits.monthlyLoss}
                          onChange={(e) => handleLimitChange('monthlyLoss', Number(e.target.value))}
                          className="w-full p-3 bg-bg-card border border-border rounded-lg focus:border-accent-primary focus:outline-none"
                          min="0"
                          step="0.1"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Session & Wager Limits */}
                  <div className="bg-bg-elevated border border-border rounded-xl p-6">
                    <h3 className="text-xl font-bold mb-6 font-audiowide">Session Controls</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Session Time Limit (minutes)</label>
                        <input
                          type="number"
                          value={limits.sessionTime}
                          onChange={(e) => handleLimitChange('sessionTime', Number(e.target.value))}
                          className="w-full p-3 bg-bg-card border border-border rounded-lg focus:border-accent-primary focus:outline-none"
                          min="15"
                          step="15"
                        />
                        <p className="text-xs text-text-secondary mt-1">You&apos;ll be reminded to take a break</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Maximum Single Wager (SOL)</label>
                        <input
                          type="number"
                          value={limits.maxWager}
                          onChange={(e) => handleLimitChange('maxWager', Number(e.target.value))}
                          className="w-full p-3 bg-bg-card border border-border rounded-lg focus:border-accent-primary focus:outline-none"
                          min="0.1"
                          step="0.1"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Reality Check */}
                  <div className="bg-bg-elevated border border-border rounded-xl p-6">
                    <h3 className="text-xl font-bold mb-6 font-audiowide">Reality Check</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Session Time Reminders</p>
                          <p className="text-sm text-text-secondary">Get notified every 30 minutes</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" defaultChecked />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[\'\'] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-accent-primary"></div>
                        </label>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Loss Alerts</p>
                          <p className="text-sm text-text-secondary">Alert when approaching limits</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" defaultChecked />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[\'\'] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-accent-primary"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="text-center">
                  <button 
                    onClick={saveLimits}
                    className="bg-accent-primary text-black font-bold py-4 px-8 rounded-lg hover:bg-accent-primary/90 transition-colors font-audiowide"
                  >
                    SAVE LIMITS
                  </button>
                  <p className="text-sm text-text-secondary mt-2">
                    Changes take effect immediately. Limit increases have a 24-hour cooling period.
                  </p>
                </div>
              </div>
            )}

            {/* Safety Tools Tab */}
            {activeTab === 'tools' && (
              <div className="space-y-8">
                
                {/* Self-Exclusion */}
                <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/50 rounded-xl p-8">
                  <div className="flex items-center space-x-3 mb-4">
                    <span className="text-3xl">🚫</span>
                    <h2 className="text-2xl font-bold font-audiowide">Self-Exclusion</h2>
                  </div>
                  <p className="text-text-secondary mb-6">
                    If you need a break from gaming, you can temporarily or permanently exclude yourself from PV3. 
                    This decision should not be taken lightly.
                  </p>
                  <div className="grid md:grid-cols-3 gap-4">
                    <button className="bg-yellow-500/20 border border-yellow-500 text-yellow-400 font-bold py-3 px-6 rounded-lg hover:bg-yellow-500/30 transition-colors">
                      24 Hour Break
                    </button>
                    <button className="bg-orange-500/20 border border-orange-500 text-orange-400 font-bold py-3 px-6 rounded-lg hover:bg-orange-500/30 transition-colors">
                      1 Week Break
                    </button>
                    <button className="bg-red-500/20 border border-red-500 text-red-400 font-bold py-3 px-6 rounded-lg hover:bg-red-500/30 transition-colors">
                      Permanent Exclusion
                    </button>
                  </div>
                </div>

                {/* Problem Gambling Resources */}
                <div className="bg-bg-elevated border border-border rounded-xl p-8">
                  <h2 className="text-2xl font-bold mb-6 font-audiowide">Need Help?</h2>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-bold mb-3">Warning Signs</h3>
                      <ul className="text-sm text-text-secondary space-y-2">
                        <li>• Spending more than you can afford</li>
                        <li>• Chasing losses with bigger bets</li>
                        <li>• Gaming to escape problems</li>
                        <li>• Lying about gaming activities</li>
                        <li>• Neglecting responsibilities</li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-bold mb-3">Get Support</h3>
                      <div className="space-y-3">
                        <a href="#" className="block bg-bg-card p-3 rounded-lg hover:bg-bg-hover transition-colors">
                          <div className="font-medium">National Problem Gambling Helpline</div>
                          <div className="text-sm text-text-secondary">1-800-522-4700</div>
                        </a>
                        <a href="#" className="block bg-bg-card p-3 rounded-lg hover:bg-bg-hover transition-colors">
                          <div className="font-medium">Gamblers Anonymous</div>
                          <div className="text-sm text-text-secondary">www.gamblersanonymous.org</div>
                        </a>
                        <a href="#" className="block bg-bg-card p-3 rounded-lg hover:bg-bg-hover transition-colors">
                          <div className="font-medium">GamCare</div>
                          <div className="text-sm text-text-secondary">www.gamcare.org.uk</div>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div className="space-y-8">
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-bg-elevated border border-border rounded-xl p-6 text-center">
                    <div className="text-3xl font-bold text-green-400 mb-2">+$127</div>
                    <p className="text-text-secondary">Total Profit/Loss</p>
                    <p className="text-xs text-green-400 mt-1">This Month</p>
                  </div>
                  <div className="bg-bg-elevated border border-border rounded-xl p-6 text-center">
                    <div className="text-3xl font-bold text-blue-400 mb-2">73%</div>
                    <p className="text-text-secondary">Win Rate</p>
                    <p className="text-xs text-text-secondary mt-1">Last 30 days</p>
                  </div>
                  <div className="bg-bg-elevated border border-border rounded-xl p-6 text-center">
                    <div className="text-3xl font-bold text-purple-400 mb-2">42</div>
                    <p className="text-text-secondary">Games Played</p>
                    <p className="text-xs text-text-secondary mt-1">This week</p>
                  </div>
                  <div className="bg-bg-elevated border border-border rounded-xl p-6 text-center">
                    <div className="text-3xl font-bold text-yellow-400 mb-2">2.3h</div>
                    <p className="text-text-secondary">Avg Session</p>
                    <p className="text-xs text-text-secondary mt-1">Daily average</p>
                  </div>
                </div>

                <div className="bg-bg-elevated border border-border rounded-xl p-6">
                  <h3 className="text-xl font-bold mb-4 font-audiowide">Gaming Pattern Analysis</h3>
                  <div className="text-center py-8 text-text-secondary">
                    <div className="text-4xl mb-4">📊</div>
                    <p>Detailed analytics coming soon</p>
                    <p className="text-sm mt-2">Track your gaming patterns, peak performance times, and more</p>
                  </div>
                </div>
              </div>
            )}

            {/* Transaction History Tab */}
            {activeTab === 'history' && (
              <div className="bg-bg-elevated border border-border rounded-xl p-6">
                <h3 className="text-xl font-bold mb-6 font-audiowide">Recent Transactions</h3>
                <div className="space-y-4">
                  {transactions.length === 0 ? (
                    <div className="text-center py-8 text-text-secondary">
                      <div className="text-4xl mb-4">📊</div>
                      <p>No transactions yet</p>
                      <p className="text-sm mt-2">Your transaction history will appear here</p>
                    </div>
                  ) : (
                    transactions.map((tx, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-bg-card rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className={`w-3 h-3 rounded-full ${tx.type.includes('Win') || tx.type === 'Deposit' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <div>
                            <div className="font-medium">{tx.type}</div>
                            <div className="text-sm text-text-secondary">{tx.date}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-bold ${tx.amount.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
                            {tx.amount}
                          </div>
                          <div className="text-sm text-text-secondary">{tx.status}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <button className="w-full mt-4 py-2 border border-border rounded-lg text-text-secondary hover:bg-bg-hover transition-colors">
                  View All Transactions
                </button>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
} 