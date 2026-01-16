/**
 * PriceDisplay Component
 * Muestra el precio regular de los productos.
 * Supports guest pricing mode: hides prices for guests with 'no_prices' mode
 *
 * Diseñado por Aria - Capitana del Concilio de Creación
 * Refactored: Uses design system tokens for iOS HIG compliance
 */
import { Box, Stack, Typography, useTheme } from '@mui/material';
// Design System Tokens
import { brand, iosSemanticColors, iosTypographyScale, typography } from '../../design-system';
import { useIsGuest } from '../../hooks/useAuth';
import { useCanViewPrices } from '../../hooks/usePermissions';
import { INVITATION_STORAGE_KEYS } from '../../types/invitation';

export interface PriceDisplayProps {
  /** Precio COP del producto (precio regular/público) */
  price: number;
  /** Precio internacional (deprecated, solo fallback) */
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
  price,
  precioInternacional,
  currency = 'COP',
  compact = false,
}: PriceDisplayProps) => {
  const theme = useTheme();
  const canViewPrices = useCanViewPrices();
  const isGuest = useIsGuest();
  // Use precioCOP (regular price) as primary, precioInternacional only as fallback
  const displayPrice = price || precioInternacional || 0;

  // If provider, don't show any prices
  if (!canViewPrices) {
    return null;
  }

  // Check guest pricing mode from sessionStorage
  // If guest was invited with 'no_prices' mode, hide all prices
  if (isGuest) {
    const guestPricingMode = sessionStorage.getItem(INVITATION_STORAGE_KEYS.PRICING_MODE);
    if (guestPricingMode === 'no_prices') {
      return null;
    }
  }

  // Modo compacto para tarjetas - iOS HIG body typography (17px)
  if (compact) {
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

  return (
    <Stack spacing={0.5} sx={{ width: '100%' }}>
      {/* Price - Primary (iOS Title style: 28pt bold for compact density) */}
      {displayPrice > 0 && (
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
            {formatCurrency(displayPrice, currency)}
          </Typography>
        </Box>
      )}
    </Stack>
  );
};

export default PriceDisplay;
