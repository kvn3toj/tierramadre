/**
 * TIERRA MADRE - December Masterclass Slides
 * Premium presentation templates with sacred geometry and mystical aesthetics
 */

import React from 'react';
import { Box, Typography } from '@mui/material';
import { colors, typography } from '../../styles/brandTokens';

const SLIDE_WIDTH = 1920;
const SLIDE_HEIGHT = 1080;
const LOGO_PATH = '/logo-tierra-madre.png';

// Common slide container styles
const slideContainer = {
  width: SLIDE_WIDTH,
  height: SLIDE_HEIGHT,
  position: 'relative' as const,
  overflow: 'hidden',
  fontFamily: typography.sans.clean,
};

// ═══════════════════════════════════════════════════════════════
// SLIDE 1: 5 RAZONES - Five Reasons Every Colombian Should Own an Emerald
// ═══════════════════════════════════════════════════════════════

interface FiveReasonsTemplateProps {
  id?: string;
  backgroundImage?: string;
}

// Fixed positions for PDF export compatibility (circular layout around center)
const FIVE_REASONS = [
  {
    number: 1,
    title: 'SÍMBOLO Y LEGADO',
    subtitle: 'Nos representa',
    description: 'Es patrimonio nacional. En esmeraldas, somos los mejores del mundo.',
    icon: '🦁',
    top: 180,
    left: 150,
  },
  {
    number: 2,
    title: 'SANACIÓN Y PROTECCIÓN',
    subtitle: 'Poder ancestral',
    description: 'Nuestros ancestros la usaban para sanar cuerpo y alma.',
    icon: '🛡️',
    top: 180,
    left: 1490,
  },
  {
    number: 3,
    title: 'LUJO Y PODER',
    subtitle: 'Atrae riqueza',
    description: 'Símbolo de prestigio reconocido mundialmente.',
    icon: '👑',
    top: 500,
    left: 80,
  },
  {
    number: 4,
    title: 'ACTIVO DE VALOR',
    subtitle: '+15% anual',
    description: 'Se valoriza constantemente. Reconocida globalmente.',
    icon: '📈',
    top: 500,
    left: 1560,
  },
  {
    number: 5,
    title: 'GEMA PARA MEDITAR',
    subtitle: 'Chakra del corazón',
    description: 'Perfecta para la meditación y conexión espiritual.',
    icon: '💚',
    top: 820,
    left: 820,
  },
];

export const FiveReasonsTemplate: React.FC<FiveReasonsTemplateProps> = ({
  id,
  backgroundImage = 'https://image.pollinations.ai/prompt/single%20large%20colombian%20emerald%20crystal%20glowing%20green%20on%20dark%20elegant%20background%20with%20subtle%20light%20rays%20luxury%20jewelry%20photography%20dramatic%20lighting%208K?width=1920&height=1080&nologo=true&seed=5reasons2024'
}) => {
  return (
    <Box id={id} sx={slideContainer}>
      {/* Background Image */}
      <Box
        component="img"
        src={backgroundImage}
        alt="Emerald background"
        sx={{
          position: 'absolute',
          width: 1920,
          height: 1080,
          objectFit: 'cover',
          filter: 'brightness(0.4)',
        }}
      />

      {/* Gradient Overlay */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 1920,
          height: 1080,
          background: 'radial-gradient(ellipse at center, transparent 20%, rgba(0,20,15,0.9) 70%)',
        }}
      />

      {/* Title */}
      <Box sx={{ position: 'absolute', top: 50, left: 0, width: 1920, textAlign: 'center', zIndex: 10 }}>
        <Typography
          sx={{
            fontSize: 40,
            fontFamily: typography.serif.elegant,
            color: colors.naturalWhite,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            textShadow: '0 2px 20px rgba(0,0,0,0.8)',
          }}
        >
          5 Razones por las cuales todo colombiano
        </Typography>
        <Typography
          sx={{
            fontSize: 40,
            fontFamily: typography.serif.elegant,
            color: colors.emeraldRich,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            textShadow: '0 2px 20px rgba(0,0,0,0.8)',
            marginTop: 8,
          }}
        >
          debería tener una esmeralda
        </Typography>
      </Box>

      {/* Center Emerald Glow Effect */}
      <Box
        sx={{
          position: 'absolute',
          top: 390,
          left: 760,
          width: 400,
          height: 300,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,191,165,0.3) 0%, transparent 70%)',
          filter: 'blur(40px)',
          zIndex: 5,
        }}
      />

      {/* 5 Reason Bubbles - Fixed positions for PDF export */}
      {FIVE_REASONS.map((reason) => (
        <Box
          key={reason.number}
          sx={{
            position: 'absolute',
            top: reason.top,
            left: reason.left,
            width: 280,
            height: 280,
            borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.2)',
            background: 'radial-gradient(circle at 30% 30%, rgba(40,60,50,0.95), rgba(10,30,25,0.98))',
            textAlign: 'center',
            paddingTop: 50,
            zIndex: 10,
            boxShadow: '0 0 40px rgba(0,100,80,0.3)',
          }}
        >
          <Typography sx={{ fontSize: 32, marginBottom: 4 }}>{reason.icon}</Typography>
          <Typography
            sx={{
              fontSize: 13,
              color: 'rgba(255,255,255,0.5)',
              letterSpacing: '0.15em',
              marginBottom: 4,
            }}
          >
            {reason.number}. {reason.subtitle.toUpperCase()}
          </Typography>
          <Typography
            sx={{
              fontSize: 17,
              fontWeight: 700,
              color: colors.naturalWhite,
              letterSpacing: '0.05em',
              marginBottom: 8,
            }}
          >
            {reason.title}
          </Typography>
          <Typography
            sx={{
              fontSize: 12,
              color: 'rgba(255,255,255,0.7)',
              lineHeight: 1.4,
              paddingLeft: 24,
              paddingRight: 24,
            }}
          >
            {reason.description}
          </Typography>
        </Box>
      ))}

      {/* Logo - Bottom Right */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 30,
          right: 50,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <Box
          component="img"
          src={LOGO_PATH}
          alt="Tierra Madre"
          sx={{
            height: 60,
            filter: 'brightness(0) invert(1)',
            opacity: 0.9,
          }}
        />
      </Box>
    </Box>
  );
};

// ═══════════════════════════════════════════════════════════════
// SLIDE 2: NUESTRA ESENCIA - Mystical Cave Scene
// ═══════════════════════════════════════════════════════════════

interface EssenceTemplateProps {
  id?: string;
  backgroundImage?: string;
  title?: string;
  subtitle?: string;
}

export const EssenceTemplate: React.FC<EssenceTemplateProps> = ({
  id,
  backgroundImage = 'https://image.pollinations.ai/prompt/mystical%20underground%20crystal%20cave%20with%20glowing%20green%20emerald%20on%20ancient%20stone%20pedestal%20ethereal%20light%20rays%20fantasy%20atmosphere%20cinematic%20lighting%20blue%20and%20green%20tones%208K%20dramatic?width=1920&height=1080&nologo=true&seed=essence2024',
  title = 'EXPANDIMOS LA ESENCIA Y EL PODER',
  subtitle = 'DE LA ESMERALDA COLOMBIANA',
}) => {
  return (
    <Box id={id} sx={slideContainer}>
      {/* Background Image */}
      <Box
        component="img"
        src={backgroundImage}
        alt="Mystical cave"
        sx={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />

      {/* Subtle Overlay */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.5) 100%)',
        }}
      />

      {/* Title Section - Bottom Left */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 120,
          left: 80,
          zIndex: 10,
        }}
      >
        <Typography
          sx={{
            fontSize: '3rem',
            fontFamily: typography.serif.elegant,
            color: colors.naturalWhite,
            letterSpacing: typography.tracking.wide,
            textTransform: 'uppercase',
            textShadow: '0 4px 30px rgba(0,0,0,0.8)',
            lineHeight: 1.2,
          }}
        >
          {title}
        </Typography>
        <Typography
          sx={{
            fontSize: '3rem',
            fontFamily: typography.serif.elegant,
            color: '#C9A962',
            letterSpacing: typography.tracking.wide,
            textTransform: 'uppercase',
            textShadow: '0 4px 30px rgba(0,0,0,0.8)',
          }}
        >
          {subtitle}
        </Typography>
      </Box>

      {/* Decorative Corner Elements */}
      <Box
        sx={{
          position: 'absolute',
          top: 40,
          left: 40,
          width: 60,
          height: 60,
          borderLeft: '2px solid rgba(255,255,255,0.3)',
          borderTop: '2px solid rgba(255,255,255,0.3)',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          top: 40,
          right: 40,
          width: 60,
          height: 60,
          borderRight: '2px solid rgba(255,255,255,0.3)',
          borderTop: '2px solid rgba(255,255,255,0.3)',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: 40,
          left: 40,
          width: 60,
          height: 60,
          borderLeft: '2px solid rgba(255,255,255,0.3)',
          borderBottom: '2px solid rgba(255,255,255,0.3)',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: 40,
          right: 40,
          width: 60,
          height: 60,
          borderRight: '2px solid rgba(255,255,255,0.3)',
          borderBottom: '2px solid rgba(255,255,255,0.3)',
        }}
      />

      {/* Logo - Bottom Right */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 30,
          right: 50,
          zIndex: 10,
        }}
      >
        <Box
          component="img"
          src={LOGO_PATH}
          alt="Tierra Madre"
          sx={{
            height: 60,
            filter: 'brightness(0) invert(1)',
            opacity: 0.9,
          }}
        />
      </Box>
    </Box>
  );
};

// ═══════════════════════════════════════════════════════════════
// SLIDE 3: RECORRIENDO EL MUNDO - World Tour Map
// ═══════════════════════════════════════════════════════════════

interface WorldTourTemplateProps {
  id?: string;
  backgroundImage?: string;
  title?: string;
}

// Country card positions (fixed pixels for PDF export compatibility)
const COUNTRY_CARDS = [
  { name: 'MÓNACO', flag: '🇲🇨', left: 190 },
  { name: 'FRANCIA', flag: '🇫🇷', left: 410 },
  { name: 'SUIZA', flag: '🇨🇭', left: 630 },
  { name: 'ESPAÑA', flag: '🇪🇸', left: 850 },
  { name: 'DUBAI', flag: '🇦🇪', left: 1070 },
];

export const WorldTourTemplate: React.FC<WorldTourTemplateProps> = ({
  id,
  backgroundImage = 'https://image.pollinations.ai/prompt/elegant%20world%20map%20dark%20background%20with%20golden%20lines%20connecting%20europe%20and%20middle%20east%20to%20south%20america%20colombia%20luxury%20travel%20concept%20emerald%20green%20accents%20professional%20infographic%20style%208K?width=1920&height=1080&nologo=true&seed=worldtour2024',
  title = 'RECORRIENDO EL MUNDO',
}) => {
  return (
    <Box id={id} sx={slideContainer}>
      {/* Background */}
      <Box
        component="img"
        src={backgroundImage}
        alt="World map"
        sx={{
          position: 'absolute',
          width: 1920,
          height: 1080,
          objectFit: 'cover',
          filter: 'brightness(0.6)',
        }}
      />

      {/* Dark Overlay */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 1920,
          height: 1080,
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,15,10,0.8) 100%)',
        }}
      />

      {/* Title */}
      <Box sx={{ position: 'absolute', top: 80, left: 0, width: 1920, textAlign: 'center', zIndex: 10 }}>
        <Typography
          sx={{
            fontSize: 56,
            fontFamily: typography.serif.elegant,
            color: '#C9A962',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            textShadow: '0 4px 30px rgba(0,0,0,0.8)',
          }}
        >
          {title}
        </Typography>
        <Typography
          sx={{
            fontSize: 24,
            color: 'rgba(255,255,255,0.7)',
            marginTop: 16,
            letterSpacing: '0.05em',
          }}
        >
          Validando el valor de la esmeralda colombiana en el mundo
        </Typography>
      </Box>

      {/* Colombia Origin Badge - Fixed position */}
      <Box
        sx={{
          position: 'absolute',
          top: 450,
          left: 760,
          width: 400,
          height: 60,
          borderRadius: 30,
          border: '2px solid rgba(0,191,165,0.5)',
          background: 'rgba(0,50,40,0.9)',
          zIndex: 10,
          textAlign: 'center',
          paddingTop: 12,
        }}
      >
        <Typography
          component="span"
          sx={{
            fontSize: 24,
            marginRight: 16,
          }}
        >
          🇨🇴
        </Typography>
        <Typography
          component="span"
          sx={{
            fontSize: 20,
            fontWeight: 600,
            color: colors.emeraldLight,
            letterSpacing: '0.1em',
          }}
        >
          ORIGEN: COLOMBIA
        </Typography>
      </Box>

      {/* Country Cards - Fixed positions */}
      {COUNTRY_CARDS.map((country) => (
        <Box
          key={country.name}
          sx={{
            position: 'absolute',
            top: 700,
            left: country.left,
            width: 180,
            height: 140,
            borderRadius: 8,
            border: '1px solid rgba(201,169,98,0.4)',
            background: 'linear-gradient(135deg, rgba(20,40,35,0.95), rgba(10,25,20,0.98))',
            textAlign: 'center',
            paddingTop: 30,
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            zIndex: 10,
          }}
        >
          <Typography sx={{ fontSize: 48, marginBottom: 8 }}>{country.flag}</Typography>
          <Typography
            sx={{
              fontSize: 16,
              fontWeight: 600,
              color: colors.naturalWhite,
              letterSpacing: '0.1em',
            }}
          >
            {country.name}
          </Typography>
        </Box>
      ))}

      {/* Decorative Corner Elements */}
      <Box
        sx={{
          position: 'absolute',
          top: 40,
          left: 40,
          width: 60,
          height: 60,
          borderLeft: '2px solid rgba(201,169,98,0.3)',
          borderTop: '2px solid rgba(201,169,98,0.3)',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          top: 40,
          right: 40,
          width: 60,
          height: 60,
          borderRight: '2px solid rgba(201,169,98,0.3)',
          borderTop: '2px solid rgba(201,169,98,0.3)',
        }}
      />

      {/* Logo - Bottom Right */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 30,
          right: 50,
          zIndex: 10,
        }}
      >
        <Box
          component="img"
          src={LOGO_PATH}
          alt="Tierra Madre"
          sx={{
            height: 60,
            filter: 'brightness(0) invert(1)',
            opacity: 0.9,
          }}
        />
      </Box>
    </Box>
  );
};

// ═══════════════════════════════════════════════════════════════
// SLIDE 4: PORTADA / COVER - Brand Introduction
// ═══════════════════════════════════════════════════════════════

interface CoverTemplateProps {
  id?: string;
  backgroundImage?: string;
}

export const DecemberCoverTemplate: React.FC<CoverTemplateProps> = ({
  id,
  backgroundImage = 'https://image.pollinations.ai/prompt/single%20stunning%20colombian%20emerald%20gemstone%20floating%20with%20sparkles%20and%20light%20rays%20on%20pure%20black%20background%20luxury%20jewelry%20photography%20dramatic%20spotlight%20ultra%20detailed%208K?width=1920&height=1080&nologo=true&seed=cover2024',
}) => {
  return (
    <Box id={id} sx={slideContainer}>
      {/* Pure Black Background */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          bgcolor: '#0A0A0A',
        }}
      />

      {/* Background Image - Emerald */}
      <Box
        component="img"
        src={backgroundImage}
        alt="Emerald"
        sx={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />

      {/* Subtle Vignette */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%)',
        }}
      />

      {/* Brand Name */}
      <Box
        sx={{
          position: 'absolute',
          top: '20%',
          left: 0,
          right: 0,
          textAlign: 'center',
          zIndex: 10,
        }}
      >
        <Typography
          sx={{
            fontSize: '5rem',
            fontFamily: typography.serif.elegant,
            color: colors.naturalWhite,
            letterSpacing: '0.3em',
            textShadow: '0 4px 40px rgba(0,0,0,0.8)',
          }}
        >
          Tierra Madre
        </Typography>
      </Box>

      {/* Contact Info */}
      <Box
        sx={{
          position: 'absolute',
          bottom: '15%',
          left: 0,
          right: 0,
          textAlign: 'center',
          zIndex: 10,
        }}
      >
        <Typography
          sx={{
            fontSize: '1.2rem',
            color: 'rgba(255,255,255,0.7)',
            letterSpacing: '0.1em',
            mb: 1,
          }}
        >
          Instagram: @TierraMadre.Co
        </Typography>
        <Typography
          sx={{
            fontSize: '1.2rem',
            color: 'rgba(255,255,255,0.7)',
            letterSpacing: '0.1em',
          }}
        >
          Web: www.TierraMadre.Co
        </Typography>
      </Box>

      {/* Logo - Bottom Right */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 30,
          right: 50,
          zIndex: 10,
        }}
      >
        <Box
          component="img"
          src={LOGO_PATH}
          alt="Tierra Madre"
          sx={{
            height: 60,
            filter: 'brightness(0) invert(1)',
            opacity: 0.9,
          }}
        />
      </Box>
    </Box>
  );
};

export default {
  FiveReasonsTemplate,
  EssenceTemplate,
  WorldTourTemplate,
  DecemberCoverTemplate,
};
