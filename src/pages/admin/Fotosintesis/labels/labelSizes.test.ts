import { describe, it, expect } from 'vitest';
import {
  DESIGN_DPI,
  DUO_LAYOUT,
  LABEL_SIZES,
  chunkForLabels,
  dotsToMm,
  fitsPrinter,
  mmToDots,
  printScaleFor,
  printableMm,
  resolveLabelSize,
  type PrinterHeadMeta,
} from './labelSizes';

// Straight from @mmote/niimbluelib's printer_models table.
const D11: PrinterHeadMeta = { dpi: 203, printheadPixels: 96 };
const D11_H: PrinterHeadMeta = { dpi: 300, printheadPixels: 142 };
const HI_D110: PrinterHeadMeta = { dpi: 203, printheadPixels: 120 };

describe('dot conversions', () => {
  it('converts 12 mm to each head’s native dot count', () => {
    expect(mmToDots(12, 203)).toBe(96);
    expect(mmToDots(12, 300)).toBe(142);
  });

  it('round-trips dots back to millimetres', () => {
    expect(dotsToMm(96, 203)).toBeCloseTo(12.0, 1);
    expect(dotsToMm(142, 300)).toBeCloseTo(12.0, 1);
  });
});

describe('printableMm', () => {
  it('is 12 mm on both D11 variants — the extra DPI buys resolution, not width', () => {
    expect(printableMm(D11)).toBeCloseTo(12.0, 1);
    expect(printableMm(D11_H)).toBeCloseTo(12.0, 1);
  });

  it('is 15 mm on the wide-head variant', () => {
    expect(printableMm(HI_D110)).toBeCloseTo(15.0, 1);
  });
});

describe('fitsPrinter', () => {
  it('rejects 15 mm stock on a 12 mm head', () => {
    expect(fitsPrinter(LABEL_SIZES.T15X30, D11)).toBe(false);
    expect(fitsPrinter(LABEL_SIZES.T15X30, D11_H)).toBe(false);
  });

  it('accepts 15 mm stock on a 15 mm head, exactly at the limit', () => {
    expect(fitsPrinter(LABEL_SIZES.T15X30, HI_D110)).toBe(true);
  });

  it('accepts the 12 mm tape everywhere', () => {
    expect(fitsPrinter(LABEL_SIZES.T12_CONTINUOUS, D11)).toBe(true);
    expect(fitsPrinter(LABEL_SIZES.T12_CONTINUOUS, D11_H)).toBe(true);
  });
});

describe('printScaleFor', () => {
  it('is exactly 1 at the design DPI — a D11 must see no change at all', () => {
    expect(printScaleFor(D11)).toBe(1);
  });

  it('scales a 300 DPI head so 12 mm lands on its full 142 dots', () => {
    const scale = printScaleFor(D11_H);
    expect(Math.round(LABEL_SIZES.T12_CONTINUOUS.heightPx * scale)).toBe(142);
  });

  it('falls back to 1 when the printer never reported metadata', () => {
    expect(printScaleFor(null)).toBe(1);
    expect(printScaleFor(undefined)).toBe(1);
  });
});

describe('resolveLabelSize', () => {
  it('resolves a known id', () => {
    expect(resolveLabelSize('T15X30').id).toBe('T15X30');
  });

  it('falls back instead of rendering nothing for junk from localStorage', () => {
    expect(resolveLabelSize('T40X80_RETIRED').id).toBe('T12_CONTINUOUS');
    expect(resolveLabelSize(null).id).toBe('T12_CONTINUOUS');
    expect(resolveLabelSize(undefined).id).toBe('T12_CONTINUOUS');
  });
});

describe('size registry', () => {
  it('authors the 15×30 stock at the design DPI', () => {
    expect(dotsToMm(LABEL_SIZES.T15X30.heightPx, DESIGN_DPI)).toBeCloseTo(
      15.0,
      1,
    );
    expect(dotsToMm(LABEL_SIZES.T15X30.widthPx!, DESIGN_DPI)).toBeCloseTo(
      30.0,
      1,
    );
  });

  it('marks the continuous tape as having no fixed length', () => {
    expect(LABEL_SIZES.T12_CONTINUOUS.widthPx).toBeNull();
  });

  it('gives the 2-up stock the same physical die cut as the 1-up 15×30', () => {
    expect(LABEL_SIZES.T15X30_DUO.widthPx).toBe(LABEL_SIZES.T15X30.widthPx);
    expect(LABEL_SIZES.T15X30_DUO.heightPx).toBe(LABEL_SIZES.T15X30.heightPx);
    expect(LABEL_SIZES.T15X30_DUO.stockCode).toBe(LABEL_SIZES.T15X30.stockCode);
  });

  it('keeps every 2-up half square, so the cut yields 15 × 15 mm', () => {
    const duo = LABEL_SIZES.T15X30_DUO;
    expect(dotsToMm(duo.widthPx! / 2, DESIGN_DPI)).toBeCloseTo(15.0, 1);
    expect(dotsToMm(duo.heightPx, DESIGN_DPI)).toBeCloseTo(15.0, 1);
  });

  it('leaves the 2-up QR room to be a version-2 symbol with printable modules', () => {
    // 25 modules is a version-2 QR — what the UPPERCASE /P/ target encodes as.
    // Below ~0.4 mm per module a 203 DPI thermal head stops scanning reliably,
    // and this layout has the least headroom in the app: guard it.
    const modulePx = LABEL_SIZES.T15X30_DUO.qrPx / 25;
    expect(dotsToMm(modulePx, DESIGN_DPI)).toBeGreaterThanOrEqual(0.4);
  });

  it('declares how many items ride on each stock', () => {
    expect(LABEL_SIZES.T12_CONTINUOUS.itemsPerLabel).toBe(1);
    expect(LABEL_SIZES.T15X30.itemsPerLabel).toBe(1);
    expect(LABEL_SIZES.T15X30_DUO.itemsPerLabel).toBe(2);
  });

  it('tells the operator that a 2-up label still needs cutting', () => {
    expect(LABEL_SIZES.T15X30_DUO.hint).toBeTruthy();
    expect(LABEL_SIZES.T15X30.hint).toBeUndefined();
  });
});

describe('DUO_LAYOUT', () => {
  const duo = LABEL_SIZES.T15X30_DUO;
  const cellWidth = duo.widthPx! / 2;

  it('fills the cell exactly across — QR, gutter, rotated text, padding', () => {
    const across =
      DUO_LAYOUT.padLeft +
      duo.qrPx +
      DUO_LAYOUT.gutterX +
      DUO_LAYOUT.textColPx +
      DUO_LAYOUT.padRight;
    expect(across).toBe(cellWidth);
  });

  it('fills the cell exactly down — QR, gutter, footer, padding', () => {
    const down =
      DUO_LAYOUT.padTop +
      duo.qrPx +
      DUO_LAYOUT.gutterY +
      DUO_LAYOUT.footerPx +
      DUO_LAYOUT.padBottom;
    expect(down).toBe(duo.heightPx);
  });

  it('gives every line real leading, so its ink cannot collide', () => {
    // The bug this guards: line-height == font-size put one line's descenders
    // on top of the next, and the two printed as one smudge.
    expect(DUO_LAYOUT.nombreLeadingPx).toBeGreaterThan(DUO_LAYOUT.nombrePx);
    expect(DUO_LAYOUT.pesoLeadingPx).toBeGreaterThan(DUO_LAYOUT.pesoPx);
  });

  it('sizes the text column to exactly two lines of nombre', () => {
    // The column is the NAME's, whole: the peso moved to the footer so that
    // "Sentir de la Montaña" gets two 82 px lines instead of being cut to
    // "Sentir de la M…" on one. A third line would print past the die cut.
    expect(DUO_LAYOUT.nombreLeadingPx * 2).toBe(DUO_LAYOUT.textColPx);
  });

  it('keeps the brand mark at or above the size where it still reads', () => {
    expect(DUO_LAYOUT.markPx).toBeGreaterThanOrEqual(18);
    expect(DUO_LAYOUT.markPx).toBeLessThanOrEqual(DUO_LAYOUT.footerPx);
  });

  it('leaves the QR a quiet zone of at least one module on every side', () => {
    const modulePx = duo.qrPx / 25;
    for (const gap of [
      DUO_LAYOUT.padTop,
      DUO_LAYOUT.padLeft,
      DUO_LAYOUT.gutterX,
      DUO_LAYOUT.gutterY,
    ]) {
      expect(gap).toBeGreaterThanOrEqual(modulePx);
    }
  });
});

describe('chunkForLabels', () => {
  const ONE_UP = LABEL_SIZES.T15X30;
  const TWO_UP = LABEL_SIZES.T15X30_DUO;

  it('wraps each item in its own group on a 1-up stock', () => {
    expect(chunkForLabels(['a', 'b', 'c'], ONE_UP)).toEqual([
      ['a'],
      ['b'],
      ['c'],
    ]);
  });

  it('pairs in list order on a 2-up stock', () => {
    expect(chunkForLabels(['a', 'b', 'c', 'd'], TWO_UP)).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('prints an odd tail on its own label rather than dropping it', () => {
    const groups = chunkForLabels(['a', 'b', 'c'], TWO_UP);
    expect(groups).toEqual([['a', 'b'], ['c']]);
    // The lone item is still printed — a dropped label is an unlabelled stone.
    expect(groups.flat()).toEqual(['a', 'b', 'c']);
  });

  it('never loses or duplicates an item, at either stock', () => {
    const items = Array.from({ length: 37 }, (_, i) => `item-${i}`);
    for (const size of [ONE_UP, TWO_UP]) {
      expect(chunkForLabels(items, size).flat()).toEqual(items);
    }
  });

  it('halves the label count on a 2-up stock — this is the whole point', () => {
    const items = Array.from({ length: 40 }, (_, i) => i);
    expect(chunkForLabels(items, ONE_UP)).toHaveLength(40);
    expect(chunkForLabels(items, TWO_UP)).toHaveLength(20);
  });

  it('returns nothing for an empty list, so batch paths no-op cleanly', () => {
    expect(chunkForLabels([], TWO_UP)).toEqual([]);
  });
});
