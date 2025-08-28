'use client';

import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface CoinChoice3DProps {
  side: 'heads' | 'tails';
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onHover: (hovered: boolean) => void;
  disabled?: boolean;
}

function RotatingCoin({ 
  side, 
  isSelected, 
  isHovered 
}: { 
  side: 'heads' | 'tails'; 
  isSelected: boolean; 
  isHovered: boolean; 
}) {
  const coinRef = useRef<THREE.Group>(null);
  
  useFrame((state, delta) => {
    if (!coinRef.current) return;
    
    // Gentle rotation animation
    coinRef.current.rotation.y += delta * 0.5;
    
    // Hover effects
    if (isHovered) {
      coinRef.current.position.y = Math.sin(state.clock.elapsedTime * 3) * 0.1;
      coinRef.current.scale.setScalar(1.1);
    } else {
      coinRef.current.position.y = 0;
      coinRef.current.scale.setScalar(1);
    }
    
    // Selection glow
    if (isSelected) {
      coinRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 2) * 0.1;
    } else {
      coinRef.current.rotation.z = 0;
    }
  });

  const headColor = isSelected ? '#ff6b35' : isHovered ? '#ff8555' : '#ff6b35';
  const tailColor = isSelected ? '#4a90e2' : isHovered ? '#6aa0e8' : '#4a90e2';

  return (
    <group ref={coinRef} position={[0, 0, 0]}>
      {/* Main coin body */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[1.5, 1.5, 0.15, 32]} />
        <meshStandardMaterial 
          color="#ffd700" 
          metalness={0.9} 
          roughness={0.1}
          emissive={isSelected ? '#332200' : '#000000'}
        />
      </mesh>
      
      {/* Heads side */}
      <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.3, 32]} />
        <meshStandardMaterial 
          color={headColor}
          metalness={0.3}
          roughness={0.7}
          emissive={isSelected && side === 'heads' ? '#331100' : '#000000'}
        />
      </mesh>
      
      {/* Tails side */}
      <mesh position={[0, -0.08, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.3, 32]} />
        <meshStandardMaterial 
          color={tailColor}
          metalness={0.3}
          roughness={0.7}
          emissive={isSelected && side === 'tails' ? '#001133' : '#000000'}
        />
      </mesh>
      
      {/* Crown pattern for heads - using geometry */}
      {side === 'heads' && (
        <mesh position={[0, 0.09, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.4, 0.8, 8]} />
          <meshStandardMaterial 
            color={isSelected ? '#ffff88' : '#ffffff'}
            emissive={isSelected ? '#ffff44' : '#000000'}
          />
        </mesh>
      )}
      
      {/* Eagle pattern for tails - using geometry */}
      {side === 'tails' && (
        <mesh position={[0, -0.09, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.3, 0.9, 6]} />
          <meshStandardMaterial 
            color={isSelected ? '#88ddff' : '#ffffff'}
            emissive={isSelected ? '#44aaff' : '#000000'}
          />
        </mesh>
      )}
    </group>
  );
}

export default function CoinChoice3D({
  side,
  isSelected,
  isHovered,
  onClick,
  onHover,
  disabled = false
}: CoinChoice3DProps) {
  return (
    <div 
      className={`
        relative w-40 h-40 cursor-pointer transition-all duration-300
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${isSelected ? 'scale-110' : ''}
        ${isHovered ? 'scale-105' : ''}
      `}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => !disabled && onHover(true)}
      onMouseLeave={() => !disabled && onHover(false)}
    >
      {/* 3D Canvas */}
      <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl overflow-hidden border-2 border-gray-600 shadow-lg">
        <Canvas
          camera={{ position: [0, 2, 4], fov: 50 }}
          gl={{ antialias: true, alpha: true }}
        >
          <ambientLight intensity={0.4} />
          <directionalLight 
            position={[2, 2, 2]} 
            intensity={0.8}
            castShadow
          />
          <pointLight 
            position={[0, 2, 2]} 
            intensity={0.5}
            color={side === 'heads' ? '#ff6b35' : '#4a90e2'}
          />
          
          <RotatingCoin 
            side={side}
            isSelected={isSelected}
            isHovered={isHovered}
          />
        </Canvas>
      </div>
      
      {/* Label with emoji overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-4xl">
          {side === 'heads' ? '👑' : '🦅'}
        </div>
      </div>
      
      {/* Bottom Label */}
      <div className={`
        absolute -bottom-8 left-0 right-0 text-center text-base font-bold
        ${isSelected 
          ? side === 'heads' ? 'text-orange-400' : 'text-blue-400'
          : 'text-gray-400'
        }
        transition-colors duration-300
      `}>
        {side === 'heads' ? '👑 HEADS' : '🦅 TAILS'}
      </div>
      
      {/* Selection glow effect */}
      {isSelected && (
        <div className={`
          absolute inset-0 rounded-xl pointer-events-none
          ${side === 'heads' 
            ? 'shadow-xl shadow-orange-500/50' 
            : 'shadow-xl shadow-blue-500/50'
          }
          animate-pulse
        `} />
      )}
    </div>
  );
} 