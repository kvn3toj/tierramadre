/**
 * useTRM - The official COP/USD TRM (Tasa Representativa del Mercado)
 *
 * Sources, in order of preference:
 *   1. /api/trm — our own endpoint, CDN-cached and shared by every visitor
 *   2. Superfinanciera TRM on datos.gov.co  -> 'official'   (direct, if 1 is down)
 *   3. exchangerate-api market mid-rate     -> 'market'     (close to TRM, not it)
 *   4. A cached value that has gone stale   -> 'stale'
 *   5. LAST_RESORT_RATE                     -> 'fallback'
 *
 * Steps 2-3 duplicate what the endpoint does, on purpose: a function outage
 * should degrade to the old browser-side path, not break pricing.
 *
 * A real rate that is a few days old beats a hardcoded constant, so an expired
 * cache is always preferred over LAST_RESORT_RATE. Consumers get `source` back
 * and are expected to mark anything that is not 'official'/'market' as not live
 * — a substituted number must never render as if it had been measured.
 *
 * One module-level store is shared by every caller: four components calling
 * useTRM() produce one fetch and one value, not four.
 */

import { useSyncExternalStore, useEffect } from 'react';
import { STORAGE_KEYS } from '../constants/storage-keys';

/** Our own resolver: one shared origin fetch per region, see api/trm.ts. */
const PROXY_URL = '/api/trm';

/** Superfinanciera TRM, daily. `valor` is a string, validity is a date range. */
const OFFICIAL_URL = 'https://www.datos.gov.co/resource/32sa-8pi3.json';
/** Market mid-rate. Not the TRM, but close enough to price with when the official feed is down. */
const MARKET_URL = 'https://api.exchangerate-api.com/v4/latest/USD';

/**
 * Only used on a cold browser with no cache and no network. Dated on purpose:
 * a constant like this rots, and the UI must say so rather than imply it is today's rate.
 */
const LAST_RESORT_RATE = 3213.97; // TRM of 2026-09-01

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;      // 6 h ceiling on any cached rate
const REFRESH_CHECK_MS = 15 * 60 * 1000;      // how often a mounted app re-checks
const FETCH_TIMEOUT_MS = 8000;

export type TRMSource = 'official' | 'market' | 'stale' | 'fallback';

interface TRMCache {
  rate: number;
  timestamp: number;
  source?: TRMSource;
  /** Date the rate is valid through (YYYY-MM-DD), when the source tells us. */
  validThrough?: string | null;
}

interface TRMState {
  trmRate: number;
  source: TRMSource;
  validThrough: string | null;
  isLoading: boolean;
}

/** Today's date in Bogota — the TRM is a Colombian calendar concept, not the viewer's. */
function bogotaToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function readCache(): TRMCache | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TRM_CACHE);
    if (!raw) return null;
    const parsed: TRMCache = JSON.parse(raw);
    if (typeof parsed?.rate !== 'number' || !parsed?.timestamp) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(entry: TRMCache): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TRM_CACHE, JSON.stringify(entry));
  } catch {
    // Storage full - the in-memory value still stands
  }
}

/** Fresh = within the TTL *and* still inside the validity window the source gave us. */
function isFresh(cache: TRMCache): boolean {
  if (Date.now() - cache.timestamp >= CACHE_TTL_MS) return false;
  if (cache.validThrough && bogotaToday() > cache.validThrough) return false;
  return true;
}

async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/** Preferred path: our endpoint already picked a source and the CDN holds it. */
async function fetchProxied(): Promise<TRMCache | null> {
  const data = (await fetchJson(PROXY_URL)) as {
    rate?: number;
    source?: 'official' | 'market';
    validThrough?: string | null;
  };
  const rate = Number(data?.rate);
  if (!Number.isFinite(rate) || rate <= 0) return null;
  return {
    rate,
    timestamp: Date.now(),
    source: data.source === 'market' ? 'market' : 'official',
    validThrough: data.validThrough ?? null,
  };
}

/** The TRM row whose validity window covers today in Bogota. */
async function fetchOfficial(): Promise<TRMCache | null> {
  const today = `${bogotaToday()}T00:00:00.000`;
  const where = `vigenciadesde <= '${today}' AND vigenciahasta >= '${today}'`;
  const url = `${OFFICIAL_URL}?$where=${encodeURIComponent(where)}&$limit=1`;

  const rows = await fetchJson(url);
  if (!Array.isArray(rows) || rows.length === 0) return null;

  const row = rows[0] as { valor?: string; vigenciahasta?: string };
  const rate = Number(row?.valor);
  if (!Number.isFinite(rate) || rate <= 0) return null;

  return {
    rate,
    timestamp: Date.now(),
    source: 'official',
    validThrough: row.vigenciahasta ? row.vigenciahasta.slice(0, 10) : null,
  };
}

async function fetchMarket(): Promise<TRMCache | null> {
  const data = (await fetchJson(MARKET_URL)) as { rates?: Record<string, number> };
  const rate = data?.rates?.COP;
  if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) return null;
  return { rate, timestamp: Date.now(), source: 'market', validThrough: null };
}

// ─── Shared store ────────────────────────────────────────────────────────────

function initialState(): TRMState {
  const cached = readCache();
  if (cached) {
    const fresh = isFresh(cached);
    return {
      trmRate: cached.rate,
      // An expired cache is still a real measurement - flag it, don't discard it.
      source: fresh ? cached.source ?? 'market' : 'stale',
      validThrough: cached.validThrough ?? null,
      isLoading: !fresh,
    };
  }
  return { trmRate: LAST_RESORT_RATE, source: 'fallback', validThrough: null, isLoading: true };
}

let state: TRMState = initialState();
const listeners = new Set<() => void>();
let inflight: Promise<void> | null = null;

function emit(next: Partial<TRMState>): void {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): TRMState {
  return state;
}

/**
 * Refetch unless a fresh cache already covers us.
 * `force: true` skips the cache check (manual refresh).
 */
export function refreshTRM(force = false): Promise<void> {
  if (inflight) return inflight;

  if (!force) {
    const cached = readCache();
    if (cached && isFresh(cached)) {
      emit({
        trmRate: cached.rate,
        source: cached.source ?? 'market',
        validThrough: cached.validThrough ?? null,
        isLoading: false,
      });
      return Promise.resolve();
    }
  }

  inflight = (async () => {
    emit({ isLoading: true });
    for (const attempt of [fetchProxied, fetchOfficial, fetchMarket]) {
      try {
        const entry = await attempt();
        if (entry) {
          writeCache(entry);
          emit({
            trmRate: entry.rate,
            source: entry.source ?? 'market',
            validThrough: entry.validThrough ?? null,
            isLoading: false,
          });
          return;
        }
      } catch {
        // Try the next source
      }
    }
    // Both sources failed: keep whatever we have, but stop claiming it is live.
    emit({ source: state.source === 'fallback' ? 'fallback' : 'stale', isLoading: false });
  })().finally(() => {
    inflight = null;
  });

  return inflight;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export interface UseTRMResult {
  trmRate: number;
  isLoading: boolean;
  /** Where the number came from. Anything but 'official'/'market' must be marked in the UI. */
  source: TRMSource;
  /** True when the number is not a live reading (expired cache or hardcoded constant). */
  isStale: boolean;
  /** True when no real rate was ever obtained - the number is a constant, not a measurement. */
  isFallback: boolean;
  /** Date the official rate is valid through (YYYY-MM-DD), when known. */
  validThrough: string | null;
  refresh: () => Promise<void>;
}

export function useTRM(): UseTRMResult {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    refreshTRM();

    // The old implementation fetched once per page load and never again: a tab
    // left open overnight kept yesterday's rate. Re-check on a timer and
    // whenever the tab comes back to the foreground.
    const interval = setInterval(() => refreshTRM(), REFRESH_CHECK_MS);
    const onWake = () => {
      if (document.visibilityState === 'visible') refreshTRM();
    };
    document.addEventListener('visibilitychange', onWake);
    window.addEventListener('focus', onWake);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onWake);
      window.removeEventListener('focus', onWake);
    };
  }, []);

  return {
    trmRate: snapshot.trmRate,
    isLoading: snapshot.isLoading,
    source: snapshot.source,
    isStale: snapshot.source === 'stale' || snapshot.source === 'fallback',
    isFallback: snapshot.source === 'fallback',
    validThrough: snapshot.validThrough,
    refresh: () => refreshTRM(true),
  };
}

export default useTRM;
