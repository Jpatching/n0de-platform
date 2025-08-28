'use client';

import { useEffect, useRef, useState } from 'react';

interface MatrixRainProps {
  className?: string;
}

export default function MatrixRain({ className = '' }: MatrixRainProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Pause animation when tab is not visible (major CPU savings)
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Color cycle setup
    const colors = ['#00ff41', '#00bfff', '#ffd700', '#9370db']; // green, blue, gold, purple
    let currentColorIndex = 0;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Two distinct character sets - some columns will be Japanese, others gaming/crypto
    const japaneseChars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン'.split('');
    const gamingCryptoChars = '01ABCDEFabcdef+-*/=<>()[]{}.,;:'.split('');
    
    // Column setup
    const fontSize = 12;
    const columns = Math.floor(canvas.width / fontSize);
    const drops: number[] = [];
    const columnTypes: boolean[] = []; // true = Japanese, false = gaming/crypto
    
    // Initialize drops and randomly assign column types
    for (let i = 0; i < columns; i++) {
      drops[i] = Math.random() * -100; // Start above canvas
      columnTypes[i] = Math.random() > 0.5; // 50/50 chance for each type
    }

    let lastTime = 0;
    const targetFPS = 8; // Reduced from 10 FPS to 8 FPS (20% CPU reduction)
    const frameInterval = 1000 / targetFPS;

    const draw = (currentTime: number) => {
      // Only draw if tab is visible and enough time has passed
      if (!isVisible) {
        animationFrameRef.current = requestAnimationFrame(draw);
        return;
      }

      if (currentTime - lastTime < frameInterval) {
        animationFrameRef.current = requestAnimationFrame(draw);
        return;
      }

      lastTime = currentTime;

      // Create trailing effect with very subtle fade
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Set text properties with current color
      ctx.fillStyle = colors[currentColorIndex];
      ctx.font = `${fontSize}px monospace`;
      ctx.globalAlpha = 0.3; // Make it very subtle

      // Draw characters (optimized loop)
      for (let i = 0; i < drops.length; i++) {
        // Choose character set based on column type
        const chars = columnTypes[i] ? japaneseChars : gamingCryptoChars;
        const text = chars[Math.floor(Math.random() * chars.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        ctx.fillText(text, x, y);

        // Reset drop when it goes off screen
        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }

        // Move drop down slowly
        drops[i] += 0.5; // Very slow speed
      }

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    // Start animation with requestAnimationFrame (much more efficient than setInterval)
    animationFrameRef.current = requestAnimationFrame(draw);
    
    // Color change interval - every 30 seconds
    const colorInterval = setInterval(() => {
      currentColorIndex = (currentColorIndex + 1) % colors.length;
    }, 30000); // 30 seconds

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      clearInterval(colorInterval);
      window.removeEventListener('resize', resizeCanvas);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isVisible]);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 pointer-events-none z-0 ${className}`}
      style={{ opacity: 0.4 }} // Additional opacity control
    />
  );
} 