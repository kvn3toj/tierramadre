/**
 * ViewersList Component
 * List of viewers who viewed the product.
 */

import React from 'react';
import { Box, Typography, Paper, Chip, alpha } from '@mui/material';
import { Users, UserCheck, User, Clock } from 'lucide-react';
import { emeraldCore } from '../../../../design-system/tokens/colors';
import {
  formatTimeAgo,
  getRoleLabel,
  getRoleColor,
} from '../../../../utils/formatting';
import type { Viewer } from '../types';
import { DeviceIcon } from './DeviceIcon';

interface ViewersListProps {
  viewers: Viewer[];
  isLight: boolean;
}

export const ViewersList: React.FC<ViewersListProps> = ({
  viewers,
  isLight,
}) => {
  if (viewers.length === 0) {
    return null;
  }

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        bgcolor: isLight ? 'background.paper' : alpha('#000', 0.2),
        border: `1px solid ${isLight ? alpha('#000', 0.08) : alpha('#fff', 0.1)}`,
        overflow: 'hidden',
        mb: 3,
      }}
    >
      <Box
        sx={{
          px: 2.5,
          py: 1.5,
          borderBottom: `1px solid ${alpha('#000', 0.06)}`,
        }}
      >
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <Users size={16} color={emeraldCore.primary} />
          Quién vio este producto ({viewers.length})
        </Typography>
      </Box>
      {viewers.map((viewer, idx) => (
        <Box
          key={viewer.email || viewer.name + idx}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            px: 2.5,
            py: 1.5,
            borderBottom:
              idx < viewers.length - 1
                ? `1px solid ${alpha('#000', 0.06)}`
                : 'none',
          }}
        >
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              bgcolor: alpha(
                viewer.isLoggedIn ? emeraldCore.primary : '#6B7280',
                0.12,
              ),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {viewer.isLoggedIn ? (
              <UserCheck size={18} color={emeraldCore.primary} />
            ) : (
              <User size={18} color="#6B7280" />
            )}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 500,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {viewer.name}
              </Typography>
              {viewer.isLoggedIn && (
                <Chip
                  label={getRoleLabel(viewer.role)}
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: '0.65rem',
                    bgcolor: alpha(getRoleColor(viewer.role), 0.15),
                    color: getRoleColor(viewer.role),
                  }}
                />
              )}
            </Box>
            <Box
              sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}
            >
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {viewer.views} {viewer.views === 1 ? 'vista' : 'vistas'}
              </Typography>
              {viewer.devices?.length > 0 && (
                <>
                  <Box
                    sx={{
                      width: 3,
                      height: 3,
                      borderRadius: '50%',
                      bgcolor: 'text.disabled',
                    }}
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {viewer.devices.slice(0, 2).map((device) => (
                      <DeviceIcon key={device} device={device} size={12} />
                    ))}
                  </Box>
                </>
              )}
            </Box>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              <Clock size={12} />
              {formatTimeAgo(viewer.lastView)}
            </Typography>
          </Box>
        </Box>
      ))}
    </Paper>
  );
};
