import { lazy, ComponentType, LazyExoticComponent } from 'react';

interface ImportError extends Error {
  name: string;
}

/**
 * Wrapper around React.lazy that retries failed chunk imports.
 * Catches ChunkLoadError and dynamic import failures, retrying with exponential backoff.
 * Falls back to error boundary if all retries exhausted.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithRetry<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  componentName = 'Component',
  retries = 2
): LazyExoticComponent<T> {
  return lazy(() => {
    const attempt = async (retriesLeft: number): Promise<{ default: T }> => {
      try {
        return await importFn();
      } catch (error) {
        const err = error as ImportError;

        // Check if this is a chunk loading error
        const message = err.message?.toLowerCase() || '';
        const isChunkError =
          err.name === 'ChunkLoadError' ||
          message.includes('failed to fetch dynamically imported module') ||
          message.includes('loading chunk') ||
          message.includes('importing a module script failed');

        if (isChunkError && retriesLeft > 0) {
          console.warn(
            `[lazyWithRetry] ${componentName} failed to load, retrying... (${retriesLeft} attempts left)`
          );

          // Wait before retry with exponential backoff
          await new Promise(resolve =>
            setTimeout(resolve, 1000 * (retries - retriesLeft + 1))
          );

          return attempt(retriesLeft - 1);
        }

        // Re-throw to be caught by error boundary
        console.error(`[lazyWithRetry] ${componentName} failed after all retries`);
        throw error;
      }
    };

    return attempt(retries);
  });
}
