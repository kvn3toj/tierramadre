/**
 * ActivityItem Component
 * iOS-style activity list item for timelines and feeds.
 * Extracted from AdminAnalyticsPage.
 */

import React from 'react';
import { Box, Typography, alpha } from '@mui/material';
import { useThemeMode } from '../../contexts/ThemeContext';
import { cssTransition, fontWeights } from '../../design-system';

export interface ActivityItemProps {
  icon: React.ReactNode;
  primary: React.ReactNode;
  secondary?: string;
  time: string;
  /** Whether this is the last item (removes bottom border) */
  isLast?: boolean;
  /** Optional click handler */
  onClick?: () => void;
}

const ActivityItem: React.FC<ActivityItemProps> = ({
  icon,
  primary,
  secondary,
  time,
  isLast,
  onClick,
}) => {
  const { mode } = useThemeMode();
  const isLight = mode === 'light';

  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        py: 1.5,
        px: 2,
        borderBottom: isLast ? 'none' : `1px solid ${alpha(isLight ? '#000' : '#fff', 0.06)}`,
        cursor: onClick ? 'pointer' : 'default',
        transition: cssTransition.fast,
        '&:hover': onClick ? {
          bgcolor: alpha(isLight ? '#000' : '#fff', 0.03),
        } : {},
      }}
    >
      {icon}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="body2"
          sx={{
            fontWeight: fontWeights.medium,
            fontSize: '0.8rem',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {primary}
        </Typography>
        {secondary && (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {secondary}
          </Typography>
        )}
      </Box>
      <Typography variant="caption" sx={{ color: 'text.disabled', flexShrink: 0 }}>
        {time}
      </Typography>
    </Box>
  );
};

export default ActivityItem;
