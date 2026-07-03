/**
 * SpecRow Component
 * iOS HIG-style specification row with icon, label, and value.
 */

import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { iosSeparators, iosLabels, fontSizes, fontWeights, qeFont } from '../../../../design-system';

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
  const separatorColor = isLight ? iosSeparators.default.light : iosSeparators.default.dark;
  const secondaryTextColor = isLight ? iosLabels.secondary.light : iosLabels.secondary.dark;

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
        <Typography sx={{ fontSize: fontSizes.lg, color: theme.palette.text.primary }}>
          {label}
        </Typography>
      </Box>
      <Typography
        component="div"
        sx={{
          fontSize: fontSizes.lg,
          fontWeight: fontWeights.medium,
          color: theme.palette.text.primary,
          fontFamily: qeFont.mono,
          letterSpacing: '0.01em',
          textAlign: 'right',
        }}
      >
        {value}
      </Typography>
    </Box>
  );
};

export default SpecRow;
