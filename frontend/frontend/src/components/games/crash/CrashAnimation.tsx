'use client';
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { calculateStakeMultiplier, STAKE_TIMING_CONFIG, getHighPrecisionTime } from '@/lib/stakeFormula';

interface CrashAnimationProps {
  isActive: boolean;
  crashMultiplier: number;
  currentMultiplier: number;
  roundStartTime?: number | null;
  onCrashReached: () => void;
  gamePhase: 'waiting' | 'rising' | 'crashed' | 'complete';
  onMultiplierUpdate?: (multiplier: number) => void;
  onAnimationFrameId?: (frameId: number | null) => void;
  crashPredictor?: {
    crashPoint: number;
    crashTime: number;
    isActive: boolean;
  } | null; // ✅ NEW: Client-side crash prediction data
}

export default function CrashAnimation({
  isActive,
  crashMultiplier,
  currentMultiplier,
  roundStartTime,
  onCrashReached,
  gamePhase,
  onMultiplierUpdate,
  onAnimationFrameId,
  crashPredictor // ✅ NEW: Accept crash predictor
}: CrashAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [crashed, setCrashed] = useState(false);
  const [localMultiplier, setLocalMultiplier] = useState(1.0);
  const [gameStartTime, setGameStartTime] = useState<number | null>(null);
  const [curvePoints, setCurvePoints] = useState<{x: number, y: number}[]>([]);

  // 🚀 NEW: Continuous scrolling background offset
  const [scrollOffset, setScrollOffset] = useState(0);

  // ✅ UNIFIED STAKE CALCULATION - Uses single source of truth
  const calculateMultiplier = useCallback((timeElapsed: number): number => {
    return calculateStakeMultiplier(timeElapsed); // timeElapsed is in milliseconds
  }, []);

  // ✅ STAKE'S PRECISION TIMING: High-precision multiplier calculation
  const calculateBlindMultiplier = useCallback((currentTime: number): number => {
    if (!roundStartTime) {
      // Fallback to old calculation if no start time
      const timeElapsed = currentTime - (gameStartTime || currentTime);
      console.log('⚠️ FALLBACK TIMING: No roundStartTime, using gameStartTime. timeElapsed:', timeElapsed);
      return calculateMultiplier(timeElapsed);
    }

    // ✅ STAKE'S TIMING SYSTEM: Use high-precision timing for perfect synchronization
    const timeElapsed = currentTime - roundStartTime;
    
    // ✅ DEBUG: Log timing calculation
    if (DEBUG_SYNC && Math.random() < 0.05) { // Log 5% of calculations in dev mode only
      console.log('🎯 TIMING CALC:', {
        currentTime,
        roundStartTime,
        timeElapsed,
        timeElapsedSeconds: (timeElapsed / 1000).toFixed(2),
        calculatedMultiplier: calculateStakeMultiplier(timeElapsed).toFixed(3)
      });
    }
    
    // ✅ STAKE'S PRECISION: Use exact formula with microsecond accuracy
    // Animation runs continuously until backend triggers crash
    return calculateStakeMultiplier(timeElapsed); // timeElapsed is in milliseconds
  }, [roundStartTime, gameStartTime, calculateMultiplier]);

  // 🎨 CRASH GAME COLOR SYSTEM (like Stake/Roobet)
  const getCurveColor = useCallback((gamePhase: string) => {
    if (gamePhase === 'crashed') return '#ff3300'; // Bright red when crashed
    return '#00ff88'; // Bright green while rising
  }, []);

  // 🔍 DEBUG: Enable timing synchronization debug logs
  const DEBUG_SYNC = process.env.NODE_ENV === 'development'; // Only in development

  // 🎨 CANVAS SETUP - Dynamic sizing to match container
  const [canvasSize, setCanvasSize] = useState({ width: 1000, height: 500 });
  
  // 📏 DYNAMIC CANVAS SIZING - Match actual container size  
  useEffect(() => {
    const updateCanvasSize = () => {
      if (canvasRef.current && canvasRef.current.parentElement) {
        const container = canvasRef.current.parentElement;
        const rect = container.getBoundingClientRect();
        const newSize = { width: Math.floor(rect.width), height: Math.floor(rect.height) };
        
        // 🚨 DEBUG: Log canvas size changes
        if (newSize.width !== canvasSize.width || newSize.height !== canvasSize.height) {
          console.log('🖼️ CANVAS SIZE UPDATE:', {
            old: `${canvasSize.width}x${canvasSize.height}`,
            new: `${newSize.width}x${newSize.height}`,
            containerRect: `${rect.width.toFixed(1)}x${rect.height.toFixed(1)}`
          });
        }
        
        setCanvasSize(newSize);
      }
    };
    
    // Initial size
    updateCanvasSize();
    
    // Update on resize  
    window.addEventListener('resize', updateCanvasSize);
    
    // Also update when component becomes active
    if (isActive) {
      setTimeout(updateCanvasSize, 100); // Small delay to ensure container is rendered
    }
    
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [isActive, canvasSize.width, canvasSize.height]);

  // 🎯 GET ACTUAL CANVAS DIMENSIONS - Use dynamic size
  const width = canvasSize.width;
  const height = canvasSize.height;

  // 🎨 CANVAS DRAWING FUNCTION
  const drawCrashCurve = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas with transparent background
    ctx.clearRect(0, 0, width, height);

    // ✅ INFINITE RISE BACKGROUND: Moving grid and particles for upward motion illusion
    if (gamePhase === 'rising' || gamePhase === 'crashed') {
      const currentTime = performance.now();
      const animationOffset = (currentTime / 50) % 100; // Scrolling speed

      // 🌟 MOVING GRID LINES: Create infinite upward motion
      ctx.strokeStyle = getCurveColor(gamePhase) + '15'; // Very transparent
      ctx.lineWidth = 1;
      
      // Vertical grid lines (static)
      for (let x = 0; x < width; x += 80) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      
      // Horizontal grid lines (moving upward)
      for (let y = -animationOffset; y < height + 100; y += 60) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // 🎆 RISING PARTICLES: Enhance infinite upward effect
      ctx.fillStyle = getCurveColor(gamePhase) + '30';
      for (let i = 0; i < 15; i++) {
        const particleX = (i * 67 + animationOffset * 0.5) % width;
        const particleY = (height - (i * 83 + animationOffset * 2) % (height + 200));
        const size = 2 + Math.sin(currentTime / 1000 + i) * 1;
        
        ctx.beginPath();
        ctx.arc(particleX, particleY, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (gamePhase === 'waiting') {
      // Waiting state - draw over transparent background
      ctx.fillStyle = 'rgba(100, 116, 139, 0.9)'; // Semi-transparent background for text
      ctx.font = 'bold 24px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('🚀 Waiting for round...', width / 2, height / 2);
      return;
    }

    // 🚀 DRAW THE CRASH CURVE WITH FIXED ORIGIN + GROWING TIP
    if ((gamePhase === 'rising' || gamePhase === 'crashed') && curvePoints.length >= 2) {
      const currentColor = getCurveColor(gamePhase);
      
      // ✅ ORIGIN AND TIP: First point is origin (never moves), last point is tip (grows)
      const originPoint = curvePoints[0]; // FIXED origin point
      const tipPoint = curvePoints[curvePoints.length - 1]; // Current growing tip
      
      // ✅ NO CAMERA SYSTEM - Let curve grow naturally in container
      // The curve will scale properly to fill the container without moving the origin
      
      // Draw the main curve line with MAXIMUM visibility over background
      ctx.beginPath();
      
      // ✅ DRAW STRAIGHT LINE FROM FIXED ORIGIN TO CURRENT TIP
      // 🔥 STAKE-STYLE FILL UNDER CURVE (Triangle Effect with Gradient)
      const gradient = ctx.createLinearGradient(originPoint.x, originPoint.y, originPoint.x, height);
      gradient.addColorStop(0, `${currentColor}40`); // 40% opacity at top
      gradient.addColorStop(0.7, `${currentColor}20`); // 20% opacity in middle
      gradient.addColorStop(1, `${currentColor}05`); // 5% opacity at bottom
      
      ctx.fillStyle = gradient;
      ctx.moveTo(originPoint.x, originPoint.y); // Start at curve start
      ctx.lineTo(tipPoint.x, tipPoint.y); // Draw curve line
      ctx.lineTo(tipPoint.x, height); // Down to bottom right
      ctx.lineTo(originPoint.x, height); // Across to bottom left
      ctx.closePath();
      ctx.fill();
      
      // 🔥 THICK BRIGHT LINE (like Stake/Roobet) - Draw line on top of fill
      ctx.beginPath();
      ctx.moveTo(originPoint.x, originPoint.y);
      ctx.lineTo(tipPoint.x, tipPoint.y);
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = 6;
      ctx.shadowColor = currentColor;
      ctx.shadowBlur = 20;
      ctx.globalAlpha = 1.0;
      ctx.stroke();
      
      // Reset shadow for other elements
      ctx.shadowBlur = 0;
      
      // Draw current position dot (pulsing effect)
      if (curvePoints.length >= 2) {
        const pulseSize = 8 + Math.sin(Date.now() / 200) * 2; // Pulsing dot
        ctx.fillStyle = currentColor;
        ctx.shadowColor = currentColor;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(tipPoint.x, tipPoint.y, pulseSize, 0, 2 * Math.PI);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      
      // 🚨 DEBUG: Show tip position for verification
      if (localMultiplier >= 2.0 && Math.random() < 0.05) {
        console.log('🎯 CURVE DRAWING VERIFICATION:', {
          multiplier: localMultiplier.toFixed(2) + 'x',
          origin: `(${originPoint.x}, ${originPoint.y})`,
          tip: `(${tipPoint.x.toFixed(1)}, ${tipPoint.y.toFixed(1)})`,
          canvasSize: `${width}x${height}`,
          tipPercent: `X:${((tipPoint.x/width)*100).toFixed(1)}%, Y:${((1-tipPoint.y/height)*100).toFixed(1)}%`
        });
      }
    }

    // 💥 CRASH EXPLOSION EFFECT - RED SCREEN
    if (gamePhase === 'crashed') {
      // ✅ RED FLASH OVERLAY
      ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
      ctx.fillRect(0, 0, width, height);
      
      const explosionSize = 60 + Math.sin(Date.now() / 100) * 10; // Pulsing effect
      
      ctx.fillStyle = '#ff0000';
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 20;
      ctx.font = `bold ${explosionSize}px system-ui`;
      ctx.textAlign = 'center';
      ctx.fillText('💥', width / 2, height / 2);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 32px system-ui';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 4;
      ctx.fillText('CRASHED!', width / 2, height / 2 + 60);
      
      // ✅ PROPER CRASH GAME: Show revealed crash multiplier
      ctx.fillStyle = '#ff4444';
      ctx.font = 'bold 24px system-ui';
      ctx.fillText(`${crashMultiplier.toFixed(2)}x`, width / 2, height / 2 + 90);
      ctx.shadowBlur = 0;
    }
  }, [gamePhase, localMultiplier, crashMultiplier, curvePoints, getCurveColor]);

  // ✅ CRITICAL FIX: Immediate crash detection with synchronous stopping
  useEffect(() => {
    if (gamePhase === 'crashed' && !crashed) {
      console.log('💥 IMMEDIATE CRASH STOP - Backend crashed at:', crashMultiplier + 'x');
      
      // ✅ SYNCHRONOUSLY stop everything IMMEDIATELY
      setCrashed(true);
      
      // ✅ FORCE STOP: Cancel animation frame synchronously
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = undefined;
        console.log('🛑 Animation frame cancelled immediately');
      }
      
      // ✅ FREEZE MULTIPLIER: Set to exact backend crash point (no more calculations)
      setLocalMultiplier(crashMultiplier);
      
      // ✅ ADD FINAL CRASH POINT: Add exact crash point to curve so it stops there
      const canvas = canvasRef.current;
      if (canvas) {
        const width = canvas.offsetWidth;
        const height = canvas.offsetHeight;
        const baseY = height - 40;
        const topY = 40;
        
        // Calculate final crash point position
        const timeElapsed = Date.now() - (roundStartTime || gameStartTime || Date.now());
        const timeInSeconds = timeElapsed / 1000;
        const maxTimeDisplay = 20;
        const xProgress = Math.min(timeInSeconds / maxTimeDisplay, 1);
        const x = 50 + (xProgress * (width - 100));
        
        // Use same diagonal formula for crash point
        const linearProgress = (crashMultiplier - 1.0);
        const maxDisplay = 2.0; // Same as main calculation
        const yProgress = Math.min(linearProgress / maxDisplay, 1.0);
        const y = baseY - (yProgress * (baseY - topY));
        
        // Add final crash point to curve
        setCurvePoints(prev => [...prev, {x, y}]);
      }
      
      console.log('🧊 FROZEN: Animation stopped at exact backend crash point:', crashMultiplier + 'x');
      
      // ✅ Call crash callback immediately
      if (onCrashReached) {
        onCrashReached();
      }
    }
  }, [gamePhase, crashed, crashMultiplier, onCrashReached, roundStartTime, gameStartTime]);

  // 🚀 MAIN ANIMATION LOOP - Synchronized with backend timing
  useEffect(() => {
    // Only run animation during rising phase
    if (gamePhase !== 'rising') {
      return;
    }

    // ✅ INSTANT CURVE APPEARANCE: Ready immediately when round starts
    const startTime = roundStartTime || getHighPrecisionTime();
    if (!gameStartTime && !roundStartTime) {
      setGameStartTime(startTime);
    }
    
    // 🚀 INSTANT CURVE START: Generate curve immediately with proper math
    // Don't wait for points to accumulate - start with authentic exponential curve
    if (curvePoints.length === 0 && (roundStartTime || gameStartTime)) {
      const canvas = canvasRef.current;
      if (canvas) {
        const width = canvas.offsetWidth;
        const height = canvas.offsetHeight;
        const baseY = height - 40;
        
        // Generate initial curve points using real exponential math
        const initialPoints = [];
        for (let i = 0; i <= 10; i++) { // First 11 points for instant curve
          const multiplier = 1.0 + (i * 0.02); // 1.00x to 1.20x
          const timeProgress = i / 50; // X position
          const x = 50 + (timeProgress * (width - 100));
          
          // Use same linear diagonal formula for consistency
          const linearProgress = (multiplier - 1.0);
          const maxDisplay = 2.0; // Same as main calculation
          const yProgress = Math.min(linearProgress / maxDisplay, 1.0);
          const y = baseY - (yProgress * (baseY - 40));
          
          initialPoints.push({x, y});
        }
        setCurvePoints(initialPoints);
      }
    }
      
      const animate = () => {
      // ✅ CRITICAL FIX: IMMEDIATE STOP - Check crash state first
      if (crashed || gamePhase !== 'rising') {
        console.log('🛑 Animation loop IMMEDIATE STOP - crashed:', crashed, 'phase:', gamePhase);
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = undefined;
        }
        // Clear frame ID in parent
        if (onAnimationFrameId) {
          onAnimationFrameId(null);
        }
        return;
      }
      
      // ✅ STAKE'S PRECISION TIMING: Use performance.now() for microsecond accuracy
      const currentTime = getHighPrecisionTime();
      
      // ✅ DOUBLE-CHECK: Ensure we haven't crashed mid-frame
      if (crashed || gamePhase !== 'rising') {
        console.log('🛑 Mid-frame crash detection - stopping immediately');
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = undefined;
        }
        // Clear frame ID in parent
        if (onAnimationFrameId) {
          onAnimationFrameId(null);
        }
        return;
      }
      
      // ✅ NEW: Use synchronized calculation ONLY if not crashed
      const newMultiplier = calculateBlindMultiplier(currentTime);
      
      // ✅ DEBUG: Log animation values to see what's happening
      if (Math.random() < 0.1) { // Log 10% of frames to avoid spam
        console.log('🎮 ANIMATION DEBUG:', {
          currentTime,
          roundStartTime,
          gameStartTime,
          timeElapsed: currentTime - (roundStartTime || gameStartTime || currentTime),
          newMultiplier: newMultiplier.toFixed(3),
          gamePhase,
          crashed,
          curvePointsLength: curvePoints.length
        });
      }
      
      // ✅ CLIENT-SIDE CRASH PREDICTION: Log when we think crash should happen, but don't trigger
      if (crashPredictor?.isActive && currentTime >= crashPredictor.crashTime && !crashed) {
        console.log('🎯 CLIENT PREDICTION: Expected crash at', crashPredictor.crashPoint.toFixed(2) + 'x (current:', newMultiplier.toFixed(2) + 'x) - waiting for server confirmation');
        // ✅ FIX: Don't trigger crash immediately - let server be authoritative
        // Just log the prediction for debugging, but continue animation until server says to crash
      }
      
      // ✅ CRITICAL FIX: Update multiplier only if still rising AND not crashed
      if (gamePhase === 'rising' && !crashed) {
        setLocalMultiplier(newMultiplier);
      }
      
      // ✅ FIXED: Generate curve with FIXED ORIGIN + DIAGONAL GROWTH
      if (gamePhase === 'rising' && !crashed) {
        const canvas = canvasRef.current;
        if (canvas) {
          const width = canvas.offsetWidth;
          const height = canvas.offsetHeight;
          
          // ✅ FIXED: Ensure canvas has proper dimensions
          if (width > 100 && height > 100) {
            // 🎯 ABSOLUTELY FIXED ORIGIN - TRUE (0,0) AT BOTTOM-LEFT CORNER!
            const ORIGIN_X = 0; // ✅ TRUE 0,0 origin - left edge
            const ORIGIN_Y = height; // ✅ TRUE 0,0 origin - bottom edge
            
            // 🚀 CALCULATE CURRENT TIP POSITION
            const timeElapsed = currentTime - startTime;
            const timeInSeconds = timeElapsed / 1000;
            
            // ✅ CRITICAL: Use the SAME newMultiplier for perfect sync
            const multiplierForCurve = Math.max(newMultiplier, 1.0);
            
            // 📈 PERFECT DIAGONAL: Match the yellow reference line exactly
            const progress = (multiplierForCurve - 1.0); // Progress from 1.0x
            
            // ✅ IDENTICAL PROGRESS: Same rate for both X and Y to create perfect diagonal
            const diagonalProgress = Math.pow(progress, 0.9); // Same power for both X and Y
            const xProgress = diagonalProgress; // Horizontal progress
            const yProgress = diagonalProgress; // Vertical progress (same as X)
            
            // 🎯 DIRECT OPPOSITE CORNER: Aim for top-right (width, 0)
            const targetX = width; // Top-right corner X
            const targetY = 0; // Top-right corner Y
            const targetMultiplier = 50; // Reach opposite corner at 50x
            
            // 🎯 DIAGONAL SCALING: Aim directly for opposite corner
            const baseScaleX = (targetX - ORIGIN_X) / targetMultiplier; // Scale to reach width
            const baseScaleY = (ORIGIN_Y - targetY) / targetMultiplier; // Scale to reach top (Y=0)
            
            // Calculate raw positions aiming for opposite corner
            let tipX = ORIGIN_X + (xProgress * baseScaleX);
            let tipY = ORIGIN_Y - (yProgress * baseScaleY);
            
            // 🐌 STAKE'S EDGE SLOWING: Slow down when approaching container boundaries
            const distanceToRightEdge = width - tipX;
            const distanceToTopEdge = tipY;
            
            if (distanceToRightEdge < width * 0.2) { // Within 20% of right edge
              const slowFactor = Math.max(0.1, distanceToRightEdge / (width * 0.2)); // Slow down exponentially
              tipX = width - (distanceToRightEdge * slowFactor); // Inches towards edge
            }
            
            if (distanceToTopEdge < height * 0.2) { // Within 20% of top edge  
              const slowFactor = Math.max(0.1, distanceToTopEdge / (height * 0.2)); // Slow down exponentially
              tipY = 0 + (distanceToTopEdge * slowFactor); // Inches towards top edge (Y=0)
            }
            
            // 🚨 DEBUG: Show edge-slowing behavior
            if (multiplierForCurve >= 20.0 && Math.random() < 0.1) {
              console.log('🚀 STAKE EDGE-SLOWING BEHAVIOR:', {
                multiplier: multiplierForCurve.toFixed(2) + 'x',
                distanceToRightEdge: distanceToRightEdge.toFixed(1) + 'px',
                distanceToTopEdge: distanceToTopEdge.toFixed(1) + 'px',
                nearRightEdge: distanceToRightEdge < width * 0.2 ? '🐌 SLOWING' : '🚀 NORMAL',
                nearTopEdge: distanceToTopEdge < height * 0.2 ? '🐌 SLOWING' : '🚀 NORMAL',
                tipPosition: `(${tipX.toFixed(1)}, ${tipY.toFixed(1)})`,
                containerLimits: `maxX: ${width.toFixed(1)}, maxY: ${height.toFixed(1)}`,
                targetCorner: `(${targetX}, ${targetY})`, // Show target corner
                aimingFor: 'TOP-RIGHT CORNER'
              });
            }

            // 🔍 FULL SCREEN VERIFICATION: Check if scaling will actually fill screen
            if (multiplierForCurve >= 6.0 && multiplierForCurve <= 10.0 && Math.random() < 0.1) {
              const screenCoverageX = (tipX / width) * 100;
              const screenCoverageY = ((height - tipY) / height) * 100;
              console.log('📊 STAKE-STYLE CURVE GROWTH:', {
                multiplier: multiplierForCurve.toFixed(2) + 'x',
                exponentialProgress: `X:${xProgress.toFixed(2)}, Y:${yProgress.toFixed(2)}`,
                tipPosition: `(${tipX.toFixed(1)}, ${tipY.toFixed(1)})`,
                screenCoverageX: screenCoverageX.toFixed(1) + '%',
                screenCoverageY: screenCoverageY.toFixed(1) + '%',
                curveShape: yProgress > xProgress ? '📈 STEEPENING' : '📉 FLATTENING'
              });
            }

            // 🔍 DEBUG: Verify exponential curve behavior
            if (DEBUG_SYNC && Math.random() < 0.05) { // 5% of frames
              console.log('📈 EXPONENTIAL CURVE VERIFICATION:', {
                multiplier: multiplierForCurve.toFixed(2) + 'x',
                linearProgress: progress.toFixed(3),
                xProgress: xProgress.toFixed(3), // Should be sub-linear (0.8 power)
                yProgress: yProgress.toFixed(3), // Should be super-linear (1.2 power)
                tip: `(${tipX.toFixed(0)}, ${tipY.toFixed(0)})`,
                origin: `(${ORIGIN_X}, ${ORIGIN_Y})`, // Should be (0, height)
                exponentialRatio: (yProgress / Math.max(xProgress, 0.001)).toFixed(2) // Should increase over time
              });
            }

            // 🔍 CRITICAL: Track curve point updates around 27x
            if (multiplierForCurve >= 25.0 && multiplierForCurve <= 30.0) {
              console.log('📍 27x CURVE POINTS UPDATE:', {
                multiplier: multiplierForCurve.toFixed(2) + 'x',
                canvasSize: `${width}x${height}`, // ✅ NOW SHOWS ACTUAL CANVAS SIZE
                origin: `(${ORIGIN_X}, ${ORIGIN_Y})`,
                tip: `(${tipX.toFixed(1)}, ${tipY.toFixed(1)})`,
                previousTip: curvePoints.length > 1 ? `(${curvePoints[1].x.toFixed(1)}, ${curvePoints[1].y.toFixed(1)})` : 'NONE',
                tipMovement: curvePoints.length > 1 ? 
                  `ΔX:${(tipX - curvePoints[1].x).toFixed(1)}, ΔY:${(tipY - curvePoints[1].y).toFixed(1)}` : 'INITIAL',
                isMoving: curvePoints.length > 1 && (Math.abs(tipX - curvePoints[1].x) > 0.1 || Math.abs(tipY - curvePoints[1].y) > 0.1),
                tipAsPercentage: `X:${((tipX/width)*100).toFixed(1)}%, Y:${((tipY/height)*100).toFixed(1)}%` // ✅ SHOW AS PERCENTAGE OF CANVAS
              });
            }
            
            // 🚨 NEW: Debug high multipliers to verify constraint removal
            if (multiplierForCurve >= 30.0 && multiplierForCurve <= 50.0 && Math.random() < 0.2) {
              console.log('🚀 HIGH MULTIPLIER GROWTH CHECK:', {
                multiplier: multiplierForCurve.toFixed(2) + 'x',
                xProgress: xProgress.toFixed(1),
                yProgress: yProgress.toFixed(1), 
                tipX: tipX.toFixed(1),
                tipY: tipY.toFixed(1),
                growthRate: baseScaleX,
                unlimited: '✅ NO 20X CONSTRAINT',
                stillGrowing: xProgress > 19 ? '✅ BEYOND OLD LIMIT' : '❌ STILL UNDER OLD LIMIT'
              });
            }

            // ✅ ALWAYS MAINTAIN EXACTLY 2 POINTS: Origin + Current Tip
            setCurvePoints([
              { x: ORIGIN_X, y: ORIGIN_Y }, // Fixed origin - NEVER changes
              { x: tipX, y: tipY } // Current tip - grows diagonally
            ]);

            // 🚨 DEBUG: Track when curve points stop being updated around 10x  
            if (multiplierForCurve >= 8.0 && multiplierForCurve <= 12.0) {
              console.log('🔍 10x CURVE POINTS TRACKING:', {
                multiplier: multiplierForCurve.toFixed(2) + 'x',
                canvasSize: `${width}x${height}`, // ✅ VERIFY ACTUAL CANVAS SIZE
                newTip: `(${tipX.toFixed(1)}, ${tipY.toFixed(1)})`,
                newTipPercent: `X:${((tipX/width)*100).toFixed(1)}%, Y:${((tipY/height)*100).toFixed(1)}%`, // ✅ SHOW AS PERCENTAGE
                previousTip: curvePoints.length > 1 ? `(${curvePoints[1].x.toFixed(1)}, ${curvePoints[1].y.toFixed(1)})` : 'NONE',
                tipChanged: curvePoints.length > 1 ? 
                  (Math.abs(tipX - curvePoints[1].x) > 0.1 || Math.abs(tipY - curvePoints[1].y) > 0.1) : true,
                frameUpdate: 'CURVE POINTS SET',
                gamePhase: gamePhase,
                crashed: crashed
              });
            }
          }
        }
      }
      
      // Call parent update (always update with current value)
      if (onMultiplierUpdate) {
        onMultiplierUpdate(newMultiplier);
      }
      
      // ✅ CRITICAL FIX: Only continue if still rising AND not crashed
      if (gamePhase === 'rising' && !crashed) {
        animationRef.current = requestAnimationFrame(animate);
        // ✅ STEP 2: Report animation frame ID to parent
        if (onAnimationFrameId && animationRef.current) {
          onAnimationFrameId(animationRef.current);
        }

        // 🚨 DEBUG: Verify animation loop continues around 10x
        if (newMultiplier >= 8.0 && newMultiplier <= 12.0 && Math.random() < 0.1) {
          console.log('🔄 10x ANIMATION LOOP CHECK:', {
            multiplier: newMultiplier.toFixed(2) + 'x',
            animationFrameId: animationRef.current,
            gamePhase: gamePhase,
            crashed: crashed,
            loopContinuing: '✅ YES'
          });
        }
      } else {
        // Ensure we clean up the animation reference
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = undefined;
        }
        // Clear frame ID in parent
        if (onAnimationFrameId) {
          onAnimationFrameId(null);
        }
      }
    };
    
    animationRef.current = requestAnimationFrame(animate);
    // ✅ STEP 2: Report initial animation frame ID to parent
    if (onAnimationFrameId && animationRef.current) {
      onAnimationFrameId(animationRef.current);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gamePhase, gameStartTime, roundStartTime, calculateBlindMultiplier, onMultiplierUpdate, crashed, onCrashReached, onAnimationFrameId, crashPredictor]); // ✅ FIX: Add crashPredictor dependency

  // 🔄 RESET ON NEW ROUND
  useEffect(() => {
    if (gamePhase === 'waiting') {
      setCrashed(false);
      setLocalMultiplier(1.0);
      setGameStartTime(null);
      setCurvePoints([]);
    }
  }, [gamePhase]);

  // 🎨 RENDER ANIMATION LOOP - Always render when game is active
  useEffect(() => {
    let renderFrame: number;
    
    const renderLoop = () => {
      drawCrashCurve();
      
      // Continue rendering during rising and crashed phases
      if (gamePhase === 'rising' || gamePhase === 'crashed') {
        renderFrame = requestAnimationFrame(renderLoop);
      }
    };
    
    // Start rendering when game phase is active
    if (gamePhase === 'rising' || gamePhase === 'crashed' || gamePhase === 'waiting') {
      renderLoop();
    }
    
    return () => {
      if (renderFrame) {
        cancelAnimationFrame(renderFrame);
      }
    };
  }, [drawCrashCurve, gamePhase]);

    // 🎯 DETERMINE DISPLAY MULTIPLIER - Always show exact crash point when crashed
  const displayMultiplier = gamePhase === 'crashed' ? crashMultiplier || currentMultiplier : localMultiplier;
  const displayColor = getCurveColor(gamePhase);

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        width={canvasSize.width}   // ✅ DYNAMIC width
        height={canvasSize.height} // ✅ DYNAMIC height
        className="w-full h-full"
        style={{ display: 'block', background: 'transparent' }}
      />
      
      {/* Remove built-in multiplier display - handled by parent */}

      {/* 🎮 GAME STATUS */}
      <div className="absolute top-4 right-4 bg-slate-900/70 backdrop-blur-sm rounded-xl px-4 py-2 border border-slate-600">
        <div className="text-sm text-slate-300 font-medium">
          {gamePhase === 'waiting' && '⏳ Waiting'}
          {gamePhase === 'rising' && '🚀 Rising'}
          {gamePhase === 'crashed' && '💥 Crashed'}
          {gamePhase === 'complete' && '✅ Complete'}
        </div>
      </div>

      {/* 💥 CRASH EXPLOSION OVERLAY */}
      <AnimatePresence>
        {gamePhase === 'crashed' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              rotate: [0, 5, -5, 0]
            }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ 
              duration: 0.6,
              rotate: { duration: 0.8, repeat: 2 }
            }}
            className="absolute inset-0 flex items-center justify-center bg-red-500/10 backdrop-blur-sm pointer-events-none"
          >
            <div className="text-center">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="text-8xl mb-4"
              >
                💥
              </motion.div>
              <div className="text-4xl font-bold text-red-500">
                CRASHED AT {crashMultiplier?.toFixed(2) || currentMultiplier.toFixed(2)}x
              </div>
              <div className="text-lg text-red-300 mt-2">
                🎯 Exact crash point from server
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🚀 RISING GLOW EFFECT */}
      {gamePhase === 'rising' && (
        <div 
          className="absolute inset-0 rounded-xl pointer-events-none animate-pulse"
          style={{ 
            background: `radial-gradient(circle at center, ${getCurveColor(gamePhase)}10 0%, transparent 70%)` 
          }}
        />
      )}
    </div>
  );
} 