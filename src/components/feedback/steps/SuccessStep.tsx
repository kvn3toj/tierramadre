/**
 * SuccessStep - Submission Success Step
 *
 * Confirmation that feedback was submitted.
 */

import { Box, Typography, Stack } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DashboardIcon from '@mui/icons-material/Dashboard';
import CloseIcon from '@mui/icons-material/Close';
import { alpha } from '@mui/material/styles';
import { Button } from '../../../design-system/components/Button';
import { emeraldCore } from '../../../design-system/tokens/colors';

interface SuccessStepProps {
  feedbackId: string;
  onClose: () => void;
  onViewDashboard: () => void;
}

export default function SuccessStep({
  feedbackId,
  onClose,
  onViewDashboard,
}: SuccessStepProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        textAlign: 'center',
        gap: 3,
      }}
    >
      {/* Success icon */}
      <CheckCircleIcon
        sx={{
          fontSize: 80,
          color: emeraldCore.primary,
          animation: 'pop 0.3s ease-out',
          '@keyframes pop': {
            '0%': { transform: 'scale(0)' },
            '70%': { transform: 'scale(1.1)' },
            '100%': { transform: 'scale(1)' },
          },
        }}
      />

      {/* Success message */}
      <Box>
        <Typography
          variant="h5"
          sx={{
            color: 'white',
            fontWeight: 600,
            mb: 1,
          }}
        >
          ¡Feedback Enviado!
        </Typography>
        <Typography
          sx={{
            color: alpha('#fff', 0.7),
            fontSize: '0.95rem',
          }}
        >
          Tu reporte ha sido registrado con el ID:
        </Typography>
        <Typography
          sx={{
            color: emeraldCore.vibrant,
            fontWeight: 700,
            fontSize: '1.2rem',
            fontFamily: 'monospace',
            mt: 0.5,
          }}
        >
          {feedbackId}
        </Typography>
      </Box>

      {/* Thank you message */}
      <Box
        sx={{
          bgcolor: alpha(emeraldCore.primary, 0.1),
          borderRadius: 2,
          px: 3,
          py: 2,
          border: `1px solid ${alpha(emeraldCore.primary, 0.2)}`,
          maxWidth: 300,
        }}
      >
        <Typography sx={{ color: alpha('#fff', 0.8), fontSize: '0.9rem' }}>
          Gracias por ayudar a mejorar la aplicación.
          <br />
          El equipo de desarrollo revisará tu reporte.
        </Typography>
      </Box>

      {/* Action buttons */}
      <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
        <Button variant="outlined" startIcon={<CloseIcon />} onClick={onClose}>
          Cerrar
        </Button>
        <Button
          variant="primary"
          startIcon={<DashboardIcon />}
          onClick={onViewDashboard}
        >
          Ver Dashboard
        </Button>
      </Stack>
    </Box>
  );
}
