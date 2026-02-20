/**
 * AchievementToast Component
 *
 * Celebration notification for milestone achievements.
 * Features confetti animation and auto-dismiss.
 *
 * Designed by: Moksart (Gamification) + Aria (Animation)
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, Typography, IconButton, Paper, alpha } from '@mui/material';
import { Close, EmojiEvents, Star, Whatshot, Diamond } from '@mui/icons-material';
import { emeraldCore, goldAccent, semanticColors } from '../../design-system/tokens/colors';
import { blurValues } from '../../design-system';

// =============================================================================
// TYPES
// =============================================================================

export interface Achievement {
  id: string;
  type: 'streak' | 'knowledge' | 'meditation' | 'exploration' | 'mastery';
  title: string;
  description: string;
  icon?: React.ReactNode;
  xpReward?: number;
}

interface AchievementToastProps {
  achievement: Achievement | null;
  onDismiss: () => void;
  autoDismiss?: number; // ms, 0 to disable
}

// =============================================================================
// CONSTANTS
// =============================================================================

// Fire/streak accent color
const FIRE_ACCENT = semanticColors.error.main;

const ACHIEVEMENT_ICONS: Record<string, React.ReactNode> = {
  streak: <Whatshot sx={{ fontSize: 32, color: FIRE_ACCENT }} />,
  knowledge: <Star sx={{ fontSize: 32, color: goldAccent.primary }} />,
  meditation: <Diamond sx={{ fontSize: 32, color: emeraldCore.primary }} />,
  exploration: <EmojiEvents sx={{ fontSize: 32, color: goldAccent.light }} />,
  mastery: <EmojiEvents sx={{ fontSize: 32, color: goldAccent.primary }} />,
};

const CONFETTI_COLORS = [
  emeraldCore.primary,
  emeraldCore.light,
  goldAccent.primary,
  goldAccent.light,
  FIRE_ACCENT,
  semanticColors.warning.main,
];

// =============================================================================
// CONFETTI PARTICLE
// =============================================================================

const ConfettiParticle: React.FC<{ delay: number; color: string }> = ({ delay, color }) => {
  const randomX = Math.random() * 200 - 100;
  const randomRotate = Math.random() * 720 - 360;

  return (
    <motion.div
      initial={{
        opacity: 1,
        y: 0,
        x: 0,
        rotate: 0,
        scale: 1,
      }}
      animate={{
        opacity: [1, 1, 0],
        y: [0, -100, 200],
        x: [0, randomX * 0.5, randomX],
        rotate: [0, randomRotate / 2, randomRotate],
        scale: [1, 1.2, 0.5],
      }}
      transition={{
        duration: 2,
        delay,
        ease: 'easeOut',
      }}
      style={{
        position: 'absolute',
        width: 8,
        height: 8,
        backgroundColor: color,
        borderRadius: Math.random() > 0.5 ? '50%' : '2px',
      }}
    />
  );
};

// =============================================================================
// COMPONENT
// =============================================================================

export const AchievementToast: React.FC<AchievementToastProps> = ({
  achievement,
  onDismiss,
  autoDismiss = 5000,
}) => {
  const [confetti, setConfetti] = useState<{ id: number; color: string; delay: number }[]>([]);

  // Generate confetti on mount
  useEffect(() => {
    if (achievement) {
      const particles = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        delay: Math.random() * 0.3,
      }));
      setConfetti(particles);
    }
  }, [achievement]);

  // Auto-dismiss
  useEffect(() => {
    if (achievement && autoDismiss > 0) {
      const timer = setTimeout(onDismiss, autoDismiss);
      return () => clearTimeout(timer);
    }
  }, [achievement, autoDismiss, onDismiss]);

  return (
    <AnimatePresence>
      {achievement && (
        <Box
          sx={{
            position: 'fixed',
            top: 'calc(env(safe-area-inset-top, 0px) + 16px)',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            pointerEvents: 'none',
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            style={{ pointerEvents: 'auto' }}
          >
            <Paper
              elevation={8}
              sx={{
                position: 'relative',
                overflow: 'visible',
                borderRadius: 3,
                background: `linear-gradient(135deg, ${emeraldCore.dark} 0%, ${emeraldCore.darker} 100%)`,
                color: 'white',
                minWidth: 300,
                maxWidth: 400,
              }}
              role="alert"
              aria-live="polite"
            >
              {/* Confetti */}
              <Box
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  pointerEvents: 'none',
                }}
              >
                {confetti.map(particle => (
                  <ConfettiParticle
                    key={particle.id}
                    color={particle.color}
                    delay={particle.delay}
                  />
                ))}
              </Box>

              {/* Content */}
              <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                {/* Icon */}
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    rotate: [0, 10, -10, 0],
                  }}
                  transition={{
                    duration: 0.6,
                    repeat: 2,
                    repeatDelay: 0.5,
                  }}
                >
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: '50%',
                      bgcolor: alpha('#FFFFFF', 0.15),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {achievement.icon || ACHIEVEMENT_ICONS[achievement.type]}
                  </Box>
                </motion.div>

                {/* Text */}
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      color: goldAccent.light,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: 1,
                    }}
                  >
                    Logro Desbloqueado!
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    {achievement.title}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    {achievement.description}
                  </Typography>
                  {achievement.xpReward && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          color: goldAccent.primary,
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                          mt: 0.5,
                        }}
                      >
                        +{achievement.xpReward} XP
                      </Typography>
                    </motion.div>
                  )}
                </Box>

                {/* Dismiss button */}
                <IconButton
                  size="small"
                  onClick={onDismiss}
                  aria-label="Cerrar notificacion"
                  sx={{
                    color: alpha('#FFFFFF', 0.7),
                    '&:hover': { color: 'white' },
                  }}
                >
                  <Close fontSize="small" />
                </IconButton>
              </Box>

              {/* Glow effect */}
              <Box
                sx={{
                  position: 'absolute',
                  inset: -2,
                  borderRadius: 4,
                  background: `linear-gradient(135deg, ${alpha(emeraldCore.primary, 0.25)} 0%, ${alpha(goldAccent.primary, 0.25)} 100%)`,
                  filter: `blur(${blurValues.sm})`,
                  zIndex: -1,
                }}
              />
            </Paper>
          </motion.div>
        </Box>
      )}
    </AnimatePresence>
  );
};

export default AchievementToast;
