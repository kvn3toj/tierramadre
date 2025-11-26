/**
 * MClass Templates - Based on MClass11.pdf Design System
 *
 * Design Patterns:
 * - Split layouts (50/50 photo | content)
 * - Green URL bar at bottom (rounded pill)
 * - Mixed weight typography (light + bold emerald)
 * - High-fashion photography backgrounds
 * - White/light backgrounds for expert and grid slides
 */

import { Box, Typography } from '@mui/material';
import { SLIDE_WIDTH, SLIDE_HEIGHT } from '../slides/Slide2Purpose';

// MClass Color Palette
const MCLASS_COLORS = {
  emeraldPrimary: '#00BFA5',
  emeraldDark: '#0A4D3C',
  black: '#000000',
  white: '#FFFFFF',
  lightGray: '#F5F5F5',
  darkOverlay: 'rgba(0,0,0,0.6)',
};

// ============================================
// LOGO POSITION & SIZE TYPES (Exported for use in SlidePreview)
// ============================================
export type LogoPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'none';

export interface LogoPositionOption {
  id: LogoPosition;
  label: string;
  icon: string;
}

export const LOGO_POSITIONS: LogoPositionOption[] = [
  { id: 'none', label: 'Sin Logo', icon: '⊘' },
  { id: 'top-left', label: 'Arriba Izq', icon: '↖' },
  { id: 'top-right', label: 'Arriba Der', icon: '↗' },
  { id: 'center', label: 'Centro', icon: '◎' },
  { id: 'bottom-left', label: 'Abajo Izq', icon: '↙' },
  { id: 'bottom-right', label: 'Abajo Der', icon: '↘' },
];

export const LOGO_SIZES = [
  { id: 'small', label: 'Pequeño', value: 80 },
  { id: 'medium', label: 'Mediano', value: 120 },
  { id: 'large', label: 'Grande', value: 180 },
  { id: 'xlarge', label: 'Extra Grande', value: 250 },
];

// Shared base styles for all slides
const slideBase = {
  width: SLIDE_WIDTH,
  height: SLIDE_HEIGHT,
  position: 'relative' as const,
  overflow: 'hidden',
  fontFamily: '"Libre Baskerville", serif',
};

// ============================================
// REUSABLE COMPONENTS
// ============================================

// Green URL Bar Component
const URLBar = ({ url = 'www.tierramadre.co' }: { url?: string }) => (
  <Box
    sx={{
      position: 'absolute',
      bottom: 40,
      left: '50%',
      transform: 'translateX(-50%)',
      bgcolor: MCLASS_COLORS.emeraldPrimary,
      borderRadius: '30px',
      px: 4,
      py: 1.5,
      zIndex: 10,
    }}
  >
    <Typography
      sx={{
        color: MCLASS_COLORS.white,
        fontSize: 20,
        fontFamily: '"Inter", sans-serif',
        fontWeight: 500,
        letterSpacing: 1,
      }}
    >
      {url}
    </Typography>
  </Box>
);

// Get logo position styles
const getLogoPositionStyles = (position: LogoPosition) => {
  const baseStyles = {
    position: 'absolute' as const,
    zIndex: 20,
  };

  switch (position) {
    case 'top-left':
      return { ...baseStyles, top: 60, left: 80 };
    case 'top-right':
      return { ...baseStyles, top: 60, right: 80 };
    case 'bottom-left':
      return { ...baseStyles, bottom: 120, left: 80 };
    case 'bottom-right':
      return { ...baseStyles, bottom: 120, right: 80 };
    case 'center':
      return { ...baseStyles, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    default:
      return baseStyles;
  }
};

// Logo Component (White version for dark backgrounds)
const LogoWhite = ({ size = 120, position = 'top-left' as LogoPosition }: { size?: number; position?: LogoPosition }) => {
  if (position === 'none') return null;

  return (
    <Box sx={getLogoPositionStyles(position)}>
      <Box
        component="img"
        src="/logo-white.png"
        alt="Tierra Madre"
        sx={{
          width: size,
          height: 'auto',
          objectFit: 'contain',
        }}
        onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
          e.currentTarget.style.display = 'none';
        }}
      />
    </Box>
  );
};

// Logo Component (Green/Sepia version for light backgrounds)
const LogoGreen = ({ size = 120, position = 'top-left' as LogoPosition }: { size?: number; position?: LogoPosition }) => {
  if (position === 'none') return null;

  return (
    <Box sx={getLogoPositionStyles(position)}>
      <Box
        component="img"
        src="/logo.png"
        alt="Tierra Madre"
        sx={{
          width: size,
          height: 'auto',
          objectFit: 'contain',
        }}
        onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
          e.currentTarget.style.display = 'none';
        }}
      />
    </Box>
  );
};

// Large Quotation Mark
const QuotationMark = ({ position }: { position: 'open' | 'close' }) => (
  <Typography
    sx={{
      fontSize: 200,
      fontFamily: 'Georgia, serif',
      color: MCLASS_COLORS.emeraldPrimary,
      lineHeight: 0.8,
      opacity: 0.9,
    }}
  >
    {position === 'open' ? '"' : '"'}
  </Typography>
);

// ============================================
// SLIDE PROPS WITH LOGO SETTINGS
// ============================================
interface SlideProps {
  id?: string;
  logoPosition?: LogoPosition;
  logoSize?: number;
}

export const MClassCoverTemplate = ({ id, logoPosition = 'top-right', logoSize = 150 }: SlideProps) => (
  <Box id={id} sx={{ ...slideBase, bgcolor: MCLASS_COLORS.black }}>
    {/* Full-bleed background image */}
    <Box
      component="img"
      
      src="https://pollinations.ai/p/stunning%20latina%20supermodel%20wearing%20elegant%20colombian%20emerald%20necklace%20and%20earrings%20closeup%20portrait%20vogue%20magazine%20cover%20style%20professional%20studio%20lighting%20dark%20background%208k%20ultra%20detailed%20sharp%20focus?seed=mclass101&width=2560&height=1440&nologo=true"
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
      }}
    />

    {/* Dark gradient overlay */}
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'linear-gradient(to right, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.5) 100%)',
      }}
    />

    {/* Logo */}
    <LogoWhite size={logoSize} position={logoPosition} />

    {/* Title */}
    <Box sx={{ position: 'absolute', top: 400, left: 120 }}>
      <Typography
        sx={{
          fontSize: 72,
          fontWeight: 300,
          color: MCLASS_COLORS.white,
          letterSpacing: 4,
          textTransform: 'uppercase',
        }}
      >
        El Poder de la
      </Typography>
      <Typography
        sx={{
          fontSize: 96,
          fontWeight: 700,
          color: MCLASS_COLORS.emeraldPrimary,
          letterSpacing: 2,
          mt: -1,
        }}
      >
        Esmeralda Colombiana
      </Typography>
    </Box>

    {/* URL Bar */}
    <URLBar />
  </Box>
);

// ============================================
// SLIDE 2: QUOTE - Split layout with quotation marks
// ============================================
export const MClassQuoteTemplate = ({ id, logoPosition = 'bottom-right', logoSize = 100 }: SlideProps) => (
  <Box id={id} sx={{ ...slideBase, display: 'flex' }}>
    {/* Left side - Photo */}
    <Box sx={{ width: '50%', height: '100%', position: 'relative' }}>
      <Box
        component="img"
        
        src="https://pollinations.ai/p/raw%20colombian%20emerald%20rough%20stone%20resting%20on%20dark%20velvet%20fabric%20natural%20green%20crystal%20formation%20dramatic%20spotlight%20luxury%20jewelry%20photography%20macro%20detail%208k?seed=mclass102&width=1280&height=1440&nologo=true"
        sx={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
    </Box>

    {/* Logo on the right white side */}
    <LogoGreen size={logoSize} position={logoPosition} />

    {/* Right side - Quote */}
    <Box
      sx={{
        width: '50%',
        height: '100%',
        bgcolor: MCLASS_COLORS.white,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        px: 8,
        position: 'relative',
      }}
    >
      {/* Opening quote mark */}
      <Box sx={{ position: 'absolute', top: 200, left: 60 }}>
        <QuotationMark position="open" />
      </Box>

      {/* Quote text */}
      <Box sx={{ position: 'absolute', top: 380, left: 100, right: 80 }}>
        <Typography
          sx={{
            fontSize: 36,
            fontStyle: 'italic',
            fontFamily: '"Libre Baskerville", serif',
            color: MCLASS_COLORS.black,
            lineHeight: 1.6,
          }}
        >
          Las esmeraldas colombianas son más que piedras preciosas;
          son fragmentos de la{' '}
          <Box component="span" sx={{ color: MCLASS_COLORS.emeraldPrimary, fontWeight: 700 }}>
            historia de la tierra
          </Box>
          , formadas durante millones de años en las profundidades de los Andes.
        </Typography>
      </Box>

      {/* Closing quote mark */}
      <Box sx={{ position: 'absolute', bottom: 280, right: 60 }}>
        <QuotationMark position="close" />
      </Box>

      {/* Attribution */}
      <Box sx={{ position: 'absolute', bottom: 180, left: 100 }}>
        <Typography
          sx={{
            fontSize: 20,
            color: MCLASS_COLORS.emeraldDark,
            fontWeight: 600,
          }}
        >
          — Tierra Madre
        </Typography>
      </Box>
    </Box>
  </Box>
);

// ============================================
// SLIDE 3: MISSION - Full-bleed with mixed typography
// ============================================
export const MClassMissionTemplate = ({ id, logoPosition = 'top-left', logoSize = 120 }: SlideProps) => (
  <Box id={id} sx={{ ...slideBase, bgcolor: MCLASS_COLORS.black }}>
    {/* Full-bleed emerald photo */}
    <Box
      component="img"
      
      src="https://pollinations.ai/p/macro%20photography%20colombian%20emerald%20gemstone%20crystal%20green%20glowing%20light%20from%20within%20dark%20velvet%20background%20luxury%20jewelry%20product%20shot?seed=mclass003&width=1920&height=1080&nologo=true"
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
      }}
    />

    {/* Dark overlay */}
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 100%)',
      }}
    />

    {/* Logo */}
    <LogoWhite size={logoSize} position={logoPosition} />

    {/* Content */}
    <Box sx={{ position: 'absolute', top: 350, left: 120, right: 120 }}>
      <Typography
        sx={{
          fontSize: 28,
          color: MCLASS_COLORS.emeraldPrimary,
          letterSpacing: 6,
          textTransform: 'uppercase',
          mb: 3,
        }}
      >
        Nuestra Misión
      </Typography>
      <Typography
        sx={{
          fontSize: 56,
          fontWeight: 300,
          color: MCLASS_COLORS.white,
          lineHeight: 1.4,
        }}
      >
        Compartir la{' '}
        <Box component="span" sx={{ fontWeight: 700, color: MCLASS_COLORS.emeraldPrimary }}>
          esencia y poder
        </Box>
        {' '}de las esmeraldas colombianas con el mundo, honrando su origen y tradición minera.
      </Typography>
    </Box>

    {/* URL Bar */}
    <URLBar />
  </Box>
);

// ============================================
// SLIDE 4: FIVE REASONS - Elegant pentagon circles with SVG icons
// ============================================

// Elegant SVG Icons for each reason
const ReasonIcon = ({ type }: { type: string }) => {
  const iconColor = 'rgba(255,255,255,0.9)';

  switch (type) {
    case 'shield': // Símbolo Nacional
      return (
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L4 6V12C4 16.5 7.5 20.5 12 22C16.5 20.5 20 16.5 20 12V6L12 2Z"
                stroke={iconColor} strokeWidth="1.5" fill="rgba(0,191,165,0.15)"/>
          <path d="M12 8V12M12 16H12.01" stroke={iconColor} strokeWidth="2" strokeLinecap="round"/>
        </svg>
      );
    case 'heart': // Sanación Ancestral
      return (
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
          <path d="M12 21C12 21 4 14 4 8.5C4 5.5 6.5 3 9.5 3C11 3 12.2 3.8 12 5C11.8 3.8 13 3 14.5 3C17.5 3 20 5.5 20 8.5C20 14 12 21 12 21Z"
                stroke={iconColor} strokeWidth="1.5" fill="rgba(0,191,165,0.15)"/>
          <path d="M12 7V13M9 10H15" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      );
    case 'crown': // Lujo y Prestigio
      return (
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
          <path d="M3 18H21V20H3V18Z" fill="rgba(0,191,165,0.2)"/>
          <path d="M12 4L15 10L21 8L18 16H6L3 8L9 10L12 4Z"
                stroke={iconColor} strokeWidth="1.5" fill="rgba(0,191,165,0.15)"/>
          <circle cx="12" cy="6" r="1.5" fill={iconColor}/>
        </svg>
      );
    case 'chart': // Inversión Segura
      return (
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
          <path d="M4 4V20H20" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M7 14L11 10L14 13L19 8" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M16 8H19V11" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case 'chakra': // Conexión Interior
      return (
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke={iconColor} strokeWidth="1" fill="rgba(0,191,165,0.1)"/>
          <circle cx="12" cy="12" r="5" stroke={iconColor} strokeWidth="1.5" fill="rgba(0,191,165,0.15)"/>
          <circle cx="12" cy="12" r="2" fill={iconColor}/>
          <path d="M12 3V7M12 17V21M3 12H7M17 12H21" stroke={iconColor} strokeWidth="1" strokeLinecap="round"/>
        </svg>
      );
    default:
      return null;
  }
};

const FIVE_REASONS = [
  { icon: 'shield', number: '1', title: 'Símbolo y Legado', desc: 'Patrimonio nacional. Somos los mejores.' },
  { icon: 'heart', number: '2', title: 'Sanación y Protección', desc: 'Usada por ancestros para sanar cuerpo y alma.' },
  { icon: 'crown', number: '3', title: 'Lujo y Poder', desc: 'Atrae riqueza y prestigio.' },
  { icon: 'chart', number: '4', title: 'Activo de Valor', desc: 'Se valoriza +15% anual. Valorada globalmente.' },
  { icon: 'chakra', number: '5', title: 'Gema de Valor', desc: 'Activa el Chakra del Corazón.' },
];

export const MClassFiveReasonsTemplate = ({ id, logoPosition = 'top-left', logoSize = 120 }: SlideProps) => (
  <Box id={id} sx={{ ...slideBase, bgcolor: '#0a1210' }}>
    {/* Subtle radial gradient background */}
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'radial-gradient(ellipse at center, rgba(0,80,60,0.3) 0%, rgba(10,18,16,1) 70%)',
      }}
    />

    {/* Logo */}
    <LogoWhite size={logoSize} position={logoPosition} />

    {/* Title at top center */}
    <Box sx={{ position: 'absolute', top: 50, left: 0, right: 0, textAlign: 'center', zIndex: 15 }}>
      <Typography
        sx={{
          fontSize: 36,
          fontWeight: 400,
          color: MCLASS_COLORS.white,
          letterSpacing: 3,
          textTransform: 'uppercase',
          lineHeight: 1.4,
        }}
      >
        5 Razones por las cuales
      </Typography>
      <Typography
        sx={{
          fontSize: 36,
          fontWeight: 400,
          color: MCLASS_COLORS.white,
          letterSpacing: 3,
          textTransform: 'uppercase',
        }}
      >
        todo colombiano debería tener
      </Typography>
      <Typography
        sx={{
          fontSize: 36,
          fontWeight: 400,
          color: MCLASS_COLORS.white,
          letterSpacing: 3,
          textTransform: 'uppercase',
        }}
      >
        una{' '}
        <Box component="span" sx={{ color: MCLASS_COLORS.emeraldPrimary, fontWeight: 600 }}>
          Esmeralda
        </Box>
      </Typography>
    </Box>

    {/* Central emerald with glow - blend mode to remove background */}
    <Box
      sx={{
        position: 'absolute',
        top: '52%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 5,
      }}
    >
      {/* Glow effect */}
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 350,
          height: 350,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,191,165,0.5) 0%, rgba(0,191,165,0.2) 40%, transparent 70%)',
          filter: 'blur(30px)',
        }}
      />
      <Box
        component="img"
        src="https://pollinations.ai/p/single%20colombian%20emerald%20octagon%20cut%20gemstone%20brilliant%20green%20on%20pure%20black%20background%20centered%20glowing%20product%20photography%208k?seed=mclass505&width=400&height=400&nologo=true"
        sx={{
          position: 'relative',
          width: 200,
          height: 200,
          objectFit: 'contain',
          filter: 'drop-shadow(0 0 40px rgba(0, 191, 165, 0.6))',
          mixBlendMode: 'lighten',
        }}
      />
    </Box>

    {/* Pentagon circles with icons - moved down to avoid title overlap */}
    {FIVE_REASONS.map((reason, idx) => {
      // Pentagon positions around center - adjusted centerY to move layout down
      const pentagonAngles = [-90, -18, 54, 126, 198];
      const angle = (pentagonAngles[idx] * Math.PI) / 180;
      const radius = 270;
      const centerX = 960;
      const centerY = 560; // Moved down from 520
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);

      return (
        <Box
          key={idx}
          sx={{
            position: 'absolute',
            left: x - 95,
            top: y - 95,
            width: 190,
            height: 190,
            borderRadius: '50%',
            border: '1.5px solid rgba(255, 255, 255, 0.25)',
            background: 'radial-gradient(circle at center, rgba(0, 60, 45, 0.6) 0%, rgba(10, 18, 16, 0.9) 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            p: 2,
            zIndex: 10,
          }}
        >
          {/* Icon */}
          <Box sx={{ mb: 1 }}>
            <ReasonIcon type={reason.icon} />
          </Box>

          {/* Number and Title */}
          <Typography
            sx={{
              fontSize: 13,
              fontWeight: 600,
              color: MCLASS_COLORS.white,
              textAlign: 'center',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              mb: 0.5,
            }}
          >
            {reason.number}. {reason.title}
          </Typography>

          {/* Description */}
          <Typography
            sx={{
              fontSize: 10,
              color: 'rgba(255,255,255,0.7)',
              textAlign: 'center',
              lineHeight: 1.3,
              px: 1,
            }}
          >
            {reason.desc}
          </Typography>
        </Box>
      );
    })}

    {/* Connecting lines from emerald to circles */}
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 2,
      }}
    >
      {FIVE_REASONS.map((_, idx) => {
        const pentagonAngles = [-90, -18, 54, 126, 198];
        const angle = (pentagonAngles[idx] * Math.PI) / 180;
        const innerRadius = 115;
        const outerRadius = 175;
        const centerX = 960;
        const centerY = 560; // Match the new center position
        const x1 = centerX + innerRadius * Math.cos(angle);
        const y1 = centerY + innerRadius * Math.sin(angle);
        const x2 = centerX + outerRadius * Math.cos(angle);
        const y2 = centerY + outerRadius * Math.sin(angle);

        return (
          <line
            key={idx}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="rgba(255, 255, 255, 0.2)"
            strokeWidth="1"
          />
        );
      })}
    </svg>

    {/* URL Bar */}
    <URLBar />
  </Box>
);

// ============================================
// SLIDE 5: EXPERT - White background, clean design
// ============================================
export const MClassExpertTemplate = ({ id, logoPosition = 'center', logoSize = 180 }: SlideProps) => (
  <Box id={id} sx={{ ...slideBase, bgcolor: MCLASS_COLORS.white }}>
    {/* Logo */}
    {logoPosition === 'center' ? (
      <Box sx={{ position: 'absolute', top: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 20 }}>
        <Box
          component="img"
          src="/logo.png"
          alt="Tierra Madre"
          sx={{ width: logoSize, height: 'auto', objectFit: 'contain' }}
        />
      </Box>
    ) : (
      <LogoGreen size={logoSize} position={logoPosition} />
    )}

    {/* Title */}
    <Box sx={{ position: 'absolute', top: 300, left: 0, right: 0, textAlign: 'center' }}>
      <Typography
        sx={{
          fontSize: 28,
          color: '#666',
          letterSpacing: 4,
          textTransform: 'uppercase',
          mb: 3,
        }}
      >
        Conoce a Nuestro Experto
      </Typography>
    </Box>

    {/* Expert photo */}
    <Box
      sx={{
        position: 'absolute',
        top: 380,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 280,
        height: 280,
        borderRadius: '50%',
        overflow: 'hidden',
        border: `4px solid ${MCLASS_COLORS.emeraldPrimary}`,
      }}
    >
      <Box
        component="img"
        
        src="https://pollinations.ai/p/professional%20colombian%20gemologist%20man%20portrait%20jewelry%20expert%20holding%20emerald%20loupe%20clean%20background%20business%20headshot?seed=mclass006&width=400&height=400&nologo=true"
        sx={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
    </Box>

    {/* Expert name */}
    <Box sx={{ position: 'absolute', top: 700, left: 0, right: 0, textAlign: 'center' }}>
      <Typography
        sx={{
          fontSize: 48,
          fontWeight: 700,
          color: MCLASS_COLORS.emeraldDark,
        }}
      >
        Mauricio Ruíz
      </Typography>
      <Typography
        sx={{
          fontSize: 24,
          color: '#666',
          mt: 1,
        }}
      >
        Representante del gremio esmeraldero de Colombia
      </Typography>
    </Box>

    {/* Credentials */}
    <Box sx={{ position: 'absolute', bottom: 180, left: 0, right: 0, textAlign: 'center' }}>
      <Typography
        sx={{
          fontSize: 18,
          color: MCLASS_COLORS.emeraldPrimary,
          fontWeight: 600,
        }}
      >
        Líder de la industria esmeraldera en Boyacá
      </Typography>
    </Box>

    {/* URL Bar */}
    <URLBar />
  </Box>
);

// ============================================
// SLIDE 6: ORIGINS - Grid of emerald sources
// ============================================
const ORIGINS = [
  { country: 'Colombia', quality: 'Premium', color: 'Verde intenso', image: 'colombian%20emerald%20muzo%20mine%20deep%20green' },
  { country: 'Zambia', quality: 'Alta', color: 'Verde azulado', image: 'zambian%20emerald%20green%20blue%20tint' },
  { country: 'Brasil', quality: 'Media-Alta', color: 'Verde claro', image: 'brazilian%20emerald%20light%20green' },
  { country: 'Afganistán', quality: 'Variable', color: 'Verde intenso', image: 'afghan%20emerald%20panjshir%20green' },
];

export const MClassOriginsTemplate = ({ id, logoPosition = 'top-left', logoSize = 100 }: SlideProps) => (
  <Box id={id} sx={{ ...slideBase, bgcolor: MCLASS_COLORS.lightGray }}>
    {/* Logo */}
    <LogoGreen size={logoSize} position={logoPosition} />

    {/* Title */}
    <Box sx={{ position: 'absolute', top: 60, left: 0, right: 0, textAlign: 'center' }}>
      <Typography
        sx={{
          fontSize: 48,
          fontWeight: 300,
          color: MCLASS_COLORS.black,
        }}
      >
        Orígenes de las{' '}
        <Box component="span" sx={{ fontWeight: 700, color: MCLASS_COLORS.emeraldPrimary }}>
          Esmeraldas
        </Box>
      </Typography>
      <Typography
        sx={{
          fontSize: 20,
          color: '#666',
          mt: 1,
        }}
      >
        Comparativa mundial de fuentes y calidades
      </Typography>
    </Box>

    {/* Grid of origins */}
    <Box
      sx={{
        position: 'absolute',
        top: 200,
        left: 80,
        right: 80,
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 4,
      }}
    >
      {ORIGINS.map((origin, idx) => (
        <Box
          key={idx}
          sx={{
            bgcolor: MCLASS_COLORS.white,
            borderRadius: 2,
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          }}
        >
          <Box
            component="img"
            
            src={`https://pollinations.ai/p/${origin.image}%20gemstone%20raw%20crystal%20macro%20photography?seed=mclass0${7 + idx}&width=400&height=300&nologo=true`}
            sx={{
              width: '100%',
              height: 200,
              objectFit: 'cover',
            }}
          />
          <Box sx={{ p: 3 }}>
            <Typography
              sx={{
                fontSize: 24,
                fontWeight: 700,
                color: origin.country === 'Colombia' ? MCLASS_COLORS.emeraldPrimary : MCLASS_COLORS.black,
              }}
            >
              {origin.country}
            </Typography>
            <Typography sx={{ fontSize: 14, color: '#666', mt: 1 }}>
              Calidad: <strong>{origin.quality}</strong>
            </Typography>
            <Typography sx={{ fontSize: 14, color: '#666' }}>
              Color: {origin.color}
            </Typography>
            {origin.country === 'Colombia' && (
              <Box
                sx={{
                  mt: 2,
                  bgcolor: MCLASS_COLORS.emeraldPrimary,
                  color: MCLASS_COLORS.white,
                  px: 2,
                  py: 0.5,
                  borderRadius: 1,
                  fontSize: 12,
                  fontWeight: 600,
                  display: 'inline-block',
                }}
              >
                #1 MUNDIAL
              </Box>
            )}
          </Box>
        </Box>
      ))}
    </Box>

    {/* Bottom note */}
    <Box sx={{ position: 'absolute', bottom: 60, left: 80, right: 80 }}>
      <Typography
        sx={{
          fontSize: 16,
          color: '#666',
          textAlign: 'center',
          fontStyle: 'italic',
        }}
      >
        Las esmeraldas colombianas son reconocidas mundialmente por su color verde intenso
        y claridad excepcional, especialmente las de las minas de Muzo, Chivor y Coscuez.
      </Typography>
    </Box>
  </Box>
);

// ============================================
// SLIDE 7: QUALITY - Scientific/GIA style
// ============================================
export const MClassQualityTemplate = ({ id, logoPosition = 'top-left', logoSize = 100 }: SlideProps) => (
  <Box id={id} sx={{ ...slideBase, display: 'flex' }}>
    {/* Logo */}
    <LogoGreen size={logoSize} position={logoPosition} />

    {/* Left side - GIA branding and info */}
    <Box
      sx={{
        width: '50%',
        height: '100%',
        bgcolor: MCLASS_COLORS.white,
        p: 8,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <Typography
        sx={{
          fontSize: 24,
          color: '#666',
          letterSpacing: 4,
          textTransform: 'uppercase',
          mb: 4,
        }}
      >
        Certificación de Calidad
      </Typography>

      <Typography
        sx={{
          fontSize: 48,
          fontWeight: 300,
          color: MCLASS_COLORS.black,
          lineHeight: 1.3,
          mb: 4,
        }}
      >
        Todas nuestras esmeraldas cuentan con{' '}
        <Box component="span" sx={{ fontWeight: 700, color: MCLASS_COLORS.emeraldPrimary }}>
          certificación GIA
        </Box>
      </Typography>

      <Box sx={{ mb: 4 }}>
        {['Color', 'Claridad', 'Corte', 'Quilates'].map((criterion, idx) => (
          <Box key={idx} sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                bgcolor: MCLASS_COLORS.emeraldPrimary,
                color: MCLASS_COLORS.white,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                mr: 2,
              }}
            >
              {idx + 1}
            </Box>
            <Typography sx={{ fontSize: 24, color: MCLASS_COLORS.black }}>{criterion}</Typography>
          </Box>
        ))}
      </Box>

      <Typography sx={{ fontSize: 16, color: '#666', fontStyle: 'italic' }}>
        GIA (Gemological Institute of America) es el estándar mundial
        en certificación de gemas preciosas.
      </Typography>
    </Box>

    {/* Right side - Emerald close-up */}
    <Box sx={{ width: '50%', height: '100%', position: 'relative' }}>
      <Box
        component="img"
        
        src="https://pollinations.ai/p/macro%20photography%20colombian%20emerald%20being%20examined%20with%20loupe%20gemologist%20tools%20scientific%20lighting%20professional%20grading?seed=mclass011&width=960&height=1080&nologo=true"
        sx={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
    </Box>
  </Box>
);

// ============================================
// SLIDE 8: OPPORTUNITY - Split with CTA
// ============================================
export const MClassOpportunityTemplate = ({ id, logoPosition = 'top-right', logoSize = 100 }: SlideProps) => (
  <Box id={id} sx={{ ...slideBase, display: 'flex' }}>
    {/* Logo */}
    <LogoGreen size={logoSize} position={logoPosition} />

    {/* Left side - Scattered emeralds photo */}
    <Box sx={{ width: '50%', height: '100%', position: 'relative' }}>
      <Box
        component="img"
        
        src="https://pollinations.ai/p/scattered%20colombian%20emeralds%20various%20cuts%20sizes%20on%20black%20velvet%20luxury%20jewelry%20product%20photography%20dramatic%20lighting?seed=mclass012&width=960&height=1080&nologo=true"
        sx={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
    </Box>

    {/* Right side - Content with CTA */}
    <Box
      sx={{
        width: '50%',
        height: '100%',
        bgcolor: MCLASS_COLORS.white,
        p: 8,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        position: 'relative',
      }}
    >

      <Typography
        sx={{
          fontSize: 24,
          color: MCLASS_COLORS.emeraldPrimary,
          letterSpacing: 4,
          textTransform: 'uppercase',
          mb: 3,
        }}
      >
        Oportunidad Única
      </Typography>

      <Typography
        sx={{
          fontSize: 48,
          fontWeight: 300,
          color: MCLASS_COLORS.black,
          lineHeight: 1.3,
          mb: 4,
        }}
      >
        Invierte en{' '}
        <Box component="span" sx={{ fontWeight: 700, color: MCLASS_COLORS.emeraldPrimary }}>
          esmeraldas colombianas
        </Box>
        {' '}y asegura tu patrimonio
      </Typography>

      <Box component="ul" sx={{ mb: 4, pl: 3 }}>
        {[
          'Valorización promedio del 15% anual',
          'Activo tangible de refugio',
          'Herencia para generaciones',
          'Belleza y valor en una gema',
        ].map((item, idx) => (
          <Typography
            key={idx}
            component="li"
            sx={{
              fontSize: 20,
              color: '#333',
              mb: 1.5,
              '&::marker': { color: MCLASS_COLORS.emeraldPrimary },
            }}
          >
            {item}
          </Typography>
        ))}
      </Box>

      {/* CTA Button */}
      <Box
        sx={{
          bgcolor: MCLASS_COLORS.emeraldPrimary,
          color: MCLASS_COLORS.white,
          py: 2,
          px: 4,
          borderRadius: 2,
          display: 'inline-block',
          alignSelf: 'flex-start',
        }}
      >
        <Typography sx={{ fontSize: 20, fontWeight: 600 }}>
          Agenda tu Consulta Gratuita
        </Typography>
      </Box>
    </Box>
  </Box>
);

// ============================================
// SLIDE 9: COLLECTION - Fenix Collection showcase
// ============================================
const COLLECTION_PIECES = [
  { name: 'Esperanza', type: 'Anillo', carat: '2.5 ct', price: '$8,500' },
  { name: 'Renacimiento', type: 'Collar', carat: '4.2 ct', price: '$15,000' },
  { name: 'Aurora', type: 'Aretes', carat: '1.8 ct c/u', price: '$12,000' },
];

export const MClassCollectionTemplate = ({ id, logoPosition = 'top-left', logoSize = 100 }: SlideProps) => (
  <Box id={id} sx={{ ...slideBase, bgcolor: '#0D1B16' }}>
    {/* Logo */}
    <LogoWhite size={logoSize} position={logoPosition} />

    {/* Title */}
    <Box sx={{ position: 'absolute', top: 60, left: 0, right: 0, textAlign: 'center' }}>
      <Typography
        sx={{
          fontSize: 24,
          color: MCLASS_COLORS.emeraldPrimary,
          letterSpacing: 6,
          textTransform: 'uppercase',
        }}
      >
        Colección Exclusiva
      </Typography>
      <Typography
        sx={{
          fontSize: 64,
          fontWeight: 300,
          color: MCLASS_COLORS.white,
          mt: 1,
        }}
      >
        Colección{' '}
        <Box component="span" sx={{ fontWeight: 700, color: MCLASS_COLORS.emeraldPrimary }}>
          Fénix
        </Box>
      </Typography>
    </Box>

    {/* Collection pieces grid */}
    <Box
      sx={{
        position: 'absolute',
        top: 280,
        left: 80,
        right: 80,
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 4,
      }}
    >
      {COLLECTION_PIECES.map((piece, idx) => (
        <Box
          key={idx}
          sx={{
            bgcolor: 'rgba(255,255,255,0.05)',
            borderRadius: 2,
            overflow: 'hidden',
            border: `1px solid ${MCLASS_COLORS.emeraldPrimary}`,
          }}
        >
          <Box
            component="img"
            
            src={`https://pollinations.ai/p/luxury%20colombian%20emerald%20${piece.type.toLowerCase()}%20jewelry%20gold%20setting%20dark%20background%20product%20photography?seed=mclass0${13 + idx}&width=550&height=400&nologo=true`}
            sx={{
              width: '100%',
              height: 320,
              objectFit: 'cover',
            }}
          />
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography
              sx={{
                fontSize: 28,
                fontWeight: 700,
                color: MCLASS_COLORS.emeraldPrimary,
              }}
            >
              {piece.name}
            </Typography>
            <Typography sx={{ fontSize: 18, color: MCLASS_COLORS.white, mt: 1 }}>
              {piece.type} | {piece.carat}
            </Typography>
            <Typography
              sx={{
                fontSize: 24,
                fontWeight: 600,
                color: '#C9A962',
                mt: 2,
              }}
            >
              {piece.price}
            </Typography>
          </Box>
        </Box>
      ))}
    </Box>

    {/* Bottom tagline */}
    <Box sx={{ position: 'absolute', bottom: 120, left: 0, right: 0, textAlign: 'center' }}>
      <Typography
        sx={{
          fontSize: 20,
          color: 'rgba(255,255,255,0.7)',
          fontStyle: 'italic',
        }}
      >
        "Cada pieza cuenta una historia de millones de años"
      </Typography>
    </Box>

    {/* URL Bar */}
    <URLBar />
  </Box>
);

// ============================================
// SLIDE 10: CLOSING - Full-bleed with logo
// ============================================
export const MClassClosingTemplate = ({ id, logoPosition = 'center', logoSize = 300 }: SlideProps) => (
  <Box id={id} sx={{ ...slideBase, bgcolor: MCLASS_COLORS.black }}>
    {/* Full-bleed model photo */}
    <Box
      component="img"
      
      src="https://pollinations.ai/p/elegant%20latina%20woman%20wearing%20colombian%20emerald%20statement%20necklace%20close%20up%20portrait%20high%20fashion%20editorial%20dark%20background%20cinematic%20lighting?seed=mclass016&width=1920&height=1080&nologo=true"
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
      }}
    />

    {/* Dark gradient overlay */}
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.7) 100%)',
      }}
    />

    {/* Logo - centered design for closing */}
    {logoPosition === 'center' ? (
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          zIndex: 20,
        }}
      >
        <Box
          component="img"
          src="/logo-white.png"
          alt="Tierra Madre"
          sx={{ width: logoSize, height: 'auto', objectFit: 'contain' }}
          onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
            e.currentTarget.style.display = 'none';
          }}
        />
        <Typography
          sx={{
            fontSize: 32,
            color: MCLASS_COLORS.white,
            letterSpacing: 8,
            mt: 4,
            textTransform: 'uppercase',
          }}
        >
          Esencia y Poder
        </Typography>
      </Box>
    ) : (
      <LogoWhite size={logoSize} position={logoPosition} />
    )}

    {/* Contact info */}
    <Box sx={{ position: 'absolute', bottom: 140, left: 0, right: 0, textAlign: 'center' }}>
      <Typography sx={{ fontSize: 20, color: 'rgba(255,255,255,0.8)' }}>
        +57 310 123 4567 | info@tierramadre.co
      </Typography>
    </Box>

    {/* URL Bar */}
    <URLBar />
  </Box>
);
