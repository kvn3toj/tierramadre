/**
 * TIERRA MADRE - Business Presentation Templates
 * Following the official Style Guide
 *
 * Design Principles:
 * - Rule of Thirds composition
 * - White backgrounds, minimalist aesthetic
 * - Emerald green (#046307) and Gold (#D4AF37) accents
 * - Playfair Display (titles) + Montserrat (body)
 * - Benefits in bordered containers
 */

import React from 'react';
import { Box, Typography } from '@mui/material';

// ============================================================================
// CONSTANTS
// ============================================================================

const SLIDE_WIDTH = 1920;
const SLIDE_HEIGHT = 1080;
const LOGO_PATH = '/logo-tierra-madre.png';

// Brand Guide Color Palette - Minimalist Business
const COLORS = {
  background: '#FFFFFF',
  textPrimary: '#212121',
  textSecondary: '#666666',
  accentEmerald: '#046307',
  accentGold: '#D4AF37',
  borderLight: '#E0E0E0',
  borderAccent: '#046307',
};

// Typography - Elegant Business
const TYPOGRAPHY = {
  h1: { fontSize: 72, fontWeight: 700, lineHeight: 1.1, fontFamily: '"Playfair Display", serif' },
  h2: { fontSize: 56, fontWeight: 600, lineHeight: 1.2, fontFamily: '"Playfair Display", serif' },
  h3: { fontSize: 42, fontWeight: 500, lineHeight: 1.3, fontFamily: '"Playfair Display", serif' },
  h4: { fontSize: 32, fontWeight: 500, lineHeight: 1.4, fontFamily: '"Playfair Display", serif' },
  body: { fontSize: 24, fontWeight: 400, lineHeight: 1.6, fontFamily: '"Montserrat", sans-serif' },
  bodySmall: { fontSize: 20, fontWeight: 400, lineHeight: 1.5, fontFamily: '"Montserrat", sans-serif' },
  caption: { fontSize: 16, fontWeight: 400, lineHeight: 1.5, fontFamily: '"Montserrat", sans-serif' },
  benefit: { fontSize: 22, fontWeight: 500, lineHeight: 1.5, fontFamily: '"Montserrat", sans-serif' },
};

// Grid positions based on Rule of Thirds
const GRID = {
  leftThird: { left: 80, width: 560 },
  centerThird: { left: 680, width: 560 },
  rightThird: { left: 1280, width: 560 },
  leftTwoThirds: { left: 80, width: 1160 },
  rightTwoThirds: { left: 680, width: 1160 },
  fullWidth: { left: 80, width: 1760 },
  verticalTop: 100,
  verticalMiddle: 400,
  verticalBottom: 700,
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
      backgroundColor: COLORS.background,
      fontFamily: '"Montserrat", sans-serif',
    }}
  >
    {children}
  </Box>
);

const Logo: React.FC<{ position?: 'bottom-right' | 'below-image-right' | 'below-image-left' }> = ({
  position = 'bottom-right'
}) => {
  const positions = {
    'bottom-right': { bottom: 40, right: 60 },
    'below-image-right': { bottom: 40, right: 200 },
    'below-image-left': { bottom: 40, left: 200 },
  };

  return (
    <Box sx={{ position: 'absolute', ...positions[position], zIndex: 20 }}>
      <Box
        component="img"
        src={LOGO_PATH}
        alt="Tierra Madre"
        sx={{ height: 50, opacity: 0.9 }}
      />
    </Box>
  );
};

// Benefits Container - Key design element from style guide
const BenefitsContainer: React.FC<{
  title?: string;
  children: React.ReactNode;
  top?: number;
  left?: number;
  width?: number;
}> = ({
  title = 'Beneficio',
  children,
  top = 800,
  left = 80,
  width = 1160,
}) => (
  <Box
    sx={{
      position: 'absolute',
      top,
      left,
      width,
      border: `2px solid ${COLORS.accentEmerald}`,
      borderRadius: 2,
      padding: '24px 32px',
    }}
  >
    <Typography
      sx={{
        ...TYPOGRAPHY.caption,
        color: COLORS.accentEmerald,
        fontWeight: 600,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        marginBottom: 12,
      }}
    >
      {title}
    </Typography>
    <Typography sx={{ ...TYPOGRAPHY.benefit, color: COLORS.textPrimary }}>
      {children}
    </Typography>
  </Box>
);

// Image container with rule of thirds positioning
const ImageSection: React.FC<{
  src: string;
  position: 'left' | 'right';
  alt?: string;
}> = ({ src, position, alt = '' }) => (
  <Box
    sx={{
      position: 'absolute',
      top: 0,
      [position]: 0,
      width: SLIDE_WIDTH / 3,
      height: SLIDE_HEIGHT,
      overflow: 'hidden',
    }}
  >
    <Box
      component="img"
      src={src}
      alt={alt}
      sx={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
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
  imageUrl?: string;
}

export const BusinessCoverTemplate: React.FC<CoverProps> = ({
  id = 'business-cover',
  title = 'TIERRA MADRE',
  subtitle = 'Esencia y Poder de la Esmeralda Colombiana',
  imageUrl = 'https://images.unsplash.com/photo-1615655114865-4cc1bda5901b?w=800&h=1200&fit=crop',
}) => (
  <SlideContainer id={id}>
    {/* Image in right third */}
    <ImageSection src={imageUrl} position="right" alt="Emerald" />

    {/* Title in left two-thirds */}
    <Box
      sx={{
        position: 'absolute',
        top: 320,
        left: GRID.leftTwoThirds.left,
        width: GRID.leftTwoThirds.width,
      }}
    >
      <Typography
        sx={{
          ...TYPOGRAPHY.h1,
          color: COLORS.textPrimary,
          marginBottom: 24,
        }}
      >
        {title}
      </Typography>
      <Box
        sx={{
          width: 120,
          height: 4,
          backgroundColor: COLORS.accentEmerald,
          marginBottom: 32,
        }}
      />
      <Typography
        sx={{
          ...TYPOGRAPHY.h3,
          color: COLORS.textSecondary,
          fontWeight: 400,
        }}
      >
        {subtitle}
      </Typography>
    </Box>
  </SlideContainer>
);

// ============================================================================
// SLIDE 2: KEY POINT (Image Right) - Punto Clave
// ============================================================================

interface KeyPointProps {
  id?: string;
  title?: string;
  content?: string;
  benefit?: string;
  imageUrl?: string;
  showLogo?: boolean;
}

export const KeyPointRightTemplate: React.FC<KeyPointProps> = ({
  id = 'key-point-right',
  title = 'Alto Valor por Unidad',
  content = 'Las esmeraldas son uno de los minerales más caros del mundo. Un quilate de esmeralda fina puede valer más que el oro, el diamante y la mayoría de gemas preciosas.',
  benefit = 'Puedes mover grandes sumas de dinero con muy poca mercancía. Bajos costos logísticos y de transporte.',
  imageUrl = 'https://images.unsplash.com/photo-1615655114865-4cc1bda5901b?w=800&h=1200&fit=crop',
  showLogo = true,
}) => (
  <SlideContainer id={id}>
    {/* Image in right third */}
    <ImageSection src={imageUrl} position="right" alt={title} />

    {/* Content in left two-thirds */}
    <Box
      sx={{
        position: 'absolute',
        top: 160,
        left: GRID.leftTwoThirds.left,
        width: GRID.leftTwoThirds.width,
      }}
    >
      <Typography
        sx={{
          ...TYPOGRAPHY.h2,
          color: COLORS.textPrimary,
          marginBottom: 40,
        }}
      >
        {title}
      </Typography>
      <Typography
        sx={{
          ...TYPOGRAPHY.body,
          color: COLORS.textSecondary,
          marginBottom: 60,
          maxWidth: 900,
        }}
      >
        {content}
      </Typography>
    </Box>

    {/* Benefits Container */}
    <BenefitsContainer top={580} left={80} width={1100}>
      {benefit}
    </BenefitsContainer>

    {showLogo && <Logo position="below-image-right" />}
  </SlideContainer>
);

// ============================================================================
// SLIDE 3: KEY POINT (Image Left) - Punto Clave Invertido
// ============================================================================

export const KeyPointLeftTemplate: React.FC<KeyPointProps> = ({
  id = 'key-point-left',
  title = 'Demanda Internacional',
  content = 'Las esmeraldas colombianas tienen mercado en Estados Unidos, Hong Kong, China, Europa, Dubái y Medio Oriente, e India.',
  benefit = 'Siempre hay compradores. Alta rotación si manejas buena calidad. Posibilidad de expandirse sin límites geográficos.',
  imageUrl = 'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=800&h=1200&fit=crop',
}) => (
  <SlideContainer id={id}>
    {/* Image in left third */}
    <ImageSection src={imageUrl} position="left" alt={title} />

    {/* Content in right two-thirds */}
    <Box
      sx={{
        position: 'absolute',
        top: 160,
        left: GRID.rightTwoThirds.left,
        width: GRID.rightTwoThirds.width,
      }}
    >
      <Typography
        sx={{
          ...TYPOGRAPHY.h2,
          color: COLORS.textPrimary,
          marginBottom: 40,
        }}
      >
        {title}
      </Typography>
      <Typography
        sx={{
          ...TYPOGRAPHY.body,
          color: COLORS.textSecondary,
          marginBottom: 60,
          maxWidth: 900,
        }}
      >
        {content}
      </Typography>
    </Box>

    {/* Benefits Container */}
    <BenefitsContainer top={580} left={680} width={1100}>
      {benefit}
    </BenefitsContainer>
  </SlideContainer>
);

// ============================================================================
// SLIDE 4: GALLERY (5 Images) - Galería
// ============================================================================

interface GalleryProps {
  id?: string;
  title?: string;
  subtitle?: string;
  items?: Array<{ image: string; label: string }>;
  benefit?: string;
}

const DEFAULT_GALLERY_5 = [
  { image: 'https://flagcdn.com/w80/us.png', label: 'Estados Unidos' },
  { image: 'https://flagcdn.com/w80/hk.png', label: 'Hong Kong' },
  { image: 'https://flagcdn.com/w80/fr.png', label: 'Europa' },
  { image: 'https://flagcdn.com/w80/ae.png', label: 'Dubái' },
  { image: 'https://flagcdn.com/w80/in.png', label: 'India' },
];

export const Gallery5Template: React.FC<GalleryProps> = ({
  id = 'gallery-5',
  title = 'Mercado Global',
  subtitle = 'Principales destinos de exportación de esmeraldas colombianas',
  items = DEFAULT_GALLERY_5,
  benefit = 'Acceso a los mercados más importantes del mundo para piedras preciosas.',
}) => (
  <SlideContainer id={id}>
    {/* Title */}
    <Box sx={{ position: 'absolute', top: 80, left: GRID.fullWidth.left, width: GRID.fullWidth.width }}>
      <Typography sx={{ ...TYPOGRAPHY.h2, color: COLORS.textPrimary, marginBottom: 16 }}>
        {title}
      </Typography>
      <Typography sx={{ ...TYPOGRAPHY.body, color: COLORS.textSecondary }}>
        {subtitle}
      </Typography>
    </Box>

    {/* Gallery Row - 5 items */}
    <Box
      sx={{
        position: 'absolute',
        top: 320,
        left: GRID.fullWidth.left,
        width: GRID.fullWidth.width,
        display: 'flex',
        justifyContent: 'space-between',
        gap: 24,
      }}
    >
      {items.slice(0, 5).map((item, idx) => (
        <Box key={idx} sx={{ textAlign: 'center', flex: 1 }}>
          <Box
            sx={{
              width: '100%',
              height: 280,
              borderRadius: 2,
              overflow: 'hidden',
              border: `1px solid ${COLORS.borderLight}`,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#FAFAFA',
            }}
          >
            <Box
              component="img"
              src={item.image}
              alt={item.label}
              sx={{ maxWidth: '80%', maxHeight: '80%', objectFit: 'contain' }}
            />
          </Box>
          <Typography sx={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textPrimary, fontWeight: 500 }}>
            {item.label}
          </Typography>
        </Box>
      ))}
    </Box>

    {/* Benefits Container */}
    <BenefitsContainer top={750} left={80} width={1760}>
      {benefit}
    </BenefitsContainer>
  </SlideContainer>
);

// ============================================================================
// SLIDE 5: NUMBERED LIST - Lista Numerada
// ============================================================================

interface NumberedListProps {
  id?: string;
  title?: string;
  subtitle?: string;
  items?: string[];
  benefit?: string;
  imageUrl?: string;
}

export const NumberedListTemplate: React.FC<NumberedListProps> = ({
  id = 'numbered-list',
  title = 'Colombia es Líder Mundial',
  subtitle = 'Esto genera:',
  items = [
    'Prestigio internacional',
    'Mayor valor por marca de origen',
    'Preferencia del consumidor por lo colombiano',
  ],
  benefit = 'Vender esmeraldas colombianas te pone automáticamente en el segmento más alto del mercado.',
  imageUrl = 'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=800&h=1200&fit=crop',
}) => (
  <SlideContainer id={id}>
    {/* Image in right third */}
    <ImageSection src={imageUrl} position="right" alt={title} />

    {/* Content in left two-thirds */}
    <Box sx={{ position: 'absolute', top: 120, left: GRID.leftTwoThirds.left, width: GRID.leftTwoThirds.width }}>
      <Typography sx={{ ...TYPOGRAPHY.h2, color: COLORS.textPrimary, marginBottom: 24 }}>
        {title}
      </Typography>
      <Typography sx={{ ...TYPOGRAPHY.body, color: COLORS.textSecondary, marginBottom: 40 }}>
        {subtitle}
      </Typography>

      {/* Numbered List */}
      <Box sx={{ marginBottom: 40 }}>
        {items.map((item, idx) => (
          <Box key={idx} sx={{ display: 'flex', alignItems: 'flex-start', marginBottom: 24 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                backgroundColor: COLORS.accentEmerald,
                color: COLORS.background,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 20,
                marginRight: 20,
                flexShrink: 0,
              }}
            >
              {idx + 1}
            </Box>
            <Typography sx={{ ...TYPOGRAPHY.body, color: COLORS.textPrimary, paddingTop: 6 }}>
              {item}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>

    {/* Benefits Container */}
    <BenefitsContainer top={680} left={80} width={1100}>
      {benefit}
    </BenefitsContainer>
  </SlideContainer>
);

// ============================================================================
// SLIDE 6: BULLET LIST - Lista con Viñetas
// ============================================================================

interface BulletListProps {
  id?: string;
  title?: string;
  items?: string[];
  benefit?: string;
  imageUrl?: string;
}

export const BulletListTemplate: React.FC<BulletListProps> = ({
  id = 'bullet-list',
  title = 'Altos Márgenes de Ganancia',
  items = [
    'Calidad de la piedra',
    'Certificación de origen',
    'Tipo de tallado',
    'Relación con mina o proveedor',
    'Utilidades del 20% al 300%',
  ],
  benefit = 'Gran rentabilidad frente a otros productos de exportación.',
  imageUrl = 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&h=1200&fit=crop',
}) => (
  <SlideContainer id={id}>
    {/* Image in left third */}
    <ImageSection src={imageUrl} position="left" alt={title} />

    {/* Content in right two-thirds */}
    <Box sx={{ position: 'absolute', top: 120, left: GRID.rightTwoThirds.left, width: GRID.rightTwoThirds.width }}>
      <Typography sx={{ ...TYPOGRAPHY.h2, color: COLORS.textPrimary, marginBottom: 40 }}>
        {title}
      </Typography>

      {/* Bullet List */}
      <Box sx={{ marginBottom: 40 }}>
        {items.map((item, idx) => (
          <Box key={idx} sx={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: COLORS.accentEmerald,
                marginRight: 20,
                flexShrink: 0,
              }}
            />
            <Typography sx={{ ...TYPOGRAPHY.body, color: COLORS.textPrimary }}>
              {item}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>

    {/* Benefits Container */}
    <BenefitsContainer top={680} left={680} width={1100}>
      {benefit}
    </BenefitsContainer>
  </SlideContainer>
);

// ============================================================================
// SLIDE 9: TWO COLUMNS WITH ICONS - Dos Columnas
// ============================================================================

interface TwoColumnsProps {
  id?: string;
  title?: string;
  subtitle?: string;
  leftItems?: Array<{ icon: string; text: string }>;
  rightItems?: Array<{ icon: string; text: string }>;
  benefit?: string;
}

export const TwoColumnsTemplate: React.FC<TwoColumnsProps> = ({
  id = 'two-columns',
  title = 'Flexibilidad en el Negocio',
  subtitle = 'Múltiples oportunidades de inversión',
  leftItems = [
    { icon: '🏔️', text: 'Comprar en mina' },
    { icon: '🤝', text: 'Intermediar' },
    { icon: '💎', text: 'Tallar' },
    { icon: '📜', text: 'Certificar' },
  ],
  rightItems = [
    { icon: '🌍', text: 'Exportar' },
    { icon: '🏪', text: 'Vender a mayoristas' },
    { icon: '💍', text: 'Vender a joyeros' },
    { icon: '📱', text: 'Vender en redes sociales' },
  ],
  benefit = 'Hay oportunidades en todos los niveles y con diferentes capitales.',
}) => (
  <SlideContainer id={id}>
    {/* Title */}
    <Box sx={{ position: 'absolute', top: 100, left: 0, width: SLIDE_WIDTH, textAlign: 'center' }}>
      <Typography sx={{ ...TYPOGRAPHY.h2, color: COLORS.textPrimary, marginBottom: 16 }}>
        {title}
      </Typography>
      <Typography sx={{ ...TYPOGRAPHY.body, color: COLORS.textSecondary }}>
        {subtitle}
      </Typography>
    </Box>

    {/* Two Columns */}
    <Box
      sx={{
        position: 'absolute',
        top: 300,
        left: 200,
        width: SLIDE_WIDTH - 400,
        display: 'flex',
        justifyContent: 'space-between',
      }}
    >
      {/* Left Column */}
      <Box sx={{ width: '45%' }}>
        {leftItems.map((item, idx) => (
          <Box key={idx} sx={{ display: 'flex', alignItems: 'center', marginBottom: 32 }}>
            <Typography sx={{ fontSize: 36, marginRight: 20 }}>{item.icon}</Typography>
            <Typography sx={{ ...TYPOGRAPHY.body, color: COLORS.textPrimary }}>
              {item.text}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Right Column */}
      <Box sx={{ width: '45%' }}>
        {rightItems.map((item, idx) => (
          <Box key={idx} sx={{ display: 'flex', alignItems: 'center', marginBottom: 32 }}>
            <Typography sx={{ fontSize: 36, marginRight: 20 }}>{item.icon}</Typography>
            <Typography sx={{ ...TYPOGRAPHY.body, color: COLORS.textPrimary }}>
              {item.text}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>

    {/* Benefits Container */}
    <BenefitsContainer top={780} left={200} width={1520}>
      {benefit}
    </BenefitsContainer>
  </SlideContainer>
);

// ============================================================================
// SLIDE 11: CONCLUSION CHECKLIST - Conclusión
// ============================================================================

interface ConclusionProps {
  id?: string;
  title?: string;
  leftItems?: string[];
  rightItems?: string[];
}

export const ConclusionChecklistTemplate: React.FC<ConclusionProps> = ({
  id = 'conclusion-checklist',
  title = 'Conclusión',
  leftItems = [
    'Alto valor',
    'Alta demanda mundial',
    'Márgenes de ganancia amplios',
    'Poca competencia real',
  ],
  rightItems = [
    'Producto fácil de almacenar',
    'Mercado de lujo dispuesto a pagar',
    'Potencia de marca colombiana',
  ],
}) => (
  <SlideContainer id={id}>
    {/* Title */}
    <Box sx={{ position: 'absolute', top: 100, left: 0, width: SLIDE_WIDTH, textAlign: 'center' }}>
      <Typography sx={{ ...TYPOGRAPHY.h2, color: COLORS.textPrimary }}>
        {title}
      </Typography>
      <Box
        sx={{
          width: 80,
          height: 4,
          backgroundColor: COLORS.accentEmerald,
          margin: '24px auto 0',
        }}
      />
    </Box>

    {/* Two Columns Checklist */}
    <Box
      sx={{
        position: 'absolute',
        top: 280,
        left: 200,
        width: SLIDE_WIDTH - 400,
        display: 'flex',
        justifyContent: 'space-between',
      }}
    >
      {/* Left Column */}
      <Box sx={{ width: '45%' }}>
        {leftItems.map((item, idx) => (
          <Box key={idx} sx={{ display: 'flex', alignItems: 'center', marginBottom: 40 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                backgroundColor: COLORS.accentEmerald,
                color: COLORS.background,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 20,
                flexShrink: 0,
                fontSize: 18,
              }}
            >
              ✓
            </Box>
            <Typography sx={{ ...TYPOGRAPHY.body, color: COLORS.textPrimary }}>
              {item}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Right Column */}
      <Box sx={{ width: '45%' }}>
        {rightItems.map((item, idx) => (
          <Box key={idx} sx={{ display: 'flex', alignItems: 'center', marginBottom: 40 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                backgroundColor: COLORS.accentEmerald,
                color: COLORS.background,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 20,
                flexShrink: 0,
                fontSize: 18,
              }}
            >
              ✓
            </Box>
            <Typography sx={{ ...TYPOGRAPHY.body, color: COLORS.textPrimary }}>
              {item}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>

    <Logo position="bottom-right" />
  </SlideContainer>
);

// ============================================================================
// SLIDE 12: CLOSING - Cierre
// ============================================================================

interface ClosingProps {
  id?: string;
  title?: string;
  content?: string;
  items?: string[];
  imageUrl?: string;
}

export const ClosingTemplate: React.FC<ClosingProps> = ({
  id = 'closing',
  title = 'Es un negocio perfecto para quien quiere:',
  items = [
    'Invertir de forma inteligente',
    'Diversificar su portafolio',
    'Acceder al mercado de lujo',
    'Crear un legado patrimonial',
  ],
  imageUrl = 'https://images.unsplash.com/photo-1611955167811-4711904bb9f8?w=800&h=1200&fit=crop',
}) => (
  <SlideContainer id={id}>
    {/* Image in right third */}
    <ImageSection src={imageUrl} position="right" alt="Closing" />

    {/* Content in left two-thirds */}
    <Box sx={{ position: 'absolute', top: 200, left: GRID.leftTwoThirds.left, width: GRID.leftTwoThirds.width }}>
      <Typography sx={{ ...TYPOGRAPHY.h3, color: COLORS.textPrimary, marginBottom: 60 }}>
        {title}
      </Typography>

      {/* Bullet List */}
      <Box>
        {items.map((item, idx) => (
          <Box key={idx} sx={{ display: 'flex', alignItems: 'center', marginBottom: 32 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: COLORS.accentGold,
                marginRight: 20,
                flexShrink: 0,
              }}
            />
            <Typography sx={{ ...TYPOGRAPHY.body, color: COLORS.textPrimary }}>
              {item}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>

    <Logo position="below-image-right" />
  </SlideContainer>
);

// ============================================================================
// EXPORTS
// ============================================================================

export const BusinessPresentationTemplates = {
  BusinessCoverTemplate,
  KeyPointRightTemplate,
  KeyPointLeftTemplate,
  Gallery5Template,
  NumberedListTemplate,
  BulletListTemplate,
  TwoColumnsTemplate,
  ConclusionChecklistTemplate,
  ClosingTemplate,
};

export default BusinessPresentationTemplates;
