/**
 * StatItem - Shared stat display component for ambassador features
 *
 * Two variants:
 * - inline: Horizontal layout for compact displays (AmbassadorCard)
 * - stacked: Mini glass stat card with icon background (AmbassadorDirectory)
 */

import { Box, Typography, alpha } from '@mui/material';
import { fontFamilies, cssTransition } from '../../design-system/index';

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
  const isZero = value === '0' || value === '$0';

  if (variant === 'stacked') {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          py: 1,
          px: 1.5,
          borderRadius: 2,
          transition: cssTransition.default,
          opacity: isZero ? 0.5 : 1,
          '&:hover': {
            bgcolor: color ? alpha(color, 0.06) : 'action.hover',
          },
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: color ? alpha(color, 0.1) : 'action.selected',
            color,
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography
            component="p"
            variant="h6"
            sx={{
              fontFamily: fontFamilies.mono,
              fontVariantNumeric: 'tabular-nums',
              fontWeight: 700,
              fontSize: '1rem',
              lineHeight: 1,
              color,
            }}
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
