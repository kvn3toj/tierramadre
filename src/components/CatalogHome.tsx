/**
 * ShowRoom - Premium emerald presentation space
 * Sacred geometry design with Colombian emerald identity
 * Enhanced UX with luxurious glassmorphism and golden ratio proportions
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

// ═══════════════════════════════════════════════════════════════════════════════
// SACRED COLOR SYSTEM - "Esmeralda Colombiana"
// Golden ratio progression for natural harmony
// ═══════════════════════════════════════════════════════════════════════════════

// Primary Emerald Spectrum (Golden Ratio Progression)
const EMERALD = {
  deep: '#024535',      // Colombian earth, ratio 1.0
  primary: '#047857',   // Pure emerald, ratio φ (1.618)
  vibrant: '#059669',   // Luminous core, ratio φ²
  glow: '#10b981',      // Radiant aura, ratio φ³
  ethereal: '#34d399',  // Light refraction, ratio φ⁴
  crystal: '#6ee7b7',   // Pure brilliance
};

// Sacred Accents - Colombian Heritage
const ACCENT = {
  gold: '#D4AF37',      // Colombian gold
  copper: '#B87333',    // Muzo mine copper
  pearl: '#F0EAD6',     // Cream highlight
};

// Atmospheric Layers (Fibonacci-based opacity)
const ATMOSPHERE = {
  void: '#050505',      // Deepest black
  abyss: '#0a0a0a',     // Pure darkness
  depth: '#0f0f0f',     // Deep shadow
  surface: '#141414',   // Surface level
  elevated: '#1a1a1a',  // Elevated surface
  luminance: '#222222', // Light touch
};

// ═══════════════════════════════════════════════════════════════════════════════
// SACRED ANIMATIONS - "Danza Cósmica"
// ═══════════════════════════════════════════════════════════════════════════════

// Emerald pulse with golden ratio timing
const emeraldPulse = keyframes`
  0%, 100% {
    filter: drop-shadow(0 0 20px ${alpha(EMERALD.glow, 0.4)})
            drop-shadow(0 0 40px ${alpha(EMERALD.vibrant, 0.2)});
    transform: translate(-50%, -50%) scale(1);
  }
  38.2% {
    filter: drop-shadow(0 0 30px ${alpha(EMERALD.glow, 0.6)})
            drop-shadow(0 0 60px ${alpha(EMERALD.vibrant, 0.3)});
    transform: translate(-50%, -50%) scale(1.02);
  }
  61.8% {
    filter: drop-shadow(0 0 35px ${alpha(EMERALD.glow, 0.7)})
            drop-shadow(0 0 70px ${alpha(EMERALD.vibrant, 0.35)});
    transform: translate(-50%, -50%) scale(1.03);
  }
`;

// Golden float animation
const goldenFloat = keyframes`
  0%, 100% {
    transform: translate(-50%, -50%) translateY(0);
  }
  38.2% {
    transform: translate(-50%, -50%) translateY(-6px);
  }
  61.8% {
    transform: translate(-50%, -50%) translateY(-4px);
  }
`;

// Ambient cosmic glow
const cosmicGlow = keyframes`
  0%, 100% {
    opacity: 0.4;
    transform: translate(-50%, -50%) scale(1);
  }
  50% {
    opacity: 0.7;
    transform: translate(-50%, -50%) scale(1.05);
  }
`;

// Shimmer effect for premium feel
const crystallineShimmer = keyframes`
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
`;

// ═══════════════════════════════════════════════════════════════════════════════
// CATALOG HOTSPOTS - Sacred Hexagonal Arrangement
// ═══════════════════════════════════════════════════════════════════════════════

interface CatalogHotspot {
  id: string;
  name: string;
  subtitle: string;
  pdfFile: string;
  tier: 'hero' | 'primary' | 'secondary';
  position: {
    top: string;
    left: string;
  };
}

const CATALOG_HOTSPOTS: CatalogHotspot[] = [
  {
    id: 'vision',
    name: 'Visión Compartida',
    subtitle: 'CEO',
    pdfFile: '/catalogs/CÓMO LO HACEMOS REAL.pdf',
    tier: 'hero',
    position: { top: '-5%', left: '50%' },
  },
  {
    id: 'exportadores',
    name: 'Exportadores',
    subtitle: 'Negocio Conjunto',
    pdfFile: '/catalogs/LOTE ORIGEN ARE TRÜST.pdf',
    tier: 'primary',
    position: { top: '25%', left: '108%' },
  },
  {
    id: 'acceso',
    name: 'Acceso Total',
    subtitle: 'Joyeros',
    pdfFile: '/catalogs/ACCESO TOTAL ESMERLADAS EN BRUTO-2.pdf',
    tier: 'primary',
    position: { top: '72%', left: '108%' },
  },
  {
    id: 'tierra',
    name: 'Tierra Madre',
    subtitle: 'Adopta una esmeralda',
    pdfFile: '/catalogs/EL PODER DE LA TIERRA MADRE -2.pdf',
    tier: 'hero',
    position: { top: '105%', left: '50%' },
  },
  {
    id: 'embajadores',
    name: 'Embajadores',
    subtitle: 'Comunidad',
    pdfFile: '/catalogs/EL PODER DE LA TIERRA MADRE -2.pdf',
    tier: 'secondary',
    position: { top: '72%', left: '-8%' },
  },
  {
    id: 'gifts',
    name: 'Gifts',
    subtitle: 'Colección Exclusiva',
    pdfFile: '/catalogs/Copia de EMERALD GIFTs .pdf',
    tier: 'secondary',
    position: { top: '25%', left: '-8%' },
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// STYLED COMPONENTS - Premium Show Room Experience
// ═══════════════════════════════════════════════════════════════════════════════

const ShowRoomContainer = styled(Box)(() => ({
  position: 'relative',
  width: '100%',
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  // Multi-layered cosmic background
  background: `
    radial-gradient(ellipse at 50% 30%, ${alpha(EMERALD.deep, 0.4)} 0%, transparent 50%),
    radial-gradient(ellipse at 20% 80%, ${alpha(EMERALD.primary, 0.15)} 0%, transparent 40%),
    radial-gradient(ellipse at 80% 20%, ${alpha(EMERALD.glow, 0.1)} 0%, transparent 40%),
    radial-gradient(ellipse at 50% 100%, ${alpha(ACCENT.gold, 0.05)} 0%, transparent 30%),
    linear-gradient(180deg, ${ATMOSPHERE.void} 0%, ${ATMOSPHERE.abyss} 30%, ${ATMOSPHERE.depth} 70%, ${ATMOSPHERE.void} 100%)
  `,
  overflow: 'visible',
  padding: '40px 80px',
  // Noise texture for premium feel
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
    opacity: 0.025,
    pointerEvents: 'none',
    mixBlendMode: 'overlay',
  },
  // Vignette effect
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.4) 100%)',
    pointerEvents: 'none',
  },
}));

// Show Room Title - Elegant serif with shimmer
const ShowRoomTitle = styled(Typography)(() => ({
  fontFamily: '"Playfair Display", "Cormorant Garamond", "Georgia", serif',
  fontSize: 'clamp(1.8rem, 5vw, 3rem)',
  fontWeight: 300,
  letterSpacing: '0.4em',
  textTransform: 'uppercase',
  marginBottom: 24,
  // Elegant emerald-gold gradient text
  background: `linear-gradient(
    90deg,
    ${alpha(EMERALD.ethereal, 0.7)} 0%,
    ${EMERALD.glow} 20%,
    ${ACCENT.gold} 50%,
    ${EMERALD.glow} 80%,
    ${alpha(EMERALD.ethereal, 0.7)} 100%
  )`,
  backgroundSize: '200% auto',
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  animation: `${crystallineShimmer} 6s ease-in-out infinite`,
  textShadow: 'none',
  position: 'relative',
  zIndex: 10,
  // Subtle underline accent
  '&::after': {
    content: '""',
    position: 'absolute',
    bottom: -8,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '60%',
    height: 1,
    background: `linear-gradient(
      90deg,
      transparent 0%,
      ${alpha(ACCENT.gold, 0.5)} 30%,
      ${alpha(EMERALD.glow, 0.6)} 50%,
      ${alpha(ACCENT.gold, 0.5)} 70%,
      transparent 100%
    )`,
  },
}));

const ContentWrapper = styled(Box)(() => ({
  position: 'relative',
  width: '100%',
  maxWidth: '700px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '20px auto',
  padding: '0 100px',
  // Multiple glow layers for depth
  '&::before': {
    content: '""',
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '100%',
    height: '100%',
    background: `
      radial-gradient(ellipse at center, ${alpha(EMERALD.glow, 0.2)} 0%, transparent 50%),
      radial-gradient(ellipse at center, ${alpha(EMERALD.vibrant, 0.15)} 0%, transparent 60%)
    `,
    animation: `${cosmicGlow} 5s ease-in-out infinite`,
    zIndex: 0,
    filter: 'blur(60px)',
  },
  // Secondary glow layer
  '&::after': {
    content: '""',
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '70%',
    height: '70%',
    background: `radial-gradient(circle, ${alpha(ACCENT.gold, 0.08)} 0%, transparent 70%)`,
    zIndex: 0,
    filter: 'blur(40px)',
  },
}));

// Elegant frame container for the emerald image
const ImageFrame = styled(Box)(() => ({
  position: 'relative',
  zIndex: 1,
  borderRadius: 24,
  overflow: 'hidden',
  // Elegant border with gradient
  padding: 2,
  background: `linear-gradient(
    135deg,
    ${alpha(EMERALD.glow, 0.4)} 0%,
    ${alpha(ACCENT.gold, 0.3)} 25%,
    ${alpha(EMERALD.ethereal, 0.2)} 50%,
    ${alpha(ACCENT.gold, 0.3)} 75%,
    ${alpha(EMERALD.glow, 0.4)} 100%
  )`,
  // Premium shadow layers
  boxShadow: `
    0 0 0 1px ${alpha(EMERALD.glow, 0.1)},
    0 10px 40px ${alpha('#000', 0.5)},
    0 20px 80px ${alpha(EMERALD.deep, 0.4)},
    0 0 120px ${alpha(EMERALD.glow, 0.15)},
    inset 0 0 60px ${alpha(EMERALD.glow, 0.05)}
  `,
  // Inner glow effect
  '&::before': {
    content: '""',
    position: 'absolute',
    inset: 2,
    borderRadius: 22,
    background: `linear-gradient(
      180deg,
      ${alpha(EMERALD.glow, 0.1)} 0%,
      transparent 30%,
      transparent 70%,
      ${alpha(EMERALD.deep, 0.15)} 100%
    )`,
    pointerEvents: 'none',
    zIndex: 2,
  },
}));

// Inner container with soft vignette
const ImageInner = styled(Box)(() => ({
  position: 'relative',
  borderRadius: 22,
  overflow: 'hidden',
  background: `linear-gradient(
    180deg,
    ${alpha('#fff', 0.98)} 0%,
    ${alpha('#f8f8f8', 0.95)} 50%,
    ${alpha('#f0f0f0', 0.9)} 100%
  )`,
  // Soft vignette overlay
  '&::after': {
    content: '""',
    position: 'absolute',
    inset: 0,
    background: `
      radial-gradient(ellipse at center, transparent 50%, ${alpha(EMERALD.deep, 0.08)} 100%),
      linear-gradient(180deg, ${alpha(EMERALD.glow, 0.03)} 0%, transparent 20%, transparent 80%, ${alpha(EMERALD.deep, 0.05)} 100%)
    `,
    pointerEvents: 'none',
    borderRadius: 22,
  },
}));

const EmeraldImage = styled('img')(() => ({
  width: '100%',
  height: 'auto',
  objectFit: 'contain',
  display: 'block',
  position: 'relative',
  zIndex: 1,
  // Subtle enhancement
  filter: 'contrast(1.02) saturate(1.05)',
  transition: 'filter 0.5s ease, transform 0.5s ease',
}));

const CenterLogo = styled(Box)(() => ({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '16%',
  zIndex: 10,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  animation: `${emeraldPulse} 4s cubic-bezier(0.4, 0, 0.2, 1) infinite`,
  '& img': {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
    filter: 'brightness(1.15) contrast(1.05)',
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

// Tier-based hotspot styling
const getTierStyles = (tier: 'hero' | 'primary' | 'secondary', isHovered: boolean) => {
  const config = {
    hero: {
      padding: '16px 28px',
      borderRadius: 18,
      glowIntensity: 0.5,
      scale: isHovered ? 1.12 : 1,
      borderWidth: 2,
    },
    primary: {
      padding: '14px 24px',
      borderRadius: 16,
      glowIntensity: 0.4,
      scale: isHovered ? 1.1 : 1,
      borderWidth: 1.5,
    },
    secondary: {
      padding: '12px 20px',
      borderRadius: 14,
      glowIntensity: 0.3,
      scale: isHovered ? 1.08 : 1,
      borderWidth: 1,
    },
  };
  return config[tier];
};

const Hotspot = styled(Box, {
  shouldForwardProp: (prop) => !['isHovered', 'tier'].includes(prop as string),
})<{ isHovered?: boolean; tier?: 'hero' | 'primary' | 'secondary' }>(({ isHovered, tier = 'secondary' }) => {
  const tierStyle = getTierStyles(tier, isHovered || false);

  return {
    position: 'absolute',
    transform: `translate(-50%, -50%) scale(${tierStyle.scale})`,
    cursor: 'pointer',
    pointerEvents: 'auto',
    textAlign: 'center',
    padding: tierStyle.padding,
    borderRadius: tierStyle.borderRadius,
    transition: `all 0.4s cubic-bezier(0.4, 0, 0.2, 1)`,
    // Premium glassmorphism
    backgroundColor: isHovered
      ? alpha(EMERALD.vibrant, 0.2)
      : alpha(ATMOSPHERE.elevated, 0.9),
    border: `${tierStyle.borderWidth}px solid ${
      isHovered ? EMERALD.glow : alpha(EMERALD.ethereal, 0.15)
    }`,
    // Layered shadow system
    boxShadow: isHovered
      ? `
          0 0 0 1px ${alpha(EMERALD.glow, 0.3)},
          0 10px 40px ${alpha(EMERALD.glow, tierStyle.glowIntensity)},
          0 0 80px ${alpha(EMERALD.vibrant, tierStyle.glowIntensity * 0.5)},
          inset 0 1px 0 ${alpha(ACCENT.pearl, 0.15)},
          inset 0 -1px 0 ${alpha(EMERALD.deep, 0.2)}
        `
      : `
          0 4px 20px ${alpha('#000', 0.5)},
          0 0 40px ${alpha(EMERALD.glow, 0.05)},
          inset 0 1px 0 ${alpha('#fff', 0.05)},
          inset 0 -1px 0 ${alpha('#000', 0.1)}
        `,
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    animation: isHovered ? 'none' : `${goldenFloat} 5s ease-in-out infinite`,
    animationDelay: 'var(--animation-delay, 0s)',
    outline: 'none',
    // Focus visible for accessibility
    '&:focus-visible': {
      outline: `3px solid ${EMERALD.glow}`,
      outlineOffset: 4,
      boxShadow: `
        0 0 0 6px ${alpha(EMERALD.glow, 0.3)},
        0 10px 40px ${alpha(EMERALD.glow, 0.5)}
      `,
    },
    '&:active': {
      transform: 'translate(-50%, -50%) scale(0.98)',
      boxShadow: `0 2px 10px ${alpha(EMERALD.glow, 0.3)}`,
    },
  };
});

const HotspotName = styled(Typography, {
  shouldForwardProp: (prop) => !['isHovered', 'tier'].includes(prop as string),
})<{ isHovered?: boolean; tier?: 'hero' | 'primary' | 'secondary' }>(({ isHovered, tier }) => ({
  fontFamily: '"Inter", "SF Pro Display", -apple-system, sans-serif',
  fontWeight: 600,
  fontSize: tier === 'hero' ? 'clamp(0.9rem, 2vw, 1.1rem)' : 'clamp(0.8rem, 1.8vw, 1rem)',
  color: isHovered ? EMERALD.ethereal : ACCENT.pearl,
  marginBottom: 4,
  transition: 'all 0.3s ease',
  whiteSpace: 'nowrap',
  letterSpacing: '0.04em',
  textShadow: isHovered
    ? `0 0 30px ${alpha(EMERALD.glow, 0.6)}, 0 0 60px ${alpha(EMERALD.glow, 0.3)}`
    : 'none',
}));

const HotspotSubtitle = styled(Typography, {
  shouldForwardProp: (prop) => prop !== 'isHovered',
})<{ isHovered?: boolean }>(({ isHovered }) => ({
  fontFamily: '"Inter", "SF Pro Text", -apple-system, sans-serif',
  fontSize: 'clamp(0.65rem, 1.2vw, 0.75rem)',
  color: isHovered ? alpha(EMERALD.ethereal, 0.8) : alpha(ACCENT.pearl, 0.5),
  fontWeight: 400,
  whiteSpace: 'nowrap',
  letterSpacing: '0.06em',
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
      {/* Show Room Title */}
      <Fade in timeout={600}>
        <ShowRoomTitle>Show Room</ShowRoomTitle>
      </Fade>

      <Fade in timeout={1000}>
        <ContentWrapper>
          {/* Emerald arrangement centerpiece with elegant frame */}
          <ImageFrame>
            <ImageInner>
              <EmeraldImage
                src="/catalog-media/integration/slide-01.png"
                alt="Colombian Emerald Collection - Show Room"
              />
            </ImageInner>
          </ImageFrame>

          {/* Center Logo with pulse */}
          <CenterLogo>
            <img src="/logo-symbol-only.png" alt="Tierra Madre" />
          </CenterLogo>

          {/* Category Hotspots */}
          <HotspotOverlay>
            {CATALOG_HOTSPOTS.map((hotspot, index) => {
              const isHovered = hoveredId === hotspot.id;

              return (
                <Hotspot
                  key={hotspot.id}
                  isHovered={isHovered}
                  tier={hotspot.tier}
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
                  aria-label={`${hotspot.name} - ${hotspot.subtitle}. Presiona Enter para explorar.`}
                  sx={{
                    top: hotspot.position.top,
                    left: hotspot.position.left,
                    '--animation-delay': `${index * 0.5}s`,
                  }}
                >
                  <HotspotName isHovered={isHovered} tier={hotspot.tier}>
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

      {/* Instructions */}
      <Fade in timeout={1400}>
        <Box
          sx={{
            marginTop: 5,
            textAlign: 'center',
            position: 'relative',
            zIndex: 10,
          }}
        >
          <Typography
            sx={{
              fontFamily: '"Inter", sans-serif',
              color: alpha(ACCENT.pearl, 0.4),
              fontStyle: 'italic',
              letterSpacing: '0.1em',
              fontSize: '0.85rem',
              fontWeight: 300,
            }}
          >
            Selecciona una colección para explorar
          </Typography>
          <Typography
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              color: alpha(EMERALD.ethereal, 0.25),
              display: 'block',
              marginTop: 1,
              fontSize: '0.7rem',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
            }}
          >
            Tab para navegar • Enter para seleccionar
          </Typography>
        </Box>
      </Fade>
    </ShowRoomContainer>
  );
};

export default CatalogHome;
