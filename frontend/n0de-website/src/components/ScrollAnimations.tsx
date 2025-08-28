'use client';

import React from 'react';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

interface ScrollFadeInProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  distance?: number;
  className?: string;
}

export function ScrollFadeIn({ 
  children, 
  delay = 0, 
  duration = 0.8,
  direction = 'up',
  distance = 50,
  className = ''
}: ScrollFadeInProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  const directionOffset = {
    up: { y: distance, x: 0 },
    down: { y: -distance, x: 0 },
    left: { y: 0, x: distance },
    right: { y: 0, x: -distance }
  };

  return (
    <motion.div
      ref={ref}
      initial={{ 
        opacity: 0, 
        ...directionOffset[direction]
      }}
      animate={isInView ? { 
        opacity: 1, 
        x: 0, 
        y: 0
      } : {}}
      transition={{ 
        duration, 
        delay,
        ease: [0.25, 0.25, 0, 1]
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface ScrollStaggerProps {
  children: React.ReactNode;
  staggerDelay?: number;
  className?: string;
}

export function ScrollStagger({ 
  children, 
  staggerDelay = 0.15,
  className = ''
}: ScrollStaggerProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      className={className}
    >
      {React.Children.map(children, (child, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ 
            duration: 0.5, 
            delay: index * staggerDelay,
            ease: [0.25, 0.25, 0, 1]
          }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}

interface ScrollScaleProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

export function ScrollScale({ 
  children, 
  delay = 0,
  className = ''
}: ScrollScaleProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={isInView ? { opacity: 1, scale: 1 } : {}}
      transition={{ 
        duration: 0.7, 
        delay,
        ease: [0.25, 0.25, 0, 1]
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface ScrollSlideRevealProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

export function ScrollSlideReveal({ 
  children, 
  delay = 0,
  className = ''
}: ScrollSlideRevealProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <div className={`overflow-hidden ${className}`}>
      <motion.div
        ref={ref}
        initial={{ y: 100, opacity: 0 }}
        animate={isInView ? { y: 0, opacity: 1 } : {}}
        transition={{ 
          duration: 0.8, 
          delay,
          ease: [0.25, 0.46, 0.45, 0.94]
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}

interface ScrollTypingProps {
  text: string;
  delay?: number;
  className?: string;
  speed?: number;
}

export function ScrollTyping({ 
  text, 
  delay = 0,
  className = '',
  speed = 0.05
}: ScrollTypingProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      className={className}
    >
      {text.split('').map((char, index) => (
        <motion.span
          key={index}
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ 
            duration: 0.1, 
            delay: delay + index * speed,
            ease: "easeOut"
          }}
        >
          {char}
        </motion.span>
      ))}
    </motion.div>
  );
}