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
        // PV3 UI/UX Design System - Exact Stake.com colors
        'bg-main': '#0F0F0F',        // Background (main) - Deep black
        'bg-elevated': '#1A1A1A',    // Card background - Slightly elevated
        'bg-card': '#1A1A1A',        // Card background - Slightly elevated  
        'bg-hover': '#252525',       // Hover states
        'border': '#2B2B2B',         // Border/Separator - Minimalist gray
        'border-hover': '#E6E6E6',   // Accent highlight - Hover states
        'text-primary': '#FFFFFF',   // Primary text - High contrast
        'text-secondary': '#CCCCCC', // Secondary text - Labels, hints
        'text-muted': '#808080',     // Muted text
        'accent-primary': '#E6E6E6', // Accent highlight
        'accent-secondary': '#9333EA', // Purple accent
        'accent-success': '#10B981',   // Success green
        'accent-warning': '#F59E0B',   // Warning orange
        'accent-danger': '#EF4444',    // Danger red
      },
      fontFamily: {
        'inter': ['Inter', 'sans-serif'],
        'audiowide': ['Audiowide', 'cursive'],
        'satoshi': ['Satoshi', 'sans-serif'],
      },
      fontSize: {
        'heading-lg': ['32px', { lineHeight: '1.2', fontWeight: '700' }],
        'heading-md': ['24px', { lineHeight: '1.3', fontWeight: '600' }],
        'heading-sm': ['20px', { lineHeight: '1.4', fontWeight: '600' }],
      },
      animation: {
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'bounce-subtle': 'bounce-subtle 2s ease-in-out infinite',
      },
      keyframes: {
        'bounce-subtle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
    },
  },
  plugins: [],
};

export default config; 