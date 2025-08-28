import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Exact Stake.com-inspired color scheme
        'bg-main': '#0F0F0F',
        'bg-card': '#1A1A1A',
        'bg-elevated': '#2B2B2B',
        'border': '#2B2B2B',
        'border-hover': '#E6E6E6',
        'text-primary': '#FFFFFF',
        'text-secondary': '#CCCCCC',
        'accent': '#E6E6E6',
        'button-fill': '#000000',
        'button-hover': '#FFFFFF',
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
        'body-lg': ['16px', { lineHeight: '1.5', fontWeight: '400' }],
        'body-md': ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        'button': ['14px', { lineHeight: '1.2', fontWeight: '700' }],
      },
      animation: {
        'card-hover': 'cardHover 0.2s ease-out',
        'pulse-glow': 'pulseGlow 1.5s infinite',
        'glow': 'glow 1.5s infinite',
        'slide-up': 'slideUp 0.2s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'glow-test': 'glowTest 1s infinite',
      },
      keyframes: {
        cardHover: {
          '0%': { transform: 'scale(1)', boxShadow: '0 0 0 rgba(230, 230, 230, 0)' },
          '100%': { transform: 'scale(1.03)', boxShadow: '0 20px 40px rgba(230, 230, 230, 0.1)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(255, 215, 0, 0.95), 0 0 0 0 rgba(59, 130, 246, 0.8)' },
          '50%': { boxShadow: '0 0 48px 16px rgba(255, 215, 0, 0.95), 0 0 32px 12px rgba(59, 130, 246, 0.8)' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(255, 215, 0, 0.95), 0 0 0 0 rgba(59, 130, 246, 0.8)' },
          '50%': { boxShadow: '0 0 64px 24px rgba(255, 215, 0, 0.95), 0 0 48px 18px rgba(59, 130, 246, 0.8)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        glowTest: {
          '0%, 100%': { boxShadow: '0 0 64px 24px rgba(255, 215, 0, 1), 0 0 48px 18px rgba(59, 130, 246, 1)' },
        },
      },
      aspectRatio: {
        'game-card': '4 / 5',
      },
      gridTemplateColumns: {
        'games-mobile': 'repeat(2, 1fr)',
        'games-tablet': 'repeat(3, 1fr)',
        'games-desktop': 'repeat(4, 1fr)',
        'games-xl': 'repeat(5, 1fr)',
      },
    },
  },
  plugins: [],
};

export default config; 