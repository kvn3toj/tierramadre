import { Box } from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';
import { fontFamilies } from '../../../../design-system';

// QR target. `HTTPS://TIERRAMADRE.APP/P/<id>` (the short `/p/:itemId` alias, in
// UPPERCASE): uppercase makes the QR encode in *alphanumeric* mode, so even with
// the `HTTPS://` scheme the symbol stays a low-density version-2 (25×25) that
// prints/scans off tiny 12mm tape. The scheme matters — a scheme-less payload
// (`tierramadre.app/...`) makes some scanners run a Google search instead of
// opening the link. Resolves the same item (React Router is case-insensitive;
// parseTmQr lower-cases the `/p/` segment); itemIds are numeric/uppercase so no
// case is lost.
const QR_TARGET_BASE = 'HTTPS://TIERRAMADRE.APP/P/';
const LOGO_URL = '/logo-symbol.png';

/** 12mm NIIMBOT tape at 203 DPI native resolution. */
export const LABEL_HEIGHT_PX = 96;
const QR_SIZE_PX = 80;
const LOGO_SIZE_PX = 56;

export interface LabelPreviewProps {
  itemId: string;
  nombre?: string;
  peso?: string;
  /**
   * Gallery mode (Atelier etiquetas). This used to embed the Tierra Mädre mark
   * in the CENTRE of the QR, but that occluded the symbol and forced the dense
   * level-"H" encoding, so printed modules were too small to scan off 12mm
   * tape. The centre logo is now DROPPED — the QR is a plain level-"M" symbol
   * with larger modules. This flag now only suppresses the trailing side logo
   * so the gallery label stays compact (QR + text only).
   */
  qrLogoSrc?: string;
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
export function LabelPreview({
  itemId,
  nombre,
  peso,
  qrLogoSrc,
}: LabelPreviewProps) {
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
        value={`${QR_TARGET_BASE}${itemId}`}
        size={QR_SIZE_PX}
        // NO centre logo, level "M", and the short UPPERCASE target above: this
        // encodes as a version-2 (25×25) alphanumeric symbol — larger modules
        // than the old version-3 `/product/` URL, so it scans off tiny 12mm tape.
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
      {!qrLogoSrc && (
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
      )}
    </Box>
  );
}

export default LabelPreview;
