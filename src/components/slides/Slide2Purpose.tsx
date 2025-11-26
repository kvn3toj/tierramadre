import { Box, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';

// Slide dimensions: 16:9 aspect ratio for presentations
const SLIDE_WIDTH = 1920;
const SLIDE_HEIGHT = 1080;

const SlideContainer = styled(Box)(() => ({
  width: `${SLIDE_WIDTH}px`,
  height: `${SLIDE_HEIGHT}px`,
  position: 'relative',
  overflow: 'hidden',
  // Dark stone/slate texture background
  background: `
    linear-gradient(135deg, rgba(20, 20, 25, 0.95) 0%, rgba(35, 35, 40, 0.9) 50%, rgba(25, 25, 30, 0.95) 100%),
    repeating-linear-gradient(
      45deg,
      transparent,
      transparent 2px,
      rgba(255, 255, 255, 0.02) 2px,
      rgba(255, 255, 255, 0.02) 4px
    )
  `,
  backgroundColor: '#1a1a1f',
  // Left vignette for text legibility
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    width: '70%',
    height: '100%',
    background: 'linear-gradient(90deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 40%, transparent 100%)',
    zIndex: 1,
  },
}));

const ContentWrapper = styled(Box)({
  position: 'relative',
  zIndex: 2,
  padding: '120px 100px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  height: `calc(${SLIDE_HEIGHT}px - 100px)`, // Leave space for footer
  maxWidth: '55%',
});

const EmeraldGlow = styled(Box)({
  position: 'absolute',
  right: '5%',
  top: '50%',
  transform: 'translateY(-50%)',
  width: '45%',
  height: '80%',
  zIndex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  // Ambient glow effect
  '&::before': {
    content: '""',
    position: 'absolute',
    top: '10%',
    left: '10%',
    right: '10%',
    bottom: '10%',
    background: `
      radial-gradient(ellipse at center, rgba(80, 200, 120, 0.35) 0%, rgba(46, 125, 50, 0.15) 40%, transparent 70%)
    `,
    filter: 'blur(60px)',
    zIndex: 0,
  },
});

const EmeraldShape = styled(Box)({
  position: 'relative',
  width: '320px',
  height: '420px',
  zIndex: 2,
  // Stylized emerald crystal shape with vibrant colors
  background: `
    linear-gradient(145deg,
      #7CFC7C 0%,
      #50C878 20%,
      #2E7D32 50%,
      #1B5E20 70%,
      #2E7D32 100%
    )
  `,
  clipPath: 'polygon(50% 0%, 85% 15%, 100% 50%, 85% 85%, 50% 100%, 15% 85%, 0% 50%, 15% 15%)',
  boxShadow: `
    0 0 80px rgba(80, 200, 120, 0.7),
    0 0 160px rgba(46, 125, 50, 0.5),
    0 0 240px rgba(80, 200, 120, 0.3),
    inset 0 0 80px rgba(255, 255, 255, 0.15)
  `,
  // Light reflection
  '&::before': {
    content: '""',
    position: 'absolute',
    top: '8%',
    left: '12%',
    width: '35%',
    height: '45%',
    background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0.1) 40%, transparent 60%)',
    clipPath: 'polygon(0% 0%, 100% 15%, 85% 100%, 0% 85%)',
  },
  // Secondary highlight
  '&::after': {
    content: '""',
    position: 'absolute',
    bottom: '15%',
    right: '15%',
    width: '25%',
    height: '30%',
    background: 'linear-gradient(325deg, rgba(255, 255, 255, 0.25) 0%, transparent 50%)',
    clipPath: 'polygon(20% 0%, 100% 0%, 100% 80%, 0% 100%)',
  },
});

const Footer = styled(Box)({
  position: 'absolute',
  bottom: 40,
  left: 100,
  right: 100,
  borderTop: '1px solid rgba(255, 255, 255, 0.15)',
  paddingTop: 20,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  zIndex: 2,
});

interface Slide2PurposeProps {
  id?: string;
}

export default function Slide2Purpose({ id = 'slide-2-purpose' }: Slide2PurposeProps) {
  return (
    <SlideContainer id={id}>
      {/* Content */}
      <ContentWrapper>
        {/* Line 1: Action */}
        <Typography
          sx={{
            fontFamily: '"Libre Baskerville", Georgia, serif',
            fontSize: '68px',
            fontWeight: 700,
            color: '#FFFFFF',
            textTransform: 'uppercase',
            letterSpacing: '6px',
            lineHeight: 1.1,
            marginBottom: '24px',
            textShadow: '0 2px 10px rgba(0,0,0,0.5)',
          }}
        >
          EXPANDIR EL PODER
        </Typography>

        {/* Line 2: Connector */}
        <Typography
          sx={{
            fontFamily: '"Roboto", "Helvetica", sans-serif',
            fontSize: '32px',
            fontWeight: 300,
            color: 'rgba(200, 200, 210, 0.85)',
            marginBottom: '32px',
            letterSpacing: '1px',
          }}
        >
          de la gema más valiosa de nuestra tierra:
        </Typography>

        {/* Line 3: Protagonist */}
        <Typography
          sx={{
            fontFamily: '"Libre Baskerville", Georgia, serif',
            fontSize: '96px',
            fontWeight: 700,
            color: '#50C878', // Vibrant Emerald Green
            textTransform: 'uppercase',
            letterSpacing: '8px',
            lineHeight: 1,
            textShadow: `
              0 0 40px rgba(80, 200, 120, 0.6),
              0 0 80px rgba(46, 125, 50, 0.4),
              0 4px 20px rgba(0, 0, 0, 0.5)
            `,
          }}
        >
          LA ESMERALDA
        </Typography>
      </ContentWrapper>

      {/* Emerald Glow Effect */}
      <EmeraldGlow>
        <EmeraldShape />
      </EmeraldGlow>

      {/* Footer */}
      <Footer>
        <Typography
          sx={{
            fontFamily: '"Roboto", sans-serif',
            fontSize: '18px',
            color: 'rgba(180, 180, 190, 0.7)',
            letterSpacing: '1px',
          }}
        >
          @tierramadre.co
        </Typography>
        <Typography
          sx={{
            fontFamily: '"Roboto", sans-serif',
            fontSize: '18px',
            color: 'rgba(180, 180, 190, 0.7)',
            letterSpacing: '1px',
          }}
        >
          www.tierramadre.co
        </Typography>
      </Footer>
    </SlideContainer>
  );
}

export { SLIDE_WIDTH, SLIDE_HEIGHT };
