import { describe, expect, it } from 'vitest';
import {
  CERT_TEMPLATES,
  clampFieldAdjust,
  fieldTopLeft,
  hasFieldAdjust,
  MAX_FIELD_FONT_FACTOR,
  MIN_FIELD_FONT_SIZE,
  resolveFieldFont,
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
  font: {
    family: 'serif',
    size: 50,
    lineHeight: 51,
    color: '#000',
  },
};

const centeredField: TemplateField = {
  key: 'name',
  kind: 'text',
  x: 529,
  y: 279,
  w: 380,
  h: 44,
  centerX: true,
  align: 'center',
};

describe('clampFieldAdjust — position', () => {
  it('keeps an in-page offset, rounded to whole px', () => {
    expect(
      clampFieldAdjust({ dx: 10.4, dy: -20.6 }, topLeftField, page),
    ).toEqual({ dx: 10, dy: -21 });
  });

  it('never lets the box leave the page on the left/top', () => {
    expect(
      clampFieldAdjust({ dx: -9999, dy: -9999 }, topLeftField, page),
    ).toEqual({ dx: -434, dy: -940 });
  });

  it('never lets the box leave the page on the right/bottom', () => {
    expect(
      clampFieldAdjust({ dx: 9999, dy: 9999 }, topLeftField, page),
    ).toEqual({ dx: page.w - 560 - 434, dy: page.h - 142 - 940 });
  });

  it('resolves centerX before clamping', () => {
    const { left } = fieldTopLeft(centeredField);
    expect(left).toBe(529 - 190);
    expect(
      clampFieldAdjust({ dx: -9999, dy: 0 }, centeredField, {
        w: 792,
        h: 612,
      }),
    ).toEqual({ dx: -left, dy: 0 });
  });
});

describe('clampFieldAdjust — size and alignment', () => {
  it('keeps a size inside the allowed range and rounds it', () => {
    expect(
      clampFieldAdjust({ dx: 0, dy: 0, size: 61.6 }, topLeftField, page).size,
    ).toBe(62);
  });

  it('clamps the size to the floor and the template ceiling', () => {
    expect(
      clampFieldAdjust({ dx: 0, dy: 0, size: 2 }, topLeftField, page).size,
    ).toBe(MIN_FIELD_FONT_SIZE);
    expect(
      clampFieldAdjust({ dx: 0, dy: 0, size: 9999 }, topLeftField, page).size,
    ).toBe(50 * MAX_FIELD_FONT_FACTOR);
  });

  it('drops a size equal to the template size, and any size on a font-less field', () => {
    expect(
      clampFieldAdjust({ dx: 0, dy: 0, size: 50 }, topLeftField, page),
    ).toEqual({ dx: 0, dy: 0 });
    expect(
      clampFieldAdjust({ dx: 0, dy: 0, size: 30 }, centeredField, page),
    ).toEqual({ dx: 0, dy: 0 });
  });

  it('keeps a real alignment change and drops the template default', () => {
    expect(
      clampFieldAdjust({ dx: 0, dy: 0, align: 'justify' }, topLeftField, page)
        .align,
    ).toBe('justify');
    expect(
      clampFieldAdjust({ dx: 0, dy: 0, align: 'left' }, topLeftField, page),
    ).toEqual({ dx: 0, dy: 0 });
    expect(
      clampFieldAdjust({ dx: 0, dy: 0, align: 'center' }, centeredField, page),
    ).toEqual({ dx: 0, dy: 0 });
  });
});

describe('resolveFieldFont', () => {
  it('scales the leading with the size override', () => {
    expect(resolveFieldFont(topLeftField, { dx: 0, dy: 0, size: 100 })).toEqual(
      { size: 100, lineHeight: 102 },
    );
    expect(resolveFieldFont(topLeftField, undefined)).toEqual({
      size: 50,
      lineHeight: 51,
    });
    expect(resolveFieldFont(centeredField, undefined)).toBeNull();
  });
});

describe('hasFieldAdjust', () => {
  it('is false for undefined and the zero adjustment', () => {
    expect(hasFieldAdjust(undefined)).toBe(false);
    expect(hasFieldAdjust({ dx: 0, dy: 0 })).toBe(false);
    expect(hasFieldAdjust({ dx: 0, dy: 1 })).toBe(true);
    expect(hasFieldAdjust({ dx: 0, dy: 0, size: 40 })).toBe(true);
    expect(hasFieldAdjust({ dx: 0, dy: 0, align: 'right' })).toBe(true);
  });
});

describe('CERT_TEMPLATES movable blocks', () => {
  it('every movable field has a label and a size', () => {
    for (const tpl of Object.values(CERT_TEMPLATES)) {
      for (const f of tpl.fields.filter((x) => x.movable)) {
        expect(f.label, `${tpl.id}.${f.key} label`).toBeTruthy();
        expect(f.w && f.h, `${tpl.id}.${f.key} size`).toBeTruthy();
      }
    }
  });

  it('no field paints a cover swatch — the v2 artwork has no baked sample text to hide', () => {
    for (const tpl of Object.values(CERT_TEMPLATES)) {
      for (const f of tpl.fields) {
        expect(f.cover, `${tpl.id}.${f.key} cover`).toBeUndefined();
      }
    }
  });

  it('the Origen claims and message defaults sit inside the page', () => {
    const claims = CERT_TEMPLATES.origen.fields.find((f) => f.key === 'claims');
    const quote = CERT_TEMPLATES.origen.fields.find((f) => f.key === 'quote');
    expect(claims?.text).toBe(
      '~ Esmeraldas Colombianas\n\n~ 100% Natural\n\n~ ADN de Paz',
    );
    expect(quote?.text).toBe('Origen, legado y propósito.');
    for (const f of [claims!, quote!]) {
      const { left, top } = fieldTopLeft(f);
      expect(left + (f.w ?? 0)).toBeLessThanOrEqual(page.w);
      expect(top + (f.h ?? 0)).toBeLessThanOrEqual(page.h);
    }
  });

  it('the Origen detail lines follow the 2026-09 order', () => {
    expect(CERT_TEMPLATES.origen.detailLines?.map((l) => l.key)).toEqual([
      'tipo',
      'calidad',
      'corte',
      'color',
      'peso',
      'cantidad',
      'joya',
    ]);
  });

  it('artwork filenames carry the brand generation (immutable CDN cache)', () => {
    expect(CERT_TEMPLATES.origen.background).toMatch(/bg_origen-2026-v2\.jpg$/);
    expect(CERT_TEMPLATES.embajador.background).toMatch(
      /bg_embajador-2026-v2\.jpg$/,
    );
  });
});
