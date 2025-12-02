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

import { useState, useCallback, useRef, TouchEvent } from 'react';
import {
  Box,
  IconButton,
  Typography,
  Chip,
  Dialog,
  DialogContent,
  alpha,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  PlayCircle,
  X,
  ZoomIn,
  Maximize2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MediaItem, CATEGORY_LABELS } from './types';

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
  const [isPlaying, setIsPlaying] = useState(false);

  // Touch handling for swipe
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const minSwipeDistance = 50;

  const currentMedia = media[currentIndex];
  const hasMedia = media.length > 0;

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : media.length - 1));
    setIsPlaying(false);
  }, [media.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < media.length - 1 ? prev + 1 : 0));
    setIsPlaying(false);
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
    setCurrentIndex(index);
    setIsPlaying(false);
  };

  const handleMainClick = () => {
    if (currentMedia?.type === 'video' && !isPlaying) {
      setIsPlaying(true);
    } else if (currentMedia?.type === 'image') {
      setLightboxOpen(true);
    }
  };

  // Empty state
  if (!hasMedia) {
    return (
      <Box
        sx={{
          width: '100%',
          aspectRatio: '4/3',
          borderRadius: 3,
          bgcolor: alpha('#059669', 0.05),
          border: '2px dashed',
          borderColor: alpha('#059669', 0.3),
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: isEditing ? 'pointer' : 'default',
          transition: 'all 0.3s ease',
          '&:hover': isEditing ? {
            borderColor: '#059669',
            bgcolor: alpha('#059669', 0.1),
          } : {},
        }}
        onClick={isEditing ? onAddMedia : undefined}
      >
        <ZoomIn size={48} color="#059669" style={{ opacity: 0.5 }} />
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
      {/* Main Carousel */}
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          aspectRatio: '4/3',
          borderRadius: 3,
          overflow: 'hidden',
          bgcolor: '#000',
          cursor: currentMedia?.type === 'video' ? 'pointer' : 'zoom-in',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleMainClick}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ width: '100%', height: '100%' }}
          >
            {currentMedia?.type === 'video' ? (
              isPlaying ? (
                <video
                  src={currentMedia.url}
                  autoPlay
                  controls
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <Box
                  sx={{
                    width: '100%',
                    height: '100%',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {currentMedia.thumbnailUrl ? (
                    <img
                      src={currentMedia.thumbnailUrl}
                      alt={currentMedia.alt}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                      }}
                    />
                  ) : (
                    <Box sx={{ bgcolor: '#1a1a1a', width: '100%', height: '100%' }} />
                  )}
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'rgba(0,0,0,0.3)',
                    }}
                  >
                    <PlayCircle size={64} color="white" />
                  </Box>
                </Box>
              )
            ) : (
              <img
                src={currentMedia?.url}
                alt={currentMedia?.alt || productName}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Category Label */}
        {currentMedia?.category && (
          <Chip
            label={CATEGORY_LABELS[currentMedia.category]}
            size="small"
            sx={{
              position: 'absolute',
              bottom: 12,
              left: 12,
              bgcolor: 'rgba(0,0,0,0.7)',
              color: 'white',
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
              bgcolor: 'rgba(0,0,0,0.5)',
              color: 'white',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
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
                bgcolor: 'rgba(255,255,255,0.9)',
                '&:hover': { bgcolor: 'white' },
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
                bgcolor: 'rgba(255,255,255,0.9)',
                '&:hover': { bgcolor: 'white' },
              }}
            >
              <ChevronRight size={24} />
            </IconButton>
          </>
        )}
      </Box>

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
                  bgcolor: index === currentIndex ? '#059669' : alpha('#059669', 0.3),
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: index === currentIndex ? '#059669' : alpha('#059669', 0.5),
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
              bgcolor: '#059669',
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
                borderColor: index === currentIndex ? '#059669' : 'transparent',
                opacity: index === currentIndex ? 1 : 0.6,
                transition: 'all 0.2s ease',
                position: 'relative',
                '&:hover': {
                  opacity: 1,
                  transform: 'scale(1.05)',
                },
              }}
            >
              {item.type === 'video' ? (
                <>
                  {item.thumbnailUrl ? (
                    <img
                      src={item.thumbnailUrl}
                      alt={`Thumbnail ${index + 1}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  ) : (
                    <Box sx={{ bgcolor: '#1a1a1a', width: '100%', height: '100%' }} />
                  )}
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'rgba(0,0,0,0.4)',
                    }}
                  >
                    <PlayCircle size={20} color="white" />
                  </Box>
                </>
              ) : (
                <img
                  src={item.url}
                  alt={`Thumbnail ${index + 1}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              )}
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
                borderColor: alpha('#059669', 0.4),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: '#059669',
                  bgcolor: alpha('#059669', 0.1),
                },
              }}
            >
              <Typography sx={{ fontSize: 24, color: '#059669' }}>+</Typography>
            </Box>
          )}
        </Box>
      )}

      {/* Lightbox Dialog */}
      <Dialog
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        maxWidth="xl"
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            bgcolor: 'rgba(0,0,0,0.95)',
            backgroundImage: 'none',
            m: isMobile ? 0 : 2,
          },
        }}
      >
        <IconButton
          onClick={() => setLightboxOpen(false)}
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            color: 'white',
            zIndex: 10,
            bgcolor: 'rgba(255,255,255,0.1)',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
          }}
        >
          <X size={24} />
        </IconButton>

        <DialogContent
          sx={{
            p: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: isMobile ? '100vh' : '80vh',
          }}
        >
          {currentMedia?.type === 'image' && (
            <img
              src={currentMedia.url}
              alt={currentMedia.alt || productName}
              style={{
                maxWidth: '100%',
                maxHeight: '90vh',
                objectFit: 'contain',
              }}
            />
          )}
        </DialogContent>

        {/* Lightbox Navigation */}
        {media.length > 1 && (
          <>
            <IconButton
              onClick={handlePrevious}
              sx={{
                position: 'absolute',
                left: 16,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'white',
                bgcolor: 'rgba(255,255,255,0.1)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
              }}
            >
              <ChevronLeft size={32} />
            </IconButton>
            <IconButton
              onClick={handleNext}
              sx={{
                position: 'absolute',
                right: 16,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'white',
                bgcolor: 'rgba(255,255,255,0.1)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
              }}
            >
              <ChevronRight size={32} />
            </IconButton>
          </>
        )}

        {/* Lightbox Progress */}
        <Typography
          sx={{
            position: 'absolute',
            bottom: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            color: 'rgba(255,255,255,0.7)',
          }}
        >
          {currentIndex + 1} / {media.length}
        </Typography>
      </Dialog>
    </Box>
  );
}
