/**
 * CategoryDetailView Component
 * Shows products within a selected category with quality filter chips.
 */

import { useState, useMemo } from 'react';
import { Box, Typography, Chip, IconButton } from '@mui/material';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '../../../../contexts/LanguageContext';
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
  const { t } = useLanguage();
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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, px: { xs: 0, sm: 0.5 } }}>
        <IconButton
          onClick={onBack}
          aria-label={t.actions.back}
          sx={{
            bgcolor: 'var(--tm-well)',
            border: '1px solid var(--tm-border)',
            color: 'var(--tm-text)',
            width: 36,
            height: 36,
            '&:hover': {
              bgcolor: 'var(--tm-well)',
              borderColor: 'var(--tm-accent)',
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
              transition: 'background-color var(--tm-base) var(--tm-ease)',
              ...(activeFilter === 'all'
                ? {
                    bgcolor: 'var(--tm-accent-strong)',
                    color: 'var(--tm-on-accent)',
                    '&:hover': { bgcolor: 'var(--tm-accent)' },
                  }
                : {
                    bgcolor: 'var(--tm-accent-wash)',
                    color: 'var(--tm-accent)',
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
                transition: 'background-color var(--tm-base) var(--tm-ease)',
                ...(activeFilter === tier
                  ? {
                      bgcolor: 'var(--tm-accent-strong)',
                      color: 'var(--tm-on-accent)',
                      '&:hover': { bgcolor: 'var(--tm-accent)' },
                    }
                  : {
                      bgcolor: 'var(--tm-well)',
                      color: 'var(--tm-muted)',
                    }),
              }}
            />
          ))}
        </Box>
      )}

      {/* Product List — responsive grid on wider screens */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
          gap: { xs: 1, sm: 1.5 },
        }}
      >
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
