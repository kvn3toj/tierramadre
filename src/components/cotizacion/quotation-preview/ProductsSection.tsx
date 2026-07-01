/**
 * ProductsSection - Displays the list of products in the quotation.
 */

import React from "react";
import { Box, Typography } from "@mui/material";
import {
  Package,
  Gem,
  ShoppingBag,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import {
  brandColors,
  quotationStyles,
  quotationTypography,
} from "../constants";
import { getProductDisplayUrl } from "../utils";
import {
  CotizacionProduct,
  useCotizacionFormat,
  getPesoDisplay,
} from "../../../hooks/useCotizacion";
import { SectionHeader } from "./shared";
import { cssTransition, qeFont, qeTokens } from "../../../design-system";
import { useLanguage } from "../../../contexts/LanguageContext";

// =============================================================================
// ProductImage
// =============================================================================

interface ProductImageProps {
  src?: string;
  isJewelry: boolean;
  size?: number;
}

const ProductImage: React.FC<ProductImageProps> = ({
  src,
  isJewelry,
  size = 56,
}) => {
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
        borderRadius: "4px",
        bgcolor: isJewelry ? "rgba(0,0,0,0.04)" : quotationStyles.accentTint,
        border: `1px solid ${quotationStyles.borderLight}`,
        flexShrink: 0,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
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
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: imgLoaded ? 1 : 0,
            transition: cssTransition.default,
          }}
        />
      )}
      {(!hasValidSrc || !imgLoaded) && (
        <Box
          sx={{
            position: hasValidSrc ? "absolute" : "static",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {isJewelry ? (
            <ShoppingBag size={size * 0.4} color={qeTokens.light.subtle} />
          ) : (
            <Gem size={size * 0.4} color={qeTokens.light.accent} />
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
  const { t } = useLanguage();
  const labels = t.pages.cotizacion.preview;
  const displayUrl = getProductDisplayUrl(product);

  // Spec line: peso + the emerald's color/origin (the mockup's second segment),
  // falling back to the cut. Skip placeholder dashes.
  const clean = (v?: string) =>
    v && v.trim() && v.trim() !== "-" ? v.trim() : "";
  const specSegment = clean(product.color) || clean(product.talla);
  const specLine = [getPesoDisplay(product), specSegment.toUpperCase()]
    .filter(Boolean)
    .join(" · ");

  return (
    <Box
      sx={{
        bgcolor: isEven
          ? quotationStyles.surfaceMuted
          : quotationStyles.surface,
        borderBottom: isLast
          ? "none"
          : `1px solid ${quotationStyles.borderLight}`,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          py: 1.25,
          px: 1.5,
        }}
      >
        <ProductImage
          src={product.gifUrl || product.imagen}
          isJewelry={product.isJewelry}
          size={56}
        />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            sx={{
              fontFamily: qeFont.serif,
              fontSize: "0.95rem",
              fontWeight: 500,
              color: qeTokens.light.text,
              lineHeight: 1.1,
            }}
          >
            {product.name}
          </Typography>
          <Typography
            sx={{
              fontFamily: qeFont.mono,
              fontSize: "0.5rem",
              color: qeTokens.light.subtle,
              letterSpacing: "0.04em",
              mt: 0.35,
            }}
          >
            {specLine}
          </Typography>
          <Box
            component="a"
            href={displayUrl}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              mt: 0.5,
              textDecoration: "none",
              "&:hover": { textDecoration: "underline" },
            }}
          >
            <ExternalLink size={9} color={qeTokens.light.accent} />
            <Typography
              sx={{
                fontSize: "0.45rem",
                color: qeTokens.light.accent,
                fontWeight: 500,
              }}
            >
              {labels.expandView}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ textAlign: "right", flexShrink: 0 }}>
          <Typography
            sx={{
              fontSize: "0.8rem",
              fontWeight: 600,
              color: qeTokens.light.text,
              ...quotationTypography.monospace,
            }}
          >
            {formatCurrency(product.precioCOP)}
          </Typography>
          <Typography
            sx={{ fontSize: "0.5rem", color: qeTokens.light.subtle, mt: 0.25 }}
          >
            × 1
          </Typography>
        </Box>
      </Box>

      {/* AI jewelry visualization (referencial) */}
      {product.selectedPreviewUrl && (
        <Box sx={{ px: 1.5, pb: 1.5 }}>
          <Box
            component="img"
            src={product.selectedPreviewUrl}
            alt={`Visualización referencial de ${product.name}`}
            sx={{
              width: "100%",
              maxHeight: 260,
              objectFit: "cover",
              borderRadius: 2,
              border: `1px solid ${quotationStyles.borderLight}`,
              display: "block",
            }}
          />
          <Box
            sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}
          >
            <Sparkles size={9} color={qeTokens.light.subtle} />
            <Typography
              sx={{
                fontSize: "0.45rem",
                color: brandColors.gray,
                fontStyle: "italic",
              }}
            >
              Visualización referencial generada por IA · puede diferir de la
              pieza final
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
};

// =============================================================================
// ProductsSection
// =============================================================================

export interface ProductsSectionProps {
  products: CotizacionProduct[];
}

export const ProductsSection: React.FC<ProductsSectionProps> = ({
  products,
}) => {
  const { t } = useLanguage();
  const labels = t.pages.cotizacion.preview;

  if (products.length === 0) {
    return (
      <Box
        sx={{
          textAlign: "center",
          py: 4,
          bgcolor: quotationStyles.surfaceTint,
          borderRadius: 2,
          border: `1px dashed ${quotationStyles.borderMedium}`,
          mb: 3,
        }}
      >
        <Package
          size={28}
          color={brandColors.gray}
          style={{ marginBottom: 8, opacity: 0.5 }}
        />
        <Typography sx={{ fontSize: "0.7rem", color: brandColors.gray }}>
          {labels.addProducts}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 3 }}>
      <SectionHeader
        icon={<Package size={13} color={qeTokens.light.accent} />}
        title={labels.products}
        count={products.length}
      />
      <Box
        sx={{
          border: `1px solid ${quotationStyles.borderLight}`,
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
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
