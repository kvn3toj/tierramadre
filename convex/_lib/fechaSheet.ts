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
const FECHA_COMPACTA = /^(\d{4})(\d{2})(\d{2})$/;

/**
 * ¿Esa cadena ISO nombra un día que existe?
 *
 * No alcanza con que sean ocho dígitos: `20261301` y `20260132` los tienen y no son
 * fechas. Se construye la fecha y se compara de vuelta — si el motor de `Date` tuvo que
 * corregir algo, o no pudo parsearla, no era una fecha real y no se toca.
 *
 * No lee el reloj: sigue siendo pura.
 */
function esDiaReal(iso: string): boolean {
  const d = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso;
}

export function normalizarFechaRecepcion(valor: string): string {
  const texto = valor.trim();
  const candidato = texto.slice(0, 10);
  if (FECHA_ISO.test(candidato)) return candidato;

  /**
   * La forma COMPACTA `AAAAMMDD`, medida el 2026-08-12 contra la pestaña `Lotes`:
   * **14 lotes `LC-*` la traen así** (`20260127`, `20251208`). Son los reconstruidos
   * el 2026-07-23 desde «colección + fecha de ingreso», y entraron con el formato de
   * origen; el motor exige guiones y los rechaza, así que catorce lotes no cotizan.
   *
   * Esto NO contradice el «no inventa una fecha» de arriba: `20260127` y `2026-01-27`
   * son la misma fecha en otra notación. Inventar sería completar lo que falta — y por
   * eso `2251207` (siete dígitos, LC-14, origen «07-dic-022», anotado como corrupto en
   * el vault) se devuelve intacto en vez de adivinarle el dígito ausente. Que falle
   * ruidoso río abajo es el comportamiento correcto para un dato que nadie sabe leer.
   */
  const compacta = FECHA_COMPACTA.exec(texto);
  if (compacta) {
    const iso = `${compacta[1]}-${compacta[2]}-${compacta[3]}`;
    if (esDiaReal(iso)) return iso;
  }
  return texto;
}
