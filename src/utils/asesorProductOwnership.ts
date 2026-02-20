import { TreasureItem, TreasureStatus } from '../types';
import { matchesAsesorName } from './asesorNameUtils';

const VALID_STATUSES: readonly string[] = ['DISPONIBLE', 'VENDIDA', 'ASESOR'];

/** Validate that a string is a known TreasureStatus, return undefined otherwise */
function toTreasureStatus(value: string | undefined): TreasureStatus | undefined {
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
export function getEffectiveEstado(item: TreasureItem, asesorName: string): TreasureStatus {
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
export function getAsesorProducts(treasure: TreasureItem[], asesorName: string): AsesorProduct[] {
  return treasure
    .filter(item => {
      const isOriginalAsesor = item.asesor && matchesAsesorName(item.asesor, asesorName);
      const isCurrentOwner = item.asesorActual?.trim() &&
        matchesAsesorName(item.asesorActual.trim(), asesorName);
      return isOriginalAsesor || isCurrentOwner;
    })
    .map(item => ({
      ...item,
      effectiveEstado: getEffectiveEstado(item, asesorName),
      isTransferredAway: Boolean(
        item.asesorActual?.trim() && !matchesAsesorName(item.asesorActual.trim(), asesorName)
      ),
    }));
}
