/**
 * El motor por unidad — cuánto vale CADA casilla, no el lote.
 *
 * El nudo que este módulo resuelve: D2 define el gasto fijo **por lote**, y para
 * precificar una pieza hay que decidir cuánto de ese fijo absorbe. Las tres
 * salidas obvias son las tres malas —cobrar el fijo entero N veces, hacer que el
 * precio dependa de cuántas hermanas tenga la pieza, o cambiar el divisor a
 * unidades activas, que es otro modelo de precios—. La buena, dictada por Kevin
 * el 2026-08-01 y validada en campo por la auditoría del 25/07:
 *
 *   **el lote absorbe UN SOLO fijo (D2 intacto), y ese fijo se reparte entre las
 *   casillas POR PESO DEL COSTO CAPTURADO.**
 *
 * No viola D6. D6 prohíbe DERIVAR el costo capturado prorrateando el lote; acá el
 * costo capturado es el INSUMO y solo el overhead se asigna por peso. Es
 * asignación de absorción de libro.
 *
 * Consecuencia estructural, no parche: vender el lote completo o por partes suma
 * EXACTAMENTE un fijo, así que el +18% accidental de las modalidades de venta
 * (§8 de la referencia) muere por diseño.
 *
 * ## La escalera de divisores, que es una sola lógica
 *
 * Lo que se quiere conservar va restando dentro del paréntesis, y todo se paga
 * SOBRE EL PRECIO DE VENTA, no sobre el costo:
 *
 * | Escalón          | Gema   | Joya   | Qué significa                          |
 * | ---------------- | ------ | ------ | -------------------------------------- |
 * | K                | K      | K      | Costos. **Vender acá es perder.**      |
 * | Equilibrio real  | K/0,90 | K/0,71 | Supervivencia exacta, utilidad cero    |
 * | Precio objetivo  | K/0,60 | K/0,41 | Supervivencia + 30% de margen neto     |
 *
 * La hoja NUNCA calculó el escalón del medio —saltaba de K al objetivo— y por eso
 * nadie veía el piso real. El lote 14 se ofrecía a $1.922.677 con su equilibrio
 * real en $1.895.597: a $27.080 de perder plata, con 1% de margen donde la hoja
 * creía tener 30%.
 */
import { describe, it, expect } from 'vitest';
import { CONFIG_PRECIOS_2026_07 } from '../convex/_lib/motorPrecios';
import { preciosDelLote, repartirPorPeso } from '../convex/_lib/motorUnidad';

const CFG = CONFIG_PRECIOS_2026_07;

/**
 * El lote 10 del SOT v3 = ítems 372-375, el caso que «cuadra al peso» (§5.2 de
 * `tierramadre-modelo-fijacion-precios-v2`). Gemas facetadas → sin IVA → /0,60.
 */
const LOTE_10 = {
  casillas: [
    {
      itemId: '372',
      costoUnitarioRealCOP: 268_983,
      categoriaFiscal: 'gema' as const,
    },
    {
      itemId: '373',
      costoUnitarioRealCOP: 353_210,
      categoriaFiscal: 'gema' as const,
    },
    {
      itemId: '374',
      costoUnitarioRealCOP: 81_510,
      categoriaFiscal: 'gema' as const,
    },
    {
      itemId: '375',
      costoUnitarioRealCOP: 228_228,
      categoriaFiscal: 'gema' as const,
    },
  ],
  costosVariablesLoteCOP: 9_091,
  costoFijoUnitarioLoteCOP: 442_787,
  config: CFG,
};

describe('paridad con la auditoría — lote 10, ítems 372-375', () => {
  const precios = repartirPorPeso(LOTE_10);
  const porItem = new Map(precios.map((p) => [p.itemId, p]));

  it('los costos capturados suman el costo de compra del lote', () => {
    // El hecho que hace que este caso sirva de patrón oro: $931.931 en la hoja y
    // $931.931 en las cuatro piezas, diferencia $0.
    const suma = LOTE_10.casillas.reduce(
      (a, c) => a + c.costoUnitarioRealCOP,
      0,
    );
    expect(suma).toBe(931_931);
  });

  it('el objetivo por unidad reproduce la tabla de la auditoría', () => {
    expect(porItem.get('372')?.precioObjetivoUnidadCOP).toBe(665_681);
    expect(porItem.get('373')?.precioObjetivoUnidadCOP).toBe(874_126);
    expect(porItem.get('374')?.precioObjetivoUnidadCOP).toBe(201_721);
    expect(porItem.get('375')?.precioObjetivoUnidadCOP).toBe(564_820);
  });

  it('Σ objetivo = el objetivo del lote, al peso', () => {
    // AUTOVERIFICABLE: $2.306.348 es el objetivo del lote 10 pinneado en
    // `motorPrecios.test.ts`. Si esta suma no cierra, el reparto o el residuo
    // están mal — no hace falta saber cuál de los cuatro números se movió.
    const suma = precios.reduce((a, p) => a + p.precioObjetivoUnidadCOP, 0);
    expect(suma).toBe(2_306_348);
  });

  it('el equilibrio real por unidad es el escalón que la hoja nunca calculó', () => {
    // K/0,90: lo que hay que cobrar para no perder plata, ya pagando la comisión
    // del 10% que sale DEL PRECIO. Vender en K_unidad pierde exactamente esa
    // comisión.
    expect(porItem.get('372')?.equilibrioRealUnidadCOP).toBe(443_787);
    expect(porItem.get('373')?.equilibrioRealUnidadCOP).toBe(582_751);
    expect(porItem.get('374')?.equilibrioRealUnidadCOP).toBe(134_481);
    expect(porItem.get('375')?.equilibrioRealUnidadCOP).toBe(376_547);
  });

  it('Σ equilibrio real = el equilibrio real del lote', () => {
    // La segunda suma autoverificable: $1.537.566, de la tabla del lote completo.
    const suma = precios.reduce((a, p) => a + p.equilibrioRealUnidadCOP, 0);
    expect(suma).toBe(1_537_566);
  });

  it('Σ K_unidad = K del lote, exacto', () => {
    // La tercera. El residuo va a la última casilla justamente para esto.
    const suma = precios.reduce((a, p) => a + p.KUnidadCOP, 0);
    expect(suma).toBe(1_383_809);
  });

  it('cada K_unidad coincide con la columna «Equilibrio» de la auditoría', () => {
    expect(porItem.get('372')?.KUnidadCOP).toBe(399_408);
    expect(porItem.get('373')?.KUnidadCOP).toBe(524_476);
    expect(porItem.get('374')?.KUnidadCOP).toBe(121_033);
    expect(porItem.get('375')?.KUnidadCOP).toBe(338_892);
  });

  it('el peso es el del costo, no partes iguales', () => {
    // Repartir en partes iguales le cargaría a la pieza de $81.510 el mismo
    // overhead que a la de $353.210, y la barata quedaría cotizada por encima de
    // lo que nadie paga por ella.
    expect(porItem.get('372')?.peso).toBeCloseTo(268_983 / 931_931, 10);
    expect(porItem.get('374')?.peso).toBeCloseTo(81_510 / 931_931, 10);
  });
});

describe('el redondeo — por qué el objetivo NO sale del K redondeado', () => {
  it('derivar del K redondeado daría 665.680 y la suma se pasaría un peso', () => {
    // La contradicción del enunciado, dejada explícita: «el residuo va a la
    // última casilla para que Σ K_unidad = K_lote» y «#372 = $665.681» no salen
    // del mismo cálculo. 399.408 / 0,60 = 665.680 exacto, no 665.681.
    //
    // Lo desempata la auditoría, que en §5.2 lista K_unidad = $399.408 Y
    // objetivo = $665.681 en la MISMA fila: derivó el objetivo del K sin
    // redondear. Este test fija esa lectura para que nadie la «arregle» después.
    expect(Math.round(399_408 / 0.6)).toBe(665_680);
    const p = repartirPorPeso(LOTE_10).find((x) => x.itemId === '372');
    expect(p?.KUnidadCOP).toBe(399_408);
    expect(p?.precioObjetivoUnidadCOP).toBe(665_681);
  });
});

describe('una sola casilla', () => {
  it('absorbe el overhead entero y su K es el K del lote', () => {
    const [p] = repartirPorPeso({
      casillas: [
        { itemId: 'x', costoUnitarioRealCOP: 931_931, categoriaFiscal: 'gema' },
      ],
      costosVariablesLoteCOP: 9_091,
      costoFijoUnitarioLoteCOP: 442_787,
      config: CFG,
    });
    expect(p.peso).toBe(1);
    expect(p.KUnidadCOP).toBe(1_383_809);
    expect(p.precioObjetivoUnidadCOP).toBe(2_306_348);
  });
});

describe('lote mixto — cada casilla con su régimen', () => {
  const MIXTO = {
    casillas: [
      {
        itemId: 'g',
        costoUnitarioRealCOP: 500_000,
        categoriaFiscal: 'gema' as const,
      },
      {
        itemId: 'j',
        costoUnitarioRealCOP: 500_000,
        categoriaFiscal: 'joya' as const,
      },
    ],
    costosVariablesLoteCOP: 0,
    costoFijoUnitarioLoteCOP: 400_000,
    config: CFG,
  };

  it('la joya paga IVA y la gema no, con el mismo K', () => {
    const porItem = new Map(repartirPorPeso(MIXTO).map((p) => [p.itemId, p]));
    expect(porItem.get('g')?.KUnidadCOP).toBe(porItem.get('j')?.KUnidadCOP);
    // Mismo costo, mismo K, y aun así 46% de diferencia de precio: es la
    // asimetría fiscal, y es la razón de que la categoría no tenga default.
    expect(porItem.get('g')?.precioObjetivoUnidadCOP).toBe(1_166_667);
    expect(porItem.get('j')?.precioObjetivoUnidadCOP).toBe(1_707_317);
  });

  it('Σ K_unidad sigue siendo el K del lote: el régimen no mueve el costo', () => {
    const suma = repartirPorPeso(MIXTO).reduce((a, p) => a + p.KUnidadCOP, 0);
    expect(suma).toBe(1_400_000);
  });

  it('el invariante de suma se sostiene POR GRUPO fiscal', () => {
    // En un lote mixto no existe «el objetivo del lote»: son dos divisores. El
    // residuo se cierra dentro de cada grupo, que es donde la suma tiene
    // sentido.
    const precios = repartirPorPeso(MIXTO);
    const gema = precios.filter((p) => p.categoriaFiscal === 'gema');
    const kGema = gema.reduce((a, p) => a + p.KUnidadCOP, 0);
    const objGema = gema.reduce((a, p) => a + p.precioObjetivoUnidadCOP, 0);
    expect(objGema).toBe(Math.round(kGema / 0.6));
  });
});

describe('lo que se niega a calcular', () => {
  it('una casilla sin costo capturado revienta — el llamador tenía que gatearla', () => {
    // La regla de escritura: el precio por unidad solo se escribe cuando la
    // casilla TIENE costo y el lote pasó la conciliación. Si igual llega acá,
    // reventar es lo correcto: seguir de largo produciría pesos que no suman 1 y
    // un reparto silenciosamente mal repartido.
    expect(() =>
      repartirPorPeso({
        casillas: [
          { itemId: 'a', costoUnitarioRealCOP: 100, categoriaFiscal: 'gema' },
          { itemId: 'b', costoUnitarioRealCOP: 0, categoriaFiscal: 'gema' },
        ],
        costosVariablesLoteCOP: 0,
        costoFijoUnitarioLoteCOP: 100,
        config: CFG,
      }),
    ).toThrow(/costo/i);
  });

  it('un lote sin casillas devuelve vacío, no revienta', () => {
    expect(
      repartirPorPeso({
        casillas: [],
        costosVariablesLoteCOP: 0,
        costoFijoUnitarioLoteCOP: 100,
        config: CFG,
      }),
    ).toEqual([]);
  });

  it('una categoría fiscal ausente revienta, sin default', () => {
    // El candado de siempre: la columna vacía de la hoja es lo que dejó 60 de 63
    // lotes cotizados con el divisor equivocado.
    expect(() =>
      repartirPorPeso({
        casillas: [
          {
            itemId: 'a',
            costoUnitarioRealCOP: 100,
            categoriaFiscal: undefined as never,
          },
        ],
        costosVariablesLoteCOP: 0,
        costoFijoUnitarioLoteCOP: 100,
        config: CFG,
      }),
    ).toThrow(/categor/i);
  });
});

describe('preciosDelLote — la regla de escritura al espejo', () => {
  // Kevin, 2026-08-01: «la celda de precio por unidad se escribe SOLO cuando la
  // casilla tiene costo capturado Y el lote pasó la conciliación Σ≈costo. Si no,
  // vacía — y el Léeme lo explica, para que una casilla PENDIENTE sin precio se
  // lea como pendiente y no como "el motor falló"».
  const BASE = {
    costoCompraLoteCOP: 931_931,
    categoriaFiscalLote: 'gema' as const,
    costosVariablesLoteCOP: 9_091,
    costoFijoUnitarioLoteCOP: 442_787,
    config: CFG,
  };
  const CUATRO = [
    { itemId: '372', costoUnitarioRealCOP: 268_983 },
    { itemId: '373', costoUnitarioRealCOP: 353_210 },
    { itemId: '374', costoUnitarioRealCOP: 81_510 },
    { itemId: '375', costoUnitarioRealCOP: 228_228 },
  ];

  it('un lote conciliado cotiza, y reproduce la auditoría', () => {
    const r = preciosDelLote({ ...BASE, casillas: CUATRO });
    expect(r.cotiza).toBe(true);
    expect(r.porItem.get('372')?.precioObjetivoUnidadCOP).toBe(665_681);
    expect(r.porItem.get('375')?.equilibrioRealUnidadCOP).toBe(376_547);
  });

  it('con una casilla sin costo NO cotiza ninguna — ni las que sí lo tienen', () => {
    // Es la propiedad clave del reparto por peso: sin el costo de una hermana,
    // los pesos de TODAS están mal. Cotizar «las que se puede» daría números
    // plausibles y equivocados, que es peor que una celda vacía.
    const r = preciosDelLote({
      ...BASE,
      casillas: [...CUATRO.slice(0, 3), { itemId: '375' }],
    });
    expect(r.cotiza).toBe(false);
    expect(r.porItem.size).toBe(0);
    expect(r.motivo).toMatch(/costo/i);
  });

  it('con los costos capturados pero descuadrados contra el lote, no cotiza', () => {
    const r = preciosDelLote({
      ...BASE,
      casillas: CUATRO.map((c) => ({ ...c, costoUnitarioRealCOP: 1_000 })),
    });
    expect(r.cotiza).toBe(false);
    expect(r.motivo).toMatch(/concilia|suma/i);
  });

  it('la casilla hereda la categoría del lote cuando el lote no es mixto', () => {
    const r = preciosDelLote({ ...BASE, casillas: CUATRO });
    expect(r.porItem.get('372')?.categoriaFiscal).toBe('gema');
  });

  it('en un lote mixto cada casilla declara la suya', () => {
    const r = preciosDelLote({
      ...BASE,
      categoriaFiscalLote: 'mixta',
      costoCompraLoteCOP: 1_000_000,
      costosVariablesLoteCOP: 0,
      costoFijoUnitarioLoteCOP: 400_000,
      casillas: [
        { itemId: 'g', costoUnitarioRealCOP: 500_000, categoriaFiscal: 'gema' },
        { itemId: 'j', costoUnitarioRealCOP: 500_000, categoriaFiscal: 'joya' },
      ],
    });
    expect(r.cotiza).toBe(true);
    expect(r.porItem.get('g')?.precioObjetivoUnidadCOP).toBe(1_166_667);
    expect(r.porItem.get('j')?.precioObjetivoUnidadCOP).toBe(1_707_317);
  });

  it('un lote mixto con una casilla que no declaró régimen NO cotiza', () => {
    // El candado de siempre, en su lugar más peligroso: el lote dice «se resuelve
    // casilla por casilla» y una casilla no lo resolvió. Heredar «gema» por
    // descarte es cotizar una joya 46% por debajo.
    const r = preciosDelLote({
      ...BASE,
      categoriaFiscalLote: 'mixta',
      costoCompraLoteCOP: 1_000_000,
      costosVariablesLoteCOP: 0,
      costoFijoUnitarioLoteCOP: 400_000,
      casillas: [
        { itemId: 'g', costoUnitarioRealCOP: 500_000, categoriaFiscal: 'gema' },
        { itemId: 'j', costoUnitarioRealCOP: 500_000 },
      ],
    });
    expect(r.cotiza).toBe(false);
    expect(r.motivo).toMatch(/categor/i);
  });

  it('un lote sin casillas no cotiza y lo dice', () => {
    const r = preciosDelLote({ ...BASE, casillas: [] });
    expect(r.cotiza).toBe(false);
    expect(r.porItem.size).toBe(0);
  });
});

describe('avisos — CATEGORIA_INFERIDA (decisión de Kevin, 2026-08-02)', () => {
  // El candado del motor solo exige que categoriaFiscal EXISTA — no distingue
  // si alguien la escribió o si salió de una inferencia por palabras clave.
  // La distinción viaja en el precio, no en si cotiza o no.
  const BASE = {
    costoCompraLoteCOP: 931_931,
    categoriaFiscalLote: 'gema' as const,
    costosVariablesLoteCOP: 9_091,
    costoFijoUnitarioLoteCOP: 442_787,
    config: CFG,
  };
  const CUATRO = [
    { itemId: '372', costoUnitarioRealCOP: 268_983 },
    { itemId: '373', costoUnitarioRealCOP: 353_210 },
    { itemId: '374', costoUnitarioRealCOP: 81_510 },
    { itemId: '375', costoUnitarioRealCOP: 228_228 },
  ];

  it('un lote `inferida` marca CATEGORIA_INFERIDA en CADA precio que sale, no solo en uno', () => {
    const r = preciosDelLote({
      ...BASE,
      casillas: CUATRO,
      categoriaFiscalOrigen: 'inferida',
    });
    expect(r.cotiza).toBe(true);
    for (const [, precio] of r.porItem) {
      expect(precio.avisos).toEqual(['CATEGORIA_INFERIDA']);
    }
  });

  it('un lote `capturada` no lleva el aviso', () => {
    const r = preciosDelLote({
      ...BASE,
      casillas: CUATRO,
      categoriaFiscalOrigen: 'capturada',
    });
    expect(r.porItem.get('372')?.avisos ?? []).toEqual([]);
  });

  it('sin origen (lote legacy, de antes de que el campo existiera) no lleva el aviso', () => {
    const r = preciosDelLote({ ...BASE, casillas: CUATRO });
    expect(r.porItem.get('372')?.avisos ?? []).toEqual([]);
  });

  it('el resto del precio no cambia por llevar el aviso — mismos números de siempre', () => {
    const r = preciosDelLote({
      ...BASE,
      casillas: CUATRO,
      categoriaFiscalOrigen: 'inferida',
    });
    expect(r.porItem.get('372')?.precioObjetivoUnidadCOP).toBe(665_681);
  });
});

describe('segmento colección — no se precifica por absorción (punto 5, dictamen de Kevin)', () => {
  // "Otro negocio": precio individual negociado, nunca K/equilibrio/objetivo.
  // El candado corta ANTES de mirar categoría fiscal, costo o conciliación —
  // ninguna de esas preguntas aplica a una pieza de colección.
  const BASE = {
    costoCompraLoteCOP: 931_931,
    categoriaFiscalLote: 'gema' as const,
    costosVariablesLoteCOP: 9_091,
    costoFijoUnitarioLoteCOP: 442_787,
    config: CFG,
  };
  const CUATRO = [
    { itemId: '372', costoUnitarioRealCOP: 268_983 },
    { itemId: '373', costoUnitarioRealCOP: 353_210 },
    { itemId: '374', costoUnitarioRealCOP: 81_510 },
    { itemId: '375', costoUnitarioRealCOP: 228_228 },
  ];

  it('un lote `coleccion` no cotiza — el motivo nombra SEGMENTO_COLECCION', () => {
    const r = preciosDelLote({
      ...BASE,
      casillas: CUATRO,
      segmento: 'coleccion',
    });
    expect(r.cotiza).toBe(false);
    expect(r.porItem.size).toBe(0);
    expect(r.motivo).toMatch(/SEGMENTO_COLECCION/);
  });

  it('corta ANTES que la conciliación — un lote de colección descuadrado no revienta con "concilia"', () => {
    const r = preciosDelLote({
      ...BASE,
      casillas: CUATRO.map((c) => ({ ...c, costoUnitarioRealCOP: 1 })), // descuadra a propósito
      segmento: 'coleccion',
    });
    expect(r.motivo).toMatch(/SEGMENTO_COLECCION/);
  });

  it('un lote `operacional` (o sin segmento) cotiza normal — el default no cambió nada', () => {
    expect(
      preciosDelLote({ ...BASE, casillas: CUATRO, segmento: 'operacional' })
        .cotiza,
    ).toBe(true);
    expect(preciosDelLote({ ...BASE, casillas: CUATRO }).cotiza).toBe(true);
  });
});
