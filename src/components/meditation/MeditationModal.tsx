/**
 * MeditationModal Component
 *
 * Full-screen immersive meditation experience with glass blur backdrop.
 * Renders appropriate meditation type component based on daily meditation.
 */

import React, { useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, IconButton, Typography, LinearProgress, Portal } from '@mui/material';
import { Close, Pause, PlayArrow, Replay } from '@mui/icons-material';
import { DailyMeditation } from '../../data/homeContent';
import { useMeditationTimer } from '../home/hooks/useMeditationTimer';
import BreathingMeditation from './BreathingMeditation';
import VisualMeditation from './VisualMeditation';
import ChakraMeditation from './ChakraMeditation';
import AmbientMeditation from './AmbientMeditation';
import EnergyShieldMeditation from './EnergyShieldMeditation';
import GuidedMeditation from './GuidedMeditation';

interface MeditationModalProps {
  open: boolean;
  onClose: () => void;
  meditation: DailyMeditation;
}

const MeditationModal: React.FC<MeditationModalProps> = ({
  open,
  onClose,
  meditation,
}) => {
  const handleComplete = useCallback(() => {
    // Meditation completed - could trigger celebration
  }, []);

  const [state, actions] = useMeditationTimer(meditation.duration, handleComplete);

  // Auto-play when modal opens
  useEffect(() => {
    if (open && !state.isPlaying && !state.isCompleted) {
      actions.play();
    }
  }, [open, state.isPlaying, state.isCompleted, actions]);

  // Pause when modal closes
  useEffect(() => {
    if (!open && state.isPlaying) {
      actions.pause();
    }
  }, [open, state.isPlaying, actions]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (open) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Render meditation type component
  const renderMeditationType = () => {
    const commonProps = {
      isPlaying: state.isPlaying,
      progress: state.progress,
      elapsed: state.elapsed,
      duration: meditation.duration,
    };

    switch (meditation.type) {
      case 'breathing':
        return (
          <BreathingMeditation
            {...commonProps}
            pattern={meditation.breathingPattern || { inhale: 4, hold: 4, exhale: 4 }}
          />
        );
      case 'visual':
        return <VisualMeditation {...commonProps} />;
      case 'chakra':
        return (
          <ChakraMeditation
            {...commonProps}
            chakraColor={meditation.chakraColor || '#10B981'}
          />
        );
      case 'ambient':
        return (
          <AmbientMeditation
            {...commonProps}
            frequency={meditation.ambientFrequency || 528}
          />
        );
      case 'energy-shield':
        return <EnergyShieldMeditation {...commonProps} />;
      case 'guided':
        return (
          <GuidedMeditation
            {...commonProps}
            steps={meditation.guidedSteps || []}
          />
        );
      default:
        return <VisualMeditation {...commonProps} />;
    }
  };

  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
            }}
          >
            {/* Backdrop */}
            <Box
              onClick={onClose}
              sx={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(180deg, #0a1628 0%, #0f2027 50%, #1a3a3a 100%)',
                backdropFilter: 'blur(20px)',
              }}
            />

            {/* Content */}
            <Box
              sx={{
                position: 'relative',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                color: 'white',
              }}
            >
              {/* Header */}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  p: 2,
                  pt: 'calc(env(safe-area-inset-top, 16px) + 8px)',
                }}
              >
                <IconButton
                  onClick={onClose}
                  sx={{ color: 'rgba(255,255,255,0.8)' }}
                  aria-label="Cerrar meditación"
                >
                  <Close />
                </IconButton>

                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.9)',
                    textAlign: 'center',
                    flex: 1,
                  }}
                >
                  {meditation.title}
                </Typography>

                <IconButton
                  onClick={state.isCompleted ? actions.reset : actions.toggle}
                  sx={{ color: 'rgba(255,255,255,0.8)' }}
                  aria-label={state.isPlaying ? 'Pausar' : 'Reproducir'}
                >
                  {state.isCompleted ? (
                    <Replay />
                  ) : state.isPlaying ? (
                    <Pause />
                  ) : (
                    <PlayArrow />
                  )}
                </IconButton>
              </Box>

              {/* Meditation Content */}
              <Box
                sx={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  px: 3,
                  overflow: 'hidden',
                }}
              >
                {renderMeditationType()}
              </Box>

              {/* Footer with Progress */}
              <Box
                sx={{
                  p: 3,
                  pb: 'calc(env(safe-area-inset-bottom, 16px) + 16px)',
                }}
              >
                {/* Timer */}
                <Typography
                  variant="h4"
                  sx={{
                    textAlign: 'center',
                    fontFamily: 'monospace',
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.9)',
                    mb: 2,
                  }}
                >
                  {state.formattedRemaining}
                </Typography>

                {/* Progress Bar */}
                <LinearProgress
                  variant="determinate"
                  value={state.progress}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    bgcolor: 'rgba(255,255,255,0.1)',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: '#10B981',
                      borderRadius: 3,
                    },
                  }}
                />

                {/* Completion Message */}
                {state.isCompleted && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Typography
                      sx={{
                        textAlign: 'center',
                        mt: 2,
                        color: '#10B981',
                        fontWeight: 600,
                      }}
                    >
                      Meditación completada
                    </Typography>
                  </motion.div>
                )}
              </Box>
            </Box>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
};

export default MeditationModal;
