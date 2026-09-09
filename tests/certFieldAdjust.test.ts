import { describe, expect, it } from 'vitest';
import {
  CERT_TEMPLATES,
  clampFieldOffset,
  fieldTopLeft,
  hasFieldOffset,
  type TemplateField,
} from '../src/pages/admin/Fotosintesis/certificados/certTemplates';

const page = { w: 1080, h: 1920 };

const topLeftField: TemplateField = {
  key: 'name',
  kind: 'text',
  x: 434,
  y: 940,
  w: 560,
  h: 142,
};

const centeredField: TemplateField = {
  key: 'name',
  kind: 'text',
  x: 529,
  y: 279,
  w: 380,
  h: 44,
  centerX: true,
};

describe('clampFieldOffset', () => {
  it('keeps an in-page offset, rounded to whole px', () => {
    expect(
      clampFieldOffset({ dx: 10.4, dy: -20.6 }, topLeftField, page),
    ).toEqual({
      dx: 10,
      dy: -21,
    });
  });

  it('never lets the box leave the page on the left/top', () => {
    expect(
      clampFieldOffset({ dx: -9999, dy: -9999 }, topLeftField, page),
    ).toEqual({
      dx: -434,
      dy: -940,
    });
  });

  it('never lets the box leave the page on the right/bottom', () => {
    expect(
      clampFieldOffset({ dx: 9999, dy: 9999 }, topLeftField, page),
    ).toEqual({
      dx: page.w - 560 - 434,
      dy: page.h - 142 - 940,
    });
  });

  it('resolves centerX before clamping', () => {
    const { left } = fieldTopLeft(centeredField);
    expect(left).toBe(529 - 190);
    expect(
      clampFieldOffset({ dx: -9999, dy: 0 }, centeredField, { w: 792, h: 612 }),
    ).toEqual({
      dx: -left,
      dy: 0,
    });
  });
});

describe('hasFieldOffset', () => {
  it('is false for undefined and the zero offset', () => {
    expect(hasFieldOffset(undefined)).toBe(false);
    expect(hasFieldOffset({ dx: 0, dy: 0 })).toBe(false);
    expect(hasFieldOffset({ dx: 0, dy: 1 })).toBe(true);
  });
});

describe('CERT_TEMPLATES movable blocks', () => {
  it('every movable field has a cover (so the baked original stays masked) and a label', () => {
    for (const tpl of Object.values(CERT_TEMPLATES)) {
      for (const f of tpl.fields.filter((x) => x.movable)) {
        expect(f.cover, `${tpl.id}.${f.key} cover`).toBeTruthy();
        expect(f.label, `${tpl.id}.${f.key} label`).toBeTruthy();
        expect(f.w && f.h, `${tpl.id}.${f.key} size`).toBeTruthy();
      }
    }
  });

  it('the Origen quote is fixed copy inside the page', () => {
    const quote = CERT_TEMPLATES.origen.fields.find((f) => f.key === 'quote');
    expect(quote?.text).toMatch(/^"Tu elección hoy/);
    expect(quote?.text).toMatch(/el alma\."$/);
    const { left, top } = fieldTopLeft(quote!);
    expect(left + (quote!.w ?? 0)).toBeLessThanOrEqual(page.w);
    expect(top + (quote!.h ?? 0)).toBeLessThanOrEqual(page.h);
  });
});
