/**
 * RecentActivity Component
 * Recent view activity timeline.
 */

import React from 'react';
import { Box, Typography, Paper, alpha } from '@mui/material';
import { TrendingUp, UserCheck, User } from 'lucide-react';
import { emeraldCore, semanticColors } from '../../../../design-system/tokens/colors';
import { formatTimeAgo } from '../../../../utils/formatting';
import type { RecentView } from '../types';
import { DeviceIcon } from './DeviceIcon';

interface RecentActivityProps {
  recentViews: RecentView[];
  isLight: boolean;
}

export const RecentActivity: React.FC<RecentActivityProps> = ({ recentViews, isLight }) => {
  if (recentViews.length === 0) {
    return null;
  }

  const displayedViews = recentViews.slice(0, 20);

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        bgcolor: isLight ? 'background.paper' : alpha('#000', 0.2),
        border: `1px solid ${isLight ? alpha('#000', 0.08) : alpha('#fff', 0.1)}`,
        overflow: 'hidden',
      }}
    >
      <Box sx={{ px: 2.5, py: 1.5, borderBottom: `1px solid ${alpha('#000', 0.06)}` }}>
        <Typography
          variant="body2"
          sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <TrendingUp size={16} color={semanticColors.info.main} />
          Actividad Reciente
        </Typography>
      </Box>
      {displayedViews.map((view, idx) => (
        <Box
          key={`${view.timestamp}-${idx}`}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            px: 2.5,
            py: 1,
            borderBottom:
              idx < displayedViews.length - 1 ? `1px solid ${alpha('#000', 0.04)}` : 'none',
          }}
        >
          <Box
            sx={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              bgcolor: view.isLoggedIn ? alpha(emeraldCore.primary, 0.1) : alpha('#000', 0.05),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {view.isLoggedIn ? (
              <UserCheck size={12} color={emeraldCore.primary} />
            ) : (
              <User size={12} color={isLight ? '#666' : '#999'} />
            )}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 500,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                display: 'block',
              }}
            >
              {view.userName}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DeviceIcon device={view.deviceType} size={12} />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {formatTimeAgo(view.timestamp)}
            </Typography>
          </Box>
        </Box>
      ))}
    </Paper>
  );
};
