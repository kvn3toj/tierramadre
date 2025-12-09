import { useState, useEffect, useRef } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { BrokenImage as BrokenIcon } from '@mui/icons-material';

// Fallback high-quality emerald images from Unsplash
const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1615655114865-4cc1bda5901b?w=1920&h=1080&fit=crop', // emerald crystal
  'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=1920&h=1080&fit=crop', // green gems
  'https://images.unsplash.com/photo-1611955167811-4711904bb9f8?w=1920&h=1080&fit=crop', // jewelry
  'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=1920&h=1080&fit=crop', // green stones
  'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=1920&h=1080&fit=crop', // gems display
  'https://images.unsplash.com/photo-1551751299-1b51cab2694c?w=1920&h=1080&fit=crop', // luxury jewelry
];

interface SmartSlideImageProps {
  src: string;
  alt: string;
  slideIndex: number;
  onLoad?: () => void;
  onError?: () => void;
  sx?: object;
}

export default function SmartSlideImage({
  src,
  alt,
  slideIndex,
  onLoad,
  onError,
  sx = {},
}: SmartSlideImageProps) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error' | 'fallback'>('loading');
  const [currentSrc, setCurrentSrc] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Stagger image loading based on slide index to avoid rate limiting
    const delay = slideIndex * 2000; // 2 seconds between each image

    setStatus('loading');
    setCurrentSrc(null);
    setRetryCount(0);

    loadTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        setCurrentSrc(src);
      }
    }, delay);

    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, [src, slideIndex]);

  const handleLoad = () => {
    if (mountedRef.current) {
      setStatus('loaded');
      onLoad?.();
    }
  };

  const handleError = () => {
    if (!mountedRef.current) return;

    // If we haven't retried yet, wait and try again
    if (retryCount < 2) {
      setRetryCount(prev => prev + 1);
      setStatus('loading');

      // Wait longer before retry (exponential backoff)
      const retryDelay = (retryCount + 1) * 3000;

      loadTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          // Add a cache-busting parameter
          const retrySrc = src.includes('?')
            ? `${src}&retry=${Date.now()}`
            : `${src}?retry=${Date.now()}`;
          setCurrentSrc(retrySrc);
        }
      }, retryDelay);
    } else {
      // Use fallback image after all retries exhausted
      const fallbackIndex = slideIndex % FALLBACK_IMAGES.length;
      setCurrentSrc(FALLBACK_IMAGES[fallbackIndex]);
      setStatus('fallback');
      onError?.();
    }
  };

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        position: 'relative',
        bgcolor: 'grey.900',
        ...sx,
      }}
    >
      {/* Loading state */}
      {(status === 'loading' && !currentSrc) && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
          }}
        >
          <CircularProgress size={40} sx={{ color: '#006B3C' }} />
          <Typography variant="caption" color="text.secondary">
            Cargando imagen {slideIndex + 1}...
          </Typography>
        </Box>
      )}

      {/* Loading with image rendering */}
      {(status === 'loading' && currentSrc) && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1,
          }}
        >
          <CircularProgress size={24} sx={{ color: '#006B3C' }} />
        </Box>
      )}

      {/* Image */}
      {currentSrc && (
        <Box
          component="img"
          src={currentSrc}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: status === 'loaded' || status === 'fallback' ? 1 : 0.3,
            transition: 'opacity 0.3s ease',
          }}
        />
      )}

      {/* Error state */}
      {status === 'error' && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
          }}
        >
          <BrokenIcon sx={{ fontSize: 48, color: 'grey.600' }} />
          <Typography variant="caption" color="text.secondary">
            Error al cargar imagen
          </Typography>
        </Box>
      )}

      {/* Fallback indicator */}
      {status === 'fallback' && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 4,
            right: 4,
            bgcolor: 'rgba(0,0,0,0.6)',
            px: 1,
            py: 0.25,
            borderRadius: 0.5,
          }}
        >
          <Typography variant="caption" sx={{ color: 'grey.400', fontSize: '0.6rem' }}>
            Imagen alternativa
          </Typography>
        </Box>
      )}
    </Box>
  );
}
