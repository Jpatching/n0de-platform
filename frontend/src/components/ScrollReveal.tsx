'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register ScrollTrigger plugin
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

interface ScrollRevealProps {
  children: React.ReactNode;
  direction?: 'up' | 'down' | 'left' | 'right' | 'scale' | 'fade';
  delay?: number;
  duration?: number;
  distance?: number;
  trigger?: 'top' | 'center' | 'bottom';
  className?: string;
  once?: boolean;
}

export default function ScrollReveal({
  children,
  direction = 'up',
  delay = 0,
  duration = 1,
  distance = 50,
  trigger = 'bottom',
  className,
  once = true
}: ScrollRevealProps) {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Initial state based on direction
    const initialState: Record<string, unknown> = {
      opacity: direction === 'fade' ? 0 : 1,
    };

    const animateState: Record<string, unknown> = {
      opacity: 1,
      duration,
      delay,
      ease: 'power2.out',
    };

    switch (direction) {
      case 'up':
        initialState.y = distance;
        animateState.y = 0;
        break;
      case 'down':
        initialState.y = -distance;
        animateState.y = 0;
        break;
      case 'left':
        initialState.x = distance;
        animateState.x = 0;
        break;
      case 'right':
        initialState.x = -distance;
        animateState.x = 0;
        break;
      case 'scale':
        initialState.scale = 0.8;
        initialState.opacity = 0;
        animateState.scale = 1;
        break;
      case 'fade':
        // Already set opacity above
        break;
    }

    // Set initial state
    gsap.set(element, initialState);

    // Create scroll trigger configuration
    const scrollTriggerConfig: any = {
      trigger: element,
      start: `top ${trigger === 'top' ? '80%' : trigger === 'center' ? '50%' : '80%'}`,
      once,
      onEnter: () => {
        gsap.to(element, animateState);
      },
    };

    // Only add callbacks if not 'once' to avoid undefined assignments
    if (!once) {
      scrollTriggerConfig.onEnterBack = () => {
        gsap.to(element, animateState);
      };
      scrollTriggerConfig.onLeave = () => {
        gsap.to(element, { ...initialState, duration: duration * 0.5 });
      };
      scrollTriggerConfig.onLeaveBack = () => {
        gsap.to(element, { ...initialState, duration: duration * 0.5 });
      };
    }

    const scrollTrigger = ScrollTrigger.create(scrollTriggerConfig);

    return () => {
      scrollTrigger.kill();
    };
  }, [direction, delay, duration, distance, trigger, once]);

  return (
    <div ref={elementRef} className={className}>
      {children}
    </div>
  );
}

// Specialized scroll reveal components
export function ScrollFadeIn({ children, className, delay = 0 }: { 
  children: React.ReactNode; 
  className?: string; 
  delay?: number;
}) {
  return (
    <ScrollReveal direction="fade" delay={delay} className={className}>
      {children}
    </ScrollReveal>
  );
}

export function ScrollSlideUp({ children, className, delay = 0 }: { 
  children: React.ReactNode; 
  className?: string; 
  delay?: number;
}) {
  return (
    <ScrollReveal direction="up" delay={delay} className={className}>
      {children}
    </ScrollReveal>
  );
}

export function ScrollScale({ children, className, delay = 0 }: { 
  children: React.ReactNode; 
  className?: string; 
  delay?: number;
}) {
  return (
    <ScrollReveal direction="scale" delay={delay} duration={0.8} className={className}>
      {children}
    </ScrollReveal>
  );
}

// Staggered reveal for multiple elements
export function ScrollStagger({ 
  children, 
  className, 
  staggerDelay = 0.1 
}: { 
  children: React.ReactNode; 
  className?: string; 
  staggerDelay?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const items = container.children;
    if (!items.length) return;

    // Set initial state for all items
    gsap.set(items, { 
      opacity: 0, 
      y: 50 
    });

    // Create staggered animation
    const scrollTrigger = ScrollTrigger.create({
      trigger: container,
      start: 'top 80%',
      once: true,
      onEnter: () => {
        gsap.to(items, {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: staggerDelay,
          ease: 'power2.out',
        });
      },
    });

    return () => {
      scrollTrigger.kill();
    };
  }, [staggerDelay]);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}