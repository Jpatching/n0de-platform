'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePV3 } from '@/hooks/usePV3';
import { useWallet } from '@solana/wallet-adapter-react';
import { BridgeButton } from './Bridge/BridgeButton';
import { CoinbasePayButton } from './CoinbasePay/CoinbasePayButton';

interface VaultManagerProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'deposit' | 'withdraw' | 'bridge' | 'fiat';
}

type NotificationType = 'success' | 'error' | null;

export default function VaultManager({ isOpen, onClose, initialTab = 'deposit' }: VaultManagerProps) {
  const { user } = useAuth();
  const { connected, publicKey, connect, disconnect, wallet, wallets, select } = useWallet();
  const isAuthenticated = !!user;
  const { 
    balance, 
    vaultBalance, 
    loading, 
    depositToVault, 
    withdrawFromVault,
    createSessionVault,
    formatSOL,
    loadBalance,
    forceRefreshBalance,
    loadWalletBalance
  } = usePV3();

  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw' | 'bridge' | 'fiat'>(initialTab);
  const [notification, setNotification] = useState<{type: NotificationType; message: string} | null>(null);
  const [twoFAToken, setTwoFAToken] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);
  const [user2FAStatus, setUser2FAStatus] = useState<{enabled: boolean; backupCodesGenerated: boolean} | null>(null);

  // Check if vault exists
  // -1 = vault doesn't exist, 0+ = vault exists with balance
  const vaultExists = vaultBalance >= 0;
  const needsVaultCreation = vaultBalance === -1;

  // Check wallet connection status
  const walletConnected = connected && publicKey;
  const walletAddressMatches = publicKey?.toString() === user?.walletAddress;

  // Auto-hide notification after 3 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Load 2FA status and balance when component opens - only for authenticated users
  useEffect(() => {
    if (isOpen && isAuthenticated) {
      load2FAStatus();
      // Force load balance for authenticated users
      loadBalance();
      
      // Check wallet connection status and auto-reconnect if needed
      const checkWalletConnection = async () => {
        if (user?.walletAddress && (!connected || !publicKey || publicKey.toString() !== user.walletAddress)) {
          console.log('🔍 Wallet connection mismatch detected, auto-reconnecting...');
          console.log('Expected:', user.walletAddress);
          console.log('Connected:', publicKey?.toString());
          
          // Auto-reconnect wallet silently
          try {
            await handleWalletReconnect();
          } catch (error) {
            console.log('⚠️ Auto-reconnect failed:', error);
            // Don't show error notification for auto-reconnect attempts
          }
        }
      };
      
      // Run wallet check after a short delay to let other components settle
      setTimeout(checkWalletConnection, 1000);
    }
  }, [isOpen, isAuthenticated, loadBalance, user?.walletAddress, connected, publicKey]);

  // Update active tab when initialTab prop changes
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const load2FAStatus = async () => {
    try {
      const token = localStorage.getItem('pv3_session_token');
      if (!token) return;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://pv3-backend-api-production.up.railway.app/api/v1'}/auth/2fa/status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const status = await response.json();
        setUser2FAStatus(status);
      }
    } catch (error) {
      console.error('Failed to load 2FA status:', error);
    }
  };

  if (!isOpen) return null;

  const showNotification = (type: NotificationType, message: string) => {
    setNotification({ type, message });
  };

  const handleCreateVault = async () => {
    console.log('🏦 VaultManager: handleCreateVault clicked!');
    console.log('🔍 VaultManager: Current state:', {
      loading,
      isAuthenticated,
      user: !!user,
      createSessionVault: typeof createSessionVault
    });
    
    try {
      console.log('🚀 VaultManager: Calling createSessionVault...');
      await createSessionVault();
      console.log('✅ VaultManager: Session vault created successfully!');
      showNotification('success', 'Session vault created successfully! You can now deposit funds.');
    } catch (error) {
      console.error('❌ VaultManager: Create vault error:', error);
      showNotification('error', `Failed to create vault: ${error}`);
    }
  };

  const handleDeposit = async () => {
    if (!depositAmount || isNaN(Number(depositAmount))) return;
    
    // Check wallet connection first
    if (!walletConnected || !walletAddressMatches) {
      showNotification('error', 'Please connect your wallet first. Click the "Reconnect Wallet" button below.');
      return;
    }
    
    try {
      await depositToVault(Number(depositAmount));
      setDepositAmount('');
      showNotification('success', `Successfully deposited ${depositAmount} SOL to vault!`);
    } catch (error) {
      showNotification('error', `Deposit failed: ${error}`);
    }
  };

  // Handle wallet reconnection
  const handleWalletReconnect = async () => {
    try {
      console.log('🔧 Starting wallet reconnection...');
      
      // Step 1: Disconnect if already connected
      if (connected) {
        console.log('🔌 Disconnecting current wallet...');
        await disconnect();
        // Wait for disconnection to complete
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Step 2: Check if we have wallets available
      if (!wallets || wallets.length === 0) {
        throw new Error('No wallets available. Please install a Solana wallet like Phantom.');
      }
      
      // Step 3: Find and select appropriate wallet
      const walletName = localStorage.getItem('walletName') || 'Phantom';
      let targetWallet = wallets.find(w => w.adapter.name === walletName);
      
      // Fallback to Phantom if preferred not found
      if (!targetWallet) {
        targetWallet = wallets.find(w => w.adapter.name === 'Phantom');
      }
      
      // Final fallback to first available
      if (!targetWallet) {
        targetWallet = wallets[0];
      }
      
      console.log('🎯 Target wallet:', targetWallet.adapter.name);
      
      // Step 4: Select the wallet first
      if (select) {
        console.log('🔍 Selecting wallet...');
        select(targetWallet.adapter.name);
        
        // Wait for selection to process
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Step 5: Connect to the selected wallet
      console.log('🔗 Connecting to wallet...');
      await connect();
      
      // Step 6: Wait for connection to stabilize
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Step 7: Verify connection
      if (connected && publicKey) {
        console.log('✅ Wallet reconnected successfully:', publicKey.toString());
        showNotification('success', 'Wallet reconnected successfully!');
        
        // Store the successful wallet name for future use
        localStorage.setItem('walletName', targetWallet.adapter.name);
      } else {
        throw new Error('Wallet connection failed - please try again');
      }
      
    } catch (error) {
      console.error('❌ Wallet reconnection failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      showNotification('error', `Failed to reconnect wallet: ${errorMessage}`);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || isNaN(Number(withdrawAmount))) return;
    
    const amount = Number(withdrawAmount);
    
    // Check if 2FA is required for this withdrawal amount
    // 2FA required for withdrawals over 5 SOL at once, regardless of 2FA status
    const requires2FAForAmount = amount > 5;
    
    if (user2FAStatus?.enabled && requires2FAForAmount && !twoFAToken.trim()) {
      setRequires2FA(true);
      showNotification('error', '2FA required for withdrawals over 5 SOL');
      return;
    }
    
    try {
      // Call enhanced withdrawal with 2FA token if provided
      await withdrawFromVaultWith2FA(amount, user2FAStatus?.enabled && requires2FAForAmount ? twoFAToken : undefined);
      setWithdrawAmount('');
      setTwoFAToken('');
      setRequires2FA(false);
      showNotification('success', `Successfully withdrew ${withdrawAmount} SOL from vault!`);
    } catch (error) {
      showNotification('error', `Withdraw failed: ${error}`);
    }
  };

  // Enhanced withdrawal function with 2FA support
  const withdrawFromVaultWith2FA = async (amount: number, totpToken?: string) => {
    const token = localStorage.getItem('pv3_session_token');
    if (!token) throw new Error('Please authenticate first');

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://pv3-backend-api-production.up.railway.app/api/v1'}/vault/withdraw`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount,
        totpToken
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Withdrawal failed');
    }

    const result = await response.json();
    await loadBalance(); // Reload balances
    return result;
  };

  const setMaxDeposit = () => {
    const maxDeposit = Math.max(0, (balance - 5000000) / 1000000000);
    setDepositAmount(maxDeposit.toFixed(6));
  };

  const setMaxWithdraw = () => {
    const maxWithdraw = vaultBalance / 1000000000;
    setWithdrawAmount(maxWithdraw.toFixed(6));
  };

  const handleBridgeComplete = async (amount: string) => {
    // Refresh vault balance after bridge completion
    await loadBalance();
    showNotification('success', `${amount} SOL bridged and ready for gaming! 🎮`);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-bg-elevated border border-border rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 relative">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-text-primary font-audiowide">💰 Vault Manager</h2>
          <button 
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Built-in Notification */}
        {notification && (
          <div className={`mb-4 p-3 rounded-lg border ${
            notification.type === 'success' 
              ? 'bg-green-500/10 border-green-500/20 text-green-400' 
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          } animate-pulse-slow`}>
            <div className="flex items-center space-x-2">
              {notification.type === 'success' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <span className="font-inter text-sm">{notification.message}</span>
            </div>
          </div>
        )}

        {!isAuthenticated && (
          <div className="text-center p-8">
            <p className="text-text-secondary font-inter">Connect your wallet first</p>
          </div>
        )}

        {isAuthenticated && (
          <>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="glass-card p-4">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-text-secondary text-sm font-inter">Wallet Balance</div>
                  <button
                    onClick={forceRefreshBalance}
                    disabled={loading}
                    className="text-xs bg-accent-primary/20 hover:bg-accent-primary/30 text-accent-primary px-2 py-1 rounded transition-colors disabled:opacity-50"
                    title="Force refresh all balances"
                  >
                    {loading ? '🔄' : '↻'}
                  </button>
                </div>
                <div className="text-text-primary font-bold font-audiowide">{formatSOL(balance)}</div>
              </div>
              <div className="glass-card p-4">
                <div className="text-text-secondary text-sm font-inter mb-1">Vault Balance</div>
                <div className="text-accent-primary font-bold font-audiowide">
                  {vaultBalance === -1 ? 'Not Created' : formatSOL(vaultBalance)}
                </div>
              </div>
            </div>

            {needsVaultCreation ? (
              // Show create vault section
              <div className="text-center space-y-4">
                <div className="glass-card p-6">
                  <div className="text-text-secondary text-sm font-inter mb-4">
                    🏦 <strong>Session Vault Required</strong>
                  </div>
                  <div className="text-text-muted text-xs font-inter mb-4 space-y-2">
                    <p>• Session vaults enable frictionless gameplay</p>
                    <p>• No wallet signatures needed for each match</p>
                    <p>• Your funds stay secure in your personal PDA</p>
                    <p>• Withdraw anytime back to your wallet</p>
                  </div>
                  <button
                    onClick={(e) => {
                      console.log('🖱️ Button clicked!', e);
                      handleCreateVault();
                    }}
                    disabled={loading}
                    className="primary-button w-full font-audiowide disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ pointerEvents: 'auto', zIndex: 1 }}
                  >
                    {loading ? 'Creating...' : 'Create Session Vault'}
                  </button>
                </div>
              </div>
            ) : (
              // Show deposit/withdraw/bridge tabs
              <>
                <div className="grid grid-cols-2 gap-1 bg-bg-card rounded-lg p-1 mb-6">
                  <button
                    onClick={() => setActiveTab('fiat')}
                    className={`py-2 px-3 rounded-md font-audiowide text-xs transition-all relative ${
                      activeTab === 'fiat'
                        ? 'bg-gradient-to-r from-green-500 to-blue-500 text-white'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    💳 Buy SOL
                    <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold animate-pulse">
                      🔥
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveTab('deposit')}
                    className={`py-2 px-3 rounded-md font-audiowide text-xs transition-all ${
                      activeTab === 'deposit'
                        ? 'bg-accent-primary text-black'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    Deposit
                  </button>
                  <button
                    onClick={() => setActiveTab('bridge')}
                    className={`py-2 px-3 rounded-md font-audiowide text-xs transition-all relative ${
                      activeTab === 'bridge'
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    Bridge
                    <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                      ✨
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveTab('withdraw')}
                    className={`py-2 px-3 rounded-md font-audiowide text-xs transition-all ${
                      activeTab === 'withdraw'
                        ? 'bg-accent-primary text-black'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    Withdraw
                  </button>
                </div>

                {activeTab === 'fiat' && (
                  <div className="space-y-4">
                    <div className="glass-card p-4 lg:p-6 bg-gradient-to-br from-green-500/10 to-blue-500/10 border-green-500/20">
                      <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-3 mb-4">
                        <span className="text-2xl">💳</span>
                        <div className="flex-1">
                          <h3 className="font-audiowide text-sm lg:text-base text-text-primary">Coinbase Commerce Integration</h3>
                          <p className="text-xs text-text-secondary font-inter">Powered by Coinbase • Instant fiat to SOL</p>
                        </div>
                        <div className="flex-shrink-0">
                          <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded-full text-xs font-bold">
                            PARTNER
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-xs text-text-muted font-inter mb-4 space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <p>• <span className="text-green-400 font-medium">Instant SOL delivery</span> - funds appear immediately</p>
                          <p>• <span className="text-blue-400 font-medium">Enterprise security</span> - Coinbase infrastructure</p>
                          <p>• <span className="text-purple-400 font-medium">Multiple payments</span> - cards, bank, Apple Pay</p>
                          <p>• <span className="text-orange-400 font-medium">Simple pricing</span> - powered by Coinbase</p>
                        </div>
                        <p className="text-cyan-400 font-medium">• Global coverage - available in 100+ countries</p>
                      </div>

                      <div className="bg-bg-card/50 rounded-lg p-3 mb-4 border border-green-500/20">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-green-400">⚡</span>
                          <span className="text-xs font-audiowide text-green-400">SEAMLESS GAMING EXPERIENCE</span>
                        </div>
                        <p className="text-xs text-text-secondary">
                          Skip crypto exchanges. Buy SOL with your card and start gaming in under 60 seconds.
                          SOL automatically deposited to your secure vault for instant gameplay.
                        </p>
                      </div>

                      <CoinbasePayButton
                        variant="default"
                        size="default"
                        className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white border-0 font-audiowide py-3 lg:py-4 text-sm lg:text-base touch-manipulation"
                        onPaymentComplete={handleBridgeComplete}
                      />
                      
                      <div className="mt-3 text-center">
                        <p className="text-xs text-text-muted">
                          Minimum $1 • Maximum $10,000 • Powered by 
                          <span className="text-blue-400 font-medium"> Coinbase Commerce</span>
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'deposit' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-text-secondary text-sm font-inter mb-2">
                        Amount to Deposit (SOL)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={depositAmount}
                          onChange={(e) => setDepositAmount(e.target.value)}
                          placeholder="0.00"
                          step="0.001"
                          min="0"
                          className="w-full bg-bg-card border border-border rounded-lg px-4 py-3 text-text-primary font-inter focus:outline-none focus:border-accent-primary"
                        />
                        <button
                          onClick={setMaxDeposit}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-accent-secondary text-sm font-audiowide hover:text-accent-primary"
                        >
                          MAX
                        </button>
                      </div>
                    </div>
                    
                    {/* Wallet Connection Status */}
                    {isAuthenticated && (
                      <div className={`p-3 rounded-lg border ${
                        walletConnected && walletAddressMatches 
                          ? 'bg-green-500/10 border-green-500/30' 
                          : 'bg-red-500/10 border-red-500/30'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={walletConnected && walletAddressMatches ? '🟢' : '🔴'}>
                              {walletConnected && walletAddressMatches ? '🟢' : '🔴'}
                            </span>
                            <span className="text-xs font-audiowide">
                              {walletConnected && walletAddressMatches 
                                ? 'WALLET CONNECTED' 
                                : 'WALLET DISCONNECTED'
                              }
                            </span>
                          </div>
                          {(!walletConnected || !walletAddressMatches) && (
                            <button
                              onClick={handleWalletReconnect}
                              className="text-xs bg-accent-primary/20 hover:bg-accent-primary/30 text-accent-primary px-2 py-1 rounded transition-colors"
                              disabled={loading}
                            >
                              Reconnect
                            </button>
                          )}
                        </div>
                        {(!walletConnected || !walletAddressMatches) && (
                          <div className="text-xs text-text-muted mt-2">
                            Your wallet must be connected to deposit SOL
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="text-xs text-text-muted font-inter">
                      💡 Backend deposits SOL to your session vault for frictionless gaming
                    </div>

                    <button
                      onClick={handleDeposit}
                      disabled={!depositAmount || loading || Number(depositAmount) <= 0 || !walletConnected || !walletAddressMatches}
                      className="primary-button w-full font-audiowide disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Processing...' : 'Deposit to Vault'}
                    </button>
                  </div>
                )}

                {activeTab === 'bridge' && (
                  <div className="space-y-4">
                    <div className="glass-card p-4 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/20">
                      <div className="flex items-center space-x-2 mb-3">
                        <span className="text-2xl">🌉</span>
                        <div>
                          <h3 className="font-audiowide text-sm text-text-primary">Multi-Chain Bridge</h3>
                          <p className="text-xs text-text-secondary font-inter">Deposit from any blockchain</p>
                        </div>
                      </div>
                      
                      <div className="text-xs text-text-muted font-inter mb-4 space-y-1">
                        <p>• Bridge ETH, USDC, USDT → SOL</p>
                        <p>• From Ethereum, Polygon, BNB Chain</p>
                        <p>• Powered by Wormhole technology</p>
                        <p>• Funds go directly to your vault</p>
                      </div>

                      <BridgeButton
                        variant="default"
                        size="default"
                        className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-0"
                        onBridgeComplete={handleBridgeComplete}
                      />
                    </div>
                  </div>
                )}

                {activeTab === 'withdraw' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-text-secondary text-sm font-inter mb-2">
                        Amount to Withdraw (SOL)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                          placeholder="0.00"
                          step="0.001"
                          min="0"
                          className="w-full bg-bg-card border border-border rounded-lg px-4 py-3 text-text-primary font-inter focus:outline-none focus:border-accent-primary"
                        />
                        <button
                          onClick={setMaxWithdraw}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-accent-secondary text-sm font-audiowide hover:text-accent-primary"
                        >
                          MAX
                        </button>
                      </div>
                    </div>

                    {/* 2FA Status & Limits */}
                    <div className="bg-bg-card border border-border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-audiowide text-text-secondary">WITHDRAWAL LIMITS</span>
                        {user2FAStatus?.enabled && (
                          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full font-bold">
                            2FA ENABLED
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-text-muted font-inter space-y-1">
                        <div className="flex justify-between">
                          <span>Without 2FA:</span>
                          <span className="text-text-primary">Max 1 SOL per withdrawal</span>
                        </div>
                        <div className="flex justify-between">
                          <span>With 2FA:</span>
                          <span className="text-emerald-400">Unlimited withdrawals</span>
                        </div>
                        <div className="flex justify-between">
                          <span>2FA Required:</span>
                          <span className="text-yellow-400">Over 5 SOL at once</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Fee:</span>
                          <span className="text-text-primary">{user2FAStatus?.enabled ? '0.25%' : '0.5%'}</span>
                        </div>
                      </div>
                    </div>

                    {/* 2FA Input (show when needed) */}
                    {user2FAStatus?.enabled && Number(withdrawAmount) > 5 && (
                      <div>
                        <label className="block text-text-secondary text-sm font-inter mb-2">
                          🔐 2FA Code (Required for withdrawals over 5 SOL)
                        </label>
                        <input
                          type="text"
                          value={twoFAToken}
                          onChange={(e) => setTwoFAToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="123456"
                          maxLength={6}
                          className="w-full bg-bg-card border border-emerald-500/50 rounded-lg px-4 py-3 text-text-primary font-mono text-center text-lg focus:outline-none focus:border-emerald-400"
                        />
                        <div className="text-xs text-emerald-300 font-inter mt-1">
                          Enter the 6-digit code from your authenticator app
                        </div>
                      </div>
                    )}
                    
                    <div className="text-xs text-text-muted font-inter">
                      💸 Withdrawals transfer SOL back to your wallet
                    </div>

                    <button
                      onClick={handleWithdraw}
                      disabled={!withdrawAmount || loading || Number(withdrawAmount) <= 0}
                      className="secondary-button w-full font-audiowide disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Processing...' : 'Withdraw from Vault'}
                    </button>
                  </div>
                )}
              </>
            )}

            <div className="mt-6 p-4 bg-bg-card border border-border rounded-lg">
              <h3 className="font-audiowide text-sm text-text-primary mb-2">How Vaults Work:</h3>
              <ul className="text-xs text-text-secondary font-inter space-y-1">
                <li>• Each player gets their own PDA vault address</li>
                <li>• Funds are non-custodial - you control the keys</li>
                <li>• Games deduct wagers directly from your vault</li>
                <li>• Winnings are deposited back to your vault</li>
                <li>• Bridge any crypto directly to your vault</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 