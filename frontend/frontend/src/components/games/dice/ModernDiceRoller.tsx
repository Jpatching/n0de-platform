'use client';

import React, { useRef, useEffect, useState } from 'react';

interface ModernDiceRollerProps {
  onRollComplete?: (results: any[]) => void;
  onDiceInitialized?: (initialized: boolean, diceBoxInstance?: any) => void;
  className?: string;
  diceColor?: 'black' | 'white' | 'red' | 'blue' | 'green' | 'orange' | 'purple' | 'brown';
  useShadows?: boolean;
}

export default function ModernDiceRoller({
  onRollComplete,
  onDiceInitialized,
  className = "w-full h-64",
  diceColor = 'blue',
  useShadows = true
}: ModernDiceRollerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const diceBoxRef = useRef<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Convert dice color to theme configuration
  const getDiceTheme = (color: string) => {
    const themes = {
      'white': 'white',
      'red': 'red',
      'blue': 'blue', 
      'green': 'green',
      'orange': 'orange',
      'purple': 'purple',
      'brown': 'wood',
      'black': 'black'
    };
    return themes[color as keyof typeof themes] || 'blue';
  };

  useEffect(() => {
    const initializeDice = async () => {
      if (!containerRef.current || isInitialized) return;

      try {
        console.log('🎲 Initializing 3D dice physics...');
        
        // Dynamic import the dice-box library
        const { DiceBox } = await import('@3d-dice/dice-box');
        
        // Create 3D dice box with physics
        const diceBox = new DiceBox(containerRef.current, {
          // REQUIRED: Asset path for dice models and physics engine
          assetPath: '/assets/dice-box',
          
          // Core settings
          theme: 'default', // Use the default theme we have assets for
          scale: 6,
          gravity: 1,
          mass: 1,
          
          // Physics settings
          friction: 0.8,
          restitution: 0.3,
          angularDamping: 0.4,
          linearDamping: 0.5,
          
          // Animation settings
          spinForce: 6,
          throwForce: 5,
          startingHeight: 8,
          settleTimeout: 4000,
          
          // Performance settings
          delay: 10,
          sounds: false, // We'll handle sounds separately
          
          // Visual settings
          shadows: useShadows,
          enableShadows: useShadows,
          
          // Container settings
          container: containerRef.current
        });

        // Initialize the dice box
        await diceBox.init();
        
        console.log('✅ 3D Dice box initialized successfully!');
        diceBoxRef.current = diceBox;
        setIsInitialized(true);
        setError(null);
        
        // Notify parent component
        if (onDiceInitialized) {
          onDiceInitialized(true, diceBox);
        }

      } catch (error) {
        console.error('❌ Failed to initialize 3D dice:', error);
        setError(error instanceof Error ? error.message : 'Failed to initialize 3D dice');
        
        // Try simpler configuration as fallback
        try {
          console.log('🔄 Trying simplified 3D dice configuration...');
          
          const { DiceBox } = await import('@3d-dice/dice-box');
          
          const simpleDiceBox = new DiceBox(containerRef.current, {
            assetPath: '/assets/dice-box',
            theme: 'default',
            scale: 4,
            sounds: false,
            shadows: false,
            container: containerRef.current
          });
          
          await simpleDiceBox.init();
          
          console.log('✅ Simplified 3D dice initialized!');
          diceBoxRef.current = simpleDiceBox;
          setIsInitialized(true);
          setError(null);
          
          if (onDiceInitialized) {
            onDiceInitialized(true, simpleDiceBox);
          }
          
        } catch (fallbackError) {
          console.error('❌ Fallback 3D dice also failed:', fallbackError);
          setError('3D dice unavailable - check browser compatibility');
          
          // Final fallback: create a working dice system without 3D
          createWorkingFallback();
        }
      }
    };

    initializeDice();

    return () => {
      if (diceBoxRef.current) {
        try {
          diceBoxRef.current.clear?.();
        } catch (error) {
          console.warn('⚠️ Error cleaning up dice box:', error);
        }
      }
    };
  }, [diceColor, useShadows, onDiceInitialized, isInitialized]);

  const createWorkingFallback = () => {
    console.log('🎲 Creating working fallback dice system...');
    
    const fallbackDice = {
      roll: async (notation: string) => {
        console.log('🎲 Fallback rolling:', notation);
        setIsRolling(true);
        
        // Simulate dice roll time
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const results = parseDiceNotation(notation);
        console.log('🎲 Fallback results:', results);
        
        setIsRolling(false);
        
        if (onRollComplete) {
          onRollComplete(results);
        }
        
        return results;
      },
      clear: () => {}
    };
    
    diceBoxRef.current = fallbackDice;
    setIsInitialized(true);
    setError('Using 2D fallback - 3D not available');
    
    if (onDiceInitialized) {
      onDiceInitialized(true, fallbackDice);
    }
  };

  const parseDiceNotation = (notation: string): any[] => {
    console.log('🔍 Parsing dice notation:', notation);
    
    // Handle predetermined values like "3d4@10"
    if (notation.includes('@')) {
      const [diceNotation, totalValue] = notation.split('@');
      const total = parseInt(totalValue);
      
      console.log('🎯 Predetermined roll - notation:', diceNotation, 'total:', total);
      
      const match = diceNotation.match(/(\d+)d(\d+)/);
      if (match) {
        const count = parseInt(match[1]);
        const sides = parseInt(match[2]);
        
        const results = [];
        let remaining = total;
        
        for (let i = 0; i < count; i++) {
          if (i === count - 1) {
            const value = Math.max(1, Math.min(sides, remaining));
            results.push({ value, sides, type: `d${sides}` });
          } else {
            const diceLeft = count - i;
            const minNeeded = diceLeft - 1;
            const maxThisDie = Math.min(sides, remaining - minNeeded);
            const avgPerDie = Math.floor(remaining / diceLeft);
            const value = Math.max(1, Math.min(maxThisDie, avgPerDie));
            results.push({ value, sides, type: `d${sides}` });
            remaining -= value;
          }
        }
        
        return results;
      }
    }
    
    // Handle complex notation like "1d4+1d4+1d4"
    if (notation.includes('+')) {
      const parts = notation.split('+');
      const results: any[] = [];
      
      parts.forEach(part => {
        const match = part.trim().match(/(\d+)d(\d+)/);
        if (match) {
          const count = parseInt(match[1]);
          const sides = parseInt(match[2]);
          
          for (let i = 0; i < count; i++) {
            const value = Math.floor(Math.random() * sides) + 1;
            results.push({ value, sides, type: `d${sides}` });
          }
        }
      });
      
      return results;
    }
    
    // Handle simple notation like "2d6"
    const match = notation.match(/(\d+)d(\d+)/);
    if (match) {
      const count = parseInt(match[1]);
      const sides = parseInt(match[2]);
      
      const results = [];
      for (let i = 0; i < count; i++) {
        const value = Math.floor(Math.random() * sides) + 1;
        results.push({ value, sides, type: `d${sides}` });
      }
      
      return results;
    }
    
    // Fallback: single d6
    const value = Math.floor(Math.random() * 6) + 1;
    return [{ value, sides: 6, type: 'd6' }];
  };

  // Public method to roll dice with 3D physics
  const rollDice = async (notation: string) => {
    if (!diceBoxRef.current || isRolling) {
      console.warn('⚠️ Dice not ready or already rolling');
      return [];
    }

    try {
      console.log('🎲 Rolling 3D dice with notation:', notation);
      setIsRolling(true);
      
      // Use the 3D dice box to roll
      const results = await diceBoxRef.current.roll(notation);
      console.log('🎲 3D dice roll results:', results);
      
      setIsRolling(false);
      
      if (onRollComplete && results) {
        onRollComplete(Array.isArray(results) ? results : [results]);
      }
      
      return results;
    } catch (error) {
      console.error('❌ Error rolling 3D dice:', error);
      setIsRolling(false);
      return [];
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div 
        ref={containerRef}
        className="w-full h-full bg-gradient-to-br from-green-800 to-green-900 rounded-lg overflow-hidden border-2 border-yellow-600/30 relative"
        style={{
          background: 'radial-gradient(ellipse at center, #1f4f3f 0%, #0f2f1f 70%, #0a1f1a 100%)'
        }}
      >
        {/* Dice table texture */}
        <div className="absolute inset-0 opacity-20">
          <div className="w-full h-full bg-gradient-to-br from-green-600/10 to-transparent"></div>
        </div>
        
        {/* Loading state */}
        {!isInitialized && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/20">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-400 mx-auto mb-4"></div>
              <p className="text-xl font-bold">🎲 Loading 3D Dice Physics...</p>
              <p className="text-sm opacity-75 mt-2">Initializing WebGL renderer</p>
            </div>
          </div>
        )}
        
        {/* Error state */}
        {error && isInitialized && (
          <div className="absolute top-4 left-4 bg-red-500/20 text-red-300 px-3 py-2 rounded-lg text-sm border border-red-500/30">
            ⚠️ {error}
          </div>
        )}
        
        {/* Rolling state overlay */}
        {isRolling && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-blue-500/20 text-blue-300 px-6 py-2 rounded-full text-lg font-semibold border border-blue-500/30 z-10">
            🎲 Rolling 3D Dice...
          </div>
        )}
        
        {/* Ready indicator */}
        {isInitialized && !isRolling && !error && (
          <div className="absolute bottom-4 right-4 bg-green-500/20 text-green-300 px-4 py-2 rounded-lg text-sm border border-green-500/30">
            ✅ 3D Physics Ready
          </div>
        )}
        
        {/* Instructions */}
        {isInitialized && !isRolling && (
          <div className="absolute bottom-4 left-4 text-white/60 text-sm">
            🎯 3D dice will appear here when rolling
          </div>
        )}
      </div>
    </div>
  );
}

// Export version with imperative handle for parent components
export const ModernDiceRollerWithRef = React.forwardRef<
  { rollDice: (notation: string) => Promise<any[]>; isReady: boolean; isRolling: boolean },
  ModernDiceRollerProps
>((props, ref) => {
  const [diceInstance, setDiceInstance] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  
  React.useImperativeHandle(ref, () => ({
    rollDice: async (notation: string) => {
      if (diceInstance?.roll) {
        return await diceInstance.roll(notation);
      }
      return [];
    },
    isReady,
    isRolling
  }));
  
  const handleDiceInitialized = (initialized: boolean, instance: any) => {
    setIsReady(initialized);
    setDiceInstance(instance);
    props.onDiceInitialized?.(initialized, instance);
  };
  
  return (
    <ModernDiceRoller 
      {...props} 
      onDiceInitialized={handleDiceInitialized}
    />
  );
});

ModernDiceRollerWithRef.displayName = 'ModernDiceRollerWithRef'; 
ModernDiceRollerWithRef.displayName = 'ModernDiceRollerWithRef'; 