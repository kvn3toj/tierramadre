import { describe, it, expect, afterEach } from 'vitest';
import { createElement } from 'react';
import { render, cleanup } from '@testing-library/react';
import {
  MovimientoKardexPreview,
  type MovimientoKardexRow,
} from '../src/pages/admin/Fotosintesis/components/MovimientoKardexPreview';

/**
 * Regression guard: the price of a SOT v3 item is the price of the WHOLE item —
 * every stone in it — and must NEVER be multiplied by `cantidad`.
 *
 * `precioFinalCOP` is derived from `costoBaseCOP`, and costoBaseCOP was proved
 * (2026-07-23 reconciliation, 59 lotes) to be the item TOTAL: the hypothesis
 * "sum(L) == costoTotalCOP" holds for 55 lotes, while "sum(L × cantidad)" holds
 * for ZERO. Lote C-014 is the clearest case — one item with cantidad=37 whose
 * cost equals the lote's declared cost exactly.
 *
 * Before this guard, three call sites multiplied by cantidad — a leftover from
 * the pre-v3 format where the price WAS per unit:
 *   - ProductCard.tsx (customer quotations)      → charged 2× on item 89
 *   - MovimientosKardexPage.tsx (consignment)    → inflated the handover total
 *   - MovimientoKardexPreview.tsx (comprobante)  → inflated the printed record
 * On item 360 (cantidad 48) the quotation overcharged 48×.
 */

afterEach(cleanup);

function row(over: Partial<MovimientoKardexRow> = {}): MovimientoKardexRow {
  return {
    itemId: '89',
    itemNombre: 'Hadas del Bosque',
    tipo: 'entrega',
    asesorNombre: 'M.Campuzano',
    fecha: '2026-07-23',
    movimientoId: 'MOV-89-1',
    ...over,
  };
}

/** Digits only, so the assertion survives any currency formatting change. */
function digits(text: string): string[] {
  return (text.match(/[\d.,]{4,}/g) ?? []).map((s) => s.replace(/\D/g, ''));
}

describe('el precio del ítem NUNCA se multiplica por cantidad', () => {
  it('un ítem de 2 piedras a 830.116 totaliza 830.116, no 1.660.232', () => {
    const { container } = render(
      createElement(MovimientoKardexPreview, {
        rows: [row({ cantidad: 2, precio: 830116 })],
        kardexEventId: 'KDX-89',
      }),
    );
    const found = digits(container.textContent ?? '');
    expect(found).toContain('830116');
    expect(found).not.toContain('1660232');
  });

  it('el caso extremo del ítem 360 (cantidad 48) no se multiplica', () => {
    const { container } = render(
      createElement(MovimientoKardexPreview, {
        rows: [row({ itemId: '360', cantidad: 48, precio: 1000000 })],
        kardexEventId: 'KDX-360',
      }),
    );
    const found = digits(container.textContent ?? '');
    expect(found).toContain('1000000');
    expect(found).not.toContain('48000000');
  });

  it('varias filas suman sus precios, sin ponderar por cantidad', () => {
    const { container } = render(
      createElement(MovimientoKardexPreview, {
        rows: [
          row({ itemId: '89', cantidad: 2, precio: 830116 }),
          row({
            itemId: '97',
            cantidad: 2,
            precio: 520000,
            movimientoId: 'M2',
          }),
        ],
        kardexEventId: 'KDX-2',
      }),
    );
    const found = digits(container.textContent ?? '');
    expect(found).toContain('1350116'); // 830.116 + 520.000
    expect(found).not.toContain('2700232'); // el doble, si se multiplicara por 2
  });

  it('cantidad ausente no cambia el total', () => {
    const { container } = render(
      createElement(MovimientoKardexPreview, {
        rows: [row({ precio: 364780 })],
        kardexEventId: 'KDX-3',
      }),
    );
    expect(digits(container.textContent ?? '')).toContain('364780');
  });
});
