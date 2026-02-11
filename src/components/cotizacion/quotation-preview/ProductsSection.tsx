/**
 * ProductsSection - Displays the list of products in the quotation.
 */

import React from 'react';
import { Box, Typography } from '@mui/material';
import { Package, Gem, ShoppingBag, ExternalLink } from 'lucide-react';
import { brandColors, quotationStyles, quotationTypography } from '../constants';
import { getProductDisplayUrl } from '../utils';
import {
  CotizacionProduct,
  useCotizacionFormat,
  getPesoDisplay,
} from '../../../hooks/useCotizacion';
import { SectionHeader } from './shared';

// =============================================================================
// ProductImage
// =============================================================================

interface ProductImageProps {
  src?: string;
  isJewelry: boolean;
  size?: number;
}

const ProductImage: React.FC<ProductImageProps> = ({ src, isJewelry, size = 56 }) => {
  const [imgError, setImgError] = React.useState(false);
  const [imgLoaded, setImgLoaded] = React.useState(false);

  React.useEffect(() => {
    setImgError(false);
    setImgLoaded(false);
  }, [src]);

  const hasValidSrc = src && !imgError;

  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: 2,
        bgcolor: isJewelry ? 'rgba(212,175,55,0.08)' : quotationStyles.accentTint,
        border: `1px solid ${quotationStyles.borderLight}`,
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

// =============================================================================
// ProductRow
// =============================================================================

interface ProductRowProps {
  product: CotizacionProduct;
  isEven: boolean;
  isLast: boolean;
}

const ProductRow: React.FC<ProductRowProps> = ({ product, isEven, isLast }) => {
  const { formatPrice: formatCurrency } = useCotizacionFormat();
  const displayUrl = getProductDisplayUrl(product);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        py: 1.25,
        px: 1.5,
        bgcolor: isEven ? quotationStyles.surfaceMuted : quotationStyles.surface,
        borderBottom: isLast ? 'none' : `1px solid ${quotationStyles.borderLight}`,
      }}
    >
      <ProductImage
        src={product.gifUrl || product.imagen}
        isJewelry={product.isJewelry}
        size={56}
      />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: brandColors.textPrimary, lineHeight: 1.3 }}>
          {product.name}
        </Typography>
        <Typography sx={{ fontSize: '0.55rem', color: brandColors.gray, mt: 0.25 }}>
          Ref. #{product.itemNumber} • {getPesoDisplay(product)} • {product.color}
        </Typography>
        <Box
          component="a"
          href={displayUrl}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            mt: 0.5,
            textDecoration: 'none',
            '&:hover': { textDecoration: 'underline' },
          }}
        >
          <ExternalLink size={9} color={brandColors.emerald} />
          <Typography sx={{
            fontSize: '0.45rem',
            color: brandColors.emerald,
            fontWeight: 500,
          }}>
            Expandir visión
          </Typography>
        </Box>
      </Box>
      <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
        <Typography sx={{
          fontSize: '0.8rem',
          fontWeight: 700,
          color: brandColors.emerald,
          ...quotationTypography.monospace,
        }}>
          {formatCurrency(product.precioCOP)}
        </Typography>
      </Box>
    </Box>
  );
};

// =============================================================================
// ProductsSection
// =============================================================================

export interface ProductsSectionProps {
  products: CotizacionProduct[];
}

export const ProductsSection: React.FC<ProductsSectionProps> = ({ products }) => {
  if (products.length === 0) {
    return (
      <Box sx={{
        textAlign: 'center',
        py: 4,
        bgcolor: quotationStyles.surfaceTint,
        borderRadius: 2,
        border: `1px dashed ${quotationStyles.borderMedium}`,
        mb: 3,
      }}>
        <Package size={28} color={brandColors.gray} style={{ marginBottom: 8, opacity: 0.5 }} />
        <Typography sx={{ fontSize: '0.7rem', color: brandColors.gray }}>
          Agrega productos del inventario
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 3 }}>
      <SectionHeader
        icon={<Package size={13} color={brandColors.emerald} />}
        title="Productos"
        count={products.length}
      />
      <Box sx={{
        border: `1px solid ${quotationStyles.borderLight}`,
        borderRadius: 2,
        overflow: 'hidden',
      }}>
        {products.map((product, index) => (
          <ProductRow
            key={product.id}
            product={product}
            isEven={index % 2 === 0}
            isLast={index === products.length - 1}
          />
        ))}
      </Box>
    </Box>
  );
};
