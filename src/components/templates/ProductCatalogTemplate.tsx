import { Box, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';

// ============================================================================
// PRODUCT CATALOG TEMPLATE - Luxury Jewelry Design System
// Based on Destellos_Verdes.pdf + premium jewelry catalog best practices
// Dimensions: 1920x1080px (16:9 presentation format)
// ============================================================================

export const SLIDE_WIDTH = 1920;
export const SLIDE_HEIGHT = 1080;

// Luxury color palette
const COLORS = {
  // Primary backgrounds
  richBlack: '#0A0A0A',
  darkTeal: '#1A2F2F',
  warmIvory: '#FAF8F5',

  // Accent colors
  gold: '#C9A962',
  goldLight: '#E5D4A1',
  goldDark: '#9A7B3C',
  emerald: '#00BFA5',
  emeraldDeep: '#006B5A',

  // Text colors
  textLight: '#FFFFFF',
  textMuted: 'rgba(255, 255, 255, 0.7)',
  textDark: '#1A1A1A',
};

export interface ProductSpec {
  label: string;
  value: string;
}

interface ProductCatalogTemplateProps {
  id?: string;
  productName: string;
  productSubtitle?: string;
  productImage: string;
  price: string;
  specs: ProductSpec[];
  logoUrl?: string;
  logoPosition?: 'top-left' | 'top-right' | 'none';
}

// Slide container with luxury dark theme
const SlideContainer = styled(Box)({
  width: `${SLIDE_WIDTH}px`,
  height: `${SLIDE_HEIGHT}px`,
  display: 'grid',
  gridTemplateColumns: '55% 45%',
  position: 'relative',
  overflow: 'hidden',
  fontFamily: '"Cormorant Garamond", "Playfair Display", serif',
  background: COLORS.richBlack,
});

// Left panel - elegant product showcase with subtle gradient
const LeftPanel = styled(Box)({
  background: `linear-gradient(145deg, ${COLORS.warmIvory} 0%, #F0EDE8 100%)`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  '&::after': {
    content: '""',
    position: 'absolute',
    right: 0,
    top: '10%',
    bottom: '10%',
    width: '1px',
    background: `linear-gradient(180deg, transparent 0%, ${COLORS.gold} 50%, transparent 100%)`,
  },
});

// Product image container with refined presentation
const ProductImageContainer = styled(Box)({
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '80px',
  position: 'relative',
  '& img': {
    maxWidth: '90%',
    maxHeight: '85%',
    objectFit: 'contain',
    filter: 'drop-shadow(0 30px 60px rgba(0, 0, 0, 0.12))',
    transition: 'transform 0.3s ease',
  },
});

// Right panel - sophisticated dark with gold accents
const RightPanel = styled(Box)({
  background: `linear-gradient(135deg, ${COLORS.darkTeal} 0%, ${COLORS.richBlack} 100%)`,
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  padding: '100px 80px',
});

// Elegant vertical accent bar with gold gradient
const VerticalAccentBar = styled(Box)({
  position: 'absolute',
  left: '0',
  top: '0',
  width: '4px',
  height: '100%',
  background: `linear-gradient(180deg, ${COLORS.gold} 0%, ${COLORS.emerald} 50%, ${COLORS.goldDark} 100%)`,
  boxShadow: `0 0 30px ${COLORS.gold}40`,
});

// Product name with luxury serif typography
const ProductName = styled(Typography)({
  fontSize: '72px',
  fontWeight: 600,
  lineHeight: 1.05,
  color: COLORS.textLight,
  letterSpacing: '0.04em',
  marginBottom: '16px',
  textTransform: 'uppercase',
  fontFamily: '"Cormorant Garamond", serif',
  textShadow: '0 4px 30px rgba(0, 0, 0, 0.4)',
});

// Subtitle with elegant styling
const ProductSubtitle = styled(Typography)({
  fontSize: '22px',
  fontWeight: 300,
  color: COLORS.gold,
  letterSpacing: '0.15em',
  fontFamily: '"Inter", sans-serif',
  marginBottom: '50px',
  textTransform: 'uppercase',
});

// Spec card container
const SpecsContainer = styled(Box)({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '24px',
  marginBottom: '50px',
});

// Individual spec item with refined design
const SpecItem = styled(Box)({
  padding: '16px 0',
  borderBottom: `1px solid ${COLORS.gold}20`,
});

// Spec label with understated elegance
const SpecLabel = styled(Typography)({
  fontSize: '13px',
  fontWeight: 500,
  color: COLORS.gold,
  letterSpacing: '0.12em',
  fontFamily: '"Inter", sans-serif',
  marginBottom: '6px',
  textTransform: 'uppercase',
});

// Spec value with clarity
const SpecValue = styled(Typography)({
  fontSize: '20px',
  fontWeight: 400,
  color: COLORS.textLight,
  letterSpacing: '0.02em',
  fontFamily: '"Cormorant Garamond", serif',
});

// Price with luxurious gold treatment
const PriceContainer = styled(Box)({
  display: 'flex',
  alignItems: 'baseline',
  gap: '8px',
  marginTop: 'auto',
  paddingTop: '40px',
  borderTop: `1px solid ${COLORS.gold}30`,
});

const PriceLabel = styled(Typography)({
  fontSize: '14px',
  fontWeight: 500,
  color: COLORS.textMuted,
  letterSpacing: '0.1em',
  fontFamily: '"Inter", sans-serif',
  textTransform: 'uppercase',
});

const PriceAmount = styled(Typography)({
  fontSize: '52px',
  fontWeight: 600,
  color: COLORS.gold,
  letterSpacing: '0.02em',
  fontFamily: '"Cormorant Garamond", serif',
  textShadow: `0 0 40px ${COLORS.gold}30`,
});

// Logo container
const LogoContainer = styled(Box)<{ logopos: string }>(({ logopos }) => ({
  position: 'absolute',
  zIndex: 10,
  ...(logopos === 'top-left' && { top: 50, left: 50 }),
  ...(logopos === 'top-right' && { top: 50, right: 50 }),
}));

// Decorative corner element
const CornerDecoration = styled(Box)({
  position: 'absolute',
  width: '80px',
  height: '80px',
  borderColor: `${COLORS.gold}40`,
  borderStyle: 'solid',
  borderWidth: '0',
  '&.top-right': {
    top: '40px',
    right: '40px',
    borderTopWidth: '1px',
    borderRightWidth: '1px',
  },
  '&.bottom-left': {
    bottom: '40px',
    left: '40px',
    borderBottomWidth: '1px',
    borderLeftWidth: '1px',
  },
});

export default function ProductCatalogTemplate({
  id = 'product-catalog-slide',
  productName = 'ESPEJO SAGRADO',
  productSubtitle = 'Colección Fenix',
  productImage = '',
  price = '$469,231',
  specs = [],
  logoUrl = '/logo-tierra-madre.png',
  logoPosition = 'top-left',
}: ProductCatalogTemplateProps) {
  // Default specs if none provided (matching PDF structure)
  const defaultSpecs: ProductSpec[] = [
    { label: 'Cantidad', value: '1' },
    { label: 'Peso', value: '0.48 ct' },
    { label: 'Tamaño', value: '4.2 mm x 5.1 mm' },
    { label: 'Corte', value: 'Esmeralda' },
    { label: 'Color', value: 'Verde Limón' },
    { label: 'Calidad', value: 'Comercial Súper Fina' },
  ];

  const displaySpecs = specs.length > 0 ? specs : defaultSpecs;

  return (
    <SlideContainer id={id}>
      {/* Left Panel - Product Image */}
      <LeftPanel>
        {/* Logo (optional, on image side) */}
        {logoPosition !== 'none' && logoUrl && (
          <LogoContainer logopos={logoPosition}>
            <Box
              component="img"
              src={logoUrl}
              alt="Tierra Madre"
              sx={{
                height: 70,
                width: 'auto',
                filter: 'brightness(0.95)',
              }}
            />
          </LogoContainer>
        )}

        <ProductImageContainer>
          {productImage ? (
            <img src={productImage} alt={productName} />
          ) : (
            // Elegant placeholder emerald with luxury styling
            <Box
              sx={{
                width: 220,
                height: 280,
                background: `linear-gradient(145deg,
                  ${COLORS.emerald}40 0%,
                  ${COLORS.emeraldDeep} 30%,
                  #004D40 70%,
                  #00352D 100%)`,
                clipPath: 'polygon(50% 0%, 85% 15%, 100% 50%, 85% 85%, 50% 100%, 15% 85%, 0% 50%, 15% 15%)',
                boxShadow: `
                  0 0 80px ${COLORS.emerald}40,
                  inset 0 0 40px rgba(255, 255, 255, 0.1)
                `,
                position: 'relative',
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  inset: '20%',
                  background: 'linear-gradient(145deg, rgba(255,255,255,0.2) 0%, transparent 50%)',
                  clipPath: 'inherit',
                },
              }}
            />
          )}
        </ProductImageContainer>
      </LeftPanel>

      {/* Right Panel - Product Info */}
      <RightPanel>
        {/* Vertical accent bar */}
        <VerticalAccentBar />

        {/* Decorative corner elements */}
        <CornerDecoration className="top-right" />
        <CornerDecoration className="bottom-left" />

        {/* Product Name */}
        <ProductName>{productName}</ProductName>

        {/* Subtitle */}
        {productSubtitle && (
          <ProductSubtitle>{productSubtitle}</ProductSubtitle>
        )}

        {/* Specifications in 2-column grid */}
        <SpecsContainer>
          {displaySpecs.map((spec, index) => (
            <SpecItem key={index}>
              <SpecLabel>{spec.label}</SpecLabel>
              <SpecValue>{spec.value}</SpecValue>
            </SpecItem>
          ))}
        </SpecsContainer>

        {/* Price with label */}
        <PriceContainer>
          <PriceLabel>Precio</PriceLabel>
          <PriceAmount>{price}</PriceAmount>
        </PriceContainer>
      </RightPanel>
    </SlideContainer>
  );
}

export { ProductCatalogTemplate };
