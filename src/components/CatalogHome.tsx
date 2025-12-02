/**
 * CatalogHome - Landing page with real emerald image and clickable navigation
 * Matches the Integración ARE PDF layout with Tierra Madre branding
 * Enhanced UX with emerald glow effects and keyboard navigation
 * Premium dark theme with glassmorphism effects
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  alpha,
  Fade,
  keyframes,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { CATALOG_TRANSITIONS } from '../styles/catalogTokens';

// Emerald brand colors - Premium palette
const EMERALD_PRIMARY = '#059669';
const EMERALD_GLOW = '#10b981';
const EMERALD_LIGHT = '#34d399';
const EMERALD_DARK = '#047857';

// Dark theme colors
const DARK_BG = '#0a0a0a';
const DARK_SURFACE = '#141414';
const DARK_ELEVATED = '#1a1a1a';

// Subtle pulse animation for the center logo
const pulseGlow = keyframes`
  0%, 100% {
    filter: drop-shadow(0 0 12px ${alpha(EMERALD_GLOW, 0.4)});
  }
  50% {
    filter: drop-shadow(0 0 24px ${alpha(EMERALD_GLOW, 0.7)});
  }
`;

// Floating animation for hotspots
const floatAnimation = keyframes`
  0%, 100% {
    transform: translate(-50%, -50%) translateY(0);
  }
  50% {
    transform: translate(-50%, -50%) translateY(-3px);
  }
`;

// Ambient glow animation
const ambientGlow = keyframes`
  0%, 100% {
    opacity: 0.3;
  }
  50% {
    opacity: 0.5;
  }
`;

// Catalog hotspot definitions - positioned to match emerald locations in the image
interface CatalogHotspot {
  id: string;
  name: string;
  subtitle: string;
  pdfFile: string;
  position: {
    top: string;
    left: string;
  };
}

// Positions match the 6 emeralds in slide-01.png (circular arrangement)
// Labels positioned outside the emeralds for better readability
const CATALOG_HOTSPOTS: CatalogHotspot[] = [
  {
    id: 'vision',
    name: 'Visión Compartida',
    subtitle: 'CEO',
    pdfFile: '/catalogs/CÓMO LO HACEMOS REAL.pdf',
    position: { top: '-2%', left: '50%' }, // Top center - above emerald
  },
  {
    id: 'exportadores',
    name: 'Exportadores',
    subtitle: 'Negocio Conjunto',
    pdfFile: '/catalogs/LOTE ORIGEN ARE TRÜST.pdf',
    position: { top: '25%', left: '85%' }, // Top right - outside
  },
  {
    id: 'acceso',
    name: 'Acceso Total',
    subtitle: 'Joyeros',
    pdfFile: '/catalogs/ACCESO TOTAL ESMERLADAS EN BRUTO-2.pdf',
    position: { top: '72%', left: '85%' }, // Bottom right - outside
  },
  {
    id: 'tierra',
    name: 'Tierra Madre',
    subtitle: 'Adopta una esmeralda',
    pdfFile: '/catalogs/EL PODER DE LA TIERRA MADRE -2.pdf',
    position: { top: '102%', left: '50%' }, // Bottom center - below emerald
  },
  {
    id: 'embajadores',
    name: 'Embajadores',
    subtitle: 'Tierra Madre',
    pdfFile: '/catalogs/EL PODER DE LA TIERRA MADRE -2.pdf',
    position: { top: '72%', left: '15%' }, // Bottom left - outside
  },
  {
    id: 'gifts',
    name: 'Gifts',
    subtitle: 'Tierra Madre',
    pdfFile: '/catalogs/Copia de EMERALD GIFTs .pdf',
    position: { top: '25%', left: '15%' }, // Top left - outside
  },
];

// Styled Components
const HomeContainer = styled(Box)(() => ({
  position: 'relative',
  width: '100%',
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  background: `
    radial-gradient(ellipse at 30% 20%, ${alpha(EMERALD_DARK, 0.15)} 0%, transparent 50%),
    radial-gradient(ellipse at 70% 80%, ${alpha(EMERALD_GLOW, 0.08)} 0%, transparent 50%),
    linear-gradient(180deg, ${DARK_BG} 0%, ${DARK_SURFACE} 50%, ${DARK_BG} 100%)
  `,
  overflow: 'visible',
  padding: '20px 60px',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
    opacity: 0.03,
    pointerEvents: 'none',
  },
}));

const ContentWrapper = styled(Box)(() => ({
  position: 'relative',
  width: '100%',
  maxWidth: '800px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '40px auto',
  padding: '0 80px',
  // Subtle glow behind the emeralds
  '&::before': {
    content: '""',
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '80%',
    height: '80%',
    background: `radial-gradient(ellipse, ${alpha(EMERALD_GLOW, 0.15)} 0%, transparent 70%)`,
    animation: `${ambientGlow} 4s ease-in-out infinite`,
    zIndex: 0,
    filter: 'blur(40px)',
  },
}));

const EmeraldImage = styled('img')(() => ({
  width: '100%',
  height: 'auto',
  objectFit: 'contain',
  position: 'relative',
  zIndex: 1,
  filter: 'drop-shadow(0 20px 40px rgba(0, 0, 0, 0.4))',
}));

const CenterLogo = styled(Box)(() => ({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '18%',
  zIndex: 10,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  animation: `${pulseGlow} 3s ease-in-out infinite`,
  '& img': {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
    filter: 'brightness(1.1)',
  },
}));

const HotspotOverlay = styled(Box)(() => ({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  pointerEvents: 'none',
}));

const Hotspot = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isHovered',
})<{ isHovered?: boolean }>(({ isHovered }) => ({
  position: 'absolute',
  transform: 'translate(-50%, -50%)',
  cursor: 'pointer',
  pointerEvents: 'auto',
  textAlign: 'center',
  padding: '12px 20px',
  borderRadius: 14,
  transition: `all ${CATALOG_TRANSITIONS.duration.normal}ms ${CATALOG_TRANSITIONS.easing.emphasis}`,
  // Dark glassmorphism effect
  backgroundColor: isHovered
    ? alpha(EMERALD_PRIMARY, 0.25)
    : alpha(DARK_ELEVATED, 0.85),
  border: `1px solid ${isHovered ? EMERALD_GLOW : alpha('#fff', 0.1)}`,
  boxShadow: isHovered
    ? `0 8px 32px ${alpha(EMERALD_GLOW, 0.35)}, 0 0 60px ${alpha(EMERALD_GLOW, 0.15)}, inset 0 1px 0 ${alpha('#fff', 0.1)}`
    : `0 4px 16px ${alpha('#000', 0.4)}, inset 0 1px 0 ${alpha('#fff', 0.05)}`,
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  animation: isHovered ? 'none' : `${floatAnimation} 6s ease-in-out infinite`,
  animationDelay: 'var(--animation-delay, 0s)',
  // Keyboard focus styles
  outline: 'none',
  '&:focus-visible': {
    outline: `2px solid ${EMERALD_GLOW}`,
    outlineOffset: 3,
    boxShadow: `0 0 0 6px ${alpha(EMERALD_GLOW, 0.2)}, 0 8px 32px ${alpha(EMERALD_GLOW, 0.35)}`,
  },
  '&:hover': {
    backgroundColor: alpha(EMERALD_PRIMARY, 0.3),
    border: `1px solid ${EMERALD_LIGHT}`,
    transform: 'translate(-50%, -50%) scale(1.08) translateY(-4px)',
    boxShadow: `0 12px 40px ${alpha(EMERALD_GLOW, 0.4)}, 0 0 80px ${alpha(EMERALD_GLOW, 0.2)}, inset 0 1px 0 ${alpha('#fff', 0.15)}`,
  },
  '&:active': {
    transform: 'translate(-50%, -50%) scale(0.98)',
    boxShadow: `0 4px 16px ${alpha(EMERALD_GLOW, 0.3)}`,
  },
}));

const HotspotName = styled(Typography, {
  shouldForwardProp: (prop) => prop !== 'isHovered',
})<{ isHovered?: boolean }>(({ isHovered }) => ({
  fontWeight: 700,
  fontSize: 'clamp(0.8rem, 1.8vw, 1rem)',
  color: isHovered ? EMERALD_LIGHT : '#ffffff',
  textDecoration: 'none',
  marginBottom: 3,
  transition: 'color 0.2s ease',
  whiteSpace: 'nowrap',
  letterSpacing: '0.03em',
  textShadow: isHovered ? `0 0 20px ${alpha(EMERALD_GLOW, 0.5)}` : 'none',
}));

const HotspotSubtitle = styled(Typography)(() => ({
  fontSize: 'clamp(0.65rem, 1.2vw, 0.75rem)',
  color: alpha('#fff', 0.6),
  fontStyle: 'italic',
  whiteSpace: 'nowrap',
  fontWeight: 500,
  letterSpacing: '0.02em',
}));

interface CatalogHomeProps {
  onCatalogSelect: (pdfUrl: string, name: string) => void;
}

export const CatalogHome: React.FC<CatalogHomeProps> = ({ onCatalogSelect }) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <HomeContainer>
      <Fade in timeout={800}>
        <ContentWrapper>
          {/* Real emerald arrangement image */}
          <EmeraldImage
            src="/catalog-media/integration/slide-01.png"
            alt="Emerald Collection"
          />

          {/* Center Logo - Tierra Madre Symbol Only */}
          <CenterLogo>
            <img src="/logo-symbol-only.png" alt="Tierra Madre" />
          </CenterLogo>

          {/* Clickable Hotspots */}
          <HotspotOverlay>
            {CATALOG_HOTSPOTS.map((hotspot) => {
              const isHovered = hoveredId === hotspot.id;

              return (
                <Hotspot
                  key={hotspot.id}
                  isHovered={isHovered}
                  onMouseEnter={() => setHoveredId(hotspot.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onFocus={() => setHoveredId(hotspot.id)}
                  onBlur={() => setHoveredId(null)}
                  onClick={() => onCatalogSelect(hotspot.pdfFile, hotspot.name)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onCatalogSelect(hotspot.pdfFile, hotspot.name);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`${hotspot.name} - ${hotspot.subtitle}`}
                  sx={{
                    top: hotspot.position.top,
                    left: hotspot.position.left,
                  }}
                >
                  <HotspotName isHovered={isHovered}>
                    {hotspot.name}
                  </HotspotName>
                  <HotspotSubtitle>
                    {hotspot.subtitle}
                  </HotspotSubtitle>
                </Hotspot>
              );
            })}
          </HotspotOverlay>
        </ContentWrapper>
      </Fade>

      {/* Instructions */}
      <Fade in timeout={1200}>
        <Box
          sx={{
            marginTop: 4,
            textAlign: 'center',
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: alpha('#fff', 0.45),
              fontStyle: 'italic',
              letterSpacing: '0.05em',
              fontSize: '0.875rem',
            }}
          >
            Selecciona una categoría para explorar
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: alpha('#fff', 0.3),
              display: 'block',
              marginTop: 0.5,
              fontSize: '0.7rem',
            }}
          >
            Usa Tab para navegar • Enter para seleccionar
          </Typography>
        </Box>
      </Fade>
    </HomeContainer>
  );
};

export default CatalogHome;
