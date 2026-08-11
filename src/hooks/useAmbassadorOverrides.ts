/**
 * useAmbassadorOverrides
 *
 * Thin adapter over `useAmbassadorCuration`, which is where overrides now
 * actually live: `/api/ambassador-curation` is the source of truth, with
 * localStorage demoted to a mirror cache (anti-blink init, cross-tab sync,
 * and a durable queue for edits made offline).
 *
 * Until 2026-08-11 this hook owned `tm:ambassador-overrides:{slug}` and
 * nothing else, so a price an ambassador set was visible on exactly one
 * device — never on their phone, never to their client. The public API is
 * unchanged so no caller had to move.
 *
 * `setOverride` still validates and returns SYNCHRONOUSLY: the dialog needs an
 * answer as the user types, and the network write is fire-and-forget behind
 * the queue. The server re-validates against the canonical price, which is the
 * check that actually counts — this one is a courtesy to the user.
 */

import { useCallback } from 'react';
import { AmbassadorProductOverride } from '../types/ambassadorOverride';
import { validateOverrideValues } from '../utils/ambassadorOverrideValidation';
import type { TreasureItem } from '../types';
import { useAmbassadorCuration } from './useAmbassadorCuration';

type OverridesMap = Record<string, AmbassadorProductOverride>;

export interface ValidateOverrideInput {
  baseProduct: TreasureItem;
  customName?: string;
  customPriceCOP?: number;
}

export interface ValidationResult {
  ok: boolean;
  errors: { field: 'customName' | 'customPriceCOP'; message: string }[];
}

/**
 * Pure validator — exposed for unit tests and the dialog UI.
 *
 * The rules now live in `utils/ambassadorOverrideValidation.ts` so the server
 * enforces the SAME ones (api/ambassador-curation.ts). This wrapper only
 * unpacks the product; keeping it means the dialog and its existing tests did
 * not have to change.
 */
export function validateOverride({
  baseProduct,
  customName,
  customPriceCOP,
}: ValidateOverrideInput): ValidationResult {
  return validateOverrideValues({
    basePriceCOP: baseProduct.precioCOP,
    customName,
    customPriceCOP,
  });
}

export interface UseAmbassadorOverridesReturn {
  /** Map keyed by itemId (string). */
  overrides: OverridesMap;
  /** Get the override for a single item, if any. */
  getOverride: (
    itemId: string | number,
  ) => AmbassadorProductOverride | undefined;
  /**
   * Save an override. Pass `undefined` for fields you want to clear.
   * Returns the resulting override on success, or null if validation fails.
   */
  setOverride: (
    itemId: string | number,
    patch: { customName?: string; customPriceCOP?: number },
    baseProduct: TreasureItem,
  ) =>
    | { ok: true; override: AmbassadorProductOverride }
    | { ok: false; errors: ValidationResult['errors'] };
  /** Remove the override entirely (restore canonical values). */
  clearOverride: (itemId: string | number) => void;
  /**
   * Resale lives here rather than in a hook of its own because it is the same
   * act from the ambassador's point of view — a statement about one of their
   * own pieces — stored in the same row and authorised the same way. The
   * editor that sets a custom price is where they also decide to offer it.
   */
  isForResale: (itemId: string | number) => boolean;
  setForResale: (itemId: string | number, forResale: boolean) => void;
}

export function useAmbassadorOverrides(
  slug: string | undefined,
  canWrite = false,
): UseAmbassadorOverridesReturn {
  const {
    overrides,
    resale,
    setOverrideValues,
    clearOverride,
    setForResale: setForResaleRaw,
  } = useAmbassadorCuration(slug, canWrite);

  const getOverride = useCallback(
    (itemId: string | number) => overrides[String(itemId)],
    [overrides],
  );

  const setOverride: UseAmbassadorOverridesReturn['setOverride'] = useCallback(
    (itemId, patch, baseProduct) => {
      if (!slug) {
        return {
          ok: false,
          errors: [{ field: 'customName', message: 'No ambassador slug' }],
        };
      }

      // Normalise: empty string → undefined (treat as "no override on that field").
      const customName =
        patch.customName !== undefined && patch.customName.trim().length === 0
          ? undefined
          : patch.customName?.trim();
      const customPriceCOP =
        patch.customPriceCOP !== undefined &&
        Number.isFinite(patch.customPriceCOP)
          ? patch.customPriceCOP
          : undefined;

      const validation = validateOverrideValues({
        basePriceCOP: baseProduct.precioCOP,
        customName,
        customPriceCOP,
      });
      if (!validation.ok) return { ok: false, errors: validation.errors };

      const id = String(itemId);
      setOverrideValues(id, { customName, customPriceCOP });

      return {
        ok: true,
        override: {
          asesorSlug: slug,
          itemId: id,
          customName,
          customPriceCOP,
          updatedAt: new Date().toISOString(),
        },
      };
    },
    [slug, setOverrideValues],
  );

  const clear = useCallback(
    (itemId: string | number) => clearOverride(String(itemId)),
    [clearOverride],
  );

  const isForResale = useCallback(
    (itemId: string | number) => resale.includes(String(itemId)),
    [resale],
  );

  const setForResale = useCallback(
    (itemId: string | number, value: boolean) =>
      setForResaleRaw(String(itemId), value),
    [setForResaleRaw],
  );

  return {
    overrides,
    getOverride,
    setOverride,
    clearOverride: clear,
    isForResale,
    setForResale,
  };
}

export default useAmbassadorOverrides;
