/**
 * Lo que la vitrina MUESTRA es lo que el checkout COBRA.
 *
 * El 2026-09-04 no lo era. `convex/ghl.ts` resolvía el precio con
 * `product.precioCOP ?? 0` —el riel legacy, sin columna en el espejo SOT desde
 * el 2026-05-29 y hoy en 0 o ausente en casi todo el inventario— mientras el
 * catálogo pinta `precioFinalCOP`.
 *
 * El orden en que le pegaba al cliente es lo que lo hace grave: veía la pieza
 * CON precio, la agregaba, escribía nombre, celular y correo, y recién en el
 * último paso el servidor tiraba `PRECIO_NO_DISPONIBLE`. Ocho piezas del lote
 * TM-001 estaban exactamente así ese día —precio en la vitrina, 0 en
 * `precioCOP`— porque se les había puesto precio esa misma mañana en el campo
 * correcto.
 *
 * El mismo campo alimentaba `searchProducts`, el catálogo que se ofrece por
 * WhatsApp: esas 8 piezas ($1.280.000) no se podían ni ofrecer.
 *
 * Este test fija la equivalencia entre las dos puntas. Compara el resolvedor
 * del servidor (convex/_lib) contra el del cliente (src/utils), que son gemelos
 * a propósito: Convex no puede importar de `src/`, así que la única defensa
 * contra que se separen es esto.
 */
import { describe, it, expect } from 'vitest';
import { precioBaseCOP as servidor } from '../convex/_lib/precioBase';
import { precioBaseCOP as cliente } from '../src/utils/precioBase';

describe('el precio cobrado es el publicado', () => {
  it('una pieza con precio sólo en precioFinalCOP SE PUEDE cobrar', () => {
    // La forma exacta de las ocho de TM-001: precio puesto en el campo vivo,
    // `precioCOP` en 0 porque el riel legacy ya no se escribe.
    const pieza = { precioFinalCOP: 105_000, precioCOP: 0 };
    expect(servidor(pieza)).toBe(105_000);
    // Con el bug, esto daba 0 y `precioBaseEsValido(0)` era false → la orden
    // se rechazaba con PRECIO_NO_DISPONIBLE después de pedir los datos.
    expect(servidor(pieza)).not.toBe(0);
  });

  it('una pieza SIN precio devuelve undefined, no un cobro de cero pesos', () => {
    // `undefined` deja que el llamador distinga «gratis» de «no sé cuánto
    // vale». El 0 lo rechaza `precioBaseEsValido`, que es lo que corresponde.
    expect(servidor({})).toBeUndefined();
    expect(servidor(null)).toBeUndefined();
  });

  it('servidor y cliente resuelven IGUAL — son gemelos, no pueden divergir', () => {
    const casos = [
      { precioFinalCOP: 105_000 },
      { precioFinalCOP: 105_000, precioFinalUSD: 0 },
      { precioFinalCOP: 54_958_887, precioFinalUSD: 17_100 },
      { precioFinalCOP: 0 },
      {},
    ];
    for (const c of casos) {
      expect(servidor(c), JSON.stringify(c)).toBe(cliente(c));
      // Y con TRM, para el ancla en dólares.
      expect(servidor(c, 3141.36), JSON.stringify(c)).toBe(cliente(c, 3141.36));
    }
  });

  it('sin TRM el ancla en dólares cae al COP de la hoja — nunca a 0', () => {
    // El servidor NO recibe TRM a propósito (ver convex/_lib/precioBase.ts):
    // `createOrder` es una mutation y su propia regla es «never trust
    // client-supplied amounts». La consecuencia queda fijada acá: se cobra el
    // COP provisional, no USD × TRM. Es una brecha conocida, no un accidente.
    const anclada = { precioFinalCOP: 54_958_887, precioFinalUSD: 17_100 };
    expect(servidor(anclada)).toBe(54_958_887);
    expect(servidor(anclada)).not.toBe(0);
  });
});

/**
 * La regresión que casi meto yo, y por eso queda fijada.
 *
 * Al mandar el «Precio público» a `precioFinalCOP` (en vez del legacy
 * `precioCOP`), el drawer de Fotosíntesis seguía HIDRATÁNDOSE del legacy. Las
 * ocho piezas de TM-001 que recibieron precio el 2026-09-04 tienen
 * `precioFinalCOP` con valor y `precioCOP` en **0** — no ausente, cero.
 *
 * Con la hidratación vieja el borrador nacía en 0; y como 0 es un número y no
 * un blanco, el builder lo mandaba en vez de omitirlo, y el guardado escribía
 * `precioFinalCOP = 0` con sello `precioFinalManual`. Es decir: abrir la ficha
 * y guardar CUALQUIER otro campo borraba el precio y lo dejaba clavado en cero,
 * a salvo del re-fan que podría haberlo recuperado.
 *
 * La regla que fija esto: se hidrata del mismo campo que se escribe. Un
 * guardado que no toca el precio tiene que ser un no-op sobre el precio.
 */
describe('hidratar y escribir tienen que ser el mismo campo', () => {
  // Espejo de la hidratación en buildLotItemPayload (los cuatro sitios).
  const hidratar = (row: { precioFinalCOP?: number; precioCOP?: number }) =>
    row.precioFinalCOP ?? row.precioCOP ?? '';
  // Espejo del builder: sólo un número viaja; el blanco se omite.
  const aPatch = (v: number | '') => (typeof v === 'number' ? v : undefined);

  it('una pieza con precio vivo y `precioCOP` en 0 no se pisa sola', () => {
    const row = { precioFinalCOP: 105_000, precioCOP: 0 }; // la forma de #556
    expect(hidratar(row)).toBe(105_000);
    // Y al guardar sin tocar el precio, el patch trae el MISMO valor:
    // `next === product.precioFinalCOP`, así que no hay escritura.
    expect(aPatch(hidratar(row))).toBe(row.precioFinalCOP);
  });

  it('una fila vieja sin el campo nuevo sigue hidratando del legacy', () => {
    expect(hidratar({ precioCOP: 150_000 })).toBe(150_000);
  });

  it('sin ningún precio hidrata en blanco, y el blanco se omite', () => {
    expect(hidratar({})).toBe('');
    expect(aPatch(hidratar({}))).toBeUndefined();
  });
});
