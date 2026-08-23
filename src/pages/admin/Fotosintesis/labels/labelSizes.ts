/**
 * labelSizes — the registry of NIIMBOT stock formats the shop prints on.
 *
 * Two axes matter and they are easy to confuse:
 *
 *   • `heightPx` is the label's SHORT axis — the one that runs across the print
 *     head. This is the dimension a printer can physically refuse: a head is N
 *     dots wide and stock wider than that prints clipped, whatever the layout
 *     does.
 *   • `widthPx` runs along the feed direction. `null` means continuous tape,
 *     where there is no fixed length to fill and the label grows to its content.
 *
 * Sizes are authored in CSS pixels at a FIXED design DPI, not in millimetres
 * converted at render time. Converting per-printer would make the on-screen
 * preview resize the moment a printer connects or drops off Bluetooth, which
 * reads as a bug. The print path scales instead — see `printScaleFor`.
 */

/** Native resolution of the NIIMBOT D11 (203 DPI). All sizes below are authored
 *  at this DPI, so 96 px == 12 mm == the D11's full 96-dot head. */
export const DESIGN_DPI = 203;

export type LabelSizeId = 'T12_CONTINUOUS' | 'T15X30' | 'T15X30_DUO';

export interface LabelSize {
  id: LabelSizeId;
  /** Human label for the size selector. */
  label: string;
  /** Supplier stock code, shown so the operator can reorder the right roll. */
  stockCode?: string;
  /** Along the feed. `null` = continuous tape, width shrinks to content. */
  widthPx: number | null;
  /** Across the print head — the axis a printer's dot count constrains. */
  heightPx: number;
  qrPx: number;
  /** The Tierra Mädre mark only fits where there is spare width. */
  showLogo: boolean;
  /**
   * How many inventory items share ONE physical label.
   *
   * `1` is the normal case. `2` means the stock is printed two-up and CUT IN
   * HALF after printing — see `T15X30_DUO`. Every batch path groups by this
   * number, so a 40-item lot on a 2-up stock sends 20 labels to the printer,
   * not 40.
   */
  itemsPerLabel: 1 | 2;
  /**
   * Operator instruction shown beside the size selector. Only set on stocks
   * that need a step AFTER printing, since nothing else in the UI would tell
   * the operator that the label they just printed is not finished.
   */
  hint?: string;
}

export const LABEL_SIZES: Record<LabelSizeId, LabelSize> = {
  T12_CONTINUOUS: {
    id: 'T12_CONTINUOUS',
    label: '12 mm continua',
    widthPx: null,
    heightPx: 96, // 12 mm
    qrPx: 80,
    showLogo: true,
    itemsPerLabel: 1,
  },
  T15X30: {
    id: 'T15X30',
    label: '15 × 30 mm',
    stockCode: 'T15*30-210',
    widthPx: 240, // 30 mm along the feed
    heightPx: 120, // 15 mm across the head
    qrPx: 104,
    // Dropped deliberately: at 240 px there is no width left for the mark once
    // the QR, item number, name and peso are placed.
    showLogo: false,
    itemsPerLabel: 1,
  },
  /**
   * The SAME physical 15 × 30 mm die cut as `T15X30`, printed TWO-UP and cut
   * down the middle into two 15 × 15 mm squares.
   *
   * Why this exists: the shop's gem boxes are too small for a 30 mm label, and
   * 15 × 30 is the only die-cut stock on hand. Printing two items per label and
   * cutting turns one roll into 15 mm squares without buying new stock.
   *
   * The cost is QR module size. Each half gets an 82 px symbol — the payload
   * still encodes as a version-2 (25 × 25) alphanumeric QR, so a module is
   * 82/25 ≈ 3.3 dots ≈ 0.41 mm. That is smaller than the 1-up layouts and
   * close to the practical floor for a 203 DPI thermal head, so a worn head or
   * low-contrast stock will show up here FIRST. If field scanning gets flaky,
   * this is the layout to suspect, not the scanner.
   */
  T15X30_DUO: {
    id: 'T15X30_DUO',
    label: '15 × 30 mm · 2 ítems',
    stockCode: 'T15*30-210',
    widthPx: 240,
    heightPx: 120,
    // Per HALF, not per label — the duo layout lays out two 120 px cells. The
    // value is what's left after the brand mark's 20 px floor sets the footer
    // and two properly-led lines of NOMBRE set the 26 px column; see the
    // geometry note in LabelDuoPreview.
    qrPx: 82,
    showLogo: false,
    itemsPerLabel: 2,
    hint: 'Cortar por la línea punteada → dos etiquetas de 15 × 15 mm',
  },
};

/**
 * Interior geometry of ONE half of the 2-up label, in design pixels (= printer
 * dots at DESIGN_DPI). Lives here, apart from the component that draws it, so
 * the arithmetic is testable without mounting React — every number below is
 * load-bearing and the two axis sums are asserted in labelSizes.test.ts.
 *
 * Read the sums out loud before touching anything:
 *
 *   across:  padLeft + qrPx + gutterX + textColPx + padRight  = 120
 *   down:    padTop  + qrPx + gutterY + footerPx  + padBottom = 120
 *
 * The QR is shared by both, so the two axes are coupled — which is why the
 * gutters differ rather than the padding being uniform. The footer and the text
 * column answer to unrelated floors (the mark's legibility vs. two lines of
 * leading), and a single gutter would force them to be the same size.
 */
export const DUO_LAYOUT = {
  padTop: 5,
  padLeft: 5,
  padBottom: 5,
  /**
   * 2 px tighter than the rest. That pixel and gutterX's fund the text
   * column's 25th and 26th — the two lines of nombre. Safe to take from HERE
   * because this edge abuts the text column, not the QR's quiet zone.
   */
  padRight: 3,
  /** QR → rotated text column. 1 px tighter than padTop/padLeft for the same
   *  reason, and still wider than the QR's one-module (3.3 px) quiet zone. */
  gutterX: 4,
  /** QR → footer. */
  gutterY: 8,
  /** Width of the rotated column = the nombre's TWO line boxes stacked. */
  textColPx: 26,
  nombrePx: 11,
  /** > nombrePx: without leading the two name lines' ink collides. */
  nombreLeadingPx: 13,
  /** The peso rides in the FOOTER now, horizontal — see LabelDuoPreview. */
  pesoPx: 9,
  /** > pesoPx: its line box still needs leading, rotated or not. */
  pesoLeadingPx: 11,
  footerPx: 20,
  /**
   * The brand mark's floor. Verified against a 1-bit simulation of the head:
   * below ~18 px its four loops close up and its four dots vanish, and it stops
   * reading as the mark. This floor is what sets `footerPx`.
   */
  markPx: 20,
} as const;

export const DEFAULT_LABEL_SIZE_ID: LabelSizeId = 'T12_CONTINUOUS';

export const LABEL_SIZE_LIST: LabelSize[] = [
  LABEL_SIZES.T12_CONTINUOUS,
  LABEL_SIZES.T15X30,
  LABEL_SIZES.T15X30_DUO,
];

/** Resolve an id from an untrusted source (localStorage, a URL param) to a real
 *  size, falling back rather than rendering nothing. */
export function resolveLabelSize(id: string | null | undefined): LabelSize {
  if (id && id in LABEL_SIZES) return LABEL_SIZES[id as LabelSizeId];
  return LABEL_SIZES[DEFAULT_LABEL_SIZE_ID];
}

/**
 * Group a flat item list into one entry per PHYSICAL label.
 *
 * On a 1-up stock this is just `[[a], [b], [c]]` — every caller can use it
 * unconditionally instead of branching on the size. On a 2-up stock the list is
 * paired in the order it arrives (`[[a, b], [c, d]]`), which deliberately
 * mirrors what the operator sees on screen: the gallery is already sorted the
 * way they want to work, so pairing by position keeps the printed sheet and the
 * screen in the same order.
 *
 * An ODD tail yields a group of one. That label prints with the second half
 * blank rather than dropping the item or borrowing from the next batch — the
 * operator cuts it and discards the blank square, which costs one 15 mm stub
 * and never costs a missing label.
 */
export function chunkForLabels<T>(items: readonly T[], size: LabelSize): T[][] {
  const per = size.itemsPerLabel;
  if (per <= 1) return items.map((item) => [item]);
  const groups: T[][] = [];
  for (let i = 0; i < items.length; i += per) {
    groups.push(items.slice(i, i + per));
  }
  return groups;
}

/** Subset of niimbluelib's `PrinterModelMeta` this module needs. Declared
 *  locally so the registry stays testable without a Bluetooth client. */
export interface PrinterHeadMeta {
  dpi: number;
  printheadPixels: number;
}

export function mmToDots(mm: number, dpi: number): number {
  return Math.round((mm / 25.4) * dpi);
}

export function dotsToMm(dots: number, dpi: number): number {
  return (dots / dpi) * 25.4;
}

/** Physical width the print head can cover, in mm. Both the D11 (96 dots @ 203)
 *  and the D11_H (142 dots @ 300) come out at 12.0 mm — the higher DPI buys
 *  resolution, not width. */
export function printableMm(meta: PrinterHeadMeta): number {
  return dotsToMm(meta.printheadPixels, meta.dpi);
}

/**
 * Does this stock fit across the head?
 *
 * Advisory only. Callers MUST NOT use this to block printing: niimbluelib's own
 * model auto-detection is documented as unreliable (which is why the model is
 * hardcoded in `useNiimbotPrinter`), so a `false` here can mean "wrong stock"
 * OR "misdetected printer". The operator knows their hardware; we warn.
 */
export function fitsPrinter(size: LabelSize, meta: PrinterHeadMeta): boolean {
  // Half-dot tolerance: 15 mm stock on a 120-dot/203 DPI head is exactly 15.0 mm
  // and must not fail on binary floating-point dust.
  return dotsToMm(size.heightPx, DESIGN_DPI) <= printableMm(meta) + 0.05;
}

/**
 * Rasterize scale for the DIRECT-PRINT path, where 1 canvas pixel is 1 printer
 * dot. Sizes are authored at `DESIGN_DPI`, so a head at a different DPI needs
 * the node scaled to land on the same physical millimetres.
 *
 * A 203 DPI printer yields exactly 1 — byte-identical to the behaviour before
 * sizes existed, so a D11 sees no change at all. A 300 DPI D11_H yields ≈1.478,
 * turning the 96 px / 12 mm strip into the 142 dots that head actually needs;
 * at scale 1 it would print ~8 mm tall on 12 mm tape.
 */
export function printScaleFor(
  meta: PrinterHeadMeta | null | undefined,
): number {
  if (!meta?.dpi) return 1;
  return meta.dpi / DESIGN_DPI;
}
