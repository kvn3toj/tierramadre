/**
 * Dónde va cada fila del espejo, y con qué valores.
 *
 * Puro: recibe lo que la hoja ya tiene (su fila de cabeceras y la columna de
 * ids) y decide. La parte que habla con Sheets vive en `espejoSheets.ts`.
 *
 * Las dos lecciones de v3 que este módulo existe para no repetir:
 *
 *  1. **Nunca por índice posicional.** El incidente «Ubicación: 150820» —un
 *     precio escrito donde iba una ubicación— salió de leer por posición un
 *     layout de 42 columnas que se movió. Acá el orden lo manda la fila de
 *     cabeceras REAL de la hoja: si alguien mueve una columna, su dato la sigue.
 *  2. **Nunca por contador.** `rowIndex = maxRow + 1` produjo deriva real en el
 *     riel viejo, al punto de necesitar una reparación dedicada. Acá la fila se
 *     ubica buscando el id en su columna.
 *
 * Y una decisión de convivencia: una columna que la hoja tiene y el espejo no
 * conoce se deja INTACTA (`null` en la petición de Sheets, que significa «no
 * tocar»). Que el equipo agregue una columna de notas no es deriva a pisar.
 */

export interface PlanificarUpsertInput {
  /** Las cabeceras que este espejo sabe escribir. */
  cabeceras: string[];
  /** La fila 1 de la hoja, tal como está hoy. Vacía si la pestaña está en blanco. */
  filaCabecera: string[];
  /** La columna de ids, de la fila 2 hacia abajo, en orden. */
  idsExistentes: string[];
  idFila: string;
  campos: Record<string, string>;
}

export interface PlanUpsert {
  accion: 'append' | 'update';
  /** 1-based, como las cuenta Sheets. Solo en `update`. */
  filaHoja?: number;
  /** Alineados a `filaCabecera`. `null` = no tocar esa celda. */
  valores: (string | null)[];
  /**
   * Cabeceras que el espejo quiere escribir y la hoja no tenía. **Ya están
   * incluidas en `filaCabeceraFinal` y en `valores`**; se reportan para que el
   * llamador sepa que tiene que reescribir la fila 1.
   */
  cabecerasFaltantes: string[];
  /** La pestaña está en blanco: hay que escribir la fila de cabeceras. */
  necesitaCabeceras: boolean;
  /**
   * El layout definitivo, contra el que están alineados `valores`: el de la hoja
   * más las cabeceras nuevas AL FINAL. Nunca reordena ni renombra lo existente —
   * el orden de la hoja sigue siendo de la hoja.
   */
  filaCabeceraFinal: string[];
}

export function planificarUpsert(input: PlanificarUpsertInput): PlanUpsert {
  if (!input.idFila?.trim()) {
    throw new Error(
      'idFila es obligatorio: sin clave natural el upsert no puede ser ' +
        'idempotente y un reintento duplicaría la fila.',
    );
  }

  const necesitaCabeceras = input.filaCabecera.length === 0;
  // Con la pestaña en blanco, el layout que se va a escribir es el nuestro.
  const layout = necesitaCabeceras ? input.cabeceras : input.filaCabecera;

  const cabecerasFaltantes = input.cabeceras.filter((c) => !layout.includes(c));

  // Una cabecera nueva se AGREGA a la derecha en vez de reventar la fila. El
  // canon lo pide así —«agregar cabeceras es aditivo, y el orden es libre»— y
  // sin esto cada columna nueva del motor exigía editar el libro a mano antes de
  // que ninguna fila se pudiera escribir. Nunca reordena ni pisa lo que ya está:
  // el orden de la hoja sigue siendo de la hoja.
  const filaCabeceraFinal = [...layout, ...cabecerasFaltantes];

  const valores = filaCabeceraFinal.map((cabecera) =>
    Object.prototype.hasOwnProperty.call(input.campos, cabecera)
      ? (input.campos[cabecera] ?? '')
      : null,
  );

  const indice = input.idsExistentes.indexOf(input.idFila);
  if (indice === -1) {
    return {
      accion: 'append',
      valores,
      cabecerasFaltantes,
      necesitaCabeceras,
      filaCabeceraFinal,
    };
  }

  return {
    accion: 'update',
    // +2: la fila 1 es la cabecera y Sheets cuenta desde 1.
    filaHoja: indice + 2,
    valores,
    cabecerasFaltantes,
    necesitaCabeceras,
    filaCabeceraFinal,
  };
}
