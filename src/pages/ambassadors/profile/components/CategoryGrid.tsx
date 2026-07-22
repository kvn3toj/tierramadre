/**
 * CategoryGrid Component
 * 2x2 grid with product image backgrounds, cinematic gradient overlay,
 * category name + count. Museum-style navigation for ambassador profile.
 */

import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { Gem } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { qeFont, qeGray } from '../../../../design-system';
import { useReducedMotion } from '../../../../hooks/useReducedMotion';
import type { ProductCategory } from '../../../../utils/productCategories';

interface CategoryGridProps {
  categories: ProductCategory[];
  onCategorySelect: (category: ProductCategory) => void;
}

/** Count suffix per category */
const CATEGORY_COUNT_SUFFIX: Record<string, string> = {
  piedras: 'piezas',
  gemas: 'piezas',
  lotes: 'lotes',
  joyas: 'piezas',
};

export const CategoryGrid = React.memo(function CategoryGrid({
  categories,
  onCategorySelect,
}: CategoryGridProps) {
  const { t } = useLanguage();
  const prefersReducedMotion = useReducedMotion();

  const categoryLabels = useMemo<Record<string, string>>(
    () => ({
      joyas: t.ambassador.museum?.joyas ?? 'Joyas',
      gemas: t.ambassador.museum?.gemas ?? 'Gemas',
      piedras: t.ambassador.museum?.piedras ?? 'Piedras',
      lotes: t.ambassador.museum?.lotes ?? 'Lotes',
    }),
    [t],
  );

  if (categories.length === 0) return null;

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'repeat(2, 1fr)',
          md: categories.length >= 3 ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
        },
        gap: { xs: '10px', sm: '14px' },
      }}
    >
      {categories.map((category, index) => (
        <motion.div
          key={category.key}
          initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.08, duration: 0.3 }}
        >
          <Box
            role="button"
            tabIndex={0}
            aria-label={`${categoryLabels[category.key] || category.label} - ${category.count} ${t.ambassador.museum?.items ?? 'productos'}`}
            onClick={() => onCategorySelect(category)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onCategorySelect(category);
              }
            }}
            sx={{
              position: 'relative',
              borderRadius: 'var(--tm-radius-card)',
              overflow: 'hidden',
              height: { xs: 130, sm: 160, md: 180 },
              cursor: 'pointer',
              border: '1px solid var(--tm-border)',
              transition: 'border-color var(--tm-base) var(--tm-ease)',
              '&:hover': {
                borderColor: 'var(--tm-accent)',
              },
              '&:focus-visible': {
                outline: 'none',
                boxShadow: 'var(--tm-focus-ring)',
              },
            }}
          >
            {/* Background Image */}
            {category.coverImageUrl ? (
              <Box
                component="img"
                src={category.coverImageUrl}
                alt=""
                loading="lazy"
                decoding="async"
                sx={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  bgcolor: 'var(--tm-accent-wash)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--tm-accent)',
                }}
              >
                <Gem size={36} strokeWidth={1} />
              </Box>
            )}

            {/* Scrim — guarantees label contrast even over washed-out or
                overexposed product photos. On-photo chrome, so the multi-stop
                gradient stays a raw rgba ramp (same exemption as GridCard's
                badges); no single DS3 token expresses a four-stop fade. */}
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                background:
                  // eslint-disable-next-line no-restricted-syntax -- DS3: deliberate on-photo scrim exemption, see comment above
                  'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.55) 34%, rgba(0,0,0,0.12) 64%, rgba(0,0,0,0.04) 100%)',
              }}
            />

            {/* Label — bottom-left, clean typography without emojis */}
            <Box
              sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                p: { xs: '14px 16px', sm: '16px 20px' },
                display: 'flex',
                flexDirection: 'column',
                gap: '3px',
              }}
            >
              <Typography
                sx={{
                  fontFamily: qeFont.serif,
                  color: qeGray[0],
                  fontWeight: 600,
                  fontSize: { xs: '1.35rem', sm: '1.5rem' },
                  lineHeight: 1.12,
                  letterSpacing: '0.01em',
                }}
              >
                {categoryLabels[category.key] || category.label}
              </Typography>
              <Typography
                sx={{
                  color: qeGray[200],
                  fontSize: { xs: '0.72rem', sm: '0.78rem' },
                  fontWeight: 500,
                  letterSpacing: '0.02em',
                }}
              >
                {category.count}{' '}
                {category.count === 1
                  ? category.key === 'lotes'
                    ? 'lote'
                    : 'pieza'
                  : CATEGORY_COUNT_SUFFIX[category.key] ||
                    t.ambassador.museum?.items ||
                    'piezas'}
              </Typography>
            </Box>
          </Box>
        </motion.div>
      ))}
    </Box>
  );
});

export default CategoryGrid;
