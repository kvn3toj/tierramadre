import { Box, Typography, Chip, alpha } from '@mui/material';
import { SearchX } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { emeraldCore } from '../../../design-system/tokens/colors';
import { EmptyState } from '../../../design-system';

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
  hasFilters,
  activeFilterCount,
  onClearFilters,
  onSuggestionClick,
}: TreasureEmptyStateProps) {
  const { t } = useLanguage();
  return (
    <EmptyState
      icon={SearchX}
      title={t.common?.noResults || 'Sin resultados'}
      subtitle={t.treasure.empty.noResults}
      action={
        hasFilters
          ? {
              label: `${t.treasure.empty.clearFilters} ${activeFilterCount} filtro${activeFilterCount !== 1 ? 's' : ''}`,
              onClick: onClearFilters,
            }
          : undefined
      }
    >
      {onSuggestionClick && (
        <Box>
          <Typography
            variant="caption"
            sx={{ color: 'text.secondary', display: 'block', mb: 1 }}
          >
            Búsquedas populares
          </Typography>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 1,
              justifyContent: 'center',
            }}
          >
            {SUGGESTIONS.map((s) => (
              <Chip
                key={s.search}
                label={s.label}
                size="small"
                variant="outlined"
                onClick={() => onSuggestionClick(s.search)}
                sx={{
                  borderColor: alpha(emeraldCore.primary, 0.3),
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
    </EmptyState>
  );
}
