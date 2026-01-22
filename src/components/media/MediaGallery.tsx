/**
 * MediaGallery Component - Premium Emerald Product Gallery
 *
 * Features:
 * - Full-width hero carousel with swipe gestures
 * - Persistent thumbnail strip navigation
 * - Progress indicators (X of Y)
 * - Video support with click-to-play
 * - Full-screen lightbox on tap
 * - Zoom capability
 */

import { useState, useCallback, useRef, TouchEvent, useMemo, SyntheticEvent, useEffect } from 'react';
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
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);

  // Touch handling for swipe
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const minSwipeDistance = 50;

  const currentMedia = media[currentIndex];
  const hasMedia = media.length > 0;

  // Preload all images and video posters when media changes to prevent blink on navigation
  useEffect(() => {
    media.forEach((item) => {
      if (item.type === 'image' && item.url) {
        // Add size=medium parameter for faster preloading (800px instead of original)
        const optimizedUrl = item.url.includes('serve-drive-image')
          ? `${item.url}${item.url.includes('?') ? '&' : '?'}size=medium`
          : item.url;

        const img = new Image();
        img.src = optimizedUrl;
        // Silently handle preload errors to prevent cascade failures
        img.onerror = () => console.warn('Gallery preload failed:', optimizedUrl);
      } else if (item.type === 'video' && item.thumbnailUrl) {
        // Preload video poster for smoother transition
        const img = new Image();
        img.src = item.thumbnailUrl;
        img.onerror = () => console.warn('Video poster preload failed:', item.thumbnailUrl);
      }
    });
  }, [media]);

  // Set video loading state when switching to a video slide
  useEffect(() => {
    if (currentMedia?.type === 'video') {
      setVideoLoading(true);
    }
  }, [currentIndex, currentMedia?.type]);

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : media.length - 1));
  }, [media.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < media.length - 1 ? prev + 1 : 0));
  }, [media.length]);

  const handleTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    const distance = touchStartX.current - touchEndX.current;
    if (Math.abs(distance) > minSwipeDistance) {
      if (distance > 0) {
        handleNext();
      } else {
        handlePrevious();
      }
    }
  };

  const handleThumbnailClick = (index: number) => {
    triggerHaptic('selection');
    setCurrentIndex(index);
  };

  const handleMainClick = () => {
    // Only open lightbox for images (videos autoplay silently)
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
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={handleMainClick}
        >
          {/* No AnimatePresence - simple crossfade with CSS transitions */}
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              height: '100%',
            }}
          >
            {currentMedia?.type === 'video' ? (
              <>
                {/* Loading spinner while video buffers */}
                {videoLoading && (
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      bgcolor: darkTokens.background.app,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 1,
                    }}
                  >
                    <CircularProgress size={32} sx={{ color: 'white', opacity: 0.5 }} />
                  </Box>
                )}
                <video
                  src={`${currentMedia.url}#t=0.001`}
                  poster={currentMedia.thumbnailUrl || logoPlaceholder}
                  autoPlay
                  muted
                  loop
                  playsInline
                  controls={false}
                  preload="metadata"
                  onLoadedData={() => setVideoLoading(false)}
                  onCanPlay={() => setVideoLoading(false)}
                  onError={() => setVideoLoading(false)}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    opacity: videoLoading ? 0 : 1,
                    transition: 'opacity 0.3s ease',
                  }}
                />
              </>
            ) : (
              <img
                key={currentMedia?.url}
                src={currentMedia?.url}
                alt={currentMedia?.alt || productName}
                draggable={false}
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
                onClick={() => handleThumbnailClick(index)}
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
              onClick={() => handleThumbnailClick(index)}
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
              onClick={onAddMedia}
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
