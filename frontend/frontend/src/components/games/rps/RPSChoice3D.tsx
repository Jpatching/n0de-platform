'use client';

import React, { useRef, useState, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface RPSChoice3DProps {
  onChoice: (choice: 'rock' | 'paper' | 'scissors') => void;
  selectedChoice?: 'rock' | 'paper' | 'scissors' | null;
  disabled?: boolean;
}

interface Choice3DObjectProps {
  choice: 'rock' | 'paper' | 'scissors';
  position: [number, number, number];
  isSelected: boolean;
  isHovered: boolean;
  onHover: (hovered: boolean) => void;
  onClick: (event?: any) => void;
  disabled?: boolean;
}

// Global click lock to prevent multiple simultaneous clicks
let globalClickLock = false;

// Rock Component - EXACT COPY of Paper pattern
function RockModel({ position, isSelected, isHovered, onHover, onClick, disabled }: Omit<Choice3DObjectProps, 'choice'>) {
  const { nodes, materials } = useGLTF('/models/rps/rock.glb');
  const rockRef = useRef<THREE.Group>(null);
  
  // Debug logging
  console.log('🪨 ROCK DEBUG:', {
    nodes: Object.keys(nodes),
    materials: Object.keys(materials),
    hasRock: !!nodes.Rock,
    hasStone: !!materials.Stone,
    rockGeometry: (nodes.Rock as any)?.geometry,
    rockGeometryType: (nodes.Rock as any)?.geometry?.type,
    rockGeometryAttributes: (nodes.Rock as any)?.geometry ? Object.keys((nodes.Rock as any).geometry.attributes || {}) : 'no geometry',
    stoneColor: (materials.Stone as any)?.color,
    stoneType: materials.Stone?.type
  });

  useFrame((state, delta) => {
    if (rockRef.current) {
      rockRef.current.rotation.y += delta * (isHovered ? 0.5 : 0.25);
      
      // Scale animation for selection
      const targetScale = isSelected ? 1.3 : (isHovered ? 1.1 : 1);
      rockRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 5);
    }
  });



  // Check if required nodes/materials exist before rendering
  if (!nodes.Rock || !materials.Stone) {
    console.error('🚨 ROCK MISSING REQUIRED NODES/MATERIALS:', {
      hasRock: !!nodes.Rock,
      hasStone: !!materials.Stone,
      availableNodes: Object.keys(nodes),
      availableMaterials: Object.keys(materials)
    });
    return (
      <group ref={rockRef} position={position}>
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="red" />
        </mesh>
      </group>
    );
  }

  return (
    <group
      ref={rockRef}
      position={position}
      onPointerOver={() => !disabled && onHover(true)}
      onPointerOut={() => !disabled && onHover(false)}
      onClick={(e) => {
        console.log('🪨 ROCK MODEL CLICKED!');
        e?.stopPropagation?.();
        if (!disabled) {
          console.log('🪨 Rock calling onClick handler');
          onClick(e);
        } else {
          console.log('🪨 Rock click blocked - disabled');
        }
      }}
    >
      <mesh
        geometry={(nodes as any).Rock.geometry}
        scale={690}
        rotation={[-Math.PI / 3, 0, 0]}
      >
        {/* 🔥 BRIGHTENED ROCK MATERIAL - Much more visible! */}
        <meshStandardMaterial 
          color="#E8E8E8"  // Bright light gray instead of dark stone
          metalness={0.1}
          roughness={0.7}
          emissive="#404040"  // Subtle self-illumination
          emissiveIntensity={0.1}
        />
        
        {/* 🌟 SUBTLE GLOW EFFECT - Always visible */}
        <mesh
          geometry={(nodes as any).Rock.geometry}
          scale={695}
          rotation={[-Math.PI / 3, 0, 0]}
        >
          <meshBasicMaterial
            color="#FFFFFF"
            transparent
            opacity={0.15}
            side={THREE.BackSide}
          />
        </mesh>
        
        {/* Selection glow effect */}
        {isSelected && (
          <mesh
            geometry={(nodes as any).Rock.geometry}
            scale={701}
            rotation={[-Math.PI / 3, 0, 0]}
          >
            <meshBasicMaterial
              color="#FFD700"
              transparent
              opacity={0.4}
              side={THREE.BackSide}
            />
          </mesh>
        )}
      </mesh>
      
      {/* Hover outline */}
      {isHovered && !isSelected && (
        <mesh
          geometry={(nodes as any).Rock.geometry}
          scale={699}
          rotation={[-Math.PI / 3, 0, 0]}
        >
          <meshBasicMaterial
            color="#FFFFFF"
            transparent
            opacity={0.3}
            side={THREE.BackSide}
          />
        </mesh>
      )}
    </group>
  );
}

// Paper Component
function PaperModel({ position, isSelected, isHovered, onHover, onClick, disabled }: Omit<Choice3DObjectProps, 'choice'>) {
  const { nodes, materials } = useGLTF('/models/rps/paper.glb');
  const paperRef = useRef<THREE.Group>(null);
  
  // Debug logging for comparison
  console.log('📄 PAPER DEBUG (WORKING):', {
    nodes: Object.keys(nodes),
    materials: Object.keys(materials),
    hasCube: !!nodes.Cube_Cube001,
    hasMaterial: !!materials['Material.000'],
    cubeGeometry: (nodes.Cube_Cube001 as any)?.geometry,
    cubeGeometryType: (nodes.Cube_Cube001 as any)?.geometry?.type,
    cubeGeometryAttributes: (nodes.Cube_Cube001 as any)?.geometry ? Object.keys((nodes.Cube_Cube001 as any).geometry.attributes || {}) : 'no geometry',
    materialColor: (materials['Material.000'] as any)?.color,
    materialType: materials['Material.000']?.type
  });

  useFrame((state, delta) => {
    if (paperRef.current) {
      paperRef.current.rotation.y += delta * (isHovered ? 0.5 : 0.25);
      
      // Scale animation for selection
      const targetScale = isSelected ? 1.3 : (isHovered ? 1.1 : 1);
      paperRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 5);
    }
  });

  return (
    <group
      ref={paperRef}
      position={position}
      onPointerOver={() => !disabled && onHover(true)}
      onPointerOut={() => !disabled && onHover(false)}
      onClick={() => {
        console.log('📄 PAPER MODEL CLICKED!');
        if (!disabled) {
          console.log('📄 Paper calling onClick handler');
          onClick();
        } else {
          console.log('📄 Paper click blocked - disabled');
        }
      }}
    >
      <mesh
        geometry={(nodes as any).Cube_Cube001.geometry}
        material={(materials as any)['Material.000']}
        scale={1.725}
      >
        {/* Selection glow effect */}
        {isSelected && (
          <meshBasicMaterial
            color="#FFD700"
            transparent
            opacity={0.3}
            side={THREE.BackSide}
          />
        )}
      </mesh>
      
      {/* Hover outline */}
      {isHovered && !isSelected && (
        <mesh
          geometry={(nodes as any).Cube_Cube001.geometry}
          scale={1.748}
        >
          <meshBasicMaterial
            color="#FFFFFF"
            transparent
            opacity={0.2}
            side={THREE.BackSide}
          />
        </mesh>
      )}
    </group>
  );
}

// Scissors Component - EXACT COPY of Paper pattern
function ScissorsModel({ position, isSelected, isHovered, onHover, onClick, disabled }: Omit<Choice3DObjectProps, 'choice'>) {
  const { nodes, materials } = useGLTF('/models/rps/scissors.glb');
  const scissorsRef = useRef<THREE.Group>(null);
  
  // Debug logging
  console.log('✂️ SCISSORS DEBUG:', {
    nodes: Object.keys(nodes),
    materials: Object.keys(materials),
    hasScissors1_1: !!nodes.Scissors1_1,
    hasScissors1_2: !!nodes.Scissors1_2,
    hasHandle: !!materials.Handle1Scissors1,
    hasSteel: !!materials.Steel1Scissors1,
    scissors1_1Geometry: (nodes.Scissors1_1 as any)?.geometry,
    scissors1_1GeometryType: (nodes.Scissors1_1 as any)?.geometry?.type,
    scissors1_2Geometry: (nodes.Scissors1_2 as any)?.geometry,
    scissors1_2GeometryType: (nodes.Scissors1_2 as any)?.geometry?.type,
    handleColor: (materials.Handle1Scissors1 as any)?.color,
    steelColor: (materials.Steel1Scissors1 as any)?.color
  });
  


  useFrame((state, delta) => {
    if (scissorsRef.current) {
      scissorsRef.current.rotation.y += delta * (isHovered ? 0.8 : 0.5);
      
      // Scale animation for selection
      const targetScale = isSelected ? 1.3 : (isHovered ? 1.1 : 1);
      scissorsRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 5);
    }
  });

  // Check if required nodes/materials exist before rendering
  if (!nodes.Scissors1_1 || !nodes.Scissors1_2 || !materials.Handle1Scissors1 || !materials.Steel1Scissors1) {
    console.error('🚨 SCISSORS MISSING REQUIRED NODES/MATERIALS:', {
      hasScissors1_1: !!nodes.Scissors1_1,
      hasScissors1_2: !!nodes.Scissors1_2,
      hasHandle: !!materials.Handle1Scissors1,
      hasSteel: !!materials.Steel1Scissors1,
      availableNodes: Object.keys(nodes),
      availableMaterials: Object.keys(materials)
    });
    return (
      <group ref={scissorsRef} position={position}>
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="blue" />
        </mesh>
      </group>
    );
  }

  return (
    <group
      ref={scissorsRef}
      position={position}
      onPointerOver={() => !disabled && onHover(true)}
      onPointerOut={() => !disabled && onHover(false)}
      onClick={(e) => {
        console.log('✂️ SCISSORS MODEL CLICKED!');
        e?.stopPropagation?.();
        if (!disabled) {
          console.log('✂️ Scissors calling onClick handler');
          onClick(e);
        } else {
          console.log('✂️ Scissors click blocked - disabled');
        }
      }}
    >
            <mesh
        geometry={(nodes as any).Scissors1_1.geometry}
        scale={1380}
        rotation={[-Math.PI / 3, 0, 0]}
      >
        {/* 🔥 BRIGHTENED SCISSORS MATERIAL - Chrome/Silver look */}
        <meshStandardMaterial 
          color="#E6E6FA"  // Light lavender-silver instead of dark blue
          metalness={0.9} 
          roughness={0.1}
          emissive="#B0C4DE"  // Light steel blue glow
          emissiveIntensity={0.2}
        />
        
        {/* 🌟 SUBTLE GLOW EFFECT - Always visible */}
        <mesh
          geometry={(nodes as any).Scissors1_1.geometry}
          scale={1386}
          rotation={[-Math.PI / 3, 0, 0]}
        >
          <meshBasicMaterial
            color="#FFFFFF"
            transparent
            opacity={0.15}
            side={THREE.BackSide}
          />
        </mesh>
        
        {/* Selection glow effect */}
        {isSelected && (
          <mesh
            geometry={(nodes as any).Scissors1_1.geometry}
            scale={1391}
            rotation={[-Math.PI / 3, 0, 0]}
          >
            <meshBasicMaterial
              color="#FFD700"
              transparent
              opacity={0.4}
              side={THREE.BackSide}
            />
          </mesh>
        )}
      </mesh>
      
              <mesh
          geometry={(nodes as any).Scissors1_2.geometry}
          scale={1380}
          rotation={[-Math.PI / 3, 0, 0]}
        >
          {/* 🔥 BRIGHTENED SCISSORS MATERIAL - Bright chrome */}
          <meshStandardMaterial 
            color="#F0F8FF"  // Alice blue - very bright and visible
            metalness={0.95} 
            roughness={0.05}
            emissive="#87CEEB"  // Sky blue glow
            emissiveIntensity={0.25}
          />
          
          {/* 🌟 SUBTLE GLOW EFFECT - Always visible */}
          <mesh
            geometry={(nodes as any).Scissors1_2.geometry}
            scale={1386}
            rotation={[-Math.PI / 3, 0, 0]}
          >
            <meshBasicMaterial
              color="#FFFFFF"
              transparent
              opacity={0.15}
              side={THREE.BackSide}
            />
          </mesh>
          
          {/* Selection glow effect */}
          {isSelected && (
            <mesh
              geometry={(nodes as any).Scissors1_2.geometry}
              scale={1391}
              rotation={[-Math.PI / 3, 0, 0]}
            >
              <meshBasicMaterial
                color="#FFD700"
                transparent
                opacity={0.4}
                side={THREE.BackSide}
              />
            </mesh>
          )}
        </mesh>
        
        {/* Hover outline */}
        {isHovered && !isSelected && (
          <>
            <mesh
              geometry={(nodes as any).Scissors1_1.geometry}
              scale={1388}
              rotation={[-Math.PI / 3, 0, 0]}
            >
              <meshBasicMaterial
                color="#FFFFFF"
                transparent
                opacity={0.3}
                side={THREE.BackSide}
              />
            </mesh>
            <mesh
              geometry={(nodes as any).Scissors1_2.geometry}
              scale={1388}
              rotation={[-Math.PI / 3, 0, 0]}
            >
              <meshBasicMaterial
                color="#FFFFFF"
                transparent
                opacity={0.3}
                side={THREE.BackSide}
              />
            </mesh>
          </>
        )}
    </group>
  );
}

// Loading fallback
function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[0, 0, 0]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  );
}

export default function RPSChoice3D({ onChoice, selectedChoice, disabled }: RPSChoice3DProps) {
  const [hoveredChoice, setHoveredChoice] = useState<'rock' | 'paper' | 'scissors' | null>(null);

  // Debug: Component mounting
  console.log('🎮 RPSChoice3D component mounted/rendered', {
    selectedChoice,
    disabled,
    hoveredChoice,
    globalClickLock
  });

  const handleChoice = (choice: 'rock' | 'paper' | 'scissors') => {
    console.log('🎯 handleChoice called with:', choice);
    console.log('🎯 Disabled state:', disabled);
    console.log('🎯 Current selectedChoice:', selectedChoice);
    console.log('🎯 Global click lock:', globalClickLock);
    
    // GLOBAL blocking - prevent any additional clicks
    if (selectedChoice || globalClickLock || disabled) {
      console.log('🎯 Choice BLOCKED:', { selectedChoice, globalClickLock, disabled });
      return;
    }
    
    // Set global lock immediately
    globalClickLock = true;
    
    console.log('🎯 Calling onChoice with:', choice);
    onChoice(choice);
    
    // Release lock after 2 seconds
    setTimeout(() => {
      globalClickLock = false;
      console.log('🎯 Global click lock released');
    }, 2000);
  };

  const getChoicePosition = (choice: 'rock' | 'paper' | 'scissors'): { left: string } => {
    switch (choice) {
      case 'rock': return { left: '20%' };
      case 'paper': return { left: '50%' };
      case 'scissors': return { left: '80%' };
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
        outline: 'none !important',
        boxShadow: 'none !important',
        borderRadius: '0 !important'
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
          background: 'transparent', 
          backgroundColor: 'transparent',
          border: 'none',
          outline: 'none'
        }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.6} />
        <directionalLight
          position={[10, 10, 5]}
          intensity={1.2}
        />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />
        {/* Additional rim lighting for dramatic effect */}
        <pointLight position={[15, 5, 10]} intensity={0.4} color="#87CEEB" />
        <pointLight position={[-15, 5, 10]} intensity={0.4} color="#E6E6FA" />

        {/* 3D Objects - Better spacing that keeps models visible */}
        <Suspense fallback={<LoadingFallback />}>
          <RockModel
            position={[-8, -1.5, 0]}
            isSelected={selectedChoice === 'rock'}
            isHovered={hoveredChoice === 'rock'}
            onHover={(hovered) => setHoveredChoice(hovered ? 'rock' : null)}
            onClick={(e) => {
              console.log('🪨 ROCK Canvas onClick triggered');
              e?.stopPropagation?.();
              if (!selectedChoice && !globalClickLock) {
                console.log('🪨 ROCK: Calling handleChoice("rock")');
                handleChoice('rock');
              } else {
                console.log('🪨 ROCK click ignored - already selected or locked');
              }
            }}
            disabled={disabled}
          />
          
          <PaperModel
            position={[0, -1.5, 0]}
            isSelected={selectedChoice === 'paper'}
            isHovered={hoveredChoice === 'paper'}
            onHover={(hovered) => setHoveredChoice(hovered ? 'paper' : null)}
            onClick={(e) => {
              console.log('📄 PAPER Canvas onClick triggered');
              e?.stopPropagation?.();
              if (!selectedChoice && !globalClickLock) {
                console.log('📄 PAPER: Calling handleChoice("paper")');
                handleChoice('paper');
              } else {
                console.log('📄 PAPER click ignored - already selected or locked');
              }
            }}
            disabled={disabled}
          />
          
          <ScissorsModel
            position={[8, -1.5, 0]}
            isSelected={selectedChoice === 'scissors'}
            isHovered={hoveredChoice === 'scissors'}
            onHover={(hovered) => setHoveredChoice(hovered ? 'scissors' : null)}
            onClick={(e) => {
              console.log('✂️ SCISSORS Canvas onClick triggered');
              e?.stopPropagation?.();
              if (!selectedChoice && !globalClickLock) {
                console.log('✂️ SCISSORS: Calling handleChoice("scissors")');
                handleChoice('scissors');
              } else {
                console.log('✂️ SCISSORS click ignored - already selected or locked');
              }
            }}
            disabled={disabled}
          />
        </Suspense>

        {/* Controls - Disabled rotation to prevent click interference */}
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          enableRotate={false}
          maxPolarAngle={Math.PI / 2}
          minPolarAngle={Math.PI / 3}
        />
      </Canvas>

      {/* HTML Overlays for labels only */}
      {['rock', 'paper', 'scissors'].map((choice) => {
        const typedChoice = choice as 'rock' | 'paper' | 'scissors';
        const position = getChoicePosition(typedChoice);
        return (
          <div 
            key={choice} 
            className="absolute top-0 h-full pointer-events-none" 
            style={{ 
              ...position, 
              background: 'transparent !important', 
              backgroundColor: 'transparent !important',
              backgroundImage: 'none !important',
              border: 'none !important',
              boxShadow: 'none !important'
            }}
          >
            <div 
              className="relative h-full flex flex-col items-center justify-center transform -translate-x-1/2"
              style={{ 
                background: 'transparent !important', 
                backgroundColor: 'transparent !important',
                backgroundImage: 'none !important',
                border: 'none !important',
                boxShadow: 'none !important'
              }}
            >
              {/* Label below 3D model */}
              <div 
                className="absolute -bottom-8 text-center"
                style={{ 
                  background: 'transparent !important', 
                  backgroundColor: 'transparent !important',
                  backgroundImage: 'none !important',
                  border: 'none !important',
                  boxShadow: 'none !important'
                }}
              >
                <p className={`text-lg font-audiowide ${
                  selectedChoice === choice 
                    ? 'text-accent-primary' 
                    : hoveredChoice === choice 
                      ? 'text-white' 
                      : 'text-text-secondary'
                }`}>
                  {choice.toUpperCase()}
                </p>
              </div>
            </div>
          </div>
        );
      })}

      {/* Instruction text overlay */}
      {!selectedChoice && !disabled && (
        <div 
          className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-center"
          style={{ background: 'transparent', backgroundColor: 'transparent' }}
        >
          <p className="text-text-secondary text-sm font-inter">
            {hoveredChoice ? `Click to choose ${hoveredChoice}` : 'Choose your weapon'}
          </p>
        </div>
      )}

      {/* Selected choice confirmation */}
      {selectedChoice && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-center">
          <div className="bg-bg-elevated border border-border rounded-lg px-4 py-2">
            <p className="text-accent-primary font-audiowide text-lg">
              {selectedChoice.toUpperCase()} SELECTED
            </p>
            <p className="text-text-secondary text-sm font-inter">
              Waiting for opponent...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Preload all models
useGLTF.preload('/models/rps/rock.glb');
useGLTF.preload('/models/rps/paper.glb');
useGLTF.preload('/models/rps/scissors.glb'); 