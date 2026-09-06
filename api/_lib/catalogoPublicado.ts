import type { TreasureItem } from '../../src/types/index.ts';
import { convexClient, isConvexEnabled } from './convex-client.js';
import { conCache } from './catalogCache.js';

/**
 * Filtro de publicación para `get-treasure-sheets`, con Convex como fuente.
 *
 * EL AGUJERO QUE TAPA (2026-08-23). `get-treasure-sheets` devolvía TODA fila
 * con `item > 0` — las 576 — sin mirar `mostrarEnCatalogo` ni una vez. O sea
 * que despublicar un ítem lo sacaba del catálogo de Convex
 * (`products.publishedCatalog`) y NO del Treasure Browser, que es el que la
 * gente mira. Se detectó con tres duplicados retirados —#339, #487, #491, los
 * tres con "RETIRADA" en el nombre y con la foto que le faltaba a la pieza
 * vigente— que seguían en vitrina después de despublicarlos por mutación.
 *
 * POR QUÉ CONVEX Y NO LA COLUMNA Y. `mostrarEnCatalogo` es propiedad de Convex
 * y está fuera del allowlist de pull desde el 2026-07-30: la columna Y de la
 * hoja sólo se refresca cuando corre un push Convex→hoja. Medido el 2026-08-23
 * sobre las 576 filas: la hoja tenía **204** en `true` y Convex **443**, con
 * **279 filas en desacuerdo**. Filtrar por la columna habría escondido 239
 * ítems legítimamente publicados. La hoja no sirve como fuente acá.
 *
 * SÓLO PARA NO-STAFF. El personal necesita ver el inventario entero desde el
 * mismo endpoint; el filtro se aplica a `anon` y `vitrina`.
 *
 * BEST-EFFORT, igual que `overlayConvexFotoUrls`: si Convex no contesta se
 * sirve la hoja tal cual. Es fail-open a propósito y con los ojos abiertos —
 * un hipo de Convex no puede dejar la vitrina vacía, y lo que se filtra acá es
 * mercadería retirada, no dato sensible. Lo sensible se recorta en
 * `projectForGrant`, que no depende de esta llamada.
 */

/** Parte pura, para los tests: aplica el conjunto sobre los ítems. */
export function aplicarFiltroPublicado(
  items: TreasureItem[],
  publicados: ReadonlySet<string>,
): TreasureItem[] {
  // Conjunto vacío ⇒ no filtrar. Convex nunca devuelve cero publicados en un
  // catálogo vivo, así que un cero es una falla de lectura, no un catálogo
  // vacío — y vaciar la vitrina por eso sería peor que servirla de más.
  if (publicados.size === 0) return items;
  // Por `itemId` (la celda cruda), NUNCA por `item`: éste es un parseInt y
  // "93A" y "93B" colapsan los dos en 93. Como el padre #93 está retirado y no
  // publicado, comparar por número habría sacado del catálogo a Romeo y a
  // Julieta, que sí lo están. El fallback cubre filas viejas sin `itemId`.
  return items.filter((item) =>
    publicados.has(item.itemId || String(item.item)),
  );
}

/**
 * Consulta a Convex qué ítems están publicados y filtra. Devuelve los ítems
 * sin tocar si Convex no está disponible o si la consulta falla.
 */
export async function filtrarNoPublicados(
  items: TreasureItem[],
): Promise<TreasureItem[]> {
  if (!isConvexEnabled || !convexClient) return items;
  try {
    // Cacheado contra el centinela `catalogVersion`.
    //
    // Ésta es la consulta #1 de la auditoría del 2026-08-12: 759,76 MB, el 63%
    // del I/O del equipo. El arreglo 1C se hizo del lado del navegador
    // (useFotosintesisCatalog) y esta llamada, que corre en el SERVIDOR y en
    // cada request del catálogo público, se quedó sin puerta.
    //
    // Se cachea el CONJUNTO de itemIds, no las filas: es lo único que se usa
    // acá, y así una entrada vieja no puede filtrar campos de más.
    //
    // El centinela se mueve con toda venta y toda (des)publicación, así que la
    // ventana en que una piedra vendida seguiría visible es de segundos, no del
    // TTL. Ver api/_lib/catalogCache.ts.
    const publicados = await conCache<Set<string>>(
      'publishedCatalog:itemIds',
      async () => {
        const { api } = await import('../../convex/_generated/api.js');
        const filas = (await convexClient!.query(
          api.products.publishedCatalog,
          {},
        )) as Array<{ itemId: string }>;
        return new Set(filas.map((f) => String(f.itemId)));
      },
    );
    return aplicarFiltroPublicado(items, publicados);
  } catch (err) {
    console.warn(
      '[catalog] no se pudo leer publishedCatalog; se sirve la hoja sin filtrar',
      err instanceof Error ? err.message : err,
    );
    return items;
  }
}
