/**
 * ShowRoom - Minimalist Premium Experience
 * "Less is more" - Elegant simplicity
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  alpha,
  Fade,
} from '@mui/material';
import { styled } from '@mui/material/styles';

// ═══════════════════════════════════════════════════════════════════════════════
// MINIMAL COLOR PALETTE
// ═══════════════════════════════════════════════════════════════════════════════

const COLORS = {
  // Emerald essence
  emerald: '#10b981',
  emeraldDeep: '#047857',
  emeraldLight: '#34d399',

  // Accent
  gold: '#C5A572',

  // Neutral
  white: '#ffffff',
  cream: '#f8f7f4',
  dark: '#0a0a0a',
  muted: '#6b7280',
};

// ═══════════════════════════════════════════════════════════════════════════════
// CATALOG DATA
// ═══════════════════════════════════════════════════════════════════════════════

interface CatalogHotspot {
  id: string;
  name: string;
  subtitle: string;
  pdfFile: string;
  position: { top: string; left: string };
}

const CATALOG_HOTSPOTS: CatalogHotspot[] = [
  {
    id: 'vision',
    name: 'Visión Compartida',
    subtitle: 'CEO',
    pdfFile: '/catalogs/CÓMO LO HACEMOS REAL.pdf',
    position: { top: '-5%', left: '50%' },
  },
  {
    id: 'exportadores',
    name: 'Exportadores',
    subtitle: 'Negocio Conjunto',
    pdfFile: '/catalogs/LOTE ORIGEN ARE TRÜST.pdf',
    position: { top: '25%', left: '108%' },
  },
  {
    id: 'acceso',
    name: 'Acceso Total',
    subtitle: 'Joyeros',
    pdfFile: '/catalogs/ACCESO TOTAL ESMERLADAS EN BRUTO-2.pdf',
    position: { top: '72%', left: '108%' },
  },
  {
    id: 'tierra',
    name: 'Tierra Madre',
    subtitle: 'Adopta una esmeralda',
    pdfFile: '/catalogs/EL PODER DE LA TIERRA MADRE -2.pdf',
    position: { top: '105%', left: '50%' },
  },
  {
    id: 'embajadores',
    name: 'Embajadores',
    subtitle: 'Comunidad',
    pdfFile: '/catalogs/EL PODER DE LA TIERRA MADRE -2.pdf',
    position: { top: '72%', left: '-8%' },
  },
  {
    id: 'gifts',
    name: 'Gifts',
    subtitle: 'Colección Exclusiva',
    pdfFile: '/catalogs/Copia de EMERALD GIFTs .pdf',
    position: { top: '25%', left: '-8%' },
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// STYLED COMPONENTS - Minimal & Elegant
// ═══════════════════════════════════════════════════════════════════════════════

const ShowRoomContainer = styled(Box)(() => ({
  position: 'relative',
  width: '100%',
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  // Simple elegant gradient
  background: `linear-gradient(180deg,
    ${COLORS.dark} 0%,
    #0f0f0f 50%,
    ${COLORS.dark} 100%
  )`,
  overflow: 'visible',
  padding: '40px 80px',
}));

// Minimal elegant title
const ShowRoomTitle = styled(Typography)(() => ({
  fontFamily: '"Cormorant Garamond", Georgia, serif',
  fontSize: 'clamp(1.5rem, 4vw, 2.2rem)',
  fontWeight: 300,
  letterSpacing: '0.5em',
  textTransform: 'uppercase',
  color: COLORS.gold,
  marginBottom: 32,
  position: 'relative',
  zIndex: 10,
}));

const ContentWrapper = styled(Box)(() => ({
  position: 'relative',
  width: '100%',
  maxWidth: '640px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '0 auto',
  padding: '0 80px',
}));

// Clean minimal frame
const ImageFrame = styled(Box)(() => ({
  position: 'relative',
  zIndex: 1,
  borderRadius: 20,
  overflow: 'hidden',
  background: COLORS.cream,
  boxShadow: `0 30px 60px ${alpha('#000', 0.4)}`,
}));

const EmeraldImage = styled('img')(() => ({
  width: '100%',
  height: 'auto',
  objectFit: 'contain',
  display: 'block',
}));

const CenterLogo = styled(Box)(() => ({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '14%',
  zIndex: 10,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  filter: `drop-shadow(0 0 20px ${alpha(COLORS.emerald, 0.4)})`,
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
  zIndex: 5,
}));

// Minimal elegant hotspot
const Hotspot = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isHovered',
})<{ isHovered?: boolean }>(({ isHovered }) => ({
  position: 'absolute',
  transform: 'translate(-50%, -50%)',
  cursor: 'pointer',
  pointerEvents: 'auto',
  textAlign: 'center',
  padding: '14px 24px',
  borderRadius: 12,
  transition: 'all 0.3s ease',
  backgroundColor: isHovered
    ? alpha(COLORS.dark, 0.95)
    : alpha(COLORS.dark, 0.85),
  border: `1px solid ${isHovered ? COLORS.emerald : alpha(COLORS.white, 0.08)}`,
  boxShadow: isHovered
    ? `0 8px 32px ${alpha(COLORS.emerald, 0.25)}`
    : `0 4px 16px ${alpha('#000', 0.3)}`,
  backdropFilter: 'blur(12px)',
  outline: 'none',
  '&:focus-visible': {
    outline: `2px solid ${COLORS.emerald}`,
    outlineOffset: 2,
  },
}));

const HotspotName = styled(Typography, {
  shouldForwardProp: (prop) => prop !== 'isHovered',
})<{ isHovered?: boolean }>(({ isHovered }) => ({
  fontFamily: '"Inter", -apple-system, sans-serif',
  fontWeight: 500,
  fontSize: '0.9rem',
  color: isHovered ? COLORS.emeraldLight : COLORS.white,
  marginBottom: 2,
  transition: 'color 0.3s ease',
  whiteSpace: 'nowrap',
  letterSpacing: '0.02em',
}));

const HotspotSubtitle = styled(Typography, {
  shouldForwardProp: (prop) => prop !== 'isHovered',
})<{ isHovered?: boolean }>(({ isHovered }) => ({
  fontFamily: '"Inter", -apple-system, sans-serif',
  fontSize: '0.7rem',
  color: isHovered ? alpha(COLORS.emeraldLight, 0.7) : COLORS.muted,
  fontWeight: 400,
  whiteSpace: 'nowrap',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  transition: 'color 0.3s ease',
}));

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface CatalogHomeProps {
  onCatalogSelect: (pdfUrl: string, name: string) => void;
}

export const CatalogHome: React.FC<CatalogHomeProps> = ({ onCatalogSelect }) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <ShowRoomContainer>
      <Fade in timeout={500}>
        <ShowRoomTitle>Show Room</ShowRoomTitle>
      </Fade>

      <Fade in timeout={800}>
        <ContentWrapper>
          <ImageFrame>
            <EmeraldImage
              src="/catalog-media/integration/slide-01.png"
              alt="Colombian Emerald Collection"
            />
          </ImageFrame>

          <CenterLogo>
            <img src="/logo-symbol-only.png" alt="Tierra Madre" />
          </CenterLogo>

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
                  <HotspotSubtitle isHovered={isHovered}>
                    {hotspot.subtitle}
                  </HotspotSubtitle>
                </Hotspot>
              );
            })}
          </HotspotOverlay>
        </ContentWrapper>
      </Fade>

      <Fade in timeout={1100}>
        <Typography
          sx={{
            marginTop: 5,
            color: alpha(COLORS.muted, 0.5),
            fontStyle: 'italic',
            letterSpacing: '0.1em',
            fontSize: '0.8rem',
            fontWeight: 300,
            zIndex: 10,
          }}
        >
          Selecciona una colección
        </Typography>
      </Fade>
    </ShowRoomContainer>
  );
};

export default CatalogHome;
