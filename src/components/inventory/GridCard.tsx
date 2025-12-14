/**
 * GridCard Component
 * Grid view card for inventory items with golden ratio layout.
 * Optimized for virtualized rendering.
 */
import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  IconButton,
  useTheme,
} from '@mui/material';
import {
  Gem,
  Crown,
  Play,
  Images,
  Heart,
  Scale,
} from 'lucide-react';
import { useThemeMode } from '../../contexts/ThemeContext';
import { InventoryItem, TrustScoreBreakdown } from '../../types';
import { getColorDot, getQualityBadge } from '../../utils/formatting';
import { TrustBadgeCompact } from '../TrustBadge';
import { PriceDisplay } from '../PriceDisplay';
import ProgressiveImage from '../ProgressiveImage';
import { emeraldCore, surfacesLight, surfacesDark } from '../../design-system/tokens/colors';

interface GridCardProps {
  item: InventoryItem;
  trustScore: TrustScoreBreakdown;
  isFavorite: boolean;
  onItemClick: () => void;
  onCertClick: () => void;
  onToggleFavorite: () => void;
  // Comparison props
  isSelectedForComparison?: boolean;
  onToggleComparison?: () => void;
  canAddToComparison?: boolean;
}

function GridCard({
  item,
  trustScore,
  isFavorite,
  onItemClick,
  onToggleFavorite,
  isSelectedForComparison = false,
  onToggleComparison,
  canAddToComparison = true,
}: GridCardProps) {
  const theme = useTheme();
  const { mode } = useThemeMode();
  const isLight = mode === 'light';

  const displayName = item.nombre.replace(/^L:.*?\s/, '').replace(/^L:/, '').trim();
  const quality = getQualityBadge(item.calidad);
  const colorDot = getColorDot(item.color);
  const isLoose = !item.isJewelry;
  const weight = typeof item.peso === 'number' ? `${item.peso} ct` : item.metalType;

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite();
  };

  const handleCompareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
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
        height: '100%',
        borderRadius: 3,
        border: '1px solid',
        borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.light,
        bgcolor: isLight ? surfacesLight.background.primary : surfacesDark.background.secondary,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.25s ease',
        cursor: 'pointer',
        '&:hover': {
          borderColor: emeraldCore.primary,
          transform: 'translateY(-4px)',
          boxShadow: isLight
            ? '0 20px 40px rgba(0, 0, 0, 0.08)'
            : '0 20px 40px rgba(0, 0, 0, 0.3)',
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
          <Box sx={{ position: 'relative' }}>
            <ProgressiveImage
              src={item.imagen}
              alt={`${item.nombre} - ${item.color}`}
              height={140}
              width={200}
              layout="grid"
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

            {/* Gallery count badge */}
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
                  fontSize: '0.7rem',
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
              {/* Quality badge */}
              <Chip
                label={quality.label}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                  bgcolor: quality.bg,
                  color: quality.color,
                  border: `1px solid ${quality.border}`,
                }}
              />
              {/* Quantity badge */}
              {item.cantidad > 1 && (
                <Chip
                  label={`×${item.cantidad}`}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    bgcolor: 'rgba(0, 0, 0, 0.7)',
                    color: 'white',
                  }}
                />
              )}
            </Box>
          </Box>
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
            top: 8,
            right: 8,
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
              width: 32,
              height: 32,
              bgcolor: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(4px)',
              transition: 'all 0.2s ease',
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 1)',
                transform: 'scale(1.1)',
              },
            }}
          >
            <Heart
              size={16}
              fill={isFavorite ? '#ef4444' : 'none'}
              color={isFavorite ? '#ef4444' : '#6b7280'}
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
                width: 32,
                height: 32,
                bgcolor: isSelectedForComparison ? emeraldCore.primary : 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(4px)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  bgcolor: isSelectedForComparison ? emeraldCore.dark : 'rgba(255, 255, 255, 1)',
                  transform: 'scale(1.1)',
                },
                '&:disabled': {
                  bgcolor: 'rgba(200, 200, 200, 0.5)',
                },
              }}
            >
              <Scale
                size={16}
                color={isSelectedForComparison ? 'white' : '#6b7280'}
              />
            </IconButton>
          )}
        </Box>
      </Box>

      {/* Compact Content Section */}
      <CardContent sx={{ p: 1.5, flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Mini header - type icon and color */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            mb: 1,
            pb: 1,
            borderBottom: '1px solid',
            borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.light,
          }}
        >
          {/* Color accent bar */}
          <Box
            sx={{
              width: 4,
              height: 24,
              borderRadius: 2,
              bgcolor: colorDot,
            }}
          />
          {/* Type icon */}
          <Box
            sx={{
              width: 24,
              height: 24,
              borderRadius: 1,
              bgcolor: isLight ? surfacesLight.background.tertiary : surfacesDark.background.tertiary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {item.isJewelry ? (
              <Crown size={14} color={isLight ? surfacesLight.text.secondary : surfacesDark.text.secondary} />
            ) : (
              <Gem size={14} color={colorDot} />
            )}
          </Box>
          {/* Color name */}
          <Typography
            variant="caption"
            sx={{
              fontWeight: 500,
              color: theme.palette.text.secondary,
              fontSize: '0.7rem',
            }}
          >
            {item.color.replace('Verde ', '')}
          </Typography>
        </Box>

        {/* Name */}
        <Typography
          variant="body2"
          sx={{
            fontWeight: 700,
            color: theme.palette.text.primary,
            mb: 0.25,
            lineHeight: 1.2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {displayName}
        </Typography>

        {/* Specs */}
        <Typography
          variant="caption"
          sx={{
            color: theme.palette.text.secondary,
            mb: 1,
            fontSize: '0.7rem',
          }}
        >
          {item.color}
          {isLoose && typeof item.peso === 'number' && ` • ${item.peso} ct`}
          {item.isJewelry && item.metalType && ` • ${item.metalType}`}
        </Typography>

        <Box sx={{ flex: 1 }} />

        {/* Trust badge and Price */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <TrustBadgeCompact score={trustScore} />
          <Box sx={{ textAlign: 'right' }}>
            <PriceDisplay price={item.precioCOP} compact />
          </Box>
        </Box>
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
    prevProps.trustScore.overall === nextProps.trustScore.overall &&
    prevProps.isSelectedForComparison === nextProps.isSelectedForComparison &&
    prevProps.canAddToComparison === nextProps.canAddToComparison
  );
});
