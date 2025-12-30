/**
 * AttributeCard Component
 * Neutral, fact-based comparison card - no judgments, just data.
 */
import { Box, Paper, Typography, alpha } from '@mui/material';
import { useThemeMode } from '../../contexts/ThemeContext';
import { emeraldCore, surfacesLight, surfacesDark } from '../../design-system/tokens/colors';

interface AttributeCardProps {
  label: string;
  values: React.ReactNode[];
  type?: 'numeric' | 'text' | 'color' | 'badge';
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
        {values.map((value, idx) => (
          <Box
            key={idx}
            sx={{
              flex: 1,
              py: 0.5,
              px: 0.75,
              borderRadius: 1.5,
              // Subtle highlight when values differ - no judgment
              bgcolor: valuesAreDifferent
                ? alpha(emeraldCore.primary, isLight ? 0.06 : 0.08)
                : isLight
                  ? alpha('#000', 0.02)
                  : alpha('#fff', 0.02),
              textAlign: 'center',
              minHeight: 36,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography
              component="div"
              sx={{
                fontWeight: 500,
                fontSize: type === 'numeric' ? '0.8rem' : '0.75rem',
                color: isLight
                  ? surfacesLight.text.primary
                  : surfacesDark.text.primary,
                wordBreak: 'break-word',
                lineHeight: 1.2,
              }}
            >
              {value}
            </Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  );
}
