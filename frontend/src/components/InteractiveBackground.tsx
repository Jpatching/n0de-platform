"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";

export default function InteractiveBackground() {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    // Preload the image with priority
    const img = new Image();
    img.loading = "eager";
    img.decoding = "async";

    img.onload = () => {
      setImageLoaded(true);
      setImageUrl(img.src);
      // Add image to browser cache by setting it as background
      if (typeof window !== "undefined") {
        document.documentElement.style.setProperty(
          "--preloaded-bg",
          `url('${img.src}')`,
        );
      }
    };

    img.onerror = () => setImageError(true);
    img.src = "/n0de-main-background.png";

    // Clean up
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, []);

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden z-0 pointer-events-none">
      {/* Main Background with Image or Fallback */}
      <motion.div
        className="absolute inset-0 w-full h-full"
        style={{
          backgroundImage:
            imageLoaded && !imageError && imageUrl
              ? `url('${imageUrl}')`
              : undefined,
          backgroundColor: imageError || !imageLoaded ? "#0f0f0f" : undefined,
          backgroundBlendMode: "normal",
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
        }}
        animate={{
          // Subtle Jitter-style morphing without flicker
          backgroundPositionX: ["0px", "20px", "-10px", "0px"],
          backgroundPositionY: ["0px", "15px", "-8px", "0px"],
          scale: [1, 1.02, 0.99, 1],
          opacity: imageLoaded ? [0.85, 0.95, 0.9, 0.85] : 0,
          filter: [
            "contrast(1.05) brightness(1.05) saturate(1)",
            "contrast(1.1) brightness(1.08) saturate(1.05)",
            "contrast(1.02) brightness(1.02) saturate(0.98)",
            "contrast(1.05) brightness(1.05) saturate(1)",
          ],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: [0.25, 0.46, 0.45, 0.94],
          times: [0, 0.3, 0.7, 1],
        }}
      />

      {/* Subtle gradient overlay */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 800px 600px at 30% 40%, rgba(1, 211, 244, 0.04) 0%, transparent 70%),
            radial-gradient(ellipse 600px 600px at 70% 60%, rgba(11, 134, 248, 0.03) 0%, transparent 70%)
          `,
        }}
        animate={{
          opacity: [0.6, 0.8, 0.5, 0.6],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}
