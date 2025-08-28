'use client';

import { useState } from 'react';

interface SecurityBadgeProps {
  className?: string;
}

export default function SecurityBadge({ className = '' }: SecurityBadgeProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center space-x-2 px-3 py-1 rounded-lg bg-green-900/20 border border-green-500/30 hover:bg-green-900/30 transition-colors"
      >
        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <span className="text-sm text-green-400 font-medium">Security Verified</span>
      </button>

      {showDetails && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-bg-card border border-border rounded-lg p-4 shadow-xl z-50">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <h3 className="font-semibold text-text-primary">Security Status</h3>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">Smart Contract:</span>
                <span className="text-green-400">✓ Verified</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Upgrade Authority:</span>
                <span className="text-yellow-400">⚠ 2-of-3 Multisig</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Fund Custody:</span>
                <span className="text-green-400">✓ Non-Custodial</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Security Review:</span>
                <span className="text-green-400">✓ Completed</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Emergency Pause:</span>
                <span className="text-green-400">✓ Available</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Responsible Disclosure:</span>
                <span className="text-green-400">✓ Active</span>
              </div>
            </div>

            <div className="pt-2 border-t border-border">
              <div className="text-xs text-text-secondary mb-2">
                Program ID: <code className="bg-bg-main px-1 rounded text-xs">26Yx...8dVi</code>
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  href="/security.txt"
                  target="_blank"
                  className="text-xs text-accent-primary hover:underline"
                >
                  Security Policy
                </a>
                <a
                  href="https://explorer.solana.com/address/7KV8dJTTARc5KoDNjWpRCrVQpiuj4HoKYqTcqK2iTz8W?cluster=devnet"
                  target="_blank"
                  className="text-xs text-accent-primary hover:underline"
                >
                  View Contract
                </a>
                <a
                  href="mailto:security@pv3.gg"
                  className="text-xs text-accent-primary hover:underline"
                >
                  Report Issue
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 