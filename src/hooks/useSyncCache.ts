/**
 * useSyncCacheState
 *
 * Single-pass synchronous initialization for localStorage-backed state (anti-blink pattern).
 * Ensures `getInitialValue()` runs once on mount so migration + cache read are not duplicated.
 */

import { useState, useCallback, type Dispatch, type SetStateAction } from 'react';

export interface SyncCacheState<T> {
  value: T;
  isLoading: boolean;
}

export function useSyncCacheState<T>(
  getInitialValue: () => T,
  isInitiallyLoading: (value: T) => boolean
): {
  value: T;
  setValue: Dispatch<SetStateAction<T>>;
  isLoading: boolean;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
} {
  const [state, setState] = useState<SyncCacheState<T>>(() => {
    const value = getInitialValue();
    return { value, isLoading: isInitiallyLoading(value) };
  });

  const setValue = useCallback((next: SetStateAction<T>) => {
    setState((s) => ({
      ...s,
      value: typeof next === 'function' ? (next as (prev: T) => T)(s.value) : next,
    }));
  }, []);

  const setIsLoading = useCallback((loading: SetStateAction<boolean>) => {
    setState((s) => ({
      ...s,
      isLoading: typeof loading === 'function' ? (loading as (p: boolean) => boolean)(s.isLoading) : loading,
    }));
  }, []);

  return {
    value: state.value,
    setValue,
    isLoading: state.isLoading,
    setIsLoading,
  };
}
