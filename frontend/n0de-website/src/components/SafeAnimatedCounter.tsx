'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, useInView } from 'framer-motion';

interface SafeAnimatedCounterProps {
  endValue: number;
  suffix?: string;
  label: string;
  comparison: string;
  delay: number;
}

/**
 * SafeAnimatedCounter - Hydration-safe animated counter
 * Prevents server/client rendering mismatches
 */
export default function SafeAnimatedCounter({ 
  endValue, 
  suffix = '', 
  label, 
  comparison, 
  delay 
}: SafeAnimatedCounterProps) {
  const [count, setCount] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && isInView) {
      const startTime = Date.now() + (delay * 1000);
      const duration = 2000;
      
      const animate = () => {
        const now = Date.now();
        const elapsed = now - startTime;
        
        if (elapsed < 0) {
          requestAnimationFrame(animate);
          return;
        }
        
        if (elapsed >= duration) {
          setCount(endValue);
          return;
        }
        
        const progress = elapsed / duration;
        const easeOutProgress = 1 - Math.pow(1 - progress, 3);
        const currentValue = endValue * easeOutProgress;
        
        setCount(Math.round(currentValue * 100) / 100);
        requestAnimationFrame(animate);
      };
      
      requestAnimationFrame(animate);
    }
  }, [isMounted, isInView, endValue, delay]);

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(num >= 10000 ? 0 : 1) + 'K';
    }
    return num % 1 === 0 ? num.toString() : num.toFixed(2);
  };

  return (
    <motion.div 
      ref={ref}
      className="text-center cursor-pointer"
      whileHover={{ scale: 1.05, y: -5 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300 }}
      suppressHydrationWarning
    >
      <div 
        className="text-3xl lg:text-4xl font-bold mb-2 hover:text-shadow-glow transition-all duration-300"
        style={{
          background: 'linear-gradient(135deg, #01d3f4, #0b86f8, #00255e)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          color: '#01d3f4'
        }}
        suppressHydrationWarning
      >
        {isMounted ? `${formatNumber(count)}${suffix}` : `${formatNumber(endValue)}${suffix}`}
      </div>
      <div className="text-text-secondary text-sm">{label}</div>
      <div className="text-text-muted text-xs">{comparison}</div>
    </motion.div>
  );
}