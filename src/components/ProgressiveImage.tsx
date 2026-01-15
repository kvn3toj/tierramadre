/**
 * ProgressiveImage Component
 * Lazy-loading image with Cloudinary optimization, LQIP blur-up, and responsive srcset.
 * Uses Intersection Observer for viewport-aware loading.
 */
import { useState, useEffect, useMemo, useCallback, useId } from 'react';
import { Box, Skeleton, CircularProgress } from '@mui/material';
import { useInView } from 'react-intersection-observer';
import { surfacesLight, surfacesDark } from '../design-system/tokens/colors';
// Logo placeholder for products without images - use Vite asset import
import logoPlaceholder from '../assets/logo-symbol.png';
import { useThemeMode } from '../contexts/ThemeContext';
import {
  getCloudinaryUrl,
  getResponsiveSrcSet,
  getLQIPUrl,
  getImageSizes,
  isCloudinaryUrl,
} from '../utils/cloudinaryImage';
import { createLogger } from '../utils/logger';
import ImageWatermark from './ImageWatermark';

const log = createLogger('ProgressiveImage');

// Retry configuration for failed image loads
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff in ms

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
  /** Quality preset: 'eco' for fast loading, 'good' for balance, 'best' for quality */
  quality?: 'eco' | 'good' | 'best';
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
  quality = 'good',
}: ProgressiveImageProps) {
  const { mode } = useThemeMode();
  const isLight = mode === 'light';
  // Unique ID per component instance to prevent DOM node reuse across different cards
  const instanceId = useId();
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [lqipLoaded, setLqipLoaded] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [imageKey, setImageKey] = useState(0); // Force re-render on retry

  const { ref, inView } = useInView({
    triggerOnce: true,
    rootMargin: '200px', // Start loading 200px before entering viewport
    skip: priority || quality === 'eco', // Skip observer for priority or eco mode
  });

  // For eco mode, always load immediately (rely on native lazy loading)
  const shouldLoad = priority || quality === 'eco' || inView;

  // Map quality preset to Cloudinary quality setting
  const cloudinaryQuality = quality === 'eco' ? 'auto:eco' : quality === 'best' ? 'auto:best' : 'auto:good';

  // Generate optimized URLs
  const { optimizedSrc, srcSet, sizes, lqipSrc } = useMemo(() => {
    if (!src) return { optimizedSrc: '', srcSet: '', sizes: '', lqipSrc: '' };

    const isCloudinary = isCloudinaryUrl(src);

    // For eco quality, use smaller srcset widths for faster loading
    const srcSetWidths = quality === 'eco' ? [200, 300, 400] : [280, 400, 560, 800];

    return {
      optimizedSrc: isCloudinary
        ? getCloudinaryUrl(src, {
            width: width || 400,
            quality: cloudinaryQuality,
            format: 'auto',
            crop: 'fill',
          })
        : src,
      srcSet: isCloudinary ? getResponsiveSrcSet(src, srcSetWidths, cloudinaryQuality) : '',
      sizes: isCloudinary ? getImageSizes(layout) : '',
      // Disable LQIP for eco mode to reduce requests
      lqipSrc: isCloudinary && enableLQIP && quality !== 'eco' ? getLQIPUrl(src) : '',
    };
  }, [src, width, layout, enableLQIP, quality, cloudinaryQuality]);

  /**
   * Retry image loading with exponential backoff
   */
  const retryImageLoad = useCallback((currentRetry: number) => {
    if (currentRetry >= MAX_RETRY_ATTEMPTS) {
      log.error('Image load failed after max retries', { src: optimizedSrc });
      setError(true);
      setIsRetrying(false);
      return;
    }

    const delay = RETRY_DELAYS[currentRetry];
    log.warn(`Retrying image load (${currentRetry + 1}/${MAX_RETRY_ATTEMPTS})`, {
      src: optimizedSrc,
      delay: `${delay}ms`
    });

    setIsRetrying(true);
    setTimeout(() => {
      setRetryCount(currentRetry + 1);
      setImageKey(prev => prev + 1);
      setIsRetrying(false);
    }, delay);
  }, [optimizedSrc]);

  // Reset states when src changes
  useEffect(() => {
    setLoaded(false);
    setError(false);
    setLqipLoaded(false);
    setRetryCount(0);
    setIsRetrying(false);
    setImageKey(0);
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

  // Preload main image with retry logic (skip for eco mode - use native lazy loading)
  useEffect(() => {
    if (!shouldLoad || !optimizedSrc || quality === 'eco') return;

    const img = new Image();

    // Add cache-busting for retries
    const srcWithCacheBust = retryCount > 0
      ? `${optimizedSrc}${optimizedSrc.includes('?') ? '&' : '?'}retry=${retryCount}&t=${Date.now()}`
      : optimizedSrc;

    img.src = srcWithCacheBust;
    if (srcSet) img.srcset = srcSet;

    img.onload = () => {
      log.info('Image preload success', { src: optimizedSrc, attempts: retryCount + 1 });
      setLoaded(true);
      setError(false);
      setRetryCount(0);
    };

    img.onerror = () => {
      log.warn('Image preload failed', { src: optimizedSrc, attempt: retryCount + 1 });
      retryImageLoad(retryCount);
    };

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [optimizedSrc, srcSet, shouldLoad, quality, retryCount, retryImageLoad]);

  const containerStyles = {
    position: 'relative' as const,
    overflow: 'hidden',
    bgcolor: isLight ? surfacesLight.background.secondary : surfacesDark.background.tertiary,
    borderRadius,
    ...(aspectRatio ? { aspectRatio } : { height }),
  };

  // No source provided - show placeholder with watermark
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
            <Box
              component="img"
              src={logoPlaceholder}
              alt=""
              sx={{
                width: '40%',
                maxWidth: 64,
                height: 'auto',
                opacity: 0.28,
                filter: isLight ? 'brightness(0.7)' : 'brightness(0.5)',
              }}
            />
          </Box>
        )}
        {/* Watermark for products without images */}
        <ImageWatermark opacity={0.2} size="medium" />
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

      {/* Skeleton loading state (fallback when no LQIP, skip for eco mode) */}
      {!loaded && !error && !lqipLoaded && quality !== 'eco' && (
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

      {/* Retry loading indicator */}
      {isRetrying && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 10,
          }}
        >
          <CircularProgress
            size={24}
            sx={{ color: isLight ? surfacesLight.text.secondary : surfacesDark.text.secondary }}
          />
        </Box>
      )}

      {/* Actual image with fade-in effect */}
      {shouldLoad && !error && (
        <Box
          component="img"
          src={
            retryCount > 0
              ? `${optimizedSrc}${optimizedSrc.includes('?') ? '&' : '?'}retry=${retryCount}&t=${Date.now()}`
              : optimizedSrc
          }
          key={`img-${instanceId}-${imageKey}`}
          srcSet={srcSet || undefined}
          sizes={sizes || undefined}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          onLoad={() => {
            log.info('Image render success', { src: optimizedSrc, attempts: retryCount + 1 });
            setLoaded(true);
            setError(false);
            setRetryCount(0);
          }}
          onError={() => {
            log.warn('Image render failed', { src: optimizedSrc, attempt: retryCount + 1 });
            retryImageLoad(retryCount);
          }}
          sx={{
            width: '100%',
            height: '100%',
            objectFit,
            // For eco mode, show immediately; for others, fade in after JS preload
            opacity: quality === 'eco' || loaded ? 1 : 0,
            transition: quality === 'eco' ? 'none' : 'opacity 0.3s ease-in-out',
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
          <Box
            component="img"
            src={logoPlaceholder}
            alt=""
            sx={{
              width: '40%',
              maxWidth: 64,
              height: 'auto',
              opacity: 0.28,
              filter: isLight ? 'brightness(0.7)' : 'brightness(0.5)',
            }}
          />
        </Box>
      )}

      {/* Watermark overlay - only visible while loading or on error (not on loaded images) */}
      {(!loaded || error) && <ImageWatermark opacity={0.2} size="medium" />}
    </Box>
  );
}
