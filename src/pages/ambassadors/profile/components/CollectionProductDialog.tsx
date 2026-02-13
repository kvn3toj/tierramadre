/**
 * CollectionProductDialog Component
 * Fullscreen dialog showing detail for an exclusive collection product.
 * These items are NOT in the main inventory, so we display them in-place.
 */

import React, { useRef, useCallback } from 'react';
import {
  Box,
  Dialog,
  DialogContent,
  IconButton,
  Typography,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { X } from 'lucide-react';
import { TreasureItem } from '../../../../types';
import { brand, lightTokens, darkTokens, typography } from '../../../../design-system';
import { PriceDisplay } from '../../../../components/price-simulator/PriceDisplay';
import { accentuate } from '../../../../pages/collection/CollectionPage';

/** Extract fileId from proxy URL and return a clean video streaming URL */
function getVideoUrl(thumbnailUrl: string): string {
  const match = thumbnailUrl.match(/fileId=([^&]+)/);
  if (!match) return thumbnailUrl;
  return `/api/serve-drive-image?fileId=${match[1]}`;
}

/** Format USD price */
function formatUSD(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

interface CollectionProductDialogProps {
  product: TreasureItem | null;
  onClose: () => void;
  /** When true, shows price in USD directly instead of using CurrencyContext */
  showUSD?: boolean;
}

export const CollectionProductDialog: React.FC<CollectionProductDialogProps> = ({
  product,
  onClose,
  showUSD = false,
}) => {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Swipe gestures: down or left to close
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    // Swipe right (positive deltaX) or swipe down to close
    if (deltaX > 100 || deltaY > 100) onClose();
  }, [onClose]);

  return (
    <Dialog
      open={!!product}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 3,
          bgcolor: isLight ? lightTokens.background.surface : darkTokens.background.surface,
        },
      }}
    >
      <DialogContent
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        sx={{ p: 0, position: 'relative', ...(isMobile && { overflowY: 'auto' }) }}
      >
        <IconButton
          onClick={onClose}
          sx={{
            position: 'absolute',
            top: isMobile ? 'max(env(safe-area-inset-top, 8px), 8px)' : 8,
            right: 8,
            zIndex: 1,
            bgcolor: 'rgba(0,0,0,0.5)',
            color: '#fff',
            '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
          }}
        >
          <X size={20} />
        </IconButton>

        {product && (
          <>
            {/* Product Media (Video or Image) */}
            {product.imagen && (
              product.mediaType === 'video' ? (
                <Box sx={{ width: '100%', aspectRatio: '1/1', bgcolor: '#000' }}>
                  <video
                    src={`${getVideoUrl(product.imagen)}#t=0.001`}
                    poster={product.imagen}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="auto"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      display: 'block',
                    }}
                  />
                </Box>
              ) : (
                <Box
                  component="img"
                  src={product.imagen}
                  alt={product.nombre}
                  sx={{
                    width: '100%',
                    aspectRatio: '1/1',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
              )
            )}

            {/* Product Info */}
            <Box sx={{ p: { xs: 2.5, sm: 3 } }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1.5 }}>
                {accentuate(product.nombre)}
              </Typography>

              {/* Specs Grid */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 1.5,
                  mb: 2,
                }}
              >
                {typeof product.peso === 'number' && (
                  <SpecItem label="Weight" value={`${product.peso} ct`} isLight={isLight} />
                )}
                {product.talla && (
                  <SpecItem label="Cut" value={product.talla} isLight={isLight} />
                )}
                <SpecItem label="Color" value={showUSD ? '-' : (product.color || '-')} isLight={isLight} />
                <SpecItem label="Quality" value={showUSD ? '-' : (product.calidad || '-')} isLight={isLight} />
                {product.medidas && (
                  <SpecItem label="Dimensions" value={product.medidas} isLight={isLight} />
                )}
              </Box>

              {/* Price */}
              <Box sx={{ mt: 1 }}>
                {showUSD && (product.precioInternacional || product.precioCOP) ? (
                  <>
                    <Typography
                      sx={{
                        fontSize: { xs: '1.3rem', sm: '1.5rem' },
                        fontWeight: 700,
                        color: brand.emerald[600],
                        fontFamily: typography.fontFamily.mono,
                        fontFeatureSettings: '"tnum"',
                      }}
                    >
                      {formatUSD(product.precioInternacional || product.precioCOP)} USD
                    </Typography>
                    {typeof product.peso === 'number' && product.peso > 0 && (
                      <Typography
                        variant="caption"
                        sx={{
                          color: 'text.secondary',
                          fontFamily: typography.fontFamily.mono,
                          fontFeatureSettings: '"tnum"',
                        }}
                      >
                        {formatUSD(Math.round((product.precioInternacional || product.precioCOP) / product.peso))}/ct
                      </Typography>
                    )}
                  </>
                ) : (
                  <PriceDisplay price={product.precioCOP} precioInternacional={product.precioInternacional} />
                )}
              </Box>
            </Box>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

function SpecItem({ label, value, isLight }: { label: string; value: string; isLight: boolean }) {
  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 2,
        bgcolor: isLight ? lightTokens.background.muted : darkTokens.background.muted,
      }}
    >
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {value}
      </Typography>
    </Box>
  );
}
