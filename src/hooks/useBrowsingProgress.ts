/**
 * useBrowsingProgress Hook
 * Gamification feature that tracks user exploration of the inventory.
 * Inspired by Moksart's Octalysis framework (Core Drive 2: Accomplishment).
 */
import { useState, useEffect, useCallback, useMemo } from 'react';

const STORAGE_KEY = 'tierramadre-browsing-progress';

// Level thresholds based on percentage explored
const LEVEL_THRESHOLDS = {
  Novato: 0,
  Entusiasta: 10,
  Coleccionista: 25,
  Experto: 50,
  Maestro: 75,
} as const;

type ExplorerLevel = keyof typeof LEVEL_THRESHOLDS;

interface Achievement {
  id: string;
  name: string;
  description: string;
  unlockedAt: string | null;
  icon: string;
}

interface BrowsingProgressData {
  itemsViewed: number[];
  achievements: Record<string, string | null>; // achievement id -> unlock date
  lastUpdated: string;
}

interface UseBrowsingProgressReturn {
  // State
  itemsViewed: Set<number>;
  level: ExplorerLevel;
  percentageExplored: number;
  viewedCount: number;

  // Actions
  markViewed: (itemId: number) => void;
  isViewed: (itemId: number) => boolean;
  resetProgress: () => void;

  // Achievements
  achievements: Achievement[];
  unlockedAchievements: Achievement[];
  checkAchievements: (totalItems: number, colors?: string[], qualities?: string[]) => Achievement | null;

  // Level info
  levelProgress: number; // 0-100 progress to next level
  nextLevel: ExplorerLevel | null;
}

// Achievement definitions
const ACHIEVEMENT_DEFINITIONS: Achievement[] = [
  {
    id: 'first_view',
    name: 'Primera Mirada',
    description: 'Exploraste tu primera esmeralda',
    unlockedAt: null,
    icon: '👁️',
  },
  {
    id: 'ten_views',
    name: 'Curioso',
    description: 'Exploraste 10 esmeraldas',
    unlockedAt: null,
    icon: '🔍',
  },
  {
    id: 'twenty_five_views',
    name: 'Conocedor',
    description: 'Exploraste 25 esmeraldas',
    unlockedAt: null,
    icon: '💎',
  },
  {
    id: 'fifty_views',
    name: 'Experto',
    description: 'Exploraste 50 esmeraldas',
    unlockedAt: null,
    icon: '🏆',
  },
  {
    id: 'all_colors',
    name: 'Arcoíris Esmeralda',
    description: 'Viste todos los colores de esmeralda',
    unlockedAt: null,
    icon: '🌈',
  },
  {
    id: 'all_qualities',
    name: 'Catador de Calidad',
    description: 'Exploraste todas las calidades',
    unlockedAt: null,
    icon: '⭐',
  },
];

export function useBrowsingProgress(totalInventoryItems: number = 85): UseBrowsingProgressReturn {
  // Load initial state from localStorage
  const [itemsViewed, setItemsViewed] = useState<Set<number>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data: BrowsingProgressData = JSON.parse(stored);
        return new Set(data.itemsViewed || []);
      }
    } catch (error) {
      console.error('Error loading browsing progress:', error);
    }
    return new Set();
  });

  const [achievementUnlocks, setAchievementUnlocks] = useState<Record<string, string | null>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data: BrowsingProgressData = JSON.parse(stored);
        return data.achievements || {};
      }
    } catch (error) {
      console.error('Error loading achievements:', error);
    }
    return {};
  });

  // Persist to localStorage
  useEffect(() => {
    try {
      const data: BrowsingProgressData = {
        itemsViewed: Array.from(itemsViewed),
        achievements: achievementUnlocks,
        lastUpdated: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving browsing progress:', error);
    }
  }, [itemsViewed, achievementUnlocks]);

  // Calculate derived values
  const viewedCount = itemsViewed.size;

  const percentageExplored = useMemo(() => {
    if (totalInventoryItems === 0) return 0;
    return Math.round((viewedCount / totalInventoryItems) * 100);
  }, [viewedCount, totalInventoryItems]);

  const level = useMemo((): ExplorerLevel => {
    if (percentageExplored >= LEVEL_THRESHOLDS.Maestro) return 'Maestro';
    if (percentageExplored >= LEVEL_THRESHOLDS.Experto) return 'Experto';
    if (percentageExplored >= LEVEL_THRESHOLDS.Coleccionista) return 'Coleccionista';
    if (percentageExplored >= LEVEL_THRESHOLDS.Entusiasta) return 'Entusiasta';
    return 'Novato';
  }, [percentageExplored]);

  const nextLevel = useMemo((): ExplorerLevel | null => {
    const levels: ExplorerLevel[] = ['Novato', 'Entusiasta', 'Coleccionista', 'Experto', 'Maestro'];
    const currentIndex = levels.indexOf(level);
    if (currentIndex < levels.length - 1) {
      return levels[currentIndex + 1];
    }
    return null;
  }, [level]);

  const levelProgress = useMemo(() => {
    if (!nextLevel) return 100;
    const currentThreshold = LEVEL_THRESHOLDS[level];
    const nextThreshold = LEVEL_THRESHOLDS[nextLevel];
    const range = nextThreshold - currentThreshold;
    const progress = percentageExplored - currentThreshold;
    return Math.round((progress / range) * 100);
  }, [level, nextLevel, percentageExplored]);

  // Build achievements list with unlock status
  const achievements = useMemo(() => {
    return ACHIEVEMENT_DEFINITIONS.map(achievement => ({
      ...achievement,
      unlockedAt: achievementUnlocks[achievement.id] || null,
    }));
  }, [achievementUnlocks]);

  const unlockedAchievements = useMemo(() => {
    return achievements.filter(a => a.unlockedAt !== null);
  }, [achievements]);

  // Mark item as viewed
  const markViewed = useCallback((itemId: number) => {
    setItemsViewed(prev => {
      if (prev.has(itemId)) return prev;
      const next = new Set(prev);
      next.add(itemId);
      return next;
    });
  }, []);

  // Check if item was viewed
  const isViewed = useCallback((itemId: number) => {
    return itemsViewed.has(itemId);
  }, [itemsViewed]);

  // Reset all progress
  const resetProgress = useCallback(() => {
    setItemsViewed(new Set());
    setAchievementUnlocks({});
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Check and unlock achievements
  const checkAchievements = useCallback((
    _totalItems: number,
    viewedColors?: string[],
    viewedQualities?: string[]
  ): Achievement | null => {
    const now = new Date().toISOString();
    let newUnlock: Achievement | null = null;

    setAchievementUnlocks(prev => {
      const next = { ...prev };
      let changed = false;

      // First view
      if (viewedCount >= 1 && !next['first_view']) {
        next['first_view'] = now;
        newUnlock = ACHIEVEMENT_DEFINITIONS.find(a => a.id === 'first_view') || null;
        changed = true;
      }

      // 10 views
      if (viewedCount >= 10 && !next['ten_views']) {
        next['ten_views'] = now;
        newUnlock = ACHIEVEMENT_DEFINITIONS.find(a => a.id === 'ten_views') || null;
        changed = true;
      }

      // 25 views
      if (viewedCount >= 25 && !next['twenty_five_views']) {
        next['twenty_five_views'] = now;
        newUnlock = ACHIEVEMENT_DEFINITIONS.find(a => a.id === 'twenty_five_views') || null;
        changed = true;
      }

      // 50 views
      if (viewedCount >= 50 && !next['fifty_views']) {
        next['fifty_views'] = now;
        newUnlock = ACHIEVEMENT_DEFINITIONS.find(a => a.id === 'fifty_views') || null;
        changed = true;
      }

      // All colors (5 main colors)
      if (viewedColors && viewedColors.length >= 5 && !next['all_colors']) {
        next['all_colors'] = now;
        newUnlock = ACHIEVEMENT_DEFINITIONS.find(a => a.id === 'all_colors') || null;
        changed = true;
      }

      // All qualities (6 quality levels)
      if (viewedQualities && viewedQualities.length >= 6 && !next['all_qualities']) {
        next['all_qualities'] = now;
        newUnlock = ACHIEVEMENT_DEFINITIONS.find(a => a.id === 'all_qualities') || null;
        changed = true;
      }

      return changed ? next : prev;
    });

    return newUnlock;
  }, [viewedCount]);

  return {
    itemsViewed,
    level,
    percentageExplored,
    viewedCount,
    markViewed,
    isViewed,
    resetProgress,
    achievements,
    unlockedAchievements,
    checkAchievements,
    levelProgress,
    nextLevel,
  };
}

export default useBrowsingProgress;
