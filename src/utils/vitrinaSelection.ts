/**
 * Helpers puros de la selección múltiple del catálogo (`/treasure` → vitrina).
 *
 * Sin React y sin Convex, a propósito: el modo selección tiene reglas de negocio
 * reales —un tope que viene del servidor, un orden que el cliente va a ver, una
 * poda que no puede confundirse con un filtro— y esas reglas se fijan en
 * `tests/vitrinaSelection.test.ts` sin montar un solo componente.
 *
 * Mismo molde que `src/pages/admin/Fotosintesis/utils/saleItemSelection.ts`.
 *
 * Spec: docs/superpowers/specs/2026-09-01-seleccion-multiple-vitrina-design.md
 */

/**
 * Tope de piezas por enlace.
 *
 * **No es una preferencia de diseño: es el techo que ya impone el servidor**
 * (`api/vitrina.ts` rechaza un cuerpo con más de 50 ids). Duplicarlo acá es lo
 * que permite decirle al asesor «ya tienes 50» en el toque 51, en vez de
 * dejarlo armar sesenta piezas y fallar recién al acuñar.
 */
export const VITRINA_MAX_ITEMS = 50;

/** La forma mínima que `toShareItems` necesita de una pieza del catálogo. */
export interface VitrinaSelectableItem {
  item: number;
  nombre?: string;
  precioCOP?: number;
}

/** Lo que `VitrinaShareDialog` recibe por pieza (`VitrinaShareDialog.tsx:161`). */
export interface VitrinaShareItem {
  item: number;
  precioCOP?: number;
  nombre?: string;
}

export interface ToggleResult {
  ids: number[];
  /** true sólo cuando el tope impidió AGREGAR. Quitar nunca se rechaza. */
  rejected: boolean;
}

/**
 * Alterna `id` dentro de `ids`, respetando el tope.
 *
 * El orden importa y se preserva: es el orden en que el asesor tocó las piezas
 * y el orden en que el cliente las verá en `/v/<token>`.
 *
 * **Quitar nunca se rechaza, ni siquiera en el tope.** Un tope que también
 * bloqueara la deselección dejaría al asesor encerrado en sus 50 primeras
 * piezas sin forma de cambiar una.
 */
export function toggleId(
  ids: readonly number[],
  id: number,
  max: number = VITRINA_MAX_ITEMS,
): ToggleResult {
  const idx = ids.indexOf(id);
  if (idx >= 0) {
    return { ids: ids.filter((x) => x !== id), rejected: false };
  }
  if (ids.length >= max) {
    return { ids: [...ids], rejected: true };
  }
  return { ids: [...ids, id], rejected: false };
}

/**
 * Deja caer los ids cuya pieza ya no existe.
 *
 * `has` pregunta por EXISTENCIA en el catálogo completo, nunca por el conjunto
 * filtrado: la selección sobrevive a los cambios de filtro a propósito (curar
 * tres de Muzo y después dos de Chivor es el caso de uso literal). Podar por
 * filtro vaciaría la selección en cada tecla del buscador.
 *
 * Devuelve la MISMA referencia cuando no hay nada que podar — el hook deriva
 * estado de esto dentro de un efecto, y una referencia nueva en cada render
 * sería un bucle.
 */
export function pruneIds(
  ids: number[],
  has: (id: number) => boolean,
): number[] {
  const kept = ids.filter(has);
  return kept.length === ids.length ? ids : kept;
}

/**
 * Arma los `ShareItem` que el diálogo de acuñado espera.
 *
 * Se derivan del mapa del catálogo en cada lectura y NO se guardan: guardar el
 * objeto congelaría el precio del instante del toque, y un cambio de precio no
 * llegaría al enlace. Un id sin pieza en el mapa se omite en vez de emitir un
 * hueco — el enlace lleva lo que existe, no marcadores rotos.
 */
export function toShareItems(
  ids: readonly number[],
  byId: ReadonlyMap<number, VitrinaSelectableItem>,
): VitrinaShareItem[] {
  const out: VitrinaShareItem[] = [];
  for (const id of ids) {
    const found = byId.get(id);
    if (!found) continue;
    out.push({
      item: found.item,
      nombre: found.nombre,
      precioCOP: found.precioCOP,
    });
  }
  return out;
}

/**
 * El conteo, en la voz de la casa.
 *
 * Nunca dice «tu selección»: ese sustantivo ya está tomado por el carrito
 * (`CartPage.tsx:249`), y dos baldes distintos con el mismo nombre en la misma
 * sesión es exactamente la confusión que esta función existe para no repetir.
 */
export function selectionLabel(n: number): string {
  return n === 1 ? '1 pieza seleccionada' : `${n} piezas seleccionadas`;
}
