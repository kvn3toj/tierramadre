/**
 * CategoryCarousels Component
 *
 * Elegant dual carousels for Rings and Gems categories.
 * Premium design with refined animations and typography.
 *
 * Designed by: Aria (UX/UI)
 */

import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Typography,
  IconButton,
  Dialog,
  DialogContent,
  alpha,
} from '@mui/material';
import { KeyboardArrowLeft, KeyboardArrowRight, Close } from '@mui/icons-material';
import { fadeInUp } from '../../../design-system/tokens/motion';
import { goldAccent, surfacesDark } from '../../../design-system/tokens/colors';

// Accent colors for carousels
const GOLD_CAROUSEL_ACCENT = goldAccent.primary;
const TEAL_CAROUSEL_ACCENT = '#4ECDC4';

// =============================================================================
// GALLERY DATA
// =============================================================================

interface GalleryImage {
  id: string;
  src: string;
  alt: string;
}

const RINGS_IMAGES: GalleryImage[] = [
  { id: 'ring-1', src: 'https://res.cloudinary.com/dyam6g2os/image/upload/v1765621934/tierramadre/gallery/rings/e3qpw4wsyzcakmmsujny.jpg', alt: 'Anillo de esmeralda en oro' },
  { id: 'ring-2', src: 'https://res.cloudinary.com/dyam6g2os/image/upload/v1765621937/tierramadre/gallery/rings/srwbqwvnqropetlnxics.jpg', alt: 'Anillo de compromiso esmeralda' },
  { id: 'ring-3', src: 'https://res.cloudinary.com/dyam6g2os/image/upload/v1765621941/tierramadre/gallery/rings/wkzofxy8mm1sbhhxaomr.jpg', alt: 'Joya de esmeralda colombiana' },
  { id: 'ring-4', src: 'https://res.cloudinary.com/dyam6g2os/image/upload/v1765621944/tierramadre/gallery/rings/esgn24ccuncy6ioj8dxs.jpg', alt: 'Anillo elegante con esmeralda' },
  { id: 'ring-5', src: 'https://res.cloudinary.com/dyam6g2os/image/upload/v1765621955/tierramadre/gallery/rings/gdpu0dzc5r6la7phhpqq.jpg', alt: 'Diseno exclusivo esmeralda' },
  { id: 'ring-6', src: 'https://res.cloudinary.com/dyam6g2os/image/upload/v1765621959/tierramadre/gallery/rings/sl1qmwz8p6qdkhpygbl4.jpg', alt: 'Anillo artesanal esmeralda' },
  { id: 'ring-7', src: 'https://res.cloudinary.com/dyam6g2os/image/upload/v1765621963/tierramadre/gallery/rings/skoytaj1ap1jfezmrtzi.jpg', alt: 'Sortija de esmeralda' },
  { id: 'ring-8', src: 'https://res.cloudinary.com/dyam6g2os/image/upload/v1765621966/tierramadre/gallery/rings/vpeir3hvfvsg0kf4ggao.jpg', alt: 'Anillo de lujo esmeralda' },
];

const GEMS_IMAGES: GalleryImage[] = [
  { id: 'gem-1', src: 'https://res.cloudinary.com/dyam6g2os/image/upload/v1765621976/tierramadre/gallery/gems/koso3gazzgfiakzg867r.jpg', alt: 'Esmeraldas colombianas talladas' },
  { id: 'gem-2', src: 'https://res.cloudinary.com/dyam6g2os/image/upload/v1765621979/tierramadre/gallery/gems/nf72nnwamaeaydlvekjn.jpg', alt: 'Esmeralda colombiana natural' },
  { id: 'gem-3', src: 'https://res.cloudinary.com/dyam6g2os/image/upload/v1765621983/tierramadre/gallery/gems/vlcterrk9pswpq7wjvul.jpg', alt: 'Gema esmeralda de Muzo' },
  { id: 'gem-4', src: 'https://res.cloudinary.com/dyam6g2os/image/upload/v1765621985/tierramadre/gallery/gems/ipbvodghinx8pvj2tkqd.jpg', alt: 'Esmeralda en bruto' },
  { id: 'gem-5', src: 'https://res.cloudinary.com/dyam6g2os/image/upload/v1765621993/tierramadre/gallery/gems/dts274s0djtlg927nlpx.jpg', alt: 'Esmeralda colombiana certificada' },
  { id: 'gem-6', src: 'https://res.cloudinary.com/dyam6g2os/image/upload/v1765621994/tierramadre/gallery/gems/nehgse3q1l7ue2brj3qe.jpg', alt: 'Cristal de esmeralda' },
  { id: 'gem-7', src: 'https://res.cloudinary.com/dyam6g2os/image/upload/v1765621995/tierramadre/gallery/gems/unfqzjvlyuz0ffxgqz6q.jpg', alt: 'Esmeralda de alta calidad' },
];

// =============================================================================
// SINGLE CAROUSEL COMPONENT
// =============================================================================

interface SingleCarouselProps {
  title: string;
  subtitle: string;
  images: GalleryImage[];
  accentColor: string;
  onImageClick: (image: GalleryImage) => void;
}

const SingleCarousel: React.FC<SingleCarouselProps> = ({
  title,
  subtitle,
  images,
  accentColor,
  onImageClick
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Center the carousel on first image on mount
  React.useEffect(() => {
    if (scrollRef.current) {
      // Small delay to ensure images are loaded
      const timer = setTimeout(() => {
        scrollRef.current?.scrollTo({ left: 0, behavior: 'instant' });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const cardWidth = 180; // Fixed scroll amount for consistency
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -cardWidth : cardWidth,
        behavior: 'smooth',
      });
    }
  };

  return (
    <Box sx={{
      flex: 1,
      minWidth: 0,
      width: '100%',
      // iPad/desktop: allow natural width distribution
      maxWidth: { xs: '100%', md: '50%', lg: '50%' },
      // Landscape phone: smaller max-width
      '@media (orientation: landscape) and (max-height: 500px)': {
        maxWidth: '50%',
      },
    }}>
      {/* Elegant Header */}
      <Box sx={{
        textAlign: 'center',
        mb: 2,
        px: 2,
        // Landscape phone: compact header
        '@media (orientation: landscape) and (max-height: 500px)': {
          mb: 1,
        },
      }}>
        <Typography
          variant="overline"
          sx={{
            color: accentColor,
            letterSpacing: '0.3em',
            fontSize: '0.65rem',
            fontWeight: 500,
            display: 'block',
            mb: 0.5,
          }}
        >
          {subtitle}
        </Typography>
        <Typography
          variant="h6"
          sx={{
            color: surfacesDark.text.primary,
            fontWeight: 300,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            fontSize: '1.1rem',
          }}
        >
          {title}
        </Typography>

        {/* Elegant divider */}
        <Box
          sx={{
            width: 40,
            height: 1,
            bgcolor: accentColor,
            mx: 'auto',
            mt: 1.5,
            opacity: 0.6,
          }}
        />
      </Box>

      {/* Carousel with navigation */}
      <Box sx={{ position: 'relative' }}>
        {/* Left Arrow */}
        <IconButton
          onClick={() => scroll('left')}
          sx={{
            position: 'absolute',
            left: 4,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 3,
            color: surfacesDark.text.primary,
            bgcolor: alpha('#000000', 0.5),
            backdropFilter: 'blur(8px)',
            width: 36,
            height: 36,
            '&:hover': {
              bgcolor: alpha('#000000', 0.7),
            },
          }}
        >
          <KeyboardArrowLeft />
        </IconButton>

        {/* Right Arrow */}
        <IconButton
          onClick={() => scroll('right')}
          sx={{
            position: 'absolute',
            right: 4,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 3,
            color: surfacesDark.text.primary,
            bgcolor: alpha('#000000', 0.5),
            backdropFilter: 'blur(8px)',
            width: 36,
            height: 36,
            '&:hover': {
              bgcolor: alpha('#000000', 0.7),
            },
          }}
        >
          <KeyboardArrowRight />
        </IconButton>

        {/* Edge Fade - Left */}
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 60,
            background: `linear-gradient(to right, ${alpha('#000000', 0.8)} 0%, transparent 100%)`,
            zIndex: 2,
            pointerEvents: 'none',
          }}
        />

        {/* Edge Fade - Right */}
        <Box
          sx={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: 60,
            background: `linear-gradient(to left, ${alpha('#000000', 0.8)} 0%, transparent 100%)`,
            zIndex: 2,
            pointerEvents: 'none',
          }}
        />

        {/* Scrollable Container */}
        <Box
          ref={scrollRef}
          sx={{
            display: 'flex',
            gap: { xs: 1.5, md: 2 },
            overflowX: 'auto',
            overflowY: 'hidden',
            px: { xs: 4, md: 5 },
            py: { xs: 1, md: 2 },
            scrollSnapType: 'x mandatory',
            scrollBehavior: 'smooth',
            '&::-webkit-scrollbar': { display: 'none' },
            scrollbarWidth: 'none',
            // Ensure content is visible from start
            justifyContent: { md: 'flex-start' },
          }}
        >
          {images.map((image, index) => (
            <motion.div
              key={image.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.4 }}
              style={{ scrollSnapAlign: 'center', flexShrink: 0 }}
            >
              <motion.div
                whileHover={{ y: -8 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.3 }}
              >
                <Box
                  onClick={() => onImageClick(image)}
                  sx={{
                    width: { xs: 130, sm: 150, md: 180, lg: 200 },
                    height: { xs: 160, sm: 190, md: 230, lg: 260 },
                    // Landscape phone: smaller images
                    '@media (orientation: landscape) and (max-height: 500px)': {
                      width: 100,
                      height: 120,
                    },
                    borderRadius: 1,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    position: 'relative',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      inset: 0,
                      border: '1px solid',
                      borderColor: alpha('#FFFFFF', 0.1),
                      borderRadius: 1,
                      zIndex: 1,
                      transition: 'border-color 0.3s ease',
                    },
                    '&:hover::before': {
                      borderColor: accentColor,
                    },
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: '40%',
                      background: `linear-gradient(to top, ${alpha('#000000', 0.6)} 0%, transparent 100%)`,
                      zIndex: 1,
                      opacity: 0,
                      transition: 'opacity 0.3s ease',
                    },
                    '&:hover::after': {
                      opacity: 1,
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
                      transition: 'transform 0.5s ease',
                      '&:hover': {
                        transform: 'scale(1.05)',
                      },
                    }}
                  />
                </Box>
              </motion.div>
            </motion.div>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const CategoryCarousels: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);

  return (
    <>
      <Box component="section" aria-label="Galeria de esmeraldas" sx={{ py: 2, px: { xs: 0, md: 2, lg: 4 } }}>
        <motion.div variants={fadeInUp} initial="initial" animate="animate">
          {/* Two carousels - responsive for landscape */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              gap: { xs: 4, md: 2, lg: 4 },
              alignItems: 'stretch',
              justifyContent: 'center',
              // Landscape phone: show in row
              '@media (orientation: landscape) and (max-height: 500px)': {
                flexDirection: 'row',
                gap: 2,
              },
            }}
          >
            {/* Rings Carousel */}
            <SingleCarousel
              title="Anillos"
              subtitle="Coleccion"
              images={RINGS_IMAGES}
              accentColor={GOLD_CAROUSEL_ACCENT}
              onImageClick={setSelectedImage}
            />

            {/* Vertical Divider (desktop + landscape) */}
            <Box
              sx={{
                display: { xs: 'none', md: 'flex' },
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                px: 1,
                // Show in landscape on phones too
                '@media (orientation: landscape) and (max-height: 500px)': {
                  display: 'flex',
                  px: 0.5,
                },
              }}
            >
              <Box
                sx={{
                  width: 1,
                  height: '60%',
                  bgcolor: alpha('#FFFFFF', 0.15),
                  borderRadius: 1,
                }}
              />
            </Box>

            {/* Gems Carousel */}
            <SingleCarousel
              title="Gemas"
              subtitle="Seleccion"
              images={GEMS_IMAGES}
              accentColor={TEAL_CAROUSEL_ACCENT}
              onImageClick={setSelectedImage}
            />
          </Box>
        </motion.div>
      </Box>

      {/* Lightbox Dialog */}
      <Dialog
        open={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        maxWidth="lg"
        PaperProps={{
          sx: {
            bgcolor: 'transparent',
            boxShadow: 'none',
            overflow: 'visible',
          },
        }}
        slotProps={{
          backdrop: {
            sx: {
              bgcolor: alpha('#000000', 0.95),
              backdropFilter: 'blur(20px)',
            },
          },
        }}
      >
        <DialogContent sx={{ p: 0, position: 'relative' }}>
          <IconButton
            onClick={() => setSelectedImage(null)}
            sx={{
              position: 'absolute',
              top: -50,
              right: 0,
              color: alpha('#FFFFFF', 0.7),
              '&:hover': {
                color: surfacesDark.text.primary,
                bgcolor: 'transparent',
              },
            }}
          >
            <Close />
          </IconButton>

          {selectedImage && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              <Box
                component="img"
                src={selectedImage.src}
                alt={selectedImage.alt}
                sx={{
                  maxWidth: '90vw',
                  maxHeight: '85vh',
                  objectFit: 'contain',
                  borderRadius: 0.5,
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  color: alpha('#FFFFFF', 0.5),
                  textAlign: 'center',
                  display: 'block',
                  mt: 2,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  fontSize: '0.7rem',
                }}
              >
                {selectedImage.alt}
              </Typography>
            </motion.div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CategoryCarousels;
