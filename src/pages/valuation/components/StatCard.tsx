/**
 * StatCard - Reusable stat display component
 */

import React from 'react';
import { Box, Typography } from '@mui/material';

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
        fontSize: '11px',
        color: 'text.secondary',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        mb: 0.5,
      }}
    >
      {label}
    </Typography>
    <Typography
      sx={{
        fontSize: '1.25rem',
        fontWeight: 700,
        color,
        lineHeight: 1,
      }}
    >
      {value}{suffix}
    </Typography>
  </Box>
);

export default StatCard;
