/**
 * MeditationSection Component
 *
 * Daily meditation card that opens full-screen immersive meditation experience.
 * Different meditation type each day: breathing, visual, chakra, ambient, energy shield, guided.
 *
 * Designed by: Aria + Moksart + CoomÜnity Council
 */

import React, { useMemo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Typography,
  Card,
  CardContent,
  IconButton,
  Chip,
} from '@mui/material';
import { PlayArrow, SelfImprovement } from '@mui/icons-material';
import { emeraldCore } from '../../../design-system/tokens/colors';
import { useLanguage } from '../../../contexts/LanguageContext';
import { DAILY_MEDITATIONS, MeditationType } from '../../../data/homeContent';
import { fadeInUp, cardVariants, cssTransition } from '../../../design-system/tokens/motion';
import { MeditationModal } from '../../meditation';

// =============================================================================
// MEDITATION TYPE LABELS
// =============================================================================

const meditationTypeLabels: Record<MeditationType, string> = {
  breathing: 'Respiración',
  visual: 'Visual',
  chakra: 'Chakra',
  ambient: 'Sonidos',
  'energy-shield': 'Escudo',
  guided: 'Guiada',
};

// Use Tierra Madre symbol for breathing, emojis for others
const getMeditationIcon = (type: MeditationType): React.ReactNode => {
  if (type === 'breathing') {
    return (
      <img
        src="/images/tierra-madre-symbol.png"
        alt="Tierra Madre"
        style={{ width: 18, height: 18, objectFit: 'contain' }}
      />
    );
  }
  const icons: Record<MeditationType, string> = {
    breathing: '🌬️',
    visual: '💎',
    chakra: '💚',
    ambient: '🎵',
    'energy-shield': '🛡️',
    guided: '🧘',
  };
  return <span style={{ fontSize: 14 }}>{icons[type]}</span>;
};

// =============================================================================
// COMPONENT
// =============================================================================

export const MeditationSection: React.FC = () => {
  const { t } = useLanguage();
  const [modalOpen, setModalOpen] = useState(false);

  // Get daily meditation based on day of week
  const dailyMeditation = useMemo(() => {
    const dayOfWeek = new Date().getDay();
    return DAILY_MEDITATIONS[dayOfWeek];
  }, []);

  // Format duration for display
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    return `${mins} min`;
  };

  const handleOpenMeditation = useCallback(() => {
    setModalOpen(true);
  }, []);

  const handleCloseMeditation = useCallback(() => {
    setModalOpen(false);
  }, []);

  return (
    <>
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
              onClick={handleOpenMeditation}
              sx={{
                bgcolor: 'var(--surface-secondary)',
                background: 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(4,120,87,0.1) 100%)',
                borderRadius: 3,
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'transform 0.2s ease-out, box-shadow 0.2s ease-out',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 24px rgba(16,185,129,0.15)',
                },
                '&:active': {
                  transform: 'scale(0.98)',
                },
              }}
            >
              <CardContent sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ flex: 1 }}>
                    {/* Meditation type badge */}
                    <Chip
                      size="small"
                      icon={<>{getMeditationIcon(dailyMeditation.type)}</>}
                      label={meditationTypeLabels[dailyMeditation.type]}
                      sx={{
                        mb: 1,
                        bgcolor: `${emeraldCore.primary}20`,
                        color: emeraldCore.dark,
                        fontWeight: 500,
                        fontSize: '0.75rem',
                        height: 24,
                        '& .MuiChip-icon': { ml: 0.5 },
                      }}
                    />

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

                    {/* Duration */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5 }}>
                      <SelfImprovement sx={{ fontSize: 18, color: emeraldCore.primary }} />
                      <Typography
                        variant="body2"
                        sx={{ color: emeraldCore.primary, fontWeight: 500 }}
                      >
                        {formatDuration(dailyMeditation.duration)}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Play Button */}
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenMeditation();
                    }}
                    aria-label="Iniciar meditación"
                    sx={{
                      bgcolor: emeraldCore.primary,
                      color: 'white',
                      width: 56,
                      height: 56,
                      transition: cssTransition.default,
                      '&:hover': {
                        bgcolor: emeraldCore.dark,
                        transform: 'scale(1.05)',
                      },
                      '&:focus-visible': {
                        outline: `3px solid ${emeraldCore.light}`,
                        outlineOffset: 4,
                      },
                    }}
                  >
                    <PlayArrow sx={{ fontSize: 28 }} />
                  </IconButton>
                </Box>

                {/* Tap hint */}
                <Typography
                  variant="caption"
                  sx={{
                    color: 'var(--text-tertiary)',
                    display: 'block',
                    mt: 1.5,
                    textAlign: 'center',
                  }}
                >
                  Toca para comenzar la experiencia inmersiva
                </Typography>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </Box>

      {/* Full-screen Meditation Modal */}
      <MeditationModal
        open={modalOpen}
        onClose={handleCloseMeditation}
        meditation={dailyMeditation}
      />
    </>
  );
};

export default MeditationSection;
