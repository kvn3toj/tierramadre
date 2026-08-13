import { Box } from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';
import { fontFamilies } from '../../../../design-system';
import {
  DEFAULT_LABEL_SIZE_ID,
  LABEL_SIZES,
  type LabelSizeId,
} from './labelSizes';
// QR target — see qrTarget.ts for why it is spelled the way it is. Shared with
// LabelDuoPreview so the two layouts can never drift to different URLs.
import { QR_TARGET_BASE } from './qrTarget';

const LOGO_URL = '/logo-symbol.png';

/**
 * 12mm NIIMBOT tape at 203 DPI native resolution.
 *
 * @deprecated Read `LABEL_SIZES[id].heightPx` instead — height now varies by
 * stock. Kept as the 12mm tape's value for any caller still hardcoding it.
 */
export const LABEL_HEIGHT_PX = 96;
const LOGO_SIZE_PX = 56;

export interface LabelPreviewProps {
  itemId: string;
  nombre?: string;
  peso?: string;
  /**
   * Which NIIMBOT stock this label is being laid out for. Defaults to the 12mm
   * continuous tape, so the two callers that predate multi-size support
   * (EditItemDrawer, LoteResumenPage) render exactly as before.
   */
  size?: LabelSizeId;
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
 * Landscape strip sized from the `size` registry. On continuous tape the width
 * shrinks to content — there is no fixed length to fill. On die-cut stock the
 * width is FIXED to the physical label and the name ellipsises inside it, since
 * overflowing a die cut just prints off the edge.
 *
 * On continuous tape the root uses `display: 'inline-flex'` rather than
 * `width: 'max-content'` on a block flex container: html2canvas (which clones
 * the DOM rather than screenshotting a live paint) has documented trouble
 * resolving intrinsic sizing keywords like `max-content`/`fit-content` on nodes
 * rendered off-screen (`position: fixed; left: -9999px`, as every caller here
 * does), producing a malformed/wrongly-sized export. `inline-flex` shrinks to
 * content by default without relying on that keyword, which html2canvas
 * measures reliably. Die-cut sizes set an explicit pixel width, which sidesteps
 * the intrinsic-sizing problem entirely.
 */
export function LabelPreview({
  itemId,
  nombre,
  peso,
  size = DEFAULT_LABEL_SIZE_ID,
  qrLogoSrc,
}: LabelPreviewProps) {
  const stock = LABEL_SIZES[size];
  const isDieCut = stock.widthPx !== null;
  // Two independent reasons to drop the mark: the stock has no room for it, or
  // the caller is in compact gallery mode.
  const showLogo = stock.showLogo && !qrLogoSrc;

  return (
    <Box
      sx={{
        display: isDieCut ? 'flex' : 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        ...(isDieCut ? { width: `${stock.widthPx}px` } : null),
        height: `${stock.heightPx}px`,
        padding: '8px',
        background: '#FFFFFF',
        // Nothing may spill past a die cut — it would print off the label edge.
        ...(isDieCut ? { overflow: 'hidden' } : null),
      }}
    >
      <QRCodeSVG
        value={`${QR_TARGET_BASE}${itemId}`}
        size={stock.qrPx}
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
          // On a die cut the text takes whatever the QR leaves and no more, so
          // a long name is clipped by the column rather than widening the label.
          ...(isDieCut ? { flex: 1 } : null),
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
              // Continuous tape has no edge to hit, so the name gets a generous
              // cap before it starts eating tape. A die cut is bounded by the
              // column above instead.
              maxWidth: isDieCut ? '100%' : '220px',
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
      {showLogo && (
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
