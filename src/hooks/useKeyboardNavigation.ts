/**
 * useKeyboardNavigation Hook
 * Enables keyboard navigation for the treasure grid.
 * Supports arrow keys, enter, favorites (F), comparison (C), and search (/).
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { TreasureItem } from '../types';

interface UseKeyboardNavigationProps {
  /** Array of items currently displayed */
  items: TreasureItem[];
  /** Number of columns in the grid */
  columns: number;
  /** Callback when an item is selected (Enter) */
  onSelect: (item: TreasureItem) => void;
  /** Callback to toggle favorite (F) */
  onToggleFavorite: (itemId: number) => void;
  /** Callback to toggle comparison (C) */
  onToggleComparison: (item: TreasureItem) => void;
  /** Callback to focus search (/) */
  onFocusSearch: () => void;
  /** Whether keyboard navigation is enabled */
  enabled?: boolean;
}

interface UseKeyboardNavigationReturn {
  /** Currently focused item index (-1 if none) */
  focusedIndex: number;
  /** Set focused index programmatically */
  setFocusedIndex: (index: number) => void;
  /** ID of the currently focused item */
  focusedItemId: number | null;
  /** Whether keyboard navigation is active */
  isNavigating: boolean;
  /** Reset navigation state */
  resetNavigation: () => void;
  /** Ref to attach to the grid container */
  gridRef: React.RefObject<HTMLDivElement>;
  /** Get props for an item at given index */
  getItemProps: (index: number) => {
    tabIndex: number;
    'aria-selected': boolean;
    'data-focused': boolean;
    onFocus: () => void;
  };
}

export function useKeyboardNavigation({
  items,
  columns,
  onSelect,
  onToggleFavorite,
  onToggleComparison,
  onFocusSearch,
  enabled = true,
}: UseKeyboardNavigationProps): UseKeyboardNavigationReturn {
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [isNavigating, setIsNavigating] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  // Get the currently focused item
  const focusedItem = focusedIndex >= 0 && focusedIndex < items.length
    ? items[focusedIndex]
    : null;
  const focusedItemId = focusedItem?.item ?? null;

  // Reset navigation when items change
  useEffect(() => {
    if (focusedIndex >= items.length) {
      setFocusedIndex(items.length > 0 ? items.length - 1 : -1);
    }
  }, [items.length, focusedIndex]);

  // Handle keyboard events
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Don't interfere with input elements
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
      // Allow "/" to escape from search
      if (event.key === 'Escape') {
        target.blur();
        setIsNavigating(true);
        if (focusedIndex < 0 && items.length > 0) {
          setFocusedIndex(0);
        }
      }
      return;
    }

    const totalItems = items.length;
    if (totalItems === 0) return;

    let newIndex = focusedIndex;
    let handled = false;

    switch (event.key) {
      case 'ArrowRight':
        if (focusedIndex < 0) {
          newIndex = 0;
        } else if (focusedIndex < totalItems - 1) {
          newIndex = focusedIndex + 1;
        }
        handled = true;
        break;

      case 'ArrowLeft':
        if (focusedIndex < 0) {
          newIndex = 0;
        } else if (focusedIndex > 0) {
          newIndex = focusedIndex - 1;
        }
        handled = true;
        break;

      case 'ArrowDown':
        if (focusedIndex < 0) {
          newIndex = 0;
        } else {
          const nextRowIndex = focusedIndex + columns;
          if (nextRowIndex < totalItems) {
            newIndex = nextRowIndex;
          }
        }
        handled = true;
        break;

      case 'ArrowUp':
        if (focusedIndex < 0) {
          newIndex = 0;
        } else {
          const prevRowIndex = focusedIndex - columns;
          if (prevRowIndex >= 0) {
            newIndex = prevRowIndex;
          }
        }
        handled = true;
        break;

      case 'Enter':
      case ' ': // Space
        if (focusedItem) {
          onSelect(focusedItem);
          handled = true;
        }
        break;

      case 'f':
      case 'F':
        if (focusedItem) {
          onToggleFavorite(focusedItem.item);
          handled = true;
        }
        break;

      case 'c':
      case 'C':
        if (focusedItem) {
          onToggleComparison(focusedItem);
          handled = true;
        }
        break;

      case '/':
        onFocusSearch();
        handled = true;
        break;

      case 'Home':
        newIndex = 0;
        handled = true;
        break;

      case 'End':
        newIndex = totalItems - 1;
        handled = true;
        break;

      case 'Escape':
        setFocusedIndex(-1);
        setIsNavigating(false);
        handled = true;
        break;
    }

    if (handled) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (newIndex !== focusedIndex && newIndex >= 0) {
      setFocusedIndex(newIndex);
      setIsNavigating(true);

      // Scroll the focused item into view
      if (gridRef.current) {
        const focusedElement = gridRef.current.querySelector(
          `[data-item-index="${newIndex}"]`
        ) as HTMLElement;
        if (focusedElement) {
          focusedElement.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
          });
          focusedElement.focus();
        }
      }
    }
  }, [
    enabled,
    items,
    columns,
    focusedIndex,
    focusedItem,
    onSelect,
    onToggleFavorite,
    onToggleComparison,
    onFocusSearch,
  ]);

  // Attach keyboard listener
  useEffect(() => {
    if (enabled) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [enabled, handleKeyDown]);

  // Reset navigation
  const resetNavigation = useCallback(() => {
    setFocusedIndex(-1);
    setIsNavigating(false);
  }, []);

  // Get props for an item
  const getItemProps = useCallback((index: number) => {
    const isFocused = index === focusedIndex;
    return {
      tabIndex: isFocused ? 0 : -1,
      'aria-selected': isFocused,
      'data-focused': isFocused,
      'data-item-index': index,
      onFocus: () => {
        setFocusedIndex(index);
        setIsNavigating(true);
      },
    };
  }, [focusedIndex]);

  return {
    focusedIndex,
    setFocusedIndex,
    focusedItemId,
    isNavigating,
    resetNavigation,
    gridRef,
    getItemProps,
  };
}

export default useKeyboardNavigation;
