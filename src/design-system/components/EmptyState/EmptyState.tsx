/**
 * EmptyState — the ONE "nothing here" shell (DS v3, Fase 3 gap).
 *
 * Absorbs: treasure/browser/TreasureEmptyState's shell, admin/ProductViewers's
 * NoViews/NoCotizaciones. Geometry-matched (fixed icon well + text block) so
 * swapping loading → empty never shifts layout (CLS≈0).
 */
import React from 'react';
import { Box, Typography } from '@mui/material';
import { Button } from '../Button';

export interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  action?: { label: string; onClick: () => void };
  /** Extra content below the action (e.g. suggestion chips). */
  children?: React.ReactNode;
  compact?: boolean;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  subtitle,
  action,
  children,
  compact = false,
  className,
}) => {
  return (
    <Box
      className={className}
      role="status"
      sx={{
        textAlign: 'center',
        padding: compact ? '32px 20px' : '48px 24px',
        border: '1px dashed var(--tm-border)',
        borderRadius: 'var(--tm-radius-card)',
        backgroundColor: 'var(--tm-well)',
      }}
    >
      <Box
        aria-hidden
        sx={{
          width: compact ? 40 : 64,
          height: compact ? 40 : 64,
          borderRadius: '50%',
          backgroundColor: 'var(--tm-surface)',
          border: '1px solid var(--tm-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
          color: 'var(--tm-subtle)',
        }}
      >
        <Icon size={compact ? 20 : 32} />
      </Box>
      <Typography
        sx={{
          fontFamily: 'var(--tm-font-ui)',
          fontWeight: 600,
          fontSize: compact ? '0.9375rem' : '1.0625rem',
          color: 'var(--tm-text)',
          mb: subtitle ? 0.5 : 0,
        }}
      >
        {title}
      </Typography>
      {subtitle && (
        <Typography
          sx={{
            fontFamily: 'var(--tm-font-ui)',
            fontSize: '0.875rem',
            color: 'var(--tm-muted)',
            maxWidth: 360,
            margin: '0 auto',
          }}
        >
          {subtitle}
        </Typography>
      )}
      {action && (
        <Box sx={{ mt: 2.5 }}>
          <Button variant="outlined" size="sm" onClick={action.onClick}>
            {action.label}
          </Button>
        </Box>
      )}
      {children && <Box sx={{ mt: 2.5 }}>{children}</Box>}
    </Box>
  );
};

export default EmptyState;
