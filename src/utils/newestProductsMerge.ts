import { TreasureItem } from '../types';

export interface DriveNewestCandidate {
  itemNumber: number;
  productName: string;
  proxyUrl: string;
  imageCreatedTime: string;
}

interface DatedItem {
  item: TreasureItem;
  sortDate: number;
}

function legacyStub(product: DriveNewestCandidate): TreasureItem {
  return {
    item: product.itemNumber,
    nombre: product.productName,
    imagen: product.proxyUrl,
    fechaIngreso: '',
    peso: 0,
    color: '',
    calidad: '',
    cantidad: 1,
    talla: '',
    medidas: '',
    precioCOP: 0,
    ubicacion: '',
    asesor: '',
    estado: 'DISPONIBLE',
    isJewelry: false,
    mediaType: 'image' as const,
  } as TreasureItem;
}

/**
 * Merge Drive-scanned "newest" candidates (legacy pipeline) with Fotosíntesis
 * items already published to the catalog, ordered as NEWEST INVENTORY: the
 * highest item number first, sliced to `limit`.
 *
 * Why the item number and not a date (2026-09-09): `publishedAt` is the moment
 * someone flipped `mostrarEnCatalogo`, not when the piece entered inventory.
 * Items 542/543 (from the 12-Aug sheet) got stamped on 23-Aug during a
 * surgical correction and outranked 585 for two weeks. The inventory number is
 * assigned in entry order and is the same key the Treasure grid's "newest"
 * sort uses, so Estrenos and "Ver Todo" now agree. The Drive upload date and
 * `publishedAt` survive only as tie-breakers (93A / 93B both parse to 93).
 *
 * The two candidate pools are normally disjoint by photo-storage location —
 * Fotosíntesis photos go to `fotoUrl`, never into the `products/` Drive
 * folder this scans — not because item numbers can't collide. An item
 * matched in `treasure` that already has `publishedAt` set is skipped from
 * the Drive side so an out-of-band manual Drive upload for an
 * already-published item can't render it twice. Lote/sublote bundle cards
 * (`isLote`) are excluded: they have no single natural "newest" moment. A
 * Fotosíntesis item published before its photo was uploaded (`imagen` unset)
 * is excluded too — it would otherwise render a broken-image placeholder.
 * A sold item (`estado` VENDIDA) is excluded: a "new arrival" nobody can buy
 * is a broken promise. Only a KNOWN estado excludes — the catalog withholds
 * estado for anon/guest sessions, and unknown is not "sold".
 */
export function mergeNewestCandidates(
  driveCandidates: DriveNewestCandidate[],
  treasure: TreasureItem[],
  limit: number,
): TreasureItem[] {
  const legacyDated: DatedItem[] = [];
  for (const product of driveCandidates) {
    const treasureItem = treasure.find((t) => t.item === product.itemNumber);
    if (treasureItem?.publishedAt != null) continue;
    if (isSold(treasureItem)) continue;
    const item: TreasureItem = treasureItem
      ? {
          ...treasureItem,
          imagen: product.proxyUrl,
          nombre: treasureItem.nombre || product.productName,
        }
      : legacyStub(product);
    const sortDate = new Date(product.imageCreatedTime).getTime();
    legacyDated.push({
      item,
      sortDate: Number.isFinite(sortDate) ? sortDate : 0,
    });
  }

  const fotosintesisDated: DatedItem[] = treasure
    .filter(
      (t) => t.publishedAt != null && !t.isLote && !!t.imagen && !isSold(t),
    )
    .map((item) => ({ item, sortDate: item.publishedAt as number }));

  return [...legacyDated, ...fotosintesisDated]
    .sort(
      (a, b) =>
        itemNumber(b.item) - itemNumber(a.item) || b.sortDate - a.sortDate,
    )
    .slice(0, limit)
    .map((d) => d.item);
}

/** Inventory number as the primary "newest" key; a malformed one sorts last. */
function itemNumber(item: TreasureItem): number {
  return Number.isFinite(item.item) ? item.item : -1;
}

function isSold(item: TreasureItem | undefined): boolean {
  return item?.estado === 'VENDIDA';
}
