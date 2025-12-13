/**
 * AmbientMeditation Component
 *
 * Minimalist visual with ambient tone generation.
 * Uses Web Audio API for solfeggio frequencies.
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Box, Typography, IconButton } from '@mui/material';
import { VolumeUp, VolumeOff } from '@mui/icons-material';

interface AmbientMeditationProps {
  isPlaying: boolean;
  progress: number;
  elapsed: number;
  duration: number;
  frequency: number;
}

const AmbientMeditation: React.FC<AmbientMeditationProps> = ({
  isPlaying,
  frequency,
}) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isAudioInitialized, setIsAudioInitialized] = useState(false);

  // Initialize audio on first interaction
  const initializeAudio = () => {
    if (audioContextRef.current) return;

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContextRef.current = audioContext;

    // Create oscillator for base frequency
    const oscillator = audioContext.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);

    // Create gain node for volume control
    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);

    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start();

    oscillatorRef.current = oscillator;
    gainNodeRef.current = gainNode;
    setIsAudioInitialized(true);
  };

  // Handle play/pause
  useEffect(() => {
    if (!gainNodeRef.current || !audioContextRef.current) return;

    const targetVolume = isPlaying && !isMuted ? 0.15 : 0;
    gainNodeRef.current.gain.linearRampToValueAtTime(
      targetVolume,
      audioContextRef.current.currentTime + 0.5
    );
  }, [isPlaying, isMuted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (oscillatorRef.current) {
        oscillatorRef.current.stop();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Frequency names
  const frequencyInfo: Record<number, { name: string; benefit: string }> = {
    396: { name: 'UT', benefit: 'Libera culpa y miedo' },
    417: { name: 'RE', benefit: 'Facilita el cambio' },
    528: { name: 'MI', benefit: 'Transformación y sanación' },
    639: { name: 'FA', benefit: 'Conexión y relaciones' },
    741: { name: 'SOL', benefit: 'Despertar intuición' },
    852: { name: 'LA', benefit: 'Orden espiritual' },
  };

  const currentFreqInfo = frequencyInfo[frequency] || { name: 'Hz', benefit: 'Frecuencia de sanación' };

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
      {/* Sound wave visualization */}
      <Box
        sx={{
          position: 'relative',
          width: 280,
          height: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Wave bars */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            height: 120,
          }}
        >
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              animate={isPlaying && !isMuted ? {
                scaleY: [0.3, 1, 0.3],
              } : { scaleY: 0.3 }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.08,
                ease: 'easeInOut',
              }}
              style={{
                width: 4,
                height: '100%',
                background: 'linear-gradient(to top, #10B981, #34D399)',
                borderRadius: 2,
                transformOrigin: 'center',
              }}
            />
          ))}
        </Box>

        {/* Center frequency display */}
        <Box
          sx={{
            position: 'absolute',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(10px)',
            px: 3,
            py: 2,
            borderRadius: 2,
          }}
        >
          <Typography
            variant="h3"
            sx={{
              fontFamily: 'monospace',
              fontWeight: 300,
              color: '#10B981',
            }}
          >
            {frequency}
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: 'rgba(255,255,255,0.6)' }}
          >
            Hz - {currentFreqInfo.name}
          </Typography>
        </Box>
      </Box>

      {/* Audio control */}
      {!isAudioInitialized ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <IconButton
            onClick={initializeAudio}
            sx={{
              bgcolor: 'rgba(16,185,129,0.2)',
              color: '#10B981',
              px: 3,
              py: 1,
              borderRadius: 2,
              '&:hover': { bgcolor: 'rgba(16,185,129,0.3)' },
            }}
          >
            <VolumeUp sx={{ mr: 1 }} />
            <Typography variant="body2">Activar sonido</Typography>
          </IconButton>
        </motion.div>
      ) : (
        <IconButton
          onClick={() => setIsMuted(!isMuted)}
          sx={{
            color: isMuted ? 'rgba(255,255,255,0.4)' : '#10B981',
          }}
        >
          {isMuted ? <VolumeOff /> : <VolumeUp />}
        </IconButton>
      )}

      {/* Frequency benefit */}
      <Typography
        variant="body1"
        sx={{
          color: 'rgba(255,255,255,0.7)',
          textAlign: 'center',
          fontStyle: 'italic',
        }}
      >
        {currentFreqInfo.benefit}
      </Typography>

      {/* Nature sounds hint */}
      <Typography
        variant="caption"
        sx={{
          color: 'rgba(255,255,255,0.4)',
          mt: 2,
        }}
      >
        Frecuencia Solfeggio - Escucha con auriculares
      </Typography>
    </Box>
  );
};

export default AmbientMeditation;
