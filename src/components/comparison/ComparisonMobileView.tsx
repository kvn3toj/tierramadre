/**
 * ComparisonMobileView Component
 * Mobile-optimized comparison view using attribute-focused cards.
 * Each attribute is displayed as a horizontal card showing all products.
 */
import React from 'react';
import { Box, Typography, Chip, alpha } from '@mui/material';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { InventoryItem } from '../../types';
import { useThemeMode } from '../../contexts/ThemeContext';
import { formatCurrency, getColorDot, getQualityBadge } from '../../utils/formatting';
import { emeraldCore, surfacesLight, surfacesDark } from '../../design-system/tokens/colors';
import ProductHeader from './ProductHeader';
import AttributeCard, { getValueIndicator, ValueIndicator } from './AttributeCard';

interface ComparisonMobileViewProps {
  items: InventoryItem[];
}

export default function ComparisonMobileView({ items }: ComparisonMobileViewProps) {
  const { mode } = useThemeMode();
  const isLight = mode === 'light';

  // Extract numeric values for comparison
  const prices = items.map((i) => i.precioCOP);
  const weights = items.map((i) => (typeof i.peso === 'number' ? i.peso : 0));
  const pricePerCarats = items.map((i) => {
    if (!i.isJewelry && typeof i.peso === 'number' && i.peso > 0) {
      return i.precioCOP / i.peso;
    }
    return 0;
  });

  // Check if any item has price per carat (loose stones)
  const hasLooseStones = items.some(
    (i) => !i.isJewelry && typeof i.peso === 'number' && i.peso > 0
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Sticky Product Header */}
      <ProductHeader items={items} />

      {/* Scrollable Attribute Cards */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          p: 2,
          bgcolor: isLight
            ? surfacesLight.background.secondary
            : surfacesDark.background.primary,
        }}
      >
        {/* Precio */}
        <AttributeCard
          label="Precio"
          values={items.map((item) => formatCurrency(item.precioCOP))}
          indicators={items.map((_, idx) =>
            getValueIndicator(prices[idx], prices, false)
          )}
          type="numeric"
        />

        {/* Peso */}
        <AttributeCard
          label="Peso"
          values={items.map((item) =>
            typeof item.peso === 'number'
              ? `${item.peso} ct`
              : item.metalType || '-'
          )}
          indicators={items.map((item, idx) =>
            typeof item.peso === 'number'
              ? getValueIndicator(weights[idx], weights, true)
              : 'neutral'
          )}
          type="numeric"
        />

        {/* Precio/Quilate (only for loose stones) */}
        {hasLooseStones && (
          <AttributeCard
            label="Precio/Quilate"
            values={items.map((item, idx) => {
              if (
                item.isJewelry ||
                typeof item.peso !== 'number' ||
                item.peso === 0
              ) {
                return 'N/A';
              }
              return formatCurrency(pricePerCarats[idx]);
            })}
            indicators={items.map((item, idx) => {
              if (
                item.isJewelry ||
                typeof item.peso !== 'number' ||
                item.peso === 0
              ) {
                return 'neutral';
              }
              return getValueIndicator(
                pricePerCarats[idx],
                pricePerCarats.filter((p) => p > 0),
                false
              );
            })}
            type="numeric"
          />
        )}

        {/* Color */}
        <AttributeCard
          label="Color"
          values={items.map((item) => (
            <Box
              key={item.item}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                justifyContent: 'center',
              }}
            >
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  bgcolor: getColorDot(item.color),
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: '0.8rem' }}>{item.color}</span>
            </Box>
          ))}
          indicators={items.map(() => 'neutral')}
          type="color"
        />

        {/* Calidad */}
        <AttributeCard
          label="Calidad"
          values={items.map((item) => {
            const quality = getQualityBadge(item.calidad);
            return (
              <Chip
                key={item.item}
                label={quality.label}
                size="small"
                sx={{
                  bgcolor: quality.bg,
                  color: quality.color,
                  border: `1px solid ${quality.border}`,
                  fontWeight: 600,
                  fontSize: '0.7rem',
                  height: 24,
                }}
              />
            );
          })}
          indicators={items.map(() => 'neutral')}
          type="badge"
        />

        {/* Talla/Corte */}
        <AttributeCard
          label="Talla/Corte"
          values={items.map((item) => item.talla || '-')}
          indicators={items.map(() => 'neutral')}
          type="text"
        />

        {/* Medidas */}
        <AttributeCard
          label="Medidas"
          values={items.map((item) => item.medidas || '-')}
          indicators={items.map(() => 'neutral')}
          type="text"
        />
      </Box>

      {/* Legend */}
      <Box
        sx={{
          p: 2,
          borderTop: '1px solid',
          borderColor: isLight
            ? surfacesLight.border.light
            : surfacesDark.border.light,
          bgcolor: isLight
            ? surfacesLight.background.primary
            : surfacesDark.background.primary,
          display: 'flex',
          gap: 3,
          justifyContent: 'center',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <TrendingUp size={14} color={emeraldCore.primary} />
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Mejor valor
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <TrendingDown size={14} color="#ef4444" />
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Valor más bajo
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
