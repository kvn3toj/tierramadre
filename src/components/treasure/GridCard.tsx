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
  Skeleton,
  alpha,
  Tooltip,
} from '@mui/material';
import {
  Images,
  Eye,
  Scale,
} from 'lucide-react';
import { useThemeMode } from '../../contexts/ThemeContext';
import { usePriceShare } from '../../contexts/PriceShareContext';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { prefetchRoute } from '../../utils/routePrefetch';
import { TreasureItem } from '../../types';
import { getQualityBadge, getQualityTooltip } from '../../utils/formatting';
import { PriceDisplay } from '../price-simulator/PriceDisplay';
import ProgressiveImage from '../shared/ProgressiveImage';
import { emeraldCore, surfacesLight, surfacesDark } from '../../design-system/tokens/colors';
import {
  animation,
  iosSemanticColors,
  blurValues,
} from '../../design-system';

interface GridCardProps {
  item: TreasureItem;
  isFavorite?: boolean;
  onItemClick: (item: TreasureItem) => void;
  onCertClick?: (item: TreasureItem) => void;
  onToggleFavorite?: (itemId: number) => void;
  isSelectedForComparison?: boolean;
  onToggleComparison?: (item: TreasureItem) => void;
  canAddToComparison?: boolean;
  isMobile?: boolean;
  /** Whether batch thumbnails are still loading from the API */
  isLoadingThumbnails?: boolean;
  /** Above-the-fold item — triggers eager loading */
  priority?: boolean;
  /** View count for this product (optional) */
  viewCount?: number;
  /** Whether the current user is an admin (required to see view counts) */
  isAdmin?: boolean;
}

function GridCard({
  item,
  onItemClick,
  isMobile = false,
  isLoadingThumbnails = false,
  priority = false,
  viewCount,
  isAdmin,
  isSelectedForComparison = false,
  onToggleComparison,
  canAddToComparison = true,
}: GridCardProps) {
  const { mode } = useThemeMode();
  const isLight = mode === 'light';
  const { shouldShowPrices } = usePriceShare();
  const prefersReducedMotion = useReducedMotion();

  const labelColor = iosSemanticColors.label[mode];
  const secondaryLabelColor = iosSemanticColors.secondaryLabel[mode];

  const displayName = item.nombre.replace(/^L:.*?\s/, '').replace(/^L:/, '').trim();
  const quality = getQualityBadge(item.calidad);
  const qualityTooltip = getQualityTooltip(item.calidad);
  const isLoose = !item.isJewelry;

  const handleItemClick = useCallback(() => {
    onItemClick(item);
  }, [onItemClick, item]);

  const handleCompareClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleComparison?.(item);
  }, [onToggleComparison, item]);

  const handlePrefetch = useCallback(() => {
    prefetchRoute('product');
  }, []);

  return (
    <Card
      elevation={0}
      onClick={handleItemClick}
      onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleItemClick(); } }}
      onMouseEnter={handlePrefetch}
      onFocus={handlePrefetch}
      role="article"
      aria-label={`${item.nombre} - ${item.color}`}
      tabIndex={0}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: isMobile ? '10px' : '12px',
        border: '1px solid',
        borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.light,
        bgcolor: isLight ? surfacesLight.background.primary : surfacesDark.background.secondary,
        overflow: 'hidden',
        transition: prefersReducedMotion ? 'none' : animation.transition.spring,
        cursor: 'pointer',
        boxShadow: isLight
          ? '0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)'
          : '0 2px 6px rgba(0, 0, 0, 0.3), 0 0 1px rgba(255, 255, 255, 0.05) inset',
        // Image zoom transition
        '& img': {
          transition: prefersReducedMotion ? 'none' : 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
        },
        '&:hover': {
          borderColor: emeraldCore.primary,
          transform: prefersReducedMotion || isMobile ? 'none' : 'translateY(-3px)',
          boxShadow: isLight
            ? '0 12px 28px rgba(0, 0, 0, 0.10), 0 4px 8px rgba(0, 0, 0, 0.06)'
            : `0 12px 28px rgba(0, 0, 0, 0.35), 0 0 1px ${alpha(emeraldCore.primary, 0.15)} inset`,
          // Zoom product image on hover (desktop only)
          ...(!prefersReducedMotion && !isMobile && {
            '& img': { transform: 'scale(1.06)' },
          }),
        },
        '&:active': {
          transform: prefersReducedMotion ? 'none' : 'scale(0.97)',
          transition: prefersReducedMotion ? 'none' : 'transform 0.1s ease-out',
        },
        '&:focus-visible': {
          outline: `2px solid ${emeraldCore.primary}`,
          outlineOffset: 2,
        },
      }}
    >
      {/* Image Section — flex:1 absorbs extra row height when name is single-line */}
      <Box sx={{ position: 'relative', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {item.imagen ? (
          <>
            <ProgressiveImage
              src={item.imagen}
              alt={`${item.nombre} - ${item.color}`}
              height="100%"
              layout="full"
              quality="eco"
              priority={priority}
              tinyThumb={item.tinyThumb}
            />

            {/* Depth gradient overlay */}
            <Box
              sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '45%',
                background: isLight
                  ? 'linear-gradient(to top, rgba(0,0,0,0.06), transparent)'
                  : 'linear-gradient(to top, rgba(0,0,0,0.35), transparent)',
                pointerEvents: 'none',
              }}
            />

            {/* Gallery count badge — bottom right, stacks above quantity when both exist */}
            {(item.galleryCount ?? 0) > 1 && (
              <Chip
                icon={<Images size={10} />}
                label={item.galleryCount}
                size="small"
                sx={{
                  position: 'absolute',
                  // Shift up when quantity badge occupies the bottom-right slot
                  bottom: item.cantidad > 1 ? 28 : 6,
                  right: 6,
                  bgcolor: 'rgba(0, 0, 0, 0.65)',
                  color: 'white',
                  fontSize: 9,
                  fontWeight: 600,
                  height: 18,
                  backdropFilter: `blur(${blurValues.xs})`,
                  '& .MuiChip-icon': { color: 'rgba(255, 255, 255, 0.8)', ml: 0.5 },
                  '& .MuiChip-label': { px: 0.5 },
                }}
              />
            )}

            {/* Quality badge — bottom left */}
            <Tooltip title={qualityTooltip} arrow enterDelay={300} placement="top">
            <Chip
              label={quality.label}
              size="small"
              sx={{
                position: 'absolute',
                bottom: 6,
                left: 6,
                // Cap width so it doesn't crash into right-side badges
                maxWidth: item.cantidad > 1 ? 'calc(100% - 52px)' : 'calc(100% - 12px)',
                height: 18,
                fontSize: 9,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
                bgcolor: quality.bg,
                color: quality.color,
                border: `1px solid ${quality.border}`,
                backdropFilter: `blur(${blurValues.xs})`,
                '& .MuiChip-label': {
                  px: 0.75,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                },
              }}
            />
            </Tooltip>

            {/* Quantity badge — bottom right */}
            {item.cantidad > 1 && (
              <Chip
                label={`×${item.cantidad}`}
                size="small"
                sx={{
                  position: 'absolute',
                  bottom: 6,
                  right: 6,
                  height: 18,
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.02em',
                  bgcolor: 'rgba(0, 0, 0, 0.65)',
                  color: 'white',
                  backdropFilter: `blur(${blurValues.xs})`,
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
                  backdropFilter: `blur(${blurValues.xs})`,
                  '& .MuiChip-icon': { color: 'rgba(255, 255, 255, 0.7)', ml: 0.5 },
                  '& .MuiChip-label': { px: 0.5 },
                }}
              />
            )}

            {/* Compare button - top right (hidden when prices not shown) */}
            {onToggleComparison && shouldShowPrices && (
              <IconButton
                onClick={handleCompareClick}
                aria-label={isSelectedForComparison ? 'Quitar de comparación' : 'Agregar a comparación'}
                disabled={!isSelectedForComparison && !canAddToComparison}
                size="small"
                sx={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  width: 40,
                  height: 40,
                  bgcolor: isSelectedForComparison
                    ? emeraldCore.primary
                    : alpha('#000000', 0.55),
                  color: 'white',
                  backdropFilter: `blur(${blurValues.xs})`,
                  transition: prefersReducedMotion ? 'none' : 'background-color 0.2s ease, transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  '&:hover': {
                    bgcolor: isSelectedForComparison
                      ? emeraldCore.dark
                      : alpha('#000000', 0.7),
                    transform: prefersReducedMotion ? 'none' : 'scale(1.1)',
                  },
                  '&:active': {
                    transform: prefersReducedMotion ? 'none' : 'scale(0.9)',
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
        ) : isLoadingThumbnails ? (
          /* Skeleton while thumbnails are loading from API */
          <Box sx={{ aspectRatio: '4 / 5', width: '100%' }}>
            <Skeleton variant="rectangular" animation="wave" width="100%" height="100%" />
          </Box>
        ) : (
          /* Watermark placeholder - thumbnails loaded but no image for this product */
          <ProgressiveImage
            src={undefined}
            alt={`${item.nombre} - placeholder`}
            aspectRatio="4 / 5"
          />
        )}

      </Box>

      {/* Content Section — vertical: Name → Price → specs */}
      <CardContent
        sx={{
          p: isMobile ? 1.25 : 1.5,
          '&:last-child': { pb: isMobile ? 1.25 : 1.5 },
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 0.25,
          minHeight: 0,
          borderTop: `1px solid ${isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)'}`,
          bgcolor: isLight
            ? surfacesLight.background.primary
            : alpha(surfacesDark.background.tertiary, 0.5),
        }}
      >
        {/* Name — full width, up to 2 lines */}
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            color: labelColor,
            lineHeight: 1.25,
            fontSize: isMobile ? 14 : 15,
            letterSpacing: '-0.24px',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {displayName}
        </Typography>

        {/* Price — full width below name */}
        {shouldShowPrices && (
          <PriceDisplay price={item.precioCOP} precioInternacional={item.precioInternacional} compact />
        )}

        {/* Specs */}
        <Typography
          variant="caption"
          sx={{
            color: secondaryLabelColor,
            fontSize: isMobile ? 11 : 12,
            lineHeight: 1.2,
            letterSpacing: '-0.1px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {item.color}
          {isLoose && typeof item.peso === 'number' && ` · ${item.peso} ct`}
          {item.isJewelry && item.metalType && ` · ${item.metalType}`}
        </Typography>
      </CardContent>
    </Card>
  );
}

// Memo comparison skips callback props — they are stable parent refs or excluded
// intentionally so that unstable wrappers don't defeat memoization.
// Context-derived values (shouldShowPrices) trigger re-render via context anyway.
export default React.memo(GridCard, (prevProps, nextProps) => {
  return (
    prevProps.item.item === nextProps.item.item &&
    prevProps.item.imagen === nextProps.item.imagen &&
    prevProps.item.precioCOP === nextProps.item.precioCOP &&
    prevProps.item.estado === nextProps.item.estado &&
    prevProps.isFavorite === nextProps.isFavorite &&
    prevProps.isMobile === nextProps.isMobile &&
    prevProps.isLoadingThumbnails === nextProps.isLoadingThumbnails &&
    prevProps.priority === nextProps.priority &&
    prevProps.viewCount === nextProps.viewCount &&
    prevProps.isAdmin === nextProps.isAdmin &&
    prevProps.isSelectedForComparison === nextProps.isSelectedForComparison &&
    prevProps.canAddToComparison === nextProps.canAddToComparison
  );
});
