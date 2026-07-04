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
 * Merge Drive-scanned "newest" candidates (legacy pipeline, sorted by
 * image upload date) with Fotosíntesis items already published to the
 * catalog (sorted by publishedAt), newest-first, sliced to `limit`.
 *
 * The two candidate pools are normally disjoint by photo-storage location —
 * Fotosíntesis photos go to `fotoUrl`, never into the `products/` Drive
 * folder this scans — not because item numbers can't collide. An item
 * matched in `treasure` that already has `publishedAt` set is skipped from
 * the Drive side so an out-of-band manual Drive upload for an
 * already-published item can't render it twice. Lote/sublote bundle cards
 * (`isLote`) are excluded: they have no single natural "newest" moment.
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
    .filter((t) => t.publishedAt != null && !t.isLote)
    .map((item) => ({ item, sortDate: item.publishedAt as number }));

  return [...legacyDated, ...fotosintesisDated]
    .sort((a, b) => b.sortDate - a.sortDate)
    .slice(0, limit)
    .map((d) => d.item);
}
