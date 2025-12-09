/**
 * ShowRoom - Smart Responsive Design
 * Adapts elegantly to any screen size
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  alpha,
  Fade,
  useMediaQuery,
} from '@mui/material';
import { styled } from '@mui/material/styles';
// Design System Tokens
import { emeraldCore, goldAccent, surfacesLight, surfacesDark } from '../design-system/tokens/colors';

// ═══════════════════════════════════════════════════════════════════════════════
// COLORS (migrated to design system tokens)
// ═══════════════════════════════════════════════════════════════════════════════

const COLORS = {
  emerald: emeraldCore.primary,
  emeraldLight: emeraldCore.light,
  gold: goldAccent.primary,
  white: surfacesLight.background.primary,
  cream: surfacesLight.background.tertiary,
  dark: surfacesDark.background.primary,
  muted: surfacesLight.text.secondary,
};

// ═══════════════════════════════════════════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════════════════════════════════════════

const CATALOGS = [
  { id: 'vision', name: 'Visión Compartida', subtitle: 'CEO', pdfFile: '/catalogs/CÓMO LO HACEMOS REAL.pdf' },
  { id: 'tierra', name: 'Tierra Madre', subtitle: 'Adopta una esmeralda', pdfFile: '/catalogs/EL PODER DE LA TIERRA MADRE -2.pdf' },
  { id: 'exportadores', name: 'Exportadores', subtitle: 'Negocio Conjunto', pdfFile: '/catalogs/LOTE ORIGEN ARE TRÜST.pdf' },
  { id: 'acceso', name: 'Acceso Total', subtitle: 'Joyeros', pdfFile: '/catalogs/ACCESO TOTAL ESMERLADAS EN BRUTO-2.pdf' },
  { id: 'embajadores', name: 'Embajadores', subtitle: 'Comunidad', pdfFile: '/catalogs/EL PODER DE LA TIERRA MADRE -2.pdf' },
  { id: 'gifts', name: 'Gifts', subtitle: 'Colección Exclusiva', pdfFile: '/catalogs/Copia de EMERALD GIFTs .pdf' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// STYLED COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

const Container = styled(Box)(() => ({
  width: '100%',
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  background: `linear-gradient(180deg, ${COLORS.dark} 0%, #111 50%, ${COLORS.dark} 100%)`,
  padding: 'clamp(16px, 4vw, 40px)',
  paddingBottom: 'calc(80px + env(safe-area-inset-bottom))',
  boxSizing: 'border-box',
}));

const Title = styled(Typography)(() => ({
  fontFamily: '"Cormorant Garamond", Georgia, serif',
  fontSize: 'clamp(1.2rem, 3.5vw, 2rem)',
  fontWeight: 300,
  letterSpacing: 'clamp(0.2em, 2vw, 0.5em)',
  textTransform: 'uppercase',
  color: COLORS.gold,
  marginBottom: 'clamp(16px, 3vw, 32px)',
  textAlign: 'center',
}));

const MainContent = styled(Box)(() => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  width: '100%',
  maxWidth: '100%',
  gap: 'clamp(20px, 4vw, 40px)',
}));

const ImageContainer = styled(Box)(() => ({
  position: 'relative',
  width: 'clamp(200px, 70vw, 400px)',
  borderRadius: 'clamp(12px, 2vw, 20px)',
  overflow: 'hidden',
  background: COLORS.cream,
  boxShadow: `0 clamp(10px, 3vw, 30px) clamp(20px, 5vw, 60px) ${alpha('#000', 0.4)}`,
  flexShrink: 0,
}));

const EmeraldImage = styled('img')({
  width: '100%',
  height: 'auto',
  display: 'block',
});

const Logo = styled(Box)(() => ({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '16%',
  filter: `drop-shadow(0 0 clamp(8px, 2vw, 20px) ${alpha(COLORS.emerald, 0.5)})`,
  '& img': { width: '100%', height: 'auto' },
}));

const Grid = styled(Box)(() => ({
  display: 'grid',
  gap: 'clamp(8px, 2vw, 16px)',
  width: '100%',
  maxWidth: 'clamp(300px, 90vw, 600px)',
  // Smart grid: 2 columns on small, 3 on medium+
  gridTemplateColumns: 'repeat(auto-fit, minmax(clamp(130px, 25vw, 180px), 1fr))',
}));

const Card = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'active',
})<{ active?: boolean }>(({ active }) => ({
  cursor: 'pointer',
  textAlign: 'center',
  padding: 'clamp(12px, 2vw, 20px) clamp(8px, 1.5vw, 16px)',
  borderRadius: 'clamp(8px, 1.5vw, 14px)',
  transition: 'all 0.25s ease',
  backgroundColor: active ? alpha(COLORS.emerald, 0.12) : alpha('#1a1a1a', 0.9),
  border: `1px solid ${active ? COLORS.emerald : alpha(COLORS.white, 0.06)}`,
  boxShadow: active
    ? `0 6px 24px ${alpha(COLORS.emerald, 0.2)}`
    : `0 2px 12px ${alpha('#000', 0.25)}`,
  '&:active': { transform: 'scale(0.97)' },
  WebkitTapHighlightColor: 'transparent',
}));

const CardTitle = styled(Typography, {
  shouldForwardProp: (prop) => prop !== 'active',
})<{ active?: boolean }>(({ active }) => ({
  fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif',
  fontWeight: 500,
  fontSize: 'clamp(0.75rem, 2vw, 0.95rem)',
  color: active ? COLORS.emeraldLight : COLORS.white,
  marginBottom: 'clamp(2px, 0.5vw, 6px)',
  transition: 'color 0.25s ease',
}));

const CardSub = styled(Typography, {
  shouldForwardProp: (prop) => prop !== 'active',
})<{ active?: boolean }>(({ active }) => ({
  fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif',
  fontSize: 'clamp(0.6rem, 1.5vw, 0.7rem)',
  color: active ? alpha(COLORS.emeraldLight, 0.7) : COLORS.muted,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  transition: 'color 0.25s ease',
}));

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface Props {
  onCatalogSelect: (pdfUrl: string, name: string) => void;
}

export const CatalogHome: React.FC<Props> = ({ onCatalogSelect }) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const isLandscape = useMediaQuery('(orientation: landscape) and (max-height: 500px)');

  return (
    <Container>
      <Fade in timeout={400}>
        <Title>Show Room</Title>
      </Fade>

      <Fade in timeout={600}>
        <MainContent
          sx={{
            // Landscape mode: side-by-side layout
            flexDirection: isLandscape ? 'row' : 'column',
            justifyContent: isLandscape ? 'center' : 'flex-start',
            alignItems: isLandscape ? 'center' : 'center',
          }}
        >
          <ImageContainer
            sx={{
              width: isLandscape ? 'clamp(150px, 35vh, 280px)' : 'clamp(200px, 70vw, 400px)',
            }}
          >
            <EmeraldImage
              src="/catalog-media/integration/slide-01.png"
              alt="Emeralds"
            />
            <Logo>
              <img src="/logo-symbol-only.png" alt="" />
            </Logo>
          </ImageContainer>

          <Grid
            sx={{
              maxWidth: isLandscape ? 'clamp(250px, 50vw, 450px)' : 'clamp(300px, 90vw, 500px)',
            }}
          >
            {CATALOGS.map((cat) => (
              <Card
                key={cat.id}
                active={activeId === cat.id}
                onClick={() => onCatalogSelect(cat.pdfFile, cat.name)}
                onMouseEnter={() => setActiveId(cat.id)}
                onMouseLeave={() => setActiveId(null)}
                onTouchStart={() => setActiveId(cat.id)}
                onTouchEnd={() => setTimeout(() => setActiveId(null), 150)}
              >
                <CardTitle active={activeId === cat.id}>{cat.name}</CardTitle>
                <CardSub active={activeId === cat.id}>{cat.subtitle}</CardSub>
              </Card>
            ))}
          </Grid>
        </MainContent>
      </Fade>
    </Container>
  );
};

export default CatalogHome;
