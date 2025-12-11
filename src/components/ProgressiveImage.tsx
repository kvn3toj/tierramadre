/**
 * ProgressiveImage Component
 * Lazy-loading image with Cloudinary optimization, LQIP blur-up, and responsive srcset.
 * Uses Intersection Observer for viewport-aware loading.
 */
import { useState, useEffect, useMemo } from 'react';
import { Box, Skeleton } from '@mui/material';
import { useInView } from 'react-intersection-observer';
import { Gem } from 'lucide-react';
import { surfacesLight, surfacesDark } from '../design-system/tokens/colors';
import { useThemeMode } from '../contexts/ThemeContext';
import {
  getCloudinaryUrl,
  getResponsiveSrcSet,
  getLQIPUrl,
  getImageSizes,
  isCloudinaryUrl,
} from '../utils/cloudinaryImage';

interface ProgressiveImageProps {
  src: string | undefined;
  alt: string;
  aspectRatio?: string;
  height?: number | string;
  /** Target width for optimization (in pixels) */
  width?: number;
  priority?: boolean;
  showPlaceholderIcon?: boolean;
  objectFit?: 'cover' | 'contain' | 'fill';
  borderRadius?: number;
  /** Layout type for responsive sizes */
  layout?: 'grid' | 'full' | 'thumbnail';
  /** Enable LQIP blur-up effect */
  enableLQIP?: boolean;
}

export default function ProgressiveImage({
  src,
  alt,
  aspectRatio,
  height = 140,
  width,
  priority = false,
  showPlaceholderIcon = true,
  objectFit = 'cover',
  borderRadius = 0,
  layout = 'grid',
  enableLQIP = true,
}: ProgressiveImageProps) {
  const { mode } = useThemeMode();
  const isLight = mode === 'light';
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [lqipLoaded, setLqipLoaded] = useState(false);

  const { ref, inView } = useInView({
    triggerOnce: true,
    rootMargin: '100px', // Start loading 100px before entering viewport
    skip: priority, // Load immediately if priority
  });

  const shouldLoad = priority || inView;

  // Generate optimized URLs
  const { optimizedSrc, srcSet, sizes, lqipSrc } = useMemo(() => {
    if (!src) return { optimizedSrc: '', srcSet: '', sizes: '', lqipSrc: '' };

    const isCloudinary = isCloudinaryUrl(src);

    return {
      optimizedSrc: isCloudinary
        ? getCloudinaryUrl(src, {
            width: width || 400,
            quality: 'auto:good',
            format: 'auto',
            crop: 'fill',
          })
        : src,
      srcSet: isCloudinary ? getResponsiveSrcSet(src) : '',
      sizes: isCloudinary ? getImageSizes(layout) : '',
      lqipSrc: isCloudinary && enableLQIP ? getLQIPUrl(src) : '',
    };
  }, [src, width, layout, enableLQIP]);

  // Reset states when src changes
  useEffect(() => {
    setLoaded(false);
    setError(false);
    setLqipLoaded(false);
  }, [src]);

  // Preload LQIP image
  useEffect(() => {
    if (!lqipSrc || !enableLQIP) return;

    const img = new Image();
    img.src = lqipSrc;
    img.onload = () => setLqipLoaded(true);

    return () => {
      img.onload = null;
    };
  }, [lqipSrc, enableLQIP]);

  // Preload main image
  useEffect(() => {
    if (!shouldLoad || !optimizedSrc) return;

    const img = new Image();
    img.src = optimizedSrc;
    if (srcSet) img.srcset = srcSet;
    img.onload = () => setLoaded(true);
    img.onerror = () => setError(true);

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [optimizedSrc, srcSet, shouldLoad]);

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
      {/* LQIP blur-up placeholder */}
      {enableLQIP && lqipSrc && lqipLoaded && !loaded && (
        <Box
          component="img"
          src={lqipSrc}
          alt=""
          aria-hidden="true"
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit,
            filter: 'blur(20px)',
            transform: 'scale(1.1)', // Prevent blur edge artifacts
            opacity: 1,
            transition: 'opacity 0.3s ease-in-out',
          }}
        />
      )}

      {/* Skeleton loading state (fallback when no LQIP) */}
      {!loaded && !error && !lqipLoaded && (
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
          src={optimizedSrc}
          srcSet={srcSet || undefined}
          sizes={sizes || undefined}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
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
