/**
 * Bridges fetchWithRetry (utils layer) to UI notifications without importing React contexts there.
 * NotificationProvider registers a handler; fetchWithRetry calls it when retries are exhausted.
 */

type FailureHandler = (message: string) => void;

let handler: FailureHandler | null = null;

export function registerFetchFailureHandler(fn: FailureHandler | null) {
  handler = fn;
}

export function reportFetchFailure(message: string) {
  handler?.(message);
}
