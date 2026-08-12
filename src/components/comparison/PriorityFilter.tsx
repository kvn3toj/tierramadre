/**
 * PriorityFilter Component
 * iOS-style pills to filter/reorder comparison by user's priority.
 */
import { Box, Typography, alpha } from '@mui/material';
import { TrendingUp, Gem, Award, DollarSign } from 'lucide-react';
import { useThemeMode } from '../../contexts/ThemeContext';
import { surfacesLight, surfacesDark } from '../../design-system/tokens/colors';
import { cssTransition, getQuietEmerald } from '../../design-system';

export type ComparisonPriority = 'todos' | 'inversion' | 'tamano' | 'calidad';

interface PriorityFilterProps {
  priority: ComparisonPriority;
  onPriorityChange: (priority: ComparisonPriority) => void;
}

const priorities: Array<{
  key: ComparisonPriority;
  label: string;
  icon: typeof TrendingUp;
  description: string;
}> = [
  {
    key: 'todos',
    label: 'Mejor Valor',
    icon: Gem,
    description: 'Relación calidad-precio óptima',
  },
  {
    key: 'inversion',
    label: 'Inversión',
    icon: TrendingUp,
    description: 'Potencial de valorización',
  },
  {
    key: 'tamano',
    label: 'Tamaño',
    icon: DollarSign,
    description: 'Mayor quilataje',
  },
  {
    key: 'calidad',
    label: 'Calidad',
    icon: Award,
    description: 'Excelencia premium',
  },
];

export default function PriorityFilter({
  priority,
  onPriorityChange,
}: PriorityFilterProps) {
  const { mode } = useThemeMode();
  const isLight = mode === 'light';
  const qe = getQuietEmerald(mode);

  return (
    <Box
      sx={{
        px: 1.5,
        py: 1,
        borderBottom: '1px solid',
        borderColor: isLight
          ? surfacesLight.border.light
          : surfacesDark.border.light,
        bgcolor: isLight
          ? surfacesLight.background.primary
          : surfacesDark.background.primary,
      }}
    >
      <Typography
        variant="caption"
        sx={{
          display: 'block',
          mb: 0.75,
          color: 'text.secondary',
          fontSize: '0.6rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        ¿Qué te interesa comparar?
      </Typography>
      <Box
        sx={{
          display: 'flex',
          gap: 0.5,
          overflowX: 'auto',
          pb: 0.5,
          '&::-webkit-scrollbar': { display: 'none' },
          msOverflowStyle: 'none',
          scrollbarWidth: 'none',
        }}
      >
        {priorities.map(({ key, label, icon: Icon, description }) => {
          const isActive = priority === key;
          return (
            <Box
              key={key}
              onClick={() => onPriorityChange(key)}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 0.25,
                px: 1,
                py: 0.75,
                borderRadius: 2,
                cursor: 'pointer',
                transition: cssTransition.default,
                border: '1px solid',
                borderColor: isActive
                  ? qe.accent // Jewelry-Not-Paint: border on a clickable pill
                  : isLight
                    ? surfacesLight.border.default
                    : surfacesDark.border.default,
                bgcolor: isActive
                  ? alpha(qe.accent, isLight ? 0.1 : 0.15) // Jewelry-Not-Paint: fill on a clickable pill
                  : 'transparent',
                flexShrink: 0,
                minWidth: 70,
                '&:hover': {
                  borderColor: qe.accent, // Jewelry-Not-Paint
                  bgcolor: alpha(qe.accent, 0.05), // Jewelry-Not-Paint
                  transform: 'translateY(-1px)',
                },
              }}
            >
              <Icon
                size={14}
                color={
                  isActive ? qe.accent : qe.muted // Jewelry-Not-Paint: icon color on a clickable pill
                }
                strokeWidth={2.5}
              />
              <Typography
                sx={{
                  fontSize: '0.65rem',
                  fontWeight: isActive ? 700 : 600,
                  color: isActive
                    ? qe.accent // Jewelry-Not-Paint: label text color on a clickable pill
                    : isLight
                      ? surfacesLight.text.primary
                      : surfacesDark.text.primary,
                  whiteSpace: 'nowrap',
                  textAlign: 'center',
                }}
              >
                {label}
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.5rem',
                  color: isLight
                    ? surfacesLight.text.tertiary
                    : surfacesDark.text.tertiary,
                  whiteSpace: 'nowrap',
                  textAlign: 'center',
                  opacity: isActive ? 1 : 0.7,
                }}
              >
                {description}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
