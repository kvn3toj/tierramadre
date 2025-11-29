/**
 * CatalogHome - Landing page with real emerald image and clickable navigation
 * Matches the Integración ARE PDF layout with Tierra Madre branding
 * Enhanced UX with emerald glow effects and keyboard navigation
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

// Emerald brand color
const EMERALD_PRIMARY = '#047857';
const EMERALD_GLOW = '#10b981';

// Subtle pulse animation for the center logo
const pulseGlow = keyframes`
  0%, 100% {
    filter: drop-shadow(0 0 8px ${alpha(EMERALD_GLOW, 0.3)});
  }
  50% {
    filter: drop-shadow(0 0 16px ${alpha(EMERALD_GLOW, 0.5)});
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
  background: `linear-gradient(135deg, #fafafa 0%, ${alpha(EMERALD_GLOW, 0.03)} 50%, #f5f5f5 100%)`,
  overflow: 'hidden',
  padding: '20px',
}));

const ContentWrapper = styled(Box)(() => ({
  position: 'relative',
  width: '100%',
  maxWidth: '600px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '40px 0',
}));

const EmeraldImage = styled('img')(() => ({
  width: '100%',
  height: 'auto',
  objectFit: 'contain',
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
  padding: '10px 18px',
  borderRadius: 12,
  transition: `all ${CATALOG_TRANSITIONS.duration.normal}ms ${CATALOG_TRANSITIONS.easing.emphasis}`,
  backgroundColor: isHovered
    ? alpha(EMERALD_PRIMARY, 0.15)
    : alpha('#fff', 0.85),
  border: `2px solid ${isHovered ? EMERALD_PRIMARY : alpha('#000', 0.1)}`,
  boxShadow: isHovered
    ? `0 4px 20px ${alpha(EMERALD_GLOW, 0.4)}, 0 0 30px ${alpha(EMERALD_GLOW, 0.2)}`
    : `0 2px 8px ${alpha('#000', 0.1)}`,
  backdropFilter: 'blur(8px)',
  // Keyboard focus styles
  outline: 'none',
  '&:focus-visible': {
    outline: `3px solid ${EMERALD_GLOW}`,
    outlineOffset: 2,
    boxShadow: `0 0 0 6px ${alpha(EMERALD_GLOW, 0.2)}`,
  },
  '&:hover': {
    backgroundColor: alpha(EMERALD_PRIMARY, 0.15),
    border: `2px solid ${EMERALD_PRIMARY}`,
    transform: 'translate(-50%, -50%) scale(1.08)',
    boxShadow: `0 6px 24px ${alpha(EMERALD_GLOW, 0.5)}, 0 0 40px ${alpha(EMERALD_GLOW, 0.3)}`,
  },
  '&:active': {
    transform: 'translate(-50%, -50%) scale(0.98)',
  },
}));

const HotspotName = styled(Typography, {
  shouldForwardProp: (prop) => prop !== 'isHovered',
})<{ isHovered?: boolean }>(({ isHovered }) => ({
  fontWeight: 700,
  fontSize: 'clamp(0.75rem, 1.8vw, 1rem)',
  color: isHovered ? EMERALD_PRIMARY : '#1a1a1a',
  textDecoration: 'none',
  marginBottom: 2,
  transition: 'color 0.2s ease',
  whiteSpace: 'nowrap',
  letterSpacing: '0.02em',
}));

const HotspotSubtitle = styled(Typography)(() => ({
  fontSize: 'clamp(0.6rem, 1.2vw, 0.75rem)',
  color: alpha('#000', 0.55),
  fontStyle: 'italic',
  whiteSpace: 'nowrap',
  fontWeight: 500,
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
              color: alpha('#000', 0.45),
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
              color: alpha('#000', 0.3),
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
