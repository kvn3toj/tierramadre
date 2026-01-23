/**
 * SubmitSuccess Component
 * Success state shown after a request is submitted.
 */

import React from 'react';
import { Box, Typography, alpha } from '@mui/material';
import { CheckCircle } from 'lucide-react';
import { emeraldCore } from '../../../../design-system/tokens/colors';

export const SubmitSuccess: React.FC = () => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', p: 3 }}>
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
        <CheckCircle size={40} color={emeraldCore.primary} />
      </Box>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
        Solicitud Enviada
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
        Tu solicitud ha sido enviada al equipo de Tierra Madre.
        Te notificaremos cuando haya una respuesta.
      </Typography>
    </Box>
  );
};

export default SubmitSuccess;
