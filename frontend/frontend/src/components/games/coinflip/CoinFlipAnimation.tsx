'use client';
import React, { useRef, useEffect, useState, Suspense, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber';
import { 
  Text, 
  Environment, 
  ContactShadows, 
  MeshReflectorMaterial,
  Float,
  Sparkles,
  useTexture,
  Html,
  PerspectiveCamera,
  OrbitControls
} from '@react-three/drei';
import { Physics, useCylinder, usePlane } from '@react-three/cannon';
import { EffectComposer, Bloom, ChromaticAberration, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';

interface CoinFlipAnimationProps {
  isFlipping: boolean;
  result: 'heads' | 'tails' | null;
  onAnimationComplete?: () => void;
  onRenderReady?: () => void;
}

// Enhanced Coin Material with custom shader
const CoinMaterial = ({ color = '#e8e8e8', metalness = 0.95, roughness = 0.05 }: any) => {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    
    // Create radial gradient for metallic effect
    const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.3, color);
    gradient.addColorStop(0.7, '#cccccc');
    gradient.addColorStop(1, '#888888');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);
    
    return new THREE.CanvasTexture(canvas);
  }, [color]);

  return (
    <meshStandardMaterial
      map={texture}
      metalness={metalness}
      roughness={roughness}
      envMapIntensity={2}
      transparent={false}
    />
  );
};

// Professional 3D Coin with Physics
function PhysicsCoin({ 
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
  // Physics body for the coin
  const [ref, api] = useCylinder(() => ({
    mass: 1,
    args: [2, 2, 0.3, 16], // radius, radius, height, segments
    position: [0, 3, 0], // Start at a visible position
    material: {
      friction: 0.4,
      restitution: 0.7,
    },
  }));

  const [animationPhase, setAnimationPhase] = useState<'idle' | 'flipping' | 'settling' | 'complete'>('idle');
  const [flipStartTime, setFlipStartTime] = useState(0);
  const [isPhysicsActive, setIsPhysicsActive] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log('🪙 PhysicsCoin render:', { isFlipping, result, animationPhase, isPhysicsActive });
  }, [isFlipping, result, animationPhase, isPhysicsActive]);

  // Initialize physics coin in idle position
  useEffect(() => {
    console.log('🔧 Initializing physics coin', { api: !!api, onRenderReady: !!onRenderReady });
    api.position.set(4, 3, 0); // Start offset so it doesn't overlap with fallback
    api.velocity.set(0, 0, 0);
    api.angularVelocity.set(0, 0, 0);
    api.rotation.set(0, 0, 0);
    setIsPhysicsActive(true);
    
    // Report that 3D coin is ready
    setTimeout(() => {
      console.log('🎮 3D coin physics initialized and ready - calling onRenderReady');
      onRenderReady?.(); // This will trigger the onRenderReady callback
    }, 100);
  }, [api, onRenderReady]);

  // Reset coin position when not flipping
  useEffect(() => {
    if (!isFlipping && animationPhase !== 'idle') {
      console.log('🔄 Resetting coin to idle position');
      setAnimationPhase('idle');
      api.position.set(4, 3, 0); // Keep offset from fallback coin
      api.velocity.set(0, 0, 0);
      api.angularVelocity.set(0, 0, 0);
      api.rotation.set(0, 0, 0);
    }
  }, [isFlipping, animationPhase, api]);

  // Trigger physics flip
  useEffect(() => {
    if (isFlipping && animationPhase === 'idle' && isPhysicsActive) {
      console.log('🚀 Starting coin flip animation');
      setAnimationPhase('flipping');
      setFlipStartTime(Date.now());
      
      // Move to center and apply forces
      api.position.set(0, 3, 0);
      
      // Apply strong upward force and rotation
      api.velocity.set(
        (Math.random() - 0.5) * 2, // Small horizontal movement
        15 + Math.random() * 3,    // Strong upward force
        (Math.random() - 0.5) * 2
      );
      
      api.angularVelocity.set(
        20 + Math.random() * 10,   // Fast X rotation for heads/tails
        5 + Math.random() * 5,     // Some Y rotation
        20 + Math.random() * 10    // Z rotation
      );
    }
  }, [isFlipping, animationPhase, api, isPhysicsActive]);

  // Settle to result when server provides it (external trigger)
  useEffect(() => {
    if (animationPhase === 'flipping' && result) {
      console.log('🎯 3D Coin settling to server result:', result);
        setAnimationPhase('settling');
        
        // Slow down the coin
        api.velocity.set(0, -3, 0);
        
        // Set final rotation based on result
          const finalRotationX = result === 'heads' ? 0 : Math.PI;
          api.rotation.set(finalRotationX, 0, 0);
          console.log(`🎲 Final rotation set: ${result} (${finalRotationX} radians)`);
        
        setTimeout(() => {
        console.log('✅ 3D Animation complete');
          setAnimationPhase('complete');
          onComplete?.();
      }, 3000); // Extended settling time for more suspense
      }
  }, [animationPhase, result, api, onComplete]);

  // Continue flipping animation until result is provided
  useFrame(() => {
    if (animationPhase === 'flipping' && !result) {
      // Keep the coin active and flipping - don't auto-settle
      // The settling will happen when result is provided via useEffect above
    }
  });

  return (
    <group>
      {/* Main Physics-Enabled Coin Group */}
      <group ref={ref}>
        {/* Main Coin Body */}
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[2, 2, 0.3, 32]} />
          <meshStandardMaterial
            color="#e8e8e8"
            metalness={0.9}
            roughness={0.1}
            envMapIntensity={1.5}
          />
        </mesh>

        {/* Coin Edge */}
        <mesh castShadow>
          <cylinderGeometry args={[2.05, 2.05, 0.35, 32]} />
          <meshStandardMaterial
            color="#d4af37"
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>

        {/* Heads Side Design */}
        <mesh position={[0, 0.16, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.8, 32]} />
          <meshStandardMaterial
            color="#f8f9fa"
            metalness={0.2}
            roughness={0.8}
          />
        </mesh>
        
        {/* HEADS Text Ring */}
        <mesh position={[0, 0.17, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.5, 1.5, 32]} />
          <meshStandardMaterial
            color="#ff6b35"
            metalness={0.7}
            roughness={0.3}
          />
        </mesh>

        {/* HEADS Text */}
        <Text
          position={[0, 0.18, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.4}
          color="white"
          anchorX="center"
          anchorY="middle"
          font="/fonts/orbitron-bold.woff2"
        >
          👑 HEADS
        </Text>

        {/* Tails Side Design */}
        <mesh position={[0, -0.16, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.8, 32]} />
          <meshStandardMaterial
            color="#f8f9fa"
            metalness={0.2}
            roughness={0.8}
          />
        </mesh>
        
        {/* TAILS Text Ring */}
        <mesh position={[0, -0.17, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.5, 1.5, 32]} />
          <meshStandardMaterial
            color="#4a90e2"
            metalness={0.7}
            roughness={0.3}
          />
        </mesh>

        {/* TAILS Text */}
        <Text
          position={[0, -0.18, 0]}
          rotation={[Math.PI / 2, 0, Math.PI]}
          fontSize={0.4}
          color="white"
          anchorX="center"
          anchorY="middle"
          font="/fonts/orbitron-bold.woff2"
        >
          🎮 TAILS
        </Text>
      </group>
    </group>
  );
}

// Advanced Particle System
function AdvancedParticles({ active, result }: { active: boolean; result: 'heads' | 'tails' | null }) {
  const particleCount = 200;
  const particles = useRef<THREE.Points>(null);
  
  const particleGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    const color1 = new THREE.Color('#ff6b35');
    const color2 = new THREE.Color('#4a90e2');
    const color3 = new THREE.Color('#ffffff');
    
    for (let i = 0; i < particleCount; i++) {
      // Explosion pattern
      const radius = Math.random() * 3;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = Math.random() * 2;
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
      
      // Random colors
      const colorChoice = Math.random();
      const selectedColor = colorChoice < 0.4 ? color1 : colorChoice < 0.8 ? color2 : color3;
      colors[i * 3] = selectedColor.r;
      colors[i * 3 + 1] = selectedColor.g;
      colors[i * 3 + 2] = selectedColor.b;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    return geometry;
  }, []);

  useFrame((state, delta) => {
    if (!particles.current || !active) return;

    const positionArray = particles.current.geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < particleCount; i++) {
      positionArray[i * 3 + 1] += delta * 2; // Move up
      positionArray[i * 3] += (Math.random() - 0.5) * delta * 0.5; // Drift
      positionArray[i * 3 + 2] += (Math.random() - 0.5) * delta * 0.5; // Drift
    }
    
    particles.current.geometry.attributes.position.needsUpdate = true;
  });

  if (!active) return null;

  return (
    <points ref={particles} geometry={particleGeometry}>
      <pointsMaterial
        size={0.1}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// Ground with Reflections
function Ground() {
  const [ref] = usePlane(() => ({
    rotation: [-Math.PI / 2, 0, 0],
    position: [0, -3, 0],
    material: { friction: 0.8, restitution: 0.3 },
  }));

  return (
    <mesh ref={ref} receiveShadow>
      <planeGeometry args={[20, 20]} />
      <MeshReflectorMaterial
        blur={[300, 100]}
        resolution={2048}
        mixBlur={1}
        mixStrength={50}
        roughness={1}
        depthScale={1.2}
        minDepthThreshold={0.4}
        maxDepthThreshold={1.4}
        color="#050505"
        metalness={0.8}
      />
    </mesh>
  );
}

// Lighting Setup
function LightingRig() {
  return (
    <>
      {/* Key Light */}
      <directionalLight
        position={[10, 10, 5]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-camera-far={50}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
        shadow-bias={-0.0001}
      />
      
      {/* Fill Light */}
      <directionalLight
        position={[-5, 5, -5]}
        intensity={0.5}
        color="#4a90e2"
      />
      
      {/* Rim Light */}
      <directionalLight
        position={[0, 5, -10]}
        intensity={0.8}
        color="#ff6b35"
      />
      
      {/* Ambient */}
      <ambientLight intensity={0.2} />
      
      {/* Accent Lights */}
      <pointLight position={[5, 3, 5]} intensity={0.5} color="#ff6b35" />
      <pointLight position={[-5, 3, 5]} intensity={0.5} color="#4a90e2" />
    </>
  );
}

// Simple 2D Fallback Animation
function SimpleCoinAnimation({ isFlipping, result }: { isFlipping: boolean; result: 'heads' | 'tails' | null }) {
  const [rotations, setRotations] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);

  useEffect(() => {
    if (isFlipping && !isSpinning) {
      setIsSpinning(true);
      setRotations(0);
      
      const spinInterval = setInterval(() => {
        setRotations(prev => prev + 45);
      }, 100);
      
      setTimeout(() => {
        clearInterval(spinInterval);
        setIsSpinning(false);
        // Set final rotation based on result
        const finalRotation = result === 'heads' ? 0 : 180;
        setRotations(finalRotation);
      }, 3000);
      
      return () => clearInterval(spinInterval);
    }
  }, [isFlipping, result, isSpinning]);

  return (
    <div className="flex items-center justify-center h-full">
      <div className="relative">
      <div 
          className="w-32 h-32 rounded-full border-8 border-yellow-400 bg-gradient-to-br from-yellow-300 to-yellow-600 flex flex-col items-center justify-center text-white font-bold shadow-2xl transition-transform duration-100"
        style={{ 
          transform: `rotateY(${rotations}deg) rotateX(${Math.sin(rotations * Math.PI / 180) * 20}deg)`,
            transformStyle: 'preserve-3d',
            background: !isSpinning && result ? 
              (result === 'heads' ? 'linear-gradient(135deg, #ff6b35, #ff8c42)' : 'linear-gradient(135deg, #4a90e2, #357abd)') 
              : 'linear-gradient(135deg, #ffd700, #ffed4e)'
        }}
      >
        {!isSpinning && result ? (
            <>
              <div className="text-2xl">{result === 'heads' ? '👑' : '🎮'}</div>
              <div className="text-xs font-bold mt-1">{result === 'heads' ? 'HEADS' : 'TAILS'}</div>
            </>
          ) : (
            <div className="text-2xl">🪙</div>
          )}
        </div>
        
        {/* Side indicator during flip */}
        {isSpinning && (
          <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs text-white/70">
            👑 HEADS | TAILS 🎮
          </div>
        )}
      </div>
    </div>
  );
}

// Main Component
export default function CoinFlipAnimation({ 
  isFlipping, 
  result, 
  onAnimationComplete,
  onRenderReady
}: CoinFlipAnimationProps) {
  const [showParticles, setShowParticles] = useState(false);
  const [cameraShake, setCameraShake] = useState(false);
  const [use3D, setUse3D] = useState(true);
  const [animationError, setAnimationError] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log('🎬 CoinFlipAnimation props:', { isFlipping, result });
  }, [isFlipping, result]);

  const handleComplete = () => {
    console.log('🎉 Animation complete, showing particles');
    setShowParticles(true);
    setCameraShake(true);
    
    // Stop effects after celebration
    setTimeout(() => {
      setShowParticles(false);
      setCameraShake(false);
    }, 4000);
    
    onAnimationComplete?.();
  };

  // Fallback to 2D animation if 3D fails
  const handle3DError = useCallback(() => {
    console.warn('🚨 3D animation failed, falling back to 2D');
    setAnimationError(true);
    setUse3D(false);
    
    // Call completion handler to prevent freezing
    setTimeout(() => {
      handleComplete();
    }, 3500);
  }, []);

  // Simple 2D fallback completion handler
  useEffect(() => {
    if (!use3D && isFlipping) {
      const timer = setTimeout(() => {
        handleComplete();
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [use3D, isFlipping]);

  // Error boundary effect to catch any unhandled errors
  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      if (event.message.includes('THREE') || event.message.includes('WebGL') || event.message.includes('Canvas')) {
        console.error('🚨 3D animation error detected:', event.error);
        handle3DError();
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason && typeof event.reason === 'object' && 'message' in event.reason) {
        const message = (event.reason as Error).message;
        if (message.includes('THREE') || message.includes('WebGL') || message.includes('Canvas')) {
          console.error('🚨 3D animation promise rejection:', event.reason);
          handle3DError();
        }
      }
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [handle3DError]);

  return (
    <div className="w-full h-[500px] relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      {/* Debug Info */}
      <div className="absolute top-2 left-2 text-xs text-white/50 z-10">
        Flip: {isFlipping ? 'YES' : 'NO'} | Result: {result || 'NONE'} | Mode: {use3D ? '3D' : '2D'}
      </div>
      
      {/* Error Toggle */}
      {animationError && (
        <div className="absolute top-2 right-2 text-xs text-red-400 z-10">
          3D Failed - Using 2D
        </div>
      )}
      
      {use3D ? (
        <Canvas
          shadows
          gl={{ 
            antialias: true, 
            alpha: true,
            powerPreference: 'high-performance',
            stencil: false,
            depth: true
          }}
          camera={{ 
            position: [0, 5, 12], // Better camera angle to see the coin
            fov: 60,
            near: 0.1,
            far: 1000
          }}
          style={{ background: 'transparent' }}
          onCreated={({ gl, scene, camera }) => {
            console.log('🎥 Canvas created, camera position:', camera.position);
            console.log('🎥 Camera looking at origin, coin should be visible at y=3');
            gl.setClearColor(0x000000, 0);
            
            // 🛡️ WebGL Context Loss Protection
            const canvas = gl.domElement;
            canvas.addEventListener('webglcontextlost', (event) => {
              console.warn('🚨 WebGL context lost, falling back to 2D animation');
              event.preventDefault();
              setUse3D(false);
              setAnimationError(true);
            }, false);
            
            canvas.addEventListener('webglcontextrestored', () => {
              console.log('✅ WebGL context restored');
              setUse3D(true);
              setAnimationError(false);
            }, false);
          }}
          onError={handle3DError}
        >
          <Suspense fallback={
            <Html center>
              <div className="text-white text-sm">Loading coin...</div>
            </Html>
          }>
            {/* Physics World */}
            <Physics 
              gravity={[0, -25, 0]} 
              defaultContactMaterial={{ friction: 0.4, restitution: 0.8 }}
            >
              {/* Environment */}
              <Environment preset="city" environmentIntensity={0.6} />
              
              {/* Lighting */}
              <LightingRig />
              
              {/* Ground */}
              <Ground />
              
              {/* Simple Fallback Coin - Always Visible */}
              <mesh position={[0, 3, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[2, 2, 0.3, 32]} />
                <meshStandardMaterial
                  color="#ffd700"
                  metalness={0.8}
                  roughness={0.2}
                />
              </mesh>
              
              {/* 3D Coin with Physics */}
              <PhysicsCoin
                isFlipping={isFlipping}
                result={result}
                onComplete={handleComplete}
                onRenderReady={onRenderReady}
              />
              
              {/* Sparkles for Ambiance */}
              <Sparkles
                count={30}
                scale={[15, 8, 15]}
                size={1.5}
                speed={0.2}
                opacity={0.4}
                color="#ff6b35"
              />
            </Physics>
            
            {/* Particle Effects */}
            <AdvancedParticles active={showParticles} result={result} />
            
            {/* Camera Controls for debugging */}
            <OrbitControls 
              enablePan={false}
              enableZoom={false}
              enableRotate={false}
              target={[0, 2, 0]}
            />
            
            {/* Post Processing */}
            <EffectComposer>
              <Bloom
                intensity={0.3}
                luminanceThreshold={0.9}
                luminanceSmoothing={0.9}
                height={300}
              />
              <ChromaticAberration
                offset={cameraShake ? [0.002, 0.002] : [0.0005, 0.0005]}
              />
              <Vignette
                eskil={false}
                offset={0.1}
                darkness={0.2}
              />
            </EffectComposer>
          </Suspense>
        </Canvas>
      ) : (
        <SimpleCoinAnimation isFlipping={isFlipping} result={result} />
      )}

      {/* Loading Overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-white/20 text-sm font-medium">
          {!isFlipping && !result && "Ready to flip..."}
          {isFlipping && !result && "Flipping..."}
        </div>
      </div>

      {/* Result Overlay */}
      {result && (
        <div className="absolute top-4 left-4 right-4 text-center">
          <div className="bg-black/50 backdrop-blur-sm rounded-lg p-4">
            <h3 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'Orbitron' }}>
              {result === 'heads' ? 'HEADS WINS!' : 'TAILS WINS!'}
            </h3>
            <p className="text-white/80" style={{ fontFamily: 'Rajdhani' }}>
              The coin has landed on {result}
            </p>
          </div>
        </div>
      )}
    </div>
  );
} 