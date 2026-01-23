/**
 * GlassCard Component
 * iOS-style glass morphism card wrapper.
 * Extracted from AdminAnalyticsPage.
 */

import React from 'react';
import { Paper, alpha } from '@mui/material';
import { useThemeMode } from '../../contexts/ThemeContext';
import { iosDimensions } from '../../design-system/tokens/primitives/spacing';

export interface GlassCardProps {
  children: React.ReactNode;
  /** Remove default padding */
  noPadding?: boolean;
  /** Optional click handler */
  onClick?: () => void;
}

const GlassCard: React.FC<GlassCardProps> = ({ children, noPadding = false, onClick }) => {
  const { mode } = useThemeMode();
  const isLight = mode === 'light';

  return (
    <Paper
      elevation={0}
      onClick={onClick}
      sx={{
        borderRadius: iosDimensions.borderRadiusLarge,
        bgcolor: isLight ? 'background.paper' : alpha('#000', 0.2),
        border: `1px solid ${isLight ? alpha('#000', 0.08) : alpha('#fff', 0.1)}`,
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        ...(noPadding ? {} : { p: 2.5 }),
        ...(onClick && {
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: `0 8px 24px ${alpha('#000', 0.08)}`,
          },
        }),
      }}
    >
      {children}
    </Paper>
  );
};

export default GlassCard;
