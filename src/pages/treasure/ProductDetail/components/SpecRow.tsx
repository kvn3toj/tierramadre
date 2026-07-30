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

/**
 * A spec value is "empty" when there is genuinely nothing to display.
 *
 * `0` is deliberately NOT empty — a zero measurement is data. Strings are
 * trimmed so a whitespace-only cell from the sheet counts as empty; callers
 * that gate on their own truthiness (e.g. `SpecificationsList`'s
 * `Boolean(product.coleccion)`) must trim too, or they draw a border for a
 * row this then removes, leaving an orphaned divider.
 */
export const isEmptySpecValue = (value: React.ReactNode): boolean => {
  if (value === null || value === undefined || value === false) return true;
  if (typeof value === 'string') return value.trim() === '';
  return false;
};

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

  // Drop the row entirely when there is nothing to show, rather than
  // rendering a labelled row with a blank right side and a divider.
  // Placed AFTER the hooks above — an early return before them would be a
  // conditional hook call. Numeric 0 counts as a value (0 is data, "" is not).
  if (isEmptySpecValue(value)) return null;

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
