/**
 * El planificador de la migración de ensayo v3 → v4.
 *
 * Corre primero en dev, y de ahí sale el inventario con el que la doble corrida
 * puede comparar precios. Hasta que corra, dev reparte el gasto fijo entre menos
 * lotes de los que existen (66 contra 88) y ningún número suyo es comparable.
 *
 * Es puro a propósito: recibe lo que la hoja dice y lo que Convex tiene, y
 * devuelve un PLAN. No escribe. Así el ensayo se puede repetir cuantas veces haga
 * falta —y revisar a ojo— antes de que algo toque la base.
 *
 * Las tres reglas que los tests protegen, en orden de daño si se rompen:
 *
 *  1. **No se inventa un costo.** D6: el costo unitario se CAPTURA. Una fila sin
 *     costo va al reporte de excepciones, no a un prorrateo.
 *  2. **No se corrige nada por cuenta propia.** Lo anómalo se REPORTA para que lo
 *     mire un humano (dictamen de Kevin sobre LC-03).
 *  3. **Es idempotente.** Correr el ensayo dos veces no duplica un lote.
 */
import { describe, it, expect } from 'vitest';
import {
  ESTADO_PENDIENTE_CLASIFICAR,
  formatearReporteExcepciones,
  mapearFilasInventario,
  mapearLotesHoja,
  numeroDeHoja,
  planificarMigracion,
} from '../convex/_lib/migracionV4';

const LOTE_HOJA = {
  loteId: 'C-068',
  estado: 'reconstruido',
  providerNombre: '',
  fechaRecepcion: '2026-07-23',
  costoTotalCOP: 735_000,
  unidadesDeclaradas: 10,
  formaPago: '',
};

const FILA = {
  itemId: '496',
  loteId: 'C-068',
  estado: '',
  costoBaseCOP: 153_125,
  nombre: 'Baguette',
};

describe('los lotes que la hoja tiene y Convex no', () => {
  it('los planifica para crear', () => {
    const plan = planificarMigracion({
      lotesHoja: [LOTE_HOJA],
      lotesConvex: [],
      filasHoja: [],
      casillasConvex: [],
    });
    expect(plan.lotesACrear.map((l) => l.loteId)).toEqual(['C-068']);
  });

  it('conserva `reconstruido` en vez de disfrazarlo de `abierto`', () => {
    // Estos lotes son agrupaciones retroactivas armadas desde colecciones
    // legadas, no compras. Mapearlos a «abierto» los volvería indistinguibles de
    // una compra real, y ese error es invisible una vez guardado.
    const plan = planificarMigracion({
      lotesHoja: [LOTE_HOJA],
      lotesConvex: [],
      filasHoja: [],
      casillasConvex: [],
    });
    expect(plan.lotesACrear[0].estado).toBe('reconstruido');
  });

  it('sin proveedor NO le atribuye las piedras a uno real: lo reporta', () => {
    const plan = planificarMigracion({
      lotesHoja: [LOTE_HOJA],
      lotesConvex: [],
      filasHoja: [],
      casillasConvex: [],
    });
    expect(plan.lotesACrear[0].sinProveedor).toBe(true);
    expect(
      plan.excepciones.some(
        (e) => e.codigo === 'LOTE_SIN_PROVEEDOR' && e.referencia === 'C-068',
      ),
    ).toBe(true);
  });

  it('un lote con proveedor no genera esa excepción', () => {
    const plan = planificarMigracion({
      lotesHoja: [{ ...LOTE_HOJA, providerNombre: 'Proveedor Uno' }],
      lotesConvex: [],
      filasHoja: [],
      casillasConvex: [],
    });
    expect(plan.lotesACrear[0].sinProveedor).toBe(false);
    expect(
      plan.excepciones.some((e) => e.codigo === 'LOTE_SIN_PROVEEDOR'),
    ).toBe(false);
  });

  it('no recrea un lote que Convex ya tiene', () => {
    const plan = planificarMigracion({
      lotesHoja: [LOTE_HOJA],
      lotesConvex: [{ loteId: 'C-068' }],
      filasHoja: [],
      casillasConvex: [],
    });
    expect(plan.lotesACrear).toHaveLength(0);
  });
});

describe('las 25 filas con ESTADO en blanco', () => {
  // Dictamen de Kevin (2026-08-01): son INVENTARIO VIVO, carga incompleta. Se
  // convierten en casillas PENDIENTE_CLASIFICAR, que es exactamente el estado
  // que v4 tiene para «una pieza que existe y todavía no se clasificó».
  it('se convierten en casillas PENDIENTE_CLASIFICAR', () => {
    const plan = planificarMigracion({
      lotesHoja: [LOTE_HOJA],
      lotesConvex: [{ loteId: 'C-068' }],
      filasHoja: [FILA],
      casillasConvex: [],
    });
    expect(plan.casillasACrear).toHaveLength(1);
    expect(plan.casillasACrear[0].estadoCasilla).toBe(
      ESTADO_PENDIENTE_CLASIFICAR,
    );
    expect(plan.casillasACrear[0].itemId).toBe('496');
  });

  it('una fila con estado conocido conserva el suyo', () => {
    const plan = planificarMigracion({
      lotesHoja: [LOTE_HOJA],
      lotesConvex: [{ loteId: 'C-068' }],
      filasHoja: [
        { ...FILA, itemId: '140', estado: 'VENDIDA' },
        { ...FILA, itemId: '141', estado: 'DISPONIBLE' },
      ],
      casillasConvex: [],
    });
    const porItem = new Map(
      plan.casillasACrear.map((c) => [c.itemId, c.estadoCasilla]),
    );
    expect(porItem.get('140')).toBe('VENDIDA');
    expect(porItem.get('141')).toBe('DISPONIBLE');
  });

  it('el costo se CAPTURA de la fila, jamás se reparte', () => {
    // D6, y el caso «Choker + Piedra»: prorratear el costo del lote entre sus
    // piezas produjo $52.500 donde el costo real era otro.
    const plan = planificarMigracion({
      lotesHoja: [LOTE_HOJA],
      lotesConvex: [{ loteId: 'C-068' }],
      filasHoja: [FILA],
      casillasConvex: [],
    });
    expect(plan.casillasACrear[0].costoUnitarioRealCOP).toBe(153_125);
  });

  it('una fila SIN costo se reporta, no se le inventa uno', () => {
    const plan = planificarMigracion({
      lotesHoja: [LOTE_HOJA],
      lotesConvex: [{ loteId: 'C-068' }],
      filasHoja: [{ ...FILA, costoBaseCOP: 0 }],
      casillasConvex: [],
    });
    expect(plan.casillasACrear[0].costoUnitarioRealCOP).toBeUndefined();
    expect(
      plan.excepciones.some(
        (e) => e.codigo === 'CASILLA_SIN_COSTO' && e.referencia === '496',
      ),
    ).toBe(true);
  });

  it('no recrea una casilla que ya existe', () => {
    const plan = planificarMigracion({
      lotesHoja: [LOTE_HOJA],
      lotesConvex: [{ loteId: 'C-068' }],
      filasHoja: [FILA],
      casillasConvex: [{ itemId: '496' }],
    });
    expect(plan.casillasACrear).toHaveLength(0);
  });

  it('una fila de un lote que no existe ni se va a crear se reporta', () => {
    // Sin esto la casilla quedaría colgando de un loteId fantasma.
    const plan = planificarMigracion({
      lotesHoja: [],
      lotesConvex: [],
      filasHoja: [{ ...FILA, loteId: 'C-999' }],
      casillasConvex: [],
    });
    expect(plan.casillasACrear).toHaveLength(0);
    expect(plan.excepciones.some((e) => e.codigo === 'CASILLA_SIN_LOTE')).toBe(
      true,
    );
  });
});

describe('el reporte de excepciones — LC-03 y los que se le parezcan', () => {
  // Dictamen de Kevin: «LC-03 ($1.233M) va al reporte de excepciones de la
  // migración como fila a auditar con Kevin ANTES de que la Fase 2 la tome como
  // verdad. No la corrijas por tu cuenta.»
  const lc03 = {
    ...LOTE_HOJA,
    loteId: 'LC-03',
    costoTotalCOP: 1_233_000_000,
    unidadesDeclaradas: 2,
  };

  it('marca el lote cuyo costo declarado no se parece a la suma de sus piezas', () => {
    const plan = planificarMigracion({
      lotesHoja: [lc03],
      lotesConvex: [],
      filasHoja: [
        { itemId: '1', loteId: 'LC-03', estado: '', costoBaseCOP: 500_000 },
        { itemId: '2', loteId: 'LC-03', estado: '', costoBaseCOP: 500_000 },
      ],
      casillasConvex: [],
    });
    const exc = plan.excepciones.find(
      (e) => e.codigo === 'COSTO_INCONSISTENTE',
    );
    expect(exc?.referencia).toBe('LC-03');
    expect(exc?.requiereAuditoria).toBe(true);
  });

  it('NO corrige el costo: lo migra tal cual y deja el aviso', () => {
    const plan = planificarMigracion({
      lotesHoja: [lc03],
      lotesConvex: [],
      filasHoja: [
        { itemId: '1', loteId: 'LC-03', estado: '', costoBaseCOP: 500_000 },
      ],
      casillasConvex: [],
    });
    expect(plan.lotesACrear[0].costoTotalCOP).toBe(1_233_000_000);
  });

  it('un lote coherente no se marca', () => {
    const plan = planificarMigracion({
      lotesHoja: [{ ...LOTE_HOJA, costoTotalCOP: 300_000 }],
      lotesConvex: [],
      filasHoja: [
        { itemId: '1', loteId: 'C-068', estado: '', costoBaseCOP: 150_000 },
        { itemId: '2', loteId: 'C-068', estado: '', costoBaseCOP: 150_000 },
      ],
      casillasConvex: [],
    });
    expect(
      plan.excepciones.some((e) => e.codigo === 'COSTO_INCONSISTENTE'),
    ).toBe(false);
  });

  it('un lote sin piezas no se juzga por coherencia de costo', () => {
    // No hay con qué comparar. Inventar una comparación contra cero marcaría
    // como anómalo a todo lote todavía sin cargar.
    const plan = planificarMigracion({
      lotesHoja: [LOTE_HOJA],
      lotesConvex: [],
      filasHoja: [],
      casillasConvex: [],
    });
    expect(
      plan.excepciones.some((e) => e.codigo === 'COSTO_INCONSISTENTE'),
    ).toBe(false);
  });
});

describe('el resumen — lo que se lee antes de decidir si se aplica', () => {
  it('cuenta lo que va a pasar y cuántas excepciones hay', () => {
    const plan = planificarMigracion({
      lotesHoja: [LOTE_HOJA, { ...LOTE_HOJA, loteId: 'C-067' }],
      lotesConvex: [{ loteId: 'C-067' }],
      filasHoja: [FILA, { ...FILA, itemId: '497', costoBaseCOP: 0 }],
      casillasConvex: [],
    });
    expect(plan.resumen.lotesACrear).toBe(1);
    expect(plan.resumen.casillasACrear).toBe(2);
    expect(plan.resumen.excepciones).toBe(plan.excepciones.length);
    expect(plan.resumen.requierenAuditoria).toBe(
      plan.excepciones.filter((e) => e.requiereAuditoria).length,
    );
  });

  it('correr el plan dos veces sobre el resultado del primero no hace nada', () => {
    // La prueba real de idempotencia: aplicar y volver a planificar da vacío.
    const primero = planificarMigracion({
      lotesHoja: [LOTE_HOJA],
      lotesConvex: [],
      filasHoja: [FILA],
      casillasConvex: [],
    });
    const segundo = planificarMigracion({
      lotesHoja: [LOTE_HOJA],
      lotesConvex: primero.lotesACrear.map((l) => ({ loteId: l.loteId })),
      filasHoja: [FILA],
      casillasConvex: primero.casillasACrear.map((c) => ({
        itemId: c.itemId,
      })),
    });
    expect(segundo.lotesACrear).toHaveLength(0);
    expect(segundo.casillasACrear).toHaveLength(0);
  });
});

describe('numeroDeHoja — las cifras llegan como texto de display', () => {
  // Sheets devuelve «1,234,567» o «$ 931.931»; `Number()` sobre eso da NaN, y un
  // NaN en `costoTotalCOP` se propaga hasta el motor.
  it('quita separadores de miles y símbolos de moneda', () => {
    expect(numeroDeHoja('931,931')).toBe(931931);
    expect(numeroDeHoja('$ 1,383,809')).toBe(1_383_809);
    expect(numeroDeHoja('735000')).toBe(735000);
  });

  it('un negativo conserva el signo', () => {
    expect(numeroDeHoja('-25,000')).toBe(-25000);
  });

  it('vacío, basura y ausente caen a 0 — nunca a NaN', () => {
    expect(numeroDeHoja('')).toBe(0);
    expect(numeroDeHoja('   ')).toBe(0);
    expect(numeroDeHoja(undefined)).toBe(0);
    expect(numeroDeHoja('n/a')).toBe(0);
  });
});

describe('formatearReporteExcepciones — lo que Kevin lee antes de aplicar', () => {
  const PLAN = planificarMigracion({
    lotesHoja: [
      LOTE_HOJA,
      {
        ...LOTE_HOJA,
        loteId: 'LC-03',
        providerNombre: 'Proveedor Uno',
        costoTotalCOP: 1_233_703_846,
      },
    ],
    lotesConvex: [],
    filasHoja: [
      FILA,
      { itemId: '497', loteId: 'LC-03', estado: '', costoBaseCOP: 1_000_000 },
      { itemId: '498', loteId: 'C-999', estado: '', costoBaseCOP: 5000 },
      { itemId: '499', loteId: 'C-068', estado: '', costoBaseCOP: 0 },
    ],
    casillasConvex: [],
  });

  it('pone primero lo que requiere auditoría', () => {
    const reporte = formatearReporteExcepciones(PLAN);
    const auditar = reporte.indexOf('REQUIEREN AUDITORÍA');
    const informativas = reporte.indexOf('INFORMATIVAS');
    expect(auditar).toBeGreaterThanOrEqual(0);
    expect(informativas).toBeGreaterThan(auditar);
  });

  it('nombra a LC-03 con sus dos cifras, para poder dictaminarlo', () => {
    // Dictamen de Kevin: LC-03 no se corrige por cuenta propia; se audita ANTES
    // de que la Fase 2 lo tome por verdad. Para eso el reporte tiene que
    // mostrarle los dos números enfrentados.
    const reporte = formatearReporteExcepciones(PLAN);
    expect(reporte).toContain('LC-03');
    expect(reporte).toContain('1233703846');
  });

  it('nombra cada código con su conteo', () => {
    const reporte = formatearReporteExcepciones(PLAN);
    expect(reporte).toContain('COSTO_INCONSISTENTE');
    expect(reporte).toContain('CASILLA_SIN_LOTE');
    expect(reporte).toContain('CASILLA_SIN_COSTO');
    expect(reporte).toContain('LOTE_SIN_PROVEEDOR');
  });

  it('un plan limpio lo dice, en vez de devolver vacío', () => {
    // Un reporte en blanco se lee como «no corrió». Tiene que decir que corrió y
    // no encontró nada.
    const limpio = planificarMigracion({
      lotesHoja: [{ ...LOTE_HOJA, providerNombre: 'Proveedor Uno' }],
      lotesConvex: [],
      filasHoja: [{ ...FILA, costoBaseCOP: 735_000 }],
      casillasConvex: [],
    });
    expect(limpio.excepciones).toHaveLength(0);
    expect(formatearReporteExcepciones(limpio)).toContain('sin excepciones');
  });
});

describe('mapear la hoja — y no dejar que un mapeo roto parezca un plan limpio', () => {
  // El defecto real, encontrado corriendo el ensayo: la pestaña Inventario trae
  // el id de la pieza en la columna `item`, no `itemId`. Leyendo la clave
  // equivocada, las 513 filas se caían al filtro y el plan reportaba «0 casillas
  // a crear» — un cero con forma de hecho, que es exactamente el defecto que
  // este proyecto vino a matar.
  it('lee el id de la pieza de la columna `item`', () => {
    const filas = mapearFilasInventario([
      {
        item: '496',
        loteId: 'C-068',
        estado: '',
        costoBaseCOP: '153,125',
        nombre: 'Baguette',
      },
    ]);
    expect(filas).toEqual([
      {
        itemId: '496',
        loteId: 'C-068',
        estado: '',
        costoBaseCOP: 153_125,
        nombre: 'Baguette',
      },
    ]);
  });

  it('revienta si TODAS las filas se caen: es un mapeo roto, no un inventario vacío', () => {
    expect(() =>
      mapearFilasInventario([{ itemId: '496', loteId: 'C-068' }]),
    ).toThrow(/item/);
  });

  it('una hoja de verdad vacía no revienta — no hay nada que mapear mal', () => {
    expect(mapearFilasInventario([])).toEqual([]);
  });

  it('deja pasar el resto cuando solo algunas filas no tienen id', () => {
    const filas = mapearFilasInventario([
      { item: '496', loteId: 'C-068', costoBaseCOP: '100' },
      { item: '   ', loteId: 'C-068', costoBaseCOP: '200' },
    ]);
    expect(filas.map((f) => f.itemId)).toEqual(['496']);
  });

  it('los lotes se leen por `loteId`, con las cifras destextualizadas', () => {
    const lotes = mapearLotesHoja([
      {
        loteId: 'C-068',
        estado: 'reconstruido',
        costoTotalCOP: '$ 735,000',
        unidadesDeclaradas: '10',
      },
    ]);
    expect(lotes[0]).toMatchObject({
      loteId: 'C-068',
      estado: 'reconstruido',
      costoTotalCOP: 735_000,
      unidadesDeclaradas: 10,
    });
  });

  it('los lotes también revientan si el mapeo se cae entero', () => {
    expect(() => mapearLotesHoja([{ lote: 'C-068' }])).toThrow(/loteId/);
  });

  it('fechaRecepcion sale sin el sufijo de hora que sirve Sheets (decisión Kevin 2026-08-02)', () => {
    // El defecto que bloqueó el punto 8 entero: `configVigenteEn` exige
    // AAAA-MM-DD exacto, y 122 de 128 lotes de dev traían la celda datetime
    // tal cual. `mapearLotesHoja` normaliza en la frontera; el motor sigue
    // sin aflojarse.
    const lotes = mapearLotesHoja([
      {
        loteId: 'C-001',
        estado: 'abierto',
        costoTotalCOP: '500000',
        unidadesDeclaradas: '1',
        fechaRecepcion: '2026-05-25 00:00:00',
      },
    ]);
    expect(lotes[0].fechaRecepcion).toBe('2026-05-25');
  });
});

describe('LOTE_SIN_PIEZAS — el punto ciego que dejaba escapar a LC-03', () => {
  // `COSTO_INCONSISTENTE` compara el costo declarado contra la suma de las
  // piezas, y se salta el lote que no tiene ninguna: sin piezas no hay con qué
  // comparar. El agujero es que un lote que declara $1.233M y no tiene NI UNA
  // pieza enlazada pasa en silencio — justo la forma de LC-03, la fila que
  // Kevin dictaminó que hay que auditar ANTES de que la Fase 2 la tome por
  // verdad. Sin este código, el reporte no la nombraba.
  const SIN_PIEZAS = {
    ...LOTE_HOJA,
    loteId: 'LC-03',
    costoTotalCOP: 1_233_703_846,
  };

  it('reporta el lote que declara un costo y no tiene ni una pieza', () => {
    const plan = planificarMigracion({
      lotesHoja: [SIN_PIEZAS],
      lotesConvex: [],
      filasHoja: [],
      casillasConvex: [],
    });
    const exc = plan.excepciones.find((e) => e.codigo === 'LOTE_SIN_PIEZAS');
    expect(exc?.referencia).toBe('LC-03');
    expect(exc?.requiereAuditoria).toBe(true);
    expect(exc?.detalle).toContain('1233703846');
  });

  it('el lote se crea igual: reportar no es corregir', () => {
    const plan = planificarMigracion({
      lotesHoja: [SIN_PIEZAS],
      lotesConvex: [],
      filasHoja: [],
      casillasConvex: [],
    });
    expect(plan.lotesACrear.map((l) => l.loteId)).toEqual(['LC-03']);
  });

  it('un lote sin costo declarado y sin piezas no es anómalo', () => {
    // Un lote recién abierto, todavía sin inventario cargado. Reportarlo sería
    // ruido, y el ruido es lo que hace que nadie lea el reporte.
    const plan = planificarMigracion({
      lotesHoja: [{ ...LOTE_HOJA, costoTotalCOP: 0 }],
      lotesConvex: [],
      filasHoja: [],
      casillasConvex: [],
    });
    expect(plan.excepciones.some((e) => e.codigo === 'LOTE_SIN_PIEZAS')).toBe(
      false,
    );
  });

  it('un lote CON piezas no lo dispara — para eso está COSTO_INCONSISTENTE', () => {
    const plan = planificarMigracion({
      lotesHoja: [SIN_PIEZAS],
      lotesConvex: [],
      filasHoja: [
        { itemId: '1', loteId: 'LC-03', estado: '', costoBaseCOP: 500_000 },
      ],
      casillasConvex: [],
    });
    expect(plan.excepciones.some((e) => e.codigo === 'LOTE_SIN_PIEZAS')).toBe(
      false,
    );
    expect(
      plan.excepciones.some((e) => e.codigo === 'COSTO_INCONSISTENTE'),
    ).toBe(true);
  });

  it('sigue reportándose aunque Convex ya tenga el lote', () => {
    // La anomalía es una propiedad del DATO, no de esta corrida. Si se callara
    // al segundo ensayo, el reporte diría «limpio» y alguien concluiría que se
    // resolvió — la misma forma de silencio que se lee como hecho. Se calla
    // cuando Kevin la dictamine y el dato cambie, no antes. (Mismo criterio que
    // `COSTO_INCONSISTENTE`, que tampoco mira si el lote ya existe.)
    const plan = planificarMigracion({
      lotesHoja: [SIN_PIEZAS],
      lotesConvex: [{ loteId: 'LC-03' }],
      filasHoja: [],
      casillasConvex: [],
    });
    expect(plan.lotesACrear).toHaveLength(0);
    expect(plan.excepciones.some((e) => e.codigo === 'LOTE_SIN_PIEZAS')).toBe(
      true,
    );
  });
});

describe('el reporte muestra lo que va a crear, para poder revisarlo a ojo', () => {
  // `dryRun` existe para que un humano mire el plan antes de que toque la base.
  // Un plan que solo dice «28 lotes» no se puede revisar: hay que ver CUÁLES, y
  // con qué cifras.
  const PLAN = planificarMigracion({
    lotesHoja: [
      LOTE_HOJA,
      {
        ...LOTE_HOJA,
        loteId: 'S-001',
        providerNombre: 'Proveedor Uno',
        costoTotalCOP: 378_000_000,
        unidadesDeclaradas: 1,
      },
    ],
    lotesConvex: [],
    filasHoja: [],
    casillasConvex: [],
  });

  it('lista cada lote con su costo declarado y sus unidades', () => {
    const reporte = formatearReporteExcepciones(PLAN);
    expect(reporte).toContain('LOTES A CREAR');
    expect(reporte).toMatch(/C-068.*735000.*10/);
    expect(reporte).toMatch(/S-001.*378000000.*1/);
  });

  it('dice a qué proveedor va cada uno — el centinela se ve', () => {
    const reporte = formatearReporteExcepciones(PLAN);
    expect(reporte).toMatch(/C-068.*centinela/i);
    expect(reporte).toMatch(/S-001.*Proveedor Uno/);
  });

  it('los ordena por costo declarado, de mayor a menor', () => {
    // Lo que hay que mirar primero es lo más caro: un lote que declara $378M es
    // el que puede mover el inventario entero si el número está mal.
    const reporte = formatearReporteExcepciones(PLAN);
    expect(reporte.indexOf('S-001')).toBeLessThan(reporte.indexOf('C-068'));
  });
});
