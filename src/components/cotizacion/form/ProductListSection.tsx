/**
 * ProductListSection Component
 * Displays the list of selected products with thumbnails.
 * Includes undo-based deletion (Gerhardt-Powals forgiveness pattern).
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Typography, IconButton, alpha, Snackbar, Button } from '@mui/material';
import { Layers, Trash2, Gem, ShoppingBag, Undo2 } from 'lucide-react';
import { brandColors } from '../constants';
import { useCotizacionFormat, getPesoDisplay } from '../../../hooks/useCotizacion';
import type { ProductListSectionProps, ProductThumbnailProps } from '../types';
import { cssTransition } from '../../../design-system';

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
        border: '1px solid',
        borderColor: 'divider',
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
            transition: cssTransition.default,
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

const UNDO_TIMEOUT_MS = 5000;

export const ProductListSection: React.FC<ProductListSectionProps> = ({
  products,
  handleRemoveProduct,
}) => {
  const { formatPrice: formatCurrency } = useCotizacionFormat();
  // Undo-based deletion state
  const [pendingRemoval, setPendingRemoval] = useState<{ id: string; name: string } | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const handleDelete = useCallback((productId: string, productName: string) => {
    // If there's a pending removal, commit it first
    if (pendingRemoval) {
      handleRemoveProduct(pendingRemoval.id);
    }

    setPendingRemoval({ id: productId, name: productName });

    // Auto-commit after timeout
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => {
      handleRemoveProduct(productId);
      setPendingRemoval(null);
    }, UNDO_TIMEOUT_MS);
  }, [handleRemoveProduct, pendingRemoval]);

  const handleUndo = useCallback(() => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setPendingRemoval(null);
  }, []);

  const handleSnackbarClose = useCallback(() => {
    // When snackbar closes naturally, commit the removal
    if (pendingRemoval) {
      handleRemoveProduct(pendingRemoval.id);
      setPendingRemoval(null);
    }
  }, [pendingRemoval, handleRemoveProduct]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, []);

  if (products.length === 0) return null;

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Layers size={16} color={brandColors.emerald} />
        <Typography
          variant="subtitle2"
          sx={{
            color: 'text.primary',
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
            bgcolor: 'action.hover',
            borderRadius: 1.5,
            border: '1px solid',
            borderColor: 'divider',
            // Fade out item pending removal
            opacity: pendingRemoval?.id === product.id ? 0.4 : 1,
            transition: cssTransition.default,
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
              <Typography variant="caption" color="text.secondary">
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
              onClick={() => handleDelete(product.id, product.name)}
              aria-label={`Eliminar ${product.name}`}
              disabled={pendingRemoval?.id === product.id}
              sx={{
                color: 'text.disabled',
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

      {/* Undo snackbar */}
      <Snackbar
        open={!!pendingRemoval}
        autoHideDuration={UNDO_TIMEOUT_MS}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        message={`${pendingRemoval?.name || 'Producto'} eliminado`}
        action={
          <Button
            size="small"
            onClick={handleUndo}
            sx={{
              color: brandColors.emerald,
              fontWeight: 700,
              textTransform: 'none',
            }}
            startIcon={<Undo2 size={14} />}
          >
            Deshacer
          </Button>
        }
        sx={{
          mb: 'calc(env(safe-area-inset-bottom, 0px) + 72px)',
        }}
      />
    </Box>
  );
};

export default ProductListSection;
