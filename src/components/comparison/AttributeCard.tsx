/**
 * AttributeCard Component
 * Neutral comparison card with subtle visual indicators for differences.
 */
import { Box, Paper, Typography, alpha } from '@mui/material';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useThemeMode } from '../../contexts/ThemeContext';
import { emeraldCore, surfacesLight, surfacesDark } from '../../design-system/tokens/colors';

interface AttributeCardProps {
  label: string;
  values: React.ReactNode[];
  type?: 'numeric' | 'text' | 'color' | 'badge';
}

/**
 * Extract numeric value from React.ReactNode for comparison
 */
function extractNumericValue(value: React.ReactNode): number | null {
  const str = String(value);
  // Try to extract number from strings like "$2.5M", "2.11 ct", "100", etc.
  const match = str.match(/[\d,.]+/);
  if (!match) return null;

  const num = parseFloat(match[0].replace(/,/g, ''));

  // Handle M (millions) suffix
  if (str.includes('M') || str.includes('m')) {
    return num * 1000000;
  }

  return num;
}

export default function AttributeCard({
  label,
  values,
  type = 'text',
}: AttributeCardProps) {
  const { mode } = useThemeMode();
  const isLight = mode === 'light';

  // Check if values are different (for subtle highlight)
  const valuesAreDifferent = values.length > 1 &&
    new Set(values.map(v => String(v))).size > 1;

  // For numeric types, determine highest/lowest
  const numericValues = type === 'numeric'
    ? values.map(v => extractNumericValue(v))
    : [];

  const hasNumericComparison = numericValues.every(v => v !== null);
  const maxValue = hasNumericComparison ? Math.max(...numericValues as number[]) : null;
  const minValue = hasNumericComparison ? Math.min(...numericValues as number[]) : null;

  return (
    <Paper
      elevation={0}
      sx={{
        mb: 0.75,
        borderRadius: 2,
        border: '1px solid',
        borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.light,
        bgcolor: isLight ? surfacesLight.background.primary : surfacesDark.background.secondary,
        overflow: 'hidden',
      }}
    >
      {/* Compact Header */}
      <Box
        sx={{
          px: 1.25,
          py: 0.5,
          bgcolor: isLight
            ? alpha(emeraldCore.primary, 0.04)
            : alpha(emeraldCore.primary, 0.06),
          borderBottom: '1px solid',
          borderColor: isLight
            ? alpha(emeraldCore.primary, 0.08)
            : alpha(emeraldCore.primary, 0.1),
        }}
      >
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 600,
            color: emeraldCore.dark,
            textTransform: 'uppercase',
            fontSize: '0.55rem',
            letterSpacing: '0.06em',
          }}
        >
          {label}
        </Typography>
      </Box>

      {/* Values - compact layout */}
      <Box sx={{ display: 'flex', gap: 0.5, p: 0.75 }}>
        {values.map((value, idx) => {
          // Determine if this value is highest/lowest for numeric comparison
          const numericVal = numericValues[idx];
          const isHighest = hasNumericComparison && numericVal === maxValue && maxValue !== minValue;
          const isLowest = hasNumericComparison && numericVal === minValue && maxValue !== minValue;

          // Determine indicator icon and color
          let IndicatorIcon = Minus;
          let indicatorColor: string = isLight ? surfacesLight.text.tertiary : surfacesDark.text.tertiary;

          if (isHighest) {
            IndicatorIcon = TrendingUp;
            indicatorColor = '#00AE7A'; // Emerald green
          } else if (isLowest) {
            IndicatorIcon = TrendingDown;
            indicatorColor = '#999';
          }

          return (
            <Box
              key={idx}
              sx={{
                flex: 1,
                py: 0.5,
                px: 0.75,
                borderRadius: 1.5,
                // Subtle highlight for highest values
                bgcolor: isHighest
                  ? alpha('#00AE7A', 0.08)
                  : valuesAreDifferent
                  ? alpha(emeraldCore.primary, isLight ? 0.04 : 0.06)
                  : isLight
                    ? alpha('#000', 0.02)
                    : alpha('#fff', 0.02),
                textAlign: 'center',
                minHeight: 36,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                border: isHighest ? '1px solid' : 'none',
                borderColor: isHighest ? alpha('#00AE7A', 0.2) : 'transparent',
              }}
            >
              {/* Subtle indicator for numeric values */}
              {type === 'numeric' && hasNumericComparison && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    opacity: 0.6,
                  }}
                >
                  <IndicatorIcon size={10} color={indicatorColor} strokeWidth={2.5} />
                </Box>
              )}
              <Typography
                component="div"
                sx={{
                  fontWeight: isHighest ? 600 : 500,
                  fontSize: type === 'numeric' ? '0.8rem' : '0.75rem',
                  color: isHighest
                    ? '#00AE7A'
                    : isLight
                      ? surfacesLight.text.primary
                      : surfacesDark.text.primary,
                  wordBreak: 'break-word',
                  lineHeight: 1.2,
                }}
              >
                {value}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
}
