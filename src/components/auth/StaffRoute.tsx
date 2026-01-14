/**
 * StaffRoute - Protected route wrapper for staff-only pages
 * Allows admins and full access users (asesores/embajadores)
 * Blocks guests and providers with a friendly message
 */

import { Box, Typography, Button, alpha } from '@mui/material';
import { UserX, Home } from 'lucide-react';
import { useIsStaff } from '../../hooks/usePermissions';
import { emeraldCore } from '../../design-system/tokens/colors';

interface StaffRouteProps {
  children: React.ReactNode;
}

export default function StaffRoute({ children }: StaffRouteProps) {
  const isStaff = useIsStaff();

  if (!isStaff) {
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
          Esta sección es exclusiva para asesores y embajadores de Tierra Madre.
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
