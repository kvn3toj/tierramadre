/**
 * ImageLightbox Component
 * Full-screen image viewer with iOS-style gestures.
 *
 * Features:
 * - Pinch-to-zoom (touch gestures)
 * - Double-tap to zoom in/out
 * - Swipe left/right to navigate gallery
 * - Swipe down to dismiss
 * - Haptic feedback on interactions
 *
 * iOS HIG Compliance:
 * - 44pt touch targets for navigation
 * - System-style dismiss gesture
 * - Smooth spring animations
 */

import { useState, useCallback, useRef, TouchEvent, useEffect } from 'react';
import { Box, IconButton, Typography, alpha, Portal } from '@mui/material';
import FocusTrap from '@mui/material/Unstable_TrapFocus';
import { X, ChevronLeft, ChevronRight, Share2 } from 'lucide-react';
import { motion, AnimatePresence, PanInfo, useAnimation } from 'framer-motion';
import { triggerHaptic } from '../../hooks/useHaptics';
import { lightTokens, darkTokens, cssTransition, blurValues, zIndex } from '../../design-system';
import ProtectedContent from '../shared/ProtectedContent';

interface ImageLightboxProps {
  images: Array<{
    url: string;
    alt?: string;
  }>;
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  onShare?: (index: number) => void;
}

// Gesture thresholds
const SWIPE_THRESHOLD = 50; // Minimum swipe distance to trigger navigation
const DISMISS_THRESHOLD = 100; // Minimum swipe down to dismiss
const DOUBLE_TAP_DELAY = 300; // Max ms between taps for double-tap

export default function ImageLightbox({
  images,
  initialIndex = 0,
  isOpen,
  onClose,
  onShare,
}: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [translateY, setTranslateY] = useState(0);
  const controls = useAnimation();

  // Touch tracking refs
  const lastTapTime = useRef(0);
  const touchStartY = useRef(0);
  const initialDistance = useRef(0);
  const initialScale = useRef(1);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setScale(1);
      setTranslateY(0);
    }
  }, [isOpen, initialIndex]);

  // Handle navigation
  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      triggerHaptic('selection');
      setCurrentIndex(prev => prev - 1);
      setScale(1);
    }
  }, [currentIndex]);

  const goToNext = useCallback(() => {
    if (currentIndex < images.length - 1) {
      triggerHaptic('selection');
      setCurrentIndex(prev => prev + 1);
      setScale(1);
    }
  }, [currentIndex, images.length]);

  // Handle double-tap to zoom
  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapTime.current < DOUBLE_TAP_DELAY) {
      // Double tap detected
      triggerHaptic('medium');
      setScale(prev => prev === 1 ? 2 : 1);
      lastTapTime.current = 0;
    } else {
      lastTapTime.current = now;
    }
  }, []);

  // Handle pinch-to-zoom
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch start
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      initialDistance.current = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      initialScale.current = scale;
    } else if (e.touches.length === 1) {
      touchStartY.current = e.touches[0].clientY;
    }
  }, [scale]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch move
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );

      if (initialDistance.current > 0) {
        const newScale = initialScale.current * (currentDistance / initialDistance.current);
        // Clamp scale between 0.5 and 4
        setScale(Math.min(Math.max(newScale, 0.5), 4));
      }
    } else if (e.touches.length === 1 && scale === 1) {
      // Swipe down to dismiss (only when not zoomed)
      const deltaY = e.touches[0].clientY - touchStartY.current;
      if (deltaY > 0) {
        setTranslateY(deltaY);
      }
    }
  }, [scale]);

  const handleTouchEnd = useCallback(() => {
    initialDistance.current = 0;

    // Check if should dismiss
    if (translateY > DISMISS_THRESHOLD) {
      triggerHaptic('light');
      onClose();
    } else {
      setTranslateY(0);
    }
  }, [translateY, onClose]);

  // Handle horizontal swipe for navigation
  const handleDragEnd = useCallback((_: never, info: PanInfo) => {
    if (scale > 1) return; // Don't navigate when zoomed

    if (info.offset.x < -SWIPE_THRESHOLD && currentIndex < images.length - 1) {
      goToNext();
    } else if (info.offset.x > SWIPE_THRESHOLD && currentIndex > 0) {
      goToPrevious();
    }
  }, [scale, currentIndex, images.length, goToNext, goToPrevious]);

  // Handle share
  const handleShare = useCallback(() => {
    triggerHaptic('light');
    onShare?.(currentIndex);
  }, [currentIndex, onShare]);

  // Handle close with haptic
  const handleClose = useCallback(() => {
    triggerHaptic('light');
    onClose();
  }, [onClose]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowLeft':
          goToPrevious();
          break;
        case 'ArrowRight':
          goToNext();
          break;
        case 'Escape':
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, goToPrevious, goToNext, onClose]);

  if (!isOpen || images.length === 0) return null;

  const currentImage = images[currentIndex];
  const opacity = 1 - Math.min(translateY / 300, 0.5);

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <FocusTrap open={isOpen}>
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={`Visor de imágenes - ${currentIndex + 1} de ${images.length}`}
            tabIndex={-1}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: zIndex.modal,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              outline: 'none',
            }}
          >
            {/* Backdrop */}
            <Box
              onClick={handleClose}
              sx={{
                position: 'absolute',
                inset: 0,
                bgcolor: alpha(darkTokens.background.app, opacity * 0.95),
                transition: cssTransition.fast,
              }}
            />

            {/* Header - Close and Share buttons */}
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                p: 2,
                pt: 'calc(env(safe-area-inset-top) + 16px)',
                zIndex: zIndex.base,
              }}
            >
              <IconButton
                onClick={handleClose}
                sx={{
                  width: 44,
                  height: 44,
                  color: lightTokens.text.inverse,
                  bgcolor: alpha(lightTokens.background.surface, 0.1),
                  backdropFilter: `blur(${blurValues.sm})`,
                  '&:hover': { bgcolor: alpha(lightTokens.background.surface, 0.2) },
                }}
              >
                <X size={24} />
              </IconButton>

              {onShare && (
                <IconButton
                  onClick={handleShare}
                  sx={{
                    width: 44,
                    height: 44,
                    color: lightTokens.text.inverse,
                    bgcolor: alpha(lightTokens.background.surface, 0.1),
                    backdropFilter: `blur(${blurValues.sm})`,
                    '&:hover': { bgcolor: alpha(lightTokens.background.surface, 0.2) },
                  }}
                >
                  <Share2 size={24} />
                </IconButton>
              )}
            </Box>

            {/* Main Image Container - Wrapped with ProtectedContent for screenshot deterrent */}
            <ProtectedContent blurIntensity={30}>
              <motion.div
                drag={scale === 1 ? 'x' : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={handleDragEnd}
                animate={controls}
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: `translateY(${translateY}px)`,
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onClick={handleTap}
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentIndex}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      maxWidth: '100%',
                      maxHeight: '90vh',
                    }}
                  >
                    <img
                      src={currentImage.url}
                      alt={currentImage.alt || `Image ${currentIndex + 1}`}
                      onContextMenu={(e) => e.preventDefault()}
                      style={{
                        maxWidth: '100%',
                        maxHeight: '90vh',
                        objectFit: 'contain',
                        transform: `scale(${scale})`,
                        transition: cssTransition.default,
                        touchAction: 'none',
                        userSelect: 'none',
                        WebkitUserDrag: 'none',
                        WebkitTouchCallout: 'none',
                        pointerEvents: 'none',
                      } as React.CSSProperties}
                      draggable={false}
                    />
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            </ProtectedContent>

            {/* Navigation Arrows */}
            {images.length > 1 && (
              <>
                {/* Previous */}
                {currentIndex > 0 && (
                  <IconButton
                    onClick={goToPrevious}
                    sx={{
                      position: 'absolute',
                      left: 16,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: 44,
                      height: 44,
                      color: lightTokens.text.inverse,
                      bgcolor: alpha(lightTokens.background.surface, 0.1),
                      backdropFilter: `blur(${blurValues.sm})`,
                      '&:hover': { bgcolor: alpha(lightTokens.background.surface, 0.2) },
                    }}
                  >
                    <ChevronLeft size={28} />
                  </IconButton>
                )}

                {/* Next */}
                {currentIndex < images.length - 1 && (
                  <IconButton
                    onClick={goToNext}
                    sx={{
                      position: 'absolute',
                      right: 16,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: 44,
                      height: 44,
                      color: lightTokens.text.inverse,
                      bgcolor: alpha(lightTokens.background.surface, 0.1),
                      backdropFilter: `blur(${blurValues.sm})`,
                      '&:hover': { bgcolor: alpha(lightTokens.background.surface, 0.2) },
                    }}
                  >
                    <ChevronRight size={28} />
                  </IconButton>
                )}
              </>
            )}

            {/* Footer - Progress indicator */}
            <Box
              sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                pb: 'calc(env(safe-area-inset-bottom) + 24px)',
                zIndex: zIndex.base,
              }}
            >
              {/* Dot indicators */}
              {images.length > 1 && images.length <= 10 && (
                <Box sx={{ display: 'flex', gap: 0.75, mb: 1 }}>
                  {images.map((_, index) => (
                    <Box
                      key={index}
                      sx={{
                        width: index === currentIndex ? 16 : 6,
                        height: 6,
                        borderRadius: 3,
                        bgcolor: index === currentIndex
                          ? lightTokens.text.inverse
                          : alpha(lightTokens.text.inverse, 0.4),
                        transition: cssTransition.default,
                      }}
                    />
                  ))}
                </Box>
              )}

              {/* Counter for many images */}
              {images.length > 10 && (
                <Typography
                  sx={{
                    color: alpha(lightTokens.text.inverse, 0.7),
                    fontSize: '14px',
                    fontWeight: 500,
                  }}
                >
                  {currentIndex + 1} / {images.length}
                </Typography>
              )}

              {/* Zoom hint */}
              {scale === 1 && (
                <Typography
                  sx={{
                    color: alpha(lightTokens.text.inverse, 0.5),
                    fontSize: '12px',
                    mt: 1,
                  }}
                >
                  Doble tap para zoom
                </Typography>
              )}
            </Box>
          </motion.div>
          </FocusTrap>
        )}
      </AnimatePresence>
    </Portal>
  );
}
