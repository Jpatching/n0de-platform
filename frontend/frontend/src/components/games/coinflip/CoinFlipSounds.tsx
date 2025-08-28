'use client';

import { useEffect, useRef, useCallback } from 'react';

// 🎵 GAMBLING PSYCHOLOGY SOUND DESIGN
export type SoundEffect = 
  | 'coin_flip'           // Metallic coin spinning sound
  | 'coin_land'           // Satisfying coin landing thud
  | 'choice_select'       // Subtle click for choice selection
  | 'round_win'           // Positive reinforcement chime
  | 'round_lose'          // Neutral, non-punishing tone
  | 'match_win'           // Triumphant celebration sound
  | 'match_lose'          // Gentle, encouraging tone
  | 'payout'              // Cash register/coins dropping
  | 'streak_bonus'        // Special sound for win streaks
  | 'near_miss'           // Tension sound for close calls
  | 'countdown'           // Subtle countdown tick
  | 'notification'        // Soft notification ping
  | 'hover'               // Micro-interaction feedback
  | 'error'               // Gentle error tone

interface CoinFlipSoundsProps {
  isFlipping: boolean;
  result: 'heads' | 'tails' | null;
}

export default function CoinFlipSounds({ isFlipping, result }: CoinFlipSoundsProps) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    // Initialize audio context on first interaction
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }, []);

  const createRealisticCoinSound = () => {
    if (!audioContextRef.current || isPlayingRef.current) return;
    
    const ctx = audioContextRef.current;
    isPlayingRef.current = true;

    // Resume audio context if suspended
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    // Create multiple oscillators for complex metallic sound
    const oscillators: OscillatorNode[] = [];
    const gainNodes: GainNode[] = [];
    
    // Primary spinning frequencies with realistic metallic resonance
    const frequencies = [1200, 2400, 800, 1600, 3200];
    const duration = 4.5; // Match the 3D animation duration
    
    frequencies.forEach((baseFreq, index) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const filterNode = ctx.createBiquadFilter();
      
      // Configure filter for metallic tone
      filterNode.type = 'bandpass';
      filterNode.frequency.value = baseFreq;
      filterNode.Q.value = 15;
      
      oscillator.type = index < 2 ? 'sine' : 'triangle';
      oscillator.frequency.value = baseFreq;
      
      // Modulate frequency for spinning effect with deceleration
      oscillator.frequency.setValueAtTime(baseFreq, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(baseFreq * 0.3, ctx.currentTime + duration * 0.8);
      oscillator.frequency.setValueAtTime(baseFreq * 0.3, ctx.currentTime + duration * 0.8);
      
      // Volume envelope with realistic decay
      const initialGain = 0.15 / frequencies.length * (index === 0 ? 2 : 1);
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(initialGain, ctx.currentTime + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(initialGain * 0.3, ctx.currentTime + duration * 0.6);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      
      // Connect audio graph
      oscillator.connect(filterNode);
      filterNode.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillators.push(oscillator);
      gainNodes.push(gainNode);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    });

    // Add air turbulence/whoosh effect
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = (Math.random() * 2 - 1) * 0.1;
    }
    
    const noiseSource = ctx.createBufferSource();
    const noiseGain = ctx.createGain();
    const noiseFilter = ctx.createBiquadFilter();
    
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 2000;
    
    noiseSource.buffer = noiseBuffer;
    noiseGain.gain.setValueAtTime(0, ctx.currentTime);
    noiseGain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.5);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    
    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    
    noiseSource.start(ctx.currentTime);
    noiseSource.stop(ctx.currentTime + duration);

    // Landing sound after physics settle (at 6 seconds total)
    setTimeout(() => {
      createLandingSound();
    }, 6000);
  };

  const createLandingSound = () => {
    if (!audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    
    // Impact sound
    const impactOsc = ctx.createOscillator();
    const impactGain = ctx.createGain();
    const impactFilter = ctx.createBiquadFilter();
    
    impactFilter.type = 'lowpass';
    impactFilter.frequency.value = 400;
    
    impactOsc.type = 'square';
    impactOsc.frequency.value = 80;
    
    impactGain.gain.setValueAtTime(0.2, ctx.currentTime);
    impactGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    
    impactOsc.connect(impactFilter);
    impactFilter.connect(impactGain);
    impactGain.connect(ctx.destination);
    
    impactOsc.start(ctx.currentTime);
    impactOsc.stop(ctx.currentTime + 0.3);
    
    // Metallic ring after impact
    setTimeout(() => {
      const ringOsc = ctx.createOscillator();
      const ringGain = ctx.createGain();
      
      ringOsc.type = 'sine';
      ringOsc.frequency.value = 2400;
      
      ringGain.gain.setValueAtTime(0.1, ctx.currentTime);
      ringGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
      
      ringOsc.connect(ringGain);
      ringGain.connect(ctx.destination);
      
      ringOsc.start(ctx.currentTime);
      ringOsc.stop(ctx.currentTime + 1.5);
      
      // Multiple small bounces
      [0.2, 0.35, 0.45].forEach((delay, index) => {
        setTimeout(() => {
          const bounceOsc = ctx.createOscillator();
          const bounceGain = ctx.createGain();
          
          bounceOsc.type = 'sine';
          bounceOsc.frequency.value = 1800 - (index * 200);
          
          const volume = 0.05 * (1 - index * 0.3);
          bounceGain.gain.setValueAtTime(volume, ctx.currentTime);
          bounceGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
          
          bounceOsc.connect(bounceGain);
          bounceGain.connect(ctx.destination);
          
          bounceOsc.start(ctx.currentTime);
          bounceOsc.stop(ctx.currentTime + 0.2);
        }, delay * 1000);
      });
      
      // Reset playing flag after all sounds complete
      setTimeout(() => {
        isPlayingRef.current = false;
      }, 2000);
      
    }, 100);
  };

  useEffect(() => {
    if (isFlipping && !isPlayingRef.current) {
      createRealisticCoinSound();
    }
  }, [isFlipping]);

  return null;
}

// 🎵 HOOK FOR EASY SOUND USAGE
export function useCoinFlipSounds() {
  const playSound = useCallback((soundType: SoundEffect, volume: number = 1) => {
    if ((window as any).playPV3Sound) {
      (window as any).playPV3Sound(soundType, volume);
    }
  }, []);

  return { playSound };
} 