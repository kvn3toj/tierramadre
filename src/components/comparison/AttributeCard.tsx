/**
 * AttributeCard Component
 * Single attribute comparison card for mobile view.
 * Shows all product values horizontally with best/worst indicators.
 */
import { Box, Paper, Typography, alpha } from '@mui/material';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useThemeMode } from '../../contexts/ThemeContext';
import { emeraldCore, surfacesLight, surfacesDark } from '../../design-system/tokens/colors';

export type ValueIndicator = 'best' | 'worst' | 'neutral';

interface AttributeCardProps {
  label: string;
  values: React.ReactNode[];
  indicators: ValueIndicator[];
  type?: 'numeric' | 'text' | 'color' | 'badge';
}

export default function AttributeCard({
  label,
  values,
  indicators,
  type = 'text',
}: AttributeCardProps) {
  const { mode } = useThemeMode();
  const isLight = mode === 'light';

  return (
    <Paper
      elevation={0}
      sx={{
        mb: 1.5,
        p: 2,
        borderRadius: 2,
        border: '1px solid',
        borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.light,
        bgcolor: isLight ? surfacesLight.background.primary : surfacesDark.background.secondary,
      }}
    >
      <Typography
        variant="subtitle2"
        sx={{
          fontWeight: 700,
          color: emeraldCore.dark,
          mb: 1.5,
          textTransform: 'uppercase',
          fontSize: '0.75rem',
          letterSpacing: '0.05em',
        }}
      >
        {label}
      </Typography>
      <Box sx={{ display: 'flex', gap: 1 }}>
        {values.map((value, idx) => {
          const indicator = indicators[idx];
          const bgColor =
            indicator === 'best'
              ? alpha(emeraldCore.primary, 0.15)
              : indicator === 'worst'
                ? alpha('#ef4444', 0.1)
                : isLight
                  ? alpha('#000', 0.03)
                  : alpha('#fff', 0.05);

          const borderColor =
            indicator === 'best'
              ? alpha(emeraldCore.primary, 0.3)
              : indicator === 'worst'
                ? alpha('#ef4444', 0.2)
                : 'transparent';

          return (
            <Box
              key={idx}
              sx={{
                flex: 1,
                p: 1.5,
                borderRadius: 1.5,
                bgcolor: bgColor,
                border: '1px solid',
                borderColor: borderColor,
                textAlign: 'center',
                minHeight: 44,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.5,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 0.5,
                }}
              >
                {indicator === 'best' && (
                  <TrendingUp size={14} color={emeraldCore.primary} />
                )}
                {indicator === 'worst' && (
                  <TrendingDown size={14} color="#ef4444" />
                )}
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: indicator !== 'neutral' ? 600 : 400,
                    fontSize: type === 'numeric' ? '0.9rem' : '0.85rem',
                    color: isLight ? surfacesLight.text.primary : surfacesDark.text.primary,
                    wordBreak: 'break-word',
                  }}
                >
                  {value}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
}

// Helper function to get value indicator
export function getValueIndicator(
  value: number,
  allValues: number[],
  higherIsBetter: boolean = true
): ValueIndicator {
  const validValues = allValues.filter(v => v > 0);
  if (validValues.length < 2) return 'neutral';

  const maxVal = Math.max(...validValues);
  const minVal = Math.min(...validValues);

  if (maxVal === minVal) return 'neutral';

  if (higherIsBetter) {
    if (value === maxVal) return 'best';
    if (value === minVal) return 'worst';
  } else {
    if (value === minVal) return 'best';
    if (value === maxVal) return 'worst';
  }
  return 'neutral';
}
