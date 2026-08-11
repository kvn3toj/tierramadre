import { TreasureItem, TreasureStatus } from '../types';
import { matchesAsesorName } from './asesorNameUtils';

const VALID_STATUSES: readonly string[] = [
  'DISPONIBLE',
  'VENDIDA',
  'ASESOR',
  'CONSIGNACION',
];

/** Validate that a string is a known TreasureStatus, return undefined otherwise */
function toTreasureStatus(
  value: string | undefined,
): TreasureStatus | undefined {
  if (!value) return undefined;
  return VALID_STATUSES.includes(value) ? (value as TreasureStatus) : undefined;
}

export interface AsesorProduct extends TreasureItem {
  effectiveEstado: TreasureStatus;
  /** True when the product was transferred away from the viewing ambassador */
  isTransferredAway: boolean;
}

/**
 * Returns the effective owner of a product.
 * Column T (asesorActual) overrides Column N (asesor) when present.
 */
export function getEffectiveOwner(item: TreasureItem): string {
  return item.asesorActual?.trim() || item.asesor;
}

/**
 * Returns the estado an ambassador should see for a given product.
 *
 * - If Column T is empty → original asesor owns it, use Column O
 * - If Column T matches the viewing ambassador → use Column U (or Column O fallback)
 *   (This also handles Column T = Column N, i.e. ownership re-confirmed)
 * - If Column T is someone else → product was transferred away, show as "VENDIDA"
 */
export function getEffectiveEstado(
  item: TreasureItem,
  asesorName: string,
): TreasureStatus {
  const currentOwner = item.asesorActual?.trim();

  // No transfer happened — original asesor still owns it
  if (!currentOwner) return item.estado;

  // Current owner is the viewing ambassador
  if (matchesAsesorName(currentOwner, asesorName)) {
    return toTreasureStatus(item.estadoAsesor as string) || item.estado;
  }

  // Product was transferred to someone else
  return 'VENDIDA';
}

/**
 * Returns all products relevant to an ambassador, enriched with
 * `effectiveEstado` and `isTransferredAway` flags.
 *
 * A product is relevant if the ambassador is either:
 * - The original asesor (Column N)
 * - The current owner (Column T)
 */
/** What `/api/ambassador-products` answers with. */
export interface ServerOwnership {
  itemIds: number[];
  availableItemIds: number[];
}

/**
 * Picks the best available ownership answer for the ambassador profile.
 *
 * Staff get `asesor` / `asesorActual` on their catalog rows, so
 * `getAsesorProducts` resolves everything locally and its objects are richer
 * (prices, transfer state). Everyone else gets those fields stripped by the
 * catalog projection, so the local pass returns [] and the server's item
 * numbers are the only ownership signal there is.
 *
 * Present answer wins — never "whichever source we asked first". A staff
 * viewer must not be downgraded to the public projection just because the
 * endpoint also replied.
 */
export function resolveAsesorProducts(
  localProducts: AsesorProduct[],
  treasure: TreasureItem[],
  server: ServerOwnership | null,
): AsesorProduct[] {
  if (localProducts.length > 0) return localProducts;
  if (!server || treasure.length === 0) return [];

  const available = new Set(server.availableItemIds);
  const byId = new Map(treasure.map((t) => [t.item, t]));

  return server.itemIds
    .map((id) => byId.get(id))
    .filter((item): item is TreasureItem => Boolean(item))
    .map((item) => ({
      ...item,
      effectiveEstado: available.has(item.item)
        ? ('DISPONIBLE' as TreasureStatus)
        : ('VENDIDA' as TreasureStatus),
      // Owner-facing concept. A piece that left this ambassador's hands reads
      // as sold to a visitor either way, and the endpoint deliberately does
      // not publish transfer history.
      isTransferredAway: false,
    }));
}

export function getAsesorProducts(
  treasure: TreasureItem[],
  asesorName: string,
): AsesorProduct[] {
  return treasure
    .filter((item) => {
      const isOriginalAsesor =
        item.asesor && matchesAsesorName(item.asesor, asesorName);
      const isCurrentOwner =
        item.asesorActual?.trim() &&
        matchesAsesorName(item.asesorActual.trim(), asesorName);
      return isOriginalAsesor || isCurrentOwner;
    })
    .map((item) => ({
      ...item,
      effectiveEstado: getEffectiveEstado(item, asesorName),
      isTransferredAway: Boolean(
        item.asesorActual?.trim() &&
        !matchesAsesorName(item.asesorActual.trim(), asesorName),
      ),
    }));
}
