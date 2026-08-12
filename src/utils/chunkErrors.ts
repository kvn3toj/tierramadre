/**
 * chunkErrors — the single definition of "this was a chunk/module load failure".
 *
 * This used to live twice: once in `lazyWithRetry` (deciding what to retry) and
 * once in `ChunkErrorBoundary` (deciding what to call a new version). The two
 * lists drifted, and the drift was backwards: the boundary claimed
 * `TypeError: Failed to fetch` while lazyWithRetry did not, so the class of
 * error most common on a phone was never retried but *was* reported to the user
 * as "Nueva versión disponible".
 *
 * One exported predicate, imported by both. If a case is added here it applies
 * to retrying and to reporting at the same time, which is the only way the two
 * stay honest about the same set of errors.
 */

/**
 * True when `error` is a failure to load a JS/CSS module chunk, as opposed to an
 * error thrown by application code once the chunk is running.
 *
 * The messages differ per engine, which is why this matches on substrings:
 *   - Chrome/Vite: "Failed to fetch dynamically imported module"
 *   - Safari:      "Importing a module script failed."
 *   - Webpack-era: "Loading chunk N failed", "Loading CSS chunk N failed"
 *   - Any engine:  a bare network `TypeError: Failed to fetch`
 */
export function isChunkLoadError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const err = error as { name?: string; message?: string };

  if (err.name === 'ChunkLoadError') return true;

  const message = (err.message ?? '').toLowerCase();
  if (!message) return false;

  if (message.includes('failed to fetch dynamically imported module'))
    return true;
  if (message.includes('importing a module script failed')) return true;
  if (message.includes('loading chunk')) return true;
  if (message.includes('loading css chunk')) return true;

  // Bare network failure during the import. Common on flaky mobile connections.
  if (err.name === 'TypeError' && message.includes('failed to fetch'))
    return true;

  return false;
}

/**
 * Why an in-page retry of the *same* dynamic import cannot help.
 *
 * When a module script fails to fetch, the browser records the failure in the
 * page's module map. Re-running `import('./same-url.js')` resolves against that
 * map and returns the STORED rejection without issuing a new network request.
 * So a retry loop over an unchanged specifier replays a cached error and only
 * spends wall-clock time.
 *
 * Recovery therefore has to come from a fresh document (a reload gets a new
 * module map), which is what ChunkErrorBoundary does. `lazyWithRetry` keeps one
 * short retry only for the case where the rejection did not come from the fetch
 * — and gets out of the way quickly so the reload can happen sooner.
 */
export const MODULE_MAP_CACHES_FAILURES = true;
