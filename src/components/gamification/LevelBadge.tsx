/**
 * Level Badge Component
 *
 * Displays user's current level, XP progress, and achievement stats.
 * Compact and elegant design for headers/profiles.
 */

import React from 'react';
import { Box, Typography, Tooltip, alpha } from '@mui/material';
import { Trophy, Zap, Star } from 'lucide-react';
import { useThemeMode } from '../../contexts/ThemeContext';
import { useTracking } from '../../contexts/TrackingContext';
import { emeraldCore, goldAccent } from '../../design-system/tokens/colors';
import { cssTransition, accentColors, primitiveColors } from '../../design-system';
import ProgressRing from './ProgressRing';

interface LevelBadgeProps {
  /** Compact mode for headers */
  compact?: boolean;
  /** Show achievement count */
  showAchievements?: boolean;
}

const LevelBadge: React.FC<LevelBadgeProps> = ({
  compact = false,
  showAchievements = true,
}) => {
  const { mode } = useThemeMode();
  const { achievements, levelInfo, unlockedAchievements, metrics } = useTracking();
  const isLight = mode === 'light';

  // Level colors based on level
  const getLevelColor = (level: number): string => {
    if (level >= 6) return goldAccent.primary; // Leyenda
    if (level >= 5) return accentColors.purple.light; // Gran Maestro - Purple
    if (level >= 4) return accentColors.pink.light; // Maestro - Pink
    if (level >= 3) return emeraldCore.primary; // Experto - Emerald
    if (level >= 2) return accentColors.info.light; // Conocedor - Blue
    return primitiveColors.metallic.silver[500]; // Aprendiz - Gray
  };

  const levelColor = getLevelColor(levelInfo.level);

  if (compact) {
    return (
      <Tooltip
        title={
          <Box sx={{ p: 0.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Nivel {levelInfo.level}: {levelInfo.name}
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', opacity: 0.8 }}>
              {achievements.totalXp} XP total
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', opacity: 0.8 }}>
              {unlockedAchievements.length} logros desbloqueados
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', opacity: 0.8 }}>
              {metrics.streak} días consecutivos
            </Typography>
          </Box>
        }
        arrow
      >
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.75,
            px: 1.5,
            py: 0.5,
            borderRadius: 2,
            bgcolor: alpha(levelColor, 0.1),
            border: `1px solid ${alpha(levelColor, 0.3)}`,
            cursor: 'pointer',
            transition: cssTransition.default,
            '&:hover': {
              bgcolor: alpha(levelColor, 0.15),
              transform: 'translateY(-1px)',
            },
          }}
        >
          <ProgressRing
            progress={levelInfo.progress}
            size={24}
            strokeWidth={3}
            color={levelColor}
          >
            <Typography
              sx={{
                fontSize: 10,
                fontWeight: 800,
                color: levelColor,
              }}
            >
              {levelInfo.level}
            </Typography>
          </ProgressRing>

          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                color: levelColor,
                fontSize: '0.7rem',
                lineHeight: 1,
                display: 'block',
              }}
            >
              {levelInfo.name}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: isLight ? 'text.secondary' : alpha('#fff', 0.6),
                fontSize: '0.65rem',
                lineHeight: 1,
              }}
            >
              {achievements.totalXp} XP
            </Typography>
          </Box>
        </Box>
      </Tooltip>
    );
  }

  // Full badge for profile pages
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        p: 3,
        borderRadius: 3,
        bgcolor: isLight ? 'background.paper' : alpha('#000', 0.2),
        border: `1px solid ${alpha(levelColor, 0.2)}`,
      }}
    >
      {/* Level ring */}
      <ProgressRing
        progress={levelInfo.progress}
        size={80}
        strokeWidth={6}
        color={levelColor}
      >
        <Box sx={{ textAlign: 'center' }}>
          <Typography
            sx={{
              fontSize: 24,
              fontWeight: 800,
              color: levelColor,
              lineHeight: 1,
            }}
          >
            {levelInfo.level}
          </Typography>
        </Box>
      </ProgressRing>

      {/* Level name */}
      <Box sx={{ textAlign: 'center' }}>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            color: levelColor,
          }}
        >
          {levelInfo.name}
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: 'text.secondary' }}
        >
          {achievements.totalXp} / {levelInfo.nextLevelXp} XP
        </Typography>
      </Box>

      {/* Stats row */}
      <Box
        sx={{
          display: 'flex',
          gap: 3,
          mt: 1,
        }}
      >
        {showAchievements && (
          <Box sx={{ textAlign: 'center' }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.5,
                color: goldAccent.dark,
              }}
            >
              <Trophy size={16} />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {unlockedAchievements.length}
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Logros
            </Typography>
          </Box>
        )}

        <Box sx={{ textAlign: 'center' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.5,
              color: emeraldCore.primary,
            }}
          >
            <Zap size={16} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {metrics.streak}
            </Typography>
          </Box>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Racha
          </Typography>
        </Box>

        <Box sx={{ textAlign: 'center' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.5,
              color: accentColors.pink.light,
            }}
          >
            <Star size={16} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {metrics.totalCotizaciones}
            </Typography>
          </Box>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Cotizaciones
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default LevelBadge;
