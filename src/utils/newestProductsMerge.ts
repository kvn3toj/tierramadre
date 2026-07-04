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
 * Item numbers can't collide between the two sources — legacy and
 * Fotosíntesis items share one sequential item-number counter — so no
 * dedup step is needed. Lote/sublote bundle cards (`isLote`) are excluded:
 * they have no single natural "newest" moment.
 */
export function mergeNewestCandidates(
  driveCandidates: DriveNewestCandidate[],
  treasure: TreasureItem[],
  limit: number,
): TreasureItem[] {
  const legacyDated: DatedItem[] = driveCandidates.map((product) => {
    const treasureItem = treasure.find((t) => t.item === product.itemNumber);
    const item: TreasureItem = treasureItem
      ? {
          ...treasureItem,
          imagen: product.proxyUrl,
          nombre: treasureItem.nombre || product.productName,
        }
      : legacyStub(product);
    return { item, sortDate: new Date(product.imageCreatedTime).getTime() };
  });

  const fotosintesisDated: DatedItem[] = treasure
    .filter((t) => t.publishedAt != null && !t.isLote)
    .map((item) => ({ item, sortDate: item.publishedAt as number }));

  return [...legacyDated, ...fotosintesisDated]
    .sort((a, b) => b.sortDate - a.sortDate)
    .slice(0, limit)
    .map((d) => d.item);
}
