'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { twoFactorService } from '../services/twoFactorService';

interface TwoFactorManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TwoFactorManager({ isOpen, onClose }: TwoFactorManagerProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{
    enabled: boolean;
    backupCodesGenerated: boolean;
    lastVerification?: string;
  }>({ enabled: false, backupCodesGenerated: false });
  
  const [setupData, setSetupData] = useState<{
    qrCode: string;
    secret: string;
    backupCodes: string[];
  } | null>(null);
  
  const [verificationToken, setVerificationToken] = useState('');
  const [step, setStep] = useState<'status' | 'setup' | 'verify' | 'backup-codes'>('status');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadStatus();
    }
  }, [isOpen]);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const statusData = await twoFactorService.get2FAStatus();
      setStatus(statusData);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load 2FA status' });
    } finally {
      setLoading(false);
    }
  };

  const handleEnable2FA = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const setup = await twoFactorService.generate2FASetup();
      setSetupData(setup);
      setStep('setup');
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndEnable = async () => {
    if (!verificationToken.trim()) {
      setMessage({ type: 'error', text: 'Please enter the 6-digit code' });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      await twoFactorService.enable2FA(verificationToken);
      setMessage({ type: 'success', text: '2FA enabled successfully!' });
      setStep('backup-codes');
      await loadStatus();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!verificationToken.trim()) {
      setMessage({ type: 'error', text: 'Please enter the 6-digit code to disable 2FA' });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      await twoFactorService.disable2FA(verificationToken);
      setMessage({ type: 'success', text: '2FA disabled successfully!' });
      setStep('status');
      setVerificationToken('');
      await loadStatus();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateBackupCodes = async () => {
    setLoading(true);
    try {
      const { backupCodes } = await twoFactorService.generateBackupCodes();
      setSetupData(prev => prev ? { ...prev, backupCodes } : null);
      setStep('backup-codes');
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setMessage({ type: 'success', text: 'Copied to clipboard!' });
  };

  const downloadBackupCodes = () => {
    if (!setupData?.backupCodes) return;
    
    const content = `PV3.FUN 2FA Backup Codes\n\nGenerated: ${new Date().toISOString()}\n\n${setupData.backupCodes.join('\n')}\n\nKeep these codes safe! Each can only be used once.`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pv3-2fa-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-bg-elevated border border-border rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M12,7C13.4,7 14.8,8.6 14.8,10.1V11.1C15.4,11.4 16,12 16,12.8V16.8C16,17.4 15.4,18 14.8,18H9.2C8.6,18 8,17.4 8,16.8V12.8C8,12 8.4,11.4 9.2,11.1V10.1C9.2,8.6 10.6,7 12,7M12,8.2C11.2,8.2 10.5,8.7 10.5,10.1V11.1H13.5V10.1C13.5,8.7 12.8,8.2 12,8.2Z"/>
                </svg>
              </div>
              <div>
                <h2 className="text-heading-sm text-text-primary font-audiowide">Fortress Security</h2>
                <p className="text-xs text-text-secondary">Two-Factor Authentication</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-text-secondary hover:text-text-primary transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {message && (
            <div className={`mb-4 p-3 rounded-lg text-sm ${
              message.type === 'success' 
                ? 'bg-green-500/10 text-green-400 border border-green-500/30' 
                : 'bg-red-500/10 text-red-400 border border-red-500/30'
            }`}>
              {message.text}
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-primary"></div>
            </div>
          )}

          {!loading && step === 'status' && (
            <div className="space-y-6">
              {/* Current Status */}
              <div className="bg-bg-card border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-text-primary font-medium">2FA Status</span>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    status.enabled 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {status.enabled ? 'Enabled' : 'Disabled'}
                  </div>
                </div>
                {status.enabled && status.lastVerification && (
                  <p className="text-xs text-text-secondary">
                    Last verified: {new Date(status.lastVerification).toLocaleDateString()}
                  </p>
                )}
              </div>

              {/* Benefits */}
              <div className="bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/30 rounded-lg p-4">
                <h3 className="text-text-primary font-medium mb-3 flex items-center">
                  <svg className="w-4 h-4 mr-2 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M10,17L6,13L7.41,11.59L10,14.17L16.59,7.58L18,9L10,17Z"/>
                  </svg>
                  Vault Fortress Benefits
                </h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full mr-2"></span>
                    <span className="text-emerald-400 font-medium">100% Optional</span>
                    <span className="text-text-secondary ml-1">- Your choice, your security</span>
                  </li>
                  <li className="flex items-center">
                    <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full mr-2"></span>
                    <span className="text-cyan-400 font-medium">Bank-grade vault security</span>
                    <span className="text-text-secondary ml-1">- Military-grade protection</span>
                  </li>
                  <li className="flex items-center">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2"></span>
                    <span className="text-blue-400 font-medium">Unlimited withdrawals</span>
                    <span className="text-text-secondary ml-1">- No daily limits</span>
                  </li>
                  <li className="flex items-center">
                    <span className="w-1.5 h-1.5 bg-purple-400 rounded-full mr-2"></span>
                    <span className="text-purple-400 font-medium">Impossible to hack</span>
                    <span className="text-text-secondary ml-1">- Even we can&apos;t access your vault</span>
                  </li>
                </ul>
                <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <span className="text-blue-400 text-sm">💡</span>
                    <div className="text-xs text-blue-300">
                      <span className="font-medium">Pro Tip:</span> Enable 2FA to unlock unlimited withdrawals and sleep peacefully knowing your funds are fortress-protected!
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                {!status.enabled ? (
                  <button
                    onClick={handleEnable2FA}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all"
                  >
                    🛡️ Enable Fortress Security
                  </button>
                ) : (
                  <div className="space-y-3">
                    <button
                      onClick={handleGenerateBackupCodes}
                      className="w-full bg-bg-card border border-border text-text-primary py-3 px-4 rounded-lg font-medium hover:bg-bg-hover transition-colors"
                    >
                      🔑 Generate New Backup Codes
                    </button>
                    <button
                      onClick={() => setStep('verify')}
                      className="w-full bg-red-500/20 border border-red-500/30 text-red-400 py-3 px-4 rounded-lg font-medium hover:bg-red-500/30 transition-colors"
                    >
                      ⚠️ Disable 2FA
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {!loading && step === 'setup' && setupData && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-text-primary font-medium mb-2">Scan QR Code</h3>
                <p className="text-sm text-text-secondary mb-4">
                  Use Google Authenticator, Authy, or any TOTP app
                </p>
                <div className="bg-white p-4 rounded-lg inline-block">
                  <Image src={setupData.qrCode} alt="2FA QR Code" width={192} height={192} className="w-48 h-48" />
                </div>
              </div>

              <div className="bg-bg-card border border-border rounded-lg p-4">
                <p className="text-sm text-text-secondary mb-2">Manual entry key:</p>
                <div className="flex items-center space-x-2">
                  <code className="flex-1 bg-bg-elevated border border-border rounded px-3 py-2 text-sm font-mono text-text-primary break-all">
                    {setupData.secret}
                  </code>
                  <button
                    onClick={() => copyToClipboard(setupData.secret)}
                    className="text-accent-primary hover:text-accent-primary/80 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={verificationToken}
                  onChange={(e) => setVerificationToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full bg-bg-card border border-border rounded-lg px-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-primary transition-colors text-center text-lg font-mono"
                  maxLength={6}
                />
                <button
                  onClick={handleVerifyAndEnable}
                  disabled={verificationToken.length !== 6}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Verify & Enable 2FA
                </button>
                <button
                  onClick={() => setStep('status')}
                  className="w-full bg-bg-card border border-border text-text-primary py-3 px-4 rounded-lg font-medium hover:bg-bg-hover transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {!loading && step === 'verify' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12,2C13.1,2 14,2.9 14,4C14,5.1 13.1,6 12,6C10.9,6 10,5.1 10,4C10,2.9 10.9,2 12,2M21,9V7L15,1H5C3.89,1 3,1.89 3,3V21A2,2 0 0,0 5,23H19A2,2 0 0,0 21,21V9M12,19C10.29,19 9,17.71 9,16A3,3 0 0,1 12,13A3,3 0 0,1 15,16C15,17.71 13.71,19 12,19Z"/>
                  </svg>
                </div>
                <h3 className="text-text-primary font-medium mb-2">Disable 2FA</h3>
                <p className="text-sm text-text-secondary">
                  Enter your 6-digit code to disable two-factor authentication
                </p>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={verificationToken}
                  onChange={(e) => setVerificationToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full bg-bg-card border border-border rounded-lg px-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-primary transition-colors text-center text-lg font-mono"
                  maxLength={6}
                />
                <button
                  onClick={handleDisable2FA}
                  disabled={verificationToken.length !== 6}
                  className="w-full bg-red-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Disable 2FA
                </button>
                <button
                  onClick={() => setStep('status')}
                  className="w-full bg-bg-card border border-border text-text-primary py-3 px-4 rounded-lg font-medium hover:bg-bg-hover transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {!loading && step === 'backup-codes' && setupData?.backupCodes && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9,22A1,1 0 0,1 8,21V18H4A2,2 0 0,1 2,16V4C2,2.89 2.9,2 4,2H20A2,2 0 0,1 22,4V16A2,2 0 0,1 20,18H13.9L10.2,21.71C10,21.9 9.75,22 9.5,22V22H9M10,16V19.08L13.08,16H20V4H4V16H10M6,7H18V9H6V7M6,11H16V13H6V11Z"/>
                  </svg>
                </div>
                <h3 className="text-text-primary font-medium mb-2">Backup Codes</h3>
                <p className="text-sm text-text-secondary">
                  Save these codes safely. Each can only be used once.
                </p>
              </div>

              <div className="bg-bg-card border border-border rounded-lg p-4">
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {setupData.backupCodes.map((code, index) => (
                    <div key={index} className="bg-bg-elevated border border-border rounded px-3 py-2 text-center font-mono text-sm text-text-primary">
                      {code}
                    </div>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => copyToClipboard(setupData.backupCodes.join('\n'))}
                    className="flex-1 bg-accent-primary text-black py-2 px-3 rounded font-medium hover:bg-accent-primary/80 transition-colors text-sm"
                  >
                    📋 Copy All
                  </button>
                  <button
                    onClick={downloadBackupCodes}
                    className="flex-1 bg-bg-elevated border border-border text-text-primary py-2 px-3 rounded font-medium hover:bg-bg-hover transition-colors text-sm"
                  >
                    💾 Download
                  </button>
                </div>
              </div>

              <button
                onClick={() => {
                  setStep('status');
                  setSetupData(null);
                  setVerificationToken('');
                }}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 px-4 rounded-lg font-medium hover:from-green-600 hover:to-emerald-700 transition-all"
              >
                ✅ Complete Setup
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 