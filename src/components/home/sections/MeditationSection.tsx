/**
 * MeditationSection Component
 *
 * Daily meditation card with timer, progress tracking, and completion celebration.
 * Features circular progress animation and accessibility.
 *
 * Designed by: Aria + Moksart
 */

import React, { useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Typography,
  Card,
  CardContent,
  IconButton,
  LinearProgress,
} from '@mui/material';
import { PlayArrow, Pause, Replay } from '@mui/icons-material';
import { emeraldCore } from '../../../design-system/tokens/colors';
import { useLanguage } from '../../../contexts/LanguageContext';
import { DAILY_MEDITATIONS } from '../../../data/homeContent';
import { useMeditationTimer } from '../hooks/useMeditationTimer';
import { fadeInUp, cardVariants, pulse, spring } from '../../../theme/motionTokens';

// =============================================================================
// COMPONENT
// =============================================================================

export const MeditationSection: React.FC = () => {
  const { t } = useLanguage();

  // Get daily meditation based on day of week
  const dailyMeditation = useMemo(() => {
    const dayOfWeek = new Date().getDay();
    return DAILY_MEDITATIONS[dayOfWeek];
  }, []);

  const handleComplete = useCallback(() => {
    // Could trigger celebration animation or notification here
    console.log('Meditation completed!');
  }, []);

  const [state, actions, completedCount] = useMeditationTimer(
    dailyMeditation.duration,
    handleComplete
  );

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      actions.toggle();
    }
  }, [actions]);

  return (
    <Box sx={{ px: 2, mb: 2 }} component="section" aria-labelledby="meditation-title">
      <motion.div variants={fadeInUp} initial="initial" animate="animate">
        <Typography
          id="meditation-title"
          variant="h6"
          component="h2"
          sx={{ mb: 1.5, fontWeight: 600, color: 'var(--text-primary)' }}
        >
          {t.pages.home.meditation}
        </Typography>

        <motion.div variants={cardVariants} whileHover="hover">
          <Card
            sx={{
              bgcolor: 'var(--surface-secondary)',
              background: 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(4,120,87,0.1) 100%)',
              borderRadius: 3,
              overflow: 'hidden',
            }}
          >
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="subtitle1"
                    component="h3"
                    sx={{ fontWeight: 600, color: 'var(--text-primary)' }}
                  >
                    {dailyMeditation.title}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: 'var(--text-secondary)', mt: 0.5 }}
                  >
                    {dailyMeditation.description}
                  </Typography>

                  {/* Timer Display */}
                  <Box
                    role="timer"
                    aria-label={`Tiempo restante: ${state.formattedRemaining}`}
                    aria-live="polite"
                    sx={{ mt: 1 }}
                  >
                    <Typography
                      variant="h4"
                      sx={{
                        fontFamily: 'monospace',
                        fontWeight: 600,
                        color: emeraldCore.primary,
                      }}
                    >
                      {state.formattedRemaining}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'var(--text-tertiary)' }}>
                      {state.isCompleted ? 'Completada' : 'restantes'}
                    </Typography>
                  </Box>
                </Box>

                {/* Play/Pause Button */}
                <Box sx={{ position: 'relative' }}>
                  {/* Pulsing ring when playing */}
                  {state.isPlaying && (
                    <motion.div
                      animate={pulse}
                      style={{
                        position: 'absolute',
                        inset: -8,
                        borderRadius: '50%',
                        background: emeraldCore.primary,
                        opacity: 0.2,
                      }}
                    />
                  )}

                  <IconButton
                    onClick={actions.toggle}
                    onKeyDown={handleKeyDown}
                    aria-label={state.isPlaying ? 'Pausar meditación' : 'Iniciar meditación'}
                    aria-pressed={state.isPlaying}
                    sx={{
                      bgcolor: state.isCompleted ? emeraldCore.dark : emeraldCore.primary,
                      color: 'white',
                      width: 64,
                      height: 64,
                      transition: 'all 0.2s ease-out',
                      '&:hover': {
                        bgcolor: state.isCompleted ? emeraldCore.darker : emeraldCore.dark,
                        transform: 'scale(1.05)',
                      },
                      '&:focus-visible': {
                        outline: `3px solid ${emeraldCore.light}`,
                        outlineOffset: 4,
                      },
                    }}
                  >
                    {state.isCompleted ? (
                      <Replay sx={{ fontSize: 32 }} />
                    ) : state.isPlaying ? (
                      <Pause sx={{ fontSize: 32 }} />
                    ) : (
                      <PlayArrow sx={{ fontSize: 32 }} />
                    )}
                  </IconButton>
                </Box>
              </Box>

              {/* Progress Bar */}
              <Box sx={{ mt: 2 }}>
                <LinearProgress
                  variant="determinate"
                  value={state.progress}
                  role="progressbar"
                  aria-valuenow={state.progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Progreso de la meditación"
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    bgcolor: `${emeraldCore.primary}33`,
                    '& .MuiLinearProgress-bar': {
                      bgcolor: emeraldCore.primary,
                      borderRadius: 4,
                      transition: 'transform 0.5s ease-out',
                    },
                  }}
                />
              </Box>

              {/* Completed Count */}
              <Typography
                variant="caption"
                sx={{ color: 'var(--text-tertiary)', display: 'block', mt: 1.5 }}
              >
                {completedCount} meditaciones completadas este mes
              </Typography>

              {/* Completion Celebration */}
              {state.isCompleted && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...spring.bouncy }}
                >
                  <Box
                    sx={{
                      mt: 2,
                      p: 1.5,
                      bgcolor: `${emeraldCore.primary}15`,
                      borderRadius: 2,
                      textAlign: 'center',
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{ color: emeraldCore.dark, fontWeight: 600 }}
                    >
                      ¡Excelente! Tu mente está más clara
                    </Typography>
                  </Box>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </Box>
  );
};

export default MeditationSection;
