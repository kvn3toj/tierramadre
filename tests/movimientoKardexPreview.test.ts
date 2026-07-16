import { describe, it, expect, afterEach } from 'vitest';
import { createElement } from 'react';
import { render, cleanup } from '@testing-library/react';

// MovimientoKardexPreview is pure presentational (MUI Box + design-system
// tokens only) — no Convex, no hooks — so it renders directly with no
// provider/mocks. Written with createElement to stay a `.test.ts` file
// (vitest include is tests/**/*.test.ts), matching tests/kardexPreview.test.ts.
//
// This pins the photo column: the comprobante is a physical-possession record
// handed to an external consignee, so a row's photo must actually reach the
// paper, and it must be same-origin or the PDF export silently breaks.
import {
  MovimientoKardexPreview,
  type MovimientoKardexRow,
} from '../src/pages/admin/Fotosintesis/components/MovimientoKardexPreview';

afterEach(cleanup);

function row(over: Partial<MovimientoKardexRow> = {}): MovimientoKardexRow {
  return {
    itemId: '437',
    itemNombre: 'Rocas Lunares',
    tipo: 'entrega',
    asesorNombre: 'Juan Manuel Escobar Ramírez',
    fecha: '2026-07-16',
    movimientoId: 'MOV-437-1',
    ...over,
  };
}

describe('MovimientoKardexPreview — photo column', () => {
  it("renders the item's photo when the row carries one", () => {
    const { container } = render(
      createElement(MovimientoKardexPreview, {
        rows: [row({ fotoUrl: '/api/serve-drive-image?fileId=ABC' })],
        kardexEventId: 'KDX-1',
      }),
    );
    const img = container.querySelector(
      'img[src="/api/serve-drive-image?fileId=ABC"]',
    );
    expect(img).not.toBeNull();
  });

  it('sets crossOrigin=anonymous — html2canvas taints the canvas without it and captureNodeToPdf fails', () => {
    const { container } = render(
      createElement(MovimientoKardexPreview, {
        rows: [row({ fotoUrl: '/api/serve-drive-image?fileId=ABC' })],
        kardexEventId: 'KDX-1',
      }),
    );
    const img = container.querySelector(
      'img[src="/api/serve-drive-image?fileId=ABC"]',
    );
    expect(img?.getAttribute('crossorigin')).toBe('anonymous');
  });

  it('renders no img for a row without a photo, rather than a broken one', () => {
    const { container } = render(
      createElement(MovimientoKardexPreview, {
        rows: [row({ fotoUrl: undefined })],
        kardexEventId: 'KDX-1',
      }),
    );
    // The logo is the only img on the paper; no item thumbnail joins it.
    const itemImgs = [...container.querySelectorAll('img')].filter(
      (i) => !(i.getAttribute('src') ?? '').includes('logo'),
    );
    expect(itemImgs).toHaveLength(0);
  });

  it('gives every item its own photo — a multi-item event is the whole point', () => {
    const { container } = render(
      createElement(MovimientoKardexPreview, {
        rows: [
          row({ itemId: '437', fotoUrl: '/api/serve-drive-image?fileId=A' }),
          row({
            itemId: '264',
            movimientoId: 'MOV-264-1',
            fotoUrl: '/api/serve-drive-image?fileId=B',
          }),
          row({ itemId: '118', movimientoId: 'MOV-118-1', fotoUrl: undefined }),
        ],
        kardexEventId: 'KDX-1',
      }),
    );
    expect(
      container.querySelector('img[src="/api/serve-drive-image?fileId=A"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('img[src="/api/serve-drive-image?fileId=B"]'),
    ).not.toBeNull();
  });
});
