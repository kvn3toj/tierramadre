/**
 * CollectionProductDialog Component
 * Fullscreen dialog showing detail for an exclusive collection product.
 * These items are NOT in the main inventory, so we display them in-place.
 */

import React from 'react';
import {
  Box,
  Dialog,
  DialogContent,
  IconButton,
  Typography,
  Chip,
  useTheme,
} from '@mui/material';
import { X } from 'lucide-react';
import { TreasureItem } from '../../../../types';
import { brand, lightTokens, darkTokens } from '../../../../design-system';
import { PriceDisplay } from '../../../../components/price-simulator/PriceDisplay';

interface CollectionProductDialogProps {
  product: TreasureItem | null;
  onClose: () => void;
}

export const CollectionProductDialog: React.FC<CollectionProductDialogProps> = ({
  product,
  onClose,
}) => {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';

  return (
    <Dialog
      open={!!product}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          bgcolor: isLight ? lightTokens.background.surface : darkTokens.background.surface,
        },
      }}
    >
      <DialogContent sx={{ p: 0, position: 'relative' }}>
        <IconButton
          onClick={onClose}
          sx={{
            position: 'absolute',
            top: 8,
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
                <Box sx={{ width: '100%', aspectRatio: '1/1', bgcolor: '#000', position: 'relative' }}>
                  <video
                    src={`${product.imagen.replace(/[?&]thumbnail=true/, '').replace(/[?&]size=\w+/, '')}#t=0.001`}
                    poster={product.imagen}
                    controls
                    playsInline
                    preload="metadata"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
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
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                {product.nombre}
              </Typography>

              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                {product.color && (
                  <Chip label={product.color} size="small" variant="outlined" />
                )}
                {product.calidad && (
                  <Chip label={product.calidad} size="small" variant="outlined" />
                )}
                {product.estado === 'DISPONIBLE' && (
                  <Chip
                    label="Disponible"
                    size="small"
                    sx={{
                      bgcolor: brand.emerald[500],
                      color: '#fff',
                      fontWeight: 500,
                    }}
                  />
                )}
              </Box>

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
                  <SpecItem label="Peso" value={`${product.peso} ct`} isLight={isLight} />
                )}
                {product.talla && (
                  <SpecItem label="Talla" value={product.talla} isLight={isLight} />
                )}
                {product.medidas && (
                  <SpecItem label="Medidas" value={product.medidas} isLight={isLight} />
                )}
                {product.ubicacion && (
                  <SpecItem label="Ubicacion" value={product.ubicacion} isLight={isLight} />
                )}
              </Box>

              {/* Price */}
              <Box sx={{ mt: 1 }}>
                <PriceDisplay price={product.precioCOP} precioInternacional={product.precioInternacional} />
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
