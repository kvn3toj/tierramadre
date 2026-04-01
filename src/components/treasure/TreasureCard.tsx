/**
 * TreasureCard Component
 * Displays a treasure item in either grid or compact list view.
 * Extracted from TreasureBrowser.tsx for better modularity.
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
  Collapse,
} from '@mui/material';
import {
  MapPin,
  User,
  Images,
  Eye,
} from 'lucide-react';
// Logo placeholder for products without images - use Vite asset import
import logoPlaceholder from '../../assets/logo-symbol.png';
import { useThemeMode } from '../../contexts/ThemeContext';
import { TreasureItem } from '../../types';
import { getColorDot, getQualityBadge, formatCarats } from '../../utils/formatting';
import { PriceDisplay } from '../price-simulator/PriceDisplay';
// Design System Tokens
import { emeraldCore, surfacesLight, surfacesDark } from '../../design-system/tokens/colors';
import { cssTransition, fontWeights } from '../../design-system';

export interface TreasureCardProps {
  item: TreasureItem;
  isCompact: boolean;
  onCertClick: () => void;
  onClick: () => void;
  /** View count for this product (optional) */
  viewCount?: number;
  /** Whether the current user is an admin (required to see view counts) */
  isAdmin?: boolean;
}

export function TreasureCard({ item, isCompact, onCertClick: _onCertClick, onClick, viewCount, isAdmin }: TreasureCardProps) {
  const theme = useTheme();
  const { mode } = useThemeMode();
  const isLight = mode === 'light';
  const [showDetails] = useState(false);

  const displayName = item.nombre.replace(/^L:.*?\s/, '').replace(/^L:/, '').trim();
  const quality = getQualityBadge(item.calidad);
  const colorDot = getColorDot(item.color);
  const isLoose = !item.isJewelry;
  const weight = typeof item.peso === 'number' ? `${formatCarats(item.peso)} ct` : item.metalType;

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
          transition: cssTransition.default,
          '&:hover': {
            borderColor: emeraldCore.dark,
            bgcolor: isLight ? emeraldCore.lightest : alpha(emeraldCore.dark, 0.08),
          },
        }}
        onClick={onClick}
        onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
        role="article"
        tabIndex={0}
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
              fontWeight: fontWeights.semibold,
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

        {/* Quality badge */}
        <Chip
          label={quality.label}
          size="small"
          sx={{
            height: 22,
            fontSize: '0.6875rem',
            fontWeight: fontWeights.semibold,
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
      onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      role="article"
      tabIndex={0}
      aria-label={`${item.nombre} - ${item.color}, ${weight}`}
      sx={{
        borderRadius: 3,
        border: '1px solid',
        borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.light,
        bgcolor: isLight ? surfacesLight.background.primary : surfacesDark.background.secondary,
        overflow: 'hidden',
        transition: cssTransition.default,
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
      {/* Product Image Section */}
      {item.imagen ? (
        <Box
          sx={{
            height: 160,
            position: 'relative',
            overflow: 'hidden',
            bgcolor: isLight ? surfacesLight.background.secondary : surfacesDark.background.tertiary,
          }}
        >
          {/* Always show thumbnail image in grid view */}
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

          {/* View count badge - Admin only */}
          {isAdmin && viewCount !== undefined && viewCount > 0 && (
            <Chip
              icon={<Eye size={12} />}
              label={viewCount > 999 ? `${(viewCount / 1000).toFixed(1)}k` : viewCount}
              size="small"
              sx={{
                position: 'absolute',
                bottom: 8,
                left: 8,
                bgcolor: 'rgba(0, 0, 0, 0.6)',
                color: 'white',
                fontSize: '0.65rem',
                fontWeight: 500,
                height: 22,
                '& .MuiChip-icon': {
                  color: 'rgba(255, 255, 255, 0.8)',
                  marginLeft: '4px',
                },
                '& .MuiChip-label': {
                  paddingRight: '8px',
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
          <Box
            component="img"
            src={logoPlaceholder}
            alt=""
            sx={{
              width: 48,
              height: 'auto',
              opacity: 0.28,
              filter: isLight ? 'brightness(0.7)' : 'brightness(0.5)',
            }}
          />
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
              fontWeight: fontWeights.bold,
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
            fontWeight: fontWeights.semibold,
            color: theme.palette.text.primary,
            mb: 0.25,
            lineHeight: 1.3,
            fontSize: '0.85rem',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            minHeight: '2.2em',
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
          {isLoose && typeof item.peso === 'number' && `${formatCarats(item.peso)} ct`}
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
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
            }}
          >
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
                  <Typography variant="caption" sx={{ color: theme.palette.text.primary, fontWeight: fontWeights.medium }}>
                    {item.talla}
                  </Typography>
                </Box>
              )}

              {item.medidas && item.medidas !== '-' && item.medidas !== 'Anillo' && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                    Medidas
                  </Typography>
                  <Typography variant="caption" sx={{ color: theme.palette.text.primary, fontWeight: fontWeights.medium }}>
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
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
}

// Memoized version for performance - only re-renders when item data changes
export const MemoizedTreasureCard = memo(TreasureCard, (prevProps, nextProps) => {
  // Only re-render if these key properties change
  return (
    prevProps.item.item === nextProps.item.item &&
    prevProps.item.imagen === nextProps.item.imagen &&
    prevProps.item.precioCOP === nextProps.item.precioCOP &&
    prevProps.item.estado === nextProps.item.estado &&
    prevProps.isCompact === nextProps.isCompact &&
    prevProps.viewCount === nextProps.viewCount &&
    prevProps.isAdmin === nextProps.isAdmin
  );
});

export default TreasureCard;
