/**
 * CotizacionesSection Component
 * Owner-only section displaying saved cotizaciones in a horizontal carousel.
 */

import React from 'react';
import { Box, Typography, Paper, Chip, alpha, useTheme } from '@mui/material';
import { FileText } from 'lucide-react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { SavedCotizacion } from '../../../../hooks/useCotizacionHistory';
import {
  emeraldCore,
  surfacesLight,
  surfacesDark,
  Skeleton,
} from '../../../../design-system';
import { CotizacionCard } from './CotizacionCard';

interface CotizacionesSectionProps {
  cotizaciones: SavedCotizacion[];
  isLoading: boolean;
  onViewCotizacion: (cotizacion: SavedCotizacion) => void;
  onDeleteCotizacion: (cotizacion: SavedCotizacion) => void;
  onDuplicateCotizacion?: (cotizacion: SavedCotizacion) => void;
}

export const CotizacionesSection = React.memo<CotizacionesSectionProps>(
  ({
    cotizaciones,
    isLoading,
    onViewCotizacion,
    onDeleteCotizacion,
    onDuplicateCotizacion,
  }) => {
    const theme = useTheme();
    const { t } = useLanguage();
    const isLight = theme.palette.mode === 'light';

    return (
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
          bgcolor: isLight
            ? surfacesLight.surface.default
            : surfacesDark.background.secondary,
          border: '1px solid',
          borderColor: isLight
            ? surfacesLight.border.light
            : surfacesDark.border.light,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 2,
                bgcolor: alpha(emeraldCore.primary, 0.1),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileText size={20} color={emeraldCore.primary} />
            </Box>
            <Box>
              <Typography
                variant="h6"
                sx={{ fontWeight: 700, fontSize: '1rem' }}
              >
                {t.ambassador.museum?.myCotizaciones ?? 'Mis Cotizaciones'}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {t.ambassador.museum?.onlyYouCanSee ??
                  'Solo tú puedes ver esta sección'}
              </Typography>
            </Box>
          </Box>
          {cotizaciones.length > 0 && (
            <Chip
              size="small"
              label={`${cotizaciones.length} cotizaciones`}
              sx={{
                bgcolor: alpha(emeraldCore.primary, 0.1),
                color: emeraldCore.primary,
                fontWeight: 600,
              }}
            />
          )}
        </Box>

        {/* Cotizaciones Loading */}
        {isLoading && (
          <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 1 }}>
            {[1, 2, 3].map((i) => (
              <Box key={i} sx={{ flexShrink: 0 }}>
                <Skeleton variant="rect" width={200} height={280} />
              </Box>
            ))}
          </Box>
        )}

        {/* Cotizaciones Empty State */}
        {!isLoading && cotizaciones.length === 0 && (
          <Box
            sx={{
              textAlign: 'center',
              py: 4,
              bgcolor: alpha(emeraldCore.primary, 0.02),
              borderRadius: 2,
              border: `1px dashed ${alpha(emeraldCore.primary, 0.3)}`,
            }}
          >
            <FileText
              size={40}
              color={theme.palette.text.secondary}
              style={{ marginBottom: 12 }}
            />
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
              {t.ambassador.museum?.noSavedQuotations ??
                'Aún no tienes cotizaciones guardadas'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {t.ambassador.museum?.quotationsWillAppear ??
                'Las cotizaciones que exportes aparecerán aquí'}
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
                bgcolor: alpha(emeraldCore.primary, 0.3),
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
                onDuplicate={
                  onDuplicateCotizacion
                    ? () => onDuplicateCotizacion(cot)
                    : undefined
                }
                isLight={isLight}
              />
            ))}
          </Box>
        )}
      </Paper>
    );
  },
);

CotizacionesSection.displayName = 'CotizacionesSection';

export default CotizacionesSection;
