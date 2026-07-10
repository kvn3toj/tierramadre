import { Box } from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';
import { fontFamilies } from '../../../../design-system';

const STUDIO_BASE_URL = 'https://tierramadre.app';

/** 12mm NIIMBOT tape at 203 DPI native resolution. */
export const LABEL_HEIGHT_PX = 96;
const QR_SIZE_PX = 80;

export interface LabelPreviewProps {
  itemId: string;
  nombre?: string;
  peso?: string;
}

/**
 * One printable item label: QR (links to the product detail page) + item
 * number + nombre + peso. Pure presentational — no Convex query inside this
 * component, callers pass data in (matches the KardexPreview/
 * MovimientoKardexPreview convention in this codebase).
 *
 * Sized to a fixed 96px height (12mm NIIMBOT tape at 203 DPI); width grows
 * with content rather than being fixed, since the tape is continuous and
 * doesn't need to fill a fixed length.
 */
export function LabelPreview({ itemId, nombre, peso }: LabelPreviewProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        height: `${LABEL_HEIGHT_PX}px`,
        padding: '8px',
        background: '#FFFFFF',
        width: 'max-content',
      }}
    >
      <QRCodeSVG
        value={`${STUDIO_BASE_URL}/product/${itemId}`}
        size={QR_SIZE_PX}
        level="M"
        fgColor="#000000"
        bgColor="#FFFFFF"
        style={{ display: 'block', flexShrink: 0 }}
      />
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          minWidth: 0,
        }}
      >
        <Box
          sx={{
            fontFamily: fontFamilies.mono,
            fontSize: '20px',
            fontWeight: 700,
            color: '#000000',
            whiteSpace: 'nowrap',
          }}
        >
          {itemId}
        </Box>
        {nombre && (
          <Box
            sx={{
              fontFamily: fontFamilies.system,
              fontSize: '13px',
              color: '#000000',
              maxWidth: '220px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {nombre}
          </Box>
        )}
        {peso && (
          <Box
            sx={{
              fontFamily: fontFamilies.system,
              fontSize: '11px',
              color: '#333333',
              whiteSpace: 'nowrap',
            }}
          >
            {peso}
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default LabelPreview;
