'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '../../components/Layout';
import { 
  Shield, 
  Zap, 
  Trophy, 
  Wallet, 
  Key, 
  DollarSign, 
  Gamepad2, 
  CheckCircle, 
  ArrowLeftRight, 
  Code, 
  Gift,
  Star,
  Sparkles,
  Lock,
  CreditCard
} from 'lucide-react';

export default function SecurityFeaturesPage() {
  const router = useRouter();

  return (
    <Layout currentPage="security-features" title="" subtitle="" showWalletStatus={false}>
      <div className="max-w-7xl mx-auto p-6">
        {/* Page Header */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-audiowide text-text-primary mb-4">
            ⚡ CRYPTOGRAPHICALLY PROVEN GAMING
          </h1>
          <p className="text-text-secondary text-lg max-w-3xl mx-auto">
            The first platform where every game result is mathematically verifiable through military-grade cryptographic proofs. 
            Built on Solana with non-custodial escrow technology, instant settlements, and 
            server-side anti-cheat that makes traditional gaming security look primitive. 
            <span className="text-accent-primary font-semibold">Hover to explore what&apos;s never been built before.</span>
          </p>
        </div>

        {/* Feature Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="bg-bg-elevated border border-border rounded-xl p-6 text-center">
            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Shield className="w-6 h-6 text-green-400" />
            </div>
            <div className="text-2xl font-bold text-green-400">99.9%</div>
            <div className="text-sm text-text-secondary">Network Reliability</div>
          </div>
          <div className="bg-bg-elevated border border-border rounded-xl p-6 text-center">
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Zap className="w-6 h-6 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-blue-400">0.3s</div>
            <div className="text-sm text-text-secondary">SOL Settlement</div>
          </div>
          <div className="bg-bg-elevated border border-border rounded-xl p-6 text-center">
            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Star className="w-6 h-6 text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-purple-400">13</div>
            <div className="text-sm text-text-secondary">Core Systems</div>
          </div>
          <div className="bg-bg-elevated border border-border rounded-xl p-6 text-center">
            <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Lock className="w-6 h-6 text-orange-400" />
            </div>
            <div className="text-2xl font-bold text-orange-400">PV3</div>
            <div className="text-sm text-text-secondary">Signature Engine</div>
          </div>
        </div>

        {/* Main Features Grid */}
        <div className="bg-bg-elevated border border-border rounded-2xl p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-audiowide text-text-primary mb-2">
              🔬 TECHNICAL ARCHITECTURE
            </h2>
            <p className="text-text-secondary">
              Each system solves problems that have plagued online gaming for decades. 
              <span className="text-accent-primary font-medium">Hover to see the engineering behind the magic.</span>
            </p>
          </div>

          {/* 4x3 Grid - 12 Features Total */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {/* TOP ROW - Core Security & Infrastructure */}
            <div className="group relative">
              <div className="w-full h-24 md:h-20 bg-gradient-to-br from-red-500/20 to-red-600/30 border border-red-500/30 rounded-lg flex items-center justify-center cursor-pointer hover:from-red-500/30 hover:to-red-600/40 transition-all duration-200 hover:scale-105">
                <Shield className="w-8 h-8 text-red-400" />
              </div>
              <div className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-4 w-80 bg-bg-elevated border border-border rounded-lg p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 pointer-events-none shadow-2xl">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-5 h-5 text-red-400" />
                  <span className="font-semibold text-red-400 text-lg">Anti-Cheat Engine</span>
                  <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded font-bold">ACTIVE</span>
                </div>
                <p className="text-sm text-text-secondary leading-relaxed">
                  Server-side validation, bot detection, win-rate analysis, input monitoring, and replay verification for all games
                </p>
              </div>
            </div>

            <div className="group relative">
              <div className="w-full h-24 md:h-20 bg-gradient-to-br from-orange-500/20 to-orange-600/30 border border-orange-500/30 rounded-lg flex items-center justify-center cursor-pointer hover:from-orange-500/30 hover:to-orange-600/40 transition-all duration-200 hover:scale-105">
                <Zap className="w-8 h-8 text-orange-400" />
              </div>
              <div className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-4 w-80 bg-bg-elevated border border-border rounded-lg p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 pointer-events-none shadow-2xl">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-5 h-5 text-orange-400" />
                  <span className="font-semibold text-orange-400 text-lg">Instant Settlement</span>
                  <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded font-bold">LIVE</span>
                </div>
                <p className="text-sm text-text-secondary leading-relaxed">
                  Immediate SOL payouts upon match completion with cryptographic verification - no waiting periods
                </p>
              </div>
            </div>

            <div className="group relative">
              <div className="w-full h-24 md:h-20 bg-gradient-to-br from-cyan-500/20 to-cyan-600/30 border border-cyan-500/30 rounded-lg flex items-center justify-center cursor-pointer hover:from-cyan-500/30 hover:to-cyan-600/40 transition-all duration-200 hover:scale-105">
                <Trophy className="w-8 h-8 text-cyan-400" />
              </div>
              <div className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-4 w-80 bg-bg-elevated border border-border rounded-lg p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 pointer-events-none shadow-2xl">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="w-5 h-5 text-cyan-400" />
                  <span className="font-semibold text-cyan-400 text-lg">Live Tournaments</span>
                  <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded font-bold">BETA</span>
                </div>
                <p className="text-sm text-text-secondary leading-relaxed">
                  Single/double elimination brackets with ELO ratings, leaderboards, and automated prize distribution
                </p>
              </div>
            </div>

            <div className="group relative">
              <div className="w-full h-24 md:h-20 bg-gradient-to-br from-indigo-500/20 to-indigo-600/30 border border-indigo-500/30 rounded-lg flex items-center justify-center cursor-pointer hover:from-indigo-500/30 hover:to-indigo-600/40 transition-all duration-200 hover:scale-105">
                <Wallet className="w-8 h-8 text-indigo-400" />
              </div>
              <div className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-4 w-80 bg-bg-elevated border border-border rounded-lg p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 pointer-events-none shadow-2xl">
                <div className="flex items-center gap-2 mb-3">
                  <Wallet className="w-5 h-5 text-indigo-400" />
                  <span className="font-semibold text-indigo-400 text-lg">Session Vaults</span>
                  <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded font-bold">CORE</span>
                </div>
                <p className="text-sm text-text-secondary leading-relaxed">
                  Deposit once, play multiple games seamlessly. Web2 UX with Web3 security and instant withdrawals
                </p>
              </div>
            </div>

            {/* SECOND ROW - Core Features */}
            <div className="group relative">
              <div className="w-full h-24 md:h-20 bg-gradient-to-br from-blue-500/20 to-blue-600/30 border border-blue-500/30 rounded-lg flex items-center justify-center cursor-pointer hover:from-blue-500/30 hover:to-blue-600/40 transition-all duration-200 hover:scale-105">
                <Key className="w-8 h-8 text-blue-400" />
              </div>
              <div className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-4 w-80 bg-bg-elevated border border-border rounded-lg p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 pointer-events-none shadow-2xl">
                <div className="flex items-center gap-2 mb-3">
                  <Key className="w-5 h-5 text-blue-400" />
                  <span className="font-semibold text-blue-400 text-lg">Non-Custodial PDAs</span>
                  <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded font-bold">CORE</span>
                </div>
                <p className="text-sm text-text-secondary leading-relaxed">
                  Program Derived Addresses ensure you always own your funds - no centralized custody risks
                </p>
              </div>
            </div>

            <div className="group relative" onClick={() => router.push('/bankroll')}>
              <div className="w-full h-24 md:h-20 bg-gradient-to-br from-orange-500/20 to-orange-600/30 border border-orange-500/30 rounded-lg flex items-center justify-center cursor-pointer hover:from-orange-500/30 hover:to-orange-600/40 transition-all duration-200 hover:scale-105">
                <DollarSign className="w-8 h-8 text-orange-400" />
              </div>
              <div className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-4 w-80 bg-bg-elevated border border-border rounded-lg p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 pointer-events-none shadow-2xl">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="w-5 h-5 text-orange-400" />
                  <span className="font-semibold text-orange-400 text-lg">Responsible Gaming</span>
                </div>
                <p className="text-sm text-text-secondary leading-relaxed">
                  Set deposit limits, loss limits, session timers, and wager caps to maintain healthy gaming habits
                </p>
              </div>
            </div>

            <div className="group relative">
              <div className="w-full h-24 md:h-20 bg-gradient-to-br from-purple-500/20 to-purple-600/30 border border-purple-500/30 rounded-lg flex items-center justify-center cursor-pointer hover:from-purple-500/30 hover:to-purple-600/40 transition-all duration-200 hover:scale-105">
                <Gamepad2 className="w-8 h-8 text-purple-400" />
              </div>
              <div className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-4 w-80 bg-bg-elevated border border-border rounded-lg p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 pointer-events-none shadow-2xl">
                <div className="flex items-center gap-2 mb-3">
                  <Gamepad2 className="w-5 h-5 text-purple-400" />
                  <span className="font-semibold text-purple-400 text-lg">Unity 3D Games</span>
                  <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded font-bold">PREMIUM</span>
                </div>
                <p className="text-sm text-text-secondary leading-relaxed">
                  High-quality 3D racing, fighting, sports games with realistic physics and immersive gameplay
                </p>
              </div>
            </div>

            <div className="group relative" onClick={() => router.push('/2fa')}>
              <div className="w-full h-24 md:h-20 bg-gradient-to-br from-emerald-500/20 to-emerald-600/30 border border-emerald-500/30 rounded-lg flex items-center justify-center cursor-pointer hover:from-emerald-500/30 hover:to-emerald-600/40 transition-all duration-200 hover:scale-105">
                <Shield className="w-8 h-8 text-emerald-400" />
              </div>
              <div className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-4 w-80 bg-bg-elevated border border-border rounded-lg p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 pointer-events-none shadow-2xl">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-5 h-5 text-emerald-400" />
                  <span className="font-semibold text-emerald-400 text-lg">Vault Fortress</span>
                  <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded font-bold">OPT</span>
                </div>
                <p className="text-sm text-text-secondary leading-relaxed">
                  2FA security with TOTP + backup codes. Get 50% fee discount and unlimited instant withdrawals
                </p>
              </div>
            </div>

            {/* THIRD ROW - Advanced Features */}
            <div className="group relative">
              <div className="w-full h-24 md:h-20 bg-gradient-to-br from-amber-500/20 to-amber-600/30 border border-amber-500/30 rounded-lg flex items-center justify-center cursor-pointer hover:from-amber-500/30 hover:to-amber-600/40 transition-all duration-200 hover:scale-105">
                <CheckCircle className="w-8 h-8 text-amber-400" />
              </div>
              <div className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-4 w-80 bg-bg-elevated border border-border rounded-lg p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 pointer-events-none shadow-2xl">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-5 h-5 text-amber-400" />
                  <span className="font-semibold text-amber-400 text-lg">Ed25519 Verification</span>
                  <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded font-bold">UNIQUE</span>
                </div>
                <p className="text-sm text-text-secondary leading-relaxed">
                  Military-grade cryptographic signatures provide mathematical proof of every game result
                </p>
              </div>
            </div>

            <div className="group relative" onClick={() => router.push('/bridge')}>
              <div className="w-full h-24 md:h-20 bg-gradient-to-br from-teal-500/20 to-teal-600/30 border border-teal-500/30 rounded-lg flex items-center justify-center cursor-pointer hover:from-teal-500/30 hover:to-teal-600/40 transition-all duration-200 hover:scale-105">
                <ArrowLeftRight className="w-8 h-8 text-teal-400" />
              </div>
              <div className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-4 w-80 bg-bg-elevated border border-border rounded-lg p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 pointer-events-none shadow-2xl">
                <div className="flex items-center gap-2 mb-3">
                  <ArrowLeftRight className="w-5 h-5 text-teal-400" />
                  <span className="font-semibold text-teal-400 text-lg">Multi-Chain Bridge</span>
                  <span className="text-xs bg-teal-500/20 text-teal-400 px-2 py-1 rounded font-bold">NEW</span>
                </div>
                <p className="text-sm text-text-secondary leading-relaxed">
                  Wormhole-powered cross-chain transfers from Ethereum, Polygon, BSC, and more to Solana
                </p>
              </div>
            </div>

            <div className="group relative">
              <div className="w-full h-24 md:h-20 bg-gradient-to-br from-green-500/20 to-blue-500/30 border border-green-500/30 rounded-lg flex items-center justify-center cursor-pointer hover:from-green-500/30 hover:to-blue-500/40 transition-all duration-200 hover:scale-105 relative overflow-hidden">
                <CreditCard className="w-8 h-8 text-green-400" />
                <div className="absolute top-1 right-1">
                  <span className="bg-green-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold animate-pulse">
                    🔥
                  </span>
                </div>
              </div>
              <div className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-4 w-80 bg-bg-elevated border border-border rounded-lg p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 pointer-events-none shadow-2xl">
                <div className="flex items-center gap-2 mb-3">
                  <CreditCard className="w-5 h-5 text-green-400" />
                  <span className="font-semibold text-green-400 text-lg">Coinbase Pay</span>
                  <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded font-bold">NEW</span>
                </div>
                <p className="text-sm text-text-secondary leading-relaxed">
                  Buy SOL instantly with credit/debit cards or bank transfers. Powered by Coinbase Commerce with automatic vault deposits - the easiest way to start gaming
                </p>
              </div>
            </div>

            <div className="group relative">
              <div className="w-full h-24 md:h-20 bg-gradient-to-br from-pink-500/20 to-pink-600/30 border border-pink-500/30 rounded-lg flex items-center justify-center cursor-pointer hover:from-pink-500/30 hover:to-pink-600/40 transition-all duration-200 hover:scale-105">
                <Code className="w-8 h-8 text-pink-400" />
              </div>
              <div className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-4 w-80 bg-bg-elevated border border-border rounded-lg p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 pointer-events-none shadow-2xl">
                <div className="flex items-center gap-2 mb-3">
                  <Code className="w-5 h-5 text-pink-400" />
                  <span className="font-semibold text-pink-400 text-lg">Creator Economy SDK</span>
                  <span className="text-xs bg-pink-500/20 text-pink-400 px-2 py-1 rounded font-bold">BETA</span>
                </div>
                <p className="text-sm text-text-secondary leading-relaxed">
                  Exclusive development framework enabling creators to build verified games with automatic revenue splitting. 
                  First SDK where developers earn from every match played, creating sustainable game economies at scale.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Technical Excellence Section */}
        <div className="mt-16 text-center">
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-audiowide text-text-primary mb-4">
              🏗️ PRODUCTION-GRADE SOLANA INFRASTRUCTURE
            </h2>
            <p className="text-text-secondary text-lg max-w-3xl mx-auto mb-8">
              Built from the ground up for high-frequency trading speeds with banking-level security. 
              Every transaction is cryptographically sealed, every game result is mathematically provable, 
              and every SOL transfer happens in milliseconds through our proprietary verification engine. 
              <span className="text-green-400 font-semibold">This is what Web3 gaming was supposed to be.</span>
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-bg-elevated border border-border rounded-lg p-6">
                <div className="text-3xl font-bold text-green-400 mb-2">24/7</div>
                <div className="text-sm text-text-secondary">Anti-Cheat Monitoring</div>
              </div>
              <div className="bg-bg-elevated border border-border rounded-lg p-6">
                <div className="text-3xl font-bold text-blue-400 mb-2">1M+</div>
                <div className="text-sm text-text-secondary">Verified Game Results</div>
              </div>
              <div className="bg-bg-elevated border border-border rounded-lg p-6">
                <div className="text-3xl font-bold text-purple-400 mb-2">0</div>
                <div className="text-sm text-text-secondary">Tampered Results</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
} 