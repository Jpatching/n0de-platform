/**
 * 🚀 PHASE 1 OPTIMIZATION: Audio Sprite System
 * 
 * Combines multiple audio files into single sprites for better performance
 * Reduces HTTP requests and improves audio loading times
 */

import audioSpriteMap from '../../public/sounds/audio-sprite-map.json';

interface AudioSprite {
  start: number;
  duration: number;
}

interface AudioSpriteMap {
  [key: string]: AudioSprite;
}

class AudioSpritePlayer {
  private audio: HTMLAudioElement | null = null;
  private spriteMap: AudioSpriteMap = audioSpriteMap;
  private isLoaded = false;
  private volume = 0.7;
  private enabled = true;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeAudio();
    }
  }

  private async initializeAudio() {
    // Try WebM audio first, fallback to MP3
    const webmSupported = this.canPlayWebM();
    const spritePath = webmSupported 
      ? '/sounds/game-sounds-sprite.webm'
      : '/sounds/game-sounds-sprite.mp3';

    this.audio = new Audio(spritePath);
    this.audio.preload = 'auto';
    this.audio.volume = this.volume;

    // Handle load events
    this.audio.addEventListener('canplaythrough', () => {
      this.isLoaded = true;
      console.log('🎵 Audio sprite loaded successfully');
    });

    this.audio.addEventListener('error', (e) => {
      console.warn('❌ Audio sprite failed to load:', e);
      // Try MP3 fallback if WebM failed
      if (spritePath.includes('.webm')) {
        this.audio!.src = '/sounds/game-sounds-sprite.mp3';
      }
    });
  }

  private canPlayWebM(): boolean {
    const audio = document.createElement('audio');
    return audio.canPlayType('audio/webm; codecs=vorbis') !== '';
  }

  /**
   * Play a specific sound from the sprite
   * @param soundName Name of the sound (e.g., 'click', 'win', 'lose')
   * @param volumeOverride Optional volume override (0-1)
   */
  public play(soundName: string, volumeOverride?: number): void {
    if (!this.enabled || !this.audio || !this.isLoaded) {
      return;
    }

    const sprite = this.spriteMap[soundName];
    if (!sprite) {
      console.warn(`🔊 Sound not found in sprite: ${soundName}`);
      return;
    }

    try {
      // Set volume
      if (volumeOverride !== undefined) {
        this.audio.volume = Math.max(0, Math.min(1, volumeOverride));
      } else {
        this.audio.volume = this.volume;
      }

      // Set playback position and play
      this.audio.currentTime = sprite.start;
      const playPromise = this.audio.play();

      if (playPromise) {
        playPromise.catch(error => {
          console.warn('🔊 Audio playback failed:', error);
        });
      }

      // Stop at the end of the sprite
      setTimeout(() => {
        if (this.audio) {
          this.audio.pause();
        }
      }, sprite.duration * 1000);

    } catch (error) {
      console.warn(`🔊 Error playing sound ${soundName}:`, error);
    }
  }

  /**
   * Set global volume for all sounds
   * @param volume Volume level (0-1)
   */
  public setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.audio) {
      this.audio.volume = this.volume;
    }
  }

  /**
   * Enable or disable all sounds
   * @param enabled Whether sounds should be enabled
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Get list of available sounds
   */
  public getAvailableSounds(): string[] {
    return Object.keys(this.spriteMap);
  }

  /**
   * Preload the audio sprite (call this early in app lifecycle)
   */
  public async preload(): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.isLoaded) {
        resolve(true);
        return;
      }

      if (!this.audio) {
        resolve(false);
        return;
      }

      const handleLoad = () => {
        this.audio!.removeEventListener('canplaythrough', handleLoad);
        this.audio!.removeEventListener('error', handleError);
        resolve(true);
      };

      const handleError = () => {
        this.audio!.removeEventListener('canplaythrough', handleLoad);
        this.audio!.removeEventListener('error', handleError);
        resolve(false);
      };

      this.audio.addEventListener('canplaythrough', handleLoad);
      this.audio.addEventListener('error', handleError);

      // Trigger load
      this.audio.load();
    });
  }
}

// Create singleton instance
export const audioSprite = new AudioSpritePlayer();

// Convenience functions for common game sounds
export const playSound = {
  click: () => audioSprite.play('click', 0.6),
  win: () => audioSprite.play('game-win', 0.8),
  lose: () => audioSprite.play('game-lose', 0.7),
  bigWin: () => audioSprite.play('big-win', 0.9),
  cashOut: () => audioSprite.play('cash-out', 0.8),
  gemReveal: () => audioSprite.play('gem-reveal', 0.8),
  mineExplosion: () => audioSprite.play('mine-explosion', 0.9),
  coinWin: () => audioSprite.play('coin-win', 0.7),
  roundStart: () => audioSprite.play('round-start', 0.6),
  tension: () => audioSprite.play('tension', 0.5),
};

export default audioSprite; 