/**
 * useSavedFilters Hook
 * Allows users to save and reuse filter presets.
 * Enhances filter usage rate and user efficiency.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { STORAGE_KEYS } from '../constants/storage-keys';

const STORAGE_KEY = STORAGE_KEYS.SAVED_FILTERS;
const MAX_PRESETS = 10;

// Filter state type (matches useTreasureFiltering)
export interface FilterState {
  search: string;
  colorFilter: string;
  qualityFilter: string;
  typeFilter: string;
  statusFilter: string;
  shapeFilter: string;
  priceRange: [number, number];
  caratRange?: [number, number]; // Optional for backward compatibility with saved presets
  sortBy: string;
  cantidadFilter?: string; // Optional for backward compatibility with saved presets
}

export interface FilterPreset {
  id: string;
  name: string;
  filters: FilterState;
  createdAt: string;
  usageCount: number;
}

interface SavedFiltersData {
  presets: FilterPreset[];
  lastUpdated: string;
}

interface UseSavedFiltersReturn {
  presets: FilterPreset[];
  savePreset: (name: string, filters: FilterState) => FilterPreset;
  deletePreset: (id: string) => void;
  renamePreset: (id: string, newName: string) => void;
  getPreset: (id: string) => FilterPreset | undefined;
  incrementUsage: (id: string) => void;
  clearAllPresets: () => void;
  presetsCount: number;
  canSaveMore: boolean;
}

export function useSavedFilters(): UseSavedFiltersReturn {
  const [presets, setPresets] = useState<FilterPreset[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data: SavedFiltersData = JSON.parse(stored);
        return data.presets || [];
      }
    } catch (error) {
      console.error('Error loading saved filters:', error);
    }
    return [];
  });

  // Persist to localStorage
  useEffect(() => {
    try {
      const data: SavedFiltersData = {
        presets,
        lastUpdated: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving filter presets:', error);
    }
  }, [presets]);

  // Save a new preset
  const savePreset = useCallback((name: string, filters: FilterState): FilterPreset => {
    const newPreset: FilterPreset = {
      id: uuidv4(),
      name: name.trim() || 'Sin nombre',
      filters,
      createdAt: new Date().toISOString(),
      usageCount: 0,
    };

    setPresets(prev => {
      // Keep only MAX_PRESETS - 1 to make room for new one
      const trimmed = prev.slice(0, MAX_PRESETS - 1);
      return [newPreset, ...trimmed];
    });

    return newPreset;
  }, []);

  // Delete a preset
  const deletePreset = useCallback((id: string) => {
    setPresets(prev => prev.filter(p => p.id !== id));
  }, []);

  // Rename a preset
  const renamePreset = useCallback((id: string, newName: string) => {
    setPresets(prev => prev.map(p =>
      p.id === id ? { ...p, name: newName.trim() || 'Sin nombre' } : p
    ));
  }, []);

  // Get a specific preset
  const getPreset = useCallback((id: string): FilterPreset | undefined => {
    return presets.find(p => p.id === id);
  }, [presets]);

  // Increment usage count (for sorting by popularity)
  const incrementUsage = useCallback((id: string) => {
    setPresets(prev => prev.map(p =>
      p.id === id ? { ...p, usageCount: p.usageCount + 1 } : p
    ));
  }, []);

  // Clear all presets
  const clearAllPresets = useCallback(() => {
    setPresets([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Derived values
  const presetsCount = useMemo(() => presets.length, [presets]);
  const canSaveMore = useMemo(() => presets.length < MAX_PRESETS, [presets]);

  return {
    presets,
    savePreset,
    deletePreset,
    renamePreset,
    getPreset,
    incrementUsage,
    clearAllPresets,
    presetsCount,
    canSaveMore,
  };
}

export default useSavedFilters;
