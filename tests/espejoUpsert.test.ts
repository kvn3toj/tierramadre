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
