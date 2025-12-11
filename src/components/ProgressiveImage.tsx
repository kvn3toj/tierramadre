/**
 * ProgressiveImage Component
 * Lazy-loading image with skeleton placeholder and blur-up effect.
 * Uses Intersection Observer for viewport-aware loading.
 */
import { useState, useEffect } from 'react';
import { Box, Skeleton } from '@mui/material';
import { useInView } from 'react-intersection-observer';
import { Gem } from 'lucide-react';
import { surfacesLight, surfacesDark } from '../design-system/tokens/colors';
import { useThemeMode } from '../contexts/ThemeContext';

interface ProgressiveImageProps {
  src: string | undefined;
  alt: string;
  aspectRatio?: string;
  height?: number | string;
  priority?: boolean;
  showPlaceholderIcon?: boolean;
  objectFit?: 'cover' | 'contain' | 'fill';
  borderRadius?: number;
}

export default function ProgressiveImage({
  src,
  alt,
  aspectRatio,
  height = 140,
  priority = false,
  showPlaceholderIcon = true,
  objectFit = 'cover',
  borderRadius = 0,
}: ProgressiveImageProps) {
  const { mode } = useThemeMode();
  const isLight = mode === 'light';
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const { ref, inView } = useInView({
    triggerOnce: true,
    rootMargin: '100px', // Start loading 100px before entering viewport
    skip: priority, // Load immediately if priority
  });

  const shouldLoad = priority || inView;

  // Reset states when src changes
  useEffect(() => {
    setLoaded(false);
    setError(false);
  }, [src]);

  // Preload image
  useEffect(() => {
    if (!shouldLoad || !src) return;

    const img = new Image();
    img.src = src;
    img.onload = () => setLoaded(true);
    img.onerror = () => setError(true);

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src, shouldLoad]);

  const containerStyles = {
    position: 'relative' as const,
    overflow: 'hidden',
    bgcolor: isLight ? surfacesLight.background.secondary : surfacesDark.background.tertiary,
    borderRadius,
    ...(aspectRatio ? { aspectRatio } : { height }),
  };

  // No source provided - show placeholder
  if (!src) {
    return (
      <Box ref={ref} sx={containerStyles}>
        {showPlaceholderIcon && (
          <Box
            sx={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Gem
              size={32}
              color={isLight ? surfacesLight.text.disabled : surfacesDark.text.disabled}
            />
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box ref={ref} sx={containerStyles}>
      {/* Skeleton loading state */}
      {!loaded && !error && (
        <Skeleton
          variant="rectangular"
          width="100%"
          height="100%"
          animation="wave"
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            bgcolor: isLight ? surfacesLight.background.tertiary : surfacesDark.background.secondary,
          }}
        />
      )}

      {/* Actual image with fade-in effect */}
      {shouldLoad && !error && (
        <Box
          component="img"
          src={src}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          sx={{
            width: '100%',
            height: '100%',
            objectFit,
            opacity: loaded ? 1 : 0,
            transition: 'opacity 0.3s ease-in-out',
          }}
        />
      )}

      {/* Error fallback */}
      {error && showPlaceholderIcon && (
        <Box
          sx={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Gem
            size={32}
            color={isLight ? surfacesLight.text.disabled : surfacesDark.text.disabled}
          />
        </Box>
      )}
    </Box>
  );
}
