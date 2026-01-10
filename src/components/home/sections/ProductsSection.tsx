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
  opacity,
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
    <Box sx={{ px: 2, mb: 3 }} component="section" aria-labelledby="products-title">
      <motion.div variants={fadeInUp} initial="initial" animate="animate">
        {/* Section Container - using design system glass tokens */}
        <Box
          sx={{
            bgcolor: whiteAlpha(opacity.light),
            backdropFilter: 'blur(10px)',
            borderRadius: 3,
            p: 2,
            border: `1px solid ${whiteAlpha(opacity.soft)}`,
          }}
        >
          {/* Section Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Typography
              id="products-title"
              variant="h6"
              component="h2"
              sx={{
                fontWeight: 600,
                color: textOnGlass.onDarkGlass.primary, // iOS HIG compliant contrast
                fontSize: { xs: '1rem', sm: '1.25rem' },
              }}
            >
              {t.pages.home.newProducts}
            </Typography>
            <Button
              size="small"
              endIcon={<ArrowForward sx={{ fontSize: { xs: 16, sm: 20 } }} />}
              onClick={() => navigate('/treasure')}
              aria-label="Ver todos los tesoros"
              sx={{
                color: textOnGlass.emeraldAccent.onDark, // High contrast emerald on dark
                fontSize: { xs: '0.75rem', sm: '0.8125rem' },
                minWidth: 'auto',
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
            gap: 2,
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
            style={{ display: 'flex', gap: 16 }}
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
                      bgcolor: blackAlpha(opacity.overlay),
                      backdropFilter: 'blur(10px)',
                      cursor: 'pointer',
                      flexShrink: 0,
                      transition: 'all 0.2s ease-out',
                      border: `1px solid ${whiteAlpha(opacity.soft)}`,
                      '&:focus-visible': {
                        outline: `3px solid ${emeraldCore.primary}`,
                        outlineOffset: 2,
                      },
                      '&:hover': {
                        boxShadow: `0 8px 24px ${emeraldAlpha(opacity.regular)}`,
                        bgcolor: blackAlpha(opacity.half),
                      },
                    }}
                  >
                    <CardMedia
                      component="img"
                      sx={{
                        height: { xs: 100, sm: 120 },
                        objectFit: 'cover',
                      }}
                      image={product.imagen || '/placeholder-emerald.jpg'}
                      alt={product.nombre || 'Esmeralda colombiana'}
                      loading="lazy"
                    />
                    <CardContent sx={{ p: { xs: 1, sm: 1.5 }, bgcolor: 'transparent' }}>
                      <Typography
                        variant="body2"
                        component="h3"
                        sx={{
                          fontWeight: 600,
                          color: textOnGlass.onDarkGlass.primary, // WCAG AA: ~18:1 contrast
                          fontSize: { xs: '0.8rem', sm: '0.875rem' },
                        }}
                        noWrap
                      >
                        {product.nombre || `Esmeralda #${product.item}`}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: textOnGlass.onDarkGlass.secondary, // WCAG AA: ~12:1 contrast
                          fontSize: { xs: '0.7rem', sm: '0.75rem' },
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
