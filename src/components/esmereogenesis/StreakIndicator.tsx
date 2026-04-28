/**
 * StreakIndicator
 *
 * Small chip-style readout for the current weekly streak. Shows a flame icon
 * that pulses while the streak is active.
 */

import React from 'react';
import { Box, Typography, alpha } from '@mui/material';
import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';
import { emeraldCore, goldAccent } from '../../design-system/tokens/colors';

interface StreakIndicatorProps {
  weeks: number;
  longest?: number;
  variant?: 'pill' | 'compact';
}

export const StreakIndicator: React.FC<StreakIndicatorProps> = ({ weeks, longest, variant = 'pill' }) => {
  const isActive = weeks > 0;
  const tone = isActive ? goldAccent.primary : emeraldCore.primary;

  if (variant === 'compact') {
    return (
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: tone }}>
        <Box
          component={motion.span}
          animate={isActive ? { scale: [1, 1.15, 1] } : { scale: 1 }}
          transition={{ duration: 1.6, repeat: isActive ? Infinity : 0, ease: 'easeInOut' }}
          sx={{ display: 'inline-flex', alignItems: 'center' }}
        >
          <Flame size={14} fill={isActive ? tone : 'transparent'} />
        </Box>
        <Typography variant="caption" sx={{ color: tone, fontWeight: 700 }}>
          {weeks} sem
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1,
        px: 1.5,
        py: 0.75,
        borderRadius: 999,
        bgcolor: alpha(tone, isActive ? 0.12 : 0.06),
        border: `1px solid ${alpha(tone, isActive ? 0.4 : 0.2)}`,
        color: tone,
      }}
    >
      <Box
        component={motion.span}
        animate={isActive ? { scale: [1, 1.18, 1] } : { scale: 1 }}
        transition={{ duration: 1.6, repeat: isActive ? Infinity : 0, ease: 'easeInOut' }}
        sx={{ display: 'inline-flex', alignItems: 'center' }}
      >
        <Flame size={16} fill={isActive ? tone : 'transparent'} />
      </Box>
      <Typography variant="body2" sx={{ fontWeight: 700, color: tone }}>
        {weeks > 0 ? `${weeks} ${weeks === 1 ? 'semana' : 'semanas'}` : 'Sin racha aún'}
      </Typography>
      {typeof longest === 'number' && longest > weeks && (
        <Typography variant="caption" sx={{ color: alpha(tone, 0.7) }}>
          · Máx {longest}
        </Typography>
      )}
    </Box>
  );
};

export default StreakIndicator;
