'use client';

import React, { useRef, useState, Suspense, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

interface RealisticDiceRollerProps {
  onRollComplete?: (results: any[]) => void;
  onDiceInitialized?: (initialized: boolean, diceInstance?: any) => void;
  className?: string;
  diceColor?: 'black' | 'white' | 'red' | 'blue' | 'green' | 'orange' | 'purple' | 'brown';
  useShadows?: boolean;
}

// Create simple dice geometry - casino dice proportions
function createDiceGeometry() {
  return new THREE.BoxGeometry(0.8, 0.8, 0.8); // Casino-sized dice for realistic proportions
}

// Create dice pips (dots) for each face
function DicePips({ face, position, rotation }: { 
  face: number; 
  position: [number, number, number]; 
  rotation: [number, number, number];
}) {
  const pipPositions: { [key: number]: [number, number][] } = {
    1: [[0, 0]], // Center dot
    2: [[-0.12, -0.12], [0.12, 0.12]], // Diagonal (scaled for 0.8x0.8x0.8 casino dice)
    3: [[-0.12, -0.12], [0, 0], [0.12, 0.12]], // Diagonal + center
    4: [[-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12], [0.12, 0.12]], // Four corners
    5: [[-0.12, -0.12], [0.12, -0.12], [0, 0], [-0.12, 0.12], [0.12, 0.12]], // Four corners + center
    6: [[-0.12, -0.12], [0.12, -0.12], [-0.12, 0], [0.12, 0], [-0.12, 0.12], [0.12, 0.12]] // Two columns
  };

  const pips = pipPositions[face] || [];

  return (
    <group position={position} rotation={rotation}>
      {pips.map((pipPos, index) => (
        // 🎲 REAL DICE PIPS - Embedded/carved into surface like authentic casino dice
        <mesh key={index} position={[pipPos[0], pipPos[1], -0.015]}>
          <cylinderGeometry args={[0.055, 0.055, 0.03, 12]} />
          <meshStandardMaterial 
            color="#111111" // Very dark for deep carved appearance
            roughness={0.9} // Rough surface like drilled holes
            metalness={0.0} // No metallic reflection for authentic look
            transparent={true}
            opacity={0.95} // Slightly transparent for depth effect
          />
        </mesh>
      ))}
      
      {/* Add subtle shadow/depth rings around each pip for realism */}
      {pips.map((pipPos, index) => (
        <mesh key={`shadow-${index}`} position={[pipPos[0], pipPos[1], -0.008]}>
          <ringGeometry args={[0.055, 0.07, 8]} />
          <meshStandardMaterial 
            color="#333333" // Dark shadow ring
            roughness={1.0}
            metalness={0.0}
            transparent={true}
            opacity={0.3} // Subtle shadow effect
          />
        </mesh>
      ))}
    </group>
  );
}

// Realistic dice component with COLLISION PHYSICS
function RealisticDice({ 
  position, 
  finalValue, 
  isRolling, 
  color = '#ffffff',
  onSettled,
  sharedPositions,
  diceIndex = 0,
  roundKey = 0
}: { 
  position: [number, number, number];
  finalValue: number;
  isRolling: boolean;
  color?: string;
  onSettled?: () => void;
  sharedPositions: React.MutableRefObject<THREE.Vector3[]>;
  diceIndex?: number;
  roundKey?: number;
}) {
  const diceRef = useRef<THREE.Group>(null);
  const [hasSettled, setHasSettled] = useState(false);
  const [rollStartTime, setRollStartTime] = useState(0);

  // 🎲 AUTHENTIC DICE THROW PHYSICS - Based on circular medieval table
  const [throwPhysics] = useState(() => {
    // Table dimensions from medieval tavern image analysis
    const tableRadius = 3.2; // Green felt playing area (smaller, more accurate)
    const rimRadius = 3.5;   // Wooden rim boundary
    
    // Calculate throw starting position (player's hand at table edge)
    const throwAngle = (diceIndex * Math.PI / 2) + (Math.random() - 0.5) * 0.3; // Better dice spread
    const startDistance = rimRadius * 0.95; // Start very close to rim edge (hand position)
    
    return {
      // Starting position - player's hand at table edge  
      startPos: {
        x: Math.cos(throwAngle) * startDistance,
        z: Math.sin(throwAngle) * startDistance,
        y: 1.8 // Hand height above table
      },
      // Target area - center region of table (where dice should land)
      targetPos: {
        x: (Math.random() - 0.5) * tableRadius * 0.4, // Land in center area (smaller target)
        z: (Math.random() - 0.5) * tableRadius * 0.4,
        y: 0.05 // Felt surface height (lower, more realistic)
      },
      // Physics properties
      tableRadius,
      rimRadius,
      // Current state
      velocity: { x: 0, y: 0, z: 0 },
      spin: { x: 0, y: 0, z: 0 },
      hasLanded: false,
      bounceCount: 0
    };
  });

  // Reset for new round
  useEffect(() => {
    console.log(`🎲 Dice ${diceIndex}: New round ${roundKey} - resetting`);
    setHasSettled(false);
    setRollStartTime(0);
    
    if (diceRef.current) {
      // Set initial position at table edge (hand position)
      diceRef.current.position.set(
        throwPhysics.startPos.x,
        throwPhysics.startPos.y, 
        throwPhysics.startPos.z
      );
      diceRef.current.rotation.set(0, 0, 0);
    }
  }, [roundKey, diceIndex]);

  // Start throw animation
  useEffect(() => {
    if (isRolling && !hasSettled) {
      console.log(`🎲 Dice ${diceIndex}: Starting authentic throw`);
      setRollStartTime(Date.now());
      
      // Calculate initial throw velocity (from hand to target area)
      const distance = Math.sqrt(
        (throwPhysics.targetPos.x - throwPhysics.startPos.x) ** 2 +
        (throwPhysics.targetPos.z - throwPhysics.startPos.z) ** 2
      );
      
      const throwTime = 1.0; // Faster, more energetic throw
      throwPhysics.velocity.x = (throwPhysics.targetPos.x - throwPhysics.startPos.x) / throwTime;
      throwPhysics.velocity.z = (throwPhysics.targetPos.z - throwPhysics.startPos.z) / throwTime;
      throwPhysics.velocity.y = 4.5; // Higher arc for more dramatic throw
      
      // Boost horizontal velocities for more energetic movement
      throwPhysics.velocity.x *= 1.3; // 30% more horizontal speed
      throwPhysics.velocity.z *= 1.3;
      
      // Initial spin from hand throw
      throwPhysics.spin.x = (Math.random() - 0.5) * 8;
      throwPhysics.spin.y = (Math.random() - 0.5) * 8;
      throwPhysics.spin.z = (Math.random() - 0.5) * 8;
      
      // Reset state
      throwPhysics.hasLanded = false;
      throwPhysics.bounceCount = 0;
    }
  }, [isRolling, hasSettled, roundKey]);
  
  useFrame((state) => {
    if (!diceRef.current || !isRolling || hasSettled) return;
    
    const elapsed = (Date.now() - rollStartTime) / 1000;
    const rollDuration = 6.0; // Total animation time
    
    // No forced settlement - dice settle naturally when they stop moving

    const dt = 1/60; // 60fps timestep
    
    // 🎲 DICE-TO-DICE COLLISION DETECTION - Only when actually touching
    const checkDiceCollisions = () => {
      if (!diceRef.current) return;
      
      const myPosition = diceRef.current.position;
      const diceSize = 0.8; // Dice edge length
      const collisionRadius = diceSize * 0.45; // SMALLER radius - only when dice actually touch
      
      // Update my position in shared array (for collision detection only)
      if (sharedPositions.current[diceIndex]) {
        sharedPositions.current[diceIndex].copy(myPosition);
      } else {
        sharedPositions.current[diceIndex] = myPosition.clone();
      }
      
      // Check collision with all other dice
      for (let i = 0; i < sharedPositions.current.length; i++) {
        if (i === diceIndex || !sharedPositions.current[i]) continue;
        
        const otherPosition = sharedPositions.current[i];
        const distance = myPosition.distanceTo(otherPosition);
        
        // COLLISION DETECTED - Only when dice are actually overlapping
        if (distance < collisionRadius && distance > 0.01) {
          console.log(`💥 COLLISION: Dice ${diceIndex} hit dice ${i} (distance: ${distance.toFixed(3)})`);
          
          // Calculate collision response - realistic bounce physics
          const collisionNormal = new THREE.Vector3()
            .subVectors(myPosition, otherPosition)
            .normalize();
          
          // Push dice apart to prevent overlap (smaller force)
          const overlap = collisionRadius - distance;
          const separationForce = collisionNormal.multiplyScalar(overlap * 0.3);
          
          myPosition.add(separationForce);
          
          // GENTLER bounce velocity - not too aggressive
          const bounceStrength = 1.8; // Gentler bounce force for natural movement
          const bounceVelocity = collisionNormal.multiplyScalar(bounceStrength);
          
          throwPhysics.velocity.x += bounceVelocity.x;
          throwPhysics.velocity.z += bounceVelocity.z;
          
          // Add spin from collision (dice tumble when they hit)
          throwPhysics.spin.x += (Math.random() - 0.5) * 2;
          throwPhysics.spin.y += (Math.random() - 0.5) * 2;
          throwPhysics.spin.z += (Math.random() - 0.5) * 2;
          
          console.log(`🎲 Dice ${diceIndex}: Bounced with velocity(${throwPhysics.velocity.x.toFixed(2)}, ${throwPhysics.velocity.z.toFixed(2)})`);
          
          break; // Only handle one collision per frame
        }
      }
    };
    
    // NATURAL DICE ROLLING - No artificial phases, just roll until friction stops them
    
    // In air - apply gravity
    if (diceRef.current.position.y > 0.1) {
      throwPhysics.velocity.y -= 15 * dt; // Gravity
    }
    
    // Landing detection
    if (!throwPhysics.hasLanded && diceRef.current.position.y <= 0.1) {
      throwPhysics.hasLanded = true;
      console.log(`🎯 Dice ${diceIndex}: LANDED on table!`);
      
      // Convert downward velocity to small bounce
      if (throwPhysics.velocity.y < 0) {
        throwPhysics.velocity.y = Math.abs(throwPhysics.velocity.y) * 0.3;
      }
      
      // Boost horizontal velocities for active rolling
      throwPhysics.velocity.x *= 1.2;
      throwPhysics.velocity.z *= 1.2;
      
      // Add some random rolling motion
      throwPhysics.velocity.x += (Math.random() - 0.5) * 2.0;
      throwPhysics.velocity.z += (Math.random() - 0.5) * 2.0;
    }
    
    // Once landed, apply table physics
    if (throwPhysics.hasLanded) {
      diceRef.current.position.y = 0.1; // Lock to table
      
      // REAL ROLLING PHYSICS - rotation linked to movement
      const diceSize = 0.8;
      const rollSpeedX = throwPhysics.velocity.x / diceSize;
      const rollSpeedZ = throwPhysics.velocity.z / diceSize;
      
      // Rolling rotation
      throwPhysics.spin.x = rollSpeedZ;
      throwPhysics.spin.z = -rollSpeedX;
      throwPhysics.spin.y *= 0.95;
      
      // Apply table friction - dice naturally slow down
      throwPhysics.velocity.x *= 0.988; // Natural friction
      throwPhysics.velocity.z *= 0.988;
      throwPhysics.velocity.y = 0;
      
      // Small random impulses (table imperfections)
      if (Math.random() < 0.015) {
        throwPhysics.velocity.x += (Math.random() - 0.5) * 0.2;
        throwPhysics.velocity.z += (Math.random() - 0.5) * 0.2;
      }
    }
    
    // Update position
    diceRef.current.position.x += throwPhysics.velocity.x * dt;
    diceRef.current.position.y = Math.max(0.1, diceRef.current.position.y + throwPhysics.velocity.y * dt);
    diceRef.current.position.z += throwPhysics.velocity.z * dt;
    
    // Collision detection only when moving
    if (throwPhysics.hasLanded && (Math.abs(throwPhysics.velocity.x) > 0.1 || Math.abs(throwPhysics.velocity.z) > 0.1)) {
      checkDiceCollisions();
    }
    
    // Natural boundary bounce
    const distanceFromCenter = Math.sqrt(diceRef.current.position.x ** 2 + diceRef.current.position.z ** 2);
    if (distanceFromCenter > throwPhysics.tableRadius) {
      const angle = Math.atan2(diceRef.current.position.z, diceRef.current.position.x);
      diceRef.current.position.x = Math.cos(angle) * throwPhysics.tableRadius;
      diceRef.current.position.z = Math.sin(angle) * throwPhysics.tableRadius;
      
      // Natural reflection
      const edgeNormal = new THREE.Vector3(-Math.cos(angle), 0, -Math.sin(angle));
      const currentVelocity = new THREE.Vector3(throwPhysics.velocity.x, 0, throwPhysics.velocity.z);
      const reflectedVelocity = currentVelocity.clone().reflect(edgeNormal);
      
      throwPhysics.velocity.x = reflectedVelocity.x * 0.7;
      throwPhysics.velocity.z = reflectedVelocity.z * 0.7;
      
      throwPhysics.velocity.x += (Math.random() - 0.5) * 0.5;
      throwPhysics.velocity.z += (Math.random() - 0.5) * 0.5;
    }
    
    // Apply rotation
    diceRef.current.rotation.x += throwPhysics.spin.x * dt;
    diceRef.current.rotation.y += throwPhysics.spin.y * dt;
    diceRef.current.rotation.z += throwPhysics.spin.z * dt;
    
    // Check if dice has naturally stopped (no artificial settling)
    const totalVelocity = Math.sqrt(throwPhysics.velocity.x ** 2 + throwPhysics.velocity.z ** 2);
    if (!hasSettled && throwPhysics.hasLanded && totalVelocity < 0.05 && elapsed > 2.0) {
      console.log(`🎯 Dice ${diceIndex}: Naturally stopped at velocity ${totalVelocity.toFixed(3)}`);
      setHasSettled(true);
      if (onSettled) onSettled();
    }
  });

  // No artificial face alignment - dice settle naturally based on physics

  return (
    <group ref={diceRef} position={position}>
      {/* Main die body with realistic materials - Casino dice size */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.8, 0.8, 0.8]} />
        <meshStandardMaterial 
          color={color}
          roughness={0.2}
          metalness={0.1}
          transparent={false}
          opacity={1.0}
        />
      </mesh>
      
      {/* Dice face pips (dots) - ADJUSTED for 0.8x0.8x0.8 casino dice */}
      <DicePips face={1} position={[0, 0, 0.41]} rotation={[0, 0, 0]} />
      <DicePips face={2} position={[0.41, 0, 0]} rotation={[0, Math.PI/2, 0]} />
      <DicePips face={3} position={[0, 0.41, 0]} rotation={[-Math.PI/2, 0, 0]} />
      <DicePips face={4} position={[0, -0.41, 0]} rotation={[Math.PI/2, 0, 0]} />
      <DicePips face={5} position={[-0.41, 0, 0]} rotation={[0, -Math.PI/2, 0]} />
      <DicePips face={6} position={[0, 0, -0.41]} rotation={[0, Math.PI, 0]} />
      
      {/* ENHANCED Rolling glow effect for better visibility */}
      {isRolling && (
        <mesh scale={1.1}>
          <boxGeometry args={[0.8, 0.8, 0.8]} />
          <meshBasicMaterial
            color="#FFFF00"
            transparent
            opacity={0.5}
            side={THREE.BackSide}
          />
        </mesh>
      )}
      
      {/* Settled highlight */}
      {hasSettled && (
        <mesh scale={1.05}>
          <boxGeometry args={[0.8, 0.8, 0.8]} />
          <meshBasicMaterial
            color="#FFD700"
            transparent
            opacity={0.3}
            side={THREE.BackSide}
          />
        </mesh>
      )}
    </group>
  );
}

export default function RealisticDiceRoller({
  onRollComplete,
  onDiceInitialized,
  className = "w-full h-64",
  diceColor = 'white',
  useShadows = true
}: RealisticDiceRollerProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const [diceResults, setDiceResults] = useState<number[]>([]);
  const [roundKey, setRoundKey] = useState(0);
  const [showScorePopup, setShowScorePopup] = useState(false);
  const [roundScores, setRoundScores] = useState<{player: number, opponent: number} | null>(null);
  const sharedDicePositions = useRef<THREE.Vector3[]>([]);

  // Convert color to realistic dice colors
  const getDiceColor = (color: string) => {
    const colors = {
      'white': '#F8F8FF',     // Ivory white (classic dice)
      'red': '#DC143C',       // Deep red
      'blue': '#4169E1',      // Royal blue
      'green': '#228B22',     // Forest green
      'orange': '#FF8C00',    // Dark orange
      'purple': '#8A2BE2',    // Blue violet
      'brown': '#8B4513',     // Saddle brown
      'black': '#2F2F2F'      // Dark gray (easier to see pips)
    };
    return colors[color as keyof typeof colors] || '#F8F8FF';
  };

  // Debug logging for round changes
  useEffect(() => {
    if (roundKey > 0) {
      console.log(`🎯 Round ${roundKey} started - all dice state will reset`);
    }
  }, [roundKey]);

  useEffect(() => {
    console.log('🎲 Initializing realistic dice system...');
    setIsInitialized(true);
    
    const diceSystem = {
      roll: async (diceArray: any) => {
        // Handle both old DiceBoxWrapper API (array) and new API (string)
        if (Array.isArray(diceArray)) {
          // Old API: [{dice: "1d6@4", label: "player"}, {dice: "1d6@3", label: "opponent"}]
          console.log('🎲 Rolling multiple dice (old API compatibility):', diceArray);
          const notations = diceArray.map((d: any) => d.dice || d.notation || d).join(',');
          return await rollDice(notations);
        } else {
          // New API: "1d6@4"
          return await rollDice(diceArray);
        }
      },
      rollWithNotation: async (notation: string) => rollDice(notation),
      isReady: () => true,
      clear: () => {
        console.log('🎲 Clearing dice system for new round');
        setDiceResults([]);
        setIsRolling(false);
        setShowScorePopup(false); // Hide score popup
        setRoundScores(null); // Clear scores
        setRoundKey(prev => prev + 1); // Force complete state reset
        sharedDicePositions.current = []; // Clear collision positions
      }
    };
    
    if (onDiceInitialized) {
      onDiceInitialized(true, diceSystem);
    }
    
    console.log('✅ Realistic dice system ready!');
  }, [onDiceInitialized]);

  const rollDice = async (notation: string): Promise<any[]> => {
    if (isRolling) {
      console.warn('🎲 Already rolling - ignoring duplicate roll request');
      return [];
    }

    console.log(`🎲 🎯 STARTING DICE ANIMATION (Round ${roundKey + 1}):`, notation);
    
    // EXPLICIT state management for smooth animations
    setShowScorePopup(false); // Hide any previous score popup
    setRoundScores(null); // Clear previous scores
    
    // Start new round - this will trigger state reset in individual dice
    setRoundKey(prev => prev + 1);
    
    const results = parseDiceNotation(notation);
    setDiceResults(results);
    
    // SHORT delay to ensure state is set before animation starts
    setTimeout(() => {
      setIsRolling(true);
      console.log(`🎲 ✅ ANIMATION STARTED - Both players should see rolling dice now!`);
    }, 100);
    
    // Clear and initialize shared positions array for collision detection
    sharedDicePositions.current = new Array(results.length).fill(null).map(() => new THREE.Vector3());
    
    console.log(`🎲 Round ${roundKey + 1}: Generated ${results.length} dice with results:`, results);
    
    // Return a Promise that resolves when the animation completes
    return new Promise((resolve) => {
      const animationStartTime = Date.now();
      
      setTimeout(() => {
        const actualDuration = (Date.now() - animationStartTime) / 1000;
        console.log(`🎲 ✅ ANIMATION COMPLETE (Round ${roundKey + 1}) - Duration: ${actualDuration.toFixed(1)}s`);
        console.log(`🎲 🎯 Both players should now see final dice results!`);
        setIsRolling(false);
        
        // Calculate scores for each player
        const halfPoint = Math.ceil(results.length / 2);
        const playerDice = results.slice(0, halfPoint);
        const opponentDice = results.slice(halfPoint);
        
        const playerScore = playerDice.reduce((sum, val) => sum + val, 0);
        const opponentScore = opponentDice.reduce((sum, val) => sum + val, 0);
        
        console.log(`🎯 ROUND SCORES: Player=${playerScore} (${playerDice.join('+')}) vs Opponent=${opponentScore} (${opponentDice.join('+')})`);
        
        // Show score popup after a brief delay
        setTimeout(() => {
          setRoundScores({ player: playerScore, opponent: opponentScore });
          setShowScorePopup(true);
          
          // Auto-hide after 8 seconds if user doesn't interact
          setTimeout(() => {
            setShowScorePopup(false);
          }, 8000);
        }, 1000); // 1 second after dice settle
        
        const finalResults = results.map((value, index) => ({
          value,
          sides: 6,
          type: 'd6',
          groupId: 0,
          rollId: index
        }));
        
        if (onRollComplete) {
          onRollComplete(finalResults);
        }
        
        // Resolve the promise with the results
        resolve(finalResults);
      }, 6000); // RESEARCH-BASED: 6.0 seconds realistic dice physics - matches authentic dice roll timing
    });
  };

  const parseDiceNotation = (notation: string): number[] => {
    console.log('🎲 Parsing dice notation:', notation);
    
    // Handle multiple dice notations separated by comma (player,opponent)
    if (notation.includes(',')) {
      const notations = notation.split(',');
      const allResults: number[] = [];
      
      notations.forEach((singleNotation, groupIndex) => {
        const results = parseSingleNotation(singleNotation.trim());
        console.log(`🎲 Group ${groupIndex} (${groupIndex === 0 ? 'PLAYER' : 'OPPONENT'}):`, results);
        allResults.push(...results);
      });
      
      console.log('🎲 ALL dice results:', allResults);
      return allResults;
    }
    
    return parseSingleNotation(notation);
  };

  const parseSingleNotation = (notation: string): number[] => {
    // Handle predetermined values: "3d4@10" means roll 3d4 but result must be 10
    if (notation.includes('@')) {
      const [diceSpec, totalValue] = notation.split('@');
      const total = parseInt(totalValue);
      
      // Extract number of dice from notation like "3d4" -> 3 dice
      const match = diceSpec.match(/(\d+)d(\d+)/);
      if (match) {
        const diceCount = parseInt(match[1]);
        const sides = parseInt(match[2]);
        
        // Distribute the total value across multiple dice
        const results: number[] = [];
        let remaining = total;
        
        for (let i = 0; i < diceCount - 1; i++) {
          const minRemaining = diceCount - i - 1; // Minimum for remaining dice
          const maxThisDie = Math.min(sides, remaining - minRemaining);
          const minThisDie = Math.max(1, remaining - (sides * (diceCount - i - 1)));
          
          const value = Math.floor(Math.random() * (maxThisDie - minThisDie + 1)) + minThisDie;
          results.push(value);
          remaining -= value;
        }
        
        // Last die gets whatever's left
        results.push(Math.max(1, Math.min(sides, remaining)));
        
        console.log(`🎲 Distributed ${total} across ${diceCount} dice:`, results);
        return results;
      }
      
      // Fallback: single die with predetermined value
      return [total];
    }
    
    // Handle standard notation: "2d6" means roll 2 six-sided dice
    const match = notation.match(/(\d+)d(\d+)/);
    if (match) {
      const count = parseInt(match[1]);
      const sides = parseInt(match[2]);
      
      const results = [];
      for (let i = 0; i < count; i++) {
        results.push(Math.floor(Math.random() * sides) + 1);
      }
      return results;
    }
    
    // Fallback: single d6
    return [Math.floor(Math.random() * 6) + 1];
  };

  return (
    <div className={`relative ${className}`}>
      <div 
        className="w-full h-full overflow-hidden relative"
        style={{
          background: 'transparent'
        }}
      >
        
        {!isInitialized && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white/60 mx-auto mb-3"></div>
              <p className="text-xl font-bold">Loading Dice System...</p>
              <p className="text-sm opacity-80">Initializing 3D physics</p>
            </div>
          </div>
        )}
        
        {isRolling && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/90 text-white px-6 py-3 rounded-full text-lg font-bold z-10 border border-yellow-400/60 animate-pulse backdrop-blur-md shadow-xl">
            🎯 AUTHENTIC DICE THROW 🎯
            <div className="text-xs mt-1 opacity-90">
              Medieval Tavern Table • Real Physics
            </div>
          </div>
        )}
        
        {isInitialized && (
          <Canvas
            camera={{ position: [0, 8, 12], fov: 60 }}
            shadows={useShadows}
            gl={{ antialias: true, alpha: true }}
            style={{ width: '100%', height: '100%', background: 'transparent' }}
          >
            {/* Soft lighting to blend with existing background */}
            <ambientLight intensity={0.6} />
            <directionalLight 
              position={[5, 10, 5]} 
              intensity={0.8}
              castShadow={useShadows}
              shadow-mapSize-width={512}
              shadow-mapSize-height={512}
              shadow-camera-far={30}
              shadow-camera-left={-8}
              shadow-camera-right={8}
              shadow-camera-top={8}
              shadow-camera-bottom={-8}
            />
            <pointLight position={[-5, 6, 5]} intensity={0.4} />
            <pointLight position={[5, 6, -5]} intensity={0.4} />
            
            {/* No 3D table - using existing game background */}
            
            <Suspense fallback={null}>
              {diceResults.map((value, index) => {
                // For RPG dice with multiple dice (3d4+3d4 = 6 dice total)
                let diceColorForIndex = getDiceColor(diceColor);
                let playerLabel = '';
                
                // Color coding: First 3 dice = player (blue), Last 3 dice = opponent (red)
                const isPlayerDice = index < Math.ceil(diceResults.length / 2);
                if (diceResults.length > 1) {
                  diceColorForIndex = isPlayerDice ? '#4169E1' : '#DC143C';
                  
                  // Label only the first die of each group
                  if (index === 0) playerLabel = 'YOU';
                  if (index === Math.ceil(diceResults.length / 2)) playerLabel = 'OPPONENT';
                }
                
                // 🎯 PROPER DICE SPREAD - Wide separation around circular table WITH COLLISION PREVENTION
                const diceInGroup = Math.ceil(diceResults.length / 2);
                const groupIndex = isPlayerDice ? index : index - diceInGroup;
                
                // MUCH wider spread - use full semicircle for each player
                const baseAngle = isPlayerDice ? Math.PI : 0; // Player bottom half, opponent top half
                const spreadRange = Math.PI * 0.9; // Use 90% of semicircle (162 degrees) - wider
                const startAngle = baseAngle - spreadRange/2;
                const diceAngle = startAngle + (groupIndex / Math.max(1, diceInGroup-1)) * spreadRange;
                
                // Start MUCH further apart and add randomization to prevent clustering
                const startRadius = 4.5 + (Math.random() * 0.8); // 4.5-5.3 range for varied distances
                const angleVariation = (Math.random() - 0.5) * 0.4; // ±11 degree random variation
                const finalAngle = diceAngle + angleVariation;
                
                const xPosition = Math.cos(finalAngle) * startRadius;
                const zPosition = Math.sin(finalAngle) * startRadius;
                
                // Debug logging for each dice
                console.log(`🎲 Dice ${index}: value=${value}, isPlayer=${isPlayerDice}, color=${diceColorForIndex}`);
                
                return (
                  <group key={`${roundKey}-${index}`}>
                    <RealisticDice
                      position={[xPosition, 1.8, zPosition]} // Hand height - authentic starting position
                      finalValue={value}
                      isRolling={isRolling}
                      color={diceColorForIndex}
                      sharedPositions={sharedDicePositions}
                      diceIndex={index}
                      roundKey={roundKey}
                    />
                    
                    {/* Player Label (only for group leaders) */}
                    {playerLabel && (
                      <Text
                        position={[xPosition, 3.0, zPosition]} // Above dice at table edge
                        fontSize={0.6}
                        color={diceColorForIndex}
                        anchorX="center"
                        anchorY="middle"
                      >
                        {playerLabel}
                      </Text>
                    )}
                  </group>
                );
              })}
            </Suspense>
          </Canvas>
        )}
        
        {isInitialized && !isRolling && diceResults.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white">
              <div className="text-6xl mb-4">🎲</div>
              <p className="text-xl font-bold">Ready to Roll!</p>
              <p className="text-sm opacity-80 mt-2">Waiting for players to roll dice</p>
            </div>
          </div>
        )}
        
        {/* DEBUG: Show dice count during rolling */}
        {isRolling && (
          <div className="absolute top-16 left-1/2 transform -translate-x-1/2 bg-black/50 text-white/90 px-4 py-2 rounded-full text-sm font-semibold z-10 border border-white/30 backdrop-blur-sm">
            🎲 Rolling {diceResults.length} dice...
          </div>
        )}
        
        {isInitialized && (
          <div className="absolute bottom-4 right-4 bg-black/40 text-white/80 px-4 py-2 rounded-lg text-sm border border-white/20 shadow-lg">
            ✅ System Ready
          </div>
        )}

      </div>
    </div>
  );
} 