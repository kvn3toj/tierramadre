/**
 * useComparison Hook
 * Manages the comparison mode state for comparing multiple emeralds.
 * Supports up to 4 items for side-by-side comparison.
 */
import { useState, useCallback, useMemo } from 'react';
import { TreasureItem } from '../types';

const MAX_COMPARISON_ITEMS = 4;

interface UseComparisonReturn {
  // State
  selectedItems: TreasureItem[];
  selectedIds: Set<number>;
  isComparing: boolean;

  // Actions
  addToComparison: (item: TreasureItem) => boolean; // returns false if max reached
  removeFromComparison: (itemId: number) => void;
  toggleComparison: (item: TreasureItem) => void;
  clearComparison: () => void;
  isSelected: (itemId: number) => boolean;

  // UI State
  canAddMore: boolean;
  comparisonCount: number;
  showComparisonBar: boolean;
  showComparisonModal: boolean;
  openComparisonModal: () => void;
  closeComparisonModal: () => void;
}

export function useComparison(): UseComparisonReturn {
  const [selectedItems, setSelectedItems] = useState<TreasureItem[]>([]);
  const [showComparisonModal, setShowComparisonModal] = useState(false);

  // Derived state
  const selectedIds = useMemo(
    () => new Set(selectedItems.map(item => item.item)),
    [selectedItems]
  );

  const comparisonCount = selectedItems.length;
  const canAddMore = comparisonCount < MAX_COMPARISON_ITEMS;
  const isComparing = comparisonCount > 0;
  const showComparisonBar = comparisonCount > 0;

  // Add item to comparison
  const addToComparison = useCallback((item: TreasureItem): boolean => {
    if (selectedItems.length >= MAX_COMPARISON_ITEMS) {
      return false;
    }

    setSelectedItems(prev => {
      // Don't add if already selected
      if (prev.some(i => i.item === item.item)) {
        return prev;
      }
      return [...prev, item];
    });

    return true;
  }, [selectedItems.length]);

  // Remove item from comparison
  const removeFromComparison = useCallback((itemId: number) => {
    setSelectedItems(prev => prev.filter(item => item.item !== itemId));
  }, []);

  // Toggle item selection
  const toggleComparison = useCallback((item: TreasureItem) => {
    setSelectedItems(prev => {
      const isCurrentlySelected = prev.some(i => i.item === item.item);

      if (isCurrentlySelected) {
        return prev.filter(i => i.item !== item.item);
      }

      if (prev.length >= MAX_COMPARISON_ITEMS) {
        return prev; // Can't add more
      }

      return [...prev, item];
    });
  }, []);

  // Clear all selections
  const clearComparison = useCallback(() => {
    setSelectedItems([]);
    setShowComparisonModal(false);
  }, []);

  // Check if item is selected
  const isSelected = useCallback((itemId: number) => {
    return selectedIds.has(itemId);
  }, [selectedIds]);

  // Modal controls
  const openComparisonModal = useCallback(() => {
    if (selectedItems.length >= 2) {
      setShowComparisonModal(true);
    }
  }, [selectedItems.length]);

  const closeComparisonModal = useCallback(() => {
    setShowComparisonModal(false);
  }, []);

  return {
    selectedItems,
    selectedIds,
    isComparing,
    addToComparison,
    removeFromComparison,
    toggleComparison,
    clearComparison,
    isSelected,
    canAddMore,
    comparisonCount,
    showComparisonBar,
    showComparisonModal,
    openComparisonModal,
    closeComparisonModal,
  };
}

export default useComparison;
