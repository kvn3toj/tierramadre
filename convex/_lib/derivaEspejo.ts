/**
 * Detección de deriva del espejo.
 *
 * La regla de v4 es que la hoja nunca es origen. Pero la hoja se puede editar, y
 * alguien lo va a hacer — el Léeme lo pide, no lo impide.
 *
 * La respuesta correcta no es bloquearlo (no se puede) ni absorberlo (eso
 * reintroduce el pull, con sus allowlists divergentes y su incapacidad de
 * distinguir «alguien lo puso a propósito» de «nunca se escribió» — el incidente
 * de `mostrarEnCatalogo`, 285 piezas a punto de desaparecer de la vitrina).
 * La respuesta es **reportar**: decir qué celda se tocó y con qué valor.
 *
 * Por eso este módulo no propone parches. Devuelve hechos.
 */

export type FilaPlana = Record<string, string>;

/**
 * Un checksum estable de la fila, independiente del orden de las claves.
 *
 * No es criptográfico ni pretende serlo: solo tiene que cambiar cuando cambia
 * un valor, para poder comparar filas largas sin recorrer campo por campo.
 */
export function checksumFila(fila: FilaPlana): string {
  const partes = Object.keys(fila)
    .sort()
    .map((k) => `${k}=${fila[k] ?? ''}`)
    .join('');

  // djb2 — barato y suficiente para detectar cambios.
  let h = 5381;
  for (let i = 0; i < partes.length; i++) {
    h = ((h << 5) + h + partes.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}

export interface Deriva {
  id: string;
  campo: string;
  enEspejo: string;
  enConvex: string;
}

export interface ReporteDeriva {
  derivas: Deriva[];
  /** Filas agregadas a mano en la hoja. */
  soloEnEspejo: string[];
  /** Filas que Convex tiene y el espejo todavía no: cola pendiente, no deriva. */
  soloEnConvex: string[];
  sinDeriva: number;
}

/**
 * Columnas que se ESCRIBEN pero no se comparan: sellos de tiempo.
 *
 * `recalculadoEn` y `actualizadoEn` se estampan con el reloj cada vez que la
 * fila se reconstruye, así que nunca coinciden con lo que quedó en la hoja.
 * Compararlos reportaría deriva en cada corrida y en cada fila, y un reporte que
 * siempre grita deja de leerse — que es exactamente como se pierde la señal real
 * de que alguien editó un precio a mano.
 *
 * Son ignorados en la COMPARACIÓN, no en la escritura: la hoja los sigue
 * mostrando, que para eso están.
 */
export const CAMPOS_SIN_COMPARAR: readonly string[] = [
  'recalculadoEn',
  'actualizadoEn',
];

export interface DetectarDerivaInput {
  /** Las columnas que el espejo gobierna. El resto se ignora. */
  cabeceras: string[];
  idCabecera: string;
  filasEspejo: FilaPlana[];
  filasConvex: FilaPlana[];
}

export function detectarDeriva(input: DetectarDerivaInput): ReporteDeriva {
  const porIdEspejo = new Map(
    input.filasEspejo.map((f) => [f[input.idCabecera] ?? '', f]),
  );
  const porIdConvex = new Map(
    input.filasConvex.map((f) => [f[input.idCabecera] ?? '', f]),
  );

  const derivas: Deriva[] = [];
  let sinDeriva = 0;

  for (const [id, filaConvex] of porIdConvex) {
    const filaEspejo = porIdEspejo.get(id);
    if (!filaEspejo) continue;

    const antes = derivas.length;
    for (const campo of input.cabeceras) {
      // Solo las columnas que el espejo gobierna. Una columna de notas que
      // agregó el equipo no es deriva: el espejo nunca dijo nada sobre ella.
      if (CAMPOS_SIN_COMPARAR.includes(campo)) continue;
      const enEspejo = filaEspejo[campo] ?? '';
      const enConvex = filaConvex[campo] ?? '';
      if (enEspejo !== enConvex) {
        derivas.push({ id, campo, enEspejo, enConvex });
      }
    }
    if (derivas.length === antes) sinDeriva++;
  }

  return {
    derivas,
    soloEnEspejo: [...porIdEspejo.keys()].filter(
      (id) => id && !porIdConvex.has(id),
    ),
    soloEnConvex: [...porIdConvex.keys()].filter(
      (id) => id && !porIdEspejo.has(id),
    ),
    sinDeriva,
  };
}
