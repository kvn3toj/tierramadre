/**
 * MediaGallery Component - Premium Emerald Product Gallery
 *
 * Features:
 * - Full-width hero carousel with swipe gestures
 * - Double-buffer rendering (no blink on slide change)
 * - Persistent thumbnail strip navigation
 * - Progress indicators (X of Y)
 * - Video support with click-to-play
 * - Full-screen lightbox on tap
 * - Zoom capability
 */

import { useState, useCallback, useRef, TouchEvent, useMemo, SyntheticEvent, useEffect, useLayoutEffect } from 'react';
import {
  Box,
  IconButton,
  Typography,
  Chip,
  CircularProgress,
  alpha,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  Maximize2,
} from 'lucide-react';
import { MediaItem, CATEGORY_LABELS } from './types';
import { brand, darkTokens, lightTokens } from '../../design-system';
import ImageLightbox from './ImageLightbox';
import { triggerHaptic } from '../../hooks/useHaptics';
import ProtectedContent from '../shared/ProtectedContent';
import logoPlaceholder from '../../assets/logo-symbol.png';

// Retry configuration for failed image loads
const MAX_RETRY_ATTEMPTS = 2;
const RETRY_DELAYS = [1000, 2000];
const IMAGE_LOAD_TIMEOUT = 15000; // 15 seconds

interface MediaGalleryProps {
  media: MediaItem[];
  productName: string;
  onAddMedia?: () => void;
  isEditing?: boolean;
}

export default function MediaGallery({
  media,
  productName,
  onAddMedia,
  isEditing = false,
}: MediaGalleryProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visibleIndex, setVisibleIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const [errorIndices, setErrorIndices] = useState<Set<number>>(new Set());
  const [loadingIndices, setLoadingIndices] = useState<Set<number>>(new Set());

  // Touch handling for swipe
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const minSwipeDistance = 50;

  // Prevent multiple video ready events from causing re-renders
  const videoReadyRef = useRef(false);

  // Track which slides have been preloaded+decoded (index -> true)
  const preloadCache = useRef<Map<number, boolean>>(new Map());

  // Keep currentIndex in a ref so async callbacks don't use stale values
  const currentIndexRef = useRef(currentIndex);
  useLayoutEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  const hasMedia = media.length > 0;

  // Compute the final display URL for a given index (Drive proxy gets size=medium)
  const getDisplayUrl = useCallback((index: number): string => {
    const item = media[index];
    if (!item) return '';
    if (item.url.includes('serve-drive-image')) {
      return `${item.url}${item.url.includes('?') ? '&' : '?'}size=medium`;
    }
    return item.url;
  }, [media]);

  /**
   * Preload and decode an image at a given index.
   * Returns a promise that resolves when the image is ready to display (loaded + decoded).
   * Retries with exponential backoff on failure.
   */
  const preloadAndDecode = useCallback((index: number): Promise<void> => {
    const item = media[index];
    if (!item || item.type !== 'image') return Promise.resolve();
    if (preloadCache.current.get(index)) return Promise.resolve();

    return new Promise<void>((resolve, reject) => {
      let retryCount = 0;

      const attempt = () => {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';

        const url = getDisplayUrl(index);

        // Add cache-busting on retry
        img.src = retryCount > 0
          ? `${url}${url.includes('?') ? '&' : '?'}retry=${retryCount}&t=${Date.now()}`
          : url;

        const timeout = setTimeout(() => {
          img.onload = null;
          img.onerror = null;
          img.src = '';
          handleFailure();
        }, IMAGE_LOAD_TIMEOUT);

        img.onload = () => {
          clearTimeout(timeout);
          // decode() ensures the image is fully decoded and ready to paint without jank
          const decodePromise = typeof img.decode === 'function'
            ? img.decode().catch(() => { /* decode failure is non-fatal */ })
            : Promise.resolve();

          decodePromise.then(() => {
            preloadCache.current.set(index, true);
            setErrorIndices(prev => {
              if (!prev.has(index)) return prev;
              const next = new Set(prev);
              next.delete(index);
              return next;
            });
            setLoadingIndices(prev => {
              if (!prev.has(index)) return prev;
              const next = new Set(prev);
              next.delete(index);
              return next;
            });
            resolve();
          });
        };

        img.onerror = () => {
          clearTimeout(timeout);
          handleFailure();
        };

        const handleFailure = () => {
          if (retryCount < MAX_RETRY_ATTEMPTS) {
            const delay = RETRY_DELAYS[retryCount];
            retryCount++;
            setTimeout(attempt, delay);
          } else {
            setErrorIndices(prev => {
              const next = new Set(prev);
              next.add(index);
              return next;
            });
            setLoadingIndices(prev => {
              if (!prev.has(index)) return prev;
              const next = new Set(prev);
              next.delete(index);
              return next;
            });
            reject(new Error(`Failed to load image at index ${index}`));
          }
        };
      };

      attempt();
    });
  }, [media, getDisplayUrl]);

  // Called when a rendered <img> confirms it has loaded and painted
  const handleSlideImgLoad = useCallback((index: number) => {
    preloadCache.current.set(index, true);
    setLoadingIndices(prev => {
      if (!prev.has(index)) return prev;
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
    // Only swap if this is still the desired slide
    if (currentIndexRef.current === index) {
      setVisibleIndex(index);
    }
  }, []);

  // Called when a rendered <img> fails to load
  const handleSlideImgError = useCallback((index: number) => {
    setErrorIndices(prev => {
      const next = new Set(prev);
      next.add(index);
      return next;
    });
    setLoadingIndices(prev => {
      if (!prev.has(index)) return prev;
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
    // Still transition to show error state
    if (currentIndexRef.current === index) {
      setVisibleIndex(index);
    }
  }, []);

  // When currentIndex changes, orchestrate the double-buffer transition
  useEffect(() => {
    if (media.length === 0) return;

    const item = media[currentIndex];
    if (!item) return;

    // Videos: transition immediately (poster provides instant visual)
    if (item.type === 'video') {
      setVideoLoading(true);
      videoReadyRef.current = false;
      setVisibleIndex(currentIndex);
      return;
    }

    // Images: warm browser cache via preload; the actual swap happens
    // in handleSlideImgLoad when the rendered <img> fires onLoad.
    if (!preloadCache.current.get(currentIndex)) {
      setLoadingIndices(prev => {
        const next = new Set(prev);
        next.add(currentIndex);
        return next;
      });
      preloadAndDecode(currentIndex).catch(() => { /* error handled by rendered img onError */ });
    }
    // If already in preloadCache, the rendered <img> will load from
    // browser cache and fire onLoad almost instantly — no need to
    // setVisibleIndex here (that caused the blink).

    // Fire-and-forget preload for adjacent slides
    const nextIdx = (currentIndex + 1) % media.length;
    const prevIdx = (currentIndex - 1 + media.length) % media.length;

    [nextIdx, prevIdx].forEach(idx => {
      const adjacentItem = media[idx];
      if (adjacentItem?.type === 'image' && !preloadCache.current.get(idx)) {
        preloadAndDecode(idx).catch(() => { /* non-critical */ });
      } else if (adjacentItem?.type === 'video' && adjacentItem.thumbnailUrl) {
        // Preload video poster
        const img = new window.Image();
        img.src = adjacentItem.thumbnailUrl;
      }
    });
  }, [currentIndex, media, preloadAndDecode]);

  // Clear cache when media content actually changes (different product)
  const prevMediaKey = useRef(media.map(m => m.id).join(','));
  useEffect(() => {
    const newKey = media.map(m => m.id).join(',');
    if (prevMediaKey.current !== newKey) {
      prevMediaKey.current = newKey;
      preloadCache.current.clear();
      setVisibleIndex(0);
      setCurrentIndex(0);
      setErrorIndices(new Set());
      setLoadingIndices(new Set());
    }
  }, [media]);

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : media.length - 1));
  }, [media.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < media.length - 1 ? prev + 1 : 0));
  }, [media.length]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(() => {
    const distance = touchStartX.current - touchEndX.current;
    if (Math.abs(distance) > minSwipeDistance) {
      if (distance > 0) {
        handleNext();
      } else {
        handlePrevious();
      }
    }
  }, [handleNext, handlePrevious]);

  // Keyboard navigation for accessibility (Arrow keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxOpen) return;

      switch (e.key) {
        case 'ArrowLeft':
          handlePrevious();
          break;
        case 'ArrowRight':
          handleNext();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrevious, handleNext, lightboxOpen]);

  const handleThumbnailClick = (index: number) => {
    triggerHaptic('selection');
    setCurrentIndex(index);
  };

  const currentMedia = media[currentIndex];

  const handleMainClick = () => {
    if (currentMedia?.type === 'image') {
      triggerHaptic('light');
      setLightboxOpen(true);
    }
  };

  // Prepare images for lightbox (only images, not videos)
  const lightboxImages = useMemo(() => {
    return media
      .filter(item => item.type === 'image')
      .map(item => ({
        url: item.url,
        alt: item.alt || productName,
      }));
  }, [media, productName]);

  // Get the lightbox index for current image
  const lightboxInitialIndex = useMemo(() => {
    const imageOnlyIndex = media
      .slice(0, currentIndex + 1)
      .filter(item => item.type === 'image').length - 1;
    return Math.max(0, imageOnlyIndex);
  }, [media, currentIndex]);

  // Determine which indices to render in the double-buffer
  const indicesToRender = useMemo(() => {
    const set = new Set<number>();
    set.add(visibleIndex);
    set.add(currentIndex);
    return set;
  }, [visibleIndex, currentIndex]);

  // Empty state
  if (!hasMedia) {
    return (
      <Box
        sx={{
          width: '100%',
          aspectRatio: '4/3',
          borderRadius: 3,
          bgcolor: alpha(brand.emerald[500], 0.05),
          border: '2px dashed',
          borderColor: alpha(brand.emerald[500], 0.3),
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: isEditing ? 'pointer' : 'default',
          transition: 'all 0.3s ease',
          '&:hover': isEditing ? {
            borderColor: brand.emerald[500],
            bgcolor: alpha(brand.emerald[500], 0.1),
          } : {},
        }}
        onClick={isEditing ? onAddMedia : undefined}
      >
        <ZoomIn size={48} color={brand.emerald[500]} style={{ opacity: 0.5 }} />
        <Typography
          variant="body1"
          sx={{ mt: 2, color: 'text.secondary', textAlign: 'center' }}
        >
          {isEditing ? 'Haz clic para agregar fotos o videos' : 'Sin imágenes disponibles'}
        </Typography>
        {isEditing && (
          <Typography variant="caption" sx={{ color: 'text.disabled', mt: 0.5 }}>
            Máximo 8 archivos (JPG, PNG, MP4)
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {/* Main Carousel - Wrapped with ProtectedContent for screenshot deterrent */}
      <ProtectedContent>
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            aspectRatio: '4/3',
            borderRadius: 3,
            overflow: 'hidden',
            bgcolor: darkTokens.background.app,
            cursor: currentMedia?.type === 'image' ? 'zoom-in' : 'default',
            contain: 'paint layout',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={handleMainClick}
        >
          {/* Double-buffer: render visible + incoming slides */}
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              height: '100%',
            }}
          >
            {media.map((item, index) => {
              // Only render visible and incoming slides
              if (!indicesToRender.has(index)) return null;

              const isVisible = index === visibleIndex;
              const isIncoming = index === currentIndex && currentIndex !== visibleIndex;
              const isError = errorIndices.has(index);

              if (item.type === 'video') {
                return (
                  <Box
                    key={`slide-${item.id}`}
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      opacity: isVisible ? 1 : 0,
                      zIndex: isVisible ? 1 : 0,
                      transition: 'opacity 0.15s ease',
                      transform: 'translateZ(0)',
                    }}
                  >
                    {/* Poster overlay while video buffers — avoids dark flash */}
                    {videoLoading && isVisible && (
                      <Box
                        sx={{
                          position: 'absolute',
                          inset: 0,
                          zIndex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <img
                          src={item.thumbnailUrl || logoPlaceholder}
                          alt=""
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                        <CircularProgress
                          size={32}
                          sx={{
                            position: 'absolute',
                            color: 'white',
                            opacity: 0.5,
                          }}
                        />
                      </Box>
                    )}
                    <video
                      src={`${item.url}#t=0.001`}
                      poster={item.thumbnailUrl || logoPlaceholder}
                      autoPlay
                      muted
                      loop
                      playsInline
                      controls={false}
                      preload="metadata"
                      onLoadedData={() => {
                        if (!videoReadyRef.current) {
                          videoReadyRef.current = true;
                          setVideoLoading(false);
                        }
                      }}
                      onCanPlay={() => {
                        if (!videoReadyRef.current) {
                          videoReadyRef.current = true;
                          setVideoLoading(false);
                        }
                      }}
                      onError={() => {
                        videoReadyRef.current = true;
                        setVideoLoading(false);
                      }}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  </Box>
                );
              }

              // Image slide
              return (
                <Box
                  key={`slide-${item.id}`}
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    opacity: isVisible ? 1 : 0,
                    zIndex: isVisible ? 1 : (isIncoming ? 2 : 0),
                    transition: 'opacity 0.15s ease',
                    transform: 'translateZ(0)',
                    WebkitBackfaceVisibility: 'hidden',
                  }}
                >
                  {isError ? (
                    <Box
                      sx={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: darkTokens.background.app,
                      }}
                    >
                      <Box
                        component="img"
                        src={logoPlaceholder}
                        alt=""
                        sx={{
                          width: '30%',
                          maxWidth: 80,
                          height: 'auto',
                          opacity: 0.4,
                        }}
                      />
                    </Box>
                  ) : (
                    <img
                      src={getDisplayUrl(index)}
                      crossOrigin="anonymous"
                      alt={item.alt || productName}
                      draggable={false}
                      onLoad={() => handleSlideImgLoad(index)}
                      onError={() => handleSlideImgError(index)}
                      onContextMenu={(e) => e.preventDefault()}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        userSelect: 'none',
                        WebkitUserDrag: 'none',
                        pointerEvents: 'none',
                      } as React.CSSProperties}
                    />
                  )}
                </Box>
              );
            })}
          </Box>

          {/* Loading indicator — overlays visible slide while next image loads */}
          {currentIndex !== visibleIndex && loadingIndices.has(currentIndex) && (
            <Box
              sx={{
                position: 'absolute',
                top: 12,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 10,
                bgcolor: alpha(darkTokens.background.app, 0.6),
                borderRadius: 2,
                px: 1.5,
                py: 0.75,
                backdropFilter: 'blur(4px)',
              }}
            >
              <CircularProgress size={20} sx={{ color: 'white', opacity: 0.7 }} />
            </Box>
          )}

        {/* Category Label */}
        {currentMedia?.category && (
          <Chip
            label={CATEGORY_LABELS[currentMedia.category]}
            size="small"
            sx={{
              position: 'absolute',
              bottom: 12,
              left: 12,
              bgcolor: alpha(darkTokens.background.app, 0.7),
              color: lightTokens.text.inverse,
              fontSize: '0.75rem',
              backdropFilter: 'blur(4px)',
            }}
          />
        )}

        {/* Expand button */}
        {currentMedia?.type === 'image' && (
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              setLightboxOpen(true);
            }}
            sx={{
              position: 'absolute',
              top: 12,
              right: 12,
              bgcolor: alpha(darkTokens.background.app, 0.5),
              color: lightTokens.text.inverse,
              '&:hover': { bgcolor: alpha(darkTokens.background.app, 0.7) },
            }}
          >
            <Maximize2 size={20} />
          </IconButton>
        )}

        {/* Navigation Arrows (Desktop) */}
        {!isMobile && media.length > 1 && (
          <>
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                handlePrevious();
              }}
              sx={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                bgcolor: alpha(lightTokens.background.surface, 0.9),
                '&:hover': { bgcolor: lightTokens.background.surface },
              }}
            >
              <ChevronLeft size={24} />
            </IconButton>
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              sx={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                bgcolor: alpha(lightTokens.background.surface, 0.9),
                '&:hover': { bgcolor: lightTokens.background.surface },
              }}
            >
              <ChevronRight size={24} />
            </IconButton>
          </>
        )}
        </Box>
      </ProtectedContent>

      {/* Progress Indicator */}
      {media.length > 1 && (
        <Box sx={{ textAlign: 'center', py: 1.5 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {currentIndex + 1} de {media.length}
          </Typography>

          {/* Dot indicators */}
          <Box
            sx={{
              display: 'flex',
              gap: 0.75,
              justifyContent: 'center',
              mt: 1,
            }}
          >
            {media.map((_, index) => (
              <Box
                key={index}
                role="button"
                tabIndex={0}
                aria-label={`Imagen ${index + 1} de ${media.length}`}
                aria-current={index === currentIndex ? 'true' : undefined}
                onClick={() => handleThumbnailClick(index)}
                onKeyDown={(e: React.KeyboardEvent) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleThumbnailClick(index);
                  }
                }}
                sx={{
                  width: index === currentIndex ? 20 : 8,
                  height: 8,
                  borderRadius: 4,
                  bgcolor: index === currentIndex ? brand.emerald[500] : alpha(brand.emerald[500], 0.3),
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: index === currentIndex ? brand.emerald[500] : alpha(brand.emerald[500], 0.5),
                  },
                  '&:focus-visible': {
                    outline: `2px solid ${brand.emerald[500]}`,
                    outlineOffset: 2,
                  },
                }}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Thumbnail Strip */}
      {media.length > 1 && (
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            overflowX: 'auto',
            py: 1,
            px: 0.5,
            '&::-webkit-scrollbar': { height: 4 },
            '&::-webkit-scrollbar-thumb': {
              bgcolor: brand.emerald[500],
              borderRadius: 2,
            },
          }}
        >
          {media.map((item, index) => (
            <Box
              key={item.id}
              role="button"
              tabIndex={0}
              aria-label={`Miniatura ${index + 1} de ${media.length}`}
              aria-current={index === currentIndex ? 'true' : undefined}
              onClick={() => handleThumbnailClick(index)}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleThumbnailClick(index);
                }
              }}
              sx={{
                minWidth: 64,
                height: 64,
                borderRadius: 1.5,
                overflow: 'hidden',
                cursor: 'pointer',
                border: '2px solid',
                borderColor: index === currentIndex ? brand.emerald[500] : 'transparent',
                opacity: index === currentIndex ? 1 : 0.6,
                transition: 'all 0.2s ease',
                position: 'relative',
                '&:hover': {
                  opacity: 1,
                  transform: 'scale(1.05)',
                },
                '&:focus-visible': {
                  outline: `2px solid ${brand.emerald[500]}`,
                  outlineOffset: 2,
                  opacity: 1,
                },
              }}
            >
                <img
                src={item.thumbnailUrl || item.url}
                alt={`Thumbnail ${index + 1}`}
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
                onError={(e: SyntheticEvent<HTMLImageElement>) => {
                  e.currentTarget.src = logoPlaceholder;
                  e.currentTarget.style.objectFit = 'contain';
                  e.currentTarget.style.padding = '12px';
                  e.currentTarget.style.opacity = '0.4';
                }}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  userSelect: 'none',
                  WebkitUserDrag: 'none',
                } as React.CSSProperties}
              />
            </Box>
          ))}

          {/* Add more button (when editing) */}
          {isEditing && media.length < 8 && (
            <Box
              role="button"
              tabIndex={0}
              aria-label="Agregar más imágenes"
              onClick={onAddMedia}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onAddMedia?.();
                }
              }}
              sx={{
                minWidth: 64,
                height: 64,
                borderRadius: 1.5,
                border: '2px dashed',
                borderColor: alpha(brand.emerald[500], 0.4),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: brand.emerald[500],
                  bgcolor: alpha(brand.emerald[500], 0.1),
                },
                '&:focus-visible': {
                  outline: `2px solid ${brand.emerald[500]}`,
                  outlineOffset: 2,
                },
              }}
            >
              <Typography sx={{ fontSize: 24, color: brand.emerald[500] }}>+</Typography>
            </Box>
          )}
        </Box>
      )}

      {/* Enhanced Lightbox with gestures */}
      <ImageLightbox
        images={lightboxImages}
        initialIndex={lightboxInitialIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </Box>
  );
}
