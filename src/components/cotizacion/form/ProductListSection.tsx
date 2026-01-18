/**
 * ProductListSection Component
 * Displays the list of selected products with thumbnails.
 */

import React, { useState, useEffect } from 'react';
import { Box, Typography, IconButton, alpha } from '@mui/material';
import { Layers, Trash2, Gem, ShoppingBag } from 'lucide-react';
import { brandColors } from '../constants';
import { formatCotizacionCurrency, getPesoDisplay } from '../../../hooks/useCotizacion';
import type { ProductListSectionProps, ProductThumbnailProps } from '../types';

const formatCurrency = formatCotizacionCurrency;

/**
 * ProductThumbnail - Product image with loading states and fallback
 */
export const ProductThumbnail: React.FC<ProductThumbnailProps> = ({
  src,
  isJewelry,
  size = 48,
}) => {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  // Reset states when src changes
  useEffect(() => {
    setImgError(false);
    setImgLoaded(false);
  }, [src]);

  const hasValidSrc = src && !imgError;

  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: 1.5,
        bgcolor: isJewelry
          ? alpha(brandColors.gold, 0.1)
          : alpha(brandColors.emerald, 0.1),
        border: `1px solid ${brandColors.borderSubtle}`,
        flexShrink: 0,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      {hasValidSrc && (
        <Box
          component="img"
          src={src}
          alt="Product"
          onError={() => setImgError(true)}
          onLoad={() => setImgLoaded(true)}
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: imgLoaded ? 1 : 0,
            transition: 'opacity 0.2s ease',
          }}
        />
      )}
      {/* Fallback icon */}
      {(!hasValidSrc || !imgLoaded) && (
        <Box
          sx={{
            position: hasValidSrc ? 'absolute' : 'static',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isJewelry ? (
            <ShoppingBag size={size * 0.4} color={brandColors.gold} />
          ) : (
            <Gem size={size * 0.4} color={brandColors.emerald} />
          )}
        </Box>
      )}
    </Box>
  );
};

export const ProductListSection: React.FC<ProductListSectionProps> = ({
  products,
  handleRemoveProduct,
}) => {
  if (products.length === 0) return null;

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Layers size={16} color={brandColors.emerald} />
        <Typography
          variant="subtitle2"
          sx={{
            color: brandColors.textPrimary,
            fontWeight: 700,
            fontSize: '0.875rem',
          }}
        >
          Productos Seleccionados ({products.length})
        </Typography>
      </Box>
      {products.map((product) => (
        <Box
          key={product.id}
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            py: 1.5,
            px: 1.5,
            mb: 1,
            bgcolor: brandColors.surfaceElevated,
            borderRadius: 1.5,
            border: `1px solid ${brandColors.borderSubtle}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <ProductThumbnail
              src={product.imagen}
              isJewelry={product.isJewelry}
              size={48}
            />
            <Box>
              <Typography variant="body2" fontWeight={600}>
                #{product.itemNumber} - {product.name}
              </Typography>
              <Typography variant="caption" color="grey.500">
                {getPesoDisplay(product)} • {product.color}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              variant="body2"
              sx={{ color: brandColors.emerald, fontWeight: 700 }}
            >
              {formatCurrency(product.precioCOP)}
            </Typography>
            <IconButton
              size="small"
              onClick={() => handleRemoveProduct(product.id)}
              sx={{
                color: brandColors.textMuted,
                '&:hover': {
                  color: brandColors.error,
                  bgcolor: alpha(brandColors.error, 0.1),
                },
              }}
            >
              <Trash2 size={16} />
            </IconButton>
          </Box>
        </Box>
      ))}
    </Box>
  );
};

export default ProductListSection;
