/**
 * EnergyShieldMeditation Component
 *
 * Emerald energy expanding from center to form protective shield.
 * Protection affirmations displayed as the shield builds.
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Box, Typography } from '@mui/material';

interface EnergyShieldMeditationProps {
  isPlaying: boolean;
  progress: number;
  elapsed: number;
  duration: number;
}

const EnergyShieldMeditation: React.FC<EnergyShieldMeditationProps> = ({
  isPlaying,
  progress,
}) => {
  // Shield builds progressively with meditation progress
  const shieldStrength = Math.min(progress / 100, 1);

  // Affirmations that appear as shield builds
  const affirmations = useMemo(() => [
    { threshold: 10, text: 'Me rodeo de luz protectora' },
    { threshold: 25, text: 'Mi energía está a salvo' },
    { threshold: 40, text: 'Nada negativo puede alcanzarme' },
    { threshold: 60, text: 'Estoy protegido por la esmeralda' },
    { threshold: 80, text: 'Mi escudo está completo' },
    { threshold: 95, text: 'Soy invulnerable' },
  ], []);

  const currentAffirmation = affirmations
    .filter(a => progress >= a.threshold)
    .pop()?.text || 'Comenzando a construir tu escudo...';

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
      {/* Shield Visualization */}
      <Box
        sx={{
          position: 'relative',
          width: 300,
          height: 300,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Outer shield layers */}
        {[1, 2, 3].map((layer) => (
          <motion.div
            key={layer}
            initial={{ scale: 0, opacity: 0 }}
            animate={isPlaying ? {
              scale: shieldStrength * (0.6 + layer * 0.25),
              opacity: shieldStrength * (0.4 - layer * 0.1),
            } : {}}
            transition={{ duration: 1, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              width: 250,
              height: 250,
              borderRadius: '50%',
              border: `2px solid rgba(16,185,129,${0.6 - layer * 0.15})`,
              boxShadow: `0 0 ${20 + layer * 10}px rgba(16,185,129,${0.3 - layer * 0.08})`,
            }}
          />
        ))}

        {/* Energy field */}
        <motion.div
          animate={isPlaying ? {
            scale: [shieldStrength * 0.9, shieldStrength * 1.1, shieldStrength * 0.9],
          } : {}}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{
            position: 'absolute',
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: `radial-gradient(circle,
              rgba(16,185,129,${0.3 * shieldStrength}) 0%,
              rgba(16,185,129,${0.1 * shieldStrength}) 50%,
              transparent 70%
            )`,
            filter: 'blur(5px)',
          }}
        />

        {/* Rotating energy particles */}
        {isPlaying && [...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            animate={{
              rotate: [0, 360],
            }}
            transition={{
              duration: 6 - i * 0.5,
              repeat: Infinity,
              ease: 'linear',
            }}
            style={{
              position: 'absolute',
              width: 150 + i * 15,
              height: 150 + i * 15,
            }}
          >
            <motion.div
              style={{
                position: 'absolute',
                top: 0,
                left: '50%',
                width: 8,
                height: 8,
                marginLeft: -4,
                borderRadius: '50%',
                background: '#10B981',
                boxShadow: '0 0 15px #10B981',
                opacity: shieldStrength,
              }}
            />
          </motion.div>
        ))}

        {/* Center emerald (power source) */}
        <motion.div
          animate={isPlaying ? {
            scale: [1, 1.15, 1],
          } : {}}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{
            width: 80,
            height: 80,
            background: 'linear-gradient(135deg, #34D399 0%, #10B981 50%, #047857 100%)',
            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
            boxShadow: `0 0 ${30 + shieldStrength * 40}px rgba(16,185,129,${0.5 + shieldStrength * 0.3})`,
            zIndex: 10,
          }}
        />

        {/* Shield strength indicator */}
        <Box
          sx={{
            position: 'absolute',
            bottom: -20,
            display: 'flex',
            gap: 0.5,
          }}
        >
          {[...Array(5)].map((_, i) => (
            <Box
              key={i}
              sx={{
                width: 20,
                height: 4,
                borderRadius: 2,
                bgcolor: progress >= (i + 1) * 20 ? '#10B981' : 'rgba(255,255,255,0.2)',
                transition: 'background-color 0.3s',
              }}
            />
          ))}
        </Box>
      </Box>

      {/* Affirmation */}
      <motion.div
        key={currentAffirmation}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Typography
          variant="h6"
          sx={{
            color: 'rgba(255,255,255,0.9)',
            textAlign: 'center',
            fontWeight: 400,
            maxWidth: 280,
          }}
        >
          {currentAffirmation}
        </Typography>
      </motion.div>

      {/* Shield status */}
      <Typography
        variant="body2"
        sx={{
          color: progress >= 100 ? '#10B981' : 'rgba(255,255,255,0.5)',
          fontWeight: progress >= 100 ? 600 : 400,
        }}
      >
        {progress >= 100
          ? 'Escudo Activado'
          : `Construyendo escudo... ${Math.round(progress)}%`}
      </Typography>
    </Box>
  );
};

export default EnergyShieldMeditation;
