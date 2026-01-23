/**
 * EmptyStates Component
 * Empty states for no views and no cotizaciones.
 */

import React from 'react';
import { Typography, Paper, alpha } from '@mui/material';
import { Eye, FileText } from 'lucide-react';
import { goldAccent } from '../../../../design-system/tokens/colors';

interface NoViewsProps {
  isLight: boolean;
}

export const NoViews: React.FC<NoViewsProps> = ({ isLight }) => {
  return (
    <Paper
      sx={{
        p: 4,
        textAlign: 'center',
        bgcolor: alpha('#000', 0.03),
        borderRadius: 3,
      }}
    >
      <Eye size={40} color={alpha(isLight ? '#000' : '#fff', 0.2)} />
      <Typography variant="body1" sx={{ mt: 2, fontWeight: 600 }}>
        Sin vistas registradas
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
        Este producto aún no ha sido visualizado
      </Typography>
    </Paper>
  );
};

interface NoCotizacionesProps {
  hasViews: boolean;
}

export const NoCotizaciones: React.FC<NoCotizacionesProps> = ({ hasViews }) => {
  if (!hasViews) {
    return null;
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        mb: 3,
        borderRadius: 3,
        bgcolor: alpha(goldAccent.primary, 0.05),
        border: `1px dashed ${alpha(goldAccent.primary, 0.3)}`,
        textAlign: 'center',
      }}
    >
      <FileText size={28} color={alpha(goldAccent.primary, 0.4)} />
      <Typography variant="body2" sx={{ mt: 1, fontWeight: 500, color: 'text.secondary' }}>
        Sin cotizaciones registradas
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.disabled' }}>
        Este producto aún no ha sido incluido en ninguna cotización
      </Typography>
    </Paper>
  );
};
