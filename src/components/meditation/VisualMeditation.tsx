/**
 * VisualMeditation Component
 *
 * Central glowing emerald for focus meditation.
 * Slow rotation, pulsing glow, and gradient background shifts.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Box, Typography } from '@mui/material';

interface VisualMeditationProps {
  isPlaying: boolean;
  progress: number;
  elapsed: number;
  duration: number;
}

const VisualMeditation: React.FC<VisualMeditationProps> = ({
  isPlaying,
  progress,
}) => {
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
      {/* Central Emerald with Effects */}
      <Box
        sx={{
          position: 'relative',
          width: 280,
          height: 280,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Outer pulse rings */}
        {[1, 2, 3].map((ring) => (
          <motion.div
            key={ring}
            animate={isPlaying ? {
              scale: [1, 2, 2],
              opacity: [0.4, 0.1, 0],
            } : {}}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: ring * 0.8,
              ease: 'easeOut',
            }}
            style={{
              position: 'absolute',
              width: 120,
              height: 120,
              borderRadius: '50%',
              border: '2px solid rgba(16,185,129,0.5)',
            }}
          />
        ))}

        {/* Ambient glow */}
        <motion.div
          animate={isPlaying ? {
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.5, 0.3],
          } : {}}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{
            position: 'absolute',
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(16,185,129,0.4) 0%, transparent 70%)',
            filter: 'blur(20px)',
          }}
        />

        {/* Rotating emerald */}
        <motion.div
          animate={isPlaying ? {
            rotate: 360,
          } : {}}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: 'linear',
          }}
          style={{
            position: 'relative',
            width: 140,
            height: 140,
          }}
        >
          {/* Main emerald shape */}
          <motion.div
            animate={isPlaying ? {
              scale: [1, 1.05, 1],
            } : {}}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, #34D399 0%, #10B981 30%, #059669 60%, #047857 100%)',
              clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
              boxShadow: '0 0 60px rgba(16,185,129,0.6), inset 0 0 30px rgba(255,255,255,0.2)',
            }}
          >
            {/* Light reflections */}
            <Box
              sx={{
                position: 'absolute',
                top: '15%',
                left: '20%',
                width: '30%',
                height: '20%',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.5) 0%, transparent 100%)',
                clipPath: 'polygon(0% 0%, 100% 0%, 80% 100%, 20% 100%)',
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                bottom: '25%',
                right: '15%',
                width: '20%',
                height: '15%',
                background: 'rgba(255,255,255,0.2)',
                clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
              }}
            />
          </motion.div>
        </motion.div>

        {/* Sparkle particles */}
        {isPlaying && [0, 1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            animate={{
              y: [-20, -80],
              x: [(i - 2) * 20, (i - 2) * 40],
              opacity: [0, 1, 0],
              scale: [0, 1, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: i * 0.6,
              ease: 'easeOut',
            }}
            style={{
              position: 'absolute',
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#6EE7B7',
              boxShadow: '0 0 10px #10B981',
            }}
          />
        ))}
      </Box>

      {/* Focus instruction */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        <Typography
          variant="body1"
          sx={{
            color: 'rgba(255,255,255,0.7)',
            textAlign: 'center',
            fontStyle: 'italic',
            maxWidth: 280,
          }}
        >
          Mantén tu mirada suave en la esmeralda...
        </Typography>
      </motion.div>

      {/* Progress indication */}
      <Typography
        variant="caption"
        sx={{
          color: 'rgba(255,255,255,0.4)',
          mt: 2,
        }}
      >
        {Math.round(progress)}% completado
      </Typography>
    </Box>
  );
};

export default VisualMeditation;
