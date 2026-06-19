/** @vitest-environment jsdom */
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePagination } from '../src/hooks/usePagination';

describe('usePagination — Load-More restoration', () => {
  it('starts with one loaded page and exposes loadedPages', () => {
    const { result } = renderHook(() =>
      usePagination({ totalItems: 100, itemsPerPage: 24 }),
    );
    expect(result.current.loadedPages).toBe(1);
    expect(result.current.visibleCount).toBe(24);
    expect(result.current.hasMore).toBe(true);
  });

  it('restores initialLoadedPages so the visible window is wider on return', () => {
    const { result } = renderHook(() =>
      usePagination({ totalItems: 100, itemsPerPage: 24, initialLoadedPages: 3 }),
    );
    expect(result.current.loadedPages).toBe(3);
    expect(result.current.visibleCount).toBe(72);
  });

  it('clamps an invalid initialLoadedPages to at least one page', () => {
    const { result } = renderHook(() =>
      usePagination({ totalItems: 100, itemsPerPage: 24, initialLoadedPages: 0 }),
    );
    expect(result.current.loadedPages).toBe(1);
  });

  it('loadMore increments loadedPages and visibleCount', () => {
    const { result } = renderHook(() =>
      usePagination({ totalItems: 100, itemsPerPage: 24 }),
    );
    act(() => result.current.loadMore());
    expect(result.current.loadedPages).toBe(2);
    expect(result.current.visibleCount).toBe(48);
  });

  it('never reports visibleCount beyond totalItems', () => {
    const { result } = renderHook(() =>
      usePagination({ totalItems: 10, itemsPerPage: 24, initialLoadedPages: 5 }),
    );
    expect(result.current.visibleCount).toBe(10);
    expect(result.current.hasMore).toBe(false);
  });
});
