/**
 * Fechas que llegan de Sheets con sufijo de hora — normalizadas en la
 * FRONTERA, no en el motor.
 *
 * `configVigenteEn` (`_lib/motorPrecios.ts`) exige `AAAA-MM-DD` exacto y
 * revienta si no matchea; sigue así a propósito (decisión de Kevin,
 * 2026-08-02: el motor NO se afloja). El defecto real vivía un paso antes:
 * `sheets.spreadsheets.values.get()` sirve `FORMATTED_VALUE`, y una celda de
 * fecha con formato datetime devuelve texto como «2026-05-25 00:00:00»
 * —ni siquiera con padding consistente: C-009 traía «0:00:00»—. Nada en el
 * camino Sheet→Convex lo truncaba, así que 122 de 128 lotes de dev quedaban
 * con una `fechaRecepcion` que el motor no podía leer.
 *
 * Puro: sin IO. Se aplica en `_lib/migracionV4.ts` (lotes nuevos) y en
 * `_lib/sheetPullMaps.ts` (el pull recurrente de fotoSync, para que la deriva
 * no vuelva).
 */

const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Trunca el sufijo de hora si los primeros 10 caracteres SON una fecha ISO.
 * Si no lo son, devuelve el valor tal cual: no inventa una fecha de un texto
 * que no la tiene.
 */
export function normalizarFechaRecepcion(valor: string): string {
  const texto = valor.trim();
  const candidato = texto.slice(0, 10);
  return FECHA_ISO.test(candidato) ? candidato : texto;
}
