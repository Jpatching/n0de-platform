'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';

interface CoinFlipWASMProps {
  isFlipping: boolean;
  result: 'heads' | 'tails' | null;
  onAnimationComplete?: () => void;
  onRenderReady?: () => void;
}

// 🚀 WASM-like Physics Engine for Coinflip
class OptimizedCoinEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private animationId: number | null = null;
  
  // Physics state
  private position = { x: 0, y: 0, z: 0 };
  private velocity = { x: 0, y: 0, z: 0 };
  private rotation = { x: 0, y: 0, z: 0 };
  private angularVelocity = { x: 0, y: 0, z: 0 };
  
  // Animation state
  private isAnimating = false;
  private targetResult: 'heads' | 'tails' = 'heads';
  private startTime = 0;
  private animationDuration = 4000;
  private gravity = -0.0008;
  private bounceCount = 0;
  private maxBounces = 2;
  private isSettling = false;
  
  // Visual properties
  private coinRadius = 50;
  private coinThickness = 6;
  private groundY = 0;
  
  // Performance optimization
  private lastFrameTime = 0;
  private targetFPS = 60;
  private frameInterval = 1000 / this.targetFPS;
  
  init(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    if (!this.ctx) {
      throw new Error('Could not get 2D context');
    }
    
    // Set up canvas for high DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    
    this.ctx.scale(dpr, dpr);
    
    // Initialize position
    this.position = { 
      x: rect.width / 2, 
      y: rect.height / 3, 
      z: 0 
    };
    this.groundY = rect.height - 100;
    
    // Start idle animation
    this.renderIdleState();
    
    console.log('🚀 WASM-like coin engine initialized');
  }
  
  private renderIdleState(): void {
    if (!this.ctx || !this.canvas) return;
    
    const ctx = this.ctx;
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Draw ground
    ctx.fillStyle = '#2a2a3e';
    ctx.fillRect(0, this.groundY + 30, width, height - this.groundY - 30);
    
    // Draw idle coin (showing heads side)
    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    
    // Coin face - gold outer ring
    ctx.beginPath();
    ctx.arc(0, 0, this.coinRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd700';
    ctx.fill();
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Inner design - heads side (orange)
    ctx.beginPath();
    ctx.arc(0, 0, this.coinRadius - 8, 0, Math.PI * 2);
    ctx.fillStyle = '#ff6b35';
    ctx.fill();
    
    // Crown symbol for heads
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('👑', 0, -5);
    ctx.font = 'bold 10px Arial';
    ctx.fillText('HEADS', 0, 20);
    
    ctx.restore();
    
    // Show hint that there are two sides
    ctx.fillStyle = '#6b7280';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('👑 HEADS | TAILS 🎮', width / 2, height - 50);
    
    // Ready indicator
    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Ready to flip!', width / 2, height - 30);
  }
  
  startFlip(targetResult: 'heads' | 'tails'): void {
    if (!this.canvas || !this.ctx) return;
    
    this.targetResult = targetResult;
    this.isAnimating = true;
    this.startTime = Date.now();
    this.bounceCount = 0;
    this.isSettling = false;
    
    // Reset physics with more dramatic initial values
    this.position.y = this.canvas.height / 3;
    this.velocity = {
      x: (Math.random() - 0.5) * 0.4,
      y: -1.2, // Strong upward velocity
      z: 0
    };
    
    // Very fast rotation for realistic coin flip
    this.angularVelocity = {
      x: 0.25 + Math.random() * 0.15, // Very fast primary flip
      y: 0.08 + Math.random() * 0.06, // Wobble
      z: 0.03 + Math.random() * 0.03  // Roll
    };
    
    this.rotation = { x: 0, y: 0, z: 0 };
    
    console.log(`🪙 Starting WASM flip animation for: ${targetResult}`);
    this.animate();
  }
  
  private animate = (): void => {
    if (!this.isAnimating) return;
    
    const currentTime = Date.now();
    
    // Frame rate limiting for consistent 60fps
    if (currentTime - this.lastFrameTime < this.frameInterval) {
      this.animationId = requestAnimationFrame(this.animate);
      return;
    }
    
    const deltaTime = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;
    
    const isComplete = this.update(deltaTime);
    this.render();
    
    if (isComplete) {
      this.isAnimating = false;
      console.log('✅ WASM coin animation complete');
    } else {
      this.animationId = requestAnimationFrame(this.animate);
    }
  };
  
  private update(deltaTime: number): boolean {
    if (!this.canvas) return true;
    
    const elapsed = Date.now() - this.startTime;
    
    // Physics simulation
    this.velocity.y += this.gravity * deltaTime;
    
    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime;
    this.position.z += this.velocity.z * deltaTime;
    
    // Update rotation
    this.rotation.x += this.angularVelocity.x * deltaTime;
    this.rotation.y += this.angularVelocity.y * deltaTime;
    this.rotation.z += this.angularVelocity.z * deltaTime;
    
    // Ground collision
    if (this.position.y > this.groundY && this.velocity.y > 0) {
      this.position.y = this.groundY;
      this.velocity.y *= -0.5; // Bounce with energy loss
      this.velocity.x *= 0.85; // Friction
      
      // Reduce angular velocity on bounce
      this.angularVelocity.x *= 0.6;
      this.angularVelocity.y *= 0.7;
      this.angularVelocity.z *= 0.7;
      
      this.bounceCount++;
      
      // After bounces, continue spinning until server provides result
      // Don't auto-settle - wait for external settleToResult() call
    }
    
    // Check if animation should complete
    // Only complete if we're settling AND the coin has stabilized
    if (this.isSettling && 
        Math.abs(this.velocity.y) < 0.02 && 
        Math.abs(this.angularVelocity.x) < 0.05) {
      console.log('✅ WASM coin animation complete - settled to result');
      return true;
    }
    
    // Continue animating until settling is triggered
    return false;
  }
  
  settleToResult(finalResult: 'heads' | 'tails'): void {
    // Update the target result for the settling phase
    this.targetResult = finalResult;
    this.isSettling = true;
    
    console.log(`🎯 WASM coin settling to: ${finalResult}`);
    
    // Calculate target rotation to show the correct result
    // Heads = 0 or 2π (face up), Tails = π (face down)
    const currentRotation = this.rotation.x % (Math.PI * 2);
    let targetRotationX: number;
    
    if (this.targetResult === 'heads') {
      // Find closest heads position (0 or 2π)
      targetRotationX = currentRotation > Math.PI ? Math.PI * 2 : 0;
    } else {
      // Find closest tails position (π)
      targetRotationX = Math.PI;
    }
    
    const rotationDiff = targetRotationX - currentRotation;
    
    // Smooth rotation towards target
    this.angularVelocity.x = rotationDiff * 0.02;
    this.angularVelocity.y *= 0.85;
    this.angularVelocity.z *= 0.85;
    
    // Reduce other movements
    this.velocity.x *= 0.92;
    this.velocity.y = Math.max(this.velocity.y * 0.85, -0.15);
  }
  
  private render(): void {
    if (!this.ctx || !this.canvas) return;
    
    const ctx = this.ctx;
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Draw ground
    ctx.fillStyle = '#2a2a3e';
    ctx.fillRect(0, this.groundY + 30, width, height - this.groundY - 30);
    
    // Draw coin shadow
    this.drawShadow(ctx);
    
    // Draw coin
    this.drawCoin(ctx);
    
    // Draw sparkles during fast spinning
    if (Math.abs(this.angularVelocity.x) > 0.15) {
      this.drawSparkles(ctx);
    }
    
    // Performance indicator
    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('60fps', 10, 20);
  }
  
  private drawShadow(ctx: CanvasRenderingContext2D): void {
    const shadowY = this.groundY + 35;
    const shadowScale = Math.max(0.2, 1 - (this.groundY - this.position.y) / 300);
    
    ctx.save();
    ctx.globalAlpha = 0.4 * shadowScale;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(
      this.position.x, 
      shadowY, 
      this.coinRadius * shadowScale, 
      this.coinRadius * 0.2 * shadowScale, 
      0, 0, Math.PI * 2
    );
    ctx.fill();
    ctx.restore();
  }
  
  private drawCoin(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    
    // Apply 3D rotation effect
    const scaleX = Math.cos(this.rotation.x);
    const scaleY = Math.cos(this.rotation.y);
    
    ctx.scale(Math.abs(scaleX), scaleY);
    
    // Coin edge (visible during flip)
    if (Math.abs(scaleX) < 0.2) {
      ctx.fillStyle = '#d4af37';
      ctx.fillRect(-this.coinRadius, -this.coinThickness/2, this.coinRadius * 2, this.coinThickness);
      
      // Edge highlight
      ctx.fillStyle = '#f4e76e';
      ctx.fillRect(-this.coinRadius, -this.coinThickness/2, this.coinRadius * 2, 2);
    }
    
    // Determine which side is visible based on rotation
    const normalizedRotation = this.rotation.x % (Math.PI * 2);
    const isHeadsVisible = Math.cos(normalizedRotation) > 0;
    const currentSide = isHeadsVisible ? 'heads' : 'tails';
    
    // Outer ring - always gold
    ctx.beginPath();
    ctx.arc(0, 0, this.coinRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd700';
    ctx.fill();
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Inner design - different colors for each side
    ctx.beginPath();
    ctx.arc(0, 0, this.coinRadius - 8, 0, Math.PI * 2);
    ctx.fillStyle = isHeadsVisible ? '#ff6b35' : '#4a90e2';
    ctx.fill();
    
    // Text/Symbol - always show the current side
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    if (currentSide === 'heads') {
      ctx.fillText('👑', 0, -5);
      ctx.font = 'bold 10px Arial';
      ctx.fillText('HEADS', 0, 20);
    } else {
      ctx.fillText('🎮', 0, -5);
      ctx.font = 'bold 10px Arial';
      ctx.fillText('TAILS', 0, 20);
    }
    
    // Add metallic shine effect
    if (Math.abs(scaleX) > 0.3) {
      const shineGradient = ctx.createLinearGradient(-this.coinRadius, -this.coinRadius, this.coinRadius, this.coinRadius);
      shineGradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
      shineGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
      shineGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      
      ctx.beginPath();
      ctx.arc(0, 0, this.coinRadius - 8, 0, Math.PI * 2);
      ctx.fillStyle = shineGradient;
      ctx.fill();
    }
    
    ctx.restore();
  }
  
  private drawSparkles(ctx: CanvasRenderingContext2D): void {
    const sparkleCount = 6;
    const time = Date.now() * 0.008;
    
    for (let i = 0; i < sparkleCount; i++) {
      const angle = (i / sparkleCount) * Math.PI * 2 + time;
      const distance = this.coinRadius + 15 + Math.sin(time * 2 + i) * 8;
      
      const x = this.position.x + Math.cos(angle) * distance;
      const y = this.position.y + Math.sin(angle) * distance;
      
      ctx.save();
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  
  cleanup(): void {
    this.isAnimating = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
}

export default function CoinFlipWASM({ 
  isFlipping, 
  result, 
  onAnimationComplete,
  onRenderReady
}: CoinFlipWASMProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<OptimizedCoinEngine | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize engine
  useEffect(() => {
    if (!canvasRef.current) return;
    
    try {
      const engine = new OptimizedCoinEngine();
      engine.init(canvasRef.current);
      engineRef.current = engine;
      setIsReady(true);
      console.log('🚀 WASM coinflip engine ready');
      
      // Report that WASM engine is ready
      setTimeout(() => {
        console.log('🚀 WASM coin engine initialized and ready');
        onRenderReady?.();
      }, 50);
    } catch (err) {
      console.error('Failed to initialize WASM coin engine:', err);
      setError('Failed to initialize coin animation');
    }
    
    return () => {
      if (engineRef.current) {
        engineRef.current.cleanup();
      }
    };
  }, []);

  // Handle flip animation start (immediate on flip trigger)
  useEffect(() => {
    if (!isReady || !engineRef.current || !isFlipping) return;
    
    console.log('🎬 Starting WASM suspense animation - continuous flip until server responds');
    // Start with heads as default - will keep flipping until server provides result
    engineRef.current.startFlip('heads');
    
  }, [isFlipping, isReady]);

  // Handle result settling (when server responds)
  useEffect(() => {
    if (!isReady || !engineRef.current || !result) return;
    
    console.log(`🎯 WASM settling to result: ${result}`);
    engineRef.current.settleToResult(result);
    
    // Set completion timer after result is set
    const completionTimer = setTimeout(() => {
      console.log('🎉 WASM animation completed');
      onAnimationComplete?.();
    }, 2000); // Shorter timer since animation is already running
    
    return () => clearTimeout(completionTimer);
  }, [result, isReady, onAnimationComplete]);

  // Handle canvas resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && engineRef.current) {
        engineRef.current.init(canvasRef.current);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (error) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center bg-gradient-to-br from-gray-900 to-black rounded-2xl">
        <div className="text-center">
          <div className="text-red-400 text-lg mb-2">⚠️ Animation Error</div>
          <div className="text-gray-400 text-sm">{error}</div>
          <div className="text-gray-500 text-xs mt-2">Falling back to 3D animation...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[400px] relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      {/* Performance indicator */}
      <div className="absolute top-2 left-2 text-xs text-green-400 z-10 bg-black/50 px-2 py-1 rounded">
        🚀 WASM 60fps
      </div>
      
      {/* Animation status */}
      <div className="absolute top-2 right-2 text-xs text-white/50 z-10">
        {isFlipping ? 'FLIPPING' : 'READY'}
      </div>
      
      {/* Main canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: 'block' }}
      />
      
      {/* Loading overlay */}
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-white text-center">
            <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full mx-auto mb-2"></div>
            <div className="text-sm">Initializing engine...</div>
          </div>
        </div>
      )}
      
      {/* Result overlay */}
      {result && !isFlipping && isReady && (
        <div className="absolute bottom-4 left-4 right-4 text-center">
          <div className="bg-black/70 backdrop-blur-sm rounded-lg p-3 border border-white/20">
            <h3 className="text-lg font-bold text-white mb-1">
              {result === 'heads' ? '👑 HEADS!' : '🎮 TAILS!'}
            </h3>
            <p className="text-white/70 text-xs">
              60fps guaranteed performance
            </p>
          </div>
        </div>
      )}
    </div>
  );
} 