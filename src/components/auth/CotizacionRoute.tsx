/**
 * CotizacionRoute - Protected route wrapper for the Cuentas / cotizaciones flow.
 * Allows staff (admin, embajador, asesor) AND special guests (invitado especial),
 * who can create client cotizaciones from inventory. Blocks plain guests and
 * providers with a friendly message.
 */

import { Box, Typography, Button, alpha } from '@mui/material';
import { UserX, Home } from 'lucide-react';
import { useCanCreateCotizaciones } from '../../hooks/usePermissions';
import { emeraldCore } from '../../design-system/tokens/colors';

interface CotizacionRouteProps {
  children: React.ReactNode;
}

export default function CotizacionRoute({ children }: CotizacionRouteProps) {
  const canCreateCotizaciones = useCanCreateCotizaciones();

  if (!canCreateCotizaciones) {
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
          <UserX size={40} color={emeraldCore.primary} />
        </Box>

        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            mb: 1,
          }}
        >
          Acceso Exclusivo
        </Typography>

        <Typography
          variant="body2"
          sx={{
            color: 'text.secondary',
            mb: 4,
            maxWidth: 300,
          }}
        >
          Esta sección es exclusiva para el equipo de Tierra Madre. Contacta al
          equipo si necesitas acceso.
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
