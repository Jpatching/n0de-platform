import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // PV3 Admin Color System - Exact match to main platform
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
        'accent-secondary': '#9333EA', // Purple admin accent
        'accent-success': '#10B981',   // Success green
        'accent-warning': '#F59E0B',   // Warning orange
        'accent-danger': '#EF4444',    // Danger red
        'accent-info': '#3B82F6',      // Info blue
        'accent-cyan': '#06B6D4',      // Cyan for analytics
        'accent-pink': '#EC4899',      // Pink for social
        
        // Shadcn/ui compatibility
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      fontFamily: {
        'inter': ['Inter', 'sans-serif'],
        'audiowide': ['Audiowide', 'cursive'],
        'satoshi': ['Satoshi', 'sans-serif'],
        'orbitron': ['Orbitron', 'monospace'],
      },
      fontSize: {
        'heading-xl': ['48px', { lineHeight: '1.1', fontWeight: '800' }],
        'heading-lg': ['32px', { lineHeight: '1.2', fontWeight: '700' }],
        'heading-md': ['24px', { lineHeight: '1.3', fontWeight: '600' }],
        'heading-sm': ['20px', { lineHeight: '1.4', fontWeight: '600' }],
      },
      animation: {
        'admin-glow': 'admin-glow 3s ease-in-out infinite',
        'admin-pulse': 'admin-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'dashboard-float': 'dashboard-float 6s ease-in-out infinite',
        'admin-rainbow': 'adminRainbow 4s linear infinite',
        'security-pulse': 'securityPulse 2s ease-in-out infinite',
        'analytics-glow': 'analyticsGlow 3s ease-in-out infinite',
        'bounce-subtle': 'bounce-subtle 2s ease-in-out infinite',
        'fade-in': 'fade-in 0.5s ease-out forwards',
      },
      keyframes: {
        'admin-glow': {
          '0%, 100%': { 
            boxShadow: '0 0 5px rgba(147, 51, 234, 0.3), 0 0 10px rgba(147, 51, 234, 0.2)',
            transform: 'scale(1) translateZ(0)',
          },
          '50%': { 
            boxShadow: '0 0 15px rgba(147, 51, 234, 0.5), 0 0 25px rgba(147, 51, 234, 0.3)',
            transform: 'scale(1.02) translateZ(0)',
          },
        },
        'admin-pulse': {
          '0%, 100%': { opacity: '1', transform: 'translateZ(0)' },
          '50%': { opacity: '0.7', transform: 'translateZ(0)' },
        },
        'dashboard-float': {
          '0%': { 
            transform: 'scale(1) translateY(0px) translateX(0px)',
            filter: 'brightness(1) contrast(1)',
          },
          '50%': { 
            transform: 'scale(1.01) translateY(-2px) translateX(1px)',
            filter: 'brightness(1.05) contrast(1.1)',
          },
          '100%': { 
            transform: 'scale(1) translateY(0px) translateX(0px)',
            filter: 'brightness(1.02) contrast(1.05)',
          },
        },
        'adminRainbow': {
          '0%': { color: '#9333EA', transform: 'translateZ(0)' },
          '25%': { color: '#EC4899', transform: 'translateZ(0)' },
          '50%': { color: '#3B82F6', transform: 'translateZ(0)' },
          '75%': { color: '#10B981', transform: 'translateZ(0)' },
          '100%': { color: '#9333EA', transform: 'translateZ(0)' },
        },
        'securityPulse': {
          '0%, 100%': { color: '#EF4444', transform: 'translateZ(0)' },
          '50%': { color: '#F59E0B', transform: 'translateZ(0)' },
        },
        'analyticsGlow': {
          '0%, 100%': { color: '#10B981', transform: 'translateZ(0)' },
          '50%': { color: '#06B6D4', transform: 'translateZ(0)' },
        },
        'bounce-subtle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'scale(0.8)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        'admin-glow': '0 0 20px rgba(147, 51, 234, 0.3), 0 0 40px rgba(147, 51, 234, 0.1)',
        'admin-card': 'inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 4px 16px rgba(0, 0, 0, 0.4), 0 0 32px rgba(147, 51, 234, 0.05)',
        'admin-metric': 'inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 48px rgba(147, 51, 234, 0.1)',
      },
      backdropBlur: {
        'admin': '8px',
      },
    },
  },
  plugins: [],
};

export default config; 