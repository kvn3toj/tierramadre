/**
 * DeviceBreakdown Component
 * Shows device type distribution with chips.
 */

import React from 'react';
import { Box, Typography, Paper, Chip, alpha } from '@mui/material';
import { Monitor } from 'lucide-react';
import { emeraldCore } from '../../../../design-system/tokens/colors';
import { DeviceIcon } from './DeviceIcon';

interface DeviceBreakdownProps {
  viewsByDevice: Record<string, number>;
  isLight: boolean;
}

export const DeviceBreakdown: React.FC<DeviceBreakdownProps> = ({
  viewsByDevice,
  isLight,
}) => {
  if (Object.keys(viewsByDevice).length === 0) {
    return null;
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        mb: 3,
        borderRadius: 3,
        bgcolor: isLight ? 'background.paper' : alpha('#000', 0.2),
        border: `1px solid ${isLight ? alpha('#000', 0.08) : alpha('#fff', 0.1)}`,
      }}
    >
      <Typography
        variant="body2"
        sx={{
          fontWeight: 600,
          mb: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <Monitor size={16} color={emeraldCore.primary} />
        Dispositivos
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {Object.entries(viewsByDevice)
          .sort(([, a], [, b]) => b - a)
          .map(([device, count]) => (
            <Chip
              key={device}
              icon={<DeviceIcon device={device} />}
              label={`${device}: ${count}`}
              size="small"
              sx={{
                bgcolor: alpha(emeraldCore.primary, 0.1),
                '& .MuiChip-icon': { color: emeraldCore.primary },
              }}
            />
          ))}
      </Box>
    </Paper>
  );
};
