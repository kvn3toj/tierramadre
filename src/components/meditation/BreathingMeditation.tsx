/**
 * BreathingMeditation Component
 *
 * Animated emerald that scales with breath phases.
 * Inhale (grow) -> Hold -> Exhale (shrink)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, Typography } from '@mui/material';
import { BreathingPattern } from '../../data/homeContent';
import { primitiveColors } from '../../design-system';

const emerald = primitiveColors.emerald;

interface BreathingMeditationProps {
  isPlaying: boolean;
  progress: number;
  elapsed: number;
  duration: number;
  pattern: BreathingPattern;
}

type BreathPhase = 'inhale' | 'hold' | 'exhale' | 'holdAfterExhale';

const phaseLabels: Record<BreathPhase, string> = {
  inhale: 'Inhala',
  hold: 'Sostén',
  exhale: 'Exhala',
  holdAfterExhale: 'Sostén',
};

const BreathingMeditation: React.FC<BreathingMeditationProps> = ({
  isPlaying,
  elapsed,
  pattern,
}) => {
  const [phase, setPhase] = useState<BreathPhase>('inhale');
  const [phaseProgress, setPhaseProgress] = useState(0);

  // Calculate total cycle duration
  const cycleDuration = useMemo(() => {
    return pattern.inhale + pattern.hold + pattern.exhale + (pattern.holdAfterExhale || 0);
  }, [pattern]);

  // Update phase based on elapsed time
  useEffect(() => {
    if (!isPlaying) return;

    const cyclePosition = elapsed % cycleDuration;

    if (cyclePosition < pattern.inhale) {
      setPhase('inhale');
      setPhaseProgress(cyclePosition / pattern.inhale);
    } else if (cyclePosition < pattern.inhale + pattern.hold) {
      setPhase('hold');
      setPhaseProgress((cyclePosition - pattern.inhale) / pattern.hold);
    } else if (cyclePosition < pattern.inhale + pattern.hold + pattern.exhale) {
      setPhase('exhale');
      setPhaseProgress((cyclePosition - pattern.inhale - pattern.hold) / pattern.exhale);
    } else {
      setPhase('holdAfterExhale');
      setPhaseProgress(
        (cyclePosition - pattern.inhale - pattern.hold - pattern.exhale) /
          (pattern.holdAfterExhale || 1)
      );
    }
  }, [elapsed, isPlaying, cycleDuration, pattern]);

  // Calculate emerald scale based on phase
  const getScale = () => {
    switch (phase) {
      case 'inhale':
        return 0.6 + phaseProgress * 0.5; // 0.6 -> 1.1
      case 'hold':
        return 1.1;
      case 'exhale':
        return 1.1 - phaseProgress * 0.5; // 1.1 -> 0.6
      case 'holdAfterExhale':
        return 0.6;
      default:
        return 1;
    }
  };

  // Calculate glow intensity
  const getGlowIntensity = () => {
    switch (phase) {
      case 'inhale':
        return 30 + phaseProgress * 40; // 30 -> 70
      case 'hold':
        return 70;
      case 'exhale':
        return 70 - phaseProgress * 40; // 70 -> 30
      case 'holdAfterExhale':
        return 30;
      default:
        return 50;
    }
  };

  const scale = getScale();
  const glow = getGlowIntensity();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        width: '100%',
      }}
    >
      {/* Breathing Circle / Emerald */}
      <Box
        sx={{
          position: 'relative',
          width: 200,
          height: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Outer glow ring */}
        <motion.div
          animate={{
            scale: scale * 1.3,
            opacity: glow / 100,
          }}
          transition={{
            duration: 0.5,
            ease: 'easeOut',
          }}
          style={{
            position: 'absolute',
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: `radial-gradient(circle, rgba(16,185,129,0.3) 0%, transparent 70%)`,
          }}
        />

        {/* Emerald shape */}
        <motion.div
          animate={{
            scale,
          }}
          transition={{
            duration: 0.5,
            ease: 'easeOut',
          }}
          style={{
            width: 120,
            height: 120,
            background: `linear-gradient(135deg, ${emerald[500]} 0%, ${emerald[600]} 50%, ${emerald[700]} 100%)`,
            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
            boxShadow: `0 0 ${glow}px rgba(16,185,129,0.8)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Inner sparkle */}
          <Box
            sx={{
              width: 40,
              height: 40,
              background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 50%)',
              clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
            }}
          />
        </motion.div>
      </Box>

      {/* Phase Label */}
      <AnimatePresence mode="wait">
        <motion.div
          key={phase}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          <Typography
            variant="h4"
            sx={{
              fontWeight: 300,
              color: 'rgba(255,255,255,0.9)',
              letterSpacing: '0.1em',
            }}
          >
            {phaseLabels[phase]}
          </Typography>
        </motion.div>
      </AnimatePresence>

      {/* Breathing Pattern Info */}
      <Typography
        variant="body2"
        sx={{
          color: 'rgba(255,255,255,0.5)',
          mt: 2,
        }}
      >
        {pattern.inhale}-{pattern.hold}-{pattern.exhale}
        {pattern.holdAfterExhale ? `-${pattern.holdAfterExhale}` : ''}
      </Typography>
    </Box>
  );
};

export default BreathingMeditation;
