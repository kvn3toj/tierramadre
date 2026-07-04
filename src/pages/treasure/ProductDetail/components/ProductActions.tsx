/**
 * ProductActions Component
 * CTA buttons for product detail page.
 */

import React from 'react';
import { Box, Button, Badge, alpha, useTheme } from '@mui/material';
import { ShoppingCart, Share2, MessageCircle } from 'lucide-react';

interface ProductActionsProps {
  isAvailable: boolean;
  isInCart: boolean;
  cartCount: number;
  isNativeShareSupported: boolean;
  onAddToCart: () => void;
  onShare: () => void;
  onContact: () => void;
  /**
   * Optional slot rendered between the primary CTA and the secondary
   * (Compartir / Consultar) row. Used by Esmereogénesis to surface the
   * savings-with-purpose CTA in its specced position without breaking the
   * existing API for any other caller.
   */
  middleSlot?: React.ReactNode;
}

export const ProductActions: React.FC<ProductActionsProps> = ({
  isAvailable,
  isInCart,
  cartCount,
  isNativeShareSupported,
  onAddToCart,
  onShare,
  onContact,
  middleSlot,
}) => {
  const theme = useTheme();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
      {/* Primary CTA - Add to Selection. Sold pieces are selectable too (not
          just available ones) so staff can include them in a client's share
          link as a reference to their order. */}
      <Button
        variant="contained"
        fullWidth
        onClick={onAddToCart}
        startIcon={
          <Badge badgeContent={cartCount} color="secondary" max={9}>
            <ShoppingCart size={18} />
          </Badge>
        }
        sx={{
          background: isInCart
            ? theme.palette.primary.dark
            : theme.palette.primary.main,
          color: '#FFFFFF',
          py: 1.5,
          minHeight: 44,
          fontWeight: 500,
          fontSize: '15px',
          borderRadius: '10px',
          textTransform: 'none',
          boxShadow: 'none',
          '&:hover': {
            background: theme.palette.primary.dark,
            boxShadow: 'none',
          },
          '&:active': {
            transform: 'scale(0.98)',
          },
        }}
      >
        {isInCart
          ? 'Ver Seleccion'
          : !isAvailable
            ? 'Agregar Vendido a Seleccion'
            : 'Agregar a Seleccion'}
      </Button>

      {/* Optional middle slot — used for the Esmereogénesis CTA so it lives
          between the primary action and the secondary row (per spec §8.3). */}
      {middleSlot}

      {/* Secondary CTAs - Horizontal layout */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        {/* Share Button */}
        <Button
          variant="outlined"
          onClick={onShare}
          startIcon={<Share2 size={18} />}
          sx={{
            flex: 1,
            color: theme.palette.text.primary,
            borderColor: theme.palette.divider,
            py: 1,
            minHeight: 44,
            fontWeight: 500,
            fontSize: '15px',
            borderRadius: '10px',
            textTransform: 'none',
            '&:hover': {
              borderColor: theme.palette.text.primary,
              bgcolor: alpha(theme.palette.text.primary, 0.04),
            },
            '&:active': {
              transform: 'scale(0.98)',
            },
          }}
        >
          {isNativeShareSupported ? 'Compartir' : 'Copiar Link'}
        </Button>

        {/* Contact Button */}
        <Button
          variant="text"
          onClick={onContact}
          startIcon={<MessageCircle size={18} />}
          sx={{
            flex: 1,
            color: theme.palette.text.secondary,
            py: 1,
            minHeight: 44,
            fontWeight: 500,
            fontSize: '15px',
            textTransform: 'none',
            '&:hover': {
              bgcolor: alpha(theme.palette.text.primary, 0.04),
            },
            '&:active': {
              opacity: 0.7,
            },
          }}
        >
          Consultar
        </Button>
      </Box>
    </Box>
  );
};

export default ProductActions;
