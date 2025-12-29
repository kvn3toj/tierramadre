/**
 * PriceDisplay Component
 * Muestra precios: Price y Comunidad TM
 *
 * Diseñado por Aria - Capitana del Concilio de Creación
 */
import { Box, Stack, Typography, useTheme } from '@mui/material';
import FlagIcon from '@mui/icons-material/Flag';
import PublicIcon from '@mui/icons-material/Public';
// Design System Tokens
import { emeraldCore } from '../design-system/tokens/colors';

export interface PriceDisplayProps {
  /** Precio Comunidad TM (con descuento) */
  price: number;
  /** Precio regular (Price) */
  precioInternacional?: number;
  /** Moneda (default: COP) */
  currency?: 'COP' | 'USD';
  /** Modo compacto para listas */
  compact?: boolean;
}

/**
 * Formatea un valor numérico como moneda
 */
const formatCurrency = (value: number, currency: 'COP' | 'USD' = 'COP'): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

/**
 * Formatea un valor en formato compacto ($9.6M, $377K)
 */
const formatCompact = (value: number): string => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${Math.round(value / 1000)}K`;
  }
  return `$${value.toLocaleString('es-CO')}`;
};

export const PriceDisplay = ({
  price, // Precio Comunidad TM
  precioInternacional, // Precio regular (Price)
  currency = 'COP',
  compact = false,
}: PriceDisplayProps) => {
  const theme = useTheme();
  const comunidadPrice = price;
  const regularPrice = precioInternacional;

  // Modo compacto para tarjetas - solo precio (Comunidad TM sin label)
  if (compact) {
    return (
      <Typography
        variant="body2"
        sx={{
          fontWeight: 700,
          color: emeraldCore.dark,
          fontFamily: 'monospace',
        }}
      >
        {formatCompact(comunidadPrice)}
      </Typography>
    );
  }

  // Modo completo para vista de detalle - ambos precios
  return (
    <Stack spacing={1.5} sx={{ width: '100%' }}>
      {/* Precio regular (Price) - mostrar si disponible */}
      {regularPrice && regularPrice > 0 && (
        <Box
          sx={{
            p: 2,
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : theme.palette.grey[50],
            borderRadius: 2,
            border: '1px solid',
            borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : theme.palette.grey[200],
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
            <PublicIcon fontSize="small" sx={{ color: theme.palette.text.secondary }} />
            <Typography
              variant="caption"
              sx={{
                color: theme.palette.text.secondary,
                fontWeight: 600,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              Price
            </Typography>
          </Stack>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              color: theme.palette.text.primary,
              fontFamily: 'monospace',
            }}
          >
            {formatCurrency(regularPrice, currency)}
          </Typography>
        </Box>
      )}

      {/* Precio Comunidad TM - siempre visible */}
      <Box
        sx={{
          p: 2,
          bgcolor: emeraldCore.lightest,
          borderRadius: 2,
          border: '2px solid',
          borderColor: emeraldCore.primary,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background decorativo */}
        <Box
          sx={{
            position: 'absolute',
            top: -20,
            right: -20,
            width: 100,
            height: 100,
            bgcolor: emeraldCore.primary,
            opacity: 0.1,
            borderRadius: '50%',
          }}
        />

        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
          <FlagIcon fontSize="small" sx={{ color: emeraldCore.dark }} />
          <Typography
            variant="caption"
            sx={{
              color: emeraldCore.darker,
              fontWeight: 600,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            Comunidad TM
          </Typography>
        </Stack>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            color: emeraldCore.darker,
            fontFamily: 'monospace',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {formatCurrency(comunidadPrice, currency)}
        </Typography>
      </Box>
    </Stack>
  );
};

export default PriceDisplay;
