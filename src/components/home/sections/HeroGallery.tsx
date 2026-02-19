/**
 * HeroGallery Component
 *
 * Brand-focused hero carousel with 3 team/landscape photos.
 * Category tabs navigate to /treasure with appropriate filters.
 * Inspired by Apple iOS 26 design language.
 *
 * Designed by: Aria + Eunoia + Moksart
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, Typography } from '@mui/material';
import {
  overlays,
  whiteAlpha,
  blackAlpha,
  opacity,
} from '../../../design-system';
import {
  ALL_CATEGORIES,
  AUTO_TRANSITION_INTERVAL,
  MainCategory,
} from './gallery-constants';

// =============================================================================
// HERO IMAGES — Static brand images
// =============================================================================

/**
 * Per-image objectPosition controls the focal point when cropped by object-fit: cover.
 *
 * header-1: Team facing camera — people in lower half, mountain peak above.
 *           Focus at 35% vertical to keep faces + peak visible.
 * header-2: Team from behind showing branded shirts — people in bottom 60%.
 *           Focus at 45% vertical to show backs with logo and mountain ridge.
 * header-3: Pure landscape with dramatic peaks — interest is center-upper.
 *           Focus at 40% vertical to emphasize the peak.
 */
const HERO_IMAGES = [
  { id: 'brand-1', src: '/images/header-1.jpg', alt: 'Equipo Tierra Madre frente a las montanas esmeraldiferas', objectPosition: 'center 35%' },
  { id: 'brand-2', src: '/images/header-2.jpg', alt: 'Equipo Tierra Madre contemplando la cordillera colombiana', objectPosition: 'center 45%' },
  { id: 'brand-3', src: '/images/header-3.jpg', alt: 'Montanas esmeraldiferas de Boyaca, Colombia', objectPosition: 'center 40%' },
];

// =============================================================================
// CATEGORY → TREASURE URL MAPPING
// =============================================================================

const CATEGORY_ROUTES: Record<MainCategory, string> = {
  estrenos: '/treasure?sort=newest',
  gemas: '/treasure?type=loose&cantidad=1',
  lotes: '/treasure?type=loose&cantidad=2%2B',
  joyas: '/treasure?type=jewelry',
};

// =============================================================================
// COMPONENT
// =============================================================================

export const HeroGallery: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const navigate = useNavigate();

  // Auto-transition carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % HERO_IMAGES.length);
    }, AUTO_TRANSITION_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  const currentImage = HERO_IMAGES[currentIndex];

  const handleCategoryClick = (categoryId: MainCategory) => {
    navigate(CATEGORY_ROUTES[categoryId]);
  };

  // Preload all brand images on mount
  useEffect(() => {
    HERO_IMAGES.forEach((image) => {
      const img = new Image();
      img.src = image.src;
    });
  }, []);

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
          <motion.div
            key={currentImage.id}
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
              component="img"
              src={currentImage.src}
              alt={currentImage.alt}
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: currentImage.objectPosition,
                display: 'block',
              }}
            />
          </motion.div>
        </AnimatePresence>

        {/* Gradient overlay */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: overlays.hero.gradient,
            pointerEvents: 'none',
          }}
        />

        {/* Bottom section: Category Tabs */}
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
              {ALL_CATEGORIES.map((cat) => (
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
                    '&:hover': {
                      bgcolor: overlays.pill.active.bg,
                      '& .MuiTypography-root': {
                        color: 'white',
                      },
                    },
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      color: whiteAlpha(opacity.muted),
                      fontWeight: 400,
                      fontSize: '0.8rem',
                      transition: 'color 0.2s ease',
                    }}
                  >
                    {cat.label}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default HeroGallery;
