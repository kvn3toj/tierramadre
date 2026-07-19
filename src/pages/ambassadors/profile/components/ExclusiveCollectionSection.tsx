/**
 * ExclusiveCollectionSection Component
 * Displays a grid of exclusive collection products for the profile owner.
 * Only renders when products are available.
 */

import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Skeleton,
  Chip,
  IconButton,
  alpha,
  useTheme,
} from '@mui/material';
import { Gem, Share2, ExternalLink, Images } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TreasureItem } from '../../../../types';
import { getQualityBadge, formatCarats } from '../../../../utils/formatting';
import { PriceDisplay } from '../../../../components/price-simulator/PriceDisplay';
import {
  brand,
  lightTokens,
  darkTokens,
  cssTransition,
  Badge,
  PieceCard,
} from '../../../../design-system';

function buildSpecLine(item: TreasureItem): string {
  if (!item.isJewelry && typeof item.peso === 'number') {
    return `${formatCarats(item.peso)} ct`;
  }
  if (item.isJewelry && item.metalType) return item.metalType;
  return item.color;
}

interface ExclusiveCollectionSectionProps {
  products: TreasureItem[];
  collectionName: string;
  collectionDescription?: string;
  collectionFolder?: string | null;
  isLoading: boolean;
  onProductClick: (product: TreasureItem) => void;
  onShare?: () => void;
}

export const ExclusiveCollectionSection: React.FC<
  ExclusiveCollectionSectionProps
> = ({
  products,
  collectionName,
  collectionDescription,
  collectionFolder,
  isLoading,
  onProductClick,
  onShare,
}) => {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';
  const navigate = useNavigate();

  // Don't render anything if no products and not loading
  if (!isLoading && products.length === 0) return null;

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        mb: 3,
        borderRadius: 3,
        bgcolor: isLight
          ? lightTokens.background.surface
          : darkTokens.background.surface,
        border: '1px solid',
        borderColor: isLight
          ? alpha(brand.emerald[500], 0.2)
          : alpha(brand.emerald[400], 0.15),
      }}
    >
      {/* Section Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Gem size={20} style={{ color: brand.emerald[500] }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {collectionName}
          </Typography>
          <Chip
            label={`${products.length}`}
            size="small"
            sx={{
              height: 22,
              fontSize: '0.75rem',
              bgcolor: alpha(brand.emerald[500], 0.12),
              color: brand.emerald[600],
              fontWeight: 600,
            }}
          />
        </Box>
        {onShare && (
          <IconButton
            onClick={onShare}
            size="small"
            sx={{
              color: brand.emerald[500],
              '&:hover': { bgcolor: alpha(brand.emerald[500], 0.08) },
            }}
            aria-label="Compartir coleccion"
          >
            <Share2 size={18} />
          </IconButton>
        )}
      </Box>

      {collectionDescription && (
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          {collectionDescription}
        </Typography>
      )}

      {/* Loading State */}
      {isLoading && (
        <Grid container spacing={2}>
          {[0, 1, 2].map((i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Skeleton
                variant="rounded"
                sx={{ width: '100%', aspectRatio: '1/1', borderRadius: 3 }}
              />
              <Box sx={{ px: 1, mt: 1 }}>
                <Skeleton width="70%" height={20} />
                <Skeleton width="40%" height={16} sx={{ mt: 0.5 }} />
              </Box>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Products Grid */}
      {!isLoading && products.length > 0 && (
        <Grid container spacing={2}>
          {products.map((item) => {
            const quality = getQualityBadge(item.calidad);
            const displayName = item.nombre
              .replace(/^L:.*?\s/, '')
              .replace(/^L:/, '')
              .trim();
            return (
              <Grid item xs={12} sm={6} md={4} key={item.item}>
                <PieceCard
                  variant="well"
                  media={
                    item.imagen ? (
                      <Box
                        component="img"
                        src={item.imagen}
                        alt={`${item.nombre} - ${item.color}`}
                        loading="lazy"
                        sx={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    ) : (
                      <Box
                        role="img"
                        aria-label={`${item.nombre} - ${item.color}`}
                        sx={{ width: '100%', height: '100%' }}
                      />
                    )
                  }
                  overlays={
                    <>
                      <Box sx={{ position: 'absolute', bottom: 8, left: 8 }}>
                        <Badge
                          tone={quality.tone}
                          label={quality.label}
                          compact
                        />
                      </Box>
                      {(item.galleryCount ?? 0) > 1 && (
                        <Chip
                          icon={<Images size={12} />}
                          label={item.galleryCount}
                          size="small"
                          sx={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            bgcolor: 'rgba(0,0,0,0.7)',
                            color: 'white',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            height: 24,
                            '& .MuiChip-icon': { color: 'white' },
                          }}
                        />
                      )}
                    </>
                  }
                  name={displayName}
                  specLine={buildSpecLine(item)}
                  price={
                    <PriceDisplay
                      price={item.precioCOP}
                      precioInternacional={item.precioInternacional}
                      compact
                    />
                  }
                  itemNumber={item.item}
                  onClick={() => onProductClick(item)}
                  ariaLabel={`${item.nombre} - ${item.color}`}
                />
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* View Full Collection CTA */}
      {collectionFolder && !isLoading && products.length > 0 && (
        <Box
          role="button"
          tabIndex={0}
          onClick={() => navigate(`/c/${collectionFolder}`)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              navigate(`/c/${collectionFolder}`);
            }
          }}
          sx={{
            mt: 2.5,
            py: 1.5,
            px: 2.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            borderRadius: 2.5,
            cursor: 'pointer',
            bgcolor: alpha(brand.emerald[500], 0.08),
            border: '1px solid',
            borderColor: alpha(brand.emerald[500], 0.2),
            transition: cssTransition.default,
            '&:hover': {
              bgcolor: alpha(brand.emerald[500], 0.14),
              borderColor: alpha(brand.emerald[500], 0.35),
            },
            '&:focus-visible': {
              outline: `2px solid ${brand.emerald[500]}`,
              outlineOffset: 2,
            },
          }}
        >
          <ExternalLink size={16} style={{ color: brand.emerald[600] }} />
          <Typography
            sx={{
              fontWeight: 600,
              fontSize: '0.82rem',
              color: brand.emerald[600],
              letterSpacing: '-0.01em',
            }}
          >
            Ver Coleccion Completa
          </Typography>
        </Box>
      )}
    </Paper>
  );
};
