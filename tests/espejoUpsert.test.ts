/**
 * El upsert del espejo: idempotente por id, por cabecera nombrada.
 *
 * Las dos lecciones de v3 que este módulo existe para no repetir:
 *
 *  1. **Nunca por índice posicional.** «Ubicación: 150820» —un precio donde iba
 *     una ubicación— salió de leer por posición un layout de 42 columnas que se
 *     movió. Acá la fila se arma mapeando cabecera → valor, y una columna que
 *     cambia de lugar sigue recibiendo su dato.
 *  2. **Nunca por contador de filas.** `rowIndex = maxRow + 1` produjo deriva
 *     real en el riel viejo, con una reparación dedicada para arreglarlo. Acá la
 *     fila se ubica BUSCANDO el id en su columna.
 */
import { describe, it, expect } from 'vitest';
import { planificarUpsert } from '../convex/_lib/espejoUpsert';

const CABECERAS = ['loteId', 'fecha', 'costoTotalCOP'] as const;

describe('planificarUpsert — dónde va la fila', () => {
  it('una fila nueva se agrega al final', () => {
    const plan = planificarUpsert({
      cabeceras: [...CABECERAS],
      filaCabecera: ['loteId', 'fecha', 'costoTotalCOP'],
      idsExistentes: ['B-001', 'B-002'],
      idFila: 'B-003',
      campos: { loteId: 'B-003', fecha: '2026-08-01', costoTotalCOP: '941022' },
    });
    expect(plan.accion).toBe('append');
    expect(plan.valores).toEqual(['B-003', '2026-08-01', '941022']);
  });

  it('un id que ya está se ACTUALIZA en su fila, no se duplica', () => {
    // El candado de idempotencia: un reintento tras un timeout de Sheets no
    // puede dejar el lote dos veces en la hoja.
    const plan = planificarUpsert({
      cabeceras: [...CABECERAS],
      filaCabecera: ['loteId', 'fecha', 'costoTotalCOP'],
      idsExistentes: ['B-001', 'B-002', 'B-003'],
      idFila: 'B-002',
      campos: { loteId: 'B-002', fecha: '2026-07-30', costoTotalCOP: '500000' },
    });
    expect(plan.accion).toBe('update');
    // Fila 1 = cabecera, así que B-002 (índice 1) vive en la fila 3.
    expect(plan.filaHoja).toBe(3);
  });

  it('la primera fila de datos es la 2, no la 1', () => {
    const plan = planificarUpsert({
      cabeceras: [...CABECERAS],
      filaCabecera: ['loteId', 'fecha', 'costoTotalCOP'],
      idsExistentes: ['B-001'],
      idFila: 'B-001',
      campos: { loteId: 'B-001', fecha: '', costoTotalCOP: '' },
    });
    expect(plan.filaHoja).toBe(2);
  });
});

describe('planificarUpsert — el orden lo manda la hoja, no el código', () => {
  it('respeta el orden REAL de las cabeceras de la hoja', () => {
    // Alguien movió «fecha» al final en la hoja. La fila debe seguirla, no
    // imponerle el orden del código: eso es escribir por posición otra vez.
    const plan = planificarUpsert({
      cabeceras: [...CABECERAS],
      filaCabecera: ['loteId', 'costoTotalCOP', 'fecha'],
      idsExistentes: [],
      idFila: 'B-003',
      campos: { loteId: 'B-003', fecha: '2026-08-01', costoTotalCOP: '941022' },
    });
    expect(plan.valores).toEqual(['B-003', '941022', '2026-08-01']);
  });

  it('una columna que la hoja tiene y el código no, se deja intacta', () => {
    // Una columna añadida a mano por el equipo (una nota, un comentario) no es
    // deriva que haya que pisar: el espejo escribe lo suyo y no toca el resto.
    const plan = planificarUpsert({
      cabeceras: [...CABECERAS],
      filaCabecera: ['loteId', 'fecha', 'costoTotalCOP', 'notas del equipo'],
      idsExistentes: [],
      idFila: 'B-003',
      campos: { loteId: 'B-003', fecha: '2026-08-01', costoTotalCOP: '941022' },
    });
    expect(plan.valores).toEqual(['B-003', '2026-08-01', '941022', null]);
  });

  it('una cabecera que el código tiene y la hoja no, se reporta', () => {
    // No se escribe a ciegas en una columna que no existe: se avisa para que
    // alguien agregue la cabecera, en vez de perder el dato en silencio.
    const plan = planificarUpsert({
      cabeceras: [...CABECERAS],
      filaCabecera: ['loteId', 'fecha'],
      idsExistentes: [],
      idFila: 'B-003',
      campos: { loteId: 'B-003', fecha: '2026-08-01', costoTotalCOP: '941022' },
    });
    expect(plan.cabecerasFaltantes).toEqual(['costoTotalCOP']);
  });
});

describe('planificarUpsert — la hoja vacía', () => {
  it('sin cabeceras, pide escribirlas primero', () => {
    const plan = planificarUpsert({
      cabeceras: [...CABECERAS],
      filaCabecera: [],
      idsExistentes: [],
      idFila: 'B-001',
      campos: { loteId: 'B-001', fecha: '', costoTotalCOP: '' },
    });
    expect(plan.necesitaCabeceras).toBe(true);
    expect(plan.accion).toBe('append');
  });
});

describe('planificarUpsert — validación', () => {
  it('rechaza un idFila vacío: sin clave no hay upsert idempotente', () => {
    expect(() =>
      planificarUpsert({
        cabeceras: [...CABECERAS],
        filaCabecera: ['loteId'],
        idsExistentes: [],
        idFila: '',
        campos: {},
      }),
    ).toThrow(/idFila/i);
  });
});

describe('planificarUpsert — una cabecera nueva se AGREGA, no rompe la fila', () => {
  // El canon lo dice: «agregar cabeceras es aditivo — el upsert por cabecera
  // nombrada no rompe con columnas nuevas, y el orden es libre». Antes, una
  // cabecera que el código tenía y la hoja no reventaba la fila entera, así que
  // cada columna nueva del motor exigía editar el libro a mano antes de que
  // nada se pudiera escribir.
  //
  // Se agrega A LA DERECHA y nunca se reordena ni se pisa lo existente: el orden
  // de la hoja sigue siendo de la hoja.
  const base = {
    cabeceras: ['loteId', 'costoTotalCOP', 'precioObjetivoCOP'],
    filaCabecera: ['loteId', 'costoTotalCOP'],
    idsExistentes: ['B-001'],
    idFila: 'B-001',
    campos: {
      loteId: 'B-001',
      costoTotalCOP: '100',
      precioObjetivoCOP: '250',
    },
  };

  it('devuelve la fila de cabeceras ampliada, con la nueva al final', () => {
    const plan = planificarUpsert(base);
    expect(plan.filaCabeceraFinal).toEqual([
      'loteId',
      'costoTotalCOP',
      'precioObjetivoCOP',
    ]);
  });

  it('los valores se alinean a la fila ampliada, así el dato SÍ se escribe', () => {
    const plan = planificarUpsert(base);
    expect(plan.valores).toEqual(['B-001', '100', '250']);
  });

  it('sigue reportando cuáles agregó, para poder escribir la cabecera', () => {
    expect(planificarUpsert(base).cabecerasFaltantes).toEqual([
      'precioObjetivoCOP',
    ]);
  });

  it('una columna ajena de la hoja sigue intacta y conserva su lugar', () => {
    const plan = planificarUpsert({
      ...base,
      filaCabecera: ['loteId', 'notasDelEquipo', 'costoTotalCOP'],
    });
    expect(plan.filaCabeceraFinal).toEqual([
      'loteId',
      'notasDelEquipo',
      'costoTotalCOP',
      'precioObjetivoCOP',
    ]);
    // `null` = no tocar: que el equipo agregue una columna de notas no es deriva.
    expect(plan.valores).toEqual(['B-001', null, '100', '250']);
  });

  it('sin cabeceras faltantes, la fila final es la de la hoja', () => {
    const plan = planificarUpsert({
      ...base,
      cabeceras: ['loteId', 'costoTotalCOP'],
      campos: { loteId: 'B-001', costoTotalCOP: '100' },
    });
    expect(plan.cabecerasFaltantes).toEqual([]);
    expect(plan.filaCabeceraFinal).toEqual(['loteId', 'costoTotalCOP']);
  });

  it('con la pestaña en blanco, la fila final es el layout del código', () => {
    const plan = planificarUpsert({ ...base, filaCabecera: [], idsExistentes: [] });
    expect(plan.necesitaCabeceras).toBe(true);
    expect(plan.filaCabeceraFinal).toEqual(base.cabeceras);
  });
});
