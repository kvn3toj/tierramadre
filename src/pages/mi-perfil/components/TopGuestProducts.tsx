/**
 * TopGuestProducts Component
 *
 * Top 5 products by guest view count.
 * Horizontal bar chart with thumbnails.
 */

import { useNavigate } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import { TrendingUp } from 'lucide-react';
import { iosTypographyScale, primitiveSpacing as spacing, radius, qeFont } from '../../../design-system';
import { useLanguage } from '../../../contexts/LanguageContext';
import { SectionHeading } from './SectionHeading';

interface TopProduct {
  itemId: number;
  productName: string;
  viewCount: number;
}

interface TopGuestProductsProps {
  topProducts: TopProduct[];
}

export function TopGuestProducts({ topProducts }: TopGuestProductsProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  if (topProducts.length === 0) return null;

  const maxViews = topProducts[0]?.viewCount || 1;

  return (
    <Box>
      <SectionHeading>{t.profile.topGuestProducts}</SectionHeading>

      <Box sx={{ display: 'grid', gap: spacing.xs }}>
        {topProducts.map((product, i) => {
          const barWidth = `${Math.max(20, (product.viewCount / maxViews) * 100)}%`;

          return (
            <Box
              key={product.itemId}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/product/${product.itemId}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') navigate(`/product/${product.itemId}`);
              }}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.sm,
                p: spacing.sm,
                borderRadius: radius.md,
                cursor: 'pointer',
                transition: 'background-color var(--tm-base) var(--tm-ease)',
                '&:hover': { bgcolor: 'var(--surface-secondary)' },
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  width: 18,
                  textAlign: 'center',
                  fontWeight: 700,
                  fontFamily: qeFont.mono,
                  color: 'var(--text-tertiary)',
                  fontSize: iosTypographyScale.caption2,
                }}
              >
                {i + 1}
              </Typography>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: iosTypographyScale.footnote,
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                    mb: 0.5,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {product.productName}
                </Typography>
                <Box
                  sx={{
                    height: 4,
                    borderRadius: 2,
                    bgcolor: 'var(--tm-accent-wash)',
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      width: barWidth,
                      height: '100%',
                      borderRadius: 2,
                      bgcolor: 'var(--tm-accent)',
                      transition: 'width var(--tm-slow) var(--tm-ease)',
                    }}
                  />
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                <TrendingUp size={12} style={{ color: 'var(--tm-accent)' }} />
                <Typography
                  variant="caption"
                  sx={{
                    fontFamily: qeFont.mono,
                    fontWeight: 600,
                    color: 'var(--tm-accent)',
                    fontSize: iosTypographyScale.caption2,
                  }}
                >
                  {product.viewCount}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
