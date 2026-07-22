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
  Chip,
  IconButton,
} from '@mui/material';
import { Gem, Share2, ExternalLink, Images } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TreasureItem } from '../../../../types';
import { getQualityBadge, formatCarats } from '../../../../utils/formatting';
import { PriceDisplay } from '../../../../components/price-simulator/PriceDisplay';
import { Badge, PieceCard, Skeleton, qeGray } from '../../../../design-system';

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
  const navigate = useNavigate();

  // Don't render anything if no products and not loading
  if (!isLoading && products.length === 0) return null;

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        mb: 3,
        borderRadius: 'var(--tm-radius-card)',
        bgcolor: 'var(--tm-surface)',
        border: '1px solid',
        borderColor: 'var(--tm-border)',
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
          <Gem size={20} style={{ color: 'var(--tm-accent)' }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {collectionName}
          </Typography>
          <Badge tone="accent" label={`${products.length}`} />
        </Box>
        {onShare && (
          <IconButton
            onClick={onShare}
            size="small"
            sx={{
              color: 'var(--tm-accent)',
              '&:hover': { bgcolor: 'var(--tm-accent-wash)' },
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
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
            },
            gap: 2,
          }}
        >
          {[0, 1, 2].map((i) => (
            <Box key={i}>
              {/* Geometry matches the PieceCard it replaces: square well,
                  then the name and spec lines — so nothing shifts on load. */}
              <Box sx={{ width: '100%', aspectRatio: '1/1' }}>
                <Skeleton variant="rect" width="100%" height="100%" />
              </Box>
              <Box sx={{ px: 1, mt: 1 }}>
                <Skeleton variant="text" width="70%" height={20} />
                <Box sx={{ mt: 0.5 }}>
                  <Skeleton variant="text" width="40%" height={16} />
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      )}

      {/* Products Grid */}
      {!isLoading && products.length > 0 && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
            },
            gap: 2,
          }}
        >
          {products.map((item) => {
            const quality = getQualityBadge(item.calidad);
            const displayName = item.nombre
              .replace(/^L:.*?\s/, '')
              .replace(/^L:/, '')
              .trim();
            return (
              <Box key={item.item}>
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
                            // On-photo chrome (same exemption as GridCard's
                            // badges): scrim + fixed light foreground.
                            bgcolor: 'var(--tm-scrim)',
                            color: qeGray[0],
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            height: 24,
                            '& .MuiChip-icon': { color: qeGray[0] },
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
              </Box>
            );
          })}
        </Box>
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
            borderRadius: 'var(--tm-radius-control)',
            cursor: 'pointer',
            bgcolor: 'var(--tm-accent-wash)',
            border: '1px solid',
            borderColor: 'var(--tm-border)',
            transition:
              'background-color var(--tm-base) var(--tm-ease), border-color var(--tm-base) var(--tm-ease)',
            '&:hover': {
              bgcolor: 'var(--tm-accent-wash-strong)',
              borderColor: 'var(--tm-accent)',
            },
            '&:focus-visible': {
              outline: 'none',
              boxShadow: 'var(--tm-focus-ring)',
            },
          }}
        >
          <ExternalLink size={16} style={{ color: 'var(--tm-accent)' }} />
          <Typography
            sx={{
              fontWeight: 600,
              fontSize: '0.82rem',
              color: 'var(--tm-accent)',
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
