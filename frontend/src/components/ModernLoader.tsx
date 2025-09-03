'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ModernLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'dots' | 'pulse' | 'spin' | 'bars' | 'glow';
  className?: string;
  color?: 'green' | 'blue' | 'purple' | 'white';
}

export default function ModernLoader({ 
  size = 'md', 
  variant = 'dots', 
  className,
  color = 'green'
}: ModernLoaderProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const colorClasses = {
    green: 'text-n0de-green',
    blue: 'text-n0de-blue',
    purple: 'text-n0de-purple',
    white: 'text-white'
  };

  if (variant === 'dots') {
    return (
      <div className={cn('flex items-center space-x-1', className)}>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className={cn(
              'rounded-full',
              size === 'sm' ? 'w-2 h-2' : size === 'md' ? 'w-3 h-3' : 'w-4 h-4',
              colorClasses[color] === 'text-white' ? 'bg-white' : `bg-current ${colorClasses[color]}`
            )}
            animate={{
              y: [0, -10, 0],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.2,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'pulse') {
    return (
      <motion.div
        className={cn(
          'rounded-full border-2',
          sizeClasses[size],
          `border-current ${colorClasses[color]}`,
          className
        )}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [1, 0.5, 1],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    );
  }

  if (variant === 'spin') {
    return (
      <motion.div
        className={cn(
          'rounded-full border-2 border-transparent',
          sizeClasses[size],
          className
        )}
        style={{
          borderTopColor: 'currentColor',
          borderRightColor: 'currentColor',
        }}
        animate={{ rotate: 360 }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
    );
  }

  if (variant === 'bars') {
    return (
      <div className={cn('flex items-end space-x-1', className)}>
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className={cn(
              'rounded-sm',
              size === 'sm' ? 'w-1' : size === 'md' ? 'w-1.5' : 'w-2',
              colorClasses[color] === 'text-white' ? 'bg-white' : `bg-current ${colorClasses[color]}`
            )}
            animate={{
              height: [
                size === 'sm' ? 8 : size === 'md' ? 16 : 24,
                size === 'sm' ? 16 : size === 'md' ? 32 : 48,
                size === 'sm' ? 8 : size === 'md' ? 16 : 24,
              ],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.1,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'glow') {
    return (
      <motion.div
        className={cn(
          'rounded-full',
          sizeClasses[size],
          colorClasses[color] === 'text-white' ? 'bg-white' : `bg-current ${colorClasses[color]}`,
          className
        )}
        animate={{
          boxShadow: [
            `0 0 0 0 currentColor`,
            `0 0 0 10px transparent`,
            `0 0 0 0 transparent`,
          ],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    );
  }

  return null;
}

// Specialized loading components
export function PageLoader() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-main">
      <div className="text-center space-y-4">
        <ModernLoader variant="glow" size="lg" />
        <motion.p
          className="text-text-secondary font-medium"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Loading...
        </motion.p>
      </div>
    </div>
  );
}

export function InlineLoader({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="flex items-center space-x-3">
      <ModernLoader variant="dots" size="sm" />
      <span className="text-text-secondary text-sm">{text}</span>
    </div>
  );
}

export function SkeletonLoader({ className }: { className?: string }) {
  return (
    <motion.div
      className={cn(
        'rounded-lg bg-gradient-to-r from-bg-elevated via-bg-hover to-bg-elevated bg-[length:200%_100%]',
        className
      )}
      animate={{
        backgroundPosition: ['0% 0%', '100% 0%', '0% 0%'],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'linear',
      }}
    />
  );
}