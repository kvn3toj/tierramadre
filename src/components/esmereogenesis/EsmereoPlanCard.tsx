/**
 * EsmereoPlanCard
 *
 * Compact representation of a single Esmereogénesis plan in the hub.
 * Shows the LivingEmerald in small size + ring + product name + progress.
 */

import React from 'react';
import { Box, Typography, alpha } from '@mui/material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Flame, Sparkles } from 'lucide-react';
import type { EsmereoPlan } from '../../types/esmereogenesis';
import { emeraldCore, goldAccent } from '../../design-system/tokens/colors';
import { emeraldGradients, goldGradients, meshGradients } from '../../design-system/tokens/gradients';
import { useCurrencyFormat } from '../../contexts/CurrencyContext';
import { LivingEmerald } from './LivingEmerald';

interface EsmereoPlanCardProps {
  plan: EsmereoPlan;
}

export const EsmereoPlanCard: React.FC<EsmereoPlanCardProps> = ({ plan }) => {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrencyFormat();
  const progress = plan.targetCOP > 0 ? plan.totalAbonadoCOP / plan.targetCOP : 0;
  const progressPct = Math.round(progress * 100);
  const isComplete = plan.state === 'completed' || plan.state === 'claimed';

  return (
    <Box
      component={motion.button}
      onClick={() => navigate(`/esmereogenesis/${plan.id}`)}
      type="button"
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      aria-label={`Abrir jardín de ${plan.productSnapshot.nombre} · ${progressPct}% completo`}
      sx={{
        position: 'relative',
        background: meshGradients.emerald,
        border: `1px solid ${alpha(emeraldCore.primary, 0.18)}`,
        borderRadius: 3,
        p: 2,
        cursor: 'pointer',
        textAlign: 'left',
        font: 'inherit',
        color: 'inherit',
        boxShadow: `0 6px 18px ${alpha(emeraldCore.dark, 0.12)}`,
        overflow: 'hidden',
        '&:hover': {
          boxShadow: `0 10px 28px ${alpha(emeraldCore.dark, 0.22)}`,
          borderColor: alpha(emeraldCore.primary, 0.35),
        },
        '&:focus-visible': {
          outline: `2px solid ${emeraldCore.primary}`,
          outlineOffset: 2,
        },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1.5 }}>
        <LivingEmerald
          imageSrc={plan.productSnapshot.imagen}
          progress={progress}
          state={plan.state}
          size="sm"
          isPulsing={!isComplete}
        />
      </Box>

      <Typography
        variant="subtitle2"
        sx={{
          fontFamily: '"Playfair Display", serif',
          fontWeight: 600,
          color: emeraldCore.dark,
          mb: 0.5,
          textAlign: 'center',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {plan.productSnapshot.nombre}
      </Typography>

      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
        <Box
          sx={{
            height: 6,
            width: '85%',
            borderRadius: 999,
            bgcolor: alpha(emeraldCore.primary, 0.1),
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              height: '100%',
              width: `${progressPct}%`,
              background: isComplete ? goldGradients.medium : emeraldGradients.intense,
              transition: 'width 0.6s ease-out',
            }}
          />
        </Box>
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          fontSize: 12,
        }}
      >
        <Typography
          component="span"
          variant="caption"
          sx={{ color: emeraldCore.dark, fontWeight: 700 }}
        >
          {progressPct}%
        </Typography>
        <Typography
          component="span"
          variant="caption"
          sx={{ color: 'text.secondary', flex: 1, textAlign: 'right' }}
        >
          {formatCurrency(plan.totalAbonadoCOP)}
        </Typography>
      </Box>

      {plan.streak.currentWeeks > 0 && !isComplete && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0.5,
            mt: 1,
            color: goldAccent.dark,
          }}
        >
          <Flame size={12} />
          <Typography variant="caption" sx={{ fontWeight: 600 }}>
            {plan.streak.currentWeeks} sem
          </Typography>
        </Box>
      )}

      {isComplete && (
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            color: goldAccent.primary,
            display: 'flex',
            alignItems: 'center',
            gap: 0.25,
            background: alpha('#FFFFFF', 0.85),
            borderRadius: 999,
            px: 0.75,
            py: 0.25,
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          <Sparkles size={12} />
          Adquirida
        </Box>
      )}
    </Box>
  );
};

export default EsmereoPlanCard;
