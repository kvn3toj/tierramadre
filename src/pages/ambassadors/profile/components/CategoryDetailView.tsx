/**
 * CategoryDetailView Component
 * Shows products within a selected category with quality filter chips.
 */

import { useState, useMemo } from 'react';
import { Box, Typography, Chip, IconButton, alpha, useTheme } from '@mui/material';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '../../../../contexts/LanguageContext';
import {
  emeraldCore,
  cssTransition,
  blurValues,
} from '../../../../design-system';
import { useReducedMotion } from '../../../../hooks/useReducedMotion';
import { getQualityTiers } from '../../../../utils/productCategories';
import { ProductListCard } from './ProductListCard';
import type { ProductCategory } from '../../../../utils/productCategories';
import type { TreasureItem } from '../../../../types';

interface CategoryDetailViewProps {
  category: ProductCategory;
  onBack: () => void;
  onProductClick: (item: TreasureItem) => void;
}

export function CategoryDetailView({ category, onBack, onProductClick }: CategoryDetailViewProps) {
  const theme = useTheme();
  const { t } = useLanguage();
  const isLight = theme.palette.mode === 'light';
  const prefersReducedMotion = useReducedMotion();
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const qualityTiers = useMemo(() => getQualityTiers(category.items), [category.items]);

  const filteredItems = useMemo(() => {
    if (activeFilter === 'all') return category.items;
    return category.items.filter(item => item.calidad === activeFilter);
  }, [category.items, activeFilter]);

  const categoryLabels: Record<string, string> = {
    joyas: t.ambassador.museum?.joyas ?? 'Joyas',
    gemas: t.ambassador.museum?.gemas ?? 'Gemas',
    piedras: t.ambassador.museum?.piedras ?? 'Piedras',
    lotes: t.ambassador.museum?.lotes ?? 'Lotes',
  };

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={prefersReducedMotion ? undefined : { opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <IconButton
          onClick={onBack}
          aria-label={t.actions.back}
          sx={{
            bgcolor: isLight
              ? alpha('#000', 0.04)
              : alpha('#fff', 0.06),
            backdropFilter: `blur(${blurValues.md})`,
            width: 36,
            height: 36,
            '&:hover': {
              bgcolor: isLight
                ? alpha('#000', 0.08)
                : alpha('#fff', 0.1),
            },
          }}
        >
          <ArrowLeft size={18} />
        </IconButton>
        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
          {categoryLabels[category.key] || category.label}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', ml: 'auto' }}>
          {filteredItems.length} {t.ambassador.museum?.items ?? 'productos'}
        </Typography>
      </Box>

      {/* Filter Chips */}
      {qualityTiers.length > 1 && (
        <Box
          sx={{
            display: 'flex',
            gap: 0.75,
            mb: 2,
            overflowX: 'auto',
            pb: 0.5,
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          <Chip
            label={t.common.all}
            size="small"
            onClick={() => setActiveFilter('all')}
            sx={{
              fontWeight: 600,
              fontSize: '0.72rem',
              transition: cssTransition.default,
              ...(activeFilter === 'all'
                ? {
                    bgcolor: emeraldCore.primary,
                    color: '#fff',
                    '&:hover': { bgcolor: emeraldCore.dark },
                  }
                : {
                    bgcolor: isLight
                      ? alpha(emeraldCore.primary, 0.08)
                      : alpha(emeraldCore.primary, 0.12),
                    color: emeraldCore.primary,
                  }),
            }}
          />
          {qualityTiers.map((tier) => (
            <Chip
              key={tier}
              label={tier}
              size="small"
              onClick={() => setActiveFilter(tier)}
              sx={{
                fontWeight: 600,
                fontSize: '0.72rem',
                flexShrink: 0,
                transition: cssTransition.default,
                ...(activeFilter === tier
                  ? {
                      bgcolor: emeraldCore.primary,
                      color: '#fff',
                      '&:hover': { bgcolor: emeraldCore.dark },
                    }
                  : {
                      bgcolor: isLight
                        ? alpha('#000', 0.04)
                        : alpha('#fff', 0.06),
                      color: 'text.secondary',
                    }),
              }}
            />
          ))}
        </Box>
      )}

      {/* Product List */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {filteredItems.map((item, index) => (
          <motion.div
            key={item.item}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03, duration: 0.2 }}
          >
            <ProductListCard item={item} onClick={onProductClick} />
          </motion.div>
        ))}
      </Box>

      {filteredItems.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
            {t.common.noResults}
          </Typography>
        </Box>
      )}
    </motion.div>
  );
}

export default CategoryDetailView;
