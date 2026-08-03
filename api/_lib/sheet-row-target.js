/**
 * Dónde escribir una fila NUEVA en una pestaña keyed por itemId en la columna A.
 *
 * Existe por el incidente del 2026-08-03. `values.append` con un rango abierto
 * (`Inventario!A:BE`) no garantiza que ancle en la columna A: Sheets busca una
 * "tabla" dentro del rango y escribe desde donde ella empieza. En el tab
 * Inventario —102 columnas de grid contra las 57 que cubre el mapa— ancló en AT,
 * así que las 57 celdas cayeron en AT:CX y la columna A quedó VACÍA.
 *
 * El daño no fue la fila corrida sino el bucle: como el itemId no estaba en A,
 * el push siguiente tampoco lo encontraba, decidía "esto es nuevo" y appendeaba
 * otra vez. Diez ítems dejaron veintiuna filas basura.
 *
 * La cura es no dejar que Sheets elija: se calcula la fila y se escribe un rango
 * CERRADO con `values.update`. Determinista — el itemId cae en A o no cae en
 * ningún lado.
 */

/**
 * Localiza el itemId en la columna A y decide la fila destino.
 *
 * @param {string[][]} colA  valores crudos de `<tab>!A:A` (colA[i] = fila i+1).
 * @param {string|number} itemId
 * @returns {{foundRow: number, targetRow: number, willAppend: boolean}}
 *   `foundRow` es la fila física del match (0 = no está). `targetRow` es dónde
 *   escribir: la fila hallada, o la primera libre después del último dato.
 */
export function resolveRowTarget(colA, itemId) {
  const key = String(itemId).trim();
  const rows = Array.isArray(colA) ? colA : [];

  let foundRow = 0;
  // Arranca en i=1: la fila 1 es la cabecera. El código anterior la recorría y
  // confiaba en que el rótulo "Item" jamás coincidiera con un itemId — cierto
  // hoy, pero es una suposición sobre datos, no una garantía. Saltarla es
  // gratis y cierra la puerta a sobreescribir la cabecera.
  for (let i = 1; i < rows.length; i++) {
    const cell = rows[i] && rows[i][0] != null ? String(rows[i][0]).trim() : '';
    if (cell !== '' && cell === key) {
      foundRow = i + 1;
      break;
    }
  }
  if (foundRow > 0) return { foundRow, targetRow: foundRow, willAppend: false };

  // Primera fila libre = después de la última que TIENE dato en A. Se recorta
  // por el final porque `values.get` puede devolver filas vacías de cola.
  let ultimaConDato = 0;
  for (let i = rows.length - 1; i >= 0; i--) {
    const cell = rows[i] && rows[i][0] != null ? String(rows[i][0]).trim() : '';
    if (cell !== '') {
      ultimaConDato = i + 1;
      break;
    }
  }
  return { foundRow: 0, targetRow: ultimaConDato + 1, willAppend: true };
}
