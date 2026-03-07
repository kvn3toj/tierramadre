/**
 * CotizacionesSection Component
 * Owner-only section displaying saved cotizaciones in a horizontal carousel.
 */

import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Skeleton,
  alpha,
  useTheme,
} from '@mui/material';
import { FileText } from 'lucide-react';
import { SavedCotizacion } from '../../../../hooks/useCotizacionHistory';
import { brand, lightTokens, darkTokens } from '../../../../design-system';
import { CotizacionCard } from './CotizacionCard';

interface CotizacionesSectionProps {
  cotizaciones: SavedCotizacion[];
  isLoading: boolean;
  onViewCotizacion: (cotizacion: SavedCotizacion) => void;
  onDeleteCotizacion: (cotizacion: SavedCotizacion) => void;
  onDuplicateCotizacion?: (cotizacion: SavedCotizacion) => void;
}

export const CotizacionesSection: React.FC<CotizacionesSectionProps> = ({
  cotizaciones,
  isLoading,
  onViewCotizacion,
  onDeleteCotizacion,
  onDuplicateCotizacion,
}) => {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        mb: 3,
        borderRadius: 3,
        bgcolor: isLight ? lightTokens.background.surface : darkTokens.background.surface,
        border: '1px solid',
        borderColor: isLight ? lightTokens.border.default : darkTokens.border.default,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              bgcolor: alpha(brand.emerald[500], 0.1),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FileText size={20} color={brand.emerald[500]} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>
              Mis Cotizaciones
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Solo tu puedes ver esta seccion
            </Typography>
          </Box>
        </Box>
        {cotizaciones.length > 0 && (
          <Chip
            size="small"
            label={`${cotizaciones.length} cotizaciones`}
            sx={{
              bgcolor: alpha(brand.emerald[500], 0.1),
              color: brand.emerald[500],
              fontWeight: 600,
            }}
          />
        )}
      </Box>

      {/* Cotizaciones Loading */}
      {isLoading && (
        <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 1 }}>
          {[1, 2, 3].map((i) => (
            <Skeleton
              key={i}
              variant="rounded"
              width={200}
              height={280}
              sx={{ borderRadius: 2, flexShrink: 0 }}
            />
          ))}
        </Box>
      )}

      {/* Cotizaciones Empty State */}
      {!isLoading && cotizaciones.length === 0 && (
        <Box
          sx={{
            textAlign: 'center',
            py: 4,
            bgcolor: alpha(brand.emerald[500], 0.02),
            borderRadius: 2,
            border: `1px dashed ${alpha(brand.emerald[500], 0.3)}`,
          }}
        >
          <FileText size={40} color={lightTokens.text.muted} style={{ marginBottom: 12 }} />
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
            Aun no tienes cotizaciones guardadas
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.muted' }}>
            Las cotizaciones que exportes apareceran aqui
          </Typography>
        </Box>
      )}

      {/* Cotizaciones Gallery */}
      {!isLoading && cotizaciones.length > 0 && (
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            overflowX: 'auto',
            pb: 1,
            mx: -1,
            px: 1,
            '&::-webkit-scrollbar': { height: 6 },
            '&::-webkit-scrollbar-thumb': {
              bgcolor: alpha(brand.emerald[500], 0.3),
              borderRadius: 3,
            },
          }}
        >
          {cotizaciones.map((cot) => (
            <CotizacionCard
              key={cot.id}
              cotizacion={cot}
              onView={() => onViewCotizacion(cot)}
              onDelete={() => onDeleteCotizacion(cot)}
              onDuplicate={onDuplicateCotizacion ? () => onDuplicateCotizacion(cot) : undefined}
              isLight={isLight}
            />
          ))}
        </Box>
      )}
    </Paper>
  );
};

export default CotizacionesSection;
