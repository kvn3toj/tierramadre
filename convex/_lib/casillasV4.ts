/**
 * Las casillas de W2, creadas al guardar W1 — el modelo «2 Cerebros».
 *
 * Guardar el lote no captura las piezas: crea N casillas vacías y termina. Quien
 * clasifica las llena después, posiblemente otra persona en otro momento. Hoy la
 * página hace lo contrario (captura ítem por ítem inline, en la misma sesión y
 * por la misma persona), y por eso la clasificación se hace con prisa mientras
 * alguien espera para cerrar la compra.
 *
 * Puro y sin IO: la mutation lee los itemIds existentes, llama a
 * `siguienteItemIdNumerico`, y este módulo devuelve los documentos a insertar.
 */
import type { CategoriaFiscalLote } from './loteV4';

/** Toda casilla nace aquí. W2 la mueve cuando queda completa. */
export const ESTADO_CASILLA_INICIAL = 'PENDIENTE_CLASIFICAR';

export interface CasillaPlan {
  loteId: string;
  itemId: string;
  ordenEnLote: number;
  estadoCasilla: string;
  /** Campos del riel viejo: en v4 no se usan, pero el schema los exige. */
  preponderancia: number;
  costoBaseCOP: number;
  /** Lo captura W2. Ausente a propósito: es la decisión, no un default. */
  costoUnitarioRealCOP?: number;
  /** Heredada del lote; ausente cuando el lote es `mixta`. */
  categoriaFiscal?: 'gema' | 'joya';
  /** El tipo de gema, heredado del bloque Gema del lote. */
  tipo?: string;
}

/**
 * El siguiente itemId libre, mirando LOS DOS rieles.
 *
 * Es la parte que se puede equivocar en silencio: las casillas v4 no tienen fila
 * en `productInventory`, así que el allocator viejo —que solo escanea esa
 * tabla— les asignaría un número ya usado por otra casilla v4. Los QR impresos
 * referencian `#NNN`, de modo que un choque no es un detalle cosmético: son dos
 * piedras distintas con la misma etiqueta física.
 */
export function siguienteItemIdNumerico(
  itemIdsInventario: readonly string[],
  itemIdsCasillas: readonly string[],
): number {
  let max = 0;
  for (const id of [...itemIdsInventario, ...itemIdsCasillas]) {
    const n = Number(id);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max + 1;
}

export interface PlanificarCasillasInput {
  loteId: string;
  unidadesDeclaradas: number;
  primerItemIdNumerico: number;
  categoriaFiscalLote: CategoriaFiscalLote;
  /**
   * El `tipoGema` del bloque Gema del lote, si lo tiene. Cada casilla nace con
   * él: clasificar es CORREGIR defaults heredados, no digitar de cero. Ausente
   * ⇒ no se le inventa uno.
   */
  tipoGemaLote?: string;
}

/** Los documentos de casilla a insertar para un lote recién guardado. */
export function planificarCasillas(
  input: PlanificarCasillasInput,
): CasillaPlan[] {
  if (!input.loteId?.trim()) {
    throw new Error(
      'loteId es obligatorio: una casilla sin lote queda huérfana.',
    );
  }
  if (
    !Number.isInteger(input.unidadesDeclaradas) ||
    input.unidadesDeclaradas < 1
  ) {
    throw new Error(
      `unidadesDeclaradas debe ser un entero de al menos 1 (recibí ` +
        `${input.unidadesDeclaradas}).`,
    );
  }

  // Un lote mixto no hereda categoría: la gracia de declararlo mixto es
  // justamente que cada pieza diga la suya antes de tener precio.
  const heredada =
    input.categoriaFiscalLote === 'mixta'
      ? undefined
      : input.categoriaFiscalLote;

  return Array.from({ length: input.unidadesDeclaradas }, (_, i) => ({
    loteId: input.loteId,
    itemId: String(input.primerItemIdNumerico + i),
    ordenEnLote: i + 1,
    tipo: input.tipoGemaLote?.trim() || undefined,
    estadoCasilla: ESTADO_CASILLA_INICIAL,
    preponderancia: 0,
    costoBaseCOP: 0,
    categoriaFiscal: heredada,
  }));
}
