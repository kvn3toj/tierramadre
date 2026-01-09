/**
 * PriceDisplay Component
 * Muestra precios: Price y Comunidad TM (solo para embajadores autenticados)
 *
 * Diseñado por Aria - Capitana del Concilio de Creación
 * Refactored: Uses design system tokens for iOS HIG compliance
 */
import { Box, Stack, Typography, useTheme } from '@mui/material';
// Design System Tokens
import { brand, iosSemanticColors, iosTypographyScale, typography } from '../design-system';
import { useIsGuest } from '../hooks/useAuth';

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
  const isGuest = useIsGuest();
  const comunidadPrice = price;
  const regularPrice = precioInternacional;

  // Modo compacto para tarjetas - iOS HIG body typography (17px)
  // Guests see regular price, authenticated users see comunidad price
  if (compact) {
    const displayPrice = isGuest && regularPrice ? regularPrice : comunidadPrice;
    return (
      <Typography
        variant="body2"
        sx={{
          fontWeight: typography.weight.semibold,
          color: brand.emerald[600],
          fontFamily: typography.fontFamily.mono,
          fontSize: iosTypographyScale.body,
          letterSpacing: typography.letterSpacing.tight,
          fontFeatureSettings: '"tnum"',
        }}
      >
        {formatCompact(displayPrice)}
      </Typography>
    );
  }

  // iOS HIG-inspired: weight & opacity hierarchy, clean layout
  const isDark = theme.palette.mode === 'dark';
  const mode = isDark ? 'dark' : 'light';

  // iOS semantic colors from design system
  const labelColor = iosSemanticColors.secondaryLabel[mode];
  const primaryTextColor = iosSemanticColors.label[mode];
  const secondaryTextColor = iosSemanticColors.secondaryLabel[mode];

  return (
    <Stack spacing={0.5} sx={{ width: '100%' }}>
      {/* Price - Primary (iOS Title style: 28pt bold for compact density) */}
      {regularPrice && regularPrice > 0 && (
        <Box>
          <Typography
            sx={{
              fontSize: '13px',
              fontWeight: typography.weight.normal,
              color: labelColor,
              letterSpacing: typography.letterSpacing.tight,
              mb: 0.25,
            }}
          >
            Price
          </Typography>
          <Typography
            sx={{
              fontSize: '26px',
              fontWeight: typography.weight.bold,
              color: primaryTextColor,
              letterSpacing: typography.letterSpacing.tighter,
              lineHeight: 1.1,
              fontFeatureSettings: '"tnum"',
            }}
          >
            {formatCurrency(regularPrice, currency)}
          </Typography>
        </Box>
      )}

      {/* Comunidad TM - Secondary (iOS 15pt, 60% opacity) - Solo para embajadores autenticados */}
      {!isGuest && (
        <Box>
          <Typography
            component="span"
            sx={{
              fontSize: '14px',
              fontWeight: typography.weight.normal,
              color: secondaryTextColor,
              letterSpacing: typography.letterSpacing.tight,
            }}
          >
            Comunidad TM{' '}
          </Typography>
          <Typography
            component="span"
            sx={{
              fontSize: '14px',
              fontWeight: typography.weight.semibold,
              color: brand.emerald[600],
              letterSpacing: typography.letterSpacing.tight,
              fontFeatureSettings: '"tnum"',
            }}
          >
            {formatCurrency(comunidadPrice, currency)}
          </Typography>
        </Box>
      )}
    </Stack>
  );
};

export default PriceDisplay;
