import { Box } from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';
import { fontFamilies } from '../../../../design-system';
import {
  DUO_LAYOUT,
  LABEL_SIZES,
  type LabelSize,
  type LabelSizeId,
} from './labelSizes';
import { QR_TARGET_BASE } from './qrTarget';
import { LABEL_MARK_DATA_URI } from './markDataUri';

/**
 * LabelDuoPreview — ONE physical 15 × 30 mm die cut carrying TWO items, meant
 * to be cut down the middle into two 15 × 15 mm squares.
 *
 * The shop's gem boxes are too small for a 30 mm label and 15 × 30 is the only
 * die-cut stock on hand, so the label is printed two-up and cut. That is the
 * whole reason this layout exists — see `LABEL_SIZES.T15X30_DUO`.
 *
 * ── Why the text is rotated ────────────────────────────────────────────────
 * Each half is 120 px (15 mm) wide. A horizontal name column beside the QR would
 * take ~60 px of that, leaving a QR too small to scan. Rotating the text 90°
 * turns its LENGTH into the cell's height (which is otherwise wasted beside a
 * square QR) and costs only its two line boxes in width — 26 px instead of 60.
 * The QR keeps 82 px, which is what makes this layout viable at all.
 *
 * ── Why transform and not writing-mode ─────────────────────────────────────
 * `writing-mode: vertical-rl` expresses this more directly, but exportLabel's
 * FALLBACK rasterizer (html2canvas, used when snapDOM fails) reimplements CSS
 * rather than asking the browser to paint, and its writing-mode support is
 * incomplete — a fallback export would silently lay the text out horizontally
 * and overflow the cell. A rotate() transform on an absolutely-positioned box
 * is handled by both rasterizers, so the fallback degrades to "slightly worse
 * antialiasing", not "wrong label".
 *
 * ── Geometry (authored at DESIGN_DPI = 203, so 1 px = 1 printer dot) ────────
 * Both axes must sum to the 120 px cell, and they share the QR:
 *
 *   across:  5 pad + 82 QR + 4 gutter + 26 text column + 3 pad  = 120
 *   down:    5 pad + 82 QR + 8 gutter + 20 footer      + 5 pad  = 120
 *
 * The two gutters differ ON PURPOSE. An earlier version used a single gutter,
 * which forced the text column and the footer to be the same size — and they
 * answer to unrelated constraints:
 *
 *   • The FOOTER is 20 px because the brand mark stops reading below that.
 *     Verified against a 1-bit simulation of the head: at 16 px the mark's four
 *     loops close up and its four dots disappear.
 *   • The TEXT COLUMN is 26 px because it holds TWO lines of nombre at 13 px of
 *     leading each. Leading, not font size, sets that: at line-height ==
 *     font-size the descenders of one line landed on the next and the two
 *     printed as one smudge on tape. 13 px gives each line ~2 px of clearance.
 *
 * Different gutters buy the text column those 6 px without charging the QR for
 * all of them — the symbol gave up 1 px (83 → 82), the rest came out of the
 * generous bottom gutter and, for the last 2 px, of gutterX and padRight (5 → 4
 * and 4 → 3). Change anything here and re-derive BOTH sums, or content prints
 * off the die cut.
 *
 * ── Why the peso is in the footer and not the column ────────────────────────
 * It used to share the rotated column with the nombre, which capped the name at
 * ONE 82 px line — about 15 characters, so "Sentir de la Montaña" printed as
 * "Sentir de la M…". The footer had the room to spare (the mark's 20 px plus
 * the item number leave over half the 120 px width empty), so the peso moved
 * there and the whole column became two lines of nombre: ~30 characters, with
 * the QR untouched and no type made smaller. 8 px type was tried for this and
 * rejected — at 203 DPI the digits close up.
 */

// Single source of truth, imported rather than restated: labelSizes.test.ts
// asserts that these numbers add up to the cell on both axes, and a private copy
// here would let the drawing drift away from the thing being tested.
const L = DUO_LAYOUT;

export interface DuoLabelItem {
  itemId: string;
  nombre?: string;
  peso?: string;
}

export interface LabelDuoPreviewProps {
  /**
   * The one or two items on this label. A single item renders the left half
   * only and leaves the right half blank — see `chunkForLabels` for why an odd
   * tail is printed rather than dropped.
   */
  items: DuoLabelItem[];
  /** Which 2-up stock to lay out. Defaults to the only one that exists today. */
  size?: LabelSizeId;
}
// NOTE: no `logoSrc` prop, deliberately. The 1-up layouts accept a caller-
// supplied logo because the gallery holds the brand asset as a data URI
// already; here the mark must be the print-prepared BLACK rendering or it does
// not survive a 1-bit head (see markDataUri.ts), so the layout owns it and no
// caller can substitute the green original by accident.

/** One 15 × 15 mm half: QR + the rotated nombre + a footer of mark, #itemId
 *  and peso. */
function DuoCell({
  item,
  stock,
}: {
  item: DuoLabelItem | undefined;
  stock: LabelSize;
}) {
  const cellWidth = (stock.widthPx ?? 240) / 2;
  const qrPx = stock.qrPx;

  return (
    <Box
      sx={{
        width: `${cellWidth}px`,
        height: `${stock.heightPx}px`,
        padding: `${L.padTop}px ${L.padRight}px ${L.padBottom}px ${L.padLeft}px`,
        boxSizing: 'border-box',
        background: '#FFFFFF',
        // Nothing may spill past a die cut — it would print off the edge.
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Empty half of an odd-numbered batch: still occupies the cell so the
          printed label keeps its geometry and the cut line stays centred. */}
      {!item ? null : (
        <>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: `${L.gutterX}px`,
              height: `${qrPx}px`,
            }}
          >
            <QRCodeSVG
              value={`${QR_TARGET_BASE}${item.itemId}`}
              size={qrPx}
              // Level "M" with the short UPPERCASE target keeps this a
              // version-2 (25 × 25) alphanumeric symbol. Level "Q"/"H" would
              // push it to version 3 (29 × 29), shrinking each module from
              // ~0.42 mm to ~0.36 mm — below what this head prints reliably.
              level="M"
              fgColor="#000000"
              bgColor="#FFFFFF"
              style={{ display: 'block', flexShrink: 0 }}
            />

            {/* Rotated text column, TWO lines of nombre. The wrapper reserves
                the FOOTPRINT (26 × 82); the inner box is laid out at its natural
                82 × 26 and rotated about its centre, so the two land on each
                other without any translate arithmetic to get wrong. The 82 px
                is what each line gets to wrap in — the QR's own height, reused. */}
            <Box
              sx={{
                position: 'relative',
                width: `${L.textColPx}px`,
                height: `${qrPx}px`,
                flexShrink: 0,
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: `${qrPx}px`,
                  height: `${L.textColPx}px`,
                  transformOrigin: 'center center',
                  transform: 'translate(-50%, -50%) rotate(90deg)',
                  display: 'flex',
                  // After the 90° turn this column axis runs RIGHT-to-LEFT on
                  // the label, so the first line ends up furthest from the QR —
                  // which is where a reader starts, matching the reference
                  // layout.
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 0,
                }}
              >
                {item.nombre && (
                  <Box
                    sx={{
                      // Line box is TALLER than the font on purpose. With
                      // line-height == font-size the first line's descenders
                      // landed on the second and the two printed as one smudge.
                      fontFamily: fontFamilies.system,
                      fontSize: `${L.nombrePx}px`,
                      lineHeight: `${L.nombreLeadingPx}px`,
                      color: '#000000',
                      maxWidth: '100%',
                      // TWO lines, then ellipsis — 2 × nombreLeadingPx is
                      // exactly textColPx, so a third line would print past the
                      // die cut. -webkit-box rather than `nowrap` + ellipsis:
                      // that combination capped the name at one 82 px line
                      // (~15 chars) and is what truncated "Sentir de la M…".
                      display: '-webkit-box',
                      WebkitBoxOrient: 'vertical',
                      WebkitLineClamp: 2,
                      // maxHeight is the BELT to the clamp's braces, and it is
                      // load-bearing: snapDOM hands layout back to the browser
                      // so the clamp applies, but the html2canvas FALLBACK
                      // reimplements CSS and ships no -webkit-line-clamp at all
                      // (checked: neither property appears in its dist). Without
                      // a height cap that path would lay a long name out over
                      // three lines, 39 px inside a 26 px column, and spill it
                      // across the QR. With one, the fallback merely clips the
                      // third line — worse label, still a scannable one.
                      maxHeight: `${L.textColPx}px`,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      // Deliberately NOT `wordBreak: break-all`: a name that
                      // still overflows should lose whole words to the ellipsis
                      // rather than print a fragment that reads as a typo.
                    }}
                  >
                    {item.nombre}
                  </Box>
                )}
              </Box>
            </Box>
          </Box>

          {/* Footer: the Tierra Mädre mark + item number + peso, horizontal, on
              BOTH halves — each half becomes its own sticker once cut, so a mark
              on only one of them would ship half the boxes unbranded. This is
              also the line a human reads when the QR is scuffed, so the number
              stays the largest text on the cell and the peso is deliberately
              smaller, set apart on the far edge rather than beside it. The mark
              (20) + the number (~45) left over half the 120 px empty, which is
              the room the peso moved here to use. */}
          <Box
            sx={{
              height: `${L.footerPx}px`,
              marginTop: `${L.gutterY}px`,
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              minWidth: 0,
            }}
          >
            <Box
              component="img"
              src={LABEL_MARK_DATA_URI}
              alt=""
              sx={{
                width: `${L.markPx}px`,
                height: `${L.markPx}px`,
                objectFit: 'contain',
                flexShrink: 0,
              }}
            />
            <Box
              sx={{
                fontFamily: fontFamilies.mono,
                fontSize: '13px',
                lineHeight: '13px',
                fontWeight: 700,
                color: '#000000',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              #{item.itemId}
            </Box>
            {item.peso && (
              <Box
                sx={{
                  // Pushed to the right edge so it never crowds the number —
                  // the two must not read as one string, and #itemId has to
                  // stay the thing the eye lands on.
                  //
                  // 9 px is unchanged from when this rode in the rotated column,
                  // and so is its legibility: in a 1-bit simulation of the head
                  // the digits hold and the COMMA is the first thing to close,
                  // horizontal and rotated alike. Turning it horizontal bought
                  // the name its second line, not a sharper peso. 8 px was tried
                  // and rejected — there the digits themselves close up.
                  marginLeft: 'auto',
                  fontFamily: fontFamilies.system,
                  fontSize: `${L.pesoPx}px`,
                  lineHeight: `${L.pesoLeadingPx}px`,
                  color: '#000000',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  flexShrink: 0,
                }}
              >
                {item.peso}
              </Box>
            )}
          </Box>
        </>
      )}
    </Box>
  );
}

export function LabelDuoPreview({
  items,
  size = 'T15X30_DUO',
}: LabelDuoPreviewProps) {
  const stock = LABEL_SIZES[size];
  const width = stock.widthPx ?? 240;

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'flex',
        width: `${width}px`,
        height: `${stock.heightPx}px`,
        background: '#FFFFFF',
        overflow: 'hidden',
      }}
    >
      <DuoCell item={items[0]} stock={stock} />
      <DuoCell item={items[1]} stock={stock} />

      {/* Cut guide. Printed (not a screen-only affordance) because the operator
          cuts these by hand with scissors and there is no other mark on a plain
          white die cut to aim at. Dashed rather than solid so the two halves
          keep a clean edge if the cut drifts a dot or two off centre. */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: `${width / 2}px`,
          width: 0,
          borderLeft: '1px dashed #000000',
        }}
      />
    </Box>
  );
}

export default LabelDuoPreview;
