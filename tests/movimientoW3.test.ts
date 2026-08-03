/**
 * W3 — todo lo que le pasa a una pieza después de existir es un movimiento, y
 * la venta es uno de ellos.
 *
 * Los tres candados que estos tests fijan:
 *
 *  1. **Una venta sin precio real es imposible de registrar.** El
 *     `Precio venta real` vacío en 102 filas mató la mitad analítica del
 *     modelo: el lote 3 se vendió y cobró $9.000.000 y la hoja no lo ve.
 *  2. **Vender una modalidad bloquea a sus hermanas.** C-010 está escrito en
 *     tres filas (el bulto y sus dos partes) y hoy nada impide venderlo dos
 *     veces.
 *  3. **Consignar no es vender.** La pieza sigue siendo nuestra, en otro estado.
 */
import { describe, it, expect } from 'vitest';
import {
  debeRecalcular,
  efectoSobreCasilla,
  puedeAplicarseSobre,
  puedeVenderse,
  validarMovimiento,
  type MovimientoInput,
} from '../convex/_lib/movimientoW3';

const BASE_VENTA: MovimientoInput = {
  tipo: 'VENTA',
  fecha: '2026-08-01',
  itemIds: ['525'],
  entregadoPor: 'Kevin',
  recibidoPor: 'Cliente final',
  venta: {
    cliente: 'María Restrepo',
    precioVentaRealCOP: 699_356,
    comisionPct: 10,
    formaPago: 'efectivo',
    efectivo: { numeroRecibo: 'RC-011', recibidoPor: 'Kevin' },
  },
};

describe('validarMovimiento — la venta exige precio real', () => {
  it('acepta una venta bien formada', () => {
    expect(validarMovimiento(BASE_VENTA).tipo).toBe('VENTA');
  });

  it('rechaza una venta sin bloque de venta', () => {
    const { venta: _, ...sinVenta } = BASE_VENTA;
    expect(() => validarMovimiento(sinVenta as MovimientoInput)).toThrow(
      /venta/i,
    );
  });

  it('rechaza una venta sin precio real — el dato que enciende el modelo', () => {
    expect(() =>
      validarMovimiento({
        ...BASE_VENTA,
        venta: { ...BASE_VENTA.venta!, precioVentaRealCOP: undefined as never },
      }),
    ).toThrow(/precio.*real/i);
  });

  it('rechaza un precio de venta en cero', () => {
    expect(() =>
      validarMovimiento({
        ...BASE_VENTA,
        venta: { ...BASE_VENTA.venta!, precioVentaRealCOP: 0 },
      }),
    ).toThrow(/precio/i);
  });

  it('rechaza una venta sin cliente', () => {
    expect(() =>
      validarMovimiento({
        ...BASE_VENTA,
        venta: { ...BASE_VENTA.venta!, cliente: '  ' },
      }),
    ).toThrow(/cliente/i);
  });
});

describe('validarMovimiento — la captura condicional por forma de pago', () => {
  it('efectivo exige número de recibo y quién recibió', () => {
    expect(() =>
      validarMovimiento({
        ...BASE_VENTA,
        venta: {
          ...BASE_VENTA.venta!,
          formaPago: 'efectivo',
          efectivo: undefined,
        },
      }),
    ).toThrow(/efectivo/i);
  });

  it('transferencia exige cuenta, titular y número de transacción', () => {
    expect(() =>
      validarMovimiento({
        ...BASE_VENTA,
        venta: {
          ...BASE_VENTA.venta!,
          formaPago: 'transferencia',
          efectivo: undefined,
        },
      }),
    ).toThrow(/transferencia/i);

    expect(() =>
      validarMovimiento({
        ...BASE_VENTA,
        venta: {
          ...BASE_VENTA.venta!,
          formaPago: 'transferencia',
          efectivo: undefined,
          transferencia: {
            numeroCuenta: '123',
            titular: 'Tierra Madre',
            banco: 'Bancolombia',
            numeroTransaccion: 'TX-9',
          },
        },
      }),
    ).not.toThrow();
  });

  it('crédito exige fecha de inicio y fecha de pago', () => {
    expect(() =>
      validarMovimiento({
        ...BASE_VENTA,
        venta: {
          ...BASE_VENTA.venta!,
          formaPago: 'credito',
          efectivo: undefined,
        },
      }),
    ).toThrow(/cr[eé]dito/i);
  });
});

describe('validarMovimiento — los movimientos que no son venta', () => {
  const CONSIGNACION: MovimientoInput = {
    tipo: 'CONSIGNACION',
    fecha: '2026-08-01',
    itemIds: ['526', '527'],
    entregadoPor: 'Kevin',
    recibidoPor: 'Pablo Loaiza',
    condicion: 'devolver si no se vende en 30 días',
  };

  it('una consignación no necesita bloque de venta', () => {
    expect(() => validarMovimiento(CONSIGNACION)).not.toThrow();
  });

  it('rechaza un bloque de venta en una consignación', () => {
    // Si trae precio, alguien está registrando una venta con el tipo
    // equivocado — y quedaría fuera de todos los totales de ventas.
    expect(() =>
      validarMovimiento({ ...CONSIGNACION, venta: BASE_VENTA.venta }),
    ).toThrow(/CONSIGNACION/);
  });

  it('exige al menos un ítem', () => {
    expect(() => validarMovimiento({ ...CONSIGNACION, itemIds: [] })).toThrow(
      /[ií]tem/i,
    );
  });

  it('rechaza ítems repetidos en el mismo movimiento', () => {
    expect(() =>
      validarMovimiento({ ...CONSIGNACION, itemIds: ['526', '526'] }),
    ).toThrow(/repetid/i);
  });

  it('exige quién entrega y quién recibe', () => {
    expect(() =>
      validarMovimiento({ ...CONSIGNACION, recibidoPor: '' }),
    ).toThrow(/recibid/i);
  });
});

describe('efectoSobreCasilla — qué le pasa a la pieza', () => {
  it('la venta la deja VENDIDA', () => {
    expect(efectoSobreCasilla('VENTA')).toBe('VENDIDA');
  });

  it('la consignación NO la vende: queda EN_CONSIGNACION', () => {
    expect(efectoSobreCasilla('CONSIGNACION')).toBe('EN_CONSIGNACION');
  });

  it('la devolución la devuelve a DISPONIBLE', () => {
    expect(efectoSobreCasilla('DEVOLUCION')).toBe('DISPONIBLE');
  });

  it('la entrega a asesor la deja en ASESOR', () => {
    expect(efectoSobreCasilla('ASESOR')).toBe('ASESOR');
  });
});

describe('puedeVenderse — el candado anti doble-venta (caso C-010)', () => {
  it('una pieza disponible se puede vender', () => {
    expect(puedeVenderse({ estadoCasilla: 'DISPONIBLE' }, []).ok).toBe(true);
  });

  it('una pieza en consignación TAMBIÉN se puede vender: es la graduación', () => {
    // El comercializador vendió: la venta se registra sobre la pieza que él
    // tiene. Bloquearla obligaría a devolverla primero para volver a sacarla.
    expect(puedeVenderse({ estadoCasilla: 'EN_CONSIGNACION' }, []).ok).toBe(
      true,
    );
  });

  it('una pieza ya vendida NO se vuelve a vender', () => {
    const r = puedeVenderse({ estadoCasilla: 'VENDIDA' }, []);
    expect(r.ok).toBe(false);
    expect(r.motivo).toMatch(/vendida/i);
  });

  it('si una hermana de la modalidad ya se vendió, esta se bloquea', () => {
    // C-010: vender el bulto completo tiene que impedir vender sus partes.
    const r = puedeVenderse({ estadoCasilla: 'DISPONIBLE' }, [
      { itemId: '900', estadoCasilla: 'VENDIDA' },
    ]);
    expect(r.ok).toBe(false);
    expect(r.motivo).toMatch(/modalidad|900/);
  });

  it('hermanas sin vender no bloquean nada', () => {
    expect(
      puedeVenderse({ estadoCasilla: 'DISPONIBLE' }, [
        { itemId: '900', estadoCasilla: 'DISPONIBLE' },
        { itemId: '901', estadoCasilla: 'EN_CONSIGNACION' },
      ]).ok,
    ).toBe(true);
  });
});

describe('puedeAplicarseSobre — RESERVADA', () => {
  it('rechaza cualquier movimiento sobre una pieza RESERVADA', () => {
    const veredicto = puedeAplicarseSobre("VENTA", {
      itemId: "515",
      estadoCasilla: "RESERVADA",
    });
    expect(veredicto.ok).toBe(false);
    expect(veredicto.motivo).toContain("515");
    expect(veredicto.motivo?.toLowerCase()).toContain("reservada");
    expect(veredicto.motivo?.toLowerCase()).not.toContain("vendida");
  });

  it("sigue rechazando VENDIDA con el mensaje de terminal existente", () => {
    const veredicto = puedeAplicarseSobre("DEVOLUCION", {
      itemId: "292",
      estadoCasilla: "VENDIDA",
    });
    expect(veredicto.ok).toBe(false);
    expect(veredicto.motivo?.toLowerCase()).toContain("vendida");
  });

  it("permite un movimiento sobre una pieza DISPONIBLE", () => {
    const veredicto = puedeAplicarseSobre("CONSIGNACION", {
      itemId: "600",
      estadoCasilla: "DISPONIBLE",
    });
    expect(veredicto.ok).toBe(true);
  });
});

describe('debeRecalcular — quién mueve el divisor', () => {
  it('solo VENTA recalcula el fijo', () => {
    expect(debeRecalcular('VENTA')).toBe(true);
    expect(debeRecalcular('CONSIGNACION')).toBe(false);
    expect(debeRecalcular('DEVOLUCION')).toBe(false);
    expect(debeRecalcular('ASESOR')).toBe(false);
  });
});

