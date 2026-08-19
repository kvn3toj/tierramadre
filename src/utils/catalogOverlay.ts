/**
 * Superposición de campos Convex-only sobre el catálogo mergeado.
 *
 * El browser junta dos fuentes: /api/get-treasure-sheets (la hoja cruda del
 * SOT, sin filtrar) y products.publishedCatalog (Convex, sólo publicados).
 * Cuando un ítem viene de AMBAS, el merge de useTreasure descarta el de
 * Convex para no duplicar cards — y con él se pierden los campos que SÓLO
 * la rama Convex trae:
 *
 *  - `precioEspecial` — derivado de `observacion` en las queries; la hoja
 *    cruda no lo calcula (fix original de este patrón).
 *  - `publishedAt` — el sello de publicación de withPublishStamp. Perderlo
 *    tumbó los ítems de C-090 del grid (2026-08-19): el gate de "sin precio
 *    se oculta" de useTreasureFiltering exime justamente por `publishedAt`,
 *    así que la fila de hoja (sin sello y con precio vacío) quedaba oculta
 *    aunque el ítem estuviera publicado con todas las de la ley en Convex.
 *
 * La regla: la fila ganadora conserva TODO lo suyo; sólo se le añade lo que
 * únicamente Convex sabe. `publishedAt` propio (rama Convex ganó) no se pisa.
 */

type ConOverlay = {
  item: number;
  precioEspecial?: unknown;
  publishedAt?: number;
};

export function overlayConvexCatalogFields<T extends ConOverlay>(
  baseTreasure: T[],
  fotosintesisItems: ReadonlyArray<ConOverlay>,
): T[] {
  const precioEspecialPorItem = new Map(
    fotosintesisItems
      .filter((i) => i.precioEspecial)
      .map((i) => [i.item, i.precioEspecial]),
  );
  const publishedAtPorItem = new Map(
    fotosintesisItems
      .filter((i) => i.publishedAt != null)
      .map((i) => [i.item, i.publishedAt]),
  );

  return baseTreasure.map((base) => {
    const promo = precioEspecialPorItem.get(base.item);
    const pubAt = base.publishedAt ?? publishedAtPorItem.get(base.item);
    if (!promo && pubAt === base.publishedAt) return base;
    return {
      ...base,
      ...(promo ? { precioEspecial: promo } : {}),
      ...(pubAt != null ? { publishedAt: pubAt } : {}),
    };
  });
}
