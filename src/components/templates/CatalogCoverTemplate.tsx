import { Box, Typography, Stack } from '@mui/material';
import { styled } from '@mui/material/styles';

// ============================================================================
// CATALOG COVER TEMPLATE - Luxury Jewelry Collection Cover
// Based on Destellos_Verdes.pdf with premium jewelry catalog enhancements
// Dimensions: 1920x1080px (16:9 presentation format)
// ============================================================================

export const SLIDE_WIDTH = 1920;
export const SLIDE_HEIGHT = 1080;

// Luxury color palette (shared with ProductCatalog)
const COLORS = {
  richBlack: '#0A0A0A',
  darkTeal: '#0F2420',
  warmIvory: '#FAF8F5',
  gold: '#C9A962',
  goldLight: '#E5D4A1',
  goldDark: '#9A7B3C',
  emerald: '#00BFA5',
  textLight: '#FFFFFF',
  textMuted: 'rgba(255, 255, 255, 0.6)',
};

interface CatalogCoverTemplateProps {
  id?: string;
  collectionName: string;
  subtitle?: string;
  date?: string;
  previewImages?: string[];
  logoUrl?: string;
}

// Elegant container with refined dark gradient
const SlideContainer = styled(Box)({
  width: `${SLIDE_WIDTH}px`,
  height: `${SLIDE_HEIGHT}px`,
  position: 'relative',
  overflow: 'hidden',
  fontFamily: '"Cormorant Garamond", serif',
  background: `linear-gradient(135deg, ${COLORS.darkTeal} 0%, ${COLORS.richBlack} 60%, #0D1A17 100%)`,
});

// Refined vertical accent bar with gold-emerald gradient
const VerticalAccentBar = styled(Box)({
  position: 'absolute',
  left: '100px',
  top: '0',
  width: '3px',
  height: '100%',
  background: `linear-gradient(180deg, ${COLORS.gold} 0%, ${COLORS.emerald} 50%, ${COLORS.goldDark} 100%)`,
  boxShadow: `0 0 30px ${COLORS.gold}30`,
});

// Logo container with refined positioning
const LogoContainer = styled(Box)({
  position: 'absolute',
  top: '70px',
  left: '140px',
  zIndex: 10,
});

// Main content area - left side with better spacing
const ContentArea = styled(Box)({
  position: 'absolute',
  left: '140px',
  top: '50%',
  transform: 'translateY(-50%)',
  maxWidth: '850px',
  zIndex: 5,
});

// Preview images container - asymmetric luxury layout
const PreviewImagesContainer = styled(Box)({
  position: 'absolute',
  right: '100px',
  top: '50%',
  transform: 'translateY(-50%)',
  display: 'flex',
  gap: '35px',
  zIndex: 5,
});

// Preview image box with luxury card styling
const PreviewImageBox = styled(Box)({
  width: '300px',
  height: '380px',
  borderRadius: '4px',
  overflow: 'hidden',
  background: COLORS.warmIvory,
  boxShadow: `
    0 30px 80px rgba(0, 0, 0, 0.5),
    0 0 0 1px ${COLORS.gold}20
  `,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '30px',
  position: 'relative',
  '&::before': {
    content: '""',
    position: 'absolute',
    inset: '12px',
    border: `1px solid ${COLORS.gold}30`,
    borderRadius: '2px',
    pointerEvents: 'none',
  },
  '& img': {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
    filter: 'drop-shadow(0 10px 30px rgba(0, 0, 0, 0.1))',
  },
});

// Collection name - luxurious serif typography
const CollectionName = styled(Typography)({
  fontSize: '110px',
  fontWeight: 600,
  lineHeight: 0.95,
  color: COLORS.textLight,
  letterSpacing: '0.02em',
  textTransform: 'uppercase',
  fontFamily: '"Cormorant Garamond", serif',
  textShadow: '0 6px 40px rgba(0, 0, 0, 0.5)',
  marginBottom: '35px',
});

// Subtitle with gold accent
const Subtitle = styled(Typography)({
  fontSize: '28px',
  fontWeight: 300,
  color: COLORS.gold,
  letterSpacing: '0.08em',
  fontFamily: '"Inter", sans-serif',
  marginBottom: '25px',
});

// Date with refined styling
const DateText = styled(Typography)({
  fontSize: '18px',
  fontWeight: 500,
  color: COLORS.textMuted,
  letterSpacing: '0.2em',
  fontFamily: '"Inter", sans-serif',
  textTransform: 'uppercase',
});

// Subtle decorative glow effects
const GlowEffect = styled(Box)({
  position: 'absolute',
  width: '700px',
  height: '700px',
  borderRadius: '50%',
  background: `radial-gradient(circle, ${COLORS.emerald}08 0%, transparent 60%)`,
  filter: 'blur(80px)',
  pointerEvents: 'none',
});

// Corner decoration
const CornerDecoration = styled(Box)({
  position: 'absolute',
  width: '100px',
  height: '100px',
  borderColor: `${COLORS.gold}25`,
  borderStyle: 'solid',
  borderWidth: '0',
  '&.top-right': {
    top: '50px',
    right: '50px',
    borderTopWidth: '1px',
    borderRightWidth: '1px',
  },
  '&.bottom-left': {
    bottom: '50px',
    left: '50px',
    borderBottomWidth: '1px',
    borderLeftWidth: '1px',
  },
});

export default function CatalogCoverTemplate({
  id = 'catalog-cover-slide',
  collectionName = 'COLECCIÓN FENIX',
  subtitle = 'Conecta con tu esencia ancestral',
  date = 'NOV 2025',
  previewImages = [],
  logoUrl = '/logo-tierra-madre.png',
}: CatalogCoverTemplateProps) {
  return (
    <SlideContainer id={id}>
      {/* Decorative glow effects */}
      <GlowEffect sx={{ top: '-250px', left: '350px' }} />
      <GlowEffect sx={{ bottom: '-250px', right: '450px' }} />

      {/* Corner decorations */}
      <CornerDecoration className="top-right" />
      <CornerDecoration className="bottom-left" />

      {/* Vertical accent bar */}
      <VerticalAccentBar />

      {/* Logo */}
      {logoUrl && (
        <LogoContainer>
          <Box
            component="img"
            src={logoUrl}
            alt="Tierra Madre"
            sx={{
              height: 85,
              width: 'auto',
              filter: 'brightness(1.05)',
            }}
          />
        </LogoContainer>
      )}

      {/* Main Content - Collection Info */}
      <ContentArea>
        <Stack spacing={0}>
          <CollectionName>{collectionName}</CollectionName>
          {subtitle && <Subtitle>{subtitle}</Subtitle>}
          {date && <DateText>{date}</DateText>}
        </Stack>
      </ContentArea>

      {/* Preview Images - Right Side */}
      {previewImages.length > 0 && (
        <PreviewImagesContainer>
          {previewImages.slice(0, 2).map((img, index) => (
            <PreviewImageBox key={index}>
              <img src={img} alt={`Preview ${index + 1}`} />
            </PreviewImageBox>
          ))}
        </PreviewImagesContainer>
      )}

      {/* If no preview images, show luxury placeholder emerald shapes */}
      {previewImages.length === 0 && (
        <PreviewImagesContainer>
          {/* Heart-shaped emerald placeholder */}
          <PreviewImageBox>
            <Box
              sx={{
                width: 130,
                height: 120,
                background: `linear-gradient(145deg,
                  ${COLORS.emerald}60 0%,
                  #006B5A 30%,
                  #004D40 60%,
                  #00352D 100%)`,
                clipPath: 'path("M65 20 C 35 -10, -10 35, 65 105 C 140 35, 95 -10, 65 20")',
                boxShadow: `
                  0 0 50px ${COLORS.emerald}30,
                  inset 0 0 30px rgba(255, 255, 255, 0.1)
                `,
                position: 'relative',
              }}
            />
          </PreviewImageBox>
          {/* Cushion-shaped emerald placeholder */}
          <PreviewImageBox>
            <Box
              sx={{
                width: 110,
                height: 110,
                background: `linear-gradient(145deg,
                  ${COLORS.emerald}60 0%,
                  #006B5A 30%,
                  #004D40 60%,
                  #00352D 100%)`,
                borderRadius: '22px',
                boxShadow: `
                  0 0 50px ${COLORS.emerald}30,
                  inset 0 0 30px rgba(255, 255, 255, 0.1)
                `,
              }}
            />
          </PreviewImageBox>
        </PreviewImagesContainer>
      )}
    </SlideContainer>
  );
}

export { CatalogCoverTemplate };
