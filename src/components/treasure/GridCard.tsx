/**
 * GridCard Component
 * Grid view card for treasure items optimized for 2-column mobile layout.
 *
 * iOS HIG Compliant:
 * - 44pt minimum touch targets
 * - 8pt grid system spacing
 * - Compact typography for 2-column grid
 * - Spring animations for tactile feedback
 */
import React, { useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  IconButton,
  alpha,
} from '@mui/material';
import {
  Images,
  Eye,
  Scale,
} from 'lucide-react';
import { useThemeMode } from '../../contexts/ThemeContext';
import { TreasureItem } from '../../types';
import { getColorDot, getQualityBadge } from '../../utils/formatting';
import { PriceDisplay } from '../PriceDisplay';
import ProgressiveImage from '../ProgressiveImage';
import { emeraldCore, surfacesLight, surfacesDark } from '../../design-system/tokens/colors';
import {
  animation,
  iosSemanticColors,
} from '../../design-system';

interface GridCardProps {
  item: TreasureItem;
  isFavorite?: boolean;
  onItemClick: () => void;
  onCertClick?: () => void;
  onToggleFavorite?: () => void;
  isSelectedForComparison?: boolean;
  onToggleComparison?: () => void;
  canAddToComparison?: boolean;
  isMobile?: boolean;
  /** View count for this product (optional) */
  viewCount?: number;
  /** Whether the current user is an admin (required to see view counts) */
  isAdmin?: boolean;
  /** Provider mode - hides prices and comparison features */
  isProviderMode?: boolean;
}

function GridCard({
  item,
  onItemClick,
  isMobile = false,
  viewCount,
  isAdmin,
  isSelectedForComparison = false,
  onToggleComparison,
  canAddToComparison = true,
  isProviderMode = false,
}: GridCardProps) {
  const { mode } = useThemeMode();
  const isLight = mode === 'light';

  const labelColor = iosSemanticColors.label[mode];
  const secondaryLabelColor = iosSemanticColors.secondaryLabel[mode];

  const displayName = item.nombre.replace(/^L:.*?\s/, '').replace(/^L:/, '').trim();
  const quality = getQualityBadge(item.calidad);
  const colorDot = getColorDot(item.color);
  const isLoose = !item.isJewelry;

  const handleCompareClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleComparison?.();
  }, [onToggleComparison]);

  return (
    <Card
      elevation={0}
      onClick={onItemClick}
      role="article"
      aria-label={`${item.nombre} - ${item.color}`}
      tabIndex={0}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: isMobile ? '10px' : '12px', // iOS HIG standard border radius
        border: '1px solid',
        borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.light,
        bgcolor: isLight ? surfacesLight.background.primary : surfacesDark.background.secondary,
        overflow: 'hidden',
        transition: animation.transition.spring,
        cursor: 'pointer',
        '&:hover': {
          borderColor: emeraldCore.primary,
          transform: isMobile ? 'none' : 'translateY(-2px)',
          boxShadow: isLight
            ? '0 8px 20px rgba(0, 0, 0, 0.08)'
            : '0 8px 20px rgba(0, 0, 0, 0.25)',
        },
        '&:active': {
          transform: 'scale(0.98)',
          transition: animation.transition.fast,
        },
        '&:focus-visible': {
          outline: `2px solid ${emeraldCore.primary}`,
          outlineOffset: 2,
        },
      }}
    >
      {/* Image Section - 1:1 aspect ratio */}
      <Box sx={{ position: 'relative', flexShrink: 0 }}>
        {item.imagen ? (
          <>
            {/* Always use ProgressiveImage for grid - shows thumbnail for all products */}
            <ProgressiveImage
              src={item.imagen}
              alt={`${item.nombre} - ${item.color}`}
              aspectRatio="1 / 1"
              layout="full"
              quality="eco"
            />

            {/* Gallery count badge */}
            {(item.galleryCount ?? 0) > 1 && (
              <Chip
                icon={<Images size={12} />}
                label={item.galleryCount}
                size="small"
                sx={{
                  position: 'absolute',
                  bottom: 6,
                  right: 6,
                  bgcolor: 'rgba(0, 0, 0, 0.7)',
                  color: 'white',
                  fontSize: 10,
                  fontWeight: 600,
                  height: 20,
                  '& .MuiChip-icon': { color: 'white', ml: 0.5 },
                  '& .MuiChip-label': { px: 0.5 },
                }}
              />
            )}

            {/* Quality badge */}
            <Chip
              label={quality.label}
              size="small"
              sx={{
                position: 'absolute',
                bottom: 6,
                left: 6,
                height: 18,
                fontSize: 9,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
                bgcolor: quality.bg,
                color: quality.color,
                border: `1px solid ${quality.border}`,
                backdropFilter: 'blur(4px)',
                '& .MuiChip-label': { px: 0.75 },
              }}
            />

            {/* Quantity badge */}
            {item.cantidad > 1 && (
              <Chip
                label={`×${item.cantidad}`}
                size="small"
                sx={{
                  position: 'absolute',
                  bottom: 6,
                  left: quality.label.length > 4 ? 52 : 44,
                  height: 18,
                  fontSize: 9,
                  fontWeight: 700,
                  bgcolor: 'rgba(0, 0, 0, 0.7)',
                  color: 'white',
                  backdropFilter: 'blur(4px)',
                  '& .MuiChip-label': { px: 0.5 },
                }}
              />
            )}

            {/* View count badge - top left (Admin only) */}
            {isAdmin && viewCount !== undefined && viewCount > 0 && (
              <Chip
                icon={<Eye size={10} />}
                label={viewCount > 999 ? `${(viewCount / 1000).toFixed(1)}k` : viewCount}
                size="small"
                sx={{
                  position: 'absolute',
                  top: 6,
                  left: 6,
                  height: 18,
                  fontSize: 9,
                  fontWeight: 500,
                  bgcolor: 'rgba(0, 0, 0, 0.55)',
                  color: 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(4px)',
                  '& .MuiChip-icon': { color: 'rgba(255, 255, 255, 0.7)', ml: 0.5 },
                  '& .MuiChip-label': { px: 0.5 },
                }}
              />
            )}

            {/* Compare button - top right (hidden in provider mode) */}
            {onToggleComparison && !isProviderMode && (
              <IconButton
                onClick={handleCompareClick}
                aria-label={isSelectedForComparison ? 'Quitar de comparación' : 'Agregar a comparación'}
                disabled={!isSelectedForComparison && !canAddToComparison}
                size="small"
                sx={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  width: 32,
                  height: 32,
                  bgcolor: isSelectedForComparison
                    ? emeraldCore.primary
                    : alpha('#000000', 0.55),
                  color: 'white',
                  backdropFilter: 'blur(4px)',
                  '&:hover': {
                    bgcolor: isSelectedForComparison
                      ? emeraldCore.dark
                      : alpha('#000000', 0.7),
                  },
                  '&:disabled': {
                    bgcolor: alpha('#000000', 0.3),
                    color: 'rgba(255, 255, 255, 0.5)',
                  },
                }}
              >
                <Scale size={16} />
              </IconButton>
            )}
          </>
        ) : (
          <ProgressiveImage
            src={undefined}
            alt={`${item.nombre} - placeholder`}
            aspectRatio="1 / 1"
          />
        )}

      </Box>

      {/* Content Section - iOS HIG spacing (8pt base) */}
      <CardContent
        sx={{
          p: isMobile ? 1.5 : 2, // 12px mobile, 16px desktop
          pt: isMobile ? 1 : 1.5, // 8px mobile, 12px desktop
          '&:last-child': { pb: isMobile ? 1.5 : 2 },
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: 0,
        }}
      >
        {/* Name - iOS HIG Subheadline (15pt mobile, 16pt desktop) */}
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            color: labelColor,
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: isMobile ? 15 : 16, // iOS HIG subheadline
            letterSpacing: '-0.24px', // iOS HIG subheadline tracking
            mb: 0.5,
          }}
        >
          {displayName}
        </Typography>

        {/* Specs with color dot - iOS HIG Caption1 (12pt mobile, 13pt desktop) */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75 }}>
          <Box
            sx={{
              width: isMobile ? 8 : 10, // Slightly larger for visibility
              height: isMobile ? 8 : 10,
              borderRadius: '50%',
              bgcolor: colorDot,
              flexShrink: 0,
            }}
          />
          <Typography
            variant="caption"
            sx={{
              color: secondaryLabelColor,
              fontSize: isMobile ? 12 : 13, // iOS HIG caption1
              letterSpacing: 0, // iOS HIG caption1 tracking
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {item.color}
            {isLoose && typeof item.peso === 'number' && ` • ${item.peso} ct`}
            {item.isJewelry && item.metalType && ` • ${item.metalType}`}
          </Typography>
        </Box>

        {/* Price - Compact (hidden in provider mode) */}
        {!isProviderMode && (
          <PriceDisplay price={item.precioCOP} precioInternacional={item.precioInternacional} compact />
        )}
      </CardContent>
    </Card>
  );
}

export default React.memo(GridCard, (prevProps, nextProps) => {
  return (
    prevProps.item.item === nextProps.item.item &&
    prevProps.item.imagen === nextProps.item.imagen &&
    prevProps.item.precioCOP === nextProps.item.precioCOP &&
    prevProps.item.estado === nextProps.item.estado &&
    prevProps.isMobile === nextProps.isMobile &&
    prevProps.viewCount === nextProps.viewCount &&
    prevProps.isAdmin === nextProps.isAdmin &&
    prevProps.isSelectedForComparison === nextProps.isSelectedForComparison &&
    prevProps.canAddToComparison === nextProps.canAddToComparison &&
    prevProps.isProviderMode === nextProps.isProviderMode
  );
});
