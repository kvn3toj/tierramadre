/**
 * PriceDisplay Component
 * Muestra el precio regular de los productos.
 * Supports guest pricing mode: hides prices for guests with 'no_prices' mode
 * Supports COP/USD currency toggle via CurrencyContext
 *
 * Diseñado por Aria - Capitana del Concilio de Creación
 * Refactored: Uses design system tokens for iOS HIG compliance
 */
import { Box, Stack, Typography, useTheme } from '@mui/material';
// Design System Tokens
import { brand, iosSemanticColors, iosTypographyScale, typography } from '../../design-system';
import { usePriceShare } from '../../contexts/PriceShareContext';
import { useCurrency } from '../../contexts/CurrencyContext';

export interface PriceDisplayProps {
  /** Precio COP del producto (precio regular/público) */
  price: number;
  /** Precio internacional (deprecated, solo fallback) */
  precioInternacional?: number;
  /** Modo compacto para listas */
  compact?: boolean;
}

/**
 * Formatea un valor numérico como moneda
 */
const formatCurrencyValue = (value: number, currency: 'COP' | 'USD' = 'COP'): string => {
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

/**
 * Formatea un valor en formato compacto ($9.6M, $377K for COP; US$9.5K for USD)
 */
const formatCompact = (value: number, currency: 'COP' | 'USD' = 'COP'): string => {
  const prefix = currency === 'USD' ? 'US$' : '$';
  if (currency === 'USD') {
    if (value >= 1000000) {
      return `${prefix}${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${prefix}${(value / 1000).toFixed(1)}K`;
    }
    return `${prefix}${value.toLocaleString('en-US')}`;
  }
  if (value >= 1000000) {
    return `${prefix}${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${prefix}${Math.round(value / 1000)}K`;
  }
  return `${prefix}${value.toLocaleString('es-CO')}`;
};

export const PriceDisplay = ({
  price,
  precioInternacional,
  compact = false,
}: PriceDisplayProps) => {
  const theme = useTheme();
  const { shouldShowPrices } = usePriceShare();
  const { currency, convertPrice, trmRate } = useCurrency();

  // Use precioCOP (regular price) as primary, precioInternacional only as fallback
  const rawPrice = price || precioInternacional || 0;
  const displayPrice = convertPrice(rawPrice);

  // Single check: context handles all logic (provider, guest invitation, user preference)
  if (!shouldShowPrices) {
    return null;
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
        {formatCompact(displayPrice, currency)}
      </Typography>
    );
  }

  // iOS HIG-inspired: weight & opacity hierarchy, clean layout
  const isDark = theme.palette.mode === 'dark';
  const mode = isDark ? 'dark' : 'light';

  // iOS semantic colors from design system
  const labelColor = iosSemanticColors.secondaryLabel[mode];
  const primaryTextColor = iosSemanticColors.label[mode];
  const isUSD = currency === 'USD';

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
            {formatCurrencyValue(displayPrice, currency)}
          </Typography>
          {isUSD && (
            <Typography
              sx={{
                fontSize: '11px',
                fontWeight: typography.weight.normal,
                color: labelColor,
                mt: 0.5,
                fontFeatureSettings: '"tnum"',
              }}
            >
              TRM: {trmRate.toLocaleString('es-CO')} / x4
            </Typography>
          )}
        </Box>
      )}
    </Stack>
  );
};

export default PriceDisplay;
