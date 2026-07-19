/**
 * ErrorState — the ONE "something broke" shell (DS v3, Fase 3 gap).
 *
 * Same geometry as EmptyState (shared visual language, distinct semantics —
 * danger-toned icon, retry action) so a view can swap loading → error →
 * content without layout shift. Absorbs treasure/browser/TreasureErrorState.
 */
import React from 'react';
import { Box, Typography } from '@mui/material';
import { AlertTriangle } from 'lucide-react';
import { Button } from '../Button';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retrying?: boolean;
  /** Overrides the retry button's label (defaults to 'Reintentar' — pass a
   * translated string from the caller's i18n context when one is available). */
  retryLabel?: string;
  compact?: boolean;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Algo salió mal',
  message,
  onRetry,
  retrying = false,
  retryLabel = 'Reintentar',
  compact = false,
  className,
}) => {
  return (
    <Box
      className={className}
      role="alert"
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
          color: 'var(--tm-danger)',
        }}
      >
        <AlertTriangle size={compact ? 20 : 32} />
      </Box>
      <Typography
        sx={{
          fontFamily: 'var(--tm-font-ui)',
          fontWeight: 600,
          fontSize: compact ? '0.9375rem' : '1.0625rem',
          color: 'var(--tm-text)',
          mb: 0.5,
        }}
      >
        {title}
      </Typography>
      <Typography
        sx={{
          fontFamily: 'var(--tm-font-ui)',
          fontSize: '0.875rem',
          color: 'var(--tm-muted)',
          maxWidth: 360,
          margin: '0 auto',
        }}
      >
        {message}
      </Typography>
      {onRetry && (
        <Box sx={{ mt: 2.5 }}>
          <Button
            variant="outlined"
            size="sm"
            onClick={onRetry}
            loading={retrying}
          >
            {retryLabel}
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default ErrorState;
