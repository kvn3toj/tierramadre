/**
 * CotizacionPreviewDialog Component
 * Previews a saved cotizacion image inside the canonical DS3 `Sheet`
 * (desktop centered modal / mobile bottom sheet).
 *
 * The overlay handles focus trap + restore, backdrop/Escape dismissal, the
 * mobile 85dvh + safe-area treatment and the enter/exit timing — none of that
 * is re-implemented here.
 */

import React from 'react';
import { Box, IconButton } from '@mui/material';
import { X } from 'lucide-react';
import { SavedCotizacion } from '../../../../hooks/useCotizacionHistory';
import { qeGray, zIndex, Sheet } from '../../../../design-system';

interface CotizacionPreviewDialogProps {
  cotizacion: SavedCotizacion | null;
  onClose: () => void;
}

export const CotizacionPreviewDialog: React.FC<
  CotizacionPreviewDialogProps
> = ({ cotizacion, onClose }) => {
  return (
    <Sheet
      open={!!cotizacion}
      onClose={onClose}
      maxWidth={900}
      // The image is full-bleed to the sheet edge; the drag handle would break
      // that, and the on-photo close button is the explicit dismissal affordance.
      hideHandle
      ariaLabel={
        cotizacion ? `Cotización ${cotizacion.quotationNumber}` : 'Cotización'
      }
    >
      <Box sx={{ position: 'relative', lineHeight: 0 }}>
        <IconButton
          onClick={onClose}
          aria-label="Cerrar"
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: zIndex.base,
            width: 44,
            height: 44,
            // On-photo chrome: sits over the cotizacion image, so it takes the
            // scrim + a fixed light foreground rather than surface tokens.
            bgcolor: 'var(--tm-scrim)',
            color: qeGray[0],
            '&:hover': { bgcolor: 'var(--tm-scrim)' },
            '&:focus-visible': {
              outline: 'none',
              boxShadow: 'var(--tm-focus-ring)',
            },
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
      </Box>
    </Sheet>
  );
};

export default CotizacionPreviewDialog;
