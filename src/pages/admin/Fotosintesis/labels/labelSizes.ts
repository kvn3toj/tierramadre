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

export type LabelSizeId = 'T12_CONTINUOUS' | 'T15X30';

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
}

export const LABEL_SIZES: Record<LabelSizeId, LabelSize> = {
  T12_CONTINUOUS: {
    id: 'T12_CONTINUOUS',
    label: '12 mm continua',
    widthPx: null,
    heightPx: 96, // 12 mm
    qrPx: 80,
    showLogo: true,
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
  },
};

export const DEFAULT_LABEL_SIZE_ID: LabelSizeId = 'T12_CONTINUOUS';

export const LABEL_SIZE_LIST: LabelSize[] = [
  LABEL_SIZES.T12_CONTINUOUS,
  LABEL_SIZES.T15X30,
];

/** Resolve an id from an untrusted source (localStorage, a URL param) to a real
 *  size, falling back rather than rendering nothing. */
export function resolveLabelSize(id: string | null | undefined): LabelSize {
  if (id && id in LABEL_SIZES) return LABEL_SIZES[id as LabelSizeId];
  return LABEL_SIZES[DEFAULT_LABEL_SIZE_ID];
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
