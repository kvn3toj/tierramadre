/**
 * ProgressiveImage Component
 * Lazy-loading image with Cloudinary optimization, LQIP blur-up, and responsive srcset.
 * Uses Intersection Observer for viewport-aware loading.
 */
import { useState, useEffect, useMemo, useCallback, useId } from 'react';
import { Box, Skeleton } from '@mui/material';
import { useInView } from 'react-intersection-observer';
import { surfacesLight, surfacesDark } from '../../design-system/tokens/colors';
import { cssTransition, blurValues } from '../../design-system';
// Logo placeholder for products without images - use Vite asset import
import logoPlaceholder from '../../assets/logo-symbol.png';
import { useThemeMode } from '../../contexts/ThemeContext';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import {
  getCloudinaryUrl,
  getResponsiveSrcSet,
  getLQIPUrl,
  getImageSizes,
  isCloudinaryUrl,
} from '../../utils/cloudinaryImage';
import {
  isDriveProxyUrl,
  withSize,
  getDriveProxySrcSet,
} from '../../utils/driveImage';
import { createLogger } from '../../utils/logger';
import ImageWatermark from './ImageWatermark';

const log = createLogger('ProgressiveImage');

// Retry configuration for failed image loads (reduced to minimize blinking)
const MAX_RETRY_ATTEMPTS = 2; // Reduced from 3 to 2 for faster failure
const RETRY_DELAYS = [1000, 3000]; // Reduced from [1000, 2000, 4000] for faster recovery

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
  /** Position of image within container when using objectFit */
  objectPosition?: string;
  borderRadius?: number;
  /** Layout type for responsive sizes */
  layout?: 'grid' | 'full' | 'thumbnail';
  /** Enable LQIP blur-up effect */
  enableLQIP?: boolean;
  /** Quality preset: 'eco' for fast loading, 'good' for balance, 'best' for quality */
  quality?: 'eco' | 'good' | 'best';
  /** Tiny thumbnail URL (20px) for LQIP blur-up on non-Cloudinary images */
  tinyThumb?: string;
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
  objectPosition = 'center',
  borderRadius = 0,
  layout = 'grid',
  enableLQIP = true,
  quality = 'good',
  tinyThumb,
}: ProgressiveImageProps) {
  const { mode } = useThemeMode();
  const isLight = mode === 'light';
  const prefersReducedMotion = useReducedMotion();
  // Unique ID per component instance to prevent DOM node reuse across different cards
  const instanceId = useId();
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [lqipLoaded, setLqipLoaded] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [imageKey, setImageKey] = useState(0); // Force re-render on retry
  const [fullyLoaded, setFullyLoaded] = useState(false); // Image 100% downloaded

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
    const isDriveProxy = !isCloudinary && isDriveProxyUrl(src);

    // For eco quality, use smaller srcset widths for faster loading
    const srcSetWidths = quality === 'eco' ? [200, 300, 400] : [280, 400, 560, 800];

    // For Drive proxy URLs, the backend only exposes a fixed set of size presets.
    // Grid cards need 'medium' (800px) even in eco mode — a ~300px card on a
    // DPR 2-3 screen otherwise upscales the 400px 'small' and renders soft.
    const driveSizes =
      layout === 'thumbnail'
        ? (['thumb', 'small'] as const)
        : layout === 'full'
          ? (['small', 'medium', 'large'] as const)
          : (['thumb', 'small', 'medium'] as const);

    // For the src attribute on Drive proxies, ask for the smallest of the set
    // so mobile/eco paths download less while srcSet lets the browser upgrade.
    const baseDriveSrc = isDriveProxy ? withSize(src, driveSizes[0]) : src;

    return {
      optimizedSrc: isCloudinary
        ? getCloudinaryUrl(src, {
            width: width || 400,
            quality: cloudinaryQuality,
            format: 'auto',
            crop: 'fill',
          })
        : baseDriveSrc,
      srcSet: isCloudinary
        ? getResponsiveSrcSet(src, srcSetWidths, cloudinaryQuality)
        : isDriveProxy
          ? getDriveProxySrcSet(src, driveSizes)
          : '',
      sizes: isCloudinary || isDriveProxy ? getImageSizes(layout) : '',
      // LQIP: Cloudinary tiny URL for Cloudinary images, tinyThumb for Drive proxy images
      // tinyThumb is always allowed even in eco mode (20px = ~200 bytes, negligible cost)
      lqipSrc: enableLQIP
        ? (isCloudinary && quality !== 'eco' ? getLQIPUrl(src) : (tinyThumb || ''))
        : '',
    };
  }, [src, width, layout, enableLQIP, quality, cloudinaryQuality, tinyThumb]);

  /**
   * Retry image loading with exponential backoff
   */
  const retryImageLoad = useCallback((currentRetry: number) => {
    if (currentRetry >= MAX_RETRY_ATTEMPTS) {
      log.error('Image load failed after max retries', { src: optimizedSrc });
      setError(true);
      return;
    }

    const delay = RETRY_DELAYS[currentRetry];
    log.warn(`Retrying image load (${currentRetry + 1}/${MAX_RETRY_ATTEMPTS})`, {
      src: optimizedSrc,
      delay: `${delay}ms`
    });

    setTimeout(() => {
      setRetryCount(currentRetry + 1);
      setImageKey(prev => prev + 1);
    }, delay);
  }, [optimizedSrc]);

  // Reset states when src changes
  useEffect(() => {
    setLoaded(false);
    setError(false);
    setLqipLoaded(false);
    setFullyLoaded(false); // Reset fully loaded state
    setRetryCount(0);
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

  // Note: Main image loading is handled by the <img> element's onLoad/onError callbacks.
  // Previously, a separate useEffect preloaded via `new Image()` which caused double network requests.

  // Container bgcolor matches Skeleton bgcolor — eliminates any white gap
  // between mounting and Skeleton's first paint frame
  const skeletonBg = isLight ? surfacesLight.background.tertiary : surfacesDark.background.secondary;

  const containerStyles = {
    position: 'relative' as const,
    overflow: 'hidden',
    bgcolor: skeletonBg,
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
              draggable={false}
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
      {/* LQIP blur-up placeholder (visible until image fully loaded) */}
      {enableLQIP && lqipSrc && lqipLoaded && !fullyLoaded && (
        <Box
          component="img"
          draggable={false}
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
            objectPosition,
            filter: `blur(${blurValues.xl})`,
            transform: 'scale(1.1)', // Prevent blur edge artifacts
            opacity: 1,
            transition: prefersReducedMotion ? 'none' : cssTransition.slow,
          }}
        />
      )}

      {/* Skeleton loading state (remains visible until image fully loaded) */}
      {!fullyLoaded && !error && !lqipLoaded && (
        <Skeleton
          variant="rectangular"
          width="100%"
          height="100%"
          animation="wave"
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            bgcolor: skeletonBg,
          }}
        />
      )}

      {/* Retry loading indicator - REMOVED to prevent blinking, skeleton stays visible instead */}

      {/* Actual image with fade-in effect */}
      {shouldLoad && !error && (
        <Box
          component="img"
          draggable={false}
          src={
            retryCount > 0
              ? `${optimizedSrc}${optimizedSrc.includes('?') ? '&' : '?'}retry=${retryCount}`
              : optimizedSrc
          }
          key={`img-${instanceId}-${imageKey}`}
          srcSet={srcSet || undefined}
          sizes={sizes || undefined}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          {...{ fetchpriority: priority ? 'high' : 'auto' } as any}
          onLoad={() => {
            log.info('Image render success', { src: optimizedSrc, attempts: retryCount + 1 });
            setLoaded(true);
            setFullyLoaded(true); // Mark as fully loaded to display
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
            objectPosition,
            // Hide image until 100% loaded to prevent partial render/progressive JPEG blinking
            // USER REQUIREMENT: Don't show images until fully downloaded
            opacity: fullyLoaded ? 1 : 0,
            transition: prefersReducedMotion ? 'none' : cssTransition.slow,
          }}
        />
      )}

      {/* Error fallback with retry button */}
      {error && showPlaceholderIcon && (
        <Box
          sx={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
          }}
        >
          <Box
            component="img"
            draggable={false}
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
          <Box
            component="button"
            onClick={() => {
              setError(false);
              setRetryCount(0);
              setImageKey(prev => prev + 1);
            }}
            aria-label="Reintentar carga de imagen"
            sx={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: isLight ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.45)',
              fontSize: '0.65rem',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              p: 0.5,
              borderRadius: 1,
              '&:hover': {
                color: isLight ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)',
              },
            }}
          >
            Reintentar
          </Box>
        </Box>
      )}

      {/* Watermark overlay - only visible while loading or on error (not on loaded images) */}
      {(!loaded || error) && <ImageWatermark opacity={0.2} size="medium" />}
    </Box>
  );
}
