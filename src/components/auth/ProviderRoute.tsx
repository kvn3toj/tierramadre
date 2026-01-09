/**
 * ProviderRoute - Protected route wrapper for provider-only pages
 * Redirects non-provider users to home with an access denied message
 */

import { Box, Typography, Button, alpha } from '@mui/material';
import { Lock, Home } from 'lucide-react';
import { useIsProvider } from '../../hooks/usePermissions';
import { emeraldCore } from '../../design-system/tokens/colors';

interface ProviderRouteProps {
  children: React.ReactNode;
}

export default function ProviderRoute({ children }: ProviderRouteProps) {
  const isProvider = useIsProvider();

  if (!isProvider) {
    return (
      <Box
        sx={{
          minHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          px: 3,
          py: 6,
        }}
      >
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            bgcolor: alpha(emeraldCore.primary, 0.1),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 3,
          }}
        >
          <Lock size={40} color={emeraldCore.primary} />
        </Box>

        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            mb: 1,
          }}
        >
          Acceso Solo Proveedores
        </Typography>

        <Typography
          variant="body2"
          sx={{
            color: 'text.secondary',
            mb: 4,
            maxWidth: 300,
          }}
        >
          Esta sección es exclusiva para proveedores autorizados.
          Contacta al equipo si necesitas acceso.
        </Typography>

        <Button
          variant="contained"
          startIcon={<Home size={18} />}
          href="/home"
          sx={{
            bgcolor: emeraldCore.primary,
            '&:hover': { bgcolor: alpha(emeraldCore.primary, 0.87) },
            textTransform: 'none',
            fontWeight: 600,
            px: 4,
          }}
        >
          Volver al Inicio
        </Button>
      </Box>
    );
  }

  return <>{children}</>;
}
