/**
 * useFilterInactivityTimeout Hook
 * Clears filters after a period of inactivity. Uses sessionStorage to persist
 * activity timestamps across page refreshes within the same browser session.
 * Extracted from useTreasureFiltering for modularity.
 */
import { useEffect, useRef, useCallback } from 'react';

// Session storage key to track filter activity
const FILTER_ACTIVITY_KEY = 'treasure-filter-activity';

const DEFAULT_INACTIVITY_TIMEOUT_MINUTES = 3;

interface UseFilterInactivityTimeoutOptions {
  hasFilters: boolean;
  clearFilters: () => void;
  inactivityTimeoutMinutes?: number;
  /** When true, filters came from URL params (e.g. hero category navigation) — skip the stale-session mount clear */
  hasUrlFilters?: boolean;
}

export function useFilterInactivityTimeout({
  hasFilters,
  clearFilters,
  inactivityTimeoutMinutes = DEFAULT_INACTIVITY_TIMEOUT_MINUTES,
  hasUrlFilters = false,
}: UseFilterInactivityTimeoutOptions): void {
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Get last activity time from sessionStorage (survives page refreshes within session)
  const getLastActivity = useCallback((): number => {
    try {
      const stored = sessionStorage.getItem(FILTER_ACTIVITY_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        return data.lastActivity || Date.now();
      }
    } catch {
      // Ignore parse errors
    }
    return Date.now();
  }, []);

  // Save activity time to sessionStorage
  const saveActivity = useCallback((timestamp: number) => {
    try {
      sessionStorage.setItem(FILTER_ACTIVITY_KEY, JSON.stringify({
        lastActivity: timestamp,
      }));
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Clear stored activity on filter clear
  const clearStoredActivity = useCallback(() => {
    try {
      sessionStorage.removeItem(FILTER_ACTIVITY_KEY);
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Reset activity timer when user interacts
  const resetActivityTimer = useCallback(() => {
    saveActivity(Date.now());
  }, [saveActivity]);

  // Helper to clear filters and URL params
  const clearFiltersAndUrl = useCallback(() => {
    clearFilters();
    clearStoredActivity();
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [clearFilters, clearStoredActivity]);

  // Check if filters should be cleared on mount (new browser session = no sessionStorage).
  // Skip if filters came from URL params — those are intentional navigations (e.g. hero tabs).
  useEffect(() => {
    if (hasUrlFilters) return;
    const stored = sessionStorage.getItem(FILTER_ACTIVITY_KEY);
    if (!stored && hasFilters) {
      clearFiltersAndUrl();
    }
  }, []); // Only run on mount // eslint-disable-line react-hooks/exhaustive-deps

  // Clear filters after inactivity (only if filters are active)
  useEffect(() => {
    // Disabled if timeout is 0 or no filters active
    if (inactivityTimeoutMinutes <= 0 || !hasFilters) {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      if (!hasFilters) {
        clearStoredActivity();
      }
      return;
    }

    // Reset timer on any filter change
    resetActivityTimer();

    const timeoutMs = inactivityTimeoutMinutes * 60 * 1000;

    // Set up inactivity check
    const checkInactivity = () => {
      const lastActivity = getLastActivity();
      const now = Date.now();
      const inactiveMs = now - lastActivity;

      if (inactiveMs >= timeoutMs) {
        clearFiltersAndUrl();
      } else {
        const remainingMs = timeoutMs - inactiveMs;
        inactivityTimerRef.current = setTimeout(checkInactivity, remainingMs);
      }
    };

    // Start the timer - check based on stored activity time
    const lastActivity = getLastActivity();
    const now = Date.now();
    const inactiveMs = now - lastActivity;

    if (inactiveMs >= timeoutMs) {
      clearFiltersAndUrl();
    } else {
      const remainingMs = timeoutMs - inactiveMs;
      inactivityTimerRef.current = setTimeout(checkInactivity, remainingMs);
    }

    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
    };
  }, [hasFilters, inactivityTimeoutMinutes, clearFiltersAndUrl, resetActivityTimer, getLastActivity, clearStoredActivity]);

  // Track user activity on visibility change (check for staleness when returning)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && hasFilters) {
        const lastActivity = getLastActivity();
        const now = Date.now();
        const inactiveMs = now - lastActivity;
        const timeoutMs = inactivityTimeoutMinutes * 60 * 1000;

        if (inactiveMs >= timeoutMs) {
          clearFiltersAndUrl();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [hasFilters, inactivityTimeoutMinutes, clearFiltersAndUrl, getLastActivity]);
}
