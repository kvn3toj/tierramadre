import { describe, it, expect } from 'vitest';
import type { sheets_v4 } from '@googleapis/sheets';
import { writeNewRowGuarded } from '../api/_lib/sheet-new-row';

/**
 * Regresión del incidente del 2026-08-18 (ítem 0571, "Dije estrella").
 *
 * El tab Inventario del SOT llegó a su límite físico: 546 filas de grid, las
 * 546 con dato. Toda alta nueva apuntaba a la fila 547 y el endpoint devolvía
 *
 *   HTTP 500 "Range (Inventario!A547:BF547) exceeds grid limits.
 *             Max rows: 546, max columns: 102"
 *
 * La trampa: `values.get` sobre una fila fuera del grid lanza EXACTAMENTE el
 * mismo error que `values.update`. La guarda de "fila ocupada" leía la fila
 * destino ANTES de que `ensureRowCapacity` estirara el grid, así que el
 * estiramiento nunca corría y el fallo era determinista para todo ítem nuevo
 * — dos bots distintos lo pegaron con minutos de diferencia.
 *
 * El fake de acá reproduce esa física: get y update fuera del grid lanzan,
 * igual que la API real. Lo que se verifica es el ORDEN de las operaciones,
 * no que el módulo devuelva "ok".
 */

const ROW_RANGE = /^(.+)!A(\d+):([A-Z]+)(\d+)$/;

/** Sheets de mentira con límite de grid REAL: leer o escribir más allá lanza. */
function fakeSheets(config: { rowCount: number; rows: Map<number, string[]> }) {
  const calls: string[] = [];
  const rowOf = (range: string): number => {
    const m = ROW_RANGE.exec(range);
    if (!m) throw new Error(`rango inesperado en el test: ${range}`);
    return Number(m[2]);
  };
  const assertInGrid = (range: string) => {
    const row = rowOf(range);
    if (row > config.rowCount) {
      throw new Error(
        `Range (${range}) exceeds grid limits. Max rows: ${config.rowCount}, max columns: 102`,
      );
    }
    return row;
  };
  const sheets = {
    spreadsheets: {
      get: async () => {
        calls.push('meta.get');
        return {
          data: {
            sheets: [
              {
                properties: {
                  sheetId: 111,
                  title: 'Inventario',
                  gridProperties: { rowCount: config.rowCount },
                },
              },
            ],
          },
        };
      },
      batchUpdate: async (req: {
        requestBody?: {
          requests?: Array<{ appendDimension?: { length?: number } }>;
        };
      }) => {
        calls.push('grid.stretch');
        const extra =
          req.requestBody?.requests?.[0]?.appendDimension?.length ?? 0;
        config.rowCount += extra;
        return { data: {} };
      },
      values: {
        get: async ({ range }: { range: string }) => {
          calls.push(`values.get:${range}`);
          const row = assertInGrid(range);
          const values = config.rows.has(row) ? [config.rows.get(row)!] : [];
          return { data: { values } };
        },
        update: async ({
          range,
          requestBody,
        }: {
          range: string;
          requestBody: { values: string[][] };
        }) => {
          calls.push(`values.update:${range}`);
          const row = assertInGrid(range);
          config.rows.set(row, requestBody.values[0]);
          return { data: {} };
        },
      },
    },
  };
  return { sheets: sheets as unknown as sheets_v4.Sheets, calls, config };
}

const OPTS = {
  spreadsheetId: 'sot',
  sheetTitle: 'Inventario',
  lastCol: 'BF',
  values: ['0571', 'Dije estrella'],
};

describe('writeNewRowGuarded — el grid se estira ANTES de tocar la fila destino', () => {
  it('escribe la fila 547 en un grid de 546 filas llenas (el caso del 0571)', async () => {
    const rows = new Map<number, string[]>();
    for (let r = 1; r <= 546; r++) rows.set(r, [`item-${r}`]);
    const { sheets, config } = fakeSheets({ rowCount: 546, rows });

    const result = await writeNewRowGuarded(sheets, {
      ...OPTS,
      targetRow: 547,
    });

    expect(result).toEqual({ status: 'written', row: 547 });
    expect(config.rowCount).toBe(547);
    expect(config.rows.get(547)).toEqual(['0571', 'Dije estrella']);
  });

  it('con capacidad de sobra escribe sin estirar el grid', async () => {
    const rows = new Map<number, string[]>([[1, ['Item']]]);
    const { sheets, calls } = fakeSheets({ rowCount: 1000, rows });

    const result = await writeNewRowGuarded(sheets, { ...OPTS, targetRow: 2 });

    expect(result.status).toBe('written');
    expect(calls).not.toContain('grid.stretch');
  });

  it('una fila destino OCUPADA aborta sin escribir — la ruta toca plata', async () => {
    const rows = new Map<number, string[]>([[5, ['otro-item', 'ajeno']]]);
    const { sheets, calls, config } = fakeSheets({ rowCount: 1000, rows });

    const result = await writeNewRowGuarded(sheets, { ...OPTS, targetRow: 5 });

    expect(result).toEqual({ status: 'occupied', row: 5 });
    expect(config.rows.get(5)).toEqual(['otro-item', 'ajeno']);
    expect(calls.every((c) => !c.startsWith('values.update'))).toBe(true);
  });
});
