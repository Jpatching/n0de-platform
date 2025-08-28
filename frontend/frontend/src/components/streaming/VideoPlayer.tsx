'use client';

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  autoplay?: boolean;
  muted?: boolean;
  controls?: boolean;
  className?: string;
  onLoadStart?: () => void;
  onLoadedData?: () => void;
  onError?: (error: any) => void;
}

export function VideoPlayer({
  src,
  poster,
  autoplay = false,
  muted = true,
  controls = true,
  className = '',
  onLoadStart,
  onLoadedData,
  onError,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qualities, setQualities] = useState<string[]>([]);
  const [currentQuality, setCurrentQuality] = useState<string>('auto');

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    setIsLoading(true);
    setError(null);
    onLoadStart?.();

    // Check if HLS is supported
    if (Hls.isSupported()) {
      // Destroy existing HLS instance
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }

      // Create new HLS instance
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
      });

      hlsRef.current = hls;

      // Load source
      hls.loadSource(src);
      hls.attachMedia(video);

      // Event listeners
      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        console.log('HLS manifest parsed, found', data.levels.length, 'quality levels');
        
        // Extract quality levels
        const availableQualities = data.levels.map((level, index) => {
          const height = level.height || 0;
          if (height >= 720) return '720p';
          if (height >= 480) return '480p';
          if (height >= 360) return '360p';
          return `${height}p`;
        });
        
        setQualities(['auto', ...availableQualities]);
        setIsLoading(false);
        onLoadedData?.();
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS error:', data);
        
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setError('Network error occurred while loading stream');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              setError('Media error occurred');
              hls.recoverMediaError();
              break;
            default:
              setError('Fatal error occurred');
              hls.destroy();
              break;
          }
          onError?.(data);
        }
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
        console.log('Quality switched to level', data.level);
      });

    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      video.src = src;
      video.addEventListener('loadedmetadata', () => {
        setIsLoading(false);
        onLoadedData?.();
      });
      video.addEventListener('error', (e) => {
        setError('Error loading video');
        onError?.(e);
      });
    } else {
      setError('HLS is not supported in this browser');
      onError?.(new Error('HLS not supported'));
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src, onLoadStart, onLoadedData, onError]);

  const handleQualityChange = (quality: string) => {
    if (!hlsRef.current) return;

    setCurrentQuality(quality);

    if (quality === 'auto') {
      hlsRef.current.currentLevel = -1; // Auto quality
    } else {
      // Find the level index for the selected quality
      const levels = hlsRef.current.levels;
      const levelIndex = levels.findIndex(level => {
        const height = level.height || 0;
        if (quality === '720p' && height >= 720) return true;
        if (quality === '480p' && height >= 480 && height < 720) return true;
        if (quality === '360p' && height >= 360 && height < 480) return true;
        return false;
      });

      if (levelIndex !== -1) {
        hlsRef.current.currentLevel = levelIndex;
      }
    }
  };

  return (
    <div className={`relative bg-black rounded-lg overflow-hidden ${className}`}>
      {/* Video Element */}
      <video
        ref={videoRef}
        poster={poster}
        autoPlay={autoplay}
        muted={muted}
        controls={controls}
        playsInline
        className="w-full h-full"
        style={{ aspectRatio: '16/9' }}
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-primary"></div>
            <p className="text-white text-sm">Loading stream...</p>
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
          <div className="text-center text-white p-6">
            <div className="text-red-500 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Stream Error</h3>
            <p className="text-sm text-gray-300">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-accent-primary text-white rounded hover:bg-accent-primary/80 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Quality Selector */}
      {qualities.length > 1 && !isLoading && !error && (
        <div className="absolute top-4 right-4">
          <select
            value={currentQuality}
            onChange={(e) => handleQualityChange(e.target.value)}
            className="bg-black bg-opacity-75 text-white text-sm rounded px-2 py-1 border border-gray-600 focus:outline-none focus:border-accent-primary"
          >
            {qualities.map((quality) => (
              <option key={quality} value={quality}>
                {quality === 'auto' ? 'Auto' : quality}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Live Indicator */}
      <div className="absolute top-4 left-4">
        <div className="flex items-center space-x-2 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-medium">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          <span>LIVE</span>
        </div>
      </div>
    </div>
  );
} 