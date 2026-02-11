/**
 * ComparisonModal Component
 * Side-by-side comparison view for selected emeralds.
 * Highlights differences in key attributes.
 * Responsive: uses mobile card view on small screens, table on desktop.
 */
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Avatar,
  alpha,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { X, Scale, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { TreasureItem } from '../../types';
import { useThemeMode } from '../../contexts/ThemeContext';
import { getColorDot, getQualityBadge } from '../../utils/formatting';
import { useCurrencyFormat } from '../../contexts/CurrencyContext';
import { emeraldCore, surfacesLight, surfacesDark, semanticColors } from '../../design-system/tokens/colors';
import { ComparisonMobileView } from './';

interface ComparisonModalProps {
  open: boolean;
  onClose: () => void;
  items: TreasureItem[];
}

// Helper to determine best/worst values
function getValueIndicator(
  value: number,
  allValues: number[],
  higherIsBetter: boolean = true
): 'best' | 'worst' | 'neutral' {
  const maxVal = Math.max(...allValues);
  const minVal = Math.min(...allValues);

  if (allValues.length < 2 || maxVal === minVal) return 'neutral';

  if (higherIsBetter) {
    if (value === maxVal) return 'best';
    if (value === minVal) return 'worst';
  } else {
    if (value === minVal) return 'best';
    if (value === maxVal) return 'worst';
  }
  return 'neutral';
}

// Cell with indicator styling
function ComparisonCell({
  value,
  indicator,
  isNumeric = false,
}: {
  value: React.ReactNode;
  indicator: 'best' | 'worst' | 'neutral';
  isNumeric?: boolean;
}) {
  const { mode } = useThemeMode();
  const isLight = mode === 'light';

  const bgColor =
    indicator === 'best'
      ? alpha(emeraldCore.primary, 0.15)
      : indicator === 'worst'
        ? alpha(semanticColors.error.main, 0.1)
        : 'transparent';

  const iconColor =
    indicator === 'best'
      ? emeraldCore.primary
      : indicator === 'worst'
        ? semanticColors.error.main
        : isLight
          ? surfacesLight.text.tertiary
          : surfacesDark.text.tertiary;

  return (
    <TableCell
      align={isNumeric ? 'right' : 'left'}
      sx={{
        bgcolor: bgColor,
        position: 'relative',
        fontWeight: indicator !== 'neutral' ? 600 : 400,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: isNumeric ? 'flex-end' : 'flex-start' }}>
        {indicator === 'best' && <TrendingUp size={14} color={iconColor} />}
        {indicator === 'worst' && <TrendingDown size={14} color={iconColor} />}
        {indicator === 'neutral' && isNumeric && <Minus size={14} color={iconColor} />}
        {value}
      </Box>
    </TableCell>
  );
}

export default function ComparisonModal({
  open,
  onClose,
  items,
}: ComparisonModalProps) {
  const { formatFullCurrency } = useCurrencyFormat();
  const { mode } = useThemeMode();
  const isLight = mode === 'light';
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (items.length < 2) return null;

  // Extract numeric values for comparison
  const prices = items.map(i => i.precioCOP);
  const weights = items.map(i => (typeof i.peso === 'number' ? i.peso : 0));

  // Price per carat for loose stones
  const pricePerCarats = items.map(i => {
    if (!i.isJewelry && typeof i.peso === 'number' && i.peso > 0) {
      return i.precioCOP / i.peso;
    }
    return 0;
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 3,
          bgcolor: isLight ? surfacesLight.background.primary : surfacesDark.background.primary,
          ...(isMobile && {
            m: 0,
            maxHeight: '100%',
          }),
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.default,
          pb: 2,
          px: isMobile ? 2 : 3,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Scale size={24} color={emeraldCore.primary} />
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: isMobile ? '1rem' : '1.25rem' }}>
            Comparar
          </Typography>
          <Chip
            label={`${items.length} items`}
            size="small"
            sx={{
              bgcolor: alpha(emeraldCore.primary, 0.1),
              color: emeraldCore.dark,
              fontWeight: 600,
            }}
          />
        </Box>
        <IconButton onClick={onClose} aria-label="Cerrar">
          <X size={20} />
        </IconButton>
      </DialogTitle>

      {isMobile ? (
        <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <ComparisonMobileView items={items} />
        </DialogContent>
      ) : (
        <DialogContent sx={{ p: 0 }}>
          <TableContainer component={Paper} elevation={0}>
            <Table sx={{ minWidth: 600 }} aria-label="tabla de comparación">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, width: 150 }}>Atributo</TableCell>
                  {items.map((item) => {
                    const displayName = item.nombre.replace(/^L:.*?\s/, '').replace(/^L:/, '').trim();
                    return (
                      <TableCell key={item.item} align="center" sx={{ minWidth: 180 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                          {item.imagen && (
                            <Avatar
                              src={item.thumbnailUrl || item.imagen}
                              alt={displayName}
                              sx={{ width: 60, height: 60, border: '2px solid', borderColor: emeraldCore.primary }}
                            />
                          )}
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, textAlign: 'center' }}>
                            {displayName}
                          </Typography>
                        </Box>
                      </TableCell>
                    );
                  })}
                </TableRow>
              </TableHead>
              <TableBody>
                {/* Price */}
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Precio</TableCell>
                  {items.map((item, idx) => (
                    <ComparisonCell
                      key={item.item}
                      value={formatFullCurrency(item.precioCOP)}
                      indicator={getValueIndicator(prices[idx], prices, false)}
                      isNumeric
                    />
                  ))}
                </TableRow>

                {/* Weight */}
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Peso</TableCell>
                  {items.map((item, idx) => {
                    const weight = typeof item.peso === 'number' ? `${item.peso} ct` : item.metalType || '-';
                    return (
                      <ComparisonCell
                        key={item.item}
                        value={weight}
                        indicator={typeof item.peso === 'number' ? getValueIndicator(weights[idx], weights, true) : 'neutral'}
                        isNumeric
                      />
                    );
                  })}
                </TableRow>

                {/* Price per Carat (only for loose stones) */}
                {items.some(i => !i.isJewelry && typeof i.peso === 'number') && (
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Precio/Quilate</TableCell>
                    {items.map((item, idx) => {
                      if (item.isJewelry || typeof item.peso !== 'number' || item.peso === 0) {
                        return (
                          <TableCell key={item.item} align="right" sx={{ color: 'text.secondary' }}>
                            N/A
                          </TableCell>
                        );
                      }
                      return (
                        <ComparisonCell
                          key={item.item}
                          value={formatFullCurrency(pricePerCarats[idx])}
                          indicator={getValueIndicator(pricePerCarats[idx], pricePerCarats.filter(p => p > 0), false)}
                          isNumeric
                        />
                      );
                    })}
                  </TableRow>
                )}

                {/* Color */}
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Color</TableCell>
                  {items.map((item) => (
                    <TableCell key={item.item} align="center">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            bgcolor: getColorDot(item.color),
                          }}
                        />
                        {item.color}
                      </Box>
                    </TableCell>
                  ))}
                </TableRow>

                {/* Quality */}
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Calidad</TableCell>
                  {items.map((item) => {
                    const quality = getQualityBadge(item.calidad);
                    return (
                      <TableCell key={item.item} align="center">
                        <Chip
                          label={quality.label}
                          size="small"
                          sx={{
                            bgcolor: quality.bg,
                            color: quality.color,
                            border: `1px solid ${quality.border}`,
                            fontWeight: 600,
                          }}
                        />
                      </TableCell>
                    );
                  })}
                </TableRow>

                {/* Cut/Shape */}
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Talla/Corte</TableCell>
                  {items.map((item) => (
                    <TableCell key={item.item} align="center">
                      {item.talla || '-'}
                    </TableCell>
                  ))}
                </TableRow>

                {/* Dimensions */}
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Medidas</TableCell>
                  {items.map((item) => (
                    <TableCell key={item.item} align="center">
                      {item.medidas || '-'}
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          {/* Legend */}
          <Box
            sx={{
              p: 2,
              borderTop: '1px solid',
              borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.default,
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
              <TrendingDown size={14} color={semanticColors.error.main} />
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Valor más bajo
              </Typography>
            </Box>
          </Box>
        </DialogContent>
      )}
    </Dialog>
  );
}
