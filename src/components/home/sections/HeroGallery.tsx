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
import { emeraldCore } from '../../../design-system/tokens/colors';
import {
  whiteAlpha,
  blackAlpha,
  emeraldAlpha,
  cssTransition,
  blurValues,
} from '../../../design-system';
import { useLanguage } from '../../../contexts/LanguageContext';
import {
  ALL_CATEGORIES,
  AUTO_TRANSITION_INTERVAL,
  MainCategory,
} from './gallery-constants';

// =============================================================================
// HERO IMAGES — Static brand images
// =============================================================================

const HERO_IMAGES = [
  { id: 'brand-1', src: '/images/header-1.jpg', alt: 'Equipo Tierra Madre frente a las montanas esmeraldiferas', objectPosition: 'center 35%' },
  { id: 'brand-2', src: '/images/header-2.jpg', alt: 'Equipo Tierra Madre contemplando la cordillera colombiana', objectPosition: 'center 45%' },
  { id: 'brand-3', src: '/images/header-3.jpg', alt: 'Montanas esmeraldiferas de Boyaca, Colombia', objectPosition: 'center 40%' },
];

// =============================================================================
// CATEGORY → TREASURE URL MAPPING
// =============================================================================

const CATEGORY_ROUTES: Record<MainCategory, string> = {
  piedras: '/treasure?heroCategory=piedras',
  gemas: '/treasure?heroCategory=gemas',
  lotes: '/treasure?heroCategory=lotes',
  joyas: '/treasure?heroCategory=joyas',
};

// =============================================================================
// COMPONENT
// =============================================================================

export const HeroGallery: React.FC = () => {
  const { t } = useLanguage();
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
    <Box component="section" aria-label={t.accessibility.imageGallery}>
      {/* Hero Image - Aspect-ratio based for full picture visibility */}
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          height: { xs: '55vw', sm: '45vw', md: '38vw' },
          maxHeight: { xs: '55vh', sm: '50vh', md: '45vh' },
          overflow: 'hidden',
        }}
      >
        {/* Background image with smooth crossfade + Ken Burns */}
        <AnimatePresence mode="popLayout">
          <motion.div
            key={currentImage.id}
            initial={{ opacity: 0, scale: 1.08 }}
            animate={{ opacity: 1, scale: 1.03 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              inset: 0,
            }}
          >
            {/* Slow zoom animation (Ken Burns) while image is active */}
            <motion.div
              animate={{ scale: [1.03, 1.08] }}
              transition={{ duration: AUTO_TRANSITION_INTERVAL / 1000, ease: 'linear' }}
              style={{ width: '100%', height: '100%' }}
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
          </motion.div>
        </AnimatePresence>

        {/* Gradient overlay — emerald-tinted bottom for brand feel */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(
              to bottom,
              rgba(0,0,0,0.15) 0%,
              rgba(0,0,0,0.05) 30%,
              rgba(0,0,0,0.3) 60%,
              rgba(0,20,14,0.75) 100%
            )`,
            pointerEvents: 'none',
          }}
        />

        {/* Subtle emerald vignette at bottom */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '40%',
            background: `linear-gradient(to top, ${emeraldAlpha(0.12)} 0%, transparent 100%)`,
            pointerEvents: 'none',
          }}
        />

        {/* Bottom section: Carousel dots + Category Tabs */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            pb: 2,
          }}
        >
          {/* Carousel Dots */}
          <Box
            role="tablist"
            aria-label="Galería de imágenes"
            sx={{
              display: 'flex',
              justifyContent: 'center',
              gap: 1,
              mb: 1.5,
            }}
          >
            {HERO_IMAGES.map((img, idx) => (
              <Box
                key={img.id}
                role="tab"
                tabIndex={0}
                aria-selected={idx === currentIndex}
                aria-label={`Imagen ${idx + 1} de ${HERO_IMAGES.length}`}
                onClick={() => setCurrentIndex(idx)}
                onKeyDown={(e: React.KeyboardEvent) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setCurrentIndex(idx);
                  } else if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    (e.currentTarget.nextElementSibling as HTMLElement)?.focus();
                  } else if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    (e.currentTarget.previousElementSibling as HTMLElement)?.focus();
                  }
                }}
                sx={{
                  // Opts out of the global border-box reset: the visible dot
                  // IS the content box (backgroundClip below), and the 19px
                  // padding forming the 44px touch target would otherwise
                  // clamp it to zero and render nothing. Safe because this is
                  // a leaf element — box-sizing:inherit has nothing to reach.
                  boxSizing: 'content-box',
                  width: idx === currentIndex ? 20 : 6,
                  height: 6,
                  borderRadius: 3,
                  bgcolor: idx === currentIndex
                    ? emeraldCore.primary
                    : whiteAlpha(0.4),
                  transition: cssTransition.slow,
                  cursor: 'pointer',
                  // 44px touch target via padding
                  p: '19px',
                  m: '-19px',
                  backgroundClip: 'content-box',
                  '&:hover': {
                    bgcolor: idx === currentIndex
                      ? emeraldCore.primary
                      : whiteAlpha(0.6),
                  },
                  '&:focus-visible': {
                    outline: `2px solid ${emeraldCore.primary}`,
                    outlineOffset: 2,
                  },
                }}
              />
            ))}
          </Box>

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
                gap: 0.75,
                p: 0.75,
                bgcolor: blackAlpha(0.4),
                backdropFilter: `blur(${blurValues['2xl']}) saturate(180%)`,
                WebkitBackdropFilter: `blur(${blurValues['2xl']}) saturate(180%)`,
                borderRadius: 3,
                border: `1px solid ${whiteAlpha(0.12)}`,
                boxShadow: `0 8px 32px ${blackAlpha(0.2)}, inset 0 1px 0 ${whiteAlpha(0.08)}`,
              }}
            >
              {ALL_CATEGORIES.map((cat) => (
                <Box
                  key={cat.id}
                  onClick={() => handleCategoryClick(cat.id)}
                  role="button"
                  tabIndex={0}
                  aria-label={cat.label}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleCategoryClick(cat.id); } }}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    px: { xs: 1.75, sm: 2, md: 2.5 },
                    py: { xs: 0.75, sm: 0.85 },
                    borderRadius: 2,
                    cursor: 'pointer',
                    transition: cssTransition.slow,
                    position: 'relative',
                    '&:hover': {
                      bgcolor: whiteAlpha(0.15),
                      '& .MuiTypography-root': {
                        color: 'white',
                      },
                    },
                    '&:active': {
                      transform: 'scale(0.96)',
                    },
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      color: whiteAlpha(0.85),
                      fontWeight: 600,
                      fontSize: { xs: '0.85rem', sm: '0.9rem', md: '0.95rem' },
                      letterSpacing: '0.02em',
                      transition: cssTransition.slow,
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
