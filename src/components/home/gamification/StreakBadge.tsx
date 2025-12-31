/**
 * StreakBadge Component
 *
 * Animated streak counter with fire effect and milestone indicators.
 * Features pulse animation when streak is at risk.
 *
 * Designed by: Moksart (Gamification) + Aria (Animation)
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, Typography, Chip, alpha } from '@mui/material';
import { LocalFireDepartment, Whatshot } from '@mui/icons-material';
import { goldAccent, semanticColors } from '../../../design-system/tokens/colors';

// =============================================================================
// TYPES
// =============================================================================

interface StreakBadgeProps {
  /** Current streak count */
  current: number;
  /** Longest streak ever */
  longest: number;
  /** Is streak at risk of breaking? */
  isAtRisk?: boolean;
  /** Size variant */
  size?: 'small' | 'medium' | 'large';
  /** Show longest record */
  showRecord?: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const SIZE_CONFIG = {
  small: {
    iconSize: 16,
    fontSize: '0.75rem',
    padding: '4px 8px',
    gap: 0.5,
  },
  medium: {
    iconSize: 20,
    fontSize: '0.875rem',
    padding: '6px 12px',
    gap: 1,
  },
  large: {
    iconSize: 28,
    fontSize: '1.125rem',
    padding: '8px 16px',
    gap: 1.5,
  },
};

// Fire colors based on streak level
const getFireColor = (streak: number): string => {
  if (streak >= 100) return goldAccent.primary; // Gold fire
  if (streak >= 30) return semanticColors.error.main; // Red fire
  if (streak >= 7) return semanticColors.warning.main; // Orange fire
  return semanticColors.warning.light; // Yellow fire (light warning for lower streaks)
};

// =============================================================================
// COMPONENT
// =============================================================================

export const StreakBadge: React.FC<StreakBadgeProps> = ({
  current,
  longest,
  isAtRisk = false,
  size = 'medium',
  showRecord = true,
}) => {
  const config = SIZE_CONFIG[size];
  const fireColor = getFireColor(current);
  const isNewRecord = current >= longest && current > 1;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: config.gap,
      }}
      role="status"
      aria-label={`Racha actual: ${current} días${isAtRisk ? '. Tu racha está en riesgo' : ''}`}
    >
      {/* Main Streak Badge */}
      <motion.div
        animate={isAtRisk ? {
          scale: [1, 1.05, 1],
          transition: { duration: 1.5, repeat: Infinity },
        } : {}}
      >
        <Chip
          icon={
            <motion.div
              animate={{
                rotate: isAtRisk ? [0, -10, 10, 0] : 0,
                scale: isAtRisk ? [1, 1.1, 1] : 1,
              }}
              transition={{
                duration: isAtRisk ? 0.5 : 0,
                repeat: isAtRisk ? Infinity : 0,
              }}
              style={{ display: 'flex', alignItems: 'center' }}
            >
              {current >= 30 ? (
                <Whatshot sx={{ color: `${fireColor} !important`, fontSize: config.iconSize }} />
              ) : (
                <LocalFireDepartment sx={{ color: `${fireColor} !important`, fontSize: config.iconSize }} />
              )}
            </motion.div>
          }
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography
                component="span"
                sx={{
                  fontWeight: 700,
                  fontSize: config.fontSize,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {current}
              </Typography>
              <Typography
                component="span"
                sx={{
                  fontSize: config.fontSize,
                  opacity: 0.9,
                }}
              >
                {current === 1 ? 'día' : 'días'}
              </Typography>
            </Box>
          }
          sx={{
            bgcolor: isAtRisk
              ? alpha(semanticColors.error.main, 0.2)
              : alpha('#FFFFFF', 0.2),
            color: 'white',
            fontWeight: 600,
            backdropFilter: 'blur(8px)',
            border: isAtRisk ? `1px solid ${alpha(semanticColors.error.main, 0.4)}` : 'none',
            '& .MuiChip-icon': {
              color: fireColor,
            },
            transition: 'all 0.3s ease-out',
          }}
        />
      </motion.div>

      {/* New Record Indicator */}
      <AnimatePresence>
        {isNewRecord && (
          <motion.div
            initial={{ opacity: 0, scale: 0, x: -10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
          >
            <Chip
              label="Nuevo récord"
              size="small"
              sx={{
                bgcolor: goldAccent.primary,
                color: 'white',
                fontWeight: 600,
                fontSize: '0.65rem',
                height: 20,
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Record Display */}
      {showRecord && !isNewRecord && (
        <Typography
          variant="caption"
          sx={{
            opacity: 0.8,
            color: 'inherit',
          }}
        >
          Récord: {longest} días
        </Typography>
      )}

      {/* At Risk Warning */}
      <AnimatePresence>
        {isAtRisk && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
          >
            <Typography
              variant="caption"
              sx={{
                color: semanticColors.error.main,
                fontWeight: 600,
              }}
            >
              ¡Visita hoy para mantener tu racha!
            </Typography>
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
};

export default StreakBadge;
