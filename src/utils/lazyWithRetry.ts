import { lazy, ComponentType, LazyExoticComponent } from 'react';
import { isChunkLoadError } from './chunkErrors';

/**
 * Wrapper around React.lazy for lazy-loaded routes.
 *
 * It retries ONCE, briefly, then hands off to ChunkErrorBoundary.
 *
 * It used to retry twice with 1s and 2s backoff. That was three seconds spent
 * achieving nothing: a failed module fetch is recorded in the page's module
 * map, so re-running the same `import()` returns the STORED rejection without
 * touching the network. The retries could not re-fetch, and the user waited for
 * them anyway before the boundary got a chance to reload — which is the only
 * thing that does recover, because a fresh document gets a fresh module map.
 *
 * The one remaining retry is cheap and covers the case where the rejection did
 * not come from the fetch at all (a module whose top-level code threw on a
 * transient condition). Everything else fails fast, on purpose.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithRetry<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  componentName = 'Component',
  retries = 1,
): LazyExoticComponent<T> {
  return lazy(() => {
    const attempt = async (retriesLeft: number): Promise<{ default: T }> => {
      try {
        return await importFn();
      } catch (error) {
        if (isChunkLoadError(error) && retriesLeft > 0) {
          console.warn(
            `[lazyWithRetry] ${componentName} failed to load, retrying once (${retriesLeft} left)`,
          );
          // Short: the reload is the real recovery, so do not delay it.
          await new Promise((resolve) => setTimeout(resolve, 300));
          return attempt(retriesLeft - 1);
        }

        console.error(
          `[lazyWithRetry] ${componentName} failed to load; handing off to ChunkErrorBoundary`,
        );
        throw error;
      }
    };

    return attempt(retries);
  });
}
