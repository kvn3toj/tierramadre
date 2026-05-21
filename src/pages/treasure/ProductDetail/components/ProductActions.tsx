/**
 * ProductActions Component
 * CTA buttons for product detail page.
 */

import React from 'react';
import { Box, Button, Badge, alpha, useTheme } from '@mui/material';
import { ShoppingCart, Share2, MessageCircle } from 'lucide-react';
import { emeraldCore, surfacesLight, surfacesDark } from '../../../../design-system/tokens/colors';
import { emeraldGradients, buttonGradients } from '../../../../design-system/tokens/gradients';
import { emeraldShadows } from '../../../../design-system/tokens/shadows';

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
  const isLight = theme.palette.mode === 'light';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
      {/* Primary CTA - Add to Selection */}
      <Button
        variant="contained"
        fullWidth
        disabled={!isAvailable}
        onClick={onAddToCart}
        startIcon={
          <Badge badgeContent={cartCount} color="secondary" max={9}>
            <ShoppingCart size={18} />
          </Badge>
        }
        sx={{
          background: isAvailable
            ? (isInCart ? emeraldCore.dark : buttonGradients.primary)
            : undefined,
          color: '#FFFFFF',
          py: 1.5,
          minHeight: 44,
          fontWeight: 600,
          fontSize: '15px',
          borderRadius: 2,
          textTransform: 'none',
          boxShadow: isAvailable ? emeraldShadows.primary : undefined,
          '&:hover': {
            background: isAvailable ? emeraldGradients.deep : undefined,
            boxShadow: isAvailable ? emeraldShadows.lg : undefined,
          },
          '&:active': {
            transform: 'scale(0.98)',
          },
        }}
      >
        {!isAvailable
          ? 'Vendido'
          : isInCart
            ? 'Ver Seleccion'
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
            color: emeraldCore.dark,
            borderColor: isLight ? surfacesLight.border.default : surfacesDark.border.default,
            py: 1,
            minHeight: 44,
            fontWeight: 600,
            fontSize: '15px',
            borderRadius: 2,
            textTransform: 'none',
            '&:hover': {
              borderColor: emeraldCore.dark,
              bgcolor: alpha(emeraldCore.dark, 0.04),
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
            color: emeraldCore.dark,
            py: 1,
            minHeight: 44,
            fontWeight: 600,
            fontSize: '15px',
            textTransform: 'none',
            '&:hover': {
              bgcolor: alpha(emeraldCore.dark, 0.04),
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
