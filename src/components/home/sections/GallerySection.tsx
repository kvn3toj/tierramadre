/**
 * GallerySection Component
 *
 * Horizontal scrolling gallery showcasing emerald gems and rings.
 * Features smooth scroll, category tabs, and lightbox preview.
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Typography,
  IconButton,
  Chip,
  Dialog,
  DialogContent,
} from '@mui/material';
import { ChevronLeft, ChevronRight, Close } from '@mui/icons-material';
import { emeraldCore } from '../../../design-system/tokens/colors';
import { fadeInUp, cardVariants } from '../../../theme/motionTokens';

// =============================================================================
// GALLERY DATA
// =============================================================================

interface GalleryImage {
  id: string;
  src: string;
  category: 'gems' | 'rings';
  alt: string;
}

const GALLERY_IMAGES: GalleryImage[] = [
  // Gems
  { id: 'gem-1', src: '/gallery/gems/_MG_2739.JPG', category: 'gems', alt: 'Esmeraldas colombianas talladas' },
  { id: 'gem-2', src: '/gallery/gems/_MG_2755.JPG', category: 'gems', alt: 'Esmeralda colombiana natural' },
  { id: 'gem-3', src: '/gallery/gems/_MG_2760.JPG', category: 'gems', alt: 'Gema esmeralda de Muzo' },
  { id: 'gem-4', src: '/gallery/gems/_MG_2995.JPG', category: 'gems', alt: 'Esmeralda en bruto' },
  { id: 'gem-5', src: '/gallery/gems/_MG_3008.JPG', category: 'gems', alt: 'Esmeralda colombiana certificada' },
  { id: 'gem-6', src: '/gallery/gems/_MG_3018.JPG', category: 'gems', alt: 'Cristal de esmeralda' },
  { id: 'gem-7', src: '/gallery/gems/_MG_3032.JPG', category: 'gems', alt: 'Esmeralda de alta calidad' },
  // Rings
  { id: 'ring-1', src: '/gallery/rings/_MG_2761.JPG', category: 'rings', alt: 'Anillo de esmeralda en oro' },
  { id: 'ring-2', src: '/gallery/rings/_MG_2762.JPG', category: 'rings', alt: 'Anillo de compromiso esmeralda' },
  { id: 'ring-3', src: '/gallery/rings/_MG_2765.JPG', category: 'rings', alt: 'Joya de esmeralda colombiana' },
  { id: 'ring-4', src: '/gallery/rings/_MG_2784.JPG', category: 'rings', alt: 'Anillo elegante con esmeralda' },
  { id: 'ring-5', src: '/gallery/rings/_MG_2787.JPG', category: 'rings', alt: 'Diseño exclusivo esmeralda' },
  { id: 'ring-6', src: '/gallery/rings/_MG_2789.JPG', category: 'rings', alt: 'Anillo artesanal esmeralda' },
  { id: 'ring-7', src: '/gallery/rings/_MG_2796.JPG', category: 'rings', alt: 'Sortija de esmeralda' },
  { id: 'ring-8', src: '/gallery/rings/_MG_2798.JPG', category: 'rings', alt: 'Anillo de lujo esmeralda' },
];

type CategoryFilter = 'all' | 'gems' | 'rings';

// =============================================================================
// COMPONENT
// =============================================================================

export const GallerySection: React.FC = () => {
  const [filter, setFilter] = useState<CategoryFilter>('all');
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Filter images
  const filteredImages = filter === 'all'
    ? GALLERY_IMAGES
    : GALLERY_IMAGES.filter(img => img.category === filter);

  // Scroll handlers
  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <>
      <Box sx={{ mb: 3 }} component="section" aria-labelledby="gallery-title">
        <motion.div variants={fadeInUp} initial="initial" animate="animate">
          {/* Header */}
          <Box sx={{ px: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography
                id="gallery-title"
                variant="h6"
                component="h2"
                sx={{ fontWeight: 600, color: 'var(--text-primary)' }}
              >
                Galeria
              </Typography>

              {/* Navigation arrows (desktop) */}
              <Box sx={{ display: { xs: 'none', sm: 'flex' }, gap: 0.5 }}>
                <IconButton
                  onClick={() => scroll('left')}
                  size="small"
                  sx={{
                    bgcolor: 'var(--surface-secondary)',
                    '&:hover': { bgcolor: 'var(--surface-tertiary)' },
                  }}
                >
                  <ChevronLeft fontSize="small" />
                </IconButton>
                <IconButton
                  onClick={() => scroll('right')}
                  size="small"
                  sx={{
                    bgcolor: 'var(--surface-secondary)',
                    '&:hover': { bgcolor: 'var(--surface-tertiary)' },
                  }}
                >
                  <ChevronRight fontSize="small" />
                </IconButton>
              </Box>
            </Box>

            {/* Category filters */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              {[
                { key: 'all' as CategoryFilter, label: 'Todos', count: GALLERY_IMAGES.length },
                { key: 'gems' as CategoryFilter, label: 'Gemas', count: GALLERY_IMAGES.filter(i => i.category === 'gems').length },
                { key: 'rings' as CategoryFilter, label: 'Anillos', count: GALLERY_IMAGES.filter(i => i.category === 'rings').length },
              ].map(({ key, label, count }) => (
                <Chip
                  key={key}
                  label={`${label} (${count})`}
                  size="small"
                  onClick={() => setFilter(key)}
                  sx={{
                    bgcolor: filter === key ? emeraldCore.primary : 'var(--surface-secondary)',
                    color: filter === key ? 'white' : 'var(--text-secondary)',
                    fontWeight: 500,
                    fontSize: '0.75rem',
                    '&:hover': {
                      bgcolor: filter === key ? emeraldCore.dark : 'var(--surface-tertiary)',
                    },
                  }}
                />
              ))}
            </Box>
          </Box>

          {/* Scrollable gallery */}
          <Box
            ref={scrollRef}
            sx={{
              display: 'flex',
              gap: 1.5,
              overflowX: 'auto',
              overflowY: 'hidden',
              px: 2,
              pb: 1,
              scrollSnapType: 'x mandatory',
              WebkitOverflowScrolling: 'touch',
              '&::-webkit-scrollbar': { display: 'none' },
              scrollbarWidth: 'none',
            }}
          >
            <AnimatePresence mode="popLayout">
              {filteredImages.map((image, index) => (
                <motion.div
                  key={image.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  style={{ scrollSnapAlign: 'start' }}
                >
                  <motion.div
                    variants={cardVariants}
                    whileHover="hover"
                    whileTap={{ scale: 0.98 }}
                  >
                    <Box
                      onClick={() => setSelectedImage(image)}
                      sx={{
                        width: 200,
                        height: 200,
                        borderRadius: 3,
                        overflow: 'hidden',
                        cursor: 'pointer',
                        position: 'relative',
                        flexShrink: 0,
                        bgcolor: 'var(--surface-secondary)',
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
                          transition: 'transform 0.3s ease-out',
                          '&:hover': {
                            transform: 'scale(1.05)',
                          },
                        }}
                      />

                      {/* Category badge */}
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 8,
                          left: 8,
                          bgcolor: 'rgba(0,0,0,0.6)',
                          backdropFilter: 'blur(4px)',
                          color: 'white',
                          px: 1,
                          py: 0.25,
                          borderRadius: 1,
                          fontSize: '0.65rem',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                        }}
                      >
                        {image.category === 'gems' ? 'Gema' : 'Anillo'}
                      </Box>
                    </Box>
                  </motion.div>
                </motion.div>
              ))}
            </AnimatePresence>
          </Box>

          {/* View all hint */}
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              textAlign: 'center',
              color: 'var(--text-tertiary)',
              mt: 1,
            }}
          >
            Desliza para ver mas fotos
          </Typography>
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
              bgcolor: 'rgba(0,0,0,0.9)',
              backdropFilter: 'blur(10px)',
            },
          },
        }}
      >
        <DialogContent sx={{ p: 0, position: 'relative' }}>
          {/* Close button */}
          <IconButton
            onClick={() => setSelectedImage(null)}
            sx={{
              position: 'absolute',
              top: -40,
              right: 0,
              color: 'white',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
            }}
          >
            <Close />
          </IconButton>

          {selectedImage && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
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
              <Typography
                variant="body2"
                sx={{
                  color: 'rgba(255,255,255,0.8)',
                  textAlign: 'center',
                  mt: 2,
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

export default GallerySection;
