'use client';

import React, { useState, useEffect, Suspense, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

interface RPSRevealAnimationProps {
  playerChoice: 'rock' | 'paper' | 'scissors';
  opponentChoice: 'rock' | 'paper' | 'scissors';
  winner: 'player' | 'opponent' | 'draw';
  onAnimationComplete: () => void;
}

// ACTUAL GLTF MODELS - Same as main game for perfect consistency
function RockModel({ position }: { position: [number, number, number] }) {
  const { nodes, materials } = useGLTF('/models/rps/rock.glb');
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
  });

  // Fallback if model doesn't load
  if (!nodes.Rock) {
    return (
      <mesh ref={meshRef} position={position} scale={690} rotation={[-Math.PI / 3, 0, 0]}>
        <sphereGeometry args={[0.001, 16, 16]} />
        <meshStandardMaterial color="#E8E8E8" />
      </mesh>
    );
  }

  return (
    <mesh 
      ref={meshRef} 
      geometry={(nodes as any).Rock.geometry}
      position={position} 
      scale={690} 
      rotation={[-Math.PI / 3, 0, 0]}
    >
      <meshStandardMaterial 
        color="#E8E8E8"
        roughness={0.7}
        metalness={0.1}
        emissive="#404040"
        emissiveIntensity={0.1}
      />
      {/* Glow effect */}
      <pointLight position={[0, 0, 0]} intensity={0.3} color="#FFFFFF" distance={2} />
    </mesh>
  );
}

function PaperModel({ position }: { position: [number, number, number] }) {
  const { nodes, materials } = useGLTF('/models/rps/paper.glb');
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.8) * 0.1;
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 1.5) * 0.15;
    }
  });

  // Fallback if model doesn't load
  if (!nodes.Cube_Cube001) {
    return (
      <mesh ref={meshRef} position={position} scale={1.725} rotation={[-Math.PI / 3, 0, 0]}>
        <planeGeometry args={[1, 1.2]} />
        <meshStandardMaterial color="#FFFFFF" side={THREE.DoubleSide} />
      </mesh>
    );
  }

  return (
    <mesh 
      ref={meshRef} 
      geometry={(nodes as any).Cube_Cube001.geometry}
      position={position} 
      scale={1.725} 
      rotation={[-Math.PI / 3, 0, 0]}
    >
      <meshStandardMaterial 
        color="#FFFFFF"
        roughness={0.1}
        metalness={0.0}
        emissive="#F0F0F0"
        emissiveIntensity={0.05}
        side={THREE.DoubleSide}
      />
      {/* Glow effect */}
      <pointLight position={[0, 0, 0]} intensity={0.4} color="#FFFFFF" distance={3} />
    </mesh>
  );
}

function ScissorsModel({ position }: { position: [number, number, number] }) {
  const { nodes, materials } = useGLTF('/models/rps/scissors.glb');
  const meshRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = -Math.PI / 3 + Math.sin(state.clock.elapsedTime * 0.6) * 0.1;
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 1.8) * 0.12;
    }
  });

  // Fallback if model doesn't load
  if (!nodes.Scissors1_1 || !nodes.Scissors1_2) {
    return (
      <group ref={meshRef} position={position} scale={1380} rotation={[-Math.PI / 3, 0, 0]}>
        <mesh position={[-0.0003, 0, 0]} rotation={[0, 0, 0.3]}>
          <boxGeometry args={[0.0008, 0.0002, 0.00005]} />
          <meshStandardMaterial color="#E6E6FA" />
        </mesh>
        <mesh position={[0.0003, 0, 0]} rotation={[0, 0, -0.3]}>
          <boxGeometry args={[0.0008, 0.0002, 0.00005]} />
          <meshStandardMaterial color="#F0F8FF" />
        </mesh>
      </group>
    );
  }

  return (
    <group ref={meshRef} position={position} scale={1380} rotation={[-Math.PI / 3, 0, 0]}>
      {/* Blade 1 */}
      <mesh geometry={(nodes as any).Scissors1_1.geometry}>
        <meshStandardMaterial 
          color="#E6E6FA"
          roughness={0.1}
          metalness={0.9}
          emissive="#B0C4DE"
          emissiveIntensity={0.2}
        />
      </mesh>
      
      {/* Blade 2 */}
      <mesh geometry={(nodes as any).Scissors1_2.geometry}>
        <meshStandardMaterial 
          color="#F0F8FF"
          roughness={0.05}
          metalness={0.95}
          emissive="#87CEEB"
          emissiveIntensity={0.25}
        />
      </mesh>
      
      {/* Glow effect */}
      <pointLight position={[0, 0, 0]} intensity={0.3} color="#E6E6FA" distance={2} />
    </group>
  );
}

// Loading fallback - Made completely transparent
function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[0, 0, 0]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  );
}

// Single Canvas Display - EXACT COPY of working structure
function RevealDisplay({ playerChoice, opponentChoice }: { 
  playerChoice: 'rock' | 'paper' | 'scissors', 
  opponentChoice: 'rock' | 'paper' | 'scissors' 
}) {
  const getModelComponent = (choice: 'rock' | 'paper' | 'scissors', position: [number, number, number]) => {
    switch (choice) {
      case 'rock': return <RockModel position={position} />;
      case 'paper': return <PaperModel position={position} />;
      case 'scissors': return <ScissorsModel position={position} />;
    }
  };
  
  return (
    <div 
      className="w-full h-80 relative"
      style={{ 
        background: 'transparent !important', 
        backgroundColor: 'transparent !important',
        backgroundImage: 'none !important',
        border: 'none !important',
        boxShadow: 'none !important'
      }}
    >
      <Canvas
        camera={{ position: [0, 2, 8], fov: 50 }}
        gl={{ 
          antialias: true, 
          alpha: true,
          premultipliedAlpha: false
        }}
        style={{ 
          background: 'transparent !important', 
          backgroundColor: 'transparent !important',
          backgroundImage: 'none !important',
          border: 'none !important',
          outline: 'none !important',
          boxShadow: 'none !important'
        }}
      >
        {/* Enhanced lighting without shadows */}
        <ambientLight intensity={0.6} />
        <directionalLight
          position={[10, 10, 5]}
          intensity={1.2}
        />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />
        <pointLight position={[15, 5, 10]} intensity={0.4} color="#87CEEB" />
        <pointLight position={[-15, 5, 10]} intensity={0.4} color="#E6E6FA" />

        {/* 3D Objects - positioned like working version */}
        <Suspense fallback={<LoadingFallback />}>
          {/* Player choice on left */}
          {getModelComponent(playerChoice, [-6, -1.5, 0])}
          
          {/* Opponent choice on right */}
          {getModelComponent(opponentChoice, [6, -1.5, 0])}
        </Suspense>

        {/* Controls - EXACT copy from working version */}
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          maxPolarAngle={Math.PI / 2}
          minPolarAngle={Math.PI / 3}
        />
      </Canvas>
      
      {/* Labels */}
      <div 
        className="absolute top-4 left-1/4 transform -translate-x-1/2 text-center"
        style={{ 
          background: 'transparent !important', 
          backgroundColor: 'transparent !important'
        }}
      >
        <p className="text-blue-300 font-bold">{playerChoice.toUpperCase()}</p>
      </div>
      <div 
        className="absolute top-4 right-1/4 transform translate-x-1/2 text-center"
        style={{ 
          background: 'transparent !important', 
          backgroundColor: 'transparent !important'
        }}
      >
        <p className="text-red-300 font-bold">{opponentChoice.toUpperCase()}</p>
      </div>
    </div>
  );
}

const choiceNames = {
  rock: 'Rock',
  paper: 'Paper',
  scissors: 'Scissors'
};

export default function RPSRevealAnimation({ 
  playerChoice, 
  opponentChoice, 
  winner, 
  onAnimationComplete 
}: RPSRevealAnimationProps) {
  const [phase, setPhase] = useState<'countdown' | 'reveal' | 'result'>('countdown');
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          setPhase('reveal');
          return 0;
        }
        return prev - 1;
      });
    }, 800);

    return () => clearInterval(countdownInterval);
  }, []);

  useEffect(() => {
    if (phase === 'reveal') {
      const timer = setTimeout(() => {
        setPhase('result');
      }, 4000); // Back to normal timing
      return () => clearTimeout(timer);
    }
  }, [phase]);

  useEffect(() => {
    if (phase === 'result') {
      const timer = setTimeout(() => {
        onAnimationComplete();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [phase, onAnimationComplete]);

  const getResultColor = () => {
    if (winner === 'player') return 'text-green-400';
    if (winner === 'opponent') return 'text-red-400';
    return 'text-yellow-400';
  };

  const getResultText = () => {
    if (winner === 'player') return 'You Win!';
    if (winner === 'opponent') return 'You Lose!';
    return "It's a Draw!";
  };

  const getBattleResult = () => {
    if (winner === 'draw') return 'Draw!';
    const winningChoice = winner === 'player' ? playerChoice : opponentChoice;
    const losingChoice = winner === 'player' ? opponentChoice : playerChoice;
    
    if (winningChoice === 'rock' && losingChoice === 'scissors') return 'Rock crushes Scissors!';
    if (winningChoice === 'paper' && losingChoice === 'rock') return 'Paper covers Rock!';
    if (winningChoice === 'scissors' && losingChoice === 'paper') return 'Scissors cuts Paper!';
    return '';
  };

  return (
    <div 
      className="w-full min-h-[600px] flex items-center justify-center"
      style={{ 
        background: 'transparent !important', 
        backgroundColor: 'transparent !important',
        backgroundImage: 'none !important',
        border: 'none !important',
        boxShadow: 'none !important'
      }}
    >
      <AnimatePresence mode="wait">
        {/* Countdown Phase */}
        {phase === 'countdown' && (
          <motion.div
            key="countdown"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="text-center w-full"
            style={{ 
              background: 'transparent !important', 
              backgroundColor: 'transparent !important'
            }}
          >
            <motion.div
              key={countdown}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              className="text-8xl font-bold text-white mb-8"
              style={{ 
                background: 'transparent !important', 
                backgroundColor: 'transparent !important'
              }}
            >
              {countdown}
            </motion.div>
            <div 
              className="text-2xl text-gray-300"
              style={{ 
                background: 'transparent !important', 
                backgroundColor: 'transparent !important'
              }}
            >
              Get ready to reveal...
            </div>
          </motion.div>
        )}

        {/* Reveal Phase */}
        {phase === 'reveal' && (
          <motion.div
            key="reveal"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="w-full max-w-6xl mx-auto"
            style={{ 
              background: 'transparent !important', 
              backgroundColor: 'transparent !important'
            }}
          >
            <motion.div 
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-4xl text-purple-200 mb-8 text-center"
              style={{ 
                background: 'transparent !important', 
                backgroundColor: 'transparent !important'
              }}
            >
              🎭 Round Reveal! 🎭
            </motion.div>
            
            {/* Single Canvas with both models */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              style={{ 
                background: 'transparent !important', 
                backgroundColor: 'transparent !important'
              }}
            >
              <RevealDisplay playerChoice={playerChoice} opponentChoice={opponentChoice} />
            </motion.div>
          </motion.div>
        )}

        {/* Result Phase */}
        {phase === 'result' && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-center w-full"
            style={{ 
              background: 'transparent !important', 
              backgroundColor: 'transparent !important'
            }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
              className={`text-5xl font-bold mb-6 ${getResultColor()}`}
              style={{ 
                background: 'transparent !important', 
                backgroundColor: 'transparent !important'
              }}
            >
              {getResultText()}
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-2xl text-purple-200 mb-8"
              style={{ 
                background: 'transparent !important', 
                backgroundColor: 'transparent !important'
              }}
            >
              {getBattleResult()}
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="flex items-center justify-center gap-6 text-lg text-purple-300"
              style={{ 
                background: 'transparent !important', 
                backgroundColor: 'transparent !important'
              }}
            >
              <span>You: {choiceNames[playerChoice]}</span>
              <span>•</span>
              <span>Opponent: {choiceNames[opponentChoice]}</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// CRITICAL: Preload all models - EXACT COPY from working version
useGLTF.preload('/models/rps/rock.glb');
useGLTF.preload('/models/rps/paper.glb');
useGLTF.preload('/models/rps/scissors.glb');

// Compact 3D Result Display for result screens
function CompactResultDisplay({ playerChoice, opponentChoice }: { 
  playerChoice: 'rock' | 'paper' | 'scissors', 
  opponentChoice: 'rock' | 'paper' | 'scissors' 
}) {
  const getModelComponent = (choice: 'rock' | 'paper' | 'scissors', position: [number, number, number]) => {
    switch (choice) {
      case 'rock': return <RockModel position={position} />;
      case 'paper': return <PaperModel position={position} />;
      case 'scissors': return <ScissorsModel position={position} />;
    }
  };
  
  return (
    <div 
      className="w-full h-32 relative"
      style={{ 
        background: 'transparent !important', 
        backgroundColor: 'transparent !important',
        backgroundImage: 'none !important',
        border: 'none !important',
        boxShadow: 'none !important'
      }}
    >
      <Canvas
        camera={{ position: [0, 1, 4], fov: 50 }}
        gl={{ 
          antialias: true, 
          alpha: true,
          premultipliedAlpha: false
        }}
        style={{ 
          background: 'transparent !important', 
          backgroundColor: 'transparent !important',
          backgroundImage: 'none !important',
          border: 'none !important',
          outline: 'none !important',
          boxShadow: 'none !important'
        }}
      >
        {/* Simplified lighting for compact display */}
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 5, 3]} intensity={1.0} />
        <pointLight position={[0, 2, 2]} intensity={0.3} color="#FFFFFF" />

        {/* 3D Objects - closer together for compact view */}
        <Suspense fallback={<LoadingFallback />}>
          {/* Player choice on left */}
          {getModelComponent(playerChoice, [-3, -1.5, 0])}
          
          {/* Opponent choice on right */}
          {getModelComponent(opponentChoice, [3, -1.5, 0])}
        </Suspense>
      </Canvas>
    </div>
  );
}

// Export the compact display for use in result screens
export { CompactResultDisplay };