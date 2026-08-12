import { describe, it, expect } from 'vitest';
import {
  DESIGN_DPI,
  LABEL_SIZES,
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
});
