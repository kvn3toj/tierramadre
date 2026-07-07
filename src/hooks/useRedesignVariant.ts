/**
 * Quiet Emerald — redesign A/B variant store.
 *
 * The v2 handoff mockups are deliberately minimal; the live app carries features
 * the mockups omit (catalog quality/gallery/compare chips, the detail cart
 * action, the shared MediaGallery). Rather than pick one philosophy up front,
 * the redesign ships BOTH behind this runtime switch so they can be compared
 * live with real data:
 *
 *   - "faithful" (default) → apply the Quiet Emerald skin but KEEP existing
 *                            functionality; restyle chrome instead of removing it.
 *   - "literal"            → match the mockups exactly; strip anything the mockup
 *                            doesn't show; follow the spec's quote semantics.
 *
 * Provider-free (module store + useSyncExternalStore) so any component can read
 * it without wiring a context into App.tsx. Override via `?redesign=literal`
 * (or `?variant=literal`) in the URL; the choice is persisted to localStorage.
 */

import { useCallback, useSyncExternalStore } from 'react';

export type RedesignVariant = 'faithful' | 'literal';

const STORAGE_KEY = 'tm.redesignVariant';
const VALID: readonly RedesignVariant[] = ['faithful', 'literal'] as const;
const DEFAULT: RedesignVariant = 'faithful';

const isValid = (v: unknown): v is RedesignVariant =>
  typeof v === 'string' && (VALID as readonly string[]).includes(v);

function readInitial(): RedesignVariant {
  if (typeof window === 'undefined') return DEFAULT;
  // Prod ships only the "faithful" variant — the toggle UI is already
  // DEV-only (RedesignVariantToggle.tsx), but before this fix the store
  // itself still read ?redesign=literal / a stale localStorage value in
  // production, so a shared link or a pre-fix visitor's prior toggle tap
  // could silently strand them on the feature-stripped "literal" mockup
  // variant. Ignore both overrides outside DEV, and clear the stale key so
  // already-stranded visitors recover on their next load.
  if (!import.meta.env.DEV) {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    return DEFAULT;
  }
  try {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('redesign') ?? params.get('variant');
    if (isValid(q)) {
      window.localStorage.setItem(STORAGE_KEY, q);
      return q;
    }
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (isValid(saved)) return saved;
  } catch {
    /* localStorage / URL unavailable — fall through to default */
  }
  return DEFAULT;
}

let current: RedesignVariant = readInitial();
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

export function setRedesignVariant(next: RedesignVariant): void {
  // Defense in depth: the toggle UI is DEV-only, so this should only ever be
  // called with "literal" in DEV — but refuse outside DEV too, in case
  // something else ever calls it directly.
  if (!import.meta.env.DEV && next !== DEFAULT) return;
  if (!isValid(next) || next === current) return;
  current = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* ignore persistence failures */
  }
  emit();
}

export function getRedesignVariant(): RedesignVariant {
  return current;
}

const subscribe = (cb: () => void): (() => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};

const getSnapshot = () => current;
const getServerSnapshot = () => DEFAULT;

export interface UseRedesignVariant {
  variant: RedesignVariant;
  setVariant: (v: RedesignVariant) => void;
  toggle: () => void;
  isLiteral: boolean;
  isFaithful: boolean;
}

export function useRedesignVariant(): UseRedesignVariant {
  const variant = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const setVariant = useCallback(
    (v: RedesignVariant) => setRedesignVariant(v),
    [],
  );
  const toggle = useCallback(
    () => setRedesignVariant(current === 'faithful' ? 'literal' : 'faithful'),
    [],
  );
  return {
    variant,
    setVariant,
    toggle,
    isLiteral: variant === 'literal',
    isFaithful: variant === 'faithful',
  };
}
