/**
 * Decidir si una fila del padrón (Asesores / Proveedores) está ACTIVA.
 *
 * POR QUÉ EXISTE
 *
 * `api/validate.ts` filtraba a los asesores con una LISTA NEGRA:
 *
 *   const estado = String(row[estadoIndex] || '').toLowerCase();  // sin trim
 *   if (estado === 'inactivo' || estado === 'inactive') continue;
 *
 * Sólo esas dos palabras exactas bloqueaban. Todo lo demás entraba:
 * "Suspendido", "Retirado", "Inactiva", "No activo", la celda vacía — y,
 * porque faltaba el `.trim()`, también `"Inactivo "` con un espacio al final.
 * Dar de baja a alguien tecleando cualquier variante lo dejaba dentro, sin
 * error en ningún lado.
 *
 * Que no es hipotético: la columna `Datos` del mismo padrón ya trae
 * "Administrador " con espacio final (auditado 2026-08-11 sobre las 35 filas
 * del SOT v3). Se salva de milagro porque el rol sí hace `.trim()`; el estado
 * era el único de los tres campos que no lo hacía.
 *
 * Una puerta de permisos tiene que fallar CERRADA: ante un valor que no
 * entendemos, denegar. De ahí la lista blanca — el mismo criterio que la rama
 * de proveedores ya usaba (`status === 'ACTIVO'`).
 *
 * LA EXCEPCIÓN QUE IMPORTA
 *
 * Si la hoja NO tiene columna de estado, no hay nada que verificar y todas las
 * filas cuentan como activas. Exigir "activo" contra una columna inexistente
 * dejaría fuera al padrón entero — cambiar un bug silencioso por un apagón
 * total de los logins.
 */

/** Minúsculas, sin acentos, sin espacios sobrantes. "ACTIVO " → "activo". */
function normalizeEstado(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Los únicos valores que conceden acceso. Cualquier otra cosa lo deniega. */
const ACTIVE_VALUES = new Set(['activo', 'activa', 'active']);

/**
 * @param rawEstado  el valor crudo de la celda (puede ser undefined)
 * @param hasEstadoColumn  si la hoja tiene columna de estado. Cuando es false
 *                         el valor se ignora y la fila cuenta como activa.
 */
export function isRosterRowActive(
  rawEstado: unknown,
  hasEstadoColumn: boolean,
): boolean {
  if (!hasEstadoColumn) return true;
  return ACTIVE_VALUES.has(normalizeEstado(rawEstado));
}
