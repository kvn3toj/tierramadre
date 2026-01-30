import { Box, Typography, Paper, Button, alpha } from '@mui/material';
import { SearchX } from 'lucide-react';
import { emeraldCore, surfacesLight, surfacesDark } from '../../../design-system/tokens/colors';

interface TreasureEmptyStateProps {
  isLight: boolean;
  hasFilters: boolean;
  activeFilterCount: number;
  onClearFilters: () => void;
}

export default function TreasureEmptyState({
  isLight,
  hasFilters,
  activeFilterCount,
  onClearFilters,
}: TreasureEmptyStateProps) {
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
        Sin resultados
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2, maxWidth: 300, mx: 'auto' }}>
        No encontramos esmeraldas con los filtros seleccionados. Prueba ajustando los criterios de búsqueda.
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
            '&:hover': {
              bgcolor: alpha(emeraldCore.primary, 0.08),
              borderColor: emeraldCore.dark,
            },
          }}
        >
          Limpiar {activeFilterCount} filtro{activeFilterCount !== 1 ? 's' : ''}
        </Button>
      )}
    </Paper>
  );
}
