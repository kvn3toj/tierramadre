/**
 * HeroGallery Component
 *
 * Liquid Glass Design - Hero + Gallery merged
 * Clicking thumbnails navigates to product page
 * Auto-transition carousel with category filtering
 * Inspired by Apple iOS 26 design language
 *
 * Categories: Nuevo, Joyería, Lotes, Gemas
 * With expandable sub-categories for Joyería, Lotes, and Gemas
 *
 * IMAGE SOURCE: Google Drive product folders via useTreasure hook
 * The `imagen` field is already merged from batch thumbnails
 *
 * Designed by: Aria + Eunoia + Moksart
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, Typography, useTheme, Button } from '@mui/material';
import { ExpandMore, ArrowForward } from '@mui/icons-material';
import {
  overlays,
  thumbnailStates,
  whiteAlpha,
  blackAlpha,
  opacity,
  lightTokens,
  darkTokens,
} from '../../../design-system';
import { TreasureItem } from '../../../types';
import ProgressiveImage from '../../shared/ProgressiveImage';
import {
  GalleryImage,
  ALL_CATEGORIES,
  AUTO_TRANSITION_INTERVAL,
} from './gallery-constants';
import { useGalleryFiltering } from './useGalleryFiltering';

// =============================================================================
// PROPS
// =============================================================================

interface HeroGalleryProps {
  treasure?: TreasureItem[];
}

// =============================================================================
// COMPONENT - Hero + Gallery merged
// =============================================================================

export const HeroGallery: React.FC<HeroGalleryProps> = ({ treasure = [] }) => {
  const [heroImage, setHeroImage] = useState<GalleryImage | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  // Helper: set size param on serve-drive-image URLs (replaces existing if present)
  const setImageSize = useCallback((url: string, size: string): string => {
    if (!url || !url.includes('serve-drive-image')) return url;
    const parsed = new URL(url, window.location.origin);
    parsed.searchParams.set('size', size);
    return parsed.pathname + '?' + parsed.searchParams.toString();
  }, []);

  // Category/subcategory filtering logic (extracted hook)
  const {
    activeCategory,
    activeSubcategory,
    expandedCategory,
    images,
    currentSubcategories,
    getAvailableSubcategories,
    handleCategoryClick,
    handleSubcategoryClick,
  } = useGalleryFiltering({ treasure, setImageSize });

  // Auto-transition effect for hero image carousel
  useEffect(() => {
    if (images.length === 0 || !heroImage) return;

    const interval = setInterval(() => {
      const currentIndex = images.findIndex((img) => img.id === heroImage.id);
      const nextIndex = (currentIndex + 1) % images.length;
      setHeroImage(images[nextIndex]);
    }, AUTO_TRANSITION_INTERVAL);

    return () => clearInterval(interval);
  }, [heroImage, images]);

  // Show clicked thumbnail in hero image (instead of navigating)
  const handleThumbnailClick = (image: GalleryImage) => {
    setHeroImage(image);
  };

  // Handle hero image click - also navigate to product
  const handleHeroClick = () => {
    if (heroImage?.item) {
      navigate(`/product/${heroImage.item}`);
    }
  };

  // Initialize or reset hero image when images change
  useEffect(() => {
    if (images.length > 0 && (!heroImage || !images.find((img) => img.id === heroImage.id))) {
      setHeroImage(images[0]);
    }
  }, [images, heroImage]);

  // Preload first 3 hero images for instant display (uses extended splash screen time)
  useEffect(() => {
    if (images.length === 0) return;

    const imagesToPreload = images.slice(0, 3);
    imagesToPreload.forEach((image) => {
      if (image.src) {
        const img = new Image();
        img.src = image.src;
        // Silently handle preload errors
        img.onerror = () => console.warn('Hero preload failed:', image.src);
      }
    });
  }, [images]);

  return (
    <Box component="section" aria-label="Galeria">
      {/* Hero Image - Compact */}
      <Box
        sx={{
          position: 'relative',
          height: { xs: '38vh', sm: '42vh' },
          minHeight: 280,
          maxHeight: 380,
          overflow: 'hidden',
        }}
      >
        {/* Background image with smooth crossfade */}
        <AnimatePresence mode="popLayout">
          {heroImage && (
            <motion.div
              key={heroImage.id}
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeInOut' }}
              style={{
                position: 'absolute',
                inset: 0,
              }}
            >
              <Box
                onClick={handleHeroClick}
                sx={{
                  width: '100%',
                  height: '100%',
                  cursor: heroImage.item ? 'pointer' : 'default',
                }}
              >
                <ProgressiveImage
                  src={heroImage.src}
                  alt={heroImage.alt}
                  objectFit="cover"
                  height="100%"
                  priority
                  quality="best"
                  layout="full"
                />
              </Box>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Gradient overlay - using design system tokens */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: overlays.hero.gradient,
            pointerEvents: 'none',
          }}
        />

        {/* Action Button - Show when a product is selected */}
        <AnimatePresence>
          {heroImage?.item && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                zIndex: 10,
              }}
            >
              <Button
                variant="contained"
                size="small"
                endIcon={<ArrowForward sx={{ fontSize: 14 }} />}
                onClick={handleHeroClick}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.75)',
                  color: '#1a1a1a',
                  fontWeight: 500,
                  fontSize: '0.7rem',
                  px: 1.5,
                  py: 0.5,
                  minHeight: 'auto',
                  borderRadius: 1.5,
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  textTransform: 'none',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.85)',
                    boxShadow: '0 3px 12px rgba(0,0,0,0.2)',
                  },
                }}
              >
                Ver producto
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom section: Tabs + Subcategories + Thumbnails */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            pb: 2,
          }}
        >
          {/* Main Category Pill Tabs */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              mb: 1.5,
              px: 2,
            }}
          >
            <Box
              sx={{
                display: 'inline-flex',
                gap: 0.5,
                p: 0.5,
                bgcolor: blackAlpha(opacity.overlay),
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderRadius: 3,
                border: `1px solid ${whiteAlpha(opacity.soft)}`,
              }}
            >
              {ALL_CATEGORIES.map((cat) => {
                const hasAvailableSubcategories = getAvailableSubcategories(cat.id).length > 0;
                const isExpanded = expandedCategory === cat.id;
                const isActive = activeCategory === cat.id;

                return (
                  <Box
                    key={cat.id}
                    onClick={() => handleCategoryClick(cat.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && handleCategoryClick(cat.id)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      px: 2,
                      py: 0.75,
                      borderRadius: 2,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      ...(isActive && {
                        bgcolor: overlays.pill.active.bg,
                      }),
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        color: isActive ? 'white' : whiteAlpha(opacity.muted),
                        fontWeight: isActive ? 600 : 400,
                        fontSize: '0.8rem',
                      }}
                    >
                      {cat.label}
                    </Typography>
                    {hasAvailableSubcategories && (
                      <ExpandMore
                        sx={{
                          fontSize: '1rem',
                          color: isActive ? 'white' : whiteAlpha(opacity.muted),
                          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s ease',
                        }}
                      />
                    )}
                  </Box>
                );
              })}
            </Box>
          </Box>

          {/* Thumbnail Carousel - Centered */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeCategory}-${activeSubcategory || 'all'}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Box
                ref={scrollRef}
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: 1,
                  overflowX: 'auto',
                  px: 2,
                  scrollSnapType: 'x mandatory',
                  '&::-webkit-scrollbar': { display: 'none' },
                  scrollbarWidth: 'none',
                }}
              >
                {images.map((image, index) => {
                  const isActive = heroImage?.id === image.id;
                  return (
                    <motion.div
                      key={image.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.03 }}
                      style={{ scrollSnapAlign: 'start', flexShrink: 0 }}
                    >
                      <Box
                        onClick={() => handleThumbnailClick(image)}
                        sx={{
                          width: 72,
                          height: 72,
                          borderRadius: 2.5,
                          overflow: 'hidden',
                          cursor: 'pointer',
                          position: 'relative',
                          border: isActive
                            ? thumbnailStates.active.border
                            : '2px solid transparent',
                          opacity: isActive ? 1 : 0.7,
                          transition: 'all 0.2s ease',
                          boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.3)' : 'none',
                          '&:hover': {
                            opacity: 1,
                            border: thumbnailStates.hover.border,
                            transform: 'scale(1.05)',
                          },
                        }}
                      >
                        <ProgressiveImage
                          src={
                            // Use small size for thumbnails (optimized for 72x72 display)
                            setImageSize(image.src, 'small')
                          }
                          alt={image.alt}
                          objectFit="cover"
                          width={72}
                          quality="eco"
                          layout="thumbnail"
                        />
                      </Box>
                    </motion.div>
                  );
                })}
              </Box>
            </motion.div>
          </AnimatePresence>
        </Box>
      </Box>

      {/* Subcategory Pills - Below Hero for cleaner visual */}
      <AnimatePresence>
        {expandedCategory && currentSubcategories.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                gap: 1,
                flexWrap: 'wrap',
                px: 2,
                py: 1.5,
                // iOS HIG: Theme-aware background
                bgcolor: isDarkMode
                  ? darkTokens.background.surface
                  : lightTokens.background.muted,
                // iOS HIG: Subtle border for elevation hint
                borderBottom: `1px solid ${isDarkMode
                  ? darkTokens.border.light
                  : lightTokens.border.light}`,
              }}
            >
              {currentSubcategories.map((sub, index) => {
                const isSelected = activeSubcategory === sub.id;
                return (
                  <motion.div
                    key={sub.id}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                  >
                    <Box
                      onClick={() => handleSubcategoryClick(sub.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && handleSubcategoryClick(sub.id)}
                      sx={{
                        px: 2,
                        py: 0.75,
                        borderRadius: 2,
                        cursor: 'pointer',
                        // iOS HIG: Theme-aware pill backgrounds
                        bgcolor: isSelected
                          ? isDarkMode
                            ? 'rgba(255,255,255,0.15)'
                            : 'rgba(0,0,0,0.08)'
                          : isDarkMode
                            ? 'rgba(255,255,255,0.06)'
                            : 'rgba(0,0,0,0.04)',
                        border: `1px solid ${isSelected
                          ? isDarkMode
                            ? 'rgba(255,255,255,0.2)'
                            : 'rgba(0,0,0,0.12)'
                          : isDarkMode
                            ? 'rgba(255,255,255,0.08)'
                            : 'rgba(0,0,0,0.06)'}`,
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          bgcolor: isDarkMode
                            ? 'rgba(255,255,255,0.12)'
                            : 'rgba(0,0,0,0.06)',
                          borderColor: isDarkMode
                            ? 'rgba(255,255,255,0.15)'
                            : 'rgba(0,0,0,0.1)',
                        },
                        '&:active': {
                          transform: 'scale(0.97)',
                        },
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          // iOS HIG: Theme-aware text colors
                          color: isSelected
                            ? isDarkMode
                              ? 'rgba(255,255,255,0.95)'
                              : lightTokens.text.primary
                            : isDarkMode
                              ? 'rgba(255,255,255,0.7)'
                              : lightTokens.text.secondary,
                          fontWeight: isSelected ? 600 : 400,
                          fontSize: '0.8rem',
                        }}
                      >
                        {sub.label}
                      </Typography>
                    </Box>
                  </motion.div>
                );
              })}
            </Box>
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
};

export default HeroGallery;
