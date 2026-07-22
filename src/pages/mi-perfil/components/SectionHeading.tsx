/**
 * SectionHeading
 *
 * Shared label for profile sections. Tight, editorial, optional trailing action
 * slot on the right (e.g. "Ver todas").
 */

import { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';
import { iosTypographyScale } from '../../../design-system';

interface SectionHeadingProps {
  children: ReactNode;
  action?: ReactNode;
  /** Slightly indent label to align with card content — default true. */
  inset?: boolean;
}

export function SectionHeading({ children, action, inset = true }: SectionHeadingProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        mb: 1,
        px: inset ? 0.5 : 0,
      }}
    >
      <Typography
        variant="overline"
        sx={{
          fontSize: '0.6875rem',
          fontWeight: 600,
          lineHeight: 1,
          color: 'var(--text-tertiary)',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
        }}
      >
        {children}
      </Typography>
      {action && (
        <Box
          sx={{
            fontSize: iosTypographyScale.caption2,
            fontWeight: 600,
            color: 'var(--text-secondary)',
          }}
        >
          {action}
        </Box>
      )}
    </Box>
  );
}
