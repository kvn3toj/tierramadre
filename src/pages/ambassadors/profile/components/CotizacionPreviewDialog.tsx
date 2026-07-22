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
} from '@mui/material';
import { X } from 'lucide-react';
import { SavedCotizacion } from '../../../../hooks/useCotizacionHistory';
import { qeGray, zIndex } from '../../../../design-system';

interface CotizacionPreviewDialogProps {
  cotizacion: SavedCotizacion | null;
  onClose: () => void;
}

export const CotizacionPreviewDialog: React.FC<CotizacionPreviewDialogProps> = ({
  cotizacion,
  onClose,
}) => {
  return (
    <Dialog
      open={!!cotizacion}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 'var(--tm-radius-sheet)',
          bgcolor: 'var(--tm-surface)',
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
            // On-photo chrome: sits over the cotizacion image, so it takes the
            // scrim + a fixed light foreground rather than surface tokens.
            bgcolor: 'var(--tm-scrim)',
            color: qeGray[0],
            '&:hover': { bgcolor: 'var(--tm-scrim)' },
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
