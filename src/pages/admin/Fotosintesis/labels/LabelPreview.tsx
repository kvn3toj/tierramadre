import { Box } from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';
import { fontFamilies } from '../../../../design-system';

const STUDIO_BASE_URL = 'https://tierramadre.app';
const LOGO_URL = '/logo-symbol.png';

/** 12mm NIIMBOT tape at 203 DPI native resolution. */
export const LABEL_HEIGHT_PX = 96;
const QR_SIZE_PX = 80;
const LOGO_SIZE_PX = 56;

export interface LabelPreviewProps {
  itemId: string;
  nombre?: string;
  peso?: string;
}

/**
 * One printable item label: QR (links to the product detail page) + item
 * number + nombre + peso + the Tierra Mädre mark. Pure presentational — no
 * Convex query inside this component, callers pass data in (matches the
 * KardexPreview/MovimientoKardexPreview convention in this codebase).
 *
 * Landscape strip, fixed 96px height (12mm NIIMBOT tape at 203 DPI), width
 * shrinks to content — the tape is continuous, no fixed length to fill.
 *
 * Root uses `display: 'inline-flex'` rather than `width: 'max-content'` on a
 * block flex container: html2canvas (which clones the DOM rather than
 * screenshotting a live paint) has documented trouble resolving intrinsic
 * sizing keywords like `max-content`/`fit-content` on nodes rendered
 * off-screen (`position: fixed; left: -9999px`, as every caller here does),
 * producing a malformed/wrongly-sized export. `inline-flex` shrinks to
 * content by default without relying on that keyword, which html2canvas
 * measures reliably.
 */
export function LabelPreview({ itemId, nombre, peso }: LabelPreviewProps) {
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        height: `${LABEL_HEIGHT_PX}px`,
        padding: '8px',
        background: '#FFFFFF',
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
      <Box
        component="img"
        src={LOGO_URL}
        alt=""
        crossOrigin="anonymous"
        sx={{
          height: `${LOGO_SIZE_PX}px`,
          width: `${LOGO_SIZE_PX}px`,
          objectFit: 'contain',
          flexShrink: 0,
        }}
      />
    </Box>
  );
}

export default LabelPreview;
