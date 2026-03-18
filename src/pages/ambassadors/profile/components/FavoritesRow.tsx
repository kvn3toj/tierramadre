/**
 * FavoritesRow Component
 * Horizontal scrolling row of circular favorite product thumbnails.
 * Bottom panel in the museum profile view with refined styling.
 */

import React from 'react';
import { Box, Typography, alpha, useTheme, useMediaQuery, type Theme } from '@mui/material';
import { ChevronRight, Gem } from 'lucide-react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import {
  emeraldCore,
  goldAccent,
  cssTransition,
  surfacesLight,
  surfacesDark,
} from '../../../../design-system';
import ProgressiveImage from '../../../../components/shared/ProgressiveImage';
import type { TreasureItem } from '../../../../types';

interface FavoritesRowProps {
  items: TreasureItem[];
  onItemClick: (item: TreasureItem) => void;
  onViewAll?: () => void;
}

export const FavoritesRow = React.memo(function FavoritesRow({ items, onItemClick, onViewAll }: FavoritesRowProps) {
  const theme = useTheme();
  const { t } = useLanguage();
  const isLight = theme.palette.mode === 'light';
  const isTablet = useMediaQuery((t: Theme) => t.breakpoints.up('sm'));
  const isDesktop = useMediaQuery((t: Theme) => t.breakpoints.up('md'));

  if (items.length === 0) return null;

  // Show up to 5 highlight thumbnails — show all 6 on desktop
  const displayItems = items.slice(0, isDesktop ? 6 : 5);
  const thumbSize = isDesktop ? 88 : isTablet ? 80 : 68;

  return (
    <Box
      sx={{
        bgcolor: isLight ? surfacesLight.surface.default : surfacesDark.background.secondary,
        borderRadius: '18px 18px 0 0',
        boxShadow: isLight
          ? '0 -4px 16px rgba(0,0,0,0.08)'
          : '0 -4px 16px rgba(0,0,0,0.2)',
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
          <Gem size={15} color={emeraldCore.primary} />
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
              color: emeraldCore.primary,
              fontSize: '0.72rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: cssTransition.default,
              borderRadius: 1,
              px: 0.75,
              py: 0.25,
              '&:hover': {
                bgcolor: alpha(emeraldCore.primary, 0.06),
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
          justifyContent: (isTablet || displayItems.length < 4) ? 'center' : 'flex-start',
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
              transition: cssTransition.default,
              '&:hover': {
                '& .fav-thumb': {
                  borderColor: goldAccent.primary,
                  transform: 'scale(1.06)',
                  boxShadow: `0 4px 12px ${alpha(emeraldCore.primary, 0.2)}`,
                },
              },
            }}
          >
            <Box
              className="fav-thumb"
              sx={{
                width: thumbSize,
                height: thumbSize,
                borderRadius: '50%',
                overflow: 'hidden',
                border: '2.5px solid',
                borderColor: emeraldCore.primary,
                transition: cssTransition.default,
                boxShadow: `0 2px 8px ${alpha('#000', 0.1)}`,
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
                fontSize: '0.6rem',
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
