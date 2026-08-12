/**
 * useAmbassadorCuration — one source of truth for an ambassador's favourites
 * and per-product overrides.
 *
 * Both used to live in localStorage under separate keys, which meant the
 * curation an ambassador built existed only in the browser that built it.
 * The server (`/api/ambassador-curation`) is now the source of truth and
 * localStorage is demoted to a MIRROR CACHE.
 *
 * Three properties this has to keep, in tension with each other:
 *
 *  - **No blink.** State initialises SYNCHRONOUSLY from the cache in the
 *    useState initialiser (CLAUDE.md anti-blink rule), so a reload paints the
 *    ambassador's real arrangement immediately instead of flashing the
 *    default order once the fetch lands.
 *  - **No lost edits.** A write goes to local state first, then to the
 *    server. If the request fails — offline, 503, tab closed mid-flight — the
 *    operation is appended to a durable queue and replayed on the next mount
 *    or `online` event. The old localStorage version never lost an edit
 *    because it never left the device; the replacement must not regress that.
 *  - **No stale tabs.** A `storage` event means another tab of the same
 *    ambassador changed something, so adopt it rather than overwrite it.
 *
 * Reads are public; writes are owner-only and enforced on the server. This
 * hook does not decide who may write — it just stops asking when the server
 * says no.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { AmbassadorProductOverride } from '../types/ambassadorOverride';
import { readFreshSessionToken } from '../utils/sessionToken';
import { createLogger } from '../utils/logger';

const log = createLogger('useAmbassadorCuration');

const CACHE_PREFIX = 'tm:ambassador-curation:';
/** Same-tab sibling notification; `storage` only reaches OTHER tabs. */
const SAME_TAB_EVENT = 'tm:ambassador-curation-changed';
const QUEUE_PREFIX = 'tm:ambassador-curation-queue:';
/** Pre-server keys, read once so nobody's existing curation disappears. */
const LEGACY_FAVORITES_PREFIX = 'tm-ambassador-favorites-';
const LEGACY_OVERRIDES_PREFIX = 'tm:ambassador-overrides:';

export interface CurationState {
  favorites: string[];
  /** Item ids the ambassador has offered for resale through TM. */
  resale: string[];
  overrides: Record<string, AmbassadorProductOverride>;
}

const EMPTY: CurationState = { favorites: [], resale: [], overrides: {} };

/** One durable write, replayable verbatim. */
type QueuedOp =
  | { kind: 'favorites'; favorites: string[] }
  | {
      kind: 'override';
      itemId: string;
      customName?: string | null;
      customPriceCOP?: number | null;
    }
  | { kind: 'resale'; itemId: string; forResale: boolean }
  | { kind: 'remove'; itemId: string };

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    log.debug('Failed to write cache', err);
  }
}

/**
 * Seeds from the pre-server keys the first time, so an ambassador who already
 * arranged a showcase does not open the page to an empty one. Read-only here;
 * the queue is what actually pushes it up.
 */
function readLegacy(slug: string): CurationState {
  const favorites = readJson<string[]>(`${LEGACY_FAVORITES_PREFIX}${slug}`, []);
  const overrides = readJson<Record<string, AmbassadorProductOverride>>(
    `${LEGACY_OVERRIDES_PREFIX}${slug}`,
    {},
  );
  return { favorites, resale: [], overrides };
}

function readCache(slug: string): CurationState {
  const cached = readJson<CurationState | null>(`${CACHE_PREFIX}${slug}`, null);
  // `resale` post-dates the first cached shape, so an older blob is missing
  // it. Defaulted rather than discarded — throwing the cache away would
  // reintroduce the blink this whole hook exists to avoid.
  if (cached && Array.isArray(cached.favorites)) {
    return { ...cached, resale: cached.resale ?? [] };
  }
  return readLegacy(slug);
}

export interface UseAmbassadorCurationReturn extends CurationState {
  setFavorites: (itemIds: string[]) => void;
  setOverrideValues: (
    itemId: string,
    patch: { customName?: string; customPriceCOP?: number },
  ) => void;
  clearOverride: (itemId: string) => void;
  /** Offer this piece for resale through TM, or withdraw the offer. */
  setForResale: (itemId: string, forResale: boolean) => void;
  /** True while at least one queued write has not been accepted yet. */
  isPending: boolean;
}

export function useAmbassadorCuration(
  slug: string | undefined,
  /** Owner-only writes. False disables the network side entirely. */
  canWrite = false,
): UseAmbassadorCurationReturn {
  const [state, setState] = useState<CurationState>(() =>
    slug ? readCache(slug) : EMPTY,
  );
  const [isPending, setIsPending] = useState(false);
  const flushing = useRef(false);
  // Se encoló algo MIENTRAS había un envío en curso. `flushing` impide dos
  // envíos simultáneos, pero sin esta bandera la operación nueva se quedaba
  // esperando a un montaje o a un evento `online` que podían no llegar: el
  // embajador editaba dos cosas seguidas y la segunda no salía nunca.
  const flushAgain = useRef(false);
  // Cuenta de escrituras locales. El GET inicial sale ANTES de que el
  // embajador toque nada; si toca algo mientras viaja, la respuesta que
  // vuelve es más vieja que su edición y adoptarla se la revierte en la cara.
  // La cola no alcanza para detectarlo: si el envío ya terminó, la cola está
  // vacía y la respuesta vieja parecía legítima.
  const writeCount = useRef(0);

  const cacheKey = slug ? `${CACHE_PREFIX}${slug}` : null;
  const queueKey = slug ? `${QUEUE_PREFIX}${slug}` : null;

  const persist = useCallback(
    (next: CurationState) => {
      writeCount.current += 1;
      setState(next);
      if (!cacheKey) return;
      writeJson(cacheKey, next);
      // `storage` does NOT fire in the tab that wrote it, and this page mounts
      // the hook more than once (the profile and ManageFavoritesView both read
      // curation). Without this, reordering favourites in the manage view
      // would leave the profile behind it showing the old order.
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent(SAME_TAB_EVENT, { detail: { key: cacheKey, next } }),
        );
      }
    },
    [cacheKey],
  );

  /** Replays every queued op in order. Ops that fail stay queued. */
  const flushQueue = useCallback(async () => {
    if (!slug || !queueKey || !canWrite) return;
    if (flushing.current) {
      flushAgain.current = true;
      return;
    }
    const queue = readJson<QueuedOp[]>(queueKey, []);
    if (queue.length === 0) {
      setIsPending(false);
      return;
    }
    const token = readFreshSessionToken();
    if (!token) return; // Not signed in yet — keep the queue for later.

    flushing.current = true;
    const remaining: QueuedOp[] = [];
    try {
      for (const [index, op] of queue.entries()) {
        const body =
          op.kind === 'favorites'
            ? { slug, favorites: op.favorites }
            : op.kind === 'remove'
              ? { slug, itemId: op.itemId }
              : op.kind === 'resale'
                ? { slug, itemId: op.itemId, forResale: op.forResale }
                : {
                  slug,
                  itemId: op.itemId,
                  customName: op.customName,
                  customPriceCOP: op.customPriceCOP,
                };
        try {
          const res = await fetch('/api/ambassador-curation', {
            method: op.kind === 'remove' ? 'DELETE' : 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
          });
          if (!res.ok) {
            // 4xx means replaying will never help — the server rejected the
            // content or the caller. Dropping it stops a poisoned op from
            // blocking every later edit behind it forever. 5xx is transient,
            // so that one waits.
            if (res.status >= 500) remaining.push(...queue.slice(index));
            else log.debug('Write rejected, dropping op', res.status, op);
            if (res.status >= 500) break;
          }
        } catch {
          remaining.push(...queue.slice(index));
          break;
        }
      }
    } finally {
      flushing.current = false;
      writeJson(queueKey, remaining);
      setIsPending(remaining.length > 0);
    }

    // Acotado por las encoladas, no por los reintentos: sólo se repite si
    // llegó algo nuevo durante el envío, así que un 5xx persistente no gira
    // en bucle.
    if (flushAgain.current) {
      flushAgain.current = false;
      await flushQueue();
    }
  }, [slug, queueKey, canWrite]);

  const enqueue = useCallback(
    (op: QueuedOp) => {
      if (!queueKey || !canWrite) return;
      const queue = readJson<QueuedOp[]>(queueKey, []);
      queue.push(op);
      writeJson(queueKey, queue);
      setIsPending(true);
      void flushQueue();
    },
    [queueKey, canWrite, flushQueue],
  );

  // Adopt the server's copy on mount / slug change. The cache already painted,
  // so this only corrects it — no blink either way.
  useEffect(() => {
    if (!slug) {
      setState(EMPTY);
      return;
    }
    let cancelled = false;
    setState(readCache(slug));

    (async () => {
      const writesBefore = writeCount.current;
      // Push anything stranded from a previous session BEFORE reading, so the
      // server copy we adopt already contains those edits.
      await flushQueue();
      try {
        const res = await fetch(
          `/api/ambassador-curation?slug=${encodeURIComponent(slug)}`,
          { headers: authHeader() },
        );
        if (!res.ok || cancelled) return;
        const body = await res.json();
        const payload = body?.data ?? body;
        if (!payload || !Array.isArray(payload.favorites)) return;

        const overrides: Record<string, AmbassadorProductOverride> = {};
        for (const [itemId, value] of Object.entries(
          (payload.overrides ?? {}) as Record<
            string,
            { customName?: string; customPriceCOP?: number }
          >,
        )) {
          overrides[itemId] = {
            asesorSlug: slug,
            itemId,
            customName: value.customName,
            customPriceCOP: value.customPriceCOP,
            updatedAt: new Date().toISOString(),
          };
        }
        const next: CurationState = {
          favorites: payload.favorites,
          resale: Array.isArray(payload.resale) ? payload.resale : [],
          overrides,
        };

        // Do not clobber local state while writes are still in flight — the
        // server has not seen them yet, so its copy is the older one.
        if (readJson<QueuedOp[]>(`${QUEUE_PREFIX}${slug}`, []).length > 0) {
          return;
        }
        // Hubo una edición local mientras esta respuesta viajaba: es más
        // vieja que lo que el embajador ve. Se descarta.
        if (writeCount.current !== writesBefore) return;
        if (!cancelled) persist(next);
      } catch (err) {
        if (!cancelled) log.debug('Failed to load curation', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug, flushQueue, persist]);

  // Another tab of the same ambassador edited something.
  useEffect(() => {
    if (!cacheKey || typeof window === 'undefined') return;
    const onStorage = (event: StorageEvent) => {
      if (event.key !== cacheKey || !event.newValue) return;
      try {
        const next = JSON.parse(event.newValue) as CurationState;
        if (Array.isArray(next.favorites)) setState(next);
      } catch {
        /* ignore a malformed write from another tab */
      }
    };
    const onSameTab = (event: Event) => {
      const detail = (event as CustomEvent).detail as
        | { key: string; next: CurationState }
        | undefined;
      if (!detail || detail.key !== cacheKey) return;
      setState(detail.next);
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener(SAME_TAB_EVENT, onSameTab);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(SAME_TAB_EVENT, onSameTab);
    };
  }, [cacheKey]);

  // Retry stranded writes as soon as the network is back.
  useEffect(() => {
    if (typeof window === 'undefined' || !canWrite) return;
    const onOnline = () => void flushQueue();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [flushQueue, canWrite]);

  const setFavorites = useCallback(
    (itemIds: string[]) => {
      persist({ ...state, favorites: itemIds });
      enqueue({ kind: 'favorites', favorites: itemIds });
    },
    [state, persist, enqueue],
  );

  const setOverrideValues = useCallback(
    (
      itemId: string,
      patch: { customName?: string; customPriceCOP?: number },
    ) => {
      const id = String(itemId);
      const next = { ...state.overrides };
      if (
        patch.customName === undefined &&
        patch.customPriceCOP === undefined
      ) {
        delete next[id];
      } else {
        next[id] = {
          asesorSlug: slug ?? '',
          itemId: id,
          customName: patch.customName,
          customPriceCOP: patch.customPriceCOP,
          updatedAt: new Date().toISOString(),
        };
      }
      persist({ ...state, overrides: next });
      enqueue({
        kind: 'override',
        itemId: id,
        // `null` clears server-side; `undefined` would mean "leave alone".
        customName: patch.customName ?? null,
        customPriceCOP: patch.customPriceCOP ?? null,
      });
    },
    [state, slug, persist, enqueue],
  );

  const clearOverride = useCallback(
    (itemId: string) => {
      const id = String(itemId);
      if (!(id in state.overrides)) return;
      const next = { ...state.overrides };
      delete next[id];
      persist({ ...state, overrides: next });
      // NOT a DELETE. `remove` drops the whole curation row, which also
      // carries `isFavorite` and `forResale` — so clearing a custom name
      // would silently unfavourite the piece and withdraw it from resale.
      // Nulls clear exactly the two override fields; Convex's upsert deletes
      // the row only once it says nothing at all.
      enqueue({
        kind: 'override',
        itemId: id,
        customName: null,
        customPriceCOP: null,
      });
    },
    [state, persist, enqueue],
  );

  const setForResale = useCallback(
    (itemId: string, forResale: boolean) => {
      const id = String(itemId);
      const already = state.resale.includes(id);
      if (already === forResale) return;
      persist({
        ...state,
        resale: forResale
          ? [...state.resale, id]
          : state.resale.filter((x) => x !== id),
      });
      enqueue({ kind: 'resale', itemId: id, forResale });
    },
    [state, persist, enqueue],
  );

  return {
    favorites: state.favorites,
    resale: state.resale,
    overrides: state.overrides,
    setForResale,
    setFavorites,
    setOverrideValues,
    clearOverride,
    isPending,
  };
}

function authHeader(): Record<string, string> {
  const token = readFreshSessionToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default useAmbassadorCuration;
