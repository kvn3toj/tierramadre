/**
 * useSavedFacts Hook
 *
 * Manages saved facts state with localStorage persistence.
 * Provides a clean interface for saving/unsaving facts.
 *
 * Refactored by: CoomÜnity Council - Evolutionary Refactor
 */

import { useState, useCallback } from 'react';
import { createLogger } from '../../../utils/logger';

const log = createLogger('SavedFacts');

// =============================================================================
// CONSTANTS
// =============================================================================

const STORAGE_KEY = 'tierra-madre-saved-facts';

// =============================================================================
// TYPES
// =============================================================================

export interface SavedFactsState {
  savedFacts: number[];
  isSaved: (factId: number) => boolean;
}

export interface SavedFactsActions {
  saveFact: (factId: number) => void;
  unsaveFact: (factId: number) => void;
  toggleSave: (factId: number) => void;
  clearAll: () => void;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

const loadSavedFacts = (): number[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

const persistSavedFacts = (facts: number[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(facts));
  } catch (error) {
    log.warn('Failed to persist to localStorage:', error);
  }
};

// =============================================================================
// HOOK
// =============================================================================

export const useSavedFacts = (): [SavedFactsState, SavedFactsActions] => {
  const [savedFacts, setSavedFacts] = useState<number[]>(loadSavedFacts);

  // Check if a fact is saved
  const isSaved = useCallback(
    (factId: number) => savedFacts.includes(factId),
    [savedFacts]
  );

  // Save a fact
  const saveFact = useCallback((factId: number) => {
    setSavedFacts(prev => {
      if (prev.includes(factId)) return prev;
      const newSaved = [...prev, factId];
      persistSavedFacts(newSaved);
      return newSaved;
    });
  }, []);

  // Unsave a fact
  const unsaveFact = useCallback((factId: number) => {
    setSavedFacts(prev => {
      if (!prev.includes(factId)) return prev;
      const newSaved = prev.filter(id => id !== factId);
      persistSavedFacts(newSaved);
      return newSaved;
    });
  }, []);

  // Toggle save state
  const toggleSave = useCallback((factId: number) => {
    setSavedFacts(prev => {
      const newSaved = prev.includes(factId)
        ? prev.filter(id => id !== factId)
        : [...prev, factId];
      persistSavedFacts(newSaved);
      return newSaved;
    });
  }, []);

  // Clear all saved facts
  const clearAll = useCallback(() => {
    setSavedFacts([]);
    persistSavedFacts([]);
  }, []);

  return [
    { savedFacts, isSaved },
    { saveFact, unsaveFact, toggleSave, clearAll },
  ];
};

export default useSavedFacts;
