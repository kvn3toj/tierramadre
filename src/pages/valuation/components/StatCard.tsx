/**
 * StatCard - Reusable stat display component
 */

import React from 'react';
import { Box, Typography } from '@mui/material';
import { fontSizes, fontWeights, letterSpacing } from '../../../design-system';

interface StatCardProps {
  label: string;
  value: string | number;
  color?: string;
  suffix?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, color = 'text.primary', suffix = '' }) => (
  <Box sx={{ textAlign: 'center' }}>
    <Typography
      sx={{
        fontSize: fontSizes.xs,
        color: 'text.secondary',
        textTransform: 'uppercase',
        letterSpacing: letterSpacing.wide,
        mb: 0.5,
      }}
    >
      {label}
    </Typography>
    <Typography
      sx={{
        fontSize: fontSizes['3xl'],
        fontWeight: fontWeights.bold,
        color,
        lineHeight: 1,
      }}
    >
      {value}{suffix}
    </Typography>
  </Box>
);

export default StatCard;
