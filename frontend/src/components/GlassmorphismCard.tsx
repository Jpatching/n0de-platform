'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { safeAnimation } from '@/lib/css-utils';

interface GlassmorphismCardProps {
  children: React.ReactNode;
  className?: string;
  blur?: 'sm' | 'md' | 'lg' | 'xl';
  opacity?: 'low' | 'medium' | 'high';
  border?: boolean;
  shadow?: boolean;
  hover?: boolean;
  gradient?: boolean;
}

export default function GlassmorphismCard({
  children,
  className,
  blur = 'md',
  opacity = 'medium',
  border = true,
  shadow = true,
  hover = true,
  gradient = false
}: GlassmorphismCardProps) {
  const blurClasses = {
    sm: 'backdrop-blur-sm',
    md: 'backdrop-blur-md',
    lg: 'backdrop-blur-lg',
    xl: 'backdrop-blur-xl'
  };

  const opacityClasses = {
    low: 'bg-white/5 dark:bg-white/5',
    medium: 'bg-white/10 dark:bg-white/10',
    high: 'bg-white/20 dark:bg-white/20'
  };

  const borderClasses = border ? 'border border-white/20 dark:border-white/20' : '';
  const shadowClasses = shadow ? 'shadow-xl shadow-black/5' : '';
  const gradientClasses = gradient ? 'bg-gradient-to-br from-white/20 to-white/5 dark:from-white/20 dark:to-white/5' : '';

  return (
    <motion.div
      className={cn(
        'relative overflow-hidden rounded-2xl',
        blurClasses[blur],
        gradient ? gradientClasses : opacityClasses[opacity],
        borderClasses,
        shadowClasses,
        className
      )}
      whileHover={safeAnimation(hover, { y: -4, scale: 1.02 })}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {/* Subtle gradient overlay for extra depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent pointer-events-none" />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
}

// Specialized glassmorphism components
export function GlassCard({ children, className, ...props }: Omit<GlassmorphismCardProps, 'blur' | 'opacity'>) {
  return (
    <GlassmorphismCard
      blur="lg"
      opacity="medium"
      className={cn('p-6', className)}
      {...props}
    >
      {children}
    </GlassmorphismCard>
  );
}

export function GlassButton({ 
  children, 
  className, 
  onClick,
  ...props 
}: Omit<GlassmorphismCardProps, 'blur' | 'opacity'> & { onClick?: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        'relative overflow-hidden rounded-xl',
        'backdrop-blur-md bg-white/10 dark:bg-white/10',
        'border border-white/20 dark:border-white/20',
        'px-6 py-3 text-sm font-medium',
        'transition-all duration-300',
        'hover:bg-white/20 dark:hover:bg-white/20',
        'focus:outline-none focus:ring-2 focus:ring-n0de-green/50',
        className
      )}
      {...props}
    >
      {/* Button glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-n0de-green/20 to-n0de-blue/20 opacity-0 hover:opacity-100 transition-opacity duration-300" />
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
}

export function GlassInput({ 
  className, 
  placeholder,
  ...props 
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'w-full px-4 py-3 rounded-xl',
        'backdrop-blur-md bg-white/10 dark:bg-white/10',
        'border border-white/20 dark:border-white/20',
        'placeholder:text-white/60 text-white',
        'focus:outline-none focus:ring-2 focus:ring-n0de-green/50 focus:border-transparent',
        'transition-all duration-300',
        className
      )}
      placeholder={placeholder}
      {...props}
    />
  );
}