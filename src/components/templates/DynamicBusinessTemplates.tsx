/**
 * TIERRA MADRE - Dynamic Business Templates
 * Flexible layouts with full-bleed images and cinematic overlays
 * Based on LuxuryMasterclassTemplates approach (NOT rigid card boxes)
 *
 * Design Philosophy:
 * - Full-bleed cinematic images
 * - Text overlays with gradients
 * - Dynamic positioning
 * - Emerald green accents
 * - Luxury dark backgrounds
 */

import React from 'react';
import { Box, Typography } from '@mui/material';
import { emeraldCore, goldAccent } from '../../design-system/tokens/colors';
import { zIndex } from '../../design-system';

// ============================================================================
// CONSTANTS
// ============================================================================

const SLIDE_WIDTH = 1920;
const SLIDE_HEIGHT = 1080;
// Deliberately the bare MARK, not the lockup: this is a 55px corner watermark.
// The lockup's slogan band is 6.3% of its height, so it needs ≥80px to stay
// legible — at 55px it would render the slogan as an illegible smear.
const LOGO_PATH = '/logo-tierra-madre.png';

// Luxury Color Palette
const COLORS = {
  // Emerald Spectrum
  emerald: '#0A4D3C',
  emeraldRich: '#1B7A5E',
  emeraldLight: '#2E9B7D',
  emeraldGlow: emeraldCore.primary, // Brand emerald
  // Gold Accents
  gold: goldAccent.primary,
  goldDark: '#8B7355',
  // Backgrounds
  richBlack: '#0A0A0A',
  darkGray: '#1A1A1A',
  // Text
  white: '#FFFFFF',
  textMuted: 'rgba(255, 255, 255, 0.75)',
  textSubtle: 'rgba(255, 255, 255, 0.5)',
};

// Typography Scale
const TYPOGRAPHY = {
  h1: {
    fontSize: 96,
    fontWeight: 700,
    lineHeight: 1.1,
    fontFamily: '"Cormorant Garamond", serif',
  },
  h2: {
    fontSize: 72,
    fontWeight: 600,
    lineHeight: 1.15,
    fontFamily: '"Cormorant Garamond", serif',
  },
  h3: {
    fontSize: 56,
    fontWeight: 500,
    lineHeight: 1.2,
    fontFamily: '"Cormorant Garamond", serif',
  },
  h4: {
    fontSize: 42,
    fontWeight: 500,
    lineHeight: 1.3,
    fontFamily: '"Cormorant Garamond", serif',
  },
  body: {
    fontSize: 28,
    fontWeight: 400,
    lineHeight: 1.6,
    fontFamily: '"Montserrat", sans-serif',
  },
  bodySmall: {
    fontSize: 22,
    fontWeight: 400,
    lineHeight: 1.5,
    fontFamily: '"Montserrat", sans-serif',
  },
  caption: {
    fontSize: 18,
    fontWeight: 500,
    lineHeight: 1.4,
    fontFamily: '"Montserrat", sans-serif',
    letterSpacing: '0.15em',
    textTransform: 'uppercase' as const,
  },
  number: {
    fontSize: 120,
    fontWeight: 700,
    lineHeight: 1,
    fontFamily: '"Cinzel", serif',
  },
};

// Image prompts for each slide type
const IMAGE_PROMPTS = {
  cover:
    'single stunning colombian emerald gemstone floating with sparkles and light rays on pure black background, luxury jewelry photography, dramatic spotlight',
  highValue:
    'multiple emerald gemstones arranged on black velvet with golden price tags, museum quality display, dramatic spotlight lighting, investment concept',
  globalDemand:
    'elegant dark world map with golden connection lines between continents, emerald green accents on sophisticated dark background, luxury travel concept',
  colombia:
    'macro photography of colombian emerald crystal showing beautiful internal gardens and inclusions, scientific documentation style, dramatic lighting on dark background',
  margins:
    'luxurious emerald jewelry pieces on display pedestals in high-end boutique setting, golden accents, dramatic cinematic lighting',
  diversified:
    'comparison display of raw emerald rough stone, precision cut emerald, and finished emerald jewelry piece, educational luxury display, dark elegant background',
  compact:
    'elegant emerald collection in velvet-lined wooden box, safe deposit aesthetic, dramatic spotlight on black background, security and value concept',
  luxury:
    'red carpet glamour setting with emerald necklace on display stand, paparazzi lights effect, luxury fashion photography, dramatic spotlight',
  appreciation:
    'vintage antique emerald jewelry next to modern emerald piece showing timeless value, museum display aesthetic, dramatic lighting',
  flexibility:
    'colombian emerald mine landscape at golden hour sunrise, workers silhouettes, misty mountains, documentary photography style, inspiring',
  barrier:
    'professional gemologist examining emerald with loupe in sophisticated laboratory, warm accent lighting on dark background, expertise concept',
  conclusion:
    'single large emerald with tropical colombian flowers arrangement, gratitude concept, elegant dark background with soft emerald green glow',
};

// ============================================================================
// BASE COMPONENTS
// ============================================================================

const SlideContainer: React.FC<{ id?: string; children: React.ReactNode }> = ({
  id,
  children,
}) => (
  <Box
    id={id}
    sx={{
      width: SLIDE_WIDTH,
      height: SLIDE_HEIGHT,
      position: 'relative',
      overflow: 'hidden',
      backgroundColor: COLORS.richBlack,
      fontFamily: '"Montserrat", sans-serif',
    }}
  >
    {children}
  </Box>
);

const BackgroundImage: React.FC<{
  src: string;
  opacity?: number;
  brightness?: number;
}> = ({ src, opacity = 1, brightness = 0.4 }) => (
  <Box
    component="img"
    src={src}
    alt=""
    sx={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: SLIDE_WIDTH,
      height: SLIDE_HEIGHT,
      objectFit: 'cover',
      opacity,
      filter: `brightness(${brightness})`,
    }}
  />
);

const GradientOverlay: React.FC<{
  direction?: 'bottom' | 'left' | 'right' | 'radial';
}> = ({ direction = 'bottom' }) => {
  const gradients = {
    bottom:
      'linear-gradient(to bottom, rgba(10,10,10,0.2) 0%, rgba(10,10,10,0.9) 100%)',
    left: 'linear-gradient(to right, rgba(10,10,10,0.95) 0%, rgba(10,10,10,0.6) 50%, transparent 100%)',
    right:
      'linear-gradient(to left, rgba(10,10,10,0.95) 0%, rgba(10,10,10,0.6) 50%, transparent 100%)',
    radial:
      'radial-gradient(ellipse at center, transparent 20%, rgba(10,10,10,0.8) 100%)',
  };

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: SLIDE_WIDTH,
        height: SLIDE_HEIGHT,
        background: gradients[direction],
      }}
    />
  );
};

const EmeraldAccent: React.FC<{ position?: 'left' | 'top' | 'bottom' }> = ({
  position = 'left',
}) => {
  const styles = {
    left: { left: 0, top: 0, width: 6, height: SLIDE_HEIGHT },
    top: { left: 0, top: 0, width: SLIDE_WIDTH, height: 6 },
    bottom: { left: 0, bottom: 0, width: SLIDE_WIDTH, height: 6 },
  };

  return (
    <Box
      sx={{
        position: 'absolute',
        ...styles[position],
        background: `linear-gradient(90deg, ${COLORS.emerald}, ${COLORS.emeraldGlow})`,
        boxShadow: `0 0 30px ${COLORS.emerald}80`,
      }}
    />
  );
};

const Logo: React.FC = () => (
  <Box
    sx={{ position: 'absolute', bottom: 50, right: 60, zIndex: zIndex.base }}
  >
    <Box
      component="img"
      src={LOGO_PATH}
      alt="Tierra Madre"
      sx={{ height: 55, filter: 'brightness(0) invert(1)', opacity: 0.9 }}
    />
  </Box>
);

const SlideNumber: React.FC<{ number: number | string }> = ({ number }) => (
  <Box sx={{ position: 'absolute', top: 80, left: 100, zIndex: zIndex.base }}>
    <Typography
      sx={{
        ...TYPOGRAPHY.number,
        color: COLORS.emeraldGlow,
        opacity: 0.15,
        textShadow: `0 0 60px ${COLORS.emerald}`,
      }}
    >
      {number}
    </Typography>
  </Box>
);

// ============================================================================
// DYNAMIC TEMPLATE: COVER
// ============================================================================

interface DynamicCoverProps {
  id?: string;
  title?: string;
  subtitle?: string;
  imageUrl?: string;
}

export const DynamicCoverSlide: React.FC<DynamicCoverProps> = ({
  id = 'dynamic-cover',
  title = '¿POR QUÉ ES BUEN NEGOCIO COMERCIALIZAR Y EXPORTAR ESMERALDAS?',
  subtitle = 'Oportunidad de inversión en gemas colombianas',
  imageUrl,
}) => {
  const imgSrc =
    imageUrl ||
    `https://image.pollinations.ai/prompt/${encodeURIComponent(IMAGE_PROMPTS.cover + ', ultra detailed 8K')}?width=1920&height=1080&nologo=true&seed=2024`;

  return (
    <SlideContainer id={id}>
      <BackgroundImage src={imgSrc} brightness={0.3} />
      <GradientOverlay direction="radial" />
      <EmeraldAccent position="top" />
      <EmeraldAccent position="bottom" />

      {/* Title */}
      <Box
        sx={{
          position: 'absolute',
          top: 280,
          left: 0,
          width: SLIDE_WIDTH,
          textAlign: 'center',
          px: 10,
        }}
      >
        <Typography
          sx={{
            ...TYPOGRAPHY.h2,
            color: COLORS.white,
            textShadow: '0 4px 60px rgba(0,0,0,0.9)',
            letterSpacing: '0.02em',
          }}
        >
          {title}
        </Typography>
      </Box>

      {/* Emerald Divider */}
      <Box
        sx={{
          position: 'absolute',
          top: 520,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 300,
          height: 3,
          background: `linear-gradient(90deg, transparent, ${COLORS.emeraldGlow}, transparent)`,
        }}
      />

      {/* Subtitle */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 220,
          left: 0,
          width: SLIDE_WIDTH,
          textAlign: 'center',
        }}
      >
        <Typography
          sx={{
            ...TYPOGRAPHY.body,
            color: COLORS.textMuted,
            letterSpacing: '0.08em',
          }}
        >
          {subtitle}
        </Typography>
      </Box>

      <Logo />
    </SlideContainer>
  );
};

// ============================================================================
// DYNAMIC TEMPLATE: KEY POINT (Left text, right image)
// ============================================================================

interface DynamicKeyPointProps {
  id?: string;
  number?: number | string;
  title?: string;
  content?: string;
  benefit?: string;
  imageUrl?: string;
  imagePosition?: 'left' | 'right';
}

export const DynamicKeyPointSlide: React.FC<DynamicKeyPointProps> = ({
  id = 'dynamic-keypoint',
  number = '1',
  title = 'Alto Valor por Unidad',
  content = 'Las esmeraldas son uno de los minerales más caros del mundo. Un quilate puede valer más que el oro.',
  benefit = 'Bajos costos logísticos. Grandes sumas en poca mercancía. Perfecto para exportación premium.',
  imageUrl,
  imagePosition = 'right',
}) => {
  const imgSrc =
    imageUrl ||
    `https://image.pollinations.ai/prompt/${encodeURIComponent(IMAGE_PROMPTS.highValue + ', ultra detailed 8K')}?width=1920&height=1080&nologo=true&seed=${2024 + Number(number) * 100}`;
  const isLeft = imagePosition === 'left';

  return (
    <SlideContainer id={id}>
      <BackgroundImage src={imgSrc} brightness={0.25} />
      <GradientOverlay direction={isLeft ? 'right' : 'left'} />
      <EmeraldAccent position="left" />
      <SlideNumber number={number} />

      {/* Content Area */}
      <Box
        sx={{
          position: 'absolute',
          top: 200,
          [isLeft ? 'right' : 'left']: 100,
          width: 900,
          zIndex: zIndex.base,
        }}
      >
        {/* Title with emerald accent */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 4 }}>
          <Box sx={{ width: 60, height: 3, bgcolor: COLORS.emeraldGlow }} />
          <Typography sx={{ ...TYPOGRAPHY.caption, color: COLORS.emeraldGlow }}>
            RAZÓN {number}
          </Typography>
        </Box>

        <Typography
          sx={{
            ...TYPOGRAPHY.h3,
            color: COLORS.white,
            mb: 4,
            textShadow: '0 4px 30px rgba(0,0,0,0.8)',
          }}
        >
          {title}
        </Typography>

        <Typography
          sx={{
            ...TYPOGRAPHY.body,
            color: COLORS.textMuted,
            mb: 5,
            lineHeight: 1.7,
          }}
        >
          {content}
        </Typography>

        {/* Benefit highlight */}
        <Box
          sx={{
            pl: 4,
            borderLeft: `4px solid ${COLORS.emeraldGlow}`,
            py: 2,
          }}
        >
          <Typography
            sx={{
              ...TYPOGRAPHY.bodySmall,
              color: COLORS.emeraldLight,
              fontWeight: 500,
            }}
          >
            {benefit}
          </Typography>
        </Box>
      </Box>

      <Logo />
    </SlideContainer>
  );
};

// ============================================================================
// DYNAMIC TEMPLATE: LIST (Multiple items)
// ============================================================================

interface DynamicListProps {
  id?: string;
  number?: number | string;
  title?: string;
  items?: string[];
  imageUrl?: string;
}

export const DynamicListSlide: React.FC<DynamicListProps> = ({
  id = 'dynamic-list',
  number = '3',
  title = 'Demanda Internacional Estable',
  items = [
    'Estados Unidos - Joyería de lujo',
    'Hong Kong y China - Alta joyería',
    'Europa - Mercado exclusivo',
    'Dubái y Medio Oriente - Joyerías VIP',
    'India - Gran demanda cultural',
  ],
  imageUrl,
}) => {
  const imgSrc =
    imageUrl ||
    `https://image.pollinations.ai/prompt/${encodeURIComponent(IMAGE_PROMPTS.globalDemand + ', ultra detailed 8K')}?width=1920&height=1080&nologo=true&seed=${2024 + Number(number) * 100}`;

  return (
    <SlideContainer id={id}>
      <BackgroundImage src={imgSrc} brightness={0.2} />
      <GradientOverlay direction="left" />
      <EmeraldAccent position="left" />
      <SlideNumber number={number} />

      {/* Content */}
      <Box
        sx={{
          position: 'absolute',
          top: 180,
          left: 100,
          width: 850,
          zIndex: zIndex.base,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 4 }}>
          <Box sx={{ width: 60, height: 3, bgcolor: COLORS.emeraldGlow }} />
          <Typography sx={{ ...TYPOGRAPHY.caption, color: COLORS.emeraldGlow }}>
            RAZÓN {number}
          </Typography>
        </Box>

        <Typography
          sx={{
            ...TYPOGRAPHY.h3,
            color: COLORS.white,
            mb: 5,
            textShadow: '0 4px 30px rgba(0,0,0,0.8)',
          }}
        >
          {title}
        </Typography>

        {/* List Items */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {items.map((item, idx) => (
            <Box
              key={idx}
              sx={{ display: 'flex', alignItems: 'center', gap: 3 }}
            >
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  bgcolor: COLORS.emeraldGlow,
                  boxShadow: `0 0 15px ${COLORS.emeraldGlow}`,
                }}
              />
              <Typography sx={{ ...TYPOGRAPHY.body, color: COLORS.textMuted }}>
                {item}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      <Logo />
    </SlideContainer>
  );
};

// ============================================================================
// DYNAMIC TEMPLATE: TIMELINE/FLOW
// ============================================================================

interface DynamicFlowProps {
  id?: string;
  number?: number | string;
  title?: string;
  steps?: string[];
  imageUrl?: string;
}

export const DynamicFlowSlide: React.FC<DynamicFlowProps> = ({
  id = 'dynamic-flow',
  number = '10',
  title = 'Flexibilidad en el Negocio',
  steps = [
    'Comprar en mina',
    'Intermediar',
    'Tallar',
    'Certificar',
    'Exportar',
    'Vender retail',
  ],
  imageUrl,
}) => {
  const imgSrc =
    imageUrl ||
    `https://image.pollinations.ai/prompt/${encodeURIComponent(IMAGE_PROMPTS.flexibility + ', ultra detailed 8K')}?width=1920&height=1080&nologo=true&seed=${2024 + Number(number) * 100}`;

  return (
    <SlideContainer id={id}>
      <BackgroundImage src={imgSrc} brightness={0.25} />
      <GradientOverlay direction="bottom" />
      <EmeraldAccent position="top" />
      <SlideNumber number={number} />

      {/* Title */}
      <Box
        sx={{
          position: 'absolute',
          top: 150,
          left: 0,
          width: SLIDE_WIDTH,
          textAlign: 'center',
        }}
      >
        <Typography
          sx={{ ...TYPOGRAPHY.caption, color: COLORS.emeraldGlow, mb: 2 }}
        >
          RAZÓN {number}
        </Typography>
        <Typography
          sx={{
            ...TYPOGRAPHY.h3,
            color: COLORS.white,
            textShadow: '0 4px 30px rgba(0,0,0,0.8)',
          }}
        >
          {title}
        </Typography>
      </Box>

      {/* Flow Steps */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 200,
          left: 0,
          width: SLIDE_WIDTH,
          display: 'flex',
          justifyContent: 'center',
          gap: 2,
          px: 10,
        }}
      >
        {steps.map((step, idx) => (
          <React.Fragment key={idx}>
            <Box
              sx={{
                px: 4,
                py: 3,
                bgcolor: 'rgba(10,77,60,0.9)',
                border: `2px solid ${COLORS.emeraldGlow}`,
                borderRadius: 2,
              }}
            >
              <Typography
                sx={{
                  ...TYPOGRAPHY.bodySmall,
                  color: COLORS.white,
                  fontWeight: 600,
                }}
              >
                {step}
              </Typography>
            </Box>
            {idx < steps.length - 1 && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  color: COLORS.emeraldGlow,
                }}
              >
                <Typography sx={{ fontSize: 32 }}>→</Typography>
              </Box>
            )}
          </React.Fragment>
        ))}
      </Box>

      {/* Bottom benefit */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 100,
          left: 0,
          width: SLIDE_WIDTH,
          textAlign: 'center',
        }}
      >
        <Typography sx={{ ...TYPOGRAPHY.body, color: COLORS.textMuted }}>
          Oportunidades en todos los niveles con diferentes capitales
        </Typography>
      </Box>

      <Logo />
    </SlideContainer>
  );
};

// ============================================================================
// DYNAMIC TEMPLATE: CONCLUSION
// ============================================================================

interface DynamicConclusionProps {
  id?: string;
  title?: string;
  items?: string[];
  imageUrl?: string;
}

export const DynamicConclusionSlide: React.FC<DynamicConclusionProps> = ({
  id = 'dynamic-conclusion',
  title = 'Conclusión',
  items = [
    'Alto valor por unidad',
    'Alta demanda mundial',
    'Márgenes de ganancia amplios',
    'Poca competencia real',
    'Fácil de almacenar y transportar',
    'Mercado de lujo dispuesto a pagar',
    'Potencia de marca "Esmeralda Colombiana"',
  ],
  imageUrl,
}) => {
  const imgSrc =
    imageUrl ||
    `https://image.pollinations.ai/prompt/${encodeURIComponent(IMAGE_PROMPTS.conclusion + ', ultra detailed 8K')}?width=1920&height=1080&nologo=true&seed=2024999`;

  return (
    <SlideContainer id={id}>
      <BackgroundImage src={imgSrc} brightness={0.2} />
      <GradientOverlay direction="radial" />
      <EmeraldAccent position="top" />
      <EmeraldAccent position="bottom" />

      {/* Title */}
      <Box
        sx={{
          position: 'absolute',
          top: 100,
          left: 0,
          width: SLIDE_WIDTH,
          textAlign: 'center',
        }}
      >
        <Typography
          sx={{
            ...TYPOGRAPHY.h2,
            color: COLORS.emeraldGlow,
            textShadow: '0 4px 30px rgba(0,0,0,0.8)',
          }}
        >
          {title}
        </Typography>
      </Box>

      {/* Checklist */}
      <Box
        sx={{
          position: 'absolute',
          top: 250,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 1000,
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {items.map((item, idx) => (
            <Box
              key={idx}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                px: 4,
                py: 2,
                bgcolor: 'rgba(10,77,60,0.7)',
                borderRadius: 2,
                border: `1px solid ${COLORS.emerald}`,
              }}
            >
              <Typography sx={{ fontSize: 28, color: COLORS.emeraldGlow }}>
                ✓
              </Typography>
              <Typography sx={{ ...TYPOGRAPHY.body, color: COLORS.white }}>
                {item}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* CTA */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 100,
          left: 0,
          width: SLIDE_WIDTH,
          textAlign: 'center',
        }}
      >
        <Typography
          sx={{
            ...TYPOGRAPHY.h4,
            color: COLORS.gold,
            fontStyle: 'italic',
          }}
        >
          Es un negocio perfecto para quien quiere excelencia y resultados
        </Typography>
      </Box>

      <Logo />
    </SlideContainer>
  );
};

// ============================================================================
// EXPORTS
// ============================================================================

export const DynamicBusinessTemplates = {
  DynamicCoverSlide,
  DynamicKeyPointSlide,
  DynamicListSlide,
  DynamicFlowSlide,
  DynamicConclusionSlide,
};

export default DynamicBusinessTemplates;
