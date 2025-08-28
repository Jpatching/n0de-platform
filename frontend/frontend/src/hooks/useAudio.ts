import { useState, useEffect, useCallback } from 'react';
import useSound from 'use-sound';

interface AudioSettings {
  enabled: boolean;
  volume: number;
}

interface SoundEffects {
  // Tile interaction sounds
  playClick: () => void;
  playGemReveal: () => void;
  
  // Mine explosion sounds  
  playMineExplosion: () => void;
  
  // Multiplier progression sounds
  playCoinWin: () => void;
  
  // Game state sounds
  playRoundStart: () => void;
  playGameWin: () => void;
  playGameLose: () => void;
  
  // Cash out sounds
  playCashOut: () => void;
  playBigWin: () => void;
  
  // Tension building sounds
  playTension: () => void;
}

export const useAudio = (): [SoundEffects, AudioSettings, (settings: Partial<AudioSettings>) => void] => {
  const [settings, setSettings] = useState<AudioSettings>({
    enabled: true,
    volume: 0.7,
  });

  // Load all sound effects using use-sound
  const [playClickSound] = useSound('/sounds/click.mp3', { 
    volume: settings.volume * 0.6,
    soundEnabled: settings.enabled 
  });
  
  const [playGemRevealSound] = useSound('/sounds/gem-reveal.mp3', { 
    volume: settings.volume * 0.8,
    soundEnabled: settings.enabled 
  });
  
  const [playMineExplosionSound] = useSound('/sounds/mine-explosion.mp3', { 
    volume: settings.volume * 0.9,
    soundEnabled: settings.enabled 
  });
  
  const [playCoinWinSound] = useSound('/sounds/coin-win.mp3', { 
    volume: settings.volume * 0.7,
    soundEnabled: settings.enabled 
  });
  
  const [playRoundStartSound] = useSound('/sounds/round-start.mp3', { 
    volume: settings.volume * 0.6,
    soundEnabled: settings.enabled 
  });
  
  const [playGameWinSound] = useSound('/sounds/game-win.mp3', { 
    volume: settings.volume * 0.8,
    soundEnabled: settings.enabled 
  });
  
  const [playGameLoseSound] = useSound('/sounds/game-lose.mp3', { 
    volume: settings.volume * 0.7,
    soundEnabled: settings.enabled 
  });
  
  const [playCashOutSound] = useSound('/sounds/cash-out.mp3', { 
    volume: settings.volume * 0.8,
    soundEnabled: settings.enabled 
  });
  
  const [playBigWinSound] = useSound('https://pv3-game-assets-cdn.patchingjoshua.workers.dev/sounds/big-win.mp3', { 
    volume: settings.volume * 0.9,
    soundEnabled: settings.enabled 
  });
  
  const [playTensionSound] = useSound('/sounds/tension.mp3', { 
    volume: settings.volume * 0.5,
    soundEnabled: settings.enabled,
    interrupt: true // Allow tension to be interrupted
  });

  // Create wrapped functions for better control
  const soundEffects: SoundEffects = {
    playClick: useCallback(() => {
      if (settings.enabled) playClickSound();
    }, [settings.enabled, playClickSound]),
    
    playGemReveal: useCallback(() => {
      if (settings.enabled) playGemRevealSound();
    }, [settings.enabled, playGemRevealSound]),
    
    playMineExplosion: useCallback(() => {
      if (settings.enabled) playMineExplosionSound();
    }, [settings.enabled, playMineExplosionSound]),
    
    playCoinWin: useCallback(() => {
      if (settings.enabled) playCoinWinSound();
    }, [settings.enabled, playCoinWinSound]),
    
    playRoundStart: useCallback(() => {
      if (settings.enabled) playRoundStartSound();
    }, [settings.enabled, playRoundStartSound]),
    
    playGameWin: useCallback(() => {
      if (settings.enabled) playGameWinSound();
    }, [settings.enabled, playGameWinSound]),
    
    playGameLose: useCallback(() => {
      if (settings.enabled) playGameLoseSound();
    }, [settings.enabled, playGameLoseSound]),
    
    playCashOut: useCallback(() => {
      if (settings.enabled) playCashOutSound();
    }, [settings.enabled, playCashOutSound]),
    
    playBigWin: useCallback(() => {
      if (settings.enabled) playBigWinSound();
    }, [settings.enabled, playBigWinSound]),
    
    playTension: useCallback(() => {
      if (settings.enabled) playTensionSound();
    }, [settings.enabled, playTensionSound]),
  };

  const updateSettings = useCallback((newSettings: Partial<AudioSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  // Load user preferences from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('pv3-audio-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(parsed);
      } catch (error) {
        console.warn('Failed to parse audio settings from localStorage');
      }
    }
  }, []);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('pv3-audio-settings', JSON.stringify(settings));
  }, [settings]);

  return [soundEffects, settings, updateSettings];
}; 