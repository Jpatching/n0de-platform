'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Palette, Check, Copy } from 'lucide-react';
import styles from './ColorSchemeAnalyzer.module.css';

// Common logo color combinations and their complementary schemes
const logoColorSchemes = {
  // Blue-based logos (common for tech)
  blue: {
    name: 'Blue Tech',
    primary: '#0066FF',
    secondary: '#00CCFF',
    accent: '#FF6B35',
    backgrounds: {
      dark: '#0A0A0F',
      darker: '#050508',
      card: '#1A1A2E',
      elevated: '#16213E'
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#B8BCC8',
      muted: '#6B7280'
    }
  },
  
  // Green-based (like current N0DE)
  green: {
    name: 'Cyber Green',
    primary: '#01d3f4',
    secondary: '#00D4AA',
    accent: '#8B5CF6',
    backgrounds: {
      dark: '#0A0F0A',
      darker: '#050805',
      card: '#1A2E1A',
      elevated: '#0F2F0F'
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#B8C8B8',
      muted: '#6B8070'
    }
  },

  // Purple/Violet (premium tech feel)
  purple: {
    name: 'Neural Purple',
    primary: '#8B5CF6',
    secondary: '#A78BFA',
    accent: '#10B981',
    backgrounds: {
      dark: '#0F0A0F',
      darker: '#080508',
      card: '#2E1A2E',
      elevated: '#3F1E3F'
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#C8B8C8',
      muted: '#8070B0'
    }
  },

  // Orange/Red (energy, performance)
  orange: {
    name: 'Performance Orange',
    primary: '#FF6B35',
    secondary: '#FF8F65',
    accent: '#00D4AA',
    backgrounds: {
      dark: '#0F0A05',
      darker: '#080502',
      card: '#2E1A0A',
      elevated: '#3F2010'
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#C8B8A8',
      muted: '#A08060'
    }
  },

  // Cyan/Teal (modern, clean)
  cyan: {
    name: 'Digital Cyan',
    primary: '#06B6D4',
    secondary: '#67E8F9',
    accent: '#F59E0B',
    backgrounds: {
      dark: '#05080F',
      darker: '#020408',
      card: '#0A1E2E',
      elevated: '#0F2A3F'
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#A8C8D8',
      muted: '#6080A0'
    }
  },

  // Monochrome (sophisticated)
  mono: {
    name: 'Elite Monochrome',
    primary: '#FFFFFF',
    secondary: '#E5E5E5',
    accent: '#01d3f4',
    backgrounds: {
      dark: '#0A0A0A',
      darker: '#050505',
      card: '#1A1A1A',
      elevated: '#2A2A2A'
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#B8B8B8',
      muted: '#808080'
    }
  }
};

export default function ColorSchemeAnalyzer() {
  const [selectedScheme, setSelectedScheme] = useState<string>('green');
  const [copiedColor, setCopiedColor] = useState<string | null>(null);

  const copyColor = (color: string) => {
    navigator.clipboard.writeText(color);
    setCopiedColor(color);
    setTimeout(() => setCopiedColor(null), 2000);
  };

  const currentScheme = logoColorSchemes[selectedScheme as keyof typeof logoColorSchemes];

  // Apply the color scheme to CSS variables
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--color-primary', currentScheme.primary);
    root.style.setProperty('--color-secondary', currentScheme.secondary);
    root.style.setProperty('--color-accent', currentScheme.accent);
    root.style.setProperty('--color-bg-default', currentScheme.backgrounds.dark);
    root.style.setProperty('--color-bg-elevated', currentScheme.backgrounds.elevated);
    root.style.setProperty('--color-bg-card', currentScheme.backgrounds.card);
    root.style.setProperty('--color-text-primary', currentScheme.text.primary);
    root.style.setProperty('--color-text-secondary', currentScheme.text.secondary);
    root.style.setProperty('--color-text-muted', currentScheme.text.muted);
  }, [currentScheme]);

  return (
    <div className={`min-h-screen p-8 ${styles.analyzer}`}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center space-x-3 mb-6">
            <Palette className={`w-8 h-8 ${styles.primary}`} />
            <h1 className={`text-4xl font-bold ${styles.textPrimary}`}>
              N0DE Color Scheme Analyzer
            </h1>
          </div>
          <p className={`text-lg ${styles.textSecondary}`}>
            Choose the color scheme that best matches your logo
          </p>
        </motion.div>

        {/* Scheme Selector */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12">
          {Object.entries(logoColorSchemes).map(([key, scheme]) => (
            <motion.button
              key={key}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedScheme(key)}
              className={`p-4 rounded-xl border-2 transition-all ${
                selectedScheme === key 
                  ? 'border-white' 
                  : 'border-transparent hover:border-gray-500'
              }`}
              style={{ backgroundColor: scheme.backgrounds.card }}
            >
              <div className="flex flex-col items-center space-y-2">
                <div className="flex space-x-1">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: scheme.primary }}
                  />
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: scheme.secondary }}
                  />
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: scheme.accent }}
                  />
                </div>
                <span 
                  className="text-sm font-semibold"
                  style={{ color: scheme.text.primary }}
                >
                  {scheme.name}
                </span>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Color Palette Display */}
        <motion.div
          key={selectedScheme}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12"
        >
          {/* Main Colors */}
          <div 
            className="p-8 rounded-2xl"
            style={{ backgroundColor: currentScheme.backgrounds.card }}
          >
            <h3 
              className="text-2xl font-bold mb-6"
              style={{ color: currentScheme.text.primary }}
            >
              Main Colors
            </h3>
            <div className="space-y-4">
              {[
                { name: 'Primary', color: currentScheme.primary },
                { name: 'Secondary', color: currentScheme.secondary },
                { name: 'Accent', color: currentScheme.accent }
              ].map((colorInfo) => (
                <div key={colorInfo.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div 
                      className="w-12 h-12 rounded-lg border-2 border-gray-600"
                      style={{ backgroundColor: colorInfo.color }}
                    />
                    <div>
                      <div 
                        className="font-semibold"
                        style={{ color: currentScheme.text.primary }}
                      >
                        {colorInfo.name}
                      </div>
                      <div 
                        className="text-sm font-mono"
                        style={{ color: currentScheme.text.secondary }}
                      >
                        {colorInfo.color}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => copyColor(colorInfo.color)}
                    className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    {copiedColor === colorInfo.color ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4" style={{ color: currentScheme.text.secondary }} />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Background Colors */}
          <div 
            className="p-8 rounded-2xl"
            style={{ backgroundColor: currentScheme.backgrounds.card }}
          >
            <h3 
              className="text-2xl font-bold mb-6"
              style={{ color: currentScheme.text.primary }}
            >
              Background Colors
            </h3>
            <div className="space-y-4">
              {[
                { name: 'Main Background', color: currentScheme.backgrounds.dark },
                { name: 'Darker Background', color: currentScheme.backgrounds.darker },
                { name: 'Card Background', color: currentScheme.backgrounds.card },
                { name: 'Elevated Background', color: currentScheme.backgrounds.elevated }
              ].map((bgInfo) => (
                <div key={bgInfo.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div 
                      className="w-12 h-12 rounded-lg border-2 border-gray-600"
                      style={{ backgroundColor: bgInfo.color }}
                    />
                    <div>
                      <div 
                        className="font-semibold"
                        style={{ color: currentScheme.text.primary }}
                      >
                        {bgInfo.name}
                      </div>
                      <div 
                        className="text-sm font-mono"
                        style={{ color: currentScheme.text.secondary }}
                      >
                        {bgInfo.color}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => copyColor(bgInfo.color)}
                    className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    {copiedColor === bgInfo.color ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4" style={{ color: currentScheme.text.secondary }} />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Preview Section */}
        <motion.div
          key={`${selectedScheme}-preview`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-8 rounded-2xl"
          style={{ backgroundColor: currentScheme.backgrounds.card }}
        >
          <h3 
            className="text-2xl font-bold mb-6"
            style={{ color: currentScheme.text.primary }}
          >
            Preview: N0DE Header with {currentScheme.name}
          </h3>
          
          {/* Mock Header */}
          <div 
            className="p-6 rounded-xl mb-6"
            style={{ backgroundColor: currentScheme.backgrounds.elevated }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-black"
                  style={{ backgroundColor: currentScheme.primary }}
                >
                  n
                </div>
                <span 
                  className="text-2xl font-bold"
                  style={{ color: currentScheme.text.primary }}
                >
                  N0DE
                </span>
              </div>
              <div className="flex items-center space-x-6">
                <span style={{ color: currentScheme.text.secondary }}>Features</span>
                <span style={{ color: currentScheme.text.secondary }}>Pricing</span>
                <span style={{ color: currentScheme.text.secondary }}>Docs</span>
                <button 
                  className="px-4 py-2 rounded-lg font-semibold text-black"
                  style={{ backgroundColor: currentScheme.primary }}
                >
                  Launch App
                </button>
              </div>
            </div>
          </div>

          {/* Mock Content */}
          <div className="space-y-4">
            <h1 
              className="text-4xl font-bold"
              style={{ color: currentScheme.text.primary }}
            >
              Built for the{' '}
              <span style={{ color: currentScheme.primary }}>Best</span>
            </h1>
            <p 
              className="text-xl"
              style={{ color: currentScheme.text.secondary }}
            >
              The fastest, most reliable Mainnet-only Solana RPC infrastructure
            </p>
            <button 
              className="px-6 py-3 rounded-xl font-semibold text-black"
              style={{ backgroundColor: currentScheme.primary }}
            >
              Get Started
            </button>
          </div>
        </motion.div>

        {/* CSS Export */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-12 p-8 rounded-2xl"
          style={{ backgroundColor: currentScheme.backgrounds.card }}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 
              className="text-2xl font-bold"
              style={{ color: currentScheme.text.primary }}
            >
              CSS Variables for {currentScheme.name}
            </h3>
            <button
              onClick={() => copyColor(`
:root {
  --color-primary: ${currentScheme.primary};
  --color-secondary: ${currentScheme.secondary};
  --color-accent: ${currentScheme.accent};
  --color-bg-default: ${currentScheme.backgrounds.dark};
  --color-bg-elevated: ${currentScheme.backgrounds.elevated};
  --color-bg-card: ${currentScheme.backgrounds.card};
  --color-text-primary: ${currentScheme.text.primary};
  --color-text-secondary: ${currentScheme.text.secondary};
  --color-text-muted: ${currentScheme.text.muted};
}`)}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Copy className="w-4 h-4" style={{ color: currentScheme.text.secondary }} />
              <span style={{ color: currentScheme.text.secondary }}>Copy CSS</span>
            </button>
          </div>
          
          <pre 
            className="text-sm font-mono p-4 rounded-lg overflow-x-auto"
            style={{ 
              backgroundColor: currentScheme.backgrounds.darker,
              color: currentScheme.text.secondary 
            }}
          >
{`:root {
  --color-primary: ${currentScheme.primary};
  --color-secondary: ${currentScheme.secondary};
  --color-accent: ${currentScheme.accent};
  --color-bg-default: ${currentScheme.backgrounds.dark};
  --color-bg-elevated: ${currentScheme.backgrounds.elevated};
  --color-bg-card: ${currentScheme.backgrounds.card};
  --color-text-primary: ${currentScheme.text.primary};
  --color-text-secondary: ${currentScheme.text.secondary};
  --color-text-muted: ${currentScheme.text.muted};
}`}
          </pre>
        </motion.div>
      </div>
    </div>
  );
}