'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Shield, Globe, CreditCard, ArrowLeftRight, ExternalLink } from 'lucide-react';
import OptimizedImage from '@/components/ui/OptimizedImage';

export default function Footer() {
  return (
    <footer className="bg-bg-elevated border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-4">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* PV3 Brand */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <OptimizedImage 
                src="/logos/PV3-Logo.png" 
                alt="PV3 Logo" 
                width={24} 
                height={24}
                className="w-6 h-6"
              />
              <h3 className="font-audiowide text-base font-bold text-text-primary">PV3.FUN</h3>
            </div>
            <p className="text-xs text-text-secondary">
              Decentralized gaming on Solana with enterprise security.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-2">
            <h4 className="font-audiowide text-xs font-bold text-text-primary uppercase">Platform</h4>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
              <Link href="/classics" className="text-text-secondary hover:text-text-primary transition-colors">Games</Link>
              <Link href="/tournaments" className="text-text-secondary hover:text-text-primary transition-colors">Tournaments</Link>
              <Link href="/security-features" className="text-text-secondary hover:text-text-primary transition-colors">Security</Link>
              <Link href="/developer-hub" className="text-text-secondary hover:text-text-primary transition-colors">Developers</Link>
            </div>
          </div>

          {/* Supported Networks */}
          <div className="space-y-2">
            <h4 className="font-audiowide text-xs font-bold text-text-primary uppercase">Supported Networks</h4>
            <div className="flex flex-wrap gap-2">
              <div className="group relative flex items-center space-x-1 bg-bg-card px-2 py-1 rounded hover:bg-bg-hover transition-colors cursor-pointer">
                <OptimizedImage src="/logos/solana.png" alt="Solana" width={16} height={16} />
                <span className="text-xs text-text-secondary">Solana</span>
                <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-bg-elevated border border-border rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 pointer-events-none whitespace-nowrap">
                  <span className="text-sm font-audiowide text-text-primary">Native Solana Network</span>
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-border"></div>
                </div>
              </div>
              <div className="group relative flex items-center space-x-1 bg-bg-card px-2 py-1 rounded hover:bg-bg-hover transition-colors cursor-pointer">
                <OptimizedImage src="/logos/polygon.png" alt="Polygon" width={16} height={16} />
                <span className="text-xs text-text-secondary">Polygon</span>
                <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-bg-elevated border border-border rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 pointer-events-none whitespace-nowrap">
                  <span className="text-sm font-audiowide text-text-primary">Bridge from Polygon</span>
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-border"></div>
                </div>
              </div>
              <div className="group relative flex items-center space-x-1 bg-bg-card px-2 py-1 rounded hover:bg-bg-hover transition-colors cursor-pointer">
                <OptimizedImage src="/logos/bsc.png" alt="BSC" width={16} height={16} />
                <span className="text-xs text-text-secondary">BSC</span>
                <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-bg-elevated border border-border rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 pointer-events-none whitespace-nowrap">
                  <span className="text-sm font-audiowide text-text-primary">Bridge from Binance Smart Chain</span>
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-border"></div>
                </div>
              </div>
              <div className="group relative flex items-center space-x-1 bg-bg-card px-2 py-1 rounded hover:bg-bg-hover transition-colors cursor-pointer">
                <OptimizedImage src="/logos/base.png" alt="Base" width={16} height={16} />
                <span className="text-xs text-text-secondary">Base</span>
                <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-bg-elevated border border-border rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 pointer-events-none whitespace-nowrap">
                  <span className="text-sm font-audiowide text-text-primary">Bridge from Base Network</span>
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-border"></div>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <div className="group relative flex items-center space-x-1 bg-bg-card px-2 py-1 rounded hover:bg-bg-hover transition-colors cursor-pointer">
                <OptimizedImage src="/logos/usdc.png" alt="USDC" width={16} height={16} />
                <span className="text-xs text-text-secondary">USDC</span>
                <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-bg-elevated border border-border rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 pointer-events-none whitespace-nowrap">
                  <span className="text-sm font-audiowide text-text-primary">USD Coin Support</span>
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-border"></div>
                </div>
              </div>
              <div className="group relative flex items-center space-x-1 bg-bg-card px-2 py-1 rounded hover:bg-bg-hover transition-colors cursor-pointer">
                <OptimizedImage src="/logos/usdt.png" alt="USDT" width={16} height={16} />
                <span className="text-xs text-text-secondary">USDT</span>
                <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-bg-elevated border border-border rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 pointer-events-none whitespace-nowrap">
                  <span className="text-sm font-audiowide text-text-primary">Tether USD Support</span>
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-border"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Technology Partners Section */}
        <div className="border-t border-border mt-6 pt-4">
          <h4 className="font-audiowide text-xs font-bold text-text-primary uppercase mb-3 text-center">
            Powered By
          </h4>
          <div className="flex justify-center items-center gap-6 flex-wrap">
            {/* PV3 Gaming - First Position */}
            <div className="group relative flex items-center space-x-1 opacity-60 hover:opacity-100 transition-opacity cursor-pointer">
              <OptimizedImage src="/logos/PV3-Logo.png" alt="PV3 Gaming" width={36} height={36} />
              <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-bg-elevated border border-border rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 pointer-events-none whitespace-nowrap">
                <span className="text-sm font-audiowide text-text-primary">Powered By PV3 Gaming</span>
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-border"></div>
              </div>
            </div>
            
            {/* Solana Blockchain - Core Infrastructure */}
            <div className="group relative flex items-center space-x-1 opacity-60 hover:opacity-100 transition-opacity cursor-pointer">
              <OptimizedImage src="/logos/solana.png" alt="Solana" width={36} height={36} />
              <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-bg-elevated border border-border rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 pointer-events-none whitespace-nowrap">
                <span className="text-sm font-audiowide text-text-primary">Built on Solana Blockchain</span>
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-border"></div>
              </div>
            </div>
            
            {/* Game Engines */}
            <div className="group relative flex items-center space-x-1 opacity-60 hover:opacity-100 transition-opacity cursor-pointer">
              <OptimizedImage src="/logos/unity.png" alt="Unity" width={36} height={36} className="filter brightness-0 invert" />
              <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-bg-elevated border border-border rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 pointer-events-none whitespace-nowrap">
                <span className="text-sm font-audiowide text-text-primary">Powered By Unity</span>
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-border"></div>
              </div>
            </div>
            
            <div className="group relative flex items-center space-x-1 opacity-60 hover:opacity-100 transition-opacity cursor-pointer">
              <OptimizedImage src="/logos/godot.png" alt="Godot" width={36} height={36} />
              <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-bg-elevated border border-border rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 pointer-events-none whitespace-nowrap">
                <span className="text-sm font-audiowide text-text-primary">Powered By Godot</span>
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-border"></div>
              </div>
            </div>
            
            <div className="group relative flex items-center space-x-1 opacity-60 hover:opacity-100 transition-opacity cursor-pointer">
              <OptimizedImage src="/logos/unreal.png" alt="Unreal Engine" width={36} height={36} className="filter brightness-0 invert" />
              <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-bg-elevated border border-border rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 pointer-events-none whitespace-nowrap">
                <span className="text-sm font-audiowide text-text-primary">Powered By Unreal Engine</span>
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-border"></div>
              </div>
            </div>
            
            {/* Blockchain & Infrastructure */}
            <div className="group relative flex items-center space-x-1 opacity-60 hover:opacity-100 transition-opacity cursor-pointer">
              <OptimizedImage src="/logos/wormhole.png" alt="Wormhole" width={36} height={36} />
              <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-bg-elevated border border-border rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 pointer-events-none whitespace-nowrap">
                <span className="text-sm font-audiowide text-text-primary">Powered By Wormhole</span>
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-border"></div>
              </div>
            </div>
            
            {/* Payment Partners */}
            <div className="group relative flex items-center space-x-1 opacity-60 hover:opacity-100 transition-opacity cursor-pointer">
              <OptimizedImage src="/logos/Coinbase.png" alt="Coinbase" width={36} height={36} className="filter brightness-0 invert" />
              <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-bg-elevated border border-border rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 pointer-events-none whitespace-nowrap">
                <span className="text-sm font-audiowide text-text-primary">Powered By Coinbase</span>
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-border"></div>
              </div>
            </div>
            
            {/* Wallet Partners */}
            <div className="group relative flex items-center space-x-1 opacity-60 hover:opacity-100 transition-opacity cursor-pointer">
              <OptimizedImage src="/logos/phantom.png" alt="Phantom" width={36} height={36} />
              <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-bg-elevated border border-border rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 pointer-events-none whitespace-nowrap">
                <span className="text-sm font-audiowide text-text-primary">Powered By Phantom</span>
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-border"></div>
              </div>
            </div>
            
            <div className="group relative flex items-center space-x-1 opacity-60 hover:opacity-100 transition-opacity cursor-pointer">
              <OptimizedImage src="/logos/solflare.png" alt="Solflare" width={36} height={36} />
              <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-bg-elevated border border-border rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 pointer-events-none whitespace-nowrap">
                <span className="text-sm font-audiowide text-text-primary">Powered By Solflare</span>
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-border"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar - Enhanced with Logos */}
        <div className="border-t border-border mt-4 pt-3 flex flex-col sm:flex-row justify-between items-center gap-2">
            
          {/* Left - Copyright */}
          <div className="text-xs text-text-secondary">
            © 2025 PV3 Gaming Ltd • Built on Solana
          </div>

          {/* Center - Badges */}
          <div className="flex items-center gap-3 text-xs text-text-secondary">
            <div className="flex items-center gap-1">
              <Shield className="w-3 h-3 text-green-400" />
              <span>Provably Fair</span>
            </div>
            <div className="flex items-center gap-1">
              <Globe className="w-3 h-3 text-blue-400" />
              <span>Decentralized</span>
            </div>
          </div>

          {/* Right - Partners with Logos */}
          <div className="flex items-center gap-3 text-xs">
            <a 
              href="https://solana.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-text-secondary hover:text-text-primary transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 512 512" fill="none">
                <defs>
                  <linearGradient id="solanaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#9945FF"/>
                    <stop offset="100%" stopColor="#14F195"/>
                  </linearGradient>
                </defs>
                <path d="M79.4 374.2C82.1 371.5 85.9 370 90 370H460C469.8 370 476.2 380.7 471.4 389.1L432.6 457.8C429.9 462.5 425.1 466 420 466H50C40.2 466 33.8 455.3 38.6 446.9L79.4 374.2Z" fill="url(#solanaGradient)"/>
                <path d="M79.4 137.8C82.1 140.5 85.9 142 90 142H460C469.8 142 476.2 131.3 471.4 122.9L432.6 54.2C429.9 49.5 425.1 46 420 46H50C40.2 46 33.8 56.7 38.6 65.1L79.4 137.8Z" fill="url(#solanaGradient)"/>
                <path d="M432.6 254.2C429.9 251.5 426.1 250 422 250H52C42.2 250 35.8 260.7 40.6 269.1L79.4 337.8C82.1 342.5 86.9 346 92 346H462C471.8 346 478.2 335.3 473.4 326.9L432.6 254.2Z" fill="url(#solanaGradient)"/>
              </svg>
              <span>Solana</span>
            </a>
            <span className="text-text-muted">•</span>
            <a 
              href="https://commerce.coinbase.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-text-secondary hover:text-text-primary transition-colors"
            >
                              <OptimizedImage src="/logos/Coinbase.png" alt="Coinbase" width={16} height={16} />
              <span>Coinbase</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
} 