/**
 * HeroGallery Component
 *
 * Liquid Glass Design - Hero + Gallery merged
 * Clicking thumbnails changes the hero background
 * Inspired by Apple iOS 26 design language
 *
 * Designed by: Aria + Eunoia + Moksart
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, Typography } from '@mui/material';
import {
  overlays,
  thumbnailStates,
  whiteAlpha,
  blackAlpha,
  opacity,
} from '../../../design-system';

// Auto-transition interval (ms)
const AUTO_TRANSITION_INTERVAL = 6000;

// =============================================================================
// GALLERY DATA
// =============================================================================

interface GalleryImage {
  id: string;
  src: string;
  alt: string;
}

type CategoryType = 'rings' | 'gems' | 'all';

const RINGS_IMAGES: GalleryImage[] = [
  { id: 'ring-1', src: 'https://res.cloudinary.com/dyam6g2os/image/upload/v1765621934/tierramadre/gallery/rings/e3qpw4wsyzcakmmsujny.jpg', alt: 'Anillo de esmeralda en oro' },
  { id: 'ring-2', src: 'https://res.cloudinary.com/dyam6g2os/image/upload/v1765621937/tierramadre/gallery/rings/srwbqwvnqropetlnxics.jpg', alt: 'Anillo de compromiso esmeralda' },
  { id: 'ring-3', src: 'https://res.cloudinary.com/dyam6g2os/image/upload/v1765621941/tierramadre/gallery/rings/wkzofxy8mm1sbhhxaomr.jpg', alt: 'Joya de esmeralda colombiana' },
  { id: 'ring-4', src: 'https://res.cloudinary.com/dyam6g2os/image/upload/v1765621944/tierramadre/gallery/rings/esgn24ccuncy6ioj8dxs.jpg', alt: 'Anillo elegante con esmeralda' },
  { id: 'ring-5', src: 'https://res.cloudinary.com/dyam6g2os/image/upload/v1765621955/tierramadre/gallery/rings/gdpu0dzc5r6la7phhpqq.jpg', alt: 'Diseno exclusivo esmeralda' },
  { id: 'ring-6', src: 'https://res.cloudinary.com/dyam6g2os/image/upload/v1765621959/tierramadre/gallery/rings/sl1qmwz8p6qdkhpygbl4.jpg', alt: 'Anillo artesanal esmeralda' },
];

const GEMS_IMAGES: GalleryImage[] = [
  { id: 'gem-1', src: 'https://res.cloudinary.com/dyam6g2os/image/upload/v1765621976/tierramadre/gallery/gems/koso3gazzgfiakzg867r.jpg', alt: 'Esmeraldas colombianas talladas' },
  { id: 'gem-2', src: 'https://res.cloudinary.com/dyam6g2os/image/upload/v1765621979/tierramadre/gallery/gems/nf72nnwamaeaydlvekjn.jpg', alt: 'Esmeralda colombiana natural' },
  { id: 'gem-3', src: 'https://res.cloudinary.com/dyam6g2os/image/upload/v1765621983/tierramadre/gallery/gems/vlcterrk9pswpq7wjvul.jpg', alt: 'Gema esmeralda de Muzo' },
  { id: 'gem-4', src: 'https://res.cloudinary.com/dyam6g2os/image/upload/v1765621985/tierramadre/gallery/gems/ipbvodghinx8pvj2tkqd.jpg', alt: 'Esmeralda en bruto' },
  { id: 'gem-5', src: 'https://res.cloudinary.com/dyam6g2os/image/upload/v1765621993/tierramadre/gallery/gems/dts274s0djtlg927nlpx.jpg', alt: 'Esmeralda colombiana certificada' },
  { id: 'gem-6', src: 'https://res.cloudinary.com/dyam6g2os/image/upload/v1765621994/tierramadre/gallery/gems/nehgse3q1l7ue2brj3qe.jpg', alt: 'Cristal de esmeralda' },
];

const ALL_IMAGES = [...GEMS_IMAGES.slice(0, 3), ...RINGS_IMAGES.slice(0, 3)];

const CATEGORIES = [
  { id: 'all' as CategoryType, label: 'Todo' },
  { id: 'rings' as CategoryType, label: 'Anillos' },
  { id: 'gems' as CategoryType, label: 'Gemas' },
];

// =============================================================================
// COMPONENT - Hero + Gallery merged
// =============================================================================

export const HeroGallery: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<CategoryType>('all');
  const [heroImage, setHeroImage] = useState<GalleryImage>(GEMS_IMAGES[0]);
  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Get images based on active category
  const getImages = useCallback((): GalleryImage[] => {
    switch (activeCategory) {
      case 'rings':
        return RINGS_IMAGES;
      case 'gems':
        return GEMS_IMAGES;
      default:
        return ALL_IMAGES;
    }
  }, [activeCategory]);

  const images = getImages();

  // Auto-transition effect
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      const currentImages = getImages();
      const currentIndex = currentImages.findIndex(img => img.id === heroImage.id);
      const nextIndex = (currentIndex + 1) % currentImages.length;
      setHeroImage(currentImages[nextIndex]);
    }, AUTO_TRANSITION_INTERVAL);

    return () => clearInterval(interval);
  }, [heroImage.id, isPaused, getImages]);

  // Pause auto-transition when user interacts
  const handleImageClick = (image: GalleryImage) => {
    setHeroImage(image);
    setIsPaused(true);
    // Resume after 10 seconds of no interaction
    setTimeout(() => setIsPaused(false), 10000);
  };

  // Reset hero image when category changes
  useEffect(() => {
    const newImages = getImages();
    if (!newImages.find(img => img.id === heroImage.id)) {
      setHeroImage(newImages[0]);
    }
  }, [activeCategory, getImages, heroImage.id]);

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
              component="img"
              src={heroImage.src}
              alt={heroImage.alt}
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center',
              }}
            />
          </motion.div>
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

        {/* Bottom section: Tabs + Thumbnails */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            pb: 2,
          }}
        >
          {/* Category Pill Tabs */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              mb: 2,
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
              {CATEGORIES.map((cat) => (
                <Box
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setActiveCategory(cat.id)}
                  sx={{
                    px: 2,
                    py: 0.75,
                    borderRadius: 2,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    ...(activeCategory === cat.id && {
                      bgcolor: overlays.pill.active.bg,
                    }),
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      color: activeCategory === cat.id ? 'white' : whiteAlpha(opacity.muted),
                      fontWeight: activeCategory === cat.id ? 600 : 400,
                      fontSize: '0.8rem',
                    }}
                  >
                    {cat.label}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Thumbnail Carousel - Centered */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCategory}
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
                  const isActive = heroImage.id === image.id;
                  return (
                    <motion.div
                      key={image.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.03 }}
                      style={{ scrollSnapAlign: 'start', flexShrink: 0 }}
                    >
                      <Box
                        onClick={() => handleImageClick(image)}
                        sx={{
                          width: 56,
                          height: 56,
                          borderRadius: 2,
                          overflow: 'hidden',
                          cursor: 'pointer',
                          position: 'relative',
                          border: isActive
                            ? thumbnailStates.active.border
                            : '2px solid transparent',
                          opacity: isActive ? 1 : 0.7,
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            opacity: 1,
                            border: thumbnailStates.hover.border,
                          },
                        }}
                      >
                        <Box
                          component="img"
                          src={image.src}
                          alt={image.alt}
                          loading="lazy"
                          sx={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
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
    </Box>
  );
};

export default HeroGallery;
