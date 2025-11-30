import { ReactNode } from 'react';
import { Box, Paper, Typography, Button, alpha, useTheme } from '@mui/material';
import {
  gradients,
  radius,
  animation,
  getTokens,
  getShadows,
  getHeaderStyles,
  // Legacy exports for backwards compatibility
  studioColors,
  studioGradients,
  studioShadows,
  studioCardStyles,
} from '../design-system';

// Re-export design system tokens for backwards compatibility
export { studioColors, studioGradients, studioShadows, studioCardStyles };

interface PremiumHeaderProps {
  title: string;
  subtitle: string;
  icon: ReactNode;
  action?: {
    label: string;
    icon?: ReactNode;
    onClick: () => void;
    disabled?: boolean;
  };
  stats?: Array<{
    value: string | number;
    label: string;
    icon?: ReactNode;
  }>;
  progress?: {
    value: number;
    label: string;
  };
}

export default function PremiumHeader({
  title,
  subtitle,
  icon,
  action,
  stats,
  progress,
}: PremiumHeaderProps) {
  const theme = useTheme();
  const mode = theme.palette.mode;
  const tokens = getTokens(mode);
  const shadows = getShadows(mode);
  const headerStyle = getHeaderStyles(mode);

  return (
    <Box
      sx={{
        mb: 4,
        borderRadius: radius.xl,
        overflow: 'hidden',
        boxShadow: shadows.lg,
      }}
    >
      {/* Main Header */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 0,
          background: headerStyle.background,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative emerald accent line at top */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: headerStyle.accentLine,
          }}
        />

        {/* Subtle pattern overlay */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: 300,
            height: '100%',
            background: headerStyle.overlay,
            pointerEvents: 'none',
          }}
        />

        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
              {/* Icon container with emerald styling */}
              <Box
                sx={{
                  width: 52,
                  height: 52,
                  borderRadius: radius.lg,
                  background: alpha(headerStyle.brandColor, 0.15),
                  border: `1px solid ${alpha(headerStyle.brandColor, 0.3)}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: headerStyle.brandColor,
                }}
              >
                {icon}
              </Box>
              <Box>
                {/* Brand Label */}
                <Typography
                  variant="overline"
                  sx={{
                    color: headerStyle.brandColor,
                    fontWeight: 600,
                    letterSpacing: '0.12em',
                    fontSize: '0.625rem',
                    display: 'block',
                    mb: 0.25,
                  }}
                >
                  TM STUDIO
                </Typography>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 600,
                    color: headerStyle.titleColor,
                    fontFamily: '"Libre Baskerville", Georgia, serif',
                    letterSpacing: '-0.02em',
                    fontSize: '1.5rem',
                  }}
                >
                  {title}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: headerStyle.subtitleColor,
                    fontWeight: 400,
                    fontSize: '0.875rem',
                  }}
                >
                  {subtitle}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {/* Quick Stats in header */}
              {stats && stats.length > 0 && stats.length <= 2 && (
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  {stats.map((stat, index) => (
                    <Box
                      key={index}
                      sx={{
                        px: 2,
                        py: 1.25,
                        borderRadius: radius.md,
                        background: alpha('#FFFFFF', 0.1),
                        border: `1px solid ${alpha('#FFFFFF', 0.15)}`,
                        textAlign: 'center',
                        minWidth: 72,
                      }}
                    >
                      <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, color: '#FFFFFF', lineHeight: 1 }}>
                        {stat.value}
                      </Typography>
                      <Typography sx={{ fontSize: '0.625rem', color: alpha('#FFFFFF', 0.7), fontWeight: 500, mt: 0.25 }}>
                        {stat.label}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}

              {/* Action Button */}
              {action && (
                <Button
                  variant="contained"
                  startIcon={action.icon}
                  onClick={action.onClick}
                  disabled={action.disabled}
                  sx={{
                    background: gradients.emerald,
                    color: '#FFFFFF',
                    fontWeight: 600,
                    px: 3,
                    py: 1.25,
                    borderRadius: radius.md,
                    textTransform: 'none',
                    fontSize: '0.875rem',
                    boxShadow: shadows.emerald,
                    '&:hover': {
                      background: gradients.emeraldSoft,
                      boxShadow: shadows.emeraldLg,
                      transform: 'translateY(-1px)',
                    },
                    '&:disabled': {
                      background: alpha('#FFFFFF', 0.1),
                      color: alpha('#FFFFFF', 0.4),
                    },
                    transition: animation.transition.default,
                  }}
                >
                  {action.label}
                </Button>
              )}
            </Box>
          </Box>

          {/* Progress Bar */}
          {progress && (
            <Box sx={{ mt: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
                <Typography variant="caption" sx={{ color: alpha('#FFFFFF', 0.7), fontWeight: 500 }}>
                  {progress.label}
                </Typography>
                <Typography variant="caption" sx={{ color: headerStyle.brandColor, fontWeight: 600 }}>
                  {progress.value.toFixed(0)}%
                </Typography>
              </Box>
              <Box
                sx={{
                  height: 6,
                  borderRadius: radius.full,
                  bgcolor: alpha('#FFFFFF', 0.15),
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    height: '100%',
                    width: `${progress.value}%`,
                    borderRadius: radius.full,
                    background: gradients.emerald,
                    transition: 'width 0.3s ease',
                  }}
                />
              </Box>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Stats Row (when more than 2 stats) */}
      {stats && stats.length > 2 && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.min(stats.length, 4)}, 1fr)`,
            bgcolor: tokens.background.surface,
            borderTop: `1px solid ${tokens.border.default}`,
          }}
        >
          {stats.map((stat, index) => (
            <Box
              key={index}
              sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                borderRight: index < stats.length - 1 ? `1px solid ${tokens.border.default}` : 'none',
                transition: animation.transition.default,
                '&:hover': {
                  bgcolor: tokens.background.muted,
                },
              }}
            >
              {stat.icon && (
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: radius.md,
                    bgcolor: alpha(tokens.interactive.primary, 0.1),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: tokens.interactive.primary,
                  }}
                >
                  {stat.icon}
                </Box>
              )}
              <Box>
                <Typography
                  sx={{
                    fontSize: '1.125rem',
                    fontWeight: 700,
                    color: tokens.text.primary,
                    lineHeight: 1,
                  }}
                >
                  {stat.value}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: tokens.text.secondary,
                    fontWeight: 500,
                  }}
                >
                  {stat.label}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
