/**
 * ProgressBadge Component
 * Displays user's exploration progress with level and percentage.
 * Part of the gamification system.
 */
import {
  Box,
  Typography,
  LinearProgress,
  Tooltip,
  alpha,
} from '@mui/material';
import { Trophy, Star, Sparkles } from 'lucide-react';
import { useThemeMode } from '../contexts/ThemeContext';
import { emeraldCore, goldAccent, surfacesLight, surfacesDark } from '../design-system/tokens/colors';

type ExplorerLevel = 'Novato' | 'Entusiasta' | 'Coleccionista' | 'Experto' | 'Maestro';

interface ProgressBadgeProps {
  level: ExplorerLevel;
  percentageExplored: number;
  viewedCount: number;
  totalItems: number;
  levelProgress: number;
  nextLevel: ExplorerLevel | null;
  compact?: boolean;
}

const LEVEL_COLORS: Record<ExplorerLevel, string> = {
  Novato: '#6b7280',
  Entusiasta: '#3b82f6',
  Coleccionista: emeraldCore.primary,
  Experto: goldAccent.primary,
  Maestro: '#9333ea',
};

const LEVEL_ICONS: Record<ExplorerLevel, typeof Star> = {
  Novato: Star,
  Entusiasta: Star,
  Coleccionista: Trophy,
  Experto: Trophy,
  Maestro: Sparkles,
};

export default function ProgressBadge({
  level,
  percentageExplored,
  viewedCount,
  totalItems,
  levelProgress,
  nextLevel,
  compact = false,
}: ProgressBadgeProps) {
  const { mode } = useThemeMode();
  const isLight = mode === 'light';
  const levelColor = LEVEL_COLORS[level];
  const LevelIcon = LEVEL_ICONS[level];

  const tooltipContent = (
    <Box sx={{ p: 1 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
        Nivel: {level}
      </Typography>
      <Typography variant="body2" sx={{ mb: 0.5 }}>
        Has explorado {viewedCount} de {totalItems} esmeraldas ({percentageExplored}%)
      </Typography>
      {nextLevel && (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {100 - levelProgress}% para {nextLevel}
        </Typography>
      )}
    </Box>
  );

  if (compact) {
    return (
      <Tooltip title={tooltipContent} arrow>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            px: 1.5,
            py: 0.5,
            borderRadius: 2,
            bgcolor: alpha(levelColor, 0.1),
            border: '1px solid',
            borderColor: alpha(levelColor, 0.3),
            cursor: 'pointer',
          }}
        >
          <LevelIcon size={14} color={levelColor} />
          <Typography
            variant="caption"
            sx={{
              fontWeight: 600,
              color: levelColor,
            }}
          >
            {percentageExplored}%
          </Typography>
        </Box>
      </Tooltip>
    );
  }

  return (
    <Tooltip title={tooltipContent} arrow>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 2,
          py: 1,
          borderRadius: 2,
          bgcolor: isLight ? surfacesLight.background.secondary : surfacesDark.background.secondary,
          border: '1px solid',
          borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.default,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          '&:hover': {
            borderColor: levelColor,
            bgcolor: alpha(levelColor, 0.05),
          },
        }}
      >
        {/* Level icon */}
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            bgcolor: alpha(levelColor, 0.15),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <LevelIcon size={16} color={levelColor} />
        </Box>

        {/* Progress info */}
        <Box sx={{ minWidth: 100 }}>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mb: 0.5 }}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 700,
                color: levelColor,
              }}
            >
              {level}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {viewedCount}/{totalItems}
            </Typography>
          </Box>

          {/* Progress bar to next level */}
          <LinearProgress
            variant="determinate"
            value={levelProgress}
            sx={{
              height: 4,
              borderRadius: 2,
              bgcolor: alpha(levelColor, 0.15),
              '& .MuiLinearProgress-bar': {
                bgcolor: levelColor,
                borderRadius: 2,
              },
            }}
          />
        </Box>
      </Box>
    </Tooltip>
  );
}
