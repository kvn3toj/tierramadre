/**
 * LoadingFallback Component
 * Displays a loading spinner while lazy-loaded components are being fetched.
 * Used with React.Suspense for code-split routes.
 */
import { Box, CircularProgress, Typography } from '@mui/material';
import { emeraldCore } from '../design-system/tokens/colors';

interface LoadingFallbackProps {
  message?: string;
}

export default function LoadingFallback({ message = 'Cargando...' }: LoadingFallbackProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 300,
        gap: 2,
        py: 8,
      }}
    >
      <CircularProgress
        size={48}
        thickness={4}
        sx={{
          color: emeraldCore.primary,
        }}
      />
      <Typography
        variant="body2"
        sx={{
          color: 'text.secondary',
          fontWeight: 500,
        }}
      >
        {message}
      </Typography>
    </Box>
  );
}
