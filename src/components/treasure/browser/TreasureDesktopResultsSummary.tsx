/**
 * Desktop results row: count text, favorites chip, optional total value.
 */

import { Box, Typography, Chip, alpha } from '@mui/material';
import { Heart } from 'lucide-react';
import type { Theme } from '@mui/material/styles';
import { accentColors } from '../../../design-system';
import { emeraldCore, surfacesLight, surfacesDark } from '../../../design-system/tokens/colors';
import { fontWeights } from '../../../design-system';
import type { Translations } from '../../../locales';

export interface TreasureDesktopResultsSummaryProps {
  theme: Theme;
  isLight: boolean;
  t: Translations;
  filteredTreasureLength: number;
  allTreasureLength: number;
  visibleItemsLength: number;
  isProviderMode: boolean;
  shouldShowPrices: boolean;
  formatFullCurrency: (n: number) => string;
  filteredStatsTotalValue: number;
  showFavoritesOnly: boolean;
  favoritesCount: number;
  onToggleFavoritesOnly: () => void;
}

export default function TreasureDesktopResultsSummary({
  theme,
  isLight,
  t,
  filteredTreasureLength,
  allTreasureLength,
  visibleItemsLength,
  isProviderMode,
  shouldShowPrices,
  formatFullCurrency,
  filteredStatsTotalValue,
  showFavoritesOnly,
  favoritesCount,
  onToggleFavoritesOnly,
}: TreasureDesktopResultsSummaryProps) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap', gap: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
          {filteredTreasureLength === allTreasureLength ? (
            <>
              <strong style={{ color: theme.palette.text.primary }}>{allTreasureLength}</strong> {t.treasure.totalEmeralds}
            </>
          ) : (
            <>
              {t.treasure.showingOf}{' '}
              <strong style={{ color: theme.palette.text.primary }}>{visibleItemsLength}</strong> de {filteredTreasureLength}{' '}
              {t.treasure.emeralds}
            </>
          )}
        </Typography>
        {!isProviderMode && (
          <Chip
            icon={
              <Heart size={14} fill={showFavoritesOnly ? accentColors.error.light : 'none'} color={showFavoritesOnly ? accentColors.error.light : '#6b7280'} />
            }
            label={`${t.treasure.favorites} (${favoritesCount})`}
            size="small"
            onClick={onToggleFavoritesOnly}
            sx={{
              cursor: 'pointer',
              bgcolor: showFavoritesOnly ? alpha(accentColors.error.light, 0.1) : 'transparent',
              color: showFavoritesOnly ? accentColors.error.light : theme.palette.text.secondary,
              border: '1px solid',
              borderColor: showFavoritesOnly
                ? accentColors.error.light
                : isLight
                  ? surfacesLight.border.light
                  : surfacesDark.border.default,
              fontWeight: showFavoritesOnly ? fontWeights.semibold : fontWeights.normal,
              '&:hover': {
                bgcolor: alpha(accentColors.error.light, 0.1),
              },
            }}
          />
        )}
      </Box>
      {!isProviderMode && shouldShowPrices && (
        <Typography variant="body2" sx={{ color: emeraldCore.dark, fontWeight: fontWeights.semibold }}>
          {formatFullCurrency(filteredStatsTotalValue)} total
        </Typography>
      )}
    </Box>
  );
}
