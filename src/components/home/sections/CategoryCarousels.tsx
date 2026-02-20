/**
 * CategoryCarousels Component
 *
 * Liquid Glass Design - Horizontal pill tabs with single carousel
 * Inspired by Apple iOS 26 design language
 *
 * Designed by: Aria (UX/UI)
 */

import React, { useRef, useState } from 'react';
import { cssTransition } from '../../../design-system/tokens/motion';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Typography,
  IconButton,
  Dialog,
  DialogContent,
  alpha,
} from '@mui/material';
import { Close } from '@mui/icons-material';

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
  { id: 'ring-5', src: 'https://res.cloudinary.com/dyam6g2os/image/upload/v1765621955/tierramadre/gallery/rings/gdpu0dzc5r6la7phhpqq.jpg', alt: 'Diseño exclusivo esmeralda' },
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

const CATEGORIES = [
  { id: 'all' as CategoryType, label: 'Todo' },
  { id: 'rings' as CategoryType, label: 'Anillos' },
  { id: 'gems' as CategoryType, label: 'Gemas' },
];

// =============================================================================
// MAIN COMPONENT - Liquid Glass Tabs
// =============================================================================

export const CategoryCarousels: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<CategoryType>('all');
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Get images based on active category
  const getImages = (): GalleryImage[] => {
    switch (activeCategory) {
      case 'rings':
        return RINGS_IMAGES;
      case 'gems':
        return GEMS_IMAGES;
      default:
        return [...RINGS_IMAGES.slice(0, 3), ...GEMS_IMAGES.slice(0, 3)];
    }
  };

  const images = getImages();

  return (
    <>
      <Box component="section" aria-label="Galeria" sx={{ py: 3 }}>
        {/* Liquid Glass Pill Tabs */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            mb: 3,
            px: 2,
          }}
        >
          <Box
            sx={{
              display: 'inline-flex',
              gap: 0.5,
              p: 0.5,
              // Liquid Glass container
              bgcolor: 'rgba(255,255,255,0.08)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderRadius: 3,
              border: '1px solid rgba(255,255,255,0.1)',
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
                  px: 2.5,
                  py: 1,
                  borderRadius: 2.5,
                  cursor: 'pointer',
                  transition: cssTransition.default,
                  position: 'relative',
                  // Active state - Liquid Glass pill
                  ...(activeCategory === cat.id && {
                    bgcolor: 'rgba(255,255,255,0.15)',
                    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.2)',
                  }),
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    color: activeCategory === cat.id ? 'white' : 'rgba(255,255,255,0.5)',
                    fontWeight: activeCategory === cat.id ? 600 : 400,
                    fontSize: '0.85rem',
                    transition: cssTransition.default,
                  }}
                >
                  {cat.label}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Gallery Grid with Animation */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            <Box
              ref={scrollRef}
              sx={{
                display: 'flex',
                gap: 1.5,
                overflowX: 'auto',
                px: 2,
                pb: 1,
                scrollSnapType: 'x mandatory',
                '&::-webkit-scrollbar': { display: 'none' },
                scrollbarWidth: 'none',
              }}
            >
              {images.map((image, index) => (
                <motion.div
                  key={image.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  style={{ scrollSnapAlign: 'start', flexShrink: 0 }}
                >
                  <Box
                    onClick={() => setSelectedImage(image)}
                    sx={{
                      width: { xs: 140, sm: 160 },
                      height: { xs: 180, sm: 200 },
                      borderRadius: 3,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      position: 'relative',
                      // Liquid Glass border effect
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        inset: 0,
                        borderRadius: 3,
                        border: '1px solid rgba(255,255,255,0.15)',
                        zIndex: 1,
                        transition: 'border-color 0.2s ease',
                      },
                      '&:hover::before': {
                        borderColor: 'rgba(255,255,255,0.3)',
                      },
                      '&:active': {
                        transform: 'scale(0.98)',
                      },
                      transition: 'transform 0.15s ease',
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
              ))}
            </Box>
          </motion.div>
        </AnimatePresence>
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
              backdropFilter: 'blur(30px)',
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
              color: 'rgba(255,255,255,0.6)',
              '&:hover': { color: 'white' },
            }}
          >
            <Close />
          </IconButton>

          {selectedImage && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Box
                component="img"
                src={selectedImage.src}
                alt={selectedImage.alt}
                sx={{
                  maxWidth: '90vw',
                  maxHeight: '80vh',
                  objectFit: 'contain',
                  borderRadius: 2,
                }}
              />
            </motion.div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CategoryCarousels;
