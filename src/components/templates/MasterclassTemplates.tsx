import { Box, Typography, Stack, Grid } from '@mui/material';
import { styled, alpha } from '@mui/material/styles';

// ============================================================================
// MASTERCLASS TEMPLATES - "El Poder de la Esmeralda Colombiana"
// 11 Slides for the complete presentation
// Dimensions: 1920x1080px (16:9 presentation format)
// ============================================================================

export const SLIDE_WIDTH = 1920;
export const SLIDE_HEIGHT = 1080;

// Brand Guide Color Palette - "Lujo Consciente"
// "Nuestro lujo es la Claridad y la Verdad"
// Emerald green as the ONLY vibrant color
const COLORS = {
  // Primary - Deep Emerald (the only vibrant color)
  emerald: '#0A4D3C',
  emeraldRich: '#1B7A5E',
  emeraldLight: '#2E9B7D',
  emeraldDeep: '#0A4D3C', // alias
  // Backgrounds
  pureWhite: '#FFFFFF',
  naturalWhite: '#FDFDFB',
  white: '#FFFFFF', // alias for compatibility
  richBlack: '#0A0A0A',
  darkTeal: '#0D1B1E',
  // Text
  charcoal: '#2C2C2C',
  textMuted: 'rgba(255, 255, 255, 0.7)',
  // Accents (subtle, not gold)
  silver: '#C5C5C0',
  silverLight: '#E8E8E8',
  // Legacy gold (use sparingly for special highlights only)
  gold: '#C9A962',
};

// Shared styled components
const SlideContainer = styled(Box)({
  width: `${SLIDE_WIDTH}px`,
  height: `${SLIDE_HEIGHT}px`,
  position: 'relative',
  overflow: 'hidden',
  fontFamily: '"Cormorant Garamond", serif',
});

// Minimal corner decorations (silver, subtle)
const CornerDecoration = styled(Box)<{ corner: 'tl' | 'tr' | 'bl' | 'br' }>(({ corner }) => ({
  position: 'absolute',
  width: '80px',
  height: '80px',
  borderColor: `${COLORS.silver}30`,
  borderStyle: 'solid',
  borderWidth: '0',
  ...(corner === 'tl' && { top: 40, left: 40, borderTopWidth: '1px', borderLeftWidth: '1px' }),
  ...(corner === 'tr' && { top: 40, right: 40, borderTopWidth: '1px', borderRightWidth: '1px' }),
  ...(corner === 'bl' && { bottom: 40, left: 40, borderBottomWidth: '1px', borderLeftWidth: '1px' }),
  ...(corner === 'br' && { bottom: 40, right: 40, borderBottomWidth: '1px', borderRightWidth: '1px' }),
}));

// Emerald accent bar (the only vibrant element)
const VerticalAccentBar = styled(Box)({
  position: 'absolute',
  left: 0,
  top: 0,
  width: '3px',
  height: '100%',
  background: COLORS.emerald,
  boxShadow: `0 0 20px ${COLORS.emerald}40`,
});

// Logo path constant
const LOGO_PATH = '/logo-tierra-madre.png';

// ============================================================================
// 1. BRAND COVER TEMPLATE - Portada de Marca
// ============================================================================
interface BrandCoverProps {
  id?: string;
  title?: string;
  subtitle?: string;
  backgroundImage?: string;
}

export function BrandCoverTemplate({
  id = 'brand-cover',
  title = 'TIERRA MADRE',
  subtitle = 'www.tierramadre.co | @tierramadre.co',
  backgroundImage = 'https://image.pollinations.ai/prompt/single%20stunning%20colombian%20emerald%20gemstone%20floating%20with%20sparkles%20and%20light%20rays%20on%20pure%20black%20background%20luxury%20jewelry%20photography%20dramatic%20spotlight%20ultra%20detailed%208K?width=1920&height=1080&nologo=true&seed=cover2024',
}: BrandCoverProps) {
  return (
    <SlideContainer id={id} sx={{ background: COLORS.richBlack }}>
      {/* Background image with overlay */}
      {backgroundImage && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 1920,
            height: 1080,
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      )}

      {/* Subtle vignette */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 1920,
          height: 1080,
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%)',
        }}
      />

      <CornerDecoration corner="tl" />
      <CornerDecoration corner="tr" />
      <CornerDecoration corner="bl" />
      <CornerDecoration corner="br" />

      {/* Title - Top */}
      <Box sx={{ position: 'absolute', top: 200, left: 0, width: 1920, textAlign: 'center', zIndex: 10 }}>
        <Typography
          sx={{
            fontSize: 100,
            fontWeight: 500,
            color: COLORS.pureWhite,
            letterSpacing: '0.2em',
            textShadow: '0 4px 40px rgba(0,0,0,0.8)',
            fontFamily: '"Cormorant Garamond", serif',
          }}
        >
          {title}
        </Typography>
      </Box>

      {/* Divider */}
      <Box sx={{ position: 'absolute', top: 340, left: 760, width: 400, height: 2, background: `linear-gradient(90deg, transparent, ${COLORS.emerald}, transparent)` }} />

      {/* Contact Info - Bottom */}
      <Box sx={{ position: 'absolute', bottom: 150, left: 0, width: 1920, textAlign: 'center', zIndex: 10 }}>
        <Typography
          sx={{
            fontSize: 24,
            fontWeight: 300,
            color: 'rgba(255,255,255,0.7)',
            letterSpacing: '0.1em',
            fontFamily: '"Montserrat", sans-serif',
          }}
        >
          {subtitle}
        </Typography>
      </Box>

      {/* Logo - Bottom Right */}
      <Box sx={{ position: 'absolute', bottom: 30, right: 50, zIndex: 10 }}>
        <Box
          component="img"
          src={LOGO_PATH}
          alt="Tierra Madre"
          sx={{ height: 60, filter: 'brightness(0) invert(1)', opacity: 0.9 }}
        />
      </Box>
    </SlideContainer>
  );
}

// ============================================================================
// 2. MISSION TEMPLATE - Declaración de Misión
// ============================================================================
interface MissionProps {
  id?: string;
  mission?: string;
  backgroundImage?: string;
}

export function MissionTemplate({
  id = 'mission',
  mission = 'Expandimos la esencia y el poder de la esmeralda colombiana',
  backgroundImage = 'https://image.pollinations.ai/prompt/mystical%20underground%20crystal%20cave%20with%20glowing%20green%20emerald%20on%20ancient%20stone%20pedestal%20ethereal%20light%20rays%20fantasy%20atmosphere%20cinematic%20lighting%20blue%20and%20green%20tones%208K%20dramatic?width=1920&height=1080&nologo=true&seed=mission2024',
}: MissionProps) {
  return (
    <SlideContainer id={id} sx={{ background: COLORS.richBlack }}>
      {backgroundImage && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 1920,
            height: 1080,
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      )}

      {/* Subtle overlay */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 1920,
          height: 1080,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.5) 100%)',
        }}
      />

      <VerticalAccentBar />
      <CornerDecoration corner="tl" />
      <CornerDecoration corner="tr" />
      <CornerDecoration corner="bl" />
      <CornerDecoration corner="br" />

      {/* Mission Quote - Bottom Left */}
      <Box sx={{ position: 'absolute', bottom: 120, left: 80, maxWidth: 1200, zIndex: 10 }}>
        <Typography
          sx={{
            fontSize: 48,
            fontWeight: 500,
            color: COLORS.pureWhite,
            lineHeight: 1.3,
            fontStyle: 'italic',
            fontFamily: '"Cormorant Garamond", serif',
            textShadow: '0 4px 30px rgba(0,0,0,0.8)',
          }}
        >
          "{mission}"
        </Typography>
      </Box>

      {/* Logo - Bottom Right */}
      <Box sx={{ position: 'absolute', bottom: 30, right: 50, zIndex: 10 }}>
        <Box
          component="img"
          src={LOGO_PATH}
          alt="Tierra Madre"
          sx={{ height: 60, filter: 'brightness(0) invert(1)', opacity: 0.9 }}
        />
      </Box>
    </SlideContainer>
  );
}

// ============================================================================
// 3. GLOBAL VALIDATION TEMPLATE - Validación en el Mercado Global
// ============================================================================
interface GlobalValidationProps {
  id?: string;
  title?: string;
  destinations?: string[];
  conclusion?: string;
  backgroundImage?: string;
}

export function GlobalValidationTemplate({
  id = 'global-validation',
  title = 'Confirmación Global: La Esmeralda Colombiana en el Mundo',
  destinations = ['España', 'Mónaco', 'Ginebra', 'París', 'Dubai'],
  backgroundImage = '/masterclass/03-global.jpg',
  conclusion = 'Demanda crítica insatisfecha detectada, especialmente en Emiratos Árabes por esmeraldas extrafinas de gran tamaño.',
}: GlobalValidationProps) {
  return (
    <SlideContainer id={id} sx={{ background: `linear-gradient(135deg, ${COLORS.richBlack}, ${COLORS.darkTeal})` }}>
      {backgroundImage && (
        <Box sx={{ position: 'absolute', inset: 0, backgroundImage: `url(${backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.2 }} />
      )}
      <VerticalAccentBar />
      <CornerDecoration corner="tr" />
      <CornerDecoration corner="bl" />

      <Stack sx={{ height: '100%', p: 10 }} spacing={6}>
        <Typography sx={{ fontSize: '64px', fontWeight: 600, color: COLORS.gold, textAlign: 'center', fontFamily: '"Cormorant Garamond", serif' }}>
          {title}
        </Typography>

        <Grid container spacing={4} sx={{ flexGrow: 1, alignItems: 'center' }}>
          {destinations.map((dest, idx) => (
            <Grid item xs={12} sm={6} md={4} key={idx}>
              <Box
                sx={{
                  p: 5,
                  border: `2px solid ${COLORS.emerald}`,
                  background: alpha(COLORS.darkTeal, 0.6),
                  textAlign: 'center',
                  transition: 'all 0.3s ease',
                  '&:hover': { borderColor: COLORS.gold, boxShadow: `0 8px 30px ${alpha(COLORS.gold, 0.3)}` },
                }}
              >
                <Typography sx={{ fontSize: '36px', fontWeight: 600, color: COLORS.white, fontFamily: '"Cormorant Garamond", serif' }}>
                  {dest}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        <Box sx={{ p: 5, background: alpha(COLORS.gold, 0.1), border: `1px solid ${COLORS.gold}` }}>
          <Typography sx={{ fontSize: '26px', fontWeight: 400, color: COLORS.white, textAlign: 'center', fontFamily: '"Inter", sans-serif' }}>
            {conclusion}
          </Typography>
        </Box>
      </Stack>
    </SlideContainer>
  );
}

// ============================================================================
// 4. OPPORTUNITY TEMPLATE - Oportunidad de Negocio
// ============================================================================
interface OpportunityProps {
  id?: string;
  title?: string;
  content?: string;
  backgroundImage?: string;
}

export function OpportunityTemplate({
  id = 'opportunity',
  title = 'Esmeraldas para la Temporada de Fin de Año',
  content = 'Se acerca la época dicembrina, un período de máxima demanda en el mercado del lujo. Este es el momento ideal para capitalizar el poder de la esmeralda colombiana.',
  backgroundImage = '/masterclass/04-opportunity.jpg',
}: OpportunityProps) {
  return (
    <SlideContainer id={id} sx={{ background: COLORS.richBlack }}>
      {backgroundImage && (
        <Box sx={{ position: 'absolute', inset: 0, backgroundImage: `url(${backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.3 }} />
      )}

      <VerticalAccentBar />
      <CornerDecoration corner="tl" />
      <CornerDecoration corner="br" />

      <Stack sx={{ position: 'relative', zIndex: 1, height: '100%', justifyContent: 'center', px: 12 }} spacing={6}>
        <Box sx={{ alignSelf: 'flex-start', px: 5, py: 2, background: `linear-gradient(90deg, ${COLORS.gold}, ${COLORS.emerald})`, borderRadius: '30px' }}>
          <Typography sx={{ fontSize: '22px', fontWeight: 700, color: COLORS.richBlack, letterSpacing: '0.15em', fontFamily: '"Inter", sans-serif' }}>
            OPORTUNIDAD ÚNICA
          </Typography>
        </Box>

        <Typography sx={{ fontSize: '80px', fontWeight: 600, color: COLORS.white, lineHeight: 1.15, fontFamily: '"Cormorant Garamond", serif' }}>
          {title}
        </Typography>

        <Typography sx={{ fontSize: '30px', fontWeight: 300, color: COLORS.textMuted, maxWidth: '1000px', lineHeight: 1.6, fontFamily: '"Inter", sans-serif' }}>
          {content}
        </Typography>

        <Box sx={{ width: '500px', height: '4px', background: `linear-gradient(90deg, ${COLORS.gold}, ${COLORS.emerald})` }} />
      </Stack>
    </SlideContainer>
  );
}

// ============================================================================
// 5. EXPERT TEMPLATE - Presentación del Experto
// ============================================================================
interface ExpertProps {
  id?: string;
  title?: string;
  expertName?: string;
  expertTitle?: string;
  content?: string;
  expertImage?: string;
}

export function ExpertTemplate({
  id = 'expert',
  title = 'Una Alianza de Confianza',
  expertName = 'Mauricio Ruiz',
  expertTitle = 'Representante Comercial de la Confederación de Esmeralderos de Colombia',
  content = 'Uno de los liderazgos más destacados de la nueva generación de la Confederación.',
  expertImage = '/masterclass/05-expert.jpg',
}: ExpertProps) {
  return (
    <SlideContainer id={id} sx={{ background: `linear-gradient(135deg, ${COLORS.darkTeal}, ${COLORS.richBlack})` }}>
      <CornerDecoration corner="tl" />
      <CornerDecoration corner="br" />

      <Grid container sx={{ height: '100%' }}>
        <Grid item xs={5}>
          <Box
            sx={{
              height: '100%',
              backgroundImage: expertImage ? `url(${expertImage})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              background: expertImage ? undefined : `linear-gradient(135deg, ${COLORS.emeraldDeep}, ${COLORS.darkTeal})`,
              '&::after': expertImage ? { content: '""', position: 'absolute', inset: 0, background: `linear-gradient(90deg, transparent, ${alpha(COLORS.darkTeal, 0.8)})` } : undefined,
            }}
          />
        </Grid>

        <Grid item xs={7}>
          <Stack sx={{ height: '100%', justifyContent: 'center', px: 10, py: 8 }} spacing={5}>
            <Typography sx={{ fontSize: '52px', fontWeight: 600, color: COLORS.gold, fontFamily: '"Cormorant Garamond", serif' }}>
              {title}
            </Typography>

            <Box sx={{ p: 5, border: `2px solid ${COLORS.emerald}`, background: alpha(COLORS.richBlack, 0.5) }}>
              <Typography sx={{ fontSize: '64px', fontWeight: 600, color: COLORS.white, mb: 2, fontFamily: '"Cormorant Garamond", serif' }}>
                {expertName}
              </Typography>
              <Typography sx={{ fontSize: '26px', fontWeight: 400, color: COLORS.emerald, fontFamily: '"Inter", sans-serif' }}>
                {expertTitle}
              </Typography>
            </Box>

            <Typography sx={{ fontSize: '24px', fontWeight: 300, color: COLORS.textMuted, lineHeight: 1.7, fontFamily: '"Inter", sans-serif' }}>
              {content}
            </Typography>
          </Stack>
        </Grid>
      </Grid>
    </SlideContainer>
  );
}

// ============================================================================
// 6. DIFFERENTIATORS TEMPLATE - Diferenciadores de la Esmeralda
// ============================================================================
interface DifferentiatorsProps {
  id?: string;
  title?: string;
  factors?: Array<{ title: string; description: string }>;
  backgroundImage?: string;
}

export function DifferentiatorsTemplate({
  id = 'differentiators',
  title = '¿Por Qué una Esmeralda Colombiana Vale Más?',
  backgroundImage = '/masterclass/06-differentiators.jpg',
  factors = [
    { title: 'Color', description: 'Un verde profundo, saturado y único, inigualable en otras partes del mundo.' },
    { title: 'Brillo', description: 'Una luminosidad excepcional que parece emanar desde el interior de la gema.' },
    { title: 'Jardines Internos', description: 'La firma inimitable de la naturaleza, una huella digital que garantiza su origen.' },
    { title: 'Geología Única', description: 'Proceso de formación mucho más lento que otorga características incomparables.' },
  ],
}: DifferentiatorsProps) {
  return (
    <SlideContainer id={id} sx={{ background: COLORS.richBlack }}>
      {backgroundImage && (
        <Box sx={{ position: 'absolute', inset: 0, backgroundImage: `url(${backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.15 }} />
      )}
      <VerticalAccentBar />
      <CornerDecoration corner="tr" />
      <CornerDecoration corner="bl" />

      <Stack sx={{ height: '100%', p: 10, position: 'relative', zIndex: 1 }} spacing={6}>
        <Typography sx={{ fontSize: '64px', fontWeight: 600, color: COLORS.gold, textAlign: 'center', fontFamily: '"Cormorant Garamond", serif' }}>
          {title}
        </Typography>

        <Grid container spacing={5} sx={{ flexGrow: 1 }}>
          {factors.map((factor, idx) => (
            <Grid item xs={6} key={idx}>
              <Box
                sx={{
                  height: '100%',
                  p: 5,
                  background: `linear-gradient(135deg, ${alpha(COLORS.darkTeal, 0.8)}, ${alpha(COLORS.richBlack, 0.6)})`,
                  border: `2px solid ${COLORS.emerald}`,
                  position: 'relative',
                  '&::before': { content: '""', position: 'absolute', top: 0, left: 0, width: '6px', height: '100%', background: COLORS.gold },
                }}
              >
                <Typography sx={{ fontSize: '44px', fontWeight: 600, color: COLORS.gold, mb: 2, fontFamily: '"Cormorant Garamond", serif' }}>
                  {factor.title}
                </Typography>
                <Typography sx={{ fontSize: '24px', fontWeight: 300, color: COLORS.white, lineHeight: 1.6, fontFamily: '"Inter", sans-serif' }}>
                  {factor.description}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Stack>
    </SlideContainer>
  );
}

// ============================================================================
// 7. CELEBRITIES TEMPLATE - Social Proof
// ============================================================================
interface CelebritiesProps {
  id?: string;
  title?: string;
  subtitle?: string;
  celebrities?: string[];
  backgroundImage?: string;
}

export function CelebritiesTemplate({
  id = 'celebrities',
  title = 'Símbolo de Lujo y Poder',
  subtitle = 'El Sello de las Celebridades',
  celebrities = ['Angelina Jolie', 'Salma Hayek', 'Sofía Vergara'],
  backgroundImage = '/masterclass/07-celebrities.jpg',
}: CelebritiesProps) {
  return (
    <SlideContainer id={id} sx={{ background: `linear-gradient(135deg, ${COLORS.richBlack}, ${COLORS.darkTeal})` }}>
      {backgroundImage && (
        <Box sx={{ position: 'absolute', inset: 0, backgroundImage: `url(${backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.15 }} />
      )}
      <CornerDecoration corner="tl" />
      <CornerDecoration corner="tr" />
      <CornerDecoration corner="bl" />
      <CornerDecoration corner="br" />

      <Stack sx={{ height: '100%', p: 10 }} spacing={5}>
        <Typography sx={{ fontSize: '64px', fontWeight: 600, color: COLORS.gold, textAlign: 'center', fontFamily: '"Cormorant Garamond", serif' }}>
          {title}
        </Typography>

        <Typography sx={{ fontSize: '32px', fontWeight: 300, color: COLORS.white, textAlign: 'center', fontFamily: '"Inter", sans-serif' }}>
          {subtitle}
        </Typography>

        <Stack spacing={4} sx={{ flexGrow: 1, justifyContent: 'center', px: 15 }}>
          {celebrities.map((celeb, idx) => (
            <Box
              key={idx}
              sx={{
                p: 5,
                background: alpha(COLORS.gold, 0.1),
                border: `2px solid ${COLORS.gold}`,
                textAlign: 'center',
                transition: 'all 0.3s ease',
                '&:hover': { background: alpha(COLORS.gold, 0.2), transform: 'translateY(-4px)', boxShadow: `0 8px 30px ${alpha(COLORS.gold, 0.4)}` },
              }}
            >
              <Typography sx={{ fontSize: '48px', fontWeight: 600, color: COLORS.white, fontFamily: '"Cormorant Garamond", serif' }}>
                {celeb}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Stack>
    </SlideContainer>
  );
}

// ============================================================================
// 8. REASONS TEMPLATE - 5 Razones
// ============================================================================
interface ReasonsProps {
  id?: string;
  title?: string;
  reasons?: Array<{ number: string; text: string }>;
  backgroundImage?: string;
}

export function ReasonsTemplate({
  id = 'reasons',
  title = '5 Razones por las que Todo Colombiano Debería Tener una Esmeralda',
  reasons = [
    { number: '01', text: 'Nos representa como colombianos.' },
    { number: '02', text: 'Es energía de sanación y protección.' },
    { number: '03', text: 'Es símbolo de lujo y poder.' },
    { number: '04', text: 'Es un activo que se valoriza en el tiempo.' },
    { number: '05', text: 'Es la gema de la meditación que activa el chakra del corazón.' },
  ],
  backgroundImage = '/masterclass/08-reasons.jpg',
}: ReasonsProps) {
  return (
    <SlideContainer id={id} sx={{ background: COLORS.richBlack }}>
      {backgroundImage && (
        <Box sx={{ position: 'absolute', inset: 0, backgroundImage: `url(${backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.15 }} />
      )}
      <VerticalAccentBar />
      <CornerDecoration corner="tr" />
      <CornerDecoration corner="bl" />

      <Stack sx={{ height: '100%', p: 10 }} spacing={5}>
        <Typography sx={{ fontSize: '56px', fontWeight: 600, color: COLORS.gold, textAlign: 'center', fontFamily: '"Cormorant Garamond", serif' }}>
          {title}
        </Typography>

        <Stack spacing={3} sx={{ flexGrow: 1, justifyContent: 'center' }}>
          {reasons.map((reason, idx) => (
            <Box
              key={idx}
              sx={{
                display: 'flex',
                gap: 5,
                p: 4,
                background: `linear-gradient(90deg, ${alpha(COLORS.darkTeal, 0.6)}, ${alpha(COLORS.richBlack, 0.4)})`,
                border: `1px solid ${COLORS.emerald}`,
                alignItems: 'center',
              }}
            >
              <Typography sx={{ fontSize: '72px', fontWeight: 700, color: COLORS.gold, lineHeight: 1, minWidth: '120px', fontFamily: '"Cormorant Garamond", serif' }}>
                {reason.number}
              </Typography>
              <Typography sx={{ fontSize: '32px', fontWeight: 400, color: COLORS.white, fontFamily: '"Cormorant Garamond", serif' }}>
                {reason.text}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Stack>
    </SlideContainer>
  );
}

// ============================================================================
// 9. ETHICAL CHAIN TEMPLATE - Cadena de Valor Ética
// ============================================================================
interface EthicalChainProps {
  id?: string;
  title?: string;
  subtitle?: string;
  stats?: Array<{ value: string; label: string }>;
  content?: string;
  backgroundImage?: string;
}

export function EthicalChainTemplate({
  id = 'ethical-chain',
  title = 'De la Mina a tus Manos',
  subtitle = 'Una Cadena de Confianza y ADN de Paz',
  stats = [
    { value: '30+', label: 'Años en Paz' },
    { value: '100+', label: 'Familias Beneficiadas' },
    { value: '100%', label: 'Minería Artesanal' },
  ],
  content = 'Modelo directo sin intermediarios. Gemas con trazabilidad completa y compromiso social verificable.',
  backgroundImage = '/masterclass/09-ethical.jpg',
}: EthicalChainProps) {
  return (
    <SlideContainer id={id} sx={{ background: `linear-gradient(135deg, ${COLORS.darkTeal}, ${COLORS.richBlack})` }}>
      {backgroundImage && (
        <Box sx={{ position: 'absolute', inset: 0, backgroundImage: `url(${backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.2 }} />
      )}
      <VerticalAccentBar />
      <CornerDecoration corner="tl" />
      <CornerDecoration corner="br" />

      <Stack sx={{ height: '100%', p: 10 }} spacing={6}>
        <Typography sx={{ fontSize: '64px', fontWeight: 600, color: COLORS.gold, textAlign: 'center', lineHeight: 1.2, fontFamily: '"Cormorant Garamond", serif' }}>
          {title}
        </Typography>

        <Typography sx={{ fontSize: '36px', fontWeight: 500, color: COLORS.emerald, textAlign: 'center', fontFamily: '"Inter", sans-serif' }}>
          {subtitle}
        </Typography>

        <Grid container spacing={5} sx={{ flexGrow: 1, alignItems: 'center' }}>
          {stats.map((stat, idx) => (
            <Grid item xs={4} key={idx}>
              <Box sx={{ p: 6, background: alpha(COLORS.richBlack, 0.6), border: `2px solid ${idx === 1 ? COLORS.emerald : COLORS.gold}`, textAlign: 'center' }}>
                <Typography sx={{ fontSize: '80px', fontWeight: 700, color: idx === 1 ? COLORS.emerald : COLORS.gold, lineHeight: 1, mb: 2, fontFamily: '"Cormorant Garamond", serif' }}>
                  {stat.value}
                </Typography>
                <Typography sx={{ fontSize: '26px', fontWeight: 400, color: COLORS.white, fontFamily: '"Inter", sans-serif' }}>
                  {stat.label}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        <Box sx={{ p: 5, background: alpha(COLORS.gold, 0.1), border: `1px solid ${COLORS.gold}` }}>
          <Typography sx={{ fontSize: '28px', fontWeight: 300, color: COLORS.white, textAlign: 'center', lineHeight: 1.6, fontFamily: '"Inter", sans-serif' }}>
            {content}
          </Typography>
        </Box>
      </Stack>
    </SlideContainer>
  );
}

// ============================================================================
// 10. CTA TEMPLATE - Llamado a la Acción (Colección Fénix)
// ============================================================================
interface CTAProps {
  id?: string;
  title?: string;
  products?: Array<{ name: string; specs: string; availability: string }>;
  backgroundImage?: string;
}

export function CTATemplate({
  id = 'cta',
  title = 'Tu Oportunidad de Invertir',
  products = [
    { name: 'CORAZÓN TIERRA MADRE', specs: '1.85 ct | Corte Corazón | Calidad Fina', availability: 'Disponible' },
    { name: 'AMOR PLATÓNICO', specs: '2.63 ct | Corte Cushion | Comercial Súper Fina', availability: 'Disponible' },
    { name: 'ADÁN Y EVA', specs: '0.95 ct x2 | Corte Cuadrada | Comercial Superior', availability: 'Par Disponible' },
  ],
  backgroundImage = '/masterclass/10-collection.jpg',
}: CTAProps) {
  return (
    <SlideContainer id={id} sx={{ background: COLORS.richBlack }}>
      {backgroundImage && (
        <Box sx={{ position: 'absolute', inset: 0, backgroundImage: `url(${backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.1 }} />
      )}
      <CornerDecoration corner="tl" />
      <CornerDecoration corner="tr" />
      <CornerDecoration corner="bl" />
      <CornerDecoration corner="br" />

      <Stack sx={{ height: '100%', p: 10 }} spacing={5}>
        <Box sx={{ alignSelf: 'center', px: 6, py: 2, background: `linear-gradient(90deg, ${COLORS.gold}, ${COLORS.emerald})`, borderRadius: '30px' }}>
          <Typography sx={{ fontSize: '24px', fontWeight: 700, color: COLORS.richBlack, letterSpacing: '0.15em', fontFamily: '"Inter", sans-serif' }}>
            COLECCIÓN FÉNIX
          </Typography>
        </Box>

        <Typography sx={{ fontSize: '64px', fontWeight: 600, color: COLORS.gold, textAlign: 'center', fontFamily: '"Cormorant Garamond", serif' }}>
          {title}
        </Typography>

        <Grid container spacing={5} sx={{ flexGrow: 1 }}>
          {products.map((product, idx) => (
            <Grid item xs={4} key={idx}>
              <Box
                sx={{
                  height: '100%',
                  p: 5,
                  background: `linear-gradient(135deg, ${alpha(COLORS.darkTeal, 0.8)}, ${alpha(COLORS.richBlack, 0.6)})`,
                  border: `3px solid ${COLORS.emerald}`,
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.3s ease',
                  '&:hover': { borderColor: COLORS.gold, transform: 'translateY(-8px)', boxShadow: `0 12px 40px ${alpha(COLORS.gold, 0.4)}` },
                }}
              >
                <Typography sx={{ fontSize: '36px', fontWeight: 600, color: COLORS.white, mb: 3, textAlign: 'center', fontFamily: '"Cormorant Garamond", serif' }}>
                  {product.name}
                </Typography>

                <Box sx={{ p: 4, background: alpha(COLORS.gold, 0.1), border: `1px solid ${COLORS.gold}`, mb: 3, flexGrow: 1 }}>
                  <Typography sx={{ fontSize: '22px', fontWeight: 400, color: COLORS.emerald, textAlign: 'center', fontFamily: '"Inter", sans-serif' }}>
                    {product.specs}
                  </Typography>
                </Box>

                <Typography sx={{ fontSize: '26px', fontWeight: 600, color: COLORS.gold, textAlign: 'center', fontFamily: '"Inter", sans-serif' }}>
                  {product.availability}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        <Box
          sx={{
            alignSelf: 'center',
            px: 10,
            py: 4,
            background: `linear-gradient(90deg, ${COLORS.gold}, ${COLORS.emerald})`,
            borderRadius: '50px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            '&:hover': { transform: 'scale(1.05)', boxShadow: `0 8px 30px ${alpha(COLORS.gold, 0.5)}` },
          }}
        >
          <Typography sx={{ fontSize: '32px', fontWeight: 700, color: COLORS.richBlack, letterSpacing: '0.1em', fontFamily: '"Inter", sans-serif' }}>
            CONTACTAR AHORA
          </Typography>
        </Box>
      </Stack>
    </SlideContainer>
  );
}

// Export all templates
export const MasterclassTemplates = {
  BrandCoverTemplate,
  MissionTemplate,
  GlobalValidationTemplate,
  OpportunityTemplate,
  ExpertTemplate,
  DifferentiatorsTemplate,
  CelebritiesTemplate,
  ReasonsTemplate,
  EthicalChainTemplate,
  CTATemplate,
};
