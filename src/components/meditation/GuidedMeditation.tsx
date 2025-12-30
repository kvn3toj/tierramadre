/**
 * GuidedMeditation Component
 *
 * Text-based guided meditation with step progression.
 * Background emerald visuals with synced text prompts.
 */

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, Typography } from '@mui/material';
import { primitiveColors } from '../../design-system/tokens/primitives/colors';

const emerald = primitiveColors.emerald;

interface GuidedMeditationProps {
  isPlaying: boolean;
  progress: number;
  elapsed: number;
  duration: number;
  steps: string[];
}

const GuidedMeditation: React.FC<GuidedMeditationProps> = ({
  isPlaying,
  progress,
  elapsed,
  duration,
  steps,
}) => {
  // Calculate which step to show based on progress
  const currentStepIndex = useMemo(() => {
    if (steps.length === 0) return 0;
    const stepProgress = progress / 100;
    return Math.min(
      Math.floor(stepProgress * steps.length),
      steps.length - 1
    );
  }, [progress, steps.length]);

  const currentStep = steps[currentStepIndex] || '';

  // Time per step
  const timePerStep = duration / steps.length;
  const stepElapsed = elapsed % timePerStep;
  const stepProgress = (stepElapsed / timePerStep) * 100;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        width: '100%',
        maxWidth: 320,
      }}
    >
      {/* Background emerald visualization */}
      <Box
        sx={{
          position: 'relative',
          width: 180,
          height: 180,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Soft glow */}
        <motion.div
          animate={isPlaying ? {
            scale: [1, 1.2, 1],
            opacity: [0.4, 0.6, 0.4],
          } : {}}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{
            position: 'absolute',
            width: 180,
            height: 180,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(16,185,129,0.4) 0%, transparent 70%)',
            filter: 'blur(20px)',
          }}
        />

        {/* Central emerald */}
        <motion.div
          animate={isPlaying ? {
            rotate: [0, 5, -5, 0],
          } : {}}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{
            width: 100,
            height: 100,
            background: `linear-gradient(135deg, ${emerald[400]} 0%, ${emerald[500]} 50%, ${emerald[700]} 100%)`,
            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
            boxShadow: '0 0 40px rgba(16,185,129,0.5)',
          }}
        />

        {/* Step indicator dots */}
        <Box
          sx={{
            position: 'absolute',
            bottom: -30,
            display: 'flex',
            gap: 1,
          }}
        >
          {steps.map((_, i) => (
            <Box
              key={i}
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: i === currentStepIndex
                  ? emerald[500]
                  : i < currentStepIndex
                    ? 'rgba(16,185,129,0.5)'
                    : 'rgba(255,255,255,0.2)',
                transition: 'background-color 0.3s',
              }}
            />
          ))}
        </Box>
      </Box>

      {/* Current instruction */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStepIndex}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.8 }}
          style={{ textAlign: 'center' }}
        >
          <Typography
            variant="h5"
            sx={{
              color: 'rgba(255,255,255,0.95)',
              fontWeight: 300,
              lineHeight: 1.6,
              letterSpacing: '0.02em',
            }}
          >
            {currentStep}
          </Typography>
        </motion.div>
      </AnimatePresence>

      {/* Step progress bar */}
      <Box
        sx={{
          width: '100%',
          height: 3,
          bgcolor: 'rgba(255,255,255,0.1)',
          borderRadius: 1.5,
          overflow: 'hidden',
          mt: 2,
        }}
      >
        <motion.div
          animate={{ width: `${stepProgress}%` }}
          transition={{ duration: 0.5 }}
          style={{
            height: '100%',
            background: `linear-gradient(90deg, ${emerald[500]}, ${emerald[400]})`,
            borderRadius: 6,
          }}
        />
      </Box>

      {/* Step counter */}
      <Typography
        variant="caption"
        sx={{
          color: 'rgba(255,255,255,0.4)',
        }}
      >
        Paso {currentStepIndex + 1} de {steps.length}
      </Typography>
    </Box>
  );
};

export default GuidedMeditation;
