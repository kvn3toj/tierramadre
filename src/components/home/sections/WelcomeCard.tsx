/**
 * WelcomeCard Component
 *
 * Gamification stats card with streak, level progress, XP, and daily quote.
 * Extracted from HeroSection for home page reorganization.
 *
 * Designed by: Aria + Eunoia + Moksart
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Box, Typography, Card, CardContent } from '@mui/material';
import { goldAccent } from '../../../design-system/tokens/colors';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useStreakTracking } from '../hooks/useStreakTracking';
import { cardVariants, fadeInUp, spring } from '../../../design-system/tokens/motion';
import { StreakBadge, ProgressRing, useGamification } from '../gamification';

// =============================================================================
// COMPONENT
// =============================================================================

export const WelcomeCard: React.FC = () => {
  const { t } = useLanguage();
  const { current, longest, nextMilestone, isStreakAtRisk } = useStreakTracking();
  const [gamification] = useGamification();

  // Daily inspirational quote
  const dailyQuote = useMemo(() => {
    const quotes = [
      { text: 'La esmeralda es el espejo del alma - refleja tu verdad interior', author: 'Proverbio colombiano' },
      { text: 'En cada esmeralda habita un fragmento de la montaña', author: 'Sabiduría Muzo' },
      { text: 'El verde profundo revela lo que el corazón anhela', author: 'Tradición ancestral' },
      { text: 'Quien porta una esmeralda, porta la tierra misma', author: 'Leyenda Muisca' },
      { text: 'La claridad de la gema refleja la claridad del espíritu', author: 'Filosofía esmeralda' },
      { text: 'Cada inclusión cuenta una historia de millones de años', author: 'Gemología poética' },
      { text: 'El poder de la esmeralda reside en su imperfección perfecta', author: 'Maestros artesanos' },
    ];
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    return quotes[dayOfYear % quotes.length];
  }, []);

  return (
    <Box sx={{ px: 2, mb: 2 }} component="section" aria-labelledby="welcome-title">
      <motion.div
        initial="initial"
        animate="animate"
        variants={fadeInUp}
      >
        <motion.div
          variants={cardVariants}
          whileHover="hover"
          whileTap="tap"
        >
          <Card
            component="article"
            role="article"
            aria-label={`${t.pages.home.welcome}. Racha actual: ${current} días`}
            tabIndex={0}
            sx={{
              background: 'rgba(0, 80, 50, 0.6)',
              backdropFilter: 'blur(20px)',
              color: 'white',
              borderRadius: 4,
              overflow: 'hidden',
              position: 'relative',
              cursor: 'pointer',
              border: '1px solid rgba(255,255,255,0.15)',
              '&:focus-visible': {
                outline: '3px solid rgba(255, 255, 255, 0.8)',
                outlineOffset: 4,
              },
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: '-100%',
                width: '100%',
                height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                transition: 'transform 0.8s ease-out',
              },
              '&:hover::before': {
                transform: 'translateX(200%)',
              },
            }}
          >
            <CardContent sx={{ p: { xs: 2, sm: 3 }, position: 'relative', zIndex: 1 }}>
              {/* Top Row: Streak + Level Progress */}
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column-reverse', sm: 'row' },
                  justifyContent: 'space-between',
                  alignItems: { xs: 'stretch', sm: 'flex-start' },
                  gap: { xs: 2, sm: 0 },
                  mb: 2,
                }}
              >
                {/* Left: Welcome + Streak */}
                <Box sx={{ flex: 1 }}>
                  <Typography
                    id="welcome-title"
                    variant="h5"
                    component="h2"
                    sx={{
                      fontWeight: 700,
                      mb: 0.5,
                      fontSize: { xs: '1.25rem', sm: '1.5rem' },
                    }}
                  >
                    {t.pages.home.welcome}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      opacity: 0.9,
                      mb: 1.5,
                      fontSize: { xs: '0.8rem', sm: '0.875rem' },
                    }}
                  >
                    Tu viaje esmeralda continúa
                  </Typography>

                  {/* Enhanced Streak Badge */}
                  <StreakBadge
                    current={current}
                    longest={longest}
                    isAtRisk={isStreakAtRisk}
                    size="medium"
                    showRecord={true}
                  />
                </Box>

                {/* Right: Level Progress Ring */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3, ...spring.smooth }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: { xs: 'row', sm: 'column' },
                      alignItems: 'center',
                      justifyContent: { xs: 'flex-start', sm: 'center' },
                      ml: { xs: 0, sm: 2 },
                      gap: { xs: 1.5, sm: 0 },
                    }}
                  >
                    <ProgressRing
                      progress={gamification.levelProgress}
                      size={72}
                      strokeWidth={6}
                      color="gradient"
                      showPercentage={false}
                      label={`Nivel ${gamification.level}`}
                    >
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 700,
                          color: 'white',
                          lineHeight: 1,
                        }}
                      >
                        {gamification.level}
                      </Typography>
                    </ProgressRing>
                    <Box sx={{ display: { xs: 'flex', sm: 'block' }, flexDirection: 'column', alignItems: { xs: 'flex-start', sm: 'center' } }}>
                      <Typography
                        variant="caption"
                        sx={{
                          color: goldAccent.light,
                          fontWeight: 600,
                          mt: { xs: 0, sm: 0.5 },
                          textAlign: { xs: 'left', sm: 'center' },
                        }}
                      >
                        {gamification.levelTitle}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          display: { xs: 'block', sm: 'none' },
                          color: 'rgba(255,255,255,0.6)',
                          fontSize: '0.7rem',
                        }}
                      >
                        Nivel {gamification.level}
                      </Typography>
                    </Box>
                  </Box>
                </motion.div>
              </Box>

              {/* XP Progress Bar */}
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    {gamification.xp} XP Total
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    {gamification.xpToNextLevel > 0
                      ? `${gamification.xpToNextLevel} XP para nivel ${gamification.level + 1}`
                      : '¡Nivel máximo!'}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    height: 6,
                    bgcolor: 'rgba(255,255,255,0.2)',
                    borderRadius: 3,
                    overflow: 'hidden',
                  }}
                  role="progressbar"
                  aria-valuenow={gamification.levelProgress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Progreso de experiencia: ${Math.round(gamification.levelProgress)}%`}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${gamification.levelProgress}%` }}
                    transition={{ ...spring.smooth, duration: 1, delay: 0.5 }}
                    style={{
                      height: '100%',
                      background: `linear-gradient(90deg, ${goldAccent.light}, ${goldAccent.primary})`,
                      borderRadius: 'inherit',
                    }}
                  />
                </Box>
              </Box>

              {/* Next Milestone Progress */}
              {nextMilestone && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>
                    Próximo logro: {nextMilestone.label} ({nextMilestone.daysRemaining} días restantes)
                  </Typography>
                  <Box
                    sx={{
                      mt: 0.5,
                      height: 4,
                      bgcolor: 'rgba(255,255,255,0.2)',
                      borderRadius: 2,
                      overflow: 'hidden',
                    }}
                    role="progressbar"
                    aria-valuenow={current}
                    aria-valuemin={0}
                    aria-valuemax={nextMilestone.days}
                    aria-label={`Progreso hacia ${nextMilestone.label}`}
                  >
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(current / nextMilestone.days) * 100}%` }}
                      transition={{ ...spring.smooth, duration: 0.8 }}
                      style={{
                        height: '100%',
                        background: 'linear-gradient(90deg, rgba(255,255,255,0.4), rgba(255,255,255,0.8))',
                        borderRadius: 'inherit',
                      }}
                    />
                  </Box>
                </Box>
              )}

              {/* Daily Quote */}
              <Box
                sx={{
                  p: 2,
                  bgcolor: 'rgba(255,255,255,0.15)',
                  borderRadius: 2,
                  backdropFilter: 'blur(4px)',
                }}
              >
                <Typography
                  variant="body2"
                  sx={{ fontStyle: 'italic', lineHeight: 1.6 }}
                >
                  "{dailyQuote.text}"
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ opacity: 0.7, display: 'block', mt: 1 }}
                >
                  — {dailyQuote.author}
                </Typography>
              </Box>
            </CardContent>

            {/* Decorative gradient overlay */}
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '50%',
                height: '100%',
                background: 'radial-gradient(circle at 100% 0%, rgba(212, 175, 55, 0.15) 0%, transparent 50%)',
                pointerEvents: 'none',
              }}
            />
          </Card>
        </motion.div>
      </motion.div>
    </Box>
  );
};

export default WelcomeCard;
