import { Box, Typography, Paper, Button, Chip, alpha } from '@mui/material';
import { SearchX } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { emeraldCore, surfacesLight, surfacesDark } from '../../../design-system/tokens/colors';

const SUGGESTIONS = [
  { label: 'Verde Muzo', search: 'muzo' },
  { label: 'Anillos', search: 'anillo' },
  { label: 'Gota', search: 'gota' },
  { label: 'Fina', search: 'fina' },
  { label: 'Collares', search: 'collar' },
];

interface TreasureEmptyStateProps {
  isLight: boolean;
  hasFilters: boolean;
  activeFilterCount: number;
  onClearFilters: () => void;
  onSuggestionClick?: (search: string) => void;
}

export default function TreasureEmptyState({
  isLight,
  hasFilters,
  activeFilterCount,
  onClearFilters,
  onSuggestionClick,
}: TreasureEmptyStateProps) {
  const { t } = useLanguage();
  return (
    <Paper
      elevation={0}
      sx={{
        p: 6,
        borderRadius: 4,
        border: '2px dashed',
        borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.default,
        textAlign: 'center',
        bgcolor: isLight ? alpha(surfacesLight.background.secondary, 0.5) : alpha(surfacesDark.background.secondary, 0.5),
      }}
    >
      <Box
        sx={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          bgcolor: isLight ? surfacesLight.background.tertiary : surfacesDark.background.tertiary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mx: 'auto',
          mb: 2,
        }}
      >
        <SearchX size={32} color={isLight ? surfacesLight.text.tertiary : surfacesDark.text.tertiary} />
      </Box>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
        {t.common?.noResults || 'Sin resultados'}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2, maxWidth: 300, mx: 'auto' }}>
        {t.treasure.empty.noResults}
      </Typography>
      {hasFilters && (
        <Button
          variant="outlined"
          size="small"
          onClick={onClearFilters}
          sx={{
            borderColor: emeraldCore.primary,
            color: emeraldCore.primary,
            textTransform: 'none',
            fontWeight: 600,
            mb: 2,
            '&:hover': {
              bgcolor: alpha(emeraldCore.primary, 0.08),
              borderColor: emeraldCore.dark,
            },
          }}
        >
          {t.treasure.empty.clearFilters} {activeFilterCount} filtro{activeFilterCount !== 1 ? 's' : ''}
        </Button>
      )}
      {onSuggestionClick && (
        <Box sx={{ mt: hasFilters ? 0 : 1 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
            Búsquedas populares
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
            {SUGGESTIONS.map((s) => (
              <Chip
                key={s.search}
                label={s.label}
                size="small"
                variant="outlined"
                onClick={() => onSuggestionClick(s.search)}
                sx={{
                  borderColor: isLight ? alpha(emeraldCore.primary, 0.3) : alpha(emeraldCore.primary, 0.4),
                  color: emeraldCore.primary,
                  fontWeight: 500,
                  '&:hover': {
                    bgcolor: alpha(emeraldCore.primary, 0.08),
                    borderColor: emeraldCore.primary,
                  },
                }}
              />
            ))}
          </Box>
        </Box>
      )}
    </Paper>
  );
}
