/**
 * Override validation, shared by the browser and the server.
 *
 * Extracted from `useAmbassadorOverrides.ts` (2026-08-11). It lived inside a
 * React hook module, so the API could not import it without dragging React
 * into a serverless function; the alternative was a second copy of the rules
 * on the server, which is how two validators drift until one of them lets
 * something through.
 *
 * It takes `basePriceCOP: number` rather than a whole `TreasureItem` on
 * purpose — that keeps this module a leaf with no type-graph dependency, so
 * the Vercel runtime can load it. (Vercel functions are not bundled; they run
 * as real ESM off disk, which is why every local import here carries a `.js`
 * extension.)
 *
 * The 1.0×–10.0× band is a business decision, not a technical one: the lower
 * bound stops an ambassador undercutting the house price, the upper bound
 * catches a typed zero. Do not widen it without the business saying so.
 */
import { OVERRIDE_LIMITS } from '../types/ambassadorOverride.js';

export interface ValidateOverrideInput {
  /** Canonical price of the product. Pass `undefined` when it has none. */
  basePriceCOP: number | undefined;
  customName?: string;
  customPriceCOP?: number;
}

export interface ValidationResult {
  ok: boolean;
  errors: { field: 'customName' | 'customPriceCOP'; message: string }[];
}

/** Pure. Same answer on the client and on the server, by construction. */
export function validateOverrideValues({
  basePriceCOP,
  customName,
  customPriceCOP,
}: ValidateOverrideInput): ValidationResult {
  const errors: ValidationResult['errors'] = [];

  if (customName !== undefined && customName !== null) {
    const trimmed = customName.trim();
    if (trimmed.length === 0) {
      // Empty string means "clear this field" upstream — not an error here.
    } else if (trimmed.length > OVERRIDE_LIMITS.NAME_MAX_LENGTH) {
      errors.push({
        field: 'customName',
        message: `El nombre no puede superar ${OVERRIDE_LIMITS.NAME_MAX_LENGTH} caracteres`,
      });
    }
  }

  if (customPriceCOP !== undefined && customPriceCOP !== null) {
    if (typeof basePriceCOP !== 'number' || basePriceCOP <= 0) {
      errors.push({
        field: 'customPriceCOP',
        message:
          'Este producto no tiene precio base; no se puede sobreescribir',
      });
    } else if (!Number.isFinite(customPriceCOP)) {
      errors.push({
        field: 'customPriceCOP',
        message: 'El precio no es un número válido',
      });
    } else {
      const min = basePriceCOP * OVERRIDE_LIMITS.PRICE_MIN_MULTIPLIER;
      const max = basePriceCOP * OVERRIDE_LIMITS.PRICE_MAX_MULTIPLIER;
      if (customPriceCOP < min) {
        errors.push({
          field: 'customPriceCOP',
          message: `El precio no puede ser menor al base (${Math.round(min).toLocaleString('es-CO')} COP)`,
        });
      } else if (customPriceCOP > max) {
        errors.push({
          field: 'customPriceCOP',
          message: `El precio no puede ser mayor a 10x el base (${Math.round(max).toLocaleString('es-CO')} COP)`,
        });
      }
    }
  }

  return { ok: errors.length === 0, errors };
}
