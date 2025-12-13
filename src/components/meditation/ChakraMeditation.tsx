/**
 * ChakraMeditation Component
 *
 * Heart chakra (green) visualization with concentric circles
 * expanding outward from emerald center.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Box, Typography } from '@mui/material';

interface ChakraMeditationProps {
  isPlaying: boolean;
  progress: number;
  elapsed: number;
  duration: number;
  chakraColor: string;
}

const ChakraMeditation: React.FC<ChakraMeditationProps> = ({
  isPlaying,
  progress,
  chakraColor,
}) => {
  // Affirmations that cycle through
  const affirmations = [
    'Mi corazón está abierto al amor',
    'Merezco amor y compasión',
    'Irradio energía positiva',
    'Estoy en paz conmigo mismo',
    'El amor fluye libremente a través de mí',
  ];

  const currentAffirmation = affirmations[Math.floor(progress / 20) % affirmations.length];

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
      {/* Chakra Visualization */}
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
        {/* Expanding circles */}
        {[1, 2, 3, 4, 5].map((ring) => (
          <motion.div
            key={ring}
            animate={isPlaying ? {
              scale: [0.2, 1.5 + ring * 0.3],
              opacity: [0.8, 0],
            } : { scale: 0.2, opacity: 0 }}
            transition={{
              duration: 4,
              repeat: Infinity,
              delay: ring * 0.7,
              ease: 'easeOut',
            }}
            style={{
              position: 'absolute',
              width: 80,
              height: 80,
              borderRadius: '50%',
              border: `2px solid ${chakraColor}`,
            }}
          />
        ))}

        {/* Center glow */}
        <motion.div
          animate={isPlaying ? {
            scale: [1, 1.2, 1],
            opacity: [0.6, 0.9, 0.6],
          } : {}}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{
            position: 'absolute',
            width: 150,
            height: 150,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${chakraColor}66 0%, transparent 70%)`,
            filter: 'blur(10px)',
          }}
        />

        {/* Heart chakra symbol */}
        <motion.div
          animate={isPlaying ? {
            rotate: [0, 360],
          } : {}}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'linear',
          }}
          style={{
            position: 'relative',
            width: 100,
            height: 100,
          }}
        >
          {/* 12-petaled lotus (simplified) */}
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              animate={isPlaying ? {
                scale: [0.9, 1.1, 0.9],
              } : {}}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.15,
                ease: 'easeInOut',
              }}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: 20,
                height: 40,
                marginLeft: -10,
                marginTop: -40,
                background: `linear-gradient(to bottom, ${chakraColor}, transparent)`,
                borderRadius: '50% 50% 0 0',
                transformOrigin: 'bottom center',
                transform: `rotate(${i * 30}deg)`,
                opacity: 0.7,
              }}
            />
          ))}

          {/* Center emerald */}
          <motion.div
            animate={isPlaying ? {
              scale: [1, 1.1, 1],
            } : {}}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: 50,
              height: 50,
              background: `linear-gradient(135deg, ${chakraColor} 0%, #047857 100%)`,
              clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
              boxShadow: `0 0 30px ${chakraColor}`,
            }}
          />
        </motion.div>
      </Box>

      {/* Chakra name */}
      <Typography
        variant="h6"
        sx={{
          color: chakraColor,
          fontWeight: 600,
          letterSpacing: '0.1em',
        }}
      >
        ANAHATA
      </Typography>

      {/* Affirmation */}
      <motion.div
        key={currentAffirmation}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.5 }}
      >
        <Typography
          variant="body1"
          sx={{
            color: 'rgba(255,255,255,0.8)',
            textAlign: 'center',
            fontStyle: 'italic',
            maxWidth: 280,
          }}
        >
          "{currentAffirmation}"
        </Typography>
      </motion.div>

      {/* Chakra info */}
      <Typography
        variant="caption"
        sx={{
          color: 'rgba(255,255,255,0.4)',
        }}
      >
        Chakra del Corazón
      </Typography>
    </Box>
  );
};

export default ChakraMeditation;
