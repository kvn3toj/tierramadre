/**
 * FavoritesRow Component
 * Horizontal scrolling row of favorite product thumbnails.
 * Bottom panel in the museum profile view with refined styling.
 */

import React from 'react';
import { Box, Typography, useMediaQuery, type Theme } from '@mui/material';
import { ChevronRight, Gem } from 'lucide-react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import ProgressiveImage from '../../../../components/shared/ProgressiveImage';
import type { TreasureItem } from '../../../../types';

interface FavoritesRowProps {
  items: TreasureItem[];
  onItemClick: (item: TreasureItem) => void;
  onViewAll?: () => void;
}

export const FavoritesRow = React.memo(function FavoritesRow({
  items,
  onItemClick,
  onViewAll,
}: FavoritesRowProps) {
  const { t } = useLanguage();
  const isTablet = useMediaQuery((t: Theme) => t.breakpoints.up('sm'));
  const isDesktop = useMediaQuery((t: Theme) => t.breakpoints.up('md'));

  if (items.length === 0) return null;

  // Show up to 5 highlight thumbnails — show all 6 on desktop
  const displayItems = items.slice(0, isDesktop ? 6 : 5);
  const thumbSize = isDesktop ? 88 : isTablet ? 80 : 68;

  return (
    <Box
      sx={{
        bgcolor: 'var(--tm-surface)',
        borderRadius: 'var(--tm-radius-sheet) var(--tm-radius-sheet) 0 0',
        borderTop: '1px solid var(--tm-border)',
        pt: { xs: 2, sm: 2.5 },
        px: { xs: 2, sm: 3 },
        pb: { xs: 1.5, sm: 2 },
        mt: 2.5,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 1.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Gem size={15} style={{ color: 'var(--tm-accent)' }} />
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: '0.92rem',
              letterSpacing: '-0.01em',
            }}
          >
            {t.ambassador.museum?.favorites ?? 'Esmeraldas Favoritas'}
          </Typography>
        </Box>
        {onViewAll && (
          <Box
            role="button"
            tabIndex={0}
            onClick={onViewAll}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onViewAll();
              }
            }}
            aria-label={t.ambassador.museum?.viewAll ?? 'Ver todas'}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.25,
              color: 'var(--tm-accent)',
              fontSize: '0.72rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background-color var(--tm-base) var(--tm-ease)',
              borderRadius: 'var(--tm-radius-control)',
              px: 0.75,
              py: 0.25,
              '&:hover': {
                bgcolor: 'var(--tm-accent-wash)',
              },
            }}
          >
            {t.ambassador.museum?.viewAll ?? 'Ver todas'}
            <ChevronRight size={14} />
          </Box>
        )}
      </Box>

      {/* Horizontal scroll — larger thumbnails */}
      <Box
        sx={{
          display: 'flex',
          gap: isDesktop ? '24px' : isTablet ? '20px' : '16px',
          justifyContent:
            isTablet || displayItems.length < 4 ? 'center' : 'flex-start',
          overflowX: 'auto',
          pb: 0.5,
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {displayItems.map((item) => (
          <Box
            key={item.item}
            role="button"
            tabIndex={0}
            onClick={() => onItemClick(item)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onItemClick(item);
              }
            }}
            aria-label={item.nombre}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0.5,
              flexShrink: 0,
              cursor: 'pointer',
              transition: 'transform var(--tm-base) var(--tm-ease)',
              '&:hover': {
                '& .fav-thumb': {
                  borderColor: 'var(--tm-accent)',
                },
              },
            }}
          >
            <Box
              className="fav-thumb"
              sx={{
                width: thumbSize,
                height: thumbSize,
                borderRadius: 'var(--tm-radius-well)',
                overflow: 'hidden',
                bgcolor: 'var(--tm-well)',
                border: '1px solid',
                borderColor: 'var(--tm-border)',
                transition: 'border-color var(--tm-base) var(--tm-ease)',
              }}
            >
              <ProgressiveImage
                src={item.thumbnailUrl || item.imagen}
                alt={item.nombre}
                width={thumbSize}
                height={thumbSize}
                layout="thumbnail"
                quality="eco"
                enableLQIP={false}
                showPlaceholderIcon={false}
              />
            </Box>
            <Typography
              sx={{
                fontSize: '0.6875rem',
                fontWeight: 500,
                color: 'text.secondary',
                maxWidth: thumbSize,
                textAlign: 'center',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {item.nombre}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
});

export default FavoritesRow;
