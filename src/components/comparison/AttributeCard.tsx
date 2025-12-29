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

          return (
            <Box
              key={idx}
              sx={{
                flex: 1,
                py: 1.25,
                px: 1,
                borderRadius: 1.5,
                bgcolor: isLight ? alpha('#000', 0.02) : alpha('#fff', 0.03),
                textAlign: 'center',
                minHeight: 40,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 500,
                  fontSize: type === 'numeric' ? '0.9rem' : '0.85rem',
                  color: indicator === 'best'
                    ? emeraldCore.primary
                    : indicator === 'worst'
                      ? alpha('#ef4444', 0.85)
                      : isLight ? surfacesLight.text.primary : surfacesDark.text.primary,
                  wordBreak: 'break-word',
                }}
              >
                {value}
              </Typography>
              {indicator !== 'neutral' && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.25,
                    mt: 0.25,
                  }}
                >
                  {indicator === 'best' ? (
                    <TrendingUp size={12} color={emeraldCore.primary} />
                  ) : (
                    <TrendingDown size={12} color="#ef4444" />
                  )}
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: '0.6rem',
                      color: indicator === 'best' ? emeraldCore.primary : '#ef4444',
                      textTransform: 'uppercase',
                      fontWeight: 600,
                    }}
                  >
                    {indicator === 'best' ? 'mejor' : 'menor'}
                  </Typography>
                </Box>
              )}
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
