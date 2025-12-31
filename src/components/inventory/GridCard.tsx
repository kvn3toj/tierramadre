/**
 * GridCard Component
 * Grid view card for inventory items with golden ratio layout.
 * Optimized for virtualized rendering.
 *
 * iOS HIG Compliant:
 * - 44pt minimum touch targets
 * - Spring animations for tactile feedback
 * - Consistent typography scale (body 17pt, footnote 13pt)
 * - Hairline separators and subtle surfaces
 */
import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  IconButton,
} from '@mui/material';
import {
  Play,
  Images,
  Heart,
  Scale,
} from 'lucide-react';
import { triggerHaptic } from '../../hooks/useHaptics';
import { useThemeMode } from '../../contexts/ThemeContext';
import { InventoryItem } from '../../types';
import { getColorDot, getQualityBadge } from '../../utils/formatting';
import { PriceDisplay } from '../PriceDisplay';
import ProgressiveImage from '../ProgressiveImage';
import { emeraldCore, surfacesLight, surfacesDark } from '../../design-system/tokens/colors';
import {
  iosTypographyScale,
  accentColors,
  lightTokens,
  darkTokens,
  animation,
  iosSemanticColors,
} from '../../design-system';

interface GridCardProps {
  item: InventoryItem;
  isFavorite: boolean;
  onItemClick: () => void;
  onCertClick: () => void;
  onToggleFavorite: () => void;
  // Comparison props
  isSelectedForComparison?: boolean;
  onToggleComparison?: () => void;
  canAddToComparison?: boolean;
  // Mobile optimization
  isMobile?: boolean;
}

function GridCard({
  item,
  isFavorite,
  onItemClick,
  onToggleFavorite,
  isSelectedForComparison = false,
  onToggleComparison,
  canAddToComparison = true,
  isMobile = false,
}: GridCardProps) {
  const { mode } = useThemeMode();
  const isLight = mode === 'light';

  // iOS semantic colors for proper dark mode support
  const labelColor = iosSemanticColors.label[mode];
  const secondaryLabelColor = iosSemanticColors.secondaryLabel[mode];

  const displayName = item.nombre.replace(/^L:.*?\s/, '').replace(/^L:/, '').trim();
  const quality = getQualityBadge(item.calidad);
  const colorDot = getColorDot(item.color);
  const isLoose = !item.isJewelry;
  const weight = typeof item.peso === 'number' ? `${item.peso} ct` : item.metalType;

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic(isFavorite ? 'light' : 'selection');
    onToggleFavorite();
  };

  const handleCompareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic(isSelectedForComparison ? 'light' : 'medium');
    onToggleComparison?.();
  };

  return (
    <Card
      elevation={0}
      onClick={onItemClick}
      role="article"
      aria-label={`${item.nombre} - ${item.color}, ${weight}`}
      tabIndex={0}
      sx={{
        borderRadius: 3,
        border: '1px solid',
        borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.light,
        bgcolor: isLight ? surfacesLight.background.primary : surfacesDark.background.secondary,
        overflow: 'hidden',
        transition: animation.transition.spring,
        cursor: 'pointer',
        '&:hover': {
          borderColor: emeraldCore.primary,
          transform: 'translateY(-2px) scale(1.01)',
          boxShadow: isLight
            ? '0 12px 24px rgba(0, 0, 0, 0.08)'
            : '0 12px 24px rgba(0, 0, 0, 0.25)',
        },
        '&:active': {
          transform: 'scale(0.98)',
          transition: animation.transition.fast,
        },
        '&:focus-visible': {
          outline: `3px solid ${emeraldCore.primary}`,
          outlineOffset: 2,
        },
      }}
    >
      {/* Image Section - Golden Ratio: ~61.8% */}
      <Box sx={{ position: 'relative', flexShrink: 0 }}>
        {item.imagen ? (
          <>
            <ProgressiveImage
              src={item.imagen}
              alt={`${item.nombre} - ${item.color}`}
              // Mobile: Square 1:1 aspect ratio for luxury feel
              // Desktop: Fixed height for compact grid
              aspectRatio={isMobile ? '1 / 1' : undefined}
              height={isMobile ? undefined : 180}
              width={isMobile ? undefined : 200}
              layout={isMobile ? 'full' : 'grid'}
              quality={isMobile ? 'good' : 'eco'}
            />

            {/* Video play indicator */}
            {item.mediaType === 'video' && (
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
            )}

            {/* Gallery count badge - iOS HIG caption1 = 12px */}
            {(item.galleryCount ?? 0) > 1 && (
              <Chip
                icon={<Images size={14} />}
                label={item.galleryCount}
                size="small"
                sx={{
                  position: 'absolute',
                  bottom: 8,
                  right: 8,
                  bgcolor: 'rgba(0, 0, 0, 0.7)',
                  color: 'white',
                  fontSize: iosTypographyScale.caption1, // 12px iOS HIG
                  fontWeight: 600,
                  height: 24,
                  '& .MuiChip-icon': { color: 'white' },
                }}
              />
            )}

            {/* Quality and quantity badges - overlay on image bottom-left */}
            <Box
              sx={{
                position: 'absolute',
                bottom: 8,
                left: 8,
                display: 'flex',
                gap: 0.5,
              }}
            >
              {/* Quality badge - iOS caption2 (11px) */}
              <Chip
                label={quality.label}
                size="small"
                sx={{
                  height: 20,
                  fontSize: iosTypographyScale.caption2,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.02em',
                  bgcolor: quality.bg,
                  color: quality.color,
                  border: `1px solid ${quality.border}`,
                  backdropFilter: 'blur(8px)',
                }}
              />
              {/* Quantity badge - iOS caption2 (11px) */}
              {item.cantidad > 1 && (
                <Chip
                  label={`×${item.cantidad}`}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: iosTypographyScale.caption2,
                    fontWeight: 600,
                    bgcolor: 'rgba(0, 0, 0, 0.7)',
                    color: 'white',
                    backdropFilter: 'blur(8px)',
                  }}
                />
              )}
            </Box>
          </>
        ) : (
          <ProgressiveImage
            src={undefined}
            alt={`${item.nombre} - placeholder`}
            height={80}
          />
        )}

        {/* Action buttons - Top right */}
        <Box
          sx={{
            position: 'absolute',
            top: isMobile ? 12 : 8,
            right: isMobile ? 12 : 8,
            display: 'flex',
            flexDirection: 'column',
            gap: isMobile ? 1 : 0.5,
          }}
        >
          {/* Favorite button - 44px touch target on mobile (Apple HIG) */}
          <IconButton
            onClick={handleFavoriteClick}
            aria-label={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
            size={isMobile ? 'medium' : 'small'}
            sx={{
              width: isMobile ? 44 : 32,
              height: isMobile ? 44 : 32,
              bgcolor: isLight
                ? 'rgba(255, 255, 255, 0.95)'
                : 'rgba(30, 41, 59, 0.95)',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              transition: animation.transition.spring,
              '&:hover': {
                bgcolor: isLight
                  ? 'rgba(255, 255, 255, 1)'
                  : 'rgba(30, 41, 59, 1)',
                transform: 'scale(1.08)',
              },
              '&:active': {
                transform: 'scale(0.92)',
              },
            }}
          >
            <Heart
              size={isMobile ? 22 : 16}
              fill={isFavorite ? accentColors.error.light : 'none'}
              color={isFavorite ? accentColors.error.light : isLight ? lightTokens.text.secondary : darkTokens.text.secondary}
            />
          </IconButton>

          {/* Comparison button - 44px touch target on mobile */}
          {onToggleComparison && (
            <IconButton
              onClick={handleCompareClick}
              aria-label={isSelectedForComparison ? 'Quitar de comparación' : 'Agregar a comparación'}
              disabled={!isSelectedForComparison && !canAddToComparison}
              size={isMobile ? 'medium' : 'small'}
              sx={{
                width: isMobile ? 44 : 32,
                height: isMobile ? 44 : 32,
                bgcolor: isSelectedForComparison
                  ? emeraldCore.primary
                  : isLight
                    ? 'rgba(255, 255, 255, 0.95)'
                    : 'rgba(30, 41, 59, 0.95)',
                backdropFilter: 'blur(8px)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                transition: animation.transition.spring,
                '&:hover': {
                  bgcolor: isSelectedForComparison
                    ? emeraldCore.dark
                    : isLight
                      ? 'rgba(255, 255, 255, 1)'
                      : 'rgba(30, 41, 59, 1)',
                  transform: 'scale(1.08)',
                },
                '&:active': {
                  transform: 'scale(0.92)',
                },
                '&:disabled': {
                  bgcolor: 'rgba(200, 200, 200, 0.5)',
                },
              }}
            >
              <Scale
                size={isMobile ? 22 : 16}
                color={isSelectedForComparison ? lightTokens.text.inverse : isLight ? lightTokens.text.secondary : darkTokens.text.secondary}
              />
            </IconButton>
          )}
        </Box>
      </Box>

      {/* Content Section - Enhanced padding and typography on mobile */}
      <CardContent
        sx={{
          p: isMobile ? 2 : 1.25,
          '&:last-child': { pb: isMobile ? 2 : 1.25 },
        }}
      >
        {/* Name - iOS HIG body (17px) on mobile for readability */}
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600, // iOS headline weight
            color: labelColor,
            mb: isMobile ? 0.5 : 0.25,
            lineHeight: 1.4, // iOS body line height
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            // iOS HIG: body = 17px, subhead = 15px for desktop
            fontSize: isMobile ? iosTypographyScale.body : iosTypographyScale.subhead,
            letterSpacing: '-0.01em', // iOS native letter spacing
          }}
        >
          {displayName}
        </Typography>

        {/* Specs with color dot - iOS HIG subhead (15px) / footnote (13px) */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: isMobile ? 0.75 : 0.5, mb: isMobile ? 1 : 0.5 }}>
          <Box
            sx={{
              width: isMobile ? 8 : 6, // 8pt grid aligned
              height: isMobile ? 8 : 6,
              borderRadius: '50%',
              bgcolor: colorDot,
              flexShrink: 0,
              border: isMobile ? '1px solid rgba(0,0,0,0.1)' : 'none',
            }}
          />
          <Typography
            variant="caption"
            sx={{
              color: secondaryLabelColor,
              // iOS HIG: subhead = 15px mobile, footnote = 13px desktop
              fontSize: isMobile ? iosTypographyScale.subhead : iosTypographyScale.footnote,
              letterSpacing: '-0.01em',
            }}
          >
            {item.color}
            {isLoose && typeof item.peso === 'number' && ` • ${item.peso} ct`}
            {item.isJewelry && item.metalType && ` • ${item.metalType}`}
          </Typography>
        </Box>

        {/* Price */}
        <PriceDisplay price={item.precioCOP} precioInternacional={item.precioInternacional} compact />
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
    prevProps.isFavorite === nextProps.isFavorite &&
    prevProps.isSelectedForComparison === nextProps.isSelectedForComparison &&
    prevProps.canAddToComparison === nextProps.canAddToComparison &&
    prevProps.isMobile === nextProps.isMobile
  );
});
