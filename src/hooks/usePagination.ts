/**
 * usePagination Hook
 * Manages pagination state for the inventory browser.
 * Supports both traditional pagination and "Load More" infinite scroll.
 */
import { useState, useCallback, useMemo } from 'react';

interface UsePaginationProps {
  totalItems: number;
  itemsPerPage?: number;
  initialPage?: number;
}

interface UsePaginationReturn {
  currentPage: number;
  itemsPerPage: number;
  totalPages: number;
  visibleCount: number;
  hasMore: boolean;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  loadMore: () => void;
  reset: () => void;
  getPageItems: <T>(items: T[]) => T[];
  getVisibleItems: <T>(items: T[]) => T[];
}

export function usePagination({
  totalItems,
  itemsPerPage = 24,
  initialPage = 1,
}: UsePaginationProps): UsePaginationReturn {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [loadedPages, setLoadedPages] = useState(1); // For "Load More" mode

  // Calculate total pages
  const totalPages = useMemo(
    () => Math.ceil(totalItems / itemsPerPage),
    [totalItems, itemsPerPage]
  );

  // Calculate how many items are visible (for Load More mode)
  const visibleCount = useMemo(
    () => Math.min(loadedPages * itemsPerPage, totalItems),
    [loadedPages, itemsPerPage, totalItems]
  );

  // Check if there are more items to load
  const hasMore = useMemo(
    () => visibleCount < totalItems,
    [visibleCount, totalItems]
  );

  // Go to specific page
  const goToPage = useCallback(
    (page: number) => {
      const validPage = Math.max(1, Math.min(page, totalPages));
      setCurrentPage(validPage);
    },
    [totalPages]
  );

  // Go to next page
  const nextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  }, [totalPages]);

  // Go to previous page
  const prevPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  }, []);

  // Load more items (for infinite scroll / Load More button)
  const loadMore = useCallback(() => {
    setLoadedPages((prev) => prev + 1);
  }, []);

  // Reset pagination
  const reset = useCallback(() => {
    setCurrentPage(1);
    setLoadedPages(1);
  }, []);

  // Get items for current page (traditional pagination)
  const getPageItems = useCallback(
    <T,>(items: T[]): T[] => {
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      return items.slice(startIndex, endIndex);
    },
    [currentPage, itemsPerPage]
  );

  // Get all visible items (for Load More mode)
  const getVisibleItems = useCallback(
    <T,>(items: T[]): T[] => {
      return items.slice(0, visibleCount);
    },
    [visibleCount]
  );

  return {
    currentPage,
    itemsPerPage,
    totalPages,
    visibleCount,
    hasMore,
    goToPage,
    nextPage,
    prevPage,
    loadMore,
    reset,
    getPageItems,
    getVisibleItems,
  };
}

export default usePagination;
