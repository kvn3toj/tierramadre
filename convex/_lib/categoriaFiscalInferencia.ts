/**
 * Inferencia de `categoriaFiscal` por nombre — decisión de Kevin, 2026-08-02
 * (bloqueo #2 de la doble corrida del punto 8: 0 de 128 lotes de dev tenían
 * `categoriaFiscal`, y el motor no cotiza sin ella).
 *
 * La lista de palabras clave no es nueva: es la que ya usó la auditoría del
 * 25/07 para clasificar por nombre («se infirió por nombre... Kevin no la
 * revisó ítem por ítem» — pregunta abierta #2 de
 * `References/tierramadre-modelo-fijacion-precios-v2.md`). Hoy se codifica
 * por primera vez, sin cambiarla: la codificación no es la revisión.
 *
 * **Por eso lo que esta inferencia siembra sale marcado `'inferida'`, nunca
 * `'capturada'`.** El candado del motor (`categoriaFiscal` tiene que EXISTIR)
 * queda satisfecho, pero cada precio que sale de un lote `'inferida'` debe
 * viajar con el aviso `CATEGORIA_INFERIDA` (ver `convex/precios.ts`) y el
 * espejo debe mostrarla con sufijo. El gate duro vive acá:
 * `lotesPendientesDeRevision` — prod no corta con ningún lote en
 * `'inferida'`, Kevin los gradúa a `'revisada'` uno por uno.
 *
 * Puro: sin IO. La lectura del nombre por ítem y la escritura en Convex
 * viven en `convex/categoriaFiscalInferencia.ts`.
 */

export type CategoriaFiscalItem = 'gema' | 'joya';
export type CategoriaFiscalLote = 'gema' | 'joya' | 'mixta';
export type CategoriaFiscalOrigen = 'capturada' | 'inferida' | 'revisada';

/**
 * Palabras clave → joya. Todo lo demás → gema. Tal cual la auditoría del
 * 25/07 las citó — no se agregó ni se quitó ninguna acá.
 */
export const PALABRAS_CLAVE_JOYA = [
  'anillo',
  'arete',
  'choker',
  'pulsera',
  'manilla',
  'brazalete',
  'topito',
  'topos',
  'dije',
  'pin',
  'collar',
  'base anillo',
  'poste',
  'cadena',
  'montura',
  'soberana',
] as const;

/**
 * Coincidencia por substring, case-insensitive — el mismo método con que se
 * hizo la clasificación original. No es matching por palabra completa: una
 * palabra clave corta (p. ej. «pin») puede coincidir dentro de otra palabra
 * más larga. Es un riesgo conocido, no corregido acá — la propia doble
 * corrida es el detector: una inferencia mal hecha diverge fuerte contra el
 * precio real (§2d de la decisión), y esa divergencia es la señal que manda
 * el ítem a revisión, no un matching más fino que nadie pidió.
 */
export function inferirCategoriaFiscalItem(
  nombre: string | undefined,
): CategoriaFiscalItem {
  const texto = (nombre ?? '').toLowerCase();
  const esJoya = PALABRAS_CLAVE_JOYA.some((palabra) => texto.includes(palabra));
  return esJoya ? 'joya' : 'gema';
}

export interface ItemParaInferir {
  itemId: string;
  nombre?: string;
}

export interface InferenciaLote {
  loteId: string;
  categoriaFiscal: CategoriaFiscalLote;
  /** Solo presente cuando `categoriaFiscal === 'mixta'`: la categoría por ítem. */
  porItem?: Map<string, CategoriaFiscalItem>;
}

/**
 * Infiere ítem por ítem y agrega al nivel del lote: si todos coinciden, esa
 * es la categoría del lote; si no, `mixta` con el detalle por ítem — la
 * misma semántica que `preciosDelLote` ya espera de un lote mixto
 * (`_lib/motorUnidad.ts`).
 */
export function inferirCategoriaFiscalLote(
  loteId: string,
  items: readonly ItemParaInferir[],
): InferenciaLote {
  if (items.length === 0) {
    throw new Error(
      `el lote ${loteId} no tiene ítems para inferir de: no hay nombre que mirar.`,
    );
  }

  const porItem = new Map(
    items.map((it) => [it.itemId, inferirCategoriaFiscalItem(it.nombre)]),
  );
  const categorias = new Set(porItem.values());

  if (categorias.size === 1) {
    return { loteId, categoriaFiscal: [...categorias][0] };
  }
  return { loteId, categoriaFiscal: 'mixta', porItem };
}

/**
 * El gate duro de Fase 3 (decisión de Kevin, §2c): prod no corta con NINGÚN
 * lote en `'inferida'`. Devuelve los `loteId` que todavía necesitan que
 * Kevin los mire y los gradúe a `'revisada'`.
 */
export function lotesPendientesDeRevision(
  lots: readonly {
    loteId: string;
    categoriaFiscalOrigen?: CategoriaFiscalOrigen;
  }[],
): string[] {
  return lots
    .filter((l) => l.categoriaFiscalOrigen === 'inferida')
    .map((l) => l.loteId);
}
