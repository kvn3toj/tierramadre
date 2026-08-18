import type { TreasureItem } from '../../src/types/index.ts';
import { convexClient, isConvexEnabled } from './convex-client.js';

/**
 * Overlay de `fotoUrl` desde Convex sobre los ítems que get-treasure-sheets
 * armó desde la hoja.
 *
 * Convex es la fuente VIVA de la foto principal (el bot escribe ahí al
 * momento); la columna AL de la hoja solo se refresca cuando corre un push
 * Convex→hoja — que puede ir horas detrás o estar congelado (incidente
 * 2026-08-15). Sin este overlay, una foto recién subida no aparece en el
 * catálogo hasta el próximo sync, y una celda AL pisada por el incidente de
 * rowIndex serviría la URL de OTRO ítem.
 */
interface FotoRow {
  itemId: string;
  fotoUrl: string;
}

/** Parte pura, para los tests: aplica el mapa sobre los ítems. */
export function applyFotoOverlay(
  items: TreasureItem[],
  fotos: FotoRow[],
): TreasureItem[] {
  if (fotos.length === 0) return items;
  const porItem = new Map(fotos.map((f) => [f.itemId, f.fotoUrl]));
  return items.map((item) => {
    const fotoUrl = porItem.get(String(item.item));
    if (!fotoUrl) return item;
    return { ...item, imagen: fotoUrl, thumbnailUrl: fotoUrl };
  });
}

/**
 * Consulta Convex y aplica el overlay. Best-effort a propósito: un hipo de
 * Convex no puede tumbar el catálogo entero — sin overlay se sirve lo que
 * diga la hoja, que es exactamente lo que pasaba antes de este cambio.
 */
export async function overlayConvexFotoUrls(
  items: TreasureItem[],
): Promise<TreasureItem[]> {
  if (!isConvexEnabled || !convexClient) return items;
  try {
    const { api } = await import('../../convex/_generated/api.js');
    const fotos = (await convexClient.query(
      api.products.fotoUrls,
      {},
    )) as FotoRow[];
    return applyFotoOverlay(items, fotos);
  } catch (err) {
    console.warn(
      `[GetTreasureSheets] overlay de fotoUrl desde Convex falló: ${(err as Error).message}`,
    );
    return items;
  }
}
