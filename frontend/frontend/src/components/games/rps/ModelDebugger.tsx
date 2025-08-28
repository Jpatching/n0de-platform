'use client';

import React, { useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

// Simple test cubes to verify positioning
function TestCubes() {
  return (
    <>
      {/* Red cube where Rock should be */}
      <mesh position={[-3, 0, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="red" />
      </mesh>
      
      {/* Green cube where Paper should be */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="green" />
      </mesh>
      
      {/* Blue cube where Scissors should be */}
      <mesh position={[3, 0, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="blue" />
      </mesh>
    </>
  );
}

// Test Rock model with minimal setup
function TestRock() {
  const { nodes, materials } = useGLTF('/models/rps/rock.glb');
  
  console.log('🧪 TEST ROCK:', {
    hasRock: !!nodes.Rock,
    hasStone: !!materials.Stone,
    rockType: (nodes.Rock as any)?.type,
    stoneType: materials.Stone?.type
  });
  
  if (!nodes.Rock || !materials.Stone) {
    return (
      <mesh position={[-3, 0, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="orange" />
      </mesh>
    );
  }
  
  return (
    <mesh 
      position={[-3, 0, 0]}
      geometry={(nodes.Rock as any).geometry}
      scale={[600, 600, 600]}
    >
      <meshStandardMaterial color="red" />
    </mesh>
  );
}

// Test Paper model (we know this works)
function TestPaper() {
  const { nodes, materials } = useGLTF('/models/rps/paper.glb');
  
  return (
    <mesh 
      position={[0, 0, 0]}
      geometry={(nodes.Cube_Cube001 as any).geometry}
      material={materials['Material.000']}
      scale={1.5}
    />
  );
}

// Test Scissors with minimal setup
function TestScissors() {
  const { nodes, materials } = useGLTF('/models/rps/scissors.glb');
  
  console.log('🧪 TEST SCISSORS:', {
    hasScissors1_1: !!nodes.Scissors1_1,
    hasHandle: !!materials.Handle1Scissors1,
    scissors1_1Type: (nodes.Scissors1_1 as any)?.type,
    handleType: materials.Handle1Scissors1?.type
  });
  
  if (!nodes.Scissors1_1 || !materials.Handle1Scissors1) {
    return (
      <mesh position={[3, 0, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="purple" />
      </mesh>
    );
  }
  
  return (
    <mesh 
      position={[3, 0, 0]}
      geometry={(nodes.Scissors1_1 as any).geometry}
      scale={[1200, 1200, 1200]}
    >
      <meshStandardMaterial color="blue" />
    </mesh>
  );
}

interface ModelDebuggerProps {
  mode: 'cubes' | 'models';
}

export default function ModelDebugger({ mode }: ModelDebuggerProps) {
  return (
    <div className="w-full h-80 relative">
      <Canvas
        camera={{ position: [0, 2, 8], fov: 50 }}
        shadows
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight
          position={[10, 10, 5]}
          intensity={1}
          castShadow
        />
        
        <Suspense fallback={null}>
          {mode === 'cubes' ? (
            <TestCubes />
          ) : (
            <>
              <TestRock />
              <TestPaper />
              <TestScissors />
            </>
          )}
        </Suspense>

        <OrbitControls
          enablePan={false}
          enableZoom={true}
          maxPolarAngle={Math.PI / 2}
          minPolarAngle={Math.PI / 3}
        />
      </Canvas>
      
      <div className="absolute bottom-4 left-4 text-white text-sm">
        Mode: {mode} | Red=Rock, Green=Paper, Blue=Scissors
      </div>
    </div>
  );
}

// Preload all models
useGLTF.preload('/models/rps/rock.glb');
useGLTF.preload('/models/rps/paper.glb');
useGLTF.preload('/models/rps/scissors.glb'); 