/**
 * Resolve a displayable thumbnail URL for a Fotosíntesis inventory item.
 *
 * Why this exists: the venta picker (ProductoSpotlight) and the Kardex preview
 * relied solely on `productInventory.fotoUrl`, which is only populated when an
 * item is captured WITH a photo through the Fotosíntesis flow. Many inventory
 * rows (legacy items, SOT-synced rows) carry no `fotoUrl`, so their thumbnails
 * rendered blank — even though the public catalog shows them fine. The catalog
 * works because it reads a SEPARATE, well-populated store: the Drive `products/`
 * folder scan exposed by `get-batch-thumbnails` (keyed by numeric item number).
 *
 * This helper layers the two sources so the venta form gets the catalog's
 * coverage without losing the Fotosíntesis-specific photo when one exists:
 *
 *   1. the item's own `fotoUrl`, routed through the Drive proxy, then
 *   2. the legacy batch-thumbnail map, keyed by the numeric item number.
 *
 * It is purely additive — when `fotoUrl` exists it still wins, so it can only
 * add coverage, never regress an item that already showed a photo.
 */
import { convertToProxyUrl } from "../../../../utils/driveUrl";

/** Minimal shape of a batch-thumbnail entry (see useBatchThumbnails). */
export interface BatchThumbLike {
  url: string;
}

export function resolveItemThumbnail(
  fotoUrl: string | undefined,
  itemId: string | undefined,
  batch: Record<number, BatchThumbLike> | undefined,
): string | undefined {
  // 1. Item's own Fotosíntesis photo (proxied). convertToProxyUrl returns a
  //    falsy value for an empty/undefined fotoUrl, so we fall through cleanly.
  const proxied = convertToProxyUrl(fotoUrl);
  if (proxied) return proxied;

  // 2. Legacy catalog thumbnail, keyed by the numeric item number.
  if (itemId && batch) {
    const n = Number(String(itemId).trim());
    if (Number.isInteger(n) && n > 0) {
      const entry = batch[n];
      if (entry?.url) return entry.url;
    }
  }

  return undefined;
}
