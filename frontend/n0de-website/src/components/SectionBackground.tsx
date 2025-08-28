'use client';

import { motion } from 'framer-motion';

interface SectionBackgroundProps {
  variant?: 'hero' | 'features' | 'pricing' | 'enterprise';
  className?: string;
}

export default function SectionBackground({ variant = 'hero', className = '' }: SectionBackgroundProps) {
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
        animate={{
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Very subtle grid pattern */}
      <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-5" />

      {/* Interactive Floating Elements */}
      <motion.div
        className={`absolute w-4 h-4 ${styles.particles} rounded-full blur-sm`}
        style={{ top: '15%', left: '10%' }}
        animate={{
          y: [0, -30, 0],
          x: [0, 10, 0],
          opacity: [0.2, 0.7, 0.2],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <motion.div
        className={`absolute w-2 h-2 ${styles.particles} rounded-full blur-sm`}
        style={{ top: '70%', right: '15%' }}
        animate={{
          y: [0, 20, 0],
          x: [0, -15, 0],
          opacity: [0.3, 0.8, 0.3],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 3,
        }}
      />

      <motion.div
        className="absolute w-1 h-1 bg-white/30 rounded-full"
        style={{ top: '45%', left: '80%' }}
        animate={{
          y: [0, -15, 0],
          opacity: [0.5, 1, 0.5],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 6,
        }}
      />

      {/* Subtle Pulsing Orbs */}
      <motion.div
        className="absolute w-32 h-32 bg-N0DE-green/5 rounded-full blur-3xl"
        style={{ top: '20%', right: '20%' }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <motion.div
        className="absolute w-24 h-24 bg-N0DE-blue/5 rounded-full blur-2xl"
        style={{ bottom: '30%', left: '15%' }}
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.2, 0.5, 0.2],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 5,
        }}
      />
    </div>
  );
}