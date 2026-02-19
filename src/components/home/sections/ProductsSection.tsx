/**
 * ProductsSection Component
 *
 * New products carousel with horizontal scroll, keyboard navigation,
 * and stagger animations.
 *
 * Designed by: Aria + Zeno
 */

import React, { useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Box,
  Typography,
  Card,
  CardMedia,
  CardContent,
  Button,
} from '@mui/material';
import { ArrowForward } from '@mui/icons-material';
import { emeraldCore } from '../../../design-system/tokens/colors';
import {
  whiteAlpha,
  blackAlpha,
  emeraldAlpha,
} from '../../../design-system';
import { textOnGlass } from '../../../design-system/utils/colorUtils';
import { useLanguage } from '../../../contexts/LanguageContext';
import { TreasureItem } from '../../../types';
import { fadeInUp, staggerContainer, staggerItem, cardVariants } from '../../../design-system/tokens/motion';

// =============================================================================
// TYPES
// =============================================================================

interface ProductsSectionProps {
  products: TreasureItem[];
}

// =============================================================================
// COMPONENT
// =============================================================================

export const ProductsSection: React.FC<ProductsSectionProps> = ({ products }) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keyboard navigation for carousel
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!scrollRef.current) return;

    const scrollAmount = 200;
    if (e.key === 'ArrowRight') {
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    } else if (e.key === 'ArrowLeft') {
      scrollRef.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    }
  }, []);

  const handleProductClick = useCallback((itemNumber: number | undefined) => {
    if (itemNumber) {
      navigate(`/product/${itemNumber}`);
    }
  }, [navigate]);

  const handleProductKeyDown = useCallback((e: React.KeyboardEvent, itemNumber: number | undefined) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleProductClick(itemNumber);
    }
  }, [handleProductClick]);

  if (products.length === 0) {
    return null;
  }

  return (
    <Box sx={{ pt: 2.5, px: 2, mb: 1 }} component="section" aria-labelledby="products-title">
      <motion.div variants={fadeInUp} initial="initial" animate="animate">
        {/* Section Container - refined glass with emerald tint */}
        <Box
          sx={{
            bgcolor: whiteAlpha(0.06),
            backdropFilter: 'blur(16px) saturate(180%)',
            WebkitBackdropFilter: 'blur(16px) saturate(180%)',
            borderRadius: 4,
            p: 2,
            border: `1px solid ${whiteAlpha(0.1)}`,
            boxShadow: `0 4px 24px ${blackAlpha(0.15)}, inset 0 1px 0 ${whiteAlpha(0.06)}`,
          }}
        >
          {/* Section Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {/* Emerald accent bar */}
              <Box
                sx={{
                  width: 3,
                  height: 20,
                  borderRadius: 1.5,
                  background: `linear-gradient(to bottom, ${emeraldCore.primary}, ${emeraldCore.dark})`,
                }}
              />
              <Typography
                id="products-title"
                variant="h6"
                component="h2"
                sx={{
                  fontWeight: 600,
                  color: textOnGlass.onDarkGlass.primary,
                  fontSize: { xs: '1rem', sm: '1.15rem' },
                  letterSpacing: '-0.01em',
                }}
              >
                {t.pages.home.newProducts}
              </Typography>
            </Box>
            <Button
              size="small"
              endIcon={<ArrowForward sx={{ fontSize: { xs: 14, sm: 16 } }} />}
              onClick={() => navigate('/treasure')}
              aria-label="Ver todos los tesoros"
              sx={{
                color: emeraldCore.light,
                fontSize: { xs: '0.75rem', sm: '0.8125rem' },
                fontWeight: 500,
                minWidth: 'auto',
                borderRadius: 2,
                px: 1.5,
                '&:hover': {
                  bgcolor: emeraldAlpha(0.1),
                },
              }}
            >
              Ver Todo
            </Button>
          </Box>

        {/* Carousel Container */}
        <Box
          ref={scrollRef}
          role="region"
          aria-label="Carrusel de nuevos productos. Usa las flechas izquierda y derecha para navegar."
          tabIndex={0}
          onKeyDown={handleKeyDown}
          sx={{
            display: 'flex',
            gap: 1.5,
            overflowX: 'auto',
            pb: 1,
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
            // Hide scrollbar
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
            // Focus styles
            '&:focus-visible': {
              outline: `2px solid ${emeraldCore.primary}`,
              outlineOffset: 4,
              borderRadius: 2,
            },
          }}
        >
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            style={{ display: 'flex', gap: 12 }}
          >
            {products.map((product, index) => (
              <motion.div
                key={product.item || index}
                variants={staggerItem}
                style={{ scrollSnapAlign: 'start' }}
              >
                <motion.div variants={cardVariants} whileHover="hover" whileTap="tap">
                  <Card
                    role="article"
                    tabIndex={0}
                    aria-label={`${product.nombre || 'Esmeralda'}, ${
                      typeof product.peso === 'number' ? `${product.peso} quilates` : product.peso
                    }`}
                    onClick={() => handleProductClick(product.item)}
                    onKeyDown={(e) => handleProductKeyDown(e, product.item)}
                    sx={{
                      minWidth: { xs: 140, sm: 160 },
                      maxWidth: { xs: 140, sm: 160 },
                      bgcolor: blackAlpha(0.3),
                      backdropFilter: 'blur(12px)',
                      cursor: 'pointer',
                      flexShrink: 0,
                      transition: 'all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)',
                      border: `1px solid ${whiteAlpha(0.08)}`,
                      borderRadius: 3,
                      overflow: 'hidden',
                      '&:focus-visible': {
                        outline: `3px solid ${emeraldCore.primary}`,
                        outlineOffset: 2,
                      },
                      '&:hover': {
                        boxShadow: `0 8px 32px ${emeraldAlpha(0.2)}, 0 0 0 1px ${emeraldAlpha(0.15)}`,
                        bgcolor: blackAlpha(0.4),
                        borderColor: emeraldAlpha(0.2),
                      },
                    }}
                  >
                    {/* Image with subtle gradient overlay */}
                    <Box sx={{ position: 'relative' }}>
                      <CardMedia
                        component="img"
                        sx={{
                          height: { xs: 110, sm: 130 },
                          objectFit: 'cover',
                        }}
                        image={product.imagen || '/placeholder-emerald.jpg'}
                        alt={product.nombre || 'Esmeralda colombiana'}
                        loading="eager"
                      />
                      {/* Subtle bottom gradient for text readability */}
                      <Box
                        sx={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          height: '40%',
                          background: 'linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 100%)',
                          pointerEvents: 'none',
                        }}
                      />
                    </Box>
                    <CardContent sx={{ p: { xs: 1.25, sm: 1.5 }, bgcolor: 'transparent' }}>
                      <Typography
                        variant="body2"
                        component="h3"
                        sx={{
                          fontWeight: 600,
                          color: textOnGlass.onDarkGlass.primary,
                          fontSize: { xs: '0.8rem', sm: '0.875rem' },
                          letterSpacing: '-0.01em',
                        }}
                        noWrap
                      >
                        {product.nombre || `Esmeralda #${product.item}`}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: emeraldCore.light,
                          fontSize: { xs: '0.7rem', sm: '0.75rem' },
                          fontWeight: 500,
                        }}
                      >
                        {typeof product.peso === 'number' ? `${product.peso} ct` : product.peso}
                      </Typography>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            ))}
          </motion.div>
        </Box>

          {/* Keyboard Navigation Hint (screen reader only) */}
          <Box sx={{ position: 'absolute', left: -10000, width: 1, height: 1, overflow: 'hidden' }}>
            <p>Usa las flechas izquierda y derecha para navegar entre productos</p>
          </Box>
        </Box>
      </motion.div>
    </Box>
  );
};

export default ProductsSection;
