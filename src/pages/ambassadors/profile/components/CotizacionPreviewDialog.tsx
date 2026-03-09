/**
 * CotizacionPreviewDialog Component
 * Full-screen dialog to preview a cotizacion image.
 */

import React from 'react';
import {
  Box,
  Dialog,
  DialogContent,
  IconButton,
  useTheme,
} from '@mui/material';
import { X } from 'lucide-react';
import { SavedCotizacion } from '../../../../hooks/useCotizacionHistory';
import { lightTokens, darkTokens, zIndex } from '../../../../design-system';

interface CotizacionPreviewDialogProps {
  cotizacion: SavedCotizacion | null;
  onClose: () => void;
}

export const CotizacionPreviewDialog: React.FC<CotizacionPreviewDialogProps> = ({
  cotizacion,
  onClose,
}) => {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';

  return (
    <Dialog
      open={!!cotizacion}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          bgcolor: isLight ? lightTokens.background.surface : darkTokens.background.surface,
        },
      }}
    >
      <DialogContent sx={{ p: 0, position: 'relative' }}>
        <IconButton
          onClick={onClose}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: zIndex.base,
            bgcolor: 'rgba(0,0,0,0.5)',
            color: '#fff',
            '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
          }}
        >
          <X size={20} />
        </IconButton>
        {cotizacion && (
          <Box
            component="img"
            src={cotizacion.imageUrl}
            alt={`Cotizacion ${cotizacion.quotationNumber}`}
            sx={{
              width: '100%',
              height: 'auto',
              display: 'block',
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CotizacionPreviewDialog;
