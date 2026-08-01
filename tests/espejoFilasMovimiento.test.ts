/**
 * La fila de Movimientos del espejo, con la regla de datos sensibles del canon.
 *
 * El canon (`docs/superpowers/specs/2026-08-01-cabeceras-canonicas-sot-v4.md`)
 * la marca obligatoria y da el motivo: **la hoja la ve todo el que tenga el
 * libro**, y en este mismo repo se acaba de matar una query pública por exponer
 * exactamente cuenta + titular. W3 SÍ captura la cuenta completa y el titular —
 * el negocio los necesita— pero viven en Convex, detrás del gate de rol, y al
 * espejo viaja solo con qué banco y una referencia enmascarada.
 *
 * Por eso los tests que importan acá son los NEGATIVOS: que el número de cuenta
 * y el titular no aparezcan en NINGÚN valor de la fila, se llame como se llame
 * la columna. Un test que solo mire `fila.numeroCuenta` no atrapa al que
 * mañana los meta dentro de `condicion` o de `notas`.
 */
import { describe, it, expect } from 'vitest';
import {
  CABECERAS_MOVIMIENTOS,
  enmascaraCola,
  enmascaraCuentasEnTexto,
  filaMovimientoParaEspejo,
} from '../convex/_lib/espejoFilas';

const BASE = {
  movimientoId: 'MOV-0001',
  kardexEventId: 'KDX-0001',
  tipo: 'VENTA' as const,
  fecha: '2026-08-01',
  itemIds: ['295', '296'],
  entregadoPor: 'Kevin',
  recibidoPor: 'Ana',
};

const CUENTA = '0123456789012';
const TITULAR = 'María Fernanda Restrepo';

describe('enmascaraCola — últimos 4, nunca el resto', () => {
  it('deja ver los últimos cuatro', () => {
    expect(enmascaraCola('0123456789012')).toBe('••••9012');
  });

  it('lo corto pasa entero: un número de recibo no es un secreto', () => {
    expect(enmascaraCola('42')).toBe('42');
    expect(enmascaraCola('4231')).toBe('4231');
  });

  it('vacío es vacío, no «••••»', () => {
    expect(enmascaraCola('')).toBe('');
    expect(enmascaraCola(undefined)).toBe('');
  });
});

describe('enmascaraCuentasEnTexto — el nombre sí, la cuenta no', () => {
  it('deja el nombre y enmascara la tirada larga de dígitos', () => {
    // El canon: «Mismo criterio para pagoComisionesA: nombre sí, cuenta
    // enmascarada». El campo es texto libre, así que la regla mira la FORMA.
    expect(enmascaraCuentasEnTexto('Ana Restrepo 0123456789012')).toBe(
      'Ana Restrepo ••••9012',
    );
  });

  it('no toca números cortos: fechas, porcentajes, recibos', () => {
    for (const t of ['Ana 30%', 'recibo 4231', 'Pedro 2026-08-01']) {
      expect(enmascaraCuentasEnTexto(t), t).toBe(t);
    }
  });
});

describe('filaMovimientoParaEspejo — lo que viaja de una venta', () => {
  const venta = {
    cliente: 'Cliente Uno',
    precioVentaRealCOP: 3_438_059,
    comisionPct: 10,
    pagoComisionesA: `Ana Restrepo ${CUENTA}`,
    formaPago: 'transferencia',
    transferencia: {
      numeroCuenta: CUENTA,
      titular: TITULAR,
      banco: 'Bancolombia',
      numeroTransaccion: '998877665544',
    },
  };
  const fila = filaMovimientoParaEspejo({ ...BASE, venta });

  it('manda el banco y la referencia enmascarada', () => {
    expect(fila.bancoOBilletera).toBe('Bancolombia');
    expect(fila.refTransaccion).toBe('••••5544');
  });

  it('NUNCA manda la cuenta completa ni el titular, en ninguna columna', () => {
    // El test que de verdad protege: barre TODOS los valores de la fila, no
    // solo las columnas que hoy se llaman así.
    const valores = Object.values(fila).join(' | ');
    expect(valores).not.toContain(CUENTA);
    expect(valores).not.toContain(TITULAR);
  });

  it('no existe una cabecera que invite a poner la cuenta', () => {
    for (const prohibida of ['numeroCuenta', 'titular', 'cuenta']) {
      expect(
        CABECERAS_MOVIMIENTOS as readonly string[],
        prohibida,
      ).not.toContain(prohibida);
    }
  });

  it('el pago de comisiones conserva el nombre y pierde la cuenta', () => {
    expect(fila.pagoComisionesA).toBe('Ana Restrepo ••••9012');
  });

  it('lo de siempre sigue viajando', () => {
    expect(fila.movimientoId).toBe('MOV-0001');
    expect(fila.tipo).toBe('VENTA');
    expect(fila.items).toBe('295, 296');
    expect(fila.cliente).toBe('Cliente Uno');
    expect(fila.precioVentaRealCOP).toBe('3438059');
    expect(fila.formaPago).toBe('transferencia');
  });
});

describe('filaMovimientoParaEspejo — los otros métodos de pago', () => {
  it('efectivo: recibo, quién recibió y dónde quedó la plata', () => {
    const fila = filaMovimientoParaEspejo({
      ...BASE,
      venta: {
        cliente: 'Cliente Dos',
        precioVentaRealCOP: 119_999,
        formaPago: 'efectivo',
        efectivo: {
          numeroRecibo: '4231',
          recibidoPor: 'Ana',
          ubicacion: 'Caja fuerte MED',
        },
      },
    });
    expect(fila.reciboCaja).toBe('4231');
    expect(fila.quienRecibio).toBe('Ana');
    expect(fila.ubicacionEfectivo).toBe('Caja fuerte MED');
    // Las columnas de otro método quedan vacías, no ausentes: el upsert exige
    // que la fila traiga todas las cabeceras.
    expect(fila.bancoOBilletera).toBe('');
  });

  it('crédito: las dos fechas', () => {
    const fila = filaMovimientoParaEspejo({
      ...BASE,
      venta: {
        cliente: 'Cliente Tres',
        precioVentaRealCOP: 442_787,
        formaPago: 'credito',
        credito: { fechaInicio: '2026-08-01', fechaPago: '2026-09-01' },
      },
    });
    expect(fila.creditoFechaInicio).toBe('2026-08-01');
    expect(fila.creditoFechaPago).toBe('2026-09-01');
  });

  it('un movimiento que no es venta no lleva bloque de pago', () => {
    const fila = filaMovimientoParaEspejo({ ...BASE, tipo: 'CONSIGNACION' });
    for (const c of [
      'cliente',
      'precioVentaRealCOP',
      'bancoOBilletera',
      'refTransaccion',
      'reciboCaja',
      'pagoComisionesA',
    ]) {
      expect(fila[c], c).toBe('');
    }
    expect(fila.tipo).toBe('CONSIGNACION');
  });
});

describe('la fila y las cabeceras no se pueden separar', () => {
  it('la fila trae exactamente las cabeceras declaradas', () => {
    // El drenaje revienta la fila si le falta una cabecera («esas columnas no se
    // escriben»), y una clave de más se escribe en ningún lado. Que las dos
    // listas coincidan es el contrato.
    const fila = filaMovimientoParaEspejo(BASE);
    expect(Object.keys(fila).sort()).toEqual([...CABECERAS_MOVIMIENTOS].sort());
  });
});
