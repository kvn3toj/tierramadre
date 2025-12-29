/**
 * StatItem - Shared stat display component for ambassador features
 *
 * Two variants:
 * - inline: Horizontal layout for compact displays (AmbassadorCard)
 * - stacked: Vertical layout with icon coloring (AmbassadorDirectory)
 */

import { Box, Typography } from '@mui/material';

interface StatItemProps {
  icon: React.ReactNode;
  value: string;
  label: string;
  color?: string;
  variant?: 'inline' | 'stacked';
}

export function StatItem({
  icon,
  value,
  label,
  color,
  variant = 'inline',
}: StatItemProps) {
  if (variant === 'stacked') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ color }}>{icon}</Box>
        <Box>
          <Typography
            variant="h6"
            sx={{ fontWeight: 700, fontSize: '1rem', lineHeight: 1, color }}
          >
            {value}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
            {label}
          </Typography>
        </Box>
      </Box>
    );
  }

  // Default: inline variant
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      {icon}
      <Typography variant="caption" sx={{ fontWeight: 700 }}>
        {value}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
        {label}
      </Typography>
    </Box>
  );
}

export default StatItem;
