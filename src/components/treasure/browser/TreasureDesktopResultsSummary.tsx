/**
 * Desktop results row: list-view count text + favorites toggle chip.
 * (Total value + inventory counts live in the header's identity zone.)
 */

import { Box, Typography, Chip, alpha } from '@mui/material';
import { Heart } from 'lucide-react';
import type { Theme } from '@mui/material/styles';
import { accentColors, getQuietEmerald } from '../../../design-system';
import {
  surfacesLight,
  surfacesDark,
} from '../../../design-system/tokens/colors';
import { fontWeights } from '../../../design-system';
import type { Translations } from '../../../locales';

export interface TreasureDesktopResultsSummaryProps {
  theme: Theme;
  isLight: boolean;
  t: Translations;
  filteredTreasureLength: number;
  visibleItemsLength: number;
  /** Current view — grid renders all filtered items, list paginates. */
  viewMode: 'grid' | 'list';
  isProviderMode: boolean;
  showFavoritesOnly: boolean;
  favoritesCount: number;
  onToggleFavoritesOnly: () => void;
}

export default function TreasureDesktopResultsSummary({
  theme,
  isLight,
  t,
  filteredTreasureLength,
  visibleItemsLength,
  viewMode,
  isProviderMode,
  showFavoritesOnly,
  favoritesCount,
  onToggleFavoritesOnly,
}: TreasureDesktopResultsSummaryProps) {
  const qe = getQuietEmerald(isLight ? 'light' : 'dark');
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        // Content-sized personal cluster (favoritos + total) — the toolbar's
        // flexible spacer, not this box, is what pushes it to the right.
        flexWrap: 'wrap',
        gap: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {/* Grid view renders every filtered item, and CatalogHeader's own
            subtitle ("N PIEZAS · ...") already shows that same count live —
            repeating it here would just be the same number twice. List view
            paginates, so "Mostrando X de Y" is genuinely different info the
            subtitle doesn't carry — that one stays. */}
        {viewMode === 'list' && (
          <Typography
            variant="body2"
            sx={{ color: theme.palette.text.secondary }}
          >
            {t.treasure.showingOf}{' '}
            <strong style={{ color: theme.palette.text.primary }}>
              {visibleItemsLength}
            </strong>{' '}
            de {filteredTreasureLength} {t.treasure.emeralds}
          </Typography>
        )}
        {!isProviderMode && (
          <Chip
            icon={
              <Heart
                size={14}
                fill={showFavoritesOnly ? accentColors.error.light : 'none'}
                color={showFavoritesOnly ? accentColors.error.light : qe.subtle}
              />
            }
            // Icon-only in the single-line band: the heart is a conventional,
            // well-understood mark and the label cost ~50px of a row that has
            // none to spare. The count still shows when there are favourites,
            // because a bare number reads fine beside a heart. aria-label and
            // title carry the name (PRODUCT.md).
            label={favoritesCount > 0 ? favoritesCount : ''}
            aria-label={
              favoritesCount > 0
                ? `${t.treasure.favorites} (${favoritesCount})`
                : t.treasure.favorites
            }
            aria-pressed={showFavoritesOnly}
            title={t.treasure.favorites}
            size="small"
            onClick={onToggleFavoritesOnly}
            sx={{
              cursor: 'pointer',
              '& .MuiChip-label': favoritesCount > 0 ? {} : { pr: 0.5, pl: 0 },
              bgcolor: showFavoritesOnly
                ? alpha(accentColors.error.light, 0.1)
                : 'transparent',
              color: showFavoritesOnly
                ? accentColors.error.light
                : theme.palette.text.secondary,
              border: '1px solid',
              borderColor: showFavoritesOnly
                ? accentColors.error.light
                : isLight
                  ? surfacesLight.border.light
                  : surfacesDark.border.default,
              fontWeight: showFavoritesOnly
                ? fontWeights.semibold
                : fontWeights.normal,
              '&:hover': {
                bgcolor: alpha(accentColors.error.light, 0.1),
              },
            }}
          />
        )}
      </Box>
    </Box>
  );
}
