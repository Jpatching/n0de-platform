'use client';

import { useEffect, useRef, useState } from 'react';
import ThreeJSDiceRoller from './ThreeJSDiceRoller';

interface DiceBoxWrapperProps {
  onRollComplete?: (results: any) => void;
  onDiceCollide?: () => void;
  onDiceInitialized?: (initialized: boolean, diceBoxInstance?: any) => void;
  className?: string;
}

export default function DiceBoxWrapper({ 
  onRollComplete, 
  onDiceCollide, 
  onDiceInitialized,
  className = "w-full h-64" 
}: DiceBoxWrapperProps) {
  const diceRollerRef = useRef<HTMLDivElement>(null);
  const [diceInitialized, setDiceInitialized] = useState(false);



  // Handle dice roll completion from modern dice roller
  const handleDiceResults = (results: any[]) => {
    console.log('🎲 Modern dice roll completed:', results);
    
    if (onRollComplete) {
      onRollComplete(results);
    }

    // Trigger collision callback for audio/effects
    if (onDiceCollide) {
      onDiceCollide();
    }
  };

  // Store dice instance for API bridge
  const [diceInstance, setDiceInstance] = useState<any>(null);

  // Handle dice initialization and store instance
  const handleDiceInitialized = (initialized: boolean, diceBoxInstance?: any) => {
    console.log('🎲 Modern dice roller initialized:', initialized);
    setDiceInitialized(initialized);
    setDiceInstance(diceBoxInstance);
    if (onDiceInitialized) {
      onDiceInitialized(initialized, diceBoxInstance);
    }
  };

  // Expose roll methods for parent components using new dice system
  useEffect(() => {
    if (diceRollerRef.current && diceInitialized && diceInstance) {
      
      // Add rollWithNotation method for RPG dice systems
      (diceRollerRef.current as any).rollWithNotation = async (notation: string) => {
        console.log('🎲 DiceBoxWrapper.rollWithNotation() called with:', notation);
        if (diceInstance?.roll) {
          return await diceInstance.roll(notation);
        }
        return [];
      };

      // Add the complex roll method expected by dice duel (parse old API format)
      (diceRollerRef.current as any).roll = async (diceArray: any[]) => {
        console.log('🎲 DiceBoxWrapper.roll() called with:', diceArray);
        
        if (!diceInstance?.roll) {
          console.error('❌ Dice instance not available');
          return [];
        }

        // Parse the old API format to extract dice notation
        let notation = '';
        
        if (Array.isArray(diceArray)) {
          const notationParts: string[] = [];
          
          for (const diceConfig of diceArray) {
            if (typeof diceConfig === 'object' && diceConfig.dice) {
              // Extract notation like "1d6@3" or "2d4"
              console.log('🎲 Processing dice config:', diceConfig.dice);
              notationParts.push(diceConfig.dice);
            }
          }
          
          notation = notationParts.join('+');
        }
        
        // Fallback to default if no notation found
        if (!notation) {
          notation = '2d6';
          console.log('🎲 No notation found, using default:', notation);
        }
        
        console.log('🎲 Final notation to roll:', notation);
        
        try {
          const results = await diceInstance.roll(notation);
          console.log('🎲 Dice roll results:', results);
          return results;
        } catch (error) {
          console.error('❌ Error rolling dice:', error);
          return [];
        }
      };

      // Add rollWithValues method for backwards compatibility
      (diceRollerRef.current as any).rollWithValues = async (values?: number[]) => {
        if (!values || values.length === 0) {
          return await (diceRollerRef.current as any).roll([{ dice: '2d6' }]);
        }
        
        // Convert values to predetermined notation
        const notation = values.map((value, index) => `1d6@${value}`).join('+');
        console.log('🎲 Converting values to notation:', values, '->', notation);
        
        if (diceInstance?.roll) {
          return await diceInstance.roll(notation);
        }
        return [];
      };
    }
  }, [diceInitialized, diceInstance]);

  return (
    <div className={className} ref={diceRollerRef}>
      <ThreeJSDiceRoller
        onRollComplete={handleDiceResults}
        onDiceInitialized={handleDiceInitialized}
        className="three-d-dice-container w-full h-full"
        diceColor="blue" // PV3 blue theme
        useShadows={true}
      />
      
      {/* Success indicator */}
      {diceInitialized && (
        <div className="absolute top-2 right-2 text-green-400 text-xs opacity-50">
          ✅ Dice Ready
        </div>
      )}
    </div>
  );
} 