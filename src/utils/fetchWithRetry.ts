/**
 * fetchWithRetry
 *
 * Wraps fetch() with exponential backoff retry logic.
 * Retries on: network errors, 500+, 429 (rate limit).
 * Does NOT retry on: 400, 401, 403, 404.
 * Early-exits if navigator.onLine is false.
 */

interface FetchWithRetryOptions {
  retries?: number;
  baseDelay?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

const NON_RETRYABLE_STATUSES = new Set([400, 401, 403, 404, 405, 409, 422]);

export async function fetchWithRetry(
  url: string,
  fetchOptions?: RequestInit,
  retryOptions?: FetchWithRetryOptions
): Promise<Response> {
  const { retries = 3, baseDelay = 1000, onRetry } = retryOptions ?? {};

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    // Early-exit if offline
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new Error('Sin conexion a internet');
    }

    try {
      const response = await fetch(url, fetchOptions);

      if (response.ok) return response;

      // Don't retry client errors
      if (NON_RETRYABLE_STATUSES.has(response.status)) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Server errors (500+) and rate limits (429) — retry
      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }

    // If we have retries left, wait with exponential backoff
    if (attempt < retries) {
      const delay = baseDelay * (attempt + 1);
      onRetry?.(attempt + 1, lastError!);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError ?? new Error('fetchWithRetry exhausted all retries');
}
