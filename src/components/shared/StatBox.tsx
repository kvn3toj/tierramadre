/**
 * StatBox Component
 * Compact stat display widget with icon.
 * Consolidated from AsesorProfile and ProductViewersPage.
 */

import React from 'react';
import { Box, Typography, alpha } from '@mui/material';
import { useThemeMode } from '../../contexts/ThemeContext';
import { cssTransition } from '../../design-system';

export interface StatBoxProps {
  icon: React.ElementType;
  value: string | number;
  label: string;
  color: string;
  /** Compact mode for smaller displays */
  compact?: boolean;
  /** Optional click handler */
  onClick?: () => void;
}

const StatBox: React.FC<StatBoxProps> = ({
  icon: Icon,
  value,
  label,
  color,
  compact = false,
  onClick,
}) => {
  const { mode } = useThemeMode();
  const isLight = mode === 'light';

  return (
    <Box
      onClick={onClick}
      sx={{
        p: compact ? 1.5 : 2,
        borderRadius: 2,
        bgcolor: alpha(color, isLight ? 0.08 : 0.15),
        border: `1px solid ${alpha(color, 0.2)}`,
        textAlign: 'center',
        cursor: onClick ? 'pointer' : 'default',
        transition: cssTransition.default,
        '&:hover': onClick ? {
          transform: 'translateY(-2px)',
          boxShadow: `0 4px 12px ${alpha(color, 0.15)}`,
        } : {},
      }}
    >
      <Icon size={compact ? 18 : 20} color={color} style={{ marginBottom: 4 }} />
      <Typography
        variant={compact ? 'h6' : 'h5'}
        sx={{ fontWeight: 700, color }}
      >
        {typeof value === 'number' ? value.toLocaleString() : value}
      </Typography>
      <Typography
        variant="caption"
        sx={{ color: 'text.secondary', fontSize: compact ? '0.65rem' : '0.75rem' }}
      >
        {label}
      </Typography>
    </Box>
  );
};

export default StatBox;
