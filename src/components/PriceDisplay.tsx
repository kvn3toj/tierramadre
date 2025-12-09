/**
 * PriceDisplay Component
 * Muestra precios duales: Internacional y Nacional (con 20% de descuento)
 *
 * Diseñado por Aria - Capitana del Concilio de Creación
 */
import { Box, Stack, Typography, Chip, useTheme } from '@mui/material';
import PublicIcon from '@mui/icons-material/Public';
import FlagIcon from '@mui/icons-material/Flag';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';

export interface PriceDisplayProps {
  /** Precio nacional (ya con descuento aplicado) - el valor guardado en BD */
  price: number;
  /** Moneda (default: COP) */
  currency?: 'COP' | 'USD';
  /** Mostrar precio internacional sin descuento */
  showInternational?: boolean;
  /** Porcentaje de descuento que ya fue aplicado (default: 0.20 = 20%) */
  discountApplied?: number;
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
  price, // Este es el precio NACIONAL (ya con descuento aplicado)
  currency = 'COP',
  showInternational = true,
  discountApplied = 0.20,
  compact = false,
}: PriceDisplayProps) => {
  const theme = useTheme();
  // price = nacional (ya descontado)
  // internacional = nacional / (1 - descuento) = nacional / 0.8
  const nationalPrice = price;
  const internationalPrice = Math.round(price / (1 - discountApplied));
  const discountPercent = Math.round(discountApplied * 100);

  // Modo compacto para tarjetas en lista
  if (compact) {
    return (
      <Stack spacing={0.25}>
        {/* Precio Internacional (calculado) - tachado, pequeño */}
        {showInternational && (
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              textDecoration: 'line-through',
              fontSize: '0.7rem',
            }}
          >
            {formatCompact(internationalPrice)}
          </Typography>
        )}
        {/* Precio Nacional (el guardado) - destacado */}
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 700,
              color: '#059669',
              fontFamily: 'monospace',
            }}
          >
            🇨🇴 {formatCompact(nationalPrice)}
          </Typography>
          {showInternational && (
            <Typography
              variant="caption"
              sx={{
                color: '#f57c00',
                fontWeight: 600,
                fontSize: '0.65rem',
              }}
            >
              -{discountPercent}%
            </Typography>
          )}
        </Stack>
      </Stack>
    );
  }

  // Modo completo para vista de detalle
  return (
    <Stack spacing={1.5} sx={{ width: '100%' }}>
      {/* Precio Internacional (calculado) - mostrar solo si showInternational */}
      {showInternational && (
        <Box
          sx={{
            p: 2,
            bgcolor: theme.palette.grey[50],
            borderRadius: 2,
            border: '1px solid',
            borderColor: theme.palette.grey[200],
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
            <PublicIcon fontSize="small" sx={{ color: theme.palette.grey[500] }} />
            <Typography
              variant="caption"
              sx={{
                color: theme.palette.grey[600],
                fontWeight: 600,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              Precio Internacional
            </Typography>
          </Stack>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              color: theme.palette.grey[800],
              fontFamily: 'monospace',
            }}
          >
            {formatCurrency(internationalPrice, currency)}
          </Typography>
        </Box>
      )}

      {/* Precio Nacional (el guardado) - siempre visible, destacado */}
      <Box
          sx={{
            p: 2,
            bgcolor: '#ecfdf5', // Emerald 50
            borderRadius: 2,
            border: '2px solid',
            borderColor: '#10b981', // Emerald 500
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
              bgcolor: '#10b981',
              opacity: 0.1,
              borderRadius: '50%',
            }}
          />

          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mb: 0.5 }}
          >
            <Stack direction="row" alignItems="center" spacing={1}>
              <FlagIcon fontSize="small" sx={{ color: '#059669' }} />
              <Typography
                variant="caption"
                sx={{
                  color: '#047857',
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                Precio Colombia
              </Typography>
            </Stack>
            <Chip
              label={`Ahorra ${discountPercent}%`}
              size="small"
              icon={<LocalOfferIcon sx={{ fontSize: '0.9rem !important' }} />}
              sx={{
                bgcolor: '#f57c00',
                color: 'white',
                fontWeight: 600,
                fontSize: '0.7rem',
                '& .MuiChip-icon': {
                  color: 'white',
                },
              }}
            />
          </Stack>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: '#047857',
              fontFamily: 'monospace',
              position: 'relative',
              zIndex: 1,
            }}
          >
            {formatCurrency(nationalPrice, currency)}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: '#059669',
              display: 'block',
              mt: 0.5,
            }}
          >
            Beneficio exclusivo para compradores en Colombia
          </Typography>
        </Box>
    </Stack>
  );
};

export default PriceDisplay;
