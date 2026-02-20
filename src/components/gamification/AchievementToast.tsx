/**
 * Achievement Toast Component
 *
 * Displays a celebration toast when user unlocks an achievement.
 * Auto-dismisses after 4 seconds or on user tap.
 */

import React, { useEffect } from 'react';
import { Box, Typography, Slide, alpha } from '@mui/material';
import { useTracking } from '../../contexts/TrackingContext';
import { useThemeMode } from '../../contexts/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { emeraldCore, goldAccent } from '../../design-system/tokens/colors';
import { blurValues } from '../../design-system';

const AUTO_DISMISS_MS = 4000;

// Feature flag: Only show achievements to admins during testing phase
const ADMIN_ONLY_MODE = true;

const AchievementToast: React.FC = () => {
  const { recentAchievement, dismissAchievement } = useTracking();
  const { mode } = useThemeMode();
  const { accessLevel } = useAuth();
  const prefersReducedMotion = useReducedMotion();
  const isLight = mode === 'light';

  // Only show for admins during testing phase
  const isEnabled = !ADMIN_ONLY_MODE || accessLevel === 'admin';

  useEffect(() => {
    if (recentAchievement) {
      const timer = setTimeout(() => {
        dismissAchievement();
      }, AUTO_DISMISS_MS);

      return () => clearTimeout(timer);
    }
  }, [recentAchievement, dismissAchievement]);

  if (!recentAchievement || !isEnabled) return null;

  return (
    <Slide direction="down" in={!!recentAchievement} mountOnEnter unmountOnExit>
      <Box
        onClick={dismissAchievement}
        sx={{
          position: 'fixed',
          top: { xs: 60, md: 80 },
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 2000,
          cursor: 'pointer',
          minWidth: 280,
          maxWidth: 'calc(100vw - 32px)',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            px: 3,
            py: 2,
            borderRadius: 3,
            background: isLight
              ? `linear-gradient(135deg, ${alpha(goldAccent.primary, 0.95)} 0%, ${alpha(emeraldCore.primary, 0.9)} 100%)`
              : `linear-gradient(135deg, ${alpha(goldAccent.dark, 0.95)} 0%, ${alpha(emeraldCore.dark, 0.9)} 100%)`,
            boxShadow: `0 8px 32px ${alpha('#000', 0.25)}, 0 0 0 1px ${alpha(goldAccent.primary, 0.3)}`,
            backdropFilter: `blur(${blurValues.md})`,
            animation: prefersReducedMotion ? 'none' : 'achievement-pop 0.4s ease-out',
            '@keyframes achievement-pop': {
              '0%': {
                transform: 'scale(0.8)',
                opacity: 0,
              },
              '50%': {
                transform: 'scale(1.05)',
              },
              '100%': {
                transform: 'scale(1)',
                opacity: 1,
              },
            },
          }}
        >
          {/* Icon */}
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: alpha('#fff', 0.2),
              fontSize: 24,
              flexShrink: 0,
            }}
          >
            {recentAchievement.icon}
          </Box>

          {/* Content */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="caption"
              sx={{
                color: alpha('#fff', 0.85),
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: 1,
                display: 'block',
                mb: 0.25,
              }}
            >
              Logro Desbloqueado
            </Typography>
            <Typography
              variant="subtitle1"
              sx={{
                color: '#fff',
                fontWeight: 700,
                lineHeight: 1.2,
              }}
            >
              {recentAchievement.name}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: alpha('#fff', 0.75),
                display: 'block',
                mt: 0.25,
              }}
            >
              +{recentAchievement.xp} XP
            </Typography>
          </Box>

          {/* Sparkle decoration */}
          <Box
            sx={{
              position: 'absolute',
              top: -8,
              right: -8,
              width: 24,
              height: 24,
              borderRadius: '50%',
              bgcolor: goldAccent.primary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              boxShadow: `0 2px 8px ${alpha(goldAccent.primary, 0.5)}`,
              animation: prefersReducedMotion ? 'none' : 'sparkle 1s ease-in-out infinite',
              '@keyframes sparkle': {
                '0%, 100%': {
                  transform: 'scale(1) rotate(0deg)',
                },
                '50%': {
                  transform: 'scale(1.1) rotate(15deg)',
                },
              },
            }}
          >
            ✨
          </Box>
        </Box>
      </Box>
    </Slide>
  );
};

export default AchievementToast;
