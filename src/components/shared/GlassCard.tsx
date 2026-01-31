/**
 * GlassCard Component
 * iOS-style glass morphism card wrapper.
 * Extracted from AdminAnalyticsPage.
 */

import React from 'react';
import { Paper } from '@mui/material';
import { iosDimensions } from '../../design-system/tokens/primitives/spacing';

export interface GlassCardProps {
  children: React.ReactNode;
  /** Remove default padding */
  noPadding?: boolean;
  /** Optional click handler */
  onClick?: () => void;
}

const GlassCard: React.FC<GlassCardProps> = ({ children, noPadding = false, onClick }) => {
  return (
    <Paper
      elevation={0}
      onClick={onClick}
      sx={{
        borderRadius: iosDimensions.borderRadiusLarge,
        bgcolor: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        ...(noPadding ? {} : { p: 2.5 }),
        ...(onClick && {
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: 'var(--shadow-md)',
          },
        }),
      }}
    >
      {children}
    </Paper>
  );
};

export default GlassCard;
