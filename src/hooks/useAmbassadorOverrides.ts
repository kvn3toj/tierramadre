/**
 * useAmbassadorOverrides
 *
 * MVP: Local-first per-ambassador overrides for product name + price.
 * Persisted in localStorage under key `tm:ambassador-overrides:{slug}`
 * as a `Record<itemId, AmbassadorProductOverride>` blob.
 *
 * Anti-blink: state is initialised SYNCHRONOUSLY from localStorage in the
 * useState initializer (see CLAUDE.md "Anti-Blinking Best Practices").
 *
 * TODO (v2):
 * - Move persistence to `api/ambassador-product-override` (server-side
 *   validation + Convex/Sheets store) once the Convex migration lands.
 * - Add cross-tab sync via `storage` event.
 */

import { useCallback, useState } from 'react';
import { STORAGE_KEYS } from '../constants/storage-keys';
import {
  AmbassadorProductOverride,
  OVERRIDE_LIMITS,
} from '../types/ambassadorOverride';
import type { TreasureItem } from '../types';
import { createLogger } from '../utils/logger';

const log = createLogger('useAmbassadorOverrides');

type OverridesMap = Record<string, AmbassadorProductOverride>;

function storageKey(slug: string): string {
  return `${STORAGE_KEYS.AMBASSADOR_OVERRIDES_PREFIX}${slug}`;
}

function readFromStorage(slug: string): OverridesMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(storageKey(slug));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch (err) {
    log.debug('Failed to read overrides from storage', err);
    return {};
  }
}

function writeToStorage(slug: string, value: OverridesMap): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(slug), JSON.stringify(value));
  } catch (err) {
    log.debug('Failed to write overrides to storage', err);
  }
}

export interface ValidateOverrideInput {
  baseProduct: TreasureItem;
  customName?: string;
  customPriceCOP?: number;
}

export interface ValidationResult {
  ok: boolean;
  errors: { field: 'customName' | 'customPriceCOP'; message: string }[];
}

/** Pure validator — exposed for unit tests and the dialog UI. */
export function validateOverride({
  baseProduct,
  customName,
  customPriceCOP,
}: ValidateOverrideInput): ValidationResult {
  const errors: ValidationResult['errors'] = [];

  if (customName !== undefined && customName !== null) {
    const trimmed = customName.trim();
    if (trimmed.length === 0) {
      // Empty string treated as "clear override" upstream — not an error here.
    } else if (trimmed.length > OVERRIDE_LIMITS.NAME_MAX_LENGTH) {
      errors.push({
        field: 'customName',
        message: `El nombre no puede superar ${OVERRIDE_LIMITS.NAME_MAX_LENGTH} caracteres`,
      });
    }
  }

  if (customPriceCOP !== undefined && customPriceCOP !== null) {
    const base = baseProduct.precioCOP;
    if (typeof base !== 'number' || base <= 0) {
      errors.push({
        field: 'customPriceCOP',
        message: 'Este producto no tiene precio base; no se puede sobreescribir',
      });
    } else {
      const min = base * OVERRIDE_LIMITS.PRICE_MIN_MULTIPLIER;
      const max = base * OVERRIDE_LIMITS.PRICE_MAX_MULTIPLIER;
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

export interface UseAmbassadorOverridesReturn {
  /** Map keyed by itemId (string). */
  overrides: OverridesMap;
  /** Get the override for a single item, if any. */
  getOverride: (itemId: string | number) => AmbassadorProductOverride | undefined;
  /**
   * Save an override. Pass `undefined` for fields you want to clear.
   * Returns the resulting override on success, or null if validation fails.
   */
  setOverride: (
    itemId: string | number,
    patch: { customName?: string; customPriceCOP?: number },
    baseProduct: TreasureItem,
  ) => { ok: true; override: AmbassadorProductOverride } | { ok: false; errors: ValidationResult['errors'] };
  /** Remove the override entirely (restore canonical values). */
  clearOverride: (itemId: string | number) => void;
}

export function useAmbassadorOverrides(slug: string | undefined): UseAmbassadorOverridesReturn {
  // Synchronous init to avoid post-mount blink (CLAUDE.md anti-blink rule).
  const [overrides, setOverrides] = useState<OverridesMap>(() =>
    slug ? readFromStorage(slug) : {},
  );

  const getOverride = useCallback(
    (itemId: string | number) => overrides[String(itemId)],
    [overrides],
  );

  const setOverride: UseAmbassadorOverridesReturn['setOverride'] = useCallback(
    (itemId, patch, baseProduct) => {
      if (!slug) {
        return { ok: false, errors: [{ field: 'customName', message: 'No ambassador slug' }] };
      }

      // Normalise: empty string → undefined (treat as "no override on that field").
      const customName =
        patch.customName !== undefined && patch.customName.trim().length === 0
          ? undefined
          : patch.customName?.trim();
      const customPriceCOP =
        patch.customPriceCOP !== undefined && Number.isFinite(patch.customPriceCOP)
          ? patch.customPriceCOP
          : undefined;

      const validation = validateOverride({
        baseProduct,
        customName,
        customPriceCOP,
      });
      if (!validation.ok) return { ok: false, errors: validation.errors };

      const id = String(itemId);
      const next: OverridesMap = { ...overrides };

      // If both fields are empty, treat as clear.
      if (customName === undefined && customPriceCOP === undefined) {
        delete next[id];
      } else {
        next[id] = {
          asesorSlug: slug,
          itemId: id,
          customName,
          customPriceCOP,
          updatedAt: new Date().toISOString(),
        };
      }

      setOverrides(next);
      writeToStorage(slug, next);

      return { ok: true, override: next[id] ?? {
        asesorSlug: slug,
        itemId: id,
        updatedAt: new Date().toISOString(),
      } };
    },
    [overrides, slug],
  );

  const clearOverride = useCallback(
    (itemId: string | number) => {
      if (!slug) return;
      const id = String(itemId);
      if (!(id in overrides)) return;
      const next = { ...overrides };
      delete next[id];
      setOverrides(next);
      writeToStorage(slug, next);
    },
    [overrides, slug],
  );

  return { overrides, getOverride, setOverride, clearOverride };
}

export default useAmbassadorOverrides;
