/**
 * TRM Resolver
 *
 * Serves the official COP/USD TRM (Tasa Representativa del Mercado) published
 * by the Superfinanciera on datos.gov.co, with the exchangerate-api market
 * mid-rate as a second source.
 *
 * Why an endpoint and not a browser fetch (which is what this replaces):
 *
 *  1. One origin fetch per region per `s-maxage`, instead of one per visitor.
 *     The catalog is priced off this number, so it is read on nearly every
 *     page view; N visitors must not mean N calls to a government API.
 *  2. `stale-while-revalidate` makes the CDN keep serving the last good rate
 *     for a day while it retries in the background. When datos.gov.co is down,
 *     a first-time visitor still gets a real rate instead of the client's
 *     hardcoded constant.
 *  3. It removes a CORS dependency. The browser path worked only because
 *     datos.gov.co sends `Access-Control-Allow-Origin: *` — their header to
 *     revoke, and every browser would break at once. Server-side is immune.
 *
 * The client (`src/hooks/useTRM.ts`) still falls back to calling the sources
 * directly if this endpoint is unreachable, so a function outage degrades
 * rather than breaks.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withApiHandler } from './_lib/index.js';

const OFFICIAL_URL = 'https://www.datos.gov.co/resource/32sa-8pi3.json';
const MARKET_URL = 'https://api.exchangerate-api.com/v4/latest/USD';

const FETCH_TIMEOUT_MS = 8000;

/** 6 h fresh at the edge, then a day of stale-while-revalidate. */
const CACHE_CONTROL = 'public, max-age=0, s-maxage=21600, stale-while-revalidate=86400';

interface TRMPayload {
  rate: number;
  source: 'official' | 'market';
  /** Date the rate is valid through (YYYY-MM-DD), when the source says. */
  validThrough: string | null;
  fetchedAt: string;
}

/** Today in Bogota — the TRM is a Colombian calendar concept. */
function bogotaToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
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

/** The TRM row whose validity window covers today. */
async function fetchOfficial(): Promise<TRMPayload | null> {
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
    source: 'official',
    validThrough: row.vigenciahasta ? row.vigenciahasta.slice(0, 10) : null,
    fetchedAt: new Date().toISOString(),
  };
}

async function fetchMarket(): Promise<TRMPayload | null> {
  const data = (await fetchJson(MARKET_URL)) as { rates?: Record<string, number> };
  const rate = data?.rates?.COP;
  if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) return null;
  return {
    rate,
    source: 'market',
    validThrough: null,
    fetchedAt: new Date().toISOString(),
  };
}

export default withApiHandler(async (_req: VercelRequest, res: VercelResponse) => {
  for (const attempt of [fetchOfficial, fetchMarket]) {
    try {
      const payload = await attempt();
      if (payload) {
        res.setHeader('Cache-Control', CACHE_CONTROL);
        return res.status(200).json(payload);
      }
    } catch {
      // Try the next source
    }
  }

  // Both sources failed. Do NOT invent a rate here — the client knows how to
  // prefer its own expired cache and how to label a value that is not live.
  // A short cache so a transient outage is retried soon.
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60');
  return res.status(503).json({ error: 'TRM unavailable from all sources' });
});
