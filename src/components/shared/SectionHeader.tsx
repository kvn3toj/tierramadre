/**
 * SectionHeader Component
 * iOS-style section header with icon and optional action.
 * Extracted from AdminAnalyticsPage.
 */

import React from 'react';
import { Box, Typography } from '@mui/material';
import { emeraldCore } from '../../design-system/tokens/colors';

export interface SectionHeaderProps {
  title: string;
  icon?: React.ElementType;
  /** Optional action element (button, link, etc.) */
  action?: React.ReactNode;
  /** Icon color (default: emeraldCore.primary) */
  iconColor?: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  icon: Icon,
  action,
  iconColor = emeraldCore.primary,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        mb: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {Icon && <Icon size={16} color={iconColor} />}
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 700,
            color: 'text.secondary',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            fontSize: '0.7rem',
          }}
        >
          {title}
        </Typography>
      </Box>
      {action}
    </Box>
  );
};

export default SectionHeader;
