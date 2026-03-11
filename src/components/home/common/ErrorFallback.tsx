/**
 * ErrorFallback Component
 *
 * Error boundary fallback UI for home page sections.
 * Provides user-friendly error display with retry action.
 *
 * Refactored by: CoomÜnity Council - Evolutionary Refactor
 */

import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { blurValues } from '../../../design-system';
import { useLanguage } from '../../../contexts/LanguageContext';
import { FallbackProps } from 'react-error-boundary';

// =============================================================================
// COMPONENT
// =============================================================================

export const ErrorFallback: React.FC<FallbackProps> = ({
  error,
  resetErrorBoundary,
}) => {
  const { t } = useLanguage();

  return (
    <Box
      role="alert"
      sx={{
        p: 3,
        m: 2,
        textAlign: 'center',
        bgcolor: 'rgba(255,255,255,0.1)',
        borderRadius: 3,
        backdropFilter: `blur(${blurValues.sm})`,
      }}
    >
      <Typography
        variant="body1"
        sx={{ color: 'rgba(255,200,200,0.9)', mb: 2 }}
      >
        {t.error.sectionFailed}
      </Typography>
      <Typography
        variant="caption"
        sx={{ color: 'rgba(255,255,255,0.6)', display: 'block', mb: 2 }}
      >
        {error.message}
      </Typography>
      <Button
        variant="outlined"
        size="small"
        onClick={resetErrorBoundary}
        sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}
      >
        Reintentar
      </Button>
    </Box>
  );
};

export default ErrorFallback;
