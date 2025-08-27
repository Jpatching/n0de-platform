import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // !! CRITICAL FIX: Update color names to match HTML classes !!
        // HTML uses bg-bg-main but config defined bg-main (missing prefix)
        
        // Background colors (with bg- prefix to match HTML)
        'bg-main': '#0f0f0f',         // Matches HTML: bg-bg-main  
        'bg-elevated': '#1a1a1a',     // Matches HTML: bg-bg-elevated
        'bg-card': '#202020',         // Matches HTML: bg-bg-card
        'bg-hover': '#1A1A1A',        // Hover states
        'bg-accent': '#0F1419',       // Accent backgrounds
        
        // Text colors (with text- prefix to match HTML)
        'text-primary': '#ffffff',    // Matches HTML: text-text-primary
        'text-secondary': '#a1a1aa',  // Matches HTML: text-text-secondary  
        'text-muted': '#71717a',      // Matches HTML: text-text-muted
        'text-accent': '#00FF88',     // Accent text
        
        // Border colors
        'border': '#27272a',          // Matches HTML: border-border
        'border-hover': '#00FF88',    // n0de signature green
        
        // N0DE Brand Colors - Exact logo gradient colors
        'N0DE-cyan': '#01d3f4',       // Bright Cyan (logo left)
        'N0DE-sky': '#0b86f8',        // Vivid Sky Blue (logo middle)  
        'N0DE-navy': '#00255e',       // Deep Navy Blue (logo right)  
        'N0DE-green': '#10b981',      // Success green
        'N0DE-blue': '#3b82f6',       // Blue accent
        'N0DE-purple': '#8b5cf6',     // Premium purple - Enterprise
        'n0de-yellow': '#FFD700',     // Warning/Alert yellow
        'n0de-red': '#FF3B30',        // Error/Critical red
        
        // Performance Gradients - Using exact logo colors
        'speed-gradient-from': '#01d3f4',
        'speed-gradient-to': '#00255e',
        'premium-gradient-from': '#8B5CF6',
        'premium-gradient-to': '#00FF88',
        'danger-gradient-from': '#FF3B30',
        'danger-gradient-to': '#FF6B6B',
      },
      fontFamily: {
        'inter': ['Inter', 'sans-serif'],
        'mono': ['JetBrains Mono', 'Consolas', 'Monaco', 'monospace'],
        'display': ['Space Grotesk', 'Inter', 'sans-serif'],
      },
      fontSize: {
        'display-2xl': ['4.5rem', { lineHeight: '1.1', fontWeight: '800' }],
        'display-xl': ['3.75rem', { lineHeight: '1.1', fontWeight: '800' }],
        'display-lg': ['3rem', { lineHeight: '1.2', fontWeight: '700' }],
        'display-md': ['2.25rem', { lineHeight: '1.2', fontWeight: '600' }],
        'display-sm': ['1.875rem', { lineHeight: '1.3', fontWeight: '600' }],
      },
      animation: {
        'pulse-green': 'pulse-green 2s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 3s ease-in-out infinite',
        'slide-up': 'slide-up 0.5s ease-out',
        'slide-down': 'slide-down 0.5s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        'matrix-rain': 'matrix-rain 20s linear infinite',
        'scroll': 'scroll 30s linear infinite',
      },
      keyframes: {
        'pulse-green': {
          '0%, 100%': { 
            boxShadow: '0 0 0 0 rgba(0, 255, 136, 0.7)',
            transform: 'scale(1)'
          },
          '50%': { 
            boxShadow: '0 0 0 10px rgba(0, 255, 136, 0)',
            transform: 'scale(1.05)'
          },
        },
        'glow': {
          '0%': { boxShadow: '0 0 20px rgba(0, 255, 136, 0.5)' },
          '100%': { boxShadow: '0 0 40px rgba(0, 255, 136, 0.8), 0 0 60px rgba(0, 255, 136, 0.3)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-down': {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'matrix-rain': {
          '0%': { transform: 'translateY(-100vh)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        'scroll': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      backgroundImage: {
        'speed-gradient': 'linear-gradient(135deg, var(--tw-gradient-stops))',
        'premium-gradient': 'linear-gradient(135deg, var(--tw-gradient-stops))',
        'grid-pattern': 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)',
        'glass-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
        'glow-gradient': 'radial-gradient(600px circle at var(--mouse-x) var(--mouse-y), rgba(0,255,136,0.15), transparent 40%)',
      },
      backgroundSize: {
        'grid': '20px 20px',
      },
      backdropBlur: {
        'xs': '2px',
      },
    },
  },
  plugins: [],
};

export default config;