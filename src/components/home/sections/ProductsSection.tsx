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
import { useLanguage } from '../../../contexts/LanguageContext';
import { InventoryItem } from '../../../types';
import { fadeInUp, staggerContainer, staggerItem, cardVariants } from '../../../theme/motionTokens';

// =============================================================================
// TYPES
// =============================================================================

interface ProductsSectionProps {
  products: InventoryItem[];
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
    <Box sx={{ px: 2, mb: 2 }} component="section" aria-labelledby="products-title">
      <motion.div variants={fadeInUp} initial="initial" animate="animate">
        {/* Section Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography
            id="products-title"
            variant="h6"
            component="h2"
            sx={{ fontWeight: 600, color: 'var(--text-primary)' }}
          >
            {t.pages.home.newProducts}
          </Typography>
          <Button
            size="small"
            endIcon={<ArrowForward />}
            onClick={() => navigate('/inventory')}
            aria-label="Ver todo el inventario"
            sx={{ color: emeraldCore.primary }}
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
                      minWidth: 160,
                      maxWidth: 160,
                      bgcolor: 'var(--surface-secondary)',
                      cursor: 'pointer',
                      flexShrink: 0,
                      transition: 'all 0.2s ease-out',
                      '&:focus-visible': {
                        outline: `3px solid ${emeraldCore.primary}`,
                        outlineOffset: 2,
                      },
                      '&:hover': {
                        boxShadow: '0 8px 24px rgba(0, 174, 122, 0.15)',
                      },
                    }}
                  >
                    <CardMedia
                      component="img"
                      height="120"
                      image={product.imagen || '/placeholder-emerald.jpg'}
                      alt={product.nombre || 'Esmeralda colombiana'}
                      loading="lazy"
                      sx={{ objectFit: 'cover' }}
                    />
                    <CardContent sx={{ p: 1.5 }}>
                      <Typography
                        variant="body2"
                        component="h3"
                        sx={{ fontWeight: 600, color: 'var(--text-primary)' }}
                        noWrap
                      >
                        {product.nombre || `Esmeralda #${product.item}`}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>
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
      </motion.div>
    </Box>
  );
};

export default ProductsSection;
