'use client';

import React, { useRef, useState, Suspense, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

interface ThreeJSDiceRollerProps {
  onRollComplete?: (results: any[]) => void;
  onDiceInitialized?: (initialized: boolean, diceInstance?: any) => void;
  className?: string;
  diceColor?: 'black' | 'white' | 'red' | 'blue' | 'green' | 'orange' | 'purple' | 'brown';
  useShadows?: boolean;
}

// Individual dice component with physics-like animation
function AnimatedDice({ 
  position, 
  finalValue, 
  isRolling, 
  color = '#007bff',
  onSettled 
}: { 
  position: [number, number, number];
  finalValue: number;
  isRolling: boolean;
  color?: string;
  onSettled?: () => void;
}) {
  const diceRef = useRef<THREE.Group>(null);
  const [hasSettled, setHasSettled] = useState(false);
  const [rollStartTime, setRollStartTime] = useState(0);

  // Start rolling animation
  useEffect(() => {
    if (isRolling && !hasSettled) {
      setRollStartTime(Date.now());
      setHasSettled(false);
    }
  }, [isRolling, hasSettled]);

  useFrame((state) => {
    if (!diceRef.current) return;

    if (isRolling && !hasSettled) {
      const elapsed = (Date.now() - rollStartTime) / 1000;
      const rollDuration = 2; // 2 seconds of rolling

      if (elapsed < rollDuration) {
        // Rolling phase - spinning and bouncing
        diceRef.current.rotation.x += 0.3;
        diceRef.current.rotation.y += 0.2;
        diceRef.current.rotation.z += 0.1;
        
        // Bouncing motion
        const bounceHeight = Math.sin(elapsed * 8) * 0.5 + 1;
        diceRef.current.position.y = position[1] + bounceHeight;
        
        // Random movements
        diceRef.current.position.x = position[0] + Math.sin(elapsed * 6) * 0.2;
        diceRef.current.position.z = position[2] + Math.cos(elapsed * 5) * 0.2;
      } else {
        // Settling phase
        setHasSettled(true);
        
        // Settle to final position and rotation
        diceRef.current.position.x = THREE.MathUtils.lerp(diceRef.current.position.x, position[0], 0.1);
        diceRef.current.position.y = THREE.MathUtils.lerp(diceRef.current.position.y, position[1], 0.1);
        diceRef.current.position.z = THREE.MathUtils.lerp(diceRef.current.position.z, position[2], 0.1);
        
        if (onSettled && elapsed > rollDuration + 0.5) {
          onSettled();
        }
      }
    } else if (!isRolling) {
      // Idle state - gentle floating
      diceRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
      diceRef.current.rotation.y += 0.005;
    }
  });

  return (
    <group ref={diceRef} position={position}>
      {/* Main dice cube */}
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial 
          color={color}
          roughness={0.1}
          metalness={0.1}
          emissive={color}
          emissiveIntensity={0.1}
        />
      </mesh>
      
      {/* Dice face numbers */}
      <Text
        position={[0, 0, 0.51]}
        fontSize={0.3}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {finalValue.toString()}
      </Text>
      
      {/* Glow effect when rolling */}
      {isRolling && (
        <mesh scale={1.1}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial
            color="#FFFFFF"
            transparent
            opacity={0.3}
          />
        </mesh>
      )}
    </group>
  );
}

// Loading fallback
function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[0.1, 0.1, 0.1]} />
      <meshBasicMaterial color="#666" transparent opacity={0.5} />
    </mesh>
  );
}

export default function ThreeJSDiceRoller({
  onRollComplete,
  onDiceInitialized,
  className = "w-full h-64",
  diceColor = 'blue',
  useShadows = true
}: ThreeJSDiceRollerProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const [diceResults, setDiceResults] = useState<number[]>([]);

  // Convert color to hex
  const getHexColor = (color: string) => {
    const colors = {
      'white': '#ffffff',
      'red': '#dc3545', 
      'blue': '#007bff',
      'green': '#28a745',
      'orange': '#fd7e14',
      'purple': '#6f42c1',
      'brown': '#795548',
      'black': '#343a40'
    };
    return colors[color as keyof typeof colors] || '#007bff';
  };

  // Initialize dice system
  useEffect(() => {
    console.log('🎲 Initializing Three.js dice system...');
    setIsInitialized(true);
    
    const diceSystem = {
      roll: async (notation: string) => rollDice(notation),
      isReady: () => true,
      clear: () => {
        setDiceResults([]);
        setIsRolling(false);
      }
    };
    
    if (onDiceInitialized) {
      onDiceInitialized(true, diceSystem);
    }
    
    console.log('✅ Three.js dice system ready!');
  }, [onDiceInitialized]);

  // Roll dice
  const rollDice = async (notation: string): Promise<any[]> => {
    if (isRolling) return [];

    console.log('🎲 Rolling Three.js dice:', notation);
    
    const results = parseDiceNotation(notation);
    setDiceResults(results);
    setIsRolling(true);
    
    // Wait for animation
    setTimeout(() => {
      setIsRolling(false);
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
    }, 3000);
    
    return [];
  };

  // Parse dice notation
  const parseDiceNotation = (notation: string): number[] => {
    if (notation.includes('@')) {
      const [, totalValue] = notation.split('@');
      const total = parseInt(totalValue);
      return [total]; // Single die with predetermined value
    }
    
    // Simple random roll
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
    
    return [Math.floor(Math.random() * 6) + 1];
  };

  return (
    <div className={`relative ${className}`}>
      <div className="w-full h-full bg-gradient-to-br from-green-800 to-green-900 rounded-lg overflow-hidden">
        {!isInitialized && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="text-white text-center">
              <p className="text-xl font-bold">🎲 Loading 3D Dice...</p>
            </div>
          </div>
        )}
        
        {isRolling && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-blue-500/20 text-blue-300 px-4 py-2 rounded-full text-lg font-semibold z-10">
            🎲 Rolling 3D Dice...
          </div>
        )}
        
        {isInitialized && (
          <Canvas
            camera={{ position: [0, 3, 8], fov: 50 }}
            style={{ width: '100%', height: '100%' }}
          >
            <ambientLight intensity={0.6} />
            <directionalLight position={[10, 10, 5]} intensity={1.2} />
            <pointLight position={[-10, -10, -10]} intensity={0.5} />
            
            <Suspense fallback={null}>
              {diceResults.map((value, index) => (
                <AnimatedDice
                  key={index}
                  position={[index * 2 - (diceResults.length - 1), 0, 0]}
                  finalValue={value}
                  isRolling={isRolling}
                  color={getHexColor(diceColor)}
                />
              ))}
            </Suspense>
          </Canvas>
        )}
        
        {isInitialized && !isRolling && diceResults.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white/80">
              <div className="text-6xl mb-4">🎲</div>
              <p className="text-lg font-semibold">Ready to Roll 3D Dice!</p>
            </div>
          </div>
        )}
        
        {isInitialized && (
          <div className="absolute bottom-4 right-4 bg-green-500/20 text-green-300 px-4 py-2 rounded-lg text-sm">
            ✅ 3D Dice Ready
          </div>
        )}
      </div>
    </div>
  );
} 