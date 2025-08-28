'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface CoinFlipSimple3DProps {
  isFlipping: boolean;
  result: 'heads' | 'tails' | null;
  onAnimationComplete?: () => void;
  onRenderReady?: () => void;
}

function SimpleCoin({ 
  isFlipping, 
  result, 
  onComplete,
  onRenderReady 
}: { 
  isFlipping: boolean; 
  result: 'heads' | 'tails' | null; 
  onComplete?: () => void;
  onRenderReady?: () => void;
}) {
  const coinRef = useRef<THREE.Group>(null);
  const [animationPhase, setAnimationPhase] = useState<'idle' | 'flipping' | 'settling' | 'complete'>('idle');
  const [rotationSpeed, setRotationSpeed] = useState({ x: 0, y: 0, z: 0 });
  const [position, setPosition] = useState({ x: 0, y: 0, z: 0 });
  const [velocity, setVelocity] = useState({ x: 0, y: 0, z: 0 });

  // Report ready immediately
  useEffect(() => {
    console.log('🎮 Simple 3D coin ready');
    onRenderReady?.();
  }, [onRenderReady]);

  // Start flip animation
  useEffect(() => {
    if (isFlipping && animationPhase === 'idle') {
      console.log('🚀 Starting dramatic 3D flip');
      setAnimationPhase('flipping');
      setRotationSpeed({ 
        x: 8 + Math.random() * 6,  // Reduced for more dramatic, visible flips
        y: 3 + Math.random() * 3,  // Slower Y rotation for better visibility
        z: 8 + Math.random() * 6   // Reduced for more controlled flipping
      });
      setVelocity({ x: 0, y: 12, z: 0 }); // Higher initial velocity for more dramatic arc
      setPosition({ x: 0, y: 0, z: 0 });
    }
  }, [isFlipping, animationPhase]);

  // Settle to result
  useEffect(() => {
    if (animationPhase === 'flipping' && result) {
      console.log('🎯 Simple 3D settling to:', result);
      setAnimationPhase('settling');
      setRotationSpeed({ x: 0, y: 0, z: 0 });
      setVelocity({ x: 0, y: -2, z: 0 });
      
      // Extended settling time for dramatic, engaging animation
      setTimeout(() => {
        setAnimationPhase('complete');
        onComplete?.();
      }, 4000); // Extended to 4 seconds for proper drama and engagement
    }
  }, [animationPhase, result, onComplete]);

  // Reset when not flipping
  useEffect(() => {
    if (!isFlipping) {
      setAnimationPhase('idle');
      setRotationSpeed({ x: 0, y: 0, z: 0 });
      setPosition({ x: 0, y: 0, z: 0 });
      setVelocity({ x: 0, y: 0, z: 0 });
    }
  }, [isFlipping]);

  // Animation loop
  useFrame((state, delta) => {
    if (!coinRef.current) return;

    if (animationPhase === 'flipping') {
      // Update rotation
      coinRef.current.rotation.x += rotationSpeed.x * delta;
      coinRef.current.rotation.y += rotationSpeed.y * delta;
      coinRef.current.rotation.z += rotationSpeed.z * delta;

      // Update position with gravity
      setPosition(prev => ({
        x: prev.x + velocity.x * delta,
        y: prev.y + velocity.y * delta,
        z: prev.z + velocity.z * delta
      }));

      setVelocity(prev => ({
        x: prev.x,
        y: prev.y - 9.8 * delta, // Gravity
        z: prev.z
      }));

      coinRef.current.position.set(position.x, position.y, position.z);

      // Bounce off ground with more dramatic bounces
      if (position.y <= 0 && velocity.y < 0) {
        setVelocity(prev => ({ ...prev, y: Math.abs(prev.y) * 0.75 })); // Higher bounce coefficient
        setPosition(prev => ({ ...prev, y: 0 }));
        
        // Gradually slow down rotation on each bounce for more realistic physics
        setRotationSpeed(prev => ({
          x: prev.x * 0.9,
          y: prev.y * 0.95,
          z: prev.z * 0.9
        }));
      }
    } else if (animationPhase === 'settling') {
      // Dramatic settling to final rotation - slower for more suspense
      const targetRotationX = result === 'heads' ? 0 : Math.PI;
      coinRef.current.rotation.x = THREE.MathUtils.lerp(coinRef.current.rotation.x, targetRotationX, delta * 2); // Slower settling
      coinRef.current.rotation.y = THREE.MathUtils.lerp(coinRef.current.rotation.y, 0, delta * 2.5);
      coinRef.current.rotation.z = THREE.MathUtils.lerp(coinRef.current.rotation.z, 0, delta * 2.5);
      
      // Slow position settling for dramatic effect
      coinRef.current.position.y = THREE.MathUtils.lerp(coinRef.current.position.y, 0, delta * 3);
      
      // Add slight wobble during settling for more realism
      const wobble = Math.sin(state.clock.elapsedTime * 8) * 0.02;
      coinRef.current.position.x = wobble;
    }
  });

  return (
    <group ref={coinRef} position={[0, 0, 0]}>
      {/* Simple coin geometry */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[2, 2, 0.2, 32]} />
        <meshStandardMaterial color="#ffd700" metalness={0.8} roughness={0.2} />
      </mesh>
      
      {/* Heads side */}
      <mesh position={[0, 0.11, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.8, 32]} />
        <meshStandardMaterial color="#ff6b35" />
      </mesh>
      
      {/* Tails side */}
      <mesh position={[0, -0.11, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.8, 32]} />
        <meshStandardMaterial color="#4a90e2" />
      </mesh>
    </group>
  );
}

export default function CoinFlipSimple3D({ 
  isFlipping, 
  result, 
  onAnimationComplete,
  onRenderReady
}: CoinFlipSimple3DProps) {
  const [error, setError] = useState(false);

  const handleComplete = () => {
    console.log('✅ Simple 3D animation complete');
    onAnimationComplete?.();
  };

  const handleError = () => {
    console.error('❌ Simple 3D animation failed');
    setError(true);
  };

  if (error) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center bg-gray-800 rounded-xl">
        <div className="text-white text-center">
          <div className="text-4xl mb-2">⚠️</div>
          <div>3D Error - Using Fallback</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[400px] bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl overflow-hidden">
      <Canvas
        shadows
        camera={{ position: [0, 3, 8], fov: 60 }}
        onCreated={({ gl }) => {
          gl.setClearColor('#1f2937', 1);
        }}
        onError={handleError}
      >
        {/* Simple lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight 
          position={[5, 5, 5]} 
          intensity={1} 
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        
        {/* Ground */}
        <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[10, 10]} />
          <meshStandardMaterial color="#374151" />
        </mesh>
        
        {/* Simple coin */}
        <SimpleCoin
          isFlipping={isFlipping}
          result={result}
          onComplete={handleComplete}
          onRenderReady={onRenderReady}
        />
      </Canvas>
    </div>
  );
} 