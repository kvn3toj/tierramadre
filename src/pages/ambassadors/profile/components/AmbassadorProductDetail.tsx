/**
 * AmbassadorProductDetail Component
 * Full product detail view within the ambassador profile context.
 * Hero image, name + price, specs grid, description.
 */

import { Box, Typography, Chip, IconButton, alpha, useTheme } from '@mui/material';
import { ArrowLeft, Scale, MapPin, Award, Ruler, Palette } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  emeraldCore,
  goldAccent,
  semanticColors,
  blurValues,
  surfacesLight,
  surfacesDark,
  fontFamilies,
} from '../../../../design-system';
import { formatFullCurrency } from '../../../../utils/formatting';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { useReducedMotion } from '../../../../hooks/useReducedMotion';
import ProgressiveImage from '../../../../components/shared/ProgressiveImage';
import type { TreasureItem } from '../../../../types';

interface AmbassadorProductDetailProps {
  item: TreasureItem;
  onBack: () => void;
}

export function AmbassadorProductDetail({ item, onBack }: AmbassadorProductDetailProps) {
  const theme = useTheme();
  const { t } = useLanguage();
  const isLight = theme.palette.mode === 'light';
  const prefersReducedMotion = useReducedMotion();

  const weightDisplay = typeof item.peso === 'number'
    ? `${item.peso} ct`
    : item.peso || '-';

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={prefersReducedMotion ? undefined : { opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
    >
      {/* Back */}
      <Box sx={{ mb: 2 }}>
        <IconButton
          onClick={onBack}
          aria-label={t.actions.back}
          sx={{
            bgcolor: isLight ? alpha('#000', 0.04) : alpha('#fff', 0.06),
            backdropFilter: `blur(${blurValues.md})`,
            width: 38,
            height: 38,
            '&:hover': {
              bgcolor: isLight ? alpha('#000', 0.08) : alpha('#fff', 0.1),
            },
          }}
        >
          <ArrowLeft size={18} />
        </IconButton>
      </Box>

      {/* Hero Image */}
      <Box
        sx={{
          borderRadius: '18px',
          overflow: 'hidden',
          mb: 2.5,
          aspectRatio: '4/3',
          boxShadow: isLight
            ? '0 4px 20px rgba(0,0,0,0.1)'
            : '0 4px 20px rgba(0,0,0,0.3)',
        }}
      >
        <ProgressiveImage
          src={item.thumbnailUrl || item.imagen}
          alt={item.nombre}
          width={400}
          height={300}
          layout="full"
          quality="good"
          enableLQIP
        />
      </Box>

      {/* Name & Price */}
      <Typography
        variant="h5"
        sx={{
          fontWeight: 700,
          mb: 0.5,
          letterSpacing: '-0.02em',
          fontSize: '1.3rem',
        }}
      >
        {item.nombre}
      </Typography>
      <Typography
        sx={{
          fontFamily: fontFamilies.mono,
          fontWeight: 700,
          fontSize: '1.25rem',
          color: emeraldCore.primary,
          mb: 2,
        }}
      >
        {formatFullCurrency(item.precioCOP)}
      </Typography>

      {/* Tags */}
      <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 2 }}>
        {item.isJewelry && (
          <Chip label="JOYA" size="small" sx={{
            bgcolor: alpha(goldAccent.primary, 0.1),
            color: isLight ? goldAccent.dark : goldAccent.light,
            fontWeight: 700, fontSize: '0.58rem', letterSpacing: '0.04em', borderRadius: '6px',
          }} />
        )}
        {item.categoria && (
          <Chip label={item.categoria} size="small" sx={{
            bgcolor: alpha(emeraldCore.primary, 0.08),
            color: emeraldCore.primary,
            fontWeight: 700, fontSize: '0.58rem', letterSpacing: '0.04em', borderRadius: '6px',
          }} />
        )}
        {item.estado === 'VENDIDA' && (
          <Chip label="VENDIDA" size="small" sx={{
            bgcolor: alpha(semanticColors.error.main, 0.1),
            color: semanticColors.error.main,
            fontWeight: 700, fontSize: '0.58rem', letterSpacing: '0.04em', borderRadius: '6px',
          }} />
        )}
      </Box>

      {/* Specs Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 1.5,
          mb: 2.5,
          p: 2,
          borderRadius: '14px',
          bgcolor: isLight ? surfacesLight.surface.default : surfacesDark.background.secondary,
          border: '1px solid',
          borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.light,
        }}
      >
        <SpecCell icon={<Scale size={16} />} label="Peso" value={weightDisplay} />
        <SpecCell icon={<MapPin size={16} />} label="Origen" value={item.ubicacion || '-'} />
        <SpecCell icon={<Award size={16} />} label="Calidad" value={item.calidad || '-'} />
        {item.talla && <SpecCell icon={<Ruler size={16} />} label="Talla" value={item.talla} />}
        {item.color && <SpecCell icon={<Palette size={16} />} label="Color" value={item.color} />}
        {item.cantidad > 1 && <SpecCell icon={<Scale size={16} />} label="Cantidad" value={`${item.cantidad} uds`} />}
      </Box>

      {/* Description */}
      {item.description && (
        <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem', lineHeight: 1.6 }}>
          {item.description}
        </Typography>
      )}
    </motion.div>
  );
}

function SpecCell({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Box sx={{ textAlign: 'center' }}>
      <Box sx={{ color: 'text.secondary', mb: 0.5, display: 'flex', justifyContent: 'center' }}>{icon}</Box>
      <Typography sx={{ fontSize: '0.58rem', color: 'text.secondary', mb: 0.25, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</Typography>
      <Typography sx={{ fontWeight: 650, fontSize: '0.75rem' }}>{value}</Typography>
    </Box>
  );
}

export default AmbassadorProductDetail;
