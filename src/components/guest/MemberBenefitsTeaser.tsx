/**
 * MemberBenefitsTeaser - Exclusive Benefits Preview for Guest Users
 *
 * Shows upcoming Comunidad Tierra Madre membership benefits:
 * - Member-only pricing & discounts
 * - Private auctions access
 * - Early access to new inventory
 * - Personalized recommendations
 *
 * Generates excitement and FOMO to encourage registration
 */

import { useState } from 'react';
import { Box, Typography, Button, alpha, IconButton } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Crown,
  Sparkles,
  TrendingDown,
  Gavel,
  Bell,
  Users,
  Shield,
  ChevronDown,
  ChevronUp,
  Lock,
  Gift,
} from 'lucide-react';
import { useThemeMode } from '../../contexts/ThemeContext';
import { emeraldCore, goldAccent, surfacesLight, surfacesDark } from '../../design-system/tokens/colors';
import { primitiveColors } from '../../design-system/tokens/primitives/colors';

interface BenefitItem {
  icon: React.ElementType;
  title: string;
  description: string;
  badge?: string;
  color: string;
}

const MEMBER_BENEFITS: BenefitItem[] = [
  {
    icon: TrendingDown,
    title: 'Precios Exclusivos',
    description: 'Descuentos especiales y precios preferenciales solo para miembros',
    badge: 'Hasta -20%',
    color: emeraldCore.primary,
  },
  {
    icon: Gavel,
    title: 'Subastas Privadas',
    description: 'Acceso a subastas exclusivas de piezas únicas y coleccionables',
    badge: 'Próximamente',
    color: goldAccent.primary,
  },
  {
    icon: Bell,
    title: 'Acceso Anticipado',
    description: 'Sé el primero en ver nuevas esmeraldas antes del público general',
    badge: '24h antes',
    color: primitiveColors.system.purple.light,
  },
  {
    icon: Gift,
    title: 'Recompensas',
    description: 'Programa de puntos, regalos de cumpleaños y beneficios sorpresa',
    badge: 'Puntos x2',
    color: primitiveColors.system.pink.light,
  },
  {
    icon: Users,
    title: 'Comunidad Exclusiva',
    description: 'Eventos privados, tours a minas y conexiones con coleccionistas',
    badge: 'VIP',
    color: primitiveColors.system.orange.light,
  },
  {
    icon: Shield,
    title: 'Garantía Extendida',
    description: 'Certificación premium y garantía de autenticidad vitalicia',
    badge: 'Vitalicia',
    color: primitiveColors.system.green.light,
  },
];

interface MemberBenefitsTeaserProps {
  variant?: 'compact' | 'full';
  onUnlockClick?: () => void;
}

export default function MemberBenefitsTeaser({
  variant = 'full',
  onUnlockClick
}: MemberBenefitsTeaserProps) {
  const { mode } = useThemeMode();
  const isLight = mode === 'light';
  const [isExpanded, setIsExpanded] = useState(false);

  const surfaces = isLight ? surfacesLight : surfacesDark;
  const separatorColor = isLight ? 'rgba(60, 60, 67, 0.12)' : 'rgba(235, 235, 245, 0.12)';

  // Show only first 3 benefits in compact mode, all in full mode
  const visibleBenefits = variant === 'compact' && !isExpanded
    ? MEMBER_BENEFITS.slice(0, 3)
    : MEMBER_BENEFITS;

  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      sx={{
        position: 'relative',
        borderRadius: 3,
        overflow: 'hidden',
        background: isLight
          ? `linear-gradient(135deg, ${alpha(goldAccent.primary, 0.08)} 0%, ${alpha(emeraldCore.primary, 0.05)} 100%)`
          : `linear-gradient(135deg, ${alpha(goldAccent.primary, 0.12)} 0%, ${alpha(emeraldCore.primary, 0.08)} 100%)`,
        border: `1px solid ${alpha(goldAccent.primary, 0.2)}`,
        boxShadow: `0 4px 24px ${alpha(goldAccent.primary, 0.1)}`,
      }}
    >
      {/* Premium Gradient Border Effect */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: `linear-gradient(90deg, ${emeraldCore.primary}, ${goldAccent.primary}, ${emeraldCore.primary})`,
          backgroundSize: '200% 100%',
          animation: 'shimmer 3s ease-in-out infinite',
          '@keyframes shimmer': {
            '0%': { backgroundPosition: '200% 0' },
            '100%': { backgroundPosition: '-200% 0' },
          },
        }}
      />

      {/* Header */}
      <Box sx={{ px: 2.5, pt: 2.5, pb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${goldAccent.primary}, ${goldAccent.darker})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 2px 8px ${alpha(goldAccent.primary, 0.4)}`,
            }}
          >
            <Crown size={18} color="#FFFFFF" />
          </Box>
          <Box>
            <Typography
              sx={{
                fontSize: '17px',
                fontWeight: 700,
                color: surfaces.text.primary,
                letterSpacing: '-0.01em',
              }}
            >
              Comunidad Tierra Madre
            </Typography>
            <Typography
              sx={{
                fontSize: '12px',
                color: goldAccent.primary,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Beneficios Exclusivos
            </Typography>
          </Box>
          <Box sx={{ ml: 'auto' }}>
            <Sparkles size={20} color={goldAccent.primary} />
          </Box>
        </Box>

        <Typography
          sx={{
            fontSize: '13px',
            color: surfaces.text.secondary,
            mt: 1,
            lineHeight: 1.5,
          }}
        >
          Descubre los privilegios exclusivos que te esperan como miembro de nuestra comunidad de amantes de las esmeraldas colombianas.
        </Typography>
      </Box>

      {/* Benefits List */}
      <Box sx={{ px: 2, pb: 1 }}>
        <AnimatePresence mode="sync">
          {visibleBenefits.map((benefit, index) => (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  py: 1.25,
                  borderBottom: index < visibleBenefits.length - 1 ? `0.5px solid ${separatorColor}` : 'none',
                }}
              >
                {/* Icon */}
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 2,
                    bgcolor: alpha(benefit.color, 0.12),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <benefit.icon size={18} color={benefit.color} />
                </Box>

                {/* Content */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography
                      sx={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: surfaces.text.primary,
                      }}
                    >
                      {benefit.title}
                    </Typography>
                    {benefit.badge && (
                      <Box
                        sx={{
                          px: 0.75,
                          py: 0.25,
                          borderRadius: 1,
                          bgcolor: alpha(benefit.color, 0.15),
                          border: `1px solid ${alpha(benefit.color, 0.2)}`,
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: '10px',
                            fontWeight: 700,
                            color: benefit.color,
                            textTransform: 'uppercase',
                            letterSpacing: '0.02em',
                          }}
                        >
                          {benefit.badge}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                  <Typography
                    sx={{
                      fontSize: '12px',
                      color: surfaces.text.secondary,
                      lineHeight: 1.4,
                      mt: 0.25,
                    }}
                  >
                    {benefit.description}
                  </Typography>
                </Box>

                {/* Lock indicator */}
                <Lock size={14} color={surfaces.text.tertiary} style={{ opacity: 0.5 }} />
              </Box>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Expand/Collapse for compact mode */}
        {variant === 'compact' && MEMBER_BENEFITS.length > 3 && (
          <Box sx={{ textAlign: 'center', py: 1 }}>
            <IconButton
              size="small"
              onClick={() => setIsExpanded(!isExpanded)}
              sx={{
                color: goldAccent.primary,
                '&:hover': { bgcolor: alpha(goldAccent.primary, 0.1) },
              }}
            >
              {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </IconButton>
            <Typography
              sx={{
                fontSize: '12px',
                color: goldAccent.primary,
                fontWeight: 500,
                cursor: 'pointer',
              }}
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Ver menos' : `+${MEMBER_BENEFITS.length - 3} beneficios más`}
            </Typography>
          </Box>
        )}
      </Box>

      {/* CTA Section */}
      <Box
        sx={{
          px: 2.5,
          py: 2,
          bgcolor: alpha(goldAccent.primary, 0.05),
          borderTop: `1px solid ${alpha(goldAccent.primary, 0.1)}`,
        }}
      >
        <Button
          fullWidth
          variant="contained"
          startIcon={<Crown size={18} />}
          onClick={onUnlockClick}
          sx={{
            background: `linear-gradient(135deg, ${goldAccent.primary} 0%, ${goldAccent.darker} 100%)`,
            color: '#FFFFFF',
            py: 1.5,
            fontWeight: 700,
            fontSize: '15px',
            textTransform: 'none',
            borderRadius: 2,
            boxShadow: `0 4px 16px ${alpha(goldAccent.primary, 0.4)}`,
            '&:hover': {
              background: `linear-gradient(135deg, ${goldAccent.darker} 0%, ${goldAccent.primary} 100%)`,
              boxShadow: `0 6px 20px ${alpha(goldAccent.primary, 0.5)}`,
            },
            '&:active': {
              transform: 'scale(0.98)',
            },
          }}
        >
          Únete a la Comunidad
        </Button>

        <Typography
          sx={{
            fontSize: '11px',
            color: surfaces.text.tertiary,
            textAlign: 'center',
            mt: 1.5,
          }}
        >
          Programa de membresía disponible próximamente
        </Typography>
      </Box>
    </Box>
  );
}
