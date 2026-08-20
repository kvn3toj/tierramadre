/**
 * hayPiezaSinPrecio — el guard que cierra el hueco descrito en
 * `src/components/checkout/checkoutGuards.ts`: un guest agregaba una piedra
 * con precio y una "Consultar precio" (`precioCOP <= 0`) al mismo pedido, y
 * como `precioConMarkup(0, m)` da 0 tanto en `CheckoutSheet` como en
 * `convex/ghl.ts`'s `createOrder`, el invariante de monto nunca disparaba —
 * ambos lados estaban de acuerdo en 0. La pieza sin precio salía gratis.
 */
import { describe, it, expect } from 'vitest';
import { hayPiezaSinPrecio } from '../src/components/checkout/checkoutGuards';

describe('hayPiezaSinPrecio', () => {
  it('false cuando el carrito está vacío', () => {
    expect(hayPiezaSinPrecio([])).toBe(false);
  });

  it('false cuando todas las piezas tienen precio positivo', () => {
    expect(
      hayPiezaSinPrecio([{ precioCOP: 8_000_000 }, { precioCOP: 1_500_000 }]),
    ).toBe(false);
  });

  it('SEGURIDAD: true cuando una pieza vale 0 ("Consultar precio"), aunque las demás tengan precio', () => {
    expect(
      hayPiezaSinPrecio([{ precioCOP: 8_000_000 }, { precioCOP: 0 }]),
    ).toBe(true);
  });

  it('true cuando la única pieza vale 0', () => {
    expect(hayPiezaSinPrecio([{ precioCOP: 0 }])).toBe(true);
  });

  it('true para un precio negativo (dato corrupto, nunca un cobro real)', () => {
    expect(hayPiezaSinPrecio([{ precioCOP: -1 }])).toBe(true);
  });
});
