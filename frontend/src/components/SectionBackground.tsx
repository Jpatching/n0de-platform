'use client';

import { motion } from 'framer-motion';
import { shouldReduceAnimations } from '@/lib/performance-monitor';
import { safeMotionAnimate } from '@/lib/css-utils';

interface SectionBackgroundProps {
  variant?: 'hero' | 'features' | 'pricing' | 'enterprise';
  className?: string;
}

export default function SectionBackground({ variant = 'hero', className = '' }: SectionBackgroundProps) {
  const shouldAnimate = !shouldReduceAnimations();
  
  const getVariantStyles = () => {
    switch (variant) {
      case 'hero':
        return {
          overlay: 'from-N0DE-green/4 via-transparent to-N0DE-blue/4',
          particles: 'bg-N0DE-green/20',
        };
      case 'features':
        return {
          overlay: 'from-N0DE-blue/3 via-transparent to-N0DE-green/3',
          particles: 'bg-N0DE-blue/15',
        };
      case 'pricing':
        return {
          overlay: 'from-purple-500/3 via-transparent to-N0DE-green/3',
          particles: 'bg-purple-400/15',
        };
      case 'enterprise':
        return {
          overlay: 'from-N0DE-green/3 via-transparent to-purple-500/3',
          particles: 'bg-N0DE-green/15',
        };
      default:
        return {
          overlay: 'from-N0DE-green/3 via-transparent to-N0DE-blue/3',
          particles: 'bg-N0DE-green/15',
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      {/* Gradient Overlay for Section Variety - More subtle */}
      <motion.div
        className={`absolute inset-0 bg-gradient-to-br ${styles.overlay}`}
        animate={shouldAnimate ? safeMotionAnimate({
          opacity: [0.2, 0.4, 0.2],
        }, 'SectionBackground-overlay') : {}}
        transition={shouldAnimate ? {
          duration: 25,
          repeat: Infinity,
          ease: 'easeInOut',
        } : {}}
      />

      {/* Very subtle grid pattern */}
      <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-5" />

      {/* Interactive Floating Elements - Only if animations are enabled */}
      {shouldAnimate && (
        <>
          <motion.div
            className={`absolute w-3 h-3 ${styles.particles} rounded-full blur-sm`}
            style={{ top: '15%', left: '10%' }}
            animate={safeMotionAnimate({
              y: [0, -20, 0],
              opacity: [0.2, 0.5, 0.2],
            }, 'SectionBackground-particle1')}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />

          <motion.div
            className="absolute w-16 h-16 bg-N0DE-green/3 rounded-full blur-2xl"
            style={{ top: '60%', right: '20%' }}
            animate={safeMotionAnimate({
              scale: [1, 1.1, 1],
              opacity: [0.1, 0.3, 0.1],
            }, 'SectionBackground-orb')}
            transition={{
              duration: 30,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </>
      )}
    </div>
  );
}