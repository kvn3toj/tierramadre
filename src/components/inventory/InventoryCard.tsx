/**
 * InventoryCard Component
 * Displays an inventory item in either grid or compact list view.
 * Extracted from InventoryBrowser.tsx for better modularity.
 *
 * Performance optimized with React.memo and lazy loading.
 * Design system compliant with tokens from design-system/tokens.
 */
import { useState, memo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Card,
  CardContent,
  alpha,
  useTheme,
  Button,
  Collapse,
  LinearProgress,
} from '@mui/material';
import {
  Gem,
  MapPin,
  User,
  FileCheck,
  Play,
  Images,
} from 'lucide-react';
import { useThemeMode } from '../../contexts/ThemeContext';
import { InventoryItem, TrustScoreBreakdown } from '../../types';
import { getColorDot, getQualityBadge } from '../../utils/formatting';
import { getTrustBadge } from '../../utils/trustScore';
import { TrustBadgeCompact } from '../TrustBadge';
import { PriceDisplay } from '../PriceDisplay';
// Design System Tokens
import { emeraldCore, surfacesLight, surfacesDark } from '../../design-system/tokens/colors';

export interface InventoryCardProps {
  item: InventoryItem;
  isCompact: boolean;
  trustScore: TrustScoreBreakdown;
  onCertClick: () => void;
  onClick: () => void;
}

export function InventoryCard({ item, isCompact, trustScore, onCertClick, onClick }: InventoryCardProps) {
  const theme = useTheme();
  const { mode } = useThemeMode();
  const isLight = mode === 'light';
  const [showDetails] = useState(false);

  const displayName = item.nombre.replace(/^L:.*?\s/, '').replace(/^L:/, '').trim();
  const quality = getQualityBadge(item.calidad);
  const colorDot = getColorDot(item.color);
  const isLoose = !item.isJewelry;
  const weight = typeof item.peso === 'number' ? `${item.peso} ct` : item.metalType;
  const trustBadge = getTrustBadge(trustScore.overall);

  // Compact list view
  if (isCompact) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: 2.5,
          bgcolor: isLight ? surfacesLight.background.primary : surfacesDark.background.secondary,
          border: '1px solid',
          borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.light,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          '&:hover': {
            borderColor: emeraldCore.dark,
            bgcolor: isLight ? emeraldCore.lightest : alpha(emeraldCore.dark, 0.08),
          },
        }}
        onClick={onClick}
        role="article"
        aria-label={`${item.nombre} - ${item.color}, ${weight}`}
      >
        {/* Color indicator */}
        <Box
          sx={{
            width: 8,
            height: 40,
            borderRadius: 4,
            bgcolor: colorDot,
            flexShrink: 0,
          }}
        />

        {/* Main info */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="body1"
            sx={{
              fontWeight: 600,
              color: theme.palette.text.primary,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {displayName}
          </Typography>
          <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
            {item.color} • {weight}
          </Typography>
        </Box>

        {/* Trust Badge - Compact */}
        <TrustBadgeCompact score={trustScore} />

        {/* Quality badge */}
        <Chip
          label={quality.label}
          size="small"
          sx={{
            height: 22,
            fontSize: '0.6875rem',
            fontWeight: 600,
            bgcolor: quality.bg,
            color: quality.color,
            border: `1px solid ${quality.border}`,
          }}
        />

        {/* Price - Dual display */}
        <Box sx={{ minWidth: 100, textAlign: 'right' }}>
          <PriceDisplay price={item.precioCOP} precioInternacional={item.precioInternacional} compact />
        </Box>
      </Paper>
    );
  }

  // Grid card view - Simplified
  return (
    <Card
      elevation={0}
      onClick={onClick}
      role="article"
      aria-label={`${item.nombre} - ${item.color}, ${weight}`}
      sx={{
        borderRadius: 3,
        border: '1px solid',
        borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.light,
        bgcolor: isLight ? surfacesLight.background.primary : surfacesDark.background.secondary,
        overflow: 'hidden',
        transition: 'all 0.25s ease',
        cursor: 'pointer',
        '&:hover': {
          borderColor: emeraldCore.primary,
          transform: 'translateY(-4px)',
          boxShadow: isLight
            ? '0 20px 40px rgba(0, 0, 0, 0.08)'
            : '0 20px 40px rgba(0, 0, 0, 0.3)',
          '& .price-text': {
            color: emeraldCore.primary,
          },
        },
      }}
    >
      {/* Product Image/Video Section */}
      {item.imagen ? (
        <Box
          sx={{
            height: 160,
            position: 'relative',
            overflow: 'hidden',
            bgcolor: isLight ? surfacesLight.background.secondary : surfacesDark.background.tertiary,
          }}
        >
          {item.mediaType === 'video' ? (
            // Video with thumbnail and play icon
            <Box sx={{ position: 'relative', height: '100%', width: '100%' }}>
              <img
                src={item.thumbnailUrl || item.imagen}
                alt={`${item.nombre} - ${item.color}`}
                loading="lazy"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  bgcolor: 'rgba(0, 0, 0, 0.6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-label="Video disponible"
              >
                <Play size={24} color="white" fill="white" />
              </Box>
            </Box>
          ) : (
            // Image with lazy loading
            <img
              src={item.imagen}
              alt={`${item.nombre} - ${item.color}`}
              loading="lazy"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          )}

          {/* Gallery count badge if multiple media items */}
          {(item.galleryCount ?? 0) > 1 && (
            <Chip
              icon={<Images size={14} />}
              label={item.galleryCount}
              size="small"
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                bgcolor: 'rgba(0, 0, 0, 0.7)',
                color: 'white',
                fontSize: '0.7rem',
                fontWeight: 600,
                height: 24,
                '& .MuiChip-icon': {
                  color: 'white',
                },
              }}
            />
          )}
        </Box>
      ) : (
        // Placeholder for items without media
        <Box
          sx={{
            height: 160,
            bgcolor: isLight ? surfacesLight.background.secondary : surfacesDark.background.tertiary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Gem size={48} color={isLight ? surfacesLight.text.disabled : surfacesDark.text.disabled} />
        </Box>
      )}

      {/* Compact content */}
      <CardContent sx={{ p: 1.5, pb: 1.5, '&:last-child': { pb: 1.5 } }}>
        {/* Header row with color and quality */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75 }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: colorDot,
              flexShrink: 0,
            }}
          />
          <Typography
            variant="caption"
            sx={{
              color: theme.palette.text.secondary,
              fontSize: '0.65rem',
              flex: 1,
            }}
          >
            {item.color}
          </Typography>
          <Chip
            label={quality.label}
            size="small"
            sx={{
              height: 16,
              fontSize: '0.5rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              bgcolor: quality.bg,
              color: quality.color,
              border: `1px solid ${quality.border}`,
              '& .MuiChip-label': { px: 0.5 },
            }}
          />
        </Box>

        {/* Name */}
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            color: theme.palette.text.primary,
            mb: 0.25,
            lineHeight: 1.2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: '0.85rem',
          }}
        >
          {displayName}
        </Typography>

        {/* Specs */}
        <Typography
          variant="caption"
          sx={{
            color: theme.palette.text.secondary,
            fontSize: '0.7rem',
            display: 'block',
            mb: 0.75,
          }}
        >
          {isLoose && typeof item.peso === 'number' && `${item.peso} ct`}
          {item.isJewelry && item.metalType && item.metalType}
        </Typography>

        {/* Price */}
        <Box className="price-text">
          <PriceDisplay price={item.precioCOP} precioInternacional={item.precioInternacional} compact />
        </Box>

        {/* Expandable details - Progressive disclosure */}
        <Collapse in={showDetails}>
          <Box
            sx={{
              mt: 2,
              pt: 2,
              borderTop: '1px solid',
              borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.light,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                  Calidad
                </Typography>
                <Typography variant="caption" sx={{ color: theme.palette.text.primary, fontWeight: 500 }}>
                  {item.calidad}
                </Typography>
              </Box>

              {item.talla && item.talla !== '-' && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                    {item.isJewelry ? 'Talla' : 'Corte'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: theme.palette.text.primary, fontWeight: 500 }}>
                    {item.talla}
                  </Typography>
                </Box>
              )}

              {item.medidas && item.medidas !== '-' && item.medidas !== 'Anillo' && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                    Medidas
                  </Typography>
                  <Typography variant="caption" sx={{ color: theme.palette.text.primary, fontWeight: 500 }}>
                    {item.medidas}
                  </Typography>
                </Box>
              )}

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                <MapPin size={12} color={surfacesLight.text.tertiary} />
                <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                  {item.ubicacion}
                </Typography>
                <Box sx={{ flex: 1 }} />
                <User size={12} color={surfacesLight.text.tertiary} />
                <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                  {item.asesor}
                </Typography>
              </Box>

              {/* Product Certification Section */}
              <Box
                sx={{
                  mt: 2,
                  pt: 2,
                  borderTop: '1px solid',
                  borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.light,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                    Certificación del Producto
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 700, color: trustBadge.color }}
                  >
                    {trustScore.overall}/100
                  </Typography>
                </Box>
                <Typography
                  variant="caption"
                  sx={{
                    color: theme.palette.text.secondary,
                    fontSize: '0.65rem',
                    display: 'block',
                    mb: 1,
                  }}
                >
                  Autenticidad de la esmeralda (no del vendedor)
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={trustScore.overall}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    bgcolor: alpha(trustBadge.color, 0.15),
                    mb: 1.5,
                    '& .MuiLinearProgress-bar': {
                      bgcolor: trustBadge.color,
                      borderRadius: 3,
                    },
                  }}
                />
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<FileCheck size={14} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onCertClick();
                  }}
                  aria-label={`Ver certificaciones de ${item.nombre}`}
                  sx={{
                    width: '100%',
                    borderColor: emeraldCore.dark,
                    color: emeraldCore.dark,
                    fontSize: '0.75rem',
                    py: 0.5,
                    '&:hover': {
                      bgcolor: alpha(emeraldCore.dark, 0.08),
                      borderColor: emeraldCore.darker,
                    },
                  }}
                >
                  Ver Certificaciones
                </Button>
              </Box>
            </Box>
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
}

// Memoized version for performance - only re-renders when item data changes
export const MemoizedInventoryCard = memo(InventoryCard, (prevProps, nextProps) => {
  // Only re-render if these key properties change
  return (
    prevProps.item.item === nextProps.item.item &&
    prevProps.item.imagen === nextProps.item.imagen &&
    prevProps.item.precioCOP === nextProps.item.precioCOP &&
    prevProps.item.estado === nextProps.item.estado &&
    prevProps.isCompact === nextProps.isCompact &&
    prevProps.trustScore.overall === nextProps.trustScore.overall
  );
});

export default InventoryCard;
