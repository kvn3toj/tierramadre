/**
 * Escritura de una fila NUEVA en una pestaña keyed por itemId en la columna A.
 *
 * Compañera de `sheet-row-target.js` (que decide DÓNDE va la fila): este módulo
 * ejecuta la escritura con las dos guardas que la ruta exige, en el orden que
 * el grid de Sheets impone.
 *
 * Existe por el incidente del 2026-08-18 (ítem 0571, "Dije estrella"): el tab
 * Inventario del SOT llegó a su límite físico (546 filas, todas con dato) y
 * TODA alta nueva empezó a devolver 500. La causa no era la escritura sino la
 * guarda: `values.get` sobre una fila fuera del grid lanza el mismo
 * "exceeds grid limits" que `values.update`, y el estiramiento del grid
 * corría DESPUÉS del chequeo de fila ocupada — o sea, nunca. El orden
 * correcto es estirar primero: una fila recién añadida está vacía por
 * construcción, así que la guarda de ocupación sigue valiendo igual.
 */

import type { sheets_v4 } from '@googleapis/sheets';

/**
 * Estira el grid de la pestaña si la fila destino cae fuera. `values.update`
 * sobre un rango que excede el grid falla; `values.append` lo hacía solo, y era
 * lo único bueno que tenía.
 */
export async function ensureRowCapacity(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetTitle: string,
  needed: number,
): Promise<void> {
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets.properties(sheetId,title,gridProperties.rowCount)',
  });
  const props = (meta.data.sheets ?? [])
    .map((sh) => sh.properties)
    .find((p) => p?.title === sheetTitle);
  if (!props?.gridProperties) return;
  const current = props.gridProperties.rowCount ?? 0;
  if (current >= needed) return;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          appendDimension: {
            sheetId: props.sheetId,
            dimension: 'ROWS',
            length: needed - current,
          },
        },
      ],
    },
  });
}

export type NewRowWriteResult =
  | { status: 'written'; row: number }
  | { status: 'occupied'; row: number };

/**
 * Escribe `values` en la fila `targetRow` con rango CERRADO (`A{n}:{lastCol}{n}`)
 * vía `values.update` — nunca `values.append` (incidente 2026-08-03: el append
 * con rango abierto ancló en AT y dejó la columna A vacía).
 *
 * Devuelve `occupied` (sin escribir nada) si la fila destino ya tiene datos:
 * esta ruta toca plata y jamás pisa una fila ajena.
 */
export async function writeNewRowGuarded(
  sheets: sheets_v4.Sheets,
  opts: {
    spreadsheetId: string;
    sheetTitle: string;
    targetRow: number;
    lastCol: string;
    values: (string | number)[];
  },
): Promise<NewRowWriteResult> {
  const { spreadsheetId, sheetTitle, targetRow, lastCol, values } = opts;
  const targetRange = `${sheetTitle}!A${targetRow}:${lastCol}${targetRow}`;

  // El grid puede ser más corto que la fila destino, y FUERA del grid lanzan
  // "exceeds grid limits" tanto `values.update` como el `values.get` de la
  // guarda de abajo (incidente 0571). Estirar primero no debilita la guarda:
  // una fila recién añadida está vacía por construcción.
  await ensureRowCapacity(sheets, spreadsheetId, sheetTitle, targetRow);

  // La fila destino tiene que estar vacía. Esta ruta toca plata: si hay algo
  // ahí, abortamos en vez de pisarlo.
  const occupiedResp = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: targetRange,
  });
  const occupied = (occupiedResp.data.values?.[0] ?? []) as string[];
  if (occupied.some((c) => String(c ?? '').trim() !== '')) {
    return { status: 'occupied', row: targetRow };
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: targetRange,
    valueInputOption: 'USER_ENTERED', // lets numbers/dates stay typed
    requestBody: { values: [values] },
  });
  return { status: 'written', row: targetRow };
}
