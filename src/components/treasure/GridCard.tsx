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
import { TreasureItem } from '../../types';
import { getColorDot, getQualityBadge } from '../../utils/formatting';
import { PriceDisplay } from '../PriceDisplay';
import ProgressiveImage from '../ProgressiveImage';
import { emeraldCore, surfacesLight, surfacesDark } from '../../design-system/tokens/colors';
import {
  accentColors,
  lightTokens,
  darkTokens,
  animation,
  iosSemanticColors,
} from '../../design-system';

interface GridCardProps {
  item: TreasureItem;
  isFavorite: boolean;
  onItemClick: () => void;
  onCertClick: () => void;
  onToggleFavorite: () => void;
  isSelectedForComparison?: boolean;
  onToggleComparison?: () => void;
  canAddToComparison?: boolean;
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

  const labelColor = iosSemanticColors.label[mode];
  const secondaryLabelColor = iosSemanticColors.secondaryLabel[mode];

  const displayName = item.nombre.replace(/^L:.*?\s/, '').replace(/^L:/, '').trim();
  const quality = getQualityBadge(item.calidad);
  const colorDot = getColorDot(item.color);
  const isLoose = !item.isJewelry;

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

  // Button sizes - iOS HIG 44pt touch target, but smaller visually for compact cards
  const buttonSize = isMobile ? 36 : 32;
  const iconSize = isMobile ? 18 : 16;

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
        borderRadius: 2,
        border: '1px solid',
        borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.light,
        bgcolor: isLight ? surfacesLight.background.primary : surfacesDark.background.secondary,
        overflow: 'hidden',
        transition: animation.transition.spring,
        cursor: 'pointer',
        '&:hover': {
          borderColor: emeraldCore.primary,
          transform: 'translateY(-1px)',
          boxShadow: isLight
            ? '0 8px 16px rgba(0, 0, 0, 0.06)'
            : '0 8px 16px rgba(0, 0, 0, 0.2)',
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
            <ProgressiveImage
              src={item.imagen}
              alt={`${item.nombre} - ${item.color}`}
              aspectRatio="1 / 1"
              layout="full"
              quality="eco"
            />

            {/* Video play indicator */}
            {item.mediaType === 'video' && (
              <Box
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  bgcolor: 'rgba(0, 0, 0, 0.6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Play size={20} color="white" fill="white" />
              </Box>
            )}

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
          </>
        ) : (
          <ProgressiveImage
            src={undefined}
            alt={`${item.nombre} - placeholder`}
            aspectRatio="1 / 1"
          />
        )}

        {/* Action buttons - Top right, stacked vertically */}
        <Box
          sx={{
            position: 'absolute',
            top: 6,
            right: 6,
            display: 'flex',
            flexDirection: 'column',
            gap: 0.5,
          }}
        >
          {/* Favorite button */}
          <IconButton
            onClick={handleFavoriteClick}
            aria-label={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
            size="small"
            sx={{
              width: buttonSize,
              height: buttonSize,
              minWidth: 44, // iOS HIG touch target
              minHeight: 44,
              bgcolor: isLight
                ? 'rgba(255, 255, 255, 0.9)'
                : 'rgba(30, 41, 59, 0.9)',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
              transition: animation.transition.spring,
              '&:active': {
                transform: 'scale(0.9)',
              },
            }}
          >
            <Heart
              size={iconSize}
              fill={isFavorite ? accentColors.error.light : 'none'}
              color={isFavorite ? accentColors.error.light : isLight ? lightTokens.text.secondary : darkTokens.text.secondary}
            />
          </IconButton>

          {/* Comparison button */}
          {onToggleComparison && (
            <IconButton
              onClick={handleCompareClick}
              aria-label={isSelectedForComparison ? 'Quitar de comparación' : 'Agregar a comparación'}
              disabled={!isSelectedForComparison && !canAddToComparison}
              size="small"
              sx={{
                width: buttonSize,
                height: buttonSize,
                minWidth: 44,
                minHeight: 44,
                bgcolor: isSelectedForComparison
                  ? emeraldCore.primary
                  : isLight
                    ? 'rgba(255, 255, 255, 0.9)'
                    : 'rgba(30, 41, 59, 0.9)',
                backdropFilter: 'blur(8px)',
                boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                transition: animation.transition.spring,
                '&:active': {
                  transform: 'scale(0.9)',
                },
                '&:disabled': {
                  bgcolor: 'rgba(200, 200, 200, 0.4)',
                },
              }}
            >
              <Scale
                size={iconSize}
                color={isSelectedForComparison ? lightTokens.text.inverse : isLight ? lightTokens.text.secondary : darkTokens.text.secondary}
              />
            </IconButton>
          )}
        </Box>
      </Box>

      {/* Content Section - Compact for 2-column grid */}
      <CardContent
        sx={{
          p: isMobile ? 1 : 1.25,
          pt: isMobile ? 1 : 1,
          '&:last-child': { pb: isMobile ? 1 : 1.25 },
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: 0,
        }}
      >
        {/* Name - Truncated to 1 line */}
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            color: labelColor,
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: isMobile ? 13 : 14,
            letterSpacing: '-0.01em',
            mb: 0.25,
          }}
        >
          {displayName}
        </Typography>

        {/* Specs with color dot */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
          <Box
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              bgcolor: colorDot,
              flexShrink: 0,
            }}
          />
          <Typography
            variant="caption"
            sx={{
              color: secondaryLabelColor,
              fontSize: isMobile ? 11 : 12,
              letterSpacing: '-0.01em',
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

        {/* Price - Compact */}
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
