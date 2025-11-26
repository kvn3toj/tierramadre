/**
 * TIERRA MADRE - Luxury Masterclass Templates v2
 * "Lujo Consciente" - Clarity and Truth
 *
 * All templates optimized for:
 * - Fixed 1920x1080px dimensions for PDF export
 * - Absolute positioning (no flexbox issues)
 * - Consistent typography scale
 * - Logo on ALL slides
 * - Only emerald green as vibrant color
 * - High-quality AI image prompts
 */

import React from 'react';
import { Box, Typography } from '@mui/material';

// ============================================================================
// CONSTANTS
// ============================================================================

const SLIDE_WIDTH = 1920;
const SLIDE_HEIGHT = 1080;
const LOGO_PATH = '/logo-tierra-madre.png';

// Brand Guide Color Palette - "Lujo Consciente"
const COLORS = {
  // Primary - Deep Emerald (the ONLY vibrant color)
  emerald: '#0A4D3C',
  emeraldRich: '#1B7A5E',
  emeraldLight: '#2E9B7D',
  // Backgrounds
  pureWhite: '#FFFFFF',
  naturalWhite: '#FDFDFB',
  richBlack: '#0A0A0A',
  darkTeal: '#0D1B1E',
  // Text
  charcoal: '#2C2C2C',
  textMuted: 'rgba(255, 255, 255, 0.7)',
  // Accents (subtle)
  silver: '#C5C5C0',
  silverLight: '#E8E8E8',
};

// Typography Scale - Clear Hierarchy
const TYPOGRAPHY = {
  h1: { fontSize: 96, fontWeight: 700, lineHeight: 1.1 },
  h2: { fontSize: 64, fontWeight: 600, lineHeight: 1.2 },
  h3: { fontSize: 48, fontWeight: 500, lineHeight: 1.3 },
  h4: { fontSize: 36, fontWeight: 500, lineHeight: 1.4 },
  body: { fontSize: 24, fontWeight: 400, lineHeight: 1.6 },
  caption: { fontSize: 18, fontWeight: 400, lineHeight: 1.5 },
};

// Optimized Image URL Generator
const generateImageUrl = (prompt: string, seed: string) => {
  const basePrompt = `${prompt}, professional luxury photography, dramatic cinematic lighting, ultra detailed, 8K quality, sharp focus`;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(basePrompt)}?width=1920&height=1080&nologo=true&seed=${seed}`;
};

// Image prompts for each slide type
const IMAGE_PROMPTS = {
  cover: 'single stunning colombian emerald gemstone floating with sparkles and light rays on pure black background, luxury jewelry photography, dramatic spotlight',
  mission: 'mystical underground crystal cave with glowing green emerald on ancient stone pedestal, ethereal light rays, fantasy atmosphere, blue and green tones',
  worldTour: 'elegant dark world map with golden connection lines between continents, luxury travel concept, emerald green accents on dark background',
  fiveReasons: 'single large colombian emerald crystal glowing green centered on dark elegant background with subtle light rays, luxury jewelry display',
  opportunity: 'christmas gift boxes with emerald jewelry inside, festive luxury atmosphere, dark elegant background with golden bokeh lights',
  expert: 'professional portrait setting with emerald green accent lighting, dark sophisticated background, business luxury environment',
  differentiators: 'macro photography of emerald crystal showing internal gardens and inclusions, scientific documentation style, dramatic lighting',
  celebrities: 'red carpet glamour setting with emerald jewelry display, luxury fashion photography, dramatic spotlight on dark background',
  ethical: 'colombian emerald mine landscape at sunrise, workers silhouettes, misty mountains, documentary photography style',
  collection: 'multiple emerald gemstones arranged on black velvet, museum quality display, dramatic spotlight lighting',
  thankYou: 'single emerald with tropical colombian flowers, gratitude concept, elegant dark background with soft green glow',
};

// ============================================================================
// BASE COMPONENTS
// ============================================================================

const SlideContainer: React.FC<{ id?: string; children: React.ReactNode; bg?: string }> = ({
  id,
  children,
  bg = COLORS.richBlack
}) => (
  <Box
    id={id}
    sx={{
      width: SLIDE_WIDTH,
      height: SLIDE_HEIGHT,
      position: 'relative',
      overflow: 'hidden',
      backgroundColor: bg,
      fontFamily: '"Cormorant Garamond", serif',
    }}
  >
    {children}
  </Box>
);

const BackgroundImage: React.FC<{ src: string; opacity?: number; brightness?: number }> = ({
  src,
  opacity = 1,
  brightness = 1
}) => (
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

const Overlay: React.FC<{ type?: 'vignette' | 'gradient' | 'dark' }> = ({ type = 'vignette' }) => {
  const gradients = {
    vignette: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.7) 100%)',
    gradient: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.6) 100%)',
    dark: 'linear-gradient(135deg, rgba(0,20,15,0.8) 0%, rgba(10,10,10,0.9) 100%)',
  };

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: SLIDE_WIDTH,
        height: SLIDE_HEIGHT,
        background: gradients[type],
      }}
    />
  );
};

const CornerDecoration: React.FC<{ corner: 'tl' | 'tr' | 'bl' | 'br' }> = ({ corner }) => {
  const positions = {
    tl: { top: 40, left: 40, borderTop: '1px solid', borderLeft: '1px solid' },
    tr: { top: 40, right: 40, borderTop: '1px solid', borderRight: '1px solid' },
    bl: { bottom: 40, left: 40, borderBottom: '1px solid', borderLeft: '1px solid' },
    br: { bottom: 40, right: 40, borderBottom: '1px solid', borderRight: '1px solid' },
  };

  return (
    <Box
      sx={{
        position: 'absolute',
        width: 60,
        height: 60,
        borderColor: 'rgba(255,255,255,0.2)',
        ...positions[corner],
      }}
    />
  );
};

const EmeraldAccentBar: React.FC = () => (
  <Box
    sx={{
      position: 'absolute',
      left: 0,
      top: 0,
      width: 4,
      height: SLIDE_HEIGHT,
      backgroundColor: COLORS.emerald,
      boxShadow: `0 0 20px ${COLORS.emerald}60`,
    }}
  />
);

const Logo: React.FC<{ variant?: 'light' | 'dark' }> = ({ variant = 'light' }) => (
  <Box
    sx={{
      position: 'absolute',
      bottom: 40,
      right: 60,
      zIndex: 20,
    }}
  >
    <Box
      component="img"
      src={LOGO_PATH}
      alt="Tierra Madre"
      sx={{
        height: 50,
        filter: variant === 'light' ? 'brightness(0) invert(1)' : 'none',
        opacity: 0.9,
      }}
    />
  </Box>
);

// ============================================================================
// SLIDE 1: COVER - Portada
// ============================================================================

interface CoverProps {
  id?: string;
  title?: string;
  subtitle?: string;
}

export const LuxuryCoverTemplate: React.FC<CoverProps> = ({
  id = 'luxury-cover',
  title = 'TIERRA MADRE',
  subtitle = 'www.tierramadre.co | @tierramadre.co',
}) => (
  <SlideContainer id={id}>
    <BackgroundImage src={generateImageUrl(IMAGE_PROMPTS.cover, 'cover2024')} />
    <Overlay type="vignette" />
    <CornerDecoration corner="tl" />
    <CornerDecoration corner="tr" />
    <CornerDecoration corner="bl" />
    <CornerDecoration corner="br" />

    {/* Title */}
    <Box sx={{ position: 'absolute', top: 220, left: 0, width: SLIDE_WIDTH, textAlign: 'center' }}>
      <Typography
        sx={{
          ...TYPOGRAPHY.h1,
          color: COLORS.pureWhite,
          letterSpacing: '0.15em',
          textShadow: '0 4px 40px rgba(0,0,0,0.8)',
        }}
      >
        {title}
      </Typography>
    </Box>

    {/* Emerald Divider */}
    <Box
      sx={{
        position: 'absolute',
        top: 360,
        left: 760,
        width: 400,
        height: 2,
        background: `linear-gradient(90deg, transparent, ${COLORS.emerald}, transparent)`,
      }}
    />

    {/* Subtitle */}
    <Box sx={{ position: 'absolute', bottom: 180, left: 0, width: SLIDE_WIDTH, textAlign: 'center' }}>
      <Typography
        sx={{
          ...TYPOGRAPHY.body,
          color: COLORS.textMuted,
          letterSpacing: '0.1em',
          fontFamily: '"Montserrat", sans-serif',
        }}
      >
        {subtitle}
      </Typography>
    </Box>

    <Logo />
  </SlideContainer>
);

// ============================================================================
// SLIDE 2: MISSION - Nuestra Esencia
// ============================================================================

interface MissionProps {
  id?: string;
  mission?: string;
}

export const LuxuryMissionTemplate: React.FC<MissionProps> = ({
  id = 'luxury-mission',
  mission = 'Expandimos la esencia y el poder de la esmeralda colombiana',
}) => (
  <SlideContainer id={id}>
    <BackgroundImage src={generateImageUrl(IMAGE_PROMPTS.mission, 'mission2024')} />
    <Overlay type="gradient" />
    <EmeraldAccentBar />
    <CornerDecoration corner="tl" />
    <CornerDecoration corner="tr" />
    <CornerDecoration corner="bl" />
    <CornerDecoration corner="br" />

    {/* Mission Quote */}
    <Box sx={{ position: 'absolute', bottom: 160, left: 100, maxWidth: 1400 }}>
      <Typography
        sx={{
          ...TYPOGRAPHY.h2,
          color: COLORS.pureWhite,
          fontStyle: 'italic',
          textShadow: '0 4px 30px rgba(0,0,0,0.9)',
          lineHeight: 1.3,
        }}
      >
        "{mission}"
      </Typography>
    </Box>

    <Logo />
  </SlideContainer>
);

// ============================================================================
// SLIDE 3: WORLD TOUR - Recorriendo el Mundo
// ============================================================================

interface WorldTourProps {
  id?: string;
  title?: string;
  countries?: Array<{ name: string; flag: string }>;
}

const DEFAULT_COUNTRIES = [
  { name: 'MÓNACO', flag: '🇲🇨' },
  { name: 'FRANCIA', flag: '🇫🇷' },
  { name: 'SUIZA', flag: '🇨🇭' },
  { name: 'ESPAÑA', flag: '🇪🇸' },
  { name: 'DUBAI', flag: '🇦🇪' },
];

export const LuxuryWorldTourTemplate: React.FC<WorldTourProps> = ({
  id = 'luxury-world-tour',
  title = 'RECORRIENDO EL MUNDO',
  countries = DEFAULT_COUNTRIES,
}) => (
  <SlideContainer id={id}>
    <BackgroundImage src={generateImageUrl(IMAGE_PROMPTS.worldTour, 'world2024')} brightness={0.5} />
    <Overlay type="dark" />
    <CornerDecoration corner="tl" />
    <CornerDecoration corner="tr" />

    {/* Title */}
    <Box sx={{ position: 'absolute', top: 100, left: 0, width: SLIDE_WIDTH, textAlign: 'center' }}>
      <Typography
        sx={{
          ...TYPOGRAPHY.h2,
          color: COLORS.emeraldLight,
          letterSpacing: '0.15em',
          textShadow: '0 4px 30px rgba(0,0,0,0.8)',
        }}
      >
        {title}
      </Typography>
      <Typography
        sx={{
          ...TYPOGRAPHY.body,
          color: COLORS.textMuted,
          marginTop: 16,
        }}
      >
        Validando el valor de la esmeralda colombiana en el mundo
      </Typography>
    </Box>

    {/* Colombia Origin Badge */}
    <Box
      sx={{
        position: 'absolute',
        top: 420,
        left: 710,
        width: 500,
        height: 70,
        borderRadius: 35,
        border: `2px solid ${COLORS.emerald}`,
        backgroundColor: 'rgba(10,77,60,0.8)',
        textAlign: 'center',
        paddingTop: 16,
      }}
    >
      <Typography component="span" sx={{ fontSize: 28, marginRight: 16 }}>🇨🇴</Typography>
      <Typography
        component="span"
        sx={{
          fontSize: 22,
          fontWeight: 600,
          color: COLORS.emeraldLight,
          letterSpacing: '0.1em',
        }}
      >
        ORIGEN: COLOMBIA
      </Typography>
    </Box>

    {/* Country Cards - Fixed positions */}
    {countries.map((country, idx) => (
      <Box
        key={country.name}
        sx={{
          position: 'absolute',
          top: 680,
          left: 160 + idx * 330,
          width: 280,
          height: 180,
          borderRadius: 8,
          border: `1px solid ${COLORS.silver}40`,
          backgroundColor: 'rgba(20,40,35,0.95)',
          textAlign: 'center',
          paddingTop: 40,
          boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
        }}
      >
        <Typography sx={{ fontSize: 56, marginBottom: 12 }}>{country.flag}</Typography>
        <Typography
          sx={{
            fontSize: 20,
            fontWeight: 600,
            color: COLORS.pureWhite,
            letterSpacing: '0.1em',
          }}
        >
          {country.name}
        </Typography>
      </Box>
    ))}

    <Logo />
  </SlideContainer>
);

// ============================================================================
// SLIDE 4: FIVE REASONS - 5 Razones
// ============================================================================

interface FiveReasonsProps {
  id?: string;
}

const REASONS = [
  { num: 1, title: 'SÍMBOLO Y LEGADO', desc: 'Patrimonio nacional. En esmeraldas, somos los mejores.', icon: '🦁', top: 200, left: 120 },
  { num: 2, title: 'SANACIÓN Y PROTECCIÓN', desc: 'Nuestros ancestros la usaban para sanar cuerpo y alma.', icon: '🛡️', top: 200, left: 1520 },
  { num: 3, title: 'LUJO Y PODER', desc: 'Símbolo de prestigio reconocido mundialmente.', icon: '👑', top: 500, left: 60 },
  { num: 4, title: 'ACTIVO DE VALOR', desc: 'Se valoriza +15% anual. Reconocida globalmente.', icon: '📈', top: 500, left: 1580 },
  { num: 5, title: 'GEMA PARA MEDITAR', desc: 'Activa el chakra del corazón.', icon: '💚', top: 780, left: 820 },
];

export const LuxuryFiveReasonsTemplate: React.FC<FiveReasonsProps> = ({
  id = 'luxury-five-reasons',
}) => (
  <SlideContainer id={id}>
    <BackgroundImage src={generateImageUrl(IMAGE_PROMPTS.fiveReasons, 'reasons2024')} brightness={0.35} />
    <Overlay type="dark" />

    {/* Title */}
    <Box sx={{ position: 'absolute', top: 50, left: 0, width: SLIDE_WIDTH, textAlign: 'center' }}>
      <Typography
        sx={{
          ...TYPOGRAPHY.h3,
          color: COLORS.pureWhite,
          letterSpacing: '0.08em',
          textShadow: '0 2px 20px rgba(0,0,0,0.8)',
        }}
      >
        5 Razones por las cuales todo colombiano
      </Typography>
      <Typography
        sx={{
          ...TYPOGRAPHY.h3,
          color: COLORS.emeraldLight,
          letterSpacing: '0.08em',
          textShadow: '0 2px 20px rgba(0,0,0,0.8)',
          marginTop: 8,
        }}
      >
        debería tener una esmeralda
      </Typography>
    </Box>

    {/* Reason Bubbles - Fixed positions */}
    {REASONS.map((reason) => (
      <Box
        key={reason.num}
        sx={{
          position: 'absolute',
          top: reason.top,
          left: reason.left,
          width: 280,
          height: 280,
          borderRadius: '50%',
          border: '2px solid rgba(255,255,255,0.15)',
          backgroundColor: 'rgba(20,50,40,0.95)',
          textAlign: 'center',
          paddingTop: 45,
          boxShadow: '0 0 40px rgba(10,77,60,0.4)',
        }}
      >
        <Typography sx={{ fontSize: 36, marginBottom: 8 }}>{reason.icon}</Typography>
        <Typography sx={{ fontSize: 12, color: COLORS.textMuted, letterSpacing: '0.15em', marginBottom: 4 }}>
          {reason.num}. {reason.title.split(' ')[0]}
        </Typography>
        <Typography sx={{ fontSize: 16, fontWeight: 700, color: COLORS.pureWhite, marginBottom: 8 }}>
          {reason.title}
        </Typography>
        <Typography sx={{ fontSize: 12, color: COLORS.textMuted, paddingLeft: 20, paddingRight: 20, lineHeight: 1.4 }}>
          {reason.desc}
        </Typography>
      </Box>
    ))}

    <Logo />
  </SlideContainer>
);

// ============================================================================
// SLIDE 5: OPPORTUNITY - Oportunidad Diciembre
// ============================================================================

interface OpportunityProps {
  id?: string;
  title?: string;
  content?: string;
}

export const LuxuryOpportunityTemplate: React.FC<OpportunityProps> = ({
  id = 'luxury-opportunity',
  title = 'Esmeraldas para Diciembre',
  content = 'Se acerca la época navideña, el momento ideal para capitalizar el poder de la esmeralda colombiana.',
}) => (
  <SlideContainer id={id}>
    <BackgroundImage src={generateImageUrl(IMAGE_PROMPTS.opportunity, 'opportunity2024')} brightness={0.4} />
    <Overlay type="gradient" />
    <EmeraldAccentBar />
    <CornerDecoration corner="tl" />
    <CornerDecoration corner="br" />

    {/* Badge */}
    <Box
      sx={{
        position: 'absolute',
        top: 280,
        left: 100,
        paddingX: 32,
        paddingY: 12,
        backgroundColor: COLORS.emerald,
        borderRadius: 30,
      }}
    >
      <Typography
        sx={{
          fontSize: 18,
          fontWeight: 700,
          color: COLORS.pureWhite,
          letterSpacing: '0.15em',
          fontFamily: '"Montserrat", sans-serif',
        }}
      >
        OPORTUNIDAD ÚNICA
      </Typography>
    </Box>

    {/* Title */}
    <Box sx={{ position: 'absolute', top: 380, left: 100, maxWidth: 1200 }}>
      <Typography
        sx={{
          ...TYPOGRAPHY.h1,
          fontSize: 80,
          color: COLORS.pureWhite,
          textShadow: '0 4px 30px rgba(0,0,0,0.8)',
          lineHeight: 1.1,
        }}
      >
        {title}
      </Typography>
    </Box>

    {/* Content */}
    <Box sx={{ position: 'absolute', top: 550, left: 100, maxWidth: 900 }}>
      <Typography
        sx={{
          ...TYPOGRAPHY.body,
          fontSize: 28,
          color: COLORS.textMuted,
          lineHeight: 1.6,
          fontFamily: '"Montserrat", sans-serif',
        }}
      >
        {content}
      </Typography>
    </Box>

    {/* Emerald accent line */}
    <Box
      sx={{
        position: 'absolute',
        top: 700,
        left: 100,
        width: 400,
        height: 4,
        backgroundColor: COLORS.emerald,
      }}
    />

    <Logo />
  </SlideContainer>
);

// ============================================================================
// SLIDE 6: EXPERT - Presentación Experto
// ============================================================================

interface ExpertProps {
  id?: string;
  name?: string;
  title?: string;
  role?: string;
}

export const LuxuryExpertTemplate: React.FC<ExpertProps> = ({
  id = 'luxury-expert',
  name = 'Mauricio Ruiz',
  title = 'Una Alianza de Confianza',
  role = 'Representante Comercial de la Confederación de Esmeralderos de Colombia',
}) => (
  <SlideContainer id={id}>
    <BackgroundImage src={generateImageUrl(IMAGE_PROMPTS.expert, 'expert2024')} brightness={0.3} />
    <Overlay type="dark" />
    <CornerDecoration corner="tl" />
    <CornerDecoration corner="br" />

    {/* Title */}
    <Box sx={{ position: 'absolute', top: 200, left: 800, maxWidth: 1000 }}>
      <Typography
        sx={{
          ...TYPOGRAPHY.h3,
          color: COLORS.emeraldLight,
          marginBottom: 40,
        }}
      >
        {title}
      </Typography>

      {/* Name Box */}
      <Box
        sx={{
          padding: 40,
          border: `2px solid ${COLORS.emerald}`,
          backgroundColor: 'rgba(10,10,10,0.7)',
          marginBottom: 30,
        }}
      >
        <Typography
          sx={{
            ...TYPOGRAPHY.h2,
            color: COLORS.pureWhite,
            marginBottom: 16,
          }}
        >
          {name}
        </Typography>
        <Typography
          sx={{
            ...TYPOGRAPHY.body,
            color: COLORS.emeraldLight,
            fontFamily: '"Montserrat", sans-serif',
          }}
        >
          {role}
        </Typography>
      </Box>
    </Box>

    <Logo />
  </SlideContainer>
);

// ============================================================================
// SLIDE 7: DIFFERENTIATORS - Por Qué Vale Más
// ============================================================================

interface DifferentiatorsProps {
  id?: string;
  title?: string;
}

const FACTORS = [
  { title: 'Color', desc: 'Verde profundo, saturado y único en el mundo.' },
  { title: 'Brillo', desc: 'Luminosidad excepcional desde el interior.' },
  { title: 'Jardines', desc: 'Firma inimitable que garantiza origen.' },
  { title: 'Geología', desc: 'Formación única, características incomparables.' },
];

export const LuxuryDifferentiatorsTemplate: React.FC<DifferentiatorsProps> = ({
  id = 'luxury-differentiators',
  title = '¿Por Qué una Esmeralda Colombiana Vale Más?',
}) => (
  <SlideContainer id={id}>
    <BackgroundImage src={generateImageUrl(IMAGE_PROMPTS.differentiators, 'diff2024')} brightness={0.2} />
    <Overlay type="dark" />
    <EmeraldAccentBar />
    <CornerDecoration corner="tr" />
    <CornerDecoration corner="bl" />

    {/* Title */}
    <Box sx={{ position: 'absolute', top: 100, left: 0, width: SLIDE_WIDTH, textAlign: 'center' }}>
      <Typography
        sx={{
          ...TYPOGRAPHY.h2,
          color: COLORS.emeraldLight,
          textShadow: '0 4px 30px rgba(0,0,0,0.8)',
        }}
      >
        {title}
      </Typography>
    </Box>

    {/* Factor Cards - 2x2 Grid with fixed positions */}
    {FACTORS.map((factor, idx) => (
      <Box
        key={factor.title}
        sx={{
          position: 'absolute',
          top: 280 + Math.floor(idx / 2) * 320,
          left: 160 + (idx % 2) * 820,
          width: 720,
          height: 260,
          padding: 40,
          backgroundColor: 'rgba(20,40,35,0.9)',
          border: `2px solid ${COLORS.emerald}`,
          borderLeft: `6px solid ${COLORS.emeraldLight}`,
        }}
      >
        <Typography
          sx={{
            ...TYPOGRAPHY.h3,
            color: COLORS.emeraldLight,
            marginBottom: 16,
          }}
        >
          {factor.title}
        </Typography>
        <Typography
          sx={{
            ...TYPOGRAPHY.body,
            color: COLORS.pureWhite,
            lineHeight: 1.5,
          }}
        >
          {factor.desc}
        </Typography>
      </Box>
    ))}

    <Logo />
  </SlideContainer>
);

// ============================================================================
// SLIDE 8: COLLECTION CTA - Colección Fénix
// ============================================================================

interface CollectionProps {
  id?: string;
  title?: string;
}

const PRODUCTS = [
  { name: 'CORAZÓN TIERRA MADRE', specs: '1.85 ct | Corte Corazón', status: 'Disponible' },
  { name: 'AMOR PLATÓNICO', specs: '2.63 ct | Corte Cushion', status: 'Disponible' },
  { name: 'ADÁN Y EVA', specs: '0.95 ct x2 | Corte Cuadrada', status: 'Par Disponible' },
];

export const LuxuryCollectionTemplate: React.FC<CollectionProps> = ({
  id = 'luxury-collection',
  title = 'Tu Oportunidad de Invertir',
}) => (
  <SlideContainer id={id}>
    <BackgroundImage src={generateImageUrl(IMAGE_PROMPTS.collection, 'collection2024')} brightness={0.15} />
    <Overlay type="dark" />
    <CornerDecoration corner="tl" />
    <CornerDecoration corner="tr" />
    <CornerDecoration corner="bl" />
    <CornerDecoration corner="br" />

    {/* Badge */}
    <Box
      sx={{
        position: 'absolute',
        top: 100,
        left: 760,
        paddingX: 40,
        paddingY: 16,
        backgroundColor: COLORS.emerald,
        borderRadius: 30,
      }}
    >
      <Typography
        sx={{
          fontSize: 22,
          fontWeight: 700,
          color: COLORS.pureWhite,
          letterSpacing: '0.15em',
        }}
      >
        COLECCIÓN FÉNIX
      </Typography>
    </Box>

    {/* Title */}
    <Box sx={{ position: 'absolute', top: 200, left: 0, width: SLIDE_WIDTH, textAlign: 'center' }}>
      <Typography
        sx={{
          ...TYPOGRAPHY.h2,
          color: COLORS.pureWhite,
          textShadow: '0 4px 30px rgba(0,0,0,0.8)',
        }}
      >
        {title}
      </Typography>
    </Box>

    {/* Product Cards - Fixed positions */}
    {PRODUCTS.map((product, idx) => (
      <Box
        key={product.name}
        sx={{
          position: 'absolute',
          top: 340,
          left: 160 + idx * 560,
          width: 500,
          height: 400,
          padding: 40,
          backgroundColor: 'rgba(20,40,35,0.95)',
          border: `3px solid ${COLORS.emerald}`,
          textAlign: 'center',
        }}
      >
        <Typography
          sx={{
            ...TYPOGRAPHY.h4,
            color: COLORS.pureWhite,
            marginBottom: 24,
          }}
        >
          {product.name}
        </Typography>
        <Box
          sx={{
            padding: 24,
            backgroundColor: 'rgba(10,77,60,0.3)',
            border: `1px solid ${COLORS.emerald}`,
            marginBottom: 24,
          }}
        >
          <Typography
            sx={{
              ...TYPOGRAPHY.body,
              color: COLORS.emeraldLight,
            }}
          >
            {product.specs}
          </Typography>
        </Box>
        <Typography
          sx={{
            ...TYPOGRAPHY.body,
            fontWeight: 600,
            color: COLORS.emeraldLight,
          }}
        >
          {product.status}
        </Typography>
      </Box>
    ))}

    {/* CTA Button */}
    <Box
      sx={{
        position: 'absolute',
        bottom: 100,
        left: 710,
        paddingX: 60,
        paddingY: 24,
        backgroundColor: COLORS.emerald,
        borderRadius: 50,
      }}
    >
      <Typography
        sx={{
          fontSize: 28,
          fontWeight: 700,
          color: COLORS.pureWhite,
          letterSpacing: '0.1em',
        }}
      >
        CONTACTAR AHORA
      </Typography>
    </Box>

    <Logo />
  </SlideContainer>
);

// ============================================================================
// SLIDE 9: THANK YOU - Cierre
// ============================================================================

interface ThankYouProps {
  id?: string;
  message?: string;
  contact?: string;
}

export const LuxuryThankYouTemplate: React.FC<ThankYouProps> = ({
  id = 'luxury-thank-you',
  message = 'Gracias por tu interés en nuestro legado',
  contact = '@tierramadre.co | www.tierramadre.co',
}) => (
  <SlideContainer id={id}>
    <BackgroundImage src={generateImageUrl(IMAGE_PROMPTS.thankYou, 'thanks2024')} brightness={0.4} />
    <Overlay type="vignette" />
    <CornerDecoration corner="tl" />
    <CornerDecoration corner="tr" />
    <CornerDecoration corner="bl" />
    <CornerDecoration corner="br" />

    {/* Main Message */}
    <Box sx={{ position: 'absolute', top: 350, left: 0, width: SLIDE_WIDTH, textAlign: 'center' }}>
      <Typography
        sx={{
          ...TYPOGRAPHY.h2,
          color: COLORS.pureWhite,
          fontStyle: 'italic',
          textShadow: '0 4px 30px rgba(0,0,0,0.8)',
          marginBottom: 40,
        }}
      >
        {message}
      </Typography>

      {/* Emerald Divider */}
      <Box
        sx={{
          width: 300,
          height: 2,
          backgroundColor: COLORS.emerald,
          margin: '0 auto',
          marginBottom: 40,
        }}
      />

      <Typography
        sx={{
          ...TYPOGRAPHY.body,
          color: COLORS.textMuted,
          letterSpacing: '0.1em',
        }}
      >
        {contact}
      </Typography>
    </Box>

    <Logo />
  </SlideContainer>
);

// ============================================================================
// EXPORTS
// ============================================================================

export const LuxuryMasterclassTemplates = {
  LuxuryCoverTemplate,
  LuxuryMissionTemplate,
  LuxuryWorldTourTemplate,
  LuxuryFiveReasonsTemplate,
  LuxuryOpportunityTemplate,
  LuxuryExpertTemplate,
  LuxuryDifferentiatorsTemplate,
  LuxuryCollectionTemplate,
  LuxuryThankYouTemplate,
};

export default LuxuryMasterclassTemplates;
