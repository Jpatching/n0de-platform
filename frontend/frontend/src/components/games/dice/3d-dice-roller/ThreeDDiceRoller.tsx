'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import './dice.css';

// Global declarations for the dice roller libraries
declare global {
  interface Window {
    $t: any;
    THREE: any;
    CANNON: any;
  }
}

interface ThreeDDiceRollerProps {
  onRollComplete?: (results: any[]) => void;
  onDiceInitialized?: (initialized: boolean, diceBoxInstance?: any) => void;
  className?: string;
  diceColor?: 'black' | 'white' | 'red' | 'blue' | 'green' | 'orange' | 'purple' | 'brown';
  useShadows?: boolean;
}

export default function ThreeDDiceRoller({
  onRollComplete,
  onDiceInitialized,
  className = "w-full h-64",
  diceColor = 'blue', // PV3 blue theme
  useShadows = true
}: ThreeDDiceRollerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const diceBoxRef = useRef<any>(null);
  const [isInitalized, setIsInitialized] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const hasInitialized = useRef(false); // 🔧 PREVENT MULTIPLE INITIALIZATIONS

  // Load the dice roller libraries
  useEffect(() => {
    if (hasInitialized.current) {
      console.log('🔄 Dice system already initialized, skipping re-initialization...');
      return;
    }
    
    hasInitialized.current = true;
    console.log('🎲 First-time initialization of dice system');
    
    const loadLibraries = async () => {
      try {
        console.log('🎲 Loading 3D dice libraries...');

        // Step 1: Load Three.js from local file (matches working example exactly)
        if (!window.THREE) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = '/libs/three.min.js';
            script.onload = () => resolve();
            script.onerror = (e) => {
              console.error('❌ Failed to load Three.js from local file:', e);
              reject(e);
            };
            document.head.appendChild(script);
          });
        }
        console.log('✅ Three.js loaded successfully');

        // Step 2: Load CANNON.js from local file (matches working example exactly)
        if (!window.CANNON) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = '/libs/cannon.min.js';
            script.onload = () => resolve();
            script.onerror = (e) => {
              console.error('❌ Failed to load CANNON.js from local file:', e);
              reject(e);
            };
            document.head.appendChild(script);
          });
        }
        console.log('✅ CANNON.js loaded successfully');

        // Step 3: Load Teal.js
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = '/teal.js';
          script.onload = () => resolve();
          script.onerror = (e) => {
            console.error('❌ Failed to load Teal.js:', e);
            reject(e);
          };
          document.head.appendChild(script);
        });
        console.log('✅ Teal.js loaded successfully');

        // Step 4: Load Dice.js
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://pv3-game-assets-cdn.patchingjoshua.workers.dev/dice/engine/dice.js';
          script.onload = () => resolve();
          script.onerror = (e) => {
            console.error('❌ Failed to load Dice.js:', e);
            reject(e);
          };
          document.head.appendChild(script);
        });
        console.log('✅ Dice.js loaded successfully');

        // CRITICAL FIX: Patch the dice creation system to handle undefined types
        if (window.$t && window.$t.dice) {
          console.log('🔍 DEBUGGING: $t.dice object:', Object.keys(window.$t.dice));
          console.log('🔍 Has create_d4?', typeof window.$t.dice.create_d4);
          console.log('🔍 Has create_d6?', typeof window.$t.dice.create_d6);
          console.log('🔍 Has dice_box?', typeof window.$t.dice.dice_box);
          
          // CRITICAL PATCH: Fix the create_dice method to handle undefined types
          if (window.$t.dice.dice_box && window.$t.dice.dice_box.prototype) {
            console.log('🔧 PATCHING: dice_box.prototype.create_dice to fix undefined type bug');
            
            // Store the original create_dice method
            const originalCreateDice = window.$t.dice.dice_box.prototype.create_dice;
            
            // Replace with our patched version
            window.$t.dice.dice_box.prototype.create_dice = function(type: string, pos: any, velocity: any, angle: any, axis: any) {
              console.log('🎲 PATCHED create_dice called with type:', type);
              
              // Fix undefined type issue
              if (!type || type === 'undefined') {
                console.log('🔧 FIXING: Converting undefined type to d6');
                type = 'd6'; // Default to d6 when type is undefined
              }
              
              // Ensure type is a valid dice type
              const validTypes = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'];
              if (!validTypes.includes(type)) {
                console.log(`🔧 FIXING: Converting invalid type "${type}" to d6`);
                type = 'd6';
              }
              
              console.log(`🎲 Creating dice with corrected type: ${type}`);
              
              // Try to find the creation function
              const creationFunctionName = 'create_' + type;
              const creationFunction = window.$t.dice[creationFunctionName];
              
              if (typeof creationFunction === 'function') {
                console.log(`✅ Successfully found creation function: ${creationFunctionName}`);
                
                try {
                  const dice = creationFunction.call(window.$t.dice);
                  if (dice) {
                    dice.dice_type = type;
                    dice.body = new window.CANNON.Body({ mass: window.$t.dice.dice_mass[type] || 300 });
                    dice.body.material = window.$t.dice.dice_body_material;
                    dice.body.addShape(new window.CANNON.Sphere(window.$t.dice.scale * 0.9));
                    dice.body.position.set(pos.x, pos.y, pos.z);
                    dice.body.quaternion.setFromAxisAngle(new window.CANNON.Vec3(axis.x, axis.y, axis.z), angle);
                    dice.body.angularVelocity.set(velocity.x, velocity.y, velocity.z);
                    dice.body.velocity.set(velocity.x, velocity.y, velocity.z);
                    
                    this.world.add(dice.body);
                    this.scene.add(dice);
                    this.dices.push(dice);
                    
                    console.log(`🎲 Successfully created ${type} dice with patched method`);
                    return dice;
                  }
                } catch (error) {
                  console.error(`❌ Error creating ${type} dice:`, error);
                }
              } else {
                console.error(`❌ Creation function ${creationFunctionName} not found or not a function:`, typeof creationFunction);
                console.log('Available creation functions:', Object.keys(window.$t.dice).filter(key => key.startsWith('create_')));
              }
              
              // Fallback to original method if our patch fails
              console.log('🔄 Falling back to original create_dice method');
              if (originalCreateDice) {
                return originalCreateDice.call(this, type, pos, velocity, angle, axis);
              }
              
              throw new Error(`Failed to create dice of type: ${type}`);
            };
            
            console.log('✅ Successfully patched dice_box.prototype.create_dice');
          }
        } else {
          console.error('❌ CRITICAL: $t.dice object not found after loading all scripts');
        }

        console.log('🎯 All 3D dice libraries loaded successfully!');
        
        // Give a small delay to ensure everything is properly initialized
        setTimeout(() => {
          initializeDiceBox();
        }, 100);

      } catch (error) {
        console.error('❌ CRITICAL: Failed to load 3D dice libraries:', error);
      }
    };

    loadLibraries();
  }, []);

  const initializeDiceBox = useCallback(() => {
    // Validate all dependencies
    if (!containerRef.current || !canvasRef.current) {
      console.warn('⚠️ Missing DOM references for dice box initialization');
      return;
    }

    if (!window.$t || !window.CANNON || !window.THREE) {
      console.warn('⚠️ Missing required libraries for dice box initialization');
      console.log('Available:', { 
        $t: !!window.$t, 
        CANNON: !!window.CANNON, 
        THREE: !!window.THREE 
      });
      return;
    }

    try {
      console.log('🎲 Initializing 3D dice box with working pattern...');

      // Configure dice settings (exactly like working example)
      const $t = window.$t;
      if (!$t.dice) {
        throw new Error('$t.dice not available');
      }

      // Verify creation functions are available
      console.log('🔧 Verifying dice creation functions...');
      console.log('$t.dice.create_d4:', typeof $t.dice.create_d4);
      console.log('$t.dice properties count:', Object.keys($t.dice).length);
      
      if (typeof $t.dice.create_d4 !== 'function') {
        console.error('❌ CRITICAL: $t.dice.create_d4 is not a function!');
        console.log('Available $t.dice properties:', Object.keys($t.dice));
        throw new Error('Dice creation functions not properly loaded');
      }

      // 🎯 WORKING PATTERN: Set dice configuration exactly like working example
      $t.dice.use_true_random = false; // We'll provide predetermined values
      $t.dice.use_shadows = useShadows;

      // Set dice color theme (exactly like working example)
      switch (diceColor) {
        case 'white':
          $t.dice.dice_color = '#808080';
          $t.dice.label_color = '#202020';
          break;
        case 'red':
          $t.dice.dice_color = '#d10e00';
          $t.dice.label_color = '#202020';
          break;
        case 'blue':
          $t.dice.dice_color = '#1883db';
          $t.dice.label_color = '#202020';
          break;
        case 'green':
          $t.dice.dice_color = '#008a17';
          $t.dice.label_color = '#202020';
          break;
        case 'orange':
          $t.dice.dice_color = '#fc7b03';
          $t.dice.label_color = '#202020';
          break;
        case 'purple':
          $t.dice.dice_color = '#7d0099';
          $t.dice.label_color = '#aaaaaa';
          break;
        case 'brown':
          $t.dice.dice_color = '#593304';
          $t.dice.label_color = '#aaaaaa';
          break;
        default:
          // Default black - safe fallback
          break;
      }

      // CRITICAL: Ensure $t.dice has all required functions before creating dice_box
      if (!window.$t?.dice?.create_d4 || !window.$t?.dice?.create_d6 || !window.$t?.dice?.dice_box) {
        throw new Error('❌ CRITICAL: $t.dice object missing required functions. Cannot proceed with dice_box creation.');
      }

      console.log('✅ All required dice functions confirmed present');
      console.log('🎲 Creating dice_box with proper context...');
      
      // Get container dimensions first
      const containerWidth = containerRef.current.clientWidth || 500;
      const containerHeight = containerRef.current.clientHeight || 300;
      console.log('📐 Canvas dimensions:', { w: containerWidth, h: containerHeight });
      
      // SIZING DEBUG: Ensure canvas has proper dimensions
      if (containerWidth < 100 || containerHeight < 100) {
        console.warn('⚠️ SIZING ISSUE: Canvas dimensions too small:', { w: containerWidth, h: containerHeight });
      }

      // ROOT CAUSE FINAL FIX: The 'that' variable is captured when dice.js loads, not when we inject
      // So even after injection, 'that' still refers to the original context without our functions
      // Solution: Directly patch the create_dice method to handle this
      
      console.log('🔧 EMERGENCY PATCH: Directly patching create_dice method');
      
      // Store functions globally so they're accessible in the patch
      (window as any).__PV3_DICE_FUNCTIONS = {
        create_d4: window.$t.dice.create_d4,
        create_d6: window.$t.dice.create_d6,
        create_d8: window.$t.dice.create_d8,
        create_d10: window.$t.dice.create_d10,
        create_d12: window.$t.dice.create_d12,
        create_d20: window.$t.dice.create_d20,
        create_d100: window.$t.dice.create_d100
      };
      console.log('🔧 Stored functions globally for patch access');
      
      // Store original create_dice method
      const originalDiceBox = window.$t.dice.dice_box;
      
      // Patch it to handle missing functions
      originalDiceBox.prototype.create_dice = function(type: any, pos: any, velocity: any, angle: any, axis: any) {
        console.log('🎲 create_dice called with type:', type);
        console.log('🎲 Type validation - typeof:', typeof type, 'value:', JSON.stringify(type));
        
        // CRITICAL FIX: Handle undefined/invalid dice types FIRST
        if (!type || type === 'undefined' || type === undefined || typeof type !== 'string') {
          console.log('🚨 EMERGENCY: Invalid dice type detected, forcing to d6');
          type = 'd6';
        }
        
        // Additional validation: ensure type is a valid dice type
        const validTypes = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'];
        if (!validTypes.includes(type)) {
          console.log(`🚨 EMERGENCY: Unknown dice type "${type}", forcing to d6`);
          type = 'd6';
        }
        
        console.log('🎲 Final validated type:', type);
        
        // Try to get the creation function from multiple sources
        let createFunc;
        
        // First try the injected functions on $t.dice
        if (window.$t?.dice?.['create_' + type]) {
          createFunc = window.$t.dice['create_' + type];
          console.log('✅ Found create_' + type + ' on $t.dice');
        }
        // Then try the backup functions we injected
        else if ((window as any).__PV3_DICE_FUNCTIONS?.['create_' + type]) {
          createFunc = (window as any).__PV3_DICE_FUNCTIONS['create_' + type];
          console.log('✅ Found create_' + type + ' in global backup functions');
        }
        else {
          console.error('❌ CRITICAL: create_' + type + ' not found anywhere!');
          throw new Error(`Creation function create_${type} not available`);
        }
        
        // Create the dice using the found function
        const dice = createFunc();
        dice.castShadow = true;
        dice.dice_type = type;
        
        // Get dice mass from $t.dice or use defaults
        const diceMass = window.$t?.dice?.dice_mass?.[type] || 300;
        
        dice.body = new window.CANNON.RigidBody(diceMass,
                dice.geometry.cannon_shape, this.dice_body_material);
        dice.body.position.set(pos.x, pos.y, pos.z);
        dice.body.quaternion.setFromAxisAngle(new window.CANNON.Vec3(axis.x, axis.y, axis.z), axis.a * Math.PI * 2);
        dice.body.angularVelocity.set(angle.x, angle.y, angle.z);
        dice.body.velocity.set(velocity.x, velocity.y, velocity.z);
        dice.body.linearDamping = 0.1;
        dice.body.angularDamping = 0.1;
        this.scene.add(dice);
        this.dices.push(dice);
        this.world.add(dice.body);
        
        console.log('✅ Successfully created', type, 'dice with patched method');
      };
      
      // ADDITIONAL PATCH: Fix generate_vectors to prevent undefined types at source
      const originalGenerateVectors = originalDiceBox.prototype.generate_vectors;
      originalDiceBox.prototype.generate_vectors = function(notation: any, vector: any, boost: any) {
        console.log('🎲 generate_vectors called with notation:', notation);
        console.log('🎲 notation.set before processing:', notation?.set);
        
        // Validate and fix notation.set array
        if (!notation || !notation.set || !Array.isArray(notation.set) || notation.set.length === 0) {
          console.log('🚨 EMERGENCY: Invalid notation.set, creating fallback');
          notation = {
            set: ['d6', 'd6'],
            constant: 0,
            result: [],
            error: false
          };
        }
        
        // Clean each dice type in the set
        notation.set = notation.set.map((diceType: any, index: number) => {
          console.log(`🎲 Processing dice type at index ${index}:`, diceType, typeof diceType);
          
          if (!diceType || diceType === 'undefined' || diceType === undefined || typeof diceType !== 'string') {
            console.log(`🚨 EMERGENCY: Invalid dice type at index ${index}: "${diceType}" -> "d6"`);
            return 'd6';
          }
          
          const validTypes = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'];
          if (!validTypes.includes(diceType)) {
            console.log(`🚨 EMERGENCY: Unknown dice type at index ${index}: "${diceType}" -> "d6"`);
            return 'd6';
          }
          
          return diceType;
        });
        
        console.log('🎲 Cleaned notation.set:', notation.set);
        
        // Call original method with cleaned notation
        const vectors = originalGenerateVectors.call(this, notation, vector, boost);
        
        // Final validation: ensure all vectors have valid dice types
        vectors.forEach((vectorItem: any, index: number) => {
          console.log(`🎲 Final vector ${index} dice type:`, vectorItem.set);
          if (!vectorItem.set || vectorItem.set === 'undefined' || vectorItem.set === undefined) {
            console.log(`🚨 CRITICAL: Vector ${index} has invalid dice type, forcing to d6`);
            vectorItem.set = 'd6';
          }
        });
        
        console.log('🎲 Final validated vectors:', vectors.map((v: any) => ({ set: v.set })));
        
        return vectors;
      };
      
      console.log('✅ Both create_dice and generate_vectors methods successfully patched');

      try {
        const diceBox = new window.$t.dice.dice_box(canvasRef.current, {
          w: containerWidth,
          h: containerHeight 
        });
        
        // Store reference to the creation functions for the patch  
        (diceBox as any).creationFunctions = (window as any).__PV3_DICE_FUNCTIONS;
        
        console.log('✅ dice_box created with patched create_dice method');
        diceBox.animate_selector = false; // Match working example
        diceBoxRef.current = diceBox;

        // Handle window resize (like working example)
        const handleResize = () => {
          try {
            if (containerRef.current && canvasRef.current && diceBoxRef.current) {
              const canvas = canvasRef.current;
              const container = containerRef.current;
              const newWidth = container.clientWidth || 500;
              const newHeight = container.clientHeight || 300;
              
              canvas.style.width = (newWidth - 1) + 'px';
              canvas.style.height = (newHeight - 1) + 'px';
              diceBoxRef.current.reinit(canvas, { 
                w: newWidth, 
                h: newHeight 
              });
            }
          } catch (resizeError) {
            console.warn('⚠️ Error during dice box resize:', resizeError);
          }
        };

        window.addEventListener('resize', handleResize);

        // Set up dice rolling callbacks (like working example pattern)
        const beforeRoll = (vectors: any, notation: any, callback: any) => {
          console.log('🎲 Before roll callback');
          setIsRolling(true);
          // Call callback to proceed with roll
          callback();
        };

        const afterRoll = (notation: any, results: number[]) => {
          console.log('🎲 After roll callback with results:', results);
          setIsRolling(false);
          if (onRollComplete) {
            onRollComplete(results);
          }
        };

        const notationGetter = () => {
          return $t.dice.parse_notation('2d6'); // Default for testing
        };

        // Bind mouse events for dice rolling (like working example)
        diceBox.bind_mouse(containerRef.current, notationGetter, beforeRoll, afterRoll);

        setIsInitialized(true);
        if (onDiceInitialized) {
          onDiceInitialized(true, diceBox);
        }

        console.log('🎲 ✅ 3D Dice box initialized successfully with working pattern');

      } catch (error) {
        console.error('❌ CRITICAL: Failed to initialize dice box:', error);
        console.error('Error details:', {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : 'Unknown',
          libraries: {
            $t: !!window.$t,
            CANNON: !!window.CANNON,
            THREE: !!window.THREE
          }
        });
      }
    } catch (outerError) {
      console.error('❌ CRITICAL: Failed to load libraries or initialize dice:', outerError);
    }
  }, [diceColor, useShadows, onDiceInitialized]);

  // Call initializeDiceBox when dependencies change or libraries are loaded
  useEffect(() => {
    if (window.$t && window.CANNON && window.THREE) {
      initializeDiceBox();
    }
  }, [initializeDiceBox]);

  // Expose roll methods to parent components
  useEffect(() => {
    if (containerRef.current && diceBoxRef.current && isInitalized) {
      // Add rollWithValues method
      (containerRef.current as any).rollWithValues = (values?: number[]) => {
        rollDice(values);
      };

      // Add rollWithNotation method for RPG dice systems
      (containerRef.current as any).rollWithNotation = (notation: string) => {
        console.log('🎲 ThreeDDiceRoller.rollWithNotation() called with:', notation);
        return rollDice(notation);
      };

      // Add the complex roll method expected by dice duel
      (containerRef.current as any).roll = (diceArray: any[]) => {
        console.log('🎲 ThreeDDiceRoller.roll() called with:', diceArray);
        
        // CRITICAL FIX: Parse the full dice notation to extract both dice type and values
        const parsedDice: { diceType: string; count: number; value: number }[] = [];
        
        if (Array.isArray(diceArray)) {
          for (const diceConfig of diceArray) {
            if (typeof diceConfig === 'object' && diceConfig.dice) {
              console.log('🎲 Parsing dice notation:', diceConfig.dice);
              
              // Parse notation like "3d4@10" to extract: count=3, type=d4, value=10
              const notationMatch = diceConfig.dice.match(/(\d+)d(\d+)@(\d+)/);
              if (notationMatch) {
                const count = parseInt(notationMatch[1]);
                const diceType = `d${notationMatch[2]}`;
                const value = parseInt(notationMatch[3]);
                
                console.log(`🎲 Parsed: ${count} × ${diceType} = ${value}`);
                
                // Add each individual die
                for (let i = 0; i < count; i++) {
                  parsedDice.push({
                    diceType,
                    count: 1,
                    value: Math.floor(value / count) // Distribute the total value across dice
                  });
                }
              } else {
                // Fallback for simpler notation like "1d6@3"
                const simpleMatch = diceConfig.dice.match(/d(\d+)@(\d+)/);
                if (simpleMatch) {
                  const diceType = `d${simpleMatch[1]}`;
                  const value = parseInt(simpleMatch[2]);
                  
                  console.log(`🎲 Simple parsed: ${diceType} = ${value}`);
                  parsedDice.push({
                    diceType,
                    count: 1,
                    value
                  });
                }
              }
            }
          }
        }
        
        console.log('🎲 Parsed dice configurations:', parsedDice);
        
        // Create the proper notation string for the dice system
        if (parsedDice.length > 0) {
          // Build notation string like "1d4+1d4+1d4" for 3d4
          const notationParts = parsedDice.map(dice => `1${dice.diceType}`);
          const fullNotation = notationParts.join('+');
          const predeterminedValues = parsedDice.map(dice => dice.value);
          
          console.log('🎲 Final notation:', fullNotation);
          console.log('🎲 Predetermined values:', predeterminedValues);
          
          // Call rollDice with the proper notation
          return rollDice({ notation: fullNotation, values: predeterminedValues });
        }
        
        console.log('🎲 No valid dice found, using fallback');
        return rollDice(undefined);
      };
    }
  }, [isInitalized]);

  // Roll dice function using working example pattern
  const rollDice = useCallback((valuesOrNotation?: number[] | string | { notation: string; values: number[] }) => {
    if (!diceBoxRef.current || !window.$t || isRolling) {
      console.warn('⚠️ Cannot roll - dice box not ready or already rolling');
      return Promise.reject('Dice box not ready');
    }

    try {
      console.log('🎲 Rolling dice with values/notation:', valuesOrNotation);
      setIsRolling(true);

      const $t = window.$t;
      let notation: any;
      let predeterminedResults: number[] | undefined;

      if (typeof valuesOrNotation === 'object' && !Array.isArray(valuesOrNotation)) {
        // Handle the new format: { notation: string, values: number[] }
        console.log('🎲 Using complex notation object:', valuesOrNotation);
        console.log('🎲 About to parse notation:', valuesOrNotation.notation);
        
        notation = $t.dice.parse_notation(valuesOrNotation.notation);
        predeterminedResults = valuesOrNotation.values;
        
        console.log('🎲 Raw parsed notation result:', notation);
        console.log('🎲 Notation.set:', notation?.set);
        console.log('🎲 Notation.set length:', notation?.set?.length);
        
        // CRITICAL FIX: Check if parsing failed and manually build notation
        if (!notation || !notation.set || notation.set.length === 0) {
          console.log('🚨 PARSE FAILED! Manually building notation for:', valuesOrNotation.notation);
          
          // Manually build notation for complex dice like "1d4+1d4+1d4"
          const parts = valuesOrNotation.notation.split('+');
          notation = {
            set: [] as string[],
            constant: 0,
            result: [] as number[],
            error: false
          };
          
          for (const part of parts) {
            const match = part.trim().match(/(\d*)d(\d+)/);
            if (match) {
              const count = parseInt(match[1]) || 1;
              const sides = match[2];
              const diceType = `d${sides}`;
              
              for (let i = 0; i < count; i++) {
                notation.set.push(diceType);
              }
              
              console.log(`🔧 Added ${count} × ${diceType} to notation`);
            }
          }
          
          console.log('🔧 Manually built notation:', notation);
        }
        
        console.log('🎲 Final notation for complex object:', notation);
        console.log('🎲 Using predetermined values:', predeterminedResults);
      } else if (typeof valuesOrNotation === 'string') {
        // Handle RPG notation like "2d6", "1d20+5", "3d4"
        console.log('🎲 Parsing RPG notation:', valuesOrNotation);
        
        // Enhanced notation parsing for RPG dice
        notation = $t.dice.parse_notation(valuesOrNotation);
        console.log('🎲 Parsed notation result:', notation);
        
        // CRITICAL FIX: Ensure the parsed notation has proper dice types
        if (notation && notation.set && Array.isArray(notation.set)) {
          console.log('🎲 Notation dice set:', notation.set);
          
          // Validate that each dice type in the set is valid
          notation.set = notation.set.map((diceType: string) => {
            if (!diceType || diceType === 'undefined') {
              console.log('🔧 FIXING: Found undefined dice type, converting to d6');
              return 'd6';
            }
            
            const validTypes = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'];
            if (!validTypes.includes(diceType)) {
              console.log(`🔧 FIXING: Found invalid dice type "${diceType}", converting to d6`);
              return 'd6';
            }
            
            return diceType;
          });
          
          console.log('🎲 Corrected dice set:', notation.set);
        } else {
          console.warn('⚠️ Invalid notation structure, creating fallback');
          notation = { set: ['d6', 'd6'], constant: 0, result: [], error: false };
        }

        // EMERGENCY FIX: If notation still has issues, manually build it
        if (!notation || !notation.set || notation.set.length === 0) {
          console.log('🚨 EMERGENCY: Manually building notation from string:', valuesOrNotation);
          notation = {
            set: [] as string[],
            constant: 0,
            result: [] as number[],
            error: false
          };

          // Parse manually
          const parts = valuesOrNotation.split('+');
          for (const part of parts) {
            const match = part.match(/(\d*)d(\d+)/);
            if (match) {
              const count = parseInt(match[1]) || 1;
              const sides = match[2];
              for (let i = 0; i < count; i++) {
                notation.set.push(`d${sides}`);
              }
            }
          }
          
          console.log('🚨 Emergency built notation:', notation);
        }
      } else if (Array.isArray(valuesOrNotation)) {
        // Handle predetermined values
        predeterminedResults = valuesOrNotation;
        // Create notation for the number of dice we have
        const diceCount = valuesOrNotation.length;
        notation = $t.dice.parse_notation(`${diceCount}d6`);
        console.log('🎲 Using predetermined results:', predeterminedResults);
      } else {
        // Default notation
        notation = $t.dice.parse_notation('2d6');
      }

      // Use the working example throwing pattern
      const vector = { x: 1, y: 1 };
      const boost = 1;
      const dist = { w: 500, h: 300 };

      const beforeRoll = (vectors: any, notationParam: any, callback: any) => {
        console.log('🎲 Before roll - vectors:', vectors);
        console.log('🎲 Before roll - notation:', notationParam);
        
        // CRITICAL FIX: Ensure vectors have proper dice types
        if (vectors && Array.isArray(vectors)) {
          vectors.forEach((vector: any, index: number) => {
            if (vector && vector.set) {
              console.log(`🎲 Vector ${index} dice set:`, vector.set);
              
              // If set is undefined or invalid, fix it
              if (!vector.set || vector.set === 'undefined') {
                console.log(`🔧 FIXING: Vector ${index} has undefined set, using notation data`);
                if (notation && notation.set && notation.set[index]) {
                  vector.set = notation.set[index];
                  console.log(`🔧 Fixed vector ${index} set to:`, vector.set);
                } else {
                  vector.set = 'd6'; // Fallback
                  console.log(`🔧 Fallback: Vector ${index} set to d6`);
                }
              }
            }
          });
        }
        
        // If we have predetermined results, pass them to the callback
        if (predeterminedResults) {
          console.log('🎲 Using predetermined results:', predeterminedResults);
          callback(predeterminedResults);
        } else {
          callback(); // Let the dice roll naturally
        }
      };

      const afterRoll = (notation: any, results: number[]) => {
        console.log('🎲 Dice roll completed with results:', results);
        setIsRolling(false);
        if (onRollComplete) {
          onRollComplete(results);
        }
      };

      // CRITICAL VALIDATION: Ensure notation is properly structured before throwing
      console.log('🔍 FINAL VALIDATION before throw_dices:');
      console.log('🔍 Notation object:', notation);
      console.log('🔍 Notation.set:', notation?.set);
      console.log('🔍 Notation.set contents:', notation?.set?.map((item: any, index: number) => `[${index}] = "${item}" (${typeof item})`));
      
      // Last-ditch safety check
      if (!notation || !notation.set || !Array.isArray(notation.set) || notation.set.length === 0) {
        console.log('🚨 CRITICAL: Invalid notation detected before throwing! Creating emergency fallback.');
        notation = {
          set: ['d6', 'd6'] as string[],
          constant: 0,
          result: [] as number[],
          error: false
        };
        console.log('🚨 Emergency fallback notation:', notation);
      }
      
      // Validate each dice type in the set
      notation.set = notation.set.map((diceType: string, index: number) => {
        if (!diceType || diceType === 'undefined' || typeof diceType !== 'string') {
          console.log(`🚨 FIXING: Invalid dice type at index ${index}: "${diceType}" -> "d6"`);
          return 'd6';
        }
        
        // Ensure dice type is in valid format
        if (!diceType.startsWith('d')) {
          console.log(`🚨 FIXING: Invalid dice format at index ${index}: "${diceType}" -> "d6"`);
          return 'd6';
        }
        
        console.log(`✅ Valid dice type at index ${index}: "${diceType}"`);
        return diceType;
      });
      
      console.log('🔍 VALIDATED notation.set:', notation.set);

      // Throw the dice using working example pattern
      window.$t.dice.throw_dices(
        diceBoxRef.current,
        vector,
        boost,
        dist,
        () => {
          console.log('🎲 Notation getter called, returning:', notation);
          return notation;
        },
        beforeRoll,
        afterRoll
      );

      return Promise.resolve(predeterminedResults || []);

    } catch (error) {
      console.error('❌ Error rolling dice:', error);
      setIsRolling(false);
      return Promise.reject(error);
    }
  }, [isRolling, onRollComplete]);

  return (
    <div className={className} ref={containerRef}>
      <canvas 
        ref={canvasRef} 
        className="w-full h-full"
        style={{ 
          display: 'block',
          border: 'none',
          outline: 'none'
        }}
      />
      
      {/* Loading indicator */}
      {!isInitalized && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 text-white">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
            <div className="text-sm">Loading 3D Physics...</div>
          </div>
        </div>
      )}
      
      {/* Success indicator */}
      {isInitalized && (
        <div className="absolute top-2 right-2 text-green-400 text-xs opacity-50">
          ✅ 3D Physics Ready
        </div>
      )}
      
      {/* Rolling indicator */}
      {isRolling && (
        <div className="absolute top-2 left-2 text-blue-400 text-xs opacity-75">
          🎲 Rolling...
        </div>
      )}
    </div>
  );
} 