'use client';

import React, { useState } from 'react';
import Image, { ImageProps } from 'next/image';

interface SafeImageProps extends Omit<ImageProps, 'onError'> {
  fallbackSrc?: string;
  fallbackComponent?: React.ReactNode;
}

/**
 * SafeImage component that handles image loading errors gracefully
 * Provides fallback image or component when primary image fails to load
 */
export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt,
  fallbackSrc = '/images/placeholder.png',
  fallbackComponent,
  ...props
}) => {
  const [error, setError] = useState(false);
  const [imgSrc, setImgSrc] = useState(src);

  const handleError = () => {
    if (!error) {
      setError(true);
      if (fallbackSrc && fallbackSrc !== imgSrc) {
        setImgSrc(fallbackSrc);
      }
    }
  };

  // If error occurred and no fallback source, show fallback component
  if (error && !fallbackSrc && fallbackComponent) {
    return <>{fallbackComponent}</>;
  }

  // Default fallback component if nothing else provided
  if (error && !fallbackSrc && !fallbackComponent) {
    return (
      <div 
        className="flex items-center justify-center bg-gray-800 rounded"
        style={{ width: props.width || 100, height: props.height || 100 }}
      >
        <svg
          className="w-1/2 h-1/2 text-gray-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    );
  }

  return (
    <Image
      {...props}
      src={imgSrc}
      alt={alt}
      onError={handleError}
      unoptimized={error} // Disable optimization for fallback images
    />
  );
};

// Memoized version for performance
export const MemoizedSafeImage = React.memo(SafeImage);

export default SafeImage;