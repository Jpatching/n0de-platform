'use client';

import { motion } from 'framer-motion';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { safeOpacity, sanitizeStyleObject, safeMotionAnimate } from '@/lib/css-utils';
import { shouldReduceAnimations } from '@/lib/performance-monitor';

// Wrap component in React.memo for performance optimization
const InteractiveBackground = React.memo(() => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [shouldAnimate, setShouldAnimate] = useState(true);
  // Note: CLAUDE.md specifies 'ChatGPT Image Aug 7, 2025, 12_12_38 AM.png' but using existing file
  const [imageUrl, setImageUrl] = useState('/chatgpt-background-main.png');

  useEffect(() => {
    // Check for reduced motion preference and performance
    const shouldReduce = shouldReduceAnimations();
    setShouldAnimate(!shouldReduce);

    if (shouldReduce) {
      console.log('🎭 InteractiveBackground: Animations disabled due to performance/accessibility');
    }

    // Lazy load the background image with Intersection Observer for performance
    const loadImage = () => {
      const img = new Image();

      // Add loading="lazy" equivalent behavior
      img.onload = () => {
        setImageLoaded(true);
        if (shouldReduce) {
          console.log('🎭 Background image loaded (performance mode)');
        }
      };

      img.onerror = () => {
        setImageError(true);
        console.warn('Background image failed to load, using fallback gradient');
      };

      // Use WebP for better performance with PNG fallback
      const supportsWebP = document.createElement('canvas').toDataURL('image/webp').indexOf('data:image/webp') === 0;
      const url = supportsWebP ? '/chatgpt-background-main.webp' : '/chatgpt-background-main.png';
      setImageUrl(url);
      img.src = url;
    };

    // Use requestIdleCallback for better performance if available
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(loadImage, { timeout: 2000 });
    } else {
      // Fallback: Load after a short delay
      setTimeout(loadImage, 100);
    }
  }, []);

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden background-element pointer-events-none">
      
      {/* Optimized Background with High-DPI Support */}
      <motion.div
        className="absolute inset-0 w-full h-full"
        style={sanitizeStyleObject({
          // Only use background image if it loaded successfully, otherwise fallback to enhanced gradient
          backgroundImage: imageLoaded && !imageError
            ? `linear-gradient(to bottom, rgba(10, 10, 10, 0.2) 0%, rgba(10, 10, 10, 0.3) 50%, rgba(10, 10, 10, 0.5) 100%), url('${imageUrl}')`
            : 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 25%, #0f0f0f 50%, #1a1a1a 75%, #0a0a0a 100%)',
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center center',
          backgroundAttachment: 'fixed',
          // Enhanced image rendering for high-DPI displays
          imageRendering: 'high-quality',
          WebkitImageRendering: 'high-quality',
          MozImageRendering: 'high-quality',
          msImageRendering: 'high-quality',
          // Increased opacity for better visibility
          opacity: safeOpacity(1, 1),
          filter: 'brightness(1.3) contrast(1.2)'
        })}
        animate={shouldAnimate ? safeMotionAnimate({
          // Subtle movement animation
          opacity: [0.95, 1, 0.95],
          scale: [1, 1.02, 1]
        }, 'InteractiveBackground-main') : undefined}
        transition={shouldAnimate ? {
          duration: 15, // Slower animation for better performance
          repeat: Infinity,
          ease: "easeInOut"
        } : undefined}
      />

      {/* Enhanced gradient overlay with animation */}
      <motion.div
        className="absolute inset-0"
        style={sanitizeStyleObject({
          background: `
            radial-gradient(ellipse 1000px 800px at 30% 40%, rgba(1, 211, 244, 0.08) 0%, transparent 70%),
            radial-gradient(ellipse 800px 800px at 70% 60%, rgba(11, 134, 248, 0.06) 0%, transparent 70%),
            radial-gradient(ellipse 600px 600px at 50% 50%, rgba(0, 37, 94, 0.05) 0%, transparent 80%)
          `,
          opacity: safeOpacity(0.8, 0.8),
          mixBlendMode: 'screen'
        })}
        animate={shouldAnimate ? safeMotionAnimate({
          opacity: [0.6, 0.8, 0.6],
          rotate: [0, 360]
        }, 'InteractiveBackground-overlay') : undefined}
        transition={shouldAnimate ? {
          duration: 30, // Very slow rotation for subtle effect
          repeat: Infinity,
          ease: "linear"
        } : undefined}
      />
    </div>
  );
});

// Add display name for debugging
InteractiveBackground.displayName = 'InteractiveBackground';

export default InteractiveBackground;