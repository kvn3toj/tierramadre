/**
 * W2 «Cerebro Creativo» — llenar la casilla, y los dos candados que la rodean.
 *
 *  1. **El costo unitario se CAPTURA.** Nunca se deriva del lote. Prorratear
 *     cotizó «Choker + Piedra» en $67.499 cuando había costado $119.999 — un
 *     error real de $52.500.
 *  2. **La diferencia contra el costo del lote se MUESTRA, no se ajusta.** Hay 5
 *     lotes (7, 15, 17, 19, 30) con diferencias reales sin explicar entre las
 *     dos fuentes. Cuadrarlas solo las escondería; el wizard las señala y deja
 *     que un humano decida.
 */
import { describe, it, expect } from 'vitest';
import {
  TOLERANCIA_RELATIVA,
  casillaEstaCompleta,
  conciliarCostos,
  completenessDelLote,
  camposFaltantes,
  type CasillaW2,
} from '../convex/_lib/casillaW2';

/** Una casilla de gema completa. */
const COMPLETA: CasillaW2 = {
  itemId: '525',
  estadoCasilla: 'PENDIENTE_CLASIFICAR',
  categoriaFiscal: 'gema',
  costoUnitarioRealCOP: 268_983,
  renombre: 'Tesoro',
  calidad: 'fina',
  color: 'verde intenso',
  corte: 'esmeralda',
  ct: 3.4,
  gradoRareza: 'alta',
};

describe('casillaEstaCompleta — qué hace falta para publicar', () => {
  it('acepta una casilla de gema con todo lo obligatorio', () => {
    expect(casillaEstaCompleta(COMPLETA)).toBe(true);
  });

  it('sin costo unitario capturado NO está completa', () => {
    // Es el dato que enciende todo el modelo. Sin él la pieza no tiene precio
    // propio y solo queda prorratear, que es lo prohibido.
    const sinCosto = { ...COMPLETA, costoUnitarioRealCOP: undefined };
    expect(casillaEstaCompleta(sinCosto)).toBe(false);
    expect(camposFaltantes(sinCosto)).toContain('costoUnitarioRealCOP');
  });

  it('un costo unitario en cero no cuenta como capturado', () => {
    // Cero es indistinguible de «todavía no lo sé», y así es como 25 piezas
    // quedaron con Costo Unit. = 0 en EQUIVALENTES.
    expect(casillaEstaCompleta({ ...COMPLETA, costoUnitarioRealCOP: 0 })).toBe(
      false,
    );
  });

  it('sin categoría fiscal NO está completa', () => {
    const sinCategoria = { ...COMPLETA, categoriaFiscal: undefined };
    expect(casillaEstaCompleta(sinCategoria)).toBe(false);
    expect(camposFaltantes(sinCategoria)).toContain('categoriaFiscal');
  });

  it('sin calidad NO está completa', () => {
    expect(casillaEstaCompleta({ ...COMPLETA, calidad: undefined })).toBe(
      false,
    );
  });

  it('una joya exige además tipo de joya y gramaje', () => {
    const joyaIncompleta: CasillaW2 = {
      ...COMPLETA,
      categoriaFiscal: 'joya',
      tipoJoya: undefined,
      gramaje: undefined,
    };
    expect(casillaEstaCompleta(joyaIncompleta)).toBe(false);
    expect(camposFaltantes(joyaIncompleta)).toEqual(
      expect.arrayContaining(['tipoJoya', 'gramaje']),
    );

    expect(
      casillaEstaCompleta({
        ...joyaIncompleta,
        tipoJoya: 'anillos mujer',
        gramaje: 4.2,
      }),
    ).toBe(true);
  });

  it('a una gema no le exige datos de joya', () => {
    expect(camposFaltantes(COMPLETA)).toEqual([]);
  });

  it('el rango de venta esperado es opcional — es una intención, no un dato', () => {
    expect(
      casillaEstaCompleta({ ...COMPLETA, rangoVentaEsperadoCOP: undefined }),
    ).toBe(true);
  });
});

describe('completenessDelLote — el score X/N', () => {
  const casillas = [
    COMPLETA,
    { ...COMPLETA, itemId: '526' },
    { ...COMPLETA, itemId: '527', costoUnitarioRealCOP: undefined },
    { ...COMPLETA, itemId: '528', calidad: undefined },
  ];

  it('cuenta cuántas están completas', () => {
    const score = completenessDelLote(casillas);
    expect(score.completas).toBe(2);
    expect(score.total).toBe(4);
    expect(score.pct).toBe(50);
  });

  it('un lote sin casillas no está listo para publicar', () => {
    const score = completenessDelLote([]);
    expect(score.total).toBe(0);
    expect(score.listoParaPublicar).toBe(false);
  });

  it('solo está listo cuando TODAS están completas', () => {
    expect(completenessDelLote(casillas).listoParaPublicar).toBe(false);
    expect(
      completenessDelLote([COMPLETA, { ...COMPLETA, itemId: '526' }])
        .listoParaPublicar,
    ).toBe(true);
  });

  it('lista los itemIds incompletos para poder ir directo a ellos', () => {
    expect(completenessDelLote(casillas).incompletas).toEqual(['527', '528']);
  });
});

describe('conciliarCostos — la diferencia se muestra, no se ajusta', () => {
  it('cuadra cuando la suma coincide con el costo del lote', () => {
    // Lote 10: los ítems 372-375 suman exactamente $931.931.
    const r = conciliarCostos(931_931, [268_983, 353_210, 81_510, 228_228]);
    expect(r.suma).toBe(931_931);
    expect(r.diferencia).toBe(0);
    expect(r.cuadra).toBe(true);
  });

  it('el lote 52 (+$630) es redondeo, no una diferencia real', () => {
    const r = conciliarCostos(1_057_063, [1_057_693]);
    expect(r.cuadra).toBe(true);
    expect(r.diferencia).toBe(630);
  });

  it('el lote 50 (−$3.000) también es redondeo', () => {
    const r = conciliarCostos(826_846, [823_846]);
    expect(r.cuadra).toBe(true);
  });

  it('el lote 15 (+$110.000) es una diferencia REAL y se señala', () => {
    const r = conciliarCostos(633_000, [743_000]);
    expect(r.cuadra).toBe(false);
    expect(r.diferencia).toBe(110_000);
    expect(r.aviso).toMatch(/110\.?000|diferencia/i);
  });

  it('el lote 7 (+$588.000) es la diferencia más grande de las cinco', () => {
    expect(conciliarCostos(1_078_000, [1_666_000]).cuadra).toBe(false);
  });

  it('el lote 17 (−$569.600) también, en el otro sentido', () => {
    const r = conciliarCostos(1_382_000, [812_400]);
    expect(r.cuadra).toBe(false);
    expect(r.diferencia).toBe(-569_600);
  });

  it('NUNCA devuelve un costo ajustado — solo el hecho', () => {
    // La firma misma es el candado: no hay campo «costoCorregido». Cuadrar la
    // diferencia en silencio es lo que hace que nadie se entere de que existe.
    const r = conciliarCostos(633_000, [743_000]);
    expect(Object.keys(r)).not.toContain('costoCorregido');
    expect(Object.keys(r)).not.toContain('costoAjustado');
  });

  it('con casillas sin costo todavía, informa cuántas faltan en vez de cuadrar', () => {
    const r = conciliarCostos(931_931, [268_983, undefined, 81_510]);
    expect(r.sinCosto).toBe(1);
    expect(r.cuadra).toBe(false);
    expect(r.aviso).toMatch(/sin costo|falta/i);
  });

  it('la tolerancia es relativa al tamaño del lote', () => {
    expect(TOLERANCIA_RELATIVA).toBeLessThan(0.01);
    // $630 sobre un millón entra; $630 sobre diez mil, no.
    expect(conciliarCostos(1_000_000, [1_000_630]).cuadra).toBe(true);
    expect(conciliarCostos(10_000, [10_630]).cuadra).toBe(false);
  });
});
