import { Box, Typography, Stack } from '@mui/material';
import { styled } from '@mui/material/styles';

// ============================================================================
// THANK YOU TEMPLATE - Luxury Jewelry Closing Slide
// Based on Destellos_Verdes.pdf with premium jewelry catalog enhancements
// Dimensions: 1920x1080px (16:9 presentation format)
// ============================================================================

export const SLIDE_WIDTH = 1920;
export const SLIDE_HEIGHT = 1080;

// Luxury color palette (shared across templates)
const COLORS = {
  richBlack: '#0A0A0A',
  darkTeal: '#0F2420',
  gold: '#C9A962',
  goldDark: '#9A7B3C',
  emerald: '#00BFA5',
  textLight: '#FFFFFF',
  textMuted: 'rgba(255, 255, 255, 0.6)',
};

interface ThankYouTemplateProps {
  id?: string;
  message?: string;
  website?: string;
  logoUrl?: string;
  backgroundImage?: string;
}

// Elegant slide container with refined dark theme
const SlideContainer = styled(Box)<{ bgimage?: string }>(({ bgimage }) => ({
  width: `${SLIDE_WIDTH}px`,
  height: `${SLIDE_HEIGHT}px`,
  position: 'relative',
  overflow: 'hidden',
  fontFamily: '"Cormorant Garamond", serif',
  background: bgimage
    ? `linear-gradient(rgba(10, 25, 22, 0.8), rgba(8, 18, 16, 0.9)), url(${bgimage})`
    : `linear-gradient(135deg, ${COLORS.darkTeal} 0%, ${COLORS.richBlack} 60%, #0D1A17 100%)`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
}));

// Refined vertical accent bar with gold gradient
const VerticalAccentBar = styled(Box)({
  position: 'absolute',
  left: '100px',
  top: '0',
  width: '3px',
  height: '100%',
  background: `linear-gradient(180deg, ${COLORS.gold} 0%, ${COLORS.emerald} 50%, ${COLORS.goldDark} 100%)`,
  boxShadow: `0 0 30px ${COLORS.gold}30`,
});

// Content container - elegantly centered
const ContentContainer = styled(Box)({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  textAlign: 'center',
  zIndex: 5,
});

// Logo with refined styling
const LogoImage = styled('img')({
  height: '100px',
  marginBottom: '50px',
  filter: 'brightness(1.05) drop-shadow(0 10px 30px rgba(0, 0, 0, 0.4))',
});

// Brand text with luxury typography
const BrandText = styled(Typography)({
  fontSize: '28px',
  fontWeight: 500,
  color: COLORS.textLight,
  letterSpacing: '0.25em',
  fontFamily: '"Inter", sans-serif',
  textTransform: 'uppercase',
  marginBottom: '12px',
});

// Tagline with gold accent
const Tagline = styled(Typography)({
  fontSize: '18px',
  fontWeight: 300,
  color: COLORS.gold,
  letterSpacing: '0.35em',
  fontFamily: '"Inter", sans-serif',
  textTransform: 'uppercase',
  marginBottom: '70px',
});

// Thank you message - luxurious serif typography
const ThankYouMessage = styled(Typography)({
  fontSize: '140px',
  fontWeight: 600,
  color: COLORS.textLight,
  letterSpacing: '0.02em',
  lineHeight: 0.95,
  fontFamily: '"Cormorant Garamond", serif',
  textShadow: '0 10px 50px rgba(0, 0, 0, 0.5)',
});

// Website with refined styling
const WebsiteText = styled(Typography)({
  position: 'absolute',
  bottom: '70px',
  left: '140px',
  fontSize: '20px',
  fontWeight: 400,
  color: COLORS.textMuted,
  letterSpacing: '0.08em',
  fontFamily: '"Inter", sans-serif',
});

// Decorative overlay effect
const LeafOverlay = styled(Box)({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'radial-gradient(circle at center, transparent 35%, rgba(8, 20, 18, 0.5) 100%)',
  pointerEvents: 'none',
});

// Subtle emerald glow effect
const GlowEffect = styled(Box)({
  position: 'absolute',
  width: '900px',
  height: '900px',
  borderRadius: '50%',
  background: `radial-gradient(circle, ${COLORS.emerald}06 0%, transparent 55%)`,
  filter: 'blur(100px)',
  pointerEvents: 'none',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
});

// Corner decorations
const CornerDecoration = styled(Box)({
  position: 'absolute',
  width: '120px',
  height: '120px',
  borderColor: `${COLORS.gold}20`,
  borderStyle: 'solid',
  borderWidth: '0',
  '&.top-right': {
    top: '60px',
    right: '60px',
    borderTopWidth: '1px',
    borderRightWidth: '1px',
  },
  '&.bottom-left': {
    bottom: '60px',
    left: '60px',
    borderBottomWidth: '1px',
    borderLeftWidth: '1px',
  },
});

export default function ThankYouTemplate({
  id = 'thank-you-slide',
  message = 'GRACIAS.',
  website = 'www.tierramadre.co',
  logoUrl = '/logo-tierra-madre.png',
  backgroundImage,
}: ThankYouTemplateProps) {
  return (
    <SlideContainer id={id} bgimage={backgroundImage}>
      {/* Overlay effects */}
      <LeafOverlay />
      <GlowEffect />

      {/* Corner decorations */}
      <CornerDecoration className="top-right" />
      <CornerDecoration className="bottom-left" />

      {/* Vertical accent bar */}
      <VerticalAccentBar />

      {/* Main Content - Centered */}
      <ContentContainer>
        <Stack alignItems="center" spacing={0}>
          {/* Logo */}
          {logoUrl && (
            <LogoImage src={logoUrl} alt="Tierra Madre" />
          )}

          {/* Brand name */}
          <BrandText>TIERRA MADRE</BrandText>

          {/* Tagline */}
          <Tagline>ESENCIA Y PODER</Tagline>

          {/* Thank you message */}
          <ThankYouMessage>{message}</ThankYouMessage>
        </Stack>
      </ContentContainer>

      {/* Website */}
      {website && <WebsiteText>{website}</WebsiteText>}
    </SlideContainer>
  );
}

export { ThankYouTemplate };
