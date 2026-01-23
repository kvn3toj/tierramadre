/**
 * SpecRow Component
 * iOS HIG-style specification row with icon, label, and value.
 */

import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';

interface SpecRowProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  showBorder?: boolean;
}

export const SpecRow: React.FC<SpecRowProps> = ({
  icon,
  label,
  value,
  showBorder = true,
}) => {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';
  const separatorColor = isLight ? 'rgba(60, 60, 67, 0.12)' : 'rgba(235, 235, 245, 0.12)';
  const secondaryTextColor = isLight ? 'rgba(60, 60, 67, 0.6)' : 'rgba(235, 235, 245, 0.6)';

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 36,
        py: 0.75,
        borderBottom: showBorder ? `0.5px solid ${separatorColor}` : undefined,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: secondaryTextColor }}>
        {icon}
        <Typography sx={{ fontSize: '15px', color: theme.palette.text.primary }}>
          {label}
        </Typography>
      </Box>
      <Typography
        component="div"
        sx={{
          fontSize: '15px',
          fontWeight: 500,
          color: theme.palette.text.primary,
          textAlign: 'right',
        }}
      >
        {value}
      </Typography>
    </Box>
  );
};

export default SpecRow;
