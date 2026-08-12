/**
 * La doble corrida ítem por ítem (SOT-V4-FASE1, punto 8) — compara lo que la
 * OPERACIÓN cobra hoy contra lo que el motor v4 recomendaría cobrar.
 *
 * **Qué columna de v3 es «el precio real»:** `precioFinalCOP` (columna M de la
 * pestaña Inventario). Es SHEET-OWNED desde 2026-07-23
 * (`convex/_lib/sheetPullMaps.ts`): un humano lo fija en la hoja y viaja de
 * vuelta a Convex; `costoBaseCOP × 2.6` solo es la semilla de un ítem nuevo.
 * Es la lista de precios oficial del catálogo, no una fórmula.
 *
 * `AT` («Precio objetivo (modelo)») NO es esta columna: es el objetivo que
 * calculaba el xlsx viejo a mano, `preserve: true`, y es justamente el modelo
 * que el motor v4 reemplaza — no la vara contra la que compararlo. `AU`
 * («Caja: precio venta») tampoco: es el valor de una transacción de caja, no
 * el precio de lista.
 *
 * **Qué de v4 se compara:** `precioObjetivoUnidadCOP` — «supervivencia + 30%
 * de margen neto», el equivalente v4 de un precio de catálogo (no
 * `equilibrioRealUnidadCOP`, que es el piso de no perder plata, ni `KUnidadCOP`,
 * que ni siquiera viaja al espejo).
 *
 * Es reporte, no corrección (dictamen de Kevin): la función no decide cuál
 * precio es el correcto, solo mide la diferencia y por qué un ítem no se pudo
 * comparar.
 */
import { describe, it, expect } from 'vitest';
import {
  compararPreciosItemV3vsV4,
  mapearInventarioParaComparar,
  resumirComparacion,
  filaParaGuardar,
  agruparMotivos,
} from '../convex/_lib/dobleCorrida';

// Los mismos cuatro ítems y los mismos `precioObjetivoUnidadCOP` pinneados en
// `tests/motorUnidad.test.ts` (lote 10, patrón oro de la auditoría del 25/07).
const PRECIOS_V4 = new Map([
  [
    '372',
    { precioObjetivoUnidadCOP: 665_681, categoriaFiscal: 'gema' as const },
  ],
  [
    '373',
    { precioObjetivoUnidadCOP: 874_126, categoriaFiscal: 'gema' as const },
  ],
  [
    '374',
    { precioObjetivoUnidadCOP: 201_721, categoriaFiscal: 'gema' as const },
  ],
  [
    '375',
    { precioObjetivoUnidadCOP: 564_820, categoriaFiscal: 'gema' as const },
  ],
]);

describe('compararPreciosItemV3vsV4', () => {
  it('calcula la diferencia en COP y en % cuando ambos precios existen', () => {
    const filasV3 = [{ itemId: '372', precioFinalCOP: 700_000 }];
    const [c] = compararPreciosItemV3vsV4(filasV3, PRECIOS_V4);
    expect(c.precioV3COP).toBe(700_000);
    expect(c.precioV4COP).toBe(665_681);
    expect(c.diferenciaCOP).toBe(665_681 - 700_000);
    expect(c.diferenciaPct).toBeCloseTo((665_681 - 700_000) / 700_000, 10);
    expect(c.motivo).toBeUndefined();
  });

  it('la diferencia es v4 menos v3: positiva cuando el motor pide MÁS que hoy', () => {
    const filasV3 = [{ itemId: '374', precioFinalCOP: 150_000 }];
    const [c] = compararPreciosItemV3vsV4(filasV3, PRECIOS_V4);
    expect(c.diferenciaCOP).toBe(201_721 - 150_000);
    expect(c.diferenciaCOP).toBeGreaterThan(0);
  });

  it('un ítem sin precioFinalCOP en la hoja no se compara, y dice por qué', () => {
    const filasV3 = [{ itemId: '372', precioFinalCOP: undefined }];
    const [c] = compararPreciosItemV3vsV4(filasV3, PRECIOS_V4);
    expect(c.precioV3COP).toBeUndefined();
    expect(c.diferenciaCOP).toBeUndefined();
    expect(c.diferenciaPct).toBeUndefined();
    expect(c.motivo).toMatch(/precioFinalCOP/);
    // Igual reporta lo que v4 sí sabe, para que el reporte no lo esconda.
    expect(c.precioV4COP).toBe(665_681);
  });

  it('un precioFinalCOP de 0 en la hoja cuenta como ausente, no como precio', () => {
    const filasV3 = [{ itemId: '372', precioFinalCOP: 0 }];
    const [c] = compararPreciosItemV3vsV4(filasV3, PRECIOS_V4);
    expect(c.motivo).toMatch(/precioFinalCOP/);
  });

  it('un ítem que v4 no cotiza no se compara, y dice por qué', () => {
    const filasV3 = [{ itemId: '999', precioFinalCOP: 500_000 }];
    const [c] = compararPreciosItemV3vsV4(filasV3, PRECIOS_V4);
    expect(c.precioV3COP).toBe(500_000);
    expect(c.precioV4COP).toBeUndefined();
    expect(c.motivo).toMatch(/no cotiza/);
  });

  it('un ítem que existe en v4 pero no en la hoja v3 también se reporta', () => {
    const c = compararPreciosItemV3vsV4([], PRECIOS_V4).find(
      (x) => x.itemId === '372',
    );
    expect(c?.precioV4COP).toBe(665_681);
    expect(c?.motivo).toMatch(/hoja/);
  });

  it('no duplica un itemId repetido en la hoja', () => {
    const filasV3 = [
      { itemId: '372', precioFinalCOP: 700_000 },
      { itemId: '372', precioFinalCOP: 999_999 },
    ];
    expect(
      compararPreciosItemV3vsV4(filasV3, PRECIOS_V4).filter(
        (c) => c.itemId === '372',
      ),
    ).toHaveLength(1);
  });

  it('produce una fila por cada ítem de la unión v3 ∪ v4, sin perder ninguno', () => {
    const filasV3 = [
      { itemId: '372', precioFinalCOP: 700_000 },
      { itemId: '999', precioFinalCOP: 500_000 },
    ];
    const salida = compararPreciosItemV3vsV4(filasV3, PRECIOS_V4);
    // 372,373,374,375 de v4 + 999 exclusivo de v3 = 5, sin duplicar 372.
    expect(salida.map((c) => c.itemId).sort()).toEqual(
      ['372', '373', '374', '375', '999'].sort(),
    );
  });
});

describe('mapearInventarioParaComparar', () => {
  it('lee el id de la columna `item`, no `itemId` — el mismo defecto de la migración', () => {
    const filas = [{ item: '372', precioFinalCOP: '700000' }];
    expect(mapearInventarioParaComparar(filas)).toEqual([
      { itemId: '372', precioFinalCOP: 700_000 },
    ]);
  });

  it('parsea el formato con comas de miles que sirve Sheets (numeroDeHoja)', () => {
    const filas = [{ item: '372', precioFinalCOP: '$ 700,000' }];
    expect(mapearInventarioParaComparar(filas)[0].precioFinalCOP).toBe(700_000);
  });

  it('un precioFinalCOP ausente o 0 sale como undefined, no como 0', () => {
    const filas = [
      { item: '372', precioFinalCOP: '' },
      { item: '373', precioFinalCOP: '0' },
    ];
    const out = mapearInventarioParaComparar(filas);
    expect(out[0].precioFinalCOP).toBeUndefined();
    expect(out[1].precioFinalCOP).toBeUndefined();
  });

  it('revienta si se leyeron filas y ninguna trae `item` — mapeo roto, no hoja vacía', () => {
    expect(() =>
      mapearInventarioParaComparar([
        { itemId: '372', precioFinalCOP: '700000' },
      ]),
    ).toThrow(/item/);
  });

  it('una hoja de verdad vacía no revienta', () => {
    expect(mapearInventarioParaComparar([])).toEqual([]);
  });
});

describe('resumirComparacion', () => {
  it('agrega mediana y buckets, no un total — la lección del divisor', () => {
    // Tres ítems comparables: -10%, 0%, +20%. Mediana = 0%.
    const comparaciones = [
      {
        itemId: 'a',
        precioV3COP: 100,
        precioV4COP: 90,
        diferenciaCOP: -10,
        diferenciaPct: -0.1,
      },
      {
        itemId: 'b',
        precioV3COP: 100,
        precioV4COP: 100,
        diferenciaCOP: 0,
        diferenciaPct: 0,
      },
      {
        itemId: 'c',
        precioV3COP: 100,
        precioV4COP: 120,
        diferenciaCOP: 20,
        diferenciaPct: 0.2,
      },
    ];
    const resumen = resumirComparacion(comparaciones);
    expect(resumen.comparables).toBe(3);
    expect(resumen.medianaDiferenciaPct).toBeCloseTo(0, 10);
    expect(resumen.sobre10Pct).toBe(1); // solo 'c', 20% > 10%
  });

  it('la mediana de un número par de ítems promedia los dos del medio', () => {
    const comparaciones = [
      {
        itemId: 'a',
        precioV3COP: 100,
        precioV4COP: 90,
        diferenciaCOP: -10,
        diferenciaPct: -0.1,
      },
      {
        itemId: 'b',
        precioV3COP: 100,
        precioV4COP: 95,
        diferenciaCOP: -5,
        diferenciaPct: -0.05,
      },
      {
        itemId: 'c',
        precioV3COP: 100,
        precioV4COP: 105,
        diferenciaCOP: 5,
        diferenciaPct: 0.05,
      },
      {
        itemId: 'd',
        precioV3COP: 100,
        precioV4COP: 110,
        diferenciaCOP: 10,
        diferenciaPct: 0.1,
      },
    ];
    expect(resumirComparacion(comparaciones).medianaDiferenciaPct).toBeCloseTo(
      0,
      10,
    );
  });

  it('agrupa lo que no se pudo comparar por motivo, sin perderlo en la mediana', () => {
    const comparaciones = [
      {
        itemId: 'a',
        precioV3COP: 100,
        precioV4COP: 90,
        diferenciaCOP: -10,
        diferenciaPct: -0.1,
      },
      { itemId: 'x', motivo: 'sin precioFinalCOP en el SOT v3' },
      { itemId: 'y', motivo: 'sin precioFinalCOP en el SOT v3' },
      { itemId: 'z', motivo: 'v4 no cotiza el ítem' },
    ];
    const resumen = resumirComparacion(comparaciones);
    expect(resumen.comparables).toBe(1);
    expect(resumen.sinComparar).toContainEqual({
      motivo: 'sin precioFinalCOP en el SOT v3',
      cantidad: 2,
    });
    expect(resumen.sinComparar).toContainEqual({
      motivo: 'v4 no cotiza el ítem',
      cantidad: 1,
    });
  });

  it('con cero comparables la mediana es 0, no NaN', () => {
    expect(resumirComparacion([]).medianaDiferenciaPct).toBe(0);
  });

  it('junta los itemIds de `revisarInferencia` en su propia lista, sin filtrarlos de la mediana', () => {
    const comparaciones = [
      {
        itemId: 'a',
        precioV3COP: 100,
        precioV4COP: 90,
        diferenciaCOP: -10,
        diferenciaPct: -0.1,
        revisarInferencia: false,
      },
      {
        itemId: 'b',
        precioV3COP: 100,
        precioV4COP: 145,
        diferenciaCOP: 45,
        diferenciaPct: 0.45,
        revisarInferencia: true,
      },
    ];
    const resumen = resumirComparacion(comparaciones);
    expect(resumen.comparables).toBe(2); // sigue contando las dos
    expect(resumen.paraRevisarInferencia).toEqual(['b']);
  });
});

describe('compararPreciosItemV3vsV4 — divergencia en lotes con categoría inferida', () => {
  // Decisión de Kevin, 2026-08-02, §2d: «donde la inferencia esté mal, la
  // comparación v3-vs-v4 va a divergir fuerte... divergencias >30% en lotes
  // 'inferida' van directo a la lista de revisión de Kevin.»
  const PRECIOS_V4_ORIGEN = new Map([
    [
      '372',
      {
        precioObjetivoUnidadCOP: 665_681,
        categoriaFiscalOrigen: 'inferida' as const,
      },
    ],
    [
      '900',
      {
        precioObjetivoUnidadCOP: 1_000_000,
        categoriaFiscalOrigen: 'capturada' as const,
      },
    ],
  ]);

  it('un ítem `inferida` que diverge >30% se marca para revisión', () => {
    // v3 cobra 400.000, v4 (inferido como gema) recomienda 665.681: +66%.
    const [c] = compararPreciosItemV3vsV4(
      [{ itemId: '372', precioFinalCOP: 400_000 }],
      PRECIOS_V4_ORIGEN,
    );
    expect(c.categoriaFiscalOrigen).toBe('inferida');
    expect(c.revisarInferencia).toBe(true);
  });

  it('un ítem `inferida` que NO diverge no se marca — la inferencia probablemente acertó', () => {
    const [c] = compararPreciosItemV3vsV4(
      [{ itemId: '372', precioFinalCOP: 690_000 }],
      PRECIOS_V4_ORIGEN,
    );
    expect(c.revisarInferencia).toBe(false);
  });

  it('un ítem `capturada` nunca se marca, sin importar cuánto diverja', () => {
    const [c] = compararPreciosItemV3vsV4(
      [{ itemId: '900', precioFinalCOP: 100_000 }], // +900%, pero es capturada
      PRECIOS_V4_ORIGEN,
    );
    expect(c.categoriaFiscalOrigen).toBe('capturada');
    expect(c.revisarInferencia).toBe(false);
  });

  it('un ítem que no se pudo comparar no se marca — no hay con qué medir la divergencia', () => {
    const [c] = compararPreciosItemV3vsV4([], PRECIOS_V4_ORIGEN).filter(
      (x) => x.itemId === '372',
    );
    expect(c.revisarInferencia).toBe(false);
  });
});

/**
 * La corrida que se GUARDA — agregado el 2026-08-12.
 *
 * `dobleCorrida:ejecutar` no persistía nada: devolvía el reporte y se evaporaba. Un
 * gate cuya evidencia no queda registrada no es un gate: no se puede comparar una
 * corrida con la siguiente, ni auditar con qué datos salió cada número.
 *
 * `filaParaGuardar` decide QUÉ se guarda, y las dos decisiones tienen motivo:
 *
 *  - **Sólo los comparables**, no las 530 filas. Los no comparables ya están
 *    contados y agrupados por motivo en el resumen; guardar las 526 restantes es
 *    volumen sin información, y el proyecto ya está sobre los límites de su plan.
 *  - **`comparablesConCategoriaInferida`**, que no existía. En la corrida del
 *    2026-08-12 los CUATRO comparables tenían la categoría fiscal inferida, y esa
 *    es la razón principal por la que el número no sostiene un dictamen — la
 *    categoría decide el régimen con que se cotiza. Ese caveat hubo que descubrirlo
 *    leyendo los ítems uno por uno; contarlo lo pone delante de quien lea el
 *    resultado.
 */
describe('filaParaGuardar — la evidencia que sobrevive a la corrida', () => {
  const RESUMEN = {
    comparables: 2,
    medianaDiferenciaPct: 0.1,
    sobre5Pct: 2,
    sobre10Pct: 1,
    sinComparar: [{ motivo: 'v4 no cotiza el ítem', cantidad: 484 }],
    paraRevisarInferencia: ['999'],
  };
  const COMPARACIONES = [
    {
      itemId: '490',
      precioV3COP: 1_537_224,
      precioV4COP: 1_743_323,
      diferenciaCOP: 206_099,
      diferenciaPct: 0.134,
      categoriaFiscalOrigen: 'inferida' as const,
      revisarInferencia: false,
    },
    {
      itemId: '487',
      precioV3COP: 2_054_421,
      precioV4COP: 2_074_860,
      diferenciaCOP: 20_439,
      diferenciaPct: 0.0099,
      categoriaFiscalOrigen: 'capturada' as const,
      revisarInferencia: false,
    },
    { itemId: '538', motivo: 'sin precioFinalCOP en el SOT v3' },
  ];

  const fila = () =>
    filaParaGuardar(
      { filasHojaLeidas: 530, resumen: RESUMEN, comparaciones: COMPARACIONES },
      1_755_000_000_000,
    );

  it('guarda SÓLO los comparables, no las filas que no se pudieron comparar', () => {
    expect(fila().comparaciones.map((c) => c.itemId)).toEqual(['490', '487']);
  });

  it('cuenta cuántos comparables se apoyan en una categoría INFERIDA', () => {
    // El caveat de la corrida del 2026-08-12, ahora como dato y no como nota al pie.
    expect(fila().comparablesConCategoriaInferida).toBe(1);
  });

  it('conserva el resumen entero y estampa el momento de la corrida', () => {
    const f = fila();
    expect(f.ts).toBe(1_755_000_000_000);
    expect(f.filasHojaLeidas).toBe(530);
    expect(f.medianaDiferenciaPct).toBe(0.1);
    expect(f.sobre5Pct).toBe(2);
    expect(f.sobre10Pct).toBe(1);
    expect(f.sinComparar).toEqual(RESUMEN.sinComparar);
    expect(f.paraRevisarInferencia).toEqual(['999']);
  });

  it('una corrida sin ningún comparable se guarda igual, con cero', () => {
    const vacia = filaParaGuardar(
      {
        filasHojaLeidas: 530,
        resumen: { ...RESUMEN, comparables: 0, medianaDiferenciaPct: 0 },
        comparaciones: [{ itemId: '538', motivo: 'sin precio' }],
      },
      1,
    );
    // Guardar el cero importa: «no hubo con qué comparar» es un resultado, y sin
    // registrarlo la próxima corrida no sabe que ésta ya pasó.
    expect(vacia.comparaciones).toEqual([]);
    expect(vacia.comparablesConCategoriaInferida).toBe(0);
  });
});

/**
 * El diagnóstico de por qué 484 ítems no se pueden comparar — 2026-08-12.
 *
 * La doble corrida los agrupa bajo un motivo único («sin casilla, sin costo
 * capturado, o lote sin categoría fiscal») que junta tres causas distintas, y esa
 * indistinción es la que impedía saber qué proyecto sigue: ¿una inferencia mejor, o
 * clasificación humana sobre quinientas piezas?
 *
 * `agruparMotivos` no inventa un clasificador: agrupa los motivos que YA emite
 * `preciosDelLote`. Reusarlos es lo que garantiza que el diagnóstico mida exactamente
 * lo que el motor descarta, y no algo parecido.
 *
 * Lo único que hace falta es normalizar: los motivos nombran la casilla concreta
 * («la casilla 487 no declara…»), así que agrupar por el texto crudo daría un grupo
 * por ítem — 484 grupos de uno, que es exactamente la nada que se quiere evitar.
 */
describe('agruparMotivos — por qué no cotiza, en grupos y no en 484 líneas', () => {
  it('agrupa por causa, no por ítem: el id de la casilla no parte el grupo', () => {
    const grupos = agruparMotivos([
      { motivo: 'la casilla 487 no declara categoría fiscal y el lote es sin categoría', casillas: 2 },
      { motivo: 'la casilla 490 no declara categoría fiscal y el lote es sin categoría', casillas: 3 },
      { motivo: 'la casilla 491 no declara categoría fiscal y el lote es sin categoría', casillas: 5 },
    ]);
    expect(grupos).toHaveLength(1);
    expect(grupos[0].lotes).toBe(3);
    // Y suma las casillas de los tres lotes: es la unidad que decide prioridad.
    expect(grupos[0].casillas).toBe(10);
    expect(grupos[0].motivo).toContain('no declara categoría fiscal');
    // El id concreto no sobrevive: sería un grupo por ítem.
    expect(grupos[0].motivo).not.toMatch(/\b(487|490|491)\b/);
  });

  it('ordena por CASILLAS, no por lotes: un lote grande rinde más que muchos chicos', () => {
    const grupos = agruparMotivos([
      { motivo: 'la casilla 1 no tiene costo capturado', casillas: 1 },
      { motivo: 'la casilla 2 no tiene costo capturado', casillas: 1 },
      { motivo: 'la casilla 3 no tiene costo capturado', casillas: 1 },
      { motivo: 'el lote es de colección', casillas: 40 },
    ]);
    expect(grupos).toHaveLength(2);
    // Tres lotes contra uno, pero 40 piezas contra 3: gana el de colección.
    expect(grupos[0].motivo).toContain('colección');
    expect(grupos[0].lotes).toBe(1);
    expect(grupos[0].casillas).toBe(40);
    expect(grupos[1].casillas).toBe(3);
  });

  it('sin motivos devuelve lista vacía, no un grupo de cero', () => {
    expect(agruparMotivos([])).toEqual([]);
  });
});
